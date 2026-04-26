"""
Investence API -- головний модуль FastAPI застосунку.
Ініціалізує застосунок, підключає middleware та роутери.
"""
import logging
from datetime import datetime
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.models.database import engine, Base
from app.api.assets import router as assets_router
from app.api.analytics import router as analytics_router
from app.api.export import router as export_router
from app.api.top import router as top_router

# Налаштування логування
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

# Створення таблиць при запуску
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Investence API",
    description="AI-платформа для аналізу інвестиційного настрою. "
                "Агрегує новини, цінові дані та GitHub-активність.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Middleware ────────────────────────────────────────────────────────────────

# CORS -- дозволяє React фронтенду звертатись до API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",   # альтернативний порт
        "http://localhost:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def error_handling_middleware(request: Request, call_next):
    """
    Middleware для централізованої обробки помилок.
    Логує всі запити та перехоплює необроблені винятки.
    """
    start_time = datetime.utcnow()

    try:
        response = await call_next(request)
        duration = (datetime.utcnow() - start_time).total_seconds()
        logger.info(
            f"{request.method} {request.url.path} "
            f"-- {response.status_code} ({duration:.3f}s)"
        )
        return response

    except Exception as exc:
        duration = (datetime.utcnow() - start_time).total_seconds()
        logger.error(
            f"{request.method} {request.url.path} "
            f"-- 500 ({duration:.3f}s) -- {str(exc)}"
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "Внутрішня помилка сервера. Спробуйте пізніше.",
                "path": str(request.url.path),
            }
        )


@app.middleware("http")
async def validate_ticker_middleware(request: Request, call_next):
    """
    Middleware для валідації тікер-символу у шляху запиту.
    Перевіряє допустимі символи для ендпоінтів що містять тікер.
    """
    path = request.url.path
    ticker_prefixes = ["/api/assets/", "/api/export/"]

    for prefix in ticker_prefixes:
        if path.startswith(prefix):
            # Витягуємо тікер з шляху
            parts = path[len(prefix):].split("/")
            ticker = parts[0] if parts else ""

            if ticker and not ticker.startswith("validate"):
                allowed = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-.")
                if ticker and not all(c in allowed for c in ticker):
                    return JSONResponse(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        content={
                            "detail": "Тікер-символ містить неприпустимі символи. "
                                      "Допустимі: латинські літери, цифри, дефіс."
                        }
                    )
            break

    return await call_next(request)

# ── Роутери ───────────────────────────────────────────────────────────────────

app.include_router(assets_router)
app.include_router(analytics_router)
app.include_router(export_router)
app.include_router(top_router)

# ── Базові ендпоінти ──────────────────────────────────────────────────────────

@app.get("/", tags=["root"])
def root():
    """Кореневий ендпоінт -- перевірка що API запущений."""
    return {
        "message": "Investence API is running",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["root"])
def health_check():
    """Health check ендпоінт для моніторингу та Docker healthcheck."""
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
    }