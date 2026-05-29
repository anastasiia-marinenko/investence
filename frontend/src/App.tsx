// Підключення роутера, кешування запитів, UI-компонентів та контексту
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SettingsProvider } from "@/context/SettingsContext";

// Імпорти всіх сторінок
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Compare from "@/pages/compare";
import Top from "@/pages/top";
import News from "@/pages/news";
import Analytics from "@/pages/analytics";
import AssetInfo from "@/pages/asset-info";
import History from "@/pages/history";
import Settings from "@/pages/settings";
import Error404 from "@/pages/error-404";

// Ініціалізація клієнта для кешування та повторних запитів
const queryClient = new QueryClient();

// Мапа маршрутів: прив'язка шляхів до відповідних компонентів
function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard/:ticker" component={Dashboard} />
      <Route path="/compare" component={Compare} />
      <Route path="/top" component={Top} />
      <Route path="/news" component={News} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/asset/:ticker/info" component={AssetInfo} />
      <Route path="/history" component={History} />
      <Route path="/settings" component={Settings} />
      <Route path="/404" component={Error404} />
      {/* Будь-який інший URL → 404 */}
      <Route component={Error404} />
    </Switch>
  );
}

// Кореневий компонент: послідовно огортає додаток у провайдери стану, налаштувань, тултіпів та сповіщень
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

export default App;