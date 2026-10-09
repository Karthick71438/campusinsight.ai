import logging
import os
import json
import networkx as nx
from typing import List, Dict, Any, Optional
from app.config import settings, get_data_dir

logger = logging.getLogger("graph_db")

class GraphDatabaseService:
    def __init__(self):
        self.neo4j_driver = None
        self.use_neo4j = False
        self.fallback_graph = nx.DiGraph()
        self._init_connection()
        self._auto_load_fixtures()

    def _init_connection(self):
        """Attempt connection to Neo4j AuraDB; fallback cleanly to NetworkX."""
        if settings.NEO4J_URI and settings.NEO4J_USERNAME and settings.NEO4J_PASSWORD:
            try:
                from neo4j import GraphDatabase
                self.neo4j_driver = GraphDatabase.driver(
                    settings.NEO4J_URI,
                    auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD)
                )
                self.neo4j_driver.verify_connectivity()
                self.use_neo4j = True
                logger.info("Successfully connected to Neo4j AuraDB instance.")
            except Exception as e:
                logger.warning(f"Neo4j connection failed ({str(e)}). Using embedded NetworkX graph engine.")
                self.use_neo4j = False
        else:
            logger.info("Neo4j AuraDB credentials not configured. Running with embedded graph engine.")
            self.use_neo4j = False

    def _auto_load_fixtures(self):
        """Auto-seed graph from concepts.json fixture so topology is always available."""
        fixture_path = os.path.join(get_data_dir(), "concepts.json")
        if os.path.exists(fixture_path):
            try:
                with open(fixture_path, "r", encoding="utf-8") as f:
                    concepts = json.load(f)
                    self.sync_ontology(concepts)
            except Exception as e:
                logger.error(f"Failed to auto-load graph fixtures: {e}")

    def close(self):
        if self.neo4j_driver:
            self.neo4j_driver.close()

    def is_neo4j_active(self) -> bool:
        return self.use_neo4j

    def sync_ontology(self, concepts: List[Dict[str, Any]], clear_existing: bool = False):
        """Populate concept nodes and PREREQUISITE_FOR edges into Neo4j and fallback graph."""
        # 1. Update in-memory fallback graph
        if clear_existing:
            self.fallback_graph.clear()
        for c in concepts:
            self.fallback_graph.add_node(
                c["id"],
                name=c["name"],
                slug=c.get("slug", ""),
                subject=c.get("subject", "Programming"),
                order_index=c.get("order_index", 0),
                description=c.get("description", "")
            )
        
        for c in concepts:
            for prereq_id in c.get("prerequisites", []):
                # Edge direction: Prerequisite -> Target Concept
                self.fallback_graph.add_edge(
                    prereq_id,
                    c["id"],
                    relationship="PREREQUISITE_FOR",
                    required_mastery=c.get("required_mastery", 70.0)
                )

        # 2. Sync to Neo4j AuraDB if active
        if self.use_neo4j and self.neo4j_driver:
            try:
                with self.neo4j_driver.session() as session:
                    for c in concepts:
                        session.run(
                            """
                            MERGE (c:Concept {id: $id})
                            SET c.name = $name,
                                c.slug = $slug,
                                c.subject = $subject,
                                c.order_index = $order_index,
                                c.description = $description
                            """,
                            id=c["id"],
                            name=c["name"],
                            slug=c.get("slug", ""),
                            subject=c.get("subject", "Programming"),
                            order_index=c.get("order_index", 0),
                            description=c.get("description", "")
                        )
                    for c in concepts:
                        for prereq_id in c.get("prerequisites", []):
                            session.run(
                                """
                                MATCH (a:Concept {id: $prereq_id})
                                MATCH (b:Concept {id: $target_id})
                                MERGE (a)-[r:PREREQUISITE_FOR]->(b)
                                SET r.required_mastery = $req_mastery
                                """,
                                prereq_id=prereq_id,
                                target_id=c["id"],
                                req_mastery=c.get("required_mastery", 70.0)
                            )
                logger.info("Successfully synchronized ontology with Neo4j AuraDB.")
            except Exception as e:
                logger.error(f"Error syncing to Neo4j: {e}")

    def get_prerequisites(self, concept_id: str) -> List[str]:
        """Return list of concept IDs that are prerequisites for concept_id."""
        if self.use_neo4j and self.neo4j_driver:
            try:
                with self.neo4j_driver.session() as session:
                    result = session.run(
                        """
                        MATCH (prereq:Concept)-[:PREREQUISITE_FOR]->(target:Concept {id: $id})
                        RETURN prereq.id AS id
                        """,
                        id=concept_id
                    )
                    return [record["id"] for record in result]
            except Exception as e:
                logger.error(f"Neo4j query error: {e}, using fallback.")
        
        # Fallback NetworkX
        if concept_id in self.fallback_graph:
            return list(self.fallback_graph.predecessors(concept_id))
        return []

    def get_downstream_dependents(self, concept_id: str) -> List[str]:
        """Return all direct and transitive concepts that depend on concept_id."""
        if self.use_neo4j and self.neo4j_driver:
            try:
                with self.neo4j_driver.session() as session:
                    result = session.run(
                        """
                        MATCH (source:Concept {id: $id})-[:PREREQUISITE_FOR*1..5]->(downstream:Concept)
                        RETURN DISTINCT downstream.id AS id
                        """,
                        id=concept_id
                    )
                    return [record["id"] for record in result]
            except Exception as e:
                logger.error(f"Neo4j query error: {e}, using fallback.")

        # Fallback NetworkX
        if concept_id in self.fallback_graph:
            return list(nx.descendants(self.fallback_graph, concept_id))
        return []

    def get_graph_topology(self) -> Dict[str, Any]:
        """Return full node & edge structure for React Flow rendering."""
        nodes = []
        edges = []
        
        pos_map = {
            "concept-functions": {"x": 80, "y": 200},
            "concept-arrays": {"x": 300, "y": 200},
            "concept-recursion": {"x": 520, "y": 200},
            "concept-trees": {"x": 740, "y": 200},
            "concept-graphs": {"x": 960, "y": 200}
        }
        
        for node_id, data in self.fallback_graph.nodes(data=True):
            pos = pos_map.get(node_id, {"x": 100, "y": 100})
            nodes.append({
                "id": node_id,
                "name": data.get("name", node_id),
                "slug": data.get("slug", ""),
                "subject": data.get("subject", "Programming"),
                "order_index": data.get("order_index", 0),
                "description": data.get("description", ""),
                "position": pos
            })
            
        for u, v, data in self.fallback_graph.edges(data=True):
            edges.append({
                "id": f"e-{u}-{v}",
                "source": u,
                "target": v,
                "relationship": data.get("relationship", "PREREQUISITE_FOR"),
                "required_mastery": data.get("required_mastery", 70.0)
            })
            
        return {
            "nodes": sorted(nodes, key=lambda x: x["order_index"]),
            "edges": edges,
            "engine": "Neo4j AuraDB" if self.use_neo4j else "NetworkX Embedded"
        }

graph_service = GraphDatabaseService()
