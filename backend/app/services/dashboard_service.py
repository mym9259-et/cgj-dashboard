"""Dashboard KPI calculation, trend data, and filter-based query builder."""

from datetime import date, datetime

from sqlalchemy import and_, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from app.core.constants import STORE_MAPPING_FIELDS
from app.models.lead import Lead
from app.models.store_mapping import StoreMapping


def _needs_store_join(filters: list[dict] | None) -> bool:
    """Check if any filter references a store mapping field."""
    if not filters:
        return False
    for f in filters:
        if f.get("field", "") in STORE_MAPPING_FIELDS:
            return True
    return False


def _apply_store_join(query: Select) -> Select:
    """Add LEFT JOIN to store_mappings for queries that need store fields."""
    return query.outerjoin(
        StoreMapping,
        Lead.merchant_name == StoreMapping.merchant_name,
    )


def build_filter_conditions(filters: list[dict], logic: str = "AND"):
    """Convert filter JSON to SQLAlchemy where conditions.

    Returns SQLAlchemy clause or None, and a bool indicating if store join is needed.
    """
    if not filters:
        return None

    conditions = []
    for f in filters:
        field = f.get("field", "")
        op = f.get("operator", "eq")
        value = f.get("value")

        # Check if this is a store mapping field
        if field in STORE_MAPPING_FIELDS:
            col_name = STORE_MAPPING_FIELDS[field]
            col = getattr(StoreMapping, col_name)
        elif hasattr(Lead, field):
            col = getattr(Lead, field)
        else:
            continue

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
) -> tuple[list, bool]:
    """Build a flat list of SQLAlchemy WHERE conditions + store_join flag."""
    clauses = []
    needs_join = _needs_store_join(filters)

    if start_date:
        start_dt = datetime.combine(start_date, datetime.min.time())
        clauses.append(Lead.create_time >= start_dt)
    if end_date:
        end_dt = datetime.combine(end_date, datetime.max.time())
        clauses.append(Lead.create_time <= end_dt)

    filter_cond = build_filter_conditions(filters or [], filter_logic)
    if filter_cond is not None:
        clauses.append(filter_cond)

    return clauses, needs_join


def _apply_clauses(query: Select, clauses: list) -> Select:
    for c in clauses:
        query = query.where(c)
    return query


def _apply_store_join_if_needed(query: Select, needs_join: bool) -> Select:
    if needs_join:
        query = _apply_store_join(query)
    return query


def _count(clauses: list, needs_join: bool = False, extra: list | None = None) -> Select:
    s = select(func.count()).select_from(Lead)
    s = _apply_store_join_if_needed(s, needs_join)
    s = _apply_clauses(s, clauses)
    if extra:
        s = _apply_clauses(s, extra)
    return s


def _sum(col, clauses: list, needs_join: bool = False) -> Select:
    s = select(func.coalesce(func.sum(col), 0)).select_from(Lead)
    s = _apply_store_join_if_needed(s, needs_join)
    return _apply_clauses(s, clauses)


async def get_kpi_data(
    db: AsyncSession,
    filters: list[dict] | None = None,
    filter_logic: str = "AND",
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:
    """Calculate all KPI metrics.

    - 总交付数 = total rows (each row = one delivery record)
    - 交付渗透率 = deals / total (deals per delivery)
    - 触客渗透率 = deals / contacted (deals per contacted lead)
    - 触客率 = contacted / total (contact rate)
    """
    clauses, needs_join = _build_where_clauses(filters, filter_logic, start_date, end_date)

    total = await db.scalar(_count(clauses, needs_join)) or 0

    if total == 0:
        return {
            "total_leads": 0, "deal_count": 0, "deal_rate": 0.0,
            "total_revenue": 0.0, "avg_deal_amount": 0.0,
            "contacted_count": 0, "contacted_rate": 0.0,
            "refund_count": 0, "refund_rate": 0.0, "refund_amount": 0.0,
            "delivery_penetration": 0.0, "contact_penetration": 0.0,
            "contact_rate": 0.0,
        }

    contacted = await db.scalar(_count(clauses, needs_join, [Lead.contact_status == "已触客"])) or 0
    deals = await db.scalar(_count(clauses, needs_join, [Lead.deal_status == "已成交"])) or 0

    revenue = await db.scalar(_sum(Lead.deal_amount, clauses + [Lead.deal_status == "已成交"], needs_join)) or 0
    revenue = float(revenue)

    refunds = await db.scalar(_count(clauses, needs_join, [Lead.deal_status == "已退款"])) or 0
    refund_amount = await db.scalar(_sum(Lead.refund_amount, clauses + [Lead.deal_status == "已退款"], needs_join)) or 0
    refund_amount = float(refund_amount)

    # New metrics
    delivery_penetration = round(deals / total, 4) if total > 0 else 0.0
    contact_penetration = round(deals / contacted, 4) if contacted > 0 else 0.0
    contact_rate = round(contacted / total, 4) if total > 0 else 0.0

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
        "delivery_penetration": delivery_penetration,
        "contact_penetration": contact_penetration,
        "contact_rate": contact_rate,
    }


