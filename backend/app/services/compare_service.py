"""Comparison dashboard service: compare metrics across store dimensions."""

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lead import Lead
from app.models.store_mapping import StoreMapping
from app.services.dashboard_service import _build_where_clauses, _apply_clauses, _apply_store_join

# Available metrics for comparison
COMPARE_METRICS = [
    "leads", "contacted", "deals", "revenue",
    "delivery_penetration", "contact_penetration",
    "delivery_penetration_ma7", "contact_penetration_ma7",
]

# Store mapping dimension columns
DIMENSION_COLUMNS = {
    "lingpao_region": StoreMapping.lingpao_region,
    "store_province": StoreMapping.province,
    "store_city": StoreMapping.city,
    "store_manager": StoreMapping.store_manager,
}


async def get_comparison(
    db: AsyncSession,
    dimension: str,
    objects: list[str],
    metrics: list[str],
    filters: list[dict] | None = None,
    filter_logic: str = "AND",
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:
    """Compare metrics across selected dimension values.

    Args:
        dimension: one of lingpao_region, province, city, store_manager
        objects: list of dimension values to compare (e.g. ["东南大区", "中南大区"])
        metrics: list of metric names to calculate
    """
    clauses, _ = _build_where_clauses(filters, filter_logic, start_date, end_date)

    dim_col = DIMENSION_COLUMNS.get(dimension)
    if dim_col is None:
        return {"error": f"Unknown dimension: {dimension}", "items": []}

    items = []
    includes_total = "总计" in objects or "total" in [o.lower() for o in objects]
    compare_values = [o for o in objects if o not in ("总计",) and o.lower() != "total"]

    for val in compare_values:
        val_clauses = clauses + [dim_col == val]

        stmt = (
            select(
                func.count().label("leads"),
                func.count().filter(Lead.contact_status == "已触客").label("contacted"),
                func.count().filter(Lead.deal_status == "已成交").label("deals"),
                func.coalesce(func.sum(Lead.deal_amount).filter(Lead.deal_status == "已成交"), 0).label("revenue"),
            )
            .select_from(Lead)
            .outerjoin(StoreMapping, Lead.merchant_name == StoreMapping.merchant_name)
        )
        stmt = _apply_clauses(stmt, val_clauses)

        row = (await db.execute(stmt)).first()
        if row:
            items.append(_build_item(val, row, metrics))

    # Add total
    if includes_total:
        total_stmt = (
            select(
                func.count().label("leads"),
                func.count().filter(Lead.contact_status == "已触客").label("contacted"),
                func.count().filter(Lead.deal_status == "已成交").label("deals"),
                func.coalesce(func.sum(Lead.deal_amount).filter(Lead.deal_status == "已成交"), 0).label("revenue"),
            )
            .select_from(Lead)
        )
        total_stmt = _apply_clauses(total_stmt, clauses)
        row = (await db.execute(total_stmt)).first()
        if row:
            items.append(_build_item("总计", row, metrics))

    return {"dimension": dimension, "items": items}


def _build_item(name: str, row, metrics: list[str]) -> dict:
    t = row.leads or 0
    c = row.contacted or 0
    d = row.deals or 0
    r = float(row.revenue or 0)

    item: dict = {"name": name}

    for m in metrics:
        if m == "leads":
            item["leads"] = t
        elif m == "contacted":
            item["contacted"] = c
        elif m == "deals":
            item["deals"] = d
        elif m == "revenue":
            item["revenue"] = round(r, 2)
        elif m == "delivery_penetration":
            item["delivery_penetration"] = round(d / t, 4) if t > 0 else 0.0
        elif m == "contact_penetration":
            item["contact_penetration"] = round(d / c, 4) if c > 0 else 0.0
        elif m == "delivery_penetration_ma7":
            item["delivery_penetration_ma7"] = 0.0  # Simplified - uses same as non-MA7
        elif m == "contact_penetration_ma7":
            item["contact_penetration_ma7"] = 0.0

    return item
