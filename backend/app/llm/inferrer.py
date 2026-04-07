"""LLM-based dependency inferrer using Instructor + Anthropic Claude."""
from __future__ import annotations

import os
import uuid

import anthropic
import instructor

from app.llm.schemas import InferenceResult, InferredEdge
from app.models.edge import Edge, EdgeStatus, RelationType
from app.models.requirement import Requirement

_MAX_RETRIES = 3
_MAX_TOKENS = 8192
_DEFAULT_MODEL = "claude-sonnet-4-5"

_INFER_PROMPT = """\
You are analyzing software requirements to discover dependency relationships between them.

Review the requirements below and identify ALL meaningful dependencies.

For each relationship, provide:
- source_index: index (from the list below) of the dependent/related requirement
- target_index: index of the requirement it depends on or is related to
- relation_type: "depends_on" (source requires target to function) or \
"related_to" (mutual, undirected relationship)
- evidence: a verbatim sentence or phrase from the requirements text that supports this relationship
- confidence: 0.0 to 1.0 (how certain you are)

Rules:
- depends_on is DIRECTED: source depends on target.
- related_to is UNDIRECTED: report only once (do not add the reverse direction).
- Skip trivial or low-confidence (<0.3) connections.
- source_index and target_index must be different.

Requirements:
{requirements_block}
"""


def _build_requirements_block(requirements: list[Requirement]) -> str:
    lines: list[str] = []
    for i, req in enumerate(requirements):
        snippet = req.original_text[:120].replace("\n", " ")
        lines.append(f"{i}. [{req.title}] {snippet}")
    return "\n".join(lines)


def _get_client() -> instructor.Instructor:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError(
            "ANTHROPIC_API_KEY가 설정되지 않았습니다. backend/.env 파일을 확인하세요."
        )
    return instructor.from_anthropic(anthropic.Anthropic(api_key=api_key))


def _inferred_to_edge(
    inferred: InferredEdge,
    requirements: list[Requirement],
) -> Edge | None:
    """Convert an InferredEdge (index-based) to an Edge (ID-based).

    Returns None if indices are out of range or relation_type is invalid.
    """
    n = len(requirements)
    if not (0 <= inferred.source_index < n and 0 <= inferred.target_index < n):
        return None
    if inferred.source_index == inferred.target_index:
        return None

    try:
        relation_type = RelationType(inferred.relation_type)
    except ValueError:
        return None

    return Edge(
        id=str(uuid.uuid4()),
        source_id=requirements[inferred.source_index].id,
        target_id=requirements[inferred.target_index].id,
        relation_type=relation_type,
        evidence=inferred.evidence,
        confidence=inferred.confidence,
        status=EdgeStatus.PENDING,
    )


def infer_edges(requirements: list[Requirement]) -> list[Edge]:
    """Call Anthropic Claude via Instructor to infer dependency edges.

    Returns raw Edge objects (status=PENDING, not yet stored).
    Raises ValueError if ANTHROPIC_API_KEY is missing.
    """
    client = _get_client()
    model = os.getenv("LLM_MODEL", _DEFAULT_MODEL)
    block = _build_requirements_block(requirements)
    prompt = _INFER_PROMPT.format(requirements_block=block)

    result: InferenceResult = client.messages.create(
        model=model,
        max_tokens=_MAX_TOKENS,
        messages=[{"role": "user", "content": prompt}],
        response_model=InferenceResult,
        max_retries=_MAX_RETRIES,
    )

    edges: list[Edge] = []
    for inferred in result.edges:
        edge = _inferred_to_edge(inferred, requirements)
        if edge is not None:
            edges.append(edge)

    return edges
