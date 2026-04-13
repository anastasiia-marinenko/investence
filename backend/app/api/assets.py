"""
API ендпоінти для роботи з активами.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.models.database import get_db
from app.collectors.asset_search import validate_and_save_asset

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