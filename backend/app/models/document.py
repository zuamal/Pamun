from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime


class DocumentFormat(str, Enum):
    MARKDOWN = "markdown"
    DOCX = "docx"
    PDF = "pdf"


class Document(BaseModel):
    id: str = Field(description="Unique document ID (auto-generated)")
    filename: str = Field(description="Original filename")
    format: DocumentFormat
    raw_text: str = Field(description="Plain text extracted from document")
    uploaded_at: datetime = Field(default_factory=datetime.now)
