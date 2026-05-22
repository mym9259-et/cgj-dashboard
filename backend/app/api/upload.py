"""Upload API: preview, chunk, import, mappings."""

import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.field_mapping import FieldMapping
from app.models.upload import UploadBatch
from app.schemas.upload import (
    ImportRequest,
    MappingRead,
    MappingSchema,
    PreviewResponse,
    UploadHistoryItem,
)
from app.services.import_service import import_from_excel, preview_excel, truncate_leads
from app.services.upload_service import get_assembly_progress, save_chunk

router = APIRouter(prefix="/api", tags=["upload"])


@router.post("/upload/preview", response_model=PreviewResponse)
async def upload_preview(file: UploadFile = File(...)):
    """Read Excel headers and sample data for preview + auto-mapping."""
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(400, "仅支持 .xlsx 或 .xls 文件")

    # Save temp file for preview
    temp_path = Path(settings.upload_dir) / f"preview_{uuid.uuid4().hex}.xlsx"
    temp_path.parent.mkdir(parents=True, exist_ok=True)
    content = await file.read()
    temp_path.write_bytes(content)

    try:
        result = await preview_excel(str(temp_path), settings.max_preview_rows)
        result["file_size"] = len(content)
        return result
    finally:
        if temp_path.exists():
            temp_path.unlink()


@router.post("/upload/chunk")
async def upload_chunk(
    chunk_index: int = Form(...),
    total_chunks: int = Form(...),
    upload_id: str = Form(...),
    filename: str = Form(...),
    chunk: UploadFile = File(...),
):
    """Receive a single file chunk."""
    data = await chunk.read()
    result = save_chunk(upload_id, chunk_index, total_chunks, filename, data)
    return result


@router.post("/upload/import")
async def upload_import(
    req: ImportRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Assemble chunks, parse, validate, truncate, and bulk insert data."""
    import logging
    logger = logging.getLogger("import")

    logger.info(f"Import request: upload_id={req.upload_id}, mapping_keys={list(req.mapping.keys())[:5]}...")
    logger.info(f"Mapping values: {list(req.mapping.values())[:5]}...")

    try:
        # Truncate existing data first
        await truncate_leads(db)

        result = await import_from_excel(db, req.upload_id, req.mapping)
        logger.info(f"Import success: {result['total_rows']} rows")
        return result
    except Exception as e:
        logger.exception(f"Import failed: {e}")
        raise


@router.get("/upload/status/{upload_id}")
async def upload_status(upload_id: str, db: AsyncSession = Depends(get_db)):
    """Get upload/import progress.

    First checks for a completed batch matching this upload_id (UUID format).
    Falls back to checking chunk assembly progress by upload directory.
    """
    # Try to parse upload_id as UUID and check for completed batch
    try:
        batch_uuid = uuid.UUID(upload_id)
        stmt = select(UploadBatch).where(UploadBatch.id == batch_uuid)
        batch = (await db.execute(stmt)).scalar_one_or_none()
        if batch:
            return {
                "batch_id": str(batch.id),
                "status": batch.status,
                "progress_pct": 100,
                "rows_processed": batch.row_count or 0,
                "total_rows": batch.row_count or 0,
                "error_count": batch.error_count or 0,
                "errors": (batch.error_log or {}).get("errors", [])[:50],
            }
    except ValueError:
        pass  # upload_id is not a UUID, check assembly progress instead

    progress = get_assembly_progress(upload_id)
    return {
        "batch_id": None,
        "status": "uploading",
        "progress_pct": int(progress * 100),
        "rows_processed": 0,
        "total_rows": 0,
        "error_count": 0,
        "errors": [],
    }


@router.get("/upload/history", response_model=list[UploadHistoryItem])
async def upload_history(db: AsyncSession = Depends(get_db)):
    """Get upload batch history."""
    stmt = select(UploadBatch).order_by(UploadBatch.created_at.desc()).limit(20)
    result = await db.execute(stmt)
    batches = result.scalars().all()
    return [
        UploadHistoryItem(
            batch_id=row.id,
            filename=row.filename,
            row_count=row.row_count,
            valid_count=row.valid_count,
            error_count=row.error_count,
            status=row.status,
            created_at=row.created_at,
        )
        for row in batches
    ]


@router.get("/mappings", response_model=list[MappingRead])
async def list_mappings(db: AsyncSession = Depends(get_db)):
    """List saved field mappings."""
    stmt = select(FieldMapping).order_by(FieldMapping.created_at.desc())
    result = await db.execute(stmt)
    return [MappingRead.model_validate(m) for m in result.scalars().all()]


@router.post("/mappings", response_model=MappingRead)
async def save_mapping(body: MappingSchema, db: AsyncSession = Depends(get_db)):
    """Save a field mapping configuration for reuse."""
    mapping = FieldMapping(name=body.name, mapping_json=body.mapping_json)
    db.add(mapping)
    await db.commit()
    await db.refresh(mapping)
    return MappingRead.model_validate(mapping)


@router.delete("/mappings/{mapping_id}")
async def delete_mapping(mapping_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a saved field mapping."""
    stmt = select(FieldMapping).where(FieldMapping.id == mapping_id)
    mapping = (await db.execute(stmt)).scalar_one_or_none()
    if not mapping:
        raise HTTPException(404, "映射配置不存在")
    await db.delete(mapping)
    await db.commit()
    return {"ok": True}
