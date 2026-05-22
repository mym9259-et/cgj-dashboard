from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./cgj_dashboard.db"
    upload_dir: str = "./uploads"
    max_file_size: int = 200 * 1024 * 1024  # 200MB
    chunk_size: int = 1024 * 1024  # 1MB
    max_preview_rows: int = 20
    batch_insert_size: int = 1000

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
