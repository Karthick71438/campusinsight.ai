from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.entities import Student, Syllabus, Mastery
from app.schemas.api_schemas import (
    AuthRegisterRequest, AuthLoginRequest, AuthResponse, StudentResponse
)
from app.auth import hash_password, verify_password, create_token, verify_token
from app.seed import load_json_file
from app.graph_db import graph_service
import json
import datetime

router = APIRouter(prefix="/auth", tags=["Authentication & Privacy"])

@router.post("/register", response_model=AuthResponse)
def register_student(payload: AuthRegisterRequest, db: Session = Depends(get_db)):
    """Registers a new student securely with salted password hashing and seeds their initial graph."""
    if not payload.email or "@" not in payload.email:
        raise HTTPException(status_code=400, detail="A valid student email address is required.")
    if len(payload.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters long.")

    existing = db.query(Student).filter(Student.email == payload.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email address already exists. Please log in.")

    # Create new student
    student = Student(
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        password_hash=hash_password(payload.password),
        role=payload.role or "Student",
        nickname=payload.nickname.strip() if payload.nickname else None
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    # Initialize default CS curriculum syllabus for the new student
    default_units = [
        {
            "unit_number": 1,
            "title": "Unit 1: Programming Fundamentals",
            "topics": [
                {"title": "Procedural Constructs", "concepts": ["concept-functions"]},
                {"title": "Linear Data Structures", "concepts": ["concept-arrays"]}
            ]
        },
        {
            "unit_number": 2,
            "title": "Unit 2: Algorithmic Paradigms",
            "topics": [
                {"title": "Recursive Decomposition", "concepts": ["concept-recursion"]}
            ]
        },
        {
            "unit_number": 3,
            "title": "Unit 3: Hierarchical Structures",
            "topics": [
                {"title": "Tree Structures & Traversal", "concepts": ["concept-trees"]}
            ]
        },
        {
            "unit_number": 4,
            "title": "Unit 4: Advanced Graph Analytics",
            "topics": [
                {"title": "Network Topologies & Paths", "concepts": ["concept-graphs"]}
            ]
        }
    ]
    syl = Syllabus(
        id=f"syl-{student.id}-init",
        student_id=student.id,
        title="Data Structures & Algorithms Course Syllabus",
        filename="CS101_DSA_Syllabus.pdf",
        raw_text="Core CS Syllabus covering Units 1 through 4.",
        units_json=json.dumps(default_units)
    )
    db.add(syl)

    # Initialize baseline mastery
    now = datetime.datetime.now(datetime.timezone.utc)
    base_scores = {
        "concept-functions": 85.0,
        "concept-arrays": 75.0,
        "concept-recursion": 50.0,
        "concept-trees": 0.0,
        "concept-graphs": 0.0
    }
    for cid, sc in base_scores.items():
        stab = "Strong" if sc >= 85 else ("Stable" if sc >= 70 else ("Weakening" if sc >= 50 else "At Risk"))
        m = Mastery(
            id=f"m-{student.id}-{cid}",
            student_id=student.id,
            concept_id=cid,
            mastery_score=sc,
            stability=stab,
            last_practiced=now if sc > 0 else None
        )
        db.add(m)
    db.commit()

    token = create_token(student.id, student.email)
    return AuthResponse(token=token, student=student)

@router.post("/login", response_model=AuthResponse)
def login_student(payload: AuthLoginRequest, db: Session = Depends(get_db)):
    """Authenticates student credentials and returns a secure session token."""
    email = payload.email.strip().lower()
    student = db.query(Student).filter(Student.email == email).first()
    if not student:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    # Check password
    is_valid = False
    if student.password_hash:
        is_valid = verify_password(payload.password, student.password_hash)
    elif payload.password == "student123":
        # Legacy/demo fallback
        is_valid = True
        student.password_hash = hash_password(payload.password)
        db.commit()

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_token(student.id, student.email)
    return AuthResponse(token=token, student=student)

@router.get("/me", response_model=StudentResponse)
def get_current_authenticated_student(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Returns current active student from authorization bearer token."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header.")
    
    token = authorization.replace("Bearer ", "").strip()
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired session token.")

    student = db.query(Student).filter(Student.id == payload.get("sub")).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    return student
