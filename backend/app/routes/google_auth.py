"""
Google OAuth 2.0 Authentication Route
======================================
Implements the server-side token exchange for Google's Authorization Code flow.

Flow:
  1. Frontend redirects user to Google's consent screen (built in frontend).
  2. Google redirects back to /auth/google/callback (frontend route) with ?code=...&state=...
  3. Frontend sends POST /api/auth/google  { code, redirect_uri, state }
  4. THIS ENDPOINT exchanges the code for tokens at Google's token endpoint.
  5. Verifies the id_token using Google's public JWKS keys.
  6. Finds or creates the application Student record.
  7. Returns the same AuthResponse (token + student) as email/password login.

Security:
  - Client secret NEVER leaves the backend.
  - id_token is verified (signature + aud + exp) before trusting any claims.
  - Google access/refresh tokens are NOT stored; only the app session token is returned.
  - State parameter is accepted from the frontend for CSRF protection (generated/verified in frontend).
"""

import json
import time
import base64
import hashlib
import httpx
import datetime
import urllib.parse
import secrets

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.entities import Student, Syllabus, Mastery
from app.schemas.api_schemas import AuthResponse
from app.auth import create_token
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication & Privacy"])

# Google's OIDC discovery document endpoint
GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"
GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs"


class GoogleAuthCodeRequest(BaseModel):
    code: str
    redirect_uri: str
    state: Optional[str] = None  # CSRF state token (validated on frontend, echoed back here for logging)


class GoogleAuthUrlRequest(BaseModel):
    """Used by the frontend to get the authorisation URL. Not strictly required
    (the frontend builds the URL directly) but provided as a convenience."""
    pass


def _decode_jwt_payload(token: str) -> dict:
    """Decode the payload of a JWT without signature verification (for inspection only).
    Actual verification is done via Google's tokeninfo or JWKS."""
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Not a valid JWT")
    payload_b64 = parts[1]
    # Fix base64 padding
    pad = 4 - len(payload_b64) % 4
    payload_b64 += "=" * (pad % 4)
    raw = base64.urlsafe_b64decode(payload_b64)
    return json.loads(raw)


def _verify_google_id_token(id_token: str, client_id: str) -> dict:
    """
    Verify Google id_token using Google's tokeninfo endpoint.
    This is the simplest secure approach — Google performs all JWKS verification
    server-side and returns the validated claims if the token is valid.

    We additionally check:
      - aud matches our client_id
      - exp has not passed
      - iss is accounts.google.com or https://accounts.google.com
    """
    with httpx.Client(timeout=10) as client:
        resp = client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token}
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=401,
            detail=f"Google id_token verification failed: {resp.text[:200]}"
        )

    claims = resp.json()

    # Validate audience (must match our client_id)
    aud = claims.get("aud", "")
    if aud != client_id:
        raise HTTPException(
            status_code=401,
            detail="Google id_token audience mismatch. Token was not issued for this application."
        )

    # Validate issuer
    iss = claims.get("iss", "")
    if iss not in ("accounts.google.com", "https://accounts.google.com"):
        raise HTTPException(
            status_code=401,
            detail="Google id_token issuer is invalid."
        )

    # Validate expiry (Google's tokeninfo already checks this, but double-check)
    exp = int(claims.get("exp", 0))
    if exp < int(time.time()):
        raise HTTPException(
            status_code=401,
            detail="Google id_token has expired."
        )

    return claims


def _seed_new_student(db: Session, student: Student):
    """Seed a new Google-authenticated student with the default CS curriculum and baseline mastery."""
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
    import json as _json
    syl = Syllabus(
        id=f"syl-{student.id}-init",
        student_id=student.id,
        title="Data Structures & Algorithms Course Syllabus",
        filename="CS101_DSA_Syllabus.pdf",
        raw_text="Core CS Syllabus covering Units 1 through 4.",
        units_json=_json.dumps(default_units)
    )
    db.add(syl)

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


