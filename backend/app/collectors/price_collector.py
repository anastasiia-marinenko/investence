"""
Price Collector -- збір історичних цінових даних OHLCV.
Основне джерело: Yahoo Finance через прямі HTTP-запити.
Резервне джерело: Alpha Vantage API.
"""
import requests
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.models import Price, Asset
from app.config import settings

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://finance.yahoo.com",
    "Referer": "https://finance.yahoo.com/",
}


class PriceCollector:
    """
    Збирач цінових даних OHLCV для фінансових активів.
    Використовує Yahoo Finance як основне джерело
    та Alpha Vantage як резервне.
    """

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self._crumb = None
        self._cookies_loaded = False

    def _load_cookies_and_crumb(self) -> bool:
        """Завантажує cookies та crumb для автентифікації Yahoo Finance."""
        if self._cookies_loaded and self._crumb:
            return True
        try:
            self.session.get("https://finance.yahoo.com", timeout=10)
            response = self.session.get(
                "https://query1.finance.yahoo.com/v1/test/getcrumb",
                timeout=10
            )
            if response.status_code == 200:
                self._crumb = response.text.strip()
                self._cookies_loaded = True
                return True
            return False
        except Exception:
            return False

    def _fetch_from_yahoo(self, ticker: str, days: int) -> list[dict]:
        """ Отримує цінові дані через Yahoo Finance Chart API. """
        try:
            self._load_cookies_and_crumb()

            period1 = int((datetime.utcnow() - timedelta(days=days + 5)).timestamp())
            period2 = int(datetime.utcnow().timestamp())

            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
            params = {
                "period1": period1,
                "period2": period2,
                "interval": "1d",
                "includePrePost": False,
            }

            if self._crumb:
                params["crumb"] = self._crumb

            response = self.session.get(url, params=params, timeout=15)

            if response.status_code != 200:
                return []

            data = response.json()
            result = data.get("chart", {}).get("result")

            if not result:
                return []

            chart = result[0]
            timestamps = chart.get("timestamp", [])
            quotes = chart.get("indicators", {}).get("quote", [{}])[0]

            if not timestamps:
                return []

            prices = []
            for i, ts in enumerate(timestamps):
                close = quotes.get("close", [])[i] if i < len(quotes.get("close", [])) else None
                if close is None:
                    continue

                prices.append({
                    "date": datetime.utcfromtimestamp(ts),
                    "open": quotes.get("open", [])[i] if i < len(quotes.get("open", [])) else None,
                    "high": quotes.get("high", [])[i] if i < len(quotes.get("high", [])) else None,
                    "low": quotes.get("low", [])[i] if i < len(quotes.get("low", [])) else None,
                    "close": close,
                    "volume": quotes.get("volume", [])[i] if i < len(quotes.get("volume", [])) else None,
                })

            return prices[-days:]

        except Exception:
            return []

    def _fetch_from_alpha_vantage(self, ticker: str, days: int) -> list[dict]:
        """
        Резервне джерело -- Alpha Vantage API.
        Використовується якщо Yahoo Finance недоступний.
        """
        api_key = getattr(settings, "ALPHA_VANTAGE_API_KEY", None)
        if not api_key:
            return []

        try:
            url = "https://www.alphavantage.co/query"
            params = {
                "function": "TIME_SERIES_DAILY",
                "symbol": ticker,
                "outputsize": "compact",
                "apikey": api_key,
            }

            response = requests.get(url, params=params, timeout=15)

            if response.status_code != 200:
                return []

            data = response.json()
            time_series = data.get("Time Series (Daily)", {})

            if not time_series:
                return []

            prices = []
            for date_str, values in sorted(time_series.items(), reverse=True)[:days]:
                prices.append({
                    "date": datetime.strptime(date_str, "%Y-%m-%d"),
                    "open": float(values.get("1. open", 0)),
                    "high": float(values.get("2. high", 0)),
                    "low": float(values.get("3. low", 0)),
                    "close": float(values.get("4. close", 0)),
                    "volume": int(values.get("5. volume", 0)),
                })

            return sorted(prices, key=lambda x: x["date"])

        except Exception:
            return []

    def _calculate_change_pct(self, prices: list[dict]) -> list[dict]:
        """Розраховує відсоткову зміну ціни для кожного дня."""
        for i, price in enumerate(prices):
            if i == 0:
                price["change_pct"] = 0.0
            else:
                prev_close = prices[i - 1]["close"]
                if prev_close and prev_close != 0:
                    price["change_pct"] = round(
                        (price["close"] - prev_close) / prev_close * 100, 4
                    )
                else:
                    price["change_pct"] = 0.0
        return prices

    def collect(self, ticker: str, days: int = 30) -> list[dict]:
        """
        Збирає цінові дані для заданого тікера.
        Спочатку намагається Yahoo Finance, потім Alpha Vantage.
        """
        ticker_upper = ticker.upper().strip()

        # Основне джерело -- Yahoo Finance
        prices = self._fetch_from_yahoo(ticker_upper, days)

        # Резервне джерело -- Alpha Vantage
        if not prices:
            prices = self._fetch_from_alpha_vantage(ticker_upper, days)

        if not prices:
            return []

        return self._calculate_change_pct(prices)

    def collect_and_save(self, ticker: str, asset: Asset, db: Session, days: int = 30) -> list[Price]:
        """
        Збирає цінові дані та зберігає їх у базу даних.
        Повертає список збережених записів Price.
        """
        raw_prices = self.collect(ticker, days)

        if not raw_prices:
            return []

        saved = []
        for p in raw_prices:
            # Перевіряємо чи запис вже існує
            existing = db.query(Price).filter(
                Price.asset_id == asset.id,
                Price.date == p["date"]
            ).first()

            if existing:
                # Оновлюємо існуючий запис
                existing.open = p["open"]
                existing.high = p["high"]
                existing.low = p["low"]
                existing.close = p["close"]
                existing.volume = p["volume"]
                existing.change_pct = p["change_pct"]
                saved.append(existing)
            else:
                # Створюємо новий запис
                price = Price(
                    asset_id=asset.id,
                    date=p["date"],
                    open=p["open"],
                    high=p["high"],
                    low=p["low"],
                    close=p["close"],
                    volume=p["volume"],
                    change_pct=p["change_pct"],
                )
                db.add(price)
                saved.append(price)

        db.commit()
        return saved