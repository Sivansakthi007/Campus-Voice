from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from db import get_engine, get_session, Base
from models import User, Complaint, StaffRating
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
from enum import Enum
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
import base64
import io
from utils.rbac import require_roles, is_valid_transition
from functools import wraps

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# SQLAlchemy (MySQL) engine/session
SQLALCHEMY_DATABASE_URL = os.environ.get('SQLALCHEMY_DATABASE_URL')

# Security
pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

# AI Configuration
LLM_KEY = os.environ.get('LLM_KEY')

# Create the main app
app = FastAPI(title="Campus Voice API")
api_router = APIRouter(prefix="/api")

# Add CORS middleware - Production Ready
ALLOWED_ORIGINS = [
    "https://campus-voice-frontend.onrender.com",  # Production frontend
    "http://localhost:3000",  # Local development
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
)

@app.on_event("startup")
async def startup():
    """Initialize database connection with retry logic for containerized environments."""
    import asyncio
    
    max_retries = 5
    retry_delay = 2  # Start with 2 seconds
    
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Attempting database connection (attempt {attempt}/{max_retries})...")
            engine = get_engine()
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Database connection established successfully!")
            return
        except Exception as e:
            logger.warning(f"Database connection attempt {attempt} failed: {str(e)}")
            if attempt < max_retries:
                wait_time = min(retry_delay * (2 ** (attempt - 1)), 32)  # Exponential backoff, max 32s
                logger.info(f"Retrying in {wait_time} seconds...")
                await asyncio.sleep(wait_time)
            else:
                logger.error("All database connection attempts failed!")
                raise
@app.get("/")
async def root():
    return {"message": "Campus Voice API is running", "docs_url": "/docs"}

# Health check endpoint
@api_router.get("/health")
async def health_check():
    """Health check endpoint for monitoring and load balancers"""
    return {"status": "healthy", "service": "Campus Voice API"}

# ===== MODELS =====
class UserRole(str):
    STUDENT = "student"
    ADMIN = "admin"
    HOD = "hod"
    PRINCIPAL = "principal"
    STAFF = "staff"

class ComplaintStatus(str):
    SUBMITTED = "submitted"
    REVIEWED = "reviewed"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    REJECTED = "rejected"

class ComplaintCategory(str):
    HOSTEL = "Hostel"
    EXAM_CELL = "Exam Cell"
    TRANSPORT = "Transport"
    STAFF_BEHAVIOR = "Staff Behavior"
    ACADEMIC = "Academic Issues"

class SentimentType(str):
    POSITIVE = "Positive"
    NEGATIVE = "Negative"
    ANGRY = "Angry"
    URGENT = "Urgent"

class PriorityLevel(str):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

class FoulLanguageSeverity(str):
    NONE = "None"
    MILD = "Mild"
    MODERATE = "Moderate"
    SEVERE = "Severe"

# User Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str
    department: Optional[str] = None
    student_id: Optional[str] = None
    staff_id: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    department: Optional[str] = None
    student_id: Optional[str] = None
    staff_id: Optional[str] = None
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Complaint Models
class AIAnalysis(BaseModel):
    sentiment: str
    category: str
    priority: str
    foul_language_severity: str
    foul_language_detected: bool

class ComplaintCreate(BaseModel):
    title: str
    description: str
    is_anonymous: bool = False
    voice_text: Optional[str] = None
    category: Optional[str] = None

class ComplaintResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: str
    status: str
    category: str
    priority: str
    sentiment: str
    foul_language_severity: str
    foul_language_detected: bool
    is_anonymous: bool
    student_id: str
    student_name: Optional[str]
    student_email: Optional[str] = None
    support_count: int
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    assigned_at: Optional[str] = None
    created_at: str
    updated_at: str
    responses: List[Dict[str, Any]]
    timeline: List[Dict[str, Any]]

class ComplaintUpdate(BaseModel):
    status: Optional[str] = None
    response_text: Optional[str] = None
    assigned_to: Optional[str] = None

class SupportVote(BaseModel):
    complaint_id: str

# Analytics Models
class StaffPerformance(BaseModel):
    staff_id: str
    staff_name: str
    total_complaints: int
    resolved_complaints: int
    pending_complaints: int
    avg_resolution_time: float

# Staff Rating Models
class StaffRatingCreate(BaseModel):
    """Request model for submitting a staff rating."""
    staff_id: str
    subject_knowledge: int = Field(..., ge=1, le=5)
    teaching_clarity: int = Field(..., ge=1, le=5)
    student_interaction: int = Field(..., ge=1, le=5)
    punctuality: int = Field(..., ge=1, le=5)
    overall_effectiveness: int = Field(..., ge=1, le=5)

class StaffRatingResponse(BaseModel):
    """Response model for a staff rating."""
    id: str
    staff_id: str
    staff_name: str
    week_number: int
    year: int
    subject_knowledge: int
    teaching_clarity: int
    student_interaction: int
    punctuality: int
    overall_effectiveness: int
    average_rating: float
    created_at: str

class StaffPerformanceRating(BaseModel):
    """Staff performance data for HOD weekly report."""
    staff_id: str
    staff_name: str
    department: Optional[str]
    average_rating: float
    total_ratings: int
    is_best_staff: bool = False

class WeeklyPerformanceReport(BaseModel):
    """Weekly staff performance report for HOD."""
    week_number: int
    year: int
    week_start: str
    week_end: str
    staff_performance: List[StaffPerformanceRating]
    total_ratings: int

# ===== HELPER FUNCTIONS =====
def create_response(success: bool, message: str, data: Any = None, status_code: int = 200) -> JSONResponse:
    """Create a consistent API response format"""
    return JSONResponse(
        status_code=status_code,
        content={
            "success": success,
            "message": message,
            "data": data
        }
    )

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), session: AsyncSession = Depends(get_session)) -> dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        
        user = await session.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        # Compute student_id/staff_id based on role
        stored_id = user.student_id
        is_student = user.role == UserRole.STUDENT
        return {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "department": user.department,
            "student_id": stored_id if is_student else None,
            "staff_id": stored_id if not is_student else None,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid authentication")

def require_roles(*allowed_roles: str):
    def role_checker(current_user: dict = Depends(get_current_user)):
        user = current_user()
        if not user or user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have enough permissions to access this resource"
            )
        return current_user
    return role_checker

async def analyze_complaint_with_ai(text: str) -> AIAnalysis:
    """Analyze complaint for sentiment, category, priority, and foul language using OpenAI."""
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=LLM_KEY)

        system_message = """You are an AI assistant that analyzes student complaints. 
            Analyze the complaint and respond ONLY with a JSON object (no markdown, no explanation) with these exact keys:
            - sentiment: one of [Positive, Negative, Angry, Urgent]
            - category: one of [Hostel, Exam Cell, Transport, Staff Behavior, Academic Issues]
            - priority: one of [High, Medium, Low]
            - foul_language_detected: boolean (true if foul/offensive language is present)
            - foul_language_severity: one of [None, Mild, Moderate, Severe]

            Consider urgency, emotional tone, and severity when assigning priority."""

        user_prompt = f"Analyze this complaint: {text}"

        # Use chat completions; handle multiple response shapes for resilience
        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": system_message}, {"role": "user", "content": user_prompt}],
            max_tokens=500
        )

        # Extract text from various possible response shapes
        content = None
        try:
            content = resp.choices[0].message.content
        except Exception:
            try:
                content = resp.choices[0].text
            except Exception:
                content = getattr(resp, "output_text", None) or str(resp)

        import json
        analysis_data = json.loads(content.strip())

        return AIAnalysis(
            sentiment=analysis_data["sentiment"],
            category=analysis_data["category"],
            priority=analysis_data["priority"],
            foul_language_detected=analysis_data["foul_language_detected"],
            foul_language_severity=analysis_data["foul_language_severity"]
        )
    except Exception as e:
        logger.error(f"AI analysis error: {str(e)}")
        # Fallback to default values
        return AIAnalysis(
            sentiment=SentimentType.NEGATIVE,
            category=ComplaintCategory.ACADEMIC,
            priority=PriorityLevel.MEDIUM,
            foul_language_detected=False,
            foul_language_severity=FoulLanguageSeverity.NONE
        )

