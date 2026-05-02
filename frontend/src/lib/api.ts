const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error: string }).error || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface DashboardData {
  ticker: string;
  name: string;
  isCrypto: boolean;
  currentPrice: number | null;
  dailyChange: number | null;
  currency: string;
  updatedAt: string;
  prices: { date: string; close: number }[];
  news: {
    title: string;
    url: string;
    source: string;
    date: string;
    sentimentLabel: "positive" | "negative" | "neutral";
    sentimentScore: number;
  }[];
  sentiment: { avgScore: number; label: string; newsCount: number };
  correlation: {
    coefficient: number | null;
    label: string;
    chartData: { date: string; priceChange: number; sentiment: number }[];
  };
  github: {
    name: string;
    fullName: string;
    stars: number;
    forks: number;
    openIssues: number;
    url: string;
    activity: "high" | "medium" | "low";
  }[];
  aiReport: string;
  noNewsApiKey: boolean;
}

export interface AssetInfo {
  ticker: string;
  name: string;
  isCrypto: boolean;
  currentPrice: number | null;
  dailyChange: number | null;
  marketCapFormatted: string;
  peRatio: number | null;
  weekHigh52: number | null;
  weekLow52: number | null;
  volumeFormatted: string;
  description: string | null;
  sector: string | null;
  exchange: string | null;
  currency: string;
}

export interface HistoryItem {
  id: number;
  ticker: string;
  name: string;
  isCrypto: boolean;
  sentimentScore: number | null;
  sentimentLabel: string | null;
  lastAnalyzedAt: string;
}

export interface TopItem {
  ticker: string;
  name: string;
  isCrypto: boolean;
  currentPrice: number | null;
  dailyChange: number | null;
  sentimentScore: number | null;
  sentimentLabel: string | null;
  lastAnalyzedAt: string;
}

export interface NewsItem {
  id: number;
  ticker: string;
  title: string;
  url: string;
  source: string;
  date: string;
  sentimentLabel: "positive" | "negative" | "neutral";
  sentimentScore: number;
  category: string;
}

export interface AnalyticsData {
  totalAssets: number;
  totalNews: number;
  avgSentiment: number;
  avgDailyPriceChange: number | null;
  totalMonthlyCommits: number;
  sentimentDist: { positive: number; negative: number; neutral: number };
  dailyActivity: { date: string; count: number }[];
  priceDailyActivity: { date: string; avgChange: number }[];
  githubDailyActivity: { date: string; commits: number }[];
  top5: {
    ticker: string;
    name: string;
    sentimentScore: number | null;
    sentimentLabel: string | null;
    isCrypto: boolean;
  }[];
  top5ByPrice: {
    ticker: string;
    name: string;
    currentPrice: number | null;
    dailyChange: number | null;
    change30d: number | null;
  }[];
  top5ByGithub: {
    ticker: string;
    name: string;
    stars: number;
    monthlyCommits: number;
    activity: string;
  }[];
}
