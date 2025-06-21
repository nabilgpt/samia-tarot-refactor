// =============================================================================
// MEDIA & UPLOADS VALIDATORS - مدققات الوسائط والملفات
// =============================================================================
// Comprehensive validation schemas for media management system

const Joi = require('joi');

// =============================================================================
// 1. FILE UPLOAD VALIDATION
// =============================================================================

// Validate file upload
const validateFileUpload = (req, res, next) => {
  const schema = Joi.object({
    description: Joi.string().optional().max(500),
    tags: Joi.string().optional(), // JSON string of array
    visibility: Joi.string().valid('private', 'public', 'shared').default('private'),
    session_id: Joi.string().optional(),
    media_type: Joi.string().optional().valid('image', 'audio', 'video', 'document', 'avatar', 'session_media', 'voice_note'),
    duration: Joi.number().optional().min(0), // For audio/video files
    transcript: Joi.string().optional().max(5000), // For voice notes
    category: Joi.string().optional().max(100),
    alt_text: Joi.string().optional().max(200), // For accessibility
    compression_quality: Joi.number().optional().min(1).max(100),
    auto_process: Joi.boolean().default(true)
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'File upload validation failed',
      details: error.details[0].message
    });
  }
  next();
};

// =============================================================================
// 2. MEDIA UPDATE VALIDATION
// =============================================================================

// Validate media update
const validateMediaUpdate = (req, res, next) => {
  const schema = Joi.object({
    filename: Joi.string().optional().min(1).max(255),
    description: Joi.string().optional().max(500),
    tags: Joi.array().items(Joi.string().max(50)).optional(),
    visibility: Joi.string().optional().valid('private', 'public', 'shared'),
    category: Joi.string().optional().max(100),
    alt_text: Joi.string().optional().max(200),
    metadata: Joi.object().optional(),
    custom_properties: Joi.object().optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Media update validation failed',
      details: error.details[0].message
    });
  }
  next();
};

// =============================================================================
// 3. BULK OPERATIONS VALIDATION
// =============================================================================

// Validate bulk operation
const validateBulkOperation = (req, res, next) => {
  const schema = Joi.object({
    file_ids: Joi.array().items(Joi.string()).required().min(1).max(100),
    operation_type: Joi.string().optional().valid('delete', 'move', 'copy', 'tag', 'scan', 'download'),
    destination: Joi.string().optional().max(500), // For move/copy operations
    tags: Joi.array().items(Joi.string().max(50)).optional(), // For tag operations
    action: Joi.string().optional().valid('add', 'remove', 'replace'), // For tag operations
    scan_type: Joi.string().optional().valid('virus', 'malware', 'content', 'all'), // For scan operations
    force: Joi.boolean().default(false), // For force operations
    preserve_metadata: Joi.boolean().default(true),
    notification_enabled: Joi.boolean().default(true)
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Bulk operation validation failed',
      details: error.details[0].message
    });
  }
  next();
};

// =============================================================================
// 4. SCAN REQUEST VALIDATION
// =============================================================================

// Validate scan request
const validateScanRequest = (req, res, next) => {
  const schema = Joi.object({
    scan_type: Joi.string().required().valid('virus', 'malware', 'content', 'all'),
    priority: Joi.string().optional().valid('low', 'normal', 'high', 'urgent').default('normal'),
    deep_scan: Joi.boolean().default(false),
    quarantine_on_threat: Joi.boolean().default(true),
    notify_on_completion: Joi.boolean().default(true),
    scan_metadata: Joi.boolean().default(true),
    custom_rules: Joi.array().items(Joi.string()).optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Scan request validation failed',
      details: error.details[0].message
    });
  }
  next();
};

// =============================================================================
// 5. IMAGE PROCESSING VALIDATION
// =============================================================================

