"""Personnel performance analysis service."""

from datetime import date

from sqlalchemy import func, select, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lead import Lead
from app.services.dashboard_service import (
    _build_where_clauses, _apply_clauses, _apply_store_join_if_needed,
)


async def _get_merchants_for_salespeople(
    db: AsyncSession, clauses: list, salespeople: list[str]
) -> dict[str, str]:
    """Get comma-separated distinct merchant names for a list of salespeople."""
    if not salespeople:
        return {}

    stmt = (
        select(
            Lead.salesperson,
            func.string_agg(func.distinct(Lead.merchant_name), "，"),
        )
        .select_from(Lead)
        .where(Lead.salesperson.in_(salespeople))
        .where(Lead.merchant_name.isnot(None))
        .where(Lead.merchant_name != "")
    )
    stmt = _apply_clauses(stmt, clauses)
    stmt = stmt.group_by(Lead.salesperson)

    result = await db.execute(stmt)
    return {row[0]: row[1] or "" for row in result.all()}


async def get_performance_ranking(
    db: AsyncSession,
    filters: list[dict] | None = None,
    filter_logic: str = "AND",
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:
    """Get salesperson performance ranking."""
    clauses, needs_join = _build_where_clauses(filters, filter_logic, start_date, end_date)

    stmt = (
        select(
            Lead.salesperson.label("name"),
            func.count().label("total_leads"),
            func.count().filter(Lead.contact_status == "已触客").label("contacted"),
            func.count().filter(Lead.deal_status == "已成交").label("deals"),
            func.coalesce(func.sum(Lead.deal_amount).filter(Lead.deal_status == "已成交"), 0).label("revenue"),
            func.count().filter(Lead.deal_status == "已退款").label("refunds"),
        )
        .select_from(Lead)
        .where(Lead.salesperson.isnot(None))
        .where(Lead.salesperson != "")
    )
    stmt = _apply_store_join_if_needed(stmt, needs_join)
    stmt = _apply_clauses(stmt, clauses)
    stmt = stmt.group_by(Lead.salesperson).order_by(func.count().filter(Lead.deal_status == "已成交").desc())

    result = await db.execute(stmt)
    rows = result.all()

    # Collect salesperson names for merchant lookup
    all_salespeople = [row.name for row in rows]
    merchant_map = await _get_merchants_for_salespeople(db, clauses, all_salespeople)

    rankings = []
    for i, row in enumerate(rows):
        t = row.total_leads or 0
        d = row.deals or 0
        c = row.contacted or 0
        r = float(row.revenue or 0)
        rankings.append({
            "salesperson": row.name,
            "total_leads": t,
            "deals": d,
            "deal_rate": round(d / t, 4) if t else 0,
            "revenue": round(r, 2),
            "avg_deal": round(r / d, 2) if d else 0,
            "contacted_rate": round(c / t, 4) if t else 0,
            "delivery_penetration": round(d / t, 4) if t else 0,
            "contact_penetration": round(d / c, 4) if c else 0,
            "merchant_name": merchant_map.get(row.name, ""),
            "refunds": row.refunds or 0,
            "rank": i + 1,
        })

    avg_deal_rate = sum(r["deal_rate"] for r in rankings) / len(rankings) if rankings else 0
    top_performer = rankings[0]["salesperson"] if rankings else ""
    total_revenue = sum(r["revenue"] for r in rankings)

    return {
        "rankings": rankings,
        "team_summary": {
            "total_salespeople": len(rankings),
            "avg_deal_rate": round(avg_deal_rate, 4),
            "top_performer": top_performer,
            "total_revenue": round(total_revenue, 2),
        },
    }


async def get_performance_detail(
    db: AsyncSession,
    salesperson: str,
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:
    """Get detailed performance for a single salesperson."""
    clauses, _ = _build_where_clauses(None, "AND", start_date, end_date)
    clauses.append(Lead.salesperson == salesperson)

    summary_stmt = select(
        func.count().label("total_leads"),
        func.count().filter(Lead.contact_status == "已触客").label("contacted"),
        func.count().filter(Lead.deal_status == "已成交").label("deals"),
        func.coalesce(func.sum(Lead.deal_amount).filter(Lead.deal_status == "已成交"), 0).label("revenue"),
        func.count().filter(Lead.deal_status == "已退款").label("refunds"),
    ).select_from(Lead)
    summary_stmt = _apply_clauses(summary_stmt, clauses)

    row = (await db.execute(summary_stmt)).first()
    if not row or row.total_leads == 0:
        return {
            "salesperson": salesperson,
            "summary": None,
            "merchant_name": "",
            "monthly_trend": [],
            "by_product": [],
            "by_model": [],
            "funnel": {},
        }

    t = row.total_leads
    d = row.deals or 0
    c = row.contacted or 0
    r = float(row.revenue or 0)

    summary = {
        "salesperson": salesperson,
        "total_leads": t,
        "deals": d,
        "deal_rate": round(d / t, 4) if t else 0,
        "revenue": round(r, 2),
        "avg_deal": round(r / d, 2) if d else 0,
        "contacted_rate": round(c / t, 4) if t else 0,
        "delivery_penetration": round(d / t, 4) if t else 0,
        "contact_penetration": round(d / c, 4) if c else 0,
        "refunds": row.refunds or 0,
        "rank": 0,
        "merchant_name": "",
    }

    # Get merchant info
    merchant_stmt = (
        select(func.distinct(Lead.merchant_name))
        .select_from(Lead)
        .where(Lead.merchant_name.isnot(None))
        .where(Lead.merchant_name != "")
    )
    merchant_stmt = _apply_clauses(merchant_stmt, clauses)
    merchant_result = await db.execute(merchant_stmt)
    merchants = [r[0] for r in merchant_result.all() if r[0]]
    merchant_name = "，".join(merchants)

    # Monthly trend
    trend_stmt = (
        select(
            func.date(Lead.create_time).label("day"),
            func.count().label("leads"),
            func.count().filter(Lead.contact_status == "已触客").label("contacted"),
            func.count().filter(Lead.deal_status == "已成交").label("deals"),
            func.coalesce(func.sum(Lead.deal_amount).filter(Lead.deal_status == "已成交"), 0).label("revenue"),
        )
        .select_from(Lead)
        .where(Lead.create_time.isnot(None))
    )
    trend_stmt = _apply_clauses(trend_stmt, clauses)
    trend_stmt = trend_stmt.group_by(func.date(Lead.create_time)).order_by(func.date(Lead.create_time))

    trend_result = await db.execute(trend_stmt)
    monthly_trend = []
    for rt in trend_result.all():
        dt = rt.leads or 0
        dc = rt.contacted or 0
        dd = rt.deals or 0
        monthly_trend.append({
            "day": str(rt.day),
            "leads": dt,
            "contacted": dc,
            "deals": dd,
            "revenue": float(rt.revenue),
            "refunds": 0,
            "delivery_penetration": round(dd / dt, 4) if dt else 0,
            "contact_penetration": round(dd / dc, 4) if dc else 0,
            "contact_rate": round(dc / dt, 4) if dt else 0,
            "delivery_penetration_ma7": 0,
            "contact_penetration_ma7": 0,
        })

    # Calculate MA7 for trend
    for i, item in enumerate(monthly_trend):
        start_idx = max(0, i - 6)
        window = monthly_trend[start_idx : i + 1]
        sum_leads = sum(d["leads"] for d in window)
        sum_contacted = sum(d["contacted"] for d in window)
        sum_deals = sum(d["deals"] for d in window)
        item["delivery_penetration_ma7"] = round(sum_deals / sum_leads, 4) if sum_leads > 0 else 0
        item["contact_penetration_ma7"] = round(sum_deals / sum_contacted, 4) if sum_contacted > 0 else 0

    # By product
    by_product_stmt = (
        select(Lead.product_type.label("name"), func.count().label("count"))
        .select_from(Lead)
        .where(Lead.product_type.isnot(None))
    )
    by_product_stmt = _apply_clauses(by_product_stmt, clauses)
    by_product_stmt = by_product_stmt.group_by(Lead.product_type).order_by(func.count().desc())
    prod_result = await db.execute(by_product_stmt)
    by_product = [{"name": r.name, "count": r.count} for r in prod_result.all()]

    # By model
    by_model_stmt = (
        select(Lead.model_series.label("name"), func.count().label("count"))
        .select_from(Lead)
        .where(Lead.model_series.isnot(None))
    )
    by_model_stmt = _apply_clauses(by_model_stmt, clauses)
    by_model_stmt = by_model_stmt.group_by(Lead.model_series).order_by(func.count().desc()).limit(15)
    model_result = await db.execute(by_model_stmt)
    by_model = [{"name": r.name, "count": r.count} for r in model_result.all()]

    return {
        "salesperson": salesperson,
        "summary": summary,
        "merchant_name": merchant_name,
        "monthly_trend": monthly_trend,
        "by_product": by_product,
        "by_model": by_model,
        "funnel": {
            "total_leads": t,
            "contacted": c,
            "deals": d,
        },
    }
