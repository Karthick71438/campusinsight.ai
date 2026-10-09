import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.analytics_engine.data_processing import clean_student_record, normalize_features
from app.analytics_engine.early_warning import evaluate_student_risk
from app.analytics_engine.analytics_engine import (
    calculate_cohort_kpis, calculate_subject_performance, calculate_attendance_vs_performance
)
from app.analytics_engine.insight_engine import generate_cohort_insights
from app.analytics_engine.intervention_engine import recommend_student_interventions

client = TestClient(app)


def test_campus_data_processing():
    raw = {
        "student_id": "CS101",
        "name": "Test Student",
        "attendance_percentage": "82.5",
        "internal_marks": 75,
        "assignment_score": 80,
        "previous_performance": 8.5,
        "engagement_score": 90,
    }
    cleaned = clean_student_record(raw)
    assert cleaned["student_id"] == "CS101"
    assert cleaned["attendance_percentage"] == 82.5
    assert cleaned["year"] == 3  # default filled
    
    norm = normalize_features(cleaned)
    assert norm["norm_attendance"] == pytest.approx(0.825)
    assert norm["norm_internal"] == pytest.approx(0.75)


def test_campus_early_warning_detection():
    # At-risk student with poor attendance and low internal marks
    struggling = {
        "student_id": "CS999",
        "name": "Struggling Student",
        "attendance_percentage": 50.0,
        "internal_marks": 35.0,
        "assignment_score": 45.0,
        "engagement_score": 30.0,
        "previous_performance": 6.0,
    }
    risk_info = evaluate_student_risk(struggling)
    assert risk_info["is_at_risk"] is True
    assert risk_info["risk_level"] in ["Critical", "High"]
    assert len(risk_info["reasons"]) > 0

    # Strong student
    strong = {
        "student_id": "CS100",
        "name": "Strong Student",
        "attendance_percentage": 95.0,
        "internal_marks": 92.0,
        "assignment_score": 95.0,
        "engagement_score": 90.0,
        "previous_performance": 9.0,
    }
    strong_risk = evaluate_student_risk(strong)
    assert strong_risk["is_at_risk"] is False
    assert strong_risk["risk_level"] == "Low"


def test_campus_analytics_engine():
    cohort = [
        {
            "student_id": "S1", "name": "S1", "subject": "DSA",
            "attendance_percentage": 90.0, "internal_marks": 85.0, "assignment_score": 90.0, "previous_performance": 8.0, "engagement_score": 80.0
        },
        {
            "student_id": "S2", "name": "S2", "subject": "DSA",
            "attendance_percentage": 55.0, "internal_marks": 40.0, "assignment_score": 50.0, "previous_performance": 6.0, "engagement_score": 40.0
        }
    ]
    kpis = calculate_cohort_kpis(cohort)
    assert kpis["total_students"] == 2
    assert kpis["at_risk_students"] == 1
    assert kpis["average_attendance"] == pytest.approx(72.5)
    assert kpis["average_internal_marks"] == pytest.approx(62.5)

    corr = calculate_attendance_vs_performance(cohort)
    assert "correlation_coefficient" in corr
    assert len(corr["data_points"]) == 2

    subj = calculate_subject_performance(cohort)
    assert len(subj) == 1
    assert subj[0]["subject"] == "DSA"


def test_campus_api_endpoints():
    # 1. Health & Root checks
    root_res = client.get("/")
    assert root_res.status_code == 200
    assert "CampusInsight" in root_res.json()["message"]

    health_res = client.get("/api/health")
    assert health_res.status_code == 200
    assert health_res.json()["app"] == "CampusInsight AI"

    # 2. Campus KPIs endpoint
    kpi_res = client.get("/api/campus/kpis")
    assert kpi_res.status_code == 200
    kpis = kpi_res.json()
    assert kpis["total_students"] >= 5
    assert "at_risk_students" in kpis
    assert "average_attendance" in kpis
    assert "average_internal_marks" in kpis
    assert "average_assignment_performance" in kpis

    # 3. Campus Students endpoint
    stud_res = client.get("/api/campus/students")
    assert stud_res.status_code == 200
    students = stud_res.json()
    assert len(students) >= 5
    assert "risk_score" in students[0]
    assert "risk_level" in students[0]

    # 4. Subject Performance endpoint
    subj_res = client.get("/api/campus/subject-performance")
    assert subj_res.status_code == 200
    subjs = subj_res.json()
    assert len(subjs) > 0
    assert "average_internal_marks" in subjs[0]

    # 5. Attendance vs Performance scatter endpoint
    att_res = client.get("/api/campus/attendance-vs-performance")
    assert att_res.status_code == 200
    att_data = att_res.json()
    assert "correlation_coefficient" in att_data
    assert len(att_data["data_points"]) >= 5

    # 6. Faculty Insights endpoint
    ins_res = client.get("/api/campus/insights")
    assert ins_res.status_code == 200
    insights = ins_res.json()
    assert len(insights) > 0
    assert "title" in insights[0]

    # 7. Interventions queue endpoint
    interv_res = client.get("/api/campus/interventions")
    assert interv_res.status_code == 200
    intervs = interv_res.json()
    assert len(intervs) > 0
    assert "recommended_action" in intervs[0]


def test_campus_pdf_report_generation():
    """Verify that CampusInsight AI PDF generation returns valid binary PDF with student name."""
    res = client.get("/api/students/student-demo-1/report/pdf")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert "CampusInsight_Learning_Progress_Report_Deepika.pdf" in res.headers.get("content-disposition", "")
    assert res.content.startswith(b"%PDF")
    assert len(res.content) > 3000


def test_quiz_study_material_workflow():
    """Verify upload, topic extraction, and non-repeating question generation."""
    # 1. Load sample study material
    sample_res = client.post("/api/quiz/load-sample-material")
    assert sample_res.status_code == 200
    data = sample_res.json()
    assert "material_id" in data
    assert len(data["topics"]) > 0

    topic = data["topics"][0]
    topic_name = topic["name"]

    # 2. Generate Set 1
    set1_res = client.post("/api/quiz/generate-from-material", json={
        "material_id": data["material_id"],
        "topic_id": topic["id"],
        "topic_name": topic_name,
        "student_id": "student-demo-1",
        "set_number": 1,
        "mode": "initial",
        "seen_hashes": []
    })
    assert set1_res.status_code == 200
    set1_data = set1_res.json()
    assert set1_data["has_more"] is True
    assert len(set1_data["questions"]) == 5
    hashes1 = [q["hash"] for q in set1_data["questions"]]

    # 3. Generate Set 2 (must not repeat Set 1 questions)
    set2_res = client.post("/api/quiz/generate-from-material", json={
        "material_id": data["material_id"],
        "topic_id": topic["id"],
        "topic_name": topic_name,
        "student_id": "student-demo-1",
        "set_number": 2,
        "mode": "new_set",
        "seen_hashes": hashes1
    })
    assert set2_res.status_code == 200
    set2_data = set2_res.json()
    assert set2_data["has_more"] is True
    assert len(set2_data["questions"]) == 5
    hashes2 = [q["hash"] for q in set2_data["questions"]]

    # Verify zero question overlap between Set 1 and Set 2
    overlap = set(hashes1).intersection(set(hashes2))
    assert len(overlap) == 0
