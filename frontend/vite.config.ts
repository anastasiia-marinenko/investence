// Імпорти плагінів та утиліт для конфігурації Vite
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Експорт конфігурації з типізацією та автодоповненням
export default defineConfig({
  // Плагіни: React HMR + Tailwind CSS v4 інтеграція
  plugins: [
    react(),
    tailwindcss(),
  ],
  // Налаштування імпортів: @ → src/ для коротших шляхів
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  // Параметри продакшн-збірки
  build: {
    outDir: "dist",        // Папка для готових файлів
    emptyOutDir: true,     // Очищати перед кожним білдом
  },
  // Налаштування локального сервера розробки
  server: {
    port: 5173,            // Порт за замовчуванням для Vite
    host: "0.0.0.0",       // Доступ ззовні (для Docker/мережі)
    // Проксі запитів /api на бекенд — уникнення CORS під час розробки
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});