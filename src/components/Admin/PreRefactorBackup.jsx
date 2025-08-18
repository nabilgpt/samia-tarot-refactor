import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { 
  Download, Shield, AlertTriangle, CheckCircle, RefreshCw, 
  FileText, Database, Settings, Languages, Archive, 
  X, Upload, Eye, Clock, User, ExternalLink,
  HardDrive, Zap, Lock, AlertCircle, Info, PlayCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/frontendApi';

// ===========================================
// 🔴 CRITICAL PRE-REFACTOR BACKUP COMPONENT
// ===========================================

const PreRefactorBackup = ({ isOpen, onClose, onBackupComplete }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [backupData, setBackupData] = useState(null);
  const [validation, setValidation] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [backupCompleted, setBackupCompleted] = useState(false);

  // Auto-validate on component mount
  useEffect(() => {
    if (isOpen && profile?.role === 'super_admin') {
      handleValidateBackup();
    }
  }, [isOpen, profile]);

  // ===========================================
  // BACKUP VALIDATION
  // ===========================================
  const handleValidateBackup = async () => {
    try {
      setValidating(true);
      console.log('🔍 [BACKUP] Validating backup readiness...');
      
      const response = await api.get('/system-backup/validate');
      
      if (response.data.success) {
        setValidation(response.data.validation);
        console.log('✅ [BACKUP] Validation completed:', response.data.validation);
      } else {
        toast.error('فشل في التحقق من جاهزية النسخ الاحتياطي');
        console.error('❌ [BACKUP] Validation failed:', response.data.error);
      }
    } catch (error) {
      console.error('❌ [BACKUP] Validation error:', error);
      toast.error('خطأ في التحقق من جاهزية النسخ الاحتياطي');
    } finally {
      setValidating(false);
    }
  };

  // ===========================================
  // BACKUP EXPORT
  // ===========================================
  const handleExportBackup = async () => {
    try {
      setLoading(true);
      console.log('🔄 [BACKUP] Starting backup export...');
      
      const response = await api.get('/system-backup/export');
      
      if (response.data.success) {
        const exportData = response.data.data;
        setBackupData(exportData);
        
        // Generate download file
        const filename = `samia-tarot-backup-${new Date().toISOString().split('T')[0]}.json`;
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setBackupCompleted(true);
        setShowSummary(true);
        toast.success('تم إنشاء النسخة الاحتياطية بنجاح! 🎉');
        
        // Call the callback to indicate backup completion
        if (onBackupComplete) {
          onBackupComplete(exportData);
        }
        
        console.log('✅ [BACKUP] Export completed successfully');
      } else {
        toast.error('فشل في إنشاء النسخة الاحتياطية');
        console.error('❌ [BACKUP] Export failed:', response.data.error);
      }
    } catch (error) {
      console.error('❌ [BACKUP] Export error:', error);
      toast.error('خطأ في إنشاء النسخة الاحتياطية');
    } finally {
      setLoading(false);
    }
  };

  // ===========================================
  // BACKUP RESTORE
  // ===========================================
  const handleRestoreBackup = async () => {
    if (!restoreFile) {
      toast.error('يرجى اختيار ملف النسخة الاحتياطية');
      return;
    }

    try {
      setRestoring(true);
      console.log('🔄 [BACKUP] Starting backup restore...');
      
      const fileContent = await restoreFile.text();
      const backupData = JSON.parse(fileContent);
      
      const response = await api.post('/system-backup/restore', {
        backupData,
        confirmRestore: true
      });
      
      if (response.data.success) {
        toast.success('تم استعادة النسخة الاحتياطية بنجاح! 🎉');
        setShowRestoreModal(false);
        setRestoreFile(null);
        
        // Reload validation after restore
        await handleValidateBackup();
        
        console.log('✅ [BACKUP] Restore completed successfully');
      } else {
        toast.error('فشل في استعادة النسخة الاحتياطية');
        console.error('❌ [BACKUP] Restore failed:', response.data.error);
      }
    } catch (error) {
      console.error('❌ [BACKUP] Restore error:', error);
      toast.error('خطأ في استعادة النسخة الاحتياطية');
    } finally {
      setRestoring(false);
    }
  };

  // ===========================================
  // RENDER VALIDATION STATUS
  // ===========================================
  const renderValidationStatus = () => {
    if (!validation) return null;

    const { system_secrets, bilingual_settings, critical_data_found, ready_for_backup } = validation;

    return (
      <div className="space-y-6">
        <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            حالة البيانات الحالية
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* System Secrets */}
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="font-medium text-purple-300 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                System Secrets
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Configurations:</span>
                  <span className={`font-medium ${system_secrets.configurations.count > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {system_secrets.configurations.count}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Access Logs:</span>
                  <span className={`font-medium ${system_secrets.access_logs.count > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                    {system_secrets.access_logs.count}
                  </span>
                </div>
              </div>
            </div>

            {/* Bilingual Settings */}
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="font-medium text-cyan-300 mb-3 flex items-center gap-2">
                <Languages className="w-4 h-4" />
                Bilingual Settings
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">AI Providers:</span>
                  <span className={`font-medium ${bilingual_settings.ai_translation_providers.count > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {bilingual_settings.ai_translation_providers.count}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Translation Settings:</span>
                  <span className={`font-medium ${bilingual_settings.translation_settings.count > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {bilingual_settings.translation_settings.count}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Backup Status */}
        <div className={`bg-white/5 backdrop-blur-sm border rounded-xl p-6 ${ready_for_backup ? 'border-green-400/30' : 'border-red-400/30'}`}>
          <div className="flex items-center gap-3 mb-3">
            {ready_for_backup ? (
              <CheckCircle className="w-6 h-6 text-green-400" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-red-400" />
            )}
            <h3 className="text-lg font-semibold text-white">
              {ready_for_backup ? 'جاهز للنسخ الاحتياطي' : 'غير جاهز للنسخ الاحتياطي'}
            </h3>
          </div>
          
          <p className="text-gray-300 mb-4">
            {ready_for_backup ? 
              'تم العثور على بيانات مهمة في النظام. يمكن المتابعة بأمان مع إنشاء النسخة الاحتياطية.' :
              'لم يتم العثور على بيانات مهمة في النظام. قد تكون هذه تنصيب جديد.'
            }
          </p>
          
          {critical_data_found && (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-yellow-300 text-sm flex items-center gap-2">
                <Info className="w-4 h-4" />
                تحتوي قاعدة البيانات على {
                  (system_secrets.configurations.count || 0) +
                  (bilingual_settings.ai_translation_providers.count || 0) +
                  (bilingual_settings.translation_settings.count || 0)
                } عنصر مهم يجب حفظه.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ===========================================
  // RENDER BACKUP SUMMARY
  // ===========================================
  const renderBackupSummary = () => {
    if (!backupData || !backupData.meta) return null;

    const { meta, system_secrets, bilingual_settings, related_tables } = backupData;
    const summary = meta.summary || {};

    return (
      <div className="space-y-6">
        <div className="bg-white/5 backdrop-blur-sm border border-green-400/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            النسخة الاحتياطية مكتملة
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">
                  تاريخ الإنشاء: {new Date(meta.export_timestamp).toLocaleString('ar-SA')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">
                  تم إنشاؤها بواسطة: {meta.exported_by}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">
                  حجم النسخة: {summary.backup_size_estimate || 'غير محدد'}
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-300">
                  إعدادات النظام: {summary.total_system_configurations || 0}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-gray-300">
                  مقدمو الترجمة: {summary.total_ai_translation_providers || 0}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-300">
                  إعدادات الترجمة: {summary.total_translation_settings || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4">
          <p className="text-green-300 text-center font-medium">
            ✅ تم إنشاء النسخة الاحتياطية بنجاح وتحميلها على جهازك
          </p>
          <p className="text-green-200 text-sm text-center mt-2">
            يمكنك الآن المتابعة بأمان مع عملية إعادة الهيكلة
          </p>
        </div>
      </div>
    );
  };

  // ===========================================
  // RENDER RESTORE MODAL
  // ===========================================
  const renderRestoreModal = () => (
    <AnimatePresence>
      {showRestoreModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl p-6 max-w-md w-full border border-white/20"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-purple-400" />
                استعادة النسخة الاحتياطية
              </h3>
              <button
                onClick={() => setShowRestoreModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-yellow-300 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  تحذير: هذا سيستبدل جميع الإعدادات الحالية
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  اختر ملف النسخة الاحتياطية:
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => setRestoreFile(e.target.files[0])}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white file:bg-purple-500/20 file:border-0 file:text-purple-300 file:px-4 file:py-1 file:rounded file:mr-4"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowRestoreModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleRestoreBackup}
                  disabled={!restoreFile || restoring}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                >
                  {restoring ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      استعادة...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      استعادة
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ===========================================
  // MAIN RENDER
  // ===========================================
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-white/20"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-red-500/20 rounded-full p-3">
                  <Archive className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    🔴 نسخة احتياطية قبل إعادة الهيكلة
                  </h2>
                  <p className="text-gray-300 text-sm">
                    خطوة إلزامية قبل المتابعة مع إعادة هيكلة النظام
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Critical Warning */}
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="font-semibold text-red-300">تحذير مهم</h3>
              </div>
              <p className="text-red-200 text-sm">
                هذه خطوة إلزامية وحاسمة. يجب إنشاء نسخة احتياطية كاملة من جميع إعدادات النظام
                والترجمة الثنائية قبل المتابعة مع إعادة الهيكلة. لا يمكن التراجع عن هذه العملية بدون النسخة الاحتياطية.
              </p>
            </div>

            {/* Content */}
            <div className="space-y-6">
              {!showSummary ? (
                <>
                  {/* Validation Section */}
                  <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-400" />
                        التحقق من جاهزية النظام
                      </h3>
                      <button
                        onClick={handleValidateBackup}
                        disabled={validating}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
                      >
                        {validating ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            جاري التحقق...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            إعادة التحقق
                          </>
                        )}
                      </button>
                    </div>
                    
                    {validating ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                      </div>
                    ) : (
                      renderValidationStatus()
                    )}
                  </div>

                  {/* Action Buttons */}
                  {validation && (
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={() => setShowRestoreModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                      >
                        <Upload className="w-5 h-5" />
                        استعادة من نسخة احتياطية
                      </button>
                      
                      <button
                        onClick={handleExportBackup}
                        disabled={loading || !validation?.ready_for_backup}
                        className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                      >
                        {loading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            جاري الإنشاء...
                          </>
                        ) : (
                          <>
                            <Download className="w-5 h-5" />
                            إنشاء النسخة الاحتياطية
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Backup Summary */}
                  {renderBackupSummary()}
                  
                  {/* Post-Backup Actions */}
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={onClose}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg transition-all duration-300"
                    >
                      <PlayCircle className="w-5 h-5" />
                      متابعة إعادة الهيكلة
                    </button>
                    
                    <button
                      onClick={() => setShowRestoreModal(true)}
                      className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                    >
                      <Upload className="w-5 h-5" />
                      استعادة إذا لزم الأمر
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      
      {/* Restore Modal */}
      {renderRestoreModal()}
    </AnimatePresence>
  );
};

export default PreRefactorBackup; 