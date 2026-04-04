"""Text extraction service for Markdown, DOCX, and PDF documents."""
from __future__ import annotations

import io

import pdfplumber
import docx

from app.models.document import DocumentFormat


_EXTENSION_FORMAT: dict[str, DocumentFormat] = {
    ".md": DocumentFormat.MARKDOWN,
    ".docx": DocumentFormat.DOCX,
    ".pdf": DocumentFormat.PDF,
}


def detect_format(filename: str) -> DocumentFormat | None:
    """Return DocumentFormat based on file extension, or None if unsupported."""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return _EXTENSION_FORMAT.get(ext)


def extract_text(content: bytes, fmt: DocumentFormat) -> str:
    """Extract plain text from document bytes.

    Raises:
        ValueError: If a scanned PDF has no extractable text.
    """
    if fmt == DocumentFormat.MARKDOWN:
        return content.decode("utf-8")

    if fmt == DocumentFormat.DOCX:
        document = docx.Document(io.BytesIO(content))
        paragraphs = [p.text for p in document.paragraphs if p.text.strip()]
        return "\n".join(paragraphs)

    if fmt == DocumentFormat.PDF:
        pages: list[str] = []
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages.append(text)
        if not pages:
            raise ValueError(
                "텍스트를 추출할 수 없습니다. 텍스트 기반 PDF만 지원합니다."
            )
        return "\n".join(pages)

    raise ValueError(f"Unsupported format: {fmt}")  # pragma: no cover
