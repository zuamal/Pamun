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
_MAX_TOKENS = 8192
_DEFAULT_MODEL = "claude-sonnet-4-5"

_PARSE_PROMPT = """\
You are analyzing a software requirements document. \
Extract requirements at the SECTION level, not at the individual sentence level.

For EACH requirement provide:
- title: a short descriptive title (max 10 words)
- original_text: the EXACT verbatim text from the document (no paraphrasing)
- char_start: the character index in the document where the requirement text begins (0-based)
- char_end: the character index where the requirement text ends (exclusive)
- display_label: a human-readable location hint for the UI \
  (e.g., the enclosing section heading or "paragraph N")

Rules:
- Use section headings (e.g., ##, ###, or equivalent) as the PRIMARY boundary \
  for splitting requirements. One heading = one requirement.
- If a section has no headings, group by coherent topic (one paragraph or \
  a small cluster of related paragraphs = one requirement).
- Do NOT split a single section into multiple requirements based on individual \
  sentences or conditions within that section.
- Aim for 5–20 requirements per document. If you find more than 20, \
  you are likely splitting too finely.
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

        # If the extracted text doesn't match, find the nearest occurrence
        if raw[char_start:char_end] != parsed_req.original_text:
            text = parsed_req.original_text
            best_pos = -1
            best_dist: float = float('inf')
            search_from = 0
            while True:
                pos = raw.find(text, search_from)
                if pos == -1:
                    break
                dist = abs(pos - parsed_req.char_start)
                if dist < best_dist:
                    best_dist = dist
                    best_pos = pos
                search_from = pos + 1
            if best_pos != -1:
                char_start = best_pos
                char_end = best_pos + len(text)

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
