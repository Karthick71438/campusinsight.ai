from typing import Dict, List, Any, Optional
from app.graph_db import graph_service
from app.config import settings

def analyze_dependencies_and_bottlenecks(
    student_mastery_map: Dict[str, Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Module 3: Dependency Impact Engine
    Traverses the prerequisite knowledge graph.
    Identifies:
    1. Weak concepts (score < THRESHOLD_STABLE or struggling attempts)
    2. Prerequisites for each struggling concept
    3. Prerequisite bottlenecks (a prerequisite that is weak and blocking downstream learning)
    4. Downstream affected cascade (concepts whose foundation is compromised)
    """
    bottlenecks: Dict[str, Dict[str, Any]] = {}
    downstream_impact_map: Dict[str, List[str]] = {}
    root_cause_pairs: List[Dict[str, Any]] = []

    # Iterate through all concepts in the mastery map
    for concept_id, m_data in student_mastery_map.items():
        score = m_data.get("score", 0.0)
        
        # Check prerequisites for this concept
        prereqs = graph_service.get_prerequisites(concept_id)
        
        # If this downstream concept is struggling (< THRESHOLD_STABLE)
        if score < settings.THRESHOLD_STABLE:
            for prereq_id in prereqs:
                prereq_data = student_mastery_map.get(prereq_id, {})
                prereq_score = prereq_data.get("score", 0.0)
                
                # Check if the prerequisite itself is also weak (< THRESHOLD_STABLE)
                if prereq_score < settings.THRESHOLD_STABLE:
                    # Found a root-cause prerequisite gap!
                    root_cause_pairs.append({
                        "struggling_concept": concept_id,
                        "struggling_concept_score": score,
                        "root_cause_prereq": prereq_id,
                        "root_cause_prereq_score": prereq_score,
                        "relationship": f"{prereq_id} is a prerequisite for {concept_id}"
                    })
                    
                    if prereq_id not in bottlenecks:
                        all_downstream = graph_service.get_downstream_dependents(prereq_id)
                        bottlenecks[prereq_id] = {
                            "concept_id": prereq_id,
                            "mastery_score": prereq_score,
                            "stability": prereq_data.get("stability", "Weakening"),
                            "blocking_concepts": [concept_id],
                            "all_downstream_dependents": all_downstream
                        }
                    else:
                        if concept_id not in bottlenecks[prereq_id]["blocking_concepts"]:
                            bottlenecks[prereq_id]["blocking_concepts"].append(concept_id)

    # Compute downstream impact counts
    for c_id in student_mastery_map.keys():
        downstream = graph_service.get_downstream_dependents(c_id)
        downstream_impact_map[c_id] = downstream

    return {
        "bottlenecks": bottlenecks,
        "root_cause_pairs": root_cause_pairs,
        "downstream_impact_map": downstream_impact_map
    }
