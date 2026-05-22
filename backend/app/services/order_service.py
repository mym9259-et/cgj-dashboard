"""Order structure analysis service."""

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lead import Lead
from app.services.dashboard_service import _build_where_clauses, _apply_clauses


async def get_order_structure(
    db: AsyncSession,
    filters: list[dict] | None = None,
    filter_logic: str = "AND",
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:
    """Get complete order structure analysis."""
    clauses = _build_where_clauses(filters, filter_logic, start_date, end_date)

    # Product distribution (deals only)
    deal_clauses = clauses + [Lead.deal_status == "已成交"]
    by_type = await _group_count(db, deal_clauses, "product_type")
    by_source = await _group_count(db, deal_clauses, "product_source")
    by_years = await _group_count(db, deal_clauses, "product_years")

    # Brand/Model ranking (all leads)
    by_brand = await _group_count(db, clauses, "brand")
    by_model = await _group_count(db, clauses, "model_series")

    # Price ranges (deals only)
    price_ranges = await _price_ranges(db, deal_clauses)

    # Demographics (all leads)
    gender = await _group_count(db, clauses, "gender")
    age_group = await _group_count(db, clauses, "age_group")
    by_owner_type = await _group_count(db, clauses, "owner_type")
    by_payment = await _group_count(db, clauses, "payment_method")

    return {
        "product_distribution": {
            "by_type": by_type,
            "by_source": by_source,
            "by_years": by_years,
        },
        "brand_model_ranking": {
            "by_brand": by_brand,
            "by_model": by_model,
        },
        "price_ranges": price_ranges,
        "demographics": {
            "gender": gender,
            "age_group": age_group,
            "owner_type": by_owner_type,
            "payment_method": by_payment,
        },
    }


async def _group_count(db: AsyncSession, clauses: list, field: str) -> list[dict]:
    if not hasattr(Lead, field):
        return []

    col = getattr(Lead, field)
    stmt = (
        select(col.label("name"), func.count().label("count"))
        .select_from(Lead)
        .where(col.isnot(None))
        .where(col != "")
    )
    stmt = _apply_clauses(stmt, clauses)
    stmt = stmt.group_by(col).order_by(func.count().desc()).limit(30)

    result = await db.execute(stmt)
    return [{"name": r.name, "count": r.count} for r in result.all()]


async def _price_ranges(db: AsyncSession, clauses: list) -> list[dict]:
    ranges = [
        (0, 2000, "0-2000"),
        (2000, 3000, "2000-3000"),
        (3000, 4000, "3000-4000"),
        (4000, 5000, "4000-5000"),
        (5000, 6000, "5000-6000"),
        (6000, 8000, "6000-8000"),
        (8000, 10000, "8000-10000"),
        (10000, 999999, "10000+"),
    ]

    all_clauses = clauses + [Lead.deal_amount.isnot(None)]
    results = []
    for low, high, label in ranges:
        range_clauses = all_clauses + [Lead.deal_amount >= low, Lead.deal_amount < high]
        stmt = (
            select(
                func.count().label("count"),
                func.coalesce(func.sum(Lead.deal_amount), 0).label("revenue"),
            )
            .select_from(Lead)
        )
        stmt = _apply_clauses(stmt, range_clauses)
        row = (await db.execute(stmt)).first()
        results.append({
            "range_label": label,
            "count": row.count if row else 0,
            "revenue": float(row.revenue) if row and row.revenue else 0.0,
        })

    return results
