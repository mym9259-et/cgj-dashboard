export interface FilterItem {
  field: string;
  operator: string;
  value: string | string[] | number | null;
}

export interface FilterPreset {
  id: number;
  name: string;
  config_json: {
    filters: FilterItem[];
    logic: "AND" | "OR";
  };
  created_at: string;
  updated_at: string;
}
