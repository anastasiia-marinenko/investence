# Investence

Веб-застосунок для аналізу інвестиційного настрою на основі фінансових новин, ринкових даних та активності розробників GitHub.

---

# Опис продукту

Investence – це AI-платформа для аналізу інвестиційного настрою, що об'єднує три незалежні джерела ринкових сигналів:

- фінансові новини;
- цінові дані активів;
- активність розробників на GitHub.

Платформа автоматично збирає, обробляє та візуалізує дані, після чого надає користувачу узагальнений аналітичний звіт, сформований за допомогою технологій штучного інтелекту.

Користувач вводить тікер-символ активу (наприклад: `AAPL`, `BTC-USD`) та отримує:

- аналіз новинного настрою;
- динаміку цін;
- GitHub-активність;
- кореляційний аналіз;
- AI-згенерований аналітичний висновок.

---

# Мета

Автоматизувати процес збору та аналізу фінансових даних із декількох незалежних джерел та надати користувачу зручний інструмент для швидкої оцінки інвестиційного настрою навколо активу.

---

# Основний функціонал

- Пошук акцій та криптовалют за тікером
- Аналіз фінансових новин
- Класифікація тональності новин
- Відображення історії цін
- Аналіз GitHub-активності криптопроєктів
- Кореляційний аналіз між новинами та ціною
- Генерація AI-аналітики
- Експорт даних у CSV
- Кешування результатів

---

# Унікальні особливості

## Мультиджерельний аналіз

Одночасний аналіз:

- новин;
- ринкових даних;
- активності розробників.

## AI-аналітичний висновок

LLM-модель формує узагальнений текстовий звіт на основі всіх джерел даних.

## GitHub як фінансовий індикатор

Активність розробників використовується як додатковий сигнал для оцінки криптовалютних активів.

## Кореляційний аналіз

Автоматичне виявлення взаємозв'язку між новинним фоном та рухом ціни активу.

---

# Цільова аудиторія

- приватні інвестори;
- фінансові аналітики;
- студенти та дослідники;
- Data Science та AI-розробники.

---

# Технологічний стек

| Категорія       | Технологія                    |
| --------------- | ----------------------------- |
| Backend         | Python, FastAPI               |
| Frontend        | React, Vite, TypeScript       |
| Database        | PostgreSQL, SQLAlchemy        |
| AI/LLM          | Groq API (Llama 3), Gemini    |
| Data Collection | yfinance, NewsAPI, GitHub API |
| Visualization   | Recharts                      |
| UI              | Tailwind CSS, shadcn/ui       |
| Infrastructure  | Docker, Railway               |
| CI/CD           | GitHub Actions                |

---

# Сторінки застосунку

| Сторінка              | Призначення            |
| --------------------- | ---------------------- |
| `/`                   | Головна сторінка       |
| `/dashboard/:ticker`  | Повна аналітика активу |
| `/compare`            | Порівняння активів     |
| `/top`                | Топ активів            |
| `/news`               | Фінансові новини       |
| `/analytics`          | Загальна аналітика     |
| `/asset/:ticker/info` | Інформація про актив   |
| `/history`            | Історія аналізу        |
| `/settings`           | Налаштування           |
| `/404`                | Сторінка помилки       |

---

## Повна структура проєкту

