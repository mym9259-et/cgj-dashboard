"""Conversion funnel analysis service."""

from datetime import date

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lead import Lead
from app.services.dashboard_service import _build_where_clauses, _apply_clauses


async def get_funnel_data(
    db: AsyncSession,
    filters: list[dict] | None = None,
    filter_logic: str = "AND",
    start_date: date | None = None,
    end_date: date | None = None,
    dimension: str | None = None,
) -> dict:
    """Calculate funnel stages: Total Leads -> Contacted -> Deals."""
    if dimension and hasattr(Lead, dimension):
        return await _funnel_by_dimension(db, filters, filter_logic, start_date, end_date, dimension)

    return await _funnel_overall(db, filters, filter_logic, start_date, end_date)


async def _funnel_overall(db, filters, filter_logic, start_date, end_date) -> dict:
    clauses = _build_where_clauses(filters, filter_logic, start_date, end_date)

    total_stmt = select(func.count()).select_from(Lead)
    total_stmt = _apply_clauses(total_stmt, clauses)
    total = await db.scalar(total_stmt) or 0

    contacted_stmt = select(func.count()).select_from(Lead)
    contacted_stmt = _apply_clauses(contacted_stmt, clauses + [Lead.contact_status == "已触客"])
    contacted = await db.scalar(contacted_stmt) or 0

    deal_stmt = select(func.count()).select_from(Lead)
    deal_stmt = _apply_clauses(deal_stmt, clauses + [Lead.deal_status == "已成交"])
    deals = await db.scalar(deal_stmt) or 0

    stages = [
        {"name": "全部线索", "count": total, "pct": 1.0, "rate_to_prev": None},
        {"name": "已触客", "count": contacted, "pct": round(contacted / total, 4) if total else 0, "rate_to_prev": round(contacted / total, 4) if total else 0},
        {"name": "已成交", "count": deals, "pct": round(deals / total, 4) if total else 0, "rate_to_prev": round(deals / contacted, 4) if contacted else 0},
    ]

    return {"stages": stages, "breakdown": {}}


async def _funnel_by_dimension(db, filters, filter_logic, start_date, end_date, dimension: str) -> dict:
    clauses = _build_where_clauses(filters, filter_logic, start_date, end_date)
    col = getattr(Lead, dimension)

    stmt = (
        select(
            col.label("dim_value"),
            func.count().label("total"),
            func.count().filter(Lead.contact_status == "已触客").label("contacted"),
            func.count().filter(Lead.deal_status == "已成交").label("deals"),
        )
        .select_from(Lead)
        .where(col.isnot(None))
        .where(col != "")
    )
    stmt = _apply_clauses(stmt, clauses)
    stmt = stmt.group_by(col).order_by(func.count().desc()).limit(30)

    result = await db.execute(stmt)
    rows = result.all()

    breakdown = []
    for row in rows:
        t = row.total or 0
        c = row.contacted or 0
        d = row.deals or 0
        breakdown.append({
            "name": row.dim_value,
            "total_leads": t,
            "contacted": c,
            "deals": d,
            "contact_rate": round(c / t, 4) if t else 0,
            "deal_rate": round(d / t, 4) if t else 0,
            "conversion_rate": round(d / c, 4) if c else 0,
        })

    overall = await _funnel_overall(db, filters, filter_logic, start_date, end_date)

    return {
        "stages": overall["stages"],
        "breakdown": {dimension: breakdown},
    }


async def get_funnel_comparison(
    db: AsyncSession,
    filters_a: list[dict],
    filters_b: list[dict],
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:
    """Compare funnels for two filter sets side by side."""
    result_a = await get_funnel_data(db, filters_a, "AND", start_date, end_date)
    result_b = await get_funnel_data(db, filters_b, "AND", start_date, end_date)

    return {
        "group_a": {"label": "对比组 A", "funnel": result_a["stages"]},
        "group_b": {"label": "对比组 B", "funnel": result_b["stages"]},
    }
