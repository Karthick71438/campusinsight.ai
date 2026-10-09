from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database import get_db
from app.models.entities import Subject, Concept
from app.schemas.api_schemas import ConceptResponse
from app.graph_db import graph_service

router = APIRouter(tags=["Concepts & Subjects"])

@router.get("/subjects", response_model=List[Dict[str, Any]])
def get_subjects(db: Session = Depends(get_db)):
    """Fetch all subjects."""
    subjects = db.query(Subject).all()
    return [{"id": s.id, "name": s.name, "code": s.code} for s in subjects]

@router.get("/subjects/{subject_id}/concepts", response_model=List[ConceptResponse])
def get_concepts_by_subject(subject_id: str, db: Session = Depends(get_db)):
    """Fetch all concepts under a specific subject ordered by pedagogical sequence."""
    concepts = db.query(Concept).filter(Concept.subject_id == subject_id).order_by(Concept.order_index).all()
    results = []
    for c in concepts:
        prereqs = graph_service.get_prerequisites(c.id)
        results.append(ConceptResponse(
            id=c.id,
            subject_id=c.subject_id,
            name=c.name,
            slug=c.slug,
            description=c.description,
            order_index=c.order_index,
            prerequisites=prereqs
        ))
    return results

@router.get("/concepts/{concept_id}", response_model=ConceptResponse)
def get_concept(concept_id: str, db: Session = Depends(get_db)):
    """Fetch details of a single concept including prerequisite links."""
    concept = db.query(Concept).filter(Concept.id == concept_id).first()
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found")
    
    prereqs = graph_service.get_prerequisites(concept.id)
    return ConceptResponse(
        id=concept.id,
        subject_id=concept.subject_id,
        name=concept.name,
        slug=concept.slug,
        description=concept.description,
        order_index=concept.order_index,
        prerequisites=prereqs
    )
