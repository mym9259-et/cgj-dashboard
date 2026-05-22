"""Fuzzy column name matching engine for Excel header -> system field mapping."""

from difflib import SequenceMatcher

from app.core.constants import STANDARD_FIELDS


def suggest_mappings(excel_headers: list[str], threshold: float = 0.6) -> dict[str, str]:
    """Given a list of Excel column headers, return suggested mappings to system fields.

    Returns: {excel_header: system_field_name}

    Matching strategy (by priority):
    1. Exact match (case-insensitive) against any alias
    2. Substring match (header contains alias or alias contains header)
    3. SequenceMatcher ratio >= threshold
    """
    suggestions: dict[str, str] = {}
    used_fields: set[str] = set()

    for header in excel_headers:
        if not header:
            continue

        best_field = None
        best_score = 0.0

        for field_name, field_def in STANDARD_FIELDS.items():
            if field_name in used_fields:
                continue

            aliases = field_def["aliases"]
            score = _match_score(header, aliases)

            if score > best_score:
                best_score = score
                best_field = field_name

        if best_field and best_score >= threshold:
            suggestions[header] = best_field
            used_fields.add(best_field)

    return suggestions


def _match_score(header: str, aliases: list[str]) -> float:
    """Calculate a match score between a header and a list of aliases. Returns 0.0-1.0."""
    header_lower = header.lower().strip()

    for alias in aliases:
        alias_lower = alias.lower().strip()

        # 1. Exact match
        if header_lower == alias_lower:
            return 1.0

        # 2. Substring match
        if alias_lower in header_lower or header_lower in alias_lower:
            return 0.85

        # 3. Fuzzy ratio
        ratio = SequenceMatcher(None, header_lower, alias_lower).ratio()
        if ratio > 0.6:
            return ratio

    return 0.0
