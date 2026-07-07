export interface KpiData {
  total_leads: number;
  new_operating_store_count: number;
  active_store_count: number;
  new_salesperson_count: number;
  active_salesperson_count: number;
  new_car_manager_count: number;
  new_platform_coach_count: number;
  new_certified_coach_count: number;
  car_manager_count: number;
  platform_coach_count: number;
  certified_coach_count: number;
  deal_count: number;
  deal_rate: number;
  total_revenue: number;
  avg_deal_amount: number;
  contacted_count: number;
  contacted_rate: number;
  refund_count: number;
  refund_rate: number;
  refund_amount: number;
  delivery_penetration: number;
  contact_penetration: number;
  contact_rate: number;
  five_year_ratio: number;
  wuyou_five_year_ratio: number;
  a_series_count: number;
  a_series_ratio: number;
  a_series_contact_penetration: number;
  b_series_count: number;
  b_series_ratio: number;
  b_series_contact_penetration: number;
  c_series_count: number;
  c_series_ratio: number;
  c_series_contact_penetration: number;
  d_series_count: number;
  d_series_ratio: number;
  d_series_contact_penetration: number;
  lafa_series_count: number;
  lafa_series_ratio: number;
  lafa_series_contact_penetration: number;
  other_series_count: number;
  other_series_ratio: number;
  other_series_contact_penetration: number;
}

export interface TrendItem {
  day: string;
  leads: number;
  contacted: number;
  deals: number;
  revenue: number;
  refunds: number;
  leads_ma7: number;
  contacted_ma7: number;
  deals_ma7: number;
  contact_rate_ma7: number;
  delivery_penetration: number;
  contact_penetration: number;
  contact_rate: number;
  wuyou_avg_deal_amount: number;
  delivery_penetration_ma7: number;
  contact_penetration_ma7: number;
  a_series_ratio: number;
  a_series_ratio_ma7: number;
  a_series_contact_penetration: number;
  a_series_contact_penetration_ma7: number;
  b_series_ratio: number;
  b_series_ratio_ma7: number;
  b_series_contact_penetration: number;
  b_series_contact_penetration_ma7: number;
  c_series_ratio: number;
  c_series_ratio_ma7: number;
  c_series_contact_penetration: number;
  c_series_contact_penetration_ma7: number;
  d_series_ratio: number;
  d_series_ratio_ma7: number;
  d_series_contact_penetration: number;
  d_series_contact_penetration_ma7: number;
  lafa_series_ratio: number;
  lafa_series_ratio_ma7: number;
  lafa_series_contact_penetration: number;
  lafa_series_contact_penetration_ma7: number;
  other_series_ratio: number;
  wuyou_five_year_ratio: number;
}

export interface DashboardOverview {
  kpis: KpiData;
  trend: TrendItem[];
  comparison: Record<string, unknown>;
}

export interface FunnelStage {
  name: string;
  count: number;
  pct: number;
  rate_to_prev: number | null;
}

export interface FunnelBreakdownItem {
  name: string;
  total_leads: number;
  contacted: number;
  deals: number;
  contact_rate: number;
  deal_rate: number;
  conversion_rate: number;
  delivery_penetration: number;
  contact_penetration: number;
}

export interface FunnelData {
  stages: FunnelStage[];
  breakdown: Record<string, FunnelBreakdownItem[]>;
}

export interface ProductDistItem {
  name: string;
  count: number;
}

export interface PriceRangeItem {
  range_label: string;
  count: number;
  revenue: number;
}

export interface OrderStructure {
  product_distribution: {
    by_type: ProductDistItem[];
    by_source: ProductDistItem[];
    by_years: ProductDistItem[];
  };
  brand_model_ranking: {
    by_brand: ProductDistItem[];
    by_model: ProductDistItem[];
  };
  price_ranges: PriceRangeItem[];
  demographics: {
    gender: ProductDistItem[];
    age_group: ProductDistItem[];
    owner_type: ProductDistItem[];
    payment_method: ProductDistItem[];
  };
}

export interface RankingItem {
  salesperson: string;
  total_leads: number;
  deals: number;
  deal_rate: number;
  revenue: number;
  avg_deal: number;
  contacted_rate: number;
  delivery_penetration: number;
  contact_penetration: number;
  merchant_name: string;
  refunds: number;
  rank: number;
}

export interface PerformanceRanking {
  rankings: RankingItem[];
  team_summary: Record<string, unknown>;
}

export interface PerformanceDetailData {
  salesperson: string;
  summary: RankingItem | null;
  merchant_name: string;
  monthly_trend: TrendItem[];
  by_product: ProductDistItem[];
  by_model: ProductDistItem[];
  funnel: Record<string, number>;
}
