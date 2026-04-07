"""Demo bundle endpoints: list bundles and load pre-parsed sessions."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.models.api import DemoBundleInfo, DemoLoadResponse
from app.services.demo_service import list_demo_bundles, load_demo_bundle

router = APIRouter(prefix="/api/demo", tags=["Demo"])


@router.get(
    "/bundles",
    response_model=list[DemoBundleInfo],
    summary="List available demo bundles",
)
async def get_demo_bundles() -> list[DemoBundleInfo]:
    return list_demo_bundles()


@router.post(
    "/load/{bundle_name}",
    response_model=DemoLoadResponse,
    summary="Reset state and load a pre-parsed demo bundle",
)
async def load_demo(bundle_name: str) -> DemoLoadResponse:
    try:
        name, req_count, edge_count = load_demo_bundle(bundle_name)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"번들을 찾을 수 없습니다: {bundle_name}",
        )
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    return DemoLoadResponse(bundle=name, requirements=req_count, edges=edge_count)
