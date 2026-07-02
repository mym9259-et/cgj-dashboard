"""Single-store analysis APIs."""

import json
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.lead import Lead
from app.schemas.store_analysis import (
    StoreOptionsResponse,
    PeopleAnalysisResponse,
    StorePeriodComparison,
    StoreSalespeopleResponse,
    StoreScoreResponse,
)
from app.services.store_analysis_service import (
    get_period_comparison,
    get_people_analysis,
    get_person_profile,
    get_scope_period_comparison,
    get_salespeople_metrics,
    get_score_placeholder,
    search_stores,
    search_salespeople,
)
from app.services.dashboard_service import get_kpi_data, get_trend_data


router = APIRouter(prefix="/api/store-analysis", tags=["store-analysis"])


@router.get("/stores", response_model=StoreOptionsResponse)
async def store_options(
    keyword: str = Query("", max_length=200),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    return StoreOptionsResponse(stores=await search_stores(db, keyword, limit))


@router.get("/score", response_model=StoreScoreResponse)
async def store_score(
    store_name: str,
    start_date: date,
    end_date: date,
):
    del store_name, start_date, end_date
    return StoreScoreResponse(**await get_score_placeholder())


@router.get("/period-comparison", response_model=StorePeriodComparison)
async def period_comparison(
    store_name: str,
    end_date: date,
    granularity: Literal["month", "week"] = "month",
    db: AsyncSession = Depends(get_db),
):
    return StorePeriodComparison(
        **await get_period_comparison(db, store_name, end_date, granularity)
    )


@router.get("/salespeople", response_model=StoreSalespeopleResponse)
async def store_salespeople(
    store_name: str,
    start_date: date,
    end_date: date,
    db: AsyncSession = Depends(get_db),
):
    return StoreSalespeopleResponse(
        **await get_salespeople_metrics(db, store_name, start_date, end_date)
    )


@router.get("/people", response_model=PeopleAnalysisResponse)
async def people_analysis(
    filters: str | None = Query(None),
    filter_logic: str = Query("AND", pattern="^(AND|OR)$"),
    start_date: date | None = None,
    end_date: date | None = None,
    db: AsyncSession = Depends(get_db),
):
    filter_list = json.loads(filters) if filters else []
    return PeopleAnalysisResponse(
        **await get_people_analysis(
            db, filter_list, filter_logic, start_date, end_date
        )
    )


@router.get("/scope-period-comparison")
async def scope_period_comparison(
    filters: str | None = Query(None),
    filter_logic: str = Query("AND", pattern="^(AND|OR)$"),
    end_date: date | None = None,
    granularity: Literal["month", "week"] = "month",
    db: AsyncSession = Depends(get_db),
):
    anchor = end_date or await db.scalar(select(func.max(Lead.delivery_date))) or date.today()
    return await get_scope_period_comparison(db, json.loads(filters) if filters else [], filter_logic, anchor, granularity)


@router.get("/people/options")
async def people_options(keyword: str = "", limit: int = Query(50, ge=1, le=100), db: AsyncSession = Depends(get_db)):
    return {"people": await search_salespeople(db, keyword, limit)}


@router.get("/people/{salesperson}/detail")
async def person_detail(salesperson: str, start_date: date, end_date: date, db: AsyncSession = Depends(get_db)):
    filters = [{"field": "salesperson", "operator": "in", "value": [salesperson]}]
    profile = await get_person_profile(db, salesperson, start_date, end_date)
    profile["monthly"] = await get_scope_period_comparison(db, filters, "AND", end_date, "month")
    profile["weekly"] = await get_scope_period_comparison(db, filters, "AND", end_date, "week")
    profile["overview"] = {
        "kpis": await get_kpi_data(db, filters, "AND", start_date, end_date),
        "trend": await get_trend_data(db, filters, "AND", start_date, end_date),
        "comparison": {},
    }
    return profile
