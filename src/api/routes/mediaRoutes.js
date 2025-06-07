// =============================================================================
// MEDIA & UPLOADS API ROUTES - مسارات الوسائط والملفات
// =============================================================================
// Secure media upload and file management system

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');

// Import middleware
const { authenticateToken, requireRole } = require('../middleware/auth.js');

// Import controllers
const mediaController = require('../controllers/mediaController.js');

// Import validation schemas
const {
  validateFileUpload,
  validateMediaUpdate,
  validateBulkOperation,
  validateScanRequest
} = require('../validators/mediaValidators.js');

// =============================================================================
// RATE LIMITING CONFIGURATIONS
// =============================================================================

// File upload rate limits
const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 file uploads per hour
  message: {
    success: false,
    error: 'File upload rate limit exceeded.',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
  }
});

// Bulk operations rate limits
const bulkOperationLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 bulk operations per hour
  message: {
    success: false,
    error: 'Bulk operation rate limit exceeded.',
    code: 'BULK_OPERATION_RATE_LIMIT_EXCEEDED'
  }
});

// General media API rate limits
const mediaAPILimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: {
    success: false,
    error: 'Media API rate limit exceeded.',
    code: 'MEDIA_API_RATE_LIMIT_EXCEEDED'
  }
});

// =============================================================================
// MULTER CONFIGURATION FOR FILE UPLOADS
// =============================================================================

// File filter function
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedTypes = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'audio/mpeg',
    'audio/wav',
    'audio/mp4',
    'audio/webm',
    'application/pdf',
    'text/plain'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }
};

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/temp/', // Temporary upload directory
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 10 // Maximum 10 files per request
  },
  fileFilter: fileFilter
});

// =============================================================================
// MIDDLEWARE COMBINATIONS
// =============================================================================

// Standard media access
const mediaAuth = [authenticateToken, mediaAPILimit];

// File upload middleware
const uploadAuth = [authenticateToken, uploadRateLimit];

// Bulk operations middleware
const bulkAuth = [authenticateToken, bulkOperationLimit];

// Admin media management
const adminAuth = [
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  mediaAPILimit
];

// =============================================================================
// 1. FILE UPLOAD & MANAGEMENT
// =============================================================================

/**
 * POST /api/media/upload
 * Upload single file
 * Body: multipart/form-data with file and metadata
 */
router.post('/upload', upload.single('file'), [...uploadAuth, validateFileUpload], mediaController.uploadSingleFile);

/**
 * POST /api/media/upload-multiple
 * Upload multiple files
 * Body: multipart/form-data with files array and metadata
 */
router.post('/upload-multiple', upload.array('files', 10), [...uploadAuth, validateFileUpload], mediaController.uploadMultipleFiles);

/**
 * POST /api/media/upload-avatar
 * Upload user avatar/profile image
 * Body: multipart/form-data with image file
 */
router.post('/upload-avatar', upload.single('avatar'), [...uploadAuth, validateFileUpload], mediaController.uploadAvatar);

/**
 * POST /api/media/upload-session-media
 * Upload media for specific session (palmistry, coffee cup, etc.)
 * Body: multipart/form-data with file, session_id, media_type
 */
router.post('/upload-session-media', upload.single('media'), [...uploadAuth, validateFileUpload], mediaController.uploadSessionMedia);

/**
 * POST /api/media/upload-voice-note
 * Upload voice note/audio message
 * Body: multipart/form-data with audio file and metadata
 */
router.post('/upload-voice-note', upload.single('voice'), [...uploadAuth, validateFileUpload], mediaController.uploadVoiceNote);

// =============================================================================
// 2. FILE RETRIEVAL & ACCESS
// =============================================================================

/**
 * GET /api/media/files
 * Get user's uploaded files
 * Query params: type, session_id, page, limit, search, date_from, date_to
 */
router.get('/files', mediaAuth, mediaController.getUserFiles);

/**
 * GET /api/media/files/:id
 * Get specific file details
 * URL params: id (file_id)
 */
router.get('/files/:id', mediaAuth, mediaController.getFileById);

