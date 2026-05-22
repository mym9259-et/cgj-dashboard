import apiClient from "./client";
import type { FilterItem } from "../types/filter";

export async function exportData(
  format: "excel" | "csv",
  filters: FilterItem[],
  logic: string,
  startDate: string | null,
  endDate: string | null,
  columns?: string[]
): Promise<Blob> {
  const params: Record<string, string> = {
    format,
    filter_logic: logic,
  };
  if (filters.length > 0) params.filters = JSON.stringify(filters);
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  if (columns) params.columns = columns.join(",");

  const response = await apiClient.post("/export/data", null, {
    params,
    responseType: "blob",
  });
  return response.data;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
