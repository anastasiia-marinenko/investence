import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { apiFetch, type TopResponse } from "@/lib/api";
import { useSettings } from "@/context/SettingsContext";

function SentimentBadge({ s }: { s: string | null }) {
  if (s === "positive") return <span className="wf-badge-positive">Позитивний</span>;
  if (s === "negative") return <span className="wf-badge-negative">Негативний</span>;
  return <span className="wf-badge-neutral">Нейтральний</span>;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-muted animate-pulse rounded-lg ${className}`} />;
}

const TABS = [
  { key: "all", label: "Всі" },
  { key: "stock", label: "Акції" },
  { key: "crypto", label: "Криптовалюти" },
];

export default function Top() {
  const [tab, setTab] = useState<"all" | "stock" | "crypto">("all");
  const { formatPrice } = useSettings();
  const [, navigate] = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ["top", tab],
    queryFn: () => apiFetch<TopResponse>(`/top?category=${tab}`),
    staleTime: 5 * 60 * 1000,
  });

  const assets = data?.assets ?? [];

  return (
    <Layout>
      <div className="space-y-5">
        <h2 className="text-xl font-bold text-center">Рейтинг активів за інвестиційним настроєм</h2>

        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Категорії</p>
          <div className="flex gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as typeof tab)}
                className={`px-4 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  tab === t.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground leading-snug">
            Рейтинг <span className="hidden sm:inline">(відсортовано за оцінкою настрою ↓)</span>
          </p>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Поки немає проаналізованих активів. Почніть пошук на головній сторінці.
            </p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-left">
                  <th className="px-1 sm:px-2 py-1.5 w-8 text-xs font-medium">#</th>
                  <th className="px-1 sm:px-2 py-1.5 text-xs font-medium">Тікер</th>
                  <th className="px-1 sm:px-2 py-1.5 text-xs font-medium hidden sm:table-cell">Назва</th>
                  <th className="px-1 sm:px-2 py-1.5 text-xs font-medium text-right">Ціна</th>
                  <th className="px-1 sm:px-2 py-1.5 text-xs font-medium text-right">Зміна за день</th>
                  <th className="px-1 sm:px-2 py-1.5 text-xs font-medium text-right">Оцінка настрою</th>
                  <th className="px-1 sm:px-2 py-1.5 text-xs font-medium text-right">Тональність</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a, i) => (
                  <tr
                    key={a.ticker}
                    onClick={() => navigate(`/dashboard/${a.ticker}`)}
                    className="border-b border-border/50 hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <td className="py-1.5 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="py-1.5 font-mono font-semibold text-xs sm:text-sm">{a.ticker}</td>
                    <td className="py-1.5 text-muted-foreground hidden sm:table-cell">{a.name}</td>
                    <td className="py-1.5 text-right font-mono">
                      {formatPrice(a.current_price)}
                    </td>
                    <td
                      className={`py-1.5 text-right font-mono ${
                        (a.daily_change ?? 0) >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {a.daily_change != null
                        ? `${a.daily_change >= 0 ? "+" : ""}${a.daily_change.toFixed(2)}%`
                        : "–"}
                    </td>
                    <td
                      className={`py-1.5 text-right font-mono font-semibold ${
                        (a.sentiment_score ?? 0) > 0.2
                          ? "text-green-600"
                          : (a.sentiment_score ?? 0) < -0.2
                          ? "text-red-600"
                          : "text-gray-500"
                      }`}
                    >
                      {a.sentiment_score != null
                        ? `${a.sentiment_score > 0 ? "+" : ""}${a.sentiment_score.toFixed(2)}`
                        : "–"}
                    </td>
                    <td className="py-1.5 text-right">
                      <SentimentBadge s={a.sentiment_label} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
