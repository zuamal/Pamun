from pydantic import BaseModel, Field
from enum import Enum


class RelationType(str, Enum):
    DEPENDS_ON = "depends_on"    # Directed: source depends on target
    RELATED_TO = "related_to"    # Undirected: mutual relation


class EdgeStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class Edge(BaseModel):
    id: str = Field(description="Unique edge ID (auto-generated)")
    source_id: str = Field(description="Source requirement ID")
    target_id: str = Field(description="Target requirement ID")
    relation_type: RelationType
    evidence: str = Field(description="Evidence sentence from source docs")
    confidence: float = Field(
        ge=0.0, le=1.0,
        description="LLM confidence score (for review prioritization)"
    )
    status: EdgeStatus = Field(default=EdgeStatus.PENDING)
