export interface ColumnInfo {
  index: number;
  header: string;
  sample_values: string[];
}

export interface PreviewResponse {
  columns: ColumnInfo[];
  suggested_mappings: Record<string, string>;
  total_rows: number | null;
  file_size: number | null;
  detected_issues: string[];
}

export interface MappingConfig {
  [excelCol: string]: string;
}

export interface MappingRecord {
  id: number;
  name: string;
  mapping_json: MappingConfig;
  created_at: string;
}

export interface ImportResult {
  batch_id: string;
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  errors: Array<{ row: number; errors: string[] }>;
}

export interface UploadStatus {
  batch_id: string | null;
  status: string;
  progress_pct: number;
  rows_processed: number;
  total_rows: number;
  error_count: number;
  errors: Array<{ row: number; errors: string[] }>;
}
