/**
 * 🧹 DAILY ZODIAC TTS CLEANUP SERVICE
 * 
 * AUTO-DELETE POLICY:
 * - After each successful daily generation, automatically delete all previous audio files
 * - Keep only today's zodiac audio files in Supabase Storage and database
 * - No orphaned or leftover mp3 files for previous days
 * - Prevent accidental playback of old horoscopes
 */

import { supabaseAdmin } from '../lib/supabase.js';

class ZodiacCleanupService {
  constructor() {
    this.BUCKET_NAME = 'zodiac-audio';
    this.zodiacSigns = [
      'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
      'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
    ];
  }

  /**
   * 🚨 MAIN CLEANUP FUNCTION
   * Called after successful daily generation to remove old files
   */
  async cleanupOldZodiacFiles(currentDate, adminUserId = null) {
    try {
      console.log('🧹 [CLEANUP] Starting zodiac audio cleanup...');
      console.log('📅 Current date (keep):', currentDate);
      
      const cleanupResults = {
        success: true,
        currentDate,
        deletedFiles: [],
        updatedRecords: [],
        errors: [],
        summary: {
          storageFilesDeleted: 0,
          databaseRecordsUpdated: 0,
          totalErrors: 0
        }
      };

      // 1. Create bucket if it doesn't exist
      await this.ensureBucketExists();

      // 2. Clean up Supabase Storage files
      const storageCleanup = await this.cleanupStorageFiles(currentDate);
      cleanupResults.deletedFiles = storageCleanup.deletedFiles;
      cleanupResults.summary.storageFilesDeleted = storageCleanup.deletedCount;
      cleanupResults.errors.push(...storageCleanup.errors);

      // 3. Clean up database references
      const dbCleanup = await this.cleanupDatabaseReferences(currentDate);
      cleanupResults.updatedRecords = dbCleanup.updatedRecords;
      cleanupResults.summary.databaseRecordsUpdated = dbCleanup.updatedCount;
      cleanupResults.errors.push(...dbCleanup.errors);

      // 4. Log cleanup audit
      await this.logCleanupAudit(cleanupResults, adminUserId);

      cleanupResults.summary.totalErrors = cleanupResults.errors.length;
      cleanupResults.success = cleanupResults.errors.length === 0;

      if (cleanupResults.success) {
        console.log('✅ [CLEANUP] Zodiac cleanup completed successfully');
        console.log(`📊 Files deleted: ${cleanupResults.summary.storageFilesDeleted}`);
        console.log(`📊 Records updated: ${cleanupResults.summary.databaseRecordsUpdated}`);
      } else {
        console.error('⚠️ [CLEANUP] Cleanup completed with errors:', cleanupResults.errors);
      }

      return cleanupResults;

    } catch (error) {
      console.error('🚨 [CLEANUP] Critical cleanup error:', error);
      return {
        success: false,
        error: error.message,
        currentDate,
        deletedFiles: [],
        updatedRecords: [],
        errors: [error.message]
      };
    }
  }

  /**
   * 🪣 Ensure Supabase Storage bucket exists
   */
  async ensureBucketExists() {
    try {
      // Check if bucket exists
      const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
      if (listError) {
        throw new Error(`Failed to list buckets: ${listError.message}`);
      }

      const existingBucket = buckets.find(b => b.name === this.BUCKET_NAME);
      if (existingBucket) {
        console.log('✅ [CLEANUP] Storage bucket exists:', this.BUCKET_NAME);
        return true;
      }

      // Create bucket
      console.log('🚨 [CLEANUP] Creating missing storage bucket:', this.BUCKET_NAME);
      const { data, error } = await supabaseAdmin.storage.createBucket(this.BUCKET_NAME, {
        public: true,
        allowedMimeTypes: ['audio/mpeg', 'audio/mp3'],
        fileSizeLimit: 10485760 // 10MB per file
      });

      if (error) {
        throw new Error(`Failed to create bucket: ${error.message}`);
      }

      console.log('✅ [CLEANUP] Storage bucket created successfully');
      return true;

    } catch (error) {
      console.error('❌ [CLEANUP] Bucket creation failed:', error);
      throw error;
    }
  }

  /**
   * 🗑️ Clean up old files from Supabase Storage
   */
  async cleanupStorageFiles(currentDate) {
    try {
      console.log('🧹 [CLEANUP] Scanning storage for old files...');
      
      const results = {
        deletedFiles: [],
        deletedCount: 0,
        errors: []
      };

      // List all files in the zodiac-audio bucket
      const { data: files, error: listError } = await supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .list('', { limit: 1000 });

      if (listError) {
        results.errors.push(`Failed to list storage files: ${listError.message}`);
        return results;
      }

      if (!files || files.length === 0) {
        console.log('ℹ️ [CLEANUP] No files found in storage');
        return results;
      }

      // Filter files that are NOT from current date
      const filesToDelete = files.filter(file => {
        if (!file.name.includes('.mp3')) return false;
        
        // Extract date from filename pattern: [sign]-YYYY-MM-DD-[lang]-[hash].mp3
        const dateMatch = file.name.match(/\d{4}-\d{2}-\d{2}/);
        if (!dateMatch) return false;
        
        const fileDate = dateMatch[0];
        return fileDate !== currentDate;
      });

      console.log(`🔍 [CLEANUP] Found ${filesToDelete.length} old files to delete`);

      // Delete old files
      if (filesToDelete.length > 0) {
        const filePaths = filesToDelete.map(file => file.name);
        
        const { data: deleteData, error: deleteError } = await supabaseAdmin.storage
          .from(this.BUCKET_NAME)
          .remove(filePaths);

        if (deleteError) {
          results.errors.push(`Failed to delete storage files: ${deleteError.message}`);
        } else {
          results.deletedFiles = filePaths;
          results.deletedCount = filePaths.length;
          console.log(`✅ [CLEANUP] Deleted ${filePaths.length} old storage files`);
        }
      }

      return results;

    } catch (error) {
      console.error('❌ [CLEANUP] Storage cleanup error:', error);
      return {
        deletedFiles: [],
        deletedCount: 0,
        errors: [error.message]
      };
    }
  }

