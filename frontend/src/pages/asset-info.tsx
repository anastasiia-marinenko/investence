// Імпорти типів, роутера, запитів, контексту та UI-компонентів
import type { ReactNode } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { apiFetch } from "@/lib/api";
import { useSettings } from "@/context/SettingsContext";
import InfoTooltip from "@/components/ui/info-tooltip";

// Тип відповіді бекенду з усіма полями детальної інформації про актив
interface AssetInfoData {
  ticker: string;
  name: string;
  asset_type: string;
  exchange: string | null;
  currency: string;
  is_crypto: boolean;
  current_price: number | null;
  daily_change: number | null;
  market_cap: string | null;
  volume: string | null;
  pe_ratio: number | null;
  week_high_52: number | null;
  week_low_52: number | null;
  sector: string | null;
  description: string | null;
}

// Універсальний рядок таблиці: приховується, якщо значення порожнє
function Row({
  label,
  value,
  valueClass,
}: {
  label: ReactNode;
  value: string | number | null | undefined;
  valueClass?: string;
}) {
  if (value == null || value === "") return null;
  return (
    <div className="flex justify-between py-2.5 border-b border-border/50 text-sm last:border-0">
      <div className="text-muted-foreground">
        {label}
      </div>

      <span className={`font-mono ${valueClass ?? ""}`}>
        {value}
      </span>
    </div>
  );
}

// Заглушка для імітації завантаження
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-muted animate-pulse rounded-lg ${className}`} />;
}

export default function AssetInfo() {
  // Отримуємо тікер з URL, приводимо до верхнього регістру
  const params = useParams<{ ticker: string }>();
  const ticker = params.ticker?.toUpperCase() || "";

  // Запит детальної інформації: кеш 10 хв, тільки якщо є тікер
  const { data, isLoading, error } = useQuery({
    queryKey: ["asset-info", ticker],
    queryFn: () => apiFetch<AssetInfoData>(`/assets/${ticker}/info`),
    staleTime: 10 * 60 * 1000,
    enabled: !!ticker,
  });

  const { formatPrice } = useSettings();

  return (
    <Layout>
      <div className="max-w-xl mx-auto space-y-5">

        {/* Картка з інформацією про актив */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
          {isLoading ? (
            // Скелетон-заглушка під час завантаження
            <div className="space-y-3">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : error ? (
            // Повідомлення про помилку запиту
            <p className="text-sm text-muted-foreground text-center py-6">
              Інформація про актив тимчасово недоступна.
            </p>
          ) : (
            <>
              {/* Заголовок: назва, тікер, тип активу, біржа */}
              <div>
                <h1 className="text-xl font-bold">{data?.name}</h1>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="font-mono text-sm text-muted-foreground">{ticker}</span>
                  <span className="text-xs border border-border rounded-full px-2.5 py-0.5 text-muted-foreground font-medium">
                    {data?.is_crypto ? "Криптовалюта" : "Акція"}
                  </span>
                  {data?.exchange && (
                    <span className="text-xs text-muted-foreground">{data.exchange}</span>
                  )}
                </div>
              </div>

              {/* Сітка основних метрик: ціна, зміна, капіталізація тощо */}
              <div>
                <Row
                  label={
                    <div className="flex items-center gap-1">
                      <span>Поточна ціна</span>

                      <InfoTooltip text="Актуальна ринкова ціна активу." />
                    </div>
                  }
                  value={data?.current_price != null
                    ? formatPrice(data.current_price)
                    : undefined}
                />
                <Row
                  label={
                    <div className="flex items-center gap-1">
                      <span>Зміна за день</span>

                      <InfoTooltip text="Відсоткова зміна ціни активу за останні 24 години." />
                    </div>
                  }
                  value={data?.daily_change != null
                    ? `${data.daily_change >= 0 ? "+" : ""}${data.daily_change.toFixed(2)}%`
                    : undefined}
                  valueClass={data?.daily_change != null
                    ? data.daily_change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    : ""}
                />
                <Row
                  label={
                    <div className="flex items-center gap-1">
                      <span>Ринкова капіталізація</span>

                      <InfoTooltip text="Загальна ринкова вартість активу або компанії." />
                    </div>
                  }
                  value={data?.market_cap}
                />
                <Row
                  label={
                    <div className="flex items-center gap-1">
                      <span>Обсяг торгів</span>

                      <InfoTooltip text="Сумарний обсяг купівлі та продажу активу за останній торговий період." />
                    </div>
                  }
                  value={data?.volume}
                />
                {/* P/E тільки для акцій, не для крипто */}
                {!data?.is_crypto && (
                  <Row
                  label={
                    <div className="flex items-center gap-1">
                      <span>Коефіцієнт P/E</span>

                      <InfoTooltip text="Співвідношення ціни акції до прибутку компанії на одну акцію." />
                    </div>
                  }
                  value={data?.pe_ratio != null
                    ? data.pe_ratio.toFixed(2)
                    : undefined}
                />
                )}
                <Row
                  label={
                    <div className="flex items-center gap-1">
                      <span>Максимум за 52 тижні</span>

                      <InfoTooltip text="Найвища ціна активу за останній рік." />
                    </div>
                  }
                  value={data?.week_high_52 != null
                    ? formatPrice(data.week_high_52)
                    : undefined}
                />
                <Row
                  label={
                    <div className="flex items-center gap-1">
                      <span>Мінімум за 52 тижні</span>

                      <InfoTooltip text="Найнижча ціна активу за останній рік." />
                    </div>
                  }
                  value={data?.week_low_52 != null
                    ? formatPrice(data.week_low_52)
                    : undefined}
                />
                {data?.sector && (
                  <Row
                    label={
                      <div className="flex items-center gap-1">
                        <span>Сектор</span>

                        <InfoTooltip text="Галузь економіки, до якої належить компанія." />
                      </div>
                    }
                    value={data.sector}
                  />
                )}
                <Row
                label={
                  <div className="flex items-center gap-1">
                    <span>Валюта</span>

                    <InfoTooltip text="Основна валюта, у якій торгується актив." />
                  </div>
                }
                value={data?.currency || "USD"}
              />
              </div>

              {/* Текстовий опис компанії або криптопроєкту */}
              {data?.description && (
                <div className="pt-1 space-y-2">
                  <p className="text-sm font-semibold text-foreground">
                    {data.is_crypto ? "Про проєкт" : "Про компанію"}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {data.description}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Посилання на повний дашборд для глибшого аналізу */}
        <div className="text-center">
          <Link href={`/dashboard/${ticker}`}>
            <span className="text-sm text-primary hover:underline cursor-pointer">
              Повний дашборд →
            </span>
          </Link>
        </div>
      </div>
    </Layout>
  );
}