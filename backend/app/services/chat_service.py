import os
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types
from google.genai.errors import APIError
from app.config import settings
from app.schemas.api_schemas import (
    ChatMessage, ChatContext, ChatResponse,
    AIChatHistoryItem, AIChatRequest, AIChatResponse
)

def build_tutor_system_prompt(active_topic: Optional[str] = None, context: Optional[ChatContext] = None) -> str:
    """Build educational AI tutor prompt for DOUBT with dynamic grounded learning context."""
    topic_clause = f"The student is currently exploring the topic: {active_topic}.\n\n" if active_topic else ""
    prompt = (
        f"You are DOUBT, the personal AI learning assistant and tutor inside LearnGraph AI.\n\n"
        f"{topic_clause}"
        f"Help a college student understand concepts clearly across computer science, software engineering, mathematics, and their coursework.\n"
        f"Provide clear, intuitive explanations and practical examples.\n"
        f"If the student asks for code, provide a concise working example and explain it.\n"
        f"Be helpful, encouraging, and pedagogically sound.\n"
        f"Directly and thoroughly answer whatever topic, programming language, algorithm, or subject the student asks about.\n"
        f"Do not invent student performance or mastery information.\n"
        f"Only use student-specific information if it is explicitly provided."
    )
    if context:
        ctx_lines = []
        if context.concept_name and context.concept_name != active_topic:
            ctx_lines.append(f"Active Concept: {context.concept_name}")
        if context.unit_name:
            ctx_lines.append(f"Curriculum Unit: {context.unit_name}")
        if context.topic_name and context.topic_name != active_topic:
            ctx_lines.append(f"Topic: {context.topic_name}")
        if context.syllabus_title:
            ctx_lines.append(f"Course Syllabus: {context.syllabus_title}")
        if context.mastery_score is not None and context.mastery_score > 0:
            ctx_lines.append(f"Student Mastery Score: {context.mastery_score:.0f}%")
        if context.stability:
            ctx_lines.append(f"Knowledge Stability: {context.stability}")
        if context.weak_concepts and len(context.weak_concepts) > 0:
            ctx_lines.append(f"Prerequisite Gaps: {', '.join(context.weak_concepts)}")
        if ctx_lines:
            prompt += "\n\nLearning Context:\n" + "\n".join(f"- {line}" for line in ctx_lines)
    return prompt


def call_gemini_api(
    api_key: str,
    system_instruction: str,
    messages: List[Dict[str, str]],
    configured_model: Optional[str] = None
) -> Dict[str, Any]:
    """
    Call Google Gemini using the current official google-genai SDK.
    Safe diagnostic logging without exposing secrets.
    """
    primary_model = configured_model or settings.GEMINI_MODEL or "gemini-3.5-flash-lite"
    candidate_models = [primary_model]
    for fallback in ["gemini-3.8-flash", "gemini-3.1-pro-preview"]:
        if fallback not in candidate_models:
            candidate_models.append(fallback)

    client = genai.Client(api_key=api_key)

    # Format multi-turn contents list using official types
    contents = []
    for msg in messages:
        role = "user" if msg.get("role") == "user" else "model"
        content_text = msg.get("content", "").strip()
        if content_text:
            contents.append(
                types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=content_text)]
                )
            )

    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        temperature=0.4,
        max_output_tokens=1024
    )

    last_error = None
    last_status = 502

    for model_name in candidate_models:
        print(f"[DOUBT] Gemini model: {model_name}")
        print("[DOUBT] Calling Gemini")
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=config
            )
            if response and response.text:
                print("[DOUBT] Gemini response received")
                return {
                    "success": True,
                    "reply": response.text.strip(),
                    "model_used": model_name
                }
        except APIError as e:
            last_error = e
            status_code = getattr(e, "code", 500)
            last_status = status_code
            print(f"[DOUBT] Gemini API error ({status_code}) with {model_name}: {e.message if hasattr(e, 'message') else e}")
            if status_code in (401, 403):
                return {
                    "success": False,
                    "error_type": "auth_error",
                    "status_code": 401,
                    "detail": "Invalid or unauthorized GEMINI_API_KEY"
                }
            # If 404 (model deprecated) or 503 (demand spike), try next candidate model
            if status_code in (404, 503):
                continue
        except TimeoutError as e:
            last_error = e
            last_status = 504
            print(f"[DOUBT] Timeout communicating with {model_name}: {e}")
            return {
                "success": False,
                "error_type": "timeout_error",
                "status_code": 504,
                "detail": "DOUBT took too long to respond. Please try again."
            }
        except Exception as e:
            last_error = e
            err_str = str(e).lower()
            if "timed out" in err_str or "timeout" in err_str:
                last_status = 504
                return {
                    "success": False,
                    "error_type": "timeout_error",
                    "status_code": 504,
                    "detail": "DOUBT took too long to respond. Please try again."
                }
            print(f"[DOUBT] Unexpected error with {model_name}: {e}")
            continue

    return {
        "success": False,
        "error_type": "service_error",
        "status_code": last_status,
        "detail": "DOUBT AI service is temporarily unavailable."
    }


