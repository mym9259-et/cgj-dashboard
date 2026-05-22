"""Dashboard KPI calculation, trend data, and filter-based query builder."""

from datetime import date, datetime

from sqlalchemy import and_, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from app.models.lead import Lead


def build_filter_conditions(filters: list[dict], logic: str = "AND"):
    """Convert filter JSON to SQLAlchemy where conditions.

    Returns SQLAlchemy clause or None.
    """
    if not filters:
        return None

    conditions = []
    for f in filters:
        field = f.get("field", "")
        op = f.get("operator", "eq")
        value = f.get("value")

        if not hasattr(Lead, field):
            continue

        col = getattr(Lead, field)
        cond = _build_condition(col, op, value)
        if cond is not None:
            conditions.append(cond)

    if not conditions:
        return None

    if logic.upper() == "OR":
        return or_(*conditions)
    return and_(*conditions)


def _build_condition(col, op: str, value):
    """Build a single filter condition."""
    if value is None or value == "":
        return None
    if op == "eq":
        return col == value
    elif op == "neq":
        return col != value
    elif op == "in":
        if isinstance(value, list) and len(value) > 0:
            return col.in_(value)
        return None
    elif op == "nin":
        if isinstance(value, list) and len(value) > 0:
            return ~col.in_(value)
        return None
    elif op == "gte":
        return col >= value
    elif op == "lte":
        return col <= value
    elif op == "between":
        if isinstance(value, list) and len(value) == 2:
            return and_(col >= value[0], col <= value[1])
        return None
    elif op == "contains":
        return col.contains(str(value))
    elif op == "startswith":
        return col.startswith(str(value))
    return None


def _build_where_clauses(
    filters: list[dict] | None,
    filter_logic: str,
    start_date: date | None,
    end_date: date | None,
) -> list:
    """Build a flat list of SQLAlchemy WHERE conditions from all filter params."""
    clauses = []

    if start_date:
        start_dt = datetime.combine(start_date, datetime.min.time())
        clauses.append(Lead.create_time >= start_dt)
    if end_date:
        end_dt = datetime.combine(end_date, datetime.max.time())
        clauses.append(Lead.create_time <= end_dt)

    filter_cond = build_filter_conditions(filters or [], filter_logic)
    if filter_cond is not None:
        clauses.append(filter_cond)

    return clauses


def _apply_clauses(query: Select, clauses: list) -> Select:
    for c in clauses:
        query = query.where(c)
    return query


async def get_kpi_data(
    db: AsyncSession,
    filters: list[dict] | None = None,
    filter_logic: str = "AND",
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:
    """Calculate all KPI metrics."""
    clauses = _build_where_clauses(filters, filter_logic, start_date, end_date)

    total_stmt = select(func.count()).select_from(Lead)
    total_stmt = _apply_clauses(total_stmt, clauses)
    total = await db.scalar(total_stmt)
    total = total or 0

    if total == 0:
        return {
            "total_leads": 0, "deal_count": 0, "deal_rate": 0.0,
            "total_revenue": 0.0, "avg_deal_amount": 0.0,
            "contacted_count": 0, "contacted_rate": 0.0,
            "refund_count": 0, "refund_rate": 0.0, "refund_amount": 0.0,
        }

    contacted_clauses = clauses + [Lead.contact_status == "已触客"]
    contacted_stmt = select(func.count()).select_from(Lead)
    contacted_stmt = _apply_clauses(contacted_stmt, contacted_clauses)
    contacted = await db.scalar(contacted_stmt) or 0

    deal_clauses = clauses + [Lead.deal_status == "已成交"]
    deals_stmt = select(func.count()).select_from(Lead)
    deals_stmt = _apply_clauses(deals_stmt, deal_clauses)
    deals = await db.scalar(deals_stmt) or 0

    revenue_stmt = select(func.coalesce(func.sum(Lead.deal_amount), 0)).select_from(Lead)
    revenue_stmt = _apply_clauses(revenue_stmt, deal_clauses)
    revenue = await db.scalar(revenue_stmt) or 0
    revenue = float(revenue)

    refund_clauses = clauses + [Lead.deal_status == "已退款"]
    refund_stmt = select(func.count()).select_from(Lead)
    refund_stmt = _apply_clauses(refund_stmt, refund_clauses)
    refunds = await db.scalar(refund_stmt) or 0

    refund_amt_stmt = select(func.coalesce(func.sum(Lead.refund_amount), 0)).select_from(Lead)
    refund_amt_stmt = _apply_clauses(refund_amt_stmt, refund_clauses)
    refund_amount = await db.scalar(refund_amt_stmt) or 0
    refund_amount = float(refund_amount)

    return {
        "total_leads": total,
        "deal_count": deals,
        "deal_rate": round(deals / total, 4) if total > 0 else 0.0,
        "total_revenue": round(revenue, 2),
        "avg_deal_amount": round(revenue / deals, 2) if deals > 0 else 0.0,
        "contacted_count": contacted,
        "contacted_rate": round(contacted / total, 4) if total > 0 else 0.0,
        "refund_count": refunds,
        "refund_rate": round(refunds / total, 4) if total > 0 else 0.0,
        "refund_amount": round(refund_amount, 2),
    }


async def get_trend_data(
    db: AsyncSession,
    filters: list[dict] | None = None,
    filter_logic: str = "AND",
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[dict]:
    """Get daily trend data for time-series charts."""
    clauses = _build_where_clauses(filters, filter_logic, start_date, end_date)

    stmt = select(
        func.date(Lead.create_time).label("day"),
        func.count().label("leads"),
        func.count().filter(Lead.contact_status == "已触客").label("contacted"),
        func.count().filter(Lead.deal_status == "已成交").label("deals"),
        func.coalesce(func.sum(Lead.deal_amount).filter(Lead.deal_status == "已成交"), 0).label("revenue"),
        func.count().filter(Lead.deal_status == "已退款").label("refunds"),
    ).select_from(Lead)

    stmt = _apply_clauses(stmt, clauses)
    stmt = stmt.where(Lead.create_time.isnot(None))
    stmt = stmt.group_by(text("day")).order_by(text("day"))

    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "day": str(row.day),
            "leads": row.leads,
            "contacted": row.contacted,
            "deals": row.deals,
            "revenue": float(row.revenue),
            "refunds": row.refunds,
        }
        for row in rows
    ]


async def get_distinct_values(db: AsyncSession, fields: list[str]) -> dict[str, list[str]]:
    """Get distinct values for filter dropdowns."""
    result = {}
    for field_name in fields:
        if not hasattr(Lead, field_name):
            result[field_name] = []
            continue

        col = getattr(Lead, field_name)
        stmt = select(func.distinct(col)).where(col.isnot(None)).where(col != "").order_by(col)
        rows = await db.execute(stmt)
        values = [r[0] for r in rows.all() if r[0]]
        result[field_name] = values
    return result
