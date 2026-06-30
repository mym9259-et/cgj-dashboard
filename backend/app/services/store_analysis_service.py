"""Single-store operating analysis aggregations."""

from calendar import monthrange
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import CONTACT_STATUS_REACHED, DEAL_STATUS_SUCCESS
from app.models.lead import Lead
from app.services.dashboard_service import TREND_SERIES_GROUPS, _series_group_condition


PERIOD_METRIC_KEYS = (
    "deliveries",
    "contacted",
    "deals",
    "contact_rate",
    "contact_penetration",
    "delivery_penetration",
    "total_revenue",
    "avg_deal_amount",
    "wuyou_five_year_ratio",
    "a_series_ratio",
    "a_series_contact_penetration",
    "b_series_ratio",
    "b_series_contact_penetration",
    "c_series_ratio",
    "c_series_contact_penetration",
    "d_series_ratio",
    "d_series_contact_penetration",
    "lafa_series_ratio",
    "lafa_series_contact_penetration",
    "avg_daily_deliveries",
    "avg_daily_contacted",
    "avg_daily_deals",
    "avg_daily_revenue",
)

SCORE_DIMENSIONS = (
    ("regional_consumption", "区域宏观环境/消费力"),
    ("operating_environment", "门店经营环境"),
    ("delivery_penetration", "门店交付渗透率"),
    ("referral_contact", "门店引荐率/触客率"),
    ("workforce_health", "人力健康度"),
)


def _safe_ratio(numerator: float, denominator: float) -> float:
    return round(numerator / denominator, 4) if denominator else 0.0


def _month_start(value: date) -> date:
    return value.replace(day=1)


