import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Nex Aero"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
    ]
    DATABASE_URL: str = "sqlite:///./aeroguard.db"
    
    # Model configuration
    MODEL_PATH: str = os.path.join("ml", "models", "rf_fd001_pipeline.joblib")
    METADATA_PATH: str = os.path.join("ml", "models", "rf_fd001_metadata.json")
    
    # Demo thresholds (cycles) - non-authoritative illustrative thresholds
    CRITICAL_RUL_THRESHOLD: int = 25
    WARNING_RUL_THRESHOLD: int = 50
    MODERATE_RUL_THRESHOLD: int = 80

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
