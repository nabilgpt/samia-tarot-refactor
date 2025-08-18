#!/usr/bin/env node

/**
 * SAMIA TAROT - Phase 5 Audit Logging System
 * 
 * 📊 Comprehensive tracking of all deployments, server restarts, and system operations.
 * 🔍 Critical for compliance, debugging, and performance monitoring.
 * 
 * AUDIT CATEGORIES:
 * - Deployments (success/failure, duration, user)
 * - Server restarts (reason, duration, health status)
 * - Database migrations (scripts, success, rollbacks)
 * - Theme protection (violations, blocks, emergency actions)
 * - Language system updates (additions, sync operations)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AuditLogger {
    constructor() {
        this.logsDirectory = path.join(__dirname, '..', 'logs');
        this.auditFile = path.join(this.logsDirectory, 'audit.jsonl');
        this.deploymentFile = path.join(this.logsDirectory, 'deployments.jsonl');
        this.serverFile = path.join(this.logsDirectory, 'server-operations.jsonl');
        this.themeFile = path.join(this.logsDirectory, 'theme-protection.jsonl');
        this.migrationFile = path.join(this.logsDirectory, 'migrations.jsonl');
        
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logsDirectory)) {
            fs.mkdirSync(this.logsDirectory, { recursive: true });
        }
    }

    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    writeLog(file, entry) {
        try {
            const logLine = JSON.stringify(entry) + '\n';
            fs.appendFileSync(file, logLine);
            return entry.id;
        } catch (error) {
            console.error(`Failed to write audit log: ${error.message}`);
            return null;
        }
    }

    log(message, level = 'INFO', category = 'GENERAL') {
        const entry = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            level,
            category,
            message,
            hostname: process.env.HOSTNAME || 'localhost',
            pid: process.pid
        };

        console.log(`📊 [${entry.timestamp}] [${level}] [${category}] ${message}`);
        return this.writeLog(this.auditFile, entry);
    }

    logDeployment(environment, status, metadata = {}) {
        const entry = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            type: 'DEPLOYMENT',
            environment,
            status, // SUCCESS, FAILED, CANCELLED
            duration: metadata.duration || null,
            user: metadata.user || 'System',
            reason: metadata.reason || 'Deployment',
            commit: metadata.commit || null,
            version: metadata.version || null,
            changes: metadata.changes || [],
            healthCheck: metadata.healthCheck || null,
            rollback: metadata.rollback || false,
            themeProtection: metadata.themeProtection || null
        };

        console.log(`🚀 DEPLOYMENT [${status}] ${environment} by ${entry.user} (${entry.duration}ms)`);
        return this.writeLog(this.deploymentFile, entry);
    }

    logServerRestart(reason, status, metadata = {}) {
        const entry = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            type: 'SERVER_RESTART',
            reason,
            status, // SUCCESS, FAILED
            duration: metadata.duration || null,
            user: metadata.user || 'System',
            pid: metadata.pid || null,
            healthCheck: metadata.healthCheck || null,
            portCleared: metadata.portCleared || null,
            killMethod: metadata.killMethod || 'standard'
        };

        console.log(`🔄 SERVER RESTART [${status}] - ${reason} by ${entry.user} (${entry.duration}ms)`);
        return this.writeLog(this.serverFile, entry);
    }

    logThemeProtection(action, status, metadata = {}) {
        const entry = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            type: 'THEME_PROTECTION',
            action, // SCAN, VALIDATE, BLOCK, EMERGENCY
            status, // SUCCESS, VIOLATION, BLOCKED
            violations: metadata.violations || [],
            blockedFiles: metadata.blockedFiles || [],
            emergencyAction: metadata.emergencyAction || null,
            user: metadata.user || 'System'
        };

        console.log(`🛡️ THEME PROTECTION [${status}] ${action} - ${metadata.violations?.length || 0} violations`);
        return this.writeLog(this.themeFile, entry);
    }

    logMigration(script, status, metadata = {}) {
        const entry = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            type: 'DATABASE_MIGRATION',
            script,
            status, // SUCCESS, FAILED, ROLLBACK
            duration: metadata.duration || null,
            user: metadata.user || 'System',
            backup: metadata.backup || null,
            rollbackScript: metadata.rollbackScript || null,
            affectedTables: metadata.affectedTables || [],
            error: metadata.error || null
        };

        console.log(`🗄️ MIGRATION [${status}] ${script} by ${entry.user} (${entry.duration}ms)`);
        return this.writeLog(this.migrationFile, entry);
    }

    readLogs(file, options = {}) {
        try {
            if (!fs.existsSync(file)) {
                return [];
            }

            const content = fs.readFileSync(file, 'utf8');
            const lines = content.trim().split('\n').filter(line => line);
            
            let logs = lines.map(line => JSON.parse(line));
            
            // Apply filters
            if (options.since) {
                const sinceDate = new Date(options.since);
                logs = logs.filter(log => new Date(log.timestamp) >= sinceDate);
            }
            
            if (options.level) {
                logs = logs.filter(log => log.level === options.level);
            }
            
            if (options.category) {
                logs = logs.filter(log => log.category === options.category);
            }
            
            if (options.limit) {
                logs = logs.slice(-options.limit);
            }
            
            return logs.reverse(); // Most recent first
            
        } catch (error) {
            console.error(`Failed to read logs from ${file}: ${error.message}`);
            return [];
        }
    }

    generateDeploymentReport(days = 7) {
        const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
        const deployments = this.readLogs(this.deploymentFile, { since: since.toISOString() });
        
        const report = {
            period: `${days} days`,
            total: deployments.length,
            successful: deployments.filter(d => d.status === 'SUCCESS').length,
            failed: deployments.filter(d => d.status === 'FAILED').length,
            environments: {},
            users: {},
            averageDuration: 0,
            trends: []
        };

        // Calculate environment breakdown
        deployments.forEach(d => {
            report.environments[d.environment] = (report.environments[d.environment] || 0) + 1;
            report.users[d.user] = (report.users[d.user] || 0) + 1;
        });

        // Calculate average duration
        const durations = deployments.filter(d => d.duration).map(d => d.duration);
        if (durations.length > 0) {
            report.averageDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
        }

        // Success rate
        report.successRate = report.total > 0 ? Math.round((report.successful / report.total) * 100) : 0;

        return report;
    }

    generateSystemHealthReport() {
        const last24h = new Date(Date.now() - (24 * 60 * 60 * 1000));
        
        const deployments = this.readLogs(this.deploymentFile, { since: last24h.toISOString() });
        const restarts = this.readLogs(this.serverFile, { since: last24h.toISOString() });
        const themeEvents = this.readLogs(this.themeFile, { since: last24h.toISOString() });
        const migrations = this.readLogs(this.migrationFile, { since: last24h.toISOString() });
        
        const report = {
            timestamp: new Date().toISOString(),
            period: '24 hours',
            status: 'HEALTHY',
            deployments: {
                total: deployments.length,
                successful: deployments.filter(d => d.status === 'SUCCESS').length,
                failed: deployments.filter(d => d.status === 'FAILED').length
            },
            serverRestarts: {
                total: restarts.length,
                successful: restarts.filter(r => r.status === 'SUCCESS').length,
                failed: restarts.filter(r => r.status === 'FAILED').length
            },
            themeProtection: {
                scans: themeEvents.filter(t => t.action === 'SCAN').length,
                violations: themeEvents.filter(t => t.status === 'VIOLATION').length,
                blocks: themeEvents.filter(t => t.status === 'BLOCKED').length
            },
            migrations: {
                total: migrations.length,
                successful: migrations.filter(m => m.status === 'SUCCESS').length,
                failed: migrations.filter(m => m.status === 'FAILED').length
            }
        };

        // Determine overall health status
        if (report.deployments.failed > 0 || 
            report.serverRestarts.failed > 0 || 
            report.themeProtection.violations > 0 ||
            report.migrations.failed > 0) {
            report.status = 'WARNING';
        }

        if (report.deployments.failed > 3 || 
            report.serverRestarts.failed > 2 ||
            report.themeProtection.violations > 5) {
            report.status = 'CRITICAL';
        }

        return report;
    }

    exportAuditTrail(since, format = 'json') {
        const sinceDate = since ? new Date(since) : new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)); // 30 days default
        
        const allLogs = [
            ...this.readLogs(this.auditFile, { since: sinceDate.toISOString() }),
            ...this.readLogs(this.deploymentFile, { since: sinceDate.toISOString() }),
            ...this.readLogs(this.serverFile, { since: sinceDate.toISOString() }),
            ...this.readLogs(this.themeFile, { since: sinceDate.toISOString() }),
            ...this.readLogs(this.migrationFile, { since: sinceDate.toISOString() })
        ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        const export_data = {
            exported: new Date().toISOString(),
            period: {
                from: sinceDate.toISOString(),
                to: new Date().toISOString()
            },
            totalEvents: allLogs.length,
            logs: allLogs
        };

        const filename = path.join(this.logsDirectory, `audit-export-${Date.now()}.json`);
        fs.writeFileSync(filename, JSON.stringify(export_data, null, 2));
        
        console.log(`📋 Audit trail exported to: ${filename}`);
        return filename;
    }
}

// CLI Interface  
if (import.meta.url === `file://${process.argv[1]}`) {
    const auditor = new AuditLogger();
    const command = process.argv[2];

    async function runCommand() {
        try {
            switch (command) {
                case 'deployment-report':
                    const days = parseInt(process.argv[3]) || 7;
                    const report = auditor.generateDeploymentReport(days);
                    console.log('\n📊 DEPLOYMENT REPORT:');
                    console.log(`Period: ${report.period}`);
                    console.log(`Total: ${report.total}`);
                    console.log(`Success Rate: ${report.successRate}%`);
                    console.log(`Average Duration: ${report.averageDuration}ms`);
                    break;
                    
                case 'health-report':
                    const health = auditor.generateSystemHealthReport();
                    console.log('\n🏥 SYSTEM HEALTH REPORT:');
                    console.log(`Status: ${health.status}`);
                    console.log(`Deployments: ${health.deployments.successful}/${health.deployments.total}`);
                    console.log(`Server Restarts: ${health.serverRestarts.successful}/${health.serverRestarts.total}`);
                    console.log(`Theme Violations: ${health.themeProtection.violations}`);
                    console.log(`Migrations: ${health.migrations.successful}/${health.migrations.total}`);
                    break;
                    
                case 'export':
                    const since = process.argv[3];
                    const filename = auditor.exportAuditTrail(since);
                    console.log(`✅ Exported to: ${filename}`);
                    break;
                    
                case 'log':
                    const message = process.argv.slice(3).join(' ');
                    auditor.log(message, 'INFO', 'CLI');
                    console.log('✅ Log entry added');
                    break;
                    
                default:
                    console.log(`
📊 SAMIA TAROT Audit Logger - Phase 5

Usage:
  node scripts/audit-logger.js deployment-report [days]  - Generate deployment report
  node scripts/audit-logger.js health-report             - System health summary  
  node scripts/audit-logger.js export [since]            - Export audit trail
  node scripts/audit-logger.js log "message"             - Add manual log entry

Examples:
  node scripts/audit-logger.js deployment-report 30
  node scripts/audit-logger.js export "2024-01-01"
  node scripts/audit-logger.js log "Manual server check completed"
                    `);
                    process.exit(1);
            }
        } catch (error) {
            console.error('❌ Audit command failed:', error.message);
            process.exit(1);
        }
    }

    runCommand();
}

export default AuditLogger; 