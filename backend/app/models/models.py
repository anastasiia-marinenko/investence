from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime,
    Text, ForeignKey, BigInteger, Boolean
)
from sqlalchemy.orm import relationship
from app.models.database import Base


class Asset(Base):
    """
    Фінансовий актив (акція або криптовалюта).
    Підтримує необмежену кількість унікальних активів.
    """
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    asset_type = Column(String(10), nullable=False)  # "stock" або "crypto"
    exchange = Column(String(50), nullable=True)
    sector = Column(String(100), nullable=True)
    currency = Column(String(10), nullable=True, default="USD")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Зв'язки з іншими таблицями
    prices = relationship("Price", back_populates="asset", cascade="all, delete-orphan")
    news = relationship("News", back_populates="asset", cascade="all, delete-orphan")
    github_stats = relationship("GitHubStats", back_populates="asset", cascade="all, delete-orphan")
    daily_scores = relationship("DailyScore", back_populates="asset", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Asset(ticker={self.ticker}, type={self.asset_type})>"


class Price(Base):
    """
    Денні цінові дані OHLCV для активу.
    """
    __tablename__ = "prices"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False, index=True)
    date = Column(DateTime, nullable=False, index=True)
    open = Column(Float, nullable=True)
    high = Column(Float, nullable=True)
    low = Column(Float, nullable=True)
    close = Column(Float, nullable=False)
    volume = Column(BigInteger, nullable=True)
    change_pct = Column(Float, nullable=True)  # Відсоткова зміна за день
    created_at = Column(DateTime, default=datetime.utcnow)

    asset = relationship("Asset", back_populates="prices")

    def __repr__(self):
        return f"<Price(asset_id={self.asset_id}, date={self.date}, close={self.close})>"


class News(Base):
    """
    Новинна стаття із результатом аналізу тональності.
    """
    __tablename__ = "news"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=True)
    source = Column(String(100), nullable=True)
    url = Column(String(1000), nullable=True)
    published_at = Column(DateTime, nullable=True, index=True)
    sentiment_score = Column(Float, nullable=True)   # Від -1.0 до +1.0
    sentiment_label = Column(String(10), nullable=True)  # positive/negative/neutral
    is_analyzed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    asset = relationship("Asset", back_populates="news")

    def __repr__(self):
        return f"<News(asset_id={self.asset_id}, title={self.title[:50]})>"


class GitHubStats(Base):
    """
    Статистика активності розробників на GitHub для криптовалютних активів.
    """
    __tablename__ = "github_stats"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False, index=True)
    repo_name = Column(String(200), nullable=False)
    repo_url = Column(String(500), nullable=True)
    stars = Column(Integer, default=0)
    forks = Column(Integer, default=0)
    open_issues = Column(Integer, default=0)
    commits_last_month = Column(Integer, default=0)
    activity_level = Column(String(10), nullable=True)  # high/medium/low
    recorded_at = Column(DateTime, default=datetime.utcnow, index=True)

    asset = relationship("Asset", back_populates="github_stats")

    def __repr__(self):
        return f"<GitHubStats(asset_id={self.asset_id}, repo={self.repo_name})>"


class DailyScore(Base):
    """
    Агрегована денна оцінка настрою та кореляційні дані для активу.
    """
    __tablename__ = "daily_scores"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False, index=True)
    date = Column(DateTime, nullable=False, index=True)
    news_sentiment_score = Column(Float, nullable=True)   # Середній sentiment за день
    news_count = Column(Integer, default=0)               # Кількість новин за день
    github_activity_score = Column(Float, nullable=True)  # Нормалізована активність GitHub
    price_change_pct = Column(Float, nullable=True)       # Зміна ціни за день у %
    combined_score = Column(Float, nullable=True)         # Загальна оцінка
    summary = Column(Text, nullable=True)                 # AI-згенерований звіт
    summary_generated_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    asset = relationship("Asset", back_populates="daily_scores")

    def __repr__(self):
        return f"<DailyScore(asset_id={self.asset_id}, date={self.date})>"