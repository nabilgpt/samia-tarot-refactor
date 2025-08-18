#!/usr/bin/env node

/**
 * SAMIA TAROT - Storage Bucket Migration Script
 * Consolidates all chat-related files into unified chat-files bucket
 * 
 * CRITICAL: Run this after database migration
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables');
    console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');

console.log(`🗄️  STARTING STORAGE MIGRATION - ${timestamp}`);
console.log('='.repeat(60));

/**
 * Configuration for bucket migration
 */
const MIGRATION_CONFIG = {
    targetBucket: 'chat-files',
    sourceBuckets: ['chat-attachments', 'voice-notes'],
    pathFormat: '{session_id}/{user_id}/{filename}',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['audio/*', 'image/*', 'application/pdf', 'text/*'],
    batchSize: 50
};

/**
 * Ensure target bucket exists with proper policies
 */
async function ensureTargetBucket() {
    console.log('\n🗂️  Ensuring target bucket exists...');
    
    try {
        // Check if bucket exists
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        if (listError) throw listError;

        const targetExists = buckets.some(b => b.name === MIGRATION_CONFIG.targetBucket);
        
        if (!targetExists) {
            console.log(`  📁 Creating bucket: ${MIGRATION_CONFIG.targetBucket}`);
            const { error: createError } = await supabase.storage.createBucket(
                MIGRATION_CONFIG.targetBucket,
                { public: false }
            );
            if (createError) throw createError;
        }

        // Set up storage policies
        console.log('  🔒 Setting up storage policies...');
        
        // Remove any existing policies
        const { error: deletePolicyError } = await supabase.rpc('delete_storage_policy', {
            bucket_name: MIGRATION_CONFIG.targetBucket
        });
        // Ignore error if policy doesn't exist

        // Create secure access policy
        const policySQL = `
            CREATE POLICY "chat_files_participant_access" ON storage.objects
            FOR SELECT USING (
                bucket_id = '${MIGRATION_CONFIG.targetBucket}' AND
                EXISTS (
                    SELECT 1 FROM chat_sessions cs
                    WHERE cs.id::text = split_part(name, '/', 1)
                    AND auth.uid() = ANY(cs.participants)
                ) OR
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
                )
            );
            
            CREATE POLICY "chat_files_participant_upload" ON storage.objects
            FOR INSERT WITH CHECK (
                bucket_id = '${MIGRATION_CONFIG.targetBucket}' AND
                EXISTS (
                    SELECT 1 FROM chat_sessions cs
                    WHERE cs.id::text = split_part(name, '/', 1)
                    AND auth.uid() = ANY(cs.participants)
                )
            );
            
            CREATE POLICY "chat_files_admin_manage" ON storage.objects
            FOR ALL USING (
                bucket_id = '${MIGRATION_CONFIG.targetBucket}' AND
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
                )
            );
        `;

        const { error: policyError } = await supabase.rpc('execute_sql', {
            sql: policySQL
        });
        
        if (policyError) {
            console.warn('  ⚠️  Policy creation warning:', policyError.message);
        }

        console.log(`  ✅ Target bucket ${MIGRATION_CONFIG.targetBucket} ready`);
        return true;

    } catch (error) {
        console.error('  ❌ Failed to ensure target bucket:', error.message);
        return false;
    }
}

/**
 * Audit existing files in source buckets
 */