/**
 * GET /api/media/files/:id/download
 * Download file
 * URL params: id (file_id)
 * Query params: thumbnail (for images)
 */
router.get('/files/:id/download', mediaAuth, mediaController.downloadFile);

/**
 * GET /api/media/files/:id/stream
 * Stream audio/video file
 * URL params: id (file_id)
 */
router.get('/files/:id/stream', mediaAuth, mediaController.streamFile);

/**
 * GET /api/media/session/:session_id/files
 * Get all files for a specific session
 * URL params: session_id
 * Query params: type, page, limit
 */
router.get('/session/:session_id/files', mediaAuth, mediaController.getSessionFiles);

// =============================================================================
// 3. FILE METADATA & UPDATES
// =============================================================================

/**
 * PUT /api/media/files/:id
 * Update file metadata
 * URL params: id (file_id)
 * Body: { filename, description, tags, visibility }
 */
router.put('/files/:id', [...mediaAuth, validateMediaUpdate], mediaController.updateFileMetadata);

/**
 * PUT /api/media/files/:id/visibility
 * Update file visibility/permissions
 * URL params: id (file_id)
 * Body: { visibility, shared_with, access_level }
 */
router.put('/files/:id/visibility', [...mediaAuth, validateMediaUpdate], mediaController.updateFileVisibility);

/**
 * POST /api/media/files/:id/tags
 * Add tags to file
 * URL params: id (file_id)
 * Body: { tags }
 */
router.post('/files/:id/tags', mediaAuth, mediaController.addFileTags);

/**
 * DELETE /api/media/files/:id/tags
 * Remove tags from file
 * URL params: id (file_id)
 * Body: { tags }
 */
router.delete('/files/:id/tags', mediaAuth, mediaController.removeFileTags);

// =============================================================================
// 4. FILE OPERATIONS
// =============================================================================

/**
 * POST /api/media/files/:id/copy
 * Create copy of file
 * URL params: id (file_id)
 * Body: { new_name, destination_session }
 */
router.post('/files/:id/copy', mediaAuth, mediaController.copyFile);

/**
 * POST /api/media/files/:id/move
 * Move file to different session
 * URL params: id (file_id)
 * Body: { target_session_id, reason }
 */
router.post('/files/:id/move', mediaAuth, mediaController.moveFile);

/**
 * DELETE /api/media/files/:id
 * Delete file
 * URL params: id (file_id)
 * Body: { permanent, reason }
 */
router.delete('/files/:id', mediaAuth, mediaController.deleteFile);

/**
 * POST /api/media/files/:id/restore
 * Restore deleted file (within retention period)
 * URL params: id (file_id)
 */
router.post('/files/:id/restore', mediaAuth, mediaController.restoreFile);

// =============================================================================
// 5. IMAGE PROCESSING & THUMBNAILS
// =============================================================================

/**
 * POST /api/media/files/:id/resize
 * Resize image file
 * URL params: id (file_id)
 * Body: { width, height, maintain_aspect_ratio, quality }
 */
router.post('/files/:id/resize', mediaAuth, mediaController.resizeImage);

/**
 * POST /api/media/files/:id/thumbnail
 * Generate thumbnail for image/video
 * URL params: id (file_id)
 * Body: { size, quality, format }
 */
router.post('/files/:id/thumbnail', mediaAuth, mediaController.generateThumbnail);

/**
 * GET /api/media/files/:id/thumbnails
 * Get available thumbnails for file
 * URL params: id (file_id)
 */
router.get('/files/:id/thumbnails', mediaAuth, mediaController.getFileThumbnails);

/**
 * POST /api/media/files/:id/crop
 * Crop image file
 * URL params: id (file_id)
 * Body: { x, y, width, height, quality }
 */
router.post('/files/:id/crop', mediaAuth, mediaController.cropImage);

// =============================================================================
// 6. SECURITY & SCANNING
// =============================================================================

/**
 * POST /api/media/files/:id/scan
 * Scan file for security threats
 * URL params: id (file_id)
 * Body: { scan_type, deep_scan }
 */
