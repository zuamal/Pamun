from pydantic import BaseModel, Field


class RequirementLocation(BaseModel):
    """Where this requirement exists in the source document."""
    document_id: str
    char_start: int = Field(ge=0, description="Start offset in plain text")
    char_end: int = Field(ge=0, description="End offset in plain text")


class Requirement(BaseModel):
    id: str = Field(description="Unique requirement ID (auto-generated)")
    title: str = Field(description="Summary title (LLM-generated, PM-editable)")
    original_text: str = Field(description="Verbatim text from source document")
    location: RequirementLocation
    display_label: str = Field(
        description="Human-readable location label for UI display "
        "(e.g., '2.1 로그인 기능', '3번째 문단')"
    )
    changed: bool = Field(default=False, description="PM change flag")
