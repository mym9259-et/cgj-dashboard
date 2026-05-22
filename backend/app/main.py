from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import dashboard, export, filters, upload
from app.config import settings
from app.core.exceptions import AppException
from app.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="车管家数据看板 API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppException)
async def app_exception_handler(request, exc: AppException):
    return JSONResponse(status_code=400, content={"message": exc.message, "detail": exc.detail})


app.include_router(upload.router)
app.include_router(dashboard.router)
app.include_router(filters.router)
app.include_router(export.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
