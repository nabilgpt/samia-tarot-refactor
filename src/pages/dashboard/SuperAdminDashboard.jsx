import React from 'react';
import { motion } from 'framer-motion';
import CosmicButton from '../../components/UI/CosmicButton';
import { 
  BookOpenIcon, 
  ExclamationTriangleIcon, 
  CogIcon, 
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  DocumentDuplicateIcon,
  ShieldCheckIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

const SuperAdminDashboard = () => {
  const allRunbooks = [
    {
      title: 'Deployment Runbook',
      description: 'Zero-downtime deployment procedures with health checks',
      file: 'DEPLOY.md',
      icon: CogIcon,
      variant: 'primary',
      category: 'Operations'
    },
    {
      title: 'Emergency Rollback',
      description: 'Critical rollback procedures with circuit breakers',
      file: 'ROLLBACK.md',
      icon: ExclamationTriangleIcon,
      variant: 'danger',
      category: 'Emergency'
    },
    {
      title: 'Incident Severity Guide',
      description: 'SEV-1/2/3 classification and response requirements',
      file: 'INCIDENT_SEVERITY.md',
      icon: DocumentTextIcon,
      variant: 'cosmic',
      category: 'Incident Management'
    },
    {
      title: 'Incident Response',
      description: 'End-to-end incident response with escalation paths',
      file: 'INCIDENT_RESPONSE.md',
      icon: BoltIcon,
      variant: 'neon',
      category: 'Incident Management'
    },
    {
      title: 'Triage Checklist',
      description: 'Symptom-based triage and quick health checks',
      file: 'TRIAGE_CHECKLIST.md',
      icon: ClipboardDocumentListIcon,
      variant: 'success',
      category: 'Monitoring'
    },
    {
      title: 'Communications Templates',
      description: 'Internal/external communications for all severity levels',
      file: 'COMMS_TEMPLATES.md',
      icon: ChatBubbleLeftRightIcon,
      variant: 'outline',
      category: 'Communications'
    },
    {
      title: 'Postmortem Template',
      description: 'Blameless postmortem structure and culture guidelines',
      file: 'POSTMORTEM_TEMPLATE.md',
      icon: DocumentDuplicateIcon,
      variant: 'glass',
      category: 'Learning'
    }
  ];

  const handleRunbookOpen = (filename) => {
    const runbookPath = `${window.location.origin}/RUNBOOKS/${filename}`;
    window.open(runbookPath, '_blank', 'noopener,noreferrer');
  };

  const categories = [...new Set(allRunbooks.map(r => r.category))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="flex items-center justify-center mb-4">
              <ShieldCheckIcon className="h-8 w-8 text-purple-400 mr-3" />
              <h1 className="text-4xl font-bold text-white">
                Super Admin Dashboard
              </h1>
            </div>
            <p className="text-gray-300 text-lg max-w-3xl mx-auto">
              Complete access to all operational runbooks and incident response procedures. 
              Super Admin has authority over all escalation paths and emergency procedures.
            </p>
          </motion.div>
        </div>

        {/* Emergency Alert */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8 bg-red-500/10 border border-red-500/20 rounded-xl p-4"
        >
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-3" />
            <p className="text-red-300 text-sm">
              <strong>Super Admin Authority:</strong> You have final escalation authority. Use Emergency Call feature to override all quiet hours and policies during critical incidents.
            </p>
          </div>
        </motion.div>

        {/* Runbooks by Category */}
        {categories.map((category, categoryIndex) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 + categoryIndex * 0.1 }}
            className="mb-12"
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-blue-500 rounded-full mr-4"></div>
              {category}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allRunbooks
                .filter(runbook => runbook.category === category)
                .map((runbook, index) => {
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
                        {/* Category Badge */}
                        <div className="absolute top-3 right-3">
                          <span className="px-2 py-1 text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg">
                            {category.split(' ')[0].toUpperCase()}
                          </span>
                        </div>
                        
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
                            <BookOpenIcon className="h-4 w-4 mr-2" />
                            Open Runbook
                          </CosmicButton>
                        </div>
                      </div>

                      {/* Glow effect */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600/20 to-blue-600/20 blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300 -z-10" />
                    </motion.div>
                  );
                })}
            </div>
          </motion.div>
        ))}

        {/* System Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12"
        >
          <h2 className="text-2xl font-bold text-white mb-6 text-center">System Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center">
              <h3 className="text-lg font-semibold text-green-400 mb-2">On-Call Escalation</h3>
              <p className="text-green-300 text-2xl font-bold">Active</p>
              <p className="text-gray-400 text-sm">Monitor → Admin → Super Admin</p>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 text-center">
              <h3 className="text-lg font-semibold text-blue-400 mb-2">Runbooks</h3>
              <p className="text-blue-300 text-2xl font-bold">{allRunbooks.length}</p>
              <p className="text-gray-400 text-sm">Production procedures</p>
            </div>
            
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-6 text-center">
              <h3 className="text-lg font-semibold text-purple-400 mb-2">SRE Compliance</h3>
              <p className="text-purple-300 text-2xl font-bold">100%</p>
              <p className="text-gray-400 text-sm">Google SRE standards</p>
            </div>
            
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 text-center">
              <h3 className="text-lg font-semibold text-yellow-400 mb-2">Emergency Authority</h3>
              <p className="text-yellow-300 text-2xl font-bold">Full</p>
              <p className="text-gray-400 text-sm">Override all policies</p>
            </div>
          </div>
        </motion.div>

        {/* Emergency Procedures */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-8 bg-red-500/10 border border-red-500/20 rounded-xl p-6"
        >
          <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center">
            <BoltIcon className="h-6 w-6 mr-2" />
            Emergency Procedures
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-red-300 font-semibold mb-2">SEV-1 Response:</p>
              <ul className="text-gray-300 space-y-1">
                <li>• Execute emergency rollback immediately</li>
                <li>• Activate full incident bridge</li>
                <li>• Override all quiet hours</li>
                <li>• Notify all stakeholders</li>
              </ul>
            </div>
            <div>
              <p className="text-yellow-300 font-semibold mb-2">Escalation Override:</p>
              <ul className="text-gray-300 space-y-1">
                <li>• Use Emergency Call feature</li>
                <li>• Bypass escalation timers</li>
                <li>• Direct team activation</li>
                <li>• External vendor coordination</li>
              </ul>
            </div>
            <div>
              <p className="text-blue-300 font-semibold mb-2">Authority Matrix:</p>
              <ul className="text-gray-300 space-y-1">
                <li>• Database rollback: Authorized</li>
                <li>• Feature flag override: Authorized</li>
                <li>• External communications: Authorized</li>
                <li>• Vendor escalation: Authorized</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;