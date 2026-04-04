from pydantic import BaseModel, Field
from .requirement import Requirement
from .edge import Edge, EdgeStatus, RelationType
from .impact import ImpactResult
from .document import Document


# --- Document ---
class DocumentListResponse(BaseModel):
    documents: list[Document]


# --- Parse ---
class ParseRequest(BaseModel):
    document_ids: list[str] = Field(
        description="IDs of documents to parse"
    )


class ParseResponse(BaseModel):
    requirements: list[Requirement]


# --- Requirements ---
class RequirementUpdateRequest(BaseModel):
    title: str | None = None
    changed: bool | None = None


class RequirementMergeRequest(BaseModel):
    requirement_ids: list[str] = Field(
        min_length=2,
        description="IDs of requirements to merge (same document, adjacent spans only)"
    )


class RequirementSplitRequest(BaseModel):
    requirement_id: str = Field(description="ID of requirement to split")
    split_offset: int = Field(
        description="Character offset within the requirement text where the split occurs"
    )


# --- Edges ---
class EdgeInferRequest(BaseModel):
    requirement_ids: list[str] | None = Field(
        default=None,
        description="Specific requirements to infer edges for. None = all."
    )


class EdgeCreateRequest(BaseModel):
    """Manual edge creation by PM. Status is auto-set to APPROVED."""
    source_id: str
    target_id: str
    relation_type: RelationType
    evidence: str = Field(default="Manually added by PM")


class EdgeUpdateRequest(BaseModel):
    status: EdgeStatus | None = None
    relation_type: RelationType | None = None
    evidence: str | None = None


class EdgeListResponse(BaseModel):
    edges: list[Edge]


# --- Impact ---
class ImpactResponse(BaseModel):
    result: ImpactResult


# --- Session ---
class SessionSaveResponse(BaseModel):
    filepath: str
    saved_at: str
