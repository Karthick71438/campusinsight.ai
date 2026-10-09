"""
CampusInsight AI - Insight Engine
Generates human-readable, grounded key insights and diagnostic alerts for faculty members.
"""
from typing import List, Dict, Any
from app.analytics_engine.analytics_engine import (
    calculate_cohort_kpis, calculate_subject_performance, calculate_attendance_vs_performance
)
from app.analytics_engine.early_warning import evaluate_student_risk


def generate_cohort_insights(student_records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Synthesizes actionable, evidence-grounded insights from statistical metrics.
    """
    if not student_records:
        return []

    insights = []
    kpis = calculate_cohort_kpis(student_records)
    corr_data = calculate_attendance_vs_performance(student_records)
    subject_data = calculate_subject_performance(student_records)
    risk_evals = [evaluate_student_risk(r) for r in student_records]

    # 1. Attendance Correlation Insight
    r_val = corr_data.get("correlation_coefficient", 0.0)
    if r_val > 0.6:
        insights.append({
            "type": "correlation",
            "severity": "info",
            "title": "Strong Attendance-Performance Link",
            "description": f"Statistical correlation (r = {r_val}) indicates student lecture attendance directly impacts internal test scores.",
            "recommendation": "Maintain strict early-warning attendance check-ins before internal tests."
        })
    elif r_val > 0.3:
        insights.append({
            "type": "correlation",
            "severity": "info",
            "title": "Moderate Attendance-Performance Link",
            "description": f"Moderate correlation (r = {r_val}) observed between classroom attendance and internal assessment outcomes.",
            "recommendation": "Encourage consistent attendance for practical coursework."
        })

    # 2. Critical & High Risk Student Insight
    critical_students = [r for r in risk_evals if r["risk_level"] in ["Critical", "High"]]
    if critical_students:
        pct = round((len(critical_students) / len(student_records)) * 100.0, 1)
        insights.append({
            "type": "early_warning",
            "severity": "critical" if pct > 20 else "warning",
            "title": f"{len(critical_students)} Students Require Immediate Intervention",
            "description": f"{pct}% of the cohort ({len(critical_students)} students) exhibit multi-factor risk across attendance and internal marks.",
            "recommendation": "Initiate targeted faculty mentoring and academic recovery plans."
        })

    # 3. Subject-wise Bottleneck Insight
    if subject_data:
        lowest_subject = min(subject_data, key=lambda s: s["average_internal_marks"])
        highest_risk_subject = max(subject_data, key=lambda s: s["risk_rate"])
        if lowest_subject["average_internal_marks"] < 60.0:
            insights.append({
                "type": "subject_bottleneck",
                "severity": "warning",
                "title": f"Subject Bottleneck: {lowest_subject['subject']}",
                "description": f"{lowest_subject['subject']} has the lowest average internal score ({lowest_subject['average_internal_marks']}/100) with a {lowest_subject['risk_rate']}% risk rate.",
                "recommendation": "Conduct targeted concept review and remedial problem-solving sessions."
            })

    # 4. Attendance Policy Compliance Insight
    low_att_count = sum(1 for r in student_records if r.get("attendance_percentage", 100) < 75.0)
    if low_att_count > 0:
        att_pct = round((low_att_count / len(student_records)) * 100.0, 1)
        insights.append({
            "type": "attendance_shortage",
            "severity": "warning",
            "title": "Exam Eligibility Attendance Shortage",
            "description": f"{low_att_count} students ({att_pct}%) fall below the 75% university eligibility requirement.",
            "recommendation": "Notify department proctors and issue standard attendance deficiency notices."
        })

    return insights
