// Імпорти типів, хуків, графіків та компонентів
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  PieChart, Pie, Cell, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LineChart, Line,
} from "recharts";
import Layout from "@/components/Layout";
import { apiFetch } from "@/lib/api";
import { useSettings } from "@/context/SettingsContext";
import InfoTooltip from "@/components/ui/info-tooltip";

// Структура відповіді від бекенду — всі дані для сторінки аналітики
interface AnalyticsResponse {
  has_data: boolean;
  message: string | null;
  summary: {
    total_assets: number;
    total_news: number;
    avg_sentiment: number;
    market_sentiment: string;
    avg_price_change: number | null;
    total_commits: number;
    crypto_assets: number;
  };
  sentiment_distribution: {
    positive: number;
    negative: number;
    neutral: number;
    positive_count: number;
    negative_count: number;
    neutral_count: number;
    total: number;
  };
  charts: {
    news_activity:   { date: string; count: number }[];
    price_activity:  { date: string; avg_change_pct: number }[];
    github_activity: { ticker: string; name: string; commits_last_month: number; total_stars: number }[];
  };
  top5: {
    by_sentiment:    { ticker: string; name: string; sentiment_score: number }[];
    by_price_change: { ticker: string; name: string; current_price: number; change_day_pct: number; change_30d_pct: number }[];
    by_github:       { ticker: string; name: string; total_stars: number; commits_last_month: number; activity_level: string }[];
  };
}

// Заглушка для стану завантаження — анімований сірий блок
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-muted animate-pulse rounded-lg ${className}`} />;
}

// Спільні стилі для карток, щоб не дублювати класи
const CARD = "bg-card rounded-xl border border-border shadow-sm p-5 space-y-4";
// Фіксовані кольори для секторів кругової діаграми
const PIE_COLORS = { positive: "#22c55e", negative: "#ef4444", neutral: "#a1a1aa" };

// Повертає Tailwind-клас кольору тексту залежно від значення тональності
function sentimentColor(score: number | null) {
  if (score == null) return "text-muted-foreground";
  if (score > 0.2) return "text-green-600 dark:text-green-400";
  if (score < -0.2) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

// Міні-прогресбар для візуалізації сили тональності
function SentimentBar({ score }: { score: number | null }) {
  const v = Math.min(100, Math.abs((score ?? 0) * 100));
  const color = (score ?? 0) > 0.2 ? "bg-green-500" : (score ?? 0) < -0.2 ? "bg-red-500" : "bg-gray-400";
  return (
    <div className="w-20 bg-muted rounded-full h-1.5">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${v}%` }} />
    </div>
  );
}

