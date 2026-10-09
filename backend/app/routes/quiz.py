import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import hashlib
from app.database import get_db
from app.models.entities import Question, QuizAttempt, Mastery, MasteryHistory, Concept, Student, Recommendation
from app.schemas.api_schemas import QuestionOption, QuizSubmitRequest, QuizSubmitResponse, QuestionFeedback
from app.services.mastery import calculate_mastery_update, classify_stability
from app.services.recommendation import generate_revision_recommendations
from app.services.syllabus_parser import (
    generate_default_questions_for_concept,
    extract_text_from_pdf,
    parse_syllabus_hierarchy,
)
from app.auth import get_current_student_optional
from app.routes.students import verify_student_access
from app.graph_db import graph_service

import json
import uuid
import re

router = APIRouter(prefix="", tags=["Quiz & Diagnostic Assessment"])

@router.get("/questions/{concept_id}", response_model=List[QuestionOption])
def get_questions_by_concept(
    concept_id: str,
    student_id: Optional[str] = None,
    mode: Optional[str] = "initial",  # "initial", "retake", "new_set"
    quiz_set_id: Optional[str] = None,
    limit: int = 5,
    db: Session = Depends(get_db)
):
    """Fetch quiz questions for a given concept.
    Supports:
    - mode='retake': loads the exact same quiz set (same questions, same order).
    - mode='new_set': generates/selects an entirely different set of questions for this topic,
      guaranteeing no repetition of previously seen questions by this student.
    - mode='initial': loads the active set for this student or initializes Set 1.
    """
    from app.models.entities import QuizSet
    from app.services.question_generator import generate_and_persist_new_questions_for_concept

    concept = db.query(Concept).filter(Concept.id == concept_id).first()
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found")

    all_concept_questions = db.query(Question).filter(Question.concept_id == concept_id).all()

    if not all_concept_questions:
        generated = generate_default_questions_for_concept(concept.id, concept.name)
        for q_data in generated:
            existing = db.query(Question).filter(Question.id == q_data["id"]).first()
            if not existing:
                q_obj = Question(
                    id=q_data["id"],
                    concept_id=q_data["concept_id"],
                    question_text=q_data["question_text"],
                    option_a=q_data["option_a"],
                    option_b=q_data["option_b"],
                    option_c=q_data["option_c"],
                    option_d=q_data["option_d"],
                    correct_answer=q_data["correct_answer"],
                    explanation=q_data["explanation"],
                    difficulty=q_data["difficulty"]
                )
                db.add(q_obj)
        db.commit()
        all_concept_questions = db.query(Question).filter(Question.concept_id == concept_id).all()

    # If no student_id provided (e.g. general test / unauthenticated), return baseline questions
    if not student_id:
        return [
            QuestionOption(
                id=q.id,
                question_text=q.question_text,
                option_a=q.option_a,
                option_b=q.option_b,
                option_c=q.option_c,
                option_d=q.option_d,
                difficulty=q.difficulty,
                concept_id=q.concept_id,
                quiz_set_id="qset-default",
                set_number=1
            )
            for q in all_concept_questions[:limit]
        ]

    # --- RETAKE MODE ---
    if mode == "retake":
        target_set = None
        if quiz_set_id:
            target_set = db.query(QuizSet).filter(
                QuizSet.id == quiz_set_id,
                QuizSet.student_id == student_id,
                QuizSet.concept_id == concept_id
            ).first()

        if not target_set:
            # Fallback to the latest QuizSet for this student and concept
            target_set = db.query(QuizSet).filter(
                QuizSet.student_id == student_id,
                QuizSet.concept_id == concept_id
            ).order_by(QuizSet.created_at.desc()).first()

        if target_set and target_set.question_ids_json:
            try:
                target_qids = json.loads(target_set.question_ids_json)
                q_map = {q.id: q for q in db.query(Question).filter(Question.id.in_(target_qids)).all()}
                ordered_questions = [q_map[qid] for qid in target_qids if qid in q_map]
                if ordered_questions:
                    return [
                        QuestionOption(
                            id=q.id,
                            question_text=q.question_text,
                            option_a=q.option_a,
                            option_b=q.option_b,
                            option_c=q.option_c,
                            option_d=q.option_d,
                            difficulty=q.difficulty,
                            concept_id=q.concept_id,
                            quiz_set_id=target_set.id,
                            set_number=target_set.set_number
                        )
                        for q in ordered_questions
                    ]
            except Exception as e:
                print(f"[QuizRoute] Retake parse error: {e}")

    # Determine all questions previously attempted or assigned in quiz sets for this student + topic
    attempted_qids = {
        row[0] for row in db.query(QuizAttempt.question_id)
        .filter(QuizAttempt.student_id == student_id, QuizAttempt.concept_id == concept_id)
        .all()
    }
    recorded_sets = db.query(QuizSet).filter(
        QuizSet.student_id == student_id,
        QuizSet.concept_id == concept_id
    ).all()
    set_qids = set()
    for s in recorded_sets:
        if s.question_ids_json:
            try:
                set_qids.update(json.loads(s.question_ids_json))
            except Exception:
                pass

    seen_qids = attempted_qids.union(set_qids)

    # --- PRACTICE ANOTHER SET MODE ---
    if mode == "new_set":
        unused_questions = db.query(Question).filter(
            Question.concept_id == concept_id,
            ~Question.id.in_(seen_qids)
        ).all()

        target_count = min(limit, 5)
        selected_questions = list(unused_questions)

        if len(selected_questions) < target_count:
            needed = target_count - len(selected_questions)
            all_known_texts = [q.question_text for q in db.query(Question).filter(Question.concept_id == concept_id).all()]
            next_set_num = len(recorded_sets) + 1
            fresh_questions = generate_and_persist_new_questions_for_concept(
                concept_id=concept.id,
                concept_name=concept.name,
                used_question_texts=all_known_texts,
                count=needed,
                set_number=next_set_num,
                db=db
            )
            selected_questions.extend(fresh_questions)

        selected_questions = selected_questions[:target_count]

        new_set_num = len(recorded_sets) + 1
        new_set_id = f"qset-{concept_id}-{uuid.uuid4().hex[:8]}"
        new_quiz_set = QuizSet(
            id=new_set_id,
            student_id=student_id,
            concept_id=concept_id,
            question_ids_json=json.dumps([q.id for q in selected_questions]),
            set_number=new_set_num,
            created_at=datetime.datetime.utcnow()
        )
        db.add(new_quiz_set)
        db.commit()

        return [
            QuestionOption(
                id=q.id,
                question_text=q.question_text,
                option_a=q.option_a,
                option_b=q.option_b,
                option_c=q.option_c,
                option_d=q.option_d,
                difficulty=q.difficulty,
                concept_id=q.concept_id,
                quiz_set_id=new_set_id,
                set_number=new_set_num
            )
            for q in selected_questions
        ]

    # --- INITIAL MODE ---
    latest_set = db.query(QuizSet).filter(
        QuizSet.student_id == student_id,
        QuizSet.concept_id == concept_id
    ).order_by(QuizSet.created_at.desc()).first()

    if latest_set and latest_set.question_ids_json:
        try:
            q_ids = json.loads(latest_set.question_ids_json)
            q_map = {q.id: q for q in db.query(Question).filter(Question.id.in_(q_ids)).all()}
            ordered_questions = [q_map[qid] for qid in q_ids if qid in q_map]
            if len(ordered_questions) >= 3:
                return [
                    QuestionOption(
                        id=q.id,
                        question_text=q.question_text,
                        option_a=q.option_a,
                        option_b=q.option_b,
                        option_c=q.option_c,
                        option_d=q.option_d,
                        difficulty=q.difficulty,
                        concept_id=q.concept_id,
                        quiz_set_id=latest_set.id,
                        set_number=latest_set.set_number
                    )
                    for q in ordered_questions
                ]
        except Exception:
            pass

    selected_questions = all_concept_questions[:limit]
    set_1_id = f"qset-{concept_id}-{uuid.uuid4().hex[:8]}"
    set_1 = QuizSet(
        id=set_1_id,
        student_id=student_id,
        concept_id=concept_id,
        question_ids_json=json.dumps([q.id for q in selected_questions]),
        set_number=1,
        created_at=datetime.datetime.utcnow()
    )
    db.add(set_1)
    db.commit()

    return [
        QuestionOption(
            id=q.id,
            question_text=q.question_text,
            option_a=q.option_a,
            option_b=q.option_b,
            option_c=q.option_c,
            option_d=q.option_d,
            difficulty=q.difficulty,
            concept_id=q.concept_id,
            quiz_set_id=set_1_id,
            set_number=1
        )
        for q in selected_questions
    ]

@router.post("/quiz/submit", response_model=QuizSubmitResponse)
def submit_quiz(
    payload: QuizSubmitRequest,
    db: Session = Depends(get_db),
    current_student: Optional[Student] = Depends(get_current_student_optional)
):
    """
    Submits student quiz answers, calculates transparent score with item difficulty weighting,
    updates concept mastery & stability, triggers dependency check,
    and updates explainable revision queue.
    """
    verify_student_access(payload.student_id, current_student)
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    concept = db.query(Concept).filter(Concept.id == payload.concept_id).first()
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found")

    if not payload.answers:
        raise HTTPException(status_code=400, detail="No answers provided in submission")

    # Evaluate answers
    question_ids = [a.question_id for a in payload.answers]
    questions = {q.id: q for q in db.query(Question).filter(Question.id.in_(question_ids)).all()}
    
    correct_count = 0
    total_questions = len(payload.answers)
    feedback_items = []
    diff_items = []
    now = datetime.datetime.now(datetime.timezone.utc)

    for ans in payload.answers:
        q = questions.get(ans.question_id)
        if not q:
            continue
            
        is_corr = (ans.selected_answer.strip().upper() == q.correct_answer.strip().upper())
        if is_corr:
            correct_count += 1
            
        diff_items.append((is_corr, q.difficulty or "medium"))
        # Use per-answer confidence if provided, otherwise fall back to top-level payload confidence
        conf = getattr(ans, "confidence", None) or payload.confidence or "medium"

        # Log attempt
        attempt = QuizAttempt(
            student_id=student.id,
            concept_id=concept.id,
            question_id=q.id,
            quiz_set_id=payload.quiz_set_id,
            selected_answer=ans.selected_answer.upper(),
            is_correct=is_corr,
            confidence=conf,
            created_at=now
        )
        db.add(attempt)
        
        feedback_items.append(QuestionFeedback(
            question_id=q.id,
            question_text=q.question_text,
            selected_answer=ans.selected_answer.upper(),
            correct_answer=q.correct_answer,
            is_correct=is_corr,
            confidence=conf,
            explanation=q.explanation
        ))

    # Fetch previous mastery
    existing_mastery = db.query(Mastery).filter(
        Mastery.student_id == student.id,
        Mastery.concept_id == concept.id
    ).first()
    
    prev_score = existing_mastery.mastery_score if existing_mastery else None

    # Calculate mastery update with difficulty weighting
    raw_score, new_mastery, delta, stability = calculate_mastery_update(
        correct_count=correct_count,
        total_questions=total_questions,
        previous_mastery=prev_score,
        difficulty_items=diff_items
    )

    # Persist mastery
    if existing_mastery:
        existing_mastery.mastery_score = new_mastery
        existing_mastery.stability = stability
        existing_mastery.last_practiced = now
        existing_mastery.updated_at = now
    else:
        new_rec = Mastery(
            id=f"m-{student.id}-{concept.id}",
            student_id=student.id,
            concept_id=concept.id,
            mastery_score=new_mastery,
            stability=stability,
            last_practiced=now
        )
        db.add(new_rec)

    # Record history point
    history_entry = MasteryHistory(
        student_id=student.id,
        concept_id=concept.id,
        mastery_score=new_mastery,
        recorded_at=now,
        note=f"Quiz completed: {correct_count}/{total_questions} ({raw_score}%)"
    )
    db.add(history_entry)
    db.commit()

    # Recompute student recommendations across all concepts
    all_mastery = db.query(Mastery).filter(Mastery.student_id == student.id).all()
    mastery_map = {}
    for m in all_mastery:
        m_dt = m.last_practiced.replace(tzinfo=datetime.timezone.utc) if m.last_practiced and m.last_practiced.tzinfo is None else m.last_practiced
        days_ago = (now - m_dt).days if m_dt else 0
        mastery_map[m.concept_id] = {
            "score": m.mastery_score,
            "peak_score": m.mastery_score,
            "days_ago": days_ago,
            "stability": m.stability
        }

    all_concepts = db.query(Concept).all()
    c_meta = {c.id: {"id": c.id, "name": c.name} for c in all_concepts}
    updated_recs = generate_revision_recommendations(student.id, mastery_map, c_meta)

    # Refresh recommendations in DB
    db.query(Recommendation).filter(Recommendation.student_id == student.id).delete()
    for r in updated_recs:
        rec_obj = Recommendation(
            id=f"rec-{student.id}-{r['concept_id']}",
            student_id=student.id,
            concept_id=r["concept_id"],
            priority=r["priority"],
            priority_score=r["priority_score"],
            action_type=r.get("action_type", "PRACTICE"),
            reason=r["reason"],
            root_cause_concept_id=r.get("root_cause_concept"),
            impacted_concept_id=r["impacted_concepts"][0] if r.get("impacted_concepts") else None
        )
        db.add(rec_obj)
    db.commit()

    # Prerequisite warning if struggling
    prereq_alert = None
    if new_mastery < 70.0:
        prereqs = graph_service.get_prerequisites(concept.id)
        weak_prereqs = []
        for p in prereqs:
            p_score = mastery_map.get(p, {}).get("score", 0.0)
            if p_score < 70.0:
                p_name = c_meta.get(p, {}).get("name", p)
                weak_prereqs.append(f"{p_name} ({p_score:.0f}%)")
        if weak_prereqs:
            prereq_alert = f"Performance alert: Weak prerequisite foundation detected in {', '.join(weak_prereqs)}. Strengthening prerequisite concepts first is recommended."

    feedback_summary = (
        f"You scored {correct_count} of {total_questions} ({raw_score:.0f}%). "
        f"Concept retention is now estimated at {new_mastery:.0f}% ({stability})."
    )

    from app.models.entities import QuizSet
    set_num = 1
    if payload.quiz_set_id:
        qs_rec = db.query(QuizSet).filter(QuizSet.id == payload.quiz_set_id).first()
        if qs_rec:
            set_num = qs_rec.set_number

    return QuizSubmitResponse(
        concept_id=concept.id,
        concept_name=concept.name,
        score=raw_score,
        total_questions=total_questions,
        correct_count=correct_count,
        previous_mastery=prev_score if prev_score is not None else raw_score,
        new_mastery=new_mastery,
        mastery_delta=delta,
        stability=stability,
        feedback_summary=feedback_summary,
        prerequisite_alert=prereq_alert,
        questions_feedback=feedback_items,
        quiz_set_id=payload.quiz_set_id,
        set_number=set_num
    )


