# Investence

AI-платформа для аналізу інвестиційного настрою на основі новин, цінових даних та активності розробників GitHub.

## Технологічний стек

- **Backend:** Python 3.13 + FastAPI
- **Frontend:** React + Vite + Tailwind CSS
- **База даних:** PostgreSQL + SQLAlchemy
- **AI/LLM:** Groq API (Llama 3)
- **Інфраструктура:** Docker + Azure App Service

## Запуск проєкту

### Вимоги

- Python 3.13+
- Node.js 20+
- PostgreSQL 16+
- Docker (опційно)

### Встановлення

1. Клонувати репозиторій
   git clone https://github.com/anastasiia-marinenko/investence.git
   cd investence

2. Налаштувати середовище
   cd backend
   python -m venv venv
   source venv/bin/activate # або venv\Scripts\activate на Windows
   pip install -r requirements.txt

3. Скопіювати .env.example в .env та заповнити ключі
   cp .env.example .env

4. Запустити backend
   uvicorn app.main:app --reload

## Структура проєкту

investence/

├── backend/ # FastAPI застосунок

│ └── app/

│ ├── api/ # Маршрути API

│ ├── collectors/ # Модулі збору даних

│ ├── processing/ # Аналітика та AI

│ └── models/ # SQLAlchemy моделі

├── frontend/ # React застосунок

├── docker/ # Docker конфігурація

└── requirements.txt
