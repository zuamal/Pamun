"""Document upload and management endpoints."""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, UploadFile, status

from app.models.document import Document
from app.models.api import DocumentListResponse
from app.services.document_service import detect_format, extract_text
from app.storage.store import store

router = APIRouter(prefix="/api/documents", tags=["Documents"])

_MAX_FILES = 5


@router.post(
    "/upload",
    response_model=list[Document],
    status_code=status.HTTP_201_CREATED,
    summary="Upload documents (max 5)",
)
async def upload_documents(files: list[UploadFile]) -> list[Document]:
    if len(files) > _MAX_FILES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"최대 {_MAX_FILES}개까지 업로드할 수 있습니다.",
        )

    created: list[Document] = []
    for upload in files:
        filename = upload.filename or ""
        fmt = detect_format(filename)
        if fmt is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"지원하지 않는 파일 형식입니다: {filename}. (.md, .docx, .pdf만 허용)",
            )

        content = await upload.read()
        try:
            raw_text = extract_text(content, fmt)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=str(exc),
            ) from exc

        doc = Document(
            id=str(uuid.uuid4()),
            filename=filename,
            format=fmt,
            raw_text=raw_text,
            uploaded_at=datetime.now(),
        )
        store.documents[doc.id] = doc
        created.append(doc)

    return created


@router.get(
    "",
    response_model=DocumentListResponse,
    summary="List all uploaded documents",
)
async def list_documents() -> DocumentListResponse:
    return DocumentListResponse(documents=list(store.documents.values()))


@router.get(
    "/{doc_id}",
    response_model=Document,
    summary="Get document by ID (includes raw_text)",
)
async def get_document(doc_id: str) -> Document:
    doc = store.documents.get(doc_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="문서를 찾을 수 없습니다.")
    return doc


@router.delete(
    "/{doc_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete document by ID",
)
async def delete_document(doc_id: str) -> None:
    if doc_id not in store.documents:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="문서를 찾을 수 없습니다.")
    del store.documents[doc_id]
