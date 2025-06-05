#!/usr/bin/env node

/**
 * SAMIA TAROT - Hardcoded Secrets Removal Script
 * Identifies and helps remove hardcoded secrets from the codebase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Secret patterns to search for
const SECRET_PATTERNS = [
  {
    name: 'Supabase Service Role Key',
    pattern: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[^"'\s]+/g,
    severity: 'CRITICAL'
  },
  {
    name: 'API Key',
    pattern: /(api[_-]?key|apikey)\s*[:=]\s*['"][^'"]+['"]/gi,
    severity: 'HIGH'
  },
  {
    name: 'Secret/Token',
    pattern: /(secret|token)\s*[:=]\s*['"][^'"]+['"]/gi,
    severity: 'HIGH'
  },
  {
    name: 'Password Assignment',
    pattern: /password\s*[:=]\s*['"][^'"]+['"]/gi,
    severity: 'MEDIUM'
  },
  {
    name: 'JWT Token',
    pattern: /jwt[_-]?token\s*[:=]\s*['"][^'"]+['"]/gi,
    severity: 'HIGH'
  }
];

// Files to exclude from scanning
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /\.env\.example/,
  /test.*\.js$/,
  /mock.*\.js$/,
  /validation.*\.js$/,
  /zodiac.*\.js$/
];

// Files with hardcoded secrets to fix
const FILES_TO_FIX = [
  'update-super-admin.js',
  'update-super-admin.mjs', 
  'ultimate-fix-f66c1c35.mjs',
  'refresh-profile.mjs',
  'recreate-super-admin.mjs'
];

class SecretScanner {
  constructor() {
    this.findings = [];
    this.projectRoot = path.resolve(__dirname, '..');
  }

  shouldExcludeFile(filePath) {
    return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
  }

  scanFile(filePath) {
    if (this.shouldExcludeFile(filePath)) {
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.projectRoot, filePath);

      SECRET_PATTERNS.forEach(({ name, pattern, severity }) => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const lineNumber = content.substring(0, match.index).split('\n').length;
          
          this.findings.push({
            file: relativePath,
            line: lineNumber,
            type: name,
            severity,
            match: match[0].substring(0, 50) + '...',
            fullMatch: match[0]
          });
        }
      });
    } catch (error) {
      console.warn(`⚠️  Could not read file: ${filePath}`);
    }
  }

  scanDirectory(dirPath) {
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          this.scanDirectory(fullPath);
        } else if (stat.isFile()) {
          // Only scan relevant file types
          if (/\.(js|jsx|ts|tsx|sql|json|env)$/.test(item)) {
            this.scanFile(fullPath);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not scan directory: ${dirPath}`);
    }
  }

  generateReport() {
    console.log('🔒 SAMIA TAROT - Hardcoded Secrets Scan Report');
    console.log('='.repeat(60));
    
    if (this.findings.length === 0) {
      console.log('✅ No hardcoded secrets found!');
      return;
    }

    // Group by severity
    const bySeverity = this.findings.reduce((acc, finding) => {
      if (!acc[finding.severity]) acc[finding.severity] = [];
      acc[finding.severity].push(finding);
      return acc;
    }, {});

    ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].forEach(severity => {
      if (bySeverity[severity]) {
        console.log(`\n🚨 ${severity} SEVERITY (${bySeverity[severity].length} issues):`);
        console.log('-'.repeat(40));
        
        bySeverity[severity].forEach(finding => {
          console.log(`📁 File: ${finding.file}:${finding.line}`);
          console.log(`🔍 Type: ${finding.type}`);
          console.log(`📝 Match: ${finding.match}`);
          console.log('');
        });
      }
    });

    console.log('\n📋 REMEDIATION ACTIONS:');
    console.log('-'.repeat(40));
    
    // Generate specific fix actions
    this.generateFixActions();
  }

  generateFixActions() {
    const criticalFiles = this.findings
      .filter(f => f.severity === 'CRITICAL')
      .map(f => f.file)
      .filter((file, index, self) => self.indexOf(file) === index);

    if (criticalFiles.length > 0) {
      console.log('\n🔥 IMMEDIATE ACTIONS REQUIRED:');
      
      criticalFiles.forEach(file => {
        console.log(`\n1. Remove/replace secrets in: ${file}`);
        
        if (FILES_TO_FIX.includes(path.basename(file))) {
          console.log(`   → This file should be deleted or moved to secure storage`);
          console.log(`   → Contains Supabase service role key`);
        }
      });
    }

    console.log('\n📝 ENVIRONMENT VARIABLES TO CREATE:');
    console.log('Add these to your .env file:');
    console.log('');
    console.log('VITE_SUPABASE_URL=your_supabase_url_here');
    console.log('VITE_SUPABASE_ANON_KEY=your_anon_key_here');
    console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
    console.log('VITE_OPENAI_API_KEY=your_openai_key_here');
    console.log('');

    console.log('🔧 CODE FIXES NEEDED:');
    console.log('Replace hardcoded values with:');
    console.log('const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;');
    console.log('const apiKey = import.meta.env.VITE_OPENAI_API_KEY;');
  }

  run() {
    console.log('🔍 Scanning for hardcoded secrets...\n');
    this.scanDirectory(this.projectRoot);
    this.generateReport();
    
    console.log('\n📊 SCAN SUMMARY:');
    console.log(`Total files scanned: ${this.getScannedFileCount()}`);
    console.log(`Security issues found: ${this.findings.length}`);
    console.log(`Critical issues: ${this.findings.filter(f => f.severity === 'CRITICAL').length}`);
  }

  getScannedFileCount() {
    // This is an approximation - could be made more accurate
    return 'N/A';
  }
}

// Run the scanner
const scanner = new SecretScanner();
scanner.run(); 