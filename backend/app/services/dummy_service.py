"""Sample bundle loader service for demo/QA purposes."""
from __future__ import annotations

import uuid
from datetime import datetime
from pathlib import Path

from app.models.document import Document
from app.services.document_service import detect_format, extract_text
from app.services.session_service import reset_session
from app.storage.store import store

DUMMY_ROOT = Path(__file__).parents[3] / "docs" / "dummy"

_BUNDLES: dict[str, list[str]] = {
    "BookFlow": ["PRD.md", "기능명세서.docx", "QA_체크리스트.pdf"],
    "LearnHub": ["PRD.md", "API_명세서.docx", "데이터모델.md", "알림명세서.md", "테스트계획서.pdf"],
    "MediBook": ["PRD.md", "API_명세서.docx", "개인정보처리방침.pdf", "비기능_요구사항.md"],
}


def list_bundles() -> list[dict[str, object]]:
    """Return the list of available bundles with their file names."""
    return [{"name": name, "files": files} for name, files in _BUNDLES.items()]


def load_bundle(bundle_name: str) -> list[Document]:
    """Reset in-memory state and load all files from the named bundle.

    Raises:
        KeyError: If bundle_name is not recognised.
        FileNotFoundError: If a bundle file is missing from disk.
        ValueError: If a file format is unsupported or text extraction fails.
    """
    if bundle_name not in _BUNDLES:
        raise KeyError(bundle_name)

    reset_session()

    bundle_dir = DUMMY_ROOT / bundle_name
    created: list[Document] = []

    for filename in _BUNDLES[bundle_name]:
        file_path = bundle_dir / filename
        if not file_path.exists():
            raise FileNotFoundError(f"번들 파일을 찾을 수 없습니다: {file_path}")

        fmt = detect_format(filename)
        if fmt is None:
            raise ValueError(f"지원하지 않는 파일 형식입니다: {filename}")

        content = file_path.read_bytes()
        raw_text = extract_text(content, fmt)

        doc = Document(
            id=str(uuid.uuid4()),
            filename=filename,
            format=fmt,
            raw_text=raw_text,
            file_size=len(content),
            uploaded_at=datetime.now(),
        )
        store.documents[doc.id] = doc
        created.append(doc)

    return created