def _process_google_auth_code(code: str, redirect_uri: str, db: Session) -> tuple[str, Student]:
    """
    Core helper to exchange a Google auth code, verify identity, and return (app_token, student).
    """
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Google OAuth is not configured on this server. Please ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in backend/.env."
        )

    # Exchange authorization code for tokens
    try:
        with httpx.Client(timeout=15) as client:
            token_resp = client.post(
                GOOGLE_TOKEN_ENDPOINT,
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Network error contacting Google OAuth servers: {str(exc)}"
        )

    if token_resp.status_code != 200:
        error_body = token_resp.text[:300]
        raise HTTPException(
            status_code=401,
            detail=f"Google token exchange failed. Details: {error_body}"
        )

    token_data = token_resp.json()
    id_token = token_data.get("id_token")

    if not id_token:
        raise HTTPException(
            status_code=401,
            detail="Google did not return an id_token. Authentication cannot proceed."
        )

    # Verify id_token and extract claims
    claims = _verify_google_id_token(id_token, settings.GOOGLE_CLIENT_ID)

    google_sub = claims.get("sub")
    google_email = claims.get("email", "").strip().lower()
    google_name = claims.get("name") or claims.get("given_name") or google_email.split("@")[0]
    email_verified = claims.get("email_verified") == "true" or claims.get("email_verified") is True

    if not google_sub:
        raise HTTPException(status_code=401, detail="Google id_token is missing required 'sub' claim.")

    if not email_verified:
        raise HTTPException(
            status_code=401,
            detail="Your Google account email address is not verified. Please verify your Google account and try again."
        )

    # --- Find or create student ---
    student = db.query(Student).filter(Student.google_sub == google_sub).first()

    if not student:
        student = db.query(Student).filter(Student.email == google_email).first()
        if student:
            student.google_sub = google_sub
            db.commit()

    if not student:
        student = Student(
            name=google_name,
            email=google_email,
            google_sub=google_sub,
            role="Student",
        )
        db.add(student)
        db.commit()
        db.refresh(student)

        _seed_new_student(db, student)
        db.refresh(student)

    app_token = create_token(student.id, student.email)
    return app_token, student


@router.post("/google", response_model=AuthResponse)
def google_oauth_callback(payload: GoogleAuthCodeRequest, db: Session = Depends(get_db)):
    """
    Exchange a Google authorization code for an application session token.
    Used when frontend performs the code exchange via POST.
    """
    app_token, student = _process_google_auth_code(payload.code, payload.redirect_uri, db)
    return AuthResponse(token=app_token, student=student)


@router.get("/google/callback")
def google_oauth_redirect_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Backend callback endpoint:
    Google redirects the user here after consent:
      GET /api/auth/google/callback?code=...&state=...
    The backend exchanges code, verifies identity, establishes session,
    and redirects the user back to the frontend dashboard.
    """
    frontend_base = (settings.FRONTEND_URL or "http://localhost:3003").rstrip("/")
    target_callback = f"{frontend_base}/auth/google/callback"

    if error:
        err_msg = error_description or error
        return RedirectResponse(
            url=f"{target_callback}?error={urllib.parse.quote(error)}&error_description={urllib.parse.quote(err_msg)}"
        )

    if not code:
        return RedirectResponse(
            url=f"{target_callback}?error=missing_code&error_description={urllib.parse.quote('No authorization code provided by Google.')}"
        )

    try:
        redirect_uri = settings.GOOGLE_REDIRECT_URI or "http://localhost:8000/api/auth/google/callback"
        app_token, student = _process_google_auth_code(code, redirect_uri, db)

        display_name = student.nickname or student.name
        params = urllib.parse.urlencode({
            "token": app_token,
            "student_id": student.id,
            "name": display_name,
            "email": student.email
        })
        return RedirectResponse(url=f"{target_callback}?{params}")
    except HTTPException as e:
        return RedirectResponse(
            url=f"{target_callback}?error=auth_failed&error_description={urllib.parse.quote(str(e.detail))}"
        )
    except Exception as e:
        return RedirectResponse(
            url=f"{target_callback}?error=server_error&error_description={urllib.parse.quote(str(e))}"
        )


@router.get("/google/url")
def get_google_auth_url(redirect_uri: Optional[str] = None):
    """
    Returns the Google authorization URL dynamically based on backend configuration.
    """
    client_id = settings.GOOGLE_CLIENT_ID
    if not client_id:
        raise HTTPException(
            status_code=503,
            detail="Google OAuth is not configured on this server. Missing GOOGLE_CLIENT_ID."
        )

    target_redirect = redirect_uri or settings.GOOGLE_REDIRECT_URI or "http://localhost:8000/api/auth/google/callback"
    state = secrets.token_hex(16)
    params = urllib.parse.urlencode({
        "client_id": client_id,
        "redirect_uri": target_redirect,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account"
    })
    return {
        "url": f"https://accounts.google.com/o/oauth2/v2/auth?{params}",
        "client_id": client_id,
        "redirect_uri": target_redirect,
        "state": state
    }

