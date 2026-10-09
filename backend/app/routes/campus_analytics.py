"""
CampusInsight AI - Campus Analytics & Faculty Intervention API Endpoints
Endpoints serving cohort KPIs, subject performance, attendance correlations, insights, and intervention queues.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import os
import json

from app.database import get_db
from app.models.entities import (
    Student, StudentAcademicRecord, StudentAttendance, StudentEngagement, StudentIntervention
)
from app.config import get_data_dir
from app.analytics_engine.analytics_engine import (
    calculate_cohort_kpis, calculate_subject_performance, calculate_attendance_vs_performance
)
from app.analytics_engine.early_warning import evaluate_student_risk
from app.analytics_engine.insight_engine import generate_cohort_insights
from app.analytics_engine.intervention_engine import recommend_student_interventions

router = APIRouter(prefix="/campus", tags=["CampusInsight Analytics & Intervention"])


def _load_cohort_records(db: Session) -> List[Dict[str, Any]]:
    """
    Loads unified student performance records from the database,
    falling back to seeded JSON dataset if DB records are not yet populated.
    """
    db_students = db.query(Student).filter(Student.student_id.isnot(None)).all()
    records = []

    if db_students:
        for s in db_students:
            acad = s.academic_records[0] if s.academic_records else None
            att = s.attendance_records[0] if s.attendance_records else None
            eng = s.engagement_records[0] if s.engagement_records else None

            records.append({
                "student_id": s.student_id or s.id,
                "name": s.name,
                "department": s.department or "Computer Science",
                "year": s.year or 3,
                "section": s.section or "A",
                "subject": acad.subject if acad else "Data Structures",
                "semester": acad.semester if acad else 5,
                "internal_marks": acad.internal_marks if acad else 65.0,
                "assignment_score": acad.assignment_score if acad else 70.0,
                "previous_performance": acad.previous_performance if acad else 7.5,
                "attendance_percentage": att.attendance_percentage if att else 75.0,
                "engagement_score": eng.engagement_score if eng else 65.0,
            })

    # If DB doesn't have campus records yet, load from JSON fixture
    if not records:
        json_path = os.path.join(get_data_dir(), "campus_students.json")
        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                records = json.load(f)

    return records


@router.get("/kpis")
def get_kpis(
    department: Optional[str] = Query(None),
    section: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Cohort-level key performance indicators:
    - Total Students
    - At-Risk Students
    - Average Attendance
    - Average Internal Marks
    - Average Assignment Performance
    """
    records = _load_cohort_records(db)
    if department:
        records = [r for r in records if r.get("department") == department]
    if section:
        records = [r for r in records if r.get("section") == section]

    kpis = calculate_cohort_kpis(records)
    return kpis


@router.get("/students")
def get_students_overview(
    department: Optional[str] = Query(None),
    section: Optional[str] = Query(None),
    risk_only: bool = Query(False),
    db: Session = Depends(get_db)
):
    """
    Returns student list enriched with calculated risk index and trigger reasons.
    """
    records = _load_cohort_records(db)
    if department:
        records = [r for r in records if r.get("department") == department]
    if section:
        records = [r for r in records if r.get("section") == section]

    results = []
    for r in records:
        risk_info = evaluate_student_risk(r)
        if risk_only and not risk_info["is_at_risk"]:
            continue
        results.append({
            **r,
            "risk_score": risk_info["risk_score"],
            "risk_level": risk_info["risk_level"],
            "is_at_risk": risk_info["is_at_risk"],
            "reasons": risk_info["reasons"],
            "primary_trigger": risk_info["primary_trigger"],
        })

    return results


@router.get("/subject-performance")
def get_subject_performance(db: Session = Depends(get_db)):
    """
    Subject-wise performance breakdowns:
    - Average internal marks
    - Average attendance
    - Average assignment score
    - Student count & risk rates
    """
    records = _load_cohort_records(db)
    return calculate_subject_performance(records)


@router.get("/attendance-vs-performance")
def get_attendance_vs_performance(db: Session = Depends(get_db)):
    """
    Returns correlation coefficient (Pearson r) and scatter data points
    plotting Attendance (%) vs Internal Marks (%).
    """
    records = _load_cohort_records(db)
    return calculate_attendance_vs_performance(records)


@router.get("/insights")
def get_faculty_insights(db: Session = Depends(get_db)):
    """
    Synthesizes actionable, evidence-grounded insights for faculty.
    """
    records = _load_cohort_records(db)
    return generate_cohort_insights(records)


@router.get("/interventions")
def get_interventions_queue(db: Session = Depends(get_db)):
    """
    Returns prioritized queue of students requiring faculty intervention,
    specifying tailored action protocols and severity rankings.
    """
    records = _load_cohort_records(db)
    return recommend_student_interventions(records)
