import json
import uuid
import re
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.entities import Question, Concept
from app.config import settings

def _call_gemini_for_questions(
    concept_name: str,
    used_question_texts: List[str],
    count: int = 5
) -> Optional[List[Dict[str, Any]]]:
    """Attempt generating fresh questions via Google Gemini API if configured."""
    api_key = settings.GEMINI_API_KEY
    if not api_key or not api_key.strip():
        return None

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        model_name = settings.GEMINI_MODEL or "gemini-3.5-flash-lite"

        exclusion_text = ""
        if used_question_texts:
            sample_exclusions = used_question_texts[:8]
            exclusion_text = (
                "Do NOT duplicate or closely rephrase any of these previously asked questions:\n"
                + "\n".join(f"- {q}" for q in sample_exclusions)
            )

        prompt = f"""You are a computer science professor creating multiple-choice diagnostic quiz questions for the topic: '{concept_name}'.
Generate exactly {count} fresh, unique multiple choice questions testing practical programming and conceptual mastery.

{exclusion_text}

Each question MUST test a distinct angle (e.g. implementation mechanics, edge cases, algorithmic complexity, runtime tracing, or design principles).

Return ONLY a valid JSON array of {count} objects with these exact keys:
[
  {{
    "question_text": "Question statement here",
    "option_a": "Option A text",
    "option_b": "Option B text",
    "option_c": "Option C text",
    "option_d": "Option D text",
    "correct_answer": "A", // Single uppercase letter 'A', 'B', 'C', or 'D'
    "explanation": "Brief explanation why the answer is correct",
    "difficulty": "medium" // 'easy', 'medium', or 'hard'
  }}
]"""

        config = types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=1800,
            response_mime_type="application/json"
        )

        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=config
        )

        if response and response.text:
            cleaned = response.text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            parsed = json.loads(cleaned)
            if isinstance(parsed, list) and len(parsed) > 0:
                validated = []
                for item in parsed:
                    if (
                        "question_text" in item
                        and "option_a" in item
                        and "option_b" in item
                        and "option_c" in item
                        and "option_d" in item
                        and item.get("correct_answer") in ("A", "B", "C", "D")
                    ):
                        validated.append(item)
                if len(validated) >= 1:
                    return validated[:count]
    except Exception as e:
        print(f"[QuestionGenerator] Gemini generation fallback to procedural generator: {e}")

    return None


