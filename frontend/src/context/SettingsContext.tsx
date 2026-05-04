import { createContext, useContext, useState, useEffect } from "react";

const RATES: Record<string, number> = { USD: 1, EUR: 0.92, UAH: 41.5 };
const SYMBOLS: Record<string, string> = { USD: "$", EUR: "€", UAH: "₴" };

interface Settings {
  theme: "light" | "dark";
  currency: "USD" | "EUR" | "UAH";
  period: "7" | "14" | "30";
}

const defaults: Settings = { theme: "light", currency: "USD", period: "30" };

interface SettingsCtx {
  settings: Settings;
  save: (s: Partial<Settings>) => void;
  reset: () => void;
  formatPrice: (usd: number | null | undefined, decimals?: number) => string;
}

const Ctx = createContext<SettingsCtx>({
  settings: defaults,
  save: () => {},
  reset: () => {},
  formatPrice: (v) => (v != null ? `$${v.toFixed(2)}` : "—"),
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const s = localStorage.getItem("investence-settings");
      return s ? { ...defaults, ...JSON.parse(s) } : defaults;
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
    localStorage.setItem("investence-settings", JSON.stringify(settings));
  }, [settings]);

  const save = (patch: Partial<Settings>) =>
    setSettings((prev) => ({ ...prev, ...patch }));

  const reset = () => setSettings(defaults);

  function formatPrice(usd: number | null | undefined, decimals = 2): string {
    if (usd == null) return "—";
    const rate = RATES[settings.currency] ?? 1;
    const sym  = SYMBOLS[settings.currency] ?? "$";
    const val  = usd * rate;
    // Для UAH — без дробових частин якщо велика сума
    const d = settings.currency === "UAH" && val > 1000 ? 0 : decimals;
    return `${sym}${val.toFixed(d)}`;
  }

  return (
    <Ctx.Provider value={{ settings, save, reset, formatPrice }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSettings = () => useContext(Ctx);