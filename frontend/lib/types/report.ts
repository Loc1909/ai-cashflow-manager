export type InsightLevel = "critical" | "warning" | "good" | "info";

export type TrendDirection =
  | "tang"
  | "giam"
  | "on_dinh"
  | "khong_du_du_lieu";

export interface CategoryAmount {
  category: string;
  category_label: string;
  amount: number;
  share_pct: number;
}

export interface MonthlySummary {
  year: number;
  month: number;
  total_income: number;
  total_expense: number;
  net: number;
  transaction_count: number;

  income_by_category: CategoryAmount[];
  expense_by_category: CategoryAmount[];
}

export interface InsightItem {
  level: InsightLevel;
  title: string;
  message: string;
  action: string;
}

export interface AnomalyItem {
  transaction_id: string | null;
  transaction_date: string;

  category: string;
  category_label: string;

  amount: number;
  description: string | null;

  anomaly_score: number;
  method: string;
  reason: string;
}

export interface TrendData {
  slope: number;
  direction: TrendDirection;
}

export interface VolatilityData {
  cv: number | null;
  mean: number;
}

export interface ForecastData {
  forecast_total: number | null;
  daily_forecast: number[];

  residual_std: number | null;
  confidence: string;
}

export interface CashRunway {
  runway_days: number | null;
  avg_daily_net: number;
}

export interface ReportResponse {
  summary: MonthlySummary;

  income_volatility: VolatilityData | null;

  trend: TrendData | null;

  anomalies: AnomalyItem[];

  forecast: ForecastData | null;

  cash_runway: CashRunway | null;

  insights: InsightItem[];
}