from pydantic import BaseModel, Field
from enum import Enum
from .edge import RelationType


class ImpactLevel(str, Enum):
    AFFECTED = "affected"                          # 확정 영향 (역방향 depends_on, 양방향 related_to)
    REVIEW_RECOMMENDED = "review_recommended"      # 검토 권장 (정방향 depends_on)


class ImpactItem(BaseModel):
    """A single affected requirement in impact analysis."""
    requirement_id: str
    requirement_title: str
    document_id: str
    document_filename: str
    char_start: int
    char_end: int
    display_label: str
    edge_id: str = Field(description="The edge that connects to changed node")
    relation_type: RelationType
    evidence: str
    impact_level: ImpactLevel = Field(
        description="'affected' for confirmed impact, "
        "'review_recommended' for forward depends_on"
    )


class ImpactResult(BaseModel):
    """Result of change impact analysis (1-hop)."""
    changed_requirement_ids: list[str]
    affected_items: list[ImpactItem] = Field(
        description="Items with impact_level='affected'"
    )
    review_items: list[ImpactItem] = Field(
        description="Items with impact_level='review_recommended'"
    )
    total_affected: int
    total_review: int
