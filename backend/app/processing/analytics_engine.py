"""
Analytics Engine -- рушій загальної аналітики по всіх проаналізованих активах.
Агрегує дані з бази даних для відображення на сторінці /analytics.
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import Asset, News, Price, GitHubStats, DailyScore


class AnalyticsEngine:
    """
    Рушій загальної аналітики.
    Розраховує зведену статистику по всіх проаналізованих активах.
    """

    def _get_summary_stats(self, db: Session) -> dict:
        """
        Розраховує зведену статистику: кількість активів,
        новин, середній sentiment, цінову зміну, активність GitHub.
        """
        # Загальна кількість активів
        total_assets = db.query(Asset).count()

        # Загальна кількість новин
        total_news = db.query(News).count()

        # Середня оцінка тональності по всіх проаналізованих новинах
        avg_sentiment_result = db.query(
            func.avg(News.sentiment_score)
        ).filter(
            News.is_analyzed == True,
            News.sentiment_score.isnot(None)
        ).scalar()

        avg_sentiment = round(float(avg_sentiment_result), 4) \
            if avg_sentiment_result is not None else None

        # Загальний настрій ринку
        if avg_sentiment is None:
            market_sentiment = "unknown"
        elif avg_sentiment > 0.2:
            market_sentiment = "Позитивний"
        elif avg_sentiment < -0.2:
            market_sentiment = "Негативний"
        else:
            market_sentiment = "Нейтральний"

        # Середня цінова зміна за день по всіх активах
        today = datetime.utcnow().date()
        yesterday = today - timedelta(days=1)

        avg_price_change_result = db.query(
            func.avg(Price.change_pct)
        ).filter(
            Price.date >= datetime.combine(yesterday, datetime.min.time()),
            Price.change_pct.isnot(None)
        ).scalar()

        avg_price_change = round(float(avg_price_change_result), 4) \
            if avg_price_change_result is not None else None

        # Сумарна кількість комітів по всіх крипто-активах
        total_commits_result = db.query(
            func.sum(GitHubStats.commits_last_month)
        ).scalar()

        total_commits = int(total_commits_result) \
            if total_commits_result is not None else 0

        # Кількість проаналізованих крипто-активів
        crypto_assets = db.query(Asset).filter(
            Asset.asset_type == "crypto"
        ).count()

        return {
            "total_assets": total_assets,
            "total_news": total_news,
            "avg_sentiment": avg_sentiment,
            "market_sentiment": market_sentiment,
            "avg_price_change": avg_price_change,
            "total_commits": total_commits,
            "crypto_assets": crypto_assets,
        }

    def _get_sentiment_distribution(self, db: Session) -> dict:
        """
        Розраховує розподіл новин за тональністю у відсотках.
        """
        total = db.query(News).filter(
            News.is_analyzed == True,
            News.sentiment_label.isnot(None)
        ).count()

        if total == 0:
            return {
                "positive": 0,
                "negative": 0,
                "neutral": 0,
                "total": 0,
            }

        positive = db.query(News).filter(
            News.sentiment_label == "positive"
        ).count()

        negative = db.query(News).filter(
            News.sentiment_label == "negative"
        ).count()

        neutral = db.query(News).filter(
            News.sentiment_label == "neutral"
        ).count()

        return {
            "positive": round(positive / total * 100, 1),
            "negative": round(negative / total * 100, 1),
            "neutral": round(neutral / total * 100, 1),
            "positive_count": positive,
            "negative_count": negative,
            "neutral_count": neutral,
            "total": total,
        }

    def _get_news_activity_by_day(self, db: Session, days: int = 7) -> list[dict]:
        """
        Підраховує кількість новин по днях за останні N днів.
        Використовується для стовпчастої діаграми активності.
        """
        cutoff = datetime.utcnow() - timedelta(days=days)

        news_list = db.query(News).filter(
            News.published_at >= cutoff,
            News.published_at.isnot(None)
        ).all()

        # Агрегуємо по днях
        daily_counts = {}
        for news in news_list:
            date_str = news.published_at.strftime("%Y-%m-%d")
            daily_counts[date_str] = daily_counts.get(date_str, 0) + 1

        # Заповнюємо пропущені дні нулями
        result = []
        for i in range(days - 1, -1, -1):
            date = (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
            result.append({
                "date": date,
                "count": daily_counts.get(date, 0),
            })

        return result

    def _get_price_change_by_day(self, db: Session, days: int = 7) -> list[dict]:
        """
        Розраховує середню цінову зміну по всіх активах по днях.
        Використовується для лінійного графіку цінової динаміки.
        """
        cutoff = datetime.utcnow() - timedelta(days=days)

        prices = db.query(Price).filter(
            Price.date >= cutoff,
            Price.change_pct.isnot(None)
        ).all()

        # Агрегуємо середню зміну по днях
        daily_data = {}
        for price in prices:
            date_str = price.date.strftime("%Y-%m-%d")
            if date_str not in daily_data:
                daily_data[date_str] = []
            daily_data[date_str].append(price.change_pct)

        result = []
        for i in range(days - 1, -1, -1):
            date = (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
            values = daily_data.get(date, [])
            avg = round(sum(values) / len(values), 4) if values else None
            result.append({
                "date": date,
                "avg_change_pct": avg,
            })

        return result

    def _get_github_activity_by_day(self, db: Session, days: int = 7) -> list[dict]:
        """
        Повертає активність комітів по криптовалютних активах по днях.
        Використовує recorded_at як дату запису.
        """
        cutoff = datetime.utcnow() - timedelta(days=days)

        stats = db.query(GitHubStats).filter(
            GitHubStats.recorded_at >= cutoff
        ).all()

        daily_commits = {}
        for stat in stats:
            date_str = stat.recorded_at.strftime("%Y-%m-%d")
            daily_commits[date_str] = daily_commits.get(date_str, 0) + \
                (stat.commits_last_month or 0)

        result = []
        for i in range(days - 1, -1, -1):
            date = (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
            result.append({
                "date": date,
                "commits": daily_commits.get(date, 0),
            })

        return result

    def _get_top5_by_sentiment(self, db: Session) -> list[dict]:
        """
        Повертає топ-5 активів за середньою оцінкою тональності.
        """
        assets = db.query(Asset).all()
        scores = []

        for asset in assets:
            result = db.query(
                func.avg(News.sentiment_score)
            ).filter(
                News.asset_id == asset.id,
                News.is_analyzed == True,
                News.sentiment_score.isnot(None)
            ).scalar()

            if result is not None:
                avg = round(float(result), 4)
                scores.append({
                    "ticker": asset.ticker,
                    "name": asset.name,
                    "sentiment_score": avg,
                })

        scores.sort(key=lambda x: x["sentiment_score"], reverse=True)
        return scores[:5]

    def _get_top5_by_price_change(self, db: Session) -> list[dict]:
        """
        Повертає топ-5 активів за ціновою зміною за 30 днів.
        """
        assets = db.query(Asset).all()
        changes = []

        for asset in assets:
            prices = db.query(Price).filter(
                Price.asset_id == asset.id
            ).order_by(Price.date.desc()).limit(30).all()

            if len(prices) < 2:
                continue

            current = prices[0].close
            oldest = prices[-1].close

            if oldest and oldest != 0:
                change_30d = round((current - oldest) / oldest * 100, 4)
                changes.append({
                    "ticker": asset.ticker,
                    "name": asset.name,
                    "current_price": current,
                    "change_day_pct": prices[0].change_pct,
                    "change_30d_pct": change_30d,
                })

        changes.sort(key=lambda x: x["change_30d_pct"], reverse=True)
        return changes[:5]

    def _get_top5_by_github(self, db: Session) -> list[dict]:
        """
        Повертає топ-5 криптовалютних активів за активністю розробників.
        """
        assets = db.query(Asset).filter(
            Asset.asset_type == "crypto"
        ).all()

        github_data = []

        for asset in assets:
            stats = db.query(GitHubStats).filter(
                GitHubStats.asset_id == asset.id
            ).all()

            if not stats:
                continue

            total_stars = sum(s.stars or 0 for s in stats)
            total_commits = sum(s.commits_last_month or 0 for s in stats)

            activity_levels = [s.activity_level for s in stats if s.activity_level]
            overall = "high" if "high" in activity_levels else \
                     "medium" if "medium" in activity_levels else "low"

            github_data.append({
                "ticker": asset.ticker,
                "name": asset.name,
                "total_stars": total_stars,
                "commits_last_month": total_commits,
                "activity_level": overall,
            })

        github_data.sort(key=lambda x: x["commits_last_month"], reverse=True)
        return github_data[:5]

    def get_full_analytics(self, db: Session) -> dict:
        """
        Повертає повну аналітику для сторінки /analytics.
        Агрегує всі метрики в один словник.
        """
        summary = self._get_summary_stats(db)
        sentiment_distribution = self._get_sentiment_distribution(db)
        news_activity = self._get_news_activity_by_day(db)
        price_activity = self._get_price_change_by_day(db)
        github_activity = self._get_github_activity_by_day(db)
        top5_sentiment = self._get_top5_by_sentiment(db)
        top5_price = self._get_top5_by_price_change(db)
        top5_github = self._get_top5_by_github(db)

        return {
            "summary": summary,
            "sentiment_distribution": sentiment_distribution,
            "charts": {
                "news_activity": news_activity,
                "price_activity": price_activity,
                "github_activity": github_activity,
            },
            "top5": {
                "by_sentiment": top5_sentiment,
                "by_price_change": top5_price,
                "by_github": top5_github,
            },
        }