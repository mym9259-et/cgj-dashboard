"""Store mapping API: upload, unmatched, manual mapping."""

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.services.store_mapping_service import (
    batch_upsert_mappings,
    get_unmatched_merchants,
    list_all_mappings,
    seed_from_excel,
)

router = APIRouter(prefix="/api/store", tags=["store"])


@router.post("/mapping/upload")
async def upload_mapping(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """Upload a store mapping Excel file. Overwrites all existing mappings."""
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(400, "仅支持 .xlsx / .xls 文件")

    temp_path = Path(settings.upload_dir) / f"mapping_{uuid.uuid4().hex}.xlsx"
    temp_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path.write_bytes(await file.read())

    try:
        result = await seed_from_excel(db, str(temp_path))
        return result
    finally:
        if temp_path.exists():
            temp_path.unlink()


@router.get("/mapping/unmatched")
async def unmatched_merchants(db: AsyncSession = Depends(get_db)):
    """Get merchants in leads that have no store mapping."""
    return await get_unmatched_merchants(db)


@router.post("/mapping/manual")
async def manual_mapping(items: list[dict], db: AsyncSession = Depends(get_db)):
    """Batch insert or update store mappings manually."""
    return await batch_upsert_mappings(db, items)


@router.get("/mapping/all")
async def all_mappings(db: AsyncSession = Depends(get_db)):
    """List all store mappings (for filter dropdowns)."""
    return await list_all_mappings(db)


@router.post("/mapping/seed")
async def seed_default_mapping(db: AsyncSession = Depends(get_db)):
    """Seed store mappings from the pre-packaged Excel file (for one-click setup)."""
    seed_path = Path(settings.upload_dir).parent.parent / "门店清单_填充完成.xlsx"
    # Also try relative to cgj-dashboard root
    alt_path = Path(__file__).parent.parent.parent.parent.parent / "门店清单_填充完成.xlsx"
    alt_path2 = Path(settings.upload_dir).parent / "门店清单_填充完成.xlsx"

    for p in [seed_path, alt_path, alt_path2]:
        if p.exists():
            result = await seed_from_excel(db, str(p))
            return {**result, "source": str(p)}

    raise HTTPException(404, "找不到预置的门店清单文件，请通过 POST /api/store/mapping/upload 上传")
