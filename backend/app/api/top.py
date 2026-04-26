"""
Top Assets API -- рейтинг активів за інвестиційним настроєм.
Використовується сторінкою /top фронтенду.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.database import get_db
from app.models.models import Asset, News, Price

router = APIRouter(prefix="/api/top", tags=["top"])


@router.get("")
def get_top_assets(
    category: str = "all",
    db: Session = Depends(get_db)
):
    """
    Повертає рейтинг активів відсортованих за середньою оцінкою настрою.

    Args:
        category: фільтр категорії -- "all", "stock" або "crypto"
    """
    # Фільтруємо активи за категорією
    query = db.query(Asset)
    if category == "stock":
        query = query.filter(Asset.asset_type == "stock")
    elif category == "crypto":
        query = query.filter(Asset.asset_type == "crypto")

    assets = query.all()

    if not assets:
        return {
            "category": category,
            "count": 0,
            "assets": [],
            "message": "Поки немає проаналізованих активів. "
                       "Почніть пошук на головній сторінці."
        }

    result = []
    for asset in assets:
        # Середній sentiment
        avg_sentiment = db.query(
            func.avg(News.sentiment_score)
        ).filter(
            News.asset_id == asset.id,
            News.is_analyzed == True,
            News.sentiment_score.isnot(None)
        ).scalar()

        if avg_sentiment is None:
            continue

        avg_sentiment = round(float(avg_sentiment), 4)

        # Визначаємо тональність
        if avg_sentiment > 0.2:
            sentiment_label = "positive"
        elif avg_sentiment < -0.2:
            sentiment_label = "negative"
        else:
            sentiment_label = "neutral"

        # Поточна ціна та зміна за день
        latest_price = db.query(Price).filter(
            Price.asset_id == asset.id
        ).order_by(Price.date.desc()).first()

        result.append({
            "ticker": asset.ticker,
            "name": asset.name,
            "asset_type": asset.asset_type,
            "current_price": latest_price.close if latest_price else None,
            "daily_change": latest_price.change_pct if latest_price else None,
            "sentiment_score": avg_sentiment,
            "sentiment_label": sentiment_label,
        })

    # Сортуємо за sentiment score від найвищого
    result.sort(key=lambda x: x["sentiment_score"], reverse=True)

    return {
        "category": category,
        "count": len(result),
        "assets": result,
    }