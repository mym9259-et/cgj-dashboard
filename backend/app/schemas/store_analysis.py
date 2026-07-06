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
    first_record_date: date | None = None
    last_record_date: date | None = None
    stores: list[str] = []
    deliveries: int = 0
    contacted: int = 0
    deals: int = 0
    total_revenue: float = 0.0
    contact_penetration: float = 0.0
    avg_deal_amount: float = 0.0
    wuyou_five_year_ratio: float = 0.0
    a_series: SeriesSalespersonMetrics
    b_series: SeriesSalespersonMetrics
    c_series: SeriesSalespersonMetrics
    d_series: SeriesSalespersonMetrics
    lafa_series: SeriesSalespersonMetrics


class SalespersonTrendItem(BaseModel):
    day: date
    salesperson: str
    deliveries: int = 0
    contacted: int = 0
    deals: int = 0
    deliveries_ma7: float = 0.0
    contacted_ma7: float = 0.0
    deals_ma7: float = 0.0
    total_revenue: float = 0.0
    contact_rate: float = 0.0
    contact_rate_ma7: float = 0.0
    contact_penetration: float = 0.0
    contact_penetration_ma7: float = 0.0
    delivery_penetration: float = 0.0
    avg_deal_amount: float = 0.0
    wuyou_five_year_ratio: float = 0.0


class StoreSalespeopleResponse(BaseModel):
    store_name: str
    start_date: date
    end_date: date
    summary: SalespersonStoreMetrics
    items: list[SalespersonStoreMetrics]
    trend: list[SalespersonTrendItem]


class PeopleAnalysisResponse(BaseModel):
    summary: SalespersonStoreMetrics
    items: list[SalespersonStoreMetrics]


class StoreDailyTrend(BaseModel):
    day: date
    delivery_penetration: float = 0.0
    contact_rate: float = 0.0
    contact_penetration: float = 0.0


class StoreOverviewItem(BaseModel):
    store_name: str
    store_manager: str | None = None
    region: str | None = None
    province: str | None = None
    city: str | None = None
    dealer_direct: str | None = None
    store_mode: str | None = None
    salesperson_count: int = 0
    salespeople: list[str] = []
    first_record_date: date | None = None
    last_record_date: date | None = None
    deliveries: int = 0
    contacted: int = 0
    deals: int = 0
    total_revenue: float = 0.0
    delivery_penetration: float = 0.0
    contact_rate: float = 0.0
    contact_penetration: float = 0.0
    avg_deal_amount: float = 0.0
    wuyou_five_year_ratio: float = 0.0
    a_series: SeriesSalespersonMetrics
    b_series: SeriesSalespersonMetrics
    c_series: SeriesSalespersonMetrics
    d_series: SeriesSalespersonMetrics
    lafa_series: SeriesSalespersonMetrics
    trend: list[StoreDailyTrend] = []


class StoreOverviewResponse(BaseModel):
    summary: StoreOverviewItem
    items: list[StoreOverviewItem]


class StoreOptionsResponse(BaseModel):
    stores: list[str]
