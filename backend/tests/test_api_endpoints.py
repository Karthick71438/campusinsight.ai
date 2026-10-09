import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "graph_engine" in data

def test_get_demo_student():
    res = client.get("/api/students/student-demo-1")
    assert res.status_code == 200
    data = res.json()
    assert data["name"] in ["Aiden Vance", "Deepika"]

def test_get_mastery_overview():
    client.post("/api/demo/set-stage", json={"stage": "stage_3_failed_trees"})
    res = client.get("/api/students/student-demo-1/mastery")
    assert res.status_code == 200
    data = res.json()
    assert len(data["concepts"]) == 5
    rec_c = next(c for c in data["concepts"] if c["concept_id"] == "concept-recursion")
    assert rec_c["mastery_score"] == 55.0
    assert rec_c["stability"] == "Weakening"
    assert rec_c["is_bottleneck"] is True

def test_get_knowledge_graph():
    res = client.get("/api/students/student-demo-1/graph")
    assert res.status_code == 200
    data = res.json()
    assert len(data["nodes"]) == 5
    assert len(data["edges"]) == 4
    rec_node = next(n for n in data["nodes"] if n["id"] == "concept-recursion")
    assert rec_node["data"]["is_root_gap"] is True

def test_get_recommendations():
    res = client.get("/api/students/student-demo-1/recommendations")
    assert res.status_code == 200
    data = res.json()
    assert len(data["recommendations"]) > 0
    top = data["recommendations"][0]
    assert top["concept_id"] == "concept-recursion"
    assert top["priority"] == 1
    assert "Revise Recursion first" in top["headline"]

def test_get_questions():
    res = client.get("/api/questions/concept-recursion")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 5
    assert "question_text" in data[0]

def test_quiz_submit_revision():
    # Submit quiz answers for Recursion
    q_res = client.get("/api/questions/concept-recursion")
    questions = q_res.json()
    
    # Send answers
    submission = {
        "student_id": "student-demo-1",
        "concept_id": "concept-recursion",
        "answers": [
            {"question_id": q["id"], "selected_answer": "B"}
            for q in questions[:5]
        ]
    }
    sub_res = client.post("/api/quiz/submit", json=submission)
    assert sub_res.status_code == 200
    result = sub_res.json()
    assert "new_mastery" in result
    assert "mastery_delta" in result
