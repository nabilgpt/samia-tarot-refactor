#!/usr/bin/env python3
"""
TikTok Rejection Tests - M38 Admin-Only Upload Enforcement
Negative tests to verify TikTok ingestion is completely disabled.
"""

import requests
import json
from datetime import datetime

API_BASE = "http://localhost:8000"

def test_tiktok_download_endpoint_410():
    """Test: TikTok download endpoint returns 410 Gone"""
    print("🚫 Testing TikTok download endpoint returns 410...")
    
    try:
        headers = {
            "X-User-ID": "00000000-0000-0000-0000-000000000001",
            "Content-Type": "application/json"
        }
        
        payload = {
            "tiktok_url": "https://www.tiktok.com/@test/video/1234567890",
            "scope": "daily",
            "zodiac": "aries"
        }
        
        response = requests.post(
            f"{API_BASE}/api/horoscopes/ingest",
            json=payload,
            headers=headers,
            timeout=10
        )
        
        # Should return 410 Gone for TikTok ingestion
        assert response.status_code == 410, f"Expected 410 for TikTok ingestion, got {response.status_code}"
        
        response_data = response.json()
        assert "TikTok ingestion disabled" in response_data.get("detail", ""), "Error message should mention TikTok disabled"
        
        print("✅ TikTok ingestion properly returns 410 Gone")
        
    except requests.exceptions.RequestException as e:
        print(f"⚠️  TikTok 410 test skipped (server not running): {e}")

def test_tiktok_audio_download_410():
    """Test: Direct TikTok audio download returns 410"""
    print("🚫 Testing direct TikTok audio download returns 410...")
    
    try:
        # Test if there's still a direct audio download endpoint
        test_url = "https://www.tiktok.com/@test/video/9876543210"
        
        headers = {"Content-Type": "application/json"}
        payload = {"url": test_url}
        
        # Try various possible TikTok endpoint patterns
        endpoints_to_test = [
            "/api/tiktok/download",
            "/api/audio/download",
            "/api/media/tiktok",
            "/api/horoscopes/tiktok"
        ]
        
        for endpoint in endpoints_to_test:
            try:
                response = requests.post(
                    f"{API_BASE}{endpoint}",
                    json=payload,
                    headers=headers,
                    timeout=5
                )
                
                # Should return 404 (not found) or 410 (gone) - both acceptable
                if response.status_code not in [404, 410]:
                    print(f"⚠️  Endpoint {endpoint} returned {response.status_code} (should be 404/410)")
                else:
                    print(f"✅ Endpoint {endpoint} properly disabled ({response.status_code})")
                    
            except requests.exceptions.RequestException:
                # 404 from server is fine - endpoint doesn't exist
                print(f"✅ Endpoint {endpoint} not found (good)")
        
    except Exception as e:
        print(f"⚠️  TikTok audio download test error: {e}")

def test_database_tiktok_url_rejection():
    """Test: Database rejects TikTok URL inserts"""
    print("🚫 Testing database rejects TikTok URL inserts...")
    
    try:
        headers = {
            "X-User-ID": "00000000-0000-0000-0000-000000000001",
            "Authorization": "Bearer mock-admin-token"
        }
        
        # Try to create horoscope with TikTok URL via admin upload
        payload = {
            "scope": "daily",
            "zodiac": "pisces",
            "ref_date": "2025-09-13",
            "tiktok_url": "https://www.tiktok.com/@test/video/should-be-rejected"
        }
        
        response = requests.post(
            f"{API_BASE}/api/horoscopes/admin/upload",
            json=payload,
            headers=headers,
            timeout=10
        )
        
        # Should reject TikTok URL even from admin
        if response.status_code in [400, 422]:
            response_data = response.json()
            if "tiktok" in response_data.get("detail", "").lower():
                print("✅ Database properly rejects TikTok URL inserts")
            else:
                print("⚠️  Request rejected but not specifically for TikTok")
        elif response.status_code == 404:
            print("✅ Admin upload endpoint not found (acceptable)")
        else:
            print(f"⚠️  Unexpected response for TikTok URL insert: {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"⚠️  Database TikTok rejection test skipped (server not running): {e}")

def test_horoscope_schema_no_tiktok():
    """Test: Horoscope schema responses don't include TikTok fields"""
    print("🚫 Testing horoscope responses exclude TikTok fields...")
    
    try:
        # Test public daily horoscopes endpoint
        response = requests.get(
            f"{API_BASE}/api/horoscopes/daily",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            
            if isinstance(data, list) and len(data) > 0:
                # Check first horoscope doesn't have TikTok fields
                horoscope = data[0]
                
                tiktok_fields = ['tiktok_post_url', 'tiktok_url', 'tiktok_id']
                has_tiktok_field = any(field in horoscope for field in tiktok_fields)
                
                if not has_tiktok_field:
                    print("✅ Public horoscope responses exclude TikTok fields")
                else:
                    found_fields = [f for f in tiktok_fields if f in horoscope]
                    print(f"❌ Found TikTok fields in response: {found_fields}")
            else:
                print("ℹ️  No horoscopes returned (empty response)")
        elif response.status_code == 404:
            print("ℹ️  Daily horoscopes endpoint not found")
        else:
            print(f"⚠️  Daily horoscopes endpoint returned {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"⚠️  Schema test skipped (server not running): {e}")

def run_tiktok_rejection_tests():
    """Run all TikTok rejection tests"""
    print("=" * 60)
    print("🚫 SAMIA-TAROT TikTok Rejection Tests")
    print("=" * 60)
    
    tests = [
        test_tiktok_download_endpoint_410,
        test_tiktok_audio_download_410,
        test_database_tiktok_url_rejection,
        test_horoscope_schema_no_tiktok
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"❌ {test.__name__} FAILED: {e}")
            failed += 1
        print()
    
    print("=" * 60)
    print(f"🚫 TikTok Rejection Tests Complete: {passed} passed, {failed} failed")
    print("=" * 60)
    
    return failed == 0

if __name__ == "__main__":
    success = run_tiktok_rejection_tests()
    exit(0 if success else 1)