```text
investence/
│
├── .github/
│   └── workflows/
│       └── deploy.yml                    # GitHub Actions деплой
│
├── backend/                              # Backend частина застосунку
│   ├── app/
│   │   ├── __pycache__/
│   │   │
│   │   ├── api/                          # FastAPI API маршрути
│   │   │   ├── __init__.py
│   │   │   ├── analytics.py              # Аналітичні API endpoints
│   │   │   ├── assets.py                 # API активів
│   │   │   ├── export.py                 # Експорт аналітики
│   │   │   └── top.py                    # Топ активів та рейтинг
│   │   │
│   │   ├── collectors/                   # Збір даних із зовнішніх джерел
│   │   │   ├── __init__.py
│   │   │   ├── asset_search.py           # Пошук активів
│   │   │   ├── github_collector.py       # GitHub-аналітика
│   │   │   ├── news_collector.py         # Отримання новин
│   │   │   └── price_collector.py        # Ринкові ціни активів
│   │   │
│   │   ├── models/                       # SQLAlchemy моделі
│   │   │   ├── __init__.py
│   │   │   ├── database.py               # Підключення до PostgreSQL
│   │   │   ├── init_db.py                # Ініціалізація БД
│   │   │   └── models.py                 # ORM-моделі таблиць
│   │   │
│   │   ├── processing/                   # AI та аналітична обробка
│   │   │   ├── __init__.py
│   │   │   ├── analytics_engine.py       # Основний аналітичний модуль
│   │   │   ├── cache_manager.py          # Кешування результатів
│   │   │   ├── correlation_engine.py     # Аналіз кореляцій
│   │   │   ├── export_module.py          # Експорт звітів
│   │   │   ├── sentiment_analyzer.py     # Аналіз інвестиційного настрою
│   │   │   └── summary_generator.py      # Генерація AI-зведень
│   │   │
│   │   ├── __init__.py
│   │   ├── config.py                     # Конфігурація backend
│   │   └── main.py                       # Точка входу FastAPI
│   │
│   ├── venv/                             # Python virtual environment
│   ├── __init__.py
│   ├── .env                              # Backend env-файл
│   ├── Dockerfile                        # Docker backend
│   ├── railway.json                      # Railway deployment config
│   └── requirements.txt                  # Python залежності
│
│
├── frontend/                             # Frontend React застосунок
│   ├── public/
│   │   └── favicon.svg                   # Іконка застосунку
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── card.tsx              # UI Card компонент
│   │   │   │   ├── toast.tsx             # Toast повідомлення
│   │   │   │   ├── toaster.tsx           # Toast manager
│   │   │   │   └── tooltip.tsx           # Tooltip компонент
│   │   │   │
│   │   │   └── Layout.tsx                # Основний layout
│   │   │
│   │   ├── context/
│   │   │   └── SettingsContext.tsx       # Глобальні налаштування
│   │   │
│   │   ├── hooks/
│   │   │   └── use-toast.ts              # Hook toast повідомлень
│   │   │
│   │   ├── lib/
│   │   │   ├── api.ts                    # API клієнт frontend
│   │   │   └── utils.ts                  # Допоміжні функції
│   │   │
│   │   ├── pages/
│   │   │   ├── analytics.tsx             # Сторінка аналітики
│   │   │   ├── asset-info.tsx            # Інформація про актив
│   │   │   ├── compare.tsx               # Порівняння активів
│   │   │   ├── dashboard.tsx             # Dashboard
│   │   │   ├── error-404.tsx             # Сторінка 404
│   │   │   ├── history.tsx               # Історія аналітики
│   │   │   ├── home.tsx                  # Головна сторінка
│   │   │   ├── news.tsx                  # Новини
│   │   │   ├── settings.tsx              # Налаштування
│   │   │   └── top.tsx                   # Топ активів
│   │   │
│   │   ├── App.tsx                       # Головний React компонент
│   │   ├── index.css                     # Глобальні стилі
│   │   └── main.tsx                      # Точка входу frontend
│   │
│   ├── Dockerfile                        # Docker frontend
│   ├── index.html                        # HTML шаблон Vite
│   ├── nginx.conf                        # Nginx конфігурація
│   ├── package.json                      # npm залежності
│   ├── railway.json                      # Railway frontend config
│   ├── tsconfig.json                     # TypeScript конфігурація
│   └── vite.config.ts                    # Конфігурація Vite
│
├── .env                                  # Глобальний env-файл
├── .env.example                          # Приклад env-конфігурації
├── .gitignore                            # Git ignore правила
├── docker-compose.yml                    # Docker Compose конфігурація
└── README.md                             # Документація проєкту
```

### Опис основних директорій

| Директорія                | Опис                                |
| ------------------------- | ----------------------------------- |
| `backend/app/api`         | REST API маршрути FastAPI           |
| `backend/app/collectors`  | Отримання даних із зовнішніх джерел |
| `backend/app/processing`  | AI-аналітика та обробка даних       |
| `backend/app/models`      | SQLAlchemy моделі та робота з БД    |
| `frontend/src/components` | UI-компоненти React                 |
| `frontend/src/pages`      | Сторінки frontend застосунку        |
| `frontend/src/api`        | HTTP-клієнт та API запити           |
| `.github/workflows`       | CI/CD пайплайни GitHub Actions      |

---

## Вимоги

Перед запуском переконайтеся, що встановлено:

- Python 3.13+
- Node.js 20+
- PostgreSQL 16+
- npm
- Docker (опційно)

---

## Налаштування середовища

1. Клонувати репозиторій:

```bash
git clone https://github.com/anastasiia-marinenko/investence.git
cd investence
```

2. Створити файл `.env` на основі `.env.example`:

```bash
cp .env.example .env
```

3. Заповнити необхідні змінні середовища:

```env
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=
POSTGRES_DB=investence

# Database URL
DATABASE_URL=postgresql://postgres:password@postgres:5432/investence

# API Keys
NEWS_API_KEY=
GROQ_API_KEY=
GITHUB_TOKEN=
ALPHA_VANTAGE_API_KEY=
GNEWS_API_KEY=
GEMINI_API_KEY=

# App
DEBUG=True
```

