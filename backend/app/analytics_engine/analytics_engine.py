"""
CampusInsight AI - Analytical Engine
Calculates Cohort KPIs, Subject-wise breakdowns, and Attendance vs Performance correlation.
"""
from typing import List, Dict, Any
import numpy as np
import pandas as pd
from app.analytics_engine.data_processing import clean_student_record
from app.analytics_engine.early_warning import evaluate_student_risk


def calculate_cohort_kpis(student_records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes overall summary KPIs across all student records in the cohort.
    """
    if not student_records:
        return {
            "total_students": 0,
            "at_risk_students": 0,
            "average_attendance": 0.0,
            "average_internal_marks": 0.0,
            "average_assignment_performance": 0.0,
            "risk_rate_percentage": 0.0,
        }

    cleaned = [clean_student_record(r) for r in student_records]
    risk_results = [evaluate_student_risk(r) for r in cleaned]

    total_students = len(cleaned)
    at_risk_count = sum(1 for r in risk_results if r["is_at_risk"])

    attendances = [r["attendance_percentage"] for r in cleaned]
    internals = [r["internal_marks"] for r in cleaned]
    assignments = [r["assignment_score"] for r in cleaned]

    avg_attendance = round(float(np.mean(attendances)), 1)
    avg_internal = round(float(np.mean(internals)), 1)
    avg_assignment = round(float(np.mean(assignments)), 1)
    risk_rate = round((at_risk_count / total_students) * 100.0, 1)

    return {
        "total_students": total_students,
        "at_risk_students": at_risk_count,
        "average_attendance": avg_attendance,
        "average_internal_marks": avg_internal,
        "average_assignment_performance": avg_assignment,
        "risk_rate_percentage": risk_rate,
    }


def calculate_subject_performance(student_records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Aggregates metrics by subject: student count, average internal marks,
    average attendance, average assignment score, and pass/risk rate.
    """
    if not student_records:
        return []

    cleaned = [clean_student_record(r) for r in student_records]
    df = pd.DataFrame(cleaned)

    subjects = df["subject"].unique()
    results = []

    for subj in sorted(subjects):
        sub_df = df[df["subject"] == subj]
        count = len(sub_df)
        avg_marks = round(float(sub_df["internal_marks"].mean()), 1)
        avg_att = round(float(sub_df["attendance_percentage"].mean()), 1)
        avg_assign = round(float(sub_df["assignment_score"].mean()), 1)
        
        # Risk rate within subject
        at_risk_sub = sum(
            1 for _, row in sub_df.iterrows()
            if evaluate_student_risk(row.to_dict())["is_at_risk"]
        )
        risk_pct = round((at_risk_sub / count) * 100.0, 1) if count > 0 else 0.0

        results.append({
            "subject": subj,
            "student_count": count,
            "average_internal_marks": avg_marks,
            "average_attendance": avg_att,
            "average_assignment_score": avg_assign,
            "at_risk_count": at_risk_sub,
            "risk_rate": risk_pct,
        })

    return results


def calculate_attendance_vs_performance(student_records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes statistical correlation and coordinates for Attendance vs Internal Marks.
    Includes Pearson correlation coefficient (r) and linear trend parameters.
    """
    if not student_records:
        return {"correlation_coefficient": 0.0, "data_points": []}

    cleaned = [clean_student_record(r) for r in student_records]
    
    x = np.array([r["attendance_percentage"] for r in cleaned], dtype=float)
    y = np.array([r["internal_marks"] for r in cleaned], dtype=float)

    # Pearson correlation coefficient
    if len(x) > 1 and np.std(x) > 0 and np.std(y) > 0:
        r_coeff = round(float(np.corrcoef(x, y)[0, 1]), 2)
    else:
        r_coeff = 0.0

    # Linear trendline: y = m*x + c
    if len(x) > 1 and np.std(x) > 0:
        slope, intercept = np.polyfit(x, y, 1)
        slope = round(float(slope), 3)
        intercept = round(float(intercept), 2)
    else:
        slope = 0.0
        intercept = 0.0

    data_points = []
    for r in cleaned:
        risk_info = evaluate_student_risk(r)
        data_points.append({
            "student_id": r["student_id"],
            "name": r["name"],
            "attendance": r["attendance_percentage"],
            "internal_marks": r["internal_marks"],
            "assignment_score": r["assignment_score"],
            "subject": r["subject"],
            "risk_level": risk_info["risk_level"],
        })

    return {
        "correlation_coefficient": r_coeff,
        "slope": slope,
        "intercept": intercept,
        "data_points": data_points,
    }
