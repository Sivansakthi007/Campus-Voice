# Complaint Management System Fix - TODO

## Issue Summary
Students cannot see their own submitted complaints in "My Complaints" section, even though complaints exist in the database and are visible to HOD/Principal/Admin.

## Root Cause Identified
Backend query in `get_complaints` endpoint was filtering student complaints using `Complaint.student_email == current_user["email"]`, but email comparison can fail due to case sensitivity issues (e.g., "Student@example.com" vs "student@example.com"). Since complaints are created with both `student_id` and `student_email`, using `student_id` is more reliable and consistent.

## Fix Applied
- [x] Modified backend filtering logic in `server.py` to use `Complaint.student_id == current_user["id"]` for student role filtering
- [x] This ensures students see their complaints without changing database data, API structures, or role-based access control
- [x] Updated all dashboard components (StudentDashboard, AdminDashboard, HodDashboard, StaffDashboard) to fetch complaints from API using `complaintsApi.getAll()` and pass them to ComplaintTable
- [x] This ensures dashboards display real complaint data instead of demo data, with role-based filtering applied by the backend

## Verification Steps
- [x] Test student login and verify complaints appear in "My Complaints"
- [x] Confirm HOD/Principal/Admin can still see all complaints for verification
- [x] Ensure no status filtering blocks student visibility (complaints should show regardless of status: submitted, pending, under_review, etc.)
- [x] Verify role-based access control remains intact

## Rules Respected
- [x] No database tables, schema, or stored data changes
- [x] No API request/response structure changes
- [x] No role-based access control removal
- [x] Only logic/filtering fix applied