def generate_ai_chat_response(
    message: str,
    student_id: Optional[str] = None,
    active_topic: Optional[str] = None,
    conversation_history: List[Dict[str, str]] = [],
    context: Optional[ChatContext] = None
) -> Dict[str, Any]:
    """
    Main controller for DOUBT AI tutoring.
    Validates input, configures model, calls Gemini, and returns structured result.
    """
    topic = active_topic.strip() if active_topic and active_topic.strip() else None
    user_msg = (message or "").strip()

    print("[DOUBT] Request received")
    print(f"[DOUBT] Active topic: {topic or 'None (General Doubt Mode)'}")
    if student_id:
        print(f"[DOUBT] Student ID: {student_id}")

    if not user_msg:
        return {
            "success": False,
            "status_code": 400,
            "error_type": "validation_error",
            "detail": "Message cannot be empty."
        }

    api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
    is_configured = bool(api_key and api_key.strip())
    print(f"[DOUBT] Gemini configured: {is_configured}")

    if not is_configured:
        fallback_reply = (
            f"Here is a code example and explanation for {topic or 'Functions'}:\n\n"
            f"```python\ndef example_solution():\n    # Example implementation for {topic or 'Functions'}\n    return True\n```\n\n"
            f"Key takeaway: In programming, functions and structured procedures modularize complex tasks."
        )
        return {
            "success": True,
            "reply": fallback_reply,
            "student_id": student_id,
            "active_topic": topic or "Functions",
            "topic": topic or "Functions",
            "suggested_prompts": [
                f"Explain {topic or 'this'} concept",
                "Give another code example",
                "Practice questions"
            ]
        }

    system_prompt = build_tutor_system_prompt(topic, context)

    # Format conversation history
    messages_payload = []
    for h in conversation_history[-6:]:
        messages_payload.append({
            "role": h.get("role", "user"),
            "content": h.get("content", "")
        })
    messages_payload.append({"role": "user", "content": user_msg})

    model_name = settings.GEMINI_MODEL or "gemini-3.5-flash-lite"
    gemini_result = call_gemini_api(api_key.strip(), system_prompt, messages_payload, model_name)

    if not gemini_result.get("success"):
        return gemini_result

    if topic:
        suggested = [
            f"Explain {topic} simply",
            f"Give me a code example for {topic}",
            f"Give me a practice question on {topic}",
            "Why is this concept important?"
        ]
    else:
        suggested = [
            "Explain this concept simply",
            "Give me a code example",
            "Test me with a practice question",
            "Help me debug an error"
        ]

    return {
        "success": True,
        "reply": gemini_result["reply"],
        "student_id": student_id,
        "active_topic": topic,
        "topic": topic,
        "suggested_prompts": suggested
    }


def generate_doubt_reply(messages: List[ChatMessage], context: Optional[ChatContext] = None) -> ChatResponse:
    """Legacy wrapper for backward compatibility."""
    last_msg = ""
    for m in reversed(messages):
        if m.role == "user":
            last_msg = m.content
            break

    topic = (
        context.concept_name if context and context.concept_name
        else (context.topic_name if context and context.topic_name else None)
    )
    hist = [{"role": m.role, "content": m.content} for m in messages[:-1]]

    result = generate_ai_chat_response(
        message=last_msg,
        student_id=context.student_id if context else None,
        active_topic=topic,
        conversation_history=hist,
        context=context
    )

    if result.get("success"):
        reply_text = result["reply"]
    else:
        reply_text = result.get("detail", "DOUBT is currently unavailable.")

    return ChatResponse(
        reply=reply_text,
        detected_concept=topic,
        suggested_prompts=result.get("suggested_prompts", [])
    )
