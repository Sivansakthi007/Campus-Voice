import requests
import uuid
import sys

BASE_URL = "http://localhost:8000/api"

def test_anonymous_visibility():
    print("🚀 Starting Anonymous Visibility Tests...")
    
    # 1. Register Student
    student_email = f"student_{uuid.uuid4().hex[:6]}@test.com"
    student_data = {
        "email": student_email,
        "password": "Password123!",
        "name": "John Student",
        "role": "student",
        "student_id": f"STU_{uuid.uuid4().hex[:4]}"
    }
    resp = requests.post(f"{BASE_URL}/auth/register", json=student_data)
    rj = resp.json()
    student_token = rj["data"]["access_token"]
    student_id = rj["data"]["user"]["id"]

    # 2. Register Staff
    staff_email = f"staff_{uuid.uuid4().hex[:6]}@test.com"
    staff_data = {
        "email": staff_email,
        "password": "Password123!",
        "name": "Prof. Smith",
        "role": "staff",
        "staff_role": "Assistant Professor",
        "department": "Computer Science"
    }
    resp = requests.post(f"{BASE_URL}/auth/register", json=staff_data)
    rj = resp.json()
    staff_token = rj["data"]["access_token"]

    # 3. Register Admin
    admin_email = f"admin_{uuid.uuid4().hex[:6]}@test.com"
    admin_data = {
        "email": admin_email,
        "password": "Password123!",
        "name": "Super Admin",
        "role": "admin"
    }
    resp = requests.post(f"{BASE_URL}/auth/register", json=admin_data)
    rj = resp.json()
    admin_token = rj["data"]["access_token"] if "data" in rj else rj["access_token"]

    # 4. Register HOD
    hod_email = f"hod_{uuid.uuid4().hex[:6]}@test.com"
    hod_data = {
        "email": hod_email,
        "password": "Password123!",
        "name": "Dept HOD",
        "role": "hod",
        "department": "Computer Science"
    }
    resp = requests.post(f"{BASE_URL}/auth/register", json=hod_data)
    rj = resp.json()
    hod_token = rj["data"]["access_token"] if "data" in rj else rj["access_token"]

    # 5. Student submits anonymous complaint
    complaint_data = {
        "title": "Anonymous Feedback",
        "description": "This is an anonymous complaint.",
        "is_anonymous": True,
        "category": "Academic Issues"
    }
    headers = {"Authorization": f"Bearer {student_token}"}
    resp = requests.post(f"{BASE_URL}/complaints", json=complaint_data, headers=headers)
    complaint_id = resp.json()["id"]
    print(f"✅ Complaint created: {complaint_id}")

    # 6. Check visibility as Staff
    headers = {"Authorization": f"Bearer {staff_token}"}
    resp = requests.get(f"{BASE_URL}/complaints/{complaint_id}", headers=headers)
    staff_view = resp.json()
    
    if staff_view["student_name"] == "Anonymous" and staff_view["student_email"] == "Hidden":
        print("✅ Staff View: Identity HIDDEN correctly.")
    else:
        print(f"❌ Staff View: Identity NOT hidden! Name: {staff_view.get('student_name')}, Email: {staff_view.get('student_email')}")
        sys.exit(1)

    # 7. Check visibility as HOD
    headers = {"Authorization": f"Bearer {hod_token}"}
    resp = requests.get(f"{BASE_URL}/complaints/{complaint_id}", headers=headers)
    hod_view = resp.json()
    
    if hod_view["student_name"] == "Anonymous" and hod_view["student_email"] == "Hidden":
        print("✅ HOD View: Identity HIDDEN correctly.")
    else:
        print(f"❌ HOD View: Identity NOT hidden! Name: {hod_view.get('student_name')}")
        sys.exit(1)

    # 8. Check visibility as Admin
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = requests.get(f"{BASE_URL}/complaints/{complaint_id}", headers=headers)
    admin_view = resp.json()

    if admin_view["student_name"] == "John Student" and admin_view["student_email"] == student_email:
        print("✅ Admin View: Real identity VISIBLE correctly.")
        if admin_view.get("anonymous_label"):
            print(f"✅ Admin View: Label found: {admin_view['anonymous_label']}")
        else:
            print("❌ Admin View: Label MISSING!")
            sys.exit(1)
    else:
        print(f"❌ Admin View: Real identity NOT visible! Name: {admin_view.get('student_name')}")
        sys.exit(1)

    # 9. Check visibility as Student (Owner)
    headers = {"Authorization": f"Bearer {student_token}"}
    resp = requests.get(f"{BASE_URL}/complaints/{complaint_id}", headers=headers)
    owner_view = resp.json()

    if owner_view["student_name"] == "John Student":
        print("✅ Owner View: Real identity VISIBLE to owner.")
    else:
        print(f"❌ Owner View: Real identity NOT visible to owner!")
        sys.exit(1)

    print("\n🎉 All visibility tests PASSED!")

if __name__ == "__main__":
    test_anonymous_visibility()
