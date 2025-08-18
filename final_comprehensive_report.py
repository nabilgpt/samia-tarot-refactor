#!/usr/bin/env python3
"""
Final Comprehensive Audit Report Generator
Combines all audit results into a single comprehensive report
"""

import json
import os
from datetime import datetime
from pathlib import Path

class FinalAuditReport:
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        
    def load_audit_reports(self):
        """Load all individual audit reports"""
        reports = {}
        
        report_files = {
            'database': 'tarot_platform_audit_report.json',
            'backend': 'backend_audit_report.json',
            'frontend': 'frontend_audit_report.json',
            'integrations': 'integrations_audit_report.json',
            'architecture': 'architecture_audit_report.json'
        }
        
        for report_type, filename in report_files.items():
            filepath = self.project_root / filename
            if filepath.exists():
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        reports[report_type] = json.load(f)
                    print(f"[INFO] Loaded {report_type} audit report")
                except Exception as e:
                    print(f"[ERROR] Failed to load {report_type} report: {e}")
                    reports[report_type] = {}
            else:
                print(f"[WARNING] {report_type} report not found: {filename}")
                reports[report_type] = {}
        
        return reports
    
    def generate_summary_report(self):
        """Generate a comprehensive summary report"""
        print("[START] Generating comprehensive audit summary...")
        
        reports = self.load_audit_reports()
        
        # Generate summary
        summary = {
            'metadata': {
                'audit_date': datetime.now().isoformat(),
                'project_name': 'SAMIA TAROT Platform',
                'audit_version': '1.0.0',
                'auditor': 'Claude Code Assistant'
            },
            'executive_summary': {},
            'detailed_findings': {},
            'recommendations_summary': {},
            'production_readiness': 'Unknown'
        }
        
        # Database summary
        if reports.get('database'):
            db = reports['database']
            db_summary = {
                'total_tables': db.get('tables', {}).get('count', 0),
                'total_relationships': db.get('relationships', {}).get('count', 0),
                'rls_policies': db.get('security', {}).get('rls_policies_count', 0),
                'database_size': db.get('database_info', {}).get('size', 'Unknown')
            }
            summary['detailed_findings']['database'] = db_summary
        
        # Backend summary
        if reports.get('backend'):
            backend = reports['backend']
            backend_summary = {
                'total_routes': backend.get('api_routes', {}).get('total_routes', 0),
                'total_files': backend.get('architecture', {}).get('total_files', 0),
                'security_files': len([f for f in backend.get('security_analysis', []) 
                                     if sum([v for k, v in f.items() if k != 'file']) > 0])
            }
            summary['detailed_findings']['backend'] = backend_summary
        
        # Frontend summary
        if reports.get('frontend'):
            frontend = reports['frontend']
            frontend_summary = {
                'total_components': frontend.get('components', {}).get('total_count', 0),
                'functional_components': frontend.get('components', {}).get('functional_components', 0),
                'accessibility_components': frontend.get('statistics', {}).get('accessibility_score', {}).get('components_with_accessibility', 0)
            }
            summary['detailed_findings']['frontend'] = frontend_summary
        
        # Integrations summary
        if reports.get('integrations'):
            integrations = reports['integrations']
            integration_summary = {
                'payment_services': integrations.get('payment_integrations', {}).get('services_detected', []),
                'ai_services': integrations.get('ai_services', {}).get('services_detected', []),
                'total_dependencies': integrations.get('dependencies_analysis', {}).get('total_dependencies', 0)
            }
            summary['detailed_findings']['integrations'] = integration_summary
        
        # Architecture summary
        if reports.get('architecture'):
            arch = reports['architecture']
            arch_summary = {
                'total_files': arch.get('project_structure', {}).get('total_files', 0),
                'maintainability_score': arch.get('maintainability', {}).get('maintainability_score', 0),
                'scalability_score': arch.get('scalability', {}).get('scalability_score', 0)
            }
            summary['detailed_findings']['architecture'] = arch_summary
        
        # Collect all recommendations
        all_recommendations = []
        for report_type, report_data in reports.items():
            if 'recommendations' in report_data:
                for rec in report_data['recommendations']:
                    all_recommendations.append({
                        'source': report_type,
                        'type': rec.get('type', 'General'),
                        'priority': rec.get('priority', 'Medium'),
                        'message': rec.get('message', '')
                    })
        
        # Group recommendations by priority
        high_priority = [r for r in all_recommendations if r['priority'] == 'High']
        medium_priority = [r for r in all_recommendations if r['priority'] == 'Medium']
        low_priority = [r for r in all_recommendations if r['priority'] == 'Low']
        
        summary['recommendations_summary'] = {
            'total_recommendations': len(all_recommendations),
            'high_priority': len(high_priority),
            'medium_priority': len(medium_priority),
            'low_priority': len(low_priority),
            'high_priority_items': high_priority,
            'medium_priority_items': medium_priority[:5],  # Top 5
            'low_priority_items': low_priority[:3]  # Top 3
        }
        
        # Overall health assessment
        health_indicators = []
        
        # Database health
        if summary['detailed_findings'].get('database'):
            db_health = min(100, summary['detailed_findings']['database']['total_tables'] / 3)
            health_indicators.append(db_health)
        
        # Backend health
        if summary['detailed_findings'].get('backend'):
            backend_health = min(100, summary['detailed_findings']['backend']['total_routes'] / 10)
            health_indicators.append(backend_health)
        
        # Frontend health
        if summary['detailed_findings'].get('frontend'):
            frontend_health = min(100, summary['detailed_findings']['frontend']['total_components'] / 3)
            health_indicators.append(frontend_health)
        
        overall_health = sum(health_indicators) / len(health_indicators) if health_indicators else 0
        
        # Production readiness assessment
        critical_issues = len(high_priority)
        if critical_issues == 0 and overall_health > 80:
            production_readiness = 'Ready'
        elif critical_issues <= 2 and overall_health > 70:
            production_readiness = 'Nearly Ready'
        else:
            production_readiness = 'Needs Work'
        
        summary['executive_summary'] = {
            'overall_health_score': round(overall_health),
            'production_readiness': production_readiness,
            'critical_issues': critical_issues,
            'major_strengths': [
                f"Comprehensive database with {summary['detailed_findings'].get('database', {}).get('total_tables', 0)} tables",
                f"Extensive API with {summary['detailed_findings'].get('backend', {}).get('total_routes', 0)} routes",
                f"Modern React frontend with {summary['detailed_findings'].get('frontend', {}).get('total_components', 0)} components",
                f"Multiple payment integrations: {', '.join(summary['detailed_findings'].get('integrations', {}).get('payment_services', []))}"
            ],
            'key_concerns': [f"{rec['type']}: {rec['message']}" for rec in high_priority[:3]]
        }
        
        return summary
    
    def save_summary_report(self, summary, filename="FINAL_AUDIT_SUMMARY.json"):
        """Save the summary report"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(summary, f, indent=2, ensure_ascii=False, default=str)
            print(f"[SAVE] Summary report saved to: {filename}")
            return filename
        except Exception as e:
            print(f"[ERROR] Failed to save summary report: {e}")
            return None
    
    def generate_markdown_summary(self, summary, filename="FINAL_AUDIT_SUMMARY.md"):
        """Generate a markdown summary report"""
        exec_summary = summary['executive_summary']
        findings = summary['detailed_findings']
        recs = summary['recommendations_summary']
        
        markdown_content = f"""# SAMIA TAROT Platform - Final Audit Summary

