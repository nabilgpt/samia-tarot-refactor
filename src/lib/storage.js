/**
 * Backblaze B2 Storage Integration
 * Replaces AWS S3 with Backblaze B2 for file uploads
 */

// Backblaze B2 configuration
const B2_CONFIG = {
  applicationKeyId: import.meta.env.VITE_B2_APPLICATION_KEY_ID,
  applicationKey: import.meta.env.VITE_B2_APPLICATION_KEY,
  bucketId: import.meta.env.VITE_B2_BUCKET_ID,
  bucketName: import.meta.env.VITE_B2_BUCKET_NAME,
  endpoint: import.meta.env.VITE_B2_ENDPOINT || 'https://s3.us-west-004.backblazeb2.com'
};

// Supported file types
const SUPPORTED_FILE_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm'],
  documents: ['application/pdf', 'text/plain'],
  all: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm', 'application/pdf', 'text/plain']
};

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024, // 10MB
  audio: 50 * 1024 * 1024, // 50MB
  document: 25 * 1024 * 1024, // 25MB
  default: 10 * 1024 * 1024 // 10MB
};

/**
 * Get B2 authorization token
 */
const getB2AuthToken = async () => {
  try {
    const response = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`${B2_CONFIG.applicationKeyId}:${B2_CONFIG.applicationKey}`)}`
      }
    });

    if (!response.ok) {
      throw new Error(`B2 authorization failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      authorizationToken: data.authorizationToken,
      apiUrl: data.apiUrl,
      downloadUrl: data.downloadUrl
    };
  } catch (error) {
    console.error('B2 Authorization Error:', error);
    throw new Error('Failed to authorize with Backblaze B2');
  }
};

/**
 * Get upload URL from B2
 */
const getB2UploadUrl = async (authToken, apiUrl) => {
  try {
    const response = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: 'POST',
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bucketId: B2_CONFIG.bucketId
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to get upload URL: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      uploadUrl: data.uploadUrl,
      authorizationToken: data.authorizationToken
    };
  } catch (error) {
    console.error('B2 Upload URL Error:', error);
    throw new Error('Failed to get upload URL from Backblaze B2');
  }
};

/**
 * Generate unique filename
 */
const generateFileName = (originalName, prefix = '') => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  const baseName = originalName.split('.').slice(0, -1).join('.');
  
  // Sanitize filename
  const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9\-_]/g, '_');
  
  return `${prefix}${prefix ? '_' : ''}${sanitizedBaseName}_${timestamp}_${randomString}.${extension}`;
};

/**
 * Validate file before upload
 */
const validateFile = (file, fileType = 'all') => {
  const errors = [];

  // Check if file exists
  if (!file) {
    errors.push('No file provided');
    return { isValid: false, errors };
  }

  // Check file type
  const allowedTypes = SUPPORTED_FILE_TYPES[fileType] || SUPPORTED_FILE_TYPES.all;
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not supported. Allowed types: ${allowedTypes.join(', ')}`);
  }

  // Check file size
  const sizeLimit = FILE_SIZE_LIMITS[fileType] || FILE_SIZE_LIMITS.default;
  if (file.size > sizeLimit) {
    const sizeLimitMB = Math.round(sizeLimit / (1024 * 1024));
    errors.push(`File size exceeds ${sizeLimitMB}MB limit`);
  }

  // Check filename
  if (!file.name || file.name.length === 0) {
    errors.push('File must have a name');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Upload file to Backblaze B2
 */
export const uploadToB2 = async (file, options = {}) => {
  const {
    fileType = 'all',
    prefix = '',
    onProgress = null,
    metadata = {}
  } = options;

  try {
    // Validate file
    const validation = validateFile(file, fileType);
    if (!validation.isValid) {
      throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
    }

    // Generate unique filename
    const fileName = generateFileName(file.name, prefix);

    // Get B2 authorization
    const auth = await getB2AuthToken();
    
    // Get upload URL
    const uploadInfo = await getB2UploadUrl(auth.authorizationToken, auth.apiUrl);

    // Prepare file data
    const fileData = new FormData();
    fileData.append('file', file);

    // Calculate SHA1 hash (required by B2)
    const sha1Hash = await calculateSHA1(file);

    // Upload file to B2
    const uploadResponse = await fetch(uploadInfo.uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': uploadInfo.authorizationToken,
        'X-Bz-File-Name': encodeURIComponent(fileName),
        'Content-Type': file.type,
        'X-Bz-Content-Sha1': sha1Hash,
        'X-Bz-Info-src_last_modified_millis': Date.now().toString(),
        ...Object.keys(metadata).reduce((acc, key) => {
          acc[`X-Bz-Info-${key}`] = metadata[key];
          return acc;
        }, {})
      },
      body: file
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.text();
      throw new Error(`Upload failed: ${uploadResponse.statusText} - ${errorData}`);
    }

    const uploadResult = await uploadResponse.json();

    // Construct public URL
    const publicUrl = `${auth.downloadUrl}/file/${B2_CONFIG.bucketName}/${fileName}`;

    return {
      success: true,
      fileId: uploadResult.fileId,
      fileName: fileName,
      originalName: file.name,
      url: publicUrl,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      metadata: uploadResult
    };

  } catch (error) {
    console.error('B2 Upload Error:', error);
    return {
      success: false,
      error: error.message || 'Upload failed'
    };
  }
};

/**
 * Calculate SHA1 hash of file (required by B2)
 */
const calculateSHA1 = async (file) => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Delete file from B2
 */
export const deleteFromB2 = async (fileId, fileName) => {
  try {
    // Get B2 authorization
    const auth = await getB2AuthToken();

    // Delete file
    const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_delete_file_version`, {
      method: 'POST',
      headers: {
        'Authorization': auth.authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileId: fileId,
        fileName: fileName
      })
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }

    return {
      success: true,
      message: 'File deleted successfully'
    };

  } catch (error) {
    console.error('B2 Delete Error:', error);
    return {
      success: false,
      error: error.message || 'Delete failed'
    };
  }
};

