import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import CosmicButton from '../../components/UI/CosmicButton';
import { 
  BookOpenIcon, 
  ExclamationTriangleIcon, 
  CogIcon, 
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  DocumentDuplicateIcon,
  ChartBarIcon,
  CloudArrowUpIcon,
  ShieldCheckIcon,
  BoltIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const runbooks = [
    {
      title: 'Deployment Runbook',
      description: 'Zero-downtime deployment procedures with health checks',
      file: 'DEPLOY.md',
      icon: CogIcon,
      variant: 'primary'
    },
    {
      title: 'Rollback Procedures',
      description: 'Emergency rollback with feature flags and circuit breakers',
      file: 'ROLLBACK.md',
      icon: ExclamationTriangleIcon,
      variant: 'danger'
    },
    {
      title: 'Incident Severity Guide',
      description: 'SEV-1/2/3 classification and response requirements',
      file: 'INCIDENT_SEVERITY.md',
      icon: DocumentTextIcon,
      variant: 'cosmic'
    },
    {
      title: 'Incident Response',
      description: 'End-to-end incident response with escalation paths',
      file: 'INCIDENT_RESPONSE.md',
      icon: ExclamationTriangleIcon,
      variant: 'neon'
    },
    {
      title: 'Triage Checklist',
      description: 'Symptom-based triage and quick health checks',
      file: 'TRIAGE_CHECKLIST.md',
      icon: ClipboardDocumentListIcon,
      variant: 'success'
    },
    {
      title: 'Communications Templates',
      description: 'Internal/external communications for all severity levels',
      file: 'COMMS_TEMPLATES.md',
      icon: ChatBubbleLeftRightIcon,
      variant: 'outline'
    },
    {
      title: 'Postmortem Template',
      description: 'Blameless postmortem structure and culture guidelines',
      file: 'POSTMORTEM_TEMPLATE.md',
      icon: DocumentDuplicateIcon,
      variant: 'glass'
    }
  ];

  const handleRunbookOpen = (filename) => {
    const runbookPath = `${window.location.origin}/RUNBOOKS/${filename}`;
    window.open(runbookPath, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-4xl font-bold text-white mb-4">
              Admin Dashboard
            </h1>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Access operational runbooks and incident response procedures. All runbooks follow SRE best practices with symptom-based alerting.
            </p>
          </motion.div>
        </div>

        {/* Runbooks Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {runbooks.map((runbook, index) => {
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
        </motion.div>

        {/* Observability Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12"
        >
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Observability & Monitoring
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Golden Signals Dashboard */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 group hover:bg-white/20 transition-all duration-300">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 mb-4 group-hover:scale-110 transition-transform duration-300">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
              
              <h3 className="text-xl font-semibold text-white mb-2">
                Golden Signals Dashboard
              </h3>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                Monitor Latency, Traffic, Errors, and Saturation across all services with SLO compliance tracking.
              </p>
              
              <CosmicButton
                variant="success"
                size="sm"
                className="w-full"
                onClick={() => navigate('/dashboard/observability')}
              >
                <ChartBarIcon className="h-4 w-4 mr-2" />
                Open Dashboard
              </CosmicButton>
            </div>

            {/* Backup & DR Dashboard */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 group hover:bg-white/20 transition-all duration-300">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 mb-4 group-hover:scale-110 transition-transform duration-300">
                <CloudArrowUpIcon className="h-6 w-6 text-white" />
              </div>
              
              <h3 className="text-xl font-semibold text-white mb-2">
                Backup & DR Dashboard
              </h3>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                PITR, 3-2-1 backup policy, encryption management, and automated disaster recovery testing.
              </p>
              
              <CosmicButton
                variant="cosmic"
                size="sm"
                className="w-full"
                onClick={() => navigate('/dashboard/backup')}
              >
                <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                Open Dashboard
              </CosmicButton>
            </div>

            {/* E2E & Synthetics Dashboard */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 group hover:bg-white/20 transition-all duration-300">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 mb-4 group-hover:scale-110 transition-transform duration-300">
                <ShieldCheckIcon className="h-6 w-6 text-white" />
              </div>
              
              <h3 className="text-xl font-semibold text-white mb-2">
                E2E & Synthetics
              </h3>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                Black-box testing, synthetic monitors, rate-limit conformance, and burn-rate alerting.
              </p>
              
              <CosmicButton
                variant="neon"
                size="sm"
                className="w-full"
                onClick={() => navigate('/dashboard/e2e-synthetics')}
              >
                <ShieldCheckIcon className="h-4 w-4 mr-2" />
                Open Dashboard
              </CosmicButton>
            </div>

            {/* M36 Performance Dashboard */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 group hover:bg-white/20 transition-all duration-300">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-r from-yellow-600 to-orange-600 mb-4 group-hover:scale-110 transition-transform duration-300">
                <BoltIcon className="h-6 w-6 text-white" />
              </div>
              
              <h3 className="text-xl font-semibold text-white mb-2">
                Performance (M36)
              </h3>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                Core Web Vitals monitoring, Lighthouse CI, and performance budgets with p75 targets.
              </p>
              
              <CosmicButton
                variant="warning"
                size="sm"
                className="w-full"
                onClick={() => navigate('/dashboard/performance')}
              >
                <BoltIcon className="h-4 w-4 mr-2" />
                Open Dashboard
              </CosmicButton>
            </div>
          </div>
        </motion.div>
        
        {/* M38 Legal & Compliance Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-12"
        >
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Legal Compliance & Data Rights (M38)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {/* DSR Management */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 group hover:bg-white/20 transition-all duration-300">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 mb-4 group-hover:scale-110 transition-transform duration-300">
                <DocumentTextIcon className="h-6 w-6 text-white" />
              </div>
              
              <h3 className="text-xl font-semibold text-white mb-2">
                DSR Requests
              </h3>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                GDPR Article 15/17 compliance - Data export and deletion requests with immutable audit trails.
              </p>
              
              <CosmicButton
                variant="cosmic"
                size="sm"
                className="w-full"
                onClick={() => navigate('/admin/dsr-requests')}
              >
                <DocumentTextIcon className="h-4 w-4 mr-2" />
                Manage DSR
              </CosmicButton>
            </div>

            {/* Age Verification */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 group hover:bg-white/20 transition-all duration-300">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 mb-4 group-hover:scale-110 transition-transform duration-300">
                <ShieldCheckIcon className="h-6 w-6 text-white" />
              </div>
              
              <h3 className="text-xl font-semibold text-white mb-2">
                Age Verification
              </h3>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                18+ enforcement with COPPA protection. Monitor age verification and handle under-13 incidents.
              </p>
              
              <CosmicButton
                variant="danger"
                size="sm"
                className="w-full"
                onClick={() => navigate('/admin/age-verification')}
              >
                <ShieldCheckIcon className="h-4 w-4 mr-2" />
                Age Compliance
              </CosmicButton>
            </div>

            {/* Audit Trails */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 group hover:bg-white/20 transition-all duration-300">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 mb-4 group-hover:scale-110 transition-transform duration-300">
                <ClipboardDocumentListIcon className="h-6 w-6 text-white" />
              </div>
              
              <h3 className="text-xl font-semibold text-white mb-2">
                Audit Trails
              </h3>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                Immutable hash-chained audit logs for DSR requests. Tamper detection and integrity verification.
              </p>
              
              <CosmicButton
                variant="neon"
                size="sm"
                className="w-full"
                onClick={() => navigate('/admin/audit-trails')}
              >
                <ClipboardDocumentListIcon className="h-4 w-4 mr-2" />
                View Audits
              </CosmicButton>
            </div>

            {/* Store Readiness */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 group hover:bg-white/20 transition-all duration-300">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-r from-green-600 to-teal-600 mb-4 group-hover:scale-110 transition-transform duration-300">
                <BuildingStorefrontIcon className="h-6 w-6 text-white" />
              </div>
              
              <h3 className="text-xl font-semibold text-white mb-2">
                Store Readiness
              </h3>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                Mobile app packaging, store submissions, privacy manifests, and compliance validation.
              </p>
              
              <CosmicButton
                variant="success"
                size="sm"
                className="w-full"
                onClick={() => navigate('/admin/store-readiness')}
              >
                <BuildingStorefrontIcon className="h-4 w-4 mr-2" />
                View Status
              </CosmicButton>
            </div>
          </div>
        </motion.div>

        {/* Testing & Quality Assurance Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12"
        >
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Testing & Quality Assurance
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* M34 Features */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">M34 Backup & DR Features</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  PostgreSQL PITR with continuous WAL archiving
                </div>
                <div className="flex items-center text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  3-2-1 backup policy with immutable copies
                </div>
                <div className="flex items-center text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  Encryption with key rotation
                </div>
                <div className="flex items-center text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  Quarterly GameDay drills
                </div>
                <div className="flex items-center text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  Immutable audit trails
                </div>
              </div>
            </div>
            
            {/* M35 Features */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">M35 E2E & Synthetics Features</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-purple-400">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                  Critical E2E journeys (Auth, Booking, Emergency)
                </div>
                <div className="flex items-center text-purple-400">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                  24/7 synthetic monitoring with health endpoints
                </div>
                <div className="flex items-center text-purple-400">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                  Rate-limit conformance (HTTP 429 + Retry-After)
                </div>
                <div className="flex items-center text-purple-400">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                  Burn-rate alerting with noise control
                </div>
                <div className="flex items-center text-purple-400">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                  Security content-lint gate (malware prevention)
                </div>
                <div className="flex items-center text-purple-400">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                  PITR confidence checks with backup validation
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold text-white mb-2">On-Call Status</h3>
            <p className="text-green-400 text-2xl font-bold">Active</p>
            <p className="text-gray-400 text-sm">24/7 escalation configured</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold text-white mb-2">Runbooks</h3>
            <p className="text-blue-400 text-2xl font-bold">{runbooks.length}</p>
            <p className="text-gray-400 text-sm">Production-ready procedures</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold text-white mb-2">SRE Compliance</h3>
            <p className="text-purple-400 text-2xl font-bold">100%</p>
            <p className="text-gray-400 text-sm">Google SRE best practices</p>
          </div>
        </motion.div>

        {/* Footer Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-8 text-center"
        >
          <p className="text-gray-400 text-sm">
            🚨 For emergencies, use the{' '}
            <span className="text-red-400 font-semibold">Emergency Call</span>{' '}
            feature to override quiet hours and escalate immediately.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;