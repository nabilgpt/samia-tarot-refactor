import React from 'react';
import { motion } from 'framer-motion';
import CosmicButton from '../../components/UI/CosmicButton';
import { 
  EyeIcon, 
  ExclamationTriangleIcon, 
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

const MonitorDashboard = () => {
  const monitoringRunbooks = [
    {
      title: 'Triage Checklist',
      description: 'Quick customer symptom assessment and severity assignment',
      file: 'TRIAGE_CHECKLIST.md',
      icon: ClipboardDocumentListIcon,
      variant: 'success',
      priority: 'high'
    },
    {
      title: 'Incident Severity Guide',
      description: 'SEV-1/2/3 classification based on customer impact',
      file: 'INCIDENT_SEVERITY.md',
      icon: ExclamationTriangleIcon,
      variant: 'cosmic',
      priority: 'high'
    },
    {
      title: 'Communications Templates',
      description: 'Internal notifications and escalation messages',
      file: 'COMMS_TEMPLATES.md',
      icon: ChatBubbleLeftRightIcon,
      variant: 'outline',
      priority: 'medium'
    }
  ];

  const handleRunbookOpen = (filename) => {
    const runbookPath = `${window.location.origin}/RUNBOOKS/${filename}`;
    window.open(runbookPath, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-4xl font-bold text-white mb-4">
              Monitor Dashboard
            </h1>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Monitor role has access to triage procedures and severity classification. Focus on symptom-based detection and proper escalation.
            </p>
          </motion.div>
        </div>

        {/* Alert */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4"
        >
          <div className="flex items-center">
            <EyeIcon className="h-5 w-5 text-blue-400 mr-3" />
            <p className="text-blue-300 text-sm">
              <strong>Monitor Role:</strong> You can triage incidents and escalate to Admin/Super Admin. For SEV-1 incidents, escalate immediately.
            </p>
          </div>
        </motion.div>

        {/* Runbooks Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {monitoringRunbooks.map((runbook, index) => {
            const IconComponent = runbook.icon;
            return (
              <motion.div
                key={runbook.file}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
                className="group relative"
              >
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-all duration-300 h-full">
                  {/* Priority Badge */}
                  {runbook.priority === 'high' && (
                    <div className="absolute top-3 right-3">
                      <span className="px-2 py-1 text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg">
                        HIGH
                      </span>
                    </div>
                  )}
                  
                  {/* Icon */}
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 mb-4 group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {runbook.title}
                  </h3>
                  <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                    {runbook.description}
                  </p>

                  {/* Open Button */}
                  <div className="mt-auto">
                    <CosmicButton
                      variant={runbook.variant}
                      size="sm"
                      className="w-full"
                      onClick={() => handleRunbookOpen(runbook.file)}
                    >
                      <EyeIcon className="h-4 w-4 mr-2" />
                      Open Guide
                    </CosmicButton>
                  </div>
                </div>

                {/* Glow effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600/20 to-blue-600/20 blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300 -z-10" />
              </motion.div>
            );
          })}
        </motion.div>

        {/* Quick Reference */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12"
        >
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Quick Reference</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-red-400 mb-2">SEV-1 Response</h3>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Escalate immediately to Admin</li>
                <li>• Customer core features broken</li>
                <li>• All users affected</li>
                <li>• Emergency response required</li>
              </ul>
            </div>
            
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-yellow-400 mb-2">SEV-2 Response</h3>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Escalate to Admin</li>
                <li>• Significant degradation</li>
                <li>• Many users affected</li>
                <li>• Requires urgent attention</li>
              </ul>
            </div>
            
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-green-400 mb-2">SEV-3 Response</h3>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Handle during business hours</li>
                <li>• Minor issues</li>
                <li>• Few users affected</li>
                <li>• Document and assign</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MonitorDashboard;