import os
import sys

# Ensure backend root is in Python sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import datetime
from sqlalchemy.orm import Session
from app.database import engine, SessionLocal, init_db
from app.models.entities import (
    Student, Subject, Concept, Question, Mastery, MasteryHistory,
    Recommendation, Syllabus, ConceptPrerequisite,
    StudentAcademicRecord, StudentAttendance, StudentEngagement, StudentIntervention
)
from app.graph_db import graph_service
from app.config import get_data_dir
from app.services.mastery import classify_stability
from app.services.recommendation import generate_revision_recommendations
from app.auth import hash_password

def load_json_file(filename: str):
    path = os.path.join(get_data_dir(), filename)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def seed_database(db: Session = None):
    """Seed relational database and knowledge graph from JSON fixtures."""
    owns_db = False
    if db is None:
        init_db()
        db = SessionLocal()
        owns_db = True

    try:
        # Check if concepts already exist
        concepts_raw = load_json_file("concepts.json")
        graph_service.sync_ontology(concepts_raw, clear_existing=True)

        # 1. Subject
        subject = Subject(
            id="subj-prog",
            name="Programming & Data Structures",
            code="CS101"
        )
        db.merge(subject)
        db.commit()

        # 2. Concepts
        for c in concepts_raw:
            concept_obj = Concept(
                id=c["id"],
                subject_id=subject.id,
                syllabus_id=None,
                name=c["name"],
                slug=c["slug"],
                unit_name=c.get("unit_name", "Unit 1: Programming Fundamentals"),
                topic_name=c.get("topic_name", "Core Concepts"),
                description=c.get("description", ""),
                order_index=c.get("order_index", 0)
            )
            db.merge(concept_obj)
        db.commit()

        # 2b. Concept Prerequisite Edges in Relational DB
        for c in concepts_raw:
            for p_id in c.get("prerequisites", []):
                prereq_rec = ConceptPrerequisite(
                    id=f"prereq-{p_id}-{c['id']}",
                    source_concept_id=p_id,
                    target_concept_id=c["id"],
                    required_mastery=c.get("required_mastery", 70.0)
                )
                db.merge(prereq_rec)
        db.commit()

        # 3. Questions
        questions_raw = load_json_file("questions.json")
        for q in questions_raw:
            q_obj = Question(
                id=q["id"],
                concept_id=q["concept_id"],
                question_text=q["question_text"],
                option_a=q["option_a"],
                option_b=q["option_b"],
                option_c=q["option_c"],
                option_d=q["option_d"],
                correct_answer=q["correct_answer"],
                explanation=q.get("explanation", ""),
                difficulty=q.get("difficulty", "medium")
            )
            db.merge(q_obj)
        db.commit()

        # 4. Demo Students
        demo_data = load_json_file("demo_student.json")
        for st_data in demo_data.get("demo_students", []):
            st_id = st_data["id"]
            student_obj = Student(
                id=st_id,
                name=st_data["name"],
                email=st_data["email"],
                password_hash=hash_password("student123"),
                role=st_data.get("role", "Student")
            )
            db.merge(student_obj)
            db.commit()

            # Seed default syllabus for student
            default_units = [
                {
                    "unit_number": 1,
                    "title": "Unit 1: Programming Fundamentals",
                    "topics": [
                        {
                            "title": "Procedural Constructs",
                            "concepts": ["concept-functions"]
                        },
                        {
                            "title": "Linear Data Structures",
                            "concepts": ["concept-arrays"]
                        }
                    ]
                },
                {
                    "unit_number": 2,
                    "title": "Unit 2: Algorithmic Paradigms",
                    "topics": [
                        {
                            "title": "Recursive Decomposition",
                            "concepts": ["concept-recursion"]
                        }
                    ]
                },
                {
                    "unit_number": 3,
                    "title": "Unit 3: Hierarchical Structures",
                    "topics": [
                        {
                            "title": "Tree Structures & Traversal",
                            "concepts": ["concept-trees"]
                        }
                    ]
                },
                {
                    "unit_number": 4,
                    "title": "Unit 4: Advanced Graph Analytics",
                    "topics": [
                        {
                            "title": "Network Topologies & Paths",
                            "concepts": ["concept-graphs"]
                        }
                    ]
                }
            ]
            syl_obj = Syllabus(
                id=f"syl-{st_id}-cs101",
                student_id=st_id,
                title="Data Structures & Algorithms Course Syllabus",
                filename="CS101_DSA_Syllabus.pdf",
                raw_text="Data Structures and Algorithms Syllabus covering Units 1 through 4: Functions, Arrays, Recursion, Trees, and Graphs.",
                units_json=json.dumps(default_units)
            )
            db.merge(syl_obj)
            db.commit()

            # Seed current stage mastery
            current_stage_key = st_data.get("current_stage", "stage_3_failed_trees")
            stages = st_data.get("demo_stages", {})
            stage_info = stages.get(current_stage_key, {})
            mastery_dict = stage_info.get("mastery", st_data.get("mastery", {}))

            # Build mastery map for recommendation calculation
            mastery_map = {}
            for cid, m_info in mastery_dict.items():
                score = m_info["score"]
                days_ago = m_info.get("days_ago")
                stability = m_info.get("stability", classify_stability(score))
                
                # Calculate practice timestamp
                practiced_dt = None
                if days_ago is not None:
                    practiced_dt = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days_ago)

                mastery_rec = Mastery(
                    id=f"m-{st_id}-{cid}",
                    student_id=st_id,
                    concept_id=cid,
                    mastery_score=score,
                    stability=stability,
                    last_practiced=practiced_dt
                )
                db.merge(mastery_rec)

                peak = 90.0 if cid == "concept-recursion" else score
                mastery_map[cid] = {
                    "score": score,
                    "peak_score": peak,
                    "days_ago": days_ago,
                    "stability": stability
                }

            db.commit()

            # Seed history samples
            for h in st_data.get("history_samples", []):
                h_rec = MasteryHistory(
                    student_id=st_id,
                    concept_id=h["concept_id"],
                    mastery_score=h["mastery"],
                    note=h.get("event", "Snapshot")
                )
                db.add(h_rec)
            db.commit()

            # Generate initial explainable recommendations
            c_meta = {c["id"]: c for c in concepts_raw}
            recs = generate_revision_recommendations(st_id, mastery_map, c_meta)
            for r in recs:
                rec_obj = Recommendation(
                    id=f"rec-{st_id}-{r['concept_id']}",
                    student_id=st_id,
                    concept_id=r["concept_id"],
                    priority=r["priority"],
                    priority_score=r["priority_score"],
                    action_type=r.get("action_type", "PRACTICE"),
                    reason=r["reason"],
                    root_cause_concept_id=r.get("root_cause_concept"),
                    impacted_concept_id=r["impacted_concepts"][0] if r.get("impacted_concepts") else None
                )
                db.merge(rec_obj)
            db.commit()

        # 5. CampusInsight AI Cohort Records
        try:
            campus_data = load_json_file("campus_students.json")
            for cs in campus_data:
                s_id = f"student-{cs['student_id'].lower()}"
                st_obj = Student(
                    id=s_id,
                    student_id=cs["student_id"],
                    name=cs["name"],
                    email=f"{cs['student_id'].lower()}@campusinsight.edu",
                    password_hash=hash_password("campus123"),
                    department=cs.get("department", "Computer Science"),
                    year=cs.get("year", 3),
                    section=cs.get("section", "A"),
                    role="Student"
                )
                db.merge(st_obj)

                # Academic Record
                acad = StudentAcademicRecord(
                    id=f"acad-{cs['student_id']}",
                    student_id=s_id,
                    subject=cs.get("subject", "Data Structures & Algorithms"),
                    semester=cs.get("semester", 5),
                    internal_marks=float(cs.get("internal_marks", 65.0)),
                    assignment_score=float(cs.get("assignment_score", 70.0)),
                    previous_performance=float(cs.get("previous_performance", 7.5))
                )
                db.merge(acad)

                # Attendance Record
                att = StudentAttendance(
                    id=f"att-{cs['student_id']}",
                    student_id=s_id,
                    attendance_percentage=float(cs.get("attendance_percentage", 75.0)),
                    total_classes=60,
                    classes_attended=int(60 * (float(cs.get("attendance_percentage", 75.0)) / 100.0))
                )
                db.merge(att)

                # Engagement Record
                eng = StudentEngagement(
                    id=f"eng-{cs['student_id']}",
                    student_id=s_id,
                    engagement_score=float(cs.get("engagement_score", 65.0)),
                    portal_logins=int(cs.get("engagement_score", 65.0) / 5),
                    assignment_submissions_rate=float(cs.get("assignment_score", 70.0))
                )
                db.merge(eng)

            db.commit()
            print("CampusInsight AI cohort records successfully seeded!")
        except Exception as e:
            print(f"Notice: Campus records seeding skipped or fixture missing: {e}")

        print("Database and Knowledge Graph successfully initialized!")
    finally:
        if owns_db:
            db.close()

if __name__ == "__main__":
    seed_database()
