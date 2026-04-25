"""
API ендпоінти для роботи з активами.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
from app.models.database import get_db
from app.collectors.asset_search import validate_and_save_asset
from app.collectors.price_collector import PriceCollector
from app.models.models import Asset, Price
from app.collectors.news_collector import NewsCollector
from app.collectors.github_collector import GitHubCollector
from app.processing.sentiment_analyzer import SentimentAnalyzer
from app.processing.correlation_engine import CorrelationEngine
from app.processing.summary_generator import SummaryGenerator
from app.processing.cache_manager import CacheManager

router = APIRouter(prefix="/api/assets", tags=["assets"])


class AssetResponse(BaseModel):
    """Схема відповіді з інформацією про актив."""
    ticker: str
    name: str
    asset_type: str
    exchange: str | None
    sector: str | None
    currency: str | None

    class Config:
        from_attributes = True


@router.get("/validate/{ticker}", response_model=AssetResponse)
def validate_ticker(ticker: str, db: Session = Depends(get_db)):
    """
    Валідує тікер-символ та повертає базову інформацію про актив.
    Зберігає актив у базу даних якщо його ще немає.
    
    - **ticker**: тікер-символ активу (наприклад AAPL або BTC-USD)
    """
    # Базова валідація формату тікера
    ticker = ticker.upper().strip()

    if not ticker:
        raise HTTPException(
            status_code=400,
            detail="Будь ласка, введіть тікер-символ"
        )

    if len(ticker) > 20:
        raise HTTPException(
            status_code=400,
            detail="Тікер-символ не може перевищувати 20 символів"
        )

    allowed_chars = set("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-.")
    if not all(c in allowed_chars for c in ticker):
        raise HTTPException(
            status_code=400,
            detail="Тікер-символ містить неприпустимі символи"
        )

    # Валідація через yfinance та збереження у БД
    asset = validate_and_save_asset(ticker, db)

    if not asset:
        raise HTTPException(
            status_code=404,
            detail=f"Актив '{ticker}' не знайдено. Перевірте правильність символу"
        )

    return asset

@router.get("/{ticker}/prices")
def get_prices(
    ticker: str,
    days: int = 30,
    db: Session = Depends(get_db)
):
    """
    Повертає історичні цінові дані для активу за вказану кількість днів.
    Зберігає дані у базу даних.
    """
    ticker_upper = ticker.upper().strip()

    # Перевіряємо чи актив існує
    asset = db.query(Asset).filter(Asset.ticker == ticker_upper).first()
    if not asset:
        raise HTTPException(
            status_code=404,
            detail=f"Актив '{ticker_upper}' не знайдено. Спочатку валідуйте тікер."
        )

    cache = CacheManager(db)

    # Перевіряємо кеш
    cached_prices = cache.get_cached_prices(asset, days)
    if cached_prices is not None:
        return {
            "ticker": ticker_upper,
            "source": "cache",
            "count": len(cached_prices),
            "prices": [
                {
                    "date": p.date.strftime("%Y-%m-%d"),
                    "open": p.open,
                    "high": p.high,
                    "low": p.low,
                    "close": p.close,
                    "volume": p.volume,
                    "change_pct": p.change_pct,
                }
                for p in cached_prices
            ]
        }

    # Кеш промах -- збираємо свіжі дані
    collector = PriceCollector()
    prices = collector.collect_and_save(ticker_upper, asset, db, days)

    if not prices:
        raise HTTPException(
            status_code=503,
            detail="Цінові дані тимчасово недоступні."
        )

    return {
        "ticker": ticker_upper,
        "source": "live",
        "count": len(prices),
        "prices": [
            {
                "date": p.date.strftime("%Y-%m-%d"),
                "open": p.open,
                "high": p.high,
                "low": p.low,
                "close": p.close,
                "volume": p.volume,
                "change_pct": p.change_pct,
            }
            for p in sorted(prices, key=lambda x: x.date)
        ]
    }

@router.get("/{ticker}/news")
def get_news(ticker: str, refresh: bool = False, db: Session = Depends(get_db)):
    """
    Повертає новини для активу.
    Використовує CacheManager для перевірки кешу.
    """
    ticker_upper = ticker.upper().strip()

    asset = db.query(Asset).filter(Asset.ticker == ticker_upper).first()
    if not asset:
        raise HTTPException(
            status_code=404,
            detail=f"Актив '{ticker_upper}' не знайдено."
        )

    cache = CacheManager(db)

    # Примусова інвалідація якщо refresh=True
    if refresh:
        cache.invalidate_asset_cache(asset)

    # Перевіряємо кеш
    cached_news = cache.get_cached_news(asset)
    if cached_news is not None:
        return {
            "ticker": ticker_upper,
            "source": "cache",
            "count": len(cached_news),
            "news": [
                {
                    "id": n.id,
                    "title": n.title,
                    "source": n.source,
                    "url": n.url,
                    "published_at": n.published_at.isoformat() if n.published_at else None,
                    "sentiment_score": n.sentiment_score,
                    "sentiment_label": n.sentiment_label,
                    "is_analyzed": n.is_analyzed,
                }
                for n in sorted(
                    cached_news,
                    key=lambda n: n.published_at or datetime.min,
                    reverse=True
                )
            ]
        }

    # Кеш промах -- збираємо свіжі дані
    collector = NewsCollector()
    news = collector.collect_and_save(ticker_upper, asset, db)

    if not news:
        return {
            "ticker": ticker_upper,
            "source": "live",
            "count": 0,
            "news": [],
            "message": "Новини за обраним активом не знайдено."
        }

    return {
        "ticker": ticker_upper,
        "source": "live",
        "count": len(news),
        "news": [
            {
                "id": n.id,
                "title": n.title,
                "source": n.source,
                "url": n.url,
                "published_at": n.published_at.isoformat() if n.published_at else None,
                "sentiment_score": n.sentiment_score,
                "sentiment_label": n.sentiment_label,
                "is_analyzed": n.is_analyzed,
            }
            for n in sorted(
                news,
                key=lambda n: n.published_at or datetime.min,
                reverse=True
            )
        ]
    }

@router.get("/{ticker}/github")
def get_github(ticker: str, db: Session = Depends(get_db)):
    """
    Повертає активність розробників на GitHub для криптовалютного активу.
    Для традиційних акцій повертає відповідне повідомлення.
    Використовує CacheManager для перевірки кешу.
    """
    ticker_upper = ticker.upper().strip()

    asset = db.query(Asset).filter(Asset.ticker == ticker_upper).first()
    if not asset:
        raise HTTPException(
            status_code=404,
            detail=f"Актив '{ticker_upper}' не знайдено."
        )

    cache = CacheManager(db)

    # CacheManager повертає [] для акцій автоматично
    cached_github = cache.get_cached_github(asset)

    if asset.asset_type != "crypto":
        return {
            "ticker": ticker_upper,
            "is_crypto": False,
            "message": "Аналіз активності розробників доступний лише для криптовалютних активів.",
            "github": []
        }

    if cached_github is not None:
        return {
            "ticker": ticker_upper,
            "is_crypto": True,
            "source": "cache",
            "count": len(cached_github),
            "github": [
                {
                    "repo_name": s.repo_name,
                    "repo_url": s.repo_url,
                    "stars": s.stars,
                    "forks": s.forks,
                    "open_issues": s.open_issues,
                    "commits_last_month": s.commits_last_month,
                    "activity_level": s.activity_level,
                    "recorded_at": s.recorded_at.isoformat(),
                }
                for s in cached_github
            ]
        }

    # Кеш промах -- збираємо свіжі дані
    collector = GitHubCollector()
    stats = collector.collect_and_save(ticker_upper, asset, db)

    return {
        "ticker": ticker_upper,
        "is_crypto": True,
        "source": "live",
        "count": len(stats),
        "github": [
            {
                "repo_name": s.repo_name,
                "repo_url": s.repo_url,
                "stars": s.stars,
                "forks": s.forks,
                "open_issues": s.open_issues,
                "commits_last_month": s.commits_last_month,
                "activity_level": s.activity_level,
                "recorded_at": s.recorded_at.isoformat(),
            }
            for s in stats
        ]
    }

@router.post("/{ticker}/analyze-sentiment")
def analyze_sentiment(ticker: str, db: Session = Depends(get_db)):
    """
    Запускає аналіз тональності для всіх непроаналізованих новин активу.
    Кешує результати у БД -- повторний виклик не витрачає API запити.
    """
    ticker_upper = ticker.upper().strip()

    asset = db.query(Asset).filter(Asset.ticker == ticker_upper).first()
    if not asset:
        raise HTTPException(
            status_code=404,
            detail=f"Актив '{ticker_upper}' не знайдено."
        )

    # Отримуємо всі непроаналізовані новини
    from app.models.models import News
    unanalyzed = db.query(News).filter(
        News.asset_id == asset.id,
        News.is_analyzed == False
    ).all()

    if not unanalyzed:
        # Повертаємо вже проаналізовані
        analyzed = db.query(News).filter(
            News.asset_id == asset.id,
            News.is_analyzed == True
        ).all()

        return {
            "ticker": ticker_upper,
            "source": "cache",
            "analyzed_count": len(analyzed),
            "llm_available": True,
            "news": [
                {
                    "id": n.id,
                    "title": n.title,
                    "sentiment_score": n.sentiment_score,
                    "sentiment_label": n.sentiment_label,
                }
                for n in analyzed
            ]
        }

    analyzer = SentimentAnalyzer()
    results = analyzer.analyze_news_batch(unanalyzed, db)

    # Перевіряємо чи LLM взагалі відповів
    llm_available = any(n.is_analyzed for n in results)

    return {
        "ticker": ticker_upper,
        "source": "live",
        "analyzed_count": sum(1 for n in results if n.is_analyzed),
        "llm_available": llm_available,
        "message": None if llm_available else "LLM тимчасово недоступний. Дані відображаються без оцінки тональності.",
        "news": [
            {
                "id": n.id,
                "title": n.title,
                "sentiment_score": n.sentiment_score,
                "sentiment_label": n.sentiment_label,
            }
            for n in results
        ]
    }

@router.get("/{ticker}/correlation")
def get_correlation(
    ticker: str,
    days: int = 14,
    db: Session = Depends(get_db)
):
    """
    Повертає кореляційний аналіз між тональністю новин та ціновою динамікою.
    Також зберігає денні оцінки у таблицю daily_scores.
    """
    ticker_upper = ticker.upper().strip()

    asset = db.query(Asset).filter(Asset.ticker == ticker_upper).first()
    if not asset:
        raise HTTPException(
            status_code=404,
            detail=f"Актив '{ticker_upper}' не знайдено."
        )

    engine = CorrelationEngine()

    # Обчислюємо кореляцію
    result = engine.calculate(asset, db, days)

    # Зберігаємо денні оцінки
    engine.save_daily_scores(asset, db, days)

    return {
        "ticker": ticker_upper,
        "days_analyzed": result["days_analyzed"],
        "coefficient": result["coefficient"],
        "label": result["label"],
        "chart_data": result["chart_data"],
    }

@router.get("/{ticker}/summary")
def get_summary(ticker: str, db: Session = Depends(get_db)):
    """
    Генерує або повертає кешований аналітичний звіт для активу.
    Звіт завжди містить дисклеймер.
    Формування не довше 15 секунд.
    """
    ticker_upper = ticker.upper().strip()

    asset = db.query(Asset).filter(Asset.ticker == ticker_upper).first()
    if not asset:
        raise HTTPException(
            status_code=404,
            detail=f"Актив '{ticker_upper}' не знайдено."
        )

    generator = SummaryGenerator()
    result = generator.generate(asset, db)

    return {
        "ticker": ticker_upper,
        "name": asset.name,
        **result
    }

@router.get("/{ticker}/cache-status")
def get_cache_status(ticker: str, db: Session = Depends(get_db)):
    """
    Повертає статус кешу для активу.
    Показує час останнього оновлення кожного типу даних.
    """
    ticker_upper = ticker.upper().strip()

    asset = db.query(Asset).filter(Asset.ticker == ticker_upper).first()
    if not asset:
        raise HTTPException(status_code=404, detail=f"Актив '{ticker_upper}' не знайдено.")

    cache = CacheManager(db)
    status = cache.get_cache_status(asset)

    return {
        "ticker": ticker_upper,
        "cache_ttl_hours": 24,
        "status": status,
    }


@router.post("/{ticker}/invalidate-cache")
def invalidate_cache(ticker: str, db: Session = Depends(get_db)):
    """
    Примусово інвалідує кеш для активу.
    Використовується кнопкою «Оновити дані» на дашборді.
    """
    ticker_upper = ticker.upper().strip()

    asset = db.query(Asset).filter(Asset.ticker == ticker_upper).first()
    if not asset:
        raise HTTPException(status_code=404, detail=f"Актив '{ticker_upper}' не знайдено.")

    cache = CacheManager(db)
    cache.invalidate_asset_cache(asset)

    return {
        "ticker": ticker_upper,
        "message": "Кеш інвалідовано. Наступний запит отримає свіжі дані.",
    }