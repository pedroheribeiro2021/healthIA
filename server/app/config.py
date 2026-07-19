from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="HEALTHAI_")

    db_path: Path = Path.home() / ".healthai" / "healthai.db"


def get_settings() -> Settings:
    return Settings()
