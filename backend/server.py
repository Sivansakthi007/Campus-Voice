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
from models import User, Complaint
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

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    # initialize engine and create tables if they don't exist
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

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
        # set assigned user id
        complaint_obj.assigned_to = update_data.assigned_to
        # try to fetch the user to store name
        try:
            user_stmt = select(User).where(User.id == update_data.assigned_to)
            res = await session.execute(user_stmt)
            assigned_user = res.scalars().first()
            if assigned_user:
                complaint_obj.assigned_to_name = assigned_user.name
            complaint_obj.assigned_at = datetime.now(timezone.utc)

            # append a timeline entry for the assignment
            timeline = complaint_obj.timeline or []
            timeline.append({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "action": f"Assigned to {assigned_user.name if assigned_user else update_data.assigned_to}",
                "by": current_user["name"]
            })
            complaint_obj.timeline = timeline
            # ensure status moves to in_progress when assigned
            complaint_obj.status = ComplaintStatus.IN_PROGRESS
        except Exception as e:
            logger.error(f"Error assigning complaint: {str(e)}")
            # fail gracefully and still set the id
            pass

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

    # By category
    cat_stmt = select(Complaint.category, func.count()).group_by(Complaint.category)
    prio_stmt = select(Complaint.priority, func.count()).group_by(Complaint.priority)
    sent_stmt = select(Complaint.sentiment, func.count()).group_by(Complaint.sentiment)

    cat_rows = (await session.execute(cat_stmt)).all()
    prio_rows = (await session.execute(prio_stmt)).all()
    sent_rows = (await session.execute(sent_stmt)).all()

    return {
        "total_complaints": total,
        "resolved_complaints": resolved,
        "pending_complaints": pending,
        "resolution_rate": round((resolved / total * 100) if total > 0 else 0, 2),
        "by_category": {k: v for k, v in cat_rows},
        "by_priority": {k: v for k, v in prio_rows},
        "by_sentiment": {k: v for k, v in sent_rows}
    }

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