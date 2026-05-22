import apiClient from "./client";
import type { FilterPreset } from "../types/filter";

export async function listPresets(): Promise<FilterPreset[]> {
  const { data } = await apiClient.get("/filters");
  return data;
}

export async function createPreset(name: string, configJson: Record<string, unknown>): Promise<FilterPreset> {
  const { data } = await apiClient.post("/filters", { name, config_json: configJson });
  return data;
}

export async function updatePreset(id: number, name: string, configJson: Record<string, unknown>): Promise<FilterPreset> {
  const { data } = await apiClient.put(`/filters/${id}`, { name, config_json: configJson });
  return data;
}

export async function deletePreset(id: number): Promise<void> {
  await apiClient.delete(`/filters/${id}`);
}
