from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./cgj_dashboard.db"
    upload_dir: str = "./uploads"
    max_file_size: int = 200 * 1024 * 1024  # 200MB
    chunk_size: int = 1024 * 1024  # 1MB
    max_preview_rows: int = 20
    batch_insert_size: int = 1000
    app_secret_key: str = ""
    secure_cookies: bool = False
    session_hours: int = 8
    admin_username: str = "mym9259_et"
    standard_username: str = "cgj"
    admin_initial_password: str = ""
    standard_initial_password: str = ""
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,https://hz-future.net"
    enable_docs: bool = True

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