router.post('/files/:id/scan', [...mediaAuth, validateScanRequest], mediaController.scanFile);

/**
 * GET /api/media/files/:id/scan-results
 * Get file scan results
 * URL params: id (file_id)
 */
router.get('/files/:id/scan-results', mediaAuth, mediaController.getFileScanResults);

/**
 * POST /api/media/bulk-scan
 * Bulk scan multiple files (admin only)
 * Body: { file_ids, scan_type, priority }
 */
router.post('/bulk-scan', [...adminAuth, validateBulkOperation], mediaController.bulkScanFiles);

/**
 * GET /api/media/quarantine
 * Get quarantined files (admin only)
 * Query params: reason, date_from, date_to, page, limit
 */
router.get('/quarantine', adminAuth, mediaController.getQuarantinedFiles);

/**
 * POST /api/media/quarantine/:id/release
 * Release file from quarantine (admin only)
 * URL params: id (file_id)
 * Body: { release_reason, notify_user }
 */
router.post('/quarantine/:id/release', adminAuth, mediaController.releaseFromQuarantine);

// =============================================================================
// 7. BULK OPERATIONS
// =============================================================================

/**
 * POST /api/media/bulk-delete
 * Bulk delete files
 * Body: { file_ids, permanent, reason }
 */
router.post('/bulk-delete', [...bulkAuth, validateBulkOperation], mediaController.bulkDeleteFiles);

/**
 * POST /api/media/bulk-move
 * Bulk move files to different session
 * Body: { file_ids, target_session_id, reason }
 */
router.post('/bulk-move', [...bulkAuth, validateBulkOperation], mediaController.bulkMoveFiles);

/**
 * POST /api/media/bulk-tag
 * Bulk add tags to files
 * Body: { file_ids, tags, operation }
 */
router.post('/bulk-tag', [...bulkAuth, validateBulkOperation], mediaController.bulkTagFiles);

/**
 * POST /api/media/bulk-download
 * Bulk download files as zip
 * Body: { file_ids, compression_level }
 */
router.post('/bulk-download', bulkAuth, mediaController.bulkDownloadFiles);

/**
 * GET /api/media/bulk-operations/:id/status
 * Get bulk operation status
 * URL params: id (operation_id)
 */
router.get('/bulk-operations/:id/status', mediaAuth, mediaController.getBulkOperationStatus);

// =============================================================================
// 8. STORAGE & ANALYTICS
// =============================================================================

/**
 * GET /api/media/storage/usage
 * Get user's storage usage statistics
 */
router.get('/storage/usage', mediaAuth, mediaController.getStorageUsage);

/**
 * GET /api/media/storage/quota
 * Get user's storage quota and limits
 */
router.get('/storage/quota', mediaAuth, mediaController.getStorageQuota);

/**
 * GET /api/media/analytics
 * Get media analytics (admin only)
 * Query params: date_from, date_to, breakdown_by, metrics
 */
router.get('/analytics', adminAuth, mediaController.getMediaAnalytics);

/**
 * GET /api/media/analytics/types
 * Get file type analytics (admin only)
 * Query params: period, include_sizes
 */
router.get('/analytics/types', adminAuth, mediaController.getFileTypeAnalytics);

/**
 * GET /api/media/analytics/usage
 * Get storage usage analytics (admin only)
 * Query params: period, user_breakdown
 */
router.get('/analytics/usage', adminAuth, mediaController.getStorageAnalytics);

// =============================================================================
// 9. ADMIN FILE MANAGEMENT
// =============================================================================

/**
 * GET /api/media/admin/all-files
 * Get all files in system (admin only)
 * Query params: user_id, type, status, page, limit, search, date_from, date_to
 */
router.get('/admin/all-files', adminAuth, mediaController.getAllFiles);

/**
 * GET /api/media/admin/user/:user_id/files
 * Get specific user's files (admin only)
 * URL params: user_id
 * Query params: type, page, limit, include_deleted
 */
router.get('/admin/user/:user_id/files', adminAuth, mediaController.getUserFilesAdmin);

