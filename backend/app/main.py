from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models.database import engine, Base
from app.api.assets import router as assets_router

# Створення таблиць при запуску
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Investence API",
    description="AI-платформа для аналізу інвестиційного настрою",
    version="0.1.0"
)

# CORS -- дозволяє React фронтенду звертатись до API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite за замовчуванням
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Підключаємо роутери
app.include_router(assets_router)

@app.get("/")
def root():
    return {"message": "Investence API is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}