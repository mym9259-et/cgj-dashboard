import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.auth_user import AuthUser
from app.services.auth_service import get_current_user, require_admin
from app.services.car_series_service import seed_from_excel as seed_car_series
from app.services.mapping_admin_service import (
    export_workbook, get_metadata, import_personnel_excel, list_rows,
    replace_rows, set_metadata,
)
from app.services.store_mapping_service import seed_from_excel as seed_store


router = APIRouter(prefix="/api/mapping-admin", tags=["mapping-admin"])


@router.get("/{mapping_type}")
async def get_mapping(mapping_type: str, db: AsyncSession = Depends(get_db)):
    try:
        return {"metadata": await get_metadata(db, mapping_type), "rows": await list_rows(db, mapping_type)}
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc


@router.put("/{mapping_type}")
async def save_mapping(mapping_type: str, rows: list[dict], user: AuthUser = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    try:
        count = await replace_rows(db, mapping_type, rows)
        await set_metadata(db, mapping_type, "online", None, user.username)
        await db.commit()
        return {"updated": count}
    except ValueError as exc:
        await db.rollback()
        raise HTTPException(400, str(exc)) from exc


@router.post("/{mapping_type}/upload")
async def upload_mapping(mapping_type: str, file: UploadFile = File(...), user: AuthUser = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(400, "仅支持 .xlsx / .xls 文件")
    path = Path(settings.upload_dir) / f"mapping_{uuid.uuid4().hex}.xlsx"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(await file.read())
    try:
        username = user.username
        # Authentication may have opened a read transaction on the shared session.
        await db.rollback()
        if mapping_type == "store":
            result = await seed_store(db, str(path))
            count = result["inserted"]
        elif mapping_type == "car-series":
            result = await seed_car_series(db, str(path))
            count = result["inserted"]
        elif mapping_type == "personnel":
            count = await import_personnel_excel(db, str(path))
        else:
            raise HTTPException(404, "不支持的映射表类型")
        await set_metadata(db, mapping_type, "upload", file.filename, username)
        await db.commit()
        return {"inserted": count}
    except ValueError as exc:
        await db.rollback()
        raise HTTPException(400, str(exc)) from exc
    finally:
        try:
            path.unlink(missing_ok=True)
        except PermissionError:
            pass


@router.get("/{mapping_type}/download")
async def download_mapping(mapping_type: str, db: AsyncSession = Depends(get_db), _: AuthUser = Depends(get_current_user)):
    try:
        output = await export_workbook(db, mapping_type)
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc
    filename = f"{mapping_type}-mapping.xlsx"
    return StreamingResponse(output, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f'attachment; filename="{filename}"'})
