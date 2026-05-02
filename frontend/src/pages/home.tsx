import { useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { apiFetch } from "@/lib/api";

const POPULAR = [
  { ticker: "AAPL", name: "Apple Inc.", isCrypto: false },
  { ticker: "BTC-USD", name: "Bitcoin", isCrypto: true },
  { ticker: "ETH-USD", name: "Ethereum", isCrypto: true },
  { ticker: "MSFT", name: "Microsoft", isCrypto: false },
  { ticker: "TSLA", name: "Tesla", isCrypto: false },
];

const FEATURES = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8z"/>
      </svg>
    ),
    title: "Новини та настрій",
    desc: "Аналіз тональності фінансових новин із різних джерел для оцінки ринкового настрою навколо активу.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: "Цінова динаміка",
    desc: "Графіки цін за 7, 14 та 30 днів з аналізом кореляції між ціновими змінами та настроєм новин.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
      </svg>
    ),
    title: "Активність розробників",
    desc: "Моніторинг GitHub-активності для криптовалютних проєктів — кількість комітів, зірок та відкритих задач.",
  },
];

export default function Home() {
  const [ticker, setTicker] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();

  async function handleAnalyze(t?: string) {
    const value = (t || ticker).trim().toUpperCase();
    if (!value) {
      setError("Будь ласка, введіть тікер-символ.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await apiFetch<{ valid: boolean }>(`/assets/validate/${value}`);
      navigate(`/dashboard/${value}`);
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "Актив не знайдено. Перевірте правильність символу."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-10">
        <div className="text-center space-y-3 pt-8">
          <h1 className="text-3xl font-bold tracking-tight">Investence</h1>
          <p className="text-muted-foreground text-base">Аналіз інвестиційного настрою на основі штучного інтелекту</p>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Введіть тікер, щоб отримати повну аналітичну картину: настрої новин, динаміка цін та активність розробників – об'єднані в один звіт
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={ticker}
              onChange={(e) => {
                setTicker(e.target.value.replace(/[^A-Za-z0-9-]/g, "").slice(0, 10));
                setError("");
              }}
              placeholder="Введіть тікер (напр., AAPL або BTC-USD)"
              className="flex-1 border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              disabled={loading}
            />
            <button
              onClick={() => handleAnalyze()}
              disabled={!ticker.trim() || loading}
              className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity min-w-[110px]"
            >
              {loading ? "Перевірка…" : "Аналізувати"}
            </button>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Популярні активи</p>
          <div className="flex gap-3 flex-wrap">
            {POPULAR.map((a) => (
              <button
                key={a.ticker}
                onClick={() => { setTicker(a.ticker); handleAnalyze(a.ticker); }}
                disabled={loading}
                className="border border-border rounded-lg px-4 py-2.5 text-sm hover:bg-accent hover:border-primary/30 transition-colors text-left disabled:opacity-40 group"
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-semibold text-foreground">{a.ticker}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${a.isCrypto ? "bg-purple-50 text-purple-600 border border-purple-200" : "bg-blue-50 text-blue-600 border border-blue-200"}`}>
                    {a.isCrypto ? "Крипто" : "Акція"}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{a.name}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-5">
          <p className="text-base font-semibold text-foreground">Що таке Investence?</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Investence — це платформа аналізу інвестиційного настрою на основі штучного інтелекту. Вона агрегує фінансові новини, цінові дані та активність розробників GitHub, щоб надати комплексну оцінку настрою навколо будь-якого активу. Введіть тікер акції або криптовалюти — і отримайте повну аналітичну картину за лічені секунди.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="space-y-2 p-4 bg-muted/40 rounded-lg">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  {f.icon}
                </div>
                <p className="font-semibold text-sm text-foreground">{f.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
