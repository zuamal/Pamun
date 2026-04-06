"""Parse and requirements endpoints."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from instructor.core.exceptions import InstructorRetryException

from app.models.api import ParseRequest, ParseResponse
from app.models.requirement import Requirement
from app.services.parse_service import parse_documents
from app.storage.store import store

router = APIRouter(tags=["Parse & Requirements"])


@router.post(
    "/api/parse",
    response_model=ParseResponse,
    summary="Parse documents via LLM to extract requirements",
)
async def parse(request: ParseRequest) -> ParseResponse:
    if not request.document_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="document_ids는 비어 있을 수 없습니다.",
        )

    # Validate all IDs exist
    missing = [did for did in request.document_ids if did not in store.documents]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"존재하지 않는 document_id: {missing}",
        )

    documents = [store.documents[did] for did in request.document_ids]

    try:
        requirements = parse_documents(documents)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except InstructorRetryException as exc:
        cause = getattr(exc.__cause__, "message", None) or str(exc.__cause__ or exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"LLM 호출 실패: {cause}",
        ) from exc

    return ParseResponse(requirements=requirements)


@router.get(
    "/api/requirements",
    response_model=list[Requirement],
    summary="List all parsed requirements",
)
async def list_requirements() -> list[Requirement]:
    return list(store.requirements.values())
