"""
Скрипт ініціалізації бази даних.
Створює всі таблиці та заповнює тестовими даними.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.database import engine, SessionLocal, Base
from app.models.models import Asset, Price, News, GitHubStats, DailyScore


def create_tables():
    """Створює всі таблиці в базі даних."""
    print("Створення таблиць...")
    Base.metadata.create_all(bind=engine)
    print("Таблиці створено успішно.")


def seed_test_data(db: Session):
    """Заповнює базу даних тестовими даними."""

    # Перевірка чи вже є дані
    if db.query(Asset).count() > 0:
        print("Тестові дані вже існують. Пропускаємо.")
        return

    print("Додавання тестових даних...")

    # Тестові активи
    assets = [
        Asset(ticker="AAPL", name="Apple Inc.", asset_type="stock",
              exchange="NasdaqGS", sector="Technology", currency="USD"),
        Asset(ticker="BTC-USD", name="Bitcoin USD", asset_type="crypto",
              currency="USD"),
        Asset(ticker="ETH-USD", name="Ethereum USD", asset_type="crypto",
              currency="USD"),
    ]
    db.add_all(assets)
    db.flush()

    # Тестові цінові дані для AAPL (останні 7 днів)
    aapl = db.query(Asset).filter(Asset.ticker == "AAPL").first()
    for i in range(7):
        date = datetime.utcnow() - timedelta(days=i)
        price = Price(
            asset_id=aapl.id,
            date=date,
            open=170.0 + i,
            high=175.0 + i,
            low=168.0 + i,
            close=172.0 + i,
            volume=50000000,
            change_pct=round((-1) ** i * 0.5, 2)
        )
        db.add(price)

    # Тестова новина для AAPL
    news = News(
        asset_id=aapl.id,
        title="Apple reports record quarterly earnings",
        content="Apple Inc. announced record earnings for Q1 2026...",
        source="Reuters",
        url="https://reuters.com/example",
        published_at=datetime.utcnow() - timedelta(hours=2),
        sentiment_score=0.75,
        sentiment_label="positive",
        is_analyzed=True
    )
    db.add(news)

    # Тестові GitHub-дані для BTC-USD
    btc = db.query(Asset).filter(Asset.ticker == "BTC-USD").first()
    github_stat = GitHubStats(
        asset_id=btc.id,
        repo_name="bitcoin/bitcoin",
        repo_url="https://github.com/bitcoin/bitcoin",
        stars=78000,
        forks=35000,
        open_issues=650,
        commits_last_month=120,
        activity_level="high"
    )
    db.add(github_stat)

    # Тестова денна оцінка для AAPL
    daily_score = DailyScore(
        asset_id=aapl.id,
        date=datetime.utcnow(),
        news_sentiment_score=0.65,
        news_count=5,
        price_change_pct=1.2,
        combined_score=0.60,
        summary="Apple показує позитивний настрій завдяки сильним фінансовим результатам."
    )
    db.add(daily_score)

    db.commit()
    print("Тестові дані додано успішно.")


def verify_schema(db: Session):
    """Перевіряє схему на тестових даних."""
    print("\nПеревірка схеми...")

    assets_count = db.query(Asset).count()
    prices_count = db.query(Price).count()
    news_count = db.query(News).count()
    github_count = db.query(GitHubStats).count()
    scores_count = db.query(DailyScore).count()

    print(f"  Активи:         {assets_count}")
    print(f"  Цінові дані:    {prices_count}")
    print(f"  Новини:         {news_count}")
    print(f"  GitHub stats:   {github_count}")
    print(f"  Денні оцінки:   {scores_count}")

    # Перевірка зв'язків
    aapl = db.query(Asset).filter(Asset.ticker == "AAPL").first()
    if aapl:
        print(f"\n  AAPL prices:    {len(aapl.prices)}")
        print(f"  AAPL news:      {len(aapl.news)}")
        print(f"  AAPL scores:    {len(aapl.daily_scores)}")

    print("\nСхема перевірена успішно.")


if __name__ == "__main__":
    create_tables()
    db = SessionLocal()
    try:
        seed_test_data(db)
        verify_schema(db)
    finally:
        db.close()
    print("\nІніціалізація бази даних завершена.")