  /**
   * 🗃️ Clean up database references to deleted files
   */
  async cleanupDatabaseReferences(currentDate) {
    try {
      console.log('🧹 [CLEANUP] Cleaning database references...');
      
      const results = {
        updatedRecords: [],
        updatedCount: 0,
        errors: []
      };

      // Find all zodiac records that are NOT from current date
      const { data: oldRecords, error: fetchError } = await supabaseAdmin
        .from('daily_zodiac')
        .select('id, zodiac_sign, date, audio_ar_url, audio_en_url')
        .neq('date', currentDate);

      if (fetchError) {
        results.errors.push(`Failed to fetch old records: ${fetchError.message}`);
        return results;
      }

      if (!oldRecords || oldRecords.length === 0) {
        console.log('ℹ️ [CLEANUP] No old database records found');
        return results;
      }

      console.log(`🔍 [CLEANUP] Found ${oldRecords.length} old database records`);

      // Update records to remove audio URLs
      for (const record of oldRecords) {
        try {
          const { data: updateData, error: updateError } = await supabaseAdmin
            .from('daily_zodiac')
            .update({
              audio_ar_url: null,
              audio_en_url: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', record.id);

          if (updateError) {
            results.errors.push(`Failed to update record ${record.id}: ${updateError.message}`);
          } else {
            results.updatedRecords.push({
              id: record.id,
              zodiac_sign: record.zodiac_sign,
              date: record.date,
              previous_ar_url: record.audio_ar_url,
              previous_en_url: record.audio_en_url
            });
            results.updatedCount++;
          }
        } catch (recordError) {
          results.errors.push(`Error updating record ${record.id}: ${recordError.message}`);
        }
      }

      console.log(`✅ [CLEANUP] Updated ${results.updatedCount} database records`);
      return results;

    } catch (error) {
      console.error('❌ [CLEANUP] Database cleanup error:', error);
      return {
        updatedRecords: [],
        updatedCount: 0,
        errors: [error.message]
      };
    }
  }

  /**
   * 📝 Log cleanup audit for tracking
   */
  async logCleanupAudit(cleanupResults, adminUserId) {
    try {
      const auditLog = {
        event_type: 'zodiac_cleanup',
        event_date: new Date().toISOString(),
        performed_by: adminUserId,
        details: {
          current_date: cleanupResults.currentDate,
          files_deleted: cleanupResults.summary.storageFilesDeleted,
          records_updated: cleanupResults.summary.databaseRecordsUpdated,
          total_errors: cleanupResults.summary.totalErrors,
          success: cleanupResults.success,
          deleted_files: cleanupResults.deletedFiles,
          errors: cleanupResults.errors
        }
      };

      // Log to audit table (if exists) or console
      console.log('📝 [CLEANUP] Audit log:', JSON.stringify(auditLog, null, 2));

      // Optional: Save to database audit table
      // const { error } = await supabaseAdmin
      //   .from('system_audit_logs')
      //   .insert(auditLog);

    } catch (error) {
      console.error('⚠️ [CLEANUP] Audit logging failed:', error);
    }
  }

  /**
   * 🔍 Get cleanup status and statistics
   */
  async getCleanupStatus() {
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const zodiacBucket = buckets?.find(b => b.name === this.BUCKET_NAME);

      const { data: files } = await supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .list('', { limit: 1000 });

      const { data: records } = await supabaseAdmin
        .from('daily_zodiac')
        .select('date, zodiac_sign, audio_ar_url, audio_en_url')
        .order('date', { ascending: false })
        .limit(100);

      const today = new Date().toISOString().split('T')[0];
      const todayFiles = files?.filter(f => f.name.includes(today)) || [];
      const todayRecords = records?.filter(r => r.date === today) || [];

      return {
        success: true,
        data: {
          bucket_exists: !!zodiacBucket,
          bucket_public: zodiacBucket?.public || false,
          total_files: files?.length || 0,
          today_files: todayFiles.length,
          total_records: records?.length || 0,
          today_records: todayRecords.length,
          today_date: today,
          cleanup_needed: (files?.length || 0) > todayFiles.length
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🧪 Test cleanup functionality
   */
  async testCleanup() {
    try {
      console.log('🧪 [CLEANUP] Running cleanup test...');
      
      const testDate = '2025-06-25'; // Use current test date
      const results = await this.cleanupOldZodiacFiles(testDate, 'test-user');
      
      console.log('🧪 [CLEANUP] Test results:', results);
      return results;

    } catch (error) {
      console.error('🚨 [CLEANUP] Test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const zodiacCleanupService = new ZodiacCleanupService(); 