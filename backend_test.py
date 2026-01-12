#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import uuid

class CampusVoiceAPITester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f" (Expected {expected_status})"
                try:
                    error_data = response.json()
                    details += f" - {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f" - {response.text[:100]}"

            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return {}
            return None

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return None

    def test_auth_register(self):
        """Test user registration"""
        test_user_data = {
            "email": f"test_student_{uuid.uuid4().hex[:8]}@university.edu",
            "password": "TestPass123!",
            "name": "Test Student",
            "role": "student",
            "student_id": f"STU{datetime.now().strftime('%Y%m%d%H%M%S')}"
        }
        
        response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        
        if response and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_auth_login(self):
        """Test user login with existing credentials"""
        # Create a test user first
        test_email = f"login_test_{uuid.uuid4().hex[:8]}@university.edu"
        test_password = "LoginTest123!"
        
        # Register user
        register_data = {
            "email": test_email,
            "password": test_password,
            "name": "Login Test User",
            "role": "student",
            "student_id": f"LTU{datetime.now().strftime('%H%M%S')}"
        }
        
        register_response = self.run_test(
            "Register for Login Test",
            "POST",
            "auth/register",
            200,
            data=register_data
        )
        
        if not register_response:
            return False
        
        # Now test login
        login_data = {
            "email": test_email,
            "password": test_password
        }
        
        response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        return response and response.get('success') and 'access_token' in response.get('data', {})

    def test_auth_me(self):
        """Test get current user"""
        response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return response and 'id' in response

    def test_create_complaint(self):
        """Test complaint creation"""
        complaint_data = {
            "title": "Test Complaint - Hostel WiFi Issue",
            "description": "The WiFi in my hostel room is very slow and keeps disconnecting. This is affecting my studies and online classes. Please fix this urgent issue.",
            "is_anonymous": False
        }
        
        response = self.run_test(
            "Create Complaint",
            "POST",
            "complaints",
            201,
            data=complaint_data
        )
        
        if response and 'id' in response:
            self.complaint_id = response['id']
            # Check AI analysis
            if response.get('category') and response.get('priority') and response.get('sentiment'):
                self.log_test("AI Analysis Present", True, f"Category: {response['category']}, Priority: {response['priority']}, Sentiment: {response['sentiment']}")
            else:
                self.log_test("AI Analysis Present", False, "Missing AI analysis fields")
            return True
        return False

    def test_get_complaints(self):
        """Test fetching complaints"""
        response = self.run_test(
            "Get Complaints",
            "GET",
            "complaints",
            200
        )
        return response is not None and isinstance(response, list)

    def test_get_complaint_detail(self):
        """Test fetching single complaint"""
        if not hasattr(self, 'complaint_id'):
            self.log_test("Get Complaint Detail", False, "No complaint ID available")
            return False
            
        response = self.run_test(
            "Get Complaint Detail",
            "GET",
            f"complaints/{self.complaint_id}",
            200
        )
        return response and 'id' in response

    def test_support_complaint(self):
        """Test supporting a complaint"""
        if not hasattr(self, 'complaint_id'):
            self.log_test("Support Complaint", False, "No complaint ID available")
            return False
            
        response = self.run_test(
            "Support Complaint",
            "POST",
            f"complaints/{self.complaint_id}/support",
            200
        )
        return response and 'support_count' in response

    def test_create_admin_user(self):
        """Create admin user for admin tests"""
        admin_data = {
            "email": f"admin_test_{uuid.uuid4().hex[:8]}@university.edu",
            "password": "AdminTest123!",
            "name": "Test Admin",
            "role": "admin"
        }
        
        response = self.run_test(
            "Create Admin User",
            "POST",
            "auth/register",
            200,
            data=admin_data
        )
        
        if response and response.get('success') and 'access_token' in response.get('data', {}):
            self.admin_token = response['data']['access_token']
            return True
        return False

    def test_analytics_overview(self):
        """Test analytics overview (admin only)"""
        if not hasattr(self, 'admin_token'):
            self.log_test("Analytics Overview", False, "No admin token available")
            return False
            
        # Temporarily use admin token
        original_token = self.token
        self.token = self.admin_token
        
        response = self.run_test(
            "Analytics Overview",
            "GET",
            "analytics/overview",
            200
        )
        
        # Restore original token
        self.token = original_token
        
        return response and 'total_complaints' in response

    def test_update_complaint_status(self):
        """Test updating complaint status (admin only)"""
        if not hasattr(self, 'admin_token') or not hasattr(self, 'complaint_id'):
            self.log_test("Update Complaint Status", False, "Missing admin token or complaint ID")
            return False
            
        # Temporarily use admin token
        original_token = self.token
        self.token = self.admin_token
        
        update_data = {
            "status": "reviewed",
            "response_text": "We have received your complaint and are reviewing it."
        }
        
        response = self.run_test(
            "Update Complaint Status",
            "PATCH",
            f"complaints/{self.complaint_id}",
            200,
            data=update_data
        )
        
        # Restore original token
        self.token = original_token
        
        return response and response.get('status') == 'reviewed'

    def test_anonymous_complaint(self):
        """Test anonymous complaint creation"""
        complaint_data = {
            "title": "Anonymous Test - Staff Behavior Issue",
            "description": "I want to report inappropriate behavior by a staff member but prefer to remain anonymous for safety reasons.",
            "is_anonymous": True
        }
        
        response = self.run_test(
            "Create Anonymous Complaint",
            "POST",
            "complaints",
            201,
            data=complaint_data
        )
        
        return response and response.get('is_anonymous') == True

    def test_foul_language_detection(self):
        """Test foul language detection in AI analysis"""
        complaint_data = {
            "title": "Damn WiFi Problem",
            "description": "This damn WiFi is shit and the staff are being assholes about fixing it. This is fucking ridiculous!",
            "is_anonymous": False
        }
        
        response = self.run_test(
            "Foul Language Detection",
            "POST",
            "complaints",
            201,
            data=complaint_data
        )
        
        if response:
            foul_detected = response.get('foul_language_detected', False)
            severity = response.get('foul_language_severity', 'None')
            self.log_test("Foul Language Analysis", foul_detected, f"Severity: {severity}")
            return True
        return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Campus Voice API Tests...")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)

        # Authentication Tests
        print("\n🔐 Authentication Tests")
        if not self.test_auth_register():
            print("❌ Registration failed - stopping tests")
            return False
            
        self.test_auth_login()
        self.test_auth_me()

        # Complaint Tests
        print("\n📝 Complaint Tests")
        self.test_create_complaint()
        self.test_get_complaints()
        self.test_get_complaint_detail()
        self.test_support_complaint()
        self.test_anonymous_complaint()
        self.test_foul_language_detection()

        # Admin Tests
        print("\n👑 Admin Tests")
        self.test_create_admin_user()
        self.test_analytics_overview()
        self.test_update_complaint_status()

        # Print Results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = CampusVoiceAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    results = {
        "timestamp": datetime.now().isoformat(),
        "total_tests": tester.tests_run,
        "passed_tests": tester.tests_passed,
        "success_rate": round((tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0, 2),
        "test_details": tester.test_results
    }
    
    with open('/app/test_reports/backend_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())