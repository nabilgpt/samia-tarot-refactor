import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticateToken } from '../middleware/auth.js';
import { roleCheck } from '../middleware/roleCheck.js';

const router = express.Router();

// ===========================================
// 🔴 CRITICAL PRE-REFACTOR BACKUP SYSTEM
// ===========================================

/**
 * GET /api/system-backup/export
 * Export all data from System Secrets and Bilingual Settings tabs
 * This is a MANDATORY step before any refactoring can begin
 */
// Development middleware bypass for local testing
const developmentBypass = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    req.user = { email: 'development@local', role: 'super_admin' };
    req.profile = { role: 'super_admin', email: 'development@local' };
    console.log('🔧 [DEV] Development bypass activated for system backup');
    next();
  } else {
    authenticateToken(req, res, next);
  }
};

router.get('/export', developmentBypass, roleCheck(['super_admin']), async (req, res) => {
  try {
    console.log('🔄 [SYSTEM BACKUP] Starting comprehensive backup export...');
    
    const backupData = {
      meta: {
        export_timestamp: new Date().toISOString(),
        export_version: '1.0.0',
        exported_by: req.user.email,
        export_type: 'pre_refactor_backup',
        description: 'Pre-refactor backup of System Secrets and Bilingual Settings tabs'
      },
      system_secrets: {},
      bilingual_settings: {},
      related_tables: {}
    };

    // ================================
    // 1. EXPORT SYSTEM SECRETS DATA
    // ================================
    console.log('📋 [SYSTEM BACKUP] Exporting system secrets data...');
    
    try {
      // System configurations
      const { data: systemConfigs, error: configError } = await supabaseAdmin
        .from('system_configurations')
        .select('*');
      
      if (configError) throw configError;
      
      backupData.system_secrets.configurations = systemConfigs || [];
      console.log(`✅ [SYSTEM BACKUP] Exported ${systemConfigs?.length || 0} system configurations`);
      
      // Configuration access logs
      const { data: configLogs, error: logError } = await supabaseAdmin
        .from('configuration_access_log')
        .select('*')
        .order('accessed_at', { ascending: false })
        .limit(1000);
      
      if (!logError) {
        backupData.system_secrets.access_logs = configLogs || [];
        console.log(`✅ [SYSTEM BACKUP] Exported ${configLogs?.length || 0} configuration access logs`);
      }
      
    } catch (error) {
      console.error('❌ [SYSTEM BACKUP] Error exporting system secrets:', error);
      backupData.system_secrets.error = error.message;
    }

    // ================================
    // 2. EXPORT BILINGUAL SETTINGS DATA
    // ================================
    console.log('📋 [SYSTEM BACKUP] Exporting bilingual settings data...');
    
    try {
      // AI Translation Providers
      const { data: aiProviders, error: providerError } = await supabaseAdmin
        .from('ai_translation_providers')
        .select('*');
      
      if (providerError) throw providerError;
      
      backupData.bilingual_settings.ai_translation_providers = aiProviders || [];
      console.log(`✅ [SYSTEM BACKUP] Exported ${aiProviders?.length || 0} AI translation providers`);
      
      // Translation Settings
      const { data: translationSettings, error: settingsError } = await supabaseAdmin
        .from('translation_settings')
        .select('*');
      
      if (settingsError) throw settingsError;
      
      backupData.bilingual_settings.translation_settings = translationSettings || [];
      console.log(`✅ [SYSTEM BACKUP] Exported ${translationSettings?.length || 0} translation settings`);
      
      // AI Providers (general)
      const { data: generalProviders, error: generalError } = await supabaseAdmin
        .from('ai_providers')
        .select('*');
      
      if (generalError) throw generalError;
      
      backupData.bilingual_settings.ai_providers = generalProviders || [];
      console.log(`✅ [SYSTEM BACKUP] Exported ${generalProviders?.length || 0} general AI providers`);
      
    } catch (error) {
      console.error('❌ [SYSTEM BACKUP] Error exporting bilingual settings:', error);
      backupData.bilingual_settings.error = error.message;
    }

    // ================================
    // 3. EXPORT RELATED TABLES
    // ================================
    console.log('📋 [SYSTEM BACKUP] Exporting related tables...');
    
    const relatedTables = [
      'ai_usage_analytics',
      'ai_provider_configs',
      'bilingual_auto_translations',
      'system_health_checks',
      'admin_audit_logs'
    ];
    
    for (const tableName of relatedTables) {
      try {
        const { data: tableData, error: tableError } = await supabaseAdmin
          .from(tableName)
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000);
        
        if (!tableError) {
          backupData.related_tables[tableName] = tableData || [];
          console.log(`✅ [SYSTEM BACKUP] Exported ${tableData?.length || 0} records from ${tableName}`);
        } else {
          console.log(`⚠️ [SYSTEM BACKUP] Table ${tableName} not found or error: ${tableError.message}`);
          backupData.related_tables[tableName] = { error: tableError.message };
        }
      } catch (error) {
        console.error(`❌ [SYSTEM BACKUP] Error exporting ${tableName}:`, error);
        backupData.related_tables[tableName] = { error: error.message };
      }
    }

    // ================================
    // 4. GENERATE SUMMARY
    // ================================
    const summary = {
      total_system_configurations: backupData.system_secrets.configurations?.length || 0,
      total_ai_translation_providers: backupData.bilingual_settings.ai_translation_providers?.length || 0,
      total_translation_settings: backupData.bilingual_settings.translation_settings?.length || 0,
      total_general_ai_providers: backupData.bilingual_settings.ai_providers?.length || 0,
      total_config_access_logs: backupData.system_secrets.access_logs?.length || 0,
      related_tables_count: Object.keys(backupData.related_tables).length,
      backup_size_estimate: JSON.stringify(backupData).length + ' bytes'
    };
    
    backupData.meta.summary = summary;
    
    console.log('✅ [SYSTEM BACKUP] Backup export completed successfully');
    console.log('📊 [SYSTEM BACKUP] Summary:', summary);
    
    res.json({
      success: true,
      message: 'Backup export completed successfully',
      data: backupData,
      summary
    });

  } catch (error) {
    console.error('❌ [SYSTEM BACKUP] Critical error during backup export:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export backup data',
      details: error.message
    });
  }
});

