from fastapi.testclient import TestClient
from backend.server import app
import uuid

client = TestClient(app)

passed = 0
failed = 0

print('Starting in-process integration tests...')

# 1. Register
email = f"test_{uuid.uuid4().hex[:8]}@example.com"
register_payload = {
    "email": email,
    "password": "TestPass123!",
    "name": "Test User",
    "role": "student",
    "student_id": "STU123"
}
resp = client.post('/api/auth/register', json=register_payload)
if resp.status_code == 200 and 'access_token' in resp.json():
    print('✅ Register passed')
    passed += 1
    token = resp.json()['access_token']
else:
    print('❌ Register failed', resp.status_code, resp.text)
    failed += 1
    token = None

# 2. Login
login_payload = {"email": email, "password": "TestPass123!"}
resp = client.post('/api/auth/login', json=login_payload)
if resp.status_code == 200 and 'access_token' in resp.json():
    print('✅ Login passed')
    passed += 1
    token = resp.json()['access_token']
else:
    print('❌ Login failed', resp.status_code, resp.text)
    failed += 1

headers = {'Authorization': f'Bearer {token}'} if token else {}

# 3. Get me
resp = client.get('/api/auth/me', headers=headers)
if resp.status_code == 200 and resp.json().get('email') == email:
    print('✅ Get current user passed')
    passed += 1
else:
    print('❌ Get current user failed', resp.status_code, resp.text)
    failed += 1

# 4. Create complaint
complaint_payload = {
    "title": "Test Complaint - Wifi",
    "description": "WiFi is unstable",
    "is_anonymous": False
}
resp = client.post('/api/complaints', json=complaint_payload, headers=headers)
if resp.status_code == 201 and 'id' in resp.json():
    print('✅ Create complaint passed')
    passed += 1
    complaint_id = resp.json()['id']
else:
    print('❌ Create complaint failed', resp.status_code, resp.text)
    failed += 1
    complaint_id = None

# 5. Get complaints
resp = client.get('/api/complaints', headers=headers)
if resp.status_code == 200:
    print('✅ List complaints passed')
    passed += 1
else:
    print('❌ List complaints failed', resp.status_code, resp.text)
    failed += 1

# 6. Get complaint detail
if complaint_id:
    resp = client.get(f'/api/complaints/{complaint_id}', headers=headers)
    if resp.status_code == 200 and resp.json().get('id') == complaint_id:
        print('✅ Get complaint detail passed')
        passed += 1
    else:
        print('❌ Get complaint detail failed', resp.status_code, resp.text)
        failed += 1

print('\nSummary:')
print('Passed:', passed)
print('Failed:', failed)

if failed > 0:
    raise SystemExit(1)
