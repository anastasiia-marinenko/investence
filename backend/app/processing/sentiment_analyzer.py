"""
Sentiment Analyzer -- аналіз тональності новин за допомогою LLM.
Основний постачальник: Groq API (Llama 3).
Резервний постачальник: Google Gemini API.
Реалізує логіку повторних спроб.
"""
import time
import json
import re
import requests
from sqlalchemy.orm import Session
from app.models.models import News
from app.config import settings

# Шаблон промпту для класифікації тональності
SENTIMENT_PROMPT = """You are a financial sentiment analyst. Analyze the sentiment of the following news headline and classify it.

News headline: "{text}"

Respond with a JSON object only, no other text:
{{
  "label": "positive" or "negative" or "neutral",
  "score": a float between -1.0 (most negative) and 1.0 (most positive)
}}

Rules:
- "positive": good news for investors, price growth expected, strong results
- "negative": bad news for investors, price decline expected, risks or losses
- "neutral": factual reporting, no clear market impact
- score should match the label: positive > 0.1, negative < -0.1, neutral between -0.1 and 0.1"""


class SentimentAnalyzer:
    """
    Аналізатор тональності фінансових новин за допомогою LLM.
    Використовує Groq API як основний постачальник
    та Google Gemini API як резервний.
    """

    GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
    GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

    MAX_RETRIES = 3
    RETRY_DELAY = 2  # секунди між спробами

    def _parse_llm_response(self, text: str) -> dict | None:
        """
        Парсить відповідь LLM та витягує JSON з результатом.
        Обробляє випадки коли LLM додає зайвий текст навколо JSON.
        """
        try:
            # Спроба 1 -- пряме парсування
            return json.loads(text.strip())
        except json.JSONDecodeError:
            pass

        try:
            # Спроба 2 -- шукаємо JSON у тексті
            match = re.search(r'\{[^{}]*"label"[^{}]*"score"[^{}]*\}', text, re.DOTALL)
            if match:
                return json.loads(match.group())
        except (json.JSONDecodeError, AttributeError):
            pass

        try:
            # Спроба 3 -- шукаємо label та score окремо
            label_match = re.search(r'"label"\s*:\s*"(positive|negative|neutral)"', text)
            score_match = re.search(r'"score"\s*:\s*(-?\d+\.?\d*)', text)
            if label_match and score_match:
                return {
                    "label": label_match.group(1),
                    "score": float(score_match.group(1))
                }
        except (AttributeError, ValueError):
            pass

        return None

    def _validate_result(self, result: dict) -> dict:
        """
        Валідує та нормалізує результат аналізу.
        Гарантує що score знаходиться в діапазоні [-1.0, 1.0].
        """
        label = result.get("label", "neutral").lower()
        if label not in ("positive", "negative", "neutral"):
            label = "neutral"

        score = float(result.get("score", 0.0))
        score = max(-1.0, min(1.0, score))  # обмежуємо діапазон

        # Перевіряємо узгодженість label та score
        if label == "positive" and score < 0:
            score = abs(score)
        elif label == "negative" and score > 0:
            score = -abs(score)

        return {"label": label, "score": round(score, 4)}

    def _analyze_with_groq(self, text: str) -> dict | None:
        """
        Аналізує тональність через Groq API (Llama 3).
        Реалізує повторні спроби з затримкою.
        """
        api_key = getattr(settings, "GROQ_API_KEY", None)
        if not api_key:
            return None

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {
                    "role": "user",
                    "content": SENTIMENT_PROMPT.format(text=text[:500])
                }
            ],
            "temperature": 0.1,  # низька температура для стабільних результатів
            "max_tokens": 100,
        }

        for attempt in range(self.MAX_RETRIES):
            try:
                response = requests.post(
                    self.GROQ_URL,
                    headers=headers,
                    json=payload,
                    timeout=15
                )

                if response.status_code == 200:
                    data = response.json()
                    content = data["choices"][0]["message"]["content"]
                    result = self._parse_llm_response(content)
                    if result:
                        return self._validate_result(result)

                elif response.status_code == 429:
                    # Rate limit -- чекаємо довше перед наступною спробою
                    time.sleep(self.RETRY_DELAY * (attempt + 2))
                    continue

                elif response.status_code in (500, 502, 503):
                    # Серверна помилка -- повторюємо
                    time.sleep(self.RETRY_DELAY * (attempt + 1))
                    continue

                else:
                    # Інша помилка -- не повторюємо
                    break

            except requests.exceptions.Timeout:
                time.sleep(self.RETRY_DELAY)
                continue

            except Exception:
                break

        return None

    def _analyze_with_gemini(self, text: str) -> dict | None:
        """
        Резервний постачальник -- Google Gemini API (безкоштовний тариф).
        Використовується якщо Groq API недоступний.
        """
        api_key = getattr(settings, "GEMINI_API_KEY", None)
        if not api_key:
            return None

        try:
            url = f"{self.GEMINI_URL}?key={api_key}"
            payload = {
                "contents": [
                    {
                        "parts": [
                            {
                                "text": SENTIMENT_PROMPT.format(text=text[:500])
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.1,
                    "maxOutputTokens": 100,
                }
            }

            response = requests.post(url, json=payload, timeout=15)

            if response.status_code != 200:
                return None

            data = response.json()
            content = data["candidates"][0]["content"]["parts"][0]["text"]
            result = self._parse_llm_response(content)

            if result:
                return self._validate_result(result)

        except Exception:
            pass

        return None

    def analyze_text(self, text: str) -> dict | None:
        """
        Аналізує тональність тексту.
        Спочатку Groq API, потім Gemini як резервний.
        Повертає None якщо обидва недоступні.
        """
        if not text or not text.strip():
            return {"label": "neutral", "score": 0.0}

        # Основний постачальник -- Groq
        result = self._analyze_with_groq(text)

        # Резервний постачальник -- Gemini
        if not result:
            result = self._analyze_with_gemini(text)

        return result

    def analyze_news_batch(
        self,
        news_list: list[News],
        db: Session
    ) -> list[News]:
        """
        Аналізує тональність списку новин та зберігає результати у БД.
        Пропускає вже проаналізовані новини (кешування).
        Повертає список оновлених записів.
        """
        updated = []
        failed_count = 0

        for news in news_list:
            # Пропускаємо вже проаналізовані -- кешування результатів
            if news.is_analyzed and news.sentiment_score is not None:
                updated.append(news)
                continue

            # Якщо занадто багато помилок підряд -- зупиняємо
            # щоб не вичерпати ліміт API
            if failed_count >= 3:
                break

            text = news.title or ""
            result = self.analyze_text(text)

            if result:
                news.sentiment_score = result["score"]
                news.sentiment_label = result["label"]
                news.is_analyzed = True
                failed_count = 0
            else:
                failed_count += 1

            updated.append(news)

            # Невелика затримка щоб не перевантажити API
            time.sleep(0.3)

        db.commit()
        return updated