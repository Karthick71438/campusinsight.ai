import os
import sys

# Ensure backend root is on Python sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.seed import seed_database
from app.graph_db import graph_service
from app.routes.auth import router as auth_router
from app.routes.students import router as students_router
from app.routes.syllabus import router as syllabus_router
from app.routes.concepts import router as concepts_router
from app.routes.quiz import router as quiz_router
from app.routes.graph import router as graph_router
from app.routes.analytics import router as analytics_router
from app.routes.recommendations import router as recommendations_router
from app.routes.demo import router as demo_router
from app.routes.chat import router as chat_router
from app.routes.ai import router as ai_router
from app.routes.google_auth import router as google_auth_router
from app.routes.campus_analytics import router as campus_analytics_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables are created and initial seed is present
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}...")
    try:
        init_db()
    except Exception as e:
        print(f"[Warning] init_db failed during startup: {e}")
    try:
        seed_database()
    except Exception as e:
        print(f"[Warning] seed_database failed during startup: {e}")
    yield
    # Shutdown
    try:
        graph_service.close()
    except Exception:
        pass
    print("Application shutdown complete.")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="CampusInsight AI - Unified Student Performance Analytics and Intervention Platform",
    lifespan=lifespan
)

# CORS configuration for React + Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health endpoint - support both /api/health and /health
@app.get("/api/health", tags=["System Health"])
@app.get("/health", tags=["System Health"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "graph_engine": "Neo4j AuraDB" if graph_service.is_neo4j_active() else "NetworkX Embedded (Active)",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

# Root welcome
@app.get("/", tags=["Root"])
def root():
    return {
        "message": "CampusInsight AI API is online. From Student Data to Smarter Intervention.",
        "tagline": "From Student Data to Smarter Intervention.",
        "docs_url": "/docs",
        "health_check": "/api/health"
    }

# Mount sub-routers under API prefix
app.include_router(campus_analytics_router, prefix=settings.API_PREFIX)
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(google_auth_router, prefix=settings.API_PREFIX)
app.include_router(students_router, prefix=settings.API_PREFIX)
app.include_router(syllabus_router, prefix=settings.API_PREFIX)
app.include_router(concepts_router, prefix=settings.API_PREFIX)
app.include_router(quiz_router, prefix=settings.API_PREFIX)
app.include_router(graph_router, prefix=settings.API_PREFIX)
app.include_router(analytics_router, prefix=settings.API_PREFIX)
app.include_router(recommendations_router, prefix=settings.API_PREFIX)
app.include_router(demo_router, prefix=settings.API_PREFIX)
app.include_router(chat_router, prefix=settings.API_PREFIX)
app.include_router(ai_router, prefix=settings.API_PREFIX)
