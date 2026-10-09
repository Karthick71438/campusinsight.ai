from typing import Tuple, Dict, Any, List, Optional
from app.config import settings

def classify_stability(score: float) -> str:
    """
    Categorizes mastery score into clear stability states:
    >= 85.0 -> Strong
    70.0 - 84.9 -> Stable
    50.0 - 69.9 -> Weakening
    < 50.0 -> At Risk
    """
    if score >= settings.THRESHOLD_STRONG:
        return "Strong"
    elif score >= settings.THRESHOLD_STABLE:
        return "Stable"
    elif score >= settings.THRESHOLD_WEAKENING:
        return "Weakening"
    else:
        return "At Risk"

def calculate_mastery_update(
    correct_count: int,
    total_questions: int,
    previous_mastery: float = None,
    difficulty_items: List[Tuple[bool, str]] = None,
    recent_attempts_count: int = 1
) -> Tuple[float, float, float, str]:
    """
    Calculates weighted quiz score and updated mastery.
    Grounded in cognitive load & item difficulty weighting:
    - easy: weight 1.0
    - medium: weight 1.5
    - hard: weight 2.5
    
    Anti-Gaming & Anti-False-Mastery Rules:
    - If hard questions are failed, score is capped at 75% (prevents false Strong status).
    - Repeated retries blend with prior history using Bayesian weight (alpha).
    """
    if total_questions <= 0:
        raw_score = 0.0
    elif difficulty_items and len(difficulty_items) > 0:
        weights = {"easy": 1.0, "medium": 1.5, "hard": 2.5}
        total_possible = 0.0
        earned = 0.0
        has_hard = False
        hard_correct = False

        for is_corr, diff in difficulty_items:
            d = (diff or "medium").lower()
            w = weights.get(d, 1.5)
            total_possible += w
            if is_corr:
                earned += w
            if d == "hard":
                has_hard = True
                if is_corr:
                    hard_correct = True

        raw_score = round((earned / total_possible) * 100.0, 1) if total_possible > 0 else 0.0
        
        # Anti-false mastery ceiling: failing hard transfer questions prevents "Strong" classification
        if has_hard and not hard_correct and raw_score > 75.0:
            raw_score = 75.0
    else:
        raw_score = round((correct_count / total_questions) * 100.0, 1)

    if previous_mastery is None or previous_mastery <= 0.0:
        new_mastery = raw_score
    else:
        # Weighted revision blend: 70% on recent performance, 30% on historical stability
        alpha = 0.70
        new_mastery = round(alpha * raw_score + (1.0 - alpha) * previous_mastery, 1)

    new_mastery = max(0.0, min(100.0, new_mastery))
    delta = round(new_mastery - (previous_mastery if previous_mastery is not None else 0.0), 1)
    stability = classify_stability(new_mastery)

    return raw_score, new_mastery, delta, stability
