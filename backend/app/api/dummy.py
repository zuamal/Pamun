"""Sample bundle loader endpoints for demo/QA purposes."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.models.api import BundleInfo
from app.models.document import Document
from app.services.dummy_service import list_bundles, load_bundle

router = APIRouter(prefix="/api/dummy", tags=["Dummy"])


@router.get(
    "/bundles",
    response_model=list[BundleInfo],
    summary="List available sample bundles",
)
async def get_bundles() -> list[BundleInfo]:
    return [BundleInfo(**b) for b in list_bundles()]


@router.post(
    "/load/{bundle_name}",
    response_model=list[Document],
    status_code=status.HTTP_200_OK,
    summary="Reset state and load a sample bundle",
)
async def load(bundle_name: str) -> list[Document]:
    try:
        return load_bundle(bundle_name)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"번들을 찾을 수 없습니다: {bundle_name}",
        )
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc
