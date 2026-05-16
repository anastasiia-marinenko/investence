/**
 * Сторінка детальної інформації про актив (/asset/:ticker/info).
 */
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { apiFetch } from "@/lib/api";
import { useSettings } from "@/context/SettingsContext";
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

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string | number | null | undefined;
  valueClass?: string;
}) {
  if (value == null || value === "") return null;
  return (
    <div className="flex justify-between py-2.5 border-b border-border/50 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono ${valueClass ?? ""}`}>{value}</span>
    </div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-muted animate-pulse rounded-lg ${className}`} />;
}

export default function AssetInfo() {
  const params = useParams<{ ticker: string }>();
  const ticker = params.ticker?.toUpperCase() || "";

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

        <Link href={`/dashboard/${ticker}`}>
          <span className="text-sm text-primary hover:underline cursor-pointer inline-flex items-center gap-1">
            ← Назад до дашборду
          </span>
        </Link>

        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
          {isLoading ? (
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
            <p className="text-sm text-muted-foreground text-center py-6">
              Інформація про актив тимчасово недоступна.
            </p>
          ) : (
            <>
              {/* Заголовок */}
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

              {/* Основні показники */}
              <div>
                <Row
                  label="Поточна ціна"
                  value={data?.current_price != null ? formatPrice(data.current_price) : undefined}
                />
                <Row
                  label="Зміна за день"
                  value={data?.daily_change != null
                    ? `${data.daily_change >= 0 ? "+" : ""}${data.daily_change.toFixed(2)}%`
                    : undefined}
                  valueClass={data?.daily_change != null
                    ? data.daily_change >= 0 ? "text-green-600" : "text-red-600"
                    : ""}
                />
                <Row label="Ринкова капіталізація" value={data?.market_cap} />
                <Row label="Обсяг торгів" value={data?.volume} />
                {!data?.is_crypto && (
                  <Row
                    label="Коефіцієнт P/E"
                    value={data?.pe_ratio != null
                      ? data.pe_ratio.toFixed(2)
                      : undefined}
                  />
                )}
                <Row
                  label="Максимум за 52 тижні"
                  value={data?.week_high_52 != null ? formatPrice(data.week_high_52) : undefined}
                />
                <Row
                  label="Мінімум за 52 тижні"
                  value={data?.week_low_52 != null ? formatPrice(data.week_low_52) : undefined}
                />
                {data?.sector && <Row label="Сектор" value={data.sector} />}
                <Row label="Валюта" value={data?.currency || "USD"} />
              </div>

              {/* Опис */}
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