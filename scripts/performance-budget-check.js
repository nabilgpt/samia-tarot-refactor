#!/usr/bin/env node

/**
 * M36 — Performance Budget Check
 * Validates Core Web Vitals against p75 targets with detailed reporting
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Core Web Vitals p75 targets (per M36 spec)
const CWV_TARGETS = {
  LCP: 2500,    // Largest Contentful Paint ≤ 2.5s
  INP: 200,     // Interaction to Next Paint ≤ 200ms 
  CLS: 0.1,     // Cumulative Layout Shift ≤ 0.1
  FCP: 1800,    // First Contentful Paint ≤ 1.8s (supplementary)
  TBT: 200      // Total Blocking Time ≤ 200ms (proxy for INP)
};

// Performance budget thresholds
const BUDGET_THRESHOLDS = {
  totalByteWeight: 1600000,        // 1.6MB total
  unusedJavaScript: 100000,        // 100KB unused JS
  unusedCSSRules: 50000,           // 50KB unused CSS
  legacyJavaScript: 50000,         // 50KB legacy JS
  renderBlockingResources: 5,      // Max 5 RBR
  bootupTime: 3500,               // 3.5s JS bootup
  mainThreadWorkBreakdown: 4000,   // 4s main thread work
  thirdPartySummary: 500          // 500ms 3P blocking
};

class PerformanceBudgetChecker {
  constructor() {
    this.resultsDir = path.join(__dirname, '..', 'lighthouse-results');
    this.violations = [];
    this.warnings = [];
    this.passed = [];
  }

  async checkBudgets() {
    console.log('🎯 M36 Performance Budget Check');
    console.log('================================');
    
    try {
      const reports = await this.loadLighthouseReports();
      if (reports.length === 0) {
        throw new Error('No Lighthouse reports found. Run "npm run lighthouse:ci" first.');
      }

      console.log(`📊 Analyzing ${reports.length} Lighthouse reports...`);
      
      for (const report of reports) {
        await this.analyzeReport(report);
      }

      this.generateSummary();
      this.generateDetailedReport();
      
      const exitCode = this.violations.length > 0 ? 1 : 0;
      process.exit(exitCode);
      
    } catch (error) {
      console.error('❌ Performance budget check failed:', error.message);
      process.exit(1);
    }
  }

  async loadLighthouseReports() {
    if (!fs.existsSync(this.resultsDir)) {
      return [];
    }

    const files = fs.readdirSync(this.resultsDir)
      .filter(file => file.endsWith('-report.json'))
      .sort()
      .slice(-6); // Last 6 reports (one per URL)

    const reports = [];
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.resultsDir, file), 'utf8');
        const report = JSON.parse(content);
        reports.push({
          file,
          url: report.finalUrl || report.requestedUrl,
          audits: report.audits,
          categories: report.categories
        });
      } catch (error) {
        console.warn(`⚠️ Failed to parse ${file}:`, error.message);
      }
    }

    return reports;
  }

  analyzeReport(report) {
    const url = new URL(report.url).pathname;
    console.log(`\n🔍 Analyzing: ${url}`);

    // Check Core Web Vitals
    this.checkCoreWebVitals(report, url);
    
    // Check performance budgets
    this.checkPerformanceBudgets(report, url);
    
    // Check resource budgets
    this.checkResourceBudgets(report, url);
  }

  checkCoreWebVitals(report, url) {
    const { audits } = report;
    
    // LCP - Largest Contentful Paint
    if (audits['largest-contentful-paint']) {
      const lcp = audits['largest-contentful-paint'].numericValue;
      this.checkMetric('LCP', lcp, CWV_TARGETS.LCP, url, 'ms');
    }

    // INP - Interaction to Next Paint (new Core Web Vital)
    if (audits['interaction-to-next-paint']) {
      const inp = audits['interaction-to-next-paint'].numericValue;
      this.checkMetric('INP', inp, CWV_TARGETS.INP, url, 'ms');
    } else if (audits['max-potential-fid']) {
      // Fallback to FID for older Lighthouse versions
      const fid = audits['max-potential-fid'].numericValue;
      this.checkMetric('FID (legacy)', fid, 100, url, 'ms');
    }

    // TBT as INP proxy
    if (audits['total-blocking-time']) {
      const tbt = audits['total-blocking-time'].numericValue;
      this.checkMetric('TBT', tbt, CWV_TARGETS.TBT, url, 'ms');
    }

    // CLS - Cumulative Layout Shift
    if (audits['cumulative-layout-shift']) {
      const cls = audits['cumulative-layout-shift'].numericValue;
      this.checkMetric('CLS', cls, CWV_TARGETS.CLS, url, '');
    }

    // FCP - First Contentful Paint
    if (audits['first-contentful-paint']) {
      const fcp = audits['first-contentful-paint'].numericValue;
      this.checkMetric('FCP', fcp, CWV_TARGETS.FCP, url, 'ms');
    }
  }

  checkPerformanceBudgets(report, url) {
    const { audits } = report;

    const budgetChecks = [
      ['bootup-time', 'bootupTime', 'ms'],
      ['mainthread-work-breakdown', 'mainThreadWorkBreakdown', 'ms'],
      ['third-party-summary', 'thirdPartySummary', 'ms']
    ];

    for (const [auditKey, budgetKey, unit] of budgetChecks) {
      if (audits[auditKey]) {
        const value = audits[auditKey].numericValue;
        const target = BUDGET_THRESHOLDS[budgetKey];
        this.checkMetric(auditKey.toUpperCase(), value, target, url, unit);
      }
    }
  }

  checkResourceBudgets(report, url) {
    const { audits } = report;

    const resourceChecks = [
      ['total-byte-weight', 'totalByteWeight', 'bytes'],
      ['unused-javascript', 'unusedJavaScript', 'bytes'],
      ['unused-css-rules', 'unusedCSSRules', 'bytes'],
      ['legacy-javascript', 'legacyJavaScript', 'bytes'],
      ['render-blocking-resources', 'renderBlockingResources', 'count']
    ];

    for (const [auditKey, budgetKey, unit] of resourceChecks) {
      if (audits[auditKey]) {
        let value = audits[auditKey].numericValue;
        
        // For RBR, count the items
        if (auditKey === 'render-blocking-resources') {
          value = audits[auditKey].details?.items?.length || 0;
        }
        
        const target = BUDGET_THRESHOLDS[budgetKey];
        this.checkMetric(auditKey.toUpperCase(), value, target, url, unit);
      }
    }
  }

  checkMetric(name, value, target, url, unit) {
    const formatValue = (val, unit) => {
      if (unit === 'bytes') return `${(val / 1024).toFixed(1)}KB`;
      if (unit === 'ms') return `${val.toFixed(0)}ms`;
      if (unit === 'count') return `${val}`;
      return val.toFixed(3);
    };

    const result = {
      name,
      value,
      target,
      url,
      formatted: formatValue(value, unit),
      targetFormatted: formatValue(target, unit),
      passed: value <= target,
      delta: value - target,
      severity: value > target * 1.5 ? 'error' : 'warn'
    };

    if (result.passed) {
      this.passed.push(result);
    } else if (result.severity === 'error') {
      this.violations.push(result);
    } else {
      this.warnings.push(result);
    }
  }

  generateSummary() {
    console.log('\n📋 Performance Budget Summary');
    console.log('=============================');
    
    const total = this.passed.length + this.warnings.length + this.violations.length;
    const passRate = ((this.passed.length / total) * 100).toFixed(1);
    
    console.log(`✅ Passed: ${this.passed.length}/${total} (${passRate}%)`);
    console.log(`⚠️  Warnings: ${this.warnings.length}`);
    console.log(`❌ Violations: ${this.violations.length}`);

    if (this.violations.length > 0) {
      console.log('\n❌ BUDGET VIOLATIONS:');
      for (const violation of this.violations) {
        const delta = violation.delta > 0 ? `+${violation.delta.toFixed(0)}` : violation.delta.toFixed(0);
        console.log(`   ${violation.name}: ${violation.formatted} (target: ${violation.targetFormatted}, ${delta}) - ${violation.url}`);
      }
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  BUDGET WARNINGS:');
      for (const warning of this.warnings) {
        const delta = warning.delta > 0 ? `+${warning.delta.toFixed(0)}` : warning.delta.toFixed(0);
        console.log(`   ${warning.name}: ${warning.formatted} (target: ${warning.targetFormatted}, ${delta}) - ${warning.url}`);
      }
    }

    // Core Web Vitals specific summary
    const cwvMetrics = ['LCP', 'INP', 'CLS', 'FID (legacy)', 'TBT'];
    const cwvResults = [...this.passed, ...this.warnings, ...this.violations]
      .filter(r => cwvMetrics.includes(r.name));
    
    if (cwvResults.length > 0) {
      console.log('\n🎯 Core Web Vitals Status:');
      for (const metric of cwvMetrics) {
        const results = cwvResults.filter(r => r.name === metric);
        if (results.length > 0) {
          const passCount = results.filter(r => r.passed).length;
          const status = passCount === results.length ? '✅' : '❌';
          console.log(`   ${status} ${metric}: ${passCount}/${results.length} pages passing`);
        }
      }
    }
  }

  generateDetailedReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(this.resultsDir, `performance-budget-${timestamp}.json`);

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.passed.length + this.warnings.length + this.violations.length,
        passed: this.passed.length,
        warnings: this.warnings.length,
        violations: this.violations.length,
        passRate: ((this.passed.length / (this.passed.length + this.warnings.length + this.violations.length)) * 100).toFixed(1)
      },
      targets: CWV_TARGETS,
      budgets: BUDGET_THRESHOLDS,
      results: {
        passed: this.passed,
        warnings: this.warnings,
        violations: this.violations
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved: ${reportPath}`);
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new PerformanceBudgetChecker();
  checker.checkBudgets();
}