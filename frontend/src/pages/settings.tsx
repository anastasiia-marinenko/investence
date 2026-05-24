import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { useSettings } from "@/context/SettingsContext";

export default function Settings() {
  const { settings, save, reset } = useSettings();

  const [localCurrency, setLocalCurrency] = useState<"USD" | "EUR" | "UAH">(
    settings.currency as "USD" | "EUR" | "UAH"
  );
  const [localPeriod, setLocalPeriod] = useState<"7" | "14" | "30">(settings.period);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLocalCurrency(settings.currency as "USD" | "EUR" | "UAH");
    setLocalPeriod(settings.period);
  }, [settings.currency, settings.period]);

  function handleSave() {
    save({ currency: localCurrency, period: localPeriod });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

 function handleReset() {
  setLocalCurrency("USD");
  setLocalPeriod("30");
}

  return (
    <Layout>
      <div className="max-w-lg mx-auto space-y-5">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold">Налаштування</h2>
          <p className="text-sm text-muted-foreground">
            Налаштування зберігаються локально у вашому браузері.
          </p>
        </div>

        {/* Theme */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">Тема</p>
          <div className="flex gap-2">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                onClick={() => save({ theme: t })}
                className={`px-5 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  settings.theme === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {t === "light" ? "Світла" : "Темна"}
              </button>
            ))}
          </div>
        </div>

        {/* Currency */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">Валюта</p>
          <select
            value={localCurrency}
            onChange={(e) => setLocalCurrency(e.target.value as "USD" | "EUR" | "UAH")}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="USD">Долар США (USD, $)</option>
            <option value="EUR">Євро (EUR, €)</option>
            <option value="UAH">Гривня (UAH, ₴)</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Застосовується за замовчуванням для всіх цін у застосунку.
          </p>
        </div>

        {/* Default Period */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">Стандартний період аналізу</p>
          <select
            value={localPeriod}
            onChange={(e) => setLocalPeriod(e.target.value as "7" | "14" | "30")}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="7">7 днів</option>
            <option value="14">14 днів</option>
            <option value="30">30 днів</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Застосовується за замовчуванням для всіх графіків цін у застосунку.
          </p>
        </div>

        {/* Save / Reset */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="bg-primary text-primary-foreground rounded-lg px-6 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Зберегти налаштування
          </button>
          <button
            onClick={handleReset}
            className="border border-destructive text-destructive rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-destructive/10 transition-colors"
          >
            Скинути до стандартних
          </button>
        </div>

        {saved && (
          <p className="text-sm text-green-600 font-medium text-center animate-in fade-in">
            Налаштування збережено
          </p>
        )}
      </div>
    </Layout>
  );
}
