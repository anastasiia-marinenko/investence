import { useLocation } from "wouter";
import Layout from "@/components/Layout";

export default function Error404() {
  const [, navigate] = useLocation();

  return (
    <Layout>
      <div className="max-w-md mx-auto text-center space-y-6 pt-16">
        <div className="bg-card rounded-xl border border-border shadow-sm p-8 space-y-4">
          <div className="text-6xl font-bold font-mono text-muted-foreground">404</div>
          <h2 className="text-xl font-semibold">Сторінку не знайдено</h2>
          <p className="text-sm text-muted-foreground">
            Схоже, ця сторінка не існує або актив не знайдено.
          </p>

          <div className="border-t border-border pt-4 text-sm text-left">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Поширені причини
            </p>
            <ul className="text-muted-foreground space-y-1.5 text-xs list-disc list-inside">
              <li>Неправильний або неправильно вказаний тікер</li>
              <li>Актив не знайдено в базі даних</li>
              <li>Посилання не працює або застаріло</li>
              <li>Помилка API під час перевірки активу</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => navigate("/")}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 w-full transition-opacity"
            >
              На головну
            </button>
            <button
              onClick={() => window.history.back()}
              className="border border-border rounded-lg px-6 py-2.5 text-sm hover:bg-accent w-full transition-colors text-muted-foreground"
            >
              ← Назад
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