async def transcribe_audio_with_whisper(audio_base64: str) -> str:
    """Use OpenAI Whisper to transcribe audio to text"""
    try:
        from openai import AsyncOpenAI
        
        client = AsyncOpenAI(api_key=LLM_KEY)
        
        # Decode base64 audio
        audio_bytes = base64.b64decode(audio_base64)
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = "audio.webm"
        
        # Transcribe using Whisper
        transcription = await client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file
        )
        
        return transcription.text
    except Exception as e:
        logger.error(f"Whisper transcription error: {str(e)}")
        raise HTTPException(status_code=500, detail="Audio transcription failed")

async def check_duplicate_complaint(title: str, description: str, user_id: str, session: AsyncSession) -> Optional[str]:
    """Check if similar complaint exists in last 30 days"""
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

    stmt = select(Complaint.id, Complaint.title, Complaint.description).where(
        Complaint.student_id == user_id,
        Complaint.created_at >= thirty_days_ago
    )
    result = await session.execute(stmt)
    rows = result.all()

    title_lower = title.lower()
    desc_lower = description.lower()

    for row in rows:
        comp_id, comp_title, comp_desc = row[0], row[1], row[2]
        # Check if both title and description are very similar to avoid false positives
        title_match = comp_title and (title_lower in comp_title.lower() or comp_title.lower() in title_lower)
        desc_match = comp_desc and (desc_lower in comp_desc.lower() or comp_desc.lower() in desc_lower)
        
        if title_match and desc_match:
            return comp_id

    return None

