"""
Summary Generator -- генерація аналітичного звіту за допомогою AI.
Агрегує дані з трьох джерел та генерує стислий звіт через Groq API.
Звіт формується не довше 15 секунд.
"""
import time
import requests
from sqlalchemy.orm import Session
from app.models.models import Asset, News, Price, GitHubStats, DailyScore
from app.config import settings

DISCLAIMER = "Цей звіт сформований автоматично і не є фінансовою порадою."

SUMMARY_PROMPT = """You are a financial analyst. Write a concise 3-5 sentence investment report based on the data below.

Asset: {name} ({ticker})
Asset type: {asset_type}

PRICE DATA:
- Current price: {current_price}
- Price change (30 days): {price_change_30d}
- Price trend: {price_trend}

NEWS SENTIMENT:
- Average sentiment score: {avg_sentiment} (range: -1.0 to +1.0)
- Sentiment label: {sentiment_label}
- Number of news articles analyzed: {news_count}

{github_section}

CORRELATION:
- Pearson correlation (sentiment vs price): {correlation}
- Interpretation: {correlation_label}

Write a professional 3-5 sentence summary in English that:
1. Describes the current market situation for this asset
2. Mentions key signals from news sentiment
3. Notes any important patterns or risks
4. Is understandable without deep financial knowledge

Respond with the summary text only, no headers or bullet points."""