def _shift_month(value: date, offset: int) -> date:
    month_index = value.year * 12 + value.month - 1 + offset
    return date(month_index // 12, month_index % 12 + 1, 1)


def _month_end(value: date) -> date:
    return value.replace(day=monthrange(value.year, value.month)[1])


def build_periods(granularity: str, end_date: date, earliest_date: date | None) -> list[dict]:
    """Build six visible periods plus one hidden predecessor for comparisons."""
    periods: list[dict] = []
    if granularity == "month":
        anchor_month = _month_start(end_date)
        for offset in range(-6, 1):
            start = _shift_month(anchor_month, offset)
            natural_end = _month_end(start)
            period_end = min(natural_end, end_date) if offset == 0 else natural_end
            periods.append({
                "key": start.strftime("%Y-%m"),
                "label": f"{start.year}年{start.month}月" + (" MTD" if period_end < natural_end else ""),
                "start_date": start,
                "end_date": period_end,
                "day_count": (period_end - start).days + 1,
                "is_partial": period_end < natural_end,
            })
    else:
        for offset in range(6, -1, -1):
            period_end = end_date - timedelta(days=offset * 7)
            start = period_end - timedelta(days=6)
            periods.append({
                "key": f"{start.isoformat()}_{period_end.isoformat()}",
                "label": f"{start.strftime('%m/%d')}-{period_end.strftime('%m/%d')}",
                "start_date": start,
                "end_date": period_end,
                "day_count": 7,
                "is_partial": False,
            })

    visible = periods[1:]
    if earliest_date is not None:
        visible = [period for period in visible if period["end_date"] >= earliest_date]
    if not visible:
        return []

    first_visible_index = periods.index(visible[0])
    return periods[max(0, first_visible_index - 1):]


def _empty_accumulator() -> dict:
    data = {
        "deliveries": 0,
        "contacted": 0,
        "deals": 0,
        "total_revenue": 0.0,
        "wuyou_deals": 0,
        "wuyou_five_year_deals": 0,
    }
    for key in TREND_SERIES_GROUPS:
        data[f"{key}_count"] = 0
        data[f"{key}_contacted"] = 0
        data[f"{key}_deals"] = 0
    return data


def calculate_period_metrics(data: dict, day_count: int) -> dict:
    deliveries = data["deliveries"]
    contacted = data["contacted"]
    deals = data["deals"]
    revenue = float(data["total_revenue"])
    metrics = {
        "deliveries": deliveries,
        "contacted": contacted,
        "deals": deals,
        "contact_rate": _safe_ratio(contacted, deliveries),
        "contact_penetration": _safe_ratio(deals, contacted),
        "delivery_penetration": _safe_ratio(deals, deliveries),
        "total_revenue": round(revenue, 2),
        "avg_deal_amount": round(revenue / deals, 2) if deals else 0.0,
        "wuyou_five_year_ratio": _safe_ratio(
            data["wuyou_five_year_deals"], data["wuyou_deals"]
        ),
        "avg_daily_deliveries": round(deliveries / day_count, 2),
        "avg_daily_contacted": round(contacted / day_count, 2),
        "avg_daily_deals": round(deals / day_count, 2),
        "avg_daily_revenue": round(revenue / day_count, 2),
    }
    for key in TREND_SERIES_GROUPS:
        metrics[f"{key}_ratio"] = _safe_ratio(data[f"{key}_count"], deliveries)
        metrics[f"{key}_contact_penetration"] = _safe_ratio(
            data[f"{key}_deals"], data[f"{key}_contacted"]
        )
    return metrics


def calculate_changes(current: dict, previous: dict | None) -> dict[str, float | None]:
    changes: dict[str, float | None] = {}
    for key in PERIOD_METRIC_KEYS:
        previous_value = previous.get(key, 0) if previous else 0
        changes[key] = (
            round((current[key] - previous_value) / previous_value, 4)
            if previous_value
            else None
        )
    return changes


def accumulate_period_rows(rows: list, start_date: date, end_date: date) -> dict:
    accumulator = _empty_accumulator()
    for row in rows:
        if start_date <= row.day <= end_date:
            for key in accumulator:
                value = getattr(row, key) or 0
                accumulator[key] += float(value) if key == "total_revenue" else value
    return accumulator


async def search_stores(db: AsyncSession, keyword: str = "", limit: int = 50) -> list[str]:
    stmt = (
        select(Lead.merchant_name)
        .where(Lead.merchant_name.isnot(None), Lead.merchant_name != "")
        .distinct()
        .order_by(Lead.merchant_name)
        .limit(limit)
    )
    if keyword.strip():
        stmt = stmt.where(Lead.merchant_name.ilike(f"%{keyword.strip()}%"))
    rows = await db.execute(stmt)
    return [row[0] for row in rows.all()]


async def get_score_placeholder() -> dict:
    return {
        "status": "placeholder",
        "total_score": None,
        "dimensions": [
            {"key": key, "label": label, "score": None}
            for key, label in SCORE_DIMENSIONS
        ],
    }


def _daily_aggregate_statement(store_name: str, start_date: date, end_date: date):
    return (
        select(
            Lead.delivery_date.label("day"),
            func.count().label("deliveries"),
            func.count().filter(Lead.contact_status == CONTACT_STATUS_REACHED).label("contacted"),
            func.count().filter(Lead.deal_status == DEAL_STATUS_SUCCESS).label("deals"),
            func.coalesce(
                func.sum(Lead.deal_amount).filter(Lead.deal_status == DEAL_STATUS_SUCCESS), 0
            ).label("total_revenue"),
            func.count().filter(
                Lead.deal_status == DEAL_STATUS_SUCCESS,
                Lead.product_type == "无忧产品",
            ).label("wuyou_deals"),
            func.count().filter(
                Lead.deal_status == DEAL_STATUS_SUCCESS,
                Lead.product_type == "无忧产品",
                Lead.product_years.in_(["5"]),
            ).label("wuyou_five_year_deals"),
            *[
                func.count().filter(_series_group_condition(series)).label(f"{key}_count")
                for key, series in TREND_SERIES_GROUPS.items()
            ],
            *[
                func.count().filter(
                    _series_group_condition(series),
                    Lead.contact_status == CONTACT_STATUS_REACHED,
                ).label(f"{key}_contacted")
                for key, series in TREND_SERIES_GROUPS.items()
            ],
            *[
                func.count().filter(
                    _series_group_condition(series),
                    Lead.deal_status == DEAL_STATUS_SUCCESS,
                ).label(f"{key}_deals")
                for key, series in TREND_SERIES_GROUPS.items()
            ],
        )
        .select_from(Lead)
        .where(
            Lead.merchant_name == store_name,
            Lead.delivery_date >= start_date,
            Lead.delivery_date <= end_date,
        )
        .group_by(Lead.delivery_date)
        .order_by(Lead.delivery_date)
    )


async def get_period_comparison(
    db: AsyncSession,
    store_name: str,
    end_date: date,
    granularity: str,
) -> dict:
    earliest_date = await db.scalar(
        select(func.min(Lead.delivery_date)).where(
            Lead.merchant_name == store_name,
            Lead.delivery_date.isnot(None),
        )
    )
    periods = build_periods(granularity, end_date, earliest_date)
    if not periods:
        return {"granularity": granularity, "periods": []}

    rows = (
        await db.execute(
            _daily_aggregate_statement(
                store_name, periods[0]["start_date"], periods[-1]["end_date"]
            )
        )
    ).all()

    period_metrics: list[dict] = []
    for period in periods:
        accumulator = accumulate_period_rows(
            rows, period["start_date"], period["end_date"]
        )
        period_metrics.append(calculate_period_metrics(accumulator, period["day_count"]))

    visible_periods = []
    for index in range(1, len(periods)):
        visible_periods.append({
            **periods[index],
            "metrics": period_metrics[index],
            "changes": calculate_changes(period_metrics[index], period_metrics[index - 1]),
        })

    return {"granularity": granularity, "periods": visible_periods}


async def get_salespeople_metrics(
    db: AsyncSession,
    store_name: str,
    start_date: date,
    end_date: date,
) -> dict:
    series_contact_columns = [
        func.count().filter(
            _series_group_condition(series),
            Lead.contact_status == CONTACT_STATUS_REACHED,
        ).label(f"{key}_contacted")
        for key, series in TREND_SERIES_GROUPS.items()
    ]
    store_totals_stmt = (
        select(*series_contact_columns)
        .select_from(Lead)
        .where(
            Lead.merchant_name == store_name,
            Lead.delivery_date >= start_date,
            Lead.delivery_date <= end_date,
        )
    )
    store_totals = (await db.execute(store_totals_stmt)).one()

    stmt = (
        select(
            Lead.salesperson,
            func.count().label("deliveries"),
            func.count().filter(Lead.contact_status == CONTACT_STATUS_REACHED).label("contacted"),
            func.count().filter(Lead.deal_status == DEAL_STATUS_SUCCESS).label("deals"),
            func.coalesce(
                func.sum(Lead.deal_amount).filter(Lead.deal_status == DEAL_STATUS_SUCCESS), 0
            ).label("total_revenue"),
            func.count().filter(
                Lead.deal_status == DEAL_STATUS_SUCCESS,
                Lead.product_type == "无忧产品",
            ).label("wuyou_deals"),
            func.count().filter(
                Lead.deal_status == DEAL_STATUS_SUCCESS,
                Lead.product_type == "无忧产品",
                Lead.product_years.in_(["5"]),
            ).label("wuyou_five_year_deals"),
            *series_contact_columns,
            *[
                func.count().filter(
                    _series_group_condition(series),
                    Lead.deal_status == DEAL_STATUS_SUCCESS,
                ).label(f"{key}_deals")
                for key, series in TREND_SERIES_GROUPS.items()
            ],
        )
        .select_from(Lead)
        .where(
            Lead.merchant_name == store_name,
            Lead.delivery_date >= start_date,
            Lead.delivery_date <= end_date,
            Lead.salesperson.isnot(None),
            Lead.salesperson != "",
        )
        .group_by(Lead.salesperson)
    )
    rows = (await db.execute(stmt)).all()

    items = []
    for row in rows:
        item = {
            "salesperson": row.salesperson,
            "deliveries": row.deliveries or 0,
            "contacted": row.contacted or 0,
            "deals": row.deals or 0,
            "contact_penetration": _safe_ratio(row.deals or 0, row.contacted or 0),
            "avg_deal_amount": round(float(row.total_revenue or 0) / row.deals, 2)
            if row.deals
            else 0.0,
            "wuyou_five_year_ratio": _safe_ratio(
                row.wuyou_five_year_deals or 0, row.wuyou_deals or 0
            ),
        }
        for key in TREND_SERIES_GROUPS:
            contacted = getattr(row, f"{key}_contacted") or 0
            deals = getattr(row, f"{key}_deals") or 0
            store_contacted = getattr(store_totals, f"{key}_contacted") or 0
            item[key] = {
                "contact_share": _safe_ratio(contacted, store_contacted),
                "contact_penetration": _safe_ratio(deals, contacted),
            }
        items.append(item)

    items.sort(key=lambda item: (-item["contact_penetration"], -item["deliveries"], item["salesperson"]))
    return {
        "store_name": store_name,
        "start_date": start_date,
        "end_date": end_date,
        "items": items,
    }
