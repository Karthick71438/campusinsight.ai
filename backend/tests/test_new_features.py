import os
import sys
import io

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db
from app.seed import seed_database
from app.config import get_data_dir

client = TestClient(app)

def setup_module():
    init_db()
    seed_database()

import uuid
import datetime

def test_auth_register_and_login():
    email = f"test_{uuid.uuid4().hex[:6]}@university.edu"
    password = "secretpassword123"
    
    # Register
    reg_res = client.post("/api/auth/register", json={
        "name": "Sarah Connor",
        "email": email,
        "password": password,
        "role": "Computer Engineering"
    })
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    assert "token" in reg_data
    assert reg_data["student"]["name"] == "Sarah Connor"
    token = reg_data["token"]
    student_id = reg_data["student"]["id"]

    # Verify /me endpoint with token
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["id"] == student_id

    # Test login
    login_res = client.post("/api/auth/login", json={
        "email": email,
        "password": password
    })
    assert login_res.status_code == 200
    assert "token" in login_res.json()

def test_syllabus_load_sample_and_roadmap():
    student_id = "student-demo-1"
    
    # Load sample syllabus
    res = client.post(f"/api/students/{student_id}/syllabus/load-sample")
    assert res.status_code == 200
    data = res.json()
    assert data["total_units"] >= 3
    assert data["total_concepts"] >= 5

    # Check generated roadmap
    road_res = client.get(f"/api/students/{student_id}/roadmap")
    assert road_res.status_code == 200
    roadmap = road_res.json()
    assert "units" in roadmap
    assert len(roadmap["units"]) >= 3
    assert "overall_progress" in roadmap
    
    # Verify concepts have status and action taxonomy
    first_unit = roadmap["units"][0]
    assert len(first_unit["topics"]) > 0
    first_concept = first_unit["topics"][0]["concepts"][0]
    assert first_concept["status"] in ["Completed", "Current", "Upcoming", "Needs Review", "At Risk"]
    assert first_concept["action_type"] in ["ADVANCE", "PRACTICE", "REVIEW", "REMEDIATE", "CHALLENGE"]

def test_weak_reverse_path_analysis():
    student_id = "student-demo-1"
    client.post("/api/demo/set-stage", json={"stage": "stage_3_failed_trees"})
    
    # Request weak path for Trees (which failed due to decayed Recursion)
    res = client.get(f"/api/students/{student_id}/weak-path/concept-trees")
    assert res.status_code == 200
    data = res.json()
    assert data["concept_id"] == "concept-trees"
    assert data["is_bottleneck"] is True
    assert data["root_cause_concept"] is not None
    assert data["root_cause_concept"]["id"] == "concept-recursion"
    assert len(data["reverse_path"]) >= 2
    assert any("Root Cause" in node["role"] for node in data["reverse_path"])
    assert data["recommended_action"]["action"] == "REMEDIATE"
    assert data["recommended_action"]["target_concept_id"] == "concept-recursion"

def test_data_privacy_deletion():
    import time
    user_email = f"privacy_test_{int(time.time()*1000)}@university.edu"
    reg_res = client.post("/api/auth/register", json={
        "name": "Privacy Test User",
        "email": user_email,
        "password": "Password123!",
        "role": "Student"
    })
    assert reg_res.status_code == 200
    temp_id = reg_res.json()["student"]["id"]
    token = reg_res.json()["token"]

    del_res = client.delete(f"/api/students/{temp_id}/data", headers={"Authorization": f"Bearer {token}"})
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "success"

def test_anti_false_mastery_rule():
    from app.services.mastery import calculate_mastery_update
    # Student answers only easy questions correctly (2 easy correct), fails hard question
    diff_items = [(True, "easy"), (True, "easy"), (False, "hard")]
    raw, new_m, delta, stab = calculate_mastery_update(
        correct_count=2,
        total_questions=3,
        previous_mastery=50.0,
        difficulty_items=diff_items
    )
    # Even though 2/3 is 66.7%, raw score cannot jump directly to Strong (>85%)
    assert new_m < 85.0
    assert stab != "Strong"