class SummaryGenerator:
    """
    Генератор аналітичного звіту на основі агрегованих ринкових сигналів.
    Використовує Groq API (Llama 3) для генерації тексту.
    Дотримується часового обмеження 15 секунд.
    """

    GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
    MAX_RETRIES = 3
    TIMEOUT = 12  # секунди -- менше 15 щоб залишити час на обробку

    def _get_price_context(self, asset: Asset, db: Session) -> dict:
        """
        Отримує контекст цінових даних для промпту.
        """
        prices = db.query(Price).filter(
            Price.asset_id == asset.id
        ).order_by(Price.date.desc()).limit(30).all()

        if not prices:
            return {
                "current_price": "N/A",
                "price_change_30d": "N/A",
                "price_trend": "insufficient data",
            }

        current = prices[0].close
        oldest = prices[-1].close if len(prices) > 1 else current

        change_30d = ((current - oldest) / oldest * 100) if oldest else 0
        trend = "upward" if change_30d > 2 else "downward" if change_30d < -2 else "sideways"

        currency = asset.currency or "USD"
        symbol = "$" if currency == "USD" else currency

        return {
            "current_price": f"{symbol}{current:.2f}",
            "price_change_30d": f"{change_30d:+.2f}%",
            "price_trend": trend,
        }

    def _get_sentiment_context(self, asset: Asset, db: Session) -> dict:
        """
        Отримує контекст sentiment даних для промпту.
        """
        analyzed_news = db.query(News).filter(
            News.asset_id == asset.id,
            News.is_analyzed == True,
            News.sentiment_score.isnot(None)
        ).all()

        if not analyzed_news:
            return {
                "avg_sentiment": "N/A",
                "sentiment_label": "unknown",
                "news_count": 0,
            }

        scores = [n.sentiment_score for n in analyzed_news]
        avg = sum(scores) / len(scores)

        if avg > 0.2:
            label = "positive"
        elif avg < -0.2:
            label = "negative"
        else:
            label = "neutral"

        return {
            "avg_sentiment": f"{avg:.4f}",
            "sentiment_label": label,
            "news_count": len(analyzed_news),
        }

    def _get_github_context(self, asset: Asset, db: Session) -> str:
        """
        Формує GitHub секцію промпту для криптовалютних активів.
        Для акцій повертає порожній рядок.
        """
        if asset.asset_type != "crypto":
            return ""

        stats = db.query(GitHubStats).filter(
            GitHubStats.asset_id == asset.id
        ).order_by(GitHubStats.recorded_at.desc()).limit(5).all()

        if not stats:
            return "GITHUB ACTIVITY:\n- No data available"

        total_stars = sum(s.stars or 0 for s in stats)
        total_commits = sum(s.commits_last_month or 0 for s in stats)
        top_repo = max(stats, key=lambda s: s.stars or 0)

        activity_levels = [s.activity_level for s in stats if s.activity_level]
        overall_activity = "high" if "high" in activity_levels else \
                          "medium" if "medium" in activity_levels else "low"

        return (
            f"GITHUB ACTIVITY (crypto ecosystem):\n"
            f"- Top repository: {top_repo.repo_name} "
            f"({top_repo.stars:,} stars)\n"
            f"- Total commits last month: {total_commits}\n"
            f"- Overall developer activity: {overall_activity}"
        )

    def _get_correlation_context(self, asset: Asset, db: Session) -> dict:
        """
        Отримує контекст кореляційних даних для промпту.
        """
        latest_score = db.query(DailyScore).filter(
            DailyScore.asset_id == asset.id,
            DailyScore.combined_score.isnot(None)
        ).order_by(DailyScore.date.desc()).first()

        if not latest_score:
            return {
                "correlation": "N/A",
                "correlation_label": "insufficient data",
            }

        # Обчислюємо просту кореляцію з daily_scores
        scores = db.query(DailyScore).filter(
            DailyScore.asset_id == asset.id,
            DailyScore.news_sentiment_score.isnot(None),
            DailyScore.price_change_pct.isnot(None)
        ).order_by(DailyScore.date.desc()).limit(14).all()

        if len(scores) < 3:
            return {
                "correlation": "N/A",
                "correlation_label": "insufficient data",
            }

        import numpy as np
        sentiments = [s.news_sentiment_score for s in scores]
        prices = [s.price_change_pct for s in scores]

        try:
            coeff = np.corrcoef(sentiments, prices)[0, 1]
            if np.isnan(coeff):
                return {"correlation": "N/A", "correlation_label": "insufficient data"}

            coeff = round(float(coeff), 4)

            if coeff >= 0.70:
                label = "strong positive correlation"
            elif coeff >= 0.30:
                label = "moderate correlation"
            elif coeff >= -0.30:
                label = "weak correlation"
            else:
                label = "negative correlation"

            return {
                "correlation": str(coeff),
                "correlation_label": label,
            }
        except Exception:
            return {"correlation": "N/A", "correlation_label": "insufficient data"}

    def _call_groq(self, prompt: str) -> str | None:
        """
        Викликає Groq API для генерації тексту.
        Дотримується обмеження 15 секунд.
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
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3,
            "max_tokens": 300,
        }

        start_time = time.time()

        for attempt in range(self.MAX_RETRIES):
            # Перевіряємо чи не перевищили ліміт часу
            elapsed = time.time() - start_time
            if elapsed > self.TIMEOUT:
                return None

            try:
                remaining_time = self.TIMEOUT - elapsed
                response = requests.post(
                    self.GROQ_URL,
                    headers=headers,
                    json=payload,
                    timeout=min(remaining_time, 10)
                )

                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"].strip()

                elif response.status_code == 429:
                    time.sleep(2 * (attempt + 1))
                    continue

                elif response.status_code in (500, 502, 503):
                    time.sleep(1)
                    continue

                else:
                    break

            except requests.exceptions.Timeout:
                break

            except Exception:
                break

        return None

    def generate(self, asset: Asset, db: Session) -> dict:
        """
        Генерує аналітичний звіт для активу.
        Агрегує дані з трьох джерел та передає до Groq LLM.
        Завжди додає дисклеймер.
        """
        # Перевіряємо чи є збережений свіжий звіт
        latest_score = db.query(DailyScore).filter(
            DailyScore.asset_id == asset.id,
            DailyScore.summary.isnot(None)
        ).order_by(DailyScore.date.desc()).first()

        from datetime import datetime, timedelta
        if latest_score and latest_score.summary_generated_at:
            age = datetime.utcnow() - latest_score.summary_generated_at
            if age < timedelta(hours=24):
                return {
                    "summary": latest_score.summary,
                    "disclaimer": DISCLAIMER,
                    "source": "cache",
                    "llm_available": True,
                }

        # Збираємо контекст з усіх джерел
        price_ctx = self._get_price_context(asset, db)
        sentiment_ctx = self._get_sentiment_context(asset, db)
        github_ctx = self._get_github_context(asset, db)
        correlation_ctx = self._get_correlation_context(asset, db)

        # Формуємо промпт
        prompt = SUMMARY_PROMPT.format(
            name=asset.name,
            ticker=asset.ticker,
            asset_type="cryptocurrency" if asset.asset_type == "crypto" else "stock",
            current_price=price_ctx["current_price"],
            price_change_30d=price_ctx["price_change_30d"],
            price_trend=price_ctx["price_trend"],
            avg_sentiment=sentiment_ctx["avg_sentiment"],
            sentiment_label=sentiment_ctx["sentiment_label"],
            news_count=sentiment_ctx["news_count"],
            github_section=github_ctx,
            correlation=correlation_ctx["correlation"],
            correlation_label=correlation_ctx["correlation_label"],
        )

        # Генеруємо звіт
        summary_text = self._call_groq(prompt)

        if not summary_text:
            return {
                "summary": None,
                "disclaimer": DISCLAIMER,
                "source": "live",
                "llm_available": False,
                "message": "Аналітичний звіт тимчасово недоступний.",
            }

        # Зберігаємо звіт у daily_scores
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        score = db.query(DailyScore).filter(
            DailyScore.asset_id == asset.id,
            DailyScore.date == today
        ).first()

        if score:
            score.summary = summary_text
            score.summary_generated_at = datetime.utcnow()
        else:
            score = DailyScore(
                asset_id=asset.id,
                date=today,
                summary=summary_text,
                summary_generated_at=datetime.utcnow(),
            )
            db.add(score)

        db.commit()

        return {
            "summary": summary_text,
            "disclaimer": DISCLAIMER,
            "source": "live",
            "llm_available": True,
        }