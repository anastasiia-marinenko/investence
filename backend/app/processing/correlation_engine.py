"""
Correlation Engine -- кореляційний аналіз між тональністю новин та ціновою динамікою.
Використовує pandas та NumPy для обчислення коефіцієнта кореляції Пірсона.
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.models import News, Price, DailyScore, Asset


def correlation_label(coefficient: float | None) -> str:
    """
    Повертає словесну інтерпретацію коефіцієнта кореляції Пірсона.
    """
    if coefficient is None:
        return "Недостатньо даних"
    if coefficient >= 0.70:
        return "Сильна позитивна кореляція"
    if coefficient >= 0.30:
        return "Помірна кореляція"
    if coefficient >= -0.30:
        return "Слабка кореляція"
    return "Негативна кореляція"


class CorrelationEngine:
    """
    Рушій кореляційного аналізу між тональністю новин та ціновою динамікою.
    Агрегує денні sentiment scores та зіставляє їх із денними змінами ціни.
    """

    def _aggregate_daily_sentiment(
        self,
        news_list: list,
        days: int = 14
    ) -> pd.DataFrame:
        """
        Агрегує sentiment scores по днях.
        Повертає DataFrame з колонками: date, avg_sentiment, news_count.
        """
        if not news_list:
            return pd.DataFrame(columns=["date", "avg_sentiment", "news_count"])

        records = []
        for news in news_list:
            if news.sentiment_score is None or news.published_at is None:
                continue
            records.append({
                "date": news.published_at.date(),
                "sentiment_score": news.sentiment_score,
            })

        if not records:
            return pd.DataFrame(columns=["date", "avg_sentiment", "news_count"])

        df = pd.DataFrame(records)
        daily = df.groupby("date").agg(
            avg_sentiment=("sentiment_score", "mean"),
            news_count=("sentiment_score", "count")
        ).reset_index()

        # Фільтруємо за останні N днів
        cutoff = datetime.utcnow().date() - timedelta(days=days)
        daily = daily[daily["date"] >= cutoff]

        return daily.sort_values("date")

    def _aggregate_daily_prices(
        self,
        prices: list,
        days: int = 14
    ) -> pd.DataFrame:
        """
        Агрегує цінові дані по днях.
        Повертає DataFrame з колонками: date, close, change_pct.
        """
        if not prices:
            return pd.DataFrame(columns=["date", "close", "change_pct"])

        records = []
        for price in prices:
            records.append({
                "date": price.date.date() if hasattr(price.date, "date") else price.date,
                "close": price.close,
                "change_pct": price.change_pct or 0.0,
            })

        if not records:
            return pd.DataFrame(columns=["date", "close", "change_pct"])

        df = pd.DataFrame(records)
        df = df.sort_values("date")

        # Фільтруємо за останні N днів
        cutoff = datetime.utcnow().date() - timedelta(days=days)
        df = df[df["date"] >= cutoff]

        return df

    def _calculate_pearson(
        self,
        sentiment_values: list[float],
        price_changes: list[float]
    ) -> float | None:
        """
        Обчислює коефіцієнт кореляції Пірсона між двома рядами.
        Повертає None якщо даних недостатньо.
        """
        if len(sentiment_values) < 3 or len(price_changes) < 3:
            return None

        try:
            x = np.array(sentiment_values, dtype=float)
            y = np.array(price_changes, dtype=float)

            # Перевіряємо чи є варіація у даних
            if np.std(x) == 0 or np.std(y) == 0:
                return None

            coefficient = np.corrcoef(x, y)[0, 1]

            # Перевіряємо чи результат валідний
            if np.isnan(coefficient):
                return None

            return round(float(coefficient), 4)

        except Exception:
            return None

    def calculate(
        self,
        asset: Asset,
        db: Session,
        days: int = 14
    ) -> dict:
        """
        Обчислює кореляцію між тональністю новин та ціновою динамікою.
        Повертає словник з коефіцієнтом, інтерпретацією та даними для графіку.
        """
        # Отримуємо проаналізовані новини
        news_list = db.query(News).filter(
            News.asset_id == asset.id,
            News.is_analyzed == True,
            News.sentiment_score.isnot(None)
        ).all()

        # Отримуємо цінові дані
        cutoff = datetime.utcnow() - timedelta(days=days + 5)
        prices = db.query(Price).filter(
            Price.asset_id == asset.id,
            Price.date >= cutoff
        ).order_by(Price.date).all()

        # Агрегуємо по днях
        sentiment_df = self._aggregate_daily_sentiment(news_list, days)
        price_df = self._aggregate_daily_prices(prices, days)

        if sentiment_df.empty or price_df.empty:
            return {
                "coefficient": None,
                "label": "Недостатньо даних",
                "chart_data": [],
                "days_analyzed": 0,
            }

        # Зіставляємо дані по даті
        merged = pd.merge(
            sentiment_df,
            price_df,
            on="date",
            how="inner"
        )

        if len(merged) < 3:
            return {
                "coefficient": None,
                "label": "Недостатньо даних для кореляційного аналізу",
                "chart_data": [],
                "days_analyzed": len(merged),
            }

        # Обчислюємо коефіцієнт Пірсона
        coefficient = self._calculate_pearson(
            merged["avg_sentiment"].tolist(),
            merged["change_pct"].tolist()
        )

        # Формуємо дані для графіку
        chart_data = []
        for _, row in merged.iterrows():
            chart_data.append({
                "date": str(row["date"]),
                "sentiment": round(float(row["avg_sentiment"]), 4),
                "price_change": round(float(row["change_pct"]), 4),
                "news_count": int(row["news_count"]),
            })

        return {
            "coefficient": coefficient,
            "label": correlation_label(coefficient),
            "chart_data": chart_data,
            "days_analyzed": len(merged),
        }

    def save_daily_scores(
        self,
        asset: Asset,
        db: Session,
        days: int = 14
    ) -> list[DailyScore]:
        """
        Зберігає агреговані денні оцінки у таблицю daily_scores.
        """
        news_list = db.query(News).filter(
            News.asset_id == asset.id,
            News.is_analyzed == True,
            News.sentiment_score.isnot(None)
        ).all()

        cutoff = datetime.utcnow() - timedelta(days=days + 5)
        prices = db.query(Price).filter(
            Price.asset_id == asset.id,
            Price.date >= cutoff
        ).order_by(Price.date).all()

        sentiment_df = self._aggregate_daily_sentiment(news_list, days)
        price_df = self._aggregate_daily_prices(prices, days)

        if sentiment_df.empty:
            return []

        merged = pd.merge(sentiment_df, price_df, on="date", how="left")
        saved = []

        for _, row in merged.iterrows():
            date = datetime.combine(row["date"], datetime.min.time())

            existing = db.query(DailyScore).filter(
                DailyScore.asset_id == asset.id,
                DailyScore.date == date
            ).first()

            sentiment = float(row["avg_sentiment"])
            price_change = float(row["change_pct"]) if pd.notna(row.get("change_pct")) else None

            # Обчислюємо combined score
            if price_change is not None:
                combined = round((sentiment + price_change / 100) / 2, 4)
            else:
                combined = round(sentiment, 4)

            if existing:
                existing.news_sentiment_score = round(sentiment, 4)
                existing.news_count = int(row["news_count"])
                existing.price_change_pct = price_change
                existing.combined_score = combined
                saved.append(existing)
            else:
                score = DailyScore(
                    asset_id=asset.id,
                    date=date,
                    news_sentiment_score=round(sentiment, 4),
                    news_count=int(row["news_count"]),
                    price_change_pct=price_change,
                    combined_score=combined,
                )
                db.add(score)
                saved.append(score)

        db.commit()
        return saved