def test_task_completion_and_knowledge_sync():
    # 1. Register a dedicated test user
    email = f"task_user_{int(datetime.datetime.now().timestamp())}@test.com"
    reg_res = client.post("/api/auth/register", json={
        "name": "Task Sync Tester",
        "email": email,
        "password": "Password123!",
        "role": "Student"
    })
    assert reg_res.status_code == 200
    user_id = reg_res.json()["student"]["id"]
    token = reg_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Check initial state - baseline mastery for new registered student is 70.0%
    m_init = client.get(f"/api/students/{user_id}/mastery", headers=headers).json()
    init_overall = m_init["overall_mastery"]
    assert init_overall == 70.0
    assert m_init["strong_count"] == 1  # Functions

    # 3. Mark uncompleted task (concept-trees) completed
    comp_res = client.post(
        f"/api/students/{user_id}/concepts/concept-trees/toggle-complete",
        json={"completed": True, "score": 92.0},
        headers=headers
    )
    assert comp_res.status_code == 200
    comp_data = comp_res.json()
    assert comp_data["completed"] is True
    assert comp_data["mastery_score"] == 92.0
    assert comp_data["stability"] == "Strong"

    # 4. Verify Knowledge Graph node is updated immediately
    g_res_raw = client.get(f"/api/students/{user_id}/graph", headers=headers)
    assert g_res_raw.status_code == 200
    g_res = g_res_raw.json()
    trees_node = next((n for n in g_res["nodes"] if n["id"] == "concept-trees"), None)
    assert trees_node is not None
    assert trees_node["data"]["mastery_score"] == 92.0
    assert trees_node["data"]["stability"] == "Strong"

    # 5. Verify Mastery Overview reflects updated overall mastery and strong count
    m_updated = client.get(f"/api/students/{user_id}/mastery", headers=headers).json()
    assert m_updated["overall_mastery"] > init_overall
    assert m_updated["strong_count"] >= 2  # Functions + Trees

    # 6. Mark task incomplete again
    incomp_res = client.post(
        f"/api/students/{user_id}/concepts/concept-trees/toggle-complete",
        json={"completed": False},
        headers=headers
    )
    assert incomp_res.status_code == 200
    assert incomp_res.json()["completed"] is False
    assert incomp_res.json()["mastery_score"] == 0.0
    assert incomp_res.json()["stability"] == "At Risk"

    # 7. Verify Knowledge Graph node reflects the reset
    g_reset = client.get(f"/api/students/{user_id}/graph", headers=headers).json()
    trees_node_reset = next((n for n in g_reset["nodes"] if n["id"] == "concept-trees"), None)
    assert trees_node_reset["data"]["mastery_score"] == 0.0
    assert trees_node_reset["data"]["stability"] == "At Risk"

    # 8. Verify data persistence across fresh requests
    m_reset = client.get(f"/api/students/{user_id}/mastery", headers=headers).json()
    assert m_reset["overall_mastery"] == init_overall

