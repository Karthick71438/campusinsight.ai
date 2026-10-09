import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from app.config import get_db_url
from app.models.entities import Base

db_url = get_db_url()

# Handle SQLite vs Postgres connect_args
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(db_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def _migrate_sqlite_columns(conn):
    """Safely adds new columns to existing SQLite tables if not present."""
    migrations = [
        ("students", "password_hash", "VARCHAR(255)"),
        ("students", "auth_token", "VARCHAR(255)"),
        ("students", "nickname", "VARCHAR(100)"),
        ("students", "google_sub", "VARCHAR(255)"),
        ("concepts", "syllabus_id", "VARCHAR(64)"),
        ("concepts", "unit_name", "VARCHAR(255)"),
        ("concepts", "topic_name", "VARCHAR(255)"),
        ("quiz_attempts", "confidence", "VARCHAR(20) DEFAULT 'medium'"),
        ("quiz_attempts", "quiz_set_id", "VARCHAR(64)"),
        ("recommendations", "action_type", "VARCHAR(30) DEFAULT 'PRACTICE'"),
        ("students", "student_id", "VARCHAR(64)"),
        ("students", "department", "VARCHAR(100) DEFAULT 'Computer Science'"),
        ("students", "year", "INTEGER DEFAULT 3"),
        ("students", "section", "VARCHAR(20) DEFAULT 'A'"),
    ]
    for table, col, col_type in migrations:
        try:
            res = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
            existing_cols = [r[1] for r in res]
            if existing_cols and col not in existing_cols:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
        except Exception:
            pass

def init_db():
    """Create all tables in the configured database and migrate schema."""
    Base.metadata.create_all(bind=engine)
    if db_url.startswith("sqlite"):
        with engine.connect() as conn:
            _migrate_sqlite_columns(conn)
            conn.commit()

# Ensure schema migrations run on module load
try:
    init_db()
except Exception:
    pass

def get_db():
    """Dependency for yielding database session in FastAPI routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
