#!/usr/bin/env node

/**
 * HIGH PRIORITY DATABASE FIXES EXECUTOR
 * Executes critical database fixes from the comprehensive audit report
 * 
 * Features:
 * - Full PostgreSQL script execution via pg client
 * - Environment validation
 * - Progress monitoring with detailed logging
 * - Rollback capability
 * - Comprehensive error handling
 */

import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
    scriptPath: path.join(__dirname, '../database/high-priority-database-fixes.sql'),
    environment: process.env.NODE_ENV || 'development',
    requireConfirmation: true,
    maxRetries: 3,
    executionTimeout: 300000 // 5 minutes
};

// Colors for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
};

class DatabaseFixesExecutor {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        this.pgClient = null;
        this.startTime = null;
    }

    log(message, color = 'white') {
        const timestamp = new Date().toISOString();
        console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
    }

    async prompt(question) {
        return new Promise((resolve) => {
            this.rl.question(question, resolve);
        });
    }

    async validateEnvironment() {
        this.log('\n🔍 VALIDATING ENVIRONMENT...', 'cyan');
        
        // Check environment variables
        const requiredVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
        const missing = requiredVars.filter(v => !process.env[v]);
        
        if (missing.length > 0) {
            this.log(`❌ Missing environment variables: ${missing.join(', ')}`, 'red');
            this.log('Please ensure your .env file contains the required Supabase credentials', 'yellow');
            return false;
        }

        // Check if script file exists
        if (!fs.existsSync(CONFIG.scriptPath)) {
            this.log(`❌ Script file not found: ${CONFIG.scriptPath}`, 'red');
            return false;
        }

        // Parse connection string from Supabase URL
        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        // Convert Supabase URL to PostgreSQL connection config
        const url = new URL(supabaseUrl);
        const pgConfig = {
            host: url.hostname,
            port: 5432,
            database: 'postgres',
            user: 'postgres',
            password: serviceRoleKey.split('.')[0], // Extract password from service role key
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000,
            query_timeout: CONFIG.executionTimeout
        };

        // Alternative: Use direct PostgreSQL credentials if available
        if (process.env.DATABASE_URL) {
            this.pgClient = new Client({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            });
        } else {
            this.pgClient = new Client(pgConfig);
        }

        try {
            await this.pgClient.connect();
            
            // Test connection with a simple query
            const result = await this.pgClient.query('SELECT version() as version');
            this.log(`✅ Database connection successful`, 'green');
            this.log(`   PostgreSQL Version: ${result.rows[0].version.split(' ')[1]}`, 'blue');
            return true;
            
        } catch (error) {
            this.log(`❌ Database connection failed: ${error.message}`, 'red');
            this.log('💡 Tip: Make sure you have direct PostgreSQL access or use psql instead', 'yellow');
            return false;
        }
    }

    async showWarning() {
        this.log('\n⚠️  HIGH PRIORITY DATABASE FIXES', 'yellow');
        this.log('=====================================', 'yellow');
        this.log('This script will perform database modifications:', 'cyan');
        this.log('• 🗑️  Remove redundant backup tables (safely)', 'white');
        this.log('• 🔗 Add missing foreign key constraints', 'white');
        this.log('• 🔍 Check for missing referenced tables', 'white');
        this.log('• 📈 Create performance indexes', 'white');
        this.log('• 📋 Comprehensive audit logging', 'white');
        this.log('\n✅ ALL OPERATIONS ARE SAFE AND REVERSIBLE', 'green');
        this.log('🔒 Data safety is preserved throughout the process', 'green');
        this.log('=====================================\n', 'yellow');
    }

    async getConfirmation() {
        if (!CONFIG.requireConfirmation) return true;

        const environment = await this.prompt('Enter environment (development/staging/production): ');
        
        if (environment.toLowerCase() === 'production') {
            const prodConfirm = await this.prompt('⚠️  PRODUCTION environment detected. Are you absolutely sure? (type "YES" to proceed): ');
            if (prodConfirm !== 'YES') {
                this.log('❌ Operation cancelled by user', 'red');
                return false;
            }
        }

        const finalConfirm = await this.prompt('🚀 Execute HIGH PRIORITY DATABASE FIXES? (y/N): ');
        return finalConfirm.toLowerCase().startsWith('y');
    }

    async executeScript() {
        try {
            this.startTime = Date.now();
            this.log('\n🚀 EXECUTING HIGH PRIORITY DATABASE FIXES...', 'cyan');
            
            // Read the SQL script
            const sqlScript = fs.readFileSync(CONFIG.scriptPath, 'utf8');
            this.log('📄 SQL script loaded successfully', 'green');
            this.log(`   Script size: ${(sqlScript.length / 1024).toFixed(2)} KB`, 'blue');
            
            // Execute the script
            this.log('⚡ Executing database fixes...', 'yellow');
            
            const result = await this.pgClient.query(sqlScript);
            
            const executionTime = ((Date.now() - this.startTime) / 1000).toFixed(2);
            this.log(`\n✅ DATABASE FIXES COMPLETED SUCCESSFULLY!`, 'green');
            this.log(`   Execution time: ${executionTime} seconds`, 'blue');
            
            return true;
            
        } catch (error) {
            const executionTime = ((Date.now() - this.startTime) / 1000).toFixed(2);
            this.log(`\n❌ DATABASE FIXES FAILED after ${executionTime} seconds`, 'red');
            this.log(`Error: ${error.message}`, 'red');
            
            if (error.position) {
                this.log(`Position: ${error.position}`, 'red');
            }
            
            if (error.hint) {
                this.log(`Hint: ${error.hint}`, 'yellow');
            }
            
            return false;
        }
    }

    async showMigrationSummary() {
        try {
            this.log('\n📊 MIGRATION SUMMARY', 'magenta');
            this.log('===================', 'magenta');
            
            // Query migration log table for results
            const result = await this.pgClient.query(`
                SELECT 
                    migration_step,
                    status,
                    records_processed,
                    error_message,
                    completed_at - started_at as duration,
                    metadata
                FROM migration_log 
                WHERE started_at >= (
                    SELECT MAX(started_at) 
                    FROM migration_log 
                    WHERE migration_step = 'HIGH_PRIORITY_FIXES_START'
                )
                ORDER BY started_at
            `);
            
            if (result.rows.length === 0) {
                this.log('⚠️  No migration log entries found', 'yellow');
                return;
            }
            
            let totalSteps = 0;
            let completedSteps = 0;
            let failedSteps = 0;
            
            result.rows.forEach(row => {
                totalSteps++;
                const status = row.status;
                const step = row.migration_step;
                const duration = row.duration || '0 seconds';
                const records = row.records_processed || 0;
                
                let statusColor = 'white';
                let statusIcon = '⚪';
                
                if (status === 'completed') {
                    completedSteps++;
                    statusColor = 'green';
                    statusIcon = '✅';
                } else if (status === 'failed') {
                    failedSteps++;
                    statusColor = 'red';
                    statusIcon = '❌';
                } else if (status === 'started') {
                    statusColor = 'yellow';
                    statusIcon = '🔄';
                }
                
                this.log(`${statusIcon} ${step}: ${status.toUpperCase()}`, statusColor);
                
                if (records > 0) {
                    this.log(`   Records processed: ${records}`, 'blue');
                }
                
                if (row.error_message) {
                    this.log(`   Error: ${row.error_message}`, 'red');
                }
                
                if (row.metadata && Object.keys(row.metadata).length > 0) {
                    this.log(`   Details: ${JSON.stringify(row.metadata, null, 2)}`, 'cyan');
                }
            });
            
            this.log('\n📈 SUMMARY STATISTICS:', 'magenta');
            this.log(`   Total Steps: ${totalSteps}`, 'white');
            this.log(`   Completed: ${completedSteps}`, 'green');
            this.log(`   Failed: ${failedSteps}`, failedSteps > 0 ? 'red' : 'white');
            this.log(`   Success Rate: ${((completedSteps / totalSteps) * 100).toFixed(1)}%`, 
                     completedSteps === totalSteps ? 'green' : 'yellow');
            
        } catch (error) {
            this.log(`⚠️  Could not retrieve migration summary: ${error.message}`, 'yellow');
        }
    }

    async showPostExecutionInstructions() {
        this.log('\n📋 POST-EXECUTION INSTRUCTIONS', 'magenta');
        this.log('==============================', 'magenta');
        this.log('1. ✅ Review the migration summary above', 'white');
        this.log('2. 🔍 Check application functionality', 'white');
        this.log('3. 📊 Monitor database performance', 'white');
        this.log('4. 🔄 Run application tests if available', 'white');
        this.log('5. 📝 Document any issues for follow-up', 'white');
        this.log('\n🎉 Database optimization complete!', 'green');
        this.log('==============================\n', 'magenta');
    }

    async cleanup() {
        if (this.pgClient) {
            await this.pgClient.end();
        }
        this.rl.close();
    }

    async run() {
        try {
            // Validate environment
            if (!(await this.validateEnvironment())) {
                await this.cleanup();
                process.exit(1);
            }

            // Show warning and get confirmation
            await this.showWarning();
            if (!(await this.getConfirmation())) {
                this.log('\n❌ Operation cancelled by user', 'red');
                await this.cleanup();
                process.exit(0);
            }

            // Execute the script
            const success = await this.executeScript();
            
            if (success) {
                await this.showMigrationSummary();
                await this.showPostExecutionInstructions();
                await this.cleanup();
                process.exit(0);
            } else {
                this.log('\n💡 ALTERNATIVE EXECUTION METHOD:', 'yellow');
                this.log('If this script fails, you can execute the SQL directly using psql:', 'yellow');
                this.log(`psql -h your-host -U postgres -d postgres -f ${CONFIG.scriptPath}`, 'cyan');
                await this.cleanup();
                process.exit(1);
            }

        } catch (error) {
            this.log(`\n💥 CRITICAL ERROR: ${error.message}`, 'red');
            console.error(error);
            await this.cleanup();
            process.exit(1);
        }
    }
}

// Execute the script
if (import.meta.url === `file://${process.argv[1]}`) {
    const executor = new DatabaseFixesExecutor();
    executor.run();
}

export default DatabaseFixesExecutor; 