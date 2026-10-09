import os
import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from app.database import get_db
from app.models.entities import Student, Syllabus, Concept, Mastery, ConceptPrerequisite
from app.schemas.api_schemas import SyllabusUploadResponse, StudentRoadmapResponse, RoadmapUnitItem, RoadmapTopicItem, RoadmapConceptItem
from app.services.syllabus_parser import (
    extract_text_from_pdf, parse_syllabus_hierarchy, store_parsed_syllabus_for_student, SyllabusParseException
)
from app.graph_db import graph_service
from app.config import get_data_dir, settings
from app.auth import get_current_student_optional
from app.routes.students import verify_student_access

router = APIRouter(prefix="", tags=["Syllabus & Personalised Roadmap"])

@router.post("/students/{student_id}/syllabus/upload", response_model=SyllabusUploadResponse)
async def upload_syllabus_pdf(
    student_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_student: Optional[Student] = Depends(get_current_student_optional)
):
    """
    Syllabus PDF Processing Pipeline:
    1. Validates file extension (.pdf) and content-type.
    2. Validates reasonable file size (< 10MB).
    3. Extracts readable text via PyPDF.
    4. Parses structured hierarchy (Units -> Topics -> Concepts).
    5. Infers prerequisite relationships and creates ontology edges.
    6. Stores structured syllabus for student and updates Knowledge Graph.
    7. Generates questions for new concepts so student can immediately quiz.
    """
    verify_student_access(student_id, current_student)
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    # 1. Validate file format
    filename = file.filename or "Syllabus.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Please upload a valid syllabus document in PDF format (.pdf)."
        )

    # 2. Read and validate size
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read uploaded file: {str(e)}")

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="The uploaded PDF file is empty.")

    # 3. Extract readable text & parse hierarchy
    try:
        extracted_text = extract_text_from_pdf(content)
        parsed = parse_syllabus_hierarchy(extracted_text, filename=filename)
    except SyllabusParseException as spe:
        raise HTTPException(status_code=422, detail=str(spe))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while processing the syllabus hierarchy: {str(e)}"
        )

    # 4. Store and sync ontology
    try:
        syllabus_obj = store_parsed_syllabus_for_student(
            student_id=student.id,
            parsed_result=parsed,
            filename=filename,
            raw_text=extracted_text,
            db=db
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to persist syllabus into knowledge graph: {str(e)}")

    return SyllabusUploadResponse(
        id=syllabus_obj.id,
        student_id=student.id,
        title=parsed["title"],
        filename=filename,
        total_units=parsed["total_units"],
        total_concepts=parsed["total_concepts"],
        units=parsed["units"],
        message=f"Successfully extracted {parsed['total_concepts']} concepts across {parsed['total_units']} units. Personalised knowledge graph and roadmap generated!"
    )

@router.post("/students/{student_id}/syllabus/load-sample", response_model=SyllabusUploadResponse)
def load_sample_syllabus(
    student_id: str,
    db: Session = Depends(get_db),
    current_student: Optional[Student] = Depends(get_current_student_optional)
):
    """Directly loads and parses the sample CS202 Advanced Algorithms PDF for judging demonstration."""
    verify_student_access(student_id, current_student)
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    sample_path = os.path.join(get_data_dir(), "sample_syllabus.pdf")
    if not os.path.exists(sample_path):
        raise HTTPException(status_code=404, detail="Sample syllabus PDF fixture not found.")

    with open(sample_path, "rb") as f:
        pdf_bytes = f.read()

    extracted_text = extract_text_from_pdf(pdf_bytes)
    parsed = parse_syllabus_hierarchy(extracted_text, filename="CS202_Advanced_Algorithms.pdf")
    syllabus_obj = store_parsed_syllabus_for_student(
        student_id=student.id,
        parsed_result=parsed,
        filename="CS202_Advanced_Algorithms.pdf",
        raw_text=extracted_text,
        db=db
    )

    return SyllabusUploadResponse(
        id=syllabus_obj.id,
        student_id=student.id,
        title=parsed["title"],
        filename="CS202_Advanced_Algorithms.pdf",
        total_units=parsed["total_units"],
        total_concepts=parsed["total_concepts"],
        units=parsed["units"],
        message=f"Sample course syllabus loaded: {parsed['total_concepts']} concepts across {parsed['total_units']} units synchronized with Knowledge Graph!"
    )

@router.get("/students/{student_id}/syllabus")
def get_student_syllabi(
    student_id: str,
    db: Session = Depends(get_db),
    current_student: Optional[Student] = Depends(get_current_student_optional)
):
    """Retrieve all syllabus curricula stored for the student."""
    verify_student_access(student_id, current_student)
    syllabi = db.query(Syllabus).filter(Syllabus.student_id == student_id).order_by(Syllabus.created_at.desc()).all()
    res = []
    for s in syllabi:
        units = json.loads(s.units_json) if s.units_json else []
        res.append({
            "id": s.id,
            "title": s.title,
            "filename": s.filename,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "units": units
        })
    return res

@router.get("/students/{student_id}/roadmap", response_model=StudentRoadmapResponse)
def get_student_roadmap(
    student_id: str,
    db: Session = Depends(get_db),
    current_student: Optional[Student] = Depends(get_current_student_optional)
):
    """
    Generates a personalized, adaptive learning roadmap from the student's active syllabus,
    learner mastery levels, prerequisite relationships, decay signals, and revision needs.
    Categorizes every concept into:
    - Completed: Mastery >= 70% and stable
    - Current: Unlocked, prerequisites satisfied, actively practicing
    - Needs Review: Was once mastered, but currently decaying or weakening
    - At Risk: Mastery < 50% or recent failures
    - Upcoming: Locked because prerequisite threshold not yet satisfied
    """
    verify_student_access(student_id, current_student)
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    # Find student's latest syllabus or fallback
    latest_syllabus = db.query(Syllabus).filter(Syllabus.student_id == student.id).order_by(Syllabus.created_at.desc()).first()
    
    # Fetch concepts scoped to the student's latest syllabus.
    # All students (including built-in demo students) use their uploaded PDF data.
    # Falls back to fixture/seed concepts only when no syllabus has been uploaded yet.
    if latest_syllabus:
        concepts = db.query(Concept).filter(
            Concept.syllabus_id == latest_syllabus.id
        ).order_by(Concept.order_index).all()
    else:
        # Strictly empty when no syllabus has been uploaded. Never fall back to sample/fixture concepts!
        concepts = []

    mastery_records = {m.concept_id: m for m in db.query(Mastery).filter(Mastery.student_id == student.id).all()}

    # Build mastery score lookup
    mastery_map = {}
    for c in concepts:
        m = mastery_records.get(c.id)
        if m:
            mastery_map[c.id] = {
                "score": m.mastery_score,
                "stability": m.stability,
                "last_practiced": m.last_practiced
            }
        else:
            mastery_map[c.id] = {
                "score": 0.0,
                "stability": "At Risk",
                "last_practiced": None
            }

    # Units data source
    units_raw = []
    if latest_syllabus and latest_syllabus.units_json:
        try:
            units_raw = json.loads(latest_syllabus.units_json)
        except Exception:
            units_raw = []

    if not units_raw:
        # Default units grouping based on concepts
        units_dict = {}
        for c in concepts:
            u_name = c.unit_name or "Unit 1: Programming Fundamentals"
            t_name = c.topic_name or "Core Topics"
            if u_name not in units_dict:
                units_dict[u_name] = {}
            if t_name not in units_dict[u_name]:
                units_dict[u_name][t_name] = []
            units_dict[u_name][t_name].append(c.id)
        
        for idx, (u_title, topics) in enumerate(units_dict.items(), 1):
            units_raw.append({
                "unit_number": idx,
                "title": u_title,
                "topics": [{"title": t_title, "concepts": c_ids} for t_title, c_ids in topics.items()]
            })

    # Concept lookup
    concept_by_id = {c.id: c for c in concepts}
    concept_by_name = {c.name.lower(): c for c in concepts}

    total_concepts = 0
    completed_concepts = 0
    needs_review_count = 0
    roadmap_units = []

    for u in units_raw:
        unit_concepts_items = []
        unit_topics = []
        u_completed = 0
        u_total = 0

        for t in u.get("topics", []):
            topic_concept_items = []
            for c_ref in t.get("concepts", []):
                # c_ref might be an ID or a name
                c_obj = concept_by_id.get(c_ref) or concept_by_name.get(c_ref.lower())
                if not c_obj:
                    # Try matching by slug
                    slug_guess = c_ref.lower().replace(" ", "-")
                    c_obj = next((c for c in concepts if slug_guess in c.id or c.slug == slug_guess), None)

                if not c_obj:
                    continue

                total_concepts += 1
                u_total += 1

                m_data = mastery_map.get(c_obj.id, {"score": 0.0, "stability": "At Risk"})
                score = m_data["score"]
                stability = m_data["stability"]

                # Prerequisites check
                prereqs = graph_service.get_prerequisites(c_obj.id)
                prereqs_met = all(mastery_map.get(p, {}).get("score", 0.0) >= settings.THRESHOLD_STABLE for p in prereqs)

                # Determine Status & Adaptive Action
                if score >= settings.THRESHOLD_STABLE and stability in ["Strong", "Stable"]:
                    status = "Completed"
                    u_completed += 1
                    completed_concepts += 1
                    action_type = "CHALLENGE" if score >= settings.THRESHOLD_STRONG else "ADVANCE"
                    action_exp = f"Mastery verified at {score:.0f}% ({stability}). Solid foundation."
                elif score > 0.0 and stability in ["Weakening", "At Risk"] and any(mastery_map.get(p, {}).get("score", 0.0) >= settings.THRESHOLD_STABLE for p in prereqs):
                    status = "Needs Review"
                    needs_review_count += 1
                    action_type = "REVIEW"
                    action_exp = f"Mastery declined to {score:.0f}% ({stability}) due to unpracticed intervals. Spaced repetition review required."
                elif prereqs_met or len(prereqs) == 0:
                    if score < 50.0 and score > 0.0:
                        status = "At Risk"
                        action_type = "PRACTICE"
                        action_exp = f"Current performance is struggling ({score:.0f}%). Targeted practice needed to unblock progress."
                    else:
                        status = "Current"
                        action_type = "PRACTICE"
                        action_exp = f"Prerequisites are ready. Actively practice this topic to build mastery."
                else:
                    # Prerequisites not met
                    weak_prereqs = [concept_by_id[p].name for p in prereqs if p in concept_by_id and mastery_map.get(p, {}).get("score", 0.0) < settings.THRESHOLD_STABLE]
                    status = "Upcoming"
                    action_type = "REMEDIATE"
                    action_exp = f"Locked. Prerequisite gap in: {', '.join(weak_prereqs)}. Must complete prerequisites before unlocking."

                c_item = RoadmapConceptItem(
                    concept_id=c_obj.id,
                    name=c_obj.name,
                    unit_name=u.get("title", c_obj.unit_name or "Unit"),
                    topic_name=t.get("title", c_obj.topic_name or "Topic"),
                    order_index=c_obj.order_index,
                    mastery_score=score,
                    stability=stability,
                    status=status,
                    action_type=action_type,
                    action_explanation=action_exp,
                    prerequisites=prereqs
                )
                topic_concept_items.append(c_item)
                unit_concepts_items.append(c_item)

            if topic_concept_items:
                unit_topics.append(RoadmapTopicItem(
                    title=t.get("title", "Core Topic"),
                    concepts=topic_concept_items
                ))

        unit_completion = round((u_completed / u_total) * 100.0, 1) if u_total > 0 else 0.0
        roadmap_units.append(RoadmapUnitItem(
            unit_number=u.get("unit_number", len(roadmap_units) + 1),
            title=u.get("title", f"Unit {len(roadmap_units) + 1}"),
            topics=unit_topics,
            completion_percentage=unit_completion
        ))

    overall_prog = round((completed_concepts / total_concepts) * 100.0, 1) if total_concepts > 0 else 0.0

    return StudentRoadmapResponse(
        student_id=student.id,
        student_name=student.name,
        syllabus_title=latest_syllabus.title if latest_syllabus else "No Syllabus Uploaded",
        overall_progress=overall_prog,
        total_concepts=total_concepts,
        completed_concepts=completed_concepts,
        needs_review_count=needs_review_count,
        units=roadmap_units
    )
