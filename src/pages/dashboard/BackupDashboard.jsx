import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  ShieldCheckIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  LockClosedIcon,
  PlayIcon,
  DocumentTextIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';
import CosmicButton from '../../components/UI/CosmicButton';

const BackupDashboard = () => {
  const [backupStatus, setBackupStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchBackupStatus();
    const interval = setInterval(fetchBackupStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchBackupStatus = async () => {
    try {
      // Mock data - replace with actual API calls
      const mockData = {
        overview: {
          last_backup: '2025-01-13T02:00:00Z',
          next_backup: '2025-01-14T02:00:00Z',
          backup_status: 'healthy',
          total_backups: 847,
          total_size_gb: 1248.5,
          retention_days: 30,
          encryption_enabled: true
        },
        pitr: {
          wal_archiving_enabled: true,
          last_wal_archive: '2025-01-13T14:23:45Z',
          continuous_archiving: true,
          base_backup_frequency: 'daily',
          rpo_minutes: 5,
          rto_minutes: 15,
          wal_segments_archived_24h: 2847
        },
        policy_321: {
          compliance_percentage: 100,
          total_backup_sets: 45,
          compliant_sets: 45,
          storage_locations: [
            { type: 'Primary S3', region: 'eu-north-1', copies: 45 },
            { type: 'Archive S3', region: 'eu-west-1', copies: 45 },
            { type: 'Immutable Cold', region: 'us-east-1', copies: 45 }
          ],
          immutable_copies: 45,
          offline_copies: 45
        },
        encryption: {
          active_keys: 3,
          keys_requiring_rotation: 0,
          last_rotation: '2025-01-01T00:00:00Z',
          next_rotation: '2025-04-01T00:00:00Z',
          algorithm: 'AES-256-GCM',
          key_separation: true
        },
        gamedays: {
          last_drill: '2025-01-10T10:00:00Z',
          next_drill: '2025-01-17T10:00:00Z',
          success_rate: 95.5,
          avg_rpo_minutes: 4,
          avg_rto_minutes: 12,
          drills_completed_q1: 12
        },
        audit: {
          events_24h: 1247,
          compliance_violations: 0,
          chain_integrity: true,
          evidence_collected: 156,
          last_validation: '2025-01-13T12:00:00Z'
        }
      };
      
      setBackupStatus(mockData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch backup status:', error);
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatSize = (sizeGB) => {
    if (sizeGB >= 1024) {
      return `${(sizeGB / 1024).toFixed(1)} TB`;
    }
    return `${sizeGB.toFixed(1)} GB`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400"></div>
            <div className="absolute inset-0 rounded-full border-2 border-purple-400/20"></div>
          </div>
          <p className="text-gray-300 text-lg font-medium">Loading backup status...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'pitr', name: 'PITR', icon: ClockIcon },
    { id: '321-policy', name: '3-2-1 Policy', icon: DocumentDuplicateIcon },
    { id: 'encryption', name: 'Encryption', icon: LockClosedIcon },
    { id: 'gamedays', name: 'GameDays', icon: BeakerIcon },
    { id: 'audit', name: 'Audit', icon: DocumentTextIcon }
  ];

  const renderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Backup Health */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Backup Health</h3>
          <div className={`w-3 h-3 rounded-full ${
            backupStatus.overview.backup_status === 'healthy' ? 'bg-green-400' : 'bg-red-400'
          }`}></div>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-gray-400 text-sm">Last Backup</p>
            <p className="text-white font-medium">{formatDate(backupStatus.overview.last_backup)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Next Backup</p>
            <p className="text-white font-medium">{formatDate(backupStatus.overview.next_backup)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Status</p>
            <p className="text-green-400 font-medium capitalize">{backupStatus.overview.backup_status}</p>
          </div>
        </div>
      </div>

      {/* Storage Stats */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Storage</h3>
          <CloudArrowUpIcon className="h-6 w-6 text-blue-400" />
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-gray-400 text-sm">Total Backups</p>
            <p className="text-white font-medium text-2xl">{backupStatus.overview.total_backups.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Total Size</p>
            <p className="text-white font-medium">{formatSize(backupStatus.overview.total_size_gb)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Retention</p>
            <p className="text-white font-medium">{backupStatus.overview.retention_days} days</p>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Security</h3>
          <ShieldCheckIcon className="h-6 w-6 text-green-400" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">Encryption</p>
            <CheckCircleIcon className="h-5 w-5 text-green-400" />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">3-2-1 Policy</p>
            <CheckCircleIcon className="h-5 w-5 text-green-400" />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">Immutable Copies</p>
            <CheckCircleIcon className="h-5 w-5 text-green-400" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="md:col-span-2 lg:col-span-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CosmicButton variant="primary" size="sm" className="w-full">
            <PlayIcon className="h-4 w-4 mr-2" />
            Run Backup
          </CosmicButton>
          <CosmicButton variant="cosmic" size="sm" className="w-full">
            <BeakerIcon className="h-4 w-4 mr-2" />
            Test Restore
          </CosmicButton>
          <CosmicButton variant="outline" size="sm" className="w-full">
            <DocumentTextIcon className="h-4 w-4 mr-2" />
            View Logs
          </CosmicButton>
          <CosmicButton variant="glass" size="sm" className="w-full">
            <ShieldCheckIcon className="h-4 w-4 mr-2" />
            Validate Integrity
          </CosmicButton>
        </div>
      </div>
    </div>
  );

  const renderPITR = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* PITR Status */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Point-in-Time Recovery</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">WAL Archiving</span>
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
              <span className="text-green-400">Active</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Continuous Archiving</span>
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
              <span className="text-green-400">Enabled</span>
            </div>
          </div>
          <div>
            <span className="text-gray-400">Last WAL Archive</span>
            <p className="text-white font-medium">{formatDate(backupStatus.pitr.last_wal_archive)}</p>
          </div>
          <div>
            <span className="text-gray-400">WAL Segments (24h)</span>
            <p className="text-white font-medium">{backupStatus.pitr.wal_segments_archived_24h.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* RPO/RTO Targets */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recovery Objectives</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">RPO (Recovery Point Objective)</p>
              <p className="text-white font-medium">{backupStatus.pitr.rpo_minutes} minutes</p>
            </div>
            <div className="w-16 h-16 relative">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                      fill="none" stroke="#374151" strokeWidth="2"/>
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                      fill="none" stroke="#10b981" strokeWidth="2" 
                      strokeDasharray={`${(5/15)*100}, 100`}/>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs text-green-400 font-medium">5/15</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">RTO (Recovery Time Objective)</p>
              <p className="text-white font-medium">{backupStatus.pitr.rto_minutes} minutes</p>
            </div>
            <div className="w-16 h-16 relative">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                      fill="none" stroke="#374151" strokeWidth="2"/>
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                      fill="none" stroke="#3b82f6" strokeWidth="2" 
                      strokeDasharray={`${(15/30)*100}, 100`}/>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs text-blue-400 font-medium">15/30</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const render321Policy = () => (
    <div className="space-y-6">
      {/* Compliance Overview */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">3-2-1 Policy Compliance</h3>
          <div className="text-right">
            <p className="text-3xl font-bold text-green-400">{backupStatus.policy_321.compliance_percentage}%</p>
            <p className="text-gray-400 text-sm">Compliant</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">3</p>
            <p className="text-gray-400 text-sm">Copies of Data</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-400">2</p>
            <p className="text-gray-400 text-sm">Different Media</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">1</p>
            <p className="text-gray-400 text-sm">Offsite/Immutable</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Total Backup Sets</span>
            <span className="text-white font-medium">{backupStatus.policy_321.total_backup_sets}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Compliant Sets</span>
            <span className="text-green-400 font-medium">{backupStatus.policy_321.compliant_sets}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Immutable Copies</span>
            <span className="text-green-400 font-medium">{backupStatus.policy_321.immutable_copies}</span>
          </div>
        </div>
      </div>

      {/* Storage Distribution */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Storage Distribution</h3>
        <div className="space-y-4">
          {backupStatus.policy_321.storage_locations.map((location, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div>
                <p className="text-white font-medium">{location.type}</p>
                <p className="text-gray-400 text-sm">{location.region}</p>
              </div>
              <div className="text-right">
                <p className="text-white font-medium">{location.copies}</p>
                <p className="text-gray-400 text-sm">copies</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderEncryption = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Key Status */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Encryption Keys</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Active Keys</span>
            <span className="text-white font-medium">{backupStatus.encryption.active_keys}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Keys Requiring Rotation</span>
            <span className="text-green-400 font-medium">{backupStatus.encryption.keys_requiring_rotation}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Algorithm</span>
            <span className="text-white font-medium">{backupStatus.encryption.algorithm}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Key Separation</span>
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
              <span className="text-green-400">Enabled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rotation Schedule */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Key Rotation</h3>
        <div className="space-y-4">
          <div>
            <p className="text-gray-400 text-sm">Last Rotation</p>
            <p className="text-white font-medium">{formatDate(backupStatus.encryption.last_rotation)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Next Rotation</p>
            <p className="text-white font-medium">{formatDate(backupStatus.encryption.next_rotation)}</p>
          </div>
          <div className="mt-4">
            <CosmicButton variant="outline" size="sm" className="w-full">
              <LockClosedIcon className="h-4 w-4 mr-2" />
              Rotate Keys Now
            </CosmicButton>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGameDays = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Drill Status */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Restore Drills</h3>
        <div className="space-y-4">
          <div>
            <p className="text-gray-400 text-sm">Last Drill</p>
            <p className="text-white font-medium">{formatDate(backupStatus.gamedays.last_drill)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Next Drill</p>
            <p className="text-white font-medium">{formatDate(backupStatus.gamedays.next_drill)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Success Rate</p>
            <p className="text-green-400 font-medium">{backupStatus.gamedays.success_rate}%</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Drills Completed (Q1)</p>
            <p className="text-white font-medium">{backupStatus.gamedays.drills_completed_q1}</p>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Performance</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Average RPO</p>
              <p className="text-white font-medium">{backupStatus.gamedays.avg_rpo_minutes} minutes</p>
            </div>
            <div className="w-16 h-16 relative">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                      fill="none" stroke="#374151" strokeWidth="2"/>
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                      fill="none" stroke="#10b981" strokeWidth="2" 
                      strokeDasharray={`${(4/15)*100}, 100`}/>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs text-green-400 font-medium">4/15</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Average RTO</p>
              <p className="text-white font-medium">{backupStatus.gamedays.avg_rto_minutes} minutes</p>
            </div>
            <div className="w-16 h-16 relative">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                      fill="none" stroke="#374151" strokeWidth="2"/>
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                      fill="none" stroke="#3b82f6" strokeWidth="2" 
                      strokeDasharray={`${(12/30)*100}, 100`}/>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs text-blue-400 font-medium">12/30</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="lg:col-span-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">GameDay Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CosmicButton variant="cosmic" size="sm" className="w-full">
            <BeakerIcon className="h-4 w-4 mr-2" />
            Run GameDay
          </CosmicButton>
          <CosmicButton variant="outline" size="sm" className="w-full">
            <DocumentTextIcon className="h-4 w-4 mr-2" />
            View Reports
          </CosmicButton>
          <CosmicButton variant="glass" size="sm" className="w-full">
            <ClockIcon className="h-4 w-4 mr-2" />
            Schedule Drill
          </CosmicButton>
        </div>
      </div>
    </div>
  );

  const renderAudit = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Audit Overview */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Audit Status</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Events (24h)</span>
            <span className="text-white font-medium">{backupStatus.audit.events_24h.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Compliance Violations</span>
            <span className="text-green-400 font-medium">{backupStatus.audit.compliance_violations}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Chain Integrity</span>
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
              <span className="text-green-400">Verified</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Evidence Collected</span>
            <span className="text-white font-medium">{backupStatus.audit.evidence_collected}</span>
          </div>
        </div>
      </div>

      {/* Last Validation */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Chain Validation</h3>
        <div className="space-y-4">
          <div>
            <p className="text-gray-400 text-sm">Last Validation</p>
            <p className="text-white font-medium">{formatDate(backupStatus.audit.last_validation)}</p>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Status</span>
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
              <span className="text-green-400">Intact</span>
            </div>
          </div>
          <div className="mt-4">
            <CosmicButton variant="outline" size="sm" className="w-full">
              <ShieldCheckIcon className="h-4 w-4 mr-2" />
              Validate Now
            </CosmicButton>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'pitr':
        return renderPITR();
      case '321-policy':
        return render321Policy();
      case 'encryption':
        return renderEncryption();
      case 'gamedays':
        return renderGameDays();
      case 'audit':
        return renderAudit();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-4">
            Backup & Disaster Recovery
          </h1>
          <p className="text-gray-300 text-lg max-w-3xl mx-auto">
            Comprehensive backup monitoring with PITR, 3-2-1 policy compliance, 
            encryption management, and automated disaster recovery testing.
          </p>
        </motion.div>

        {/* Status Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 mb-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                <span className="text-white font-medium">System Healthy</span>
              </div>
              <div className="text-gray-400">|</div>
              <div className="text-gray-300">
                Last backup: {formatDate(backupStatus?.overview?.last_backup)}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ShieldCheckIcon className="h-5 w-5 text-green-400" />
              <span className="text-green-400 font-medium">100% Compliant</span>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <div className="border-b border-white/20">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? 'border-purple-400 text-purple-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {renderTabContent()}
        </motion.div>
      </div>
    </div>
  );
};

export default BackupDashboard;