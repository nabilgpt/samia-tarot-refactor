#!/usr/bin/env python3
"""
Backend API Routes and Implementation Audit Script
Analyzes the Node.js/Express backend structure, routes, and implementation
"""

import os
import json
import re
from pathlib import Path
from collections import defaultdict, Counter

class BackendAuditor:
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        self.audit_results = {
            'api_routes': {},
            'middleware': {},
            'controllers': {},
            'services': {},
            'database_interactions': {},
            'security_analysis': {},
            'architecture': {},
            'recommendations': []
        }
        
    def find_api_files(self):
        """Find all API-related files"""
        api_files = []
        
        # Look for API files in common locations
        search_paths = [
            'src/api',
            'api',
            'src/routes',
            'routes',
            'src/controllers',
            'controllers',
            'src/services',
            'services'
        ]
        
        for search_path in search_paths:
            path = self.project_root / search_path
            if path.exists():
                for file_path in path.rglob('*.js'):
                    api_files.append(file_path)
                for file_path in path.rglob('*.ts'):
                    api_files.append(file_path)
        
        return api_files
    
    def analyze_route_file(self, file_path):
        """Analyze a single route file for endpoints and methods"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            return None
        
        routes = []
        
        # Patterns to match Express route definitions
        route_patterns = [
            r'router\.(get|post|put|delete|patch)\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
            r'app\.(get|post|put|delete|patch)\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
            r'\.route\s*\(\s*[\'"`]([^\'"`]+)[\'"`]\)\s*\.(get|post|put|delete|patch)',
        ]
        
        for pattern in route_patterns:
            matches = re.findall(pattern, content)
            for match in matches:
                if len(match) == 2:
                    method, path = match
                    routes.append({
                        'method': method.upper(),
                        'path': path,
                        'file': str(file_path.relative_to(self.project_root))
                    })
                elif len(match) == 3:  # For .route() pattern
                    path, method = match[0], match[1]
                    routes.append({
                        'method': method.upper(),
                        'path': path,
                        'file': str(file_path.relative_to(self.project_root))
                    })
        
        return routes
    
    def analyze_middleware(self, file_path):
        """Analyze middleware functions"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            return None
        
        middleware = []
        
        # Look for middleware patterns
        middleware_patterns = [
            r'app\.use\s*\(',
            r'router\.use\s*\(',
            r'function\s+(\w+)\s*\([^)]*req[^)]*res[^)]*next[^)]*\)',
            r'const\s+(\w+)\s*=\s*\([^)]*req[^)]*res[^)]*next[^)]*\)\s*=>'
        ]
        
        for pattern in middleware_patterns:
            matches = re.findall(pattern, content)
            middleware.extend(matches)
        
        return {
            'file': str(file_path.relative_to(self.project_root)),
            'middleware_count': len(middleware),
            'middleware_functions': [m for m in middleware if isinstance(m, str) and len(m) > 0]
        }
    
    def analyze_database_interactions(self, file_path):
        """Analyze database queries and interactions"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            return None
        
        db_patterns = {
            'supabase_queries': len(re.findall(r'supabase\.[a-zA-Z_]+\([^)]*\)', content)),
            'sql_queries': len(re.findall(r'SELECT|INSERT|UPDATE|DELETE|CREATE|DROP', content, re.IGNORECASE)),
            'prisma_queries': len(re.findall(r'prisma\.[a-zA-Z_]+\.[a-zA-Z_]+\(', content)),
            'knex_queries': len(re.findall(r'knex\([^)]*\)', content)),
            'raw_sql': len(re.findall(r'\.raw\s*\(', content))
        }
        
        return {
            'file': str(file_path.relative_to(self.project_root)),
            **db_patterns
        }
    
    def analyze_security_patterns(self, file_path):
        """Analyze security-related patterns"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            return None
        
        security_patterns = {
            'auth_middleware': len(re.findall(r'authenticate|authorize|auth|jwt|token', content, re.IGNORECASE)),
            'validation': len(re.findall(r'validate|joi|yup|zod|schema', content, re.IGNORECASE)),
            'rate_limiting': len(re.findall(r'rate.?limit|throttle', content, re.IGNORECASE)),
            'cors': len(re.findall(r'cors', content, re.IGNORECASE)),
            'helmet': len(re.findall(r'helmet', content, re.IGNORECASE)),
            'rls_policies': len(re.findall(r'rls|row.?level.?security', content, re.IGNORECASE)),
            'password_hashing': len(re.findall(r'bcrypt|hash|salt', content, re.IGNORECASE)),
            'environment_vars': len(re.findall(r'process\.env|dotenv', content, re.IGNORECASE))
        }
        
        return {
            'file': str(file_path.relative_to(self.project_root)),
            **security_patterns
        }
    
    def analyze_error_handling(self, file_path):
        """Analyze error handling patterns"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            return None
        
        error_patterns = {
            'try_catch_blocks': len(re.findall(r'try\s*{[^}]*}\s*catch', content, re.DOTALL)),
            'error_throws': len(re.findall(r'throw\s+', content)),
            'error_responses': len(re.findall(r'res\.status\s*\(\s*[4-5]\d\d', content)),
            'async_await': len(re.findall(r'async\s+function|await\s+', content)),
            'promise_catch': len(re.findall(r'\.catch\s*\(', content))
        }
        
        return {
            'file': str(file_path.relative_to(self.project_root)),
            **error_patterns
        }
    
    def run_backend_audit(self):
        """Run comprehensive backend audit"""
        print("[START] Analyzing backend API implementation...")
        
        # Find all API files
        api_files = self.find_api_files()
        print(f"[INFO] Found {len(api_files)} API-related files")
        
        all_routes = []
        middleware_analysis = []
        db_analysis = []
        security_analysis = []
        error_analysis = []
        
        for file_path in api_files:
            print(f"  Analyzing: {file_path.relative_to(self.project_root)}")
            
            # Analyze routes
            routes = self.analyze_route_file(file_path)
            if routes:
                all_routes.extend(routes)
            
            # Analyze middleware
            middleware = self.analyze_middleware(file_path)
            if middleware:
                middleware_analysis.append(middleware)
            
            # Analyze database interactions
            db_info = self.analyze_database_interactions(file_path)
            if db_info:
                db_analysis.append(db_info)
            
            # Analyze security patterns
            security_info = self.analyze_security_patterns(file_path)
            if security_info:
                security_analysis.append(security_info)
            
            # Analyze error handling
            error_info = self.analyze_error_handling(file_path)
            if error_info:
                error_analysis.append(error_info)
        
        # Compile results
        self.audit_results['api_routes'] = {
            'total_routes': len(all_routes),
            'routes_by_method': dict(Counter(route['method'] for route in all_routes)),
            'routes_by_file': {},
            'all_routes': all_routes
        }
        
        # Group routes by file
        routes_by_file = defaultdict(list)
        for route in all_routes:
            routes_by_file[route['file']].append({
                'method': route['method'],
                'path': route['path']
            })
        self.audit_results['api_routes']['routes_by_file'] = dict(routes_by_file)
        
        self.audit_results['middleware'] = middleware_analysis
        self.audit_results['database_interactions'] = db_analysis
        self.audit_results['security_analysis'] = security_analysis
        self.audit_results['error_handling'] = error_analysis
        
        # Generate architecture insights
        self.analyze_architecture()
        
        # Generate recommendations
        self.generate_backend_recommendations()
        
        print(f"[SUCCESS] Backend audit completed!")
        print(f"  Total API Routes: {len(all_routes)}")
        print(f"  Files Analyzed: {len(api_files)}")
        
        return self.audit_results
    
    def analyze_architecture(self):
        """Analyze overall backend architecture"""
        api_files = self.find_api_files()
        
        # Analyze directory structure
        directories = set()
        file_types = Counter()
        
        for file_path in api_files:
            rel_path = file_path.relative_to(self.project_root)
            directories.add(str(rel_path.parent))
            file_types[file_path.suffix] += 1
        
        self.audit_results['architecture'] = {
            'total_files': len(api_files),
            'directories': list(directories),
            'file_types': dict(file_types),
            'structure_analysis': self.analyze_project_structure()
        }
    
    def analyze_project_structure(self):
        """Analyze project structure patterns"""
        structure = {}
        
        # Check for common patterns
        common_dirs = ['routes', 'controllers', 'services', 'middleware', 'models', 'utils']
        
        for dir_name in common_dirs:
            dir_path = self.project_root / 'src' / 'api' / dir_name
            alt_path = self.project_root / 'src' / dir_name
            
            if dir_path.exists():
                structure[dir_name] = {
                    'exists': True,
                    'path': str(dir_path.relative_to(self.project_root)),
                    'file_count': len(list(dir_path.glob('*.js'))) + len(list(dir_path.glob('*.ts')))
                }
            elif alt_path.exists():
                structure[dir_name] = {
                    'exists': True,
                    'path': str(alt_path.relative_to(self.project_root)),
                    'file_count': len(list(alt_path.glob('*.js'))) + len(list(alt_path.glob('*.ts')))
                }
            else:
                structure[dir_name] = {'exists': False}
        
        return structure
    
    def generate_backend_recommendations(self):
        """Generate recommendations based on backend analysis"""
        recommendations = []
        
        # Check route organization
        total_routes = self.audit_results['api_routes']['total_routes']
        if total_routes > 100:
            recommendations.append({
                'type': 'Architecture',
                'priority': 'Medium',
                'message': f'Large number of API routes ({total_routes}). Consider route organization and modularization.'
            })
        
        # Check security patterns
        security_files = len([f for f in self.audit_results['security_analysis'] if sum([v for k, v in f.items() if k != 'file']) > 0])
        total_files = len(self.audit_results['security_analysis'])
        
        if total_files > 0 and (security_files / total_files) < 0.5:
            recommendations.append({
                'type': 'Security',
                'priority': 'High',
                'message': 'Low security pattern coverage in API files. Review authentication and validation.'
            })
        
        # Check error handling
        error_files = len([f for f in self.audit_results.get('error_handling', []) if f.get('try_catch_blocks', 0) > 0])
        if total_files > 0 and (error_files / total_files) < 0.7:
            recommendations.append({
                'type': 'Reliability',
                'priority': 'Medium',
                'message': 'Consider improving error handling coverage across API files.'
            })
        
        # Check database interaction patterns
        db_files = len([f for f in self.audit_results['database_interactions'] if sum([v for k, v in f.items() if k != 'file']) > 0])
        if db_files > total_files * 0.8:
            recommendations.append({
                'type': 'Architecture',
                'priority': 'Low',
                'message': 'High database interaction density. Consider service layer abstraction.'
            })
        
        self.audit_results['recommendations'] = recommendations
        
        print(f"[RECOMMENDATIONS] Generated {len(recommendations)} backend recommendations")
        for rec in recommendations:
            print(f"    [{rec['priority']}] {rec['type']}: {rec['message']}")
    
    def save_report(self, filename="backend_audit_report.json"):
        """Save backend audit report"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(self.audit_results, f, indent=2, ensure_ascii=False)
            print(f"[SAVE] Backend audit report saved to: {filename}")
            return filename
        except Exception as e:
            print(f"[ERROR] Failed to save backend report: {e}")
            return None
    
    def print_summary(self):
        """Print backend audit summary"""
        print("\n" + "="*60)
        print("BACKEND API AUDIT SUMMARY")
        print("="*60)
        
        routes_info = self.audit_results['api_routes']
        print(f"Total API Routes: {routes_info['total_routes']}")
        print(f"HTTP Methods Used: {list(routes_info['routes_by_method'].keys())}")
        
        arch_info = self.audit_results['architecture']
        print(f"API Files Analyzed: {arch_info['total_files']}")
        print(f"Directory Structure: {len(arch_info['directories'])} directories")
        
        middleware_count = len(self.audit_results['middleware'])
        print(f"Middleware Files: {middleware_count}")
        
        security_count = len([f for f in self.audit_results['security_analysis'] if sum([v for k, v in f.items() if k != 'file']) > 0])
        print(f"Files with Security Patterns: {security_count}")
        
        print(f"Recommendations: {len(self.audit_results['recommendations'])}")
        print("="*60)

if __name__ == "__main__":
    project_root = r"C:\Users\saeee\OneDrive\Documents\project\samia-tarot"
    auditor = BackendAuditor(project_root)
    
    results = auditor.run_backend_audit()
    auditor.print_summary()
    auditor.save_report()