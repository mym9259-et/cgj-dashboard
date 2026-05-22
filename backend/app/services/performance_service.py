"""Personnel performance analysis service."""

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lead import Lead
from app.services.dashboard_service import _build_where_clauses, _apply_clauses


async def get_performance_ranking(
    db: AsyncSession,
    filters: list[dict] | None = None,
    filter_logic: str = "AND",
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:
    """Get salesperson performance ranking."""
    clauses = _build_where_clauses(filters, filter_logic, start_date, end_date)

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
    stmt = _apply_clauses(stmt, clauses)
    stmt = stmt.group_by(Lead.salesperson).order_by(func.count().filter(Lead.deal_status == "已成交").desc())

    result = await db.execute(stmt)
    rows = result.all()

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
    clauses = _build_where_clauses(None, "AND", start_date, end_date)
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
        "refunds": row.refunds or 0,
        "rank": 0,
    }

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
    monthly_trend = [
        {
            "day": str(r.day),
            "leads": r.leads,
            "contacted": r.contacted,
            "deals": r.deals,
            "revenue": float(r.revenue),
            "refunds": 0,
        }
        for r in trend_result.all()
    ]

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
        "monthly_trend": monthly_trend,
        "by_product": by_product,
        "by_model": by_model,
        "funnel": {
            "total_leads": t,
            "contacted": c,
            "deals": d,
        },
    }
