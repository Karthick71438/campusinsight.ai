import io
import re
import json
import uuid
import datetime
from typing import Dict, Any, List
from pypdf import PdfReader
from sqlalchemy.orm import Session
from app.models.entities import Syllabus, Concept, ConceptPrerequisite, Question, Mastery, Student, Subject
from app.graph_db import graph_service

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


class SyllabusParseException(Exception):
    pass


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract readable text from PDF bytes using pypdf."""
    if len(pdf_bytes) > MAX_FILE_SIZE:
        raise SyllabusParseException(f"File size exceeds limit of {MAX_FILE_SIZE // (1024*1024)}MB.")

    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        if len(reader.pages) == 0:
            raise SyllabusParseException("The uploaded PDF contains no pages.")

        extracted_text = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                extracted_text.append(text)

        full_text = "\n".join(extracted_text).strip()
        if len(full_text) < 20:
            raise SyllabusParseException(
                "Unable to extract readable text from PDF. "
                "The file may be a scanned image or empty. Please upload a text-readable PDF."
            )
        return full_text
    except SyllabusParseException:
        raise
    except Exception as e:
        raise SyllabusParseException(f"Error reading PDF file: {str(e)}")


def parse_syllabus_hierarchy(text: str, filename: str = "Syllabus.pdf") -> Dict[str, Any]:
    """
    Parses extracted syllabus text into structured hierarchy:
    Syllabus -> Units -> Topics -> Concepts -> Prerequisite Graph.
    """
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    # 1. Infer Course / Syllabus Title
    title = None
    for line in lines[:8]:
        if len(line) > 5 and not re.match(r"^(page|\d+|course code|syllabus)", line, re.IGNORECASE):
            title = line
            break
    if not title:
        title = filename.replace(".pdf", "").replace("_", " ").title()

    # 2. Extract Units / Modules
    unit_regex = re.compile(r"^(?:unit|module|chapter|part)\s*([0-9ivxlcdm]+)[:\.\-\u2013\s]+(.+)$", re.IGNORECASE)
    numbered_unit_regex = re.compile(r"^([1-9])\.\s+([A-Z][A-Za-z0-9\s,\-\u2013&]+)$")

    units_data = []
    current_unit = None
    current_topic = None

    for line in lines:
        # Ignore syllabus header lines before first unit
        if not current_unit and (line == title or "syllabus" in line.lower() or "course" in line.lower()):
            continue

        u_match = unit_regex.match(line) or numbered_unit_regex.match(line)
        if u_match:
            u_num = u_match.group(1)
            u_title = u_match.group(2).strip()
            current_unit = {
                "unit_number": int(u_num) if u_num.isdigit() else len(units_data) + 1,
                "title": f"Unit {u_num}: {u_title}",
                "topics": []
            }
            units_data.append(current_unit)
            current_topic = None
            continue

        if not current_unit:
            continue

        # Check for Topics
        topic_match = re.match(r"^(?:topic|section|\d+\.\d+)[:\.\-\s]+(.+)$", line, re.IGNORECASE)
        bullet_match = re.match(r"^[\-\*\u2022\u2013]\s*(.+)$", line)

        if topic_match:
            raw_t = topic_match.group(1).strip()
            if " - " in raw_t:
                t_parts = raw_t.split(" - ", 1)
                t_title = t_parts[0].strip()
                c_items = [c.strip() for c in re.split(r"[,;]+", t_parts[1]) if len(c.strip()) > 1]
            elif ":" in raw_t:
                t_parts = raw_t.split(":", 1)
                t_title = t_parts[0].strip()
                c_items = [c.strip() for c in re.split(r"[,;]+", t_parts[1]) if len(c.strip()) > 1]
            else:
                t_title = raw_t
                c_items = []

            current_topic = {"title": t_title, "concepts": c_items}
            current_unit["topics"].append(current_topic)
        elif bullet_match:
            item_text = bullet_match.group(1).strip()
            if not current_topic:
                current_topic = {"title": "Core Topics", "concepts": []}
                current_unit["topics"].append(current_topic)

            sub_items = [c.strip() for c in re.split(r"[,;]+", item_text) if len(c.strip()) > 2]
            current_topic["concepts"].extend(sub_items[:4])
        else:
            if len(line) < 60 and not line.endswith("."):
                if not current_topic or len(current_topic["concepts"]) >= 3:
                    current_topic = {"title": line, "concepts": []}
                    current_unit["topics"].append(current_topic)
                else:
                    current_topic["concepts"].append(line)

    # 3. Fallback normalization if units/topics are sparse
    if len(units_data) == 0:
        units_data = [
            {
                "unit_number": 1,
                "title": f"{title} - Core Foundations",
                "topics": [{"title": "Primary Concepts", "concepts": lines[:5]}]
            }
        ]

    # Ensure every unit has topics, and every topic has named concepts
    concept_counter = 1
    parsed_concepts = []

    for u in units_data:
        if not u["topics"]:
            u["topics"] = [{"title": f"{u['title']} Concepts", "concepts": []}]

        for t in u["topics"]:
            if not t["concepts"]:
                t["concepts"] = [t["title"]]

            # Normalize concepts
            clean_concepts = []
            for raw_c in t["concepts"]:
                c_name = re.sub(r"^[0-9\.\-\*\u2022\u2013\s]+", "", raw_c).strip()
                if len(c_name) < 2 or len(c_name) > 80:
                    continue
                clean_concepts.append(c_name)

            if not clean_concepts:
                clean_concepts = [t["title"]]

            t["concepts"] = clean_concepts

            for c_name in clean_concepts:
                cid = f"concept-{re.sub(r'[^a-z0-9]+', '-', c_name.lower()).strip('-')}"
                if len(cid) > 50:
                    cid = cid[:50]

                parsed_concepts.append({
                    "id": cid,
                    "name": c_name,
                    "slug": re.sub(r'[^a-z0-9]+', '-', c_name.lower()).strip('-'),
                    "unit_name": u["title"],
                    "topic_name": t["title"],
                    "order_index": concept_counter,
                    "description": f"Curriculum concept under {u['title']} / {t['title']}."
                })
                concept_counter += 1

    # Deduplicate concept list — same slug can appear across topics/units
    seen_concept_ids: set = set()
    unique_concepts = []
    for c in parsed_concepts:
        if c["id"] not in seen_concept_ids:
            seen_concept_ids.add(c["id"])
            unique_concepts.append(c)
    parsed_concepts = unique_concepts

    # 4. Generate Prerequisite Edges — chain sequentially, deduplicate pairs, skip self-links
    prerequisites_list = []
    seen_prereq_pairs: set = set()

    for i in range(1, len(parsed_concepts)):
        src = parsed_concepts[i - 1]["id"]
        tgt = parsed_concepts[i]["id"]
        if src == tgt:
            continue
        pair = (src, tgt)
        if pair in seen_prereq_pairs:
            continue
        seen_prereq_pairs.add(pair)
        prerequisites_list.append({
            "source_concept_id": src,
            "target_concept_id": tgt,
            "required_mastery": 70.0
        })

    return {
        "title": title,
        "units": units_data,
        "concepts": parsed_concepts,
        "prerequisites": prerequisites_list,
        "total_units": len(units_data),
        "total_concepts": len(parsed_concepts)
    }


def generate_default_questions_for_concept(concept_id: str, concept_name: str) -> List[Dict[str, Any]]:
    """Generates a diagnostic question battery for an extracted syllabus concept."""
    return [
        {
            "id": f"q-{concept_id}-1",
            "concept_id": concept_id,
            "question_text": f"Which of the following best defines the primary objective of {concept_name}?",
            "option_a": f"It establishes the core architectural mechanism for managing {concept_name.lower()} operations.",
            "option_b": "It replaces iterative control structures with hardware-level microcode.",
            "option_c": "It provides constant-time complexity for unbounded search queries.",
            "option_d": "It is only applicable in synchronous multithreaded systems.",
            "correct_answer": "A",
            "explanation": f"{concept_name} provides the foundational abstraction and operations essential for managing problem state in this topic.",
            "difficulty": "easy"
        },
        {
            "id": f"q-{concept_id}-2",
            "concept_id": concept_id,
            "question_text": f"When applying {concept_name} in practice, what is the most critical constraint or requirement to verify?",
            "option_a": "Ensuring all variables are declared as global singletons.",
            "option_b": "Verifying boundary conditions, valid state transitions, and prerequisite invariants.",
            "option_c": "Executing all operations inside a single unrolled loop.",
            "option_d": "Avoiding any auxiliary memory allocation.",
            "correct_answer": "B",
            "explanation": f"Proper execution of {concept_name} mandates careful verification of boundary states and invariant validation.",
            "difficulty": "medium"
        },
        {
            "id": f"q-{concept_id}-3",
            "concept_id": concept_id,
            "question_text": f"In a complex system depending on {concept_name}, what failure mode typically occurs if foundational understanding is weak?",
            "option_a": f"Downstream algorithms depending on {concept_name} will experience logical bottlenecks and cascading bugs.",
            "option_b": "The compiler will refuse to emit bytecode unconditionally.",
            "option_c": "Database indexing will automatically revert to sequential file scans.",
            "option_d": "Network throughput drops by exactly 50%.",
            "correct_answer": "A",
            "explanation": f"Because {concept_name} forms a prerequisite foundation, unaddressed gaps propagate into dependent composite topics.",
            "difficulty": "hard"
        }
    ]


def store_parsed_syllabus_for_student(
    student_id: str,
    parsed_result: Dict[str, Any],
    filename: str,
    raw_text: str,
    db: Session
) -> Syllabus:
    """
    Persists parsed syllabus, concepts, prerequisites, questions, and baseline mastery for a student.

    Key guarantees:
    - Every ConceptPrerequisite row gets a unique UUID-based ID (never collides, never overflows VARCHAR(64)).
    - Duplicate (source, target) pairs within the same upload are suppressed using seen_pairs set.
    - Pairs that already exist in the DB are skipped via a query check.
    - Self-links (source == target) are discarded.
    - On an existing concept, syllabus_id is updated so the Knowledge Graph reflects the new upload.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise SyllabusParseException("Student not found.")

    now = datetime.datetime.now(datetime.timezone.utc)
    syl_id = f"syl-{student_id[:20]}-{uuid.uuid4().hex[:8]}"

    syllabus_obj = Syllabus(
        id=syl_id,
        student_id=student.id,
        title=parsed_result["title"],
        filename=filename,
        raw_text=raw_text[:5000],
        units_json=json.dumps(parsed_result["units"]),
        created_at=now
    )
    db.add(syllabus_obj)
    db.commit()

    # Build reverse lookup: which concepts are prerequisites for each target
    prereqs_by_concept: Dict[str, List[str]] = {}
    for p in parsed_result["prerequisites"]:
        prereqs_by_concept.setdefault(p["target_concept_id"], []).append(p["source_concept_id"])

    subject = db.query(Subject).first()
    subj_id = subject.id if subject else "subj-prog"

    ontology_sync_list = []

    for c in parsed_result["concepts"]:
        existing = db.query(Concept).filter(Concept.id == c["id"]).first()
        if not existing:
            concept_obj = Concept(
                id=c["id"],
                subject_id=subj_id,
                syllabus_id=syllabus_obj.id,
                name=c["name"],
                slug=c["slug"],
                unit_name=c["unit_name"],
                topic_name=c["topic_name"],
                description=c["description"],
                order_index=c["order_index"]
            )
            db.add(concept_obj)
            db.commit()
        else:
            # Re-associate existing concept with this new upload so roadmap/graph show it
            existing.syllabus_id = syllabus_obj.id
            existing.unit_name = c["unit_name"]
            existing.topic_name = c["topic_name"]
            db.commit()

        # Generate default questions if none exist for this concept
        q_count = db.query(Question).filter(Question.concept_id == c["id"]).count()
        if q_count == 0:
            questions = generate_default_questions_for_concept(c["id"], c["name"])
            for q in questions:
                q_existing = db.query(Question).filter(Question.id == q["id"]).first()
                if not q_existing:
                    q_obj = Question(
                        id=q["id"],
                        concept_id=q["concept_id"],
                        question_text=q["question_text"],
                        option_a=q["option_a"],
                        option_b=q["option_b"],
                        option_c=q["option_c"],
                        option_d=q["option_d"],
                        correct_answer=q["correct_answer"],
                        explanation=q["explanation"],
                        difficulty=q["difficulty"]
                    )
                    db.add(q_obj)
            db.commit()

        # Seed initial Mastery entry if not present
        m_rec = db.query(Mastery).filter(
            Mastery.student_id == student.id,
            Mastery.concept_id == c["id"]
        ).first()
        if not m_rec:
            score = 65.0 if c["order_index"] == 1 else 0.0
            stability = "Weakening" if score > 0 else "At Risk"
            # Safe short ID: never exceeds VARCHAR(64)
            m_id = f"m-{student.id[:14]}-{c['id'][:20]}-{uuid.uuid4().hex[:6]}"
            m_rec = Mastery(
                id=m_id,
                student_id=student.id,
                concept_id=c["id"],
                mastery_score=score,
                stability=stability,
                last_practiced=now if score > 0 else None
            )
            db.add(m_rec)
            db.commit()

        ontology_sync_list.append({
            "id": c["id"],
            "name": c["name"],
            "slug": c["slug"],
            "subject": parsed_result["title"],
            "order_index": c["order_index"],
            "description": c["description"],
            "prerequisites": prereqs_by_concept.get(c["id"], [])
        })

    # ── Persist prerequisites ──────────────────────────────────────────────────
    # Rules:
    #   1. Skip self-references (src == tgt).
    #   2. Deduplicate within this batch using seen_pairs.
    #   3. Skip if the (source, target) pair already exists in the DB.
    #   4. Use a UUID-based ID — 23 chars, globally unique, fits VARCHAR(64) easily.
    # ──────────────────────────────────────────────────────────────────────────
    seen_pairs: set = set()
    for p in parsed_result["prerequisites"]:
        src = p["source_concept_id"]
        tgt = p["target_concept_id"]
        if src == tgt:
            continue
        pair = (src, tgt)
        if pair in seen_pairs:
            continue
        seen_pairs.add(pair)

        existing_p = db.query(ConceptPrerequisite).filter(
            ConceptPrerequisite.source_concept_id == src,
            ConceptPrerequisite.target_concept_id == tgt
        ).first()
        if existing_p:
            continue

        prereq_obj = ConceptPrerequisite(
            id=f"prereq-{uuid.uuid4().hex[:16]}",  # e.g. "prereq-4a9f2b1c3d7e8f90" — 23 chars
            source_concept_id=src,
            target_concept_id=tgt,
            required_mastery=p["required_mastery"],
            student_id=student.id
        )
        db.add(prereq_obj)

    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise SyllabusParseException(f"Database error while saving prerequisites: {str(exc)}")

    # Sync into in-memory knowledge graph service
    graph_service.sync_ontology(ontology_sync_list)

    return syllabus_obj
