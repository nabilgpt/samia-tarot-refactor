#!/usr/bin/env python3

"""
M36 — Core Web Vitals Synthetic Monitors
Comprehensive CWV monitoring aligned with RUM data and p75 targets
"""

import asyncio
import json
import time
import statistics
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Any
from playwright.async_api import async_playwright, Page, Browser
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Core Web Vitals targets (p75)
CWV_TARGETS = {
    'LCP': 2500,    # Largest Contentful Paint ≤ 2.5s
    'INP': 200,     # Interaction to Next Paint ≤ 200ms
    'CLS': 0.1,     # Cumulative Layout Shift ≤ 0.1
    'FCP': 1800,    # First Contentful Paint ≤ 1.8s
    'TTFB': 800     # Time to First Byte ≤ 800ms
}

@dataclass
class CWVMetrics:
    """Core Web Vitals measurement data"""
    url: str
    timestamp: float
    lcp: Optional[float] = None
    inp: Optional[float] = None
    cls: Optional[float] = None
    fcp: Optional[float] = None
    ttfb: Optional[float] = None
    si: Optional[float] = None  # Speed Index
    tbt: Optional[float] = None  # Total Blocking Time
    errors: List[str] = None
    
    def __post_init__(self):
        if self.errors is None:
            self.errors = []

@dataclass
class CWVReport:
    """Aggregated CWV report with compliance status"""
    url: str
    total_runs: int
    metrics: Dict[str, Dict[str, float]]  # metric -> {p50, p75, p95, avg}
    compliance: Dict[str, bool]  # metric -> passes_p75_target
    recommendations: List[str]
    rum_alignment_score: float  # How well synthetics align with RUM

