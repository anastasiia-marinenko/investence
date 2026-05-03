const BASE = "/api";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((err as { detail: string }).detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface DashboardData {
  ticker: string;
  name: string;
  is_crypto: boolean;
  current_price: number | null;
  daily_change: number | null;
  currency: string;
  updated_at: string;
  prices: {
    data: { date: string; close: number; change_pct: number }[];
    count: number;
  };
  news: {
    data: {
      id: number;
      title: string;
      url: string;
      source: string;
      published_at: string;
      sentiment_score: number;
      sentiment_label: "positive" | "negative" | "neutral";
    }[];
    avg_sentiment: number;
    sentiment_label: string;
    count: number;
  };
  correlation: {
    coefficient: number | null;
    label: string;
    chart_data: { date: string; price_change: number; sentiment: number }[];
  };
  github: {
    data: {
      full_name: string;
      stars: number;
      forks: number;
      open_issues: number;
      url: string;
      activity: "high" | "medium" | "low";
    }[];
    available: boolean;
  };
  summary: { summary: string; disclaimer: string } | null;
}

export interface AssetInfo {
  ticker: string;
  name: string;
  asset_type: string;
  exchange: string | null;
  sector: string | null;
  currency: string;
}

export interface HistoryItem {
  id: number;
  ticker: string;
  name: string;
  asset_type: string;
  avg_sentiment: number | null;
  sentiment_label: string | null;
  updated_at: string;
}

export interface TopResponse {
  category: string;
  count: number;
  assets: TopItem[];
}

export interface TopItem {
  ticker: string;
  name: string;
  asset_type: string;
  current_price: number | null;
  daily_change: number | null;
  sentiment_score: number | null;
  sentiment_label: string | null;
}

export interface NewsItem {
  id: number;
  ticker: string;
  title: string;
  url: string;
  source: string;
  published_at: string;
  sentiment_label: "positive" | "negative" | "neutral";
  sentiment_score: number;
}

export interface AnalyticsData {
  total_assets: number;
  total_news: number;
  avg_sentiment: number;
  avg_daily_price_change: number | null;
  total_monthly_commits: number;
  sentiment_dist: { positive: number; negative: number; neutral: number };
  daily_activity: { date: string; count: number }[];
  top5: {
    ticker: string;
    name: string;
    avg_sentiment: number | null;
    sentiment_label: string | null;
  }[];
}
