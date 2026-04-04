from __future__ import annotations

import networkx as nx

from app.models.document import Document
from app.models.requirement import Requirement
from app.models.edge import Edge


class AppStore:
    """Singleton in-memory store for all application state."""

    documents: dict[str, Document]
    requirements: dict[str, Requirement]
    edges: dict[str, Edge]
    graph: nx.DiGraph

    def __init__(self) -> None:
        self.documents = {}
        self.requirements = {}
        self.edges = {}
        self.graph = nx.DiGraph()

    def reset(self) -> None:
        """Clear all state (used by POST /api/session/reset)."""
        self.documents.clear()
        self.requirements.clear()
        self.edges.clear()
        self.graph.clear()


# Module-level singleton — import this everywhere
store = AppStore()
