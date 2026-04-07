"""Requirement management endpoints: PATCH, DELETE, merge, split."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.models.api import (
    RequirementMergeRequest,
    RequirementSplitRequest,
    RequirementUpdateRequest,
)
from app.models.requirement import Requirement
from app.services.requirement_service import (
    delete_requirement,
    merge_requirements,
    split_requirement,
    update_requirement,
)

router = APIRouter(prefix="/api/requirements", tags=["Requirements"])


@router.patch(
    "/{req_id}",
    response_model=Requirement,
    summary="Update requirement title or changed flag",
)
async def patch_requirement(
    req_id: str,
    body: RequirementUpdateRequest,
) -> Requirement:
    if body.title is None and body.changed is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="title과 changed 중 하나 이상을 제공해야 합니다.",
        )
    try:
        return update_requirement(req_id, body.title, body.changed)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="요구사항을 찾을 수 없습니다.")


@router.delete(
    "/{req_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete requirement and its connected edges",
)
async def delete_requirement_endpoint(req_id: str) -> None:
    try:
        delete_requirement(req_id)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="요구사항을 찾을 수 없습니다.")


@router.post(
    "/merge",
    response_model=Requirement,
    status_code=status.HTTP_201_CREATED,
    summary="Merge adjacent requirements from the same document",
)
async def merge_requirements_endpoint(body: RequirementMergeRequest) -> Requirement:
    try:
        return merge_requirements(list(body.requirement_ids))
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"요구사항을 찾을 수 없습니다: {exc}",
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        )


@router.post(
    "/split",
    response_model=list[Requirement],
    status_code=status.HTTP_201_CREATED,
    summary="Split a requirement at a given offset",
)
async def split_requirement_endpoint(body: RequirementSplitRequest) -> list[Requirement]:
    try:
        part1, part2 = split_requirement(body.requirement_id, body.split_offset)
        return [part1, part2]
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="요구사항을 찾을 수 없습니다.")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        )
