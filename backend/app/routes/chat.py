# chat.py — Legacy compatibility stubs only.
# Primary AI chat routes are defined in app/routes/ai.py
# This file is kept to avoid breaking any imports.
from fastapi import APIRouter

router = APIRouter(tags=["DOUBT AI Tutor (Legacy)"])
# All routes moved to app/routes/ai.py to eliminate duplicate Operation ID warnings.
