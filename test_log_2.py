import requests
import json
from datetime import datetime, timedelta
import uuid

# BASE_URL = "http://localhost:5000"

BASE_URL = "https://ctf-events-backend.onrender.com"

class TestCTFEventsAPI:
    def __init__(self):
        self.admin_token = None
        self.user_token = None
        self.test_admin_username = None
        self.test_user_username = None
        
    def generate_unique_username(self, prefix="test"):
        """Generate unique username for tests"""
        return f"{prefix}_{uuid.uuid4().hex[:8]}"

    def cleanup_database(self):
        """Reset database state before each test"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        try:
            requests.post(f"{BASE_URL}/cleanup-test-data", headers=headers)
        except:
            pass  # Ignore cleanup errors

    def setup_method(self):
        """Setup method runs before each test"""
        self.cleanup_database()
        self.test_admin_username = self.generate_unique_username("admin")
        self.test_user_username = self.generate_unique_username("user")

    def test_admin_registration_invalid_password(self):
        """Test admin registration with invalid password formats"""
        self.setup_method()
        test_cases = [
            {"password": "short", "expected_message": "Password must be at least 6 characters long"},
            {"password": "nouppercase123", "expected_message": "Password must contain at least one uppercase letter"},
            {"password": "NoNumbers", "expected_message": "Password must contain at least one number"},
        ]
        
        for test in test_cases:
            payload = {
                "username": self.generate_unique_username(),
                "password": test["password"]
            }
            response = requests.post(f"{BASE_URL}/register", json=payload)
            assert response.status_code == 400
            assert test["expected_message"] in response.text
        print("✅ Admin registration password validation tests passed")

    def test_duplicate_admin_registration(self):
        """Test duplicate admin registration"""
        self.setup_method()
        payload = {
            "username": self.test_admin_username,
            "password": "Admin123"
        }
        # First registration
        response = requests.post(f"{BASE_URL}/register", json=payload)
        assert response.status_code == 201, f"First registration failed: {response.text}"
        
        # Duplicate registration
        response = requests.post(f"{BASE_URL}/register", json=payload)
        assert response.status_code == 409, f"Expected 409, got {response.status_code}"
        assert "Username already exists" in response.text
        print("✅ Duplicate admin registration test passed")

    def test_user_registration_validation(self):
        """Test user registration validations"""
        self.setup_method()
        test_cases = [
            {"payload": {"username": "", "password": ""}, 
             "expected_code": 400,
             "expected_message": "Username and password are required"},
            {"payload": {"username": self.test_user_username, "password": "weak"}, 
             "expected_code": 400,
             "expected_message": "Password must be at least 6 characters long"},
            {"payload": {"username": self.test_user_username, "password": "weakness123"}, 
             "expected_code": 400,
             "expected_message": "Password must contain at least one uppercase letter"}
        ]
        
        for test in test_cases:
            response = requests.post(f"{BASE_URL}/register-user", json=test["payload"])
            assert response.status_code == test["expected_code"], \
                f"Expected {test['expected_code']}, got {response.status_code}: {response.text}"
            assert test["expected_message"] in response.text, \
                f"Expected message not found in response: {response.text}"
        
        print("✅ User registration validation tests passed")

    def test_user_login_failures(self):
        """Test user login failure cases"""
        self.setup_method()
        # Test non-existent user
        payload = {
            "username": "nonexistent",
            "password": "Password123"
        }
        response = requests.post(f"{BASE_URL}/login-user", json=payload)
        assert response.status_code == 401
        
        # Test wrong password
        payload = {
            "username": "rohi",
            "password": "wrongpassword"
        }
        response = requests.post(f"{BASE_URL}/login-user", json=payload)
        assert response.status_code == 401
        print("✅ User login failure tests passed")

    def test_admin_registration(self):
        """Test admin registration endpoint"""
        self.setup_method()
        payload = {
            # "username": self.test_admin_username,
            # "password": "Admin123"
            "username": "padma",
            "password": "Padma123"
        }
        response = requests.post(f"{BASE_URL}/register", json=payload)
        assert response.status_code == 201, f"Admin registration failed: {response.text}"
        print("✅ Admin registration test passed")

    def test_admin_login(self):
        """Test admin login endpoint"""
        self.setup_method()
        # Register admin first
        payload = {
            "username": self.test_admin_username,
            "password": "Admin123"
        }
        requests.post(f"{BASE_URL}/register", json=payload)
        
        # Then try login
        response = requests.post(f"{BASE_URL}/login", json=payload)
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        assert "token" in response.json()
        self.admin_token = response.json()["token"]
        print("✅ Admin login test passed")

    def test_user_registration(self):
        """Test user registration endpoint"""
        self.setup_method()
        payload = {
            "username": self.test_user_username,
            "password": "User123"  # Fixed: Added uppercase and number
        }
        response = requests.post(f"{BASE_URL}/register-user", json=payload)
        
        # Added better error handling
        if response.status_code != 201:
            print(f"❌ User registration failed with status {response.status_code}")
            print(f"Response: {response.text}")
            raise AssertionError(f"Expected status code 201, got {response.status_code}: {response.text}")
        
        print("✅ User registration test passed")

    def test_user_login(self):
        """Test user login endpoint"""
        self.setup_method()
        
        # First register the user
        register_payload = {
            "username": self.test_user_username,
            "password": "User123"  # Fixed: Match registration password
        }
        register_response = requests.post(f"{BASE_URL}/register-user", json=register_payload)
        assert register_response.status_code == 201, f"User registration failed: {register_response.text}"
        
        # Then try login
        login_payload = {
            "username": self.test_user_username,
            "password": "User123"  # Fixed: Match registration password
        }
        response = requests.post(f"{BASE_URL}/login-user", json=login_payload)
        
        # Add error logging for debugging
        if response.status_code != 200:
            print(f"❌ User login failed with status {response.status_code}")
            print(f"Response: {response.text}")
            raise AssertionError(f"Expected status code 200, got {response.status_code}")
        
        data = response.json()
        assert "token" in data, "Token not found in response"
        self.user_token = data["token"]
        print("✅ User login test passed")

    def test_create_event(self):
        """Test event creation endpoint"""
        self.setup_method()
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        payload = {
            "title": "Test Event",
            "subtitle": "Test Subtitle",
            "description": "Test Description",
            "dateTime": (datetime.now() + timedelta(days=1)).isoformat(),
            "poster": "base64_encoded_image_string",
            "gformLink": "https://forms.google.com/test",
            "location": "Test Location",
            "locationLink": "https://maps.google.com/test",
            "instaLink": "https://instagram.com/test"
        }
        response = requests.post(f"{BASE_URL}/events", json=payload, headers=headers)
        assert response.status_code == 201
        print("✅ Event creation test passed")

    def test_get_events(self):
        """Test get all events endpoint"""
        self.setup_method()
        response = requests.get(f"{BASE_URL}/events")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("✅ Get events test passed")

    def test_create_announcement(self):
        """Test announcement creation endpoint"""
        self.setup_method()
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        payload = {
            "description": "Test Announcement",
            "poster": "base64_encoded_image_string",
            "instaLink": "https://instagram.com/test",
            "gformLink": "https://forms.google.com/test"
        }
        response = requests.post(f"{BASE_URL}/announcements", json=payload, headers=headers)
        assert response.status_code == 201
        print("✅ Announcement creation test passed")

    def test_get_announcements(self):
        """Test get all announcements endpoint"""
        self.setup_method()
        response = requests.get(f"{BASE_URL}/announcements")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("✅ Get announcements test passed")

    def test_get_admin_events(self):
        """Test get events by admin username endpoint"""
        self.setup_method()
        response = requests.get(f"{BASE_URL}/events/admin/testadmin")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("✅ Get admin events test passed")

    def test_get_admin_announcements(self):
        """Test get announcements by admin username endpoint"""
        self.setup_method()
        response = requests.get(f"{BASE_URL}/announcements/admin/testadmin")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("✅ Get admin announcements test passed")

    def test_unauthorized_access(self):
        """Test unauthorized access to protected endpoints"""
        self.setup_method()
        headers = {"Authorization": f"Bearer {self.user_token}"}
        payload = {
            "title": "Test Event",
            "description": "Test Description",
            "dateTime": datetime.now().isoformat()
        }
        response = requests.post(f"{BASE_URL}/events", json=payload, headers=headers)
        assert response.status_code == 403
        print("✅ Unauthorized access test passed")

    def test_admin_login_failures(self):
        """Test admin login failure cases"""
        self.setup_method()
        # Test non-existent admin
        payload = {
            "username": "nonexistent",
            "password": "Admin123"
        }
        response = requests.post(f"{BASE_URL}/login", json=payload)
        assert response.status_code == 401
        
        # Test wrong password
        payload = {
            "username": "rohith",
            "password": "wrongpassword"
        }
        response = requests.post(f"{BASE_URL}/login", json=payload)
        assert response.status_code == 401
        print("✅ Admin login failure tests passed")

def run_tests():
    test_api = TestCTFEventsAPI()
    failed_tests = []
    
    test_methods = [
        # test_api.test_admin_registration_invalid_password,
        # test_api.test_duplicate_admin_registration,
        # test_api.test_user_registration_validation,
        # test_api.test_admin_login_failures,
        # test_api.test_user_login_failures,
        test_api.test_admin_registration,
        # test_api.test_admin_login,
        # test_api.test_user_registration,  # User registration before login
        # test_api.test_user_login,        # Login after registration
        # test_api.test_create_event,
        # test_api.test_get_events,
        # test_api.test_create_announcement,
        # test_api.test_get_announcements,
        # test_api.test_get_admin_events,
        # test_api.test_get_admin_announcements,
        # test_api.test_unauthorized_access
    ]

    try:
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                failed_tests.append(f"{test_method.__name__}: {str(e)}")
                print(f"\n❌ {test_method.__name__} failed: {str(e)}")
                continue

        if failed_tests:
            print("\n❌ Some tests failed:")
            for failure in failed_tests:
                print(f"  - {failure}")
        else:
            print("\n✅ All tests passed successfully!")
            
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
    finally:
        test_api.cleanup_database()

if __name__ == "__main__":
    run_tests()