class CWVSyntheticMonitor:
    def __init__(self, base_url: str = "http://localhost:5173"):
        self.base_url = base_url
        self.browser: Optional[Browser] = None
        self.metrics_history: List[CWVMetrics] = []
        
        # Critical pages for monitoring
        self.pages = [
            "/",                    # Home page (critical for LCP)
            "/auth/login",          # Login flow (critical for INP)
            "/booking",             # Booking flow (critical for all metrics)
            "/dashboard",           # Dashboard (heavy, critical for CLS)
            "/chat",               # Real-time interface (critical for INP)
            "/daily-horoscope"     # Content page (critical for LCP/CLS)
        ]

    async def start_browser(self):
        """Initialize browser with performance monitoring"""
        playwright = await async_playwright().start()
        
        # Use realistic user agent and settings
        self.browser = await playwright.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-gpu',
                '--enable-precise-memory-info',
                '--enable-experimental-web-platform-features'
            ]
        )
        
        logger.info("Browser started for CWV monitoring")

    async def measure_cwv_for_page(self, page_path: str, runs: int = 5) -> List[CWVMetrics]:
        """Measure Core Web Vitals for a specific page multiple times"""
        url = f"{self.base_url}{page_path}"
        results = []
        
        for run in range(runs):
            logger.info(f"Measuring CWV for {url} - Run {run + 1}/{runs}")
            
            try:
                # Create new page for each run to ensure clean state
                page = await self.browser.new_page()
                
                # Enable performance monitoring
                await page.add_init_script("""
                    window.cwvMetrics = {
                        lcp: null,
                        inp: null,
                        cls: null,
                        fcp: null,
                        ttfb: null
                    };
                    
                    // LCP measurement
                    new PerformanceObserver((entryList) => {
                        for (const entry of entryList.getEntries()) {
                            window.cwvMetrics.lcp = entry.startTime;
                        }
                    }).observe({entryTypes: ['largest-contentful-paint']});
                    
                    // CLS measurement
                    let clsValue = 0;
                    new PerformanceObserver((entryList) => {
                        for (const entry of entryList.getEntries()) {
                            if (!entry.hadRecentInput) {
                                clsValue += entry.value;
                            }
                        }
                        window.cwvMetrics.cls = clsValue;
                    }).observe({entryTypes: ['layout-shift']});
                    
                    // FCP measurement
                    new PerformanceObserver((entryList) => {
                        for (const entry of entryList.getEntries()) {
                            if (entry.name === 'first-contentful-paint') {
                                window.cwvMetrics.fcp = entry.startTime;
                            }
                        }
                    }).observe({entryTypes: ['paint']});
                    
                    // INP measurement (simplified)
                    let maxINP = 0;
                    ['click', 'keydown', 'input'].forEach(type => {
                        document.addEventListener(type, (e) => {
                            const start = performance.now();
                            requestAnimationFrame(() => {
                                const inp = performance.now() - start;
                                maxINP = Math.max(maxINP, inp);
                                window.cwvMetrics.inp = maxINP;
                            });
                        }, {passive: true});
                    });
                """)
                
                # Navigate and measure TTFB
                navigation_start = time.time() * 1000
                await page.goto(url, wait_until='networkidle')
                navigation_end = time.time() * 1000
                
                # Wait for page to stabilize
                await page.wait_for_timeout(2000)
                
                # Simulate user interactions for INP measurement
                await self.simulate_interactions(page, page_path)
                
                # Wait for metrics to be captured
                await page.wait_for_timeout(1000)
                
                # Extract metrics
                metrics = await page.evaluate("window.cwvMetrics")
                navigation_timing = await page.evaluate("""
                    {
                        ttfb: performance.timing.responseStart - performance.timing.navigationStart,
                        loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart
                    }
                """)
                
                # Get additional performance metrics
                performance_entries = await page.evaluate("""
                    performance.getEntriesByType('navigation')[0]
                """)
                
                result = CWVMetrics(
                    url=url,
                    timestamp=time.time(),
                    lcp=metrics.get('lcp'),
                    inp=metrics.get('inp'),
                    cls=metrics.get('cls'),
                    fcp=metrics.get('fcp'),
                    ttfb=navigation_timing.get('ttfb'),
                    si=performance_entries.get('domContentLoadedEventEnd', 0) - performance_entries.get('fetchStart', 0),
                    tbt=self.calculate_tbt(performance_entries)
                )
                
                results.append(result)
                logger.info(f"Run {run + 1} completed: LCP={result.lcp:.0f}ms, CLS={result.cls:.3f}, TTFB={result.ttfb:.0f}ms")
                
                await page.close()
                
            except Exception as e:
                error_msg = f"Failed to measure CWV for {url} on run {run + 1}: {str(e)}"
                logger.error(error_msg)
                
                result = CWVMetrics(
                    url=url,
                    timestamp=time.time(),
                    errors=[error_msg]
                )
                results.append(result)
                
                if 'page' in locals():
                    await page.close()
            
            # Brief delay between runs
            await asyncio.sleep(1)
        
        return results

    async def simulate_interactions(self, page: Page, page_path: str):
        """Simulate realistic user interactions based on page type"""
        try:
            if page_path == "/":
                # Home page interactions
                await page.click('button', timeout=1000)
                await page.click('a[href*="login"]', timeout=1000)
                
            elif page_path == "/auth/login":
                # Login form interactions
                await page.fill('input[type="email"]', 'test@example.com', timeout=1000)
                await page.fill('input[type="password"]', 'password123', timeout=1000)
                
            elif page_path == "/booking":
                # Booking flow interactions
                await page.click('select', timeout=1000)
                await page.click('button[type="submit"]', timeout=1000)
                
            elif page_path == "/dashboard":
                # Dashboard interactions
                await page.click('.card', timeout=1000)
                await page.scroll(0, 500)
                
            elif page_path == "/chat":
                # Chat interface interactions
                await page.fill('input[type="text"]', 'Hello test message', timeout=1000)
                await page.press('input[type="text"]', 'Enter', timeout=1000)
                
        except Exception as e:
            logger.debug(f"Interaction simulation failed for {page_path}: {str(e)}")

    def calculate_tbt(self, performance_entry: Dict) -> float:
        """Calculate Total Blocking Time"""
        try:
            # Simplified TBT calculation
            dom_content_loaded = performance_entry.get('domContentLoadedEventEnd', 0)
            fetch_start = performance_entry.get('fetchStart', 0)
            return max(0, dom_content_loaded - fetch_start - 50)  # Tasks > 50ms are blocking
        except:
            return 0

    def calculate_percentiles(self, values: List[float]) -> Dict[str, float]:
        """Calculate p50, p75, p95 percentiles"""
        if not values:
            return {'p50': 0, 'p75': 0, 'p95': 0, 'avg': 0}
        
        sorted_values = sorted(values)
        return {
            'p50': statistics.median(sorted_values),
            'p75': statistics.quantiles(sorted_values, n=4)[2] if len(sorted_values) >= 4 else sorted_values[-1],
            'p95': statistics.quantiles(sorted_values, n=20)[18] if len(sorted_values) >= 20 else sorted_values[-1],
            'avg': statistics.mean(sorted_values)
        }

    def assess_compliance(self, metrics: Dict[str, Dict[str, float]]) -> Dict[str, bool]:
        """Check compliance against p75 targets"""
        compliance = {}
        
        for metric, targets in CWV_TARGETS.items():
            metric_key = metric.lower()
            if metric_key in metrics:
                p75_value = metrics[metric_key]['p75']
                compliance[metric] = p75_value <= targets
            else:
                compliance[metric] = False
        
        return compliance

    def generate_recommendations(self, report: CWVReport) -> List[str]:
        """Generate optimization recommendations based on results"""
        recommendations = []
        
        # LCP recommendations
        if not report.compliance.get('LCP', False):
            lcp_p75 = report.metrics.get('lcp', {}).get('p75', 0)
            if lcp_p75 > 4000:
                recommendations.append("CRITICAL: LCP > 4s - Optimize images, reduce server response time, eliminate render-blocking resources")
            elif lcp_p75 > 2500:
                recommendations.append("LCP > 2.5s - Preload critical resources, optimize images, implement CDN")
        
        # INP recommendations
        if not report.compliance.get('INP', False):
            inp_p75 = report.metrics.get('inp', {}).get('p75', 0)
            if inp_p75 > 500:
                recommendations.append("CRITICAL: INP > 500ms - Break up long tasks, optimize event handlers, reduce main thread work")
            elif inp_p75 > 200:
                recommendations.append("INP > 200ms - Implement code splitting, defer non-critical JS, optimize interactions")
        
        # CLS recommendations
        if not report.compliance.get('CLS', False):
            cls_p75 = report.metrics.get('cls', {}).get('p75', 0)
            if cls_p75 > 0.25:
                recommendations.append("CRITICAL: CLS > 0.25 - Set explicit dimensions, preload fonts, avoid DOM insertions")
            elif cls_p75 > 0.1:
                recommendations.append("CLS > 0.1 - Stabilize image dimensions, optimize font loading, reserve space for dynamic content")
        
        # General recommendations
        ttfb_p75 = report.metrics.get('ttfb', {}).get('p75', 0)
        if ttfb_p75 > 800:
            recommendations.append("TTFB > 800ms - Optimize server response time, implement caching, use CDN")
        
        return recommendations

    def calculate_rum_alignment(self, synthetic_metrics: Dict) -> float:
        """Calculate how well synthetic results align with expected RUM patterns"""
        # Simplified alignment score based on variance
        total_variance = 0
        metric_count = 0
        
        for metric_data in synthetic_metrics.values():
            if 'p75' in metric_data and 'p95' in metric_data:
                # Lower variance indicates better synthetic consistency
                variance = (metric_data['p95'] - metric_data['p75']) / metric_data['p75']
                total_variance += variance
                metric_count += 1
        
        if metric_count == 0:
            return 0.0
        
        avg_variance = total_variance / metric_count
        # Convert to alignment score (lower variance = higher alignment)
        return max(0, 1 - (avg_variance / 2))

    async def run_comprehensive_cwv_monitoring(self) -> Dict[str, CWVReport]:
        """Run comprehensive CWV monitoring for all critical pages"""
        if not self.browser:
            await self.start_browser()
        
        reports = {}
        
        for page_path in self.pages:
            logger.info(f"Starting CWV monitoring for {page_path}")
            
            try:
                # Measure metrics multiple times for statistical significance
                measurements = await self.measure_cwv_for_page(page_path, runs=5)
                
                # Filter out failed measurements
                valid_measurements = [m for m in measurements if not m.errors]
                
                if not valid_measurements:
                    logger.error(f"No valid measurements for {page_path}")
                    continue
                
                # Aggregate metrics
                aggregated_metrics = {}
                
                for metric in ['lcp', 'inp', 'cls', 'fcp', 'ttfb', 'si', 'tbt']:
                    values = [getattr(m, metric) for m in valid_measurements if getattr(m, metric) is not None]
                    if values:
                        aggregated_metrics[metric] = self.calculate_percentiles(values)
                
                # Assess compliance
                compliance = self.assess_compliance(aggregated_metrics)
                
                # Generate report
                report = CWVReport(
                    url=f"{self.base_url}{page_path}",
                    total_runs=len(measurements),
                    metrics=aggregated_metrics,
                    compliance=compliance,
                    recommendations=self.generate_recommendations(None),  # Will be set after report creation
                    rum_alignment_score=self.calculate_rum_alignment(aggregated_metrics)
                )
                
                # Generate recommendations based on the complete report
                report.recommendations = self.generate_recommendations(report)
                
                reports[page_path] = report
                
                # Log summary
                logger.info(f"CWV Report for {page_path}:")
                logger.info(f"  LCP p75: {aggregated_metrics.get('lcp', {}).get('p75', 'N/A'):.0f}ms {'✅' if compliance.get('LCP') else '❌'}")
                logger.info(f"  INP p75: {aggregated_metrics.get('inp', {}).get('p75', 'N/A'):.0f}ms {'✅' if compliance.get('INP') else '❌'}")
                logger.info(f"  CLS p75: {aggregated_metrics.get('cls', {}).get('p75', 'N/A'):.3f} {'✅' if compliance.get('CLS') else '❌'}")
                logger.info(f"  RUM Alignment: {report.rum_alignment_score:.2f}")
                
            except Exception as e:
                logger.error(f"Failed CWV monitoring for {page_path}: {str(e)}")
        
        return reports

    async def save_results(self, reports: Dict[str, CWVReport], output_path: str = "cwv_synthetic_results.json"):
        """Save monitoring results to file"""
        serializable_reports = {}
        
        for path, report in reports.items():
            serializable_reports[path] = asdict(report)
        
        with open(output_path, 'w') as f:
            json.dump({
                'timestamp': time.time(),
                'reports': serializable_reports,
                'summary': self.generate_summary(reports)
            }, f, indent=2)
        
        logger.info(f"CWV monitoring results saved to {output_path}")

    def generate_summary(self, reports: Dict[str, CWVReport]) -> Dict:
        """Generate overall monitoring summary"""
        total_pages = len(reports)
        compliant_pages = {
            'LCP': sum(1 for r in reports.values() if r.compliance.get('LCP', False)),
            'INP': sum(1 for r in reports.values() if r.compliance.get('INP', False)),
            'CLS': sum(1 for r in reports.values() if r.compliance.get('CLS', False))
        }
        
        avg_alignment = statistics.mean([r.rum_alignment_score for r in reports.values()]) if reports else 0
        
        return {
            'total_pages': total_pages,
            'compliance_rate': {
                metric: f"{count}/{total_pages} ({(count/total_pages)*100:.1f}%)"
                for metric, count in compliant_pages.items()
            },
            'average_rum_alignment': f"{avg_alignment:.2f}",
            'overall_health': 'Good' if all(count == total_pages for count in compliant_pages.values()) else 'Needs Improvement'
        }

    async def cleanup(self):
        """Cleanup browser resources"""
        if self.browser:
            await self.browser.close()
            logger.info("Browser cleaned up")

