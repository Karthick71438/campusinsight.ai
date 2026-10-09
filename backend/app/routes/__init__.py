from app.routes.students import router as students_router
from app.routes.concepts import router as concepts_router
from app.routes.quiz import router as quiz_router
from app.routes.graph import router as graph_router
from app.routes.analytics import router as analytics_router
from app.routes.recommendations import router as recommendations_router
from app.routes.demo import router as demo_router

__all__ = [
    "students_router",
    "concepts_router",
    "quiz_router",
    "graph_router",
    "analytics_router",
    "recommendations_router",
    "demo_router"
]
