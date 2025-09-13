/**
 * M36 — Lighthouse CI Configuration
 * Performance hardening with median of 5 runs & Core Web Vitals targets
 */

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 5,
      median: true,
      startServerCommand: 'npm run dev',
      startServerReadyPattern: 'Local:|ready',
      startServerReadyTimeout: 30000,
      url: [
        'http://localhost:5173/',                    // Home page
        'http://localhost:5173/auth/login',          // Login page
        'http://localhost:5173/booking',             // Booking flow
        'http://localhost:5173/dashboard',           // Dashboard
        'http://localhost:5173/chat',               // Chat interface
        'http://localhost:5173/daily-horoscope',    // Daily horoscope
      ],
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage --disable-gpu',
        throttlingMethod: 'simulate',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        emulatedFormFactor: 'mobile',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0
        }
      }
    },
    upload: {
      target: 'filesystem',
      outputDir: './lighthouse-results',
      reportFilenamePattern: '%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%'
    },
    assert: {
      assertions: {
        // Core Web Vitals (p75 targets)
        'largest-contentful-paint': ['error', {maxNumericValue: 2500}],      // LCP ≤ 2.5s
        'cumulative-layout-shift': ['error', {maxNumericValue: 0.1}],        // CLS ≤ 0.1
        'max-potential-fid': ['error', {maxNumericValue: 100}],              // FID ≤ 100ms (legacy)
        'interaction-to-next-paint': ['error', {maxNumericValue: 200}],      // INP ≤ 200ms
        
        // Performance budgets
        'first-contentful-paint': ['warn', {maxNumericValue: 1800}],         // FCP ≤ 1.8s
        'speed-index': ['warn', {maxNumericValue: 3400}],                    // SI ≤ 3.4s
        'total-blocking-time': ['warn', {maxNumericValue: 200}],             // TBT ≤ 200ms
        
        // Resource budgets
        'total-byte-weight': ['warn', {maxNumericValue: 1600000}],           // Total ≤ 1.6MB
        'unused-javascript': ['warn', {maxNumericValue: 100000}],            // Unused JS ≤ 100KB
        'unused-css-rules': ['warn', {maxNumericValue: 50000}],              // Unused CSS ≤ 50KB
        'legacy-javascript': ['warn', {maxNumericValue: 50000}],             // Legacy JS ≤ 50KB
        
        // Critical rendering path
        'render-blocking-resources': ['warn', {maxNumericValue: 5}],         // RBR ≤ 5 resources
        'critical-request-chains': ['warn', {maxLength: 3}],                 // CRC ≤ 3 chains
        
        // Image optimization
        'efficient-animated-content': 'warn',
        'modern-image-formats': 'warn',
        'next-gen-images': 'warn',
        'optimized-images': 'warn',
        'properly-sized-images': 'warn',
        
        // Network efficiency
        'uses-text-compression': 'warn',
        'uses-responsive-images': 'warn',
        'preload-lcp-image': 'warn',
        'preconnect-to-required-origins': 'warn',
        
        // JavaScript performance
        'bootup-time': ['warn', {maxNumericValue: 3500}],                    // Bootup ≤ 3.5s
        'mainthread-work-breakdown': ['warn', {maxNumericValue: 4000}],      // Main thread ≤ 4s
        'third-party-summary': ['warn', {maxNumericValue: 500}],             // 3P blocking ≤ 500ms
        
        // Accessibility & UX
        'color-contrast': 'error',
        'tap-targets': 'warn',
        'aria-allowed-attr': 'error',
        'aria-required-attr': 'error',
        'image-alt': 'error',
        
        // SEO fundamentals
        'meta-description': 'warn',
        'document-title': 'error',
        'hreflang': 'warn',
        'canonical': 'warn',
        
        // Best practices
        'uses-https': 'error',
        'is-on-https': 'error',
        'no-vulnerable-libraries': 'error',
        'csp-xss': 'warn'
      }
    }
  }
};