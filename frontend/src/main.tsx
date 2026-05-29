// Імпорти React 18 API, глобальних стилів та кореневих компонентів
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { SettingsProvider } from "./context/SettingsContext";

// Монтування React-дерева в DOM-вузол #root
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* Додаткові перевірки та логування помилок у режимі розробки */}
    <SettingsProvider>
      {/* Глобальний контекст налаштувань для всього дерева */}
      <App />
    </SettingsProvider>
  </StrictMode>
);