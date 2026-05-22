"""Dashboard data APIs: overview, funnel, orders, performance."""

import json
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.dashboard import (
    DashboardOverview,
    DistinctValuesResponse,
    FunnelData,
    OrderStructure,
    PerformanceDetail,
    PerformanceRanking,
)
from app.services.dashboard_service import get_distinct_values, get_kpi_data, get_trend_data
from app.services.funnel_service import get_funnel_comparison, get_funnel_data
from app.services.order_service import get_order_structure
from app.services.performance_service import get_performance_detail, get_performance_ranking

router = APIRouter(prefix="/api", tags=["dashboard"])


def _parse_filters(filters_str: str | None) -> list[dict]:
    if not filters_str:
        return []
    try:
        return json.loads(filters_str)
    except json.JSONDecodeError:
        return []


@router.get("/dashboard/overview", response_model=DashboardOverview)
async def dashboard_overview(
    db: AsyncSession = Depends(get_db),
    filters: str | None = Query(None, description="JSON filter array"),
    filter_logic: str = Query("AND"),
    start_date: date | None = None,
    end_date: date | None = None,
):
    """Get KPI metrics and trend data."""
    filter_list = _parse_filters(filters)

    kpis = await get_kpi_data(db, filter_list, filter_logic, start_date, end_date)
    trend = await get_trend_data(db, filter_list, filter_logic, start_date, end_date)

    return DashboardOverview(kpis=kpis, trend=trend, comparison={})


@router.get("/dashboard/funnel", response_model=FunnelData)
async def dashboard_funnel(
    db: AsyncSession = Depends(get_db),
    filters: str | None = Query(None),
    filter_logic: str = Query("AND"),
    start_date: date | None = None,
    end_date: date | None = None,
    dimension: str | None = Query(None, description="Breakdown dimension: salesperson, brand, etc."),
):
    """Get conversion funnel data with optional dimension breakdown."""
    filter_list = _parse_filters(filters)
    return await get_funnel_data(db, filter_list, filter_logic, start_date, end_date, dimension)


@router.get("/dashboard/funnel/compare")
async def dashboard_funnel_compare(
    db: AsyncSession = Depends(get_db),
    filters_a: str = Query("[]"),
    filters_b: str = Query("[]"),
    start_date: date | None = None,
    end_date: date | None = None,
):
    """Compare funnels for two filter sets."""
    fa = _parse_filters(filters_a)
    fb = _parse_filters(filters_b)
    return await get_funnel_comparison(db, fa, fb, start_date, end_date)


@router.get("/dashboard/orders", response_model=OrderStructure)
async def dashboard_orders(
    db: AsyncSession = Depends(get_db),
    filters: str | None = Query(None),
    filter_logic: str = Query("AND"),
    start_date: date | None = None,
    end_date: date | None = None,
):
    """Get order structure analysis."""
    filter_list = _parse_filters(filters)
    return await get_order_structure(db, filter_list, filter_logic, start_date, end_date)


@router.get("/dashboard/performance", response_model=PerformanceRanking)
async def dashboard_performance(
    db: AsyncSession = Depends(get_db),
    filters: str | None = Query(None),
    filter_logic: str = Query("AND"),
    start_date: date | None = None,
    end_date: date | None = None,
):
    """Get salesperson performance ranking."""
    filter_list = _parse_filters(filters)
    return await get_performance_ranking(db, filter_list, filter_logic, start_date, end_date)


@router.get("/dashboard/performance/{salesperson}", response_model=PerformanceDetail)
async def dashboard_performance_detail(
    salesperson: str,
    db: AsyncSession = Depends(get_db),
    start_date: date | None = None,
    end_date: date | None = None,
):
    """Get detailed performance for a single salesperson."""
    return await get_performance_detail(db, salesperson, start_date, end_date)


@router.get("/metadata/distinct-values", response_model=DistinctValuesResponse)
async def metadata_distinct_values(
    db: AsyncSession = Depends(get_db),
    fields: str = Query("brand,model_series,salesperson,product_type,product_source,deal_status,contact_status,gender,age_group,customer_source,merchant_name"),
):
    """Get distinct values for filter dropdown population."""
    field_list = [f.strip() for f in fields.split(",") if f.strip()]
    values = await get_distinct_values(db, field_list)
    return DistinctValuesResponse(values=values)
