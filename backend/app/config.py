from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    NEWS_API_KEY: str
    GROQ_API_KEY: str
    GITHUB_TOKEN: str
    DEBUG: bool = False

    class Config:
        env_file = ".env"

settings = Settings()