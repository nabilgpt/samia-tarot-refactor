import React, { useState } from 'react';
import { motion } from 'framer-motion';
import CosmicButton from '../../components/UI/CosmicButton';
import {
  DevicePhoneMobileIcon,
  BuildingStorefrontIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentCheckIcon,
  ShieldCheckIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

const AdminStoreReadinessPage = () => {
  const [activeTab, setActiveTab] = useState('ios');

  const storeAssets = {
    ios: {
      title: 'iOS App Store',
      items: [
        {
          name: 'Privacy Manifest (PrivacyInfo.xcprivacy)',
          status: 'ready',
          description: 'Required privacy manifest with data collection types and API usage',
          path: '/ios/PrivacyInfo.xcprivacy',
          action: 'View File'
        },
        {
          name: 'App Store Privacy Configuration',
          status: 'ready', 
          description: 'Complete privacy questionnaire answers and age rating setup',
          path: '/store_assets/app_store_privacy_config.md',
          action: 'View Guide'
        },
        {
          name: 'App Store Listing Content',
          status: 'ready',
          description: 'App description, keywords, screenshots, and metadata',
          path: '/store_assets/app_store_listing.md',
          action: 'View Content'
        },
        {
          name: 'iOS Build Scripts',
          status: 'ready',
          description: 'Automated IPA generation and TestFlight upload instructions',
          path: '/scripts/build_ios_ipa.sh',
          action: 'View Script'
        },
        {
          name: 'TestFlight Beta Testing',
          status: 'pending',
          description: 'Internal and external testing configuration',
          url: 'https://appstoreconnect.apple.com',
          action: 'Open App Store Connect'
        },
        {
          name: '18+ Age Rating Compliance',
          status: 'ready',
          description: 'Questionnaire responses for mature spiritual content',
          notes: 'New 2025 age rating system - 18+ category selected',
          action: 'Review Requirements'
        }
      ]
    },
    android: {
      title: 'Google Play Store',
      items: [
        {
          name: 'Android App Bundle (AAB)',
          status: 'ready',
          description: 'Build configuration and signing setup for Play Store',
          path: '/android/app/build.gradle',
          action: 'View Config'
        },
        {
          name: 'Data Safety Declaration',
          status: 'ready',
          description: 'Complete Google Play Data Safety questionnaire responses',
          path: '/store_assets/google_play_data_safety.md',
          action: 'View Declaration'
        },
        {
          name: 'Play Store Listing',
          status: 'ready',
          description: 'App description, screenshots, and store metadata',
          path: '/store_assets/google_play_listing.md',
          action: 'View Listing'
        },
        {
          name: 'AAB Build Scripts', 
          status: 'ready',
          description: 'Automated bundle generation for internal/closed/open testing',
          path: '/scripts/build_android_aab.sh',
          action: 'View Script'
        },
        {
          name: 'Account Deletion Implementation',
          status: 'ready',
          description: 'In-app and web deletion flow per Play Policy',
          url: 'https://samiatarot.com/account/delete',
          action: 'Test Deletion Flow'
        },
        {
          name: 'Play Console Testing Tracks',
          status: 'pending',
          description: 'Internal → Closed → Open → Production rollout',
          url: 'https://play.google.com/console',
          action: 'Open Play Console'
        }
      ]
    }
  };

  const complianceChecks = [
    {
      name: 'Privacy Policy Compliance',
      status: 'ready',
      description: 'GDPR-compliant privacy policy with DSR workflows',
      requirements: ['GDPR Article 15/17', 'COPPA compliance', '18+ age gating', 'Immutable audit trails']
    },
    {
      name: 'Data Subject Rights (DSR)',
      status: 'ready',
      description: 'Export and deletion requests with admin approval workflows',
      requirements: ['72-hour grace period', 'Verification tokens', 'Admin oversight', 'Audit logging']
    },
    {
      name: 'Age Verification System',
      status: 'ready',
      description: 'Adults-only enforcement with COPPA incident handling',
      requirements: ['18+ gate on signup', 'DOB validation', 'Under-13 protection', 'Auto-blocking']
    },
    {
      name: 'Store Age Rating',
      status: 'ready',
      description: 'Proper content rating for spiritual/mature services',
      requirements: ['iOS 18+ (new system)', 'Android Adults Only', 'Mature theme disclosure']
    }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ready':
        return <CheckCircleIcon className="h-5 w-5 text-green-400" />;
      case 'pending':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />;
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-400" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ready': return 'text-green-400 bg-green-400/10';
      case 'pending': return 'text-yellow-400 bg-yellow-400/10';
      case 'error': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const handleOpenFile = (path) => {
    if (path) {
      const fullPath = `${window.location.origin}${path}`;
      window.open(fullPath, '_blank', 'noopener,noreferrer');
    }
  };

  const handleOpenUrl = (url) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-4">
            Store Readiness Dashboard
          </h1>
          <p className="text-gray-300">
            Mobile app packaging, store submissions, and compliance validation for iOS App Store and Google Play
          </p>
        </motion.div>

        {/* Platform Tabs */}
        <div className="flex space-x-4 mb-8">
          {['ios', 'android'].map((platform) => (
            <button
              key={platform}
              onClick={() => setActiveTab(platform)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors ${
                activeTab === platform
                  ? 'bg-cosmic-purple text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {platform === 'ios' ? (
                <DevicePhoneMobileIcon className="h-5 w-5" />
              ) : (
                <BuildingStorefrontIcon className="h-5 w-5" />
              )}
              <span className="font-medium">
                {platform === 'ios' ? 'iOS App Store' : 'Google Play Store'}
              </span>
            </button>
          ))}
        </div>

        {/* Store Assets */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 mb-8"
        >
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
            <DocumentTextIcon className="h-6 w-6" />
            <span>{storeAssets[activeTab].title} Assets</span>
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {storeAssets[activeTab].items.map((item, index) => (
              <div
                key={index}
                className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-white font-medium flex-1">{item.name}</h3>
                  <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                    {getStatusIcon(item.status)}
                    <span className="capitalize">{item.status}</span>
                  </span>
                </div>
                
                <p className="text-gray-300 text-sm mb-3">{item.description}</p>
                
                {item.notes && (
                  <p className="text-cosmic-accent text-xs mb-3 bg-cosmic-accent/10 rounded px-2 py-1">
                    {item.notes}
                  </p>
                )}

                <div className="flex justify-end">
                  <CosmicButton
                    variant="outline"
                    size="sm"
                    onClick={() => item.path ? handleOpenFile(item.path) : handleOpenUrl(item.url)}
                  >
                    <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
                    {item.action}
                  </CosmicButton>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Compliance Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 mb-8"
        >
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
            <ShieldCheckIcon className="h-6 w-6" />
            <span>Legal & Compliance Status</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {complianceChecks.map((check, index) => (
              <div
                key={index}
                className="bg-white/5 border border-white/10 rounded-lg p-4"
              >
                <div className="flex items-start space-x-3 mb-3">
                  {getStatusIcon(check.status)}
                  <div>
                    <h3 className="text-white font-medium">{check.name}</h3>
                    <p className="text-gray-300 text-sm mt-1">{check.description}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  {check.requirements.map((req, reqIndex) => (
                    <div key={reqIndex} className="flex items-center space-x-2 text-xs">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                      <span className="text-gray-400">{req}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center">
            <ClipboardDocumentCheckIcon className="h-8 w-8 text-cosmic-purple mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Store Readiness</h3>
            <p className="text-2xl font-bold text-green-400 mb-2">95%</p>
            <p className="text-gray-400 text-sm">Ready for submission</p>
            <CosmicButton variant="success" size="sm" className="w-full mt-4">
              Generate Report
            </CosmicButton>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center">
            <ShieldCheckIcon className="h-8 w-8 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Compliance Score</h3>
            <p className="text-2xl font-bold text-blue-400 mb-2">100%</p>
            <p className="text-gray-400 text-sm">GDPR & COPPA compliant</p>
            <CosmicButton variant="cosmic" size="sm" className="w-full mt-4">
              View Details
            </CosmicButton>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center">
            <GlobeAltIcon className="h-8 w-8 text-purple-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Localization</h3>
            <p className="text-2xl font-bold text-purple-400 mb-2">EN/AR</p>
            <p className="text-gray-400 text-sm">Full bilingual support</p>
            <CosmicButton variant="neon" size="sm" className="w-full mt-4">
              Test Languages
            </CosmicButton>
          </div>
        </motion.div>

        {/* Important Notes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-8 bg-cosmic-purple/10 border border-cosmic-purple/20 rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-cosmic-accent" />
            <span>Pre-Submission Reminders</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-cosmic-accent mb-2">iOS App Store</h4>
              <ul className="space-y-1 text-gray-300">
                <li>• Privacy manifest (PrivacyInfo.xcprivacy) included in build</li>
                <li>• App Store Connect privacy questions match manifest</li>
                <li>• 18+ age rating configured (new 2025 system)</li>
                <li>• TestFlight beta testing completed</li>
                <li>• Screenshots include Arabic RTL layouts</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-cosmic-accent mb-2">Google Play Store</h4>
              <ul className="space-y-1 text-gray-300">
                <li>• Data Safety declaration matches actual collection</li>
                <li>• Account deletion URL working and tested</li>
                <li>• Content rating set to Adults Only (18+)</li>
                <li>• Testing track progression: Internal → Closed → Production</li>
                <li>• Store listing includes privacy policy links</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminStoreReadinessPage;