/**
 * SAMIA TAROT - RTO/RPO Monitoring Utility
 * 
 * Tracks Recovery Time Objective (RTO) and Recovery Point Objective (RPO)
 * for disaster recovery compliance monitoring
 */

import * as Sentry from '@sentry/browser';

// RTO/RPO Configuration (in milliseconds)
const RECOVERY_OBJECTIVES = {
  RTO_TARGET: 4 * 60 * 60 * 1000,      // 4 hours
  RPO_TARGET: 15 * 60 * 1000,          // 15 minutes
  WARNING_THRESHOLD: 0.8,              // 80% of target (warning level)
  CRITICAL_THRESHOLD: 1.0              // 100% of target (critical level)
};

// Recovery Metrics Storage
class RecoveryMetrics {
  constructor() {
    this.incidentStart = null;
    this.lastBackup = null;
    this.recoveryInProgress = false;
    this.metrics = [];
  }

  /**
   * Mark the start of an incident
   */
  startIncident(incidentType, description) {
    this.incidentStart = Date.now();
    this.recoveryInProgress = true;
    
    const incident = {
      id: this.generateIncidentId(),
      type: incidentType,
      description,
      startTime: this.incidentStart,
      endTime: null,
      rto: null,
      rpo: null,
      status: 'in-progress'
    };

    console.log(`🚨 INCIDENT STARTED: ${incidentType}`, incident);
    
    // Send to monitoring
    this.sendToMonitoring('incident_started', incident);
    
    // Store incident
    this.storeIncident(incident);
    
    return incident.id;
  }

  /**
   * Mark the end of an incident and calculate RTO
   */
  endIncident(incidentId, status = 'resolved') {
    if (!this.incidentStart || !this.recoveryInProgress) {
      console.warn('No active incident to end');
      return null;
    }

    const endTime = Date.now();
    const rto = endTime - this.incidentStart;
    const rpo = this.calculateRPO();

    const incident = {
      id: incidentId,
      endTime,
      rto,
      rpo,
      status,
      rtoCompliance: this.checkRTOCompliance(rto),
      rpoCompliance: this.checkRPOCompliance(rpo)
    };

    console.log(`✅ INCIDENT RESOLVED: RTO=${this.formatDuration(rto)}, RPO=${this.formatDuration(rpo)}`, incident);

    // Update stored incident
    this.updateIncident(incidentId, incident);

    // Send metrics to monitoring
    this.sendToMonitoring('incident_resolved', incident);

    // Check compliance
    this.checkCompliance(incident);

    // Reset state
    this.incidentStart = null;
    this.recoveryInProgress = false;

    return incident;
  }

  /**
   * Update the last backup timestamp (for RPO calculation)
   */
  updateLastBackup(timestamp = Date.now()) {
    this.lastBackup = timestamp;
    localStorage.setItem('samia_last_backup', timestamp.toString());
    console.log(`💾 Backup timestamp updated: ${new Date(timestamp).toISOString()}`);
  }

  /**
   * Calculate Recovery Point Objective (data loss)
   */
  calculateRPO() {
    if (!this.lastBackup) {
      // Try to get from localStorage
      const storedBackup = localStorage.getItem('samia_last_backup');
      this.lastBackup = storedBackup ? parseInt(storedBackup) : Date.now();
    }

    if (!this.incidentStart) {
      return 0;
    }

    // RPO is the time between the last backup and the incident
    return Math.max(0, this.incidentStart - this.lastBackup);
  }

  /**
   * Check RTO compliance
   */
  checkRTOCompliance(rto) {
    const ratio = rto / RECOVERY_OBJECTIVES.RTO_TARGET;
    
    if (ratio <= RECOVERY_OBJECTIVES.WARNING_THRESHOLD) {
      return { status: 'excellent', ratio, message: 'Well within RTO target' };
    } else if (ratio <= RECOVERY_OBJECTIVES.CRITICAL_THRESHOLD) {
      return { status: 'warning', ratio, message: 'Approaching RTO limit' };
    } else {
      return { status: 'violation', ratio, message: 'RTO target exceeded' };
    }
  }

  /**
   * Check RPO compliance
   */
  checkRPOCompliance(rpo) {
    const ratio = rpo / RECOVERY_OBJECTIVES.RPO_TARGET;
    
    if (ratio <= RECOVERY_OBJECTIVES.WARNING_THRESHOLD) {
      return { status: 'excellent', ratio, message: 'Well within RPO target' };
    } else if (ratio <= RECOVERY_OBJECTIVES.CRITICAL_THRESHOLD) {
      return { status: 'warning', ratio, message: 'Approaching RPO limit' };
    } else {
      return { status: 'violation', ratio, message: 'RPO target exceeded' };
    }
  }

  /**
   * Overall compliance check
   */
  checkCompliance(incident) {
    const alerts = [];

    // RTO Compliance
    if (incident.rtoCompliance.status === 'violation') {
      alerts.push({
        type: 'RTO_VIOLATION',
        severity: 'critical',
        message: `RTO exceeded: ${this.formatDuration(incident.rto)} (target: ${this.formatDuration(RECOVERY_OBJECTIVES.RTO_TARGET)})`,
        incident: incident.id
      });
    } else if (incident.rtoCompliance.status === 'warning') {
      alerts.push({
        type: 'RTO_WARNING',
        severity: 'warning',
        message: `RTO approaching limit: ${this.formatDuration(incident.rto)} (${Math.round(incident.rtoCompliance.ratio * 100)}% of target)`,
        incident: incident.id
      });
    }

    // RPO Compliance
    if (incident.rpoCompliance.status === 'violation') {
      alerts.push({
        type: 'RPO_VIOLATION',
        severity: 'critical',
        message: `RPO exceeded: ${this.formatDuration(incident.rpo)} (target: ${this.formatDuration(RECOVERY_OBJECTIVES.RPO_TARGET)})`,
        incident: incident.id
      });
    } else if (incident.rpoCompliance.status === 'warning') {
      alerts.push({
        type: 'RPO_WARNING',
        severity: 'warning',
        message: `RPO approaching limit: ${this.formatDuration(incident.rpo)} (${Math.round(incident.rpoCompliance.ratio * 100)}% of target)`,
        incident: incident.id
      });
    }

    // Send alerts
    alerts.forEach(alert => this.sendAlert(alert));

    return alerts;
  }