def test_doubt_ai_chatbot_endpoint():
    # 1. Ask question with active topic context on primary /api/ai/chat endpoint
    chat_payload = {
        "message": "Give me a code example",
        "student_id": "student-demo-1",
        "active_topic": "Functions",
        "conversation_history": []
    }
    
    res = client.post("/api/ai/chat", json=chat_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "reply" in data
    assert len(data["reply"]) > 20
    assert "Functions" in data.get("topic", "") or "def " in data["reply"]
    assert len(data.get("suggested_prompts", [])) > 0

    # 2. Multi-turn follow-up with conversation history
    multi_turn_payload = {
        "message": "Give me a practice question for this topic",
        "student_id": "student-demo-1",
        "active_topic": "Functions",
        "conversation_history": [
            {"role": "user", "content": "What is a function?"},
            {"role": "assistant", "content": data["reply"]}
        ]
    }
    follow_up_res = client.post("/api/ai/chat", json=multi_turn_payload)
    assert follow_up_res.status_code == 200
    follow_data = follow_up_res.json()
    assert follow_data["success"] is True
    assert "Question" in follow_data["reply"] or "Practice" in follow_data["reply"] or "function" in follow_data["reply"].lower()

    # 3. Empty message validation
    empty_res = client.post("/api/ai/chat", json={"message": "   "})
    assert empty_res.status_code == 400

    # 4. Backward compatible /api/chat/doubt endpoint test
    legacy_payload = {
        "messages": [
            {"role": "user", "content": "Explain recursion simply"}
        ],
        "context": {
            "concept_name": "Recursion"
        }
    }
    legacy_res = client.post("/api/chat/doubt", json=legacy_payload)
    assert legacy_res.status_code == 200
    assert len(legacy_res.json()["reply"]) > 20


def test_download_learning_progress_report_pdf():
    # 1. Test data endpoint for demo student
    data_res = client.get("/api/students/student-demo-1/report/data")
    assert data_res.status_code == 200
    data = data_res.json()
    assert data["student"]["name"] in ["Aiden Vance", "Deepika"]
    assert "metrics" in data
    assert "decay_analysis" in data
    assert "curriculum" in data
    assert "prerequisites" in data

    # 2. Test PDF download endpoint for demo student
    pdf_res = client.get("/api/students/student-demo-1/report/pdf")
    assert pdf_res.status_code == 200
    disp = pdf_res.headers.get("content-disposition", "")
    assert "Aiden_Vance" in disp or "Deepika" in disp
    assert pdf_res.content.startswith(b"%PDF")
    assert len(pdf_res.content) > 3000

    # 3. Test user data isolation with registered student
    import time
    user_email = f"report_test_{int(time.time())}@university.edu"
    reg = client.post("/api/auth/register", json={
        "name": "Report Tester",
        "email": user_email,
        "password": "Password123!",
        "role": "Computer Science Undergraduate",
        "nickname": "RepTest"
    })
    assert reg.status_code == 200
    user_id = reg.json()["student"]["id"]
    token = reg.json()["token"]

    user_pdf = client.get(
        f"/api/students/{user_id}/report/pdf",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert user_pdf.status_code == 200
    assert user_pdf.content.startswith(b"%PDF")
    assert "RepTest" in user_pdf.headers.get("content-disposition", "")


def test_quiz_retake_and_practice_another_set():
    import time
    student_id = f"test-student-quiz-{int(time.time())}"
    concept_id = "concept-functions"

    # 1. Initial set (Set A)
    res_a = client.get(f"/api/questions/{concept_id}?student_id={student_id}&mode=initial")
    assert res_a.status_code == 200
    set_a = res_a.json()
    assert len(set_a) >= 3
    set_a_ids = [q["id"] for q in set_a]
    set_a_quiz_id = set_a[0].get("quiz_set_id")
    assert set_a_quiz_id is not None

    # Submit answers for Set A
    sub_a = client.post("/api/quiz/submit", json={
        "student_id": "student-demo-1",
        "concept_id": concept_id,
        "answers": [{"question_id": qid, "selected_answer": "B"} for qid in set_a_ids],
        "quiz_set_id": set_a_quiz_id
    })
    assert sub_a.status_code == 200

    # 2. Retake Set A: Must return the EXACT same questions in the exact same order
    res_retake = client.get(
        f"/api/questions/{concept_id}?student_id={student_id}&mode=retake&quiz_set_id={set_a_quiz_id}"
    )
    assert res_retake.status_code == 200
    set_retake = res_retake.json()
    set_retake_ids = [q["id"] for q in set_retake]
    assert set_retake_ids == set_a_ids, "Retake must return the exact same questions and order as Set A"

    # 3. Practice Another Set: Must return a NEW set (Set B) with no overlapping questions
    res_b = client.get(f"/api/questions/{concept_id}?student_id={student_id}&mode=new_set")
    assert res_b.status_code == 200
    set_b = res_b.json()
    assert len(set_b) >= 3
    set_b_ids = [q["id"] for q in set_b]
    set_b_quiz_id = set_b[0].get("quiz_set_id")

    # Verify no question in Set B appeared in Set A
    overlap = set(set_a_ids).intersection(set(set_b_ids))
    assert len(overlap) == 0, f"Practice Another Set must not repeat questions from Set A. Overlap: {overlap}"
    assert set_b_quiz_id != set_a_quiz_id, "New practice set must have a distinct quiz_set_id"

    # 4. Retake Set B: Must return the EXACT same questions as Set B
    res_retake_b = client.get(
        f"/api/questions/{concept_id}?student_id={student_id}&mode=retake&quiz_set_id={set_b_quiz_id}"
    )
    assert res_retake_b.status_code == 200
    set_retake_b = res_retake_b.json()
    set_retake_b_ids = [q["id"] for q in set_retake_b]
    assert set_retake_b_ids == set_b_ids, "Retake on Set B must return the exact same questions as Set B"

    # 5. Practice Another Set again (Set C): Must not repeat questions from Set A or Set B
    res_c = client.get(f"/api/questions/{concept_id}?student_id={student_id}&mode=new_set")
    assert res_c.status_code == 200
    set_c = res_c.json()
    assert len(set_c) >= 3
    set_c_ids = [q["id"] for q in set_c]

    overlap_c_a = set(set_a_ids).intersection(set(set_c_ids))
    overlap_c_b = set(set_b_ids).intersection(set(set_c_ids))
    assert len(overlap_c_a) == 0, f"Set C must not overlap with Set A. Overlap: {overlap_c_a}"
    assert len(overlap_c_b) == 0, f"Set C must not overlap with Set B. Overlap: {overlap_c_b}"




