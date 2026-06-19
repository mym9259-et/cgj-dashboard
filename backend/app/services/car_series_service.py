"""Car series mapping management: import, query, match."""

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.car_series_mapping import CarSeriesMapping
from app.models.lead import Lead
from app.utils.excel_parser import read_excel_preview, stream_excel_rows


async def seed_from_excel(db: AsyncSession, filepath: str) -> dict:
    """Import car series mappings from an Excel file, overwriting existing data."""
    preview = read_excel_preview(filepath, 2)
    cols = [c["header"] for c in preview["columns"]]

    field_map = _build_field_map(cols)

    inserted = 0
    async with db.begin():
        await db.execute(delete(CarSeriesMapping))

        for batch in stream_excel_rows(filepath, field_map, batch_size=500):
            for row in batch:
                raw = row.get("raw_series") or row.get("_extra", {}).get("raw_series", "")
                if not raw:
                    continue
                mapping = CarSeriesMapping(
                    raw_series=str(raw).strip(),
                    clean_series=_str_or_none(row.get("clean_series")),
                    brand=_str_or_none(row.get("brand")),
                )
                db.add(mapping)
                inserted += 1

    return {"inserted": inserted, "columns_detected": len(cols)}


def _build_field_map(excel_columns: list[str]) -> dict[str, str]:
    """Map Excel headers to car_series_mapping fields."""
    mapping = {}
    for col in excel_columns:
        if "\u8f66\u7cfb" in col or "\u8f66\u578b" in col or "series" in col.lower():
            if "\u539f\u59cb" in col or "\u539f" in col or "raw" in col.lower():
                mapping[col] = "raw_series"
            elif "\u6e05\u6d17" in col or "\u6807\u51c6" in col or "clean" in col.lower() or "\u4fee\u6b63" in col:
                mapping[col] = "clean_series"
            elif "\u54c1\u724c" in col or "brand" in col.lower():
                mapping[col] = "brand"
            else:
                mapping[col] = "raw_series"
        elif "\u54c1\u724c" in col or "brand" in col.lower():
            mapping[col] = "brand"
        elif "\u539f\u59cb" in col or "\u539f\u540d\u79f0" in col or "\u539f\u8f66\u7cfb" in col:
            mapping[col] = "raw_series"
        elif "\u6807\u51c6" in col or "\u6e05\u6d17" in col or "\u683c\u5f0f\u5316" in col:
            mapping[col] = "clean_series"
    return mapping


async def get_unmatched_series(db: AsyncSession) -> dict:
    """Find car series in leads that don't have a mapping."""
    stmt = select(func.distinct(Lead.model_series)).where(
        Lead.model_series.isnot(None), Lead.model_series != ""
    )
    result = await db.execute(stmt)
    lead_series = [r[0] for r in result.all() if r[0]]

    stmt2 = select(CarSeriesMapping.raw_series)
    result2 = await db.execute(stmt2)
    mapped = {r[0] for r in result2.all() if r[0]}

    unmatched = [m for m in lead_series if m not in mapped]
    coverage = (len(lead_series) - len(unmatched)) / len(lead_series) if lead_series else 1.0

    return {
        "total_series": len(lead_series),
        "mapped_series": len(lead_series) - len(unmatched),
        "unmatched_series": unmatched[:200],
        "coverage": round(coverage, 4),
    }


async def list_all_mappings(db: AsyncSession) -> list[dict]:
    """List all car series mappings."""
    stmt = select(CarSeriesMapping).order_by(CarSeriesMapping.raw_series)
    result = await db.execute(stmt)
    return [_row_to_dict(r) for r in result.scalars().all()]


def _row_to_dict(row: CarSeriesMapping) -> dict:
    return {
        "id": row.id,
        "raw_series": row.raw_series,
        "clean_series": row.clean_series,
        "brand": row.brand,
    }


def _str_or_none(val) -> str | None:
    if val is None or val == "" or val == "-":
        return None
    return str(val).strip()[:500]
