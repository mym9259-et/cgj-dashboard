from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

_connect_args = {}
_engine_kwargs = {"echo": False}
if settings.database_url.startswith("sqlite"):
    _connect_args = {"check_same_thread": False}
else:
    _engine_kwargs.update({"pool_size": 5, "max_overflow": 10})

engine = create_async_engine(
    settings.database_url,
    connect_args=_connect_args,
    **_engine_kwargs,
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        existing_columns = await conn.run_sync(
            lambda sync_conn: {
                column["name"] for column in inspect(sync_conn).get_columns("store_mappings")
            }
        )
        for column_name in ("dealer_direct", "store_mode"):
            if column_name not in existing_columns:
                await conn.execute(
                    text(f"ALTER TABLE store_mappings ADD COLUMN {column_name} VARCHAR(100)")
                )
        # create_all does not add indexes to existing tables. Dashboard date
        # filters all use delivery_date, so ensure deployed databases get it.
        await conn.execute(
            text("CREATE INDEX IF NOT EXISTS ix_leads_delivery_date ON leads (delivery_date)")
        )
