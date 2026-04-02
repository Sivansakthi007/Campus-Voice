from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, JSON, UniqueConstraint
from sqlalchemy.sql import func
from db import Base
import uuid


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    department = Column(String(255), nullable=True)
    student_id = Column(String(100), nullable=True)
    staff_id = Column(String(100), nullable=True)
    staff_role = Column(String(100), nullable=True)
    face_embedding = Column(JSON, nullable=True)  # 128-dim float array from face-api.js
    face_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    title = Column(String(512), nullable=False)
    description = Column(Text, nullable=False)
    voice_text = Column(Text, nullable=True)
    status = Column(String(50), nullable=False)
    category = Column(String(100), nullable=True)
    priority = Column(String(50), nullable=True)
    sentiment = Column(String(50), nullable=True)
    foul_language_severity = Column(String(50), nullable=True)
    foul_language_detected = Column(Boolean, default=False)
    is_anonymous = Column(Boolean, default=False)
    student_id = Column(String(36), nullable=False)
    student_name = Column(String(255), nullable=True)
    student_email = Column(String(255), nullable=True)
    student_department = Column(String(255), nullable=True)
    support_count = Column(Integer, default=0)
    supported_by = Column(JSON, default=list)
    responses = Column(JSON, default=list)
    timeline = Column(JSON, default=list)
    assigned_to = Column(String(36), nullable=True)
    assigned_to_name = Column(String(255), nullable=True)
    assigned_to_all = Column(JSON, default=list)
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    resolution_description = Column(Text, nullable=True)
    escalation_level = Column(Integer, default=0)
    last_escalation_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class StaffRating(Base):
    """Weekly staff performance rating submitted by students."""
    __tablename__ = "staff_ratings"
    __table_args__ = (
        UniqueConstraint('student_id', 'staff_id', 'week_number', 'year', 
                        name='uq_student_staff_week_rating'),
    )

    id = Column(String(36), primary_key=True, default=gen_uuid)
    student_id = Column(String(36), nullable=False, index=True)
    staff_id = Column(String(36), nullable=False, index=True)
    week_number = Column(Integer, nullable=False)  # ISO week number (1-53)
    year = Column(Integer, nullable=False)
    
    # Rating criteria (1-5 stars)
    subject_knowledge = Column(Integer, nullable=False)
    teaching_clarity = Column(Integer, nullable=False)
    student_interaction = Column(Integer, nullable=False)
    punctuality = Column(Integer, nullable=False)
    overall_effectiveness = Column(Integer, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class HODRating(Base):
    """Semester-based HOD performance rating submitted by students or staff."""
    __tablename__ = "hod_ratings"
    __table_args__ = (
        UniqueConstraint('rater_id', 'hod_id', 'semester', 'year',
                        name='uq_rater_hod_semester_rating'),
    )

    id = Column(String(36), primary_key=True, default=gen_uuid)
    rater_id = Column(String(36), nullable=False, index=True)
    rater_role = Column(String(50), nullable=False)  # 'student' or 'staff'
    hod_id = Column(String(36), nullable=False, index=True)
    semester = Column(Integer, nullable=False)  # 1 = Odd, 2 = Even
    year = Column(Integer, nullable=False)
    department = Column(String(255), nullable=True)

    # Student criteria (1-5 stars, nullable for staff submissions)
    approachability = Column(Integer, nullable=True)
    academic_support = Column(Integer, nullable=True)
    placement_guidance = Column(Integer, nullable=True)
    internship_support = Column(Integer, nullable=True)
    grievance_handling = Column(Integer, nullable=True)
    event_organization = Column(Integer, nullable=True)
    student_motivation = Column(Integer, nullable=True)
    on_duty_permission = Column(Integer, nullable=True)

    # Staff criteria (1-5 stars, nullable for student submissions)
    leadership = Column(Integer, nullable=True)
    workload_fairness = Column(Integer, nullable=True)
    staff_coordination = Column(Integer, nullable=True)
    academic_monitoring = Column(Integer, nullable=True)
    research_encouragement = Column(Integer, nullable=True)
    university_communication = Column(Integer, nullable=True)
    conflict_resolution = Column(Integer, nullable=True)
    discipline_maintenance = Column(Integer, nullable=True)

    average_rating = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class HODReportToggle(Base):
    """Controls whether HOD semester report submissions are open."""
    __tablename__ = "hod_report_toggle"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    is_open = Column(Boolean, default=False, nullable=False)
    semester = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    updated_by = Column(String(36), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Notification(Base):
    """Push notification record for staff members when complaints are submitted."""
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), nullable=False, index=True)
    complaint_id = Column(String(36), nullable=False)
    title = Column(String(512), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)
    student_name = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Suggestion(Base):
    """Smart Suggestion created by students."""
    __tablename__ = "suggestions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    title = Column(String(512), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)  # Campus / Lab / Library / Hostel / Other
    image_url = Column(String(512), nullable=True)
    student_id = Column(String(36), nullable=False, index=True)
    student_name = Column(String(255), nullable=True)
    vote_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SuggestionVote(Base):
    """Tracks votes on suggestions to prevent duplicates."""
    __tablename__ = "suggestion_votes"
    __table_args__ = (
        UniqueConstraint('suggestion_id', 'student_id', name='uq_suggestion_student_vote'),
    )

    id = Column(String(36), primary_key=True, default=gen_uuid)
    suggestion_id = Column(String(36), nullable=False, index=True)
    student_id = Column(String(36), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SignupApprovalSetting(Base):
    """Admin-controlled toggle for enabling/disabling signup per role."""
    __tablename__ = "signup_approval_settings"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    role = Column(String(50), unique=True, nullable=False)  # student, staff, hod, principal
    is_enabled = Column(Boolean, default=True, nullable=False)
    updated_by = Column(String(36), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

