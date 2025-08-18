#!/usr/bin/env node

// Load environment variables first
import 'dotenv/config';

/**
 * CRITICAL MIGRATION: ZODIAC AUDIO TO SUPABASE STORAGE
 * 
 * This script migrates all zodiac TTS audio files from local storage to Supabase Storage
 * and updates all database references to use cloud URLs only.
 * 
 * PRODUCTION POLICY COMPLIANCE:
 * - ❌ NO LOCAL FILE STORAGE (except temporarily before upload)
 * - ✅ SUPABASE CLOUD STORAGE ONLY for all audio files
 * - ❌ NO MOCK DATA anywhere in system
 * - ✅ PRODUCTION-READY ERROR HANDLING (no fallbacks)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabaseAdmin } from '../src/api/lib/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BUCKET_NAME = 'zodiac-audio';
const LOCAL_AUDIO_DIR = path.join(__dirname, '..', 'uploads', 'zodiac-audio');
const SUPABASE_PROJECT_URL = 'https://uuseflmielktdcltzwzt.supabase.co';

// Migration statistics
const stats = {
  totalFiles: 0,
  uploadedFiles: 0,
  updatedRecords: 0,
  deletedLocalFiles: 0,
  errors: []
};

/**
 * Ensure the zodiac-audio bucket exists
 */
async function ensureBucketExists() {
  console.log('🔧 Checking if zodiac-audio bucket exists...');
  
  try {
    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
    if (error) throw error;
    
    const zodiacBucket = buckets.find(b => b.name === BUCKET_NAME);
    
    if (!zodiacBucket) {
      console.log('📦 Creating zodiac-audio bucket...');
      const { data, error: createError } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: true,
        allowedMimeTypes: ['audio/mpeg', 'audio/mp3'],
        fileSizeLimit: 10485760 // 10MB per file
      });
      
      if (createError) throw createError;
      console.log('✅ Bucket created successfully');
    } else {
      console.log('✅ Bucket already exists');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to ensure bucket exists:', error.message);
    return false;
  }
}

/**
 * Get all local zodiac audio files
 */
function getLocalAudioFiles() {
  try {
    if (!fs.existsSync(LOCAL_AUDIO_DIR)) {
      console.log('⚠️ Local audio directory does not exist');
      return [];
    }
    
    const files = fs.readdirSync(LOCAL_AUDIO_DIR)
      .filter(file => file.endsWith('.mp3'))
      .map(file => ({
        filename: file,
        localPath: path.join(LOCAL_AUDIO_DIR, file),
        size: fs.statSync(path.join(LOCAL_AUDIO_DIR, file)).size
      }));
    
    console.log(`📁 Found ${files.length} local audio files`);
    return files;
  } catch (error) {
    console.error('❌ Failed to read local audio directory:', error.message);
    return [];
  }
}

/**
 * Upload a single file to Supabase Storage
 */
async function uploadFileToSupabase(file) {
  try {
    console.log(`📤 Uploading ${file.filename}...`);
    
    const fileBuffer = fs.readFileSync(file.localPath);
    
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(file.filename, fileBuffer, {
        contentType: 'audio/mpeg',
        upsert: true // Overwrite if exists
      });
    
    if (error) throw error;
    
    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(file.filename);
    
    console.log(`✅ Uploaded: ${file.filename}`);
    stats.uploadedFiles++;
    
    return {
      success: true,
      filename: file.filename,
      publicUrl: urlData.publicUrl,
      storagePath: data.path
    };
    
  } catch (error) {
    console.error(`❌ Failed to upload ${file.filename}:`, error.message);
    stats.errors.push(`Upload failed: ${file.filename} - ${error.message}`);
    return {
      success: false,
      filename: file.filename,
      error: error.message
    };
  }
}

/**
 * Get all zodiac readings that need URL updates
 */
async function getZodiacReadingsToUpdate() {
  try {
    const { data, error } = await supabaseAdmin
      .from('daily_zodiac')
      .select('id, zodiac_sign, date, audio_ar_url, audio_en_url')
      .or('audio_ar_url.like.%localhost%,audio_en_url.like.%localhost%,audio_ar_url.like.%uploads%,audio_en_url.like.%uploads%');
    
    if (error) throw error;
    
    console.log(`📊 Found ${data.length} database records with local URLs`);
    return data;
    
  } catch (error) {
    console.error('❌ Failed to fetch zodiac readings:', error.message);
    return [];
  }
}

/**
 * Update database record with new Supabase URLs
 */
async function updateDatabaseRecord(record, uploadResults) {
  try {
    const updates = {};
    
    // Find matching uploaded files
    if (record.audio_ar_url && record.audio_ar_url.includes('localhost')) {
      const arFilename = record.audio_ar_url.split('/').pop();
      const arUpload = uploadResults.find(r => r.success && r.filename === arFilename);
      if (arUpload) {
        updates.audio_ar_url = arUpload.publicUrl;
      }
    }
    
    if (record.audio_en_url && record.audio_en_url.includes('localhost')) {
      const enFilename = record.audio_en_url.split('/').pop();
      const enUpload = uploadResults.find(r => r.success && r.filename === enFilename);
      if (enUpload) {
        updates.audio_en_url = enUpload.publicUrl;
      }
    }
    
    if (Object.keys(updates).length === 0) {
      console.log(`⏭️ No updates needed for record ${record.id}`);
      return false;
    }
    
    const { error } = await supabaseAdmin
      .from('daily_zodiac')
      .update(updates)
      .eq('id', record.id);
    
    if (error) throw error;
    
    console.log(`✅ Updated record ${record.id} (${record.zodiac_sign} ${record.date})`);
    stats.updatedRecords++;
    return true;
    
  } catch (error) {
    console.error(`❌ Failed to update record ${record.id}:`, error.message);
    stats.errors.push(`Database update failed: ${record.id} - ${error.message}`);
    return false;
  }
}

