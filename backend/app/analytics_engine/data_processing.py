"""
CampusInsight AI - Data Processing Pipeline
Handles Validation, Cleaning, Normalization, and Feature Preparation for student academic signals.
"""
from typing import Dict, Any, List, Optional
import numpy as np


def clamp(val: float, min_val: float = 0.0, max_val: float = 100.0) -> float:
    """Clamp a numerical value within bounds."""
    try:
        f = float(val)
        if np.isnan(f):
            return min_val
        return max(min_val, min(max_val, f))
    except (TypeError, ValueError):
        return min_val


def clean_student_record(raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate, sanitize, and fill defaults for raw student input signals.
    Ensures bounded float values and clean string representations.
    """
    return {
        "student_id": str(raw.get("student_id") or raw.get("id") or "UNKNOWN").strip(),
        "name": str(raw.get("name") or "Unnamed Student").strip(),
        "department": str(raw.get("department") or "Computer Science").strip(),
        "year": int(raw.get("year") or 3),
        "section": str(raw.get("section") or "A").strip(),
        "subject": str(raw.get("subject") or "Data Structures").strip(),
        "semester": int(raw.get("semester") or 5),
        "attendance_percentage": clamp(raw.get("attendance_percentage", 75.0)),
        "internal_marks": clamp(raw.get("internal_marks", 65.0)),
        "assignment_score": clamp(raw.get("assignment_score", 70.0)),
        "previous_performance": clamp(raw.get("previous_performance", 7.0 if raw.get("previous_performance", 7.0) > 10 else raw.get("previous_performance", 7.0) * 10)),
        "engagement_score": clamp(raw.get("engagement_score", 65.0)),
    }


def normalize_features(record: Dict[str, Any]) -> Dict[str, float]:
    """
    Normalizes multi-modal signals into a unified [0.0, 1.0] feature vector
    ready for downstream analytical scoring and future ML models.
    """
    # Convert previous CGPA (assumed 10-point scale if <= 10) to percentage scale first
    prev = record.get("previous_performance", 70.0)
    if prev <= 10.0:
        prev_pct = prev * 10.0
    else:
        prev_pct = prev

    return {
        "norm_attendance": clamp(record.get("attendance_percentage", 0.0)) / 100.0,
        "norm_internal": clamp(record.get("internal_marks", 0.0)) / 100.0,
        "norm_assignment": clamp(record.get("assignment_score", 0.0)) / 100.0,
        "norm_previous": clamp(prev_pct) / 100.0,
        "norm_engagement": clamp(record.get("engagement_score", 0.0)) / 100.0,
    }
