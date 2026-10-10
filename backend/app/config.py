import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import List

# Resolve backend/.env path relative to this file (backend/app/config.py -> backend/.env)
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_ENV_FILE = _BACKEND_DIR / ".env"

# Explicitly load .env file regardless of terminal CWD
if _ENV_FILE.exists():
    load_dotenv(dotenv_path=_ENV_FILE, override=True)

class Settings(BaseSettings):
    model_config = ConfigDict(extra="allow", env_file=str(_ENV_FILE))

    APP_NAME: str = "CampusInsight AI"
    APP_VERSION: str = "1.0.0"
    APP_TAGLINE: str = "From Student Data to Smarter Intervention."
    API_PREFIX: str = "/api"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Server Binding
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    
    # Allowed CORS Origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:3003",
        "http://127.0.0.1:3003",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    
    # Frontend URL (for OAuth redirect callbacks)
    FRONTEND_URL: str = "http://localhost:3003"

    # Database Configuration (Supabase PostgreSQL with automatic SQLite fallback)
    SUPABASE_DB_URL: str = ""
    DATABASE_URL: str = "sqlite:///./learngraph.db"
    
    # Neo4j AuraDB Configuration (with automatic in-memory fallback)
    NEO4J_URI: str = ""
    NEO4J_USERNAME: str = ""
    NEO4J_PASSWORD: str = ""
    
    # Optional LLM API Key (Gemini)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    
    # Configurable Knowledge Stability & Decay Thresholds
    THRESHOLD_STRONG: float = 85.0     # >= 85: Strong
    THRESHOLD_STABLE: float = 70.0     # 70 - 84: Stable
    THRESHOLD_WEAKENING: float = 50.0  # 50 - 69: Weakening (< 50: At Risk)
    
    # Memory Decay Parameters (Ebbinghaus-based estimate calibrated to 90% -> 55% at 21 days)
    DEFAULT_STABILITY_FACTOR: float = 24.0  # Days scale
    MIN_DECAY_FLOOR: float = 30.0           # Retention floor for established concepts
    
    # Revision Priority Weights
    WEIGHT_MASTERY_DEFICIT: float = 0.35
    WEIGHT_DECAY_URGENCY: float = 0.25
    WEIGHT_DOWNSTREAM_IMPACT: float = 0.40

    # Google OAuth 2.0 Configuration
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"

settings = Settings()

# Fallback: if GOOGLE_CLIENT_ID is empty in settings, check environment or frontend/.env
if not settings.GOOGLE_CLIENT_ID:
    _frontend_env = _BACKEND_DIR.parent / "frontend" / ".env"
    if _frontend_env.exists():
        try:
            with open(_frontend_env, "r", encoding="utf-8") as _f:
                for _line in _f:
                    _line = _line.strip()
                    if _line.startswith("VITE_GOOGLE_CLIENT_ID="):
                        _cid = _line.split("=", 1)[1].strip()
                        if _cid:
                            settings.GOOGLE_CLIENT_ID = _cid
                            break
        except Exception:
            pass


def get_db_url() -> str:
    """Return Supabase Postgres URL if present, otherwise SQLite file (using /tmp on Vercel)."""
    if settings.SUPABASE_DB_URL and settings.SUPABASE_DB_URL.strip():
        return settings.SUPABASE_DB_URL.strip()
    
    # On Vercel / serverless runtimes, root filesystem is read-only; use /tmp
    if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        tmp_db = "/tmp/learngraph.db"
        if not os.path.exists(tmp_db):
            import shutil
            for candidate in [
                os.path.join(os.path.dirname(__file__), "..", "learngraph.db"),
                os.path.join(os.path.dirname(__file__), "..", "..", "learngraph.db"),
                "learngraph.db",
            ]:
                if os.path.exists(candidate) and os.path.getsize(candidate) > 0:
                    try:
                        shutil.copyfile(candidate, tmp_db)
                        break
                    except Exception:
                        pass
        return f"sqlite:///{tmp_db}"
        
    return settings.DATABASE_URL

def get_data_dir() -> str:
    """Locate the data directory containing seeded JSON fixtures."""
    # First check inside backend/data (bundled in deployment)
    backend_data = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
    if os.path.exists(os.path.join(backend_data, "concepts.json")):
        return backend_data

    # Walk upwards if running from elsewhere
    curr = os.path.abspath(os.path.dirname(__file__))
    for _ in range(5):
        candidate = os.path.join(curr, "data")
        if os.path.exists(os.path.join(candidate, "concepts.json")):
            return candidate
        curr = os.path.dirname(curr)
        
    return backend_data