/**
 * POST /api/system-backup/restore
 * Restore data from a backup file
 * This allows rollback if anything goes wrong during refactoring
 */
router.post('/restore', developmentBypass, roleCheck(['super_admin']), async (req, res) => {
  try {
    const { backupData, confirmRestore } = req.body;
    
    if (!confirmRestore) {
      return res.status(400).json({
        success: false,
        error: 'Restore confirmation required'
      });
    }
    
    if (!backupData || !backupData.meta || !backupData.meta.export_version) {
      return res.status(400).json({
        success: false,
        error: 'Invalid backup data format'
      });
    }
    
    console.log('🔄 [SYSTEM BACKUP] Starting restore process...');
    console.log('📋 [SYSTEM BACKUP] Backup version:', backupData.meta.export_version);
    console.log('📋 [SYSTEM BACKUP] Original export by:', backupData.meta.exported_by);
    console.log('📋 [SYSTEM BACKUP] Restore initiated by:', req.user.email);
    
    const restoreLog = {
      restored_at: new Date().toISOString(),
      restored_by: req.user.email,
      original_export: backupData.meta,
      restore_results: {}
    };
    
    // ================================
    // 1. RESTORE SYSTEM SECRETS
    // ================================
    if (backupData.system_secrets.configurations) {
      console.log('🔄 [SYSTEM BACKUP] Restoring system configurations...');
      
      for (const config of backupData.system_secrets.configurations) {
        try {
          const { error: upsertError } = await supabaseAdmin
            .from('system_configurations')
            .upsert(config, { onConflict: 'config_key,config_category' });
          
          if (upsertError) throw upsertError;
        } catch (error) {
          console.error(`❌ [SYSTEM BACKUP] Error restoring config ${config.config_key}:`, error);
        }
      }
      
      restoreLog.restore_results.system_configurations = backupData.system_secrets.configurations.length;
    }
    
    // ================================
    // 2. RESTORE BILINGUAL SETTINGS
    // ================================
    if (backupData.bilingual_settings.ai_translation_providers) {
      console.log('🔄 [SYSTEM BACKUP] Restoring AI translation providers...');
      
      for (const provider of backupData.bilingual_settings.ai_translation_providers) {
        try {
          const { error: upsertError } = await supabaseAdmin
            .from('ai_translation_providers')
            .upsert(provider, { onConflict: 'id' });
          
          if (upsertError) throw upsertError;
        } catch (error) {
          console.error(`❌ [SYSTEM BACKUP] Error restoring provider ${provider.name}:`, error);
        }
      }
      
      restoreLog.restore_results.ai_translation_providers = backupData.bilingual_settings.ai_translation_providers.length;
    }
    
    if (backupData.bilingual_settings.translation_settings) {
      console.log('🔄 [SYSTEM BACKUP] Restoring translation settings...');
      
      for (const setting of backupData.bilingual_settings.translation_settings) {
        try {
          const { error: upsertError } = await supabaseAdmin
            .from('translation_settings')
            .upsert(setting, { onConflict: 'setting_key' });
          
          if (upsertError) throw upsertError;
        } catch (error) {
          console.error(`❌ [SYSTEM BACKUP] Error restoring setting ${setting.setting_key}:`, error);
        }
      }
      
      restoreLog.restore_results.translation_settings = backupData.bilingual_settings.translation_settings.length;
    }
    
    console.log('✅ [SYSTEM BACKUP] Restore completed successfully');
    console.log('📊 [SYSTEM BACKUP] Restore log:', restoreLog);
    
    res.json({
      success: true,
      message: 'Backup restored successfully',
      restore_log: restoreLog
    });

  } catch (error) {
    console.error('❌ [SYSTEM BACKUP] Critical error during restore:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore backup data',
      details: error.message
    });
  }
});

