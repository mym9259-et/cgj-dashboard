from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import auth, car_series, dashboard, export, filters, store, store_analysis, upload
from app.config import settings
from app.core.exceptions import AppException
from app.database import async_session, init_db
from app.services.auth_service import ensure_default_users, get_current_user


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    async with async_session() as db:
        await ensure_default_users(db)
    yield


app = FastAPI(
    title="车管家数据看板API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.enable_docs else None,
    redoc_url=None,
    openapi_url="/openapi.json" if settings.enable_docs else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppException)
async def app_exception_handler(request, exc: AppException):
    return JSONResponse(status_code=400, content={"message": exc.message, "detail": exc.detail})


protected = [Depends(get_current_user)]
app.include_router(auth.router)
app.include_router(upload.router, dependencies=protected)
app.include_router(store.router, dependencies=protected)
app.include_router(store_analysis.router, dependencies=protected)
app.include_router(dashboard.router, dependencies=protected)
app.include_router(filters.router, dependencies=protected)
app.include_router(car_series.router, dependencies=protected)
app.include_router(export.router, dependencies=protected)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
