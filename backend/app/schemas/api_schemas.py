from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Optional, Any
from datetime import datetime

# ----------------- Auth & Student Schemas -----------------
class StudentBase(BaseModel):
    name: str
    email: str
    role: Optional[str] = "Student"
    nickname: Optional[str] = None

class StudentCreate(StudentBase):
    password: Optional[str] = "student123"

class StudentResponse(StudentBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime

class AuthRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: Optional[str] = "Student"
    nickname: Optional[str] = None

class AuthLoginRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    token: str
    student: StudentResponse

# ----------------- Concept Schemas -----------------
class ConceptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    subject_id: Optional[str] = None
    syllabus_id: Optional[str] = None
    name: str
    slug: str
    unit_name: Optional[str] = None
    topic_name: Optional[str] = None
    description: Optional[str] = None
    order_index: int = 0
    prerequisites: List[str] = []

class ConceptCompletionRequest(BaseModel):
    completed: bool = True
    score: Optional[float] = None

class ConceptCompletionResponse(BaseModel):
    student_id: str
    concept_id: str
    concept_name: str
    completed: bool
    mastery_score: float
    stability: str
    message: str

# ----------------- Question Schemas -----------------
class QuestionOption(BaseModel):
    id: str
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    difficulty: str
    concept_id: str
    quiz_set_id: Optional[str] = None
    set_number: Optional[int] = 1

class QuestionDetailResponse(QuestionOption):
    correct_answer: str
    explanation: Optional[str] = None

# ----------------- Quiz Submission -----------------
class AnswerItem(BaseModel):
    question_id: str
    selected_answer: str
    confidence: Optional[str] = "medium"  # "low", "medium", "high"

class QuizSubmitRequest(BaseModel):
    student_id: str
    concept_id: str
    answers: List[AnswerItem]
    confidence: Optional[str] = "medium"  # Top-level self-reported confidence: "low", "medium", "high"
    quiz_set_id: Optional[str] = None

class QuestionFeedback(BaseModel):
    question_id: str
    question_text: str
    selected_answer: str
    correct_answer: str
    is_correct: bool
    confidence: Optional[str] = "medium"
    explanation: Optional[str] = None

class QuizSubmitResponse(BaseModel):
    concept_id: str
    concept_name: str
    score: float
    total_questions: int
    correct_count: int
    previous_mastery: float
    new_mastery: float
    mastery_delta: float
    stability: str
    feedback_summary: str
    prerequisite_alert: Optional[str] = None
    questions_feedback: List[QuestionFeedback]
    quiz_set_id: Optional[str] = None
    set_number: Optional[int] = 1

# ----------------- Mastery & Graph -----------------
class ConceptMasteryItem(BaseModel):
    concept_id: str
    name: str
    slug: str
    order_index: int
    unit_name: Optional[str] = None
    topic_name: Optional[str] = None
    mastery_score: float
    stability: str  # Strong, Stable, Weakening, At Risk
    last_practiced: Optional[str] = None
    days_since_practice: Optional[int] = None
    prerequisites: List[str] = []
    downstream_impacts: List[str] = []
    is_bottleneck: bool = False

class StudentMasteryOverview(BaseModel):
    student_id: str
    student_name: str
    student_email: str
    overall_mastery: float
    strong_count: int
    stable_count: int
    weakening_count: int
    at_risk_count: int
    top_recommendation: Optional[str] = None
    concepts: List[ConceptMasteryItem]

class GraphNodeData(BaseModel):
    label: str
    concept_id: str
    name: str
    slug: str
    unit_name: Optional[str] = None
    topic_name: Optional[str] = None
    mastery_score: float
    stability: str
    days_since_practice: Optional[int] = None
    last_practiced: Optional[str] = None
    prerequisites: List[str] = []
    downstream_impacts: List[str] = []
    is_root_gap: bool = False
    is_impacted: bool = False

class GraphNode(BaseModel):
    id: str
    type: str = "conceptNode"
    position: Dict[str, float]
    data: GraphNodeData

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    animated: bool = False
    style: Optional[Dict[str, Any]] = None
    label: Optional[str] = "prereq for"

class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    engine: str

# ----------------- Decay Analysis -----------------
class DecayCurvePoint(BaseModel):
    day: int
    projected_mastery: float
    actual_mastery: Optional[float] = None
    label: str

class ConceptDecayDetail(BaseModel):
    concept_id: str
    concept_name: str
    unit_name: Optional[str] = None
    topic_name: Optional[str] = None
    assessed: bool = False
    current_mastery: float
    peak_mastery: float
    days_since_practice: int
    stability: str
    half_life_days: float
    decay_curve: List[DecayCurvePoint]
    historical_points: List[Dict[str, Any]] = []

class StudentDecayResponse(BaseModel):
    student_id: str
    active_syllabus_title: Optional[str] = None
    concepts_decay: List[ConceptDecayDetail]

# ----------------- Recommendations -----------------
class RecommendationItem(BaseModel):
    id: str
    concept_id: str
    concept_name: str
    priority: int
    priority_score: float
    action_type: str = "PRACTICE"  # REMEDIATE, REVIEW, PRACTICE, ADVANCE, CHALLENGE
    current_mastery: float
    previous_mastery: Optional[float] = None
    days_since_practice: Optional[int] = None
    stability: str
    headline: str
    reason: str
    why_factors: List[str]
    root_cause_concept: Optional[str] = None
    impacted_concepts: List[str] = []

class RecommendationResponse(BaseModel):
    student_id: str
    student_name: str
    generated_at: str
    recommendations: List[RecommendationItem]

# ----------------- Demo Mode Schemas -----------------
class DemoStageRequest(BaseModel):
    stage: str

# ----------------- Syllabus & Roadmap Schemas -----------------
class SyllabusUploadResponse(BaseModel):
    id: str
    student_id: str
    title: str
    filename: str
    total_units: int
    total_concepts: int
    units: List[Dict[str, Any]]
    message: str

class RoadmapConceptItem(BaseModel):
    concept_id: str
    name: str
    unit_name: str
    topic_name: str
    order_index: int
    mastery_score: float
    stability: str
    status: str  # Completed, Current, Upcoming, Needs Review, At Risk
    action_type: str  # ADVANCE, PRACTICE, REVIEW, REMEDIATE, CHALLENGE
    action_explanation: str
    prerequisites: List[str] = []
    days_since_practice: Optional[int] = None

class RoadmapTopicItem(BaseModel):
    title: str
    concepts: List[RoadmapConceptItem]

class RoadmapUnitItem(BaseModel):
    unit_number: int
    title: str
    topics: List[RoadmapTopicItem]
    completion_percentage: float

class StudentRoadmapResponse(BaseModel):
    student_id: str
    student_name: str
    syllabus_title: str
    overall_progress: float
    total_concepts: int
    completed_concepts: int
    needs_review_count: int
    units: List[RoadmapUnitItem]

# ----------------- Weak Path / Reverse Path Schemas -----------------
class ReversePathNode(BaseModel):
    id: str
    name: str
    role: str  # "Target Weakness", "Prerequisite Bottleneck", "Stable Foundation", etc.
    score: float
    stability: str
    explanation: Optional[str] = None

class DownstreamImpactNode(BaseModel):
    id: str
    name: str
    status: str  # "Directly Blocked", "Cascading Risk", "Stable"
    score: float

class WeakPathResponse(BaseModel):
    concept_id: str
    concept_name: str
    mastery_score: float
    stability: str
    is_bottleneck: bool
    root_cause_concept: Optional[Dict[str, Any]] = None
    reverse_path: List[ReversePathNode]
    downstream_impact: List[DownstreamImpactNode]
    recommended_action: Dict[str, Any]

# ----------------- DOUBT AI Chatbot Schemas -----------------
class ChatMessage(BaseModel):
    role: str  # "user", "assistant", "system"
    content: str
    timestamp: Optional[str] = None

class ChatContext(BaseModel):
    student_id: Optional[str] = None
    current_tab: Optional[str] = "dashboard"
    concept_id: Optional[str] = None
    concept_name: Optional[str] = None
    unit_name: Optional[str] = None
    topic_name: Optional[str] = None
    mastery_score: Optional[float] = None
    stability: Optional[str] = None
    weak_concepts: List[str] = []
    syllabus_title: Optional[str] = None

class ChatRequest(BaseModel):
    messages: Optional[List[ChatMessage]] = None
    context: Optional[ChatContext] = None

class ChatResponse(BaseModel):
    reply: str
    detected_concept: Optional[str] = None
    suggested_prompts: List[str] = []

class AIChatHistoryItem(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class AIChatRequest(BaseModel):
    message: Optional[str] = None
    student_id: Optional[str] = None
    active_topic: Optional[str] = None
    conversation_history: List[AIChatHistoryItem] = []
    context: Optional[ChatContext] = None
    # Backward-compatible fields
    messages: Optional[List[ChatMessage]] = None

class AIChatResponse(BaseModel):
    reply: str
    student_id: Optional[str] = None
    active_topic: Optional[str] = None
    success: bool = True
    topic: Optional[str] = None
    suggested_prompts: List[str] = []
    error: Optional[str] = None
    details: Optional[str] = None
