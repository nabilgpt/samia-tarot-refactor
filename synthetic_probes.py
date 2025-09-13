#!/usr/bin/env python3
"""
Synthetic Probes - TestFlight/Play Internal Monitoring
Automated health checks for mobile store deployment validation.
"""

import requests
import json
import time
from datetime import datetime, timezone
from urllib.parse import urljoin

class SyntheticProbeRunner:
    def __init__(self, base_url="https://api.samia-tarot.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.timeout = 30
        self.results = []
    
    def log_result(self, probe_name, success, duration_ms, error=None, details=None):
        """Log probe result"""
        result = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'probe': probe_name,
            'success': success,
            'duration_ms': duration_ms,
            'error': error,
            'details': details or {}
        }
        self.results.append(result)
        
        status = "✅" if success else "❌"
        print(f"{status} {probe_name} ({duration_ms}ms)")
        if error:
            print(f"    Error: {error}")
    
    def probe_health_endpoint(self):
        """Test basic health endpoint"""
        start_time = time.time()
        
        try:
            response = self.session.get(urljoin(self.base_url, "/api/ops/health"))
            duration_ms = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                self.log_result("health_endpoint", True, duration_ms, details={
                    'status': data.get('status'),
                    'version': data.get('version'),
                    'db_status': data.get('database', {}).get('status')
                })
                return True
            else:
                self.log_result("health_endpoint", False, duration_ms, 
                               error=f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            self.log_result("health_endpoint", False, duration_ms, error=str(e))
            return False
    
    def probe_daily_horoscopes(self):
        """Test public daily horoscopes endpoint"""
        start_time = time.time()
        
        try:
            response = self.session.get(urljoin(self.base_url, "/api/horoscopes/daily"))
            duration_ms = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                horoscope_count = len(data) if isinstance(data, list) else 0
                
                # Validate response structure
                valid_structure = True
                if horoscope_count > 0:
                    first_horoscope = data[0]
                    required_fields = ['id', 'scope', 'zodiac', 'ref_date']
                    valid_structure = all(field in first_horoscope for field in required_fields)
                
                self.log_result("daily_horoscopes", valid_structure, duration_ms, details={
                    'horoscope_count': horoscope_count,
                    'valid_structure': valid_structure
                })
                return valid_structure
            else:
                self.log_result("daily_horoscopes", False, duration_ms,
                               error=f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            self.log_result("daily_horoscopes", False, duration_ms, error=str(e))
            return False
    
    def probe_payment_webhook_reachability(self):
        """Test payment webhook endpoint reachability (expect 400/503, not 404)"""
        start_time = time.time()
        
        try:
            # Send empty POST to webhook endpoint
            response = self.session.post(
                urljoin(self.base_url, "/api/payments/webhook"),
                json={},
                headers={'Content-Type': 'application/json'}
            )
            duration_ms = int((time.time() - start_time) * 1000)
            
            # Webhook should return 400 (bad signature) or 503 (no provider), NOT 404
            expected_codes = [400, 503]
            reachable = response.status_code in expected_codes
            
            self.log_result("payment_webhook_reachability", reachable, duration_ms, details={
                'status_code': response.status_code,
                'expected': expected_codes
            })
            return reachable
            
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            self.log_result("payment_webhook_reachability", False, duration_ms, error=str(e))
            return False
    
    def probe_auth_endpoints(self):
        """Test authentication endpoint availability"""
        start_time = time.time()
        
        try:
            # Test auth sync endpoint
            response = self.session.post(
                urljoin(self.base_url, "/api/auth/sync"),
                json={'token': 'test'},
                headers={'Content-Type': 'application/json'}
            )
            duration_ms = int((time.time() - start_time) * 1000)
            
            # Should return 401 (unauthorized) or 400 (bad request), not 404
            expected_codes = [400, 401, 422]
            reachable = response.status_code in expected_codes
            
            self.log_result("auth_endpoints", reachable, duration_ms, details={
                'status_code': response.status_code,
                'expected': expected_codes
            })
            return reachable
            
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            self.log_result("auth_endpoints", False, duration_ms, error=str(e))
            return False
    
    def probe_meta_endpoints(self):
        """Test metadata endpoints (countries, zodiacs)"""
        start_time = time.time()
        
        try:
            # Test countries endpoint
            response = self.session.get(urljoin(self.base_url, "/api/meta/countries"))
            duration_ms = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                has_countries = isinstance(data, list) and len(data) > 0
                
                self.log_result("meta_endpoints", has_countries, duration_ms, details={
                    'countries_count': len(data) if isinstance(data, list) else 0
                })
                return has_countries
            else:
                self.log_result("meta_endpoints", False, duration_ms,
                               error=f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            self.log_result("meta_endpoints", False, duration_ms, error=str(e))
            return False
    
    def probe_tiktok_rejection(self):
        """Test that TikTok ingestion properly returns 410"""
        start_time = time.time()
        
        try:
            response = self.session.post(
                urljoin(self.base_url, "/api/horoscopes/ingest"),
                json={
                    'tiktok_url': 'https://www.tiktok.com/@test/video/123456789',
                    'scope': 'daily',
                    'zodiac': 'aries'
                },
                headers={
                    'Content-Type': 'application/json',
                    'X-User-ID': '00000000-0000-0000-0000-000000000001'
                }
            )
            duration_ms = int((time.time() - start_time) * 1000)
            
            # Should return 410 Gone (TikTok disabled) or 401 (auth required)
            expected_codes = [401, 410, 422]
            properly_rejected = response.status_code in expected_codes
            
            self.log_result("tiktok_rejection", properly_rejected, duration_ms, details={
                'status_code': response.status_code,
                'expected': expected_codes,
                'properly_disabled': response.status_code == 410
            })
            return properly_rejected
            
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            self.log_result("tiktok_rejection", False, duration_ms, error=str(e))
            return False
    
    def run_all_probes(self):
        """Run complete synthetic probe suite"""
        print("=" * 60)
        print("🔬 SAMIA-TAROT Synthetic Probes - Mobile Store Validation")
        print(f"🌐 Target: {self.base_url}")
        print("=" * 60)
        
        probes = [
            self.probe_health_endpoint,
            self.probe_daily_horoscopes,
            self.probe_payment_webhook_reachability,
            self.probe_auth_endpoints,
            self.probe_meta_endpoints,
            self.probe_tiktok_rejection
        ]
        
        passed = 0
        failed = 0
        
        for probe in probes:
            try:
                success = probe()
                if success:
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"❌ {probe.__name__} EXCEPTION: {e}")
                failed += 1
        
        print("\n" + "=" * 60)
        print(f"🔬 Synthetic Probes Complete: {passed} passed, {failed} failed")
        
        # Calculate overall health score
        total_probes = passed + failed
        health_score = int((passed / total_probes) * 100) if total_probes > 0 else 0
        
        print(f"📊 Health Score: {health_score}%")
        
        if health_score >= 85:
            print("✅ MOBILE DEPLOYMENT READY")
            print("📱 Safe for TestFlight/Play Internal release")
        elif health_score >= 70:
            print("⚠️  DEPLOYMENT CAUTION")
            print("🛠️  Some issues detected - review before release")
        else:
            print("❌ DEPLOYMENT BLOCKED")
            print("🚨 Critical issues - fix before mobile release")
        
        print("=" * 60)
        
        return health_score >= 85
    
    def export_results(self, filename="synthetic_probe_results.json"):
        """Export probe results to JSON file"""
        with open(filename, 'w') as f:
            json.dump({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'base_url': self.base_url,
                'total_probes': len(self.results),
                'passed': sum(1 for r in self.results if r['success']),
                'failed': sum(1 for r in self.results if not r['success']),
                'results': self.results
            }, f, indent=2)
        
        print(f"📄 Results exported to {filename}")

# Test environments for mobile deployment
TEST_ENVIRONMENTS = {
    'local': 'http://localhost:8000',
    'staging': 'https://staging-api.samia-tarot.com',
    'production': 'https://api.samia-tarot.com'
}

def main():
    """Run synthetic probes against specified environment"""
    import sys
    
    # Default to production for mobile store validation
    env = sys.argv[1] if len(sys.argv) > 1 else 'production'
    base_url = TEST_ENVIRONMENTS.get(env, env)
    
    print(f"🎯 Running probes against {env}: {base_url}")
    
    runner = SyntheticProbeRunner(base_url)
    success = runner.run_all_probes()
    runner.export_results(f"probe_results_{env}_{int(time.time())}.json")
    
    exit(0 if success else 1)

if __name__ == "__main__":
    main()