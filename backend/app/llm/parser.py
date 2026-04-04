"""LLM-based requirement parser using Instructor + Anthropic Claude."""
from __future__ import annotations

import os
import uuid

import anthropic
import instructor

from app.llm.schemas import ParseResult
from app.models.document import Document
from app.models.requirement import Requirement, RequirementLocation

_MAX_RETRIES = 3
_MAX_TOKENS = 4096
_DEFAULT_MODEL = "claude-sonnet-4-5"

_PARSE_PROMPT = """\
You are analyzing a software requirements document. \
Extract all distinct functional and non-functional requirements from the text.

For EACH requirement provide:
- title: a short descriptive title (max 10 words)
- original_text: the EXACT verbatim text from the document (no paraphrasing)
- char_start: the character index in the document where the requirement text begins (0-based)
- char_end: the character index where the requirement text ends (exclusive)
- display_label: a human-readable location hint for the UI \
  (e.g., the enclosing section heading, "paragraph 3", or a short phrase)

Rules:
- Extract up to 50 requirements maximum.
- Use section headings as natural boundaries when present; \
  otherwise group by semantic meaning.
- char_start and char_end must be exact positions in the original document text \
  such that document_text[char_start:char_end] == original_text.
- Do not overlap requirements.

Document text (use character positions from this exact string):
---
{raw_text}
---
"""


def _get_client() -> instructor.Instructor:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError(
            "ANTHROPIC_API_KEY가 설정되지 않았습니다. backend/.env 파일을 확인하세요."
        )
    return instructor.from_anthropic(anthropic.Anthropic(api_key=api_key))



def parse_document(doc: Document) -> list[Requirement]:
    """Call Anthropic Claude via Instructor to extract requirements from a document.

    Returns a list of Requirement objects ready for storage.
    Raises ValueError if ANTHROPIC_API_KEY is missing.
    """
    client = _get_client()
    model = os.getenv("LLM_MODEL", _DEFAULT_MODEL)
    prompt = _PARSE_PROMPT.format(raw_text=doc.raw_text)

    result: ParseResult = client.messages.create(
        model=model,
        max_tokens=_MAX_TOKENS,
        messages=[{"role": "user", "content": prompt}],
        response_model=ParseResult,
        max_retries=_MAX_RETRIES,
    )

    requirements: list[Requirement] = []
    raw = doc.raw_text

    for parsed_req in result.requirements:
        char_start = parsed_req.char_start
        char_end = parsed_req.char_end

        # Clamp to valid range
        char_start = max(0, min(char_start, len(raw)))
        char_end = max(char_start, min(char_end, len(raw)))

        # If the extracted text doesn't match, try to find it
        if raw[char_start:char_end] != parsed_req.original_text:
            pos = raw.find(parsed_req.original_text)
            if pos != -1:
                char_start = pos
                char_end = pos + len(parsed_req.original_text)

        req = Requirement(
            id=str(uuid.uuid4()),
            title=parsed_req.title,
            original_text=parsed_req.original_text,
            location=RequirementLocation(
                document_id=doc.id,
                char_start=char_start,
                char_end=char_end,
            ),
            display_label=parsed_req.display_label,
            changed=False,
        )
        requirements.append(req)

    return requirements
