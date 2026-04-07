"""Demo bundle loader service: loads pre-parsed sessions from docs/dummy."""
from __future__ import annotations

from pathlib import Path

from app.models.api import DemoBundleInfo
from app.services.session_service import load_session, reset_session
from app.storage.store import store

_DEMO_ROOT = Path(__file__).parents[3] / "docs" / "dummy"

_BUNDLES: list[DemoBundleInfo] = [
    DemoBundleInfo(name="BookFlow", description="독서 앱 기획 문서 3종", file_count=3),
    DemoBundleInfo(name="LearnHub", description="학습 플랫폼 기획 문서 5종", file_count=5),
    DemoBundleInfo(name="MediBook", description="의료 예약 서비스 기획 문서 4종", file_count=4),
]

_BUNDLE_NAMES = {b.name for b in _BUNDLES}


def list_demo_bundles() -> list[DemoBundleInfo]:
    """Return the list of available demo bundles."""
    return _BUNDLES


def load_demo_bundle(bundle_name: str) -> tuple[str, int, int]:
    """Reset state and load a demo bundle's pre-parsed session.

    Returns (bundle_name, requirements_count, edges_count).

    Raises:
        KeyError: Unknown bundle name → 404
        FileNotFoundError: demo_session.json missing → 503
        ValueError: Invalid session file format → 503
    """
    if bundle_name not in _BUNDLE_NAMES:
        raise KeyError(bundle_name)

    session_path = _DEMO_ROOT / bundle_name / "demo_session.json"
    if not session_path.exists():
        raise FileNotFoundError("데모 세션 파일이 준비되지 않았습니다.")

    reset_session()
    load_session(str(session_path))

    req_count = len(store.requirements)
    edge_count = len(store.edges)
    return bundle_name, req_count, edge_count
