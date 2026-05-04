import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Bar, Line, Legend,
} from "recharts";
import Layout from "@/components/Layout";
import { apiFetch, type DashboardData } from "@/lib/api";
import { useSettings } from "@/context/SettingsContext";

function SentimentBadge({ s }: { s: string }) {
  if (s === "positive") return <span className="wf-badge-positive">Позитивний</span>;
  if (s === "negative") return <span className="wf-badge-negative">Негативний</span>;
  return <span className="wf-badge-neutral">Нейтральний</span>;
}

function ActivityBadge({ a }: { a: string }) {
  if (a === "high") return <span className="wf-badge-positive">Висока активність</span>;
  if (a === "medium") return <span className="wf-badge-neutral">Середня активність</span>;
  return <span className="wf-badge-negative">Низька активність</span>;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-muted animate-pulse rounded-lg ${className}`} />;
}

const CARD = "bg-card rounded-xl border border-border shadow-sm p-5 space-y-4";

export default function Dashboard() {
  const params = useParams<{ ticker: string }>();
  const ticker = params.ticker?.toUpperCase() || "AAPL";
  const { settings, formatPrice } = useSettings();  // додай formatPrice
  const [period, setPeriod] = useState<"7" | "14" | "30">(settings.period as "7" | "14" | "30");
  useEffect(() => {
   setPeriod(settings.period as "7" | "14" | "30");
   }, [settings.period]);
  const [newsFilter, setNewsFilter] = useState<"all" | "positive" | "negative" | "neutral">("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard", ticker, period, refreshKey],
    queryFn: () =>
      apiFetch<DashboardData>(
        `/assets/${ticker}?days=${period}${refreshKey > 0 ? "&refresh=true" : ""}`
      ),
    staleTime: 20 * 60 * 1000,
    retry: 1,
  });

  const filteredNews =
    data?.news.data.filter((n) => newsFilter === "all" || n.sentiment_label === newsFilter) ?? [];

  const priceChartData =
    data?.prices.data.map((p) => ({
      date: p.date.slice(5),
      price: p.close,
    })) ?? [];

  const PERIOD_LABELS: Record<string, string> = { "7": "7 днів", "14": "14 днів", "30": "30 днів" };
  const NEWS_FILTERS = [
    { key: "all", label: "Всі" },
    { key: "positive", label: "Позитивні" },
    { key: "negative", label: "Негативні" },
    { key: "neutral", label: "Нейтральні" },
  ];

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className={CARD}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-7 w-52" />
                  <Skeleton className="h-5 w-72" />
                </div>
              ) : error ? (
                <div>
                  <h1 className="text-xl font-bold text-destructive">{ticker}</h1>
                  <p className="text-sm text-destructive mt-1">{(error as Error).message}</p>
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-bold">
                    {data!.name}{" "}
                    <span className="text-muted-foreground font-normal">({ticker})</span>
                  </h1>
                  <div className="flex items-center gap-4 mt-1.5 text-sm flex-wrap">
                    {data!.current_price != null && (
                      <span className="font-mono font-semibold text-base">
                        {formatPrice(data!.current_price)}
                      </span>
                    )}
                    {data!.daily_change != null && (
                      <span
                        className={`font-mono font-medium ${data!.daily_change >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {data!.daily_change >= 0 ? "+" : ""}
                        {data!.daily_change.toFixed(2)}%
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {(() => {
                        const d = new Date(data!.updated_at);
                        const mm = String(d.getMonth() + 1).padStart(2, "0");
                        const dd = String(d.getDate()).padStart(2, "0");
                        const yyyy = d.getFullYear();
                        const hh = String(d.getHours()).padStart(2, "0");
                        const min = String(d.getMinutes()).padStart(2, "0");
                        const ss = String(d.getSeconds()).padStart(2, "0");
                        return `Дані оновлено: ${mm}/${dd}/${yyyy}, ${hh}:${min}:${ss}`;
                      })()}
                    </span>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  setRefreshKey((k) => k + 1);
                  refetch();
                }}
                disabled={isLoading}
                className="border border-border rounded-lg px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-40 transition-colors inline-flex items-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isLoading ? "animate-spin" : ""}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                {isLoading ? "Оновлення…" : "Оновити"}
              </button>
              <a
                href={`/api/export/${ticker}`}
                download
                className="border border-border rounded-lg px-3 py-1.5 text-xs hover:bg-accent transition-colors"
              >
                Експорт CSV
              </a>
            </div>
          </div>
        </div>

        {/* Price Chart */}
        <div className={CARD}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-base font-semibold">Динаміка цін</p>
            <div className="flex gap-1">
              {(["7", "14", "30"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-xs rounded-lg border font-medium transition-colors ${
                    period === p
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-44 w-full" />
          ) : priceChartData.length === 0 && !isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Цінові дані тимчасово недоступні
            </p>
          ) : priceChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={priceChartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} width={60} />
                <Tooltip
                  formatter={(v: number) => [formatPrice(v), "Ціна"]}
                  labelFormatter={(l) => `Дата: ${l}`}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="hsl(var(--primary))"
                  fill="url(#priceGrad)"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : null}
        </div>

        {/* News & Sentiment */}
        <div className={CARD}>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <p className="text-base font-semibold mb-2">Новини та настрій</p>
              {isLoading ? (
                <Skeleton className="h-8 w-40" />
              ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className={`text-2xl font-bold font-mono ${
                      (data?.news?.avg_sentiment ?? 0) > 0.2
                        ? "text-green-600"
                        : (data?.news?.avg_sentiment ?? 0) < -0.2
                        ? "text-red-600"
                        : "text-gray-500"
                    }`}
                  >
                    {(data?.news?.avg_sentiment ?? 0) > 0 ? "+" : ""}
                    {(data?.news?.avg_sentiment ?? 0).toFixed(2)}
                  </span>
                  <SentimentBadge s={data?.news?.sentiment_label || "neutral"} />
                  <span className="text-xs text-muted-foreground">Загальна оцінка настрою</span>
                </div>
              )}
            </div>
            <div className="flex gap-1 flex-wrap">
              {NEWS_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setNewsFilter(f.key as typeof newsFilter)}
                  className={`px-3 py-1 text-xs rounded-lg border font-medium transition-colors ${
                    newsFilter === f.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {data?.noNewsApiKey && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              Ключ News API не налаштовано. Додайте секрет{" "}
              <code className="font-mono">NEWS_API_KEY</code> для отримання новин у реальному часі.
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredNews.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {data?.noNewsApiKey
                ? "Новини недоступні – додайте NEWS_API_KEY для отримання реальних новин."
                : newsFilter === "all"
                ? "Новини за обраним активом не знайдено."
                : "Новин з обраною тональністю не знайдено."}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredNews.slice(0, 20).map((n, i) => (
                <div
                  key={i}
                  className="border border-border rounded-lg p-3 flex items-start justify-between gap-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium hover:underline text-primary line-clamp-2"
                    >
                      {n.title}
                    </a>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{n.source}</span>
                      <span>·</span>
                      <span>{n.published_at.slice(0, 10)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <SentimentBadge s={n.sentiment_label} />
                    <span
                      className={`text-xs font-mono ${
                        n.sentiment_score > 0
                          ? "text-green-600"
                          : n.sentiment_score < 0
                          ? "text-red-600"
                          : "text-gray-500"
                      }`}
                    >
                      {n.sentiment_score > 0 ? "+" : ""}
                      {n.sentiment_score.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Correlation */}
        <div className={CARD}>
          <p className="text-base font-semibold">Кореляція настрою та ціни</p>
          {isLoading ? (
            <Skeleton className="h-36 w-full" />
          ) : data?.correlation.chart_data && data.correlation.chart_data.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <ComposedChart
                  data={data.correlation.chart_data}
                  margin={{ top: 5, right: 10, bottom: 5, left: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} width={40} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} width={40} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    yAxisId="left"
                    dataKey="sentiment"
                    name="Настрій"
                    fill="hsl(var(--primary))"
                    opacity={0.6}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="price_change"
                    name="Зміна ціни %"
                    stroke="#f97316"
                    dot={false}
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <div>
                  <span className="text-muted-foreground">Коефіцієнт кореляції (Пірсон): </span>
                  <span className="font-mono font-semibold">
                    {data.correlation.coefficient != null
                      ? `${data.correlation.coefficient > 0 ? "+" : ""}${data.correlation.coefficient.toFixed(2)}`
                      : "N/A"}
                  </span>
                </div>
                {data.correlation.coefficient != null && (
                  <SentimentBadge
                    s={
                      data.correlation.coefficient > 0.2
                        ? "positive"
                        : data.correlation.coefficient < -0.2
                        ? "negative"
                        : "neutral"
                    }
                  />
                )}
                <span className="text-muted-foreground text-xs">{data.correlation.label}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              Недостатньо даних для побудови кореляційного аналізу
            </p>
          )}
        </div>

        {/* GitHub */}
        {!isLoading && (
          <div className={CARD}>
            <p className="text-base font-semibold">Активність розробників на GitHub</p>
            {!data?.is_crypto ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Аналіз активності розробників доступний лише для криптовалютних активів.
              </p>
            ) : data.github.data.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Дані активності розробників недоступні.
              </p>
            ) : (
              <div className="space-y-2">
                {data.github.data.map((r) => (
                  <a
                    key={r.repo_name}
                    href={r.repo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="border border-border rounded-lg p-3 flex items-center justify-between hover:bg-accent/50 transition-colors block"
                  >
                    <span className="text-sm font-mono font-medium text-primary">{r.repo_name}</span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>⭐ {r.stars.toLocaleString()}</span>
                      <span>Форки: {r.forks.toLocaleString()}</span>
                      <span>Issues: {r.open_issues}</span>
                      <ActivityBadge a={r.activity} />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Report */}
        <div className={CARD}>
          <p className="text-base font-semibold">Аналітичний звіт</p>
          {isLoading ? (
            <div className="space-y-2 animate-pulse">
              <div className="bg-muted h-4 rounded-lg w-full" />
              <div className="bg-muted h-4 rounded-lg w-5/6" />
              <div className="bg-muted h-4 rounded-lg w-4/5" />
              <p className="text-xs text-muted-foreground">Формування аналітичного звіту...</p>
            </div>
          ) : (
            <div className="bg-muted/40 rounded-lg p-4 space-y-2">
              {data?.summary?.summary ? (
                <>
                  <p className="text-sm leading-relaxed">{data.summary?.summary}</p>
                  <p className="text-xs text-muted-foreground italic">
                    Цей звіт сформований автоматично і не є фінансовою порадою.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Аналітичний звіт тимчасово недоступний.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="text-center pb-2">
          <Link href={`/asset/${ticker}/info`}>
            <span className="text-sm text-primary hover:underline cursor-pointer">
              Детальна інформація про актив →
            </span>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