### Опис змінних середовища

| Змінна                  | Призначення                   |
| ----------------------- | ----------------------------- |
| `POSTGRES_USER`         | Користувач PostgreSQL         |
| `POSTGRES_PASSWORD`     | Пароль PostgreSQL             |
| `POSTGRES_DB`           | Назва бази даних              |
| `DATABASE_URL`          | URL підключення до PostgreSQL |
| `NEWS_API_KEY`          | API ключ для новин            |
| `GROQ_API_KEY`          | API ключ Groq                 |
| `GITHUB_TOKEN`          | GitHub API token              |
| `ALPHA_VANTAGE_API_KEY` | API ключ Alpha Vantage        |
| `GNEWS_API_KEY`         | API ключ Gnews                |
| `GEMINI_API_KEY`        | API ключ Gemini               |
| `DEBUG`                 | Режим дебагу                  |

---

# Запуск Backend

1. Перейти до backend:

```bash
cd backend

```

2. Створити та активувати віртуальне середовище:

### Linux / macOS

```bash
python -m venv venv
source venv/bin/activate
```

### Windows

```powershell
python -m venv venv
venv\Scripts\activate
```

3. Встановити залежності:

```bash
pip install -r requirements.txt
```

4. Запустити backend:

```bash
uvicorn app.main:app --reload
```

Backend буде доступний за адресою:

```text
http://localhost:8000
```

Swagger-документація:

```text
http://localhost:8000/docs
```

---

# Запуск Frontend

1. Відкрити новий термінал та перейти до frontend:

```bash
cd frontend
```

2. Встановити залежності:

```bash
npm install
```

3. Запустити frontend:

```bash
npm run dev
```

Frontend буде доступний за адресою:

```text
http://localhost:5173
```

---

# Запуск через Docker

У корені проєкту:

```bash
docker-compose up --build
```

---

## API маршрути

### Root

| Метод | Маршрут   | Опис                    |
| ----- | --------- | ----------------------- |
| `GET` | `/`       | Кореневий endpoint API  |
| `GET` | `/health` | Перевірка стану сервера |

---

### Assets

| Метод    | Маршрут                                  | Опис                             |
| -------- | ---------------------------------------- | -------------------------------- |
| `GET`    | `/api/assets/validate/{ticker}`          | Перевірка коректності тікера     |
| `GET`    | `/api/assets/{ticker}/prices`            | Отримання історичних цін         |
| `GET`    | `/api/assets/{ticker}/news`              | Отримання фінансових новин       |
| `GET`    | `/api/assets/{ticker}/github`            | GitHub-аналітика активу          |
| `POST`   | `/api/assets/{ticker}/analyze-sentiment` | Аналіз тональності новин         |
| `GET`    | `/api/assets/{ticker}/correlation`       | Кореляційний аналіз              |
| `GET`    | `/api/assets/{ticker}/summary`           | AI-згенерований аналітичний звіт |
| `GET`    | `/api/assets/{ticker}/cache-status`      | Статус кешу                      |
| `POST`   | `/api/assets/{ticker}/invalidate-cache`  | Очищення кешу                    |
| `GET`    | `/api/assets/{ticker}/info`              | Детальна інформація про актив    |
| `GET`    | `/api/assets/{ticker}`                   | Повний dashboard активу          |
| `GET`    | `/api/assets`                            | Історія аналізу активів          |
| `DELETE` | `/api/assets`                            | Очищення історії                 |

---

### Analytics

| Метод | Маршрут          | Опис                       |
| ----- | ---------------- | -------------------------- |
| `GET` | `/api/analytics` | Загальна аналітика системи |

---

### Export

| Метод | Маршрут                | Опис                    |
| ----- | ---------------------- | ----------------------- |
| `GET` | `/api/export/{ticker}` | Експорт аналітики у CSV |

---

### Top

| Метод | Маршрут    | Опис                               |
| ----- | ---------- | ---------------------------------- |
| `GET` | `/api/top` | Рейтинг активів за sentiment score |

---

### Основні схеми даних

| Схема                 | Призначення                       |
| --------------------- | --------------------------------- |
| `AssetResponse`       | Відповідь з інформацією про актив |
| `HTTPValidationError` | Помилки валідації HTTP            |
| `ValidationError`     | Детальна інформація про помилки   |

---

## Інфраструктура

Для запуску тестів backend:

- `Docker контейнеризація`
- `Railway deployment`
- `GitHub Actions CI/CD`
- `PostgreSQL database`
- `Nginx frontend serving`

---

## Автор

**Анастасія Маріненко** - студентка 3 курсу, групи КС-23-1 спеціальності 122 Комп’ютерні науки