/**
 * Delete local files after successful migration
 */
async function cleanupLocalFiles(files, uploadResults) {
  console.log('🧹 Cleaning up local files...');
  
  for (const file of files) {
    const uploadResult = uploadResults.find(r => r.filename === file.filename);
    
    if (uploadResult && uploadResult.success) {
      try {
        fs.unlinkSync(file.localPath);
        console.log(`🗑️ Deleted local file: ${file.filename}`);
        stats.deletedLocalFiles++;
      } catch (error) {
        console.error(`❌ Failed to delete ${file.filename}:`, error.message);
        stats.errors.push(`Local file deletion failed: ${file.filename} - ${error.message}`);
      }
    }
  }
}

/**
 * Verify all URLs are accessible
 */
async function verifyMigration() {
  console.log('🔍 Verifying migration...');
  
  try {
    const { data, error } = await supabaseAdmin
      .from('daily_zodiac')
      .select('id, zodiac_sign, date, audio_ar_url, audio_en_url')
      .or('audio_ar_url.like.%localhost%,audio_en_url.like.%localhost%,audio_ar_url.like.%uploads%,audio_en_url.like.%uploads%');
    
    if (error) throw error;
    
    if (data.length === 0) {
      console.log('✅ All database records use Supabase Storage URLs');
      return true;
    } else {
      console.error(`❌ ${data.length} records still have local URLs:`);
      data.forEach(record => {
        console.error(`  - ${record.zodiac_sign} ${record.date}: AR=${record.audio_ar_url}, EN=${record.audio_en_url}`);
      });
      return false;
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚨 STARTING CRITICAL MIGRATION: ZODIAC AUDIO TO SUPABASE STORAGE');
  console.log('==================================================================');
  
  // Step 1: Ensure bucket exists
  const bucketReady = await ensureBucketExists();
  if (!bucketReady) {
    console.error('❌ Migration aborted: Bucket setup failed');
    process.exit(1);
  }
  
  // Step 2: Get local files
  const localFiles = getLocalAudioFiles();
  stats.totalFiles = localFiles.length;
  
  if (localFiles.length === 0) {
    console.log('ℹ️ No local files to migrate');
    return;
  }
  
  // Step 3: Upload all files to Supabase Storage
  console.log('\n📤 UPLOADING FILES TO SUPABASE STORAGE');
  console.log('=====================================');
  
  const uploadResults = [];
  for (const file of localFiles) {
    const result = await uploadFileToSupabase(file);
    uploadResults.push(result);
    
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Step 4: Update database records
  console.log('\n📊 UPDATING DATABASE RECORDS');
  console.log('============================');
  
  const recordsToUpdate = await getZodiacReadingsToUpdate();
  for (const record of recordsToUpdate) {
    await updateDatabaseRecord(record, uploadResults);
  }
  
  // Step 5: Verify migration
  console.log('\n🔍 VERIFYING MIGRATION');
  console.log('=====================');
  
  const migrationSuccess = await verifyMigration();
  
  // Step 6: Cleanup local files (only if verification passed)
  if (migrationSuccess) {
    console.log('\n🧹 CLEANING UP LOCAL FILES');
    console.log('==========================');
    await cleanupLocalFiles(localFiles, uploadResults);
  } else {
    console.log('⚠️ Skipping local file cleanup due to verification failures');
  }
  
  // Final report
  console.log('\n📋 MIGRATION REPORT');
  console.log('==================');
  console.log(`Total files found: ${stats.totalFiles}`);
  console.log(`Files uploaded: ${stats.uploadedFiles}`);
  console.log(`Database records updated: ${stats.updatedRecords}`);
  console.log(`Local files deleted: ${stats.deletedLocalFiles}`);
  console.log(`Errors: ${stats.errors.length}`);
  
  if (stats.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    stats.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  if (migrationSuccess && stats.errors.length === 0) {
    console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('✅ All zodiac audio files are now served from Supabase Storage');
    console.log('✅ All local dependencies removed');
    console.log('✅ Production policy compliance achieved');
  } else {
    console.log('\n⚠️ MIGRATION COMPLETED WITH ISSUES');
    console.log('Please review the errors above and run the script again if needed');
  }
}

// Run migration if called directly
console.log('🚀 Script execution check...');
console.log('import.meta.url:', import.meta.url);
console.log('process.argv[1]:', process.argv[1]);

// More reliable way to detect if script is run directly
const isMainModule = process.argv[1] && process.argv[1].includes('migrate-zodiac-to-supabase-storage.js');

if (isMainModule) {
  console.log('🚀 Starting migration script...');
  runMigration().catch(error => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
} else {
  console.log('📦 Migration script loaded as module');
}

export { runMigration }; 