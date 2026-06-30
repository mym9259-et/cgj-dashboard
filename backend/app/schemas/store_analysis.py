from datetime import date

from pydantic import BaseModel


class StoreScoreDimension(BaseModel):
    key: str
    label: str
    score: float | None = None


class StoreScoreResponse(BaseModel):
    status: str = "placeholder"
    total_score: float | None = None
    dimensions: list[StoreScoreDimension]


class PeriodMetrics(BaseModel):
    deliveries: int = 0
    contacted: int = 0
    deals: int = 0
    contact_rate: float = 0.0
    contact_penetration: float = 0.0
    delivery_penetration: float = 0.0
    total_revenue: float = 0.0
    avg_deal_amount: float = 0.0
    wuyou_five_year_ratio: float = 0.0
    a_series_ratio: float = 0.0
    a_series_contact_penetration: float = 0.0
    b_series_ratio: float = 0.0
    b_series_contact_penetration: float = 0.0
    c_series_ratio: float = 0.0
    c_series_contact_penetration: float = 0.0
    d_series_ratio: float = 0.0
    d_series_contact_penetration: float = 0.0
    lafa_series_ratio: float = 0.0
    lafa_series_contact_penetration: float = 0.0
    avg_daily_deliveries: float = 0.0
    avg_daily_contacted: float = 0.0
    avg_daily_deals: float = 0.0
    avg_daily_revenue: float = 0.0


class StorePeriod(BaseModel):
    key: str
    label: str
    start_date: date
    end_date: date
    day_count: int
    is_partial: bool = False
    metrics: PeriodMetrics
    changes: dict[str, float | None]


class StorePeriodComparison(BaseModel):
    granularity: str
    periods: list[StorePeriod]


class SeriesSalespersonMetrics(BaseModel):
    contact_share: float = 0.0
    contact_penetration: float = 0.0


class SalespersonStoreMetrics(BaseModel):
    salesperson: str
    deliveries: int = 0
    contacted: int = 0
    deals: int = 0
    contact_penetration: float = 0.0
    avg_deal_amount: float = 0.0
    wuyou_five_year_ratio: float = 0.0
    a_series: SeriesSalespersonMetrics
    b_series: SeriesSalespersonMetrics
    c_series: SeriesSalespersonMetrics
    d_series: SeriesSalespersonMetrics
    lafa_series: SeriesSalespersonMetrics


class StoreSalespeopleResponse(BaseModel):
    store_name: str
    start_date: date
    end_date: date
    items: list[SalespersonStoreMetrics]


class StoreOptionsResponse(BaseModel):
    stores: list[str]
