import os
import json
import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from app.database import get_db
from app.models.entities import Student, Mastery, MasteryHistory, Recommendation, Concept
from app.schemas.api_schemas import DemoStageRequest
from app.config import get_data_dir
from app.services.mastery import classify_stability
from app.services.decay import estimate_knowledge_decay
from app.services.recommendation import generate_revision_recommendations

router = APIRouter(prefix="/demo", tags=["Judges Demo Controller"])

def get_demo_config() -> Dict[str, Any]:
    path = os.path.join(get_data_dir(), "demo_student.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

@router.get("/stages")
def get_available_demo_stages():
    """Return list of predefined demonstration stages for interactive judges' panel."""
    data = get_demo_config()
    st1 = data["demo_students"][0]
    stages = st1.get("demo_stages", {})
    return {
        "student_id": st1["id"],
        "student_name": st1["name"],
        "stages": [
            {
                "key": key,
                "label": val["label"],
                "description": val["description"]
            }
            for key, val in stages.items()
        ]
    }

@router.post("/set-stage")
def set_demo_stage(payload: DemoStageRequest, db: Session = Depends(get_db)):
    """
    Transitions the primary demo student to any designated demo storyboard stage:
    - stage_1_initial: Recursion at 90% (Strong)
    - stage_2_decay: 21-day gap simulated, Recursion falls to 55% (Weakening)
    - stage_3_failed_trees: Tree Traversal fails (40%), Recursion root cause flagged
    - stage_4_revised: Targeted revision completed, Recursion restored to 88%
    """
    data = get_demo_config()
    st1 = data["demo_students"][0]
    st_id = st1["id"]
    stages = st1.get("demo_stages", {})
    
    if payload.stage not in stages:
        raise HTTPException(status_code=400, detail=f"Invalid demo stage. Valid options: {list(stages.keys())}")

    stage_info = stages[payload.stage]
    mastery_dict = stage_info["mastery"]
    now = datetime.datetime.now(datetime.timezone.utc)

    mastery_map = {}
    for cid, m_info in mastery_dict.items():
        score = m_info["score"]
        days_ago = m_info.get("days_ago")
        stability = m_info.get("stability", classify_stability(score))
        
        practiced_dt = None
        if days_ago is not None:
            practiced_dt = now - datetime.timedelta(days=days_ago)

        rec = db.query(Mastery).filter(Mastery.student_id == st_id, Mastery.concept_id == cid).first()
        if rec:
            rec.mastery_score = score
            rec.stability = stability
            rec.last_practiced = practiced_dt
            rec.updated_at = now
        else:
            rec = Mastery(
                id=f"m-{st_id}-{cid}",
                student_id=st_id,
                concept_id=cid,
                mastery_score=score,
                stability=stability,
                last_practiced=practiced_dt
            )
            db.add(rec)

        peak = 90.0 if cid == "concept-recursion" else score
        mastery_map[cid] = {
            "score": score,
            "peak_score": peak,
            "days_ago": days_ago,
            "stability": stability
        }

    # Record historical audit entry for the stage switch
    h_entry = MasteryHistory(
        student_id=st_id,
        concept_id="concept-recursion",
        mastery_score=mastery_map.get("concept-recursion", {}).get("score", 55.0),
        recorded_at=now,
        note=f"Demo state transition: {stage_info['label']}"
    )
    db.add(h_entry)
    db.commit()

    # Re-evaluate recommendations
    concepts = db.query(Concept).all()
    c_meta = {c.id: {"id": c.id, "name": c.name} for c in concepts}
    new_recs = generate_revision_recommendations(st_id, mastery_map, c_meta)

    db.query(Recommendation).filter(Recommendation.student_id == st_id).delete()
    for r in new_recs:
        rec_obj = Recommendation(
            id=f"rec-{st_id}-{r['concept_id']}",
            student_id=st_id,
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

    return {
        "status": "success",
        "stage": payload.stage,
        "label": stage_info["label"],
        "description": stage_info["description"],
        "active_recommendations_count": len(new_recs)
    }

@router.post("/simulate-gap")
def simulate_time_gap(
    student_id: str = "student-demo-1",
    concept_id: str = "concept-recursion",
    days: int = 21,
    db: Session = Depends(get_db)
):
    """
    Simulates elapsed time gap without practice on a specific concept.
    Demonstrates knowledge decay in real-time with persisted audit history.
    """
    mastery_rec = db.query(Mastery).filter(
        Mastery.student_id == student_id,
        Mastery.concept_id == concept_id
    ).first()

    if not mastery_rec:
        raise HTTPException(status_code=404, detail="Mastery record not found")

    peak = max(mastery_rec.mastery_score, 90.0)
    decayed_score, stability = estimate_knowledge_decay(peak, days)
    now = datetime.datetime.now(datetime.timezone.utc)
    practiced_dt = now - datetime.timedelta(days=days)

    mastery_rec.mastery_score = decayed_score
    mastery_rec.stability = stability
    mastery_rec.last_practiced = practiced_dt
    mastery_rec.updated_at = now

    h_entry = MasteryHistory(
        student_id=student_id,
        concept_id=concept_id,
        mastery_score=decayed_score,
        recorded_at=now,
        note=f"Simulated {days}-day time gap without review"
    )
    db.add(h_entry)
    db.commit()

    return {
        "concept_id": concept_id,
        "days_elapsed": days,
        "previous_mastery": peak,
        "new_estimated_mastery": decayed_score,
        "stability": stability,
        "signal": f"Knowledge decay signal: {peak:.0f}% -> {decayed_score:.0f}% after {days} days"
    }
