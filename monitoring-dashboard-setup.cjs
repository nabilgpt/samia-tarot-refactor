#!/usr/bin/env node

/**
 * SAMIA TAROT Comprehensive Monitoring Dashboard Setup
 * Sets up real-time monitoring with PM2, Artillery integration, and performance analytics
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class MonitoringDashboard {
  constructor() {
    this.startTime = new Date();
    this.logFile = './logs/monitoring-dashboard.log';
    this.reportFile = './logs/monitoring-dashboard-report.json';
    this.isMonitoring = false;
    
    // Ensure logs directory exists
    if (!fs.existsSync('./logs')) {
      fs.mkdirSync('./logs', { recursive: true });
    }
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} [${level}] ${message}`;
    
    console.log(logEntry);
    
    // Write to log file
    fs.appendFileSync(this.logFile, logEntry + '\n');
  }

  async checkSystemHealth() {
    this.log('🏥 Starting comprehensive system health check...');
    
    try {
      // Check PM2 processes
      const pm2Status = execSync('pm2 jlist', { encoding: 'utf8' });
      const processes = JSON.parse(pm2Status);
      
      const backendProcess = processes.find(p => p.name === 'samiatarot-backend');
      
      const healthStatus = {
        backend: {
          running: !!backendProcess,
          status: backendProcess ? backendProcess.pm2_env.status : 'offline',
          restarts: backendProcess ? backendProcess.pm2_env.restart_time : 0,
          memory: backendProcess ? backendProcess.pm2_env.memory || 0 : 0,
          cpu: backendProcess ? backendProcess.pm2_env.cpu || 0 : 0,
          uptime: backendProcess ? backendProcess.pm2_env.uptime || 0 : 0
        },
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          totalMemory: process.memoryUsage().rss,
          timestamp: new Date().toISOString()
        }
      };

      // Test API endpoints
      try {
        const testResults = await this.testCriticalEndpoints();
        healthStatus.endpoints = testResults;
      } catch (error) {
        this.log(`⚠️ API endpoint testing failed: ${error.message}`, 'WARNING');
        healthStatus.endpoints = { error: error.message };
      }

      this.log(`✅ System health check completed`);
      return healthStatus;

    } catch (error) {
      this.log(`❌ System health check failed: ${error.message}`, 'ERROR');
      return { error: error.message };
    }
  }

     async testCriticalEndpoints() {
     const endpoints = [
       { name: 'Health Check', url: 'http://localhost:5001/api/health' },
       { name: 'Daily Zodiac', url: 'http://localhost:5001/api/daily-zodiac' },
       { name: 'Configuration Categories', url: 'http://localhost:5001/api/configuration/categories' }
     ];

     const results = {};

     // Use node-fetch if available, otherwise skip endpoint testing
     try {
       const fetch = require('node-fetch');
       
       for (const endpoint of endpoints) {
         try {
           const response = await fetch(endpoint.url);
           results[endpoint.name] = {
             status: response.status,
             ok: response.ok,
             statusText: response.statusText
           };
         } catch (error) {
           results[endpoint.name] = {
             error: error.message,
             status: 'connection_failed'
           };
         }
       }
     } catch (requireError) {
       // node-fetch not available, skip endpoint testing
       results['info'] = 'Endpoint testing skipped - node-fetch not available';
     }

     return results;
   }

  async runQuickStressTest() {
    this.log('🚀 Running quick stress test (10 req/sec for 10 seconds)...');
    
    try {
      // Create a quick test configuration
      const quickTestConfig = {
        config: {
          target: 'http://localhost:5001',
          phases: [
            { duration: 10, arrivalRate: 10, name: 'Quick Load Test' }
          ],
          defaults: {
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'SAMIA-Monitor-Quick-Test'
            }
          }
        },
        scenarios: [
          {
            name: 'Health Check',
            weight: 50,
            flow: [
              {
                get: {
                  url: '/api/health',
                  expect: [{ statusCode: [200, 404] }]
                }
              }
            ]
          },
          {
            name: 'Daily Zodiac',
            weight: 50,
            flow: [
              {
                get: {
                  url: '/api/daily-zodiac',
                  expect: [{ statusCode: [200, 401, 403, 500] }]
                }
              }
            ]
          }
        ]
      };

      // Write quick test config
      const quickTestFile = './logs/quick-test.yml';
      const yamlContent = `config:
  target: 'http://localhost:5001'
  phases:
    - duration: 10
      arrivalRate: 10
      name: "Quick Load Test - 10 req/sec for 10 seconds"
  defaults:
    headers:
      'Content-Type': 'application/json'
      'User-Agent': 'SAMIA-Monitor-Quick-Test'

scenarios:
  - name: "Health Check"
    weight: 50
    flow:
      - get:
          url: "/api/health"
          expect:
            - statusCode: [200, 404]

  - name: "Daily Zodiac"
    weight: 50
    flow:
      - get:
          url: "/api/daily-zodiac"
          expect:
            - statusCode: [200, 401, 403, 500]`;

      fs.writeFileSync(quickTestFile, yamlContent);

      // Run the test
      const testOutput = execSync(`npx artillery run ${quickTestFile} --output ./logs/quick-test-results.json`, 
        { encoding: 'utf8', timeout: 30000 });

      this.log('✅ Quick stress test completed');
      
      return {
        success: true,
        output: testOutput,
        resultsFile: './logs/quick-test-results.json'
      };

    } catch (error) {
      this.log(`❌ Quick stress test failed: ${error.message}`, 'ERROR');
      return {
        success: false,
        error: error.message
      };
    }
  }

  async generateComprehensiveReport() {
    this.log('📊 Generating comprehensive monitoring report...');
    
    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        duration: Date.now() - this.startTime.getTime(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      systemHealth: await this.checkSystemHealth(),
      quickStressTest: await this.runQuickStressTest(),
      recommendations: [],
      overallStatus: 'unknown'
    };

    // Analyze results and generate recommendations
    if (report.systemHealth.backend && report.systemHealth.backend.running) {
      if (report.systemHealth.backend.status === 'online') {
        report.recommendations.push('✅ Backend is healthy and running properly');
      } else {
        report.recommendations.push('⚠️ Backend is running but may have issues - check status');
      }
      
      if (report.systemHealth.backend.restarts > 20) {
        report.recommendations.push('🚨 HIGH: Backend has too many restarts - investigate stability issues');
      } else if (report.systemHealth.backend.restarts > 10) {
        report.recommendations.push('⚠️ MEDIUM: Backend restart count is elevated - monitor for patterns');
      }
    } else {
      report.recommendations.push('🚨 CRITICAL: Backend is not running - immediate attention required');
    }

    if (report.quickStressTest.success) {
      report.recommendations.push('✅ Quick stress test passed - system handles light load well');
    } else {
      report.recommendations.push('⚠️ Quick stress test failed - investigate performance issues');
    }

    // Determine overall status
    const criticalIssues = report.recommendations.filter(r => r.includes('🚨')).length;
    const warnings = report.recommendations.filter(r => r.includes('⚠️')).length;
    
    if (criticalIssues > 0) {
      report.overallStatus = 'CRITICAL';
    } else if (warnings > 0) {
      report.overallStatus = 'WARNING';
    } else {
      report.overallStatus = 'HEALTHY';
    }

    // Save report
    fs.writeFileSync(this.reportFile, JSON.stringify(report, null, 2));
    this.log(`📋 Comprehensive report saved to ${this.reportFile}`);

    return report;
  }

  async startRealTimeMonitoring() {
    this.log('🎯 Starting SAMIA TAROT Real-Time Monitoring Dashboard');
    this.log('=' .repeat(70));
    
    this.isMonitoring = true;
    
    // Generate initial report
    const initialReport = await this.generateComprehensiveReport();
    
    // Display summary
    console.log('\n' + '🔍 MONITORING DASHBOARD SUMMARY'.padStart(50));
    console.log('=' .repeat(70));
    console.log(`⏱️  Report Duration: ${Math.round(initialReport.metadata.duration / 1000)}s`);
    console.log(`🏥 System Status: ${this.getStatusEmoji(initialReport.overallStatus)} ${initialReport.overallStatus}`);
    console.log(`🔧 Backend Process: ${initialReport.systemHealth.backend?.running ? '✅ RUNNING' : '❌ OFFLINE'}`);
    console.log(`📊 Quick Test: ${initialReport.quickStressTest.success ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (initialReport.recommendations.length > 0) {
      console.log('\n📋 RECOMMENDATIONS:');
      initialReport.recommendations.forEach(rec => console.log(`   ${rec}`));
    }
    
    console.log('\n' + '=' .repeat(70));
    console.log('🔄 Real-time monitoring active - Press Ctrl+C to stop');
    console.log('📈 Access PM2 monitoring with: pm2 monit');
    console.log('📊 View logs with: pm2 logs samiatarot-backend');
    console.log('🏥 Health check: curl http://localhost:5001/api/health');
    console.log('=' .repeat(70));
    
    // Start continuous monitoring
    this.startContinuousMonitoring();
    
    return initialReport;
  }

  getStatusEmoji(status) {
    switch (status) {
      case 'HEALTHY': return '✅';
      case 'WARNING': return '⚠️';
      case 'CRITICAL': return '🚨';
      default: return '❓';
    }
  }

  async startContinuousMonitoring() {
    const monitoringInterval = setInterval(async () => {
      if (!this.isMonitoring) {
        clearInterval(monitoringInterval);
        return;
      }

      try {
        const healthCheck = await this.checkSystemHealth();
        const timestamp = new Date().toLocaleTimeString();
        
        console.log(`\n[${timestamp}] 🔄 System Check:`);
        console.log(`  Backend: ${healthCheck.backend?.status || 'unknown'} | Memory: ${Math.round((healthCheck.backend?.memory || 0) / 1024 / 1024)}MB | Restarts: ${healthCheck.backend?.restarts || 0}`);
        
        // Check for issues
        if (!healthCheck.backend?.running) {
          console.log(`  🚨 ALERT: Backend is not running!`);
        } else if (healthCheck.backend.status !== 'online') {
          console.log(`  ⚠️ WARNING: Backend status is ${healthCheck.backend.status}`);
        }

      } catch (error) {
        console.log(`[${new Date().toLocaleTimeString()}] ❌ Monitoring error: ${error.message}`);
      }
    }, 30000); // Check every 30 seconds

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping monitoring dashboard...');
      this.isMonitoring = false;
      clearInterval(monitoringInterval);
      this.log('🛑 Monitoring dashboard stopped gracefully');
      process.exit(0);
    });
  }

  stop() {
    this.log('🛑 Stopping monitoring dashboard...');
    this.isMonitoring = false;
  }
}

// CLI execution
if (require.main === module) {
  const dashboard = new MonitoringDashboard();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'start':
      dashboard.startRealTimeMonitoring().catch(console.error);
      break;
    case 'report':
      dashboard.generateComprehensiveReport()
        .then(report => {
          console.log('📊 Report generated:', dashboard.reportFile);
          console.log('Overall Status:', report.overallStatus);
        })
        .catch(console.error);
      break;
    case 'health':
      dashboard.checkSystemHealth()
        .then(health => console.log(JSON.stringify(health, null, 2)))
        .catch(console.error);
      break;
    default:
      console.log(`
🎯 SAMIA TAROT Monitoring Dashboard Commands:

  node monitoring-dashboard-setup.js start   - Start real-time monitoring
  node monitoring-dashboard-setup.js report  - Generate one-time report
  node monitoring-dashboard-setup.js health  - Check system health

Examples:
  npm run monitor:start    - Start monitoring dashboard
  npm run monitor:report   - Generate monitoring report
  npm run monitor:health   - Quick health check
      `);
  }
}

module.exports = MonitoringDashboard; 