# ---------------------------------------------------------------------------
# Quiz Study Material: Upload, Topic Detection & Non-Repeating Generation
# ---------------------------------------------------------------------------
QUIZ_MATERIALS_STORE: Dict[str, Dict[str, Any]] = {}

class GenerateFromMaterialRequest(BaseModel):
    material_id: Optional[str] = None
    topic_id: Optional[str] = None
    topic_name: Optional[str] = None
    topic_ids: Optional[List[str]] = []
    topic_names: Optional[List[str]] = []
    student_id: Optional[str] = "student-demo-1"
    set_number: int = 1
    mode: str = "initial"  # "initial", "new_set", "retake"
    seen_hashes: List[str] = []


TOPIC_QUESTION_BANKS = {
    "Variables": [
        # Set 1
        {"text": "What is the primary purpose of a variable in programming?", "a": "A named storage location in memory to hold data values", "b": "A hardware register inside the GPU", "c": "A permanent disk file", "d": "A compiler syntax rule", "ans": "A", "exp": "Variables serve as labeled memory locations that hold values that can be referenced and manipulated in a program.", "diff": "easy"},
        {"text": "Which naming rule is enforced in Python for identifiers/variable names?", "a": "Must not begin with a digit", "b": "Must be written entirely in uppercase", "c": "Can include hyphens and dollar signs", "d": "Must be fewer than 5 characters", "ans": "A", "exp": "In Python, variable names cannot start with a digit, and can only contain letters, digits, and underscores.", "diff": "easy"},
        {"text": "What does dynamic typing mean in Python variable assignment?", "a": "The type of a variable is determined at runtime based on the assigned value", "b": "Variables must have explicit type declarations like int x", "c": "Variables can never change their values", "d": "Variables only exist inside loops", "ans": "A", "exp": "Python is dynamically typed: variables do not require declaration and can refer to values of different types over time.", "diff": "easy"},
        {"text": "In Python, what is the result of the multiple assignment x, y = 10, 20?", "a": "x is assigned 10 and y is assigned 20", "b": "Both x and y are assigned 10", "c": "SyntaxError", "d": "A tuple (10, 20) is created and neither variable is set", "ans": "A", "exp": "Python unpacks the right-hand tuple into variables on the left-hand side.", "diff": "medium"},
        {"text": "What is variable shadowing in nested lexical scopes?", "a": "An inner scope variable declares the same identifier as an outer scope variable, hiding it", "b": "A variable that shares memory with the operating system kernel", "c": "Deleting a global variable", "d": "Assigning None to all variables", "ans": "A", "exp": "Variable shadowing occurs when an inner scope identifier obscures an outer scope variable with identical name.", "diff": "medium"},
        # Set 2
        {"text": "What keyword allows modifying a module-level global variable from inside a function?", "a": "global", "b": "nonlocal", "c": "extern", "d": "public", "ans": "A", "exp": "The 'global' keyword binds a local variable name to the module-level global namespace.", "diff": "easy"},
        {"text": "What does the 'nonlocal' keyword achieve in Python?", "a": "Binds a variable to the nearest enclosing non-global scope", "b": "Makes a variable accessible across network sockets", "c": "Stores the variable on disk", "d": "Declares an immutable constant", "ans": "A", "exp": "'nonlocal' causes the identifier to refer to previously bound variables in the nearest enclosing scope excluding globals.", "diff": "medium"},
        {"text": "Which of the following is an invalid Python variable name?", "a": "2nd_value", "b": "_temp_counter", "c": "userScore", "d": "total_sum_12", "ans": "A", "exp": "Identifiers cannot start with a number (2nd_value triggers SyntaxError).", "diff": "easy"},
        {"text": "In Python, what happens when you write 'a = b = c = 0'?", "a": "All three variables reference the same integer object 0", "b": "Only c is initialized", "c": "A syntax error is thrown", "d": "a is 0, but b and c are undefined", "ans": "A", "exp": "Chained assignment assigns the evaluation of the rightmost expression to each left-hand target sequentially.", "diff": "medium"},
        {"text": "What does the id() function in Python reveal about a variable?", "a": "Its unique identity / memory address of the referenced object", "b": "Its data type name", "c": "The number of references pointing to it", "d": "Its scope depth", "ans": "A", "exp": "id() returns the identity of an object, guaranteed to be unique and constant for this object during its lifetime.", "diff": "medium"},
        # Set 3
        {"text": "What is the convention for naming constants in Python according to PEP 8?", "a": "ALL_CAPS with underscores (e.g., MAX_CONNECTIONS)", "b": "camelCase starting with lowercase", "c": "Prefix with double dollar signs", "d": "PascalCase", "ans": "A", "exp": "PEP 8 specifies uppercase with underscores for constants at module level.", "diff": "easy"},
        {"text": "When a variable is assigned a new value in Python, what happens to the previously referenced object if no other references exist?", "a": "It becomes eligible for automatic garbage collection", "b": "It remains permanently in RAM", "c": "It causes a memory leak crash", "d": "It writes to swap space", "ans": "A", "exp": "Python uses reference counting and cyclic GC to reclaim unreachable memory automatically.", "diff": "medium"},
        {"text": "What does the del statement do to a variable in Python (e.g., del x)?", "a": "Unbinds the name 'x' from the namespace", "b": "Zeroes out the memory contents immediately", "c": "Raises a runtime exception", "d": "Converts 'x' to None", "ans": "A", "exp": "del removes the binding of that name from the local or global namespace.", "diff": "medium"},
        {"text": "Can variables hold references to functions and classes as first-class citizens in Python?", "a": "Yes, functions and classes can be assigned to variables and passed as arguments", "b": "No, only primitive types can be assigned", "c": "Only functions, not classes", "d": "Only when declared with pointers", "ans": "A", "exp": "In Python, functions and classes are first-class objects and can be assigned to variables.", "diff": "medium"},
        {"text": "What happens if you reference a local variable before assigning to it inside a function?", "a": "UnboundLocalError", "b": "It defaults to None", "c": "It falls back to 0", "d": "It prints a warning and continues", "ans": "A", "exp": "Referencing a local variable before assignment triggers an UnboundLocalError.", "diff": "hard"}
    ],
    "Data Types": [
        # Set 1
        {"text": "Which Python built-in type represents arbitrary-precision integers?", "a": "int", "b": "long", "c": "BigInt", "d": "int64", "ans": "A", "exp": "Python 3 unified integer types into 'int', which supports arbitrary precision integers.", "diff": "easy"},
        {"text": "Which of the following built-in data types in Python is IMMUTABLE?", "a": "tuple", "b": "list", "c": "dict", "d": "set", "ans": "A", "exp": "Tuples, strings, numbers, and frozensets are immutable; their values cannot be changed after creation.", "diff": "easy"},
        {"text": "What is the return type of the expression 7 / 2 in Python 3?", "a": "float (3.5)", "b": "int (3)", "c": "complex", "d": "decimal", "ans": "A", "exp": "Single slash / performs true float division in Python 3, returning 3.5.", "diff": "easy"},
        {"text": "Which function converts a string representation of a number '42' into an integer?", "a": "int('42')", "b": "parse('42')", "c": "to_int('42')", "d": "Integer.parseInt('42')", "ans": "A", "exp": "The int() constructor converts compatible numbers or numeric strings into integers.", "diff": "easy"},
        {"text": "What does bool(0) and bool('') evaluate to in Python?", "a": "False and False", "b": "True and True", "c": "False and True", "d": "True and False", "ans": "A", "exp": "In Python, 0 and empty collections/strings are falsy.", "diff": "easy"},
        # Set 2
        {"text": "What is the result of type(None) in Python?", "a": "<class 'NoneType'>", "b": "<class 'null'>", "c": "<class 'void'>", "d": "<class 'undefined'>", "ans": "A", "exp": "None is the sole instance of the NoneType class in Python.", "diff": "medium"},
        {"text": "Which operator performs floor (integer) division in Python?", "a": "//", "b": "/", "c": "%", "d": "**", "ans": "A", "exp": "// is the floor division operator, discarding any fractional remainder.", "diff": "easy"},
        {"text": "What is a characteristic of Python's 'float' data type?", "a": "Implemented as IEEE 754 double-precision (64-bit) floating-point numbers", "b": "Fixed 8-bit precision", "c": "Exact decimal representation with no round-off error", "d": "Only stores positive fractions", "ans": "A", "exp": "Standard Python floats correspond to C doubles (64-bit IEEE 754).", "diff": "medium"},
        {"text": "Which module provides exact arbitrary-precision decimal floating-point arithmetic?", "a": "decimal", "b": "math", "c": "fractions", "d": "precision", "ans": "A", "exp": "The decimal module provides the Decimal type for exact fixed-point and floating-point arithmetic.", "diff": "medium"},
        {"text": "What is the output of isinstance(True, int) in Python?", "a": "True (bool is a subclass of int)", "b": "False", "c": "TypeError", "d": "None", "ans": "A", "exp": "In Python, bool is an explicit subclass of int, where True == 1 and False == 0.", "diff": "medium"},
        # Set 3
        {"text": "Which collection type ensures all contained elements are strictly UNIQUE?", "a": "set", "b": "list", "c": "tuple", "d": "dict_values", "ans": "A", "exp": "A set is an unordered collection of distinct hashable elements.", "diff": "easy"},
        {"text": "What built-in type represents an immutable array of bytes?", "a": "bytes", "b": "bytearray", "c": "memoryview", "d": "buffer", "ans": "A", "exp": "bytes is immutable, whereas bytearray is its mutable counterpart.", "diff": "medium"},
        {"text": "Why cannot a list be used as a key in a Python dictionary?", "a": "Lists are mutable and therefore unhashable", "b": "Lists are too slow", "c": "Lists can only hold numbers", "d": "Python disallows sequence keys", "ans": "A", "exp": "Dictionary keys must be hashable. Mutable objects like lists do not have stable hash codes.", "diff": "medium"},
        {"text": "What is the result of 0.1 + 0.2 == 0.3 in standard IEEE 754 floating point?", "a": "False (due to binary floating-point rounding representation)", "b": "True", "c": "SyntaxError", "d": "RuntimeError", "ans": "A", "exp": "0.1 and 0.2 cannot be represented precisely in base-2 floating point, producing 0.30000000000000004.", "diff": "hard"},
        {"text": "Which data type in Python represents complex numbers natively?", "a": "complex (e.g., 3 + 4j)", "b": "imaginary", "c": "cmath", "d": "vector2", "ans": "A", "exp": "Python has native support for complex numbers with real and imaginary parts using 'j' suffix.", "diff": "medium"}
    ],
    "Operators": [
        # Set 1
        {"text": "Which operator represents exponentiation (power) in Python?", "a": "**", "b": "^", "c": "^^", "d": "pow", "ans": "A", "exp": "** is the power operator in Python; ^ is the bitwise XOR operator.", "diff": "easy"},
        {"text": "What is the difference between '==' and 'is' in Python?", "a": "'==' compares value equality, while 'is' compares identity (memory reference)", "b": "They are completely identical", "c": "'is' is for numbers only", "d": "'==' is an assignment operator", "ans": "A", "exp": "'==' checks if values are equal, whereas 'is' checks if both variables point to the exact same object in memory.", "diff": "easy"},
        {"text": "What is short-circuit evaluation in Python logical operators?", "a": "Evaluation of 'and' or 'or' stops as soon as the outcome is determined", "b": "A hardware interrupt that halts execution", "c": "Evaluating both sides simultaneously using multi-cores", "d": "An error raised on zero division", "ans": "A", "exp": "If the first operand of 'and' is False, the second is not evaluated; if first of 'or' is True, second is skipped.", "diff": "medium"},
        {"text": "What is the bitwise XOR operator in Python?", "a": "^", "b": "**", "c": "~", "d": "|", "ans": "A", "exp": "^ is the bitwise exclusive OR operator in Python.", "diff": "easy"},
        {"text": "What does the modulus operator '%' return?", "a": "The remainder of the division between two numbers", "b": "The percentage of a value", "c": "The quotient without remainder", "d": "The logarithm base 10", "ans": "A", "exp": "% computes the remainder of the division of the left operand by the right.", "diff": "easy"},
        # Set 2
        {"text": "Which operator has higher precedence in Python arithmetic?", "a": "** (Exponentiation)", "b": "* (Multiplication)", "c": "+ (Addition)", "d": "== (Equality)", "ans": "A", "exp": "Exponentiation (**) has higher precedence than multiplication and addition.", "diff": "medium"},
        {"text": "What does the walrus operator ':=' do in Python 3.8+?", "a": "Assigns values to variables as part of a larger expression (assignment expression)", "b": "Compares if two variables are approximately equal", "c": "Declares an asynchronous coroutine", "d": "Creates an immutable dictionary", "ans": "A", "exp": "The walrus operator ':=' enables assignment expressions within conditionals or comprehensions.", "diff": "medium"},
        {"text": "What is the membership operator in Python to test if a key exists in a dictionary?", "a": "in", "b": "has_key", "c": "contains", "d": "exists", "ans": "A", "exp": "The 'in' operator tests membership in sequences and dictionary keys in O(1) average time.", "diff": "easy"},
        {"text": "What is the result of expression ~5 in Python bitwise negation?", "a": "-6", "b": "-5", "c": "0", "d": "5", "ans": "A", "exp": "Bitwise inversion ~x returns -(x + 1) in two's complement arithmetic (~5 = -6).", "diff": "hard"},
        {"text": "What does chained comparison '1 < x < 10' evaluate to in Python?", "a": "Equivalent to (1 < x) and (x < 10)", "b": "Syntax error", "c": "Evaluates (1 < x) first producing bool, then compares bool < 10", "d": "Always returns True", "ans": "A", "exp": "Python natively supports chained comparisons with short-circuiting.", "diff": "medium"},
        # Set 3
        {"text": "What does the bitwise left-shift operator 'x << 2' mathematically achieve?", "a": "Multiplies x by 2^2 (4)", "b": "Divides x by 4", "c": "Adds 2 to x", "d": "Squares x", "ans": "A", "exp": "Shifting left by k bits corresponds to multiplying by 2^k.", "diff": "medium"},
        {"text": "What is the ternary conditional operator syntax in Python?", "a": "value_if_true if condition else value_if_false", "b": "condition ? value_if_true : value_if_false", "c": "if (condition) value_if_true : value_if_false", "d": "choose(condition, true, false)", "ans": "A", "exp": "Python uses 'x if cond else y' as its inline ternary conditional expression.", "diff": "easy"},
        {"text": "What does 'not (A and B)' evaluate to according to De Morgan's Law?", "a": "(not A) or (not B)", "b": "(not A) and (not B)", "c": "not A", "d": "A or B", "ans": "A", "exp": "De Morgan's law states that negation of a conjunction is the disjunction of negations.", "diff": "medium"},
        {"text": "What is the identity operator to check if an object is NOT identical to None?", "a": "is not", "b": "!==", "c": "!", "d": "not in", "ans": "A", "exp": "'x is not None' is the idiomatic Python construct for identity verification.", "diff": "easy"},
        {"text": "In Python, what is returned by the expression 'hello' or 'world'?", "a": "'hello'", "b": "'world'", "c": "True", "d": "False", "ans": "A", "exp": "The 'or' operator returns the first truthy operand, or the last operand if none are truthy.", "diff": "medium"}
    ],
    "Tuples": [
        # Set 1
        {"text": "What denotes a single-element tuple literal in Python?", "a": "(42,)", "b": "(42)", "c": "tuple(42)", "d": "[42]", "ans": "A", "exp": "A trailing comma (42,) is required to distinguish a single-element tuple from parenthesized expression.", "diff": "easy"},
        {"text": "Why are tuples preferred over lists for dictionary keys?", "a": "Tuples are immutable and hashable (if their elements are hashable)", "b": "Tuples use more memory", "c": "Tuples can only store numbers", "d": "Lists are sorted automatically", "ans": "A", "exp": "Immutability allows tuples with hashable elements to have consistent hash codes required for hash maps.", "diff": "easy"},
        {"text": "What is tuple unpacking in Python?", "a": "Assigning elements of a tuple directly to multiple variables: a, b = (1, 2)", "b": "Deleting all elements in a tuple", "c": "Converting a tuple into binary", "d": "A compression algorithm", "ans": "A", "exp": "Tuple unpacking decomposes an iterable into individual variable bindings.", "diff": "easy"},
        {"text": "Can you modify an item inside a tuple once created (e.g., t[0] = 5)?", "a": "No, raises TypeError: 'tuple' object does not support item assignment", "b": "Yes, if using indexing", "c": "Yes, using append()", "d": "Only if the tuple has fewer than 3 items", "ans": "A", "exp": "Tuples are immutable; their references cannot be altered after creation.", "diff": "easy"},
        {"text": "What built-in namedtuple subclass is provided in Python collections?", "a": "collections.namedtuple", "b": "tuple.named", "c": "struct.tuple", "d": "types.namedtuple", "ans": "A", "exp": "collections.namedtuple provides factory functions for tuples with named fields accessible via dot notation.", "diff": "medium"},
        # Set 2
        {"text": "What is the space overhead advantage of a tuple compared to a list in CPython?", "a": "Tuples have fixed size and don't require over-allocation buffer for dynamic growth", "b": "Tuples are stored on the GPU", "c": "Tuples compress strings automatically", "d": "There is no difference in memory", "ans": "A", "exp": "Lists maintain extra capacity buffers to achieve O(1) amortized append, making tuples lighter in memory.", "diff": "medium"},
        {"text": "What happens when unpacking with an asterisk, such as 'first, *rest = (1, 2, 3, 4)'?", "a": "first gets 1, and rest collects [2, 3, 4] as a list", "b": "SyntaxError", "c": "rest is a tuple (2, 3, 4)", "d": "Only the first item is preserved", "ans": "A", "exp": "Extended iterable unpacking collects remaining items into a list bound to *rest.", "diff": "medium"},
        {"text": "What method counts occurrences of an element in a tuple?", "a": "t.count(x)", "b": "t.occurrences(x)", "c": "count(t, x)", "d": "t.frequency(x)", "ans": "A", "exp": "Tuple provides two methods: count(x) and index(x).", "diff": "easy"},
        {"text": "Can a tuple contain a mutable list as one of its elements? Can that inner list be modified?", "a": "Yes, the tuple references remain constant, but the mutable list contents can be modified", "b": "No, tuples forbid lists completely", "c": "Yes, but the list becomes immutable", "d": "It raises ValueError immediately", "ans": "A", "exp": "Tuple immutability applies to its item references; mutable objects referenced by the tuple remain mutable.", "diff": "medium"},
        {"text": "What does the tuple method t.index(x) return?", "a": "The zero-based index of the first occurrence of x", "b": "A list of all indices where x appears", "c": "The count of elements equal to x", "d": "True or False", "ans": "A", "exp": "t.index(x) returns the first index of x, raising ValueError if not found.", "diff": "easy"},
        # Set 3
        {"text": "What is the time complexity of looking up an element in an unsorted tuple using 'x in t'?", "a": "O(N)", "b": "O(1)", "c": "O(log N)", "d": "O(N^2)", "ans": "A", "exp": "Membership check in a tuple requires linear sequential scanning across the N elements.", "diff": "easy"},
        {"text": "How do you concatenate two tuples t1 and t2?", "a": "t1 + t2", "b": "t1.concat(t2)", "c": "t1.append(t2)", "d": "merge(t1, t2)", "ans": "A", "exp": "The + operator concatenates sequences, creating and returning a new tuple.", "diff": "easy"},
        {"text": "What is the return type of function multiple returns 'return a, b, c' in Python?", "a": "A tuple (a, b, c)", "b": "A list [a, b, c]", "c": "A dictionary", "d": "Multiple return channels", "ans": "A", "exp": "Comma-separated return values are implicitly packed into a single tuple object.", "diff": "easy"},
        {"text": "Why does CPython reuse small empty and short tuples in memory?", "a": "Tuples are immutable so CPython caches empty tuples and uses a free list for small tuples", "b": "To prevent garbage collection", "c": "Because hardware registers force it", "d": "Only lists can be cached", "ans": "A", "exp": "CPython optimizes allocation by recycling tuple memory blocks and sharing singleton empty tuples ().", "diff": "hard"},
        {"text": "Can you slice a tuple using syntax t[1:4:2]?", "a": "Yes, returning a new sliced tuple", "b": "No, tuples do not support slicing", "c": "Yes, but it converts into a list", "d": "Only if indices are positive", "ans": "A", "exp": "Tuples support the complete sequence slicing protocol [start:stop:step].", "diff": "easy"}
    ],
    "Functions": [
        # Set 1
        {"text": "What keyword is used to define a function in Python?", "a": "def", "b": "func", "c": "function", "d": "define", "ans": "A", "exp": "Python uses the 'def' keyword to declare user-defined functions.", "diff": "easy"},
        {"text": "What does a function return by default in Python if no return statement is specified?", "a": "None", "b": "0", "c": "False", "d": "Empty string", "ans": "A", "exp": "Python functions implicitly return None when execution reaches the end of the block.", "diff": "easy"},
        {"text": "What is the difference between *args and **kwargs in a Python function definition?", "a": "*args passes variable positional arguments as a tuple; **kwargs passes keyword arguments as a dictionary", "b": "*args is for numbers only; **kwargs is for strings", "c": "They are completely interchangeable", "d": "*args returns a list, **kwargs returns a set", "ans": "A", "exp": "*args collects extra positional parameters into a tuple, while **kwargs collects keyword arguments into a dict.", "diff": "medium"},
        {"text": "What is a lambda function in Python?", "a": "An anonymous inline function defined with the lambda keyword", "b": "A function that runs asynchronously in background", "c": "A compiled C-extension function", "d": "A function that has no parameters", "ans": "A", "exp": "Lambda functions are compact, single-expression anonymous functions.", "diff": "medium"},
        {"text": "What is a closure in Python?", "a": "A nested function that retains access to variables in its enclosing scope even after outer execution completes", "b": "A function that closes open file descriptors", "c": "A function terminating with exit()", "d": "A syntax error handler", "ans": "A", "exp": "Closures capture and remember state from the enclosing lexical scope.", "diff": "hard"},
        # Set 2
        {"text": "What is the dangerous side effect of using a mutable default argument (like def f(x=[])) in Python?", "a": "The default list is created once at definition time and shared across all invocations", "b": "It raises a SyntaxError at compile time", "c": "The list is deleted after the first call", "d": "It causes memory corruption", "ans": "A", "exp": "Default parameter values are evaluated once when the function definition is executed, leading to persistent state.", "diff": "medium"},
        {"text": "What is a Python decorator?", "a": "A callable that takes another function as an argument and extends its behavior without modifying it", "b": "A CSS stylesheet module for terminal output", "c": "A function that formats docstrings", "d": "A compiler directive that compiles code to C", "ans": "A", "exp": "Decorators provide syntactic sugar (@decorator) for higher-order function wrapping.", "diff": "medium"},
        {"text": "What built-in function yields pairs of (index, item) when iterating over a sequence?", "a": "enumerate()", "b": "zip()", "c": "range()", "d": "items()", "ans": "A", "exp": "enumerate() produces an iterator yielding tuples containing a count and the values from the sequence.", "diff": "easy"},
        {"text": "What does the LEGB rule describe in Python?", "a": "The order of scope resolution: Local, Enclosing, Global, Built-in", "b": "The memory layout of heap blocks", "c": "The order of method resolution in multiple inheritance", "d": "The bytecode execution lifecycle", "ans": "A", "exp": "LEGB defines Python's lookup hierarchy for variable resolution.", "diff": "medium"},
        {"text": "What is the purpose of the 'yield' keyword inside a function?", "a": "Turns the function into a generator that yields values lazily on demand", "b": "Pauses thread execution for 1 second", "c": "Terminates the program immediately", "d": "Returns a promise", "ans": "A", "exp": "Functions with 'yield' return generator objects that produce items sequentially while preserving local state.", "diff": "medium"},
        # Set 3
        {"text": "What does functools.wraps do when writing custom decorators?", "a": "Preserves the original function's metadata (__name__, __doc__, annotations)", "b": "Caches all return values", "c": "Wraps the function in a try-catch block", "d": "Spawns a background thread", "ans": "A", "exp": "functools.wraps copies name, module, docstring, and other attributes to the wrapper function.", "diff": "medium"},
        {"text": "How do you enforce keyword-only arguments in a Python function definition?", "a": "By placing an asterisk (*) before the keyword-only parameters", "b": "Using the keyword 'only'", "c": "Declaring them inside a tuple", "d": "Prefixing argument names with @", "ans": "A", "exp": "Any parameters following a bare * in the parameter list must be specified as keyword arguments.", "diff": "medium"},
        {"text": "What is function currying in functional programming?", "a": "Translating a function with multiple arguments into a sequence of functions each taking a single argument", "b": "Renaming function identifiers dynamically", "c": "Compiling functions into native machine code", "d": "Handling exceptions inside functions", "ans": "A", "exp": "Currying transforms f(a, b, c) into f(a)(b)(c).", "diff": "hard"},
        {"text": "What does inspect.signature() in the Python standard library provide?", "a": "Introspection of a callable's parameters, defaults, and return annotations", "b": "Digital cryptographic signature verification", "c": "The assembly bytecode", "d": "The memory address of the function", "ans": "A", "exp": "inspect.signature returns a Signature object representing the call signature of a callable.", "diff": "hard"},
        {"text": "What is a pure function?", "a": "A function whose return value depends solely on its arguments and has no side effects", "b": "A function that has no parameters", "c": "A function written without loops", "d": "A function that only returns booleans", "ans": "A", "exp": "Pure functions are deterministic and do not mutate external state or I/O.", "diff": "easy"}
    ],
    "Lists": [
        # Set 1
        {"text": "Which method adds an element to the end of a list in Python in O(1) amortized time?", "a": "append()", "b": "insert()", "c": "extend()", "d": "push()", "ans": "A", "exp": "append() appends a single item to the tail of the list in amortized constant time.", "diff": "easy"},
        {"text": "What is the result of list slicing my_list[1:4] for a list of 5 elements?", "a": "Elements at indices 1, 2, and 3", "b": "Elements at indices 1, 2, 3, and 4", "c": "Elements from index 0 to 4", "d": "Only index 1 and 4", "ans": "A", "exp": "Python slices are half-open intervals [start, stop), including start and excluding stop.", "diff": "easy"},
        {"text": "What is a list comprehension in Python?", "a": "A concise syntactic construct for creating new lists from iterables: [expr for item in iterable if cond]", "b": "A function that prints all list elements", "c": "A compression algorithm for saving RAM", "d": "A binary search function", "ans": "A", "exp": "List comprehensions offer a declarative, fast syntax for mapping and filtering iterables.", "diff": "medium"},
        {"text": "What is the time complexity of the list.insert(0, item) operation in Python?", "a": "O(N)", "b": "O(1)", "c": "O(log N)", "d": "O(N^2)", "ans": "A", "exp": "Inserting at index 0 requires shifting all existing N elements one position to the right.", "diff": "medium"},
        {"text": "What is the difference between my_list.sort() and sorted(my_list)?", "a": "my_list.sort() sorts the list in-place returning None; sorted() returns a new sorted list", "b": "They are identical in return value", "c": "sorted() modifies the original list", "d": "my_list.sort() uses O(N^2) bubble sort", "ans": "A", "exp": "The list method modifies the caller in-place, whereas the built-in sorted() creates and returns a new list.", "diff": "medium"},
        # Set 2
        {"text": "What sorting algorithm is utilized by Python's list.sort() and sorted()?", "a": "Timsort (hybrid of merge sort and insertion sort)", "b": "Quicksort", "c": "Heapsort", "d": "Radix sort", "ans": "A", "exp": "Python uses Timsort, an adaptive stable sorting algorithm with O(N log N) worst-case and O(N) best-case time.", "diff": "medium"},
        {"text": "What is the difference between shallow copy (list.copy()) and deep copy (copy.deepcopy())?", "a": "Shallow copy duplicates the outer list container; deepcopy recursively copies all nested objects", "b": "Shallow copy only works for numbers", "c": "They are completely identical", "d": "Deepcopy deletes the original", "ans": "A", "exp": "Shallow copies share nested object references; deepcopy clones entire reference trees.", "diff": "medium"},
        {"text": "What does the list.pop() method do when called with no arguments?", "a": "Removes and returns the last element in O(1) time", "b": "Deletes the entire list", "c": "Removes the first element in O(N) time", "d": "Pops a random element", "ans": "A", "exp": "pop() defaults to index -1, acting as an efficient LIFO stack pop.", "diff": "easy"},
        {"text": "How do you concatenate another list's elements into an existing list in-place?", "a": "my_list.extend(other_list)", "b": "my_list.append(other_list)", "c": "my_list.join(other_list)", "d": "my_list.push_all(other_list)", "ans": "A", "exp": "extend() iterates over other_list appending each item; append() would insert the list as a single nested element.", "diff": "easy"},
        {"text": "What is the time complexity of 'x in my_list' for an unsorted list of length N?", "a": "O(N)", "b": "O(1)", "c": "O(log N)", "d": "O(N log N)", "ans": "A", "exp": "Membership check in an unsorted list requires linear search.", "diff": "easy"},
        # Set 3
        {"text": "What does the slice expression my_list[::-1] produce?", "a": "A new list with elements in reversed order", "b": "A generator", "c": "Reverses the list in place", "d": "An empty list", "ans": "A", "exp": "Step -1 reverses the sequence while creating a new list copy.", "diff": "easy"},
        {"text": "Which collection in Python collections module is optimized for O(1) appends and pops from BOTH ends?", "a": "collections.deque", "b": "collections.Counter", "c": "collections.OrderedDict", "d": "collections.ChainMap", "ans": "A", "exp": "deque is implemented as a doubly linked block list providing O(1) appends and pops on left and right.", "diff": "medium"},
        {"text": "What happens when you multiply a list by an integer: [0] * 5?", "a": "Produces a new list [0, 0, 0, 0, 0]", "b": "Raises TypeError", "c": "Multiplies each number by 5", "d": "Creates a 5D array", "ans": "A", "exp": "List multiplication repeats elements shallowly.", "diff": "easy"},
        {"text": "Why is '[[0] * 3] * 3' problematic when creating a 2D matrix?", "a": "All 3 rows reference the EXACT same inner list object, so modifying one modifies all", "b": "It raises MemoryError", "c": "It creates a flat list of 9 elements", "d": "It cannot be indexed", "ans": "A", "exp": "Multiplication copies references; modify matrix[0][0] and matrix[1][0] also changes.", "diff": "hard"},
        {"text": "What does list.clear() do in Python?", "a": "Removes all elements from the list in-place", "b": "Deletes the variable from scope", "c": "Fills the list with zeros", "d": "Shrinks memory allocation to zero bytes permanently", "ans": "A", "exp": "clear() removes all items from the list, equivalent to del my_list[:].", "diff": "easy"}
    ],
    "File Handling": [
        # Set 1
        {"text": "What is the recommended statement in Python to open files to ensure automatic closure?", "a": "with open(...) as f:", "b": "try open(...) catch:", "c": "using f = open(...):", "d": "file.auto_close()", "ans": "A", "exp": "The 'with' statement acts as a context manager, guaranteeing that f.close() is executed on exit.", "diff": "easy"},
        {"text": "What does file mode 'r+' allow in Python?", "a": "Both reading and writing without truncating the existing file", "b": "Read only", "c": "Write only with file truncation", "d": "Append only", "ans": "A", "exp": "Mode 'r+' opens a file for update (both reading and writing) starting at the beginning.", "diff": "medium"},
        {"text": "What does the file.seek(0) method do in Python?", "a": "Moves the file stream read/write pointer to the beginning of the file", "b": "Searches for the character '0'", "c": "Deletes the first line", "d": "Reads 0 bytes into memory", "ans": "A", "exp": "seek(offset) sets the stream's current position to the specified byte offset.", "diff": "medium"},
        {"text": "What is the difference between read() and readlines()?", "a": "read() returns the entire content as a single string; readlines() returns a list of line strings", "b": "read() reads backwards", "c": "readlines() only reads the first line", "d": "They have identical return types", "ans": "A", "exp": "read() reads the full stream into a string, whereas readlines() splits lines into a list.", "diff": "easy"},
        {"text": "Which module in Python is used for object serialization and deserialization to disk?", "a": "pickle", "b": "stream", "c": "binary", "d": "store", "ans": "A", "exp": "The pickle module converts Python object hierarchies into byte streams and vice versa.", "diff": "medium"},
        # Set 2
        {"text": "What file mode opens a file for writing and TRUNCATES (erases) existing content?", "a": "'w'", "b": "'r'", "c": "'a'", "d": "'x'", "ans": "A", "exp": "'w' opens for writing, truncating the file first or creating it if it doesn't exist.", "diff": "easy"},
        {"text": "What file mode opens a file for writing, placing the pointer at the END without truncation?", "a": "'a' (Append mode)", "b": "'w'", "c": "'r'", "d": "'w+'", "ans": "A", "exp": "'a' appends new data to the end of the file preserving existing content.", "diff": "easy"},
        {"text": "What does file mode 'x' specify in open()?", "a": "Exclusive creation: fails if the file already exists", "b": "Executable mode", "c": "XML parser mode", "d": "Encrypted stream", "ans": "A", "exp": "'x' opens for exclusive creation, failing with FileExistsError if the file already exists.", "diff": "medium"},
        {"text": "What is the purpose of the 'b' flag in mode strings (e.g., 'rb' or 'wb')?", "a": "Opens the file in binary mode without text decoding/newline translation", "b": "Enables buffered asynchronous writes", "c": "Runs in background", "d": "Bypasses operating system permissions", "ans": "A", "exp": "Binary mode reads and writes raw bytes rather than encoded Unicode strings.", "diff": "easy"},
        {"text": "What method returns the current byte position of the file pointer?", "a": "f.tell()", "b": "f.pos()", "c": "f.where()", "d": "f.get_offset()", "ans": "A", "exp": "f.tell() returns an integer giving the file object's current position in the file.", "diff": "medium"},
        # Set 3
        {"text": "Which modern standard library module provides an object-oriented filesystem interface?", "a": "pathlib", "b": "os.path", "c": "filetools", "d": "shutil", "ans": "A", "exp": "pathlib offers classes representing filesystem paths with semantics appropriate for different operating systems.", "diff": "easy"},
        {"text": "What does file.flush() do?", "a": "Flushes the internal I/O write buffers to the operating system", "b": "Deletes the file contents", "c": "Closes the file descriptor", "d": "Rewinds the stream to byte 0", "ans": "A", "exp": "flush() forces write buffers to be flushed to the OS write buffer cache.", "diff": "medium"},
        {"text": "How can you iterate through a massive 10GB text file without running out of RAM?", "a": "Iterate directly over the file object line-by-line: for line in f:", "b": "f.read()", "c": "f.readlines()", "d": "list(f)", "ans": "A", "exp": "File objects are iterators that buffer line by line lazily, using minimal memory.", "diff": "medium"},
        {"text": "What parameter in open() specifies the character encoding format (e.g., UTF-8)?", "a": "encoding='utf-8'", "b": "charset='utf-8'", "c": "format='utf-8'", "d": "codec='utf-8'", "ans": "A", "exp": "The encoding parameter specifies the text encoding used to decode or encode the file.", "diff": "easy"},
        {"text": "What exception is raised when trying to open a non-existent file for reading?", "a": "FileNotFoundError", "b": "IOErrorNull", "c": "KeyError", "d": "StreamEmptyError", "ans": "A", "exp": "Attempting to open a missing path in read mode raises FileNotFoundError (subclass of OSError).", "diff": "easy"}
    ],
    "Exceptions": [
        # Set 1
        {"text": "Which block in Python always executes regardless of whether an exception was raised or handled?", "a": "finally", "b": "else", "c": "except", "d": "try", "ans": "A", "exp": "The 'finally' clause is always executed prior to leaving the try statement, ideal for resource cleanup.", "diff": "easy"},
        {"text": "How do you intentionally trigger an exception in Python?", "a": "Using the raise keyword", "b": "Using the throw keyword", "c": "Using the error() function", "d": "Using return Exception()", "ans": "A", "exp": "Python uses 'raise' to trigger built-in or custom exceptions.", "diff": "easy"},
        {"text": "What exception is raised when attempting to access a non-existent key in a Python dictionary?", "a": "KeyError", "b": "IndexError", "c": "ValueError", "d": "AttributeError", "ans": "A", "exp": "Dictionary lookup d[key] raises KeyError when key is missing; d.get(key) returns None instead.", "diff": "easy"},
        {"text": "What exception occurs when dividing any number by zero in Python?", "a": "ZeroDivisionError", "b": "ArithmeticOverflowError", "c": "NaNError", "d": "NullPointerError", "ans": "A", "exp": "Division or modulo by zero raises ZeroDivisionError.", "diff": "easy"},
        {"text": "What is the purpose of the 'else' block in a try-except statement in Python?", "a": "It executes only if no exceptions were raised in the try block", "b": "It handles all unknown exceptions", "c": "It executes if any exception occurs", "d": "It restarts the try block", "ans": "A", "exp": "The else block executes only when the code in the try suite runs without raising any exception.", "diff": "medium"},
        # Set 2
        {"text": "What is the base class for all non-system-exiting built-in exceptions in Python?", "a": "Exception", "b": "BaseException", "c": "SystemExit", "d": "StandardError", "ans": "A", "exp": "Custom and standard application exceptions inherit from Exception, which derives from BaseException.", "diff": "medium"},
        {"text": "Why is a bare 'except:' clause discouraged in production Python code?", "a": "It catches SystemExit, KeyboardInterrupt, and prevents normal program shutdown (Ctrl+C)", "b": "It causes syntax errors in Python 3", "c": "It slows down CPU clock frequency", "d": "It deletes local variables", "ans": "A", "exp": "A bare except catches BaseException, swallowing interrupts and masking critical bugs.", "diff": "medium"},
        {"text": "How do you define a custom exception class in Python?", "a": "class MyCustomError(Exception): pass", "b": "def MyCustomError(): throw Exception", "c": "struct MyCustomError { int code; }", "d": "@exception class MyCustomError:", "ans": "A", "exp": "Custom exceptions are created by subclassing the built-in Exception class.", "diff": "easy"},
        {"text": "What exception is raised when calling int('hello')?", "a": "ValueError", "b": "TypeError", "c": "SyntaxError", "d": "ConversionError", "ans": "A", "exp": "ValueError is raised when an operation receives an argument that has the right type but inappropriate value.", "diff": "easy"},
        {"text": "What does exception chaining 'raise NewError from original_err' do in Python 3?", "a": "Sets the __cause__ attribute to explicitly preserve the original exception context in tracebacks", "b": "Deletes the original error", "c": "Suppresses all traceback printing", "d": "Reruns the code block", "ans": "A", "exp": "'from' establishes explicit exception chaining, showing which root exception caused the failure.", "diff": "hard"},
        # Set 3
        {"text": "What statement tests a condition and raises AssertionError if the condition is false?", "a": "assert condition, 'error message'", "b": "verify condition", "c": "check condition", "d": "ensure condition", "ans": "A", "exp": "assert statements evaluate expressions and trigger AssertionError if falsy, typically used for invariants.", "diff": "easy"},
        {"text": "How do you re-raise the currently active exception inside an except block without losing traceback?", "a": "A bare 'raise' statement", "b": "raise Exception", "c": "rethrow", "d": "continue", "ans": "A", "exp": "A bare 'raise' with no arguments re-raises the current active exception being handled.", "diff": "medium"},
        {"text": "What exception is raised when accessing an attribute that does not exist on an object?", "a": "AttributeError", "b": "KeyError", "c": "NameError", "d": "ReferenceError", "ans": "A", "exp": "AttributeError occurs when an attribute reference or assignment fails.", "diff": "easy"},
        {"text": "What does contextlib.suppress(*exceptions) provide?", "a": "A context manager that cleanly silences specified exceptions within its with-block", "b": "A decorator that deletes tracebacks", "c": "An OS error logger", "d": "A signal handler", "ans": "A", "exp": "contextlib.suppress(FileNotFoundError) suppresses the named exceptions cleanly.", "diff": "medium"},
        {"text": "What exception is raised when trying to use an unassigned variable name?", "a": "NameError", "b": "VariableError", "c": "UnassignedError", "d": "NullError", "ans": "A", "exp": "NameError is raised when a local or global name is not found in the current scope.", "diff": "easy"}
    ],
    "Recursion": [
        # Set 1
        {"text": "What essential component prevents a recursive function from entering infinite recursion?", "a": "A Base Case", "b": "Dynamic memory allocation", "c": "A loop counter variable", "d": "Global state flag", "ans": "A", "exp": "The base case provides a terminating condition that returns without initiating further calls.", "diff": "easy"},
        {"text": "What runtime error occurs when recursion exceeds the allocated call stack memory?", "a": "RecursionError (Stack Overflow)", "b": "Out of Disk Space", "c": "Deadlock", "d": "Race Condition", "ans": "A", "exp": "Each call pushes a stack frame; exceeding sys.getrecursionlimit() triggers RecursionError.", "diff": "easy"},
        {"text": "What is Tail Call Optimization (TCO)?", "a": "When the compiler reuses the current stack frame if the recursive call is the final action", "b": "Converting recursion into multi-threading", "c": "Eliminating base cases entirely", "d": "Caching function outputs in a hash table", "ans": "A", "exp": "TCO allows tail-recursive routines to execute in O(1) stack space.", "diff": "medium"},
        {"text": "What is the time complexity of the naive recursive Fibonacci calculation fib(n) = fib(n-1) + fib(n-2)?", "a": "O(2^n)", "b": "O(n)", "c": "O(log n)", "d": "O(n^2)", "ans": "A", "exp": "The recursive call tree branches exponentially into redundant subproblems.", "diff": "medium"},
        {"text": "How does Memoization optimize recursive algorithms?", "a": "By storing results of expensive function calls to return cached values on repeated inputs", "b": "By rewriting code into assembly", "c": "By deleting recursion parameters", "d": "By running calls in parallel", "ans": "A", "exp": "Top-down memoization stores overlapping subproblem results, reducing exponential time to polynomial.", "diff": "medium"},
        # Set 2
        {"text": "Which standard library decorator adds automatic LRU memoization to recursive functions?", "a": "functools.lru_cache", "b": "itertools.cache", "c": "math.memoize", "d": "collections.cached", "ans": "A", "exp": "functools.lru_cache decorates callables with a memoizing callable that caches up to maxsize calls.", "diff": "easy"},
        {"text": "What is the maximum default recursion depth in CPython?", "a": "1000", "b": "100", "c": "100000", "d": "Unlimited", "ans": "A", "exp": "CPython defaults to a recursion depth limit of 1000 stack frames (viewable via sys.getrecursionlimit()).", "diff": "medium"},
        {"text": "How can you check or increase the recursion limit in Python?", "a": "sys.getrecursionlimit() and sys.setrecursionlimit(n)", "b": "os.setstack(n)", "c": "threading.stack_size(n)", "d": "compiler.depth(n)", "ans": "A", "exp": "The sys module provides getrecursionlimit and setrecursionlimit functions.", "diff": "medium"},
        {"text": "What is mutual (indirect) recursion?", "a": "When function A calls function B, and function B in turn calls function A", "b": "A function calling itself twice in parallel", "c": "Recursion that has no base case", "d": "A loop containing recursion", "ans": "A", "exp": "Mutual recursion occurs when two or more functions call each other reciprocally.", "diff": "medium"},
        {"text": "What algorithmic paradigm divides a problem into independent subproblems, recursively solves them, and combines the results?", "a": "Divide and Conquer (e.g., Merge Sort)", "b": "Greedy approach", "c": "Brute force", "d": "Hill climbing", "ans": "A", "exp": "Divide and conquer breaks problems into smaller instances of the same problem recursively.", "diff": "easy"},
        # Set 3
        {"text": "Why does Python NOT perform automatic Tail Call Elimination (TCO)?", "a": "Guido van Rossum prioritized accurate debugging tracebacks over TCO", "b": "CPython lacks a call stack", "c": "Python bytecode cannot jump", "d": "It violates IEEE standards", "ans": "A", "exp": "CPython intentionally preserves stack traces for debugging clarity rather than dropping stack frames.", "diff": "hard"},
        {"text": "How can any recursive algorithm be converted into an iterative algorithm?", "a": "By using an explicit Stack data structure to simulate the call stack", "b": "By using bitwise operators", "c": "By compiling to assembly", "d": "Recursion cannot be converted to iteration", "ans": "A", "exp": "Any recursive routine can be rewritten iteratively using an explicit LIFO stack in memory.", "diff": "medium"},
        {"text": "In the Master Theorem T(n) = aT(n/b) + f(n), what does 'a' represent?", "a": "The number of subproblems generated at each step", "b": "The input size reduction factor", "c": "The asymptotic time of the base case", "d": "The recursion limit", "ans": "A", "exp": "'a' is the branching factor (number of recursive subproblems created).", "diff": "hard"},
        {"text": "What is the space complexity of calculating factorial recursively without tail recursion for input N?", "a": "O(N) stack space", "b": "O(1)", "c": "O(log N)", "d": "O(N^2)", "ans": "A", "exp": "N activation frames are stacked concurrently on the call stack before reaching base case n == 1.", "diff": "easy"},
        {"text": "What is backtracking in recursive algorithm design?", "a": "Incrementally building candidates and abandoning ('backtracking') a candidate as soon as it cannot lead to a valid solution", "b": "Undoing git commits", "c": "Running loops backwards", "d": "Deleting stack frames manually", "ans": "A", "exp": "Backtracking explores state space trees recursively and prunes unviable paths.", "diff": "medium"}
    ],
    "Arrays": [
        # Set 1
        {"text": "What is the time complexity of accessing an element by index in a contiguous array?", "a": "O(1)", "b": "O(n)", "c": "O(log n)", "d": "O(n^2)", "ans": "A", "exp": "Arrays store items contiguously in memory, enabling constant-time pointer arithmetic.", "diff": "easy"},
        {"text": "In a static array of size N, what occurs when attempting to insert an element beyond N elements?", "a": "Buffer overflow or out-of-bounds exception", "b": "Automatic geometric resizing", "c": "Silent replacement of index 0", "d": "Elements wrap around modularly", "ans": "B", "exp": "Static arrays have fixed allocated memory bounds determined at compile or allocation time.", "diff": "medium"},
        {"text": "Why do dynamic arrays (like Python list or C++ vector) achieve O(1) amortized insertion?", "a": "They double capacity on overflow, spreading the O(N) copy cost over N insertions", "b": "They never reallocate memory", "c": "They use linked lists internally", "d": "They allocate memory lazily without writing to RAM", "ans": "A", "exp": "Geometric resizing doubles capacity, ensuring each element is copied on average only O(1) times amortized.", "diff": "medium"},
        {"text": "What is the cache locality benefit of arrays over linked nodes?", "a": "Contiguous memory layout allows hardware prefetching into CPU cache lines", "b": "Pointers eliminate branch mispredictions", "c": "Arrays store each node in separate RAM banks", "d": "Arrays bypass memory buses entirely", "ans": "A", "exp": "Spatial locality allows hardware prefetchers to load sequential cache lines efficiently.", "diff": "hard"},
        {"text": "Which operation in a sorted array requires O(log n) time using binary search?", "a": "Searching for a target value", "b": "Deletion at index 0", "c": "Appending at the tail", "d": "Rotating elements by K steps", "ans": "A", "exp": "Binary search divides the search space in half with each comparison.", "diff": "easy"},
        # Set 2
        {"text": "When deleting an element at index 0 in an array of size N, what is the worst-case time complexity?", "a": "O(n)", "b": "O(1)", "c": "O(log n)", "d": "O(n log n)", "ans": "A", "exp": "All subsequent N-1 elements must be shifted left by one position to fill the void.", "diff": "easy"},
        {"text": "What is the space complexity of creating a 2D matrix with R rows and C columns?", "a": "O(R * C)", "b": "O(R + C)", "c": "O(R log C)", "d": "O(1)", "ans": "A", "exp": "A two-dimensional array allocates memory proportional to the product of rows and columns.", "diff": "easy"},
        {"text": "Which pointer technique is most effective for finding if a sorted array has two numbers summing to target T?", "a": "Two-pointer approach (start and end)", "b": "Fast and slow pointer cycle detection", "c": "Matrix exponentiation", "d": "Prefix tree lookup", "ans": "A", "exp": "Two pointers converging inward find the complement in O(N) linear time without extra memory.", "diff": "medium"},
        {"text": "In row-major order storage, what is the 1D index offset of cell (i, j) for an array with C columns?", "a": "i * C + j", "b": "j * C + i", "c": "i + j * R", "d": "(i + j) * C", "ans": "A", "exp": "Row-major order serializes row by row, offsetting each row index by the column width C.", "diff": "medium"},
        {"text": "What is the primary drawback of using variable-length arrays (VLAs) allocated on the call stack?", "a": "Risk of stack overflow when size is untrusted or large", "b": "CPU cache eviction", "c": "Garbage collector stalls", "d": "Incompatibility with pointers", "ans": "A", "exp": "Stack frames have limited size (typically a few megabytes), making large stack allocations hazardous.", "diff": "hard"},
        # Set 3
        {"text": "In the Sliding Window array technique, what is the typical amortized time complexity across an array of length N?", "a": "O(N)", "b": "O(N^2)", "c": "O(2^N)", "d": "O(N log N)", "ans": "A", "exp": "Each array element enters and exits the active window at most once.", "diff": "medium"},
        {"text": "What does a Prefix Sum array enable in O(1) constant time?", "a": "Range sum query between index L and R", "b": "Finding maximum element in range", "c": "Sorting the subarray", "d": "Reversing array in place", "ans": "A", "exp": "Sum(L, R) equals prefix[R] - prefix[L - 1], computed in O(1) time.", "diff": "medium"},
        {"text": "Why does random insertion in the middle of a dynamic array take O(N) time?", "a": "Shifting all elements after the insertion index to the right", "b": "Pointer validation overhead", "c": "Re-hashing key-value pairs", "d": "Rebuilding the binary heap", "ans": "A", "exp": "Contiguous array continuity requires shifting all trailing elements rightward.", "diff": "easy"},
        {"text": "What is an in-place array algorithm?", "a": "An algorithm that transforms input without allocating auxiliary memory proportional to N", "b": "An algorithm that uses no memory at all", "c": "An algorithm that executes only in CPU registers", "d": "An algorithm that avoids pointer dereferencing", "ans": "A", "exp": "In-place algorithms use O(1) auxiliary space beyond the input data structure.", "diff": "medium"},
        {"text": "Which structure combines properties of arrays and linked lists to reduce worst-case shift costs?", "a": "Unrolled linked list", "b": "Red-Black Tree", "c": "Disjoint set union", "d": "Ternary search tree", "ans": "A", "exp": "An unrolled linked list holds an array of elements inside each node, balancing locality with insertion flexibility.", "diff": "hard"}
    ],
    "Stacks": [
        # Set 1
        {"text": "Which fundamental abstract data type principle governs a Stack?", "a": "LIFO (Last In First Out)", "b": "FIFO (First In First Out)", "c": "Priority-based dequeue", "d": "Random index eviction", "ans": "A", "exp": "The most recently inserted element is always the first one removed.", "diff": "easy"},
        {"text": "What is the time complexity of both push() and pop() operations in a well-implemented stack?", "a": "O(1)", "b": "O(n)", "c": "O(log n)", "d": "O(n^2)", "ans": "A", "exp": "Stack operations only inspect and manipulate the top pointer, taking constant time.", "diff": "easy"},
        {"text": "Which classic algorithmic challenge is solved in O(N) time using an explicit Stack?", "a": "Validating balanced parentheses and bracket nesting", "b": "Dijkstra shortest path", "c": "Prim minimal spanning tree", "d": "Fast Fourier transform", "ans": "A", "exp": "Pushing opening brackets and popping matching closing brackets guarantees balance validation.", "diff": "easy"},
        {"text": "In arithmetic expression parsing, how is an Infix expression converted to Postfix (RPN)?", "a": "Shunting Yard algorithm using an operator stack", "b": "Floyd-Warshall all-pairs algorithm", "c": "Huffman priority queue", "d": "Tarjan strongly connected components", "ans": "A", "exp": "Dijkstra's Shunting Yard algorithm maintains operator precedence via a stack.", "diff": "medium"},
        {"text": "What happens when a pop() operation is executed on an empty stack?", "a": "Stack underflow condition", "b": "Memory reallocation", "c": "Pushes a default null item", "d": "Returns the stack base pointer", "ans": "A", "exp": "Popping from an empty structure violates invariant and triggers stack underflow.", "diff": "easy"},
        # Set 2
        {"text": "What is a Monotonic Stack primarily utilized for?", "a": "Finding the Next Greater or Smaller Element in O(N) linear time", "b": "Generating random permutations", "c": "Matrix multiplication speedup", "d": "Dynamic memory compaction", "ans": "A", "exp": "A monotonic stack maintains elements in strictly increasing or decreasing order for nearest neighbor queries.", "diff": "medium"},
        {"text": "How is recursive function execution supported by the runtime operating system?", "a": "Via a hardware Call Stack storing activation frames", "b": "Via an operating system message queue", "c": "Through a binary search table", "d": "Using a distributed hash ring", "ans": "A", "exp": "Each function invocation pushes an activation record (local variables, return address) onto the Call Stack.", "diff": "medium"},
        {"text": "Can two Stacks be used to simulate a FIFO Queue? What is the amortized cost per dequeue?", "a": "Yes, with O(1) amortized cost per dequeue", "b": "No, queues cannot be built from stacks", "c": "Yes, but with O(N^2) cost per dequeue", "d": "Yes, but requires O(N) extra threads", "ans": "A", "exp": "One stack handles enqueues while the other handles dequeues; elements transfer at most once.", "diff": "medium"},
        {"text": "What is the maximum depth of the call stack when evaluating recursion on an array of size N without tail call optimization?", "a": "O(N)", "b": "O(1)", "c": "O(log N)", "d": "O(N!)", "ans": "A", "exp": "Linear recursion without tail optimization builds N concurrent stack frames.", "diff": "medium"},
        {"text": "How can Min-Stack return the minimum element in O(1) time without compromising push/pop performance?", "a": "By maintaining an auxiliary stack tracking the minimum at each depth", "b": "By sorting the stack after each push", "c": "By using a hash set", "d": "By converting the stack to a heap", "ans": "A", "exp": "A parallel min-stack stores the current minimum value corresponding to each element level.", "diff": "hard"},
        # Set 3
        {"text": "What is postfix (Reverse Polish Notation) expression evaluation order?", "a": "Operands are pushed onto a stack; operators pop operands and push the result", "b": "Operators precede operands", "c": "From right to left recursively", "d": "Using a binary search tree", "ans": "A", "exp": "Postfix eliminates need for parentheses by evaluating via operand stack.", "diff": "easy"},
        {"text": "What is the time complexity of converting an infix expression of length N to postfix using a stack?", "a": "O(N)", "b": "O(N^2)", "c": "O(log N)", "d": "O(N log N)", "ans": "A", "exp": "Each token is pushed and popped from the operator stack at most once.", "diff": "medium"},
        {"text": "What is the space complexity of a stack storing N elements?", "a": "O(N)", "b": "O(1)", "c": "O(N^2)", "d": "O(log N)", "ans": "A", "exp": "Stack consumes memory linear in the number of stored elements.", "diff": "easy"},
        {"text": "In web browser architecture, how is the Back/Forward navigation history typically implemented?", "a": "Two stacks: back stack and forward stack", "b": "A circular queue", "c": "A binary heap", "d": "A hash table", "ans": "A", "exp": "Pushing visited pages onto Back stack, and moving between Back and Forward stacks on navigation.", "diff": "easy"},
        {"text": "Which algorithmic problem utilizes a stack for depth exploration?", "a": "Iterative Depth-First Search (DFS)", "b": "Breadth-First Search (BFS)", "c": "Kruskal MST", "d": "Binary search", "ans": "A", "exp": "DFS explores deeply along each branch using an explicit or call stack.", "diff": "easy"}
    ],
    "Queues": [
        # Set 1
        {"text": "Which principle defines standard Queue operations?", "a": "FIFO (First In First Out)", "b": "LIFO", "c": "Random access", "d": "Priority eviction", "ans": "A", "exp": "The earliest inserted element is dequeued first, mirroring a physical queue.", "diff": "easy"},
        {"text": "Which fundamental graph traversal algorithm relies essentially on a FIFO Queue?", "a": "Breadth-First Search (BFS)", "b": "Depth-First Search (DFS)", "c": "Topological Sort via DFS", "d": "Kosaraju SCC", "ans": "A", "exp": "BFS processes graph vertices level by level using a FIFO Queue.", "diff": "easy"},
        {"text": "Why is a Circular Queue preferred over a simple array queue?", "a": "It reuses deallocated front indices using modulo arithmetic without shifting elements", "b": "It supports recursion natively", "c": "It uses zero memory", "d": "It replaces pointers with hashes", "ans": "A", "exp": "Modulo index wraparound ((rear + 1) % capacity) avoids shifting remaining items.", "diff": "medium"},
        {"text": "What is a Deque (Double-Ended Queue)?", "a": "A queue allowing insertion and deletion at both front and rear in O(1) time", "b": "A queue that only accepts strings", "c": "A queue with two parallel threads", "d": "A priority queue with fixed keys", "ans": "A", "exp": "A deque permits constant-time push and pop from either end.", "diff": "easy"},
        {"text": "What is a Priority Queue typically implemented with to achieve O(log n) insertions?", "a": "Binary Heap", "b": "Circular linked list", "c": "Static stack", "d": "Bit vector", "ans": "A", "exp": "A binary min-heap or max-heap maintains priority invariants with logarithmic bubble-up/down operations.", "diff": "medium"},
        # Set 2
        {"text": "What is the time complexity of enqueue and dequeue in a linked-list based queue with head and tail pointers?", "a": "O(1) for both", "b": "O(N) for dequeue", "c": "O(log N)", "d": "O(N^2)", "ans": "A", "exp": "Head pointer allows O(1) removal, and tail pointer enables O(1) appending.", "diff": "easy"},
        {"text": "In operating systems, which scheduling algorithm uses a round-robin queue structure?", "a": "Round Robin CPU Scheduling with time slices", "b": "Shortest Job First", "c": "Priority Aging", "d": "Multi-level feedback without queues", "ans": "A", "exp": "Round Robin maintains ready processes in a FIFO queue and gives each a quantum slice.", "diff": "medium"},
        {"text": "What happens when you attempt to enqueue to a full fixed-size circular queue?", "a": "Queue overflow", "b": "Queue underflow", "c": "Elements are discarded silently", "d": "It converts to a stack", "ans": "A", "exp": "Attempting to insert when size equals capacity triggers queue overflow.", "diff": "easy"},
        {"text": "In a sliding window maximum problem over array size N, how does a monotonic deque achieve O(N) time?", "a": "Maintains candidate indices in decreasing order, each element added and popped at most once", "b": "By sorting the window each time", "c": "Using binary search on the array", "d": "Using recursion", "ans": "A", "exp": "Elements enter and leave the deque at most once, giving amortized O(1) per step.", "diff": "hard"},
        {"text": "Which structure can simulate a Queue using two Stacks?", "a": "In-stack for pushing, Out-stack for popping with lazy transfer", "b": "A single stack with recursion", "c": "A binary tree", "d": "An array of pointers", "ans": "A", "exp": "Transferring from In-stack to Out-stack reverses order, restoring FIFO semantics.", "diff": "medium"},
        # Set 3
        {"text": "What is a blocking queue in concurrent programming?", "a": "A queue that blocks threads attempting to dequeue from empty or enqueue to full capacity", "b": "A corrupted queue that blocks all memory", "c": "A queue that prevents write access permanently", "d": "A firewall network tool", "ans": "A", "exp": "Blocking queues provide thread-safe synchronization for producer-consumer pipelines.", "diff": "medium"},
        {"text": "In level-order tree traversal, what is the role of the queue?", "a": "Ensures nodes at depth d are completely visited before nodes at depth d+1", "b": "Sorts nodes alphabetically", "c": "Finds the tree height in O(1)", "d": "Validates BST property", "ans": "A", "exp": "Popping parent nodes and enqueuing children guarantees breadth-first level processing.", "diff": "easy"},
        {"text": "What is the space complexity of BFS on a balanced binary tree with N nodes?", "a": "O(N) (representing the widest level of leaves)", "b": "O(log N)", "c": "O(1)", "d": "O(N^2)", "ans": "A", "exp": "The leaf level holds N/2 nodes, all present in the queue simultaneously during traversal.", "diff": "medium"},
        {"text": "What does a double-ended priority queue support?", "a": "Retrieving and removing BOTH minimum and maximum priority elements in O(log n)", "b": "Only two elements at any time", "c": "Two threads accessing concurrently", "d": "Sorting in O(1)", "ans": "A", "exp": "Interval heaps or min-max heaps support both min and max extractions efficiently.", "diff": "hard"},
        {"text": "What is the primary advantage of Python's collections.deque over list for queues?", "a": "popleft() is O(1) in deque, whereas list.pop(0) is O(N)", "b": "deque is written in pure python", "c": "deque sorts automatically", "d": "deque uses zero memory", "ans": "A", "exp": "list.pop(0) shifts all remaining elements; deque unlinks the head node in constant time.", "diff": "easy"}
    ],
    "Trees": [
        # Set 1
        {"text": "In a Binary Search Tree (BST), what relationship holds for any node with key K?", "a": "Left subtree keys < K and right subtree keys > K", "b": "Left subtree keys > K and right subtree keys < K", "c": "All keys must be equal to K", "d": "Keys are sorted by depth only", "ans": "A", "exp": "The BST invariant requires all left descendants to be strictly smaller and right descendants larger.", "diff": "easy"},
        {"text": "Which tree traversal of a BST visits nodes in strictly ascending sorted order?", "a": "In-order traversal", "b": "Pre-order traversal", "c": "Post-order traversal", "d": "Level-order traversal", "ans": "A", "exp": "In-order traversal (Left, Root, Right) outputs BST keys in ascending order.", "diff": "easy"},
        {"text": "What is the worst-case search time complexity in an unbalanced, degenerate BST of N nodes?", "a": "O(n)", "b": "O(1)", "c": "O(log n)", "d": "O(n log n)", "ans": "A", "exp": "When nodes are inserted in sorted order, an unbalanced BST degenerates into a linear linked list.", "diff": "medium"},
        {"text": "How do self-balancing trees (AVL, Red-Black) guarantee O(log n) operations?", "a": "By using tree rotations to maintain bounded height", "b": "By storing all keys in an array", "c": "By limiting the tree to 3 nodes", "d": "By converting to a hash map", "ans": "A", "exp": "Rotations restore height balance after insertions and deletions, maintaining O(log N) depth.", "diff": "medium"},
        {"text": "What is the maximum number of nodes in a full binary tree of height H (where root is height 0)?", "a": "2^(H + 1) - 1", "b": "2^H - 1", "c": "H^2", "d": "2 * H", "ans": "A", "exp": "Summing powers of 2 from 0 to H yields 2^(H + 1) - 1 nodes.", "diff": "hard"},
        # Set 2
        {"text": "What is the height of a balanced AVL tree with N nodes?", "a": "O(log N)", "b": "O(N)", "c": "O(N^2)", "d": "O(1)", "ans": "A", "exp": "AVL tree balance factor guarantees logarithmic height <= 1.44 log2(N).", "diff": "easy"},
        {"text": "Which traversal visits the root node before any of its subtrees?", "a": "Pre-order", "b": "In-order", "c": "Post-order", "d": "Level-order bottom-up", "ans": "A", "exp": "Pre-order sequence is Root -> Left Subtree -> Right Subtree.", "diff": "easy"},
        {"text": "What defines a complete binary tree?", "a": "Every level except possibly the last is completely full, and nodes are left-justified", "b": "All nodes have exactly 3 children", "c": "All leaves reside on different levels", "d": "Every node contains duplicate keys", "ans": "A", "exp": "Completeness allows a binary tree to be compactly represented inside a flat array.", "diff": "medium"},
        {"text": "In a binary heap array representation, what is the index of the parent of node i (0-indexed)?", "a": "(i - 1) // 2", "b": "2 * i + 1", "c": "2 * i + 2", "d": "i // 2", "ans": "A", "exp": "Parent index is floor((i - 1) / 2) under standard 0-indexed heap layout.", "diff": "medium"},
        {"text": "Which tree structure is optimized for disk reads and commonly used in database indexing?", "a": "B-Tree / B+ Tree", "b": "Binary Search Tree", "c": "Splay Tree", "d": "Trie", "ans": "A", "exp": "B-Trees have high branching factors (fanout), minimizing disk block seeks.", "diff": "hard"},
        # Set 3
        {"text": "What is the balance factor in an AVL tree?", "a": "Height(left subtree) - Height(right subtree)", "b": "Number of left nodes minus right nodes", "c": "Total depth divided by 2", "d": "The root value", "ans": "A", "exp": "AVL trees require balance factor of every node to be strictly in {-1, 0, 1}.", "diff": "medium"},
        {"text": "In a Red-Black Tree, what is the constraint on consecutive red nodes?", "a": "No two red nodes can be adjacent (a red node must have black children)", "b": "Red nodes can only have red children", "c": "Every node must be red", "d": "Leaves must be red", "ans": "A", "exp": "Red-Black properties forbid adjacent red nodes, bounding the longest path to at most twice the shortest.", "diff": "medium"},
        {"text": "Which tree traversal is commonly used to evaluate mathematical expression trees?", "a": "Post-order traversal", "b": "Pre-order traversal", "c": "Breadth-first traversal", "d": "Random walk", "ans": "A", "exp": "Post-order evaluates left child and right child before applying root operator.", "diff": "medium"},
        {"text": "What is a Trie (Prefix Tree) best suited for?", "a": "Fast prefix lookups and autocomplete over sets of strings", "b": "Sorting numerical arrays", "c": "Calculating shortest path in graphs", "d": "Matrix multiplication", "ans": "A", "exp": "Tries store characters along paths, providing O(L) lookup time where L is word length.", "diff": "easy"},
        {"text": "What is Lowest Common Ancestor (LCA) of nodes u and v in a binary tree?", "a": "The deepest node that has both u and v as descendants", "b": "The root of the tree always", "c": "The smallest key between u and v", "d": "The node with highest degree", "ans": "A", "exp": "LCA is the lowest shared ancestor node containing both target nodes in its subtrees.", "diff": "medium"}
    ],
    "Graphs": [
        # Set 1
        {"text": "Which graph representation is most space-efficient for sparse graphs where |E| << |V|^2?", "a": "Adjacency List", "b": "Adjacency Matrix", "c": "Truth Table", "d": "Incidence Cube", "ans": "A", "exp": "An adjacency list consumes O(|V| + |E|) space rather than O(|V|^2) for a matrix.", "diff": "easy"},
        {"text": "What is the time complexity of Breadth-First Search (BFS) using an adjacency list?", "a": "O(|V| + |E|)", "b": "O(|V| * |E|)", "c": "O(|V|^2)", "d": "O(log |V|)", "ans": "A", "exp": "BFS examines every reachable vertex and edge exactly once with linear time O(|V| + |E|).", "diff": "easy"},
        {"text": "Which algorithm computes the shortest path in a weighted graph with non-negative edge weights?", "a": "Dijkstra's Algorithm", "b": "Floyd-Warshall", "c": "Kosaraju Algorithm", "d": "Kruskal Algorithm", "ans": "A", "exp": "Dijkstra's greedy algorithm using a min-heap finds single-source shortest paths in O((|V| + |E|) log |V|).", "diff": "medium"},
        {"text": "What does Topological Sort achieve on a Directed Acyclic Graph (DAG)?", "a": "A linear ordering of vertices such that for every directed edge (u, v), u comes before v", "b": "Finds all cycles in the graph", "c": "Constructs a minimum spanning forest", "d": "Computes max flow", "ans": "A", "exp": "Topological sorting orders dependencies linearly, crucial for task scheduling and compilers.", "diff": "medium"},
        {"text": "Which algorithm detects negative weight cycles in a directed graph?", "a": "Bellman-Ford Algorithm", "b": "Dijkstra's Algorithm", "c": "Prim's Algorithm", "d": "BFS", "ans": "A", "exp": "Bellman-Ford relaxes edges |V|-1 times; a further relaxation indicates a negative cycle.", "diff": "hard"},
        # Set 2
        {"text": "Which algorithm finds the Minimum Spanning Tree (MST) by sorting all edges and adding them using Disjoint Set Union (DSU)?", "a": "Kruskal's Algorithm", "b": "Prim's Algorithm", "c": "Dijkstra's Algorithm", "d": "Tarjan's Algorithm", "ans": "A", "exp": "Kruskal's greedy algorithm sorts edges by weight and uses Union-Find to prevent cycles.", "diff": "medium"},
        {"text": "What is the time complexity of the Floyd-Warshall all-pairs shortest path algorithm?", "a": "O(|V|^3)", "b": "O(|V|^2)", "c": "O(|V| * |E|)", "d": "O(|E| log |V|)", "ans": "A", "exp": "Floyd-Warshall evaluates three nested loops across all vertices in O(V^3) time.", "diff": "medium"},
        {"text": "Which algorithm finds strongly connected components (SCCs) in a directed graph in linear time using a single DFS traversal?", "a": "Tarjan's Algorithm", "b": "Kruskal's Algorithm", "c": "Bellman-Ford", "d": "Boruvka's Algorithm", "ans": "A", "exp": "Tarjan's algorithm tracks discovery times and low-link values on a stack in O(|V| + |E|) time.", "diff": "hard"},
        {"text": "What is a bipartite graph?", "a": "A graph whose vertices can be divided into two disjoint sets such that every edge connects vertices across the two sets", "b": "A graph with exactly two edges", "c": "A graph with two connected components", "d": "A directed cycle", "ans": "A", "exp": "Bipartite graphs can be 2-colored, containing no odd-length cycles.", "diff": "medium"},
        {"text": "What condition must be satisfied for an undirected connected graph to have an Eulerian Circuit?", "a": "Every vertex must have an even degree", "b": "The graph must be a tree", "c": "All edge weights must be equal", "d": "The graph must have no cycles", "ans": "A", "exp": "Euler's theorem states that a connected graph has an Eulerian circuit iff every vertex has even degree.", "diff": "hard"},
        # Set 3
        {"text": "What is the degree of a vertex in an undirected graph?", "a": "The number of edges incident to that vertex", "b": "The length of the shortest path to the root", "c": "The vertex value", "d": "The number of cycles containing it", "ans": "A", "exp": "Degree counts connections touching that vertex; handshaking lemma states sum of degrees is 2|E|.", "diff": "easy"},
        {"text": "What data structure does Prim's algorithm use to pick the minimum weight cut edge efficiently?", "a": "Min-Priority Queue (Binary Heap or Fibonacci Heap)", "b": "FIFO Queue", "c": "Stack", "d": "Hash table", "ans": "A", "exp": "Prim grows an MST outward by popping minimum distance unvisited vertices from a min-heap.", "diff": "medium"},
        {"text": "Can a graph with a directed cycle be topologically sorted?", "a": "No, topological sort is strictly defined only for Directed Acyclic Graphs (DAGs)", "b": "Yes, if the cycle is ignored", "c": "Yes, by reversing edges", "d": "Always possible for any directed graph", "ans": "A", "exp": "Cycles create circular dependencies that make linear ordering impossible.", "diff": "easy"},
        {"text": "What is the diameter of a graph?", "a": "The greatest shortest path distance between any pair of vertices", "b": "The total number of vertices", "c": "The maximum degree of any node", "d": "The number of edges in the MST", "ans": "A", "exp": "Graph diameter measures the maximum eccentricity over all vertices.", "diff": "medium"},
        {"text": "Which algorithm computes Maximum Flow in a flow network in O(|V| * |E|^2) time?", "a": "Edmonds-Karp Algorithm (BFS-based Ford-Fulkerson)", "b": "Dijkstra", "c": "Kruskal", "d": "A* Search", "ans": "A", "exp": "Edmonds-Karp uses BFS to find shortest augmenting paths in polynomial time.", "diff": "hard"}
    ]
}