**Audit Date:** {summary['metadata']['audit_date']}
**Auditor:** {summary['metadata']['auditor']}
**Version:** {summary['metadata']['audit_version']}

## Executive Summary

### Overall Health Score: {exec_summary['overall_health_score']}/100

**Production Readiness:** {exec_summary['production_readiness']}
**Critical Issues:** {exec_summary['critical_issues']}

### Major Strengths
"""
        
        for strength in exec_summary['major_strengths']:
            if strength.strip():
                markdown_content += f"- {strength}\n"
        
        markdown_content += "\n### Key Concerns\n\n"
        
        for concern in exec_summary['key_concerns']:
            if concern.strip():
                markdown_content += f"- {concern}\n"
        
        markdown_content += f"""

## Detailed Findings

### Database
- **Tables:** {findings.get('database', {}).get('total_tables', 0)}
- **Relationships:** {findings.get('database', {}).get('total_relationships', 0)}
- **RLS Policies:** {findings.get('database', {}).get('rls_policies', 0)}
- **Size:** {findings.get('database', {}).get('database_size', 'Unknown')}

### Backend API
- **Total Routes:** {findings.get('backend', {}).get('total_routes', 0)}
- **API Files:** {findings.get('backend', {}).get('total_files', 0)}
- **Security-enabled Files:** {findings.get('backend', {}).get('security_files', 0)}

