from datetime import date, datetime

from pydantic import BaseModel


class DateRange(BaseModel):
    start: date | None = None
    end: date | None = None


class FilterItem(BaseModel):
    field: str
    operator: str  # eq, neq, in, nin, gte, lte, between, contains, startswith
    value: str | list[str] | float | list[float] | None = None


class FilterParam(BaseModel):
    filters: list[FilterItem] = []
    logic: str = "AND"  # AND or OR
    start_date: date | None = None
    end_date: date | None = None


class KpiResponse(BaseModel):
    total_leads: int = 0
    new_operating_store_count: int = 0
    active_store_count: int = 0
    new_salesperson_count: int = 0
    active_salesperson_count: int = 0
    new_car_manager_count: int = 0
    new_platform_coach_count: int = 0
    new_certified_coach_count: int = 0
    car_manager_count: int = 0
    platform_coach_count: int = 0
    certified_coach_count: int = 0
    deal_count: int = 0
    deal_rate: float = 0.0
    total_revenue: float = 0.0
    avg_deal_amount: float = 0.0
    contacted_count: int = 0
    contacted_rate: float = 0.0
    refund_count: int = 0
    refund_rate: float = 0.0
    refund_amount: float = 0.0
    delivery_penetration: float = 0.0
    contact_penetration: float = 0.0
    contact_rate: float = 0.0
    five_year_deals: int = 0
    five_year_ratio: float = 0.0
    wuyou_five_year_ratio: float = 0.0
    a_series_count: int = 0
    a_series_ratio: float = 0.0
    a_series_contact_penetration: float = 0.0
    b_series_count: int = 0
    b_series_ratio: float = 0.0
    b_series_contact_penetration: float = 0.0
    c_series_count: int = 0
    c_series_ratio: float = 0.0
    c_series_contact_penetration: float = 0.0
    d_series_count: int = 0
    d_series_ratio: float = 0.0
    d_series_contact_penetration: float = 0.0
    lafa_series_count: int = 0
    lafa_series_ratio: float = 0.0
    lafa_series_contact_penetration: float = 0.0
    other_series_count: int = 0
    other_series_ratio: float = 0.0
    other_series_contact_penetration: float = 0.0


class TrendItem(BaseModel):
    day: str
    leads: int = 0
    contacted: int = 0
    deals: int = 0
    revenue: float = 0.0
    refunds: int = 0
    leads_ma7: float = 0.0
    contacted_ma7: float = 0.0
    deals_ma7: float = 0.0
    contact_rate_ma7: float = 0.0
    delivery_penetration: float = 0.0
    contact_penetration: float = 0.0
    contact_rate: float = 0.0
    wuyou_avg_deal_amount: float = 0.0
    delivery_penetration_ma7: float = 0.0
    contact_penetration_ma7: float = 0.0
    a_series_ratio: float = 0.0
    a_series_ratio_ma7: float = 0.0
    a_series_contact_penetration: float = 0.0
    a_series_contact_penetration_ma7: float = 0.0
    b_series_ratio: float = 0.0
    b_series_ratio_ma7: float = 0.0
    b_series_contact_penetration: float = 0.0
    b_series_contact_penetration_ma7: float = 0.0
    c_series_ratio: float = 0.0
    c_series_ratio_ma7: float = 0.0
    c_series_contact_penetration: float = 0.0
    c_series_contact_penetration_ma7: float = 0.0
    d_series_ratio: float = 0.0
    d_series_ratio_ma7: float = 0.0
    d_series_contact_penetration: float = 0.0
    d_series_contact_penetration_ma7: float = 0.0
    lafa_series_ratio: float = 0.0
    lafa_series_ratio_ma7: float = 0.0
    lafa_series_contact_penetration: float = 0.0
    lafa_series_contact_penetration_ma7: float = 0.0
    other_series_ratio: float = 0.0
    wuyou_five_year_ratio: float = 0.0


class DashboardOverview(BaseModel):
    kpis: KpiResponse
    trend: list[TrendItem]
    comparison: dict = {}


class FunnelStage(BaseModel):
    name: str
    count: int
    pct: float
    rate_to_prev: float | None = None


class FunnelBreakdown(BaseModel):
    dimension: str
    items: list[dict]


class FunnelData(BaseModel):
    stages: list[FunnelStage]
    breakdown: dict[str, list[dict]] = {}  # keyed by dimension name


class CompareRequest(BaseModel):
    filters_a: FilterParam
    filters_b: FilterParam


class ProductDistribution(BaseModel):
    by_type: list[dict]
    by_source: list[dict]
    by_years: list[dict]


class BrandModelRanking(BaseModel):
    by_brand: list[dict]
    by_model: list[dict]


class PriceRange(BaseModel):
    range_label: str
    count: int
    revenue: float


class DemographicData(BaseModel):
    gender: list[dict]
    age_group: list[dict]
    owner_type: list[dict]
    payment_method: list[dict]


class OrderStructure(BaseModel):
    product_distribution: ProductDistribution
    brand_model_ranking: BrandModelRanking
    price_ranges: list[PriceRange]
    demographics: DemographicData


class RankingItem(BaseModel):
    salesperson: str
    total_leads: int
    deals: int
    deal_rate: float
    revenue: float
    avg_deal: float
    contacted_rate: float
    delivery_penetration: float = 0.0
    contact_penetration: float = 0.0
    merchant_name: str = ""
    refunds: int
    rank: int


class PerformanceRanking(BaseModel):
    rankings: list[RankingItem]
    team_summary: dict


class PerformanceDetail(BaseModel):
    salesperson: str
    summary: RankingItem | None = None
    merchant_name: str = ""
    monthly_trend: list[TrendItem]
    by_product: list[dict]
    by_model: list[dict]
    funnel: dict


class DistinctValuesResponse(BaseModel):
    values: dict[str, list[str]]
