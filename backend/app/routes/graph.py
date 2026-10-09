import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from app.database import get_db
from app.models.entities import Student, Concept, Mastery, Syllabus
from app.schemas.api_schemas import (
    GraphResponse, GraphNode, GraphNodeData, GraphEdge,
    WeakPathResponse, ReversePathNode, DownstreamImpactNode
)
from app.graph_db import graph_service
from app.services.dependency import analyze_dependencies_and_bottlenecks
from app.services.mastery import classify_stability
from app.config import settings

router = APIRouter(prefix="", tags=["Knowledge Graph"])

@router.get("/students/{student_id}/graph", response_model=GraphResponse)
def get_student_knowledge_graph(
    student_id: str,
    syllabus_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Returns an interactive, personalized knowledge graph structure
    ready for React Flow canvas rendering, complete with node stability states,
    prerequisite edges, root-gap bottleneck flags, and downstream impact cascades.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Fetch concepts scoped to the student's latest uploaded syllabus.
    # All students (including built-in demo students) get their uploaded PDF data.
    # Only falls back to seed/fixture concepts when no syllabus has been uploaded yet.
    if syllabus_id:
        concepts = db.query(Concept).filter(Concept.syllabus_id == syllabus_id).order_by(Concept.order_index).all()
    else:
        demo_ids = [
            "concept-functions",
            "concept-arrays",
            "concept-recursion",
            "concept-trees",
            "concept-graphs"
        ]
        concepts = db.query(Concept).filter(Concept.id.in_(demo_ids)).all()
        id_order = {cid: idx for idx, cid in enumerate(demo_ids)}
        concepts.sort(key=lambda c: id_order.get(c.id, 99))
        if not concepts or len(concepts) < 5:
            concepts = db.query(Concept).filter(Concept.syllabus_id.is_(None)).order_by(Concept.order_index).limit(5).all()

    mastery_records = {m.concept_id: m for m in db.query(Mastery).filter(Mastery.student_id == student.id).all()}

    now = datetime.datetime.now(datetime.timezone.utc)
    mastery_map = {}
    for c in concepts:
        m = mastery_records.get(c.id)
        if m:
            days_ago = (now - (m.last_practiced.replace(tzinfo=datetime.timezone.utc) if m.last_practiced and m.last_practiced.tzinfo is None else m.last_practiced)).days if m.last_practiced else 0
            mastery_map[c.id] = {
                "score": m.mastery_score,
                "stability": m.stability,
                "days_ago": days_ago,
                "last_practiced": m.last_practiced.isoformat() if m.last_practiced else None
            }
        else:
            mastery_map[c.id] = {
                "score": 0.0,
                "stability": "At Risk",
                "days_ago": None,
                "last_practiced": None
            }

    # Run dependency bottleneck analysis
    dep_analysis = analyze_dependencies_and_bottlenecks(mastery_map)
    bottlenecks = dep_analysis["bottlenecks"]
    
    # Identify impacted concepts
    impacted_set = set()
    for b_info in bottlenecks.values():
        impacted_set.update(b_info["blocking_concepts"])

    # Base coordinates for visual layout
    coord_map = {
        "concept-functions": {"x": 60, "y": 180},
        "concept-arrays": {"x": 280, "y": 180},
        "concept-recursion": {"x": 500, "y": 180},
        "concept-trees": {"x": 720, "y": 180},
        "concept-graphs": {"x": 940, "y": 180}
    }

    nodes = []
    for c in concepts:
        m_info = mastery_map[c.id]
        prereqs = graph_service.get_prerequisites(c.id)
        downstream = graph_service.get_downstream_dependents(c.id)
        
        # Grid layout position
        pos = coord_map.get(c.id)
        if not pos:
            col = (c.order_index - 1) % 4
            row = (c.order_index - 1) // 4
            pos = {"x": 60 + col * 260, "y": 100 + row * 220}

        is_root = c.id in bottlenecks
        is_imp = c.id in impacted_set

        nodes.append(GraphNode(
            id=c.id,
            type="conceptNode",
            position=pos,
            data=GraphNodeData(
                label=c.name,
                concept_id=c.id,
                name=c.name,
                slug=c.slug,
                unit_name=c.unit_name,
                topic_name=c.topic_name,
                mastery_score=m_info["score"],
                stability=m_info["stability"],
                days_since_practice=m_info["days_ago"],
                last_practiced=m_info["last_practiced"],
                prerequisites=prereqs,
                downstream_impacts=downstream,
                is_root_gap=is_root,
                is_impacted=is_imp
            )
        ))

    # Build React Flow edges
    edges = []
    if not syllabus_id:
        # Standard clean demo dependency edges
        demo_edge_defs = [
            ("concept-functions", "concept-arrays", "prereq-fn-arr"),
            ("concept-arrays", "concept-recursion", "prereq-arr-rec"),
            ("concept-recursion", "concept-trees", "prereq-rec-trees"),
            ("concept-trees", "concept-graphs", "prereq-trees-graphs")
        ]
        concept_id_set = {c.id for c in concepts}
        for src, tgt, edge_id in demo_edge_defs:
            if src in concept_id_set and tgt in concept_id_set:
                is_critical_edge = (src in bottlenecks and tgt in bottlenecks[src]["blocking_concepts"])
                if src == "concept-recursion" and mastery_map.get(src, {}).get("score", 100) < 70:
                    is_critical_edge = True

                edge_style = {
                    "strokeWidth": 3.5 if is_critical_edge else 2,
                    "stroke": "#ef4444" if is_critical_edge else "#475569"
                }
                edges.append(GraphEdge(
                    id=edge_id,
                    source=src,
                    target=tgt,
                    animated=is_critical_edge,
                    style=edge_style,
                    label="blocks prereq" if is_critical_edge else "prerequisite for"
                ))
    else:
        topology = graph_service.get_graph_topology()
        concept_id_set = {c.id for c in concepts}
        for e in topology["edges"]:
            source_id = e["source"]
            target_id = e["target"]
            if source_id not in concept_id_set or target_id not in concept_id_set:
                continue
            
            is_critical_edge = (source_id in bottlenecks and target_id in bottlenecks[source_id]["blocking_concepts"])
            edge_style = {
                "strokeWidth": 3.5 if is_critical_edge else 2,
                "stroke": "#ef4444" if is_critical_edge else "#475569"
            }
            edges.append(GraphEdge(
                id=e["id"],
                source=source_id,
                target=target_id,
                animated=is_critical_edge,
                style=edge_style,
                label="blocks prereq" if is_critical_edge else "prerequisite for"
            ))

    return GraphResponse(
        nodes=nodes,
        edges=edges,
        engine="Neo4j AuraDB" if graph_service.is_neo4j_active() else "NetworkX Embedded"
    )

@router.get("/students/{student_id}/weak-path/{concept_id}", response_model=WeakPathResponse)
def get_weak_reverse_path(student_id: str, concept_id: str, db: Session = Depends(get_db)):
    """
    Distinctive Reverse-Path & Root-Cause Weakness Analyzer:
    Traces upstream prerequisite chains to identify the exact root cause of struggling concepts:
    Affected Concept -> Current Weakness -> Prerequisite -> Root Cause.
    Also traces downstream cascading impact:
    Weak Prerequisite -> Current Concept -> Dependent Concepts.
    Answers: 'Where did my weakness come from?' and 'What will this weakness affect?'
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    target_concept = db.query(Concept).filter(Concept.id == concept_id).first()
    if not target_concept:
        clean_name = concept_id.replace("top-", "").replace("concept-", "").replace("-", " ").title()
        target_concept = Concept(
            id=concept_id,
            slug=concept_id,
            name=clean_name,
            topic_name=clean_name,
            unit_name="Syllabus Topics",
            order_index=1
        )


    # Fetch all student mastery
    masteries = {m.concept_id: m for m in db.query(Mastery).filter(Mastery.student_id == student.id).all()}
    concepts_by_id = {c.id: c for c in db.query(Concept).all()}

    target_m = masteries.get(concept_id)
    target_score = target_m.mastery_score if target_m else 0.0
    target_stability = target_m.stability if target_m else "At Risk"

    # 1. Trace Upstream Reverse Path
    reverse_path_nodes = []
    
    # Add target concept
    reverse_path_nodes.append(ReversePathNode(
        id=target_concept.id,
        name=target_concept.name,
        role="Target Weakness" if target_score < 70 else "Selected Concept",
        score=target_score,
        stability=target_stability,
        explanation=f"Observed retention is {target_score:.0f}% ({target_stability})."
    ))

    curr_id = concept_id
    visited = set([curr_id])
    root_cause_candidate = None

    while True:
        prereqs = graph_service.get_prerequisites(curr_id)
        if not prereqs:
            break
        
        # Inspect prerequisites
        weak_prereq = None
        for p_id in prereqs:
            if p_id in visited:
                continue
            visited.add(p_id)
            p_m = masteries.get(p_id)
            p_score = p_m.mastery_score if p_m else 0.0
            p_stab = p_m.stability if p_m else "At Risk"
            p_name = concepts_by_id.get(p_id, None)
            p_title = p_name.name if p_name else p_id

            if p_score < settings.THRESHOLD_STABLE:
                weak_prereq = (p_id, p_title, p_score, p_stab)
                break
            else:
                # Stable foundation
                reverse_path_nodes.append(ReversePathNode(
                    id=p_id,
                    name=p_title,
                    role="Stable Foundation",
                    score=p_score,
                    stability=p_stab,
                    explanation=f"Solid prerequisite competency ({p_score:.0f}%)."
                ))

        if weak_prereq:
            wp_id, wp_title, wp_score, wp_stab = weak_prereq
            root_cause_candidate = {
                "id": wp_id,
                "name": wp_title,
                "score": wp_score,
                "stability": wp_stab
            }
            reverse_path_nodes.append(ReversePathNode(
                id=wp_id,
                name=wp_title,
                role="Root Cause Bottleneck",
                score=wp_score,
                stability=wp_stab,
                explanation=f"Unresolved foundational gap ({wp_score:.0f}%, {wp_stab}) directly impairs {target_concept.name}."
            ))
            curr_id = wp_id
        else:
            break

    # 2. Trace Downstream Impact
    downstream_nodes = []
    downstream_ids = graph_service.get_downstream_dependents(concept_id)
    for d_id in downstream_ids:
        d_c = concepts_by_id.get(d_id)
        if not d_c:
            continue
        d_m = masteries.get(d_id)
        d_score = d_m.mastery_score if d_m else 0.0
        
        status = "Directly Blocked" if target_score < 70 else "Safe Progression"
        if d_score > 0 and d_score < 50:
            status = "Cascading Risk"

        downstream_nodes.append(DownstreamImpactNode(
            id=d_id,
            name=d_c.name,
            status=status,
            score=d_score
        ))

    # 3. Recommended Action
    if root_cause_candidate:
        rec_action = {
            "action": "REMEDIATE",
            "target_concept_id": root_cause_candidate["id"],
            "target_concept_name": root_cause_candidate["name"],
            "headline": f"Remediate {root_cause_candidate['name']} First",
            "explanation": (
                f"Your difficulty with {target_concept.name} stems from foundational decay in "
                f"{root_cause_candidate['name']} ({root_cause_candidate['score']:.0f}%). "
                f"Repeatedly attempting {target_concept.name} without strengthening its root prerequisite "
                f"will yield limited gains. Review {root_cause_candidate['name']} to unblock downstream learning."
            )
        }
    elif target_score < 70:
        rec_action = {
            "action": "PRACTICE",
            "target_concept_id": target_concept.id,
            "target_concept_name": target_concept.name,
            "headline": f"Practice {target_concept.name}",
            "explanation": f"All foundational prerequisites are solid. Direct practice on {target_concept.name} is recommended."
        }
    else:
        rec_action = {
            "action": "CHALLENGE",
            "target_concept_id": target_concept.id,
            "target_concept_name": target_concept.name,
            "headline": f"Advance or Challenge {target_concept.name}",
            "explanation": f"Mastery is stable ({target_score:.0f}%). You are ready to advance to downstream concepts."
        }

    return WeakPathResponse(
        concept_id=target_concept.id,
        concept_name=target_concept.name,
        mastery_score=target_score,
        stability=target_stability,
        is_bottleneck=root_cause_candidate is not None,
        root_cause_concept=root_cause_candidate,
        reverse_path=reverse_path_nodes,
        downstream_impact=downstream_nodes,
        recommended_action=rec_action
    )
