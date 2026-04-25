"""
Export API -- ендпоінт для завантаження CSV-файлу з даними активу.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.models import Asset
from app.processing.export_module import ExportModule

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/{ticker}")
def export_csv(
    ticker: str,
    days: int = 30,
    db: Session = Depends(get_db)
):
    """
    Формує та повертає CSV-файл з даними активу за вказану кількість днів.
    Ініціює завантаження файлу у браузері через Content-Disposition header.

    - **ticker**: тікер-символ активу
    - **days**: кількість днів (за замовчуванням 30, максимум 90)
    """
    ticker_upper = ticker.upper().strip()
    days = min(max(days, 1), 90)  # обмежуємо від 1 до 90 днів

    asset = db.query(Asset).filter(Asset.ticker == ticker_upper).first()
    if not asset:
        raise HTTPException(
            status_code=404,
            detail=f"Актив '{ticker_upper}' не знайдено."
        )

    exporter = ExportModule()
    csv_content = exporter.generate_csv(asset, db, days)
    filename = exporter.get_filename(ticker_upper)

    return Response(
        content=csv_content.encode("utf-8-sig"),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "text/csv; charset=utf-8",
        }
    )