// Validate image resize
const validateImageResize = (req, res, next) => {
  const schema = Joi.object({
    width: Joi.number().required().min(1).max(4096),
    height: Joi.number().required().min(1).max(4096),
    quality: Joi.number().optional().min(1).max(100).default(85),
    format: Joi.string().optional().valid('jpeg', 'png', 'webp'),
    maintain_aspect_ratio: Joi.boolean().default(true),
    background_color: Joi.string().optional().pattern(/^#[0-9A-Fa-f]{6}$/),
    progressive: Joi.boolean().default(false)
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Image resize validation failed',
      details: error.details[0].message
    });
  }
  next();
};

// Validate image crop
const validateImageCrop = (req, res, next) => {
  const schema = Joi.object({
    x: Joi.number().required().min(0),
    y: Joi.number().required().min(0),
    width: Joi.number().required().min(1),
    height: Joi.number().required().min(1),
    quality: Joi.number().optional().min(1).max(100).default(85),
    format: Joi.string().optional().valid('jpeg', 'png', 'webp')
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Image crop validation failed',
      details: error.details[0].message
    });
  }
  next();
};

// Validate thumbnail generation
const validateThumbnailGeneration = (req, res, next) => {
  const schema = Joi.object({
    size: Joi.number().optional().min(50).max(500).default(150),
    quality: Joi.number().optional().min(1).max(100).default(80),
    format: Joi.string().optional().valid('jpeg', 'png', 'webp').default('jpeg'),
    crop_to_fit: Joi.boolean().default(true),
    background_color: Joi.string().optional().pattern(/^#[0-9A-Fa-f]{6}$/).default('#FFFFFF')
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Thumbnail generation validation failed',
      details: error.details[0].message
    });
  }
  next();
};

// =============================================================================
// 6. FILE SHARING VALIDATION
// =============================================================================

// Validate file sharing
const validateFileSharing = (req, res, next) => {
  const schema = Joi.object({
    share_with: Joi.alternatives().try(
      Joi.string(), // Single user ID
      Joi.array().items(Joi.string()) // Multiple user IDs
    ).required(),
    permissions: Joi.string().valid('view', 'download', 'edit', 'full').default('view'),
    expires_at: Joi.date().optional().greater('now'),
    password_protected: Joi.boolean().default(false),
    password: Joi.string().optional().min(6).max(50),
    download_limit: Joi.number().optional().min(1).max(1000),
    notify_recipients: Joi.boolean().default(true),
    allow_resharing: Joi.boolean().default(false),
    watermark: Joi.boolean().default(false)
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'File sharing validation failed',
      details: error.details[0].message
    });
  }
  next();
};

// =============================================================================
// 7. BACKUP & RESTORE VALIDATION
// =============================================================================

// Validate backup creation
const validateBackupCreation = (req, res, next) => {
  const schema = Joi.object({
    backup_type: Joi.string().valid('full', 'incremental', 'selective').default('full'),
    include_metadata: Joi.boolean().default(true),
    include_thumbnails: Joi.boolean().default(false),
    compression_level: Joi.number().min(0).max(9).default(6),
    encryption_enabled: Joi.boolean().default(true),
    file_types: Joi.array().items(Joi.string()).optional(), // For selective backup
    date_range: Joi.object({
      from: Joi.date().optional(),
      to: Joi.date().optional()
    }).optional(),
    schedule: Joi.object({
      enabled: Joi.boolean().default(false),
      frequency: Joi.string().valid('daily', 'weekly', 'monthly').optional(),
      time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional()
    }).optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Backup creation validation failed',
      details: error.details[0].message
    });
  }
  next();
};

// Validate backup restore
const validateBackupRestore = (req, res, next) => {
  const schema = Joi.object({
    restore_type: Joi.string().valid('full', 'selective').default('full'),
    overwrite_existing: Joi.boolean().default(false),
    restore_metadata: Joi.boolean().default(true),
    restore_permissions: Joi.boolean().default(true),
    file_selection: Joi.array().items(Joi.string()).optional(), // For selective restore
    destination_path: Joi.string().optional().max(500),
    conflict_resolution: Joi.string().valid('skip', 'overwrite', 'rename').default('rename'),
    verify_integrity: Joi.boolean().default(true)
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Backup restore validation failed',
      details: error.details[0].message
    });
  }
  next();
};

