"""Session management endpoints: save, load, reset."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.models.api import SessionLoadRequest, SessionResetResponse, SessionSaveResponse
from app.services.session_service import load_session, reset_session, save_session

router = APIRouter(prefix="/api/session", tags=["Session"])


@router.post(
    "/save",
    response_model=SessionSaveResponse,
    summary="Save current state to a timestamped JSON file",
)
async def save() -> SessionSaveResponse:
    filepath, saved_at = save_session()
    return SessionSaveResponse(filepath=filepath, saved_at=saved_at)


@router.post(
    "/load",
    response_model=SessionResetResponse,
    summary="Restore state from a session JSON file",
)
async def load(body: SessionLoadRequest) -> SessionResetResponse:
    try:
        load_session(body.filepath)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)
        ) from exc
    return SessionResetResponse(status="loaded")


@router.post(
    "/reset",
    response_model=SessionResetResponse,
    summary="Clear all in-memory state",
)
async def reset() -> SessionResetResponse:
    reset_session()
    return SessionResetResponse(status="reset")
