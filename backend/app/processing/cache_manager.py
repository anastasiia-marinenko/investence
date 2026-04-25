"""
Cache Manager -- централізоване управління кешуванням даних.
Перевіряє наявність свіжих даних у БД перед зверненням до зовнішніх API.
Кеш є спільним для всіх користувачів.
Кешовані дані завантажуються не довше 2 секунд.
"""
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.models import Asset, News, Price, GitHubStats, DailyScore

# Налаштування логування для відстеження збігів та промахів кешу
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CACHE_TTL_HOURS = 24


class CacheManager:
    """
    Централізований менеджер кешу.
    Перевіряє актуальність даних у БД та вирішує
    чи потрібно звертатись до зовнішніх API.
    """

    def __init__(self, db: Session):
        self.db = db
        self.ttl = timedelta(hours=CACHE_TTL_HOURS)

    def _is_fresh(self, timestamp: datetime) -> bool:
        """Перевіряє чи є timestamp свіжим (молодшим за TTL)."""
        return datetime.utcnow() - timestamp < self.ttl

    # ── PRICES ────────────────────────────────────────────────────────────────

    def get_cached_prices(self, asset: Asset, days: int = 30) -> list | None:
        """
        Повертає кешовані цінові дані якщо вони свіжі.
        Повертає None якщо кеш відсутній або застарів -- сигнал для збору.
        """
        cutoff = datetime.utcnow() - self.ttl

        prices = self.db.query(Price).filter(
            Price.asset_id == asset.id,
            Price.created_at >= cutoff
        ).order_by(Price.date.asc()).all()

        if not prices:
            logger.info(f"CACHE MISS [prices] {asset.ticker} -- no fresh data")
            return None

        # Достатньо даних -- повертаємо з кешу
        if len(prices) < days - 10:
            logger.info(
                f"CACHE MISS [prices] {asset.ticker} -- "
                f"insufficient data ({len(prices)} records)"
            )
            return None

        logger.info(f"CACHE HIT [prices] {asset.ticker} -- {len(prices)} records")
        return prices

    # ── NEWS ──────────────────────────────────────────────────────────────────

    def get_cached_news(self, asset: Asset) -> list | None:
        """
        Повертає кешовані новини якщо вони свіжі.
        """
        cutoff = datetime.utcnow() - self.ttl

        news = self.db.query(News).filter(
            News.asset_id == asset.id,
            News.created_at >= cutoff
        ).order_by(News.published_at.desc()).limit(20).all()

        if not news:
            logger.info(f"CACHE MISS [news] {asset.ticker} -- no fresh data")
            return None

        logger.info(f"CACHE HIT [news] {asset.ticker} -- {len(news)} articles")
        return news

    # ── GITHUB ────────────────────────────────────────────────────────────────

    def get_cached_github(self, asset: Asset) -> list | None:
        """
        Повертає кешовані GitHub дані якщо вони свіжі.
        Для акцій завжди повертає порожній список.
        """
        if asset.asset_type != "crypto":
            return []

        cutoff = datetime.utcnow() - self.ttl

        stats = self.db.query(GitHubStats).filter(
            GitHubStats.asset_id == asset.id,
            GitHubStats.recorded_at >= cutoff
        ).all()

        if not stats:
            logger.info(f"CACHE MISS [github] {asset.ticker} -- no fresh data")
            return None

        logger.info(f"CACHE HIT [github] {asset.ticker} -- {len(stats)} repos")
        return stats

    # ── SENTIMENT ─────────────────────────────────────────────────────────────

    def get_cached_sentiment(self, asset: Asset) -> list | None:
        """
        Повертає новини з проаналізованою тональністю якщо вони є.
        """
        cutoff = datetime.utcnow() - self.ttl

        analyzed = self.db.query(News).filter(
            News.asset_id == asset.id,
            News.is_analyzed == True,
            News.sentiment_score.isnot(None),
            News.created_at >= cutoff
        ).all()

        if not analyzed:
            logger.info(f"CACHE MISS [sentiment] {asset.ticker} -- no analyzed news")
            return None

        logger.info(
            f"CACHE HIT [sentiment] {asset.ticker} -- "
            f"{len(analyzed)} analyzed articles"
        )
        return analyzed

    # ── SUMMARY ───────────────────────────────────────────────────────────────

    def get_cached_summary(self, asset: Asset) -> str | None:
        """
        Повертає кешований AI-звіт якщо він свіжий.
        """
        score = self.db.query(DailyScore).filter(
            DailyScore.asset_id == asset.id,
            DailyScore.summary.isnot(None),
            DailyScore.summary_generated_at.isnot(None)
        ).order_by(DailyScore.date.desc()).first()

        if not score or not score.summary_generated_at:
            logger.info(f"CACHE MISS [summary] {asset.ticker} -- no summary")
            return None

        if not self._is_fresh(score.summary_generated_at):
            logger.info(f"CACHE MISS [summary] {asset.ticker} -- stale summary")
            return None

        logger.info(f"CACHE HIT [summary] {asset.ticker}")
        return score.summary

    # ── ASSET ─────────────────────────────────────────────────────────────────

    def get_cached_asset(self, ticker: str) -> Asset | None:
        """
        Повертає актив з БД якщо він існує.
        Активи не мають TTL -- вони зберігаються постійно.
        """
        asset = self.db.query(Asset).filter(
            Asset.ticker == ticker.upper().strip()
        ).first()

        if asset:
            logger.info(f"CACHE HIT [asset] {ticker}")
        else:
            logger.info(f"CACHE MISS [asset] {ticker}")

        return asset

    # ── CACHE STATUS ──────────────────────────────────────────────────────────

    def get_cache_status(self, asset: Asset) -> dict:
        """
        Повертає статус кешу для всіх типів даних активу.
        Використовується для відображення часу оновлення на дашборді.
        """
        prices = self.db.query(Price).filter(
            Price.asset_id == asset.id
        ).order_by(Price.created_at.desc()).first()

        news = self.db.query(News).filter(
            News.asset_id == asset.id
        ).order_by(News.created_at.desc()).first()

        github = self.db.query(GitHubStats).filter(
            GitHubStats.asset_id == asset.id
        ).order_by(GitHubStats.recorded_at.desc()).first()

        summary = self.db.query(DailyScore).filter(
            DailyScore.asset_id == asset.id,
            DailyScore.summary.isnot(None)
        ).order_by(DailyScore.date.desc()).first()

        def format_age(ts: datetime | None) -> str | None:
            if not ts:
                return None
            age = datetime.utcnow() - ts
            if age.total_seconds() < 3600:
                return f"{int(age.total_seconds() / 60)} хв тому"
            if age.total_seconds() < 86400:
                return f"{int(age.total_seconds() / 3600)} год тому"
            return f"{age.days} дн тому"

        prices_ts = prices.created_at if prices else None
        news_ts = news.created_at if news else None
        github_ts = github.recorded_at if github else None
        summary_ts = summary.summary_generated_at if summary else None

        return {
            "prices": {
                "cached": prices_ts is not None and self._is_fresh(prices_ts),
                "updated_at": prices_ts.isoformat() if prices_ts else None,
                "age": format_age(prices_ts),
            },
            "news": {
                "cached": news_ts is not None and self._is_fresh(news_ts),
                "updated_at": news_ts.isoformat() if news_ts else None,
                "age": format_age(news_ts),
            },
            "github": {
                "cached": github_ts is not None and self._is_fresh(github_ts),
                "updated_at": github_ts.isoformat() if github_ts else None,
                "age": format_age(github_ts),
            },
            "summary": {
                "cached": summary_ts is not None and self._is_fresh(summary_ts),
                "updated_at": summary_ts.isoformat() if summary_ts else None,
                "age": format_age(summary_ts),
            },
        }

    # ── INVALIDATE ────────────────────────────────────────────────────────────

    def invalidate_asset_cache(self, asset: Asset) -> None:
        """
        Примусово інвалідує кеш для активу.
        Використовується при натисканні кнопки «Оновити дані» на дашборді.
        Не видаляє дані -- оновлює created_at на давню дату.
        """
        old_date = datetime.utcnow() - timedelta(hours=25)

        self.db.query(Price).filter(
            Price.asset_id == asset.id
        ).update({"created_at": old_date})

        self.db.query(News).filter(
            News.asset_id == asset.id
        ).update({"created_at": old_date})

        self.db.query(GitHubStats).filter(
            GitHubStats.asset_id == asset.id
        ).update({"recorded_at": old_date})

        self.db.query(DailyScore).filter(
            DailyScore.asset_id == asset.id,
            DailyScore.summary.isnot(None)
        ).update({"summary_generated_at": old_date})

        self.db.commit()
        logger.info(f"CACHE INVALIDATED {asset.ticker}")