def _generate_dynamic_topic_questions(topic_name: str, material_text: str, seen_set: set, count: int = 5, set_number: int = 1) -> List[Dict[str, Any]]:
    clean_name = topic_name.strip()
    questions = []

    base_templates = [
        {
            "stem": f"Which statement best characterizes the core functionality and role of {clean_name}?",
            "a": f"It provides a structured mechanism to organize, process, and manipulate {clean_name} concepts with predictable runtime behavior.",
            "b": f"It is a deprecated hardware architecture module reserved for low-level BIOS drivers.",
            "c": f"It converts all code executions into uncompressed audio streams.",
            "d": f"It forces synchronous execution by disabling system memory completely.",
            "ans": "A",
            "exp": f"{clean_name} establishes foundational semantics for managing data structures and algorithm flow correctly in modern systems.",
            "diff": "easy"
        },
        {
            "stem": f"When implementing algorithms involving {clean_name}, what is the primary computational trade-off?",
            "a": f"Balancing space complexity overhead against operational throughput and retrieval speed.",
            "b": f"Choosing between GPU clock speeds and display monitor refresh rates.",
            "c": f"Deciding whether to format strings as uppercase or lowercase.",
            "d": f"Minimizing variable character counts to save disk space.",
            "ans": "A",
            "exp": f"Algorithm optimization around {clean_name} involves optimizing algorithmic bounds (Big-O time vs auxiliary space).",
            "diff": "medium"
        },
        {
            "stem": f"What is a standard best practice or invariant when working with {clean_name}?",
            "a": f"Ensuring proper initialization, boundary validation, and lifecycle resource management to prevent undefined behavior.",
            "b": f"Hardcoding literal index values throughout the global namespace.",
            "c": f"Reallocating operating system memory manually before every operation.",
            "d": f"Disabling exception handling and error catching.",
            "ans": "A",
            "exp": f"Proper defensive programming with {clean_name} necessitates bounds checking, invariant validation, and correct error handling.",
            "diff": "medium"
        },
        {
            "stem": f"What edge case or failure mode must be handled defensively when executing operations on {clean_name}?",
            "a": f"Handling empty inputs, boundary limit transitions, or unexpected data types gracefully.",
            "b": f"Overheating hardware cache lines during single read operations.",
            "c": f"Operating system kernel panic during variable declaration.",
            "d": f"Automatic deletion of system files upon reaching index 0.",
            "ans": "A",
            "exp": f"Boundary conditions (such as empty inputs, null pointers, or off-by-one indices) are the primary failure modes for {clean_name}.",
            "diff": "hard"
        },
        {
            "stem": f"How does the concept of {clean_name} integrate into higher-level software system design?",
            "a": f"It acts as a modular building block enabling abstraction, code reusability, and maintainability across components.",
            "b": f"It requires replacing the entire underlying operating system kernel.",
            "c": f"It is only applicable in single-threaded command-line scripts.",
            "d": f"It disables network communication protocols.",
            "ans": "A",
            "exp": f"Encapsulation and abstraction around {clean_name} allow complex architectures to decouple implementation details from high-level business logic.",
            "diff": "medium"
        },
        {
            "stem": f"In terms of scalability and algorithmic efficiency, how does {clean_name} behave as input size N grows large?",
            "a": f"Its asymptotic performance scales according to its governing time complexity, requiring careful selection of subroutines.",
            "b": f"Execution time remains exactly 1 millisecond regardless of N.",
            "c": f"Memory consumption automatically resets to zero on every iteration.",
            "d": f"It triggers an unrecoverable infinite loop on any input exceeding 100 items.",
            "ans": "A",
            "exp": f"Scalability of {clean_name} depends on asymptotic complexity; choosing optimal representations avoids exponential degradation.",
            "diff": "hard"
        },
        {
            "stem": f"Which diagnostic approach is most effective when debugging errors or performance bottlenecks in {clean_name}?",
            "a": f"Profiling memory allocations, inspecting state transitions, and step-through debugging unit test invariants.",
            "b": f"Deleting all source code comments and restarting the computer.",
            "c": f"Increasing variable font size in the text editor.",
            "d": f"Reinstalling the graphics card driver.",
            "ans": "A",
            "exp": f"Systematic debugging of {clean_name} combines unit testing, state verification, and profiling profiling tools.",
            "diff": "easy"
        }
    ]

    for i, t in enumerate(base_templates):
        suffix = f" (Assessment Set {set_number} - Focus {i+1})"
        q_text = t["stem"] + suffix
        q_hash = hashlib.md5((clean_name + q_text).encode("utf-8")).hexdigest()[:12]
        if q_hash not in seen_set:
            seen_set.add(q_hash)
            questions.append({
                "id": f"mat-q-dyn-{q_hash}",
                "question_text": q_text,
                "option_a": t["a"],
                "option_b": t["b"],
                "option_c": t["c"],
                "option_d": t["d"],
                "correct_answer": t["ans"],
                "explanation": t["exp"],
                "difficulty": t["diff"],
                "hash": q_hash
            })
            if len(questions) >= count:
                break

    return questions


