"""Data validation utilities for imported leads."""

from datetime import date, datetime
from typing import Any


def validate_row(row: dict, row_num: int) -> list[str]:
    """Validate a single mapped row. Returns list of error messages (empty = valid)."""
    errors: list[str] = []

    # Check for completely empty rows
    values = [v for v in row.values() if v is not None and v != ""]
    if not values:
        return []  # skip empty rows silently

    # Validate deal_amount if present
    deal_amount = row.get("deal_amount")
    if deal_amount is not None and deal_amount != "":
        if not _is_valid_number(deal_amount):
            errors.append(f"销售金额格式错误: {deal_amount}")

    # Validate refund_amount if present
    refund_amount = row.get("refund_amount")
    if refund_amount is not None and refund_amount != "":
        if not _is_valid_number(refund_amount):
            errors.append(f"退款金额格式错误: {refund_amount}")

    return errors


def _is_valid_number(val: Any) -> bool:
    """Check if a value can be converted to a number."""
    try:
        float(val)
        return True
    except (ValueError, TypeError):
        return False


def convert_numeric(val) -> float | None:
    """Convert a value to float, handling Chinese-style formatting."""
    if val is None or val == "" or val == "-":
        return None
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        cleaned = val.strip().replace(",", "").replace("，", "").replace("¥", "").replace("元", "")
        if cleaned == "" or cleaned == "-":
            return None
        try:
            return float(cleaned)
        except ValueError:
            return None
    return None


def convert_date(val) -> date | datetime | None:
    """Convert and validate a date value."""
    if val is None or val == "":
        return None
    if isinstance(val, (date, datetime)):
        return val
    if isinstance(val, str):
        val = val.strip()
        if not val or val == "-":
            return None
        for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M:%S"]:
            try:
                return datetime.strptime(val, fmt)
            except ValueError:
                continue
    return None


def parse_error_log(batch_id: str, errors: list[dict]) -> dict:
    """Format validation errors for storage."""
    return {
        "batch_id": batch_id,
        "errors": errors,
    }
