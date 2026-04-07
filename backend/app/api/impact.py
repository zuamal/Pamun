"""Impact analysis endpoint."""
from __future__ import annotations

from fastapi import APIRouter

from app.models.api import ImpactResponse
from app.services.impact_service import compute_impact

router = APIRouter(tags=["Impact"])


@router.get(
    "/api/impact",
    response_model=ImpactResponse,
    summary="1-hop impact analysis based on changed requirements",
)
async def get_impact() -> ImpactResponse:
    result = compute_impact()
    return ImpactResponse(result=result)