# ===== AUTH ENDPOINTS =====
@api_router.post("/auth/register")
async def register(user_data: UserCreate, session: AsyncSession = Depends(get_session)):
    # Check if user exists
    stmt = select(User).where(User.email == user_data.email)
    res = await session.execute(stmt)
    existing_user = res.scalars().first()
    if existing_user:
        return create_response(False, "Email already registered", status_code=400)

    # Create user - store ID in student_id column based on role
    is_student = user_data.role == UserRole.STUDENT
    stored_id = user_data.student_id if is_student else user_data.staff_id
    user_obj = User(
        email=user_data.email,
        password=hash_password(user_data.password),
        name=user_data.name,
        role=user_data.role,
        department=user_data.department,
        student_id=stored_id  # Polymorphic: stores student_id or staff_id
    )
    session.add(user_obj)
    await session.commit()
    await session.refresh(user_obj)

    # Create token
    access_token = create_access_token({"sub": user_obj.id})

    # Return computed student_id/staff_id based on role
    stored_id = user_obj.student_id
    is_student_role = user_obj.role == UserRole.STUDENT
    user_response = UserResponse(
        id=user_obj.id,
        email=user_obj.email,
        name=user_obj.name,
        role=user_obj.role,
        department=user_obj.department,
        student_id=stored_id if is_student_role else None,
        staff_id=stored_id if not is_student_role else None,
        created_at=user_obj.created_at.isoformat() if user_obj.created_at else None
    )

    data = {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response.model_dump()
    }
    return create_response(True, "Registration successful", data)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin, session: AsyncSession = Depends(get_session)):
    stmt = select(User).where(User.email == credentials.email)
    res = await session.execute(stmt)
    user_obj = res.scalars().first()
    if not user_obj or not verify_password(credentials.password, user_obj.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({"sub": user_obj.id})

    # Return computed student_id/staff_id based on role
    stored_id = user_obj.student_id
    is_student_role = user_obj.role == UserRole.STUDENT
    user_response = UserResponse(
        id=user_obj.id,
        email=user_obj.email,
        name=user_obj.name,
        role=user_obj.role,
        department=user_obj.department,
        student_id=stored_id if is_student_role else None,
        staff_id=stored_id if not is_student_role else None,
        created_at=user_obj.created_at.isoformat() if user_obj.created_at else None
    )

    data = {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response.model_dump()
    }
    return create_response(True, "Login successful", data)

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return create_response(True, "Profile retrieved successfully", current_user)


@api_router.get("/users")
async def list_users(role: Optional[str] = None, current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    # Only authenticated users can list users; restrict sensitive info
    stmt = select(User)
    if role:
        stmt = stmt.where(User.role == role)

    res = await session.execute(stmt)
    users = res.scalars().all()

    def _to_resp(u: User):
        stored_id = u.student_id
        is_student = u.role == UserRole.STUDENT
        return {
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "role": u.role,
            "department": u.department,
            "student_id": stored_id if is_student else None,
            "staff_id": stored_id if not is_student else None,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }

    return create_response(True, "Users retrieved successfully", [_to_resp(u) for u in users])

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    """
    Delete a user (Admin only).
    """
    # Only admin can delete users
    if current_user["role"] != UserRole.ADMIN:
        return create_response(False, "Permission denied", status_code=403)
    
    # Prevent admin from deleting themselves
    if current_user["id"] == user_id:
        return create_response(False, "Cannot delete yourself", status_code=400)
    
    user_obj = await session.get(User, user_id)
    if not user_obj:
        return create_response(False, "User not found", status_code=404)
    
    await session.delete(user_obj)
    await session.commit()
    logger.info(f"User {user_id} deleted by Admin {current_user['id']}")
    
    return create_response(True, "User deleted successfully")



@api_router.post("/auth/upload-profile-photo")
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, and JPEG files are allowed")

    # Create uploads directory if it doesn't exist
    upload_dir = ROOT_DIR / "uploads" / "profile_photos"
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Generate filename with user ID and original extension
    file_extension = file.filename.split('.')[-1].lower()
    filename = f"{current_user['id']}.{file_extension}"
    file_path = upload_dir / filename

    # Save the file
    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to save profile photo")

    return create_response(True, "Profile photo uploaded successfully")

@api_router.get("/auth/profile-photo/{user_id}")
async def get_profile_photo(user_id: str):
    # Check if profile photo exists
    upload_dir = ROOT_DIR / "uploads" / "profile_photos"

    # Try different extensions
    for ext in ["jpg", "jpeg", "png"]:
        file_path = upload_dir / f"{user_id}.{ext}"
        if file_path.exists():
            from fastapi.responses import FileResponse
            return FileResponse(file_path, media_type=f"image/{ext}")

    # If no photo exists, redirect to dicebear avatar
    # Get user name for dicebear seed (this is a simplified approach)
    # In a real app, you might want to cache this or get from DB
    dicebear_url = f"https://api.dicebear.com/7.x/avataaars/svg?seed={user_id}"
    from fastapi.responses import RedirectResponse
    return RedirectResponse(dicebear_url)

# ===== COMPLAINT ENDPOINTS =====
@api_router.post("/complaints", response_model=ComplaintResponse, status_code=201)
async def create_complaint(complaint_data: ComplaintCreate, current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    # Check for duplicates
    duplicate_id = await check_duplicate_complaint(
        complaint_data.title,
        complaint_data.description,
        current_user["id"],
        session
    )

    if duplicate_id:
        logger.warning(f"Duplicate complaint attempt by user {current_user['id']}. Existing ID: {duplicate_id}")
        raise HTTPException(
            status_code=400,
            detail=f"Similar complaint already exists: {duplicate_id}"
        )

    # Check for foul/offensive language before processing
    from utils.profanity_filter import contains_profanity
    full_text_check = f"{complaint_data.title} {complaint_data.description}"
    if complaint_data.voice_text:
        full_text_check += f" {complaint_data.voice_text}"
    
    if contains_profanity(full_text_check):
        raise HTTPException(
            status_code=400,
            detail="Unwanted or offensive language detected. Please do not send such messages."
        )

    # AI Analysis
    full_text = f"{complaint_data.title}. {complaint_data.description}"
    if complaint_data.voice_text:
        full_text += f" {complaint_data.voice_text}"

    analysis = await analyze_complaint_with_ai(full_text)

    # Determine final category: prefer client-provided category if present, else AI analysis
    final_category = None
    
    # Check if category is provided and not empty/whitespace
    if complaint_data.category and complaint_data.category.strip():
        final_category = complaint_data.category
    
    # Only fall back to AI if no user category provided
    if not final_category:
        final_category = analysis.category or "Other"

    # Create complaint
    complaint_obj = Complaint(
        title=complaint_data.title,
        description=complaint_data.description,
        voice_text=complaint_data.voice_text,
        status=ComplaintStatus.SUBMITTED,
        category=final_category,
        priority=analysis.priority,
        sentiment=analysis.sentiment,
        foul_language_detected=analysis.foul_language_detected,
        foul_language_severity=analysis.foul_language_severity,
        is_anonymous=complaint_data.is_anonymous,
        student_id=current_user["id"],
        student_name=None if complaint_data.is_anonymous else current_user["name"],
        student_email=current_user["email"],
        support_count=0,
        supported_by=[],
        responses=[],
        timeline=[
            {
                "status": ComplaintStatus.SUBMITTED,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "note": "Complaint submitted"
            }
        ]
    )

    session.add(complaint_obj)
    
    # Debug logging before commit
    logger.info(f"Creating complaint - student_id: {complaint_obj.student_id}, student_name: {complaint_obj.student_name}, student_email: {complaint_obj.student_email}")
    
    await session.commit()
    await session.refresh(complaint_obj)
    
    # Debug logging after commit
    logger.info(f"Complaint created - ID: {complaint_obj.id}, student_id saved: {complaint_obj.student_id}")

    response_data = {
        "id": complaint_obj.id,
        "title": complaint_obj.title,
        "description": complaint_obj.description,
        "status": complaint_obj.status,
        "category": complaint_obj.category,
        "priority": complaint_obj.priority,
        "sentiment": complaint_obj.sentiment,
        "foul_language_severity": complaint_obj.foul_language_severity,
        "foul_language_detected": complaint_obj.foul_language_detected,
        "is_anonymous": complaint_obj.is_anonymous,
        "student_id": complaint_obj.student_id,
        "student_name": complaint_obj.student_name,
        "student_email": complaint_obj.student_email,
        "support_count": complaint_obj.support_count,
        "assigned_to": complaint_obj.assigned_to,
        "assigned_to_name": complaint_obj.assigned_to_name,
        "assigned_at": complaint_obj.assigned_at.isoformat() if complaint_obj.assigned_at else None,
        "created_at": complaint_obj.created_at.isoformat() if complaint_obj.created_at else None,
        "updated_at": complaint_obj.updated_at.isoformat() if complaint_obj.updated_at else None,
        "responses": complaint_obj.responses,
        "timeline": complaint_obj.timeline
    }

    return ComplaintResponse(**response_data)

@api_router.post("/complaints/transcribe")
async def transcribe_voice(audio_base64: str, current_user: dict = Depends(get_current_user)):
    text = await transcribe_audio_with_whisper(audio_base64)
    return {"text": text}

@api_router.get("/complaints")
async def get_complaints(current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    stmt = select(Complaint)

    # Role-based filtering
    if current_user["role"] == UserRole.STUDENT:
        stmt = stmt.where(Complaint.student_id == current_user["id"])
    elif current_user["role"] == UserRole.STAFF:
        # Staff should only see complaints assigned to them
        stmt = stmt.where(Complaint.assigned_to == current_user["id"])
    # Admin, Principal, HOD see all complaints

    stmt = stmt.order_by(Complaint.created_at.desc()).limit(1000)
    res = await session.execute(stmt)
    complaints = res.scalars().all()

    def _to_response(c: Complaint):
        return {
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "status": c.status,
            "category": c.category,
            "priority": c.priority,
            "sentiment": c.sentiment,
            "foul_language_severity": c.foul_language_severity,
            "foul_language_detected": c.foul_language_detected,
            "is_anonymous": c.is_anonymous,
            "student_id": c.student_id,
            "student_name": c.student_name,
            "support_count": c.support_count,
            "assigned_to": c.assigned_to,
            "assigned_to_name": c.assigned_to_name,
            "assigned_at": c.assigned_at.isoformat() if c.assigned_at else None,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            "responses": c.responses,
            "timeline": c.timeline
        }

    return create_response(True, "Complaints retrieved successfully", [_to_response(c) for c in complaints])

@api_router.get("/complaints/{complaint_id}", response_model=ComplaintResponse)
async def get_complaint(complaint_id: str, current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    complaint = await session.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")


    return ComplaintResponse(
        id=complaint.id,
        title=complaint.title,
        description=complaint.description,
        status=complaint.status,
        category=complaint.category,
        priority=complaint.priority,
        sentiment=complaint.sentiment,
        foul_language_severity=complaint.foul_language_severity,
        foul_language_detected=complaint.foul_language_detected,
        is_anonymous=complaint.is_anonymous,
        student_id=complaint.student_id,
        student_name=complaint.student_name,
        student_email=complaint.student_email,
        support_count=complaint.support_count,
        assigned_to=complaint.assigned_to,
        assigned_to_name=complaint.assigned_to_name,
        assigned_at=complaint.assigned_at.isoformat() if complaint.assigned_at else None,
        created_at=complaint.created_at.isoformat() if complaint.created_at else None,
        updated_at=complaint.updated_at.isoformat() if complaint.updated_at else None,
        responses=complaint.responses,
        timeline=complaint.timeline
    )

@api_router.put("/complaints/{complaint_id}")
async def update_complaint(complaint_id: str, update_data: ComplaintUpdate, current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    logger.info(f"PUT /complaints/{complaint_id} - User: {current_user['id']}, Data: {update_data.model_dump()}")

    # Only admin, staff, hod, principal can update
    if current_user["role"] not in [UserRole.ADMIN, UserRole.STAFF, UserRole.HOD, UserRole.PRINCIPAL]:
        logger.warning(f"Permission denied for user {current_user['id']} to update complaint {complaint_id}")
        return create_response(False, "Permission denied", status_code=403)

    complaint_obj = await session.get(Complaint, complaint_id)
    if not complaint_obj:
        logger.warning(f"Complaint {complaint_id} not found")
        return create_response(False, "Complaint not found", status_code=404)


    now = datetime.now(timezone.utc).isoformat()

    if update_data.status:
        complaint_obj.status = update_data.status
        timeline = complaint_obj.timeline or []
        timeline.append({
            "status": update_data.status,
            "timestamp": now,
            "note": f"Status updated to {update_data.status}",
            "updated_by": current_user["name"]
        })
        complaint_obj.timeline = timeline

    if update_data.response_text:
        responses = complaint_obj.responses or []
        responses.append({
            "text": update_data.response_text,
            "responder_name": current_user["name"],
            "responder_role": current_user["role"],
            "timestamp": now
        })
        complaint_obj.responses = responses

    if update_data.assigned_to:
        # First, fetch the user to check for conflict of interest
        try:
            user_stmt = select(User).where(User.id == update_data.assigned_to)
            res = await session.execute(user_stmt)
            assigned_user = res.scalars().first()
            
            if not assigned_user:
                return create_response(False, "Staff member not found", status_code=404)
            
            # CONFLICT OF INTEREST CHECK: Prevent assigning staff mentioned in the complaint
            from utils.conflict_detection import is_staff_mentioned_in_complaint
            if is_staff_mentioned_in_complaint(
                assigned_user.name,
                complaint_obj.title,
                complaint_obj.description
            ):
                logger.warning(f"Conflict of interest: Cannot assign {assigned_user.name} to complaint {complaint_id} - mentioned in complaint")
                return create_response(
                    False,
                    f"Cannot assign {assigned_user.name} to this complaint - they are mentioned in the complaint. Please select a different staff member.",
                    status_code=400
                )
            
            # Set assigned user id and name
            complaint_obj.assigned_to = update_data.assigned_to
            complaint_obj.assigned_to_name = assigned_user.name
            complaint_obj.assigned_at = datetime.now(timezone.utc)

            # append a timeline entry for the assignment
            timeline = complaint_obj.timeline or []
            timeline.append({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "action": f"Assigned to {assigned_user.name}",
                "by": current_user["name"]
            })
            complaint_obj.timeline = timeline
            # ensure status moves to in_progress when assigned
            complaint_obj.status = ComplaintStatus.IN_PROGRESS
        except Exception as e:
            logger.error(f"Error assigning complaint: {str(e)}")
            return create_response(False, f"Error assigning complaint: {str(e)}", status_code=500)

    # update timestamp
    complaint_obj.updated_at = datetime.now(timezone.utc)

    session.add(complaint_obj)
    await session.commit()
    await session.refresh(complaint_obj)

    logger.info(f"Complaint {complaint_id} updated successfully")

    data = {
        "id": complaint_obj.id,
        "title": complaint_obj.title,
        "description": complaint_obj.description,
        "status": complaint_obj.status,
        "category": complaint_obj.category,
        "priority": complaint_obj.priority,
        "sentiment": complaint_obj.sentiment,
        "foul_language_severity": complaint_obj.foul_language_severity,
        "foul_language_detected": complaint_obj.foul_language_detected,
        "is_anonymous": complaint_obj.is_anonymous,
        "student_id": complaint_obj.student_id,
        "student_name": complaint_obj.student_name,
        "support_count": complaint_obj.support_count,
        "created_at": complaint_obj.created_at.isoformat() if complaint_obj.created_at else None,
        "updated_at": complaint_obj.updated_at.isoformat() if complaint_obj.updated_at else None,
        "responses": complaint_obj.responses,
        "timeline": complaint_obj.timeline
    }
    return create_response(True, "Complaint updated successfully", data)

@api_router.delete("/complaints/{complaint_id}")
async def delete_complaint(complaint_id: str, confirm: bool = False, current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    """
    Delete a complaint (Complete action).
    
    Rules:
    - Admin can delete any complaint
    - Staff can only delete complaints assigned to them AND with status 'resolved'
    - Requires confirm=true to prevent accidental deletion
    """
    logger.info(f"DELETE /complaints/{complaint_id} - User: {current_user['id']}, Role: {current_user['role']}, Confirm: {confirm}")

    complaint_obj = await session.get(Complaint, complaint_id)
    if not complaint_obj:
        logger.warning(f"Complaint {complaint_id} not found")
        return create_response(False, "Complaint not found", status_code=404)

    # Check confirmation parameter
    if not confirm:
        return create_response(False, "Confirmation required. Pass confirm=true to delete.", status_code=400)

    user_role = current_user["role"]
    user_id = current_user["id"]

    # Admin can delete any complaint
    if user_role == UserRole.ADMIN:
        await session.delete(complaint_obj)
        await session.commit()
        logger.info(f"Complaint {complaint_id} deleted by Admin {user_id}")
        return create_response(True, "Complaint deleted successfully")

    # Staff can only delete complaints assigned to them with status 'resolved'
    if user_role == UserRole.STAFF:
        if complaint_obj.assigned_to != user_id:
            logger.warning(f"Staff {user_id} tried to delete complaint {complaint_id} not assigned to them")
            return create_response(False, "You can only complete complaints assigned to you", status_code=403)
        
        if complaint_obj.status != ComplaintStatus.RESOLVED:
            logger.warning(f"Staff {user_id} tried to delete complaint {complaint_id} with status {complaint_obj.status}")
            return create_response(False, "Complaint must be resolved before completing", status_code=400)
        
        await session.delete(complaint_obj)
        await session.commit()
        logger.info(f"Complaint {complaint_id} completed and deleted by Staff {user_id}")
        return create_response(True, "Complaint completed successfully")

    # Other roles cannot delete
    logger.warning(f"Permission denied for user {current_user['id']} (role: {user_role}) to delete complaint {complaint_id}")
    return create_response(False, "Permission denied", status_code=403)

@api_router.post("/complaints/{complaint_id}/support")
async def support_complaint(complaint_id: str, current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    complaint_obj = await session.get(Complaint, complaint_id)
    if not complaint_obj:
        return create_response(False, "Complaint not found", status_code=404)

    supported_by = complaint_obj.supported_by or []

    if current_user["id"] in supported_by:
        # Remove support
        supported_by = [uid for uid in supported_by if uid != current_user["id"]]
        support_count = max(0, complaint_obj.support_count - 1)
    else:
        # Add support
        supported_by.append(current_user["id"])
        support_count = complaint_obj.support_count + 1

    complaint_obj.supported_by = supported_by
    complaint_obj.support_count = support_count

    session.add(complaint_obj)
    await session.commit()
    await session.refresh(complaint_obj)

    data = {"support_count": support_count, "user_supported": current_user["id"] in supported_by}
    return create_response(True, "Support updated successfully", data)

@api_router.post("/complaints/{complaint_id}/status")
async def update_complaint_status(complaint_id: str, status: str, remarks: str, user=Depends(require_roles("HOD", "PRINCIPAL", "ADMIN")), session: AsyncSession = Depends(get_session)):
    # Only HOD/Principal/Admin reach here
    # Log status change with user['role'], timestamp, remarks (use existing fields)
    complaint_obj = await session.get(Complaint, complaint_id)
    if not complaint_obj:
        return create_response(False, "Complaint not found", status_code=404)

    # CONFLICT OF INTEREST CHECK: Prevent user from verifying complaints that mention them
    from utils.conflict_detection import can_user_verify_complaint, get_escalation_authority
    can_verify, reason = can_user_verify_complaint(
        user["name"],
        user["role"],
        complaint_obj.title,
        complaint_obj.description
    )
    
    if not can_verify:
        escalate_to = get_escalation_authority(user["role"])
        logger.warning(f"Conflict of interest: {user['name']} ({user['role']}) cannot verify complaint {complaint_id} - mentioned in complaint")
        return create_response(
            False,
            reason,
            {"escalate_to": escalate_to} if escalate_to else None,
            status_code=403
        )

    # Update status and log
    complaint_obj.status = status
    complaint_obj.timeline.append({
        "status": status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "note": remarks,
        "updated_by": user["name"]
    })

    session.add(complaint_obj)
    await session.commit()
    await session.refresh(complaint_obj)

    return {"success": True}

@api_router.get("/complaints/{complaint_id}/eligible-staff")
async def get_eligible_staff(
    complaint_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Get list of staff members eligible to handle this complaint.
    Excludes staff members who are mentioned in the complaint to prevent conflict of interest.
    """
    # Only HOD/Principal/Admin can access this
    if current_user["role"] not in [UserRole.HOD, UserRole.PRINCIPAL, UserRole.ADMIN]:
        return create_response(False, "Permission denied", status_code=403)
    
    complaint = await session.get(Complaint, complaint_id)
    if not complaint:
        return create_response(False, "Complaint not found", status_code=404)
    
    # Get all staff
    stmt = select(User).where(User.role == UserRole.STAFF)
    res = await session.execute(stmt)
    all_staff = res.scalars().all()
    
    # Filter out mentioned staff using conflict detection
    from utils.conflict_detection import get_eligible_staff_for_assignment
    eligible_staff, excluded_staff = get_eligible_staff_for_assignment(complaint, all_staff)
    
    eligible_list = [
        {"id": s.id, "name": s.name, "department": s.department}
        for s in eligible_staff
    ]
    
    excluded_names = [s.name for s in excluded_staff]
    
    logger.info(f"Eligible staff for complaint {complaint_id}: {len(eligible_list)} eligible, {len(excluded_names)} excluded")
    
    return create_response(
        True,
        "Eligible staff retrieved",
        {
            "staff": eligible_list,
            "excluded_count": len(excluded_staff),
            "excluded_names": excluded_names  # For admin visibility
        }
    )

# ===== ANALYTICS ENDPOINTS =====
@api_router.get("/analytics/overview")
async def get_analytics_overview(current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    # Only admin, principal, hod can access
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PRINCIPAL, UserRole.HOD]:
        raise HTTPException(status_code=403, detail="Permission denied")

    total_stmt = select(func.count()).select_from(Complaint)
    resolved_stmt = select(func.count()).where(Complaint.status == ComplaintStatus.RESOLVED)
    pending_stmt = select(func.count()).where(Complaint.status.in_([ComplaintStatus.SUBMITTED, ComplaintStatus.REVIEWED, ComplaintStatus.IN_PROGRESS]))

    total = (await session.execute(total_stmt)).scalar() or 0
    resolved = (await session.execute(resolved_stmt)).scalar() or 0
    pending = (await session.execute(pending_stmt)).scalar() or 0

    # Calculate average resolution time for resolved complaints
    avg_resolution_time = 0.0
    if resolved > 0:
        resolved_complaints_stmt = select(Complaint.created_at, Complaint.updated_at).where(
            Complaint.status == ComplaintStatus.RESOLVED,
            Complaint.created_at.isnot(None),
            Complaint.updated_at.isnot(None)
        )
        resolved_complaints = (await session.execute(resolved_complaints_stmt)).all()
        
        if resolved_complaints:
            total_resolution_days = 0.0
            for created_at, updated_at in resolved_complaints:
                resolution_time = (updated_at - created_at).total_seconds() / 86400  # Convert to days
                total_resolution_days += resolution_time
            avg_resolution_time = round(total_resolution_days / len(resolved_complaints), 1)

    # Calculate satisfaction rate based on positive sentiment
    satisfaction_rate = 0.0
    if total > 0:
        positive_stmt = select(func.count()).where(Complaint.sentiment == SentimentType.POSITIVE)
        positive_count = (await session.execute(positive_stmt)).scalar() or 0
        satisfaction_rate = round((positive_count / total * 100), 0)

    # By category
    cat_stmt = select(Complaint.category, func.count()).group_by(Complaint.category)
    prio_stmt = select(Complaint.priority, func.count()).group_by(Complaint.priority)
    sent_stmt = select(Complaint.sentiment, func.count()).group_by(Complaint.sentiment)

    cat_rows = (await session.execute(cat_stmt)).all()
    prio_rows = (await session.execute(prio_stmt)).all()
    sent_rows = (await session.execute(sent_stmt)).all()

    data = {
        "total_complaints": total,
        "resolved_complaints": resolved,
        "pending_complaints": pending,
        "avg_resolution_time": avg_resolution_time,
        "satisfaction_rate": satisfaction_rate,
        "resolution_rate": round((resolved / total * 100) if total > 0 else 0, 2),
        "by_category": {k: v for k, v in cat_rows},
        "by_priority": {k: v for k, v in prio_rows},
        "by_sentiment": {k: v for k, v in sent_rows}
    }
    return create_response(True, "Analytics retrieved successfully", data)

@api_router.get("/analytics/staff-performance")
async def get_staff_performance(current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PRINCIPAL, UserRole.HOD]:
        return create_response(False, "Permission denied", status_code=403)

    stmt = select(User).where(User.role == UserRole.STAFF)
    res = await session.execute(stmt)
    staff_users = res.scalars().all()

    performance = []
    for staff in staff_users:
        assigned = (await session.execute(select(func.count()).where(Complaint.assigned_to == staff.id))).scalar() or 0
        resolved = (await session.execute(select(func.count()).where(Complaint.assigned_to == staff.id, Complaint.status == ComplaintStatus.RESOLVED))).scalar() or 0
        pending = assigned - resolved

        performance.append({
            "staff_id": staff.id,
            "staff_name": staff.name,
            "total_complaints": assigned,
            "resolved_complaints": resolved,
            "pending_complaints": pending,
            "resolution_rate": round((resolved / assigned * 100) if assigned > 0 else 0, 2)
        })

    return create_response(True, "Staff performance retrieved successfully", performance)

# ===== STAFF SELF-SERVICE ENDPOINTS =====

@api_router.get("/staff/my-performance")
async def get_my_performance(current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    """Get performance statistics for the logged-in staff member"""
    if current_user["role"] != UserRole.STAFF:
        return create_response(False, "Permission denied. This endpoint is for staff only.", status_code=403)
    
    staff_id = current_user["id"]
    
    # Get counts by status
    total_stmt = select(func.count()).where(Complaint.assigned_to == staff_id)
    resolved_stmt = select(func.count()).where(
        Complaint.assigned_to == staff_id,
        Complaint.status == ComplaintStatus.RESOLVED
    )
    rejected_stmt = select(func.count()).where(
        Complaint.assigned_to == staff_id,
        Complaint.status == ComplaintStatus.REJECTED
    )
    in_progress_stmt = select(func.count()).where(
        Complaint.assigned_to == staff_id,
        Complaint.status == ComplaintStatus.IN_PROGRESS
    )
    submitted_stmt = select(func.count()).where(
        Complaint.assigned_to == staff_id,
        Complaint.status == ComplaintStatus.SUBMITTED
    )
    reviewed_stmt = select(func.count()).where(
        Complaint.assigned_to == staff_id,
        Complaint.status == ComplaintStatus.REVIEWED
    )
    
    total = (await session.execute(total_stmt)).scalar() or 0
    resolved = (await session.execute(resolved_stmt)).scalar() or 0
    rejected = (await session.execute(rejected_stmt)).scalar() or 0
    in_progress = (await session.execute(in_progress_stmt)).scalar() or 0
    submitted = (await session.execute(submitted_stmt)).scalar() or 0
    reviewed = (await session.execute(reviewed_stmt)).scalar() or 0
    
    pending = submitted + reviewed + in_progress
    
    # Calculate average resolution time for resolved complaints
    resolved_complaints_stmt = select(Complaint).where(
        Complaint.assigned_to == staff_id,
        Complaint.status == ComplaintStatus.RESOLVED
    )
    res = await session.execute(resolved_complaints_stmt)
    resolved_complaints = res.scalars().all()
    
    avg_resolution_days = 0.0
    if resolved_complaints:
        total_days = 0.0
        count = 0
        for c in resolved_complaints:
            if c.updated_at and c.assigned_at:
                diff = c.updated_at - c.assigned_at
                total_days += diff.total_seconds() / 86400  # Convert to days
                count += 1
        if count > 0:
            avg_resolution_days = round(total_days / count, 1)
    
    data = {
        "total_assigned": total,
        "resolved": resolved,
        "rejected": rejected,
        "pending": pending,
        "in_progress": in_progress,
        "resolution_rate": round((resolved / total * 100) if total > 0 else 0, 1),
        "avg_resolution_time_days": avg_resolution_days,
        "staff_name": current_user["name"]
    }
    
    return create_response(True, "Performance retrieved successfully", data)


@api_router.get("/staff/my-complaints")
async def get_my_complaints(current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    """Get detailed list of complaints assigned to the logged-in staff member"""
    if current_user["role"] != UserRole.STAFF:
        return create_response(False, "Permission denied. This endpoint is for staff only.", status_code=403)
    
    staff_id = current_user["id"]
    
    stmt = select(Complaint).where(Complaint.assigned_to == staff_id).order_by(Complaint.created_at.desc())
    res = await session.execute(stmt)
    complaints = res.scalars().all()
    
    def _to_response(c: Complaint):
        # Get resolution outcome from last response or status
        resolution_outcome = None
        if c.status in [ComplaintStatus.RESOLVED, ComplaintStatus.REJECTED]:
            resolution_outcome = c.status.replace("_", " ").title()
            if c.responses and len(c.responses) > 0:
                last_response = c.responses[-1]
                if isinstance(last_response, dict) and "text" in last_response:
                    resolution_outcome = last_response["text"][:100] + ("..." if len(last_response.get("text", "")) > 100 else "")
        
        return {
            "id": c.id,
            "title": c.title,
            "description": c.description[:100] + "..." if len(c.description) > 100 else c.description,
            "category": c.category,
            "status": c.status,
            "priority": c.priority,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            "assigned_at": c.assigned_at.isoformat() if c.assigned_at else None,
            "resolution_outcome": resolution_outcome,
            "student_name": c.student_name if not c.is_anonymous else "Anonymous"
        }
    
    return create_response(True, "Complaints retrieved successfully", [_to_response(c) for c in complaints])


@api_router.get("/staff/report/export")
async def export_staff_report(
    format: str = "excel",
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Export staff performance report as PDF or Excel"""
    if current_user["role"] != UserRole.STAFF:
        return create_response(False, "Permission denied. This endpoint is for staff only.", status_code=403)
    
    staff_id = current_user["id"]
    staff_name = current_user["name"]
    
    # Get complaints
    stmt = select(Complaint).where(Complaint.assigned_to == staff_id).order_by(Complaint.created_at.desc())
    res = await session.execute(stmt)
    complaints = res.scalars().all()
    
    # Get stats
    total = len(complaints)
    resolved = sum(1 for c in complaints if c.status == ComplaintStatus.RESOLVED)
    rejected = sum(1 for c in complaints if c.status == ComplaintStatus.REJECTED)
    pending = total - resolved - rejected
    
    if format.lower() == "excel":
        try:
            import openpyxl
            from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
            from fastapi.responses import Response
            
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Performance Report"
            
            # Header styling
            header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
            header_font = Font(bold=True, color="FFFFFF")
            thin_border = Border(
                left=Side(style='thin'),
                right=Side(style='thin'),
                top=Side(style='thin'),
                bottom=Side(style='thin')
            )
            
            # Title
            ws.merge_cells('A1:G1')
            ws['A1'] = f"Performance Report - {staff_name}"
            ws['A1'].font = Font(bold=True, size=16)
            ws['A1'].alignment = Alignment(horizontal='center')
            
            # Summary section
            ws['A3'] = "Summary Statistics"
            ws['A3'].font = Font(bold=True, size=12)
            ws['A4'] = "Total Assigned:"
            ws['B4'] = total
            ws['A5'] = "Resolved:"
            ws['B5'] = resolved
            ws['A6'] = "Rejected:"
            ws['B6'] = rejected
            ws['A7'] = "Pending:"
            ws['B7'] = pending
            ws['A8'] = "Resolution Rate:"
            ws['B8'] = f"{round((resolved / total * 100) if total > 0 else 0, 1)}%"
            
            # Complaints table header
            headers = ["Complaint ID", "Title", "Category", "Status", "Priority", "Date", "Resolution"]
            for col, header in enumerate(headers, 1):
                cell = ws.cell(row=10, column=col, value=header)
                cell.fill = header_fill
                cell.font = header_font
                cell.border = thin_border
                cell.alignment = Alignment(horizontal='center')
            
            # Complaints data
            for row_idx, c in enumerate(complaints, 11):
                resolution = ""
                if c.status in [ComplaintStatus.RESOLVED, ComplaintStatus.REJECTED]:
                    resolution = c.status.replace("_", " ").title()
                
                data = [
                    c.id[:8] + "...",
                    c.title[:30] + ("..." if len(c.title) > 30 else ""),
                    c.category or "N/A",
                    c.status.replace("_", " ").title(),
                    c.priority or "N/A",
                    c.created_at.strftime("%Y-%m-%d") if c.created_at else "N/A",
                    resolution
                ]
                for col, value in enumerate(data, 1):
                    cell = ws.cell(row=row_idx, column=col, value=value)
                    cell.border = thin_border
            
            # Adjust column widths
            ws.column_dimensions['A'].width = 15
            ws.column_dimensions['B'].width = 35
            ws.column_dimensions['C'].width = 15
            ws.column_dimensions['D'].width = 15
            ws.column_dimensions['E'].width = 10
            ws.column_dimensions['F'].width = 12
            ws.column_dimensions['G'].width = 15
            
            # Save to bytes
            output = io.BytesIO()
            wb.save(output)
            output.seek(0)
            
            return Response(
                content=output.getvalue(),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={
                    "Content-Disposition": f"attachment; filename=performance_report_{staff_id[:8]}.xlsx"
                }
            )
        except ImportError:
            return create_response(False, "Excel export not available. Please install openpyxl.", status_code=500)
    
    elif format.lower() == "pdf":
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import letter, landscape
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from fastapi.responses import Response
            
            output = io.BytesIO()
            doc = SimpleDocTemplate(output, pagesize=landscape(letter))
            styles = getSampleStyleSheet()
            elements = []
            
            # Title
            title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=18, alignment=1)
            elements.append(Paragraph(f"Performance Report - {staff_name}", title_style))
            elements.append(Spacer(1, 20))
            
            # Summary
            summary_data = [
                ["Total Assigned", str(total)],
                ["Resolved", str(resolved)],
                ["Rejected", str(rejected)],
                ["Pending", str(pending)],
                ["Resolution Rate", f"{round((resolved / total * 100) if total > 0 else 0, 1)}%"]
            ]
            summary_table = Table(summary_data, colWidths=[150, 100])
            summary_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ]))
            elements.append(summary_table)
            elements.append(Spacer(1, 30))
            
            # Complaints table
            elements.append(Paragraph("Complaint Details", styles['Heading2']))
            elements.append(Spacer(1, 10))
            
            table_data = [["ID", "Title", "Category", "Status", "Priority", "Date"]]
            for c in complaints[:50]:  # Limit to 50 for PDF
                table_data.append([
                    c.id[:8] + "...",
                    c.title[:25] + ("..." if len(c.title) > 25 else ""),
                    c.category or "N/A",
                    c.status.replace("_", " ").title(),
                    c.priority or "N/A",
                    c.created_at.strftime("%Y-%m-%d") if c.created_at else "N/A"
                ])
            
            complaints_table = Table(table_data, colWidths=[80, 180, 100, 100, 80, 80])
            complaints_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4472C4')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ]))
            elements.append(complaints_table)
            
            doc.build(elements)
            output.seek(0)
            
            return Response(
                content=output.getvalue(),
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename=performance_report_{staff_id[:8]}.pdf"
                }
            )
        except ImportError:
            return create_response(False, "PDF export not available. Please install reportlab.", status_code=500)
    
    else:
        return create_response(False, "Invalid format. Use 'pdf' or 'excel'.", status_code=400)


# ===== STAFF RATING ENDPOINTS =====

def get_current_week_info():
    """Get current ISO week number, year, and week date range."""
    now = datetime.now(timezone.utc)
    week_number = now.isocalendar()[1]
    year = now.isocalendar()[0]
    # Calculate week start (Monday) and end (Sunday)
    week_start = now - timedelta(days=now.weekday())
    week_end = week_start + timedelta(days=6)
    return week_number, year, week_start, week_end


@api_router.post("/ratings")
async def submit_staff_rating(
    rating_data: StaffRatingCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Submit a staff performance rating (Student only, once per staff per week)."""
    # Only students can submit ratings
    if current_user["role"] != UserRole.STUDENT:
        return create_response(False, "Only students can submit staff ratings", status_code=403)
    
    # Verify staff exists
    staff = await session.get(User, rating_data.staff_id)
    if not staff or staff.role != UserRole.STAFF:
        return create_response(False, "Staff member not found", status_code=404)
    
    # Get current week info
    week_number, year, _, _ = get_current_week_info()
    
    # Check for duplicate rating this week
    stmt = select(StaffRating).where(
        StaffRating.student_id == current_user["id"],
        StaffRating.staff_id == rating_data.staff_id,
        StaffRating.week_number == week_number,
        StaffRating.year == year
    )
    result = await session.execute(stmt)
    existing = result.scalars().first()
    
    if existing:
        return create_response(
            False, 
            f"You have already rated this staff member this week. You can rate them again next week.",
            status_code=400
        )
    
    # Create rating
    new_rating = StaffRating(
        student_id=current_user["id"],
        staff_id=rating_data.staff_id,
        week_number=week_number,
        year=year,
        subject_knowledge=rating_data.subject_knowledge,
        teaching_clarity=rating_data.teaching_clarity,
        student_interaction=rating_data.student_interaction,
        punctuality=rating_data.punctuality,
        overall_effectiveness=rating_data.overall_effectiveness
    )
    
    session.add(new_rating)
    await session.commit()
    await session.refresh(new_rating)
    
    logger.info(f"Staff rating submitted: student={current_user['id']}, staff={rating_data.staff_id}, week={week_number}")
    
    avg_rating = (
        new_rating.subject_knowledge + 
        new_rating.teaching_clarity + 
        new_rating.student_interaction + 
        new_rating.punctuality + 
        new_rating.overall_effectiveness
    ) / 5.0
    
    return create_response(True, "Rating submitted successfully", {
        "id": new_rating.id,
        "staff_name": staff.name,
        "week_number": week_number,
        "year": year,
        "average_rating": round(avg_rating, 2)
    })


@api_router.get("/ratings/staff-list")
async def get_staff_for_rating(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get list of registered staff members available for rating."""
    # Only students can access this
    if current_user["role"] != UserRole.STUDENT:
        return create_response(False, "Only students can access staff list for rating", status_code=403)
    
    # Get all staff members
    stmt = select(User).where(User.role == UserRole.STAFF)
    result = await session.execute(stmt)
    staff_list = result.scalars().all()
    
    # Get current week's ratings by this student
    week_number, year, _, _ = get_current_week_info()
    rated_stmt = select(StaffRating.staff_id).where(
        StaffRating.student_id == current_user["id"],
        StaffRating.week_number == week_number,
        StaffRating.year == year
    )
    rated_result = await session.execute(rated_stmt)
    rated_staff_ids = set(r[0] for r in rated_result.all())
    
    staff_data = []
    for staff in staff_list:
        staff_data.append({
            "id": staff.id,
            "name": staff.name,
            "department": staff.department,
            "already_rated_this_week": staff.id in rated_staff_ids
        })
    
    return create_response(True, "Staff list retrieved successfully", {
        "staff": staff_data,
        "week_number": week_number,
        "year": year
    })


@api_router.get("/ratings/my-ratings")
async def get_my_staff_ratings(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get current student's submitted ratings for this week."""
    if current_user["role"] != UserRole.STUDENT:
        return create_response(False, "Only students can view their ratings", status_code=403)
    
    week_number, year, week_start, week_end = get_current_week_info()
    
    # Get this student's ratings for current week, joined with staff names
    stmt = select(StaffRating, User.name.label("staff_name")).join(
        User, StaffRating.staff_id == User.id
    ).where(
        StaffRating.student_id == current_user["id"],
        StaffRating.week_number == week_number,
        StaffRating.year == year
    ).order_by(StaffRating.created_at.desc())
    
    result = await session.execute(stmt)
    ratings = result.all()
    
    ratings_data = []
    for rating, staff_name in ratings:
        avg = (
            rating.subject_knowledge + 
            rating.teaching_clarity + 
            rating.student_interaction + 
            rating.punctuality + 
            rating.overall_effectiveness
        ) / 5.0
        
        ratings_data.append({
            "id": rating.id,
            "staff_id": rating.staff_id,
            "staff_name": staff_name,
            "subject_knowledge": rating.subject_knowledge,
            "teaching_clarity": rating.teaching_clarity,
            "student_interaction": rating.student_interaction,
            "punctuality": rating.punctuality,
            "overall_effectiveness": rating.overall_effectiveness,
            "average_rating": round(avg, 2),
            "created_at": rating.created_at.isoformat() if rating.created_at else None
        })
    
    return create_response(True, "Your ratings retrieved successfully", {
        "ratings": ratings_data,
        "week_number": week_number,
        "year": year,
        "week_start": week_start.strftime("%Y-%m-%d"),
        "week_end": week_end.strftime("%Y-%m-%d")
    })


@api_router.get("/ratings/weekly-report")
async def get_weekly_staff_performance(
    week: Optional[int] = None,
    year: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get weekly staff performance report (HOD/Principal/Admin only)."""
    if current_user["role"] not in [UserRole.HOD, UserRole.PRINCIPAL, UserRole.ADMIN]:
        return create_response(False, "Only HOD, Principal, or Admin can access performance reports", status_code=403)
    
    # Use current week if not specified
    current_week, current_year, week_start, week_end = get_current_week_info()
    target_week = week if week else current_week
    target_year = year if year else current_year
    
    # Calculate week date range for target week
    if week or year:
        # Calculate the first day of the target week
        jan1 = datetime(target_year, 1, 1, tzinfo=timezone.utc)
        # Find the first Monday of the year
        days_to_monday = (7 - jan1.weekday()) % 7
        first_monday = jan1 + timedelta(days=days_to_monday)
        # Calculate target week start
        week_start = first_monday + timedelta(weeks=target_week - 1)
        week_end = week_start + timedelta(days=6)
    
    # Get all ratings for the week
    stmt = select(
        StaffRating.staff_id,
        User.name.label("staff_name"),
        User.department,
        func.avg(
            (StaffRating.subject_knowledge + 
             StaffRating.teaching_clarity + 
             StaffRating.student_interaction + 
             StaffRating.punctuality + 
             StaffRating.overall_effectiveness) / 5.0
        ).label("avg_rating"),
        func.count(StaffRating.id).label("total_ratings")
    ).join(
        User, StaffRating.staff_id == User.id
    ).where(
        StaffRating.week_number == target_week,
        StaffRating.year == target_year
    ).group_by(
        StaffRating.staff_id, User.name, User.department
    ).order_by(
        func.avg(
            (StaffRating.subject_knowledge + 
             StaffRating.teaching_clarity + 
             StaffRating.student_interaction + 
             StaffRating.punctuality + 
             StaffRating.overall_effectiveness) / 5.0
        ).desc()
    )
    
    result = await session.execute(stmt)
    staff_performance = result.all()
    
    # Build response with "Best Staff" badge for top performer
    performance_data = []
    total_ratings = 0
    
    for idx, row in enumerate(staff_performance):
        total_ratings += row.total_ratings
        performance_data.append({
            "staff_id": row.staff_id,
            "staff_name": row.staff_name,
            "department": row.department,
            "average_rating": round(float(row.avg_rating), 2),
            "total_ratings": row.total_ratings,
            "is_best_staff": idx == 0  # First one (highest rating) is best staff
        })
    
    return create_response(True, "Weekly performance report retrieved", {
        "week_number": target_week,
        "year": target_year,
        "week_start": week_start.strftime("%Y-%m-%d"),
        "week_end": week_end.strftime("%Y-%m-%d"),
        "staff_performance": performance_data,
        "total_ratings": total_ratings
    })


@api_router.get("/ratings/weekly-report/pdf")
async def download_weekly_performance_pdf(
    week: Optional[int] = None,
    year: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Download weekly staff performance report as PDF (HOD/Principal/Admin only)."""
    from fastapi.responses import Response
    
    if current_user["role"] not in [UserRole.HOD, UserRole.PRINCIPAL, UserRole.ADMIN]:
        return create_response(False, "Only HOD, Principal, or Admin can download reports", status_code=403)
    
    # Use current week if not specified
    current_week, current_year, week_start, week_end = get_current_week_info()
    target_week = week if week else current_week
    target_year = year if year else current_year
    
    # Calculate week date range
    if week or year:
        jan1 = datetime(target_year, 1, 1, tzinfo=timezone.utc)
        days_to_monday = (7 - jan1.weekday()) % 7
        first_monday = jan1 + timedelta(days=days_to_monday)
        week_start = first_monday + timedelta(weeks=target_week - 1)
        week_end = week_start + timedelta(days=6)
    
    # Get performance data
    stmt = select(
        StaffRating.staff_id,
        User.name.label("staff_name"),
        User.department,
        func.avg(
            (StaffRating.subject_knowledge + 
             StaffRating.teaching_clarity + 
             StaffRating.student_interaction + 
             StaffRating.punctuality + 
             StaffRating.overall_effectiveness) / 5.0
        ).label("avg_rating"),
        func.count(StaffRating.id).label("total_ratings")
    ).join(
        User, StaffRating.staff_id == User.id
    ).where(
        StaffRating.week_number == target_week,
        StaffRating.year == target_year
    ).group_by(
        StaffRating.staff_id, User.name, User.department
    ).order_by(
        func.avg(
            (StaffRating.subject_knowledge + 
             StaffRating.teaching_clarity + 
             StaffRating.student_interaction + 
             StaffRating.punctuality + 
             StaffRating.overall_effectiveness) / 5.0
        ).desc()
    )
    
    result = await session.execute(stmt)
    staff_performance = result.all()
    
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        
        output = io.BytesIO()
        doc = SimpleDocTemplate(output, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        styles = getSampleStyleSheet()
        elements = []
        
        # Title
        title_style = ParagraphStyle('Title', parent=styles['Title'], fontSize=20, textColor=colors.HexColor('#1a365d'))
        elements.append(Paragraph("Weekly Staff Performance Report", title_style))
        elements.append(Spacer(1, 10))
        
        # Report info
        elements.append(Paragraph(f"<b>Week:</b> {target_week} of {target_year}", styles['Normal']))
        elements.append(Paragraph(f"<b>Period:</b> {week_start.strftime('%B %d, %Y')} - {week_end.strftime('%B %d, %Y')}", styles['Normal']))
        elements.append(Paragraph(f"<b>Generated:</b> {datetime.now(timezone.utc).strftime('%B %d, %Y at %H:%M UTC')}", styles['Normal']))
        elements.append(Paragraph(f"<b>Generated by:</b> {current_user['name']} ({current_user['role'].upper()})", styles['Normal']))
        elements.append(Spacer(1, 20))
        
        if staff_performance:
            # Summary
            total = len(staff_performance)
            total_ratings = sum(row.total_ratings for row in staff_performance)
            elements.append(Paragraph(f"<b>Total Staff Rated:</b> {total}", styles['Normal']))
            elements.append(Paragraph(f"<b>Total Ratings Received:</b> {total_ratings}", styles['Normal']))
            elements.append(Spacer(1, 15))
            
            # Best Staff Highlight
            best = staff_performance[0]
            highlight_style = ParagraphStyle('Highlight', parent=styles['Normal'], 
                                            fontSize=12, textColor=colors.HexColor('#065f46'),
                                            backColor=colors.HexColor('#d1fae5'), borderPadding=10)
            elements.append(Paragraph(
                f"⭐ <b>Best Staff of the Week:</b> {best.staff_name} (Avg Rating: {round(float(best.avg_rating), 2)}/5.0)",
                highlight_style
            ))
            elements.append(Spacer(1, 20))
            
            # Performance Table
            elements.append(Paragraph("<b>Staff Performance Rankings</b>", styles['Heading2']))
            elements.append(Spacer(1, 10))
            
            table_data = [["Rank", "Staff Name", "Department", "Avg Rating", "Total Ratings", "Badge"]]
            for idx, row in enumerate(staff_performance):
                badge = "⭐ Best Staff" if idx == 0 else ""
                table_data.append([
                    str(idx + 1),
                    row.staff_name,
                    row.department or "N/A",
                    f"{round(float(row.avg_rating), 2)}/5.0",
                    str(row.total_ratings),
                    badge
                ])
            
            perf_table = Table(table_data, colWidths=[40, 120, 100, 80, 80, 80])
            perf_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4472C4')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#d1fae5')),  # Highlight best staff row
            ]))
            elements.append(perf_table)
        else:
            elements.append(Paragraph("No ratings submitted for this week.", styles['Normal']))
        
        elements.append(Spacer(1, 30))
        elements.append(Paragraph("--- End of Report ---", styles['Normal']))
        
        doc.build(elements)
        output.seek(0)
        
        filename = f"staff_performance_week{target_week}_{target_year}.pdf"
        return Response(
            content=output.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except ImportError:
        return create_response(False, "PDF export not available. Please install reportlab.", status_code=500)


# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev server
        "http://127.0.0.1:3000",  # Alternative localhost
        "http://localhost:8000",  # In case backend serves frontend
        os.environ.get('FRONTEND_URL', 'http://localhost:3000'),  # Environment variable
    ] + (os.environ.get('CORS_ORIGINS', '').split(',') if os.environ.get('CORS_ORIGINS') else []),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== EXCEPTION HANDLERS =====
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return create_response(False, exc.detail, status_code=exc.status_code)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return create_response(False, "Validation error", {"details": exc.errors()}, status_code=422)

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return create_response(False, "Internal server error", status_code=500)

@app.on_event("shutdown")
async def shutdown_db_client():
    # Dispose SQLAlchemy engine on shutdown if initialized
    try:
        eng = get_engine()
        if eng is not None:
            await eng.dispose()
    except Exception as exc:
        logger.exception("Error disposing DB engine: %s", exc)

def role_checker(allowed_roles):
    def decorator(func):
        @wraps(func)
        def wrapper(current_user: dict = Depends(get_current_user), *args, **kwargs):
            if not current_user:
                raise HTTPException(status_code=401, detail="Not authenticated")
            if current_user.get("role") not in allowed_roles:
                raise HTTPException(status_code=403, detail="You do not have enough permissions to access this resource")
            return func(current_user=current_user, *args, **kwargs)
        return wrapper
    return decorator