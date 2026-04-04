"""Edge inference and management endpoints."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status
from instructor.core.exceptions import InstructorRetryException

from app.models.api import EdgeCreateRequest, EdgeInferRequest, EdgeListResponse, EdgeUpdateRequest
from app.models.edge import Edge, EdgeStatus
from app.services.edge_service import (
    create_edge,
    delete_edge,
    run_inference,
    update_edge,
)
from app.storage.store import store

router = APIRouter(prefix="/api/edges", tags=["Edges"])


@router.post(
    "/infer",
    response_model=list[Edge],
    status_code=status.HTTP_201_CREATED,
    summary="Infer dependency edges via LLM",
)
async def infer_edges_endpoint(body: EdgeInferRequest) -> list[Edge]:
    try:
        return run_inference(body.requirement_ids)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except InstructorRetryException as exc:
        last = exc.__cause__ or exc
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"LLM 호출 실패: {last}",
        ) from exc


@router.get(
    "",
    response_model=EdgeListResponse,
    summary="List edges (optional ?status= filter)",
)
async def list_edges(
    status_filter: EdgeStatus | None = Query(default=None, alias="status"),
) -> EdgeListResponse:
    edges = list(store.edges.values())
    if status_filter is not None:
        edges = [e for e in edges if e.status == status_filter]
    return EdgeListResponse(edges=edges)


@router.post(
    "",
    response_model=Edge,
    status_code=status.HTTP_201_CREATED,
    summary="Manually add an approved edge",
)
async def create_edge_endpoint(body: EdgeCreateRequest) -> Edge:
    try:
        return create_edge(
            source_id=body.source_id,
            target_id=body.target_id,
            relation_type=body.relation_type,
            evidence=body.evidence,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc


@router.patch(
    "/{edge_id}",
    response_model=Edge,
    summary="Update edge status, relation_type, or evidence",
)
async def patch_edge(edge_id: str, body: EdgeUpdateRequest) -> Edge:
    try:
        return update_edge(
            edge_id=edge_id,
            status=body.status,
            relation_type=body.relation_type,
            evidence=body.evidence,
        )
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Edge를 찾을 수 없습니다.",
        )


@router.delete(
    "/{edge_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an edge",
)
async def delete_edge_endpoint(edge_id: str) -> None:
    try:
        delete_edge(edge_id)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Edge를 찾을 수 없습니다.",
        )
