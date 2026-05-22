import apiClient from "./client";
import type {
  DashboardOverview,
  FunnelData,
  OrderStructure,
  PerformanceDetailData,
  PerformanceRanking,
} from "../types/dashboard";
import type { FilterItem } from "../types/filter";

function buildParams(filters: FilterItem[], logic: string, startDate: string | null, endDate: string | null) {
  const params: Record<string, string> = {};
  if (filters.length > 0) params.filters = JSON.stringify(filters);
  if (logic) params.filter_logic = logic;
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  return params;
}

export async function getOverview(
  filters: FilterItem[],
  logic: string,
  startDate: string | null,
  endDate: string | null
): Promise<DashboardOverview> {
  const { data } = await apiClient.get("/dashboard/overview", {
    params: buildParams(filters, logic, startDate, endDate),
  });
  return data;
}

export async function getFunnel(
  filters: FilterItem[],
  logic: string,
  startDate: string | null,
  endDate: string | null,
  dimension?: string
): Promise<FunnelData> {
  const params = buildParams(filters, logic, startDate, endDate);
  if (dimension) params["dimension"] = dimension;
  const { data } = await apiClient.get("/dashboard/funnel", { params });
  return data;
}

export async function getOrders(
  filters: FilterItem[],
  logic: string,
  startDate: string | null,
  endDate: string | null
): Promise<OrderStructure> {
  const { data } = await apiClient.get("/dashboard/orders", {
    params: buildParams(filters, logic, startDate, endDate),
  });
  return data;
}

export async function getPerformanceRanking(
  filters: FilterItem[],
  logic: string,
  startDate: string | null,
  endDate: string | null
): Promise<PerformanceRanking> {
  const { data } = await apiClient.get("/dashboard/performance", {
    params: buildParams(filters, logic, startDate, endDate),
  });
  return data;
}

export async function getPerformanceDetail(
  salesperson: string,
  startDate: string | null,
  endDate: string | null
): Promise<PerformanceDetailData> {
  const params: Record<string, string> = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  const { data } = await apiClient.get(`/dashboard/performance/${encodeURIComponent(salesperson)}`, { params });
  return data;
}

export async function getDistinctValues(fields: string[]): Promise<Record<string, string[]>> {
  const { data } = await apiClient.get("/metadata/distinct-values", {
    params: { fields: fields.join(",") },
  });
  return data.values;
}
