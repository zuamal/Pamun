"""LLM pipeline schemas (Instructor).

These are SEPARATE from API models — they capture what we ask the LLM to return.
"""
from __future__ import annotations

from pydantic import BaseModel, Field


# ── Task 1: Requirement Parsing ───────────────────────────────────────────────

class ParsedRequirement(BaseModel):
    """Single requirement extracted by LLM."""

    title: str = Field(description="Short summary title for this requirement")
    original_text: str = Field(
        description="Exact verbatim text from the document"
    )
    char_start: int = Field(
        ge=0,
        description="Character offset where this requirement starts",
    )
    char_end: int = Field(
        ge=0,
        description="Character offset where this requirement ends",
    )
    display_label: str = Field(
        description=(
            "Human-readable location label "
            "(e.g., heading text, 'paragraph N', section title)"
        )
    )


class ParseResult(BaseModel):
    """LLM output for document parsing."""

    requirements: list[ParsedRequirement] = Field(
        description="List of requirements extracted from the document"
    )


# ── Task 2: Dependency Inference ──────────────────────────────────────────────

class InferredEdge(BaseModel):
    """Single dependency inferred by LLM."""

    source_index: int = Field(
        description="Index of source requirement in the input list"
    )
    target_index: int = Field(
        description="Index of target requirement in the input list"
    )
    relation_type: str = Field(
        description="'depends_on' or 'related_to'"
    )
    evidence: str = Field(
        description="Verbatim sentence from source docs supporting this edge"
    )
    confidence: float = Field(
        ge=0.0, le=1.0,
        description="How confident the model is in this connection",
    )


class InferenceResult(BaseModel):
    """LLM output for dependency inference."""

    edges: list[InferredEdge] = Field(
        description="List of inferred dependencies between requirements"
    )
