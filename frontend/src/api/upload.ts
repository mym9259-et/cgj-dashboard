import apiClient from "./client";
import type { ImportResult, MappingRecord, PreviewResponse, UploadStatus } from "../types/upload";

export async function previewFile(file: File): Promise<PreviewResponse> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post("/upload/preview", form);
  return data;
}

export async function uploadChunk(
  uploadId: string,
  chunkIndex: number,
  totalChunks: number,
  filename: string,
  chunk: Blob
): Promise<{ uploaded_chunks: number[]; complete: boolean }> {
  const form = new FormData();
  form.append("upload_id", uploadId);
  form.append("chunk_index", String(chunkIndex));
  form.append("total_chunks", String(totalChunks));
  form.append("filename", filename);
  form.append("chunk", chunk);
  const { data } = await apiClient.post("/upload/chunk", form);
  return data;
}

export async function importData(
  uploadId: string,
  mapping: Record<string, string>
): Promise<ImportResult> {
  const { data } = await apiClient.post("/upload/import", {
    upload_id: uploadId,
    mapping,
  });
  return data;
}

export async function getUploadStatus(uploadId: string): Promise<UploadStatus> {
  const { data } = await apiClient.get(`/upload/status/${uploadId}`);
  return data;
}

export async function getUploadHistory(): Promise<any[]> {
  const { data } = await apiClient.get("/upload/history");
  return data;
}

export async function listMappings(): Promise<MappingRecord[]> {
  const { data } = await apiClient.get("/mappings");
  return data;
}

export async function saveMapping(
  name: string,
  mappingJson: Record<string, string>
): Promise<MappingRecord> {
  const { data } = await apiClient.post("/mappings", { name, mapping_json: mappingJson });
  return data;
}

export async function deleteMapping(id: number): Promise<void> {
  await apiClient.delete(`/mappings/${id}`);
}
