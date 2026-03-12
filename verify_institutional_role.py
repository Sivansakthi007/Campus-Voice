import requests
import uuid

BASE_URL = "http://localhost:8000/api"

def test_institutional_registration():
    # Role: Staff, StaffRole: Librarian (Institutional)
    data = {
        "email": f"librarian_{uuid.uuid4().hex[:4]}@campus.edu",
        "password": "Password123!",
        "name": "Test Librarian",
        "role": "staff",
        "staff_id": "LIB001",
        "staff_role": "Librarian",
        "registration_password": "9512"
        # Department is omitted or sent as None
    }
    
    print(f"Testing registration for {data['staff_role']}...")
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=data)
        if response.status_code == 200:
            result = response.json()
            user = result.get('data', {}).get('user', {})
            print(f"✅ Registration successful!")
            print(f"   Name: {user.get('name')}")
            print(f"   Role: {user.get('role')}")
            print(f"   Staff Role: {user.get('staff_role')}")
            print(f"   Department: {user.get('department')} (Expected: None)")
            
            if user.get('department') is None:
                print("🏆 Verification Passed: Department correctly set to None for institutional role.")
            else:
                print("❌ Verification Failed: Department should be None.")
        else:
            print(f"❌ Registration failed with status {response.status_code}")
            print(f"   Details: {response.text}")
    except Exception as e:
        print(f"❌ Error during request: {e}")

def test_departmental_registration():
    # Role: Staff, StaffRole: Assistant Professor (Departmental)
    data = {
        "email": f"professor_{uuid.uuid4().hex[:4]}@campus.edu",
        "password": "Password123!",
        "name": "Test Professor",
        "role": "staff",
        "staff_id": "PROF001",
        "staff_role": "Assistant Professor",
        "department": "Computer Science",
        "registration_password": "9512"
    }
    
    print(f"\nTesting registration for {data['staff_role']}...")
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=data)
        if response.status_code == 200:
            result = response.json()
            user = result.get('data', {}).get('user', {})
            print(f"✅ Registration successful!")
            print(f"   Name: {user.get('name')}")
            print(f"   Department: {user.get('department')} (Expected: Computer Science)")
            
            if user.get('department') == "Computer Science":
                print("🏆 Verification Passed: Department correctly preserved for departmental role.")
            else:
                print("❌ Verification Failed: Department mismatch.")
        else:
            print(f"❌ Registration failed with status {response.status_code}")
            print(f"   Details: {response.text}")
    except Exception as e:
        print(f"❌ Error during request: {e}")

if __name__ == "__main__":
    test_institutional_registration()
    test_departmental_registration()
