from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str
    NEWS_API_KEY: str
    GROQ_API_KEY: str
    GITHUB_TOKEN: str
    ALPHA_VANTAGE_API_KEY: Optional[str] = None
    DEBUG: bool = False

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"  # Ігнорувати зайві змінні (POSTGRES_USER тощо)
    }

settings = Settings()