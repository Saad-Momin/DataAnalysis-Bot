export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface ColumnProfile {
  name: string;
  dtype: string;
  null_count: number;
  unique_count: number;
  sample: unknown[];
}

export interface DatasetSummary {
  id: string;
  name: string;
  source: string;
  rows: number;
  columns: number;
  created_at: string;
}

export interface CleaningReport {
  rows_before: number;
  rows_after: number;
  columns_before: number;
  columns_after: number;
  inferred_types: Record<string, string>;
  duplicates_removed: number;
  dropped_columns_mostly_missing: string[];
  missing_filled: Record<string, { count: number; strategy: string; value?: unknown }>;
}

export interface FeatureReport {
  date_features: Record<string, string[]>;
  categorical_columns: Record<string, Record<string, number>>;
}

export interface DatasetDetail extends DatasetSummary {
  profile: ColumnProfile[];
  cleaning_report: CleaningReport;
  feature_report: FeatureReport;
  preview: Record<string, unknown>[];
}

export interface TableResult {
  columns: string[];
  rows: Record<string, unknown>[];
  total_rows: number;
  truncated: boolean;
}

export type ChartType = "bar" | "line" | "pie" | "area" | "scatter";

export interface ChartSpec {
  chart_type: ChartType;
  title: string;
  x_key: string;
  y_keys: string[];
  x_label: string;
  y_label: string;
  data: Record<string, unknown>[];
  truncated: boolean;
}

export interface ChatResponse {
  conversation_id: string;
  kind: "answer" | "chart" | "message" | "error";
  message: string;
  table: TableResult | null;
  chart: ChartSpec | null;
  offer_visualization: boolean;
  code: string | null;
}

export type ConnectorType = "snowflake" | "postgres" | "mysql";

export interface ConnectorPayload {
  type: ConnectorType;
  name?: string;
  host?: string;
  port?: number;
  database?: string;
  username: string;
  password: string;
  schema?: string;
  account?: string;
  warehouse?: string;
  role?: string;
  table?: string;
  query?: string;
  max_rows?: number;
}
