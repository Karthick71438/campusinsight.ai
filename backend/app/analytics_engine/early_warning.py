"""
CampusInsight AI - Early-Warning Detection Module
Transparent, statistics-grounded rule engine for detecting student risk and intervention triggers.
Evaluates attendance deficit, internal test struggle, assignment backlog, and engagement decline.
"""
from typing import Dict, Any, List, Tuple
from app.analytics_engine.data_processing import clean_student_record, normalize_features


def evaluate_student_risk(record: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes a composite multi-signal risk index (0 - 100) and identifies trigger reasons.
    
    Risk Weights:
    - Attendance deficit (< 75% threshold): 35%
    - Internal marks deficit (< 50% threshold): 30%
    - Assignment backlog (< 60% threshold): 20%
    - Low engagement (< 50% threshold): 15%
    
    Risk Levels:
    - Critical: Risk Score >= 70
    - High: Risk Score >= 50
    - Moderate: Risk Score >= 30
    - Low: Risk Score < 30
    """
    clean = clean_student_record(record)
    features = normalize_features(clean)

    att = clean["attendance_percentage"]
    internal = clean["internal_marks"]
    assign = clean["assignment_score"]
    eng = clean["engagement_score"]
    prev = clean["previous_performance"]

    trigger_reasons = []

    # 1. Attendance penalty (Strict university threshold: 75%)
    att_risk = 0.0
    if att < 75.0:
        att_gap = (75.0 - att) / 75.0  # 0 to 1
        att_risk = min(1.0, att_gap * 1.5)
        if att < 65.0:
            trigger_reasons.append(f"Severe attendance deficit ({att:.1f}% vs 75% minimum required)")
        else:
            trigger_reasons.append(f"Borderline attendance shortage ({att:.1f}%)")

    # 2. Internal marks penalty (< 50% passing target)
    internal_risk = 0.0
    if internal < 50.0:
        internal_gap = (50.0 - internal) / 50.0
        internal_risk = min(1.0, internal_gap * 1.4)
        trigger_reasons.append(f"Internal assessment failure risk ({internal:.1f}/100)")
    elif internal < 60.0:
        internal_risk = 0.25
        trigger_reasons.append(f"Borderline internal marks ({internal:.1f}/100)")

    # 3. Assignment score penalty (< 60% threshold)
    assign_risk = 0.0
    if assign < 60.0:
        assign_gap = (60.0 - assign) / 60.0
        assign_risk = min(1.0, assign_gap * 1.2)
        trigger_reasons.append(f"Incomplete assignment submissions ({assign:.1f}%)")

    # 4. Engagement score penalty (< 50% threshold)
    eng_risk = 0.0
    if eng < 50.0:
        eng_gap = (50.0 - eng) / 50.0
        eng_risk = min(1.0, eng_gap * 1.2)
        trigger_reasons.append(f"Disengaged activity on learning portal ({eng:.1f}/100)")

    # 5. Performance drop vs previous performance
    # If student previously had 80% but now internal is 45%, flag momentum drop
    if prev > 70.0 and internal < 55.0:
        trigger_reasons.append(f"Sharp performance divergence from previous baseline ({prev:.1f}% -> {internal:.1f}%)")

    # Weighted composite risk score (0 to 100 scale)
    composite_risk_score = (
        (att_risk * 0.35) +
        (internal_risk * 0.30) +
        (assign_risk * 0.20) +
        (eng_risk * 0.15)
    ) * 100.0

    # Ensure risk score is clamped
    composite_risk_score = round(max(0.0, min(100.0, composite_risk_score)), 1)

    # Categorize Risk Level
    if composite_risk_score >= 70.0 or (att < 60.0 and internal < 45.0):
        risk_level = "Critical"
    elif composite_risk_score >= 50.0:
        risk_level = "High"
    elif composite_risk_score >= 30.0:
        risk_level = "Moderate"
    else:
        risk_level = "Low"

    is_at_risk = risk_level in ["Critical", "High", "Moderate"]

    if not trigger_reasons:
        trigger_reasons.append("Academic signals are stable and on track")

    return {
        "student_id": clean["student_id"],
        "name": clean["name"],
        "department": clean["department"],
        "year": clean["year"],
        "section": clean["section"],
        "risk_score": composite_risk_score,
        "risk_level": risk_level,
        "is_at_risk": is_at_risk,
        "reasons": trigger_reasons,
        "primary_trigger": trigger_reasons[0],
    }
