#!/usr/bin/env node

/**
 * SAMIA TAROT - Phase 5 Language Management System
 * 
 * 🌍 Dynamic language addition and management with mandatory server restart.
 * 🔄 Hot language upgrades require full server kill-and-restart for proper loading.
 * 
 * FEATURES:
 * - Add new languages dynamically
 * - Update translation files
 * - Sync TTS provider configurations
 * - Validate language system integrity
 * - MANDATORY server restart after any language change
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LanguageManager {
    constructor() {
        this.projectRoot = path.join(__dirname, '..');
        this.i18nDirectory = path.join(this.projectRoot, 'src', 'i18n');
        this.configFile = path.join(this.i18nDirectory, 'index.js');
        this.logFile = path.join(__dirname, '..', 'logs', 'language-management.log');
        
        this.supportedLanguages = ['en', 'ar'];
        this.defaultLanguage = 'ar';
        
        this.ensureLogDirectory();
        this.loadConfiguration();
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
        
        console.log(`🌍 ${logEntry.trim()}`);
        
        try {
            fs.appendFileSync(this.logFile, logEntry);
        } catch (error) {
            console.error('Failed to write to language management log:', error);
        }
    }

    loadConfiguration() {
        try {
            if (fs.existsSync(this.configFile)) {
                this.log('📋 Language configuration loaded');
            } else {
                this.log('⚠️ Language configuration file not found', 'WARN');
            }
        } catch (error) {
            this.log(`❌ Failed to load language configuration: ${error.message}`, 'ERROR');
        }
    }

    getLanguageStatus() {
        const status = {
            supportedLanguages: this.supportedLanguages,
            defaultLanguage: this.defaultLanguage,
            providers: {
                translation: 'Database-driven',
                tts: 'ElevenLabs'
            },
            files: {},
            lastSync: null
        };

        // Check language files
        for (const lang of this.supportedLanguages) {
            const langFile = path.join(this.i18nDirectory, `${lang}.json`);
            status.files[lang] = {
                exists: fs.existsSync(langFile),
                path: langFile,
                size: fs.existsSync(langFile) ? fs.statSync(langFile).size : 0
            };
        }

        return status;
    }

    async addLanguage(langCode, langName, metadata = {}) {
        this.log(`🆕 Adding new language: ${langCode} (${langName})`);
        
        try {
            // Validate language code
            if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(langCode)) {
                throw new Error(`Invalid language code format: ${langCode}`);
            }

            // Create language file
            const langFile = path.join(this.i18nDirectory, `${langCode}.json`);
            
            if (fs.existsSync(langFile)) {
                this.log(`⚠️ Language file already exists: ${langCode}`, 'WARN');
                return { success: false, reason: 'Language already exists' };
            }

            // Create basic language structure
            const languageData = {
                language: {
                    code: langCode,
                    name: langName,
                    direction: metadata.rtl ? 'rtl' : 'ltr',
                    added: new Date().toISOString()
                },
                common: {
                    welcome: `Welcome to SAMIA TAROT`,
                    loading: 'Loading...',
                    error: 'Error',
                    success: 'Success',
                    cancel: 'Cancel',
                    save: 'Save',
                    edit: 'Edit',
                    delete: 'Delete'
                },
                navigation: {
                    dashboard: 'Dashboard',
                    readings: 'Readings',
                    chat: 'Chat',
                    profile: 'Profile',
                    settings: 'Settings'
                },
                tarot: {
                    reading: 'Reading',
                    cards: 'Cards',
                    interpretation: 'Interpretation',
                    spread: 'Spread'
                },
                admin: {
                    dashboard: 'Admin Dashboard',
                    users: 'Users',
                    analytics: 'Analytics',
                    settings: 'Settings'
                }
            };

            fs.writeFileSync(langFile, JSON.stringify(languageData, null, 2));
            
            // Update supported languages
            if (!this.supportedLanguages.includes(langCode)) {
                this.supportedLanguages.push(langCode);
            }

            this.log(`✅ Language file created: ${langFile}`);
            
            // Update configuration file
            await this.updateConfiguration();
            
            this.log(`🎉 Language ${langCode} added successfully - SERVER RESTART REQUIRED!`, 'SUCCESS');
            
            return {
                success: true,
                langCode,
                file: langFile,
                restartRequired: true
            };
            
        } catch (error) {
            this.log(`❌ Failed to add language ${langCode}: ${error.message}`, 'ERROR');
            return { success: false, error: error.message };
        }
    }

    async updateConfiguration() {
        this.log('🔧 Updating language configuration...');
        
        try {
            const configContent = `// SAMIA TAROT - Multi-language Configuration
// Auto-generated by Language Manager - Phase 5

const supportedLanguages = ${JSON.stringify(this.supportedLanguages, null, 2)};
const defaultLanguage = '${this.defaultLanguage}';

const loadTranslations = async (language) => {
  try {
    const translations = await import(\`./\${language}.json\`);
    return translations.default || translations;
  } catch (error) {
    console.warn(\`Failed to load translations for \${language}:\`, error);
    // Fallback to default language
    if (language !== defaultLanguage) {
      return loadTranslations(defaultLanguage);
    }
    return {};
  }
};

export {
  supportedLanguages,
  defaultLanguage,
  loadTranslations
};

export default {
  supportedLanguages,
  defaultLanguage,
  loadTranslations
};
`;

            fs.writeFileSync(this.configFile, configContent);
            this.log('✅ Language configuration updated');
            
        } catch (error) {
            this.log(`❌ Failed to update configuration: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async syncLanguageSystem() {
        this.log('🔄 Synchronizing language system...');
        
        try {
            const status = this.getLanguageStatus();
            
            // Validate all language files
            for (const lang of this.supportedLanguages) {
                if (!status.files[lang].exists) {
                    this.log(`❌ Missing language file: ${lang}`, 'ERROR');
                    throw new Error(`Language file missing: ${lang}.json`);
                }
            }
            
            // Update configuration
            await this.updateConfiguration();
            
            this.log('✅ Language system synchronized - SERVER RESTART REQUIRED!', 'SUCCESS');
            
            return {
                success: true,
                languages: this.supportedLanguages.length,
                restartRequired: true
            };
            
        } catch (error) {
            this.log(`❌ Language sync failed: ${error.message}`, 'ERROR');
            return { success: false, error: error.message };
        }
    }

    async validateLanguageSystem() {
        this.log('🔍 Validating language system integrity...');
        
        const validation = {
            valid: true,
            issues: [],
            languages: {},
            configuration: null
        };

        try {
            // Check configuration file
            if (!fs.existsSync(this.configFile)) {
                validation.issues.push('Configuration file missing');
                validation.valid = false;
            }

            // Validate each language
            for (const lang of this.supportedLanguages) {
                const langFile = path.join(this.i18nDirectory, `${lang}.json`);
                const langValidation = {
                    exists: fs.existsSync(langFile),
                    valid: false,
                    structure: null,
                    issues: []
                };

                if (langValidation.exists) {
                    try {
                        const langData = JSON.parse(fs.readFileSync(langFile, 'utf8'));
                        langValidation.valid = true;
                        langValidation.structure = {
                            hasLanguageInfo: !!langData.language,
                            hasCommon: !!langData.common,
                            hasNavigation: !!langData.navigation,
                            hasTarot: !!langData.tarot
                        };
                    } catch (error) {
                        langValidation.issues.push(`Invalid JSON: ${error.message}`);
                        validation.valid = false;
                    }
                } else {
                    langValidation.issues.push('File does not exist');
                    validation.valid = false;
                }

                validation.languages[lang] = langValidation;
            }

            this.log(`🔍 Validation complete: ${validation.valid ? 'PASSED' : 'FAILED'}`);
            return validation;
            
        } catch (error) {
            this.log(`❌ Validation failed: ${error.message}`, 'ERROR');
            validation.valid = false;
            validation.issues.push(error.message);
            return validation;
        }
    }

    async createBackup() {
        this.log('💾 Creating language system backup...');
        
        try {
            const backupDir = path.join(__dirname, '..', 'backups', 'languages');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(backupDir, `language-backup-${timestamp}`);
            fs.mkdirSync(backupPath);

            // Copy all language files
            for (const lang of this.supportedLanguages) {
                const langFile = path.join(this.i18nDirectory, `${lang}.json`);
                if (fs.existsSync(langFile)) {
                    const backupFile = path.join(backupPath, `${lang}.json`);
                    fs.copyFileSync(langFile, backupFile);
                }
            }

            // Copy configuration
            if (fs.existsSync(this.configFile)) {
                const configBackup = path.join(backupPath, 'index.js');
                fs.copyFileSync(this.configFile, configBackup);
            }

            this.log(`✅ Backup created: ${backupPath}`);
            return { success: true, path: backupPath };
            
        } catch (error) {
            this.log(`❌ Backup failed: ${error.message}`, 'ERROR');
            return { success: false, error: error.message };
        }
    }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const langManager = new LanguageManager();
    const command = process.argv[2];

    async function runCommand() {
        try {
            switch (command) {
                case 'status':
                    const status = langManager.getLanguageStatus();
                    console.log('\n🌍 LANGUAGE SYSTEM STATUS:');
                    console.log(`Supported: ${status.supportedLanguages.join(', ')}`);
                    console.log(`Default: ${status.defaultLanguage}`);
                    Object.entries(status.files).forEach(([lang, info]) => {
                        console.log(`  ${lang}: ${info.exists ? '✅' : '❌'} (${info.size} bytes)`);
                    });
                    break;
                    
                case 'add':
                    const langCode = process.argv[3];
                    const langName = process.argv[4] || langCode.toUpperCase();
                    if (!langCode) {
                        console.log('Usage: node scripts/language-manager.js add <code> [name]');
                        process.exit(1);
                    }
                    const result = await langManager.addLanguage(langCode, langName);
                    if (result.success) {
                        console.log(`✅ Language ${langCode} added successfully`);
                        console.log('🚨 SERVER RESTART REQUIRED!');
                    } else {
                        console.log(`❌ Failed to add language: ${result.reason || result.error}`);
                        process.exit(1);
                    }
                    break;
                    
                case 'sync':
                    const syncResult = await langManager.syncLanguageSystem();
                    if (syncResult.success) {
                        console.log('✅ Language system synchronized');
                        console.log('🚨 SERVER RESTART REQUIRED!');
                    } else {
                        console.log(`❌ Sync failed: ${syncResult.error}`);
                        process.exit(1);
                    }
                    break;
                    
                case 'validate':
                    const validation = await langManager.validateLanguageSystem();
                    console.log(`\n🔍 VALIDATION: ${validation.valid ? 'PASSED' : 'FAILED'}`);
                    if (validation.issues.length > 0) {
                        console.log('Issues:');
                        validation.issues.forEach(issue => console.log(`  ❌ ${issue}`));
                    }
                    process.exit(validation.valid ? 0 : 1);
                    break;
                    
                case 'backup':
                    const backup = await langManager.createBackup();
                    if (backup.success) {
                        console.log(`✅ Backup created: ${backup.path}`);
                    } else {
                        console.log(`❌ Backup failed: ${backup.error}`);
                        process.exit(1);
                    }
                    break;
                    
                default:
                    console.log(`
🌍 SAMIA TAROT Language Manager - Phase 5

Usage:
  node scripts/language-manager.js status           - Show language system status
  node scripts/language-manager.js add <code> [name] - Add new language
  node scripts/language-manager.js sync             - Synchronize language system
  node scripts/language-manager.js validate         - Validate language integrity
  node scripts/language-manager.js backup           - Create language backup

Examples:
  node scripts/language-manager.js add fr "Français"
  node scripts/language-manager.js add de "Deutsch"
  node scripts/language-manager.js sync

🚨 CRITICAL: All language operations require SERVER RESTART!
                    `);
                    process.exit(1);
            }
        } catch (error) {
            console.error('❌ Language management command failed:', error.message);
            process.exit(1);
        }
    }

    runCommand();
}

export default LanguageManager; 
 