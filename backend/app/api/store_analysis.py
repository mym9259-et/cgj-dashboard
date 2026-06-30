"""Single-store analysis APIs."""

from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.store_analysis import (
    StoreOptionsResponse,
    StorePeriodComparison,
    StoreSalespeopleResponse,
    StoreScoreResponse,
)
from app.services.store_analysis_service import (
    get_period_comparison,
    get_salespeople_metrics,
    get_score_placeholder,
    search_stores,
)


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
