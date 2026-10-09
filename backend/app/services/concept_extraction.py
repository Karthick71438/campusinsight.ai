import os
import re
from typing import List, Dict, Any, Optional
from app.config import settings

class ConceptExtractionEngine:
    def __init__(self):
        self.gemini_key = settings.GEMINI_API_KEY

    def extract_concepts_from_text(self, text: str) -> List[Dict[str, Any]]:
        """
        Extracts programming concepts referenced in problem prompts or code snippets.
        Deterministic keyword/regex matching with fallback.
        """
        keywords_map = {
            "concept-functions": [r"\bfunction\b", r"\bdef\b", r"\breturn\b", r"\bparameter\b", r"\bargument\b", r"\bscope\b"],
            "concept-arrays": [r"\barray\b", r"\blist\b", r"\bindex\b", r"\bslice\b", r"\bvector\b", r"\bcontiguous\b"],
            "concept-recursion": [r"\brecurs\w*\b", r"\bbase\s*case\b", r"\bcall\s*stack\b", r"\btail\s*call\b", r"\bstack\s*overflow\b"],
            "concept-trees": [r"\btree\b", r"\bbst\b", r"\binorder\b", r"\bpreorder\b", r"\bpostorder\b", r"\bsubtree\b", r"\bleaf\b"],
            "concept-graphs": [r"\bgraph\b", r"\bdfs\b", r"\bbfs\b", r"\bvertex\b", r"\bvertices\b", r"\bedge\b", r"\badjacency\b", r"\bdijkstra\b"]
        }
        
        matches = []
        text_lower = text.lower()
        for cid, patterns in keywords_map.items():
            for pat in patterns:
                if re.search(pat, text_lower):
                    matches.append(cid)
                    break
        return list(set(matches))

    def generate_pedagogical_explanation(
        self,
        concept_name: str,
        student_performance: float,
        is_bottleneck: bool = False
    ) -> str:
        """
        Generates explainable pedagogical guidance.
        Deterministic template-driven synthesis, extensible to Gemini API if key provided.
        """
        if is_bottleneck:
            return (
                f"Attention: {concept_name} forms the conceptual foundation for subsequent units. "
                f"When this concept weakens, students frequently struggle with downstream recursive and tree data structures. "
                f"Rebuilding this prerequisite with targeted exercises will dramatically boost comprehension."
            )
        elif student_performance < 50.0:
            return (
                f"Your estimated retention for {concept_name} is currently low ({student_performance:.0f}%). "
                f"Reviewing the core definitions and working through basic practice problems is highly advised."
            )
        else:
            return (
                f"You have solid retention in {concept_name} ({student_performance:.0f}%). "
                f"Periodic review every 2-3 weeks will prevent knowledge decay."
            )

concept_extractor = ConceptExtractionEngine()
