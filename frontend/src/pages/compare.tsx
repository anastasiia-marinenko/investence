import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import Layout from "@/components/Layout";
import { apiFetch, type DashboardData } from "@/lib/api";
import { useSettings } from "@/context/SettingsContext";
import InfoTooltip from "@/components/ui/info-tooltip";

function SentimentBadge({ s }: { s: string }) {
  if (s === "positive") return <span className="wf-badge-positive">Позитивний</span>;
  if (s === "negative") return <span className="wf-badge-negative">Негативний</span>;
  return <span className="wf-badge-neutral">Нейтральний</span>;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-muted animate-pulse rounded-lg ${className}`} />;
}

function InfoRow({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/50 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  );
}

export default function Compare() {
  const [tickerA, setTickerA] = useState("");
  const [tickerB, setTickerB] = useState("");
  const [submitted, setSubmitted] = useState<[string, string] | null>(null);
  const { formatPrice } = useSettings();

  const queryA = useQuery({
    queryKey: ["dashboard", submitted?.[0], "30"],
    queryFn: () => apiFetch<DashboardData>(`/assets/${submitted![0]}?days=30`),
    enabled: !!submitted?.[0],
    staleTime: 20 * 60 * 1000,
  });
  const queryB = useQuery({
    queryKey: ["dashboard", submitted?.[1], "30"],
    queryFn: () => apiFetch<DashboardData>(`/assets/${submitted![1]}?days=30`),
    enabled: !!submitted?.[1],
    staleTime: 20 * 60 * 1000,
  });

  const A = queryA.data;
  const B = queryB.data;

  function handleCompare() {
    const a = tickerA.trim().toUpperCase();
    const b = tickerB.trim().toUpperCase();
    if (!a || !b || a === b) return;
    setSubmitted([a, b]);
  }

  function handleReset() {
    setTickerA("");
    setTickerB("");
    setSubmitted(null);
  }

  const priceChart = (() => {
    if (!A?.prices.data?.length || !B?.prices.data?.length) return [];
    const mapA = new Map(A.prices.data.map((p) => [p.date, p.close]));
    const mapB = new Map(B.prices.data.map((p) => [p.date, p.close]));
    const allDates = [...new Set([...mapA.keys(), ...mapB.keys()])].sort();
    const startA = A.prices.data[0].close;
    const startB = B.prices.data[0].close;
    return allDates.map((date) => ({
      date: date.slice(5),
      [A.ticker]: mapA.has(date) && startA > 0 ? ((mapA.get(date)! - startA) / startA) * 100 : null,
      [B.ticker]: mapB.has(date) && startB > 0 ? ((mapB.get(date)! - startB) / startB) * 100 : null,
    }));
  })();

  const isDuplicate =
    tickerA.trim().toUpperCase() === tickerB.trim().toUpperCase() && tickerA.trim() !== "";

  return (
    <Layout>
      <div className="space-y-5">
        <h2 className="text-xl font-bold">Порівняння активів</h2>

        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
          <p className="text-sm font-semibold text-foreground">Виберіть два активи</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Перший тікер:</label>
              <input
                type="text"
                value={tickerA}
                onChange={(e) =>
                  setTickerA(
                    e.target.value
                      .replace(/[^A-Za-z0-9-]/g, "")
                      .toUpperCase()
                      .slice(0, 10)
                  )
                }
                maxLength={10}
                placeholder="напр., AAPL"
                className="border border-border rounded-lg px-3 py-2 text-sm bg-background w-36 focus:outline-none focus:ring-2 focus:ring-ring"
                onKeyDown={(e) => e.key === "Enter" && handleCompare()}
              />
            </div>
            <div className="text-sm font-semibold text-muted-foreground pb-2">vs</div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Другий тікер:</label>
              <input
                type="text"
                value={tickerB}
                onChange={(e) =>
                  setTickerB(
                    e.target.value
                      .replace(/[^A-Za-z0-9-]/g, "")
                      .toUpperCase()
                      .slice(0, 10)
                  )
                }
                maxLength={10}
                placeholder="напр., BTC-USD"
                className="border border-border rounded-lg px-3 py-2 text-sm bg-background w-36 focus:outline-none focus:ring-2 focus:ring-ring"
                onKeyDown={(e) => e.key === "Enter" && handleCompare()}
              />
            </div>
            <button
              onClick={handleCompare}
              disabled={!tickerA.trim() || !tickerB.trim() || isDuplicate}
              className="bg-primary text-primary-foreground rounded-lg px-5 py-2 text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              Порівняти
            </button>
            {submitted && (
              <button
                onClick={handleReset}
                className="border border-border text-muted-foreground rounded-lg px-4 py-2 text-sm hover:bg-accent transition-colors"
              >
                Скинути
              </button>
            )}
          </div>
          {isDuplicate && (
            <p className="text-xs text-destructive">Введіть два різних тікери.</p>
          )}
        </div>

        {submitted && (
          <>
            <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
              <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                Порівняння зміни цін активів за останні 30 днів (%)
                <InfoTooltip text="Графік відображає відсоткову зміну ціни активів відносно першого дня обраного періоду." />
              </p>
              {queryA.isLoading || queryB.isLoading ? (
                <Skeleton className="h-44 w-full" />
              ) : priceChart.length > 0 ? (
                <>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={priceChart} margin={{ top: 5, right: 10, bottom: 5, left: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                      label={{
                        value: "Дата",
                        position: "insideBottomRight",
                        offset: -5,
                        style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      width={50}
                      tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                      label={{
                        value: "Зміна ціни %",
                        angle: -90,
                        position: "insideLeft",
                        offset: -1,
                        style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
                      }}
                    />
                    <Tooltip
                      formatter={(v: number) => [`${v.toFixed(2)}%`, ""]}
                      contentStyle={{ fontSize: 11, borderRadius: 8 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {A && (
                      <Line
                        type="monotone"
                        dataKey={A.ticker}
                        stroke="hsl(var(--primary))"
                        name={A.ticker}
                        dot={false}
                        strokeWidth={2}
                        connectNulls
                      />
                    )}
                    {B && (
                      <Line
                        type="monotone"
                        dataKey={B.ticker}
                        stroke="#f97316"
                        name={B.ticker}
                        dot={false}
                        strokeWidth={2}
                        connectNulls
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>Підказка показує динаміку зміни ціни для кожного активу, вибраного для порівняння.</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Немає даних про ціни
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { q: queryA, color: "border-primary/30" },
                { q: queryB, color: "border-orange-300" },
              ].map(({ q, color }, idx) => (
                <div
                  key={idx}
                  className={`bg-card rounded-xl border shadow-sm p-5 space-y-3 ${color}`}
                >
                  {q.isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ) : q.error ? (
                    <p className="text-sm text-destructive">Актив не знайдено. Перевірте правильність введеного тікера.</p>
                  ) : q.data ? (
                        <>
                          <div>
                            <p className="font-semibold text-base">{q.data.name}</p>
                            <p className="font-mono text-sm text-muted-foreground">{q.data.ticker}</p>
                          </div>
                          <div className="space-y-0">
                            <InfoRow label="Ціна">
                              <span className="font-mono">
                                {formatPrice(q.data.current_price)}
                              </span>
                            </InfoRow>
                            <InfoRow label="Зміна за день">
                              <span className={`font-mono ${(q.data.daily_change ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {q.data.daily_change != null
                                  ? `${q.data.daily_change >= 0 ? "+" : ""}${q.data.daily_change.toFixed(2)}%`
                                  : "–"}
                              </span>
                            </InfoRow>
                            <InfoRow
                                label={
                                  <div className="flex items-center gap-1">
                                    <span>Оцінка настрою</span>
                                    <InfoTooltip text="Середнє значення тональності новин у діапазоні від -1 до +1." />
                                  </div>
                                }
                              >
                              <span className={`font-mono font-semibold ${
                                q.data.news.avg_sentiment > 0.2 ? "text-green-600"
                                : q.data.news.avg_sentiment < -0.2 ? "text-red-600" : ""
                              }`}>
                                {q.data.news.avg_sentiment > 0 ? "+" : ""}
                                {q.data.news.avg_sentiment.toFixed(2)}
                              </span>
                            </InfoRow>
                            <InfoRow
                                label={
                                  <div className="flex items-center gap-1">
                                    <span>Тональність</span>
                                    <InfoTooltip text="Загальна класифікація новинного настрою: позитивний, нейтральний або негативний." />
                                  </div>
                                }
                              >
                              <SentimentBadge s={q.data.news.sentiment_label} />
                            </InfoRow>
                            <InfoRow
                                label={
                                  <div className="flex items-center gap-1">
                                    <span>Кількість новин</span>
                                    <InfoTooltip text="Кількість новин, використаних для аналізу ринкового настрою." />
                                  </div>
                                }
                              >
                              <span>{q.data.news.count}</span>
                            </InfoRow>
                            <InfoRow
                                label={
                                  <div className="flex items-center gap-1">
                                    <span>Кореляція</span>
                                    <InfoTooltip text="Показує силу взаємозв’язку між новинним настроєм та зміною ціни активу." />
                                  </div>
                                }
                              >
                              <span className="text-xs text-muted-foreground text-right max-w-[60%]">
                                {q.data.correlation.label}
                              </span>
                            </InfoRow>
                            {q.data.is_crypto && q.data.github.data.length > 0 && (
                              <InfoRow label="GitHub-репозиторії">
                                <span>{q.data.github.data.length}</span>
                              </InfoRow>
                            )}
                          </div>
                          <div className="bg-muted/40 rounded-lg p-3 text-xs leading-relaxed text-muted-foreground">
                            {q.data.summary?.summary ?? "AI-звіт недоступний"}
                          </div>
                        </>
                      ) : null}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
