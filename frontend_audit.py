#!/usr/bin/env python3
"""
Frontend Components and UI/UX Audit Script
Analyzes React components, UI patterns, and UX implementation
"""

import os
import json
import re
from pathlib import Path
from collections import defaultdict, Counter

class FrontendAuditor:
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        self.audit_results = {
            'components': {},
            'pages': {},
            'hooks': {},
            'context': {},
            'utils': {},
            'styling': {},
            'architecture': {},
            'accessibility': {},
            'performance': {},
            'dependencies': {},
            'recommendations': []
        }
        
    def find_frontend_files(self):
        """Find all frontend-related files"""
        frontend_files = {
            'components': [],
            'pages': [],
            'hooks': [],
            'context': [],
            'utils': [],
            'services': [],
            'styles': [],
            'config': []
        }
        
        # Look for frontend files
        search_paths = {
            'components': ['src/components', 'components'],
            'pages': ['src/pages', 'pages'],
            'hooks': ['src/hooks', 'hooks'],
            'context': ['src/context', 'context'],
            'utils': ['src/utils', 'utils'],
            'services': ['src/services', 'services'],
            'styles': ['src/styles', 'styles', 'src'],
            'config': ['src/config', 'config']
        }
        
        for category, paths in search_paths.items():
            for search_path in paths:
                path = self.project_root / search_path
                if path.exists():
                    if category == 'styles':
                        # Look for CSS/SCSS files
                        for file_path in path.rglob('*.css'):
                            frontend_files[category].append(file_path)
                        for file_path in path.rglob('*.scss'):
                            frontend_files[category].append(file_path)
                        for file_path in path.rglob('*.less'):
                            frontend_files[category].append(file_path)
                    else:
                        # Look for JS/TS/JSX/TSX files
                        for ext in ['*.js', '*.jsx', '*.ts', '*.tsx']:
                            for file_path in path.rglob(ext):
                                frontend_files[category].append(file_path)
        
        return frontend_files
    
    def analyze_component(self, file_path):
        """Analyze a React component file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            return None
        
        analysis = {
            'file': str(file_path.relative_to(self.project_root)),
            'type': 'unknown',
            'hooks_used': [],
            'imports': [],
            'exports': [],
            'jsx_elements': [],
            'state_management': {},
            'props_usage': {},
            'accessibility': {},
            'performance': {}
        }
        
        # Determine component type
        if 'useState' in content or 'useEffect' in content:
            analysis['type'] = 'functional'
        elif 'class' in content and 'extends' in content and 'Component' in content:
            analysis['type'] = 'class'
        elif 'function' in content and ('return' in content and '<' in content):
            analysis['type'] = 'functional'
        
        # Find hooks usage
        hook_patterns = [
            r'useState', r'useEffect', r'useContext', r'useReducer',
            r'useCallback', r'useMemo', r'useRef', r'useImperativeHandle',
            r'useLayoutEffect', r'useDebugValue', r'use[A-Z][a-zA-Z]*'
        ]
        
        for pattern in hook_patterns:
            matches = re.findall(pattern, content)
            if matches:
                analysis['hooks_used'].extend(matches)
        
        # Find imports
        import_matches = re.findall(r'import\s+.*?\s+from\s+[\'"`]([^\'"`]+)[\'"`]', content)
        analysis['imports'] = import_matches
        
        # Find exports
        export_matches = re.findall(r'export\s+(?:default\s+)?(\w+)', content)
        analysis['exports'] = export_matches
        
        # Find JSX elements
        jsx_matches = re.findall(r'<(\w+)', content)
        analysis['jsx_elements'] = list(set(jsx_matches))
        
        # Analyze state management
        analysis['state_management'] = {
            'useState_count': content.count('useState'),
            'useReducer_count': content.count('useReducer'),
            'useContext_count': content.count('useContext'),
            'redux_usage': 'useSelector' in content or 'useDispatch' in content,
            'zustand_usage': 'useStore' in content
        }
        
        # Analyze accessibility
        analysis['accessibility'] = {
            'aria_labels': len(re.findall(r'aria-\w+', content)),
            'alt_texts': content.count('alt='),
            'semantic_html': len(re.findall(r'<(header|nav|main|section|article|aside|footer)', content)),
            'focus_management': 'focus' in content.lower(),
            'keyboard_events': 'onKey' in content
        }
        
        # Analyze performance patterns
        analysis['performance'] = {
            'memo_usage': 'React.memo' in content or 'memo(' in content,
            'useCallback_count': content.count('useCallback'),
            'useMemo_count': content.count('useMemo'),
            'lazy_loading': 'React.lazy' in content or 'lazy(' in content,
            'dynamic_imports': 'import(' in content
        }
        
        return analysis
    
    def analyze_styling(self, file_path):
        """Analyze CSS/SCSS styling files"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            return None
        
        analysis = {
            'file': str(file_path.relative_to(self.project_root)),
            'type': file_path.suffix,
            'selectors_count': 0,
            'media_queries': 0,
            'css_variables': 0,
            'flexbox_usage': 0,
            'grid_usage': 0,
            'responsive_design': {},
            'accessibility_styles': {}
        }
        
        # Count selectors
        analysis['selectors_count'] = len(re.findall(r'[^{}]+\s*{', content))
        
        # Count media queries
        analysis['media_queries'] = len(re.findall(r'@media', content))
        
        # Count CSS variables
        analysis['css_variables'] = len(re.findall(r'--[\w-]+:', content))
        
        # Check flexbox usage
        analysis['flexbox_usage'] = content.count('display: flex') + content.count('display:flex')
        
        # Check grid usage
        analysis['grid_usage'] = content.count('display: grid') + content.count('display:grid')
        
        # Responsive design patterns
        analysis['responsive_design'] = {
            'mobile_first': '@media (min-width:' in content,
            'desktop_first': '@media (max-width:' in content,
            'breakpoints_used': len(re.findall(r'@media.*?\d+px', content))
        }
        
        # Accessibility in styles
        analysis['accessibility_styles'] = {
            'focus_styles': ':focus' in content,
            'high_contrast': 'contrast' in content.lower(),
            'reduced_motion': 'prefers-reduced-motion' in content
        }
        
        return analysis
    
    def analyze_package_json(self):
        """Analyze package.json for dependencies and scripts"""
        package_json_path = self.project_root / 'package.json'
        
        if not package_json_path.exists():
            return None
        
        try:
            with open(package_json_path, 'r', encoding='utf-8') as f:
                package_data = json.load(f)
        except:
            return None
        
        dependencies = package_data.get('dependencies', {})
        dev_dependencies = package_data.get('devDependencies', {})
        scripts = package_data.get('scripts', {})
        
        # Categorize dependencies
        ui_frameworks = ['react', 'vue', 'angular', '@angular/core']
        state_management = ['redux', 'mobx', 'zustand', 'recoil', '@reduxjs/toolkit']
        styling = ['styled-components', 'emotion', 'tailwindcss', 'bootstrap', 'material-ui', '@mui/material']
        routing = ['react-router', 'next', 'gatsby', '@reach/router']
        testing = ['jest', 'cypress', 'testing-library', 'enzyme', 'mocha', 'jasmine']
        
        analysis = {
            'total_dependencies': len(dependencies),
            'total_dev_dependencies': len(dev_dependencies),
            'scripts': scripts,
            'categorized_deps': {
                'ui_frameworks': [dep for dep in dependencies if any(fw in dep for fw in ui_frameworks)],
                'state_management': [dep for dep in dependencies if any(sm in dep for sm in state_management)],
                'styling': [dep for dep in dependencies if any(style in dep for style in styling)],
                'routing': [dep for dep in dependencies if any(router in dep for router in routing)],
                'testing': [dep for dep in {**dependencies, **dev_dependencies} if any(test in dep for test in testing)]
            },
            'version_info': {
                'react_version': dependencies.get('react', 'Not found'),
                'node_version': package_data.get('engines', {}).get('node', 'Not specified')
            }
        }
        
        return analysis
    
    def analyze_architecture(self, frontend_files):
        """Analyze overall frontend architecture"""
        architecture = {
            'file_organization': {},
            'component_hierarchy': {},
            'code_splitting': False,
            'bundle_optimization': False,
            'pwa_features': False
        }
        
        # File organization analysis
        for category, files in frontend_files.items():
            architecture['file_organization'][category] = {
                'count': len(files),
                'directories': len(set(f.parent for f in files))
            }
        
        # Check for code splitting patterns
        for files in frontend_files.values():
            for file_path in files:
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        if 'React.lazy' in content or 'import(' in content:
                            architecture['code_splitting'] = True
                        if 'webpack' in content.lower() or 'chunk' in content:
                            architecture['bundle_optimization'] = True
                        if 'serviceWorker' in content or 'manifest.json' in content:
                            architecture['pwa_features'] = True
                except:
                    continue
        
        return architecture
    
    def run_frontend_audit(self):
        """Run comprehensive frontend audit"""
        print("[START] Analyzing frontend implementation...")
        
        # Find all frontend files
        frontend_files = self.find_frontend_files()
        total_files = sum(len(files) for files in frontend_files.values())
        print(f"[INFO] Found {total_files} frontend files")
        
        # Analyze components
        component_analyses = []
        for file_path in frontend_files['components']:
            analysis = self.analyze_component(file_path)
            if analysis:
                component_analyses.append(analysis)
        
        # Analyze pages
        page_analyses = []
        for file_path in frontend_files['pages']:
            analysis = self.analyze_component(file_path)
            if analysis:
                page_analyses.append(analysis)
        
        # Analyze hooks
        hook_analyses = []
        for file_path in frontend_files['hooks']:
            analysis = self.analyze_component(file_path)
            if analysis:
                hook_analyses.append(analysis)
        
        # Analyze styling
        style_analyses = []
        for file_path in frontend_files['styles']:
            analysis = self.analyze_styling(file_path)
            if analysis:
                style_analyses.append(analysis)
        
        # Analyze package.json
        package_analysis = self.analyze_package_json()
        
        # Analyze architecture
        architecture_analysis = self.analyze_architecture(frontend_files)
        
        # Compile results
        self.audit_results['components'] = {
            'total_count': len(component_analyses),
            'functional_components': len([c for c in component_analyses if c['type'] == 'functional']),
            'class_components': len([c for c in component_analyses if c['type'] == 'class']),
            'analyses': component_analyses
        }
        
        self.audit_results['pages'] = {
            'total_count': len(page_analyses),
            'analyses': page_analyses
        }
        
        self.audit_results['hooks'] = {
            'total_count': len(hook_analyses),
            'custom_hooks': len([h for h in hook_analyses if any('use' in hook for hook in h.get('exports', []))]),
            'analyses': hook_analyses
        }
        
        self.audit_results['styling'] = {
            'total_files': len(style_analyses),
            'css_files': len([s for s in style_analyses if s['type'] == '.css']),
            'scss_files': len([s for s in style_analyses if s['type'] == '.scss']),
            'analyses': style_analyses
        }
        
        self.audit_results['dependencies'] = package_analysis
        self.audit_results['architecture'] = architecture_analysis
        
        # Calculate summary statistics
        self.calculate_frontend_statistics()
        
        # Generate recommendations
        self.generate_frontend_recommendations()
        
        print(f"[SUCCESS] Frontend audit completed!")
        print(f"  Components: {len(component_analyses)}")
        print(f"  Pages: {len(page_analyses)}")
        print(f"  Hooks: {len(hook_analyses)}")
        print(f"  Style Files: {len(style_analyses)}")
        
        return self.audit_results
    
    def calculate_frontend_statistics(self):
        """Calculate overall frontend statistics"""
        components = self.audit_results['components']['analyses']
        
        # Hook usage statistics
        all_hooks = []
        for comp in components:
            all_hooks.extend(comp.get('hooks_used', []))
        
        hook_usage = Counter(all_hooks)
        
        # Accessibility statistics
        total_aria_labels = sum(comp.get('accessibility', {}).get('aria_labels', 0) for comp in components)
        total_alt_texts = sum(comp.get('accessibility', {}).get('alt_texts', 0) for comp in components)
        
        # Performance statistics
        memo_usage = sum(1 for comp in components if comp.get('performance', {}).get('memo_usage', False))
        callback_usage = sum(comp.get('performance', {}).get('useCallback_count', 0) for comp in components)
        
        self.audit_results['statistics'] = {
            'hook_usage': dict(hook_usage.most_common(10)),
            'accessibility_score': {
                'total_aria_labels': total_aria_labels,
                'total_alt_texts': total_alt_texts,
                'components_with_accessibility': len([c for c in components if sum(c.get('accessibility', {}).values()) > 0])
            },
            'performance_score': {
                'memo_usage_count': memo_usage,
                'callback_usage_count': callback_usage,
                'components_with_optimization': len([c for c in components if any(c.get('performance', {}).values())])
            }
        }
    
    def generate_frontend_recommendations(self):
        """Generate frontend-specific recommendations"""
        recommendations = []
        
        components = self.audit_results['components']['analyses']
        total_components = len(components)
        
        # Check component type distribution
        functional_count = self.audit_results['components']['functional_components']
        class_count = self.audit_results['components']['class_components']
        
        if class_count > functional_count * 0.2:
            recommendations.append({
                'type': 'Architecture',
                'priority': 'Medium',
                'message': f'Consider migrating class components ({class_count}) to functional components for better performance.'
            })
        
        # Check accessibility
        components_with_a11y = len([c for c in components if sum(c.get('accessibility', {}).values()) > 0])
        if total_components > 0 and (components_with_a11y / total_components) < 0.5:
            recommendations.append({
                'type': 'Accessibility',
                'priority': 'High',
                'message': 'Low accessibility implementation. Add ARIA labels, alt texts, and semantic HTML.'
            })
        
        # Check performance optimization
        optimized_components = len([c for c in components if any(c.get('performance', {}).values())])
        if total_components > 0 and (optimized_components / total_components) < 0.3:
            recommendations.append({
                'type': 'Performance',
                'priority': 'Medium',
                'message': 'Consider adding React.memo, useCallback, and useMemo for performance optimization.'
            })
        
        # Check styling approach
        if self.audit_results['styling']['total_files'] > 50:
            recommendations.append({
                'type': 'Styling',
                'priority': 'Low',
                'message': 'Large number of style files. Consider CSS-in-JS or utility-first framework.'
            })
        
        self.audit_results['recommendations'] = recommendations
        
        print(f"[RECOMMENDATIONS] Generated {len(recommendations)} frontend recommendations")
        for rec in recommendations:
            print(f"    [{rec['priority']}] {rec['type']}: {rec['message']}")
    
    def save_report(self, filename="frontend_audit_report.json"):
        """Save frontend audit report"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(self.audit_results, f, indent=2, ensure_ascii=False, default=str)
            print(f"[SAVE] Frontend audit report saved to: {filename}")
            return filename
        except Exception as e:
            print(f"[ERROR] Failed to save frontend report: {e}")
            return None
    
    def print_summary(self):
        """Print frontend audit summary"""
        print("\n" + "="*60)
        print("FRONTEND UI/UX AUDIT SUMMARY")
        print("="*60)
        
        components_info = self.audit_results['components']
        print(f"Total Components: {components_info['total_count']}")
        print(f"Functional Components: {components_info['functional_components']}")
        print(f"Class Components: {components_info['class_components']}")
        
        pages_info = self.audit_results['pages']
        print(f"Total Pages: {pages_info['total_count']}")
        
        hooks_info = self.audit_results['hooks']
        print(f"Custom Hooks: {hooks_info['custom_hooks']}")
        
        styling_info = self.audit_results['styling']
        print(f"Style Files: {styling_info['total_files']}")
        
        if self.audit_results.get('statistics'):
            stats = self.audit_results['statistics']
            print(f"Components with Accessibility: {stats['accessibility_score']['components_with_accessibility']}")
            print(f"Components with Performance Optimization: {stats['performance_score']['components_with_optimization']}")
        
        print(f"Recommendations: {len(self.audit_results['recommendations'])}")
        print("="*60)

if __name__ == "__main__":
    project_root = r"C:\Users\saeee\OneDrive\Documents\project\samia-tarot"
    auditor = FrontendAuditor(project_root)
    
    results = auditor.run_frontend_audit()
    auditor.print_summary()
    auditor.save_report()