// Головний компонент сторінки
export default function Analytics() {
  const [, navigate] = useLocation();

  // Запит даних: автооновлення кожні 10 сек, навіть у фоновому режимі
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => apiFetch<AnalyticsResponse>("/analytics"),
    
    staleTime: 0,
    refetchOnWindowFocus: true,

    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });

  const { formatPrice } = useSettings();

  // Підготовка даних для PieChart — фільтруємо категорії з нульовою кількістю
  const pieData = data ? [
    { name: "Позитивний", value: data.sentiment_distribution.positive_count, color: PIE_COLORS.positive },
    { name: "Негативний", value: data.sentiment_distribution.negative_count, color: PIE_COLORS.negative },
    { name: "Нейтральний", value: data.sentiment_distribution.neutral_count, color: PIE_COLORS.neutral },
  ].filter((d) => d.value > 0) : [];

  const totalSentNews = data?.sentiment_distribution.total ?? 0;

  // Тип для карток зі зведеною статистикою
  type StatCard = {
    id: string;
    label: ReactNode;
    value: string;
    color: string;
  };

  // Конфігурація карток: лейбли, динамічні значення, кольори
  const statCards: StatCard[] = [
    {
      id: "total_assets",
      label: "Проаналізовано активів",
      value: String(data?.summary.total_assets ?? 0),
      color: "",
    },
    {
      id: "total_news",
      label: "Всього новин",
      value: String(data?.summary.total_news ?? 0),
      color: "",
    },
    {
      id: "avg_sentiment",
      label: (
        <div className="flex items-center gap-1">
          <span>Середня оцінка тональності</span>
          <InfoTooltip text="Середнє значення тональності всіх проаналізованих новин у діапазоні від -1 до +1." />
        </div>
      ),
      value: data?.summary.avg_sentiment != null
        ? `${data.summary.avg_sentiment > 0 ? "+" : ""}${data.summary.avg_sentiment.toFixed(2)}`
        : "–",
      color: sentimentColor(data?.summary.avg_sentiment ?? null),
    },
    {
      id: "market_sentiment",
      label: (
        <div className="flex items-center gap-1">
          <span>Настрій ринку</span>
          <InfoTooltip text="Загальна оцінка ринкової тональності на основі проаналізованих новин." />
        </div>
      ),
      value: data?.summary.market_sentiment ?? "–",
      color: data?.summary.market_sentiment === "Позитивний"
        ? "text-green-600 dark:text-green-400"
        : data?.summary.market_sentiment === "Негативний"
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground",
    },
    {
      id: "avg_price_change",
      label: (
        <div className="flex items-center gap-1">
          <span>Середня цінова зміна за день</span>
          <InfoTooltip text="Середня відсоткова зміна ціни всіх активів за останню добу." />
        </div>
      ),
      value: data?.summary.avg_price_change != null
        ? `${data.summary.avg_price_change >= 0 ? "+" : ""}${data.summary.avg_price_change.toFixed(2)}%`
        : "–",
      color: (data?.summary.avg_price_change ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
    },
    {
      id: "developer_activity",
      label: (
        <div className="flex items-center gap-1">
          <span>Активність розробників</span>
          <InfoTooltip text="Сумарна кількість комітів у GitHub-репозиторіях криптовалютних проєктів." />
        </div>
      ),
      value: String(data?.summary.total_commits ?? 0),
      color: "",
    },
  ];

  const hasData = data?.has_data ?? false;

  return (
    <Layout>
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-center">Загальна аналітика</h2>

        {/* Сітка карток зі зведеною статистикою */}
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {statCards.map((s) => (
              <div key={s.id} className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-1">
                <p className="text-xs text-muted-foreground leading-snug">{s.label}</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-3/4" />
                ) : (
                  <p className={`text-xl sm:text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
                )}
              </div>
            ))}
          </div>
          {/* Повідомлення, якщо бекенд ще не зібрав дані */}
          {!isLoading && !hasData && (
            <p className="text-sm text-muted-foreground text-center py-4 mt-2">
              Даних для аналітики поки немає. Почніть аналіз активів на головній сторінці.
            </p>
          )}
        </div>

        {/* Блок новин: діаграми + таблиця */}
        <div className="space-y-4">
          {/* Кругова діаграма розподілу новин за тональністю */}
          <div className={CARD}>
            <div className="flex items-center gap-1">
              <p className="text-sm font-semibold text-foreground">
                Розподіл новин за тональністю
              </p>
              <InfoTooltip text="Розподіл усіх зібраних та проаналізованих новин за тональністю." />
            </div>
            {isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="35%" cy="50%" outerRadius={70} dataKey="value" nameKey="name">
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  {/* Підказка з кількістю та відсотком для сектора */}
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value} новин (${totalSentNews > 0 ? ((value / totalSentNews) * 100).toFixed(1) : 0}%)`,
                      name,
                    ]}
                    contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                  }}
                  />
                  {/* Легенда з кастомним форматуванням: назва + відсоток + кількість */}
                  <Legend
                    layout="vertical" align="right" verticalAlign="middle"
                    formatter={(value, entry: { payload?: { value?: number } }) => {
                      const count = entry.payload?.value ?? 0;
                      const pct = totalSentNews > 0 ? ((count / totalSentNews) * 100).toFixed(1) : "0.0";
                      return (
                        <span style={{ fontSize: 12 }}>
                          {value}<br />
                          <span style={{ color: "#888" }}>{pct}% · {count} новин</span>
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Дані тимчасово недоступні</p>
            )}
          </div>

          {/* Стовпчаста діаграма: кількість новин за останні 7 днів */}
          <div className={CARD}>
            <div className="flex items-center gap-1">
              <p className="text-sm font-semibold text-foreground">
                Динаміка кількості новин за останні 7 днів
              </p>
            </div>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={data?.charts.news_activity ?? []} margin={{ top: 5, right: 10, bottom: 5, left: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v: string) => v.slice(5)}
                    label={{
                      value: "Дата",
                      position: "insideBottomRight",
                      offset: -5,
                      style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    width={30}
                    label={{
                      value: "Кількість",
                      angle: -90,
                      position: "insideLeft",
                      offset: -5,
                      style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip
                    labelFormatter={(l) => `Дата: ${l}`}
                    formatter={(v: number) => [v, "Новин"]}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  />
                  <Bar dataKey="count" name="Новин" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Таблиця топ-5 активів за тональністю новин */}
          <div className={CARD}>
            <div className="flex items-center gap-1">
              <p className="text-sm font-semibold text-foreground">
                Топ-5 активів за оцінкою настроїв
              </p>

              <InfoTooltip text="Рейтинг активів із найвищою середньою позитивною тональністю новин." />
            </div>
            {isLoading ? (
              <div className="space-y-2">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : !data?.top5.by_sentiment.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Даних поки немає. Почніть аналіз активів на головній сторінці.
              </p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="py-2 w-8 text-xs font-medium">#</th>
                    <th className="py-2 text-xs font-medium">Тікер</th>
                    <th className="py-2 text-xs font-medium hidden sm:table-cell">Назва</th>
                    <th className="py-2 text-xs font-medium text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span>Оцінка</span>

                        <InfoTooltip text="Середня оцінка настрою новин для активу у діапазоні від -1 до +1." />
                      </div>
                    </th>
                    <th className="py-2 text-xs font-medium text-right hidden sm:table-cell">
                    <div className="flex items-center justify-end gap-1">
                      <span>Рівень оцінки</span>

                      <InfoTooltip text="Візуальне представлення сили позитивної або негативної тональності." />
                    </div>
                  </th>
                  </tr>
                </thead>
                <tbody>
                  {data.top5.by_sentiment.map((a, i) => (
                    // Клік по рядку веде на дашборд активу
                    <tr key={a.ticker} onClick={() => navigate(`/dashboard/${a.ticker}`)}
                      className="border-b border-border/50 hover:bg-accent/50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="py-2.5 font-mono font-semibold">{a.ticker}</td>
                      <td className="py-2.5 text-muted-foreground hidden sm:table-cell text-xs">{a.name}</td>
                      {/* Колір оцінки залежить від порогу ±0.2 */}
                      <td className={`py-2.5 text-right font-mono font-semibold ${sentimentColor(a.sentiment_score)}`}>
                        {a.sentiment_score != null
                          ? `${a.sentiment_score > 0 ? "+" : ""}${a.sentiment_score.toFixed(2)}`
                          : "–"}
                      </td>
                      <td className="py-2.5 text-right hidden sm:table-cell">
                        <div className="flex justify-end">
                          <SentimentBar score={a.sentiment_score} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Блок цінових даних: графік + таблиця */}
        <div className="space-y-4">
          {/* Лінійний графік середньої зміни цін за 7 днів */}
          <div className={CARD}>
            <div className="flex items-center gap-1">
              <p className="text-sm font-semibold text-foreground">
                Середня зміна ціни активів за останні 7 днів
              </p>

              <InfoTooltip text="Показує середню відсоткову зміну ціни всіх проаналізованих активів за кожен день. Зелені точки – позитивна зміна, червоні – негативна." />
            </div>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (data?.charts.price_activity ?? []).length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={data!.charts.price_activity} margin={{ top: 5, right: 10, bottom: 5, left: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v: string) => v.slice(5)}
                    label={{
                      value: "Дата",
                      position: "insideBottomRight",
                      offset: -5,
                      style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    width={45}
                    tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                    label={{
                      value: "Зміна %",
                      angle: -90,
                      position: "insideLeft",
                      offset: -5,
                      style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip
                    labelFormatter={(l) => `Дата: ${l}`}
                    formatter={(v: number) => [`${v.toFixed(2)}%`, "Середня зміна"]}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  />
                  {/* Кастомні точки: зелений для зростання, червоний для падіння */}
                  <Line
                    type="monotone"
                    dataKey="avg_change_pct"
                    name="Середня зміна ціни %"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      const fill = payload.avg_change_pct >= 0 ? "#22c55e" : "#ef4444";
                      return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={3} fill={fill} />;
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Дані тимчасово недоступні</p>
            )}
          </div>

          {/* Таблиця топ-5 активів за ціновою динамікою */}
          <div className={CARD}>
            <p className="text-sm font-semibold text-foreground">Топ-5 активів за ціновою зміною</p>
            {isLoading ? (
              <div className="space-y-2">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : !data?.top5.by_price_change.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Даних поки немає. Почніть аналіз активів на головній сторінці.
              </p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="py-2 w-8 text-xs font-medium">#</th>
                    <th className="py-2 text-xs font-medium">Тікер</th>
                    <th className="py-2 text-xs font-medium hidden sm:table-cell">Назва</th>
                    <th className="py-2 text-xs font-medium text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span>Ціна</span>
                      </div>
                    </th>
                    <th className="py-2 text-xs font-medium text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span>Зміна за день</span>
                      </div>
                    </th>
                    <th className="py-2 text-xs font-medium text-right hidden md:table-cell">
                      <div className="flex items-center justify-end gap-1">
                        <span>Зміна за 30 днів</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.top5.by_price_change.map((a, i) => (
                    <tr key={a.ticker} onClick={() => navigate(`/dashboard/${a.ticker}`)}
                      className="border-b border-border/50 hover:bg-accent/50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="py-2.5 font-mono font-semibold">{a.ticker}</td>
                      <td className="py-2.5 text-muted-foreground hidden sm:table-cell text-xs">{a.name}</td>
                      <td className="py-2.5 text-right font-mono">
                        {formatPrice(a.current_price)}
                      </td>
                      {/* Колір зміни: зелений для +, червоний для - */}
                      <td className={`py-2.5 text-right font-mono font-semibold ${
                        (a.change_day_pct ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      }`}>
                        {a.change_day_pct != null
                          ? `${a.change_day_pct >= 0 ? "+" : ""}${a.change_day_pct.toFixed(2)}%`
                          : "–"}
                      </td>
                      <td className={`py-2.5 text-right font-mono hidden md:table-cell ${
                        (a.change_30d_pct ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      }`}>
                        {a.change_30d_pct != null
                          ? `${a.change_30d_pct >= 0 ? "+" : ""}${a.change_30d_pct.toFixed(2)}%`
                          : "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* GitHub-активність: горизонтальний барчарт для крипто-активів */}
        <div className={CARD}>
          <div className="flex items-center gap-1">
            <p className="text-sm font-semibold text-foreground">
              Активність розробників за останній місяць
            </p>
            <InfoTooltip text="Поточна кількість комітів у GitHub-репозиторіях криптовалютних проєктів за останній місяць для кожного проаналізованого крипто-активу. Дані оновлюються при аналізі активу." />
          </div>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (data?.charts.github_activity ?? []).length > 0 ? (
            <ResponsiveContainer
              width="100%"
              // Висота адаптується під кількість елементів
              height={Math.max(120, (data!.charts.github_activity.length * 40))}
            >
              <BarChart
                data={data!.charts.github_activity}
                layout="vertical"
                margin={{ top: 5, right: 10, bottom: 20, left: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: number) => v.toLocaleString()}
                  label={{
                    value: "Коміти за місяць",
                    position: "insideBottomRight",
                    offset: -5,
                    style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
                  }}
                />
                <YAxis
                  type="category"
                  dataKey="ticker"
                  tick={{ fontSize: 11, fontWeight: 600 }}
                  width={55}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => [v.toLocaleString(), "Комітів за місяць"]}
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                />
                <Bar
                  dataKey="commits_last_month"
                  name="Комітів за місяць"
                  fill="#a855f7"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Дані тимчасово недоступні
            </p>
          )}
        </div>

          {/* Таблиця топ-5 активів за GitHub-активністю */}
          <div className={CARD}>
            <div className="flex items-center gap-1">
              <p className="text-sm font-semibold text-foreground">
                Топ-5 активів за активністю розробників
              </p>

              <InfoTooltip text="Рейтинг криптоактивів за активністю розробників у GitHub." />
            </div>
            {isLoading ? (
              <div className="space-y-2">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : !data?.top5.by_github.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Даних про активність розробників поки немає. Проаналізуйте криптовалютний актив на головній сторінці.
              </p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="py-2 w-8 text-xs font-medium">#</th>
                    <th className="py-2 text-xs font-medium">Тікер</th>
                    <th className="py-2 text-xs font-medium hidden sm:table-cell">Назва</th>
                    <th className="py-2 text-xs font-medium text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span>Зірки</span>

                        <InfoTooltip text="Зірка – позначення репозиторію як цікавого користувачем." />
                      </div>
                    </th>
                    <th className="py-2 text-xs font-medium text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span>Ком./міс.</span>

                        <InfoTooltip text="Кількість комітів у GitHub-репозиторіях за останній місяць." />
                      </div>
                    </th>
                    <th className="py-2 text-xs font-medium text-center">
                    <div className="flex items-center justify-end gap-1">
                      <span>Активність</span>

                      <InfoTooltip text="Рівень активності розробників на основі комітів та роботи з репозиторіями." />
                    </div>
                  </th>
                  </tr>
                </thead>
                <tbody>
                  {data.top5.by_github.map((a, i) => (
                    <tr key={a.ticker} onClick={() => navigate(`/dashboard/${a.ticker}`)}
                      className="border-b border-border/50 hover:bg-accent/50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="py-2.5 font-mono font-semibold">{a.ticker}</td>
                      <td className="py-2.5 text-muted-foreground hidden sm:table-cell text-xs">{a.name}</td>
                      <td className="py-2.5 text-right font-mono">{a.total_stars.toLocaleString()}</td>
                      <td className="py-2.5 text-center font-mono">{a.commits_last_month}</td>
                      <td className="py-2.5 text-right">
                        {/* Бейдж рівня активності: high/medium/low з відповідним кольором */}
                        <div className="flex items-center justify-end gap-1">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                              a.activity_level === "high"
                              ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700"
                              : a.activity_level === "medium"
                              ? "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600"
                              : "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700"
                            }`}
                          >
                            {a.activity_level === "high"
                              ? "Висока"
                              : a.activity_level === "medium"
                              ? "Середня"
                              : "Низька"}
                          </span>
                        </div>
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