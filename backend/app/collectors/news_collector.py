"""
News Collector -- збір фінансових новин для активу.
Основне джерело: NewsAPI (100 запитів/день на безкоштовному тарифі).
Резервне джерело: GNews API (безкоштовний тариф).
"""
import requests
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.models import News, Asset
from app.config import settings


class NewsCollector:
    """
    Збирач фінансових новин для фінансових активів.
    Використовує NewsAPI як основне джерело
    та GNews API як резервне.
    """

    NEWSAPI_URL = "https://newsapi.org/v2/everything"
    GNEWS_URL = "https://gnews.io/api/v4/search"

    def _build_search_query(self, ticker: str, asset_name: str) -> str:
        """
        Будує пошуковий запит для новин.
        Для крипто використовує повну назву, для акцій -- тікер.
        """
        # Видаляємо суфікс -USD для крипто
        clean_ticker = ticker.replace("-USD", "").replace("-USDT", "")

        if asset_name and asset_name != ticker:
            # Використовуємо назву активу для кращих результатів
            return f'"{clean_ticker}" OR "{asset_name}"'
        return f'"{clean_ticker}"'

    def _fetch_from_newsapi(self, ticker: str, asset_name: str) -> list[dict]:
        """
        Отримує новини через NewsAPI.
        Обмежуємо запити щоб не перевищити ліміт 100/день.
        """
        api_key = getattr(settings, "NEWS_API_KEY", None)
        if not api_key:
            return []

        try:
            # Шукаємо новини за останні 7 днів
            from_date = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%S")

            params = {
                "q": self._build_search_query(ticker, asset_name),
                "language": "en",
                "sortBy": "publishedAt",
                "pageSize": 20,
                "from": from_date,
                "apiKey": api_key,
            }

            response = requests.get(
                self.NEWSAPI_URL,
                params=params,
                timeout=15
            )

            if response.status_code == 429:
                # Rate limit досягнуто -- повертаємо порожній список
                # щоб спрацювало резервне джерело
                return []

            if response.status_code != 200:
                return []

            data = response.json()

            if data.get("status") != "ok":
                return []

            articles = data.get("articles", [])
            result = []

            for article in articles:
                # Пропускаємо статті без заголовку або URL
                if not article.get("title") or not article.get("url"):
                    continue

                # Пропускаємо видалені статті
                if article.get("title") == "[Removed]":
                    continue

                published_at = None
                if article.get("publishedAt"):
                    try:
                        published_at = datetime.strptime(
                            article["publishedAt"], "%Y-%m-%dT%H:%M:%SZ"
                        )
                    except ValueError:
                        pass

                result.append({
                    "title": article.get("title", "")[:500],
                    "content": article.get("content") or article.get("description"),
                    "source": article.get("source", {}).get("name", "Unknown"),
                    "url": article.get("url", "")[:1000],
                    "published_at": published_at,
                })

            return result[:20]

        except Exception:
            return []

    def _fetch_from_gnews(self, ticker: str, asset_name: str) -> list[dict]:
        """
        Резервне джерело -- GNews API (безкоштовний тариф: 100 запитів/день).
        Використовується якщо NewsAPI недоступний або вичерпав ліміт.
        """
        api_key = getattr(settings, "GNEWS_API_KEY", None)
        if not api_key:
            return []

        try:
            clean_ticker = ticker.replace("-USD", "").replace("-USDT", "")
            query = asset_name if asset_name and asset_name != ticker else clean_ticker

            params = {
                "q": query,
                "lang": "en",
                "country": "us",
                "max": 20,
                "sortby": "publishedAt",
                "token": api_key,
            }

            response = requests.get(
                self.GNEWS_URL,
                params=params,
                timeout=15
            )

            if response.status_code != 200:
                return []

            data = response.json()
            articles = data.get("articles", [])
            result = []

            for article in articles:
                if not article.get("title") or not article.get("url"):
                    continue

                published_at = None
                if article.get("publishedAt"):
                    try:
                        published_at = datetime.strptime(
                            article["publishedAt"], "%Y-%m-%dT%H:%M:%SZ"
                        )
                    except ValueError:
                        pass

                result.append({
                    "title": article.get("title", "")[:500],
                    "content": article.get("content") or article.get("description"),
                    "source": article.get("source", {}).get("name", "Unknown"),
                    "url": article.get("url", "")[:1000],
                    "published_at": published_at,
                })

            return result[:20]

        except Exception:
            return []

    def collect(self, ticker: str, asset_name: str = "") -> list[dict]:
        """
        Збирає новини для заданого активу.
        Спочатку намагається NewsAPI, потім GNews.
        """
        ticker_upper = ticker.upper().strip()

        # Основне джерело -- NewsAPI
        articles = self._fetch_from_newsapi(ticker_upper, asset_name)

        # Резервне джерело -- GNews
        if not articles:
            articles = self._fetch_from_gnews(ticker_upper, asset_name)

        return articles

    def collect_and_save(
        self,
        ticker: str,
        asset: Asset,
        db: Session
    ) -> list[News]:
        """
        Збирає новини та зберігає у базу даних із перевіркою дублікатів.
        Повертає список збережених записів News.
        """
        raw_articles = self.collect(ticker, asset.name)

        if not raw_articles:
            return []

        saved = []
        for article in raw_articles:
            # Перевірка дублікатів за URL
            existing = db.query(News).filter(
                News.url == article["url"]
            ).first()

            if existing:
                continue

            news = News(
                asset_id=asset.id,
                title=article["title"],
                content=article["content"],
                source=article["source"],
                url=article["url"],
                published_at=article["published_at"],
                is_analyzed=False,
            )
            db.add(news)
            saved.append(news)

        db.commit()
        return saved

    def get_cached_or_fetch(
        self,
        ticker: str,
        asset: Asset,
        db: Session
    ) -> list[News]:
        """
        Повертає кешовані новини якщо вони свіжі (менше 24 годин),
        інакше збирає нові та оновлює кеш.
        """
        cutoff = datetime.utcnow() - timedelta(hours=24)

        # Перевіряємо кеш
        cached = db.query(News).filter(
            News.asset_id == asset.id,
            News.created_at >= cutoff
        ).order_by(News.published_at.desc()).limit(20).all()

        if cached:
            return cached

        # Збираємо свіжі дані
        return self.collect_and_save(ticker, asset, db)