def _detect_topics_from_text(text: str, filename: str) -> List[Dict[str, Any]]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    topics = []
    seen_topic_names = set()

    def add_topic(raw_name: str, context_summary: Optional[str] = None, unit_name: Optional[str] = None):
        clean = re.sub(r"^[0-9\.\-\*\u2022\u2013\s]+", "", raw_name).strip()
        clean = re.sub(r"[:\-\u2013\s]+$", "", clean).strip()
        clean = re.sub(r"^(?:unit|module|chapter)\s*[0-9ivxlcdm]+[:\.\-\s]+", "", clean, flags=re.IGNORECASE).strip()
        clean = re.sub(r"^(?:topic|section)[:\.\-\s]+", "", clean, flags=re.IGNORECASE).strip()
        if " - " in clean:
            clean = clean.split(" - ")[0].strip()
        elif ":" in clean:
            clean = clean.split(":")[0].strip()

        if 2 <= len(clean) <= 50 and clean.lower() not in seen_topic_names:
            if not any(f in clean.lower() for f in [
                "syllabus", "course outline", "page ", "lecture hour", "credits", "prerequisite",
                "reference book", "textbook", "marks", "university", "department", "objective",
                "outcomes", "evaluation", "grading", "attendance"
            ]):
                seen_topic_names.add(clean.lower())
                summary = context_summary or f"Syllabus topic: {clean} extracted from {filename}."
                for l in lines:
                    if clean.lower() in l.lower() and len(l) > len(clean):
                        summary = l
                        break
                safe_id = f"top-{clean.lower().replace(' ', '-').replace('&', 'and')}"
                safe_id = re.sub(r"[^a-z0-9\-]", "", safe_id)
                topics.append({
                    "id": safe_id,
                    "name": clean,
                    "unit": unit_name,
                    "summary": summary,
                    "match_score": text.lower().count(clean.lower())
                })

    # Strategy 1: Hierarchy parsing via parse_syllabus_hierarchy
    try:
        parsed_hierarchy = parse_syllabus_hierarchy(text, filename)
        for u in parsed_hierarchy.get("units", []):
            u_title = u.get("title", "").strip()
            u_topics = u.get("topics", [])
            for t in u_topics:
                t_title = t.get("title", "").strip()
                if t_title and t_title.lower() not in ["core topics", "primary concepts", "concepts"]:
                    add_topic(t_title, context_summary=f"{u_title}: {t_title}", unit_name=u_title)
                    for sub_c in t.get("concepts", []):
                        if isinstance(sub_c, str) and len(sub_c.strip()) >= 3:
                            add_topic(sub_c, context_summary=f"{u_title}: {sub_c}", unit_name=u_title)
            if not u_topics or len(topics) < 2:
                u_title = u.get("title", "").strip()
                add_topic(u_title, unit_name=u_title)
    except Exception as e:
        pass

    # Strategy 2: Explicit Topic: / Section: in text lines
    if len(topics) < 2:
        for line in lines:
            if re.match(r"^(?:topic|section)[:\.\-\s]+", line, re.IGNORECASE):
                add_topic(line)

    # Strategy 3: Unit headers 'Unit X: <Topic>'
    if len(topics) < 2:
        for line in lines:
            if re.match(r"^(?:unit|module|chapter)\s*[0-9ivxlcdm]+[:\.\-\s]+", line, re.IGNORECASE):
                add_topic(line, unit_name=line)

    # Strategy 4: Numbered list items (e.g. '1. Arrays', '2. Linked Lists') or bullet points
    if len(topics) < 2:
        for line in lines:
            if re.match(r"^[\-\*\u2022\u2013]\s+([A-Za-z0-9].+)$", line):
                add_topic(line)
            elif re.match(r"^[0-9]{1,2}\.\s+([A-Z][A-Za-z0-9\s,\-\u2013&]+)$", line):
                add_topic(line)

    # Strategy 5: Standalone short titles
    if len(topics) < 2:
        for line in lines:
            if 3 <= len(line) <= 45 and not line.endswith(".") and not line.startswith("http"):
                add_topic(line)

    return topics[:15]



