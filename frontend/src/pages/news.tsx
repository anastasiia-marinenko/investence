import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { apiFetch, type TopResponse } from "@/lib/api";

function SentimentBadge({ s }: { s: string }) {
  if (s === "positive") return <span className="wf-badge-positive">Позитивний</span>;
  if (s === "negative") return <span className="wf-badge-negative">Негативний</span>;
  return <span className="wf-badge-neutral">Нейтральний</span>;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-muted animate-pulse rounded-lg ${className}`} />;
}

interface NewsItem {
  id: number;
  title: string;
  url: string;
  source: string;
  published_at: string;
  sentiment_score: number;
  sentiment_label: "positive" | "negative" | "neutral";
  ticker: string;
  asset_type: string;
}

const SENTIMENT_FILTERS = [
  { key: "all", label: "Всі" },
  { key: "positive", label: "Позитивні" },
  { key: "negative", label: "Негативні" },
  { key: "neutral", label: "Нейтральні" },
];

const PAGE_SIZE = 20;

export default function News() {
  const [sentiment, setSentiment] = useState("all");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [, navigate] = useLocation();

 const { data: topData, isLoading: topLoading } = useQuery({
    queryKey: ["top-for-news"],
    queryFn: () => apiFetch<TopResponse>("/top?category=all"),
    staleTime: 5 * 60 * 1000,
  });

  const tickers = topData?.assets.map((a) => ({
    ticker: a.ticker,
    asset_type: a.asset_type,
  })) ?? [];

  const { data: allNewsRaw, isLoading: newsLoading } = useQuery({
    queryKey: ["all-news", tickers.map((t) => t.ticker).join(",")],
    queryFn: async () => {
      const results = await Promise.all(
        tickers.map((t) =>
          apiFetch<{ news: NewsItem[] }>(`/assets/${t.ticker}/news`)
            .then((r) => r.news.map((n) => ({ ...n, ticker: t.ticker, asset_type: t.asset_type })))
            .catch(() => [] as NewsItem[])
        )
      );
      return results.flat().sort(
        (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      );
    },
    enabled: tickers.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = topLoading || newsLoading;
  const allNews   = allNewsRaw ?? [];

  const filtered = allNews.filter((n) => {
    const sentOk = sentiment === "all" || n.sentiment_label === sentiment;
    const catOk  = category === "all"  || n.asset_type === category;
    return sentOk && catOk;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function changeFilter(fn: () => void) { fn(); setPage(1); }

  return (
    <Layout>
      <div className="space-y-5">
        <h2 className="text-xl font-bold text-center">Фінансові новини</h2>

        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Фільтри</p>
          <div className="flex flex-wrap gap-5">
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Тональність</div>
              <div className="flex gap-1.5">
                {SENTIMENT_FILTERS.map((f) => (
                  <button key={f.key}
                    onClick={() => changeFilter(() => setSentiment(f.key))}
                    className={`px-3 py-1 rounded-lg text-xs border font-medium transition-colors ${
                      sentiment === f.key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >{f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Категорія</div>
              <select
                value={category}
                onChange={(e) => changeFilter(() => setCategory(e.target.value))}
                className="border border-border rounded-lg px-3 py-1.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">Всі активи</option>
                <option value="stock">Акції</option>
                <option value="crypto">Криптовалюти</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">
            Новини {!isLoading && `(${filtered.length} результатів)`}
          </p>
          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : allNews.length === 0 ? (
            // Немає новин взагалі
            <p className="text-sm text-muted-foreground py-6 text-center">
              Новин поки немає. Проаналізуйте хоча б один актив.
            </p>
          ) : pageItems.length === 0 ? (
            // Є новини, але фільтр дав порожній результат
            <p className="text-sm text-muted-foreground py-6 text-center">
              Новин за обраними фільтрами не знайдено.
            </p>
          ) : (
            <div className="space-y-2">
              {pageItems.map((n) => (
                <div key={n.id}
                  className="border border-border rounded-lg p-3 flex items-start justify-between gap-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <a href={n.url} target="_blank" rel="noreferrer"
                      className="text-sm font-medium hover:underline text-primary line-clamp-2"
                    >{n.title}</a>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span>{n.source}</span>
                      <span>·</span>
                      <span>{n.published_at.slice(0, 10)}</span>
                      <span>·</span>
                      <button onClick={() => navigate(`/dashboard/${n.ticker}`)}
                        className="font-mono text-primary hover:underline cursor-pointer"
                      >{n.ticker}</button>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <SentimentBadge s={n.sentiment_label} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="bg-card rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="border border-border rounded-lg px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-accent transition-colors"
              >
                ← Назад
              </button>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`border rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    page === i + 1
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="border border-border rounded-lg px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-accent transition-colors"
              >
                Вперед →
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
