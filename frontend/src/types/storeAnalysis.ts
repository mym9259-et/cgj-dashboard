import type { DashboardOverview } from "./dashboard";

export type StoreScoreDimension = {
  key: string;
  label: string;
  score: number | null;
};

export type StoreScore = {
  status: "placeholder" | "ready";
  total_score: number | null;
  dimensions: StoreScoreDimension[];
};

export type PeriodMetricKey =
  | "deliveries" | "contacted" | "deals"
  | "contact_rate" | "contact_penetration" | "delivery_penetration"
  | "total_revenue" | "avg_deal_amount" | "wuyou_five_year_ratio"
  | "a_series_ratio" | "a_series_contact_penetration"
  | "b_series_ratio" | "b_series_contact_penetration"
  | "c_series_ratio" | "c_series_contact_penetration"
  | "d_series_ratio" | "d_series_contact_penetration"
  | "lafa_series_ratio" | "lafa_series_contact_penetration"
  | "avg_daily_deliveries" | "avg_daily_contacted"
  | "avg_daily_deals" | "avg_daily_revenue";

export type StorePeriod = {
  key: string;
  label: string;
  start_date: string;
  end_date: string;
  day_count: number;
  is_partial: boolean;
  metrics: Record<PeriodMetricKey, number>;
  changes: Record<PeriodMetricKey, number | null>;
};

export type StorePeriodComparison = {
  granularity: "month" | "week";
  periods: StorePeriod[];
};

export type SeriesSalespersonMetrics = {
  contact_share: number;
  contact_penetration: number;
};

export type SalespersonStoreMetrics = {
  salesperson: string;
  deliveries: number;
  contacted: number;
  deals: number;
  contact_penetration: number;
  avg_deal_amount: number;
  wuyou_five_year_ratio: number;
  a_series: SeriesSalespersonMetrics;
  b_series: SeriesSalespersonMetrics;
  c_series: SeriesSalespersonMetrics;
  d_series: SeriesSalespersonMetrics;
  lafa_series: SeriesSalespersonMetrics;
};

export type StoreSalespeople = {
  store_name: string;
  start_date: string;
  end_date: string;
  items: SalespersonStoreMetrics[];
};

export type StoreAnalysisData = {
  score: StoreScore;
  monthly: StorePeriodComparison;
  weekly: StorePeriodComparison;
  overview: DashboardOverview;
  salespeople: StoreSalespeople;
};
