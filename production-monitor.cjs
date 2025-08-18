#!/usr/bin/env node

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execAsync = util.promisify(exec);

class ProductionMonitor {
  constructor() {
    this.logFile = './logs/production-monitor.log';
    this.reportFile = './logs/monitoring-report.json';
    this.startTime = new Date();
    
    // Ensure logs directory exists
    if (!fs.existsSync('./logs')) {
      fs.mkdirSync('./logs', { recursive: true });
    }
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    
    console.log(`🔍 ${logEntry.trim()}`);
    fs.appendFileSync(this.logFile, logEntry);
  }

  async checkSystemHealth() {
    this.log('🏥 Starting system health check...');
    
    try {
      // Check if backend server is running
      const { stdout: pm2Status } = await execAsync('pm2 jlist');
      const processes = JSON.parse(pm2Status);
      
      const backendProcess = processes.find(p => p.name === 'samiatarot-backend');
      
      if (!backendProcess) {
        this.log('❌ Backend process not found in PM2', 'ERROR');
        return false;
      }

      if (backendProcess.pm2_env.status !== 'online') {
        this.log(`❌ Backend process status: ${backendProcess.pm2_env.status}`, 'ERROR');
        return false;
      }

      this.log('✅ Backend process is online and healthy');
      return true;

    } catch (error) {
      this.log(`❌ System health check failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async runStressTest() {
    this.log('🚀 Starting Artillery stress test...');
    
    return new Promise((resolve) => {
      const artillery = spawn('artillery', ['run', 'stress-test.yml', '--output', './logs/stress-test-results.json'], {
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      artillery.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        console.log(chunk);
      });

      artillery.stderr.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        console.error(chunk);
      });

      artillery.on('close', (code) => {
        if (code === 0) {
          this.log('✅ Stress test completed successfully');
          resolve({ success: true, output, errorOutput });
        } else {
          this.log(`❌ Stress test failed with code ${code}`, 'ERROR');
          resolve({ success: false, output, errorOutput, exitCode: code });
        }
      });
    });
  }

  async generateReport() {
    this.log('📊 Generating comprehensive monitoring report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime.getTime(),
      systemHealth: await this.checkSystemHealth(),
      stressTest: null,
      pm2Status: null,
      recommendations: []
    };

    try {
      // Get PM2 status
      const { stdout: pm2Status } = await execAsync('pm2 jlist');
      report.pm2Status = JSON.parse(pm2Status);
    } catch (error) {
      this.log(`❌ Failed to get PM2 status: ${error.message}`, 'ERROR');
    }

    // Run stress test
    report.stressTest = await this.runStressTest();

    // Add recommendations based on results
    if (!report.systemHealth) {
      report.recommendations.push('🚨 CRITICAL: System health check failed - immediate attention required');
    }

    if (!report.stressTest.success) {
      report.recommendations.push('⚠️ WARNING: Stress test failed - performance issues detected');
    }

    // Save report
    fs.writeFileSync(this.reportFile, JSON.stringify(report, null, 2));
    this.log(`📋 Report saved to ${this.reportFile}`);

    return report;
  }

  async startMonitoring() {
    this.log('🎯 SAMIA TAROT Production Monitoring Started');
    this.log('=' .repeat(60));
    
    try {
      const report = await this.generateReport();
      
      // Display summary
      console.log('\n' + '🔍 MONITORING SUMMARY'.padStart(40));
      console.log('=' .repeat(60));
      console.log(`⏱️  Duration: ${Math.round(report.duration / 1000)}s`);
      console.log(`🏥 System Health: ${report.systemHealth ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
      console.log(`🚀 Stress Test: ${report.stressTest.success ? '✅ PASSED' : '❌ FAILED'}`);
      
      if (report.recommendations.length > 0) {
        console.log('\n📋 RECOMMENDATIONS:');
        report.recommendations.forEach(rec => console.log(`   ${rec}`));
      }
      
      console.log('\n' + '=' .repeat(60));
      this.log('🎯 Production monitoring completed');
      
      return report;
      
    } catch (error) {
      this.log(`❌ Monitoring failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }
}

// Run monitoring if called directly
const monitor = new ProductionMonitor();
monitor.startMonitoring().catch(console.error);

module.exports = ProductionMonitor; 