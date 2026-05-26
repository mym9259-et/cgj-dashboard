export interface KpiData {
  total_leads: number;
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
}

export interface TrendItem {
  day: string;
  leads: number;
  contacted: number;
  deals: number;
  revenue: number;
  refunds: number;
  delivery_penetration: number;
  contact_penetration: number;
  contact_rate: number;
  delivery_penetration_ma7: number;
  contact_penetration_ma7: number;
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
