import datetime
import uuid
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Student(Base):
    __tablename__ = "students"
    
    id = Column(String(64), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    nickname = Column(String(100), nullable=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    auth_token = Column(String(255), nullable=True)
    google_sub = Column(String(255), nullable=True, unique=True)  # Google OAuth subject identifier
    role = Column(String(100), default="Student")
    student_id = Column(String(64), nullable=True)  # Institutional ID / Roll Number (e.g., CS2024-001)
    department = Column(String(100), default="Computer Science")
    year = Column(Integer, default=3)
    section = Column(String(20), default="A")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    mastery_records = relationship("Mastery", back_populates="student", cascade="all, delete-orphan")
    quiz_attempts = relationship("QuizAttempt", back_populates="student", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="student", cascade="all, delete-orphan")
    history_records = relationship("MasteryHistory", back_populates="student", cascade="all, delete-orphan")
    syllabi = relationship("Syllabus", back_populates="student", cascade="all, delete-orphan")

    # CampusInsight Core Relationships
    academic_records = relationship("StudentAcademicRecord", back_populates="student", cascade="all, delete-orphan")
    attendance_records = relationship("StudentAttendance", back_populates="student", cascade="all, delete-orphan")
    engagement_records = relationship("StudentEngagement", back_populates="student", cascade="all, delete-orphan")
    interventions = relationship("StudentIntervention", back_populates="student", cascade="all, delete-orphan")


class Syllabus(Base):
    __tablename__ = "syllabi"
    
    id = Column(String(64), primary_key=True, default=generate_uuid)
    student_id = Column(String(64), ForeignKey("students.id"), nullable=False)
    title = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    raw_text = Column(Text, nullable=True)
    units_json = Column(Text, nullable=True)  # JSON-encoded array of units, topics, concepts
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    student = relationship("Student", back_populates="syllabi")
    concepts = relationship("Concept", back_populates="syllabus")


class Subject(Base):
    __tablename__ = "subjects"
    
    id = Column(String(64), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    
    concepts = relationship("Concept", back_populates="subject", cascade="all, delete-orphan")


class Concept(Base):
    __tablename__ = "concepts"
    
    id = Column(String(64), primary_key=True)
    subject_id = Column(String(64), ForeignKey("subjects.id"), nullable=True)
    syllabus_id = Column(String(64), ForeignKey("syllabi.id"), nullable=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=False, nullable=False)
    description = Column(Text, nullable=True)
    unit_name = Column(String(255), nullable=True)
    topic_name = Column(String(255), nullable=True)
    order_index = Column(Integer, default=0)
    
    subject = relationship("Subject", back_populates="concepts")
    syllabus = relationship("Syllabus", back_populates="concepts")
    questions = relationship("Question", back_populates="concept", cascade="all, delete-orphan")
    mastery_records = relationship("Mastery", back_populates="concept", cascade="all, delete-orphan")


class ConceptPrerequisite(Base):
    __tablename__ = "concept_prerequisites"
    
    id = Column(String(64), primary_key=True, default=generate_uuid)
    source_concept_id = Column(String(64), ForeignKey("concepts.id"), nullable=False)
    target_concept_id = Column(String(64), ForeignKey("concepts.id"), nullable=False)
    required_mastery = Column(Float, default=70.0)
    student_id = Column(String(64), ForeignKey("students.id"), nullable=True)


class Question(Base):
    __tablename__ = "questions"
    
    id = Column(String(64), primary_key=True, default=generate_uuid)
    concept_id = Column(String(64), ForeignKey("concepts.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    option_a = Column(Text, nullable=False)
    option_b = Column(Text, nullable=False)
    option_c = Column(Text, nullable=False)
    option_d = Column(Text, nullable=False)
    correct_answer = Column(String(4), nullable=False)  # 'A', 'B', 'C', 'D'
    explanation = Column(Text, nullable=True)
    difficulty = Column(String(20), default="medium")  # 'easy', 'medium', 'hard'
    
    concept = relationship("Concept", back_populates="questions")
    attempts = relationship("QuizAttempt", back_populates="question")


class QuizSet(Base):
    __tablename__ = "quiz_sets"
    
    id = Column(String(64), primary_key=True, default=generate_uuid)
    student_id = Column(String(64), ForeignKey("students.id"), nullable=False)
    concept_id = Column(String(64), ForeignKey("concepts.id"), nullable=False)
    question_ids_json = Column(Text, nullable=False)  # JSON list of question IDs in order
    set_number = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    
    id = Column(String(64), primary_key=True, default=generate_uuid)
    student_id = Column(String(64), ForeignKey("students.id"), nullable=False)
    concept_id = Column(String(64), ForeignKey("concepts.id"), nullable=False)
    question_id = Column(String(64), ForeignKey("questions.id"), nullable=False)
    quiz_set_id = Column(String(64), nullable=True)
    selected_answer = Column(String(4), nullable=False)
    is_correct = Column(Boolean, nullable=False)
    confidence = Column(String(20), default="medium")  # 'low', 'medium', 'high'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    student = relationship("Student", back_populates="quiz_attempts")
    question = relationship("Question", back_populates="attempts")


class Mastery(Base):
    __tablename__ = "mastery"
    
    id = Column(String(64), primary_key=True, default=generate_uuid)
    student_id = Column(String(64), ForeignKey("students.id"), nullable=False)
    concept_id = Column(String(64), ForeignKey("concepts.id"), nullable=False)
    mastery_score = Column(Float, nullable=False)  # 0.0 to 100.0
    stability = Column(String(20), nullable=False)  # 'Strong', 'Stable', 'Weakening', 'At Risk'
    last_practiced = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    student = relationship("Student", back_populates="mastery_records")
    concept = relationship("Concept", back_populates="mastery_records")


class MasteryHistory(Base):
    __tablename__ = "mastery_history"
    
    id = Column(String(64), primary_key=True, default=generate_uuid)
    student_id = Column(String(64), ForeignKey("students.id"), nullable=False)
    concept_id = Column(String(64), ForeignKey("concepts.id"), nullable=False)
    mastery_score = Column(Float, nullable=False)
    recorded_at = Column(DateTime, default=datetime.datetime.utcnow)
    note = Column(String(255), nullable=True)
    
    student = relationship("Student", back_populates="history_records")


class Recommendation(Base):
    __tablename__ = "recommendations"
    
    id = Column(String(64), primary_key=True, default=generate_uuid)
    student_id = Column(String(64), ForeignKey("students.id"), nullable=False)
    concept_id = Column(String(64), ForeignKey("concepts.id"), nullable=False)
    priority = Column(Integer, nullable=False)  # 1 = top priority
    priority_score = Column(Float, nullable=False)
    action_type = Column(String(30), default="PRACTICE")  # ADVANCE, PRACTICE, REVIEW, REMEDIATE, CHALLENGE
    reason = Column(Text, nullable=False)
    root_cause_concept_id = Column(String(64), nullable=True)
    impacted_concept_id = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    student = relationship("Student", back_populates="recommendations")


# ==============================================================================
# CampusInsight AI Core Entities
# Unified student performance analytics and intervention signals
# ==============================================================================

class StudentAcademicRecord(Base):
    __tablename__ = "academic_records"
    
    id = Column(String(64), primary_key=True, default=generate_uuid)
    student_id = Column(String(64), ForeignKey("students.id"), nullable=False)
    subject = Column(String(150), nullable=False)
    semester = Column(Integer, default=5, nullable=False)
    internal_marks = Column(Float, nullable=False)  # Normalized to 0.0 - 100.0 scale
    assignment_score = Column(Float, nullable=False)  # 0.0 - 100.0 scale
    previous_performance = Column(Float, nullable=False)  # Prior Semester GPA/Marks (0.0 - 100.0 or 0-10 CGPA scale)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    student = relationship("Student", back_populates="academic_records")


class StudentAttendance(Base):
    __tablename__ = "attendance_records"
    
    id = Column(String(64), primary_key=True, default=generate_uuid)
    student_id = Column(String(64), ForeignKey("students.id"), nullable=False)
    attendance_percentage = Column(Float, nullable=False)  # 0.0 - 100.0
    total_classes = Column(Integer, default=60)
    classes_attended = Column(Integer, default=45)
    recorded_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    student = relationship("Student", back_populates="attendance_records")


class StudentEngagement(Base):
    __tablename__ = "engagement_records"
    
    id = Column(String(64), primary_key=True, default=generate_uuid)
    student_id = Column(String(64), ForeignKey("students.id"), nullable=False)
    engagement_score = Column(Float, nullable=False)  # Composite engagement score (0.0 - 100.0)
    portal_logins = Column(Integer, default=10)
    forum_participations = Column(Integer, default=2)
    assignment_submissions_rate = Column(Float, default=85.0)
    recorded_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    student = relationship("Student", back_populates="engagement_records")


class StudentIntervention(Base):
    __tablename__ = "interventions"
    
    id = Column(String(64), primary_key=True, default=generate_uuid)
    student_id = Column(String(64), ForeignKey("students.id"), nullable=False)
    risk_level = Column(String(20), default="Moderate")  # 'Critical', 'High', 'Moderate', 'Low'
    risk_score = Column(Float, nullable=False)  # 0.0 - 100.0 composite risk index
    reason = Column(Text, nullable=False)  # Multi-signal diagnostic reason
    recommended_action = Column(Text, nullable=False)  # Specific faculty intervention protocol
    status = Column(String(30), default="Pending")  # 'Pending', 'In Progress', 'Resolved'
    faculty_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    student = relationship("Student", back_populates="interventions")
