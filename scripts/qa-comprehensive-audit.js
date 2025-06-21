#!/usr/bin/env node

/**
 * COMPREHENSIVE QA AUDIT SCRIPT - SAMIA TAROT PLATFORM
 * This script performs end-to-end testing of all system components
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uuseflmielktdcltzwzt.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 SAMIA TAROT - COMPREHENSIVE QA AUDIT STARTING...');
console.log('='.repeat(50));

// QA Report Structure
const qaReport = {
    timestamp: new Date().toISOString(),
    platform: 'SAMIA TAROT',
    version: '1.0.0',
    overallStatus: 'PENDING',
    tests: [],
    issues: [],
    summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        criticalIssues: 0
    }
};

function logTest(testName, status, details = '') {
    const test = { name: testName, status, details, timestamp: new Date().toISOString() };
    qaReport.tests.push(test);
    qaReport.summary.totalTests++;
    
    if (status === 'PASS') {
        qaReport.summary.passedTests++;
        console.log(`✅ ${testName}: PASSED`);
    } else if (status === 'WARN') {
        qaReport.summary.passedTests++; // Count warnings as passes for overall status
        console.log(`⚠️ ${testName}: WARNING - ${details}`);
    } else {
        qaReport.summary.failedTests++;
        console.log(`❌ ${testName}: FAILED - ${details}`);
        
        if (details.includes('CRITICAL')) {
            qaReport.summary.criticalIssues++;
            qaReport.issues.push({ test: testName, issue: details, severity: 'critical' });
        }
    }
}

// Test 1: Server Connectivity
async function testServers() {
    console.log('\n🌐 Testing Server Connectivity...');
    
    try {
        // Test backend
        const backendResponse = await fetch('http://localhost:3001/health');
        if (backendResponse.ok) {
            logTest('Backend Server Health', 'PASS', 'Server responding correctly');
            
            // Check health response
            const healthData = await backendResponse.json();
            if (healthData.status === 'healthy') {
                logTest('Backend Health Status', 'PASS', 'All services healthy');
            } else {
                logTest('Backend Health Status', 'FAIL', `Health issues detected: ${JSON.stringify(healthData)}`);
            }
        } else {
            logTest('Backend Server Health', 'FAIL', `CRITICAL: Backend server returned status ${backendResponse.status}`);
        }
        
        // Test frontend (optional for this audit)
        try {
            const frontendResponse = await fetch('http://localhost:3000');
            if (frontendResponse.ok) {
                logTest('Frontend Server', 'PASS', 'Frontend server responding');
            } else {
                logTest('Frontend Server', 'WARN', `Frontend server returned status ${frontendResponse.status} (non-critical)`);
            }
        } catch (error) {
            logTest('Frontend Server', 'WARN', `Frontend server not running (non-critical): ${error.message}`);
        }
        
    } catch (error) {
        logTest('Server Connectivity', 'FAIL', `CRITICAL: Cannot reach servers - ${error.message}`);
    }
}

// Test 2: Environment Variables
function testEnvironmentVariables() {
    console.log('\n🔧 Testing Environment Variables...');
    
    const requiredVars = [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY', 
        'SUPABASE_SERVICE_ROLE_KEY',
        'OPENAI_API_KEY',
        'STRIPE_SECRET_KEY'
    ];
    
    let envContent = '';
    try {
        envContent = fs.readFileSync('.env', 'utf8');
    } catch (error) {
        logTest('Environment File', 'FAIL', 'CRITICAL: .env file not found');
        return;
    }
    
    logTest('Environment File', 'PASS', '.env file exists');
    
    for (const varName of requiredVars) {
        const envRegex = new RegExp(`^${varName}=(.+)$`, 'm');
        const match = envContent.match(envRegex);
        
        if (match && match[1] && match[1].trim() !== '' && 
            !match[1].includes('placeholder') && 
            !match[1].includes('your_') && 
            match[1].length > 10) {
            logTest(`Environment Variable: ${varName}`, 'PASS', 'Variable configured');
        } else {
            logTest(`Environment Variable: ${varName}`, 'FAIL', `Missing or placeholder value for ${varName}`);
        }
    }
}

// Test 3: API Endpoints
async function testAPIEndpoints() {
    console.log('\n🌐 Testing API Endpoints...');
    
    const endpoints = [
        { path: '/api', expectedStatus: 200 },
        { path: '/api/payment-settings/health', expectedStatus: 200 }, // Public health endpoint
        { path: '/api/profiles', expectedStatus: 401 }, // Should require auth
        { path: '/api/bookings', expectedStatus: 401 }, // Should require auth
    ];
    
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(`http://localhost:3001${endpoint.path}`);
            
            if (response.status === endpoint.expectedStatus) {
                logTest(`API Endpoint: ${endpoint.path}`, 'PASS', `Correct status: ${response.status}`);
            } else {
                logTest(`API Endpoint: ${endpoint.path}`, 'FAIL', `Expected ${endpoint.expectedStatus}, got ${response.status}`);
            }
        } catch (error) {
            logTest(`API Endpoint: ${endpoint.path}`, 'FAIL', `CRITICAL: Endpoint unreachable - ${error.message}`);
        }
    }
}

// Test 4: File Structure
function testFileStructure() {
    console.log('\n📁 Testing File Structure...');
    
    const criticalFiles = [
        'package.json',
        'src/api/index.js',
        'src/App.jsx',
        'src/lib/supabase.js',
        'database/qa-database-setup.sql'
    ];
    
    for (const file of criticalFiles) {
        if (fs.existsSync(file)) {
            logTest(`File Exists: ${file}`, 'PASS', 'File found');
        } else {
            logTest(`File Exists: ${file}`, 'FAIL', `CRITICAL: Missing critical file ${file}`);
        }
    }
}

// Generate Final Report
function generateReport() {
    console.log('\n📊 GENERATING QA REPORT...');
    console.log('='.repeat(50));
    
    // Calculate overall status
    if (qaReport.summary.criticalIssues > 0) {
        qaReport.overallStatus = 'CRITICAL_FAILURE';
    } else if (qaReport.summary.failedTests > 0) {
        qaReport.overallStatus = 'PARTIAL_FAILURE';
    } else {
        qaReport.overallStatus = 'SUCCESS';
    }
    
    // Save report
    const reportPath = 'reports/qa-basic-report.json';
    try {
        if (!fs.existsSync('reports')) {
            fs.mkdirSync('reports');
        }
        fs.writeFileSync(reportPath, JSON.stringify(qaReport, null, 2));
    } catch (error) {
        console.log('⚠️ Could not save report file');
    }
    
    // Display summary
    console.log(`🎯 Overall Status: ${qaReport.overallStatus}`);
    console.log(`📊 Total Tests: ${qaReport.summary.totalTests}`);
    console.log(`✅ Passed: ${qaReport.summary.passedTests}`);
    console.log(`❌ Failed: ${qaReport.summary.failedTests}`);
    console.log(`🚨 Critical Issues: ${qaReport.summary.criticalIssues}`);
    
    if (qaReport.summary.criticalIssues > 0) {
        console.log('\n🚨 CRITICAL ISSUES:');
        qaReport.issues.forEach(issue => {
            if (issue.severity === 'critical') {
                console.log(`   • ${issue.test}: ${issue.issue}`);
            }
        });
    }
    
    console.log(`\n📄 Report saved to: ${reportPath}`);
    
    return qaReport.overallStatus;
}

// Main execution
async function runQA() {
    try {
        testFileStructure();
        testEnvironmentVariables();
        await testServers();
        await testAPIEndpoints();
        
        const status = generateReport();
        
        console.log('\n' + '='.repeat(50));
        if (status === 'SUCCESS') {
            console.log('🎉 QA AUDIT COMPLETED SUCCESSFULLY!');
            console.log('✅ All critical systems are operational');
        } else if (status === 'PARTIAL_FAILURE') {
            console.log('⚠️ QA AUDIT COMPLETED WITH WARNINGS');
            console.log('🔧 Some issues need attention before production');
        } else {
            console.log('❌ QA AUDIT FAILED - CRITICAL ISSUES DETECTED');
            console.log('🚨 System not ready for production');
        }
        console.log('='.repeat(50));
        
    } catch (error) {
        console.error('💥 QA AUDIT CRASHED:', error.message);
        process.exit(1);
    }
}

// Run the audit
runQA();
