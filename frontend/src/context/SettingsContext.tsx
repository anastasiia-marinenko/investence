// Імпорти хуків React для створення та споживання контексту
import { createContext, useContext, useState, useEffect } from "react";

// Курси конвертації відносно USD + символи валют для відображення
const RATES: Record<string, number> = { USD: 1, EUR: 0.92, UAH: 41.5 };
const SYMBOLS: Record<string, string> = { USD: "$", EUR: "€", UAH: "₴" };

// Тип глобальних налаштувань додатку
interface Settings {
  theme: "light" | "dark";
  currency: "USD" | "EUR" | "UAH";
  period: "7" | "14" | "30";
}

// Значення за замовчуванням при першому запуску або помилці читання
const defaults: Settings = { theme: "light", currency: "USD", period: "30" };

// Форма контексту: стан, методи зміни, хелпер форматування цін
interface SettingsCtx {
  settings: Settings;
  save: (s: Partial<Settings>) => void;
  reset: () => void;
  formatPrice: (usd: number | null | undefined, decimals?: number) => string;
}

// Створення контексту з безпечними заглушками для fallback-рендеру
const Ctx = createContext<SettingsCtx>({
  settings: defaults,
  save: () => {},
  reset: () => {},
  formatPrice: (v) => (v != null ? `$${v.toFixed(2)}` : "–"),
});

// Провайдер налаштувань: зберігає вибір користувача в localStorage та керує темою
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // Лінива ініціалізація: читаємо з localStorage або беремо дефолт
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const s = localStorage.getItem("investence-settings");
      return s ? { ...defaults, ...JSON.parse(s) } : defaults;
    } catch {
      return defaults;
    }
  });

  // Синхронізація класу .dark на <html> та збереження в localStorage при зміні
  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
    localStorage.setItem("investence-settings", JSON.stringify(settings));
  }, [settings]);

  // Часткове оновлення налаштувань без перезапису інших полів
  const save = (patch: Partial<Settings>) =>
    setSettings((prev) => ({ ...prev, ...patch }));

  // Повне скидання до початкових значень
  const reset = () => setSettings(defaults);

  // Конвертація USD у обрану валюту + локалізоване форматування з символом
  function formatPrice(usd: number | null | undefined, decimals = 2): string {
    if (usd == null) return "–";

    const rate = RATES[settings.currency] ?? 1;
    const val = usd * rate;

    const d = decimals;

    const formatted = new Intl.NumberFormat("uk-UA", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    }).format(val);

    const sym = SYMBOLS[settings.currency] ?? "$";

    return `${sym}${formatted}`;
  }

  return (
    <Ctx.Provider value={{ settings, save, reset, formatPrice }}>
      {children}
    </Ctx.Provider>
  );
}

// Зручний хук для отримання налаштувань у будь-якому компоненті
export const useSettings = () => useContext(Ctx);