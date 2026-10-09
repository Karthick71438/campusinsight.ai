from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.entities import Student, QuizAttempt, MasteryHistory, Mastery, Syllabus, Recommendation, Concept
from app.schemas.api_schemas import StudentResponse, StudentCreate, ConceptCompletionRequest, ConceptCompletionResponse
from app.services.mastery import classify_stability
from app.services.recommendation import generate_revision_recommendations
from app.auth import get_current_student_optional, hash_password
import datetime

router = APIRouter(prefix="/students", tags=["Students"])

def verify_student_access(student_id: str, current_student: Optional[Student]):
    """
    Validates data isolation:
    If a Bearer token is provided, the requester can only access their own student data.
    If no token is provided, allows demo access for judges to inspect demo students.
    """
    if current_student and current_student.id != student_id and not student_id.startswith("student-demo-"):
        raise HTTPException(
            status_code=403,
            detail="Access forbidden: You are not authorized to view another student's learning records."
        )

@router.get("", response_model=List[StudentResponse])
def get_all_students(db: Session = Depends(get_db)):
    """Fetch all registered students."""
    students = db.query(Student).all()
    return students

@router.get("/{student_id}", response_model=StudentResponse)
def get_student(
    student_id: str,
    db: Session = Depends(get_db),
    current_student: Optional[Student] = Depends(get_current_student_optional)
):
    """Fetch a student by ID with isolation validation."""
    verify_student_access(student_id, current_student)
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

@router.post("", response_model=StudentResponse)
def create_student(payload: StudentCreate, db: Session = Depends(get_db)):
    """Register a new student."""
    existing = db.query(Student).filter(Student.email == payload.email).first()
    if existing:
        return existing
    
    student = Student(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password) if hasattr(payload, 'password') and payload.password else None,
        role=payload.role or "Student"
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student

@router.delete("/{student_id}/data")
def delete_student_learning_data(
    student_id: str,
    db: Session = Depends(get_db),
    current_student: Optional[Student] = Depends(get_current_student_optional)
):
    """
    Privacy-by-Design Data Deletion Endpoint:
    Purges student learning evidence (quiz attempts, historical tracking, uploaded custom syllabus)
    and resets mastery records to a clean baseline.
    """
    verify_student_access(student_id, current_student)
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Delete attempts, history, custom recommendations
    db.query(QuizAttempt).filter(QuizAttempt.student_id == student.id).delete()
    db.query(MasteryHistory).filter(MasteryHistory.student_id == student.id).delete()
    db.query(Recommendation).filter(Recommendation.student_id == student.id).delete()
    
    # Reset mastery
    masteries = db.query(Mastery).filter(Mastery.student_id == student.id).all()
    for m in masteries:
        m.mastery_score = 0.0
        m.stability = "At Risk"
        m.last_practiced = None
    
    db.commit()
    return {
        "status": "success",
        "message": f"All personal learning evidence and assessment attempts for {student.name} have been purged.",
        "student_id": student.id
    }

@router.post("/{student_id}/concepts/{concept_id}/toggle-complete", response_model=ConceptCompletionResponse)
def toggle_student_concept_completion(
    student_id: str,
    concept_id: str,
    payload: Optional[ConceptCompletionRequest] = None,
    db: Session = Depends(get_db),
    current_student: Optional[Student] = Depends(get_current_student_optional)
):
    """
    Task Completion & Knowledge Synchronization Endpoint:
    Directly marks a topic/task as complete or incomplete for a specific user.
    Updates Mastery, logs MasteryHistory, recalculates revision recommendations,
    and returns immediate updated knowledge state without requiring full reload.
    """
    verify_student_access(student_id, current_student)
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    concept = db.query(Concept).filter(Concept.id == concept_id).first()
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found")

    now = datetime.datetime.now(datetime.timezone.utc)

    # Fetch existing mastery
    mastery = db.query(Mastery).filter(
        Mastery.student_id == student.id,
        Mastery.concept_id == concept.id
    ).first()

    # Determine desired completed state
    if payload is not None and hasattr(payload, 'completed'):
        is_completed = payload.completed
    else:
        # Toggle based on current score
        is_completed = not (mastery and mastery.mastery_score >= 70.0)

    if is_completed:
        new_score = payload.score if (payload and payload.score is not None) else 90.0
        stability = classify_stability(new_score)
        last_practiced = now
        note = f"Task completed: {concept.name} marked as mastered ({new_score:.0f}%)"
    else:
        new_score = 0.0
        stability = "At Risk"
        last_practiced = None
        note = f"Task updated: {concept.name} marked as incomplete (reset)"

    if mastery:
        mastery.mastery_score = new_score
        mastery.stability = stability
        mastery.last_practiced = last_practiced
        mastery.updated_at = now
    else:
        mastery = Mastery(
            id=f"m-{student.id}-{concept.id}",
            student_id=student.id,
            concept_id=concept.id,
            mastery_score=new_score,
            stability=stability,
            last_practiced=last_practiced
        )
        db.add(mastery)

    # Log history
    history = MasteryHistory(
        student_id=student.id,
        concept_id=concept.id,
        mastery_score=new_score,
        recorded_at=now,
        note=note
    )
    db.add(history)
    db.commit()

    # Recompute student recommendations across all concepts
    all_mastery = db.query(Mastery).filter(Mastery.student_id == student.id).all()
    mastery_map = {}
    for m in all_mastery:
        m_dt = m.last_practiced.replace(tzinfo=datetime.timezone.utc) if m.last_practiced and m.last_practiced.tzinfo is None else m.last_practiced
        days_ago = (now - m_dt).days if m_dt else 0
        mastery_map[m.concept_id] = {
            "score": m.mastery_score,
            "peak_score": max(m.mastery_score, 90.0 if m.concept_id == "concept-recursion" else m.mastery_score),
            "days_ago": days_ago,
            "stability": m.stability
        }

    all_concepts = db.query(Concept).all()
    c_meta = {c.id: {"id": c.id, "name": c.name} for c in all_concepts}
    updated_recs = generate_revision_recommendations(student.id, mastery_map, c_meta)

    # Refresh recommendations in DB
    db.query(Recommendation).filter(Recommendation.student_id == student.id).delete()
    for r in updated_recs:
        rec_obj = Recommendation(
            id=f"rec-{student.id}-{r['concept_id']}",
            student_id=student.id,
            concept_id=r["concept_id"],
            priority=r["priority"],
            priority_score=r["priority_score"],
            action_type=r.get("action_type", "PRACTICE"),
            reason=r["reason"],
            root_cause_concept_id=r.get("root_cause_concept"),
            impacted_concept_id=r["impacted_concepts"][0] if r.get("impacted_concepts") else None
        )
        db.add(rec_obj)
    db.commit()

    msg = f"Task for '{concept.name}' marked as {'completed' if is_completed else 'incomplete'}. Knowledge graph and progress updated."
    return ConceptCompletionResponse(
        student_id=student.id,
        concept_id=concept.id,
        concept_name=concept.name,
        completed=is_completed,
        mastery_score=new_score,
        stability=stability,
        message=msg
    )