@router.post("/quiz/upload-material")
async def upload_quiz_study_material(file: UploadFile = File(...)):
    filename = file.filename or "Study_Material.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files (.pdf) are supported for study material processing.")

    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {e}")

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        text = extract_text_from_pdf(content)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Unable to extract text from PDF: {e}")

    topics = _detect_topics_from_text(text, filename)
    material_id = f"mat-{uuid.uuid4().hex[:8]}"

    QUIZ_MATERIALS_STORE[material_id] = {
        "filename": filename,
        "text": text,
        "topics": topics,
        "uploaded_at": datetime.datetime.now().isoformat()
    }

    return {
        "material_id": material_id,
        "filename": filename,
        "text_length": len(text),
        "topics": [
            {
                "id": t["id"],
                "name": t["name"],
                "unit": t.get("unit"),
                "summary": t["summary"],
                "question_count": 5
            }
            for t in topics
        ]
    }


@router.post("/quiz/load-sample-material")
def load_sample_quiz_study_material():
    sample_text = (
        "Python Programming and Data Structures Study Guide.\n"
        "Unit 1: Variables, Data Types, and Operators. Variables store memory references. Dynamic typing determines types at runtime. Arithmetic and comparison operators govern expressions.\n"
        "Unit 2: Functions, Lists, and Tuples. Functions are defined using def with return values, parameters, and closures. Lists are mutable contiguous sequences supporting append and list comprehensions. Tuples are immutable sequences.\n"
        "Unit 3: File Handling and Exceptions. Files are opened using context managers 'with open' for reading and writing. Exceptions handle runtime failures using try, except, and finally blocks.\n"
        "Unit 4: Recursion and Hierarchies. Recursion uses base cases to terminate and call stack frames for state management.\n"
        "Unit 5: Linear Structures: Arrays, Stacks, and Queues. Stacks operate using LIFO mechanics with push and pop. Queues operate using FIFO mechanics with enqueue and dequeue.\n"
        "Unit 6: Hierarchical and Network Structures: Trees and Graphs. Binary Search Trees maintain sorted invariant with in-order traversal. Graphs model networks with vertices and edges explored via BFS and DFS."
    )
    topics = _detect_topics_from_text(sample_text, "Python_and_DSA_Guide.pdf")
    material_id = f"mat-sample-{uuid.uuid4().hex[:6]}"

    QUIZ_MATERIALS_STORE[material_id] = {
        "filename": "Python_and_DSA_Study_Guide.pdf",
        "text": sample_text,
        "topics": topics,
        "uploaded_at": datetime.datetime.now().isoformat()
    }

    return {
        "material_id": material_id,
        "filename": "Python_and_DSA_Study_Guide.pdf",
        "text_length": len(sample_text),
        "topics": [
            {
                "id": t["id"],
                "name": t["name"],
                "unit": t.get("unit"),
                "summary": t["summary"],
                "question_count": 5
            }
            for t in topics
        ]
    }