async def main():
    """Main execution function"""
    monitor = CWVSyntheticMonitor()
    
    try:
        logger.info("🎯 Starting M36 Core Web Vitals Synthetic Monitoring")
        
        # Run comprehensive monitoring
        reports = await monitor.run_comprehensive_cwv_monitoring()
        
        # Save results
        await monitor.save_results(reports)
        
        # Print summary
        summary = monitor.generate_summary(reports)
        print("\n📊 CWV Monitoring Summary:")
        print(f"Pages monitored: {summary['total_pages']}")
        print(f"LCP compliance: {summary['compliance_rate']['LCP']}")
        print(f"INP compliance: {summary['compliance_rate']['INP']}")
        print(f"CLS compliance: {summary['compliance_rate']['CLS']}")
        print(f"RUM alignment: {summary['average_rum_alignment']}")
        print(f"Overall health: {summary['overall_health']}")
        
        # Exit with appropriate code
        if summary['overall_health'] == 'Good':
            return 0
        else:
            logger.warning("Some pages failed CWV compliance targets")
            return 1
            
    except Exception as e:
        logger.error(f"CWV monitoring failed: {str(e)}")
        return 1
    finally:
        await monitor.cleanup()

if __name__ == "__main__":
    import sys
    exit_code = asyncio.run(main())
    sys.exit(exit_code)