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
    """Seed store mappings from a pre-packaged Excel file.

    Looks for the file (in order):
      1. CGJ_SEED_MAPPING_FILE env var (absolute path)
      2. <repo>/门店清单_填充完成.xlsx  (relative to this file)
      3. <upload_dir>/../门店清单_填充完成.xlsx
"""
    import os

    seed_filename = "门店清单_填充完成.xlsx"
    candidates = []
    env_path = os.environ.get("CGJ_SEED_MAPPING_FILE")
    if env_path:
        candidates.append(Path(env_path))
    repo_root = Path(__file__).resolve().parent.parent.parent
    candidates.append(repo_root / seed_filename)
    candidates.append(repo_root / "data" / seed_filename)
    candidates.append(Path(settings.upload_dir).parent / seed_filename)

    for p in candidates:
        if p.exists():
            result = await seed_from_excel(db, str(p))
            return {**result, "source": str(p)}

    raise HTTPException(
        404,
        "未找到预置的门店清单文件，请通过 POST /api/store/mapping/upload 上传",
    )