@router.post("/quiz/generate-from-material")
def generate_questions_from_study_material(payload: GenerateFromMaterialRequest):
    # Collect target topic names from payload
    target_topics = []
    if payload.topic_names:
        target_topics = [t.strip() for t in payload.topic_names if t.strip()]
    elif payload.topic_name:
        target_topics = [payload.topic_name.strip()]

    if not target_topics:
        raise HTTPException(status_code=400, detail="No topic selected for quiz generation.")

    seen_set = set(payload.seen_hashes)
    material_text = ""
    if payload.material_id and payload.material_id in QUIZ_MATERIALS_STORE:
        material_text = QUIZ_MATERIALS_STORE[payload.material_id].get("text", "")

    all_questions = []

    # Allocate question count per topic
    if len(target_topics) == 1:
        per_topic_count = 5
    elif len(target_topics) == 2:
        per_topic_count = 3
    else:
        per_topic_count = max(2, 6 // len(target_topics))

    for t_name in target_topics:
        safe_tid = f"top-{t_name.lower().replace(' ', '-').replace('&', 'and')}"
        safe_tid = re.sub(r'[^a-z0-9\-]', '', safe_tid)

        matched_key = None
        for k in TOPIC_QUESTION_BANKS:
            if k.lower() in t_name.lower() or t_name.lower() in k.lower():
                matched_key = k
                break

        bank_qs = TOPIC_QUESTION_BANKS.get(matched_key, []) if matched_key else []
        topic_qs = []

        for idx, q in enumerate(bank_qs):
            q_hash = hashlib.md5((t_name + q["text"]).encode("utf-8")).hexdigest()[:12]
            if payload.mode == "retake" or q_hash not in seen_set:
                topic_qs.append({
                    "id": f"mat-q-{safe_tid}-{idx}-{q_hash}",
                    "topic_id": safe_tid,
                    "topic_name": t_name,
                    "question_text": q["text"],
                    "option_a": q["a"],
                    "option_b": q["b"],
                    "option_c": q["c"],
                    "option_d": q["d"],
                    "correct_answer": q["ans"],
                    "explanation": q["exp"],
                    "difficulty": q["diff"],
                    "hash": q_hash
                })
                if len(topic_qs) >= per_topic_count:
                    break

        if len(topic_qs) < per_topic_count:
            needed = per_topic_count - len(topic_qs)
            dynamic_qs = _generate_dynamic_topic_questions(
                t_name, material_text, seen_set, count=needed, set_number=payload.set_number
            )
            for dq in dynamic_qs:
                dq["topic_id"] = safe_tid
                dq["topic_name"] = t_name
            topic_qs.extend(dynamic_qs)

        all_questions.extend(topic_qs[:per_topic_count])

    return {
        "has_more": True,
        "set_number": payload.set_number,
        "topic_name": ", ".join(target_topics) if len(target_topics) > 1 else target_topics[0],
        "topics": target_topics,
        "questions": all_questions
    }


# ---------------------------------------------------------------------------
# Material Quiz Result Persistence & DK Tracker Synchronization
# ---------------------------------------------------------------------------

class TopicQuizResultItem(BaseModel):
    topic_id: str
    topic_name: str
    score: float  # 0.0 to 100.0
    total_questions: int
    correct_count: int
    percentage: int
    attempts: int = 1
    feedback: Optional[List[Dict[str, Any]]] = []

class MaterialQuizSubmitRequest(BaseModel):
    student_id: str
    material_id: Optional[str] = None
    material_name: Optional[str] = None
    overall_score: float
    total_questions: int
    correct_count: int
    set_number: int = 1
    topic_results: List[TopicQuizResultItem]

@router.post("/quiz/submit-material-quiz")
def submit_material_quiz(payload: MaterialQuizSubmitRequest, db: Session = Depends(get_db)):
    """Persists quiz results for all selected topics into SQLite database."""
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    now = datetime.datetime.now(datetime.timezone.utc)
    updated_topics = []

    for item in payload.topic_results:
        # Find or create Concept with clean slug
        safe_cid = item.topic_id or f"top-{item.topic_name.lower().replace(' ', '-').replace('&', 'and')}"
        safe_cid = re.sub(r'[^a-z0-9\-]', '', safe_cid)
        if not safe_cid.startswith("top-"):
            safe_cid = f"top-{safe_cid}"

        concept = db.query(Concept).filter(Concept.id == safe_cid).first()
        if not concept:
            concept = Concept(
                id=safe_cid,
                slug=safe_cid,
                name=item.topic_name.strip(),
                topic_name=item.topic_name.strip(),
                unit_name="Syllabus Topics",
                order_index=len(updated_topics) + 1
            )
            db.add(concept)
            db.flush()

        stability = classify_stability(item.score)

        # Find or update Mastery
        mastery = db.query(Mastery).filter(
            Mastery.student_id == student.id,
            Mastery.concept_id == concept.id
        ).first()

        if mastery:
            mastery.mastery_score = float(item.score)
            mastery.stability = stability
            mastery.last_practiced = now
            mastery.updated_at = now
        else:
            m_id = f"m-{student.id[:10]}-{concept.id[:20]}-{uuid.uuid4().hex[:6]}"
            mastery = Mastery(
                id=m_id,
                student_id=student.id,
                concept_id=concept.id,
                mastery_score=float(item.score),
                stability=stability,
                last_practiced=now,
                updated_at=now
            )
            db.add(mastery)

        # Persist attempt record in MasteryHistory
        history = MasteryHistory(
            student_id=student.id,
            concept_id=concept.id,
            mastery_score=float(item.score),
            recorded_at=now,
            note=f"Quiz Set {payload.set_number}: {item.correct_count}/{item.total_questions} ({item.score:.0f}%)"
        )
        db.add(history)

        # Also sync to core demo concept if matching (e.g. Recursion, Trees, Functions, Arrays, Graphs)
        demo_aliases = {
            "functions": "concept-functions",
            "concept-functions": "concept-functions",
            "arrays": "concept-arrays",
            "concept-arrays": "concept-arrays",
            "recursion": "concept-recursion",
            "concept-recursion": "concept-recursion",
            "trees": "concept-trees",
            "concept-trees": "concept-trees",
            "graphs": "concept-graphs",
            "concept-graphs": "concept-graphs",
        }
        matched_demo_id = demo_aliases.get(item.topic_name.strip().lower()) or demo_aliases.get((item.topic_id or "").lower())
        if matched_demo_id:
            demo_m = db.query(Mastery).filter(
                Mastery.student_id == student.id,
                Mastery.concept_id == matched_demo_id
            ).first()
            if demo_m:
                demo_m.mastery_score = float(item.score)
                demo_m.stability = stability
                demo_m.last_practiced = now
                demo_m.updated_at = now
            else:
                demo_m = Mastery(
                    id=f"m-{student.id[:10]}-{matched_demo_id}-{uuid.uuid4().hex[:6]}",
                    student_id=student.id,
                    concept_id=matched_demo_id,
                    mastery_score=float(item.score),
                    stability=stability,
                    last_practiced=now,
                    updated_at=now
                )
                db.add(demo_m)

        updated_topics.append({
            "id": concept.id,
            "name": concept.name,
            "score": item.score,
            "stability": stability,
            "correct_count": item.correct_count,
            "total_questions": item.total_questions,
            "last_practiced": now.isoformat()
        })

    db.commit()

    return {
        "status": "success",
        "student_id": student.id,
        "overall_score": payload.overall_score,
        "updated_topics": updated_topics
    }


@router.get("/quiz/student-dk-topics/{student_id}")
def get_student_persisted_dk_topics(student_id: str, db: Session = Depends(get_db)):
    """Fetch tracked DK topics and progression history for a student directly from SQLite."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    mastery_records = db.query(Mastery).filter(
        Mastery.student_id == student.id,
        Mastery.concept_id.like("top-%")
    ).all()
    history_records = db.query(MasteryHistory).filter(MasteryHistory.student_id == student.id).order_by(MasteryHistory.recorded_at).all()

    hist_by_cid = {}
    for h in history_records:
        if h.concept_id not in hist_by_cid:
            hist_by_cid[h.concept_id] = []
        hist_by_cid[h.concept_id].append({
            "score": round(h.mastery_score),
            "date": h.recorded_at.isoformat() if h.recorded_at else datetime.datetime.utcnow().isoformat(),
            "note": h.note
        })

    concepts_map = {c.id: c for c in db.query(Concept).all()}
    now = datetime.datetime.now(datetime.timezone.utc)
    dk_topics = []

    for m in mastery_records:
        c = concepts_map.get(m.concept_id)
        c_name = c.name if c else m.concept_id
        m_dt = m.last_practiced.replace(tzinfo=datetime.timezone.utc) if m.last_practiced and m.last_practiced.tzinfo is None else m.last_practiced
        days_ago = (now - m_dt).days if m_dt else 0
        hist = hist_by_cid.get(m.concept_id, [])
        peak = max([h["score"] for h in hist] + [round(m.mastery_score)])

        dk_topics.append({
            "id": m.concept_id,
            "name": c_name,
            "summary": c.description if c and c.description else f"Tracked topic: {c_name}",
            "current_mastery": round(m.mastery_score),
            "peak_mastery": peak,
            "days_since_practice": days_ago,
            "stability": m.stability,
            "assessed": True,
            "historical_points": hist,
            "attempts": len(hist) if hist else 1,
            "last_practiced": m_dt.isoformat() if m_dt else None
        })

    return {"topics": dk_topics}