/**
 * Get file info from B2
 */
export const getFileInfo = async (fileId) => {
  try {
    // Get B2 authorization
    const auth = await getB2AuthToken();

    // Get file info
    const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_file_info`, {
      method: 'POST',
      headers: {
        'Authorization': auth.authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileId: fileId
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to get file info: ${response.statusText}`);
    }

    const fileInfo = await response.json();
    return {
      success: true,
      data: fileInfo
    };

  } catch (error) {
    console.error('B2 File Info Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get file info'
    };
  }
};

/**
 * Upload multiple files
 */
export const uploadMultipleToB2 = async (files, options = {}) => {
  const results = [];
  const {
    onProgress = null,
    onFileComplete = null
  } = options;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: files.length,
          fileName: file.name,
          status: 'uploading'
        });
      }

      const result = await uploadToB2(file, options);
      results.push(result);

      if (onFileComplete) {
        onFileComplete(result, i + 1, files.length);
      }

    } catch (error) {
      const errorResult = {
        success: false,
        error: error.message,
        fileName: file.name
      };
      results.push(errorResult);

      if (onFileComplete) {
        onFileComplete(errorResult, i + 1, files.length);
      }
    }
  }

  return results;
};

/**
 * Generate signed URL for private files (if needed)
 */
export const generateSignedUrl = async (fileName, expirationSeconds = 3600) => {
  try {
    // Get B2 authorization
    const auth = await getB2AuthToken();

    // For B2, we can use the download authorization endpoint
    const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_download_authorization`, {
      method: 'POST',
      headers: {
        'Authorization': auth.authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bucketId: B2_CONFIG.bucketId,
        fileNamePrefix: fileName,
        validDurationInSeconds: expirationSeconds
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to generate signed URL: ${response.statusText}`);
    }

    const data = await response.json();
    const signedUrl = `${auth.downloadUrl}/file/${B2_CONFIG.bucketName}/${fileName}?Authorization=${data.authorizationToken}`;

    return {
      success: true,
      url: signedUrl,
      expiresAt: new Date(Date.now() + expirationSeconds * 1000).toISOString()
    };

  } catch (error) {
    console.error('B2 Signed URL Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate signed URL'
    };
  }
};

/**
 * Helper functions for specific file types
 */

// Upload image
export const uploadImage = (file, options = {}) => {
  return uploadToB2(file, { ...options, fileType: 'images', prefix: 'images' });
};

// Upload audio
export const uploadAudio = (file, options = {}) => {
  return uploadToB2(file, { ...options, fileType: 'audio', prefix: 'audio' });
};

// Upload document
export const uploadDocument = (file, options = {}) => {
  return uploadToB2(file, { ...options, fileType: 'documents', prefix: 'documents' });
};

// Upload profile picture (using Supabase Storage as specified)
export const uploadProfilePicture = async (file, userId) => {
  // This still uses Supabase Storage as specified in requirements
  const { supabase } = await import('./supabase');
  
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}_${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { data, error } = await supabase.storage
      .from('profiles')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('profiles')
      .getPublicUrl(filePath);

    return {
      success: true,
      url: publicUrl,
      path: filePath,
      fileName: fileName
    };

  } catch (error) {
    console.error('Profile Picture Upload Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload profile picture'
    };
  }
};

/**
 * Storage configuration and utilities
 */
export const storageConfig = {
  B2_CONFIG,
  SUPPORTED_FILE_TYPES,
  FILE_SIZE_LIMITS,
  validateFile,
  generateFileName
};

export default {
  uploadToB2,
  deleteFromB2,
  getFileInfo,
  uploadMultipleToB2,
  generateSignedUrl,
  uploadImage,
  uploadAudio,
  uploadDocument,
  uploadProfilePicture,
  storageConfig
}; 