  /**
   * Get current recovery status
   */
  getCurrentStatus() {
    return {
      recoveryInProgress: this.recoveryInProgress,
      incidentStart: this.incidentStart,
      lastBackup: this.lastBackup,
      currentRTO: this.incidentStart ? Date.now() - this.incidentStart : null,
      currentRPO: this.calculateRPO(),
      targets: RECOVERY_OBJECTIVES
    };
  }

  /**
   * Get historical metrics
   */
  getHistoricalMetrics() {
    const stored = localStorage.getItem('samia_recovery_metrics');
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Store incident data
   */
  storeIncident(incident) {
    const metrics = this.getHistoricalMetrics();
    metrics.push(incident);
    
    // Keep only last 100 incidents
    if (metrics.length > 100) {
      metrics.splice(0, metrics.length - 100);
    }
    
    localStorage.setItem('samia_recovery_metrics', JSON.stringify(metrics));
  }

  /**
   * Update stored incident
   */
  updateIncident(incidentId, updates) {
    const metrics = this.getHistoricalMetrics();
    const index = metrics.findIndex(m => m.id === incidentId);
    
    if (index !== -1) {
      metrics[index] = { ...metrics[index], ...updates };
      localStorage.setItem('samia_recovery_metrics', JSON.stringify(metrics));
    }
  }

  /**
   * Send metrics to monitoring system
   */
  sendToMonitoring(eventType, data) {
    // Send to Sentry
    Sentry.addBreadcrumb({
      category: 'disaster-recovery',
      message: `Recovery event: ${eventType}`,
      data,
      level: 'info'
    });

    // Send custom event
    if (window.gtag) {
      window.gtag('event', eventType, {
        event_category: 'disaster_recovery',
        event_label: data.type || 'unknown',
        value: data.rto || 0
      });
    }

    // Send to external monitoring (if webhook configured)
    this.sendWebhook(eventType, data);
  }

  /**
   * Send alert notifications
   */
  sendAlert(alert) {
    console.error(`🚨 RECOVERY ALERT: ${alert.type}`, alert);

    // Send to Sentry as error
    Sentry.captureMessage(`Recovery Alert: ${alert.message}`, {
      level: alert.severity,
      tags: {
        type: alert.type,
        incident: alert.incident
      }
    });

    // Send webhook notification
    this.sendWebhook('recovery_alert', alert);
  }

  /**
   * Send webhook notification
   */
  async sendWebhook(eventType, data) {
    const webhookUrl = import.meta.env.VITE_DR_WEBHOOK_URL;
    
    if (!webhookUrl) {
      return;
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_type: eventType,
          timestamp: new Date().toISOString(),
          data,
          source: 'samia-tarot-dr-monitor'
        })
      });
    } catch (error) {
      console.error('Failed to send webhook:', error);
    }
  }

  /**
   * Generate unique incident ID
   */
  generateIncidentId() {
    return `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format duration in human-readable format
   */
  formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

// Singleton instance
const recoveryMonitor = new RecoveryMetrics();

// Auto-update backup timestamp on successful operations
window.addEventListener('beforeunload', () => {
  recoveryMonitor.updateLastBackup();
});

// Monitor for critical errors that might indicate incidents
window.addEventListener('error', (event) => {
  // Check if this is a critical error that might warrant incident tracking
  if (event.error && (
    event.error.message.includes('Network Error') ||
    event.error.message.includes('Failed to fetch') ||
    event.error.message.includes('Connection refused')
  )) {
    console.warn('Potential incident detected from error:', event.error.message);
  }
});

// Export functions for manual incident tracking
export const RTORPOMonitor = {
  /**
   * Start tracking an incident
   */
  startIncident: (type, description) => {
    return recoveryMonitor.startIncident(type, description);
  },

  /**
   * End tracking an incident
   */
  endIncident: (incidentId, status = 'resolved') => {
    return recoveryMonitor.endIncident(incidentId, status);
  },

  /**
   * Update backup timestamp
   */
  updateBackup: (timestamp) => {
    recoveryMonitor.updateLastBackup(timestamp);
  },

  /**
   * Get current recovery status
   */
  getStatus: () => {
    return recoveryMonitor.getCurrentStatus();
  },

  /**
   * Get historical metrics
   */
  getMetrics: () => {
    return recoveryMonitor.getHistoricalMetrics();
  },

  /**
   * Get recovery objectives
   */
  getObjectives: () => {
    return RECOVERY_OBJECTIVES;
  },

  /**
   * Force compliance check
   */
  checkCompliance: () => {
    const status = recoveryMonitor.getCurrentStatus();
    if (status.recoveryInProgress) {
      const mockIncident = {
        rto: status.currentRTO,
        rpo: status.currentRPO,
        rtoCompliance: recoveryMonitor.checkRTOCompliance(status.currentRTO),
        rpoCompliance: recoveryMonitor.checkRPOCompliance(status.currentRPO)
      };
      return recoveryMonitor.checkCompliance(mockIncident);
    }
    return [];
  }
};

export default RTORPOMonitor; 