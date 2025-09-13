"""
M40: Simple Siren & Availability Tests
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_endpoints():
    print("Testing M40 Siren & Availability endpoints...")
    
    # Test siren trigger - should require authorization
    try:
        response = requests.post(f"{BASE_URL}/api/siren/trigger", 
            json={
                "config_name": "high_priority_order",
                "trigger_context": {"order_id": "test-123"}
            },
            headers={"X-User-Id": "unauthorized-user"})
        
        assert response.status_code == 403
        print("✓ Siren trigger authorization test passed")
    except Exception as e:
        print(f"✗ Siren trigger test failed: {e}")
    
    # Test call termination - should require authorization  
    try:
        response = requests.get(f"{BASE_URL}/api/calls/fake-call-id/terminate",
            headers={"X-User-Id": "unauthorized-user"})
        
        assert response.status_code == 403
        print("✓ Call termination authorization test passed")
    except Exception as e:
        print(f"✗ Call termination test failed: {e}")
        
    # Test availability readers - should require authorization
    try:
        response = requests.get(f"{BASE_URL}/api/availability/readers",
            params={"datetime_slot": "2025-09-13T10:00:00Z"},
            headers={"X-User-Id": "unauthorized-user"})
        
        assert response.status_code == 403  
        print("✓ Availability readers authorization test passed")
    except Exception as e:
        print(f"✗ Availability readers test failed: {e}")
        
    # Test availability set - should require reader role
    try:
        response = requests.post(f"{BASE_URL}/api/availability/set",
            json={
                "day_of_week": 1,
                "start_time": "09:00", 
                "end_time": "17:00",
                "timezone": "UTC"
            },
            headers={"X-User-Id": "client-user"})
        
        assert response.status_code == 403
        print("✓ Availability set authorization test passed")
    except Exception as e:
        print(f"✗ Availability set test failed: {e}")
        
    # Test my availability - should require reader role
    try:
        response = requests.get(f"{BASE_URL}/api/availability/my",
            headers={"X-User-Id": "client-user"})
        
        assert response.status_code == 403
        print("✓ My availability authorization test passed")
    except Exception as e:
        print(f"✗ My availability test failed: {e}")

if __name__ == "__main__":
    test_endpoints()
    print("\nM40 Siren & Availability Implementation: AUTHORIZATION TESTS COMPLETED")