// =============================================================================
// 8. ADMIN OPERATIONS VALIDATION
// =============================================================================

// Validate file flagging
const validateFileFlagging = (req, res, next) => {
  const schema = Joi.object({
    reason: Joi.string().required().max(500),
    severity: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
    category: Joi.string().optional().valid('inappropriate', 'copyright', 'malware', 'spam', 'other'),
    action: Joi.string().valid('flag', 'quarantine', 'delete').default('flag'),
    notify_user: Joi.boolean().default(true),
    internal_notes: Joi.string().optional().max(1000),
    escalate: Joi.boolean().default(false)
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'File flagging validation failed',
      details: error.details[0].message
    });
  }
  next();
};

// Validate storage cleanup
const validateStorageCleanup = (req, res, next) => {
  const schema = Joi.object({
    cleanup_type: Joi.string().valid('orphaned', 'duplicates', 'old_files', 'large_files', 'all').default('orphaned'),
    dry_run: Joi.boolean().default(true),
    age_threshold_days: Joi.number().optional().min(1).max(3650), // For old files cleanup
    size_threshold_mb: Joi.number().optional().min(1).max(10240), // For large files cleanup
    file_types: Joi.array().items(Joi.string()).optional(),
    exclude_patterns: Joi.array().items(Joi.string()).optional(),
    force_cleanup: Joi.boolean().default(false),
    backup_before_cleanup: Joi.boolean().default(true)
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Storage cleanup validation failed',
      details: error.details[0].message
    });
  }
  next();
};

// =============================================================================
// 9. ANALYTICS & REPORTING VALIDATION
// =============================================================================

// Validate analytics request
const validateAnalyticsRequest = (req, res, next) => {
  const schema = Joi.object({
    date_range: Joi.object({
      from: Joi.date().required(),
      to: Joi.date().required().greater(Joi.ref('from'))
    }).optional(),
    metrics: Joi.array().items(
      Joi.string().valid('uploads', 'downloads', 'storage', 'users', 'file_types', 'performance')
    ).optional(),
    group_by: Joi.string().valid('day', 'week', 'month', 'year').default('day'),
    user_filter: Joi.string().optional(),
    file_type_filter: Joi.array().items(Joi.string()).optional(),
    include_deleted: Joi.boolean().default(false),
    export_format: Joi.string().valid('json', 'csv', 'pdf').default('json')
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Analytics request validation failed',
      details: error.details[0].message
    });
  }
  next();
};

// =============================================================================
// 10. SEARCH & FILTERING VALIDATION
// =============================================================================

// Validate media search
const validateMediaSearch = (req, res, next) => {
  const schema = Joi.object({
    query: Joi.string().optional().max(200),
    file_types: Joi.array().items(Joi.string()).optional(),
    size_range: Joi.object({
      min: Joi.number().min(0).optional(),
      max: Joi.number().min(0).optional()
    }).optional(),
    date_range: Joi.object({
      from: Joi.date().optional(),
      to: Joi.date().optional()
    }).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    visibility: Joi.array().items(Joi.string().valid('private', 'public', 'shared')).optional(),
    sort_by: Joi.string().valid('name', 'size', 'date', 'type', 'relevance').default('date'),
    sort_order: Joi.string().valid('asc', 'desc').default('desc'),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
    include_metadata: Joi.boolean().default(false)
  });

  const { error } = schema.validate(req.query);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Media search validation failed',
      details: error.details[0].message
    });
  }
  next();
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Core validations
  validateFileUpload,
  validateMediaUpdate,
  validateBulkOperation,
  validateScanRequest,
  
  // Image processing
  validateImageResize,
  validateImageCrop,
  validateThumbnailGeneration,
  
  // File sharing
  validateFileSharing,
  
  // Backup & restore
  validateBackupCreation,
  validateBackupRestore,
  
  // Admin operations
  validateFileFlagging,
  validateStorageCleanup,
  
  // Analytics & reporting
  validateAnalyticsRequest,
  
  // Search & filtering
  validateMediaSearch
}; 