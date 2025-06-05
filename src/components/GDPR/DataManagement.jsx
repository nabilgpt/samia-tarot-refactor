import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { 
  DocumentArrowDownIcon,
  TrashIcon,
  EyeIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import CosmicButton from '../UI/CosmicButton';
import CosmicCard from '../UI/CosmicCard';

const DataManagement = () => {
  const { t } = useTranslation();
  const { language } = useUI();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const dataCategories = [
    {
      id: 'profile',
      titleAr: 'معلومات الملف الشخصي',
      titleEn: 'Profile Information',
      descriptionAr: 'الاسم، البريد الإلكتروني، رقم الهاتف، تاريخ الميلاد',
      descriptionEn: 'Name, email, phone number, date of birth',
      icon: EyeIcon,
      size: '2.3 KB'
    },
    {
      id: 'bookings',
      titleAr: 'سجل الحجوزات',
      titleEn: 'Booking History',
      descriptionAr: 'تواريخ الجلسات، نوع الخدمة، المدفوعات',
      descriptionEn: 'Session dates, service type, payments',
      icon: DocumentArrowDownIcon,
      size: '15.7 KB'
    },
    {
      id: 'messages',
      titleAr: 'الرسائل والمحادثات',
      titleEn: 'Messages & Conversations',
      descriptionAr: 'المحادثات مع القارئين، الرسائل المحفوظة',
      descriptionEn: 'Conversations with readers, saved messages',
      icon: EyeIcon,
      size: '45.2 KB'
    },
    {
      id: 'payments',
      titleAr: 'معلومات الدفع',
      titleEn: 'Payment Information',
      descriptionAr: 'تاريخ المعاملات، الفواتير (بدون معلومات البطاقة)',
      descriptionEn: 'Transaction history, invoices (no card details)',
      icon: ShieldCheckIcon,
      size: '8.9 KB'
    }
  ];

  const handleDataExport = async () => {
    setLoading(true);
    setExportStatus('processing');
    
    try {
      // Simulate API call to export user data
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Create mock export data
      const exportData = {
        user_id: user?.id,
        export_date: new Date().toISOString(),
        data: {
          profile: {
            email: user?.email,
            created_at: user?.created_at,
            // Add more profile data
          },
          bookings: [
            // Mock booking data
          ],
          messages: [
            // Mock message data
          ],
          payments: [
            // Mock payment data
          ]
        }
      };
      
      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `samia-tarot-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setExportStatus('completed');
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleDataDeletion = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    
    setLoading(true);
    
    try {
      // Simulate API call to delete user data
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In real implementation, this would:
      // 1. Anonymize user data
      // 2. Delete personal information
      // 3. Keep transaction records for legal compliance
      // 4. Log the deletion request
      
      alert(language === 'ar' 
        ? 'تم تقديم طلب حذف البيانات. ستتم معالجته خلال 30 يومًا.'
        : 'Data deletion request submitted. It will be processed within 30 days.'
      );
      
      setDeleteConfirm(false);
    } catch (error) {
      console.error('Deletion failed:', error);
      alert(language === 'ar' 
        ? 'حدث خطأ في تقديم طلب الحذف. يرجى المحاولة مرة أخرى.'
        : 'Error submitting deletion request. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text mb-4">
            {language === 'ar' ? 'إدارة بياناتك الشخصية' : 'Manage Your Personal Data'}
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            {language === 'ar' 
              ? 'تحكم في بياناتك الشخصية وفقًا للائحة العامة لحماية البيانات (GDPR). يمكنك تصدير أو حذف بياناتك في أي وقت.'
              : 'Control your personal data in accordance with GDPR. You can export or delete your data at any time.'
            }
          </p>
        </div>

        {/* Data Categories Overview */}
        <CosmicCard variant="glass" className="mb-8">
          <h2 className="text-xl font-bold mb-6 gradient-text">
            {language === 'ar' ? 'البيانات المحفوظة' : 'Stored Data'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataCategories.map((category, index) => {
              const Icon = category.icon;
              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-gold-400/20 rounded-lg p-4"
                >
                  <div className="flex items-start space-x-3 rtl:space-x-reverse">
                    <div className="p-2 rounded-lg bg-cosmic-500/20">
                      <Icon className="w-5 h-5 text-cosmic-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">
                        {language === 'ar' ? category.titleAr : category.titleEn}
                      </h3>
                      <p className="text-sm text-gray-400 mb-2">
                        {language === 'ar' ? category.descriptionAr : category.descriptionEn}
                      </p>
                      <span className="text-xs text-gold-400">
                        {language === 'ar' ? 'الحجم: ' : 'Size: '}{category.size}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CosmicCard>

        {/* Data Export Section */}
        <CosmicCard variant="glass" className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold gradient-text mb-2">
                {language === 'ar' ? 'تصدير البيانات' : 'Data Export'}
              </h2>
              <p className="text-gray-400">
                {language === 'ar' 
                  ? 'احصل على نسخة من جميع بياناتك بصيغة JSON قابلة للقراءة'
                  : 'Get a copy of all your data in a readable JSON format'
                }
              </p>
            </div>
            <DocumentArrowDownIcon className="w-8 h-8 text-gold-400" />
          </div>

          {exportStatus && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-4 rounded-lg mb-4 ${
                exportStatus === 'completed' ? 'bg-green-900/20 border border-green-500/30' :
                exportStatus === 'processing' ? 'bg-blue-900/20 border border-blue-500/30' :
                'bg-red-900/20 border border-red-500/30'
              }`}
            >
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                {exportStatus === 'completed' && <CheckCircleIcon className="w-5 h-5 text-green-400" />}
                {exportStatus === 'processing' && <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />}
                {exportStatus === 'error' && <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />}
                <span className={`text-sm ${
                  exportStatus === 'completed' ? 'text-green-400' :
                  exportStatus === 'processing' ? 'text-blue-400' :
                  'text-red-400'
                }`}>
                  {exportStatus === 'completed' && (language === 'ar' ? 'تم تصدير البيانات بنجاح' : 'Data exported successfully')}
                  {exportStatus === 'processing' && (language === 'ar' ? 'جاري تصدير البيانات...' : 'Exporting data...')}
                  {exportStatus === 'error' && (language === 'ar' ? 'حدث خطأ في تصدير البيانات' : 'Error exporting data')}
                </span>
              </div>
            </motion.div>
          )}

          <CosmicButton
            variant="primary"
            onClick={handleDataExport}
            disabled={loading}
            className="w-full"
          >
            {loading 
              ? (language === 'ar' ? 'جاري التصدير...' : 'Exporting...')
              : (language === 'ar' ? 'تصدير جميع البيانات' : 'Export All Data')
            }
          </CosmicButton>
        </CosmicCard>

        {/* Data Deletion Section */}
        <CosmicCard variant="glass" className="border-red-500/30">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-red-400 mb-2">
                {language === 'ar' ? 'حذف البيانات' : 'Data Deletion'}
              </h2>
              <p className="text-gray-400">
                {language === 'ar' 
                  ? 'احذف جميع بياناتك الشخصية نهائيًا. هذا الإجراء لا يمكن التراجع عنه.'
                  : 'Permanently delete all your personal data. This action cannot be undone.'
                }
              </p>
            </div>
            <TrashIcon className="w-8 h-8 text-red-400" />
          </div>

          {deleteConfirm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4"
            >
              <div className="flex items-start space-x-3 rtl:space-x-reverse">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-400 mb-2">
                    {language === 'ar' ? 'تأكيد حذف البيانات' : 'Confirm Data Deletion'}
                  </h3>
                  <p className="text-sm text-gray-300 mb-4">
                    {language === 'ar' 
                      ? 'سيتم حذف جميع بياناتك الشخصية خلال 30 يومًا. سيتم الاحتفاظ ببعض معلومات المعاملات للامتثال القانوني.'
                      : 'All your personal data will be deleted within 30 days. Some transaction information will be retained for legal compliance.'
                    }
                  </p>
                  <div className="flex space-x-3 rtl:space-x-reverse">
                    <CosmicButton
                      variant="danger"
                      onClick={handleDataDeletion}
                      disabled={loading}
                      size="sm"
                    >
                      {loading 
                        ? (language === 'ar' ? 'جاري الحذف...' : 'Deleting...')
                        : (language === 'ar' ? 'تأكيد الحذف' : 'Confirm Deletion')
                      }
                    </CosmicButton>
                    <CosmicButton
                      variant="ghost"
                      onClick={() => setDeleteConfirm(false)}
                      size="sm"
                    >
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </CosmicButton>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <CosmicButton
            variant="danger"
            onClick={handleDataDeletion}
            disabled={loading}
            className="w-full"
          >
            {language === 'ar' ? 'طلب حذف البيانات' : 'Request Data Deletion'}
          </CosmicButton>
        </CosmicCard>

        {/* Legal Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-gray-500">
            {language === 'ar' 
              ? 'جميع طلبات إدارة البيانات تتم معالجتها وفقًا للائحة العامة لحماية البيانات (GDPR) وقوانين حماية البيانات المحلية'
              : 'All data management requests are processed in accordance with GDPR and local data protection laws'
            }
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default DataManagement; 