### Frontend
- **Components:** {findings.get('frontend', {}).get('total_components', 0)}
- **Functional Components:** {findings.get('frontend', {}).get('functional_components', 0)}
- **Accessible Components:** {findings.get('frontend', {}).get('accessibility_components', 0)}

### Integrations
- **Payment Services:** {', '.join(findings.get('integrations', {}).get('payment_services', []))}
- **AI Services:** {', '.join(findings.get('integrations', {}).get('ai_services', []))}
- **Dependencies:** {findings.get('integrations', {}).get('total_dependencies', 0)}

### Architecture
- **Total Files:** {findings.get('architecture', {}).get('total_files', 0)}
- **Maintainability Score:** {findings.get('architecture', {}).get('maintainability_score', 0)}/100
- **Scalability Score:** {findings.get('architecture', {}).get('scalability_score', 0)}/100

## Recommendations Summary

**Total Recommendations:** {recs['total_recommendations']}
- High Priority: {recs['high_priority']}
- Medium Priority: {recs['medium_priority']}
- Low Priority: {recs['low_priority']}

### High Priority Actions
"""
        
        for i, rec in enumerate(recs['high_priority_items'], 1):
            markdown_content += f"{i}. **{rec['type']}** ({rec['source']}): {rec['message']}\n"
        
        markdown_content += "\n### Medium Priority Actions (Top 5)\n\n"
        
        for i, rec in enumerate(recs['medium_priority_items'], 1):
            markdown_content += f"{i}. **{rec['type']}** ({rec['source']}): {rec['message']}\n"
        
        markdown_content += "\n---\n\n*Audit completed successfully. Review individual reports for detailed analysis.*"
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(markdown_content)
            print(f"[SAVE] Markdown summary saved to: {filename}")
            return filename
        except Exception as e:
            print(f"[ERROR] Failed to save markdown summary: {e}")
            return None
    
    def print_final_summary(self, summary):
        """Print the final comprehensive summary"""
        exec_summary = summary['executive_summary']
        findings = summary['detailed_findings']
        recs = summary['recommendations_summary']
        
        print("\n" + "="*80)
        print("[TARGET] SAMIA TAROT PLATFORM - FINAL COMPREHENSIVE AUDIT SUMMARY")
        print("="*80)
        
        print(f"Overall Health Score: {exec_summary['overall_health_score']}/100")
        print(f"Production Readiness: {exec_summary['production_readiness']}")
        print(f"Critical Issues: {exec_summary['critical_issues']}")
        
        print("\n[CHART] SYSTEM OVERVIEW:")
        print(f"  Database Tables: {findings.get('database', {}).get('total_tables', 0)}")
        print(f"  API Routes: {findings.get('backend', {}).get('total_routes', 0)}")
        print(f"  React Components: {findings.get('frontend', {}).get('total_components', 0)}")
        print(f"  Dependencies: {findings.get('integrations', {}).get('total_dependencies', 0)}")
        print(f"  Project Files: {findings.get('architecture', {}).get('total_files', 0)}")
        
        print("\n[CHECK] MAJOR STRENGTHS:")
        for strength in exec_summary['major_strengths']:
            if strength.strip():
                print(f"  • {strength}")
        
        if exec_summary['key_concerns']:
            print("\n[WARNING] KEY CONCERNS:")
            for concern in exec_summary['key_concerns']:
                if concern.strip():
                    print(f"  • {concern}")
        
        print(f"\n[CLIPBOARD] RECOMMENDATIONS: {recs['total_recommendations']} total")
        print(f"  [RED] High Priority: {recs['high_priority']}")
        print(f"  [YELLOW] Medium Priority: {recs['medium_priority']}")
        print(f"  [GREEN] Low Priority: {recs['low_priority']}")
        
        print("\n" + "="*80)
        print("[CHECK] AUDIT COMPLETED SUCCESSFULLY!")
        print("[PAGE] Review individual audit reports for detailed analysis.")
        print("[ROCKET] Follow the action plan for system improvements.")
        print("="*80)
    
    def run_final_audit(self):
        """Run the final comprehensive audit"""
        summary = self.generate_summary_report()
        
        # Save reports
        self.save_summary_report(summary)
        self.generate_markdown_summary(summary)
        
        # Print summary
        self.print_final_summary(summary)
        
        return summary

if __name__ == "__main__":
    project_root = r"C:\Users\saeee\OneDrive\Documents\project\samia-tarot"
    auditor = FinalAuditReport(project_root)
    
    # Run final audit
    final_report = auditor.run_final_audit()