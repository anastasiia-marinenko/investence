"""
Asset Search -- пошук та валідація фінансового активу за тікером.
Використовує прямі HTTP-запити до Yahoo Finance API.
"""
import requests
from sqlalchemy.orm import Session
from app.models.models import Asset

CRYPTO_SUFFIXES = ["-USD", "-USDT", "-BTC", "-EUR"]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://finance.yahoo.com",
    "Referer": "https://finance.yahoo.com/",
}


def is_crypto(ticker: str) -> bool:
    """Визначає чи є тікер криптовалютою за суфіксом."""
    return any(ticker.upper().endswith(suffix) for suffix in CRYPTO_SUFFIXES)


def fetch_asset_info(ticker: str) -> dict | None:
    """
    Отримує інформацію про актив через Yahoo Finance Query API.
    Той самий підхід що використовує більшість фінансових застосунків.
    """
    ticker_upper = ticker.upper().strip()

    try:
        # Крок 1 -- отримуємо crumb та cookies (потрібно для автентифікації)
        session = requests.Session()
        session.headers.update(HEADERS)

        # Отримуємо cookies через головну сторінку
        session.get("https://finance.yahoo.com", timeout=10)

        # Отримуємо crumb
        crumb_response = session.get(
            "https://query1.finance.yahoo.com/v1/test/getcrumb",
            timeout=10
        )

        if crumb_response.status_code != 200:
            return _fallback_search(ticker_upper, session)

        crumb = crumb_response.text.strip()

        # Крок 2 -- отримуємо дані активу
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker_upper}"
        params = {
            "interval": "1d",
            "range": "5d",
            "crumb": crumb,
        }

        response = session.get(url, params=params, timeout=10)

        if response.status_code != 200:
            return _fallback_search(ticker_upper, session)

        data = response.json()
        result = data.get("chart", {}).get("result")

        if not result:
            return None

        meta = result[0].get("meta", {})
        name = meta.get("longName") or meta.get("shortName") or ticker_upper
        asset_type = "crypto" if is_crypto(ticker_upper) else "stock"

        return {
            "ticker": ticker_upper,
            "name": name,
            "asset_type": asset_type,
            "exchange": meta.get("exchangeName"),
            "sector": None,
            "currency": meta.get("currency", "USD"),
        }

    except Exception:
        return _fallback_search(ticker_upper, requests.Session())


def _fallback_search(ticker: str, session: requests.Session) -> dict | None:
    """
    Резервний метод -- пошук через Yahoo Finance Search API.
    Використовується якщо основний метод не спрацював.
    """
    try:
        session.headers.update(HEADERS)
        url = "https://query1.finance.yahoo.com/v1/finance/search"
        params = {
            "q": ticker,
            "quotesCount": 5,
            "newsCount": 0,
            "listsCount": 0,
        }
        response = session.get(url, params=params, timeout=10)

        if response.status_code != 200:
            return None

        data = response.json()
        quotes = data.get("quotes", [])

        if not quotes:
            return None

        # Шукаємо точний збіг
        match = next(
            (q for q in quotes if q.get("symbol", "").upper() == ticker),
            quotes[0]
        )

        name = match.get("longname") or match.get("shortname") or ticker
        asset_type = "crypto" if is_crypto(ticker) else "stock"

        return {
            "ticker": ticker,
            "name": name,
            "asset_type": asset_type,
            "exchange": match.get("exchange"),
            "sector": None,
            "currency": match.get("currency", "USD"),
        }

    except Exception:
        return None


def validate_and_save_asset(ticker: str, db: Session) -> Asset | None:
    """
    Валідує тікер та зберігає або повертає актив з бази даних.
    """
    ticker_upper = ticker.upper().strip()

    # Перевіряємо чи актив вже є в базі даних
    existing = db.query(Asset).filter(Asset.ticker == ticker_upper).first()
    if existing:
        return existing

    # Отримуємо інформацію
    info = fetch_asset_info(ticker_upper)
    if not info:
        return None

    # Зберігаємо у базу даних
    asset = Asset(
        ticker=info["ticker"],
        name=info["name"],
        asset_type=info["asset_type"],
        exchange=info["exchange"],
        sector=info["sector"],
        currency=info["currency"],
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)

    return asset