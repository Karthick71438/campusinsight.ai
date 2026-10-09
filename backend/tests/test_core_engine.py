import pytest
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.mastery import calculate_mastery_update, classify_stability
from app.services.decay import estimate_knowledge_decay
from app.services.dependency import analyze_dependencies_and_bottlenecks
from app.services.recommendation import generate_revision_recommendations
from app.graph_db import graph_service

def setup_module():
    # Sync concepts into graph service
    concepts = [
        {"id": "concept-functions", "name": "Functions", "order_index": 1, "prerequisites": []},
        {"id": "concept-arrays", "name": "Arrays", "order_index": 2, "prerequisites": ["concept-functions"]},
        {"id": "concept-recursion", "name": "Recursion", "order_index": 3, "prerequisites": ["concept-arrays"]},
        {"id": "concept-trees", "name": "Trees", "order_index": 4, "prerequisites": ["concept-recursion"]},
        {"id": "concept-graphs", "name": "Graphs", "order_index": 5, "prerequisites": ["concept-trees"]}
    ]
    graph_service.sync_ontology(concepts)

def test_mastery_scoring():
    raw, new_m, delta, stability = calculate_mastery_update(correct_count=4, total_questions=5, previous_mastery=None)
    assert raw == 80.0
    assert new_m == 80.0
    assert stability == "Stable"

    # Revision blend test
    raw, revised_m, delta, stability = calculate_mastery_update(correct_count=5, total_questions=5, previous_mastery=55.0)
    assert raw == 100.0
    # 0.70 * 100 + 0.30 * 55 = 70 + 16.5 = 86.5 -> Strong
    assert revised_m >= 85.0
    assert stability == "Strong"

def test_21_day_decay():
    # Recursion starts at 90%, after 21 days should decay to ~55% (Weakening)
    decayed_score, stability = estimate_knowledge_decay(peak_mastery=90.0, days_since_practice=21)
    assert 50.0 <= decayed_score <= 60.0
    assert stability == "Weakening"

def test_root_cause_dependency_bottleneck():
    # Simulate Aiden's state: Recursion decayed (55%), Trees failed (40%)
    mastery_map = {
        "concept-functions": {"score": 92.0, "stability": "Strong", "days_ago": 4},
        "concept-arrays": {"score": 88.0, "stability": "Strong", "days_ago": 3},
        "concept-recursion": {"score": 55.0, "stability": "Weakening", "days_ago": 21},
        "concept-trees": {"score": 40.0, "stability": "At Risk", "days_ago": 1},
        "concept-graphs": {"score": 0.0, "stability": "At Risk", "days_ago": None}
    }

    result = analyze_dependencies_and_bottlenecks(mastery_map)
    bottlenecks = result["bottlenecks"]
    
    assert "concept-recursion" in bottlenecks
    assert "concept-trees" in bottlenecks["concept-recursion"]["blocking_concepts"]

def test_recommendation_prioritization():
    mastery_map = {
        "concept-functions": {"score": 92.0, "peak_score": 92.0, "days_ago": 4, "stability": "Strong"},
        "concept-arrays": {"score": 88.0, "peak_score": 88.0, "days_ago": 3, "stability": "Strong"},
        "concept-recursion": {"score": 55.0, "peak_score": 90.0, "days_ago": 21, "stability": "Weakening"},
        "concept-trees": {"score": 40.0, "peak_score": 40.0, "days_ago": 1, "stability": "At Risk"},
        "concept-graphs": {"score": 0.0, "peak_score": 0.0, "days_ago": 0, "stability": "At Risk"}
    }
    c_meta = {
        "concept-functions": {"id": "concept-functions", "name": "Functions"},
        "concept-arrays": {"id": "concept-arrays", "name": "Arrays"},
        "concept-recursion": {"id": "concept-recursion", "name": "Recursion"},
        "concept-trees": {"id": "concept-trees", "name": "Trees"},
        "concept-graphs": {"id": "concept-graphs", "name": "Graphs"}
    }

    recs = generate_revision_recommendations("test-student", mastery_map, c_meta)
    assert len(recs) > 0
    top_rec = recs[0]
    # Priority 1 must be Recursion because it's a weak bottleneck blocking Trees!
    assert top_rec["concept_id"] == "concept-recursion"
    assert top_rec["priority"] == 1
    assert "Revise Recursion first" in top_rec["headline"]
    assert any("prerequisite" in factor.lower() for factor in top_rec["why_factors"])
