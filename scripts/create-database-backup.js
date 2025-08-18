#!/usr/bin/env node

/**
 * SAMIA TAROT - Database Backup Script
 * Creates comprehensive backups before chat system consolidation
 * 
 * CRITICAL: Run this before any consolidation operations
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

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

console.log(`🚨 STARTING DATABASE BACKUP - ${timestamp}`);
console.log('='.repeat(60));

/**
 * Create backup tables with current data
 */
async function createBackupTables() {
    console.log('\n📋 Creating backup tables...');
    
    const backupQueries = [
        {
            name: 'messages',
            query: `CREATE TABLE messages_backup_${timestamp} AS SELECT * FROM messages;`
        },
        {
            name: 'voice_notes', 
            query: `CREATE TABLE voice_notes_backup_${timestamp} AS SELECT * FROM voice_notes;`
        },
        {
            name: 'chat_sessions',
            query: `CREATE TABLE chat_sessions_backup_${timestamp} AS SELECT * FROM chat_sessions;`
        },
        {
            name: 'chat_messages',
            query: `CREATE TABLE chat_messages_backup_${timestamp} AS SELECT * FROM chat_messages;`
        },
        {
            name: 'chat_monitoring',
            query: `CREATE TABLE chat_monitoring_backup_${timestamp} AS SELECT * FROM chat_monitoring;`
        }
    ];

    const results = {};

    for (const backup of backupQueries) {
        try {
            console.log(`  📦 Backing up ${backup.name}...`);
            
            // First check if table exists
            const { data: tableExists } = await supabase.rpc('check_table_exists', {
                table_name: backup.name
            });

            if (!tableExists) {
                console.log(`  ⚠️  Table ${backup.name} does not exist - skipping`);
                results[backup.name] = { status: 'skipped', reason: 'table_not_found' };
                continue;
            }

            // Get row count before backup
            const { count: originalCount } = await supabase
                .from(backup.name)
                .select('*', { count: 'exact', head: true });

            // Create backup table
            const { error } = await supabase.rpc('execute_sql', {
                sql: backup.query
            });

            if (error) {
                console.error(`  ❌ Failed to backup ${backup.name}:`, error.message);
                results[backup.name] = { status: 'failed', error: error.message };
                continue;
            }

            // Verify backup was created
            const { count: backupCount } = await supabase
                .from(`${backup.name}_backup_${timestamp}`)
                .select('*', { count: 'exact', head: true });

            if (originalCount === backupCount) {
                console.log(`  ✅ ${backup.name}: ${originalCount} rows backed up successfully`);
                results[backup.name] = { 
                    status: 'success', 
                    originalCount, 
                    backupCount,
                    backupTable: `${backup.name}_backup_${timestamp}`
                };
            } else {
                console.error(`  ❌ Row count mismatch for ${backup.name}: ${originalCount} → ${backupCount}`);
                results[backup.name] = { 
                    status: 'failed', 
                    error: 'row_count_mismatch',
                    originalCount,
                    backupCount
                };
            }

        } catch (error) {
            console.error(`  ❌ Error backing up ${backup.name}:`, error.message);
            results[backup.name] = { status: 'error', error: error.message };
        }
    }

    return results;
}

/**
 * Audit storage buckets and files
 */
