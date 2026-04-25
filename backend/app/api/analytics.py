"""
API ендпоінти для сторінки загальної аналітики (/analytics).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.processing.analytics_engine import AnalyticsEngine

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("")
def get_analytics(db: Session = Depends(get_db)):
    """
    Повертає повну аналітику по всіх проаналізованих активах.
    Використовується сторінкою /analytics фронтенду.
    """
    engine = AnalyticsEngine()
    data = engine.get_full_analytics(db)

    has_data = data["summary"]["total_assets"] > 0

    return {
        "has_data": has_data,
        "message": None if has_data else
            "Даних поки немає. Почніть аналіз активів на головній сторінці.",
        **data,
    }