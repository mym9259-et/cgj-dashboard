import apiClient from "./client";
import type {
  StorePeriodComparison,
  StoreSalespeople,
  StoreScore,
} from "../types/storeAnalysis";

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
