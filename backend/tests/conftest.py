"""Shared pytest fixtures."""
from __future__ import annotations

from pathlib import Path

import pytest

from app.services.dummy_service import DUMMY_ROOT


@pytest.fixture
def bookflow_bundle() -> list[Path]:
    """Return the real file paths for the BookFlow bundle and verify they exist."""
    files = [
        DUMMY_ROOT / "BookFlow" / "PRD.md",
        DUMMY_ROOT / "BookFlow" / "기능명세서.docx",
        DUMMY_ROOT / "BookFlow" / "QA_체크리스트.pdf",
    ]
    for f in files:
        assert f.exists(), f"번들 파일이 없습니다: {f}"
    return files


@pytest.fixture
def learnhub_bundle() -> list[Path]:
    """Return the real file paths for the LearnHub bundle and verify they exist."""
    files = [
        DUMMY_ROOT / "LearnHub" / "PRD.md",
        DUMMY_ROOT / "LearnHub" / "API_명세서.docx",
        DUMMY_ROOT / "LearnHub" / "데이터모델.md",
        DUMMY_ROOT / "LearnHub" / "알림명세서.md",
        DUMMY_ROOT / "LearnHub" / "테스트계획서.pdf",
    ]
    for f in files:
        assert f.exists(), f"번들 파일이 없습니다: {f}"
    return files


@pytest.fixture
def medibook_bundle() -> list[Path]:
    """Return the real file paths for the MediBook bundle and verify they exist."""
    files = [
        DUMMY_ROOT / "MediBook" / "PRD.md",
        DUMMY_ROOT / "MediBook" / "API_명세서.docx",
        DUMMY_ROOT / "MediBook" / "개인정보처리방침.pdf",
        DUMMY_ROOT / "MediBook" / "비기능_요구사항.md",
    ]
    for f in files:
        assert f.exists(), f"번들 파일이 없습니다: {f}"
    return files
