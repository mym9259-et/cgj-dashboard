"""Car series mapping API: upload, unmatched, list."""

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.services.car_series_service import (
    get_unmatched_series,
    list_all_mappings,
    seed_from_excel,
)

router = APIRouter(prefix="/api/car-series", tags=["car-series"])


@router.post("/mapping/upload")
async def upload_mapping(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """Upload a car series mapping Excel file. Overwrites all existing mappings."""
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(400, "\u4ec5\u652f\u6301 .xlsx / .xls \u6587\u4ef6")

    temp_path = Path(settings.upload_dir) / f"car_series_mapping_{uuid.uuid4().hex}.xlsx"
    temp_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path.write_bytes(await file.read())

    try:
        result = await seed_from_excel(db, str(temp_path))
        return result
    finally:
        if temp_path.exists():
            temp_path.unlink()


@router.get("/mapping/unmatched")
async def unmatched_series(db: AsyncSession = Depends(get_db)):
    """Get car series in leads that have no mapping."""
    return await get_unmatched_series(db)


@router.get("/mapping/all")
async def all_mappings(db: AsyncSession = Depends(get_db)):
    """List all car series mappings."""
    return await list_all_mappings(db)