/**
 * POST /api/media/admin/files/:id/flag
 * Flag file for review (admin only)
 * URL params: id (file_id)
 * Body: { flag_reason, severity, automatic_action }
 */
router.post('/admin/files/:id/flag', adminAuth, mediaController.flagFile);

/**
 * DELETE /api/media/admin/files/:id/permanent
 * Permanently delete file (admin only)
 * URL params: id (file_id)
 * Body: { reason, backup_before_delete }
 */
router.delete('/admin/files/:id/permanent', adminAuth, mediaController.permanentDeleteFile);

/**
 * POST /api/media/admin/cleanup
 * Run storage cleanup operations (admin only)
 * Body: { cleanup_type, dry_run, older_than_days }
 */
router.post('/admin/cleanup', adminAuth, mediaController.runStorageCleanup);

// =============================================================================
// 10. FILE SHARING & COLLABORATION
// =============================================================================

/**
 * POST /api/media/files/:id/share
 * Share file with others
 * URL params: id (file_id)
 * Body: { share_with, permissions, expiry_date, message }
 */
router.post('/files/:id/share', mediaAuth, mediaController.shareFile);

/**
 * GET /api/media/shared-with-me
 * Get files shared with current user
 * Query params: shared_by, type, page, limit
 */
router.get('/shared-with-me', mediaAuth, mediaController.getSharedWithMeFiles);

/**
 * GET /api/media/shared-by-me
 * Get files shared by current user
 * Query params: shared_with, type, page, limit
 */
router.get('/shared-by-me', mediaAuth, mediaController.getSharedByMeFiles);

/**
 * PUT /api/media/files/:id/share/:share_id
 * Update file sharing permissions
 * URL params: id (file_id), share_id
 * Body: { permissions, expiry_date }
 */
router.put('/files/:id/share/:share_id', mediaAuth, mediaController.updateFileSharing);

/**
 * DELETE /api/media/files/:id/share/:share_id
 * Remove file sharing
 * URL params: id (file_id), share_id
 */
router.delete('/files/:id/share/:share_id', mediaAuth, mediaController.removeFileSharing);

// =============================================================================
// 11. BACKUP & RECOVERY
// =============================================================================

/**
 * POST /api/media/backup/create
 * Create backup of user's files
 * Body: { backup_type, file_selection, compression }
 */
router.post('/backup/create', mediaAuth, mediaController.createBackup);

/**
 * GET /api/media/backups
 * Get user's backup history
 * Query params: page, limit, status
 */
router.get('/backups', mediaAuth, mediaController.getUserBackups);

/**
 * GET /api/media/backups/:id/download
 * Download backup file
 * URL params: id (backup_id)
 */
router.get('/backups/:id/download', mediaAuth, mediaController.downloadBackup);

/**
 * POST /api/media/backup/:id/restore
 * Restore from backup
 * URL params: id (backup_id)
 * Body: { restore_options, overwrite_existing }
 */
router.post('/backup/:id/restore', mediaAuth, mediaController.restoreFromBackup);

/**
 * DELETE /api/media/backups/:id
 * Delete backup
 * URL params: id (backup_id)
 */
router.delete('/backups/:id', mediaAuth, mediaController.deleteBackup);

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================
router.use((error, req, res, next) => {
  console.error('Media API Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    user: req.user?.id,
    file: req.file?.filename,
    timestamp: new Date().toISOString()
  });

  // Handle multer-specific errors
  if (error instanceof multer.MulterError) {
    let message = 'File upload error';
    let code = 'UPLOAD_ERROR';

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File size too large (max 50MB)';
        code = 'FILE_SIZE_LIMIT_EXCEEDED';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files (max 10 files)';
        code = 'FILE_COUNT_LIMIT_EXCEEDED';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        code = 'UNEXPECTED_FILE_FIELD';
        break;
    }

    return res.status(400).json({
      success: false,
      error: message,
      code: code,
      timestamp: new Date().toISOString()
    });
  }

  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Media operation failed',
    code: error.code || 'MEDIA_ERROR',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 