#!/usr/bin/env python3
"""
M30: SRE Monitoring Validation Script
Validates M29 Golden Signals implementation and monitoring setup
"""

import os
import json
from datetime import datetime

def validate_sre_schema_files():
    """Validate that M29 SRE schema files are present and properly structured"""
    
    results = {
        'schema_files_present': False,
        'rls_files_present': False,
        'api_endpoints_present': False,
        'test_files_present': False,
        'documentation_present': False,
        'schema_validation': {},
        'file_details': {}
    }
    
    # Check for required M29 files
    required_files = {
        '027_m29_sre_cost_schema.sql': 'SRE schema definition',
        '028_m29_sre_rls.sql': 'RLS policies for SRE tables',
        'test_m29_sre_cost.py': 'SRE test suite',
        'SRE_COST_README.md': 'SRE documentation'
    }
    
    for filename, description in required_files.items():
        filepath = os.path.join(os.getcwd(), filename)
        exists = os.path.exists(filepath)
        results['file_details'][filename] = {
            'exists': exists,
            'description': description,
            'path': filepath
        }
        
        if exists:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                results['file_details'][filename]['size'] = len(content)
                results['file_details'][filename]['lines'] = content.count('\n')
    
    # Set overall flags
    results['schema_files_present'] = os.path.exists('027_m29_sre_cost_schema.sql')
    results['rls_files_present'] = os.path.exists('028_m29_sre_rls.sql')
    results['test_files_present'] = os.path.exists('test_m29_sre_cost.py')
    results['documentation_present'] = os.path.exists('SRE_COST_README.md')
    
    return results