async function auditSourceBuckets() {
    console.log('\n📋 Auditing source buckets...');
    
    const auditResults = {};
    
    for (const bucketName of MIGRATION_CONFIG.sourceBuckets) {
        try {
            console.log(`  📁 Auditing bucket: ${bucketName}`);
            
            const { data: files, error } = await supabase.storage
                .from(bucketName)
                .list('', { limit: 1000 });

            if (error) {
                console.log(`  ⚠️  Bucket ${bucketName} not accessible: ${error.message}`);
                auditResults[bucketName] = { status: 'inaccessible', error: error.message };
                continue;
            }

            const fileCount = files ? files.length : 0;
            let totalSize = 0;
            const fileDetails = [];

            if (files && files.length > 0) {
                for (const file of files) {
                    const size = file.metadata?.size || 0;
                    totalSize += size;
                    
                    fileDetails.push({
                        name: file.name,
                        size,
                        lastModified: file.updated_at,
                        contentType: file.metadata?.mimetype
                    });
                }
            }

            console.log(`  ✅ ${bucketName}: ${fileCount} files, ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
            auditResults[bucketName] = {
                status: 'accessible',
                fileCount,
                totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
                files: fileDetails
            };

        } catch (error) {
            console.error(`  ❌ Error auditing bucket ${bucketName}:`, error.message);
            auditResults[bucketName] = { status: 'error', error: error.message };
        }
    }

    return auditResults;
}

/**
 * Map files to their target paths in unified bucket
 */
async function mapFilesToTargetPaths(auditResults) {
    console.log('\n🗺️  Mapping files to target paths...');
    
    const migrationMap = [];
    
    for (const [bucketName, audit] of Object.entries(auditResults)) {
        if (audit.status !== 'accessible' || !audit.files) continue;
        
        for (const file of audit.files) {
            try {
                // Extract session and user info from database
                const { data: messageData, error: queryError } = await supabase
                    .from('chat_messages')
                    .select('session_id, sender_id')
                    .eq('file_url', `${supabaseUrl}/storage/v1/object/public/${bucketName}/${file.name}`)
                    .single();

                let targetPath;
                
                if (messageData && !queryError) {
                    // Use actual session and user data
                    targetPath = `${messageData.session_id}/${messageData.sender_id}/${file.name}`;
                } else {
                    // Fallback: use timestamp-based organization
                    const dateFolder = new Date(file.lastModified).toISOString().split('T')[0];
                    targetPath = `unknown-session/${dateFolder}/${file.name}`;
                }

                migrationMap.push({
                    sourceBucket: bucketName,
                    sourceFile: file.name,
                    targetBucket: MIGRATION_CONFIG.targetBucket,
                    targetPath,
                    size: file.size,
                    contentType: file.contentType
                });

            } catch (error) {
                console.warn(`  ⚠️  Could not map file ${file.name}:`, error.message);
                
                // Add to migration map with fallback path
                migrationMap.push({
                    sourceBucket: bucketName,
                    sourceFile: file.name,
                    targetBucket: MIGRATION_CONFIG.targetBucket,
                    targetPath: `unmapped/${bucketName}/${file.name}`,
                    size: file.size,
                    contentType: file.contentType,
                    warning: 'Could not determine session/user mapping'
                });
            }
        }
    }

    console.log(`  ✅ Mapped ${migrationMap.length} files for migration`);
    return migrationMap;
}

/**
 * Execute file migration
 */
async function migrateFiles(migrationMap) {
    console.log('\n🚚 Executing file migration...');
    
    const results = {
        success: 0,
        failed: 0,
        skipped: 0,
        errors: []
    };

    // Process files in batches
    for (let i = 0; i < migrationMap.length; i += MIGRATION_CONFIG.batchSize) {
        const batch = migrationMap.slice(i, i + MIGRATION_CONFIG.batchSize);
        console.log(`  📦 Processing batch ${Math.floor(i / MIGRATION_CONFIG.batchSize) + 1}/${Math.ceil(migrationMap.length / MIGRATION_CONFIG.batchSize)}`);

        for (const file of batch) {
            try {
                // Check if file already exists in target
                const { data: existingFile } = await supabase.storage
                    .from(file.targetBucket)
                    .list(path.dirname(file.targetPath), {
                        search: path.basename(file.targetPath)
                    });

                if (existingFile && existingFile.length > 0) {
                    console.log(`    ⏭️  Skipping ${file.sourceFile} (already exists)`);
                    results.skipped++;
                    continue;
                }

                // Download from source bucket
                const { data: fileData, error: downloadError } = await supabase.storage
                    .from(file.sourceBucket)
                    .download(file.sourceFile);

                if (downloadError) throw downloadError;

                // Upload to target bucket
                const { error: uploadError } = await supabase.storage
                    .from(file.targetBucket)
                    .upload(file.targetPath, fileData, {
                        contentType: file.contentType,
                        upsert: false
                    });

                if (uploadError) throw uploadError;

                // Update database references
                const oldUrl = `${supabaseUrl}/storage/v1/object/public/${file.sourceBucket}/${file.sourceFile}`;
                const newUrl = `${supabaseUrl}/storage/v1/object/public/${file.targetBucket}/${file.targetPath}`;

                const { error: updateError } = await supabase
                    .from('chat_messages')
                    .update({ file_url: newUrl })
                    .eq('file_url', oldUrl);

                if (updateError) {
                    console.warn(`    ⚠️  Database update warning for ${file.sourceFile}:`, updateError.message);
                }

                console.log(`    ✅ Migrated ${file.sourceFile} → ${file.targetPath}`);
                results.success++;

            } catch (error) {
                console.error(`    ❌ Failed to migrate ${file.sourceFile}:`, error.message);
                results.failed++;
                results.errors.push({
                    file: file.sourceFile,
                    error: error.message
                });
            }
        }

        // Small delay between batches to avoid rate limiting
        if (i + MIGRATION_CONFIG.batchSize < migrationMap.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    return results;
}

/**
 * Verify migration completeness
 */
async function verifyMigration(migrationMap) {
    console.log('\n🔍 Verifying migration...');
    
    let verified = 0;
    let failed = 0;

    for (const file of migrationMap) {
        try {
            const { data, error } = await supabase.storage
                .from(file.targetBucket)
                .list(path.dirname(file.targetPath), {
                    search: path.basename(file.targetPath)
                });

            if (error) throw error;

            if (data && data.length > 0) {
                verified++;
            } else {
                failed++;
                console.warn(`  ⚠️  File not found in target: ${file.targetPath}`);
            }

        } catch (error) {
            failed++;
            console.error(`  ❌ Verification error for ${file.targetPath}:`, error.message);
        }
    }

    console.log(`  📊 Verification results: ${verified} verified, ${failed} failed`);
    return { verified, failed };
}

/**
 * Clean up source buckets (optional)
 */
async function cleanupSourceBuckets(auditResults, migrationResults) {
    console.log('\n🧹 Cleaning up source buckets...');
    
    if (migrationResults.failed > 0) {
        console.log('  ⚠️  Skipping cleanup due to migration failures');
        return false;
    }

    for (const bucketName of MIGRATION_CONFIG.sourceBuckets) {
        if (auditResults[bucketName]?.status !== 'accessible') continue;

        try {
            console.log(`  🗑️  Cleaning bucket: ${bucketName}`);
            
            const { data: files } = await supabase.storage
                .from(bucketName)
                .list('', { limit: 1000 });

            if (files && files.length > 0) {
                const filePaths = files.map(f => f.name);
                const { error } = await supabase.storage
                    .from(bucketName)
                    .remove(filePaths);

                if (error) throw error;
                console.log(`  ✅ Removed ${filePaths.length} files from ${bucketName}`);
            }

        } catch (error) {
            console.error(`  ❌ Cleanup error for ${bucketName}:`, error.message);
            return false;
        }
    }

    return true;
}

/**
 * Create migration report
 */
function createMigrationReport(auditResults, migrationMap, migrationResults, verificationResults) {
    console.log('\n📄 Creating migration report...');
    
    const report = {
        timestamp,
        date: new Date().toISOString(),
        operation: 'storage_bucket_migration',
        configuration: MIGRATION_CONFIG,
        audit: auditResults,
        migration: {
            totalFiles: migrationMap.length,
            results: migrationResults,
            verification: verificationResults
        },
        summary: {
            totalSourceFiles: Object.values(auditResults)
                .filter(a => a.status === 'accessible')
                .reduce((sum, a) => sum + (a.fileCount || 0), 0),
            successfulMigrations: migrationResults.success,
            failedMigrations: migrationResults.failed,
            skippedFiles: migrationResults.skipped,
            verificationRate: verificationResults.verified / migrationMap.length * 100
        }
    };

    // Save report to file
    const reportPath = `backups/storage-migration-report-${timestamp}.json`;
    
    if (!fs.existsSync('backups')) {
        fs.mkdirSync('backups', { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`  ✅ Migration report saved: ${reportPath}`);
    return report;
}

/**
 * Main migration execution
 */
async function executeStorageMigration() {
    try {
        console.log('🔐 Verifying database connection...');
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        if (error) throw error;
        console.log('✅ Database connection verified\n');

        // Step 1: Ensure target bucket
        const bucketReady = await ensureTargetBucket();
        if (!bucketReady) {
            throw new Error('Failed to prepare target bucket');
        }

        // Step 2: Audit source buckets
        const auditResults = await auditSourceBuckets();
        
        // Step 3: Map files to target paths
        const migrationMap = await mapFilesToTargetPaths(auditResults);
        
        if (migrationMap.length === 0) {
            console.log('\n🎉 No files to migrate - storage already consolidated');
            return;
        }

        // Step 4: Execute migration
        const migrationResults = await migrateFiles(migrationMap);
        
        // Step 5: Verify migration
        const verificationResults = await verifyMigration(migrationMap);
        
        // Step 6: Create report
        const report = createMigrationReport(auditResults, migrationMap, migrationResults, verificationResults);
        
        // Step 7: Optional cleanup (only if no failures)
        if (migrationResults.failed === 0 && verificationResults.failed === 0) {
            console.log('\n🧹 Migration successful - cleaning up source buckets...');
            await cleanupSourceBuckets(auditResults, migrationResults);
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 STORAGE MIGRATION SUMMARY');
        console.log('='.repeat(60));
        
        console.log(`📅 Timestamp: ${timestamp}`);
        console.log(`📁 Source buckets: ${MIGRATION_CONFIG.sourceBuckets.join(', ')}`);
        console.log(`🎯 Target bucket: ${MIGRATION_CONFIG.targetBucket}`);
        console.log(`📋 Total files: ${migrationMap.length}`);
        console.log(`✅ Successful: ${migrationResults.success}`);
        console.log(`❌ Failed: ${migrationResults.failed}`);
        console.log(`⏭️  Skipped: ${migrationResults.skipped}`);
        console.log(`🔍 Verification rate: ${(verificationResults.verified / migrationMap.length * 100).toFixed(1)}%`);
        
        if (migrationResults.failed === 0 && verificationResults.failed === 0) {
            console.log('\n🎉 STORAGE MIGRATION COMPLETED SUCCESSFULLY');
            console.log('✅ All chat files consolidated into unified bucket');
            process.exit(0);
        } else {
            console.log('\n⚠️  STORAGE MIGRATION COMPLETED WITH ISSUES');
            console.log('❌ Review migration report for details');
            process.exit(1);
        }

    } catch (error) {
        console.error('\n💥 STORAGE MIGRATION FAILED:', error.message);
        process.exit(1);
    }
}

// Execute migration
executeStorageMigration(); 