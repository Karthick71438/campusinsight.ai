"""
CampusInsight AI - Intervention & Recommendation Engine
Maps student risk evaluations to concrete, actionable faculty intervention protocols.
"""
from typing import List, Dict, Any
from app.analytics_engine.early_warning import evaluate_student_risk


def recommend_student_interventions(student_records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Evaluates students and returns prioritized list of students requiring intervention,
    along with recommended actions, trigger reasons, and status.
    """
    interventions = []

    for rec in student_records:
        risk_info = evaluate_student_risk(rec)
        
        # Only include students requiring attention (Moderate, High, Critical)
        if not risk_info["is_at_risk"]:
            continue

        risk_level = risk_info["risk_level"]
        risk_score = risk_info["risk_score"]
        att = rec.get("attendance_percentage", 100.0)
        internal = rec.get("internal_marks", 100.0)
        assign = rec.get("assignment_score", 100.0)

        # Formulate customized faculty intervention protocol
        actions = []
        if att < 75.0:
            actions.append("Issue Attendance Warning & Schedule Proctor Meeting")
        if internal < 50.0:
            actions.append("Assign to Remedial Lab Tutorial & Concept Revision")
        if assign < 60.0:
            actions.append("Extend Assignment Grace Window & Pair with TA / Peer Tutor")
        if not actions:
            actions.append("Conduct 1-on-1 Academic Check-in")

        recommended_action = "; ".join(actions)

        interventions.append({
            "student_id": risk_info["student_id"],
            "name": risk_info["name"],
            "department": risk_info["department"],
            "year": risk_info["year"],
            "section": risk_info["section"],
            "subject": rec.get("subject", "Core Course"),
            "risk_level": risk_level,
            "risk_score": risk_score,
            "attendance": att,
            "internal_marks": internal,
            "assignment_score": assign,
            "trigger_reason": risk_info["primary_trigger"],
            "recommended_action": recommended_action,
            "status": "Pending",
        })

    # Sort interventions: Critical first, then High, then Moderate
    severity_order = {"Critical": 0, "High": 1, "Moderate": 2, "Low": 3}
    interventions.sort(key=lambda x: (severity_order.get(x["risk_level"], 9), -x["risk_score"]))

    return interventions