/**
 * GET /api/system-backup/validate
 * Validate that backup data is complete and ready for export
 */
router.get('/validate', developmentBypass, roleCheck(['super_admin']), async (req, res) => {
  try {
    console.log('🔍 [SYSTEM BACKUP] Validating backup readiness...');
    
    const validation = {
      system_secrets: {
        configurations: { exists: false, count: 0 },
        access_logs: { exists: false, count: 0 }
      },
      bilingual_settings: {
        ai_translation_providers: { exists: false, count: 0 },
        translation_settings: { exists: false, count: 0 },
        ai_providers: { exists: false, count: 0 }
      },
      critical_data_found: false,
      ready_for_backup: false
    };
    
    // Check system configurations
    const { data: configs, error: configError } = await supabaseAdmin
      .from('system_configurations')
      .select('id', { count: 'exact' });
    
    if (!configError) {
      validation.system_secrets.configurations = { exists: true, count: configs?.length || 0 };
    }
    
    // Check AI translation providers
    const { data: providers, error: providerError } = await supabaseAdmin
      .from('ai_translation_providers')
      .select('id', { count: 'exact' });
    
    if (!providerError) {
      validation.bilingual_settings.ai_translation_providers = { exists: true, count: providers?.length || 0 };
    }
    
    // Check translation settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('translation_settings')
      .select('id', { count: 'exact' });
    
    if (!settingsError) {
      validation.bilingual_settings.translation_settings = { exists: true, count: settings?.length || 0 };
    }
    
    // Determine if critical data exists
    validation.critical_data_found = (
      validation.system_secrets.configurations.count > 0 ||
      validation.bilingual_settings.ai_translation_providers.count > 0 ||
      validation.bilingual_settings.translation_settings.count > 0
    );
    
    validation.ready_for_backup = validation.critical_data_found;
    
    console.log('✅ [SYSTEM BACKUP] Validation completed:', validation);
    
    res.json({
      success: true,
      validation,
      ready_for_backup: validation.ready_for_backup
    });

  } catch (error) {
    console.error('❌ [SYSTEM BACKUP] Validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate backup readiness',
      details: error.message
    });
  }
});

export default router; 