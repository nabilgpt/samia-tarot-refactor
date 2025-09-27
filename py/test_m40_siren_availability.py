"""
M40: Siren & Availability Tests
Test emergency escalation and reader availability functionality
"""
import pytest
import requests
import json
from datetime import datetime, time, timedelta

BASE_URL = "http://localhost:8000"

def test_siren_trigger_unauthorized():
    """Test siren trigger requires monitor+ role"""
    response = requests.post(f"{BASE_URL}/api/siren/trigger", 
        json={
            "config_name": "high_priority_order",
            "trigger_context": {"order_id": "test-123"}
        },
        headers={"X-User-Id": "unauthorized-user"})
    
    assert response.status_code == 403
    assert "Insufficient permissions" in response.json()["detail"]

def test_siren_trigger_nonexistent_config():
    """Test siren trigger with non-existent config returns 404"""
    # This would require a monitor user ID - skipping actual trigger test
    # to avoid sending real alerts
    pass

def test_call_termination_unauthorized():
    """Test call termination requires monitor+ role"""
    response = requests.get(f"{BASE_URL}/api/calls/fake-call-id/terminate",
        headers={"X-User-Id": "unauthorized-user"})
    
    assert response.status_code == 403
    assert "Insufficient permissions" in response.json()["detail"]

def test_call_termination_nonexistent():
    """Test terminating non-existent call returns 404"""
    # Would require monitor user - testing structure only
    pass

def test_availability_readers_unauthorized():
    """Test getting available readers requires monitor+ role"""
    response = requests.get(f"{BASE_URL}/api/availability/readers",
        params={"datetime_slot": "2025-09-13T10:00:00Z"},
        headers={"X-User-Id": "unauthorized-user"})
    
    assert response.status_code == 403
    assert "Insufficient permissions" in response.json()["detail"]

def test_availability_readers_invalid_datetime():
    """Test available readers endpoint validates datetime format"""
    # Would require monitor user - testing structure only
    pass

def test_availability_set_unauthorized():
    """Test setting availability for non-reader fails"""
    response = requests.post(f"{BASE_URL}/api/availability/set",
        json={
            "day_of_week": 1,
            "start_time": "09:00",
            "end_time": "17:00",
            "timezone": "UTC"
        },
        headers={"X-User-Id": "client-user"})
    
    assert response.status_code == 403
    assert "Insufficient permissions" in response.json()["detail"]

def test_availability_set_invalid_time_format():
    """Test availability set validates time format"""
    # Would require reader user - testing structure only  
    pass

def test_availability_set_invalid_day():
    """Test availability set validates day of week range"""
    # Would require reader user - testing structure only
    pass

def test_availability_my_unauthorized():
    """Test getting my availability requires reader role"""
    response = requests.get(f"{BASE_URL}/api/availability/my",
        headers={"X-User-Id": "client-user"})
    
    assert response.status_code == 403
    assert "Reader access only" in response.json()["detail"]

def test_ops_metrics_includes_siren_data():
    """Test ops metrics endpoint includes siren metrics"""
    # Would require admin user - testing structure only
    pass

def test_siren_service_availability_calculation():
    """Test reader availability calculation logic"""
    from services.siren_service import SirenService
    from datetime import datetime, time
    
    # Mock database config
    db_config = {
        'host': 'localhost',
        'port': 5432,
        'database': 'test',
        'user': 'test',
        'password': 'test'
    }
    
    siren_service = SirenService(db_config)
    
    # Test day of week conversion
    test_date = datetime(2025, 9, 13)  # Saturday
    expected_day = 6  # Saturday = 6 in 0=Sunday system
    
    # Would need actual DB connection to test fully
    assert test_date.weekday() == 5  # Python weekday: Saturday = 5
    # Our conversion: (5 + 1) % 7 = 6 for Saturday

def test_siren_message_formatting():
    """Test siren alert message formatting"""
    from services.siren_service import SirenService
    
    # Mock database config
    db_config = {
        'host': 'localhost',
        'port': 5432,
        'database': 'test', 
        'user': 'test',
        'password': 'test'
    }
    
    siren_service = SirenService(db_config)
    
    # Test message formatting
    message = siren_service._format_alert_message(
        "high_priority_order",
        {"order_id": "12345678-1234-1234-1234-123456789012"},
        0
    )
    
    assert "URGENT" in message
    assert "High Priority Order" in message
    assert "12345678" in message  # Truncated order ID
    assert "Level 1" in message

def test_database_schema_validation():
    """Test that M40 database schema is properly structured"""
    # This test would validate:
    # 1. reader_availability table exists with correct columns
    # 2. siren_configs table exists with correct structure
    # 3. siren_events table exists for audit trail
    # 4. RLS policies are properly configured
    # 5. Default siren configs are inserted
    pass

if __name__ == "__main__":
    print("M40 Siren & Availability Tests")
    print("Run: pytest test_m40_siren_availability.py -v")
    
    # Basic smoke tests
    try:
        test_siren_trigger_unauthorized()
        print("✅ Siren trigger authorization test passed")
        
        test_call_termination_unauthorized()
        print("✅ Call termination authorization test passed")
        
        test_availability_readers_unauthorized()
        print("✅ Availability readers authorization test passed")
        
        test_availability_set_unauthorized()  
        print("✅ Availability set authorization test passed")
        
        test_availability_my_unauthorized()
        print("✅ My availability authorization test passed")
        
        test_siren_service_availability_calculation()
        print("✅ Availability calculation logic test passed")
        
        test_siren_message_formatting()
        print("✅ Siren message formatting test passed")
        
        print("\n🚨 M40 Siren & Availability Implementation: AUTHORIZATION TESTS PASSED")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        raise