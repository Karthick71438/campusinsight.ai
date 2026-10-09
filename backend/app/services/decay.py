import math
from typing import List, Dict, Any, Tuple
from app.config import settings
from app.services.mastery import classify_stability

def estimate_knowledge_decay(
    peak_mastery: float,
    days_since_practice: int,
    stability_factor: float = None
) -> Tuple[float, str]:
    """
    Computes estimated knowledge retention over elapsed days without practice.
    Uses bounded exponential decay with asymptotic retention floor:
    Retention(t) = Floor + (Peak - Floor) * exp(-t / S)
    
    Calibration:
    Peak = 90.0%, t = 21 days, S = 24.0, Floor = 30.0%
    Retention(21) = 30 + (90 - 30) * exp(-21 / 24) = 30 + 60 * 0.41686 = 55.0%
    """
    if days_since_practice <= 0 or peak_mastery <= 0.0:
        return peak_mastery, classify_stability(peak_mastery)

    s = stability_factor or settings.DEFAULT_STABILITY_FACTOR
    floor = settings.MIN_DECAY_FLOOR

    if peak_mastery <= floor:
        effective_floor = peak_mastery * 0.5
    else:
        effective_floor = floor

    decay_range = peak_mastery - effective_floor
    decay_ratio = math.exp(-float(days_since_practice) / s)
    decayed_score = effective_floor + (decay_range * decay_ratio)
    decayed_score = round(max(0.0, min(100.0, decayed_score)), 1)

    stability = classify_stability(decayed_score)
    return decayed_score, stability

def generate_decay_curve_projection(
    peak_mastery: float,
    current_days: int,
    max_days: int = 30,
    step: int = 3
) -> List[Dict[str, Any]]:
    """
    Generates time-series projection points for frontend Recharts curve.
    Returns: List of { day, projected_mastery, actual_mastery, label }
    """
    points = []
    for day in range(0, max_days + 1, step):
        proj_score, _ = estimate_knowledge_decay(peak_mastery, day)
        
        # Mark actual current day point
        actual = proj_score if (day <= current_days and abs(day - current_days) < step) else None
        
        points.append({
            "day": day,
            "projected_mastery": proj_score,
            "actual_mastery": actual,
            "label": f"Day {day}"
        })
    return points
