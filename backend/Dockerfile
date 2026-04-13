# Базовий образ Python 3.13
FROM python:3.13-slim

# Встановити системні залежності
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Встановити робочу директорію
WORKDIR /app

# Скопіювати та встановити залежності
# Окремим кроком щоб використовувати кеш Docker
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Скопіювати вихідний код
COPY . .

# Відкрити порт
EXPOSE 8000

# Запустити застосунок
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]