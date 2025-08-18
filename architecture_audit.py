#!/usr/bin/env python3
"""
Project Structure and Architecture Audit Script
Analyzes overall project architecture, structure, and organization
"""

import os
import json
import re
from pathlib import Path
from collections import defaultdict, Counter

class ArchitectureAuditor:
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        self.audit_results = {
            'project_structure': {},
            'code_organization': {},
            'build_system': {},
            'deployment': {},
            'documentation': {},
            'testing': {},
            'quality_assurance': {},
            'scalability': {},
            'maintainability': {},
            'recommendations': []
        }
        
    def analyze_project_structure(self):
        """Analyze overall project structure"""
        print("[INFO] Analyzing project structure...")
        
        # Get directory structure
        directories = []
        files_by_type = Counter()
        total_files = 0
        total_size = 0
        
        for root, dirs, files in os.walk(self.project_root):
            # Skip node_modules and other large directories
            if any(skip in root for skip in ['node_modules', '.git', 'dist', 'build']):
                continue
                
            rel_root = Path(root).relative_to(self.project_root)
            if rel_root != Path('.'):
                directories.append(str(rel_root))
            
            for file in files:
                file_path = Path(root) / file
                try:
                    file_size = file_path.stat().st_size
                    total_size += file_size
                    total_files += 1
                    files_by_type[file_path.suffix] += 1
                except:
                    continue
        
        # Analyze directory patterns
        structure_patterns = {
            'src_structure': any('src' in d for d in directories),
            'api_structure': any('api' in d for d in directories),
            'components_structure': any('components' in d for d in directories),
            'services_structure': any('services' in d for d in directories),
            'utils_structure': any('utils' in d for d in directories),
            'tests_structure': any(test in d for d in directories for test in ['test', 'tests', '__tests__']),
            'docs_structure': any('docs' in d for d in directories),
            'scripts_structure': any('scripts' in d for d in directories),
            'config_structure': any('config' in d for d in directories)
        }
        
        self.audit_results['project_structure'] = {
            'total_directories': len(directories),
            'total_files': total_files,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'file_types': dict(files_by_type.most_common(20)),
            'structure_patterns': structure_patterns,
            'main_directories': sorted(directories)[:30]  # Top 30 directories
        }
    
    def analyze_code_organization(self):
        """Analyze code organization patterns"""
        print("[INFO] Analyzing code organization...")
        
        # Analyze different layers
        layers = {
            'presentation': 0,  # React components, pages
            'business_logic': 0,  # Services, hooks
            'data_access': 0,  # API calls, database
            'infrastructure': 0  # Config, utils, middleware
        }
        
        # Analyze files in src directory
        src_path = self.project_root / 'src'
        if src_path.exists():
            for file_path in src_path.rglob('*'):
                if file_path.is_file() and file_path.suffix in ['.js', '.jsx', '.ts', '.tsx']:
                    rel_path = str(file_path.relative_to(src_path)).lower()
                    
                    if any(keyword in rel_path for keyword in ['component', 'page', 'view', 'ui']):
                        layers['presentation'] += 1
                    elif any(keyword in rel_path for keyword in ['service', 'hook', 'business', 'logic']):
                        layers['business_logic'] += 1
                    elif any(keyword in rel_path for keyword in ['api', 'data', 'database', 'client']):
                        layers['data_access'] += 1
                    elif any(keyword in rel_path for keyword in ['config', 'util', 'helper', 'middleware']):
                        layers['infrastructure'] += 1
        
        # Analyze separation of concerns
        separation_analysis = self.analyze_separation_of_concerns()
        
        self.audit_results['code_organization'] = {
            'layers': layers,
            'separation_of_concerns': separation_analysis,
            'organization_score': self.calculate_organization_score(layers, separation_analysis)
        }
    
    def analyze_separation_of_concerns(self):
        """Analyze separation of concerns in the codebase"""
        # Look for mixed concerns in files
        mixed_concerns = []
        
        src_files = []
        src_path = self.project_root / 'src'
        if src_path.exists():
            src_files = list(src_path.rglob('*.js')) + list(src_path.rglob('*.jsx'))
        
        for file_path in src_files[:50]:  # Limit for performance
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                concerns = {
                    'ui_logic': len(re.findall(r'<\w+|useState|useEffect', content)),
                    'api_calls': len(re.findall(r'fetch\(|axios\.|api\.|supabase\.', content)),
                    'business_logic': len(re.findall(r'calculate|process|validate|transform', content, re.IGNORECASE)),
                    'styling': len(re.findall(r'style=|className=|css`', content))
                }
                
                # File has mixed concerns if it has significant amounts of multiple concern types
                active_concerns = sum(1 for count in concerns.values() if count > 5)
                if active_concerns > 2:
                    mixed_concerns.append({
                        'file': str(file_path.relative_to(self.project_root)),
                        'concerns': concerns
                    })
                    
            except:
                continue
        
        return {
            'files_with_mixed_concerns': len(mixed_concerns),
            'mixed_concerns_details': mixed_concerns[:10],  # Top 10 examples
            'separation_score': max(0, 100 - len(mixed_concerns) * 2)
        }
    
    def calculate_organization_score(self, layers, separation):
        """Calculate an organization score based on various metrics"""
        # Balance between layers (ideally not all code in one layer)
        total_files = sum(layers.values())
        if total_files == 0:
            return 0
        
        layer_balance = 100 - (max(layers.values()) / total_files * 100 - 25) * 2
        layer_balance = max(0, min(100, layer_balance))
        
        # Separation score
        separation_score = separation.get('separation_score', 50)
        
        # Overall organization score
        return round((layer_balance + separation_score) / 2)
    
    def analyze_build_system(self):
        """Analyze build system and tooling"""
        print("[INFO] Analyzing build system...")
        
        build_configs = {}
        
        # Check for various build tools
        build_files = {
            'package.json': 'npm/yarn',
            'webpack.config.js': 'webpack',
            'vite.config.js': 'vite',
            'rollup.config.js': 'rollup',
            'tsconfig.json': 'typescript',
            'babel.config.js': 'babel',
            '.babelrc': 'babel',
            'jest.config.js': 'jest',
            'vitest.config.js': 'vitest',
            'eslint.config.js': 'eslint',
            '.eslintrc': 'eslint',
            'tailwind.config.js': 'tailwindcss',
            'postcss.config.js': 'postcss'
        }
        
        for file_name, tool in build_files.items():
            file_path = self.project_root / file_name
            if file_path.exists():
                build_configs[tool] = {
                    'present': True,
                    'file': file_name
                }
                
                # Analyze specific configs
                if file_name == 'package.json':
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            package_data = json.load(f)
                        
                        build_configs[tool]['scripts'] = package_data.get('scripts', {})
                        build_configs[tool]['build_script'] = 'build' in package_data.get('scripts', {})
                        build_configs[tool]['test_script'] = 'test' in package_data.get('scripts', {})
                        build_configs[tool]['lint_script'] = any('lint' in script for script in package_data.get('scripts', {}).keys())
                    except:
                        pass
        
        self.audit_results['build_system'] = {
            'tools_detected': list(build_configs.keys()),
            'configurations': build_configs,
            'build_complexity': len(build_configs),
            'modern_tooling': any(tool in build_configs for tool in ['vite', 'webpack', 'rollup'])
        }
    
    def analyze_deployment(self):
        """Analyze deployment configuration"""
        print("[INFO] Analyzing deployment configuration...")
        
        deployment_files = {
            'Dockerfile': 'docker',
            'docker-compose.yml': 'docker-compose',
            '.github/workflows': 'github-actions',
            '.gitlab-ci.yml': 'gitlab-ci',
            'vercel.json': 'vercel',
            'netlify.toml': 'netlify',
            'serverless.yml': 'serverless',
            'ecosystem.config.js': 'pm2'
        }
        
        deployment_configs = {}
        
        for file_name, deployment_type in deployment_files.items():
            file_path = self.project_root / file_name
            if file_path.exists():
                deployment_configs[deployment_type] = {
                    'present': True,
                    'file': file_name
                }
                
                # Analyze CI/CD workflows
                if file_name == '.github/workflows':
                    workflows = list(file_path.glob('*.yml')) + list(file_path.glob('*.yaml'))
                    deployment_configs[deployment_type]['workflows'] = len(workflows)
        
        self.audit_results['deployment'] = {
            'deployment_types': list(deployment_configs.keys()),
            'configurations': deployment_configs,
            'ci_cd_present': any(ci in deployment_configs for ci in ['github-actions', 'gitlab-ci']),
            'containerization': 'docker' in deployment_configs
        }
    
    def analyze_documentation(self):
        """Analyze documentation coverage"""
        print("[INFO] Analyzing documentation...")
        
        doc_files = []
        
        # Find documentation files
        doc_patterns = ['*.md', '*.txt', '*.rst']
        for pattern in doc_patterns:
            doc_files.extend(list(self.project_root.glob(pattern)))
            doc_files.extend(list(self.project_root.glob(f'docs/**/{pattern}')))
        
        # Analyze documentation types
        doc_types = {
            'readme': any('readme' in f.name.lower() for f in doc_files),
            'api_docs': any('api' in f.name.lower() for f in doc_files),
            'setup_guide': any(keyword in f.name.lower() for f in doc_files for keyword in ['setup', 'install', 'getting-started']),
            'deployment_guide': any(keyword in f.name.lower() for f in doc_files for keyword in ['deploy', 'production']),
            'architecture_docs': any(keyword in f.name.lower() for f in doc_files for keyword in ['architecture', 'design', 'structure']),
            'user_guide': any(keyword in f.name.lower() for f in doc_files for keyword in ['user', 'manual', 'guide']),
            'changelog': any(keyword in f.name.lower() for f in doc_files for keyword in ['changelog', 'history', 'release'])
        }
        
        # Count total documentation
        total_doc_size = sum(f.stat().st_size for f in doc_files if f.exists())
        
        self.audit_results['documentation'] = {
            'total_doc_files': len(doc_files),
            'total_doc_size_kb': round(total_doc_size / 1024, 2),
            'doc_types_present': doc_types,
            'documentation_score': sum(doc_types.values()) / len(doc_types) * 100,
            'recent_doc_files': [f.name for f in doc_files[:10]]
        }
    
    def analyze_testing(self):
        """Analyze testing setup and coverage"""
        print("[INFO] Analyzing testing setup...")
        
        test_files = []
        test_patterns = ['**/*test.js', '**/*test.jsx', '**/*spec.js', '**/*spec.jsx', '**/test/**/*.js', '**/tests/**/*.js']
        
        for pattern in test_patterns:
            test_files.extend(list(self.project_root.glob(pattern)))
        
        # Remove duplicates
        test_files = list(set(test_files))
        
        # Analyze test types
        test_analysis = {
            'unit_tests': len([f for f in test_files if any(keyword in str(f) for keyword in ['unit', 'spec'])]),
            'integration_tests': len([f for f in test_files if 'integration' in str(f)]),
            'e2e_tests': len([f for f in test_files if any(keyword in str(f) for keyword in ['e2e', 'end-to-end', 'cypress'])]),
            'api_tests': len([f for f in test_files if 'api' in str(f)])
        }
        
        # Check for test configuration
        test_configs = {}
        test_config_files = ['jest.config.js', 'vitest.config.js', 'cypress.json', 'playwright.config.js']
        
        for config_file in test_config_files:
            if (self.project_root / config_file).exists():
                test_configs[config_file] = True
        
        self.audit_results['testing'] = {
            'total_test_files': len(test_files),
            'test_types': test_analysis,
            'test_configs': test_configs,
            'testing_score': min(100, len(test_files) * 5),  # Max 100, 5 points per test file
            'test_frameworks': list(test_configs.keys())
        }
    
    def analyze_quality_assurance(self):
        """Analyze code quality tools and practices"""
        print("[INFO] Analyzing quality assurance...")
        
        qa_tools = {}
        
        # Check for linting and formatting
        qa_files = {
            'eslint.config.js': 'eslint',
            '.eslintrc': 'eslint',
            '.prettierrc': 'prettier',
            'prettier.config.js': 'prettier',
            '.editorconfig': 'editorconfig',
            'sonar-project.properties': 'sonarqube',
            '.codeclimate.yml': 'codeclimate'
        }
        
        for file_name, tool in qa_files.items():
            if (self.project_root / file_name).exists():
                qa_tools[tool] = True
        
        # Check package.json for QA scripts
        package_json_path = self.project_root / 'package.json'
        qa_scripts = {}
        
        if package_json_path.exists():
            try:
                with open(package_json_path, 'r', encoding='utf-8') as f:
                    package_data = json.load(f)
                
                scripts = package_data.get('scripts', {})
                qa_scripts = {
                    'lint': any('lint' in script for script in scripts.keys()),
                    'format': any('format' in script or 'prettier' in script for script in scripts.values()),
                    'type_check': any('type' in script for script in scripts.keys()),
                    'audit': any('audit' in script for script in scripts.keys())
                }
            except:
                pass
        
        self.audit_results['quality_assurance'] = {
            'qa_tools': qa_tools,
            'qa_scripts': qa_scripts,
            'quality_score': len(qa_tools) * 15 + sum(qa_scripts.values()) * 10,
            'modern_qa_setup': 'eslint' in qa_tools and 'prettier' in qa_tools
        }
    
    def analyze_scalability(self):
        """Analyze scalability considerations"""
        print("[INFO] Analyzing scalability...")
        
        scalability_factors = {
            'modular_architecture': self.audit_results['code_organization']['organization_score'] > 70,
            'api_separation': any('api' in d for d in self.audit_results['project_structure']['main_directories']),
            'microservices_ready': self.audit_results['deployment']['containerization'],
            'caching_strategy': self.check_caching_implementation(),
            'performance_monitoring': self.check_performance_monitoring(),
            'horizontal_scaling': self.check_horizontal_scaling_setup()
        }
        
        scalability_score = sum(scalability_factors.values()) / len(scalability_factors) * 100
        
        self.audit_results['scalability'] = {
            'factors': scalability_factors,
            'scalability_score': round(scalability_score),
            'bottlenecks': self.identify_potential_bottlenecks()
        }
    
    def check_caching_implementation(self):
        """Check for caching implementation"""
        cache_indicators = ['redis', 'memcached', 'cache', 'memoize']
        
        # Check in package.json dependencies
        package_json_path = self.project_root / 'package.json'
        if package_json_path.exists():
            try:
                with open(package_json_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                return any(indicator in content.lower() for indicator in cache_indicators)
            except:
                pass
        
        return False
    
    def check_performance_monitoring(self):
        """Check for performance monitoring setup"""
        monitoring_indicators = ['sentry', 'newrelic', 'datadog', 'web-vitals', 'performance']
        
        package_json_path = self.project_root / 'package.json'
        if package_json_path.exists():
            try:
                with open(package_json_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                return any(indicator in content.lower() for indicator in monitoring_indicators)
            except:
                pass
        
        return False
    
    def check_horizontal_scaling_setup(self):
        """Check for horizontal scaling setup"""
        scaling_files = ['docker-compose.yml', 'kubernetes.yml', 'k8s', 'helm']
        
        return any((self.project_root / f).exists() for f in scaling_files) or \
               any(f in str(self.project_root) for f in scaling_files)
    
    def identify_potential_bottlenecks(self):
        """Identify potential scalability bottlenecks"""
        bottlenecks = []
        
        # Large number of files in single directory
        structure = self.audit_results['project_structure']
        if structure['total_files'] > 1000:
            bottlenecks.append('Large number of files may impact build times')
        
        # No caching strategy
        if not self.check_caching_implementation():
            bottlenecks.append('No caching strategy detected')
        
        # No performance monitoring
        if not self.check_performance_monitoring():
            bottlenecks.append('No performance monitoring setup')
        
        return bottlenecks
    
    def analyze_maintainability(self):
        """Analyze code maintainability factors"""
        print("[INFO] Analyzing maintainability...")
        
        maintainability_factors = {
            'clear_structure': self.audit_results['project_structure']['structure_patterns']['src_structure'],
            'separation_of_concerns': self.audit_results['code_organization']['separation_of_concerns']['separation_score'] > 70,
            'documentation_adequate': self.audit_results['documentation']['documentation_score'] > 50,
            'testing_present': self.audit_results['testing']['total_test_files'] > 0,
            'linting_setup': 'eslint' in self.audit_results['quality_assurance']['qa_tools'],
            'build_automation': self.audit_results['build_system']['build_complexity'] > 0,
            'dependency_management': (self.project_root / 'package.json').exists()
        }
        
        maintainability_score = sum(maintainability_factors.values()) / len(maintainability_factors) * 100
        
        # Calculate technical debt indicators
        tech_debt = self.calculate_technical_debt()
        
        self.audit_results['maintainability'] = {
            'factors': maintainability_factors,
            'maintainability_score': round(maintainability_score),
            'technical_debt': tech_debt
        }
    
    def calculate_technical_debt(self):
        """Calculate technical debt indicators"""
        debt_indicators = {
            'mixed_concerns': self.audit_results['code_organization']['separation_of_concerns']['files_with_mixed_concerns'],
            'missing_tests': max(0, 100 - self.audit_results['testing']['testing_score']),
            'missing_docs': max(0, 100 - self.audit_results['documentation']['documentation_score']),
            'no_linting': 'eslint' not in self.audit_results['quality_assurance']['qa_tools']
        }
        
        total_debt_score = (
            debt_indicators['mixed_concerns'] * 2 +
            debt_indicators['missing_tests'] +
            debt_indicators['missing_docs'] +
            (50 if debt_indicators['no_linting'] else 0)
        )
        
        return {
            'indicators': debt_indicators,
            'debt_score': min(100, total_debt_score),
            'debt_level': 'High' if total_debt_score > 150 else 'Medium' if total_debt_score > 75 else 'Low'
        }
    
    def generate_architecture_recommendations(self):
        """Generate architecture and structure recommendations"""
        recommendations = []
        
        # Structure recommendations
        if not self.audit_results['project_structure']['structure_patterns']['tests_structure']:
            recommendations.append({
                'type': 'Testing',
                'priority': 'High',
                'message': 'No test directory structure found. Implement comprehensive testing strategy.'
            })
        
        # Code organization recommendations
        if self.audit_results['code_organization']['organization_score'] < 70:
            recommendations.append({
                'type': 'Architecture',
                'priority': 'Medium',
                'message': 'Poor code organization detected. Improve separation of concerns and layer organization.'
            })
        
        # Documentation recommendations
        if self.audit_results['documentation']['documentation_score'] < 50:
            recommendations.append({
                'type': 'Documentation',
                'priority': 'Medium',
                'message': 'Insufficient documentation. Add README, API docs, and setup guides.'
            })
        
        # Quality assurance recommendations
        if not self.audit_results['quality_assurance']['modern_qa_setup']:
            recommendations.append({
                'type': 'Quality',
                'priority': 'Medium',
                'message': 'Missing modern QA tools. Implement ESLint and Prettier for code quality.'
            })
        
        # Scalability recommendations
        if self.audit_results['scalability']['scalability_score'] < 60:
            recommendations.append({
                'type': 'Scalability',
                'priority': 'Low',
                'message': 'Limited scalability features. Consider caching, monitoring, and containerization.'
            })
        
        # Technical debt recommendations
        tech_debt = self.audit_results['maintainability']['technical_debt']
        if tech_debt['debt_level'] == 'High':
            recommendations.append({
                'type': 'Technical Debt',
                'priority': 'High',
                'message': 'High technical debt detected. Address mixed concerns, add tests, and improve documentation.'
            })
        
        self.audit_results['recommendations'] = recommendations
        
        print(f"[RECOMMENDATIONS] Generated {len(recommendations)} architecture recommendations")
        for rec in recommendations:
            print(f"    [{rec['priority']}] {rec['type']}: {rec['message']}")
    
    def run_architecture_audit(self):
        """Run comprehensive architecture audit"""
        print("[START] Analyzing project architecture and structure...")
        
        self.analyze_project_structure()
        self.analyze_code_organization()
        self.analyze_build_system()
        self.analyze_deployment()
        self.analyze_documentation()
        self.analyze_testing()
        self.analyze_quality_assurance()
        self.analyze_scalability()
        self.analyze_maintainability()
        self.generate_architecture_recommendations()
        
        print(f"[SUCCESS] Architecture audit completed!")
        return self.audit_results
    
    def save_report(self, filename="architecture_audit_report.json"):
        """Save architecture audit report"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(self.audit_results, f, indent=2, ensure_ascii=False, default=str)
            print(f"[SAVE] Architecture audit report saved to: {filename}")
            return filename
        except Exception as e:
            print(f"[ERROR] Failed to save architecture report: {e}")
            return None
    
    def print_summary(self):
        """Print architecture audit summary"""
        print("\n" + "="*60)
        print("PROJECT ARCHITECTURE AUDIT SUMMARY")
        print("="*60)
        
        structure = self.audit_results['project_structure']
        print(f"Project Size: {structure['total_files']} files ({structure['total_size_mb']} MB)")
        print(f"Directories: {structure['total_directories']}")
        
        organization = self.audit_results['code_organization']
        print(f"Code Organization Score: {organization['organization_score']}/100")
        
        build_system = self.audit_results['build_system']
        print(f"Build Tools: {', '.join(build_system['tools_detected'])}")
        
        deployment = self.audit_results['deployment']
        print(f"Deployment: {', '.join(deployment['deployment_types']) if deployment['deployment_types'] else 'None configured'}")
        
        docs = self.audit_results['documentation']
        print(f"Documentation Score: {docs['documentation_score']:.1f}/100")
        
        testing = self.audit_results['testing']
        print(f"Test Files: {testing['total_test_files']}")
        
        qa = self.audit_results['quality_assurance']
        print(f"Quality Score: {qa['quality_score']}/100")
        
        scalability = self.audit_results['scalability']
        print(f"Scalability Score: {scalability['scalability_score']}/100")
        
        maintainability = self.audit_results['maintainability']
        print(f"Maintainability Score: {maintainability['maintainability_score']:.1f}/100")
        print(f"Technical Debt Level: {maintainability['technical_debt']['debt_level']}")
        
        print(f"Recommendations: {len(self.audit_results['recommendations'])}")
        print("="*60)

if __name__ == "__main__":
    project_root = r"C:\Users\saeee\OneDrive\Documents\project\samia-tarot"
    auditor = ArchitectureAuditor(project_root)
    
    results = auditor.run_architecture_audit()
    auditor.print_summary()
    auditor.save_report()