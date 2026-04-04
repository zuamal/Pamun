"""Session persistence: save, load, and reset app state."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from app.models.document import Document
from app.models.edge import Edge, EdgeStatus
from app.models.requirement import Requirement
from app.storage.store import store

# sessions/ sits at the project root (one level above backend/)
_SESSIONS_DIR = Path(__file__).resolve().parents[3] / "sessions"


def ensure_sessions_dir() -> None:
    """Create the sessions/ directory if it doesn't exist."""
    _SESSIONS_DIR.mkdir(parents=True, exist_ok=True)


def save_session() -> tuple[str, str]:
    """Serialize current store to a timestamped JSON file.

    Returns (filepath, saved_at_iso).
    """
    ensure_sessions_dir()
    now = datetime.now(tz=timezone.utc)
    filename = now.strftime("%Y%m%dT%H%M%S") + ".session.json"
    filepath = _SESSIONS_DIR / filename

    payload = {
        "saved_at": now.isoformat(),
        "documents": {
            did: doc.model_dump(mode="json")
            for did, doc in store.documents.items()
        },
        "requirements": {
            rid: req.model_dump(mode="json")
            for rid, req in store.requirements.items()
        },
        "edges": {
            eid: edge.model_dump(mode="json")
            for eid, edge in store.edges.items()
        },
    }

    filepath.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return str(filepath), now.isoformat()


def load_session(filepath: str) -> None:
    """Restore store state from a session JSON file.

    Raises FileNotFoundError if the file doesn't exist.
    Raises ValueError if the file format is invalid.
    """
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"세션 파일을 찾을 수 없습니다: {filepath}")

    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        documents = {
            did: Document.model_validate(data)
            for did, data in raw.get("documents", {}).items()
        }
        requirements = {
            rid: Requirement.model_validate(data)
            for rid, data in raw.get("requirements", {}).items()
        }
        edges = {
            eid: Edge.model_validate(data)
            for eid, data in raw.get("edges", {}).items()
        }
    except Exception as exc:
        raise ValueError(f"세션 파일 형식이 올바르지 않습니다: {exc}") from exc

    # Atomic swap
    store.reset()
    store.documents.update(documents)
    store.requirements.update(requirements)
    store.edges.update(edges)

    # Rebuild networkx graph from APPROVED edges
    for edge in store.edges.values():
        if edge.status == EdgeStatus.APPROVED:
            store.graph.add_edge(edge.source_id, edge.target_id, edge_id=edge.id)


def reset_session() -> None:
    """Clear all in-memory state."""
    store.reset()