async function auditStorageBuckets() {
    console.log('\n🗄️  Auditing storage buckets...');
    
    const buckets = ['chat-files', 'chat-attachments', 'voice-notes', 'zodiac-audio'];
    const storageAudit = {};

    for (const bucketName of buckets) {
        try {
            console.log(`  📁 Checking bucket: ${bucketName}`);
            
            const { data: files, error } = await supabase.storage
                .from(bucketName)
                .list('', { limit: 1000 });

            if (error) {
                console.log(`  ⚠️  Bucket ${bucketName} not accessible: ${error.message}`);
                storageAudit[bucketName] = { status: 'inaccessible', error: error.message };
                continue;
            }

            const fileCount = files ? files.length : 0;
            let totalSize = 0;

            if (files && files.length > 0) {
                // Calculate total size
                for (const file of files) {
                    totalSize += file.metadata?.size || 0;
                }
            }

            console.log(`  ✅ ${bucketName}: ${fileCount} files, ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
            storageAudit[bucketName] = {
                status: 'accessible',
                fileCount,
                totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
                files: files || []
            };

        } catch (error) {
            console.error(`  ❌ Error checking bucket ${bucketName}:`, error.message);
            storageAudit[bucketName] = { status: 'error', error: error.message };
        }
    }

    return storageAudit;
}

/**
 * Create backup manifest
 */
async function createBackupManifest(backupResults, storageAudit) {
    console.log('\n📄 Creating backup manifest...');
    
    const manifest = {
        timestamp,
        date: new Date().toISOString(),
        operation: 'chat_system_consolidation_backup',
        database: {
            backups: backupResults,
            totalTables: Object.keys(backupResults).length,
            successfulBackups: Object.values(backupResults).filter(r => r.status === 'success').length
        },
        storage: {
            audit: storageAudit,
            totalBuckets: Object.keys(storageAudit).length,
            accessibleBuckets: Object.values(storageAudit).filter(b => b.status === 'accessible').length
        },
        system: {
            nodeVersion: process.version,
            platform: process.platform,
            timestamp: Date.now()
        }
    };

    // Save manifest to file
    const fs = await import('fs');
    const manifestPath = `backups/backup-manifest-${timestamp}.json`;
    
    // Ensure backups directory exists
    if (!fs.existsSync('backups')) {
        fs.mkdirSync('backups', { recursive: true });
    }
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    console.log(`  ✅ Backup manifest saved: ${manifestPath}`);
    return manifest;
}

/**
 * Validate backup integrity
 */
async function validateBackupIntegrity(backupResults) {
    console.log('\n🔍 Validating backup integrity...');
    
    let allValid = true;
    
    for (const [tableName, result] of Object.entries(backupResults)) {
        if (result.status !== 'success') {
            console.log(`  ⚠️  ${tableName}: ${result.status}`);
            if (result.status === 'failed') allValid = false;
            continue;
        }

        try {
            // Verify backup table exists and has data
            const { count } = await supabase
                .from(result.backupTable)
                .select('*', { count: 'exact', head: true });

            if (count === result.originalCount) {
                console.log(`  ✅ ${tableName}: Backup verified (${count} rows)`);
            } else {
                console.error(`  ❌ ${tableName}: Backup verification failed`);
                allValid = false;
            }
        } catch (error) {
            console.error(`  ❌ ${tableName}: Backup verification error:`, error.message);
            allValid = false;
        }
    }

    return allValid;
}

/**
 * Main backup execution
 */
async function executeBackup() {
    try {
        console.log('🔐 Verifying database connection...');
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        if (error) throw error;
        console.log('✅ Database connection verified\n');

        // Step 1: Create backup tables
        const backupResults = await createBackupTables();
        
        // Step 2: Audit storage
        const storageAudit = await auditStorageBuckets();
        
        // Step 3: Create manifest
        const manifest = await createBackupManifest(backupResults, storageAudit);
        
        // Step 4: Validate integrity
        const isValid = await validateBackupIntegrity(backupResults);
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 BACKUP SUMMARY');
        console.log('='.repeat(60));
        
        console.log(`📅 Timestamp: ${timestamp}`);
        console.log(`📋 Tables backed up: ${manifest.database.successfulBackups}/${manifest.database.totalTables}`);
        console.log(`🗄️  Storage buckets audited: ${manifest.storage.accessibleBuckets}/${manifest.storage.totalBuckets}`);
        console.log(`✅ Backup integrity: ${isValid ? 'VALID' : 'INVALID'}`);
        
        if (isValid) {
            console.log('\n🎉 BACKUP COMPLETED SUCCESSFULLY');
            console.log('✅ Ready for consolidation operations');
            process.exit(0);
        } else {
            console.log('\n❌ BACKUP VALIDATION FAILED');
            console.log('⚠️  DO NOT PROCEED with consolidation');
            process.exit(1);
        }

    } catch (error) {
        console.error('\n💥 BACKUP FAILED:', error.message);
        console.error('⚠️  DO NOT PROCEED with consolidation');
        process.exit(1);
    }
}

// Execute backup
executeBackup(); 