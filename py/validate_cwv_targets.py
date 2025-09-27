#!/usr/bin/env python3

"""
M36 — Core Web Vitals Target Validation
Validates that all p75 targets meet the specified thresholds
"""

import json
import sys
import os
from pathlib import Path
import subprocess
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# M36 p75 targets
P75_TARGETS = {
    'LCP': 2500,  # ≤ 2.5s
    'INP': 200,   # ≤ 200ms 
    'CLS': 0.1,   # ≤ 0.1
    'FCP': 1800,  # ≤ 1.8s (supplementary)
    'TTFB': 800   # ≤ 800ms (supplementary)
}

class CWVTargetValidator:
    def __init__(self):
        self.results_dir = Path('./lighthouse-results')
        self.cwv_results_file = Path('./cwv_synthetic_results.json')
        self.performance_reports_dir = Path('./performance-reports')
        self.validation_results = {
            'timestamp': None,
            'lighthouse_validation': None,
            'synthetic_validation': None,
            'overall_compliance': False,
            'failed_pages': [],
            'recommendations': []
        }

    def run_lighthouse_if_needed(self):
        """Run Lighthouse CI if no recent results exist"""
        if not self.results_dir.exists() or not list(self.results_dir.glob('*-report.json')):
            logger.info("No Lighthouse results found, running Lighthouse CI...")
            try:
                subprocess.run(['npm', 'run', 'lighthouse:ci'], check=True, capture_output=True)
                logger.info("Lighthouse CI completed successfully")
            except subprocess.CalledProcessError as e:
                logger.error(f"Lighthouse CI failed: {e}")
                return False
        return True

    def run_synthetic_monitoring_if_needed(self):
        """Run synthetic monitoring if no recent results exist"""
        if not self.cwv_results_file.exists():
            logger.info("No synthetic monitoring results found, running CWV monitors...")
            try:
                subprocess.run(['python', 'cwv_synthetic_monitors.py'], check=True, capture_output=True)
                logger.info("Synthetic monitoring completed successfully")
            except subprocess.CalledProcessError as e:
                logger.error(f"Synthetic monitoring failed: {e}")
                return False
        return True

    def validate_lighthouse_results(self):
        """Validate Lighthouse results against p75 targets"""
        if not self.results_dir.exists():
            logger.error("Lighthouse results directory not found")
            return False

        # Find most recent Lighthouse reports
        report_files = list(self.results_dir.glob('*-report.json'))
        if not report_files:
            logger.error("No Lighthouse report files found")
            return False

        validation_results = {
            'pages_tested': 0,
            'pages_compliant': 0,
            'metrics_compliance': {metric: {'passed': 0, 'total': 0} for metric in P75_TARGETS},
            'failed_pages': []
        }

        for report_file in sorted(report_files)[-6:]:  # Last 6 reports (one per URL)
            try:
                with open(report_file, 'r') as f:
                    report = json.load(f)
                
                url = report.get('finalUrl', report.get('requestedUrl', str(report_file)))
                audits = report.get('audits', {})
                
                validation_results['pages_tested'] += 1
                page_compliant = True
                page_failures = []

                # Check each metric
                for metric, target in P75_TARGETS.items():
                    audit_key = {
                        'LCP': 'largest-contentful-paint',
                        'INP': 'interaction-to-next-paint',
                        'CLS': 'cumulative-layout-shift',
                        'FCP': 'first-contentful-paint',
                        'TTFB': 'server-response-time'
                    }.get(metric)

                    if audit_key and audit_key in audits:
                        value = audits[audit_key].get('numericValue', 0)
                        validation_results['metrics_compliance'][metric]['total'] += 1
                        
                        if value <= target:
                            validation_results['metrics_compliance'][metric]['passed'] += 1
                        else:
                            page_compliant = False
                            page_failures.append(f"{metric}: {value:.0f} > {target}")

                if page_compliant:
                    validation_results['pages_compliant'] += 1
                else:
                    validation_results['failed_pages'].append({
                        'url': url,
                        'failures': page_failures
                    })

            except Exception as e:
                logger.error(f"Failed to process Lighthouse report {report_file}: {e}")

        self.validation_results['lighthouse_validation'] = validation_results
        
        # Overall compliance check
        overall_compliant = validation_results['pages_compliant'] == validation_results['pages_tested']
        
        logger.info(f"Lighthouse Validation Results:")
        logger.info(f"  Pages tested: {validation_results['pages_tested']}")
        logger.info(f"  Pages compliant: {validation_results['pages_compliant']}")
        logger.info(f"  Overall compliance: {'✅ PASS' if overall_compliant else '❌ FAIL'}")
        
        for metric, compliance in validation_results['metrics_compliance'].items():
            if compliance['total'] > 0:
                rate = (compliance['passed'] / compliance['total']) * 100
                logger.info(f"  {metric} compliance: {compliance['passed']}/{compliance['total']} ({rate:.1f}%)")

        return overall_compliant

    def validate_synthetic_results(self):
        """Validate synthetic monitoring results against p75 targets"""
        if not self.cwv_results_file.exists():
            logger.error("Synthetic monitoring results not found")
            return False

        try:
            with open(self.cwv_results_file, 'r') as f:
                data = json.load(f)
            
            reports = data.get('reports', {})
            if not reports:
                logger.error("No synthetic monitoring reports found")
                return False

            validation_results = {
                'pages_tested': len(reports),
                'pages_compliant': 0,
                'metrics_compliance': {metric: {'passed': 0, 'total': 0} for metric in P75_TARGETS},
                'failed_pages': []
            }

            for page_path, report in reports.items():
                metrics = report.get('metrics', {})
                page_compliant = True
                page_failures = []

                for metric, target in P75_TARGETS.items():
                    metric_key = metric.lower()
                    if metric_key in metrics and 'p75' in metrics[metric_key]:
                        p75_value = metrics[metric_key]['p75']
                        validation_results['metrics_compliance'][metric]['total'] += 1
                        
                        if p75_value <= target:
                            validation_results['metrics_compliance'][metric]['passed'] += 1
                        else:
                            page_compliant = False
                            page_failures.append(f"{metric} p75: {p75_value:.1f} > {target}")

                if page_compliant:
                    validation_results['pages_compliant'] += 1
                else:
                    validation_results['failed_pages'].append({
                        'url': report.get('url', page_path),
                        'failures': page_failures
                    })

            self.validation_results['synthetic_validation'] = validation_results
            
            overall_compliant = validation_results['pages_compliant'] == validation_results['pages_tested']
            
            logger.info(f"Synthetic Monitoring Validation Results:")
            logger.info(f"  Pages tested: {validation_results['pages_tested']}")
            logger.info(f"  Pages compliant: {validation_results['pages_compliant']}")
            logger.info(f"  Overall compliance: {'✅ PASS' if overall_compliant else '❌ FAIL'}")
            
            for metric, compliance in validation_results['metrics_compliance'].items():
                if compliance['total'] > 0:
                    rate = (compliance['passed'] / compliance['total']) * 100
                    logger.info(f"  {metric} p75 compliance: {compliance['passed']}/{compliance['total']} ({rate:.1f}%)")

            return overall_compliant

        except Exception as e:
            logger.error(f"Failed to validate synthetic results: {e}")
            return False

    def generate_recommendations(self):
        """Generate optimization recommendations based on validation results"""
        recommendations = []
        
        # Collect all failed pages
        all_failed_pages = []
        if self.validation_results['lighthouse_validation']:
            all_failed_pages.extend(self.validation_results['lighthouse_validation']['failed_pages'])
        if self.validation_results['synthetic_validation']:
            all_failed_pages.extend(self.validation_results['synthetic_validation']['failed_pages'])

        # Analyze common failure patterns
        metric_failures = {}
        for page in all_failed_pages:
            for failure in page['failures']:
                metric = failure.split(':')[0]
                if metric not in metric_failures:
                    metric_failures[metric] = 0
                metric_failures[metric] += 1

        # Generate specific recommendations
        for metric, count in metric_failures.items():
            if metric == 'LCP' and count > 0:
                recommendations.append({
                    'metric': 'LCP',
                    'priority': 'HIGH',
                    'action': 'Optimize Largest Contentful Paint',
                    'suggestions': [
                        'Preload critical images and fonts',
                        'Implement CDN for static assets',
                        'Optimize server response time (TTFB)',
                        'Remove render-blocking CSS/JS',
                        'Use next-gen image formats (WebP, AVIF)'
                    ]
                })
            
            elif metric == 'INP' and count > 0:
                recommendations.append({
                    'metric': 'INP',
                    'priority': 'HIGH',
                    'action': 'Reduce Interaction to Next Paint',
                    'suggestions': [
                        'Break up long JavaScript tasks',
                        'Implement code splitting for heavy components',
                        'Use React.lazy for non-critical routes',
                        'Debounce frequent interactions',
                        'Reduce main thread work'
                    ]
                })
            
            elif metric == 'CLS' and count > 0:
                recommendations.append({
                    'metric': 'CLS',
                    'priority': 'MEDIUM',
                    'action': 'Prevent Cumulative Layout Shift',
                    'suggestions': [
                        'Set explicit dimensions for images and videos',
                        'Reserve space for dynamic content',
                        'Use font-display: swap for web fonts',
                        'Avoid inserting content above existing content',
                        'Implement skeleton screens for loading states'
                    ]
                })

        self.validation_results['recommendations'] = recommendations
        return recommendations

    def save_validation_report(self):
        """Save detailed validation report"""
        import time
        self.validation_results['timestamp'] = time.time()
        
        # Determine overall compliance
        lighthouse_compliant = (
            self.validation_results['lighthouse_validation'] and
            self.validation_results['lighthouse_validation']['pages_compliant'] == 
            self.validation_results['lighthouse_validation']['pages_tested']
        )
        
        synthetic_compliant = (
            self.validation_results['synthetic_validation'] and
            self.validation_results['synthetic_validation']['pages_compliant'] == 
            self.validation_results['synthetic_validation']['pages_tested']
        )
        
        self.validation_results['overall_compliance'] = lighthouse_compliant and synthetic_compliant
        
        # Save report
        report_file = 'cwv_validation_report.json'
        with open(report_file, 'w') as f:
            json.dump(self.validation_results, f, indent=2)
        
        logger.info(f"Validation report saved to {report_file}")

    def print_summary(self):
        """Print validation summary"""
        print("\n" + "="*60)
        print("🎯 M36 Core Web Vitals Target Validation Summary")
        print("="*60)
        
        print(f"Overall Compliance: {'✅ PASS' if self.validation_results['overall_compliance'] else '❌ FAIL'}")
        
        if self.validation_results['lighthouse_validation']:
            lh = self.validation_results['lighthouse_validation']
            print(f"\nLighthouse Results:")
            print(f"  Pages compliant: {lh['pages_compliant']}/{lh['pages_tested']}")
            
        if self.validation_results['synthetic_validation']:
            syn = self.validation_results['synthetic_validation']
            print(f"\nSynthetic Monitoring Results:")
            print(f"  Pages compliant: {syn['pages_compliant']}/{syn['pages_tested']}")
        
        # Print targets
        print(f"\nTarget Thresholds (p75):")
        for metric, target in P75_TARGETS.items():
            unit = 'ms' if metric != 'CLS' else ''
            print(f"  {metric}: ≤ {target}{unit}")
        
        # Print recommendations
        recommendations = self.validation_results.get('recommendations', [])
        if recommendations:
            print(f"\n🚀 Optimization Recommendations:")
            for rec in recommendations:
                print(f"  {rec['priority']} - {rec['action']} ({rec['metric']})")
                for suggestion in rec['suggestions'][:2]:  # Show top 2
                    print(f"    • {suggestion}")
        
        print("\n" + "="*60)

    def run_validation(self):
        """Run complete validation process"""
        logger.info("Starting M36 Core Web Vitals validation...")
        
        # Ensure we have data
        if not self.run_lighthouse_if_needed():
            logger.error("Failed to get Lighthouse data")
            return False
            
        if not self.run_synthetic_monitoring_if_needed():
            logger.error("Failed to get synthetic monitoring data")
            return False
        
        # Run validations
        lighthouse_valid = self.validate_lighthouse_results()
        synthetic_valid = self.validate_synthetic_results()
        
        # Generate recommendations
        self.generate_recommendations()
        
        # Save report
        self.save_validation_report()
        
        # Print summary
        self.print_summary()
        
        # Return overall compliance
        return self.validation_results['overall_compliance']

def main():
    """Main execution"""
    validator = CWVTargetValidator()
    
    try:
        is_compliant = validator.run_validation()
        
        if is_compliant:
            logger.info("✅ All Core Web Vitals targets met!")
            return 0
        else:
            logger.error("❌ Some Core Web Vitals targets not met. Check validation report.")
            return 1
            
    except Exception as e:
        logger.error(f"Validation failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())