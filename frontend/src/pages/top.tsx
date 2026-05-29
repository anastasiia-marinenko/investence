// Імпорти хуків, роутера, запитів, UI та контексту
import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { apiFetch, type TopResponse } from "@/lib/api";
import { useSettings } from "@/context/SettingsContext";

// Відображає кольоровий бейдж залежно від переданого типу тональності
function SentimentBadge({ s }: { s: string | null }) {
  if (s === "positive") return <span className="wf-badge-positive">Позитивний</span>;
  if (s === "negative") return <span className="wf-badge-negative">Негативний</span>;
  return <span className="wf-badge-neutral">Нейтральний</span>;
}

// Універсальна заглушка для імітації завантаження
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-muted animate-pulse rounded-lg ${className}`} />;
}

// Варіанти фільтрації активів
const TABS = [
  { key: "all", label: "Всі" },
  { key: "stock", label: "Акції" },
  { key: "crypto", label: "Криптовалюти" },
];

export default function Top() {
  // Активна вкладка фільтрації
  const [tab, setTab] = useState<"all" | "stock" | "crypto">("all");
  const { formatPrice } = useSettings();
  const [, navigate] = useLocation();

  // Запит даних з автокешуванням на 5 хвилин; ключ залежить від вибраної категорії
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

        {/* Блок перемикання категорій */}
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

        <div className="bg-card rounded-xl border border-border shadow-sm p-3 sm:p-5 space-y-3">
          {/* Назва — на мобільному переноситься на два рядки */}
          <p className="text-sm font-semibold text-foreground">
            Рейтинг
            <br className="sm:hidden" />
            <span className="text-muted-foreground font-normal text-xs sm:text-sm sm:font-semibold sm:text-foreground">
              {" "}(відсортовано за оцінкою настрою ↓)
            </span>
          </p>

          {/* Послідовна обробка станів: завантаження → порожньо → дані */}
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
            /* Обгортка зі скролом — на мобільному таблиця скролиться горизонтально
               якщо колонок забагато, а не виходить за межі */
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <table className="w-full text-sm border-collapse min-w-[340px]">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="px-2 py-2 w-6 text-xs font-medium">#</th>
                    <th className="px-2 py-2 text-xs font-medium">Тікер</th>
                    {/* Назва — тільки на desktop */}
                    <th className="px-2 py-2 text-xs font-medium hidden sm:table-cell">Назва</th>
                    <th className="px-2 py-2 text-xs font-medium text-right">Ціна</th>
                    {/* Зміна за день — прихована на найвужчих, видна від sm */}
                    <th className="px-2 py-2 text-xs font-medium text-right hidden xs:table-cell sm:table-cell">
                      Зміна
                    </th>
                    <th className="px-2 py-2 text-xs font-medium text-right">Оцінка</th>
                    <th className="px-2 py-2 text-xs font-medium text-right">Тональність</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((a, i) => (
                    <tr
                      key={a.ticker}
                      // Клік по рядку веде на детальну сторінку активу
                      onClick={() => navigate(`/dashboard/${a.ticker}`)}
                      className="border-b border-border/50 hover:bg-accent/50 cursor-pointer transition-colors"
                    >
                      <td className="px-2 py-2 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="px-2 py-2 font-mono font-semibold text-xs">{a.ticker}</td>
                      <td className="px-2 py-2 text-muted-foreground hidden sm:table-cell text-xs truncate max-w-[120px]">
                        {a.name}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-xs whitespace-nowrap">
                        {formatPrice(a.current_price)}
                      </td>
                      {/* Динамічний колір залежно від знаку денної зміни */}
                      <td
                        className={`px-2 py-2 text-right font-mono text-xs whitespace-nowrap hidden xs:table-cell sm:table-cell ${
                          (a.daily_change ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {a.daily_change != null
                          ? `${a.daily_change >= 0 ? "+" : ""}${a.daily_change.toFixed(2)}%`
                          : "–"}
                      </td>
                      {/* Колір оцінки: зелений/червоний/сірий залежно від порогу ±0.2 */}
                      <td
                        className={`px-2 py-2 text-right font-mono font-semibold text-xs whitespace-nowrap ${
                          (a.sentiment_score ?? 0) > 0.2
                            ? "text-green-600 dark:text-green-400"
                            : (a.sentiment_score ?? 0) < -0.2
                            ? "text-red-600 dark:text-red-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {a.sentiment_score != null
                          ? `${a.sentiment_score > 0 ? "+" : ""}${a.sentiment_score.toFixed(2)}`
                          : "–"}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <SentimentBadge s={a.sentiment_label} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}