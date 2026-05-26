"""Store mapping management: import, query, match."""

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.store_mapping import StoreMapping
from app.models.lead import Lead
from app.utils.excel_parser import read_excel_preview, stream_excel_rows


async def seed_from_excel(db: AsyncSession, filepath: str) -> dict:
    """Import store mappings from an Excel file, overwriting existing data."""
    # Read headers
    preview = read_excel_preview(filepath, 2)
    cols = [c["header"] for c in preview["columns"]]

    # Map Excel columns to system fields (handle both old/new naming)
    field_map = _build_field_map(cols)

    # Stream and import
    inserted = 0
    async with db.begin():
        # Clear existing
        await db.execute(delete(StoreMapping))

        for batch in stream_excel_rows(filepath, field_map, batch_size=500):
            for row in batch:
                name = row.get("merchant_name") or row.get("_extra", {}).get("merchant_name", "")
                if not name:
                    continue
                mapping = StoreMapping(
                    merchant_name=str(name).strip(),
                    lingpao_region=_str_or_none(row.get("lingpao_region")),
                    province=_str_or_none(row.get("province")),
                    city=_str_or_none(row.get("city")),
                    is_lingpao=_str_or_none(row.get("is_lingpao")),
                    store_manager=_str_or_none(row.get("store_manager")),
                )
                db.add(mapping)
                inserted += 1

    return {"inserted": inserted, "columns_detected": len(cols)}


def _build_field_map(excel_columns: list[str]) -> dict[str, str]:
    """Map Excel headers to store_mapping fields."""
    mapping = {}
    for col in excel_columns:
        if "商户名称" in col or col == "商户名称":
            mapping[col] = "merchant_name"
        elif "大区" in col:
            mapping[col] = "lingpao_region"
        elif col == "省" or "省" in col:
            mapping[col] = "province"
        elif col == "市" or "市" in col:
            mapping[col] = "city"
        elif "零跑" in col and "是否" in col:
            mapping[col] = "is_lingpao"
        elif "总经理" in col or "门店总经理" in col:
            mapping[col] = "store_manager"
    return mapping


async def get_unmatched_merchants(db: AsyncSession) -> dict:
    """Find merchants in leads that don't have a store mapping."""
    # Get all distinct merchants from leads
    stmt = select(func.distinct(Lead.merchant_name)).where(
        Lead.merchant_name.isnot(None), Lead.merchant_name != ""
    )
    result = await db.execute(stmt)
    lead_merchants = [r[0] for r in result.all() if r[0]]

    # Get all mapped merchants
    stmt2 = select(StoreMapping.merchant_name)
    result2 = await db.execute(stmt2)
    mapped = {r[0] for r in result2.all() if r[0]}

    unmatched = [m for m in lead_merchants if m not in mapped]
    coverage = (len(lead_merchants) - len(unmatched)) / len(lead_merchants) if lead_merchants else 1.0

    return {
        "total_merchants": len(lead_merchants),
        "mapped_merchants": len(lead_merchants) - len(unmatched),
        "unmatched_merchants": unmatched,
        "coverage": round(coverage, 4),
    }


async def list_all_mappings(db: AsyncSession) -> list[dict]:
    """List all store mappings."""
    stmt = select(StoreMapping).order_by(StoreMapping.merchant_name)
    result = await db.execute(stmt)
    return [_row_to_dict(r) for r in result.scalars().all()]


async def upsert_mapping(db: AsyncSession, data: dict) -> dict:
    """Insert or update a single store mapping."""
    stmt = select(StoreMapping).where(StoreMapping.merchant_name == data["merchant_name"])
    existing = (await db.execute(stmt)).scalar_one_or_none()

    if existing:
        existing.lingpao_region = data.get("lingpao_region", existing.lingpao_region)
        existing.province = data.get("province", existing.province)
        existing.city = data.get("city", existing.city)
        existing.is_lingpao = data.get("is_lingpao", existing.is_lingpao)
        existing.store_manager = data.get("store_manager", existing.store_manager)
    else:
        mapping = StoreMapping(
            merchant_name=data["merchant_name"],
            lingpao_region=data.get("lingpao_region"),
            province=data.get("province"),
            city=data.get("city"),
            is_lingpao=data.get("is_lingpao"),
            store_manager=data.get("store_manager"),
        )
        db.add(mapping)

    await db.commit()
    return {"ok": True, "merchant_name": data["merchant_name"]}


async def batch_upsert_mappings(db: AsyncSession, items: list[dict]) -> dict:
    """Batch insert or update store mappings."""
    updated = 0
    for item in items:
        await upsert_mapping(db, item)
        updated += 1
    return {"updated": updated}


def _row_to_dict(row: StoreMapping) -> dict:
    return {
        "id": row.id,
        "merchant_name": row.merchant_name,
        "lingpao_region": row.lingpao_region,
        "province": row.province,
        "city": row.city,
        "is_lingpao": row.is_lingpao,
        "store_manager": row.store_manager,
    }


def _str_or_none(val) -> str | None:
    if val is None or val == "":
        return None
    return str(val).strip()[:500]
