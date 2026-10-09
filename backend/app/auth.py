import hashlib
import hmac
import os
import json
import base64
import time
from typing import Optional
from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import Student

# Application auth secret (default or from env)
AUTH_SECRET = os.environ.get("LEARNGRAPH_AUTH_SECRET", "learngraph_super_secret_secure_key_2026")

def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with 16-byte random salt."""
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return f"{salt.hex()}${dk.hex()}"

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against salt$hash string using constant-time comparison."""
    if not hashed or "$" not in hashed:
        return False
    try:
        salt_hex, hash_hex = hashed.split("$", 1)
        salt = bytes.fromhex(salt_hex)
        expected_dk = bytes.fromhex(hash_hex)
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
        return hmac.compare_digest(dk, expected_dk)
    except Exception:
        return False

def create_token(student_id: str, email: str) -> str:
    """Create a signed bearer session token."""
    payload = {
        "sub": student_id,
        "email": email,
        "iat": int(time.time()),
        "exp": int(time.time()) + 86400 * 7  # 7 days
    }
    raw = json.dumps(payload, separators=(',', ':')).encode("utf-8")
    b64_payload = base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")
    sig = hmac.new(AUTH_SECRET.encode("utf-8"), b64_payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{b64_payload}.{sig}"

def verify_token(token: str) -> Optional[dict]:
    """Verify signed session token and return payload if valid."""
    if not token or "." not in token:
        return None
    try:
        b64_payload, sig = token.split(".", 1)
        expected_sig = hmac.new(AUTH_SECRET.encode("utf-8"), b64_payload.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        
        # Add padding
        pad = len(b64_payload) % 4
        padded = b64_payload + ("=" * (4 - pad) if pad else "")
        raw = base64.urlsafe_b64decode(padded.encode("utf-8"))
        payload = json.loads(raw.decode("utf-8"))
        
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None

def get_current_student_optional(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[Student]:
    """Optional authentication resolver - returns student if token provided, else None."""
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "").strip()
    payload = verify_token(token)
    if not payload:
        return None
    student_id = payload.get("sub")
    return db.query(Student).filter(Student.id == student_id).first()

def get_current_student_required(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Student:
    """Enforces authentication and returns current student."""
    student = get_current_student_optional(authorization, db)
    if not student:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please provide a valid Bearer token."
        )
    return student
