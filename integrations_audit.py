#!/usr/bin/env python3
"""
Integrations and External Services Audit Script
Analyzes external service integrations, APIs, and third-party dependencies
"""

import os
import json
import re
from pathlib import Path
from collections import defaultdict, Counter

class IntegrationsAuditor:
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        self.audit_results = {
            'external_services': {},
            'payment_integrations': {},
            'ai_services': {},
            'communication_services': {},
            'database_integrations': {},
            'cloud_services': {},
            'security_services': {},
            'monitoring_services': {},
            'dependencies_analysis': {},
            'environment_variables': {},
            'recommendations': []
        }
        
    def analyze_package_dependencies(self):
        """Analyze package.json for external service dependencies"""
        package_json_path = self.project_root / 'package.json'
        
        if not package_json_path.exists():
            return None
        
        try:
            with open(package_json_path, 'r', encoding='utf-8') as f:
                package_data = json.load(f)
        except:
            return None
        
        dependencies = {**package_data.get('dependencies', {}), **package_data.get('devDependencies', {})}
        
        # Categorize dependencies by service type
        service_categories = {
            'payment_services': [
                'stripe', 'square', 'paypal', 'braintree', 'razorpay', 
                'klarna', 'affirm', 'afterpay'
            ],
            'ai_services': [
                'openai', '@google-cloud/aiplatform', 'anthropic', 'cohere', 
                'huggingface', 'tensorflow', 'pytorch', 'langchain'
            ],
            'communication': [
                'twilio', 'sendgrid', 'nodemailer', 'socket.io', 'pusher', 
                'ably', 'webrtc', 'agora'
            ],
            'database': [
                'supabase', 'mongodb', 'prisma', 'typeorm', 'sequelize', 
                'mongoose', 'pg', 'mysql', 'redis'
            ],
            'cloud_storage': [
                'aws-sdk', '@google-cloud/storage', 'azure-storage', 
                'cloudinary', 'uploadcare', 'sharp'
            ],
            'monitoring': [
                'sentry', 'datadog', 'newrelic', 'winston', 'morgan', 
                'pino', 'rollbar'
            ],
            'security': [
                'helmet', 'cors', 'bcrypt', 'jsonwebtoken', 'passport', 
                'express-rate-limit', 'express-validator'
            ],
            'testing': [
                'jest', 'mocha', 'cypress', 'supertest', 'testing-library'
            ]
        }
        
        categorized_deps = {}
        for category, services in service_categories.items():
            categorized_deps[category] = {}
            for dep_name, version in dependencies.items():
                for service in services:
                    if service in dep_name.lower():
                        categorized_deps[category][dep_name] = version
        
        return {
            'total_dependencies': len(dependencies),
            'categorized_dependencies': categorized_deps,
            'all_dependencies': dependencies
        }
    
    def analyze_service_configurations(self):
        """Analyze configuration files for service setups"""
        config_files = []
        
        # Look for configuration files
        config_patterns = [
            '**/config/**/*.js',
            '**/config/**/*.json',
            '**/src/config/**/*.js',
            '**/src/lib/**/*.js',
            '**/src/services/**/*.js'
        ]
        
        for pattern in config_patterns:
            config_files.extend(list(self.project_root.glob(pattern)))
        
        service_configs = {}
        
        for config_file in config_files:
            try:
                with open(config_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Look for service-specific configurations
                services_found = {}
                
                # Payment services
                if any(keyword in content.lower() for keyword in ['stripe', 'square', 'paypal']):
                    services_found['payment'] = self.extract_payment_config(content)
                
                # AI services
                if any(keyword in content.lower() for keyword in ['openai', 'gpt', 'anthropic']):
                    services_found['ai'] = self.extract_ai_config(content)
                
                # Communication services
                if any(keyword in content.lower() for keyword in ['twilio', 'sendgrid', 'socket']):
                    services_found['communication'] = self.extract_communication_config(content)
                
                # Database configurations
                if any(keyword in content.lower() for keyword in ['supabase', 'postgres', 'redis']):
                    services_found['database'] = self.extract_database_config(content)
                
                if services_found:
                    service_configs[str(config_file.relative_to(self.project_root))] = services_found
                    
            except Exception as e:
                continue
        
        return service_configs
    
    def extract_payment_config(self, content):
        """Extract payment service configurations"""
        payment_config = {}
        
        # Stripe configuration
        if 'stripe' in content.lower():
            payment_config['stripe'] = {
                'publishable_key_present': 'STRIPE_PUBLISHABLE_KEY' in content or 'pk_' in content,
                'secret_key_present': 'STRIPE_SECRET_KEY' in content or 'sk_' in content,
                'webhook_configured': 'webhook' in content.lower(),
                'test_mode': 'pk_test' in content or 'sk_test' in content
            }
        
        # Square configuration
        if 'square' in content.lower():
            payment_config['square'] = {
                'app_id_present': 'SQUARE_APP_ID' in content,
                'access_token_present': 'SQUARE_ACCESS_TOKEN' in content,
                'environment_configured': 'sandbox' in content.lower() or 'production' in content.lower()
            }
        
        return payment_config
    
    def extract_ai_config(self, content):
        """Extract AI service configurations"""
        ai_config = {}
        
        # OpenAI configuration
        if 'openai' in content.lower():
            ai_config['openai'] = {
                'api_key_present': 'OPENAI_API_KEY' in content,
                'organization_configured': 'organization' in content.lower(),
                'models_specified': any(model in content for model in ['gpt-4', 'gpt-3.5', 'davinci']),
                'streaming_enabled': 'stream' in content.lower()
            }
        
        # Anthropic configuration
        if 'anthropic' in content.lower():
            ai_config['anthropic'] = {
                'api_key_present': 'ANTHROPIC_API_KEY' in content,
                'claude_models': 'claude' in content.lower()
            }
        
        return ai_config
    
    def extract_communication_config(self, content):
        """Extract communication service configurations"""
        comm_config = {}
        
        # Twilio configuration
        if 'twilio' in content.lower():
            comm_config['twilio'] = {
                'account_sid_present': 'TWILIO_ACCOUNT_SID' in content,
                'auth_token_present': 'TWILIO_AUTH_TOKEN' in content,
                'phone_number_configured': 'TWILIO_PHONE_NUMBER' in content,
                'services_used': []
            }
            
            if 'sms' in content.lower():
                comm_config['twilio']['services_used'].append('SMS')
            if 'voice' in content.lower() or 'call' in content.lower():
                comm_config['twilio']['services_used'].append('Voice')
            if 'video' in content.lower():
                comm_config['twilio']['services_used'].append('Video')
        
        # Socket.IO configuration
        if 'socket' in content.lower():
            comm_config['socketio'] = {
                'cors_configured': 'cors' in content.lower(),
                'namespace_used': 'namespace' in content.lower(),
                'authentication': 'auth' in content.lower(),
                'clustering': 'cluster' in content.lower()
            }
        
        return comm_config
    
    def extract_database_config(self, content):
        """Extract database service configurations"""
        db_config = {}
        
        # Supabase configuration
        if 'supabase' in content.lower():
            db_config['supabase'] = {
                'url_present': 'SUPABASE_URL' in content,
                'anon_key_present': 'SUPABASE_ANON_KEY' in content,
                'service_role_present': 'SUPABASE_SERVICE_ROLE' in content,
                'rls_configured': 'rls' in content.lower(),
                'realtime_enabled': 'realtime' in content.lower()
            }
        
        # Redis configuration
        if 'redis' in content.lower():
            db_config['redis'] = {
                'url_configured': 'REDIS_URL' in content,
                'password_protected': 'REDIS_PASSWORD' in content,
                'clustering': 'cluster' in content.lower(),
                'persistence': 'persist' in content.lower()
            }
        
        return db_config
    
    def analyze_environment_variables(self):
        """Analyze environment variable usage for external services"""
        env_patterns = {}
        
        # Look for files that use environment variables
        files_to_check = []
        for ext in ['js', 'jsx', 'ts', 'tsx']:
            files_to_check.extend(list(self.project_root.rglob(f'*.{ext}')))
        
        env_vars_found = set()
        
        for file_path in files_to_check[:100]:  # Limit to first 100 files for performance
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Find environment variable references
                env_matches = re.findall(r'process\.env\.([A-Z_][A-Z0-9_]*)', content)
                env_vars_found.update(env_matches)
                
            except:
                continue
        
        # Categorize environment variables by service
        service_env_vars = {
            'payment': [var for var in env_vars_found if any(service in var.lower() for service in ['stripe', 'square', 'paypal'])],
            'ai': [var for var in env_vars_found if any(service in var.lower() for service in ['openai', 'anthropic', 'ai'])],
            'communication': [var for var in env_vars_found if any(service in var.lower() for service in ['twilio', 'email', 'sms'])],
            'database': [var for var in env_vars_found if any(service in var.lower() for service in ['supabase', 'postgres', 'redis', 'db'])],
            'security': [var for var in env_vars_found if any(service in var.lower() for service in ['jwt', 'secret', 'key', 'token'])],
            'monitoring': [var for var in env_vars_found if any(service in var.lower() for service in ['sentry', 'log'])],
        }
        
        return {
            'total_env_vars': len(env_vars_found),
            'all_env_vars': list(env_vars_found),
            'categorized_env_vars': service_env_vars
        }
    
    def analyze_api_endpoints(self):
        """Analyze external API integrations in the codebase"""
        api_patterns = {}
        
        # Look for API calls in the codebase
        files_to_check = []
        for ext in ['js', 'jsx', 'ts', 'tsx']:
            files_to_check.extend(list(self.project_root.rglob(f'*.{ext}')))
        
        external_apis = set()
        
        for file_path in files_to_check[:50]:  # Limit for performance
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Find external API URLs
                url_matches = re.findall(r'https?://([^/\s"\']+)', content)
                external_apis.update(url_matches)
                
            except:
                continue
        
        # Filter out common non-service domains
        service_apis = [api for api in external_apis if not any(
            common in api.lower() for common in [
                'localhost', '127.0.0.1', 'example.com', 'test.com',
                'github.com', 'npm.com', 'jsdelivr.com', 'unpkg.com'
            ]
        )]
        
        return {
            'total_external_apis': len(external_apis),
            'service_apis': service_apis,
            'all_external_apis': list(external_apis)
        }
    
    def run_integrations_audit(self):
        """Run comprehensive integrations audit"""
        print("[START] Analyzing external service integrations...")
        
        # Analyze package dependencies
        dependencies_analysis = self.analyze_package_dependencies()
        print(f"[INFO] Analyzed {dependencies_analysis['total_dependencies'] if dependencies_analysis else 0} dependencies")
        
        # Analyze service configurations
        service_configs = self.analyze_service_configurations()
        print(f"[INFO] Found service configurations in {len(service_configs)} files")
        
        # Analyze environment variables
        env_analysis = self.analyze_environment_variables()
        print(f"[INFO] Found {env_analysis['total_env_vars']} environment variables")
        
        # Analyze API endpoints
        api_analysis = self.analyze_api_endpoints()
        print(f"[INFO] Found {len(api_analysis['service_apis'])} external service APIs")
        
        # Compile results
        self.audit_results['dependencies_analysis'] = dependencies_analysis
        self.audit_results['service_configurations'] = service_configs
        self.audit_results['environment_variables'] = env_analysis
        self.audit_results['external_apis'] = api_analysis
        
        # Analyze specific service categories
        self.analyze_service_categories(dependencies_analysis, service_configs)
        
        # Generate recommendations
        self.generate_integrations_recommendations()
        
        print(f"[SUCCESS] Integrations audit completed!")
        return self.audit_results
    
    def analyze_service_categories(self, dependencies_analysis, service_configs):
        """Analyze specific service categories in detail"""
        if not dependencies_analysis:
            return
        
        categorized_deps = dependencies_analysis['categorized_dependencies']
        
        # Payment integrations
        self.audit_results['payment_integrations'] = {
            'services_detected': list(categorized_deps.get('payment_services', {}).keys()),
            'stripe_configured': 'stripe' in str(service_configs).lower(),
            'square_configured': 'square' in str(service_configs).lower(),
            'multiple_providers': len(categorized_deps.get('payment_services', {})) > 1
        }
        
        # AI services
        self.audit_results['ai_services'] = {
            'services_detected': list(categorized_deps.get('ai_services', {}).keys()),
            'openai_configured': 'openai' in str(service_configs).lower(),
            'multiple_providers': len(categorized_deps.get('ai_services', {})) > 1,
            'models_variety': 'gpt' in str(service_configs).lower()
        }
        
        # Communication services
        self.audit_results['communication_services'] = {
            'services_detected': list(categorized_deps.get('communication', {}).keys()),
            'realtime_enabled': 'socket.io' in categorized_deps.get('communication', {}),
            'sms_enabled': any('twilio' in dep for dep in categorized_deps.get('communication', {})),
            'email_configured': any('nodemailer' in dep or 'sendgrid' in dep for dep in categorized_deps.get('communication', {}))
        }
        
        # Database integrations
        self.audit_results['database_integrations'] = {
            'services_detected': list(categorized_deps.get('database', {}).keys()),
            'primary_database': 'supabase' if '@supabase/supabase-js' in categorized_deps.get('database', {}) else 'unknown',
            'caching_enabled': 'redis' in categorized_deps.get('database', {}),
            'orm_used': any(orm in categorized_deps.get('database', {}) for orm in ['prisma', 'typeorm', 'sequelize'])
        }
        
        # Security services
        self.audit_results['security_services'] = {
            'services_detected': list(categorized_deps.get('security', {}).keys()),
            'rate_limiting': 'express-rate-limit' in categorized_deps.get('security', {}),
            'validation': 'express-validator' in categorized_deps.get('security', {}) or 'joi' in categorized_deps.get('security', {}),
            'security_headers': 'helmet' in categorized_deps.get('security', {}),
            'cors_configured': 'cors' in categorized_deps.get('security', {})
        }
        
        # Monitoring services
        self.audit_results['monitoring_services'] = {
            'services_detected': list(categorized_deps.get('monitoring', {}).keys()),
            'error_tracking': any(service in categorized_deps.get('monitoring', {}) for service in ['@sentry/browser', '@sentry/react']),
            'logging': any(service in categorized_deps.get('monitoring', {}) for service in ['winston', 'morgan', 'pino']),
            'performance_monitoring': 'web-vitals' in categorized_deps.get('monitoring', {})
        }
    
    def generate_integrations_recommendations(self):
        """Generate recommendations for integrations"""
        recommendations = []
        
        # Check payment integration security
        payment_services = self.audit_results['payment_integrations']['services_detected']
        if payment_services and not self.audit_results['security_services']['rate_limiting']:
            recommendations.append({
                'type': 'Security',
                'priority': 'High',
                'message': 'Payment integrations detected without rate limiting. Implement rate limiting for payment endpoints.'
            })
        
        # Check AI service monitoring
        ai_services = self.audit_results['ai_services']['services_detected']
        if ai_services and not self.audit_results['monitoring_services']['error_tracking']:
            recommendations.append({
                'type': 'Monitoring',
                'priority': 'Medium',
                'message': 'AI services detected without error tracking. Consider implementing error monitoring.'
            })
        
        # Check database backup strategy
        if self.audit_results['database_integrations']['primary_database'] == 'supabase':
            recommendations.append({
                'type': 'Data Management',
                'priority': 'Medium',
                'message': 'Ensure Supabase backup and disaster recovery procedures are in place.'
            })
        
        # Check environment variable security
        env_vars = self.audit_results['environment_variables']['total_env_vars']
        if env_vars > 20:
            recommendations.append({
                'type': 'Configuration',
                'priority': 'Low',
                'message': f'Large number of environment variables ({env_vars}). Consider using a secrets management solution.'
            })
        
        # Check service redundancy
        if len(payment_services) == 1:
            recommendations.append({
                'type': 'Reliability',
                'priority': 'Medium',
                'message': 'Single payment provider detected. Consider adding backup payment methods.'
            })
        
        self.audit_results['recommendations'] = recommendations
        
        print(f"[RECOMMENDATIONS] Generated {len(recommendations)} integration recommendations")
        for rec in recommendations:
            print(f"    [{rec['priority']}] {rec['type']}: {rec['message']}")
    
    def save_report(self, filename="integrations_audit_report.json"):
        """Save integrations audit report"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(self.audit_results, f, indent=2, ensure_ascii=False, default=str)
            print(f"[SAVE] Integrations audit report saved to: {filename}")
            return filename
        except Exception as e:
            print(f"[ERROR] Failed to save integrations report: {e}")
            return None
    
    def print_summary(self):
        """Print integrations audit summary"""
        print("\n" + "="*60)
        print("INTEGRATIONS & EXTERNAL SERVICES AUDIT SUMMARY")
        print("="*60)
        
        if self.audit_results['dependencies_analysis']:
            deps = self.audit_results['dependencies_analysis']
            print(f"Total Dependencies: {deps['total_dependencies']}")
        
        payment = self.audit_results['payment_integrations']
        print(f"Payment Services: {len(payment['services_detected'])}")
        if payment['services_detected']:
            print(f"  - {', '.join(payment['services_detected'])}")
        
        ai = self.audit_results['ai_services']
        print(f"AI Services: {len(ai['services_detected'])}")
        if ai['services_detected']:
            print(f"  - {', '.join(ai['services_detected'])}")
        
        comm = self.audit_results['communication_services']
        print(f"Communication Services: {len(comm['services_detected'])}")
        if comm['services_detected']:
            print(f"  - {', '.join(comm['services_detected'])}")
        
        db = self.audit_results['database_integrations']
        print(f"Database Services: {len(db['services_detected'])}")
        print(f"Primary Database: {db['primary_database']}")
        
        security = self.audit_results['security_services']
        print(f"Security Services: {len(security['services_detected'])}")
        
        monitoring = self.audit_results['monitoring_services']
        print(f"Monitoring Services: {len(monitoring['services_detected'])}")
        
        env_vars = self.audit_results['environment_variables']
        print(f"Environment Variables: {env_vars['total_env_vars']}")
        
        print(f"Recommendations: {len(self.audit_results['recommendations'])}")
        print("="*60)

if __name__ == "__main__":
    project_root = r"C:\Users\saeee\OneDrive\Documents\project\samia-tarot"
    auditor = IntegrationsAuditor(project_root)
    
    results = auditor.run_integrations_audit()
    auditor.print_summary()
    auditor.save_report()