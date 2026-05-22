"""Filter preset CRUD API."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.filter_preset import FilterPreset
from app.schemas.filter_preset import FilterPresetCreate, FilterPresetRead

router = APIRouter(prefix="/api/filters", tags=["filters"])


@router.get("", response_model=list[FilterPresetRead])
async def list_presets(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FilterPreset).order_by(FilterPreset.updated_at.desc())
    )
    return [FilterPresetRead.model_validate(p) for p in result.scalars().all()]


@router.post("", response_model=FilterPresetRead)
async def create_preset(body: FilterPresetCreate, db: AsyncSession = Depends(get_db)):
    preset = FilterPreset(name=body.name, config_json=body.config_json)
    db.add(preset)
    await db.commit()
    await db.refresh(preset)
    return FilterPresetRead.model_validate(preset)


@router.put("/{preset_id}", response_model=FilterPresetRead)
async def update_preset(preset_id: int, body: FilterPresetCreate, db: AsyncSession = Depends(get_db)):
    stmt = select(FilterPreset).where(FilterPreset.id == preset_id)
    preset = (await db.execute(stmt)).scalar_one_or_none()
    if not preset:
        raise HTTPException(404, "筛选方案不存在")
    preset.name = body.name
    preset.config_json = body.config_json
    await db.commit()
    await db.refresh(preset)
    return FilterPresetRead.model_validate(preset)


@router.delete("/{preset_id}")
async def delete_preset(preset_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(FilterPreset).where(FilterPreset.id == preset_id)
    preset = (await db.execute(stmt)).scalar_one_or_none()
    if not preset:
        raise HTTPException(404, "筛选方案不存在")
    await db.delete(preset)
    await db.commit()
    return {"ok": True}
