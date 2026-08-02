import apiClient from "./client";
import type {
  StorePeriodComparison,
  StoreSalespeople,
  StoreScore,
  PeopleAnalysisData,
  StoreOverviewData,
} from "../types/storeAnalysis";
import type { FilterItem } from "../types/filter";

export async function searchStores(keyword = ""): Promise<string[]> {
  const { data } = await apiClient.get("/store-analysis/stores", {
    params: { keyword, limit: 50 },
  });
  return data.stores;
}

export async function getStoreScore(
  storeName: string,
  startDate: string,
  endDate: string,
): Promise<StoreScore> {
  const { data } = await apiClient.get("/store-analysis/score", {
    params: { store_name: storeName, start_date: startDate, end_date: endDate },
  });
  return data;
}

export async function getStorePeriodComparison(
  storeName: string,
  endDate: string,
  granularity: "month" | "week",
): Promise<StorePeriodComparison> {
  const { data } = await apiClient.get("/store-analysis/period-comparison", {
    params: { store_name: storeName, end_date: endDate, granularity },
  });
  return data;
}

export async function getStoreSalespeople(
  storeName: string,
  startDate: string,
  endDate: string,
): Promise<StoreSalespeople> {
  const { data } = await apiClient.get("/store-analysis/salespeople", {
    params: { store_name: storeName, start_date: startDate, end_date: endDate },
  });
  return data;
}

export async function getPeopleAnalysis(
  filters: FilterItem[],
  filterLogic: "AND" | "OR",
  startDate: string | null,
  endDate: string | null,
): Promise<PeopleAnalysisData> {
  const { data } = await apiClient.get("/store-analysis/people", {
    params: {
      filters: filters.length ? JSON.stringify(filters) : undefined,
      filter_logic: filterLogic,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    },
  });
  return data;
}

export async function getStoreOverview(
  filters: FilterItem[],
  filterLogic: "AND" | "OR",
  startDate: string | null,
  endDate: string | null,
): Promise<StoreOverviewData> {
  const { data } = await apiClient.get("/store-analysis/overview", {
    params: {
      filters: filters.length ? JSON.stringify(filters) : undefined,
      filter_logic: filterLogic,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    },
  });
  return data;
}

export async function getScopePeriodComparison(filters: FilterItem[], filterLogic: "AND" | "OR", endDate: string | null, granularity: "month" | "week", signal?: AbortSignal): Promise<StorePeriodComparison> {
  const { data } = await apiClient.get("/store-analysis/scope-period-comparison", { params: {
    filters: filters.length ? JSON.stringify(filters) : undefined,
    filter_logic: filterLogic,
    end_date: endDate || undefined,
    granularity,
  }, signal });
  return data;
}

export async function searchPeople(keyword = ""): Promise<string[]> {
  const { data } = await apiClient.get("/store-analysis/people/options", { params: { keyword, limit: 50 } });
  return data.people;
}

export async function getPersonDetail(name: string, startDate: string, endDate: string): Promise<any> {
  const { data } = await apiClient.get(`/store-analysis/people/${encodeURIComponent(name)}/detail`, { params: { start_date: startDate, end_date: endDate } });
  return data;
}
