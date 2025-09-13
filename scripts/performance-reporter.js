#!/usr/bin/env node

/**
 * M36 — Performance Reporter
 * Generates comprehensive performance reports from Lighthouse CI results
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PerformanceReporter {
  constructor() {
    this.resultsDir = path.join(__dirname, '..', 'lighthouse-results');
    this.reportsDir = path.join(__dirname, '..', 'performance-reports');
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  async generateReport() {
    console.log('📊 M36 Performance Report Generator');
    console.log('===================================');

    try {
      const reports = await this.loadLighthouseReports();
      if (reports.length === 0) {
        throw new Error('No Lighthouse reports found. Run "npm run lighthouse:ci" first.');
      }

      console.log(`📈 Processing ${reports.length} reports...`);

      const analysis = this.analyzeReports(reports);
      await this.generateHTMLReport(analysis);
      await this.generateJSONReport(analysis);
      await this.generateMarkdownSummary(analysis);

      console.log('✅ Performance reports generated successfully!');
      
    } catch (error) {
      console.error('❌ Report generation failed:', error.message);
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
          categories: report.categories,
          timing: report.timing,
          environment: report.environment
        });
      } catch (error) {
        console.warn(`⚠️ Failed to parse ${file}:`, error.message);
      }
    }

    return reports;
  }

  analyzeReports(reports) {
    const analysis = {
      timestamp: new Date().toISOString(),
      totalReports: reports.length,
      pages: {},
      aggregates: {
        performance: [],
        accessibility: [],
        bestPractices: [],
        seo: []
      },
      coreWebVitals: {},
      opportunities: new Map(),
      diagnostics: new Map()
    };

    for (const report of reports) {
      const pageName = this.getPageName(report.url);
      
      analysis.pages[pageName] = {
        url: report.url,
        scores: {
          performance: report.categories.performance?.score * 100 || 0,
          accessibility: report.categories.accessibility?.score * 100 || 0,
          bestPractices: report.categories['best-practices']?.score * 100 || 0,
          seo: report.categories.seo?.score * 100 || 0
        },
        metrics: this.extractMetrics(report.audits),
        opportunities: this.extractOpportunities(report.audits),
        diagnostics: this.extractDiagnostics(report.audits)
      };

      // Collect aggregates
      analysis.aggregates.performance.push(analysis.pages[pageName].scores.performance);
      analysis.aggregates.accessibility.push(analysis.pages[pageName].scores.accessibility);
      analysis.aggregates.bestPractices.push(analysis.pages[pageName].scores.bestPractices);
      analysis.aggregates.seo.push(analysis.pages[pageName].scores.seo);

      // Aggregate opportunities
      analysis.pages[pageName].opportunities.forEach(opp => {
        if (!analysis.opportunities.has(opp.id)) {
          analysis.opportunities.set(opp.id, { ...opp, pages: [] });
        }
        analysis.opportunities.get(opp.id).pages.push(pageName);
      });

      // Aggregate diagnostics
      analysis.pages[pageName].diagnostics.forEach(diag => {
        if (!analysis.diagnostics.has(diag.id)) {
          analysis.diagnostics.set(diag.id, { ...diag, pages: [] });
        }
        analysis.diagnostics.get(diag.id).pages.push(pageName);
      });
    }

    // Calculate aggregated scores
    analysis.aggregatedScores = {
      performance: this.average(analysis.aggregates.performance),
      accessibility: this.average(analysis.aggregates.accessibility),
      bestPractices: this.average(analysis.aggregates.bestPractices),
      seo: this.average(analysis.aggregates.seo)
    };

    // Core Web Vitals analysis
    analysis.coreWebVitals = this.analyzeCoreWebVitals(analysis.pages);

    return analysis;
  }

  getPageName(url) {
    try {
      const pathname = new URL(url).pathname;
      if (pathname === '/') return 'Home';
      return pathname.split('/').filter(p => p).map(p => 
        p.charAt(0).toUpperCase() + p.slice(1)
      ).join(' > ');
    } catch {
      return url;
    }
  }

  extractMetrics(audits) {
    const metricKeys = [
      'first-contentful-paint',
      'largest-contentful-paint',
      'first-meaningful-paint',
      'speed-index',
      'cumulative-layout-shift',
      'total-blocking-time',
      'max-potential-fid',
      'interaction-to-next-paint'
    ];

    const metrics = {};
    for (const key of metricKeys) {
      if (audits[key]) {
        metrics[key] = {
          value: audits[key].numericValue,
          displayValue: audits[key].displayValue,
          score: audits[key].score
        };
      }
    }

    return metrics;
  }

  extractOpportunities(audits) {
    const opportunities = [];
    
    for (const [key, audit] of Object.entries(audits)) {
      if (audit.scoreDisplayMode === 'numeric' && audit.score < 0.9 && audit.details?.overallSavingsMs > 0) {
        opportunities.push({
          id: key,
          title: audit.title,
          description: audit.description,
          score: audit.score,
          savings: {
            ms: audit.details.overallSavingsMs,
            bytes: audit.details.overallSavingsBytes || 0
          },
          displayValue: audit.displayValue
        });
      }
    }

    return opportunities.sort((a, b) => b.savings.ms - a.savings.ms);
  }

  extractDiagnostics(audits) {
    const diagnostics = [];
    const diagnosticKeys = [
      'bootup-time',
      'mainthread-work-breakdown',
      'third-party-summary',
      'critical-request-chains',
      'render-blocking-resources',
      'unused-javascript',
      'unused-css-rules',
      'legacy-javascript'
    ];

    for (const key of diagnosticKeys) {
      if (audits[key] && audits[key].score < 0.9) {
        diagnostics.push({
          id: key,
          title: audits[key].title,
          description: audits[key].description,
          score: audits[key].score,
          displayValue: audits[key].displayValue,
          numericValue: audits[key].numericValue
        });
      }
    }

    return diagnostics;
  }

  analyzeCoreWebVitals(pages) {
    const cwv = {
      lcp: { values: [], passed: 0, total: 0 },
      inp: { values: [], passed: 0, total: 0 },
      cls: { values: [], passed: 0, total: 0 }
    };

    for (const [pageName, page] of Object.entries(pages)) {
      if (page.metrics['largest-contentful-paint']) {
        const lcp = page.metrics['largest-contentful-paint'].value;
        cwv.lcp.values.push({ page: pageName, value: lcp });
        cwv.lcp.total++;
        if (lcp <= 2500) cwv.lcp.passed++;
      }

      if (page.metrics['interaction-to-next-paint']) {
        const inp = page.metrics['interaction-to-next-paint'].value;
        cwv.inp.values.push({ page: pageName, value: inp });
        cwv.inp.total++;
        if (inp <= 200) cwv.inp.passed++;
      }

      if (page.metrics['cumulative-layout-shift']) {
        const cls = page.metrics['cumulative-layout-shift'].value;
        cwv.cls.values.push({ page: pageName, value: cls });
        cwv.cls.total++;
        if (cls <= 0.1) cwv.cls.passed++;
      }
    }

    return cwv;
  }

  average(array) {
    return array.length ? array.reduce((a, b) => a + b, 0) / array.length : 0;
  }

  async generateMarkdownSummary(analysis) {
    const timestamp = new Date().toISOString().split('T')[0];
    const filePath = path.join(this.reportsDir, `performance-summary-${timestamp}.md`);

    let markdown = `# Performance Report - ${timestamp}\n\n`;
    markdown += `Generated from ${analysis.totalReports} Lighthouse reports\n\n`;

    // Overall scores
    markdown += `## 📊 Overall Scores\n\n`;
    markdown += `| Category | Score |\n`;
    markdown += `|----------|-------|\n`;
    markdown += `| Performance | ${analysis.aggregatedScores.performance.toFixed(1)} |\n`;
    markdown += `| Accessibility | ${analysis.aggregatedScores.accessibility.toFixed(1)} |\n`;
    markdown += `| Best Practices | ${analysis.aggregatedScores.bestPractices.toFixed(1)} |\n`;
    markdown += `| SEO | ${analysis.aggregatedScores.seo.toFixed(1)} |\n\n`;

    // Core Web Vitals
    markdown += `## 🎯 Core Web Vitals Status\n\n`;
    markdown += `| Metric | Passed | Total | Pass Rate |\n`;
    markdown += `|--------|--------|-------|----------|\n`;
    markdown += `| LCP (≤2.5s) | ${analysis.coreWebVitals.lcp.passed} | ${analysis.coreWebVitals.lcp.total} | ${((analysis.coreWebVitals.lcp.passed / analysis.coreWebVitals.lcp.total) * 100).toFixed(1)}% |\n`;
    markdown += `| INP (≤200ms) | ${analysis.coreWebVitals.inp.passed} | ${analysis.coreWebVitals.inp.total} | ${((analysis.coreWebVitals.inp.passed / analysis.coreWebVitals.inp.total) * 100).toFixed(1)}% |\n`;
    markdown += `| CLS (≤0.1) | ${analysis.coreWebVitals.cls.passed} | ${analysis.coreWebVitals.cls.total} | ${((analysis.coreWebVitals.cls.passed / analysis.coreWebVitals.cls.total) * 100).toFixed(1)}% |\n\n`;

    // Top opportunities
    const topOpportunities = Array.from(analysis.opportunities.values())
      .sort((a, b) => b.savings.ms - a.savings.ms)
      .slice(0, 5);

    if (topOpportunities.length > 0) {
      markdown += `## 🚀 Top Optimization Opportunities\n\n`;
      topOpportunities.forEach((opp, index) => {
        markdown += `${index + 1}. **${opp.title}**\n`;
        markdown += `   - Potential savings: ${opp.savings.ms}ms\n`;
        markdown += `   - Affected pages: ${opp.pages.join(', ')}\n\n`;
      });
    }

    fs.writeFileSync(filePath, markdown);
    console.log(`📄 Markdown summary: ${filePath}`);
  }

  async generateJSONReport(analysis) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(this.reportsDir, `performance-report-${timestamp}.json`);

    const jsonReport = {
      ...analysis,
      opportunities: Array.from(analysis.opportunities.entries()).map(([id, data]) => ({ id, ...data })),
      diagnostics: Array.from(analysis.diagnostics.entries()).map(([id, data]) => ({ id, ...data }))
    };

    fs.writeFileSync(filePath, JSON.stringify(jsonReport, null, 2));
    console.log(`📄 JSON report: ${filePath}`);
  }

  async generateHTMLReport(analysis) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(this.reportsDir, `performance-report-${timestamp}.html`);

    const html = this.generateHTMLContent(analysis);
    fs.writeFileSync(filePath, html);
    console.log(`📄 HTML report: ${filePath}`);
  }

  generateHTMLContent(analysis) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Report - ${new Date().toLocaleDateString()}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #e0e0e0; line-height: 1.6; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 40px; }
        .header h1 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 2.5rem; margin-bottom: 10px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .card { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 24px; backdrop-filter: blur(10px); }
        .card h3 { color: #667eea; margin-bottom: 16px; }
        .score { font-size: 2rem; font-weight: bold; }
        .score.good { color: #00ff9f; }
        .score.needs-improvement { color: #ffb000; }
        .score.poor { color: #ff6b6b; }
        .metric-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
        .metric-item:last-child { border-bottom: none; }
        .chart-container { position: relative; height: 300px; margin: 20px 0; }
        .opportunity { background: rgba(255, 255, 255, 0.02); padding: 16px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid #667eea; }
        .opportunity h4 { color: #667eea; margin-bottom: 8px; }
        .savings { color: #00ff9f; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
        th { color: #667eea; font-weight: 600; }
        .status-good { color: #00ff9f; }
        .status-poor { color: #ff6b6b; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 M36 Performance Report</h1>
            <p>Generated on ${new Date().toLocaleString()} from ${analysis.totalReports} Lighthouse reports</p>
        </div>

        <div class="grid">
            <div class="card">
                <h3>📊 Overall Performance</h3>
                <div class="score ${this.getScoreClass(analysis.aggregatedScores.performance)}">${analysis.aggregatedScores.performance.toFixed(1)}</div>
                <p>Average across all pages</p>
            </div>
            <div class="card">
                <h3>♿ Accessibility</h3>
                <div class="score ${this.getScoreClass(analysis.aggregatedScores.accessibility)}">${analysis.aggregatedScores.accessibility.toFixed(1)}</div>
            </div>
            <div class="card">
                <h3>✅ Best Practices</h3>
                <div class="score ${this.getScoreClass(analysis.aggregatedScores.bestPractices)}">${analysis.aggregatedScores.bestPractices.toFixed(1)}</div>
            </div>
            <div class="card">
                <h3>🔍 SEO</h3>
                <div class="score ${this.getScoreClass(analysis.aggregatedScores.seo)}">${analysis.aggregatedScores.seo.toFixed(1)}</div>
            </div>
        </div>

        <div class="card">
            <h3>🎯 Core Web Vitals Status</h3>
            <table>
                <thead>
                    <tr><th>Metric</th><th>Target</th><th>Passed</th><th>Total</th><th>Pass Rate</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td>LCP (Largest Contentful Paint)</td>
                        <td>≤ 2.5s</td>
                        <td class="${analysis.coreWebVitals.lcp.passed === analysis.coreWebVitals.lcp.total ? 'status-good' : 'status-poor'}">${analysis.coreWebVitals.lcp.passed}</td>
                        <td>${analysis.coreWebVitals.lcp.total}</td>
                        <td>${((analysis.coreWebVitals.lcp.passed / analysis.coreWebVitals.lcp.total) * 100).toFixed(1)}%</td>
                    </tr>
                    <tr>
                        <td>INP (Interaction to Next Paint)</td>
                        <td>≤ 200ms</td>
                        <td class="${analysis.coreWebVitals.inp.passed === analysis.coreWebVitals.inp.total ? 'status-good' : 'status-poor'}">${analysis.coreWebVitals.inp.passed}</td>
                        <td>${analysis.coreWebVitals.inp.total}</td>
                        <td>${((analysis.coreWebVitals.inp.passed / analysis.coreWebVitals.inp.total) * 100).toFixed(1)}%</td>
                    </tr>
                    <tr>
                        <td>CLS (Cumulative Layout Shift)</td>
                        <td>≤ 0.1</td>
                        <td class="${analysis.coreWebVitals.cls.passed === analysis.coreWebVitals.cls.total ? 'status-good' : 'status-poor'}">${analysis.coreWebVitals.cls.passed}</td>
                        <td>${analysis.coreWebVitals.cls.total}</td>
                        <td>${((analysis.coreWebVitals.cls.passed / analysis.coreWebVitals.cls.total) * 100).toFixed(1)}%</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="card">
            <h3>🚀 Top Optimization Opportunities</h3>
            ${Array.from(analysis.opportunities.values())
              .sort((a, b) => b.savings.ms - a.savings.ms)
              .slice(0, 5)
              .map(opp => `
                <div class="opportunity">
                    <h4>${opp.title}</h4>
                    <p>${opp.description}</p>
                    <p><span class="savings">Potential savings: ${opp.savings.ms}ms</span></p>
                    <p>Affected pages: ${opp.pages.join(', ')}</p>
                </div>
              `).join('')}
        </div>

        <div class="card">
            <h3>📄 Page Performance</h3>
            <table>
                <thead>
                    <tr><th>Page</th><th>Performance</th><th>Accessibility</th><th>Best Practices</th><th>SEO</th></tr>
                </thead>
                <tbody>
                    ${Object.entries(analysis.pages).map(([name, page]) => `
                        <tr>
                            <td>${name}</td>
                            <td class="${this.getScoreClass(page.scores.performance)}">${page.scores.performance.toFixed(1)}</td>
                            <td class="${this.getScoreClass(page.scores.accessibility)}">${page.scores.accessibility.toFixed(1)}</td>
                            <td class="${this.getScoreClass(page.scores.bestPractices)}">${page.scores.bestPractices.toFixed(1)}</td>
                            <td class="${this.getScoreClass(page.scores.seo)}">${page.scores.seo.toFixed(1)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>`;
  }

  getScoreClass(score) {
    if (score >= 90) return 'good';
    if (score >= 50) return 'needs-improvement';
    return 'poor';
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const reporter = new PerformanceReporter();
  reporter.generateReport();
}