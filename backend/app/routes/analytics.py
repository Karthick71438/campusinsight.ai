import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from app.database import get_db
from app.models.entities import Student, Concept, Mastery, MasteryHistory, Recommendation, Syllabus
from app.schemas.api_schemas import (
    StudentMasteryOverview, ConceptMasteryItem,
    StudentDecayResponse, ConceptDecayDetail, DecayCurvePoint
)
from app.services.decay import generate_decay_curve_projection, estimate_knowledge_decay
from app.services.dependency import analyze_dependencies_and_bottlenecks
from app.services.pdf_report_generator import generate_student_progress_pdf, collect_student_progress_data
from app.routes.students import verify_student_access
from app.auth import get_current_student_optional
from app.graph_db import graph_service
from app.config import settings

router = APIRouter(prefix="", tags=["Analytics & Knowledge Decay"])

@router.get("/students/{student_id}/mastery", response_model=StudentMasteryOverview)
def get_student_mastery_overview(
    student_id: str,
    syllabus_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch aggregated student mastery metrics, stability breakdown, and concept status."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if syllabus_id:
        concepts = db.query(Concept).filter(Concept.syllabus_id == syllabus_id).order_by(Concept.order_index).all()
    else:
        demo_ids = [
            "concept-functions",
            "concept-arrays",
            "concept-recursion",
            "concept-trees",
            "concept-graphs"
        ]
        concepts = db.query(Concept).filter(Concept.id.in_(demo_ids)).all()
        id_order = {cid: idx for idx, cid in enumerate(demo_ids)}
        concepts.sort(key=lambda c: id_order.get(c.id, 99))
        if not concepts or len(concepts) < 5:
            concepts = db.query(Concept).filter(Concept.syllabus_id.is_(None)).order_by(Concept.order_index).limit(5).all()
    mastery_records = {m.concept_id: m for m in db.query(Mastery).filter(Mastery.student_id == student.id).all()}

    now = datetime.datetime.now(datetime.timezone.utc)
    items = []
    total_score = 0.0
    active_count = 0
    strong_c = 0
    stable_c = 0
    weakening_c = 0
    at_risk_c = 0

    mastery_map = {}
    for c in concepts:
        m = mastery_records.get(c.id)
        if m:
            score = m.mastery_score
            stability = m.stability
            m_dt = m.last_practiced.replace(tzinfo=datetime.timezone.utc) if m.last_practiced and m.last_practiced.tzinfo is None else m.last_practiced
            days_ago = (now - m_dt).days if m_dt else 0
            lp_str = m_dt.strftime("%b %d, %Y") if m_dt else "Never"
            mastery_map[c.id] = {"score": score, "stability": stability, "days_ago": days_ago}
        else:
            score = 0.0
            stability = "At Risk"
            days_ago = None
            lp_str = "Never"
            mastery_map[c.id] = {"score": 0.0, "stability": "At Risk", "days_ago": None}

        # Stability counter
        if stability == "Strong":
            strong_c += 1
        elif stability == "Stable":
            stable_c += 1
        elif stability == "Weakening":
            weakening_c += 1
        else:
            at_risk_c += 1

        if score > 0:
            total_score += score
            active_count += 1

    # Analyze bottlenecks
    dep_analysis = analyze_dependencies_and_bottlenecks(mastery_map)
    bottlenecks = dep_analysis["bottlenecks"]

    for c in concepts:
        m_info = mastery_map[c.id]
        prereqs = graph_service.get_prerequisites(c.id)
        downstream = graph_service.get_downstream_dependents(c.id)
        m = mastery_records.get(c.id)
        m_dt = m.last_practiced.replace(tzinfo=datetime.timezone.utc) if m and m.last_practiced and m.last_practiced.tzinfo is None else (m.last_practiced if m else None)
        lp_str = m_dt.strftime("%b %d, %Y") if m_dt else "Not practiced"

        items.append(ConceptMasteryItem(
            concept_id=c.id,
            name=c.name,
            slug=c.slug,
            unit_name=c.unit_name,
            topic_name=c.topic_name,
            order_index=c.order_index,
            mastery_score=m_info["score"],
            stability=m_info["stability"],
            last_practiced=lp_str,
            days_since_practice=m_info["days_ago"],
            prerequisites=prereqs,
            downstream_impacts=downstream,
            is_bottleneck=c.id in bottlenecks
        ))

    overall = round(total_score / active_count, 1) if active_count > 0 else 0.0

    # Fetch top recommendation
    top_rec = db.query(Recommendation).filter(
        Recommendation.student_id == student.id,
        Recommendation.priority == 1
    ).first()
    top_rec_text = top_rec.reason if top_rec else "All concepts are currently in stable standing."

    return StudentMasteryOverview(
        student_id=student.id,
        student_name=student.name,
        student_email=student.email,
        overall_mastery=overall,
        strong_count=strong_c,
        stable_count=stable_c,
        weakening_count=weakening_c,
        at_risk_count=at_risk_c,
        top_recommendation=top_rec_text,
        concepts=items
    )

@router.get("/students/{student_id}/decay", response_model=StudentDecayResponse)
def get_student_decay_analytics(
    student_id: str,
    syllabus_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Returns knowledge decay projections for ALL concepts in the student's active syllabus.
    Assessed concepts show real decay curves and history.
    Unassessed concepts are included with assessed=False and empty curves.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Determine which syllabus / concept pool to use
    active_syllabus = None
    if syllabus_id:
        concepts = db.query(Concept).filter(Concept.syllabus_id == syllabus_id).order_by(Concept.order_index).all()
        active_syllabus = db.query(Syllabus).filter(Syllabus.id == syllabus_id).first()
    else:
        demo_ids = [
            "concept-functions",
            "concept-arrays",
            "concept-recursion",
            "concept-trees",
            "concept-graphs"
        ]
        concepts = db.query(Concept).filter(Concept.id.in_(demo_ids)).all()
        id_order = {cid: idx for idx, cid in enumerate(demo_ids)}
        concepts.sort(key=lambda c: id_order.get(c.id, 99))
        if not concepts or len(concepts) < 5:
            concepts = db.query(Concept).filter(Concept.syllabus_id.is_(None)).order_by(Concept.order_index).limit(5).all()
        active_syllabus = None

    mastery_records = {m.concept_id: m for m in db.query(Mastery).filter(Mastery.student_id == student.id).all()}
    history_records = db.query(MasteryHistory).filter(MasteryHistory.student_id == student.id).order_by(MasteryHistory.recorded_at).all()

    # Group history by concept
    hist_by_concept = {}
    for h in history_records:
        if h.concept_id not in hist_by_concept:
            hist_by_concept[h.concept_id] = []
        hist_by_concept[h.concept_id].append({
            "score": h.mastery_score,
            "recorded_at": h.recorded_at.strftime("%b %d"),
            "note": h.note
        })

    now = datetime.datetime.now(datetime.timezone.utc)
    decay_details = []

    for c in concepts:
        m = mastery_records.get(c.id)
        is_assessed = m is not None and m.mastery_score > 0.0

        if is_assessed:
            m_dt = m.last_practiced.replace(tzinfo=datetime.timezone.utc) if m.last_practiced and m.last_practiced.tzinfo is None else m.last_practiced
            days_ago = (now - m_dt).days if m_dt else 0

            # Estimate peak score from history or current score
            hist_scores = [h["score"] for h in hist_by_concept.get(c.id, [])]
            peak = max(hist_scores) if hist_scores else m.mastery_score

            # Generate projection curve points
            curve_raw = generate_decay_curve_projection(peak_mastery=peak, current_days=days_ago, max_days=30, step=3)
            curve_points = [
                DecayCurvePoint(
                    day=pt["day"],
                    projected_mastery=pt["projected_mastery"],
                    actual_mastery=pt["actual_mastery"],
                    label=pt["label"]
                )
                for pt in curve_raw
            ]

            decay_details.append(ConceptDecayDetail(
                concept_id=c.id,
                concept_name=c.name,
                unit_name=c.unit_name,
                topic_name=c.topic_name,
                assessed=True,
                current_mastery=m.mastery_score,
                peak_mastery=peak,
                days_since_practice=days_ago,
                stability=m.stability,
                half_life_days=settings.DEFAULT_STABILITY_FACTOR,
                decay_curve=curve_points,
                historical_points=hist_by_concept.get(c.id, [])
            ))
        else:
            # Include unassessed concepts with empty curves
            decay_details.append(ConceptDecayDetail(
                concept_id=c.id,
                concept_name=c.name,
                unit_name=c.unit_name,
                topic_name=c.topic_name,
                assessed=False,
                current_mastery=0.0,
                peak_mastery=0.0,
                days_since_practice=0,
                stability="At Risk",
                half_life_days=settings.DEFAULT_STABILITY_FACTOR,
                decay_curve=[],
                historical_points=[]
            ))

    return StudentDecayResponse(
        student_id=student.id,
        active_syllabus_title=active_syllabus.title if active_syllabus else None,
        concepts_decay=decay_details
    )


@router.get("/students/{student_id}/report/pdf")
def download_student_progress_pdf(
    student_id: str,
    db: Session = Depends(get_db),
    current_student: Optional[Student] = Depends(get_current_student_optional)
):
    """
    Dynamically generates and downloads an authenticated student's official
    Learning Progress & Retention Modeling academic report as a valid binary PDF document.
    Enforces strict user data isolation.
    """
    verify_student_access(student_id, current_student)
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    pdf_buffer = generate_student_progress_pdf(student_id, db)
    display_name = (student.nickname or student.name).replace(" ", "_")
    filename = f"CampusInsight_Learning_Progress_Report_{display_name}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )


@router.get("/students/{student_id}/report/data")
def get_student_report_data(
    student_id: str,
    db: Session = Depends(get_db),
    current_student: Optional[Student] = Depends(get_current_student_optional)
):
    """
    Returns verified, synthesized student learning telemetry in structured JSON format.
    Enforces strict user data isolation.
    """
    verify_student_access(student_id, current_student)
    return collect_student_progress_data(student_id, db)

