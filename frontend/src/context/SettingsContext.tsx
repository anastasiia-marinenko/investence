import { createContext, useContext, useState, useEffect } from "react";

interface Settings {
  theme: "light" | "dark";
  currency: "USD" | "EUR" | "GBP" | "UAH";
  period: "7" | "14" | "30";
}

const defaults: Settings = { theme: "light", currency: "USD", period: "30" };

interface SettingsCtx {
  settings: Settings;
  save: (s: Partial<Settings>) => void;
  reset: () => void;
}

const Ctx = createContext<SettingsCtx>({
  settings: defaults,
  save: () => {},
  reset: () => {},
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

  return <Ctx.Provider value={{ settings, save, reset }}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
