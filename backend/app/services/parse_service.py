"""Parse service: orchestrates LLM parsing for one or more documents."""
from __future__ import annotations

from app.llm.parser import parse_document
from app.models.document import Document
from app.models.requirement import Requirement
from app.storage.store import store


def parse_documents(documents: list[Document]) -> list[Requirement]:
    """Parse a list of documents via LLM and persist results.

    For each document, existing requirements from that document are removed
    before storing new ones (re-parse = overwrite).
    """
    all_requirements: list[Requirement] = []

    for doc in documents:
        # Remove previous requirements for this document
        existing_ids = [
            req_id
            for req_id, req in store.requirements.items()
            if req.location.document_id == doc.id
        ]
        for req_id in existing_ids:
            del store.requirements[req_id]

        # Parse and store new requirements
        new_reqs = parse_document(doc)
        for req in new_reqs:
            store.requirements[req.id] = req

        all_requirements.extend(new_reqs)

    return all_requirements
