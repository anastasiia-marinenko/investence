"""
Export Module -- формування CSV-файлу з даними активу.
Файл містить: дата, ціна закриття, оцінка тональності,
кількість новин, зірки GitHub, кількість комітів.
"""
import csv
import io
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.models import Asset, Price, News, GitHubStats


class ExportModule:
    """
    Модуль експорту даних активу у форматі CSV.
    Формує файл з даними за останні 30 днів.
    """

    COLUMNS = [
        "date",
        "close_price",
        "sentiment_score",
        "news_count",
        "github_stars",
        "github_commits",
    ]

    def _get_price_data(self, asset: Asset, db: Session, days: int = 30) -> dict:
        """
        Отримує цінові дані та групує по датах.
        Повертає словник: {дата_str: {close, change_pct}}.
        """
        cutoff = datetime.utcnow() - timedelta(days=days)

        prices = db.query(Price).filter(
            Price.asset_id == asset.id,
            Price.date >= cutoff
        ).order_by(Price.date.asc()).all()

        result = {}
        for price in prices:
            date_str = price.date.strftime("%Y-%m-%d")
            result[date_str] = {
                "close": round(price.close, 4) if price.close else None,
            }

        return result

    def _get_sentiment_data(self, asset: Asset, db: Session, days: int = 30) -> dict:
        """
        Агрегує sentiment scores по датах.
        Повертає словник: {дата_str: {avg_score, news_count}}.
        """
        cutoff = datetime.utcnow() - timedelta(days=days)

        news_list = db.query(News).filter(
            News.asset_id == asset.id,
            News.published_at >= cutoff,
            News.is_analyzed == True,
            News.sentiment_score.isnot(None)
        ).all()

        daily = {}
        for news in news_list:
            if not news.published_at:
                continue
            date_str = news.published_at.strftime("%Y-%m-%d")
            if date_str not in daily:
                daily[date_str] = {"scores": [], "count": 0}
            daily[date_str]["scores"].append(news.sentiment_score)
            daily[date_str]["count"] += 1

        result = {}
        for date_str, data in daily.items():
            avg = sum(data["scores"]) / len(data["scores"])
            result[date_str] = {
                "avg_sentiment": round(avg, 4),
                "news_count": data["count"],
            }

        return result

    def _get_github_data(self, asset: Asset, db: Session) -> dict:
        """
        Отримує GitHub дані.
        Для акцій повертає порожній словник.
        Повертає словник: {repo_name: {stars, commits}}.
        """
        if asset.asset_type != "crypto":
            return {}

        stats = db.query(GitHubStats).filter(
            GitHubStats.asset_id == asset.id
        ).order_by(GitHubStats.recorded_at.desc()).all()

        if not stats:
            return {}

        # Агрегуємо по всіх репозиторіях
        total_stars = sum(s.stars or 0 for s in stats)
        total_commits = sum(s.commits_last_month or 0 for s in stats)

        return {
            "total_stars": total_stars,
            "total_commits": total_commits,
        }

    def build_rows(
        self,
        asset: Asset,
        db: Session,
        days: int = 30
    ) -> list[dict]:
        """
        Формує рядки CSV шляхом об'єднання даних з трьох джерел по датах.
        """
        price_data = self._get_price_data(asset, db, days)
        sentiment_data = self._get_sentiment_data(asset, db, days)
        github_data = self._get_github_data(asset, db)

        # Збираємо всі унікальні дати
        all_dates = sorted(set(
            list(price_data.keys()) + list(sentiment_data.keys())
        ))

        rows = []
        for date_str in all_dates:
            price = price_data.get(date_str, {})
            sentiment = sentiment_data.get(date_str, {})

            rows.append({
                "date": date_str,
                "close_price": price.get("close", ""),
                "sentiment_score": sentiment.get("avg_sentiment", ""),
                "news_count": sentiment.get("news_count", 0),
                "github_stars": github_data.get("total_stars", ""),
                "github_commits": github_data.get("total_commits", ""),
            })

        return rows

    def generate_csv(self, asset: Asset, db: Session, days: int = 30) -> str:
        """
        Генерує CSV-файл як рядок.
        Повертає вміст файлу у форматі UTF-8 з BOM
        для коректного відображення у Excel.
        """
        rows = self.build_rows(asset, db, days)

        output = io.StringIO()

        # Додаємо BOM для коректного відображення кирилиці у Excel
        output.write("\ufeff")

        writer = csv.DictWriter(
            output,
            fieldnames=self.COLUMNS,
            lineterminator="\n"
        )
        writer.writeheader()
        writer.writerows(rows)

        return output.getvalue()

    def get_filename(self, ticker: str) -> str:
        """
        Формує назву файлу у форматі {ТІКЕР}_{РРРР-ММ-ДД}.csv
        """
        today = datetime.utcnow().strftime("%Y-%m-%d")
        return f"{ticker.upper()}_{today}.csv"