def _generate_procedural_questions(
    concept_id: str,
    concept_name: str,
    count: int = 5,
    set_number: int = 2
) -> List[Dict[str, Any]]:
    """
    Robust procedural question generator that creates distinct, well-calibrated
    computer science / engineering questions when AI is offline or pool is exhausted.
    """
    name_clean = concept_name.strip()
    name_lower = name_clean.lower()

    # Varied question themes for practice sets
    templates = [
        # Theme 1: Runtime Complexity & Memory
        {
            "text": f"When scaling systems that heavily utilize {name_clean}, what is the primary computational or memory trade-off?",
            "a": f"Time complexity decreases linearly while heap memory consumption increases proportionally to input scale.",
            "b": f"It reduces CPU instruction count to zero by shifting logic to the kernel.",
            "c": f"It guarantees O(1) space regardless of recursion depth or data cardinality.",
            "d": f"It eliminates the need for boundary invariant checks.",
            "ans": "A",
            "diff": "medium",
            "exp": f"Scaling {name_clean} requires balancing computational throughput against dynamic auxiliary memory allocations."
        },
        # Theme 2: Edge Case & Bug Prevention
        {
            "text": f"Which common software defect or edge-case vulnerability is most frequently associated with improper use of {name_clean}?",
            "a": f"Premature garbage collection of unreferenced stack pointers.",
            "b": f"Off-by-one boundary violations or invalid base-state termination conditions.",
            "c": f"Automatic conversion of synchronous calls into distributed RPCs.",
            "d": f"Corrupted network sockets caused by scalar overflows.",
            "ans": "B",
            "diff": "medium",
            "exp": f"Reliable implementation of {name_clean} mandates exhaustive validation of edge boundaries and halting invariants."
        },
        # Theme 3: Design Patterns & Architecture
        {
            "text": f"In clean architectural design, how should {name_clean} be structured to maximize maintainability and testability?",
            "a": f"By tightly coupling internal state with global application singletons.",
            "b": f"By isolating operations into modular, idempotent units with explicit dependencies and parameter contracts.",
            "c": f"By inlining all branching logic inside a single monolithic execution block.",
            "d": f"By disabling static type checking across compilation boundaries.",
            "ans": "B",
            "diff": "hard",
            "exp": f"Encapsulating {name_clean} into decoupled, modular units promotes referential transparency and predictable unit testing."
        },
        # Theme 4: Execution Mechanics & Tracing
        {
            "text": f"During runtime execution of an algorithm dependent on {name_clean}, what sequence occurs when invalid inputs are supplied?",
            "a": f"The runtime immediately compiles the routine to native microcode.",
            "b": f"An unhandled state or exception propagates up the call stack unless defensive guards or validation handles it.",
            "c": f"Database indexes are automatically rebuilt asynchronously.",
            "d": f"All memory allocations are redirected to static registers.",
            "ans": "B",
            "diff": "easy",
            "exp": f"Supplying malformed data to {name_clean} operations triggers runtime errors unless defensive guard clauses validate input contracts."
        },
        # Theme 5: Optimal Use-Case Scenario
        {
            "text": f"In which real-world scenario is applying {name_clean} strictly superior to naive iterative alternatives?",
            "a": f"When sequential array elements only need to be printed once in order.",
            "b": f"When solving problems exhibiting natural hierarchical decomposition, inductive substructure, or state transitions.",
            "c": f"When storing fixed-size configuration flags in binary registers.",
            "d": f"When performing synchronous disk I/O on single-threaded hardware.",
            "ans": "B",
            "diff": "medium",
            "exp": f"{name_clean} provides optimal declarative expressiveness and efficiency for problems possessing recursive substructure or topological hierarchy."
        },
        # Theme 6: Comparative Refactoring
        {
            "text": f"When refactoring legacy code that misapplies {name_clean}, what is the most effective optimization technique?",
            "a": f"Replacing ad-hoc repetitive operations with memoized lookups or calibrated state management.",
            "b": f"Replacing all data structures with unstructured global pointers.",
            "c": f"Hardcoding return values for all non-trivial arguments.",
            "d": f"Removing defensive assertion checks to increase throughput.",
            "ans": "A",
            "diff": "hard",
            "exp": f"Applying memoization or state-caching eliminates redundant recomputation in {name_clean} workflows."
        }
    ]

    # Rotate / offset templates based on set_number
    offset = ((set_number - 1) * 2) % len(templates)
    rotated = templates[offset:] + templates[:offset]

    questions = []
    for idx, tmpl in enumerate(rotated[:count]):
        uid = f"q-{concept_id}-s{set_number}-{uuid.uuid4().hex[:6]}"
        questions.append({
            "id": uid,
            "concept_id": concept_id,
            "question_text": tmpl["text"],
            "option_a": tmpl["a"],
            "option_b": tmpl["b"],
            "option_c": tmpl["c"],
            "option_d": tmpl["d"],
            "correct_answer": tmpl["ans"],
            "explanation": tmpl["exp"],
            "difficulty": tmpl["diff"]
        })

    return questions


def generate_and_persist_new_questions_for_concept(
    concept_id: str,
    concept_name: str,
    used_question_texts: List[str],
    count: int = 5,
    set_number: int = 2,
    db: Session = None
) -> List[Question]:
    """
    Generates genuinely new, distinct questions for a concept and persists them into the DB.
    First tries Gemini AI; if unavailable, uses calibrated procedural generation.
    """
    raw_data = _call_gemini_for_questions(concept_name, used_question_texts, count)

    if not raw_data or len(raw_data) < count:
        needed = count - (len(raw_data) if raw_data else 0)
        procedural = _generate_procedural_questions(concept_id, concept_name, count=needed, set_number=set_number)
        raw_data = (raw_data or []) + procedural

    new_questions = []
    for item in raw_data[:count]:
        qid = item.get("id") or f"q-{concept_id}-gen-{uuid.uuid4().hex[:8]}"
        q_obj = Question(
            id=qid,
            concept_id=concept_id,
            question_text=item["question_text"],
            option_a=item["option_a"],
            option_b=item["option_b"],
            option_c=item["option_c"],
            option_d=item["option_d"],
            correct_answer=item.get("correct_answer", "A").upper(),
            explanation=item.get("explanation", f"Conceptual mastery question on {concept_name}."),
            difficulty=item.get("difficulty", "medium")
        )
        if db:
            existing = db.query(Question).filter(Question.id == qid).first()
            if not existing:
                db.add(q_obj)
        new_questions.append(q_obj)

    if db:
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"[QuestionGenerator] Error committing new questions: {e}")

    return new_questions
