import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useSettings } from "@/context/SettingsContext";

const navLinks = [
  { href: "/", label: "Головна" },
  { href: "/top", label: "Рейтинг" },
  { href: "/news", label: "Новини" },
  { href: "/compare", label: "Порівняти" },
  { href: "/analytics", label: "Аналітика" },
  { href: "/history", label: "Історія" },
];

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

function GearIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

function BurgerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { settings, save } = useSettings();
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleTheme() {
    save({ theme: settings.theme === "light" ? "dark" : "light" });
  }

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <span className="font-bold text-base tracking-tight text-foreground cursor-pointer">
              Investence
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <span
                  className={`px-3 py-1.5 text-sm cursor-pointer transition-colors border-b-2 ${
                    isActive(link.href)
                      ? "border-primary text-primary font-medium"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </span>
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-2 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title={settings.theme === "light" ? "Темна тема" : "Світла тема"}
            >
              {settings.theme === "light" ? <MoonIcon /> : <SunIcon />}
            </button>
            <Link href="/settings">
              <span
                className={`p-2 rounded cursor-pointer transition-colors inline-flex ${
                  isActive("/settings")
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
                title="Налаштування"
              >
                <GearIcon />
              </span>
            </Link>
          </div>

          {/* Mobile: theme + hamburger */}
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-2 rounded text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              {settings.theme === "light" ? <MoonIcon /> : <SunIcon />}
            </button>
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="p-2 rounded text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              {mobileOpen ? <CloseIcon /> : <BurgerIcon />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-card">
            <nav className="flex flex-col px-4 py-2">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <span
                    onClick={() => setMobileOpen(false)}
                    className={`block px-3 py-2.5 text-sm cursor-pointer rounded transition-colors ${
                      isActive(link.href)
                        ? "text-primary font-medium bg-accent"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    {link.label}
                  </span>
                </Link>
              ))}
              <Link href="/settings">
                <span
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 text-sm cursor-pointer rounded text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-2"
                >
                  <GearIcon /> Налаштування
                </span>
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">{children}</main>

      <footer className="border-t border-border bg-card mt-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-sm text-foreground">Investence</p>
              <p className="text-xs text-muted-foreground mt-0.5">AI-аналіз інвестиційного настрою</p>
            </div>
            <a
              href="https://github.com/anastasiia-marinenko/investence"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Вихідний код на GitHub
            </a>
          </div>
          <div className="mt-4 pt-4 border-t border-border space-y-1 text-center">
            <p className="text-xs text-muted-foreground">
              Застосунок призначений лише для інформаційних цілей і не є фінансовою порадою.
            </p>
            <p className="text-xs text-muted-foreground">© 2026 Investence. Всі права захищено.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