async def get_trend_data(
    db: AsyncSession,
    filters: list[dict] | None = None,
    filter_logic: str = "AND",
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[dict]:
    """Get daily trend data with penetration rates and MA7 indicators.

    Returns daily: leads, contacted, deals, revenue, refunds,
    delivery_penetration, contact_penetration, contact_rate,
    and MA7 versions of penetration rates.
    """
    clauses, needs_join = _build_where_clauses(filters, filter_logic, start_date, end_date)

    stmt = select(
        func.date(Lead.create_time).label("day"),
        func.count().label("leads"),
        func.count().filter(Lead.contact_status == "已触客").label("contacted"),
        func.count().filter(Lead.deal_status == "已成交").label("deals"),
        func.coalesce(func.sum(Lead.deal_amount).filter(Lead.deal_status == "已成交"), 0).label("revenue"),
        func.count().filter(Lead.deal_status == "已退款").label("refunds"),
    ).select_from(Lead)

    stmt = _apply_store_join_if_needed(stmt, needs_join)
    stmt = _apply_clauses(stmt, clauses)
    stmt = stmt.where(Lead.create_time.isnot(None))
    stmt = stmt.group_by(text("day")).order_by(text("day"))

    result = await db.execute(stmt)
    rows = result.all()

    # Build raw daily data
    daily = []
    for row in rows:
        t = row.leads or 0
        c = row.contacted or 0
        d = row.deals or 0
        daily.append({
            "day": str(row.day),
            "leads": t,
            "contacted": c,
            "deals": d,
            "revenue": float(row.revenue),
            "refunds": row.refunds or 0,
            "delivery_penetration": round(d / t, 4) if t > 0 else 0.0,
            "contact_penetration": round(d / c, 4) if c > 0 else 0.0,
            "contact_rate": round(c / t, 4) if t > 0 else 0.0,
        })

    # Calculate MA7 (7-day moving average of the ratio, not average of individual daily ratios)
    # MA7 delivery_penetration = sum(deals[last 7 days]) / sum(leads[last 7 days])
    for i, item in enumerate(daily):
        start_idx = max(0, i - 6)
        window = daily[start_idx : i + 1]
        sum_leads = sum(d["leads"] for d in window)
        sum_contacted = sum(d["contacted"] for d in window)
        sum_deals = sum(d["deals"] for d in window)

        if sum_leads > 0:
            item["delivery_penetration_ma7"] = round(sum_deals / sum_leads, 4)
        else:
            item["delivery_penetration_ma7"] = 0.0

        if sum_contacted > 0:
            item["contact_penetration_ma7"] = round(sum_deals / sum_contacted, 4)
        else:
            item["contact_penetration_ma7"] = 0.0

    return daily


async def get_distinct_values(db: AsyncSession, fields: list[str]) -> dict[str, list[str]]:
    """Get distinct values for filter dropdowns (supports both Lead and StoreMapping fields)."""
    result = {}
    for field_name in fields:
        if field_name in STORE_MAPPING_FIELDS:
            col_name = STORE_MAPPING_FIELDS[field_name]
            col = getattr(StoreMapping, col_name)
            stmt = select(func.distinct(col)).where(col.isnot(None)).where(col != "").order_by(col)
            rows = await db.execute(stmt)
            values = [r[0] for r in rows.all() if r[0]]
            result[field_name] = values
        elif hasattr(Lead, field_name):
            col = getattr(Lead, field_name)
            stmt = select(func.distinct(col)).where(col.isnot(None)).where(col != "").order_by(col)
            rows = await db.execute(stmt)
            values = [r[0] for r in rows.all() if r[0]]
            result[field_name] = values
        else:
            result[field_name] = []
    return result
