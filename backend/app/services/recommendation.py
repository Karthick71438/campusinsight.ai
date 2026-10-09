from typing import List, Dict, Any, Optional
from app.config import settings
from app.services.dependency import analyze_dependencies_and_bottlenecks
from app.graph_db import graph_service

def generate_revision_recommendations(
    student_id: str,
    mastery_map: Dict[str, Dict[str, Any]],
    concept_metadata: Dict[str, Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Module 4: Adaptive Revision Recommender
    Computes explainable, multi-factor priority score and classifies action into taxonomy:
    - REMEDIATE: Root-cause prerequisite bottleneck blocking downstream comprehension
    - REVIEW: Previously learned knowledge that has weakened over unpracticed intervals
    - PRACTICE: Active learning concepts currently between 50% and 70%
    - ADVANCE: Prerequisites satisfied and ready to tackle next concept
    - CHALLENGE: Strong mastery (>85%), ready for advanced/transfer questions
    """
    dep_analysis = analyze_dependencies_and_bottlenecks(mastery_map)
    bottlenecks = dep_analysis["bottlenecks"]
    
    recommendation_candidates = []

    for concept_id, m_data in mastery_map.items():
        score = m_data.get("score", 0.0)
        days_ago = m_data.get("days_ago") or 0
        stability = m_data.get("stability", "Stable")
        peak_score = m_data.get("peak_score", score)
        c_meta = concept_metadata.get(concept_id, {})
        concept_name = c_meta.get("name", concept_id.replace("concept-", "").capitalize())
        
        prereqs = graph_service.get_prerequisites(concept_id)
        prereqs_met = all(mastery_map.get(p, {}).get("score", 0.0) >= settings.THRESHOLD_STABLE for p in prereqs)
        
        # Determine if concept is eligible for recommendation
        # 1. Has prior study activity
        # 2. Or is ready to be unlocked (ADVANCE)
        is_bottleneck = concept_id in bottlenecks
        blocking_concepts = bottlenecks[concept_id]["blocking_concepts"] if is_bottleneck else []
        blocking_names = [concept_metadata.get(cid, {}).get("name", cid) for cid in blocking_concepts]

        downstream_all = graph_service.get_downstream_dependents(concept_id)
        downstream_importance = min(100.0, len(downstream_all) * 20.0 + (40.0 if is_bottleneck else 0.0))

        mastery_deficit = max(0.0, 100.0 - score)
        decay_urgency = min(100.0, (days_ago / 25.0) * 100.0) if days_ago > 0 else 0.0

        if peak_score <= 0.0 and score <= 0.0:
            if prereqs_met and len(prereqs) > 0:
                # Ready to advance!
                action_type = "ADVANCE"
                priority_score = 45.0
                headline = f"Advance to {concept_name}"
                reason = f"All prerequisites for {concept_name} are satisfied ({', '.join(concept_metadata.get(p, {}).get('name', p) for p in prereqs)}). You are ready to start this new unit."
                why_factors = [
                    f"Prerequisites satisfied: {', '.join(concept_metadata.get(p, {}).get('name', p) for p in prereqs)}",
                    "Next sequential curriculum topic unlocked"
                ]
                recommendation_candidates.append({
                    "id": f"rec-{concept_id}",
                    "concept_id": concept_id,
                    "concept_name": concept_name,
                    "priority_score": priority_score,
                    "action_type": action_type,
                    "current_mastery": score,
                    "previous_mastery": None,
                    "days_since_practice": None,
                    "stability": "At Risk",
                    "headline": headline,
                    "reason": reason,
                    "why_factors": why_factors,
                    "root_cause_concept": None,
                    "impacted_concepts": []
                })
            continue

        # Determine Action Type Taxonomy & Pedagogical Reasoning
        if is_bottleneck:
            action_type = "REMEDIATE"
            priority_score = (
                settings.WEIGHT_MASTERY_DEFICIT * mastery_deficit +
                settings.WEIGHT_DECAY_URGENCY * decay_urgency +
                settings.WEIGHT_DOWNSTREAM_IMPACT * downstream_importance + 20.0
            )
            headline = f"Revise {concept_name} first (Root Cause Remediation)."
            reason = f"{concept_name} is a critical prerequisite for {', '.join(blocking_names)}. Addressing foundational decay here will unblock downstream learning."
            why_factors = [
                f"Current estimated mastery: {score:.0f}% ({stability})",
                f"Prerequisite bottleneck for: {', '.join(blocking_names)}",
                f"Previous verified mastery was {peak_score:.0f}% (decayed after {days_ago} days)",
                "Downstream comprehension cannot stabilize without repairing this foundation"
            ]
        elif peak_score > score and (days_ago >= 14 or decay_urgency >= 50.0):
            action_type = "REVIEW"
            priority_score = (
                settings.WEIGHT_MASTERY_DEFICIT * mastery_deficit +
                settings.WEIGHT_DECAY_URGENCY * decay_urgency +
                settings.WEIGHT_DOWNSTREAM_IMPACT * downstream_importance
            )
            headline = f"Review & Refresh {concept_name}"
            reason = f"Prior peak mastery was {peak_score:.0f}%, but {days_ago} days without practice have caused retention decay to {score:.0f}%."
            why_factors = [
                f"Current estimated retention: {score:.0f}% ({stability})",
                f"Peak achieved mastery: {peak_score:.0f}%",
                f"Elapsed time since successful recall: {days_ago} days",
                "Spaced repetition revision recommended to restore high long-term stability"
            ]
        elif score < settings.THRESHOLD_STABLE:
            action_type = "PRACTICE"
            priority_score = (
                settings.WEIGHT_MASTERY_DEFICIT * mastery_deficit +
                settings.WEIGHT_DECAY_URGENCY * decay_urgency +
                settings.WEIGHT_DOWNSTREAM_IMPACT * downstream_importance
            )
            headline = f"Practice {concept_name} Exercises"
            reason = f"Current mastery is at {score:.0f}% ({stability}). Focused practice is required to reach the stable threshold (>= {settings.THRESHOLD_STABLE:.0f}%)."
            why_factors = [
                f"Current mastery: {score:.0f}% (Deficit: {mastery_deficit:.0f}%)",
                f"Target threshold for stable competency: {settings.THRESHOLD_STABLE:.0f}%"
            ]
        elif score >= settings.THRESHOLD_STRONG:
            action_type = "CHALLENGE"
            priority_score = 15.0
            headline = f"Challenge Synthesis in {concept_name}"
            reason = f"You have achieved high retention in {concept_name} ({score:.0f}%). Tackle hard problem variants and transfer questions to consolidate mastery."
            why_factors = [
                f"High mastery established: {score:.0f}% (Strong)",
                "Ready for cross-concept problem solving"
            ]
        else:
            action_type = "ADVANCE"
            priority_score = 25.0
            headline = f"Advance Forward from {concept_name}"
            reason = f"{concept_name} is stable ({score:.0f}%). Proceed to explore downstream topics."
            why_factors = [
                f"Mastery: {score:.0f}% (Stable)",
                "Prerequisites ready for advancement"
            ]

        priority_score = round(max(5.0, min(100.0, priority_score)), 1)

        recommendation_candidates.append({
            "id": f"rec-{concept_id}",
            "concept_id": concept_id,
            "concept_name": concept_name,
            "priority_score": priority_score,
            "action_type": action_type,
            "current_mastery": score,
            "previous_mastery": peak_score if peak_score > score else None,
            "days_since_practice": days_ago if days_ago > 0 else None,
            "stability": stability,
            "headline": headline,
            "reason": reason,
            "why_factors": why_factors,
            "root_cause_concept": concept_id if is_bottleneck else None,
            "impacted_concepts": blocking_names
        })

    # Sort descending by priority score
    recommendation_candidates.sort(key=lambda x: x["priority_score"], reverse=True)

    # Assign 1-based ranks
    for rank, item in enumerate(recommendation_candidates, 1):
        item["priority"] = rank

    return recommendation_candidates
