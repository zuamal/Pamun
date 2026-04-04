import logging
import os
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.documents import router as documents_router
from app.api.edges import router as edges_router
from app.api.impact import router as impact_router
from app.api.parse import router as parse_router
from app.api.requirements import router as requirements_router
from app.api.session import router as session_router
from app.services.session_service import ensure_sessions_dir

load_dotenv()

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    ensure_sessions_dir()
    if not os.getenv("ANTHROPIC_API_KEY"):
        logger.warning(
            "⚠️  ANTHROPIC_API_KEY가 설정되지 않았습니다. "
            "LLM 기능(POST /api/parse, POST /api/edges/infer)이 동작하지 않습니다. "
            "backend/.env에 ANTHROPIC_API_KEY를 설정하세요."
        )
    yield


app = FastAPI(
    title="Pamun API",
    description="Requirements Dependency Tracker & Change Impact Analyzer",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents_router)
app.include_router(parse_router)
app.include_router(requirements_router)
app.include_router(edges_router)
app.include_router(impact_router)
app.include_router(session_router)


@app.get("/health", tags=["Health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
