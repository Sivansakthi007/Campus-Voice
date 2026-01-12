# CampusVoice AI Coding Agent Instructions

## Project Overview
CampusVoice is a **smart grievance redressal system** for colleges/universities. Students submit complaints (text or voice), which are automatically analyzed by AI for sentiment/category/priority, then routed to staff (HOD/Principal/Admin) for resolution.

**Tech Stack:**
- Backend: FastAPI (Python 3.14) with async MySQL via SQLAlchemy
- Frontend: Next.js 16 (TypeScript) with Radix UI components + Tailwind
- AI: Google Generative AI for complaint analysis
- Async Architecture: asyncmy for non-blocking DB operations

---

## Critical Architecture Patterns

### Backend Structure (`backend/server.py`)
- **Async-first design**: Use `AsyncSession` for all DB queries. Never use sync session methods.
- **Request flow**: Auth via JWT bearer tokens → RBAC role checks → Complaint filtering based on user role
- **Role-based data filtering**: Students see only their complaints; HOD/Principal/Admin see all
- **Key constraint**: Student complaints filtered by `Complaint.student_id == current_user["id"]` (NOT email—email comparison had case-sensitivity bugs)
- **Response format**: All endpoints return `create_response(success, message, data, status_code)` dict

### Database Design (`backend/models.py`)
- **Users table**: UUID primary key, unique email index, roles: student/staff/hod/principal/admin
- **Complaints table**: UUID id, links to users via student_id (not email), status enum (submitted/pending/under_review/completed), JSON fields for responses/timeline
- **AI metadata**: sentiment, category, priority, foul_language_severity stored per complaint
- **Support system**: support_count integer, supported_by JSON array of user IDs

### Database Access (`backend/db.py`)
- **Lazy initialization**: Engine initialized at first use via `init_engine()` or `get_engine()`
- **Fallback strategy**: Uses MYSQL_* env vars to build URL; falls back to SQLite for dev
- **Alembic migrations**: Stored in `backend/alembic/versions/`. Always use alembic for schema changes.
- **URL encoding**: Special chars in passwords must be URL-encoded via `quote_plus()`

### Frontend Client (`Frontend/lib/api.ts`)
- **ApiClient class**: Handles all HTTP calls. Token stored in localStorage, auto-injected in Bearer header
- **Global 401 handler**: Clears token and redirects to `/login` on auth failure
- **Endpoints**: `/api/auth/register`, `/api/auth/login`, `/api/complaints/*`, `/api/users/*`
- **Role-based UI**: Dashboard selection via role determines which dashboard component loads

---

## Essential Developer Workflows

### Windows Setup
```powershell
# Backend
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\setup_backend_env.ps1 -PythonPath "C:\Path\To\Python314\python.exe"

# Frontend
cd Frontend; npm install; npm run dev

# Backend (from root)
npm --prefix backend start
# or: npm run start:uvicorn
```

**Key env vars** (create `.env` in `backend/`):
- `SQLALCHEMY_DATABASE_URL` or `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_HOST`, `MYSQL_DB`
- `JWT_SECRET` (change from default in production)
- `LLM_KEY` (Google Generative AI key)
- `NEXT_PUBLIC_API_URL` (frontend → backend URL, defaults to http://localhost:8000)

### Database Migrations
```powershell
# From backend folder
alembic revision --autogenerate -m "description"
alembic upgrade head
```

### Testing
- **Backend tests**: `python backend_test.py`, `python integration_tests.py`
- **Windows batch**: Run `test_backend.bat` or `test_backend.ps1` from project root
- **Test framework**: pytest (see `requirements.txt`)

### Common Commands
- **Linting frontend**: `cd Frontend && npm run lint`
- **Build frontend**: `cd Frontend && npm run build; npm start`
- **Check DB**: Run scripts in `backend/scripts/` (e.g., `check_mysql_connection.py`)

---

## Project-Specific Conventions

### Complaint Status Flow
Valid transitions (enforced by `is_valid_transition()` in `backend/utils/rbac.py`):
- submitted/pending → accepted/rejected
- accepted → in_process
- in_process → completed

### Error Handling
- Backend: Return `create_response(False, error_message, None, status_code)`
- Frontend: Catch errors in `ApiClient.request()`, log to console, throw for caller to handle
- **Case sensitivity bug**: Use `student_id` (UUID) instead of `student_email` for student complaint queries

### API Response Format
```json
{
  "success": true/false,
  "message": "Human-readable message",
  "data": { /* actual payload */ }
}
```

### File Uploads
- Profile photos: `backend/uploads/profile_photos/`
- Handled via FastAPI `UploadFile` with multipart form data
- Store file path in user model, serve via `/uploads/` endpoint

---

## Critical Integration Points

### AI Analysis Pipeline
- Trigger: Complaint creation
- Process: Send text to Google Generative AI
- Output: sentiment, category, priority, foul_language_severity, foul_language_detected
- Storage: Stored in complaint record for fast retrieval

### Authentication Flow
1. Register: Email + password hash → User record created
2. Login: Email + password verified → JWT token issued + user returned
3. Protected routes: Check `Authorization: Bearer <token>` header, decode JWT, attach user context
4. Token expiry: 7 days (168 hours) via `ACCESS_TOKEN_EXPIRE_MINUTES`

### Frontend-Backend Communication
- Base URL: `NEXT_PUBLIC_API_URL` env var (defaults to `http://localhost:8000`)
- All requests: GET/POST/PUT via `ApiClient` instance
- Complaint retrieval: Role-based filtering applied server-side; frontend receives only accessible complaints

---

## Common Gotchas & Fixes

1. **Complaint visibility bug**: Filter by `student_id` not `student_email` (case sensitivity)
2. **Async DB errors**: Ensure `await` on all async DB operations; never mix sync/async sessions
3. **CORS issues**: Backend configured with `CORSMiddleware`; check frontend origin matches
4. **MySQL connection**: Use asyncmy driver, not pymysql. SQLite fallback for local dev.
5. **Password encoding**: URL-encode special chars in MySQL password using `quote_plus()`
6. **JWT expiry**: Token expires after 7 days; force re-login if expired (401 response)

---

## File Navigation Guide

- **Core backend**: `backend/server.py` (main API), `backend/models.py` (data schema), `backend/db.py` (connection)
- **Auth/RBAC**: `backend/utils/rbac.py` (role checks, status transitions)
- **Frontend core**: `Frontend/app/page.tsx` (routing), `Frontend/lib/api.ts` (HTTP client)
- **Dashboard routing**: `Frontend/app/dashboard/[role]/page.tsx` (role-based dashboard selection)
- **Migrations**: `backend/alembic/versions/` (schema history)
- **Tests**: Root-level `*_test.py` and `integration_tests.py`

---

## When Modifying Code

- **New endpoint**: Update both backend Pydantic models AND frontend `ApiClient`
- **New role**: Update `UserRole` enum, add role to `RBAC` checks, ensure dashboard component exists
- **Schema change**: Create Alembic migration, apply via `alembic upgrade head`
- **Student-facing data**: Always use `student_id` not `student_email` for filtering
- **Async DB changes**: Test with actual MySQL (not SQLite) to catch async edge cases