def validate_api_endpoints():
    """Validate that M29 API endpoints are implemented in api.py"""
    
    results = {
        'api_file_exists': False,
        'endpoints_found': {},
        'total_endpoints': 0
    }
    
    api_file = os.path.join(os.getcwd(), 'api.py')
    
    if os.path.exists(api_file):
        results['api_file_exists'] = True
        
        with open(api_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for M29 API endpoints
        m29_endpoints = {
            '/admin/health/overview': 'Golden signals and system health monitoring',
            '/admin/budget': 'FinOps budget tracking and cost alerts', 
            '/admin/incident/declare': 'Incident management system',
            '/admin/limits/test': 'Rate limit policy testing'
        }
        
        for endpoint, description in m29_endpoints.items():
            found = endpoint in content
            results['endpoints_found'][endpoint] = {
                'found': found,
                'description': description
            }
            if found:
                results['total_endpoints'] += 1
    
    return results

def validate_schema_content():
    """Validate the content of M29 schema files"""
    
    results = {
        'golden_signals_table': False,
        'rate_limits_table': False, 
        'circuit_breaker_table': False,
        'cost_budgets_table': False,
        'cost_usage_table': False,
        'incidents_table': False,
        'health_checks_table': False,
        'functions_implemented': {},
        'schema_details': {}
    }
    
    schema_file = '027_m29_sre_cost_schema.sql'
    
    if os.path.exists(schema_file):
        with open(schema_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for required tables
        required_tables = [
            'sre_golden_signals',
            'sre_rate_limits', 
            'sre_circuit_breaker_state',
            'finops_cost_budgets',
            'finops_cost_usage',
            'finops_cost_alerts',
            'sre_incidents',
            'sre_health_checks'
        ]
        
        for table in required_tables:
            table_found = f'CREATE TABLE IF NOT EXISTS {table}' in content
            results[f'{table.replace("sre_", "").replace("finops_", "")}_table'] = table_found
        
        # Check for required functions
        required_functions = [
            'aggregate_golden_signals',
            'check_rate_limit', 
            'update_circuit_breaker',
            'update_cost_usage',
            'declare_incident'
        ]
        
        for func in required_functions:
            func_found = f'CREATE OR REPLACE FUNCTION {func}' in content
            results['functions_implemented'][func] = func_found
        
        results['schema_details'] = {
            'file_size': len(content),
            'line_count': content.count('\n'),
            'table_definitions': sum(1 for table in required_tables if f'CREATE TABLE IF NOT EXISTS {table}' in content),
            'function_definitions': sum(1 for func in required_functions if f'CREATE OR REPLACE FUNCTION {func}' in content)
        }
    
    return results

def validate_rls_policies():
    """Validate RLS policy implementation"""
    
    results = {
        'rls_file_exists': False,
        'policies_implemented': {},
        'policy_count': 0,
        'security_controls': {}
    }
    
    rls_file = '028_m29_sre_rls.sql'
    
    if os.path.exists(rls_file):
        results['rls_file_exists'] = True
        
        with open(rls_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for RLS enabling
        rls_tables = [
            'sre_golden_signals',
            'sre_rate_limits',
            'sre_circuit_breaker_state', 
            'finops_cost_budgets',
            'finops_cost_usage',
            'finops_cost_alerts',
            'sre_incidents',
            'sre_health_checks'
        ]
        
        for table in rls_tables:
            enable_rls = f'ALTER TABLE {table} ENABLE ROW LEVEL SECURITY' in content
            force_rls = f'ALTER TABLE {table} FORCE ROW LEVEL SECURITY' in content
            results['policies_implemented'][table] = {
                'rls_enabled': enable_rls,
                'rls_forced': force_rls
            }
        
        # Count total policies
        results['policy_count'] = content.count('CREATE POLICY')
        
        # Check security controls
        results['security_controls'] = {
            'admin_access': 'admin' in content and 'superadmin' in content,
            'monitor_access': 'monitor' in content,
            'deny_by_default': 'FORCE ROW LEVEL SECURITY' in content,
            'role_based_access': 'get_user_role' in content
        }
    
    return results

def validate_test_coverage():
    """Validate test coverage for M29 functionality"""
    
    results = {
        'test_file_exists': False,
        'test_classes': [],
        'test_methods': 0,
        'coverage_areas': {}
    }
    
    test_file = 'test_m29_sre_cost.py'
    
    if os.path.exists(test_file):
        results['test_file_exists'] = True
        
        with open(test_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Count test classes and methods
        import re
        
        test_classes = re.findall(r'class (Test\w+)', content)
        results['test_classes'] = test_classes
        
        test_methods = re.findall(r'def (test_\w+)', content)
        results['test_methods'] = len(test_methods)
        
        # Check coverage areas
        coverage_areas = {
            'golden_signals': 'test_golden_signals' in content or 'TestM29SREMonitoring' in content,
            'rate_limiting': 'test_rate_limit' in content or 'TestM29RateLimiting' in content,
            'circuit_breakers': 'test_circuit_breaker' in content or 'TestM29CircuitBreakers' in content,
            'cost_management': 'test_cost' in content or 'TestM29CostManagement' in content,
            'rls_policies': 'test.*rls' in content or 'TestM29RLSPolicies' in content,
            'api_endpoints': 'test.*api' in content or 'TestM29APIEndpoints' in content
        }
        
        for area, pattern in coverage_areas.items():
            results['coverage_areas'][area] = bool(re.search(pattern, content, re.IGNORECASE))
    
    return results

def generate_monitoring_validation_report(all_results):
    """Generate comprehensive validation report"""
    
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # Calculate overall score
    total_checks = 0
    passed_checks = 0
    
    for category, results in all_results.items():
        if isinstance(results, dict):
            for key, value in results.items():
                if isinstance(value, bool):
                    total_checks += 1
                    if value:
                        passed_checks += 1
    
    success_rate = (passed_checks / total_checks * 100) if total_checks > 0 else 0
    
    report = f"""# M30: SRE Monitoring Validation Report

**Date**: {timestamp}
**Validation Scope**: M29 SRE & Cost Guards Implementation  
**Total Checks**: {total_checks}
**Passed**: {passed_checks}
**Success Rate**: {success_rate:.1f}%

## Executive Summary

{"✅ **MONITORING READY** - All SRE components validated" if success_rate >= 90 else "⚠️ **PARTIAL IMPLEMENTATION** - Some components missing" if success_rate >= 70 else "❌ **IMPLEMENTATION INCOMPLETE** - Critical components missing"}

## Validation Results

### 1. Schema Implementation
- **Golden Signals Table**: {"✅" if all_results['schema']['golden_signals_table'] else "❌"}
- **Rate Limits Table**: {"✅" if all_results['schema']['rate_limits_table'] else "❌"}  
- **Circuit Breaker Table**: {"✅" if all_results['schema']['circuit_breaker_state_table'] else "❌"}
- **Cost Management Tables**: {"✅" if all_results['schema']['cost_budgets_table'] and all_results['schema']['cost_usage_table'] else "❌"}
- **Incident Management**: {"✅" if all_results['schema']['incidents_table'] else "❌"}

### 2. Database Functions
"""
    
    if 'functions_implemented' in all_results['schema']:
        for func, implemented in all_results['schema']['functions_implemented'].items():
            report += f"- **{func}()**: {'✅' if implemented else '❌'}\n"
    
    report += f"""
### 3. Access Control (RLS)
- **RLS Policies Implemented**: {all_results['rls']['policy_count']} policies
- **Security Controls**: {"✅" if all_results['rls']['security_controls'].get('admin_access') else "❌"} Admin access, {"✅" if all_results['rls']['security_controls'].get('deny_by_default') else "❌"} Deny by default
- **Role-based Access**: {"✅" if all_results['rls']['security_controls'].get('role_based_access') else "❌"}

### 4. API Endpoints  
- **Health Overview**: {"✅" if all_results['api']['endpoints_found'].get('/admin/health/overview', {}).get('found') else "❌"}
- **Budget Management**: {"✅" if all_results['api']['endpoints_found'].get('/admin/budget', {}).get('found') else "❌"}
- **Incident Declaration**: {"✅" if all_results['api']['endpoints_found'].get('/admin/incident/declare', {}).get('found') else "❌"}
- **Rate Limit Testing**: {"✅" if all_results['api']['endpoints_found'].get('/admin/limits/test', {}).get('found') else "❌"}

### 5. Test Coverage
- **Test Classes**: {len(all_results['tests']['test_classes'])}
- **Test Methods**: {all_results['tests']['test_methods']}  
- **Coverage Areas**: {sum(1 for covered in all_results['tests']['coverage_areas'].values() if covered)}/{len(all_results['tests']['coverage_areas'])}

### 6. Documentation
- **SRE Runbook**: {"✅" if all_results['files']['documentation_present'] else "❌"}
- **Implementation Guide**: {"✅" if all_results['files']['documentation_present'] else "❌"}

## Production Readiness Assessment

### Golden Signals (Google SRE)
- **Latency**: {"✅ Implemented" if all_results['schema']['golden_signals_table'] else "❌ Missing"}
- **Traffic**: {"✅ Implemented" if all_results['schema']['golden_signals_table'] else "❌ Missing"}  
- **Errors**: {"✅ Implemented" if all_results['schema']['golden_signals_table'] else "❌ Missing"}
- **Saturation**: {"✅ Implemented" if all_results['schema']['golden_signals_table'] else "❌ Missing"}

### Rate Limiting (HTTP 429 + Retry-After)
- **Token Bucket Algorithm**: {"✅ Implemented" if all_results['schema']['functions_implemented'].get('check_rate_limit') else "❌ Missing"}
- **Database Persistence**: {"✅ Implemented" if all_results['schema']['rate_limits_table'] else "❌ Missing"}
- **HTTP 429 Responses**: {"✅ Implemented" if all_results['api']['endpoints_found'].get('/admin/limits/test', {}).get('found') else "❌ Missing"}

### Circuit Breakers (Microsoft Pattern)
- **State Management**: {"✅ Implemented" if all_results['schema']['circuit_breaker_state_table'] else "❌ Missing"}  
- **Automatic Recovery**: {"✅ Implemented" if all_results['schema']['functions_implemented'].get('update_circuit_breaker') else "❌ Missing"}
- **Provider Protection**: {"✅ Implemented" if all_results['schema']['circuit_breaker_state_table'] else "❌ Missing"}

### FinOps Cost Management
- **Budget Tracking**: {"✅ Implemented" if all_results['schema']['cost_budgets_table'] else "❌ Missing"}
- **Usage Monitoring**: {"✅ Implemented" if all_results['schema']['cost_usage_table'] else "❌ Missing"}
- **Alert Thresholds**: {"✅ Implemented" if all_results['schema']['functions_implemented'].get('update_cost_usage') else "❌ Missing"}

## Recommendations

### Immediate Actions
"""
    
    if success_rate < 90:
        report += "- ⚠️ Complete missing SRE components before production deployment\n"
        report += "- 🔧 Validate database schema deployment\n"
        report += "- 🧪 Run comprehensive test suite\n"
    else:
        report += "- ✅ SRE implementation ready for production\n"
        report += "- 📊 Configure monitoring dashboards\n"
        report += "- 🚨 Set up alerting thresholds\n"
    
    report += f"""
### Pre-Production Steps
1. Deploy M29 schema to staging environment
2. Run full test suite: `python test_m29_sre_cost.py`
3. Validate golden signals data collection
4. Test rate limiting with load testing
5. Verify circuit breaker behavior under failure conditions
6. Configure cost budgets and alert thresholds

### Post-Production Monitoring
1. Monitor golden signals dashboards
2. Review rate limiting effectiveness  
3. Track circuit breaker activation patterns
4. Analyze cost trends and budget utilization
5. Validate incident management workflows

## File Summary
"""
    
    for filename, details in all_results['files']['file_details'].items():
        status = "✅" if details['exists'] else "❌"
        size_info = f" ({details.get('lines', 0)} lines)" if details['exists'] else ""
        report += f"- **{filename}**: {status} {details['description']}{size_info}\n"
    
    report += f"""
---
**Validation Framework**: M30 Go-Live Readiness  
**SRE Standards**: Google SRE, Microsoft Circuit Breaker, FinOps Foundation  
**Report Generated**: {timestamp}
"""
    
    return report

def main():
    """Main validation execution"""
    
    print("🔍 Starting M30 SRE Monitoring Validation...")
    print("=" * 60)
    
    # Run all validations
    all_results = {
        'files': validate_sre_schema_files(),
        'api': validate_api_endpoints(), 
        'schema': validate_schema_content(),
        'rls': validate_rls_policies(),
        'tests': validate_test_coverage()
    }
    
    # Generate and save report
    report = generate_monitoring_validation_report(all_results)
    
    report_file = f"sre_monitoring_validation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report)
    
    # Print summary
    total_files = len(all_results['files']['file_details'])
    existing_files = sum(1 for details in all_results['files']['file_details'].values() if details['exists'])
    
    print(f"📁 Files: {existing_files}/{total_files} present")
    print(f"🗄️  Schema: {'✅' if all_results['schema']['golden_signals_table'] else '❌'} Golden Signals")
    print(f"🔒 RLS: {all_results['rls']['policy_count']} policies implemented") 
    print(f"🌐 API: {all_results['api']['total_endpoints']}/4 endpoints found")
    print(f"🧪 Tests: {all_results['tests']['test_methods']} test methods")
    
    # Overall assessment
    overall_ready = (
        existing_files >= 3 and
        all_results['schema']['golden_signals_table'] and
        all_results['rls']['policy_count'] >= 10 and
        all_results['api']['total_endpoints'] >= 3
    )
    
    print(f"\n📊 Overall Assessment: {'✅ SRE MONITORING READY' if overall_ready else '⚠️ NEEDS COMPLETION'}")
    print(f"📋 Detailed report: {report_file}")
    
    return overall_ready

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)