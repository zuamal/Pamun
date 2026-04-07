"""Parse and requirements endpoints."""
from __future__ import annotations

import os

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.models.api import ParseRequest
from app.models.requirement import Requirement
from app.services.parse_service import stream_parse_documents
from app.storage.store import store

router = APIRouter(tags=["Parse & Requirements"])


@router.post(
    "/api/parse",
    summary="Parse documents via LLM to extract requirements (SSE stream)",
    response_class=StreamingResponse,
)
async def parse(request: ParseRequest) -> StreamingResponse:
    if not request.document_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="document_ids는 비어 있을 수 없습니다.",
        )

    if not os.getenv("ANTHROPIC_API_KEY"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LLM 기능을 사용하려면 ANTHROPIC_API_KEY가 필요합니다.",
        )

    missing = [did for did in request.document_ids if did not in store.documents]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"존재하지 않는 document_id: {missing}",
        )

    documents = [store.documents[did] for did in request.document_ids]

    return StreamingResponse(
        stream_parse_documents(documents),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get(
    "/api/requirements",
    response_model=list[Requirement],
    summary="List all parsed requirements",
)
async def list_requirements() -> list[Requirement]:
    return list(store.requirements.values())
