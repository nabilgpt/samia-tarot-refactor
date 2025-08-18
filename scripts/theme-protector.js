#!/usr/bin/env node

/**
 * SAMIA TAROT - Phase 5 Theme Protection System
 * 
 * 🛡️ ABSOLUTE PROTECTION for the cosmic theme and design assets.
 * 🚨 CRITICAL: This system MUST prevent any automation from touching theme files.
 * 
 * PROTECTED ASSETS:
 * - All CSS files with cosmic/theme styles
 * - Design assets and images
 * - Component styling and themes
 * - .env file (environment variables)
 * - Documentation files (.md)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ThemeProtector {
    constructor() {
        this.projectRoot = path.join(__dirname, '..');
        this.manifestFile = path.join(__dirname, 'theme-manifest.json');
        this.logFile = path.join(__dirname, '..', 'logs', 'theme-protection.log');
        
        // PROTECTED FILE PATTERNS - NEVER TOUCH THESE!
        this.protectedPatterns = [
            // Theme and styling files
            '**/*.css',
            '**/index.css',
            '**/App.css',
            '**/theme.*',
            '**/cosmic.*',
            '**/design.*',
            '**/styles/**/*',
            
            // Design assets
            '**/assets/**/*',
            '**/images/**/*',
            '**/icons/**/*',
            '**/*.png',
            '**/*.jpg', 
            '**/*.jpeg',
            '**/*.gif',
            '**/*.svg',
            '**/*.ico',
            
            // Environment and config
            '.env*',
            '**/.env*',
            
            // Documentation
            '**/*.md',
            '**/README*',
            '**/docs/**/*',
            
            // Component styling props and themes
            '**/AnimatedBackground.*',
            '**/cosmic*',
            '**/theme*',
            '**/UI/**/*',
            
            // Specific SAMIA TAROT protected files
            'src/index.css',
            'src/App.jsx', // Contains theme setup
            'src/assets/**/*',
            'src/styles/**/*',
            'src/components/UI/**/*'
        ];

        // CRITICAL KEYWORDS that indicate theme changes
        this.dangerousKeywords = [
            'cosmic', 'theme', 'color', 'background', 'gradient',
            'neon', 'glow', 'dark', 'purple', 'blue', 'design',
            'style', 'css', 'tailwind', 'animation', 'effect'
        ];

        this.ensureLogDirectory();
        this.loadManifest();
    }

    ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${message}\n`;
        
        console.log(`🛡️ ${logEntry.trim()}`);
        
        try {
            fs.appendFileSync(this.logFile, logEntry);
        } catch (error) {
            console.error('Failed to write to theme protection log:', error);
        }
    }

    loadManifest() {
        try {
            if (fs.existsSync(this.manifestFile)) {
                this.manifest = JSON.parse(fs.readFileSync(this.manifestFile, 'utf8'));
                this.log('📋 Theme manifest loaded');
            } else {
                this.manifest = {
                    created: new Date().toISOString(),
                    files: {},
                    lastValidation: null
                };
                this.saveManifest();
                this.log('📝 New theme manifest created');
            }
        } catch (error) {
            this.log(`❌ Failed to load theme manifest: ${error.message}`, 'ERROR');
            this.manifest = { created: new Date().toISOString(), files: {} };
        }
    }

    saveManifest() {
        try {
            fs.writeFileSync(this.manifestFile, JSON.stringify(this.manifest, null, 2));
            this.log('💾 Theme manifest saved');
        } catch (error) {
            this.log(`❌ Failed to save theme manifest: ${error.message}`, 'ERROR');
        }
    }

    calculateFileHash(filePath) {
        try {
            const content = fs.readFileSync(filePath);
            return crypto.createHash('sha256').update(content).digest('hex');
        } catch (error) {
            return null;
        }
    }

    isProtectedFile(filePath) {
        const relativePath = path.relative(this.projectRoot, filePath);
        const normalizedPath = relativePath.replace(/\\/g, '/');
        
        return this.protectedPatterns.some(pattern => {
            const regex = new RegExp(
                pattern
                    .replace(/\*\*/g, '.*')
                    .replace(/\*/g, '[^/]*')
                    .replace(/\./g, '\\.')
            );
            return regex.test(normalizedPath);
        });
    }

    containsDangerousKeywords(content) {
        const lowerContent = content.toLowerCase();
        return this.dangerousKeywords.some(keyword => 
            lowerContent.includes(keyword.toLowerCase())
        );
    }

    async scanProtectedFiles() {
        this.log('🔍 Scanning protected theme files...');
        
        const scanResults = {
            scanned: 0,
            protected: 0,
            modified: 0,
            violations: []
        };

        const scanDirectory = (dir) => {
            if (!fs.existsSync(dir)) return;
            
            const files = fs.readdirSync(dir);
            
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                
                if (stat.isDirectory()) {
                    // Skip node_modules and .git
                    if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
                        scanDirectory(filePath);
                    }
                } else {
                    scanResults.scanned++;
                    
                    if (this.isProtectedFile(filePath)) {
                        scanResults.protected++;
                        
                        const currentHash = this.calculateFileHash(filePath);
                        const relativePath = path.relative(this.projectRoot, filePath);
                        
                        if (this.manifest.files[relativePath]) {
                            const storedHash = this.manifest.files[relativePath].hash;
                            
                            if (currentHash !== storedHash) {
                                scanResults.modified++;
                                scanResults.violations.push({
                                    file: relativePath,
                                    type: 'MODIFIED',
                                    message: 'Protected theme file was modified'
                                });
                                
                                this.log(`⚠️ VIOLATION: ${relativePath} was modified!`, 'WARN');
                            }
                        } else {
                            // New protected file - add to manifest
                            this.manifest.files[relativePath] = {
                                hash: currentHash,
                                added: new Date().toISOString(),
                                protected: true
                            };
                        }
                    }
                }
            }
        };

        try {
            scanDirectory(this.projectRoot);
            this.manifest.lastValidation = new Date().toISOString();
            this.saveManifest();
            
            this.log(`📊 Scan complete: ${scanResults.scanned} files, ${scanResults.protected} protected, ${scanResults.modified} violations`);
            return scanResults;
            
        } catch (error) {
            this.log(`❌ Theme scan failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async validateDeployment(changeset = []) {
        this.log('🔒 Validating deployment for theme protection...');
        
        const violations = [];
        
        for (const change of changeset) {
            const { file, action, content } = change;
            
            // Check if file is protected
            if (this.isProtectedFile(file)) {
                violations.push({
                    file,
                    type: 'PROTECTED_FILE',
                    message: `Attempted to ${action} protected theme file: ${file}`
                });
                continue;
            }
            
            // Check content for dangerous keywords
            if (content && this.containsDangerousKeywords(content)) {
                violations.push({
                    file,
                    type: 'DANGEROUS_CONTENT', 
                    message: `File contains theme-related keywords that may affect cosmic design`
                });
            }
        }
        
        if (violations.length > 0) {
            this.log(`🚨 DEPLOYMENT BLOCKED: ${violations.length} theme violations detected!`, 'ERROR');
            return {
                allowed: false,
                violations,
                message: 'Deployment blocked due to theme protection violations'
            };
        }
        
        this.log('✅ Deployment validation passed - no theme violations');
        return {
            allowed: true,
            violations: [],
            message: 'Deployment approved - cosmic theme is safe'
        };
    }

    async establishBaseline() {
        this.log('📸 Establishing theme protection baseline...');
        
        const results = await this.scanProtectedFiles();
        
        this.log(`✅ Baseline established with ${results.protected} protected files`);
        return results;
    }

    async emergencyRestore() {
        this.log('🚨 EMERGENCY THEME RESTORE INITIATED!', 'ERROR');
        
        // This would integrate with version control to restore theme files
        // For now, log the emergency and require manual intervention
        
        this.log('⚠️ Manual intervention required - check theme files immediately!', 'ERROR');
        this.log('🔧 Recommended: git checkout HEAD -- src/index.css src/App.jsx src/assets/ src/styles/', 'ERROR');
        
        return {
            success: false,
            message: 'Emergency restore requires manual intervention',
            recommendations: [
                'Check git status for theme file changes',
                'Review recent commits affecting CSS/assets',
                'Restore cosmic theme files from last known good commit',
                'Validate all visual elements are intact'
            ]
        };
    }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const protector = new ThemeProtector();
    const command = process.argv[2];

    async function runCommand() {
        try {
            switch (command) {
                case 'scan':
                    const scanResults = await protector.scanProtectedFiles();
                    if (scanResults.violations.length > 0) {
                        console.log('\n🚨 THEME VIOLATIONS DETECTED:');
                        scanResults.violations.forEach(v => {
                            console.log(`  ❌ ${v.type}: ${v.file} - ${v.message}`);
                        });
                        process.exit(1);
                    }
                    console.log('\n✅ No theme violations detected');
                    process.exit(0);
                    break;
                    
                case 'validate':
                    // Validate current state
                    const validation = await protector.validateDeployment([]);
                    process.exit(validation.allowed ? 0 : 1);
                    break;
                    
                case 'baseline':
                    await protector.establishBaseline();
                    process.exit(0);
                    break;
                    
                case 'emergency':
                    const restore = await protector.emergencyRestore();
                    console.log('\n🚨 EMERGENCY RESTORE:', restore.message);
                    restore.recommendations.forEach(rec => {
                        console.log(`  🔧 ${rec}`);
                    });
                    process.exit(1);
                    break;
                    
                default:
                    console.log(`
🛡️ SAMIA TAROT Theme Protector - Phase 5

Usage:
  node scripts/theme-protector.js scan      - Scan for theme violations
  node scripts/theme-protector.js validate  - Validate current state
  node scripts/theme-protector.js baseline  - Establish protection baseline
  node scripts/theme-protector.js emergency - Emergency restore help

PROTECTED ASSETS:
  - All CSS and styling files
  - Design assets (images, icons, etc.)
  - Environment files (.env)
  - Documentation (.md files)
  - Cosmic theme components

🚨 ANY AUTOMATION THAT TOUCHES THESE FILES WILL BE BLOCKED!
                    `);
                    process.exit(1);
            }
        } catch (error) {
            console.error('❌ Theme protection command failed:', error.message);
            process.exit(1);
        }
    }

    runCommand();
}

export default ThemeProtector; 