from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.api_schemas import (
    AIChatRequest, AIChatResponse, ChatRequest, ChatResponse
)
from app.services.chat_service import generate_ai_chat_response, generate_doubt_reply

router = APIRouter(tags=["DOUBT AI Tutor"])

@router.post("/ai/chat", response_model=AIChatResponse)
def ai_chat_endpoint(payload: AIChatRequest, db: Session = Depends(get_db)):
    """
    Canonical DOUBT AI Chatbot Endpoint:
    Receives student questions, grounds answers in the active learning topic,
    curriculum context, and conversation history, and invokes Google Gemini.
    """
    user_msg = payload.message
    if not user_msg and payload.messages:
        for m in reversed(payload.messages):
            if m.role == "user":
                user_msg = m.content
                break

    if not user_msg or not user_msg.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    active_topic = payload.active_topic
    if not active_topic and payload.context:
        active_topic = payload.context.concept_name or payload.context.topic_name or None

    hist = [{"role": h.role, "content": h.content} for h in payload.conversation_history]
    if not hist and payload.messages:
        hist = [{"role": m.role, "content": m.content} for m in payload.messages[:-1]]

    result = generate_ai_chat_response(
        message=user_msg.strip(),
        student_id=payload.student_id or None,
        active_topic=active_topic,
        conversation_history=hist,
        context=payload.context
    )

    if not result.get("success"):
        status_code = result.get("status_code", 502)
        detail = result.get("detail", "DOUBT AI service is temporarily unavailable.")
        raise HTTPException(status_code=status_code, detail=detail)

    return AIChatResponse(
        reply=result["reply"],
        student_id=result.get("student_id", payload.student_id),
        active_topic=result.get("active_topic", active_topic),
        success=True,
        topic=result.get("topic", active_topic),
        suggested_prompts=result.get("suggested_prompts", [])
    )


@router.post("/chat/doubt", response_model=ChatResponse)
def legacy_chat_doubt_endpoint(payload: ChatRequest, db: Session = Depends(get_db)):
    """Legacy compatibility endpoint forwarding to the canonical AI service."""
    if not payload.messages:
        raise HTTPException(status_code=400, detail="Messages array cannot be empty.")

    response = generate_doubt_reply(payload.messages, payload.context)
    return response
