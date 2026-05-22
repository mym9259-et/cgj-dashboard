"""Core import pipeline: parse Excel, validate, truncate, bulk insert."""

import uuid
from datetime import datetime
from pathlib import Path

from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.lead import Lead
from app.models.upload import UploadBatch
from app.services.upload_service import assemble_file, cleanup_upload
from app.utils.excel_parser import read_excel_preview, stream_excel_rows
from app.utils.column_matcher import suggest_mappings
from app.utils.validators import validate_row


async def preview_excel(filepath: str, preview_rows: int = 10) -> dict:
    """Read Excel headers and sample data for preview, with auto-mapping suggestions."""
    preview = read_excel_preview(filepath, preview_rows)

    headers = [col["header"] for col in preview["columns"]]
    suggestions = suggest_mappings(headers)

    # Detect issues
    issues: list[str] = []
    for col in preview["columns"]:
        header = col["header"]
        if header in suggestions:
            continue
        # Check if any sample value looks like a date serial number
        for sv in col["sample_values"]:
            if isinstance(sv, (int, float)) and 40000 < sv < 60000:
                issues.append(f"列 '{header}' 可能包含 Excel 日期序列号，请确认映射后类型正确")
                break

    return {
        "columns": preview["columns"],
        "suggested_mappings": suggestions,
        "total_rows": preview["total_rows"],
        "detected_issues": issues,
    }


async def import_from_excel(
    db: AsyncSession,
    upload_id: str,
    mapping: dict[str, str],
    background_tasks=None,
) -> dict:
    """Run the full import pipeline. Returns summary dict."""
    import logging
    logger = logging.getLogger("import")

    batch_id = str(uuid.uuid4())
    filepath, filename = assemble_file(upload_id)
    file_size = Path(filepath).stat().st_size
    logger.info(f"Assembled file: {filepath}, size={file_size}, mapping={len(mapping)} keys")

    # Create batch record
    batch = UploadBatch(
        id=batch_id,
        filename=filename,
        file_size=file_size,
        status="parsing",
    )
    db.add(batch)
    await db.commit()

    try:
        # Stream parse and import
        total_rows = 0
        valid_rows = 0
        error_rows = 0
        all_errors: list[dict] = []

        row_gen = stream_excel_rows(filepath, mapping, settings.batch_insert_size)
        for row_batch in row_gen:
            batch_size = len(row_batch)
            total_rows += batch_size

            # Validate each row
            valid_batch: list[dict] = []
            for i, row in enumerate(row_batch):
                row_num = total_rows - batch_size + i + 2  # +2 for header + 1-based
                row_errors = validate_row(row, row_num)
                if row_errors:
                    error_rows += 1
                    all_errors.extend([{"row": row_num, "errors": row_errors}])
                else:
                    valid_rows += 1
                    valid_batch.append(row)

            # Bulk insert valid rows
            if valid_batch:
                await _bulk_insert_leads(db, batch_id, valid_batch)

        # Update batch record
        batch.row_count = total_rows
        batch.valid_count = valid_rows
        batch.error_count = error_rows
        batch.status = "completed"
        batch.completed_at = datetime.utcnow()
        if all_errors:
            batch.error_log = {"errors": all_errors[:1000]}  # Cap error log size
        await db.commit()

        # Refresh materialized view if it exists
        await _refresh_materialized_view(db)

        # Cleanup temp files
        cleanup_upload(upload_id)

        return {
            "batch_id": str(batch_id),
            "total_rows": total_rows,
            "valid_rows": valid_rows,
            "error_rows": error_rows,
            "errors": all_errors[:100],
        }

    except Exception as e:
        batch.status = "failed"
        batch.error_log = {"message": str(e)}
        await db.commit()
        raise


async def _bulk_insert_leads(db: AsyncSession, batch_id: str, rows: list[dict]):
    """Insert a batch of mapped rows into the leads table."""
    # Use raw SQL insert for performance
    inserts = []
    for row in rows:
        extra_data = row.pop("_extra", None)
        if extra_data is None:
            extra_data = {}
        inserts.append({
            "batch_id": batch_id,
            "source_id": _str_or_none(row.get("source_id")),
            "merchant_name": _str_or_none(row.get("merchant_name")),
            "customer_source": _str_or_none(row.get("customer_source")),
            "customer_name": _str_or_none(row.get("customer_name")),
            "customer_phone": _str_or_none(row.get("customer_phone")),
            "gender": _str_or_none(row.get("gender")),
            "age_group": _str_or_none(row.get("age_group")),
            "residence": _str_or_none(row.get("residence")),
            "occupation": _str_or_none(row.get("occupation")),
            "brand": _str_or_none(row.get("brand")),
            "model_series": _str_or_none(row.get("model_series")),
            "vin": _str_or_none(row.get("vin")),
            "fuel_type": _str_or_none(row.get("fuel_type")),
            "payment_method": _str_or_none(row.get("payment_method")),
            "owner_type": _str_or_none(row.get("owner_type")),
            "usage_scenario": _str_or_none(row.get("usage_scenario")),
            "customer_type": _str_or_none(row.get("customer_type")),
            "salesperson": _str_or_none(row.get("salesperson")),
            "referrer": _str_or_none(row.get("referrer")),
            "create_method": _str_or_none(row.get("create_method")),
            "creator_nick": _str_or_none(row.get("creator_nick")),
            "create_time": _datetime_or_none(row.get("create_time")),
            "update_time": _datetime_or_none(row.get("update_time")),
            "contact_status": _str_or_none(row.get("contact_status")),
            "no_contact_reason": _str_or_none(row.get("no_contact_reason")),
            "no_contact_note": _str_or_none(row.get("no_contact_note")),
            "delivery_date": _date_or_none(row.get("delivery_date")),
            "product_source": _str_or_none(row.get("product_source")),
            "product_type": _str_or_none(row.get("product_type")),
            "product_name": _str_or_none(row.get("product_name")),
            "product_years": _str_or_none(row.get("product_years")),
            "deal_status": _str_or_none(row.get("deal_status")),
            "deal_date": _date_or_none(row.get("deal_date")),
            "deal_amount": _float_or_none(row.get("deal_amount")),
            "no_deal_reason": _str_or_none(row.get("no_deal_reason")),
            "no_deal_note": _str_or_none(row.get("no_deal_note")),
            "refund_date": _date_or_none(row.get("refund_date")),
            "refund_amount": _float_or_none(row.get("refund_amount")),
            "referral_bonus_status": _str_or_none(row.get("referral_bonus_status")),
            "referral_bonus_amount": _float_or_none(row.get("referral_bonus_amount")),
            "referral_bonus": _float_or_none(row.get("referral_bonus")),
            "is_gifted": _str_or_none(row.get("is_gifted")),
            "gift_name": _str_or_none(row.get("gift_name")),
            "is_abnormal": _str_or_none(row.get("is_abnormal")),
            "abnormal_info": _str_or_none(row.get("abnormal_info")),
            "is_store_product": _str_or_none(row.get("is_store_product")),
            "order_screenshot": _str_or_none(row.get("order_screenshot")),
            "order_screenshot_ocr": _str_or_none(row.get("order_screenshot_ocr")),
            "rights_screenshot": _str_or_none(row.get("rights_screenshot")),
            "rights_screenshot_ocr": _str_or_none(row.get("rights_screenshot_ocr")),
            "sales_recording": _str_or_none(row.get("sales_recording")),
            "handover_doc": _str_or_none(row.get("handover_doc")),
            "related_order": _str_or_none(row.get("related_order")),
            "extra_fields": extra_data if extra_data else None,
        })

    # Insert using ORM bulk insert for compatibility with both SQLite and PostgreSQL
    leads = []
    for item in inserts:
        leads.append(Lead(
            batch_id=item["batch_id"],
            source_id=item.get("source_id"),
            merchant_name=item.get("merchant_name"),
            customer_source=item.get("customer_source"),
            customer_name=item.get("customer_name"),
            customer_phone=item.get("customer_phone"),
            gender=item.get("gender"),
            age_group=item.get("age_group"),
            residence=item.get("residence"),
            occupation=item.get("occupation"),
            brand=item.get("brand"),
            model_series=item.get("model_series"),
            vin=item.get("vin"),
            fuel_type=item.get("fuel_type"),
            payment_method=item.get("payment_method"),
            owner_type=item.get("owner_type"),
            usage_scenario=item.get("usage_scenario"),
            customer_type=item.get("customer_type"),
            salesperson=item.get("salesperson"),
            referrer=item.get("referrer"),
            create_method=item.get("create_method"),
            creator_nick=item.get("creator_nick"),
            create_time=item.get("create_time"),
            update_time=item.get("update_time"),
            contact_status=item.get("contact_status"),
            no_contact_reason=item.get("no_contact_reason"),
            no_contact_note=item.get("no_contact_note"),
            delivery_date=item.get("delivery_date"),
            product_source=item.get("product_source"),
            product_type=item.get("product_type"),
            product_name=item.get("product_name"),
            product_years=item.get("product_years"),
            deal_status=item.get("deal_status"),
            deal_date=item.get("deal_date"),
            deal_amount=item.get("deal_amount"),
            no_deal_reason=item.get("no_deal_reason"),
            no_deal_note=item.get("no_deal_note"),
            refund_date=item.get("refund_date"),
            refund_amount=item.get("refund_amount"),
            referral_bonus_status=item.get("referral_bonus_status"),
            referral_bonus_amount=item.get("referral_bonus_amount"),
            referral_bonus=item.get("referral_bonus"),
            is_gifted=item.get("is_gifted"),
            gift_name=item.get("gift_name"),
            is_abnormal=item.get("is_abnormal"),
            abnormal_info=item.get("abnormal_info"),
            is_store_product=item.get("is_store_product"),
            order_screenshot=item.get("order_screenshot"),
            order_screenshot_ocr=item.get("order_screenshot_ocr"),
            rights_screenshot=item.get("rights_screenshot"),
            rights_screenshot_ocr=item.get("rights_screenshot_ocr"),
            sales_recording=item.get("sales_recording"),
            handover_doc=item.get("handover_doc"),
            related_order=item.get("related_order"),
            extra_fields=item.get("extra_fields"),
        ))
    db.add_all(leads)
    await db.commit()


async def truncate_leads(db: AsyncSession):
    """Truncate the leads table before new import."""
    await db.execute(delete(Lead))
    await db.commit()


async def _refresh_materialized_view(db: AsyncSession):
    """Refresh materialized views if they exist."""
    try:
        await db.execute(text("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_summary"))
        await db.commit()
    except Exception:
        pass  # View may not exist yet


# Helper converters
def _str_or_none(val) -> str | None:
    if val is None or val == "":
        return None
    return str(val).strip()[:500]


def _float_or_none(val) -> float | None:
    if val is None or val == "" or val == "-":
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _date_or_none(val) -> datetime | None:
    from datetime import date as date_type
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    if isinstance(val, date_type):
        return datetime.combine(val, datetime.min.time())
    if isinstance(val, str):
        val = val.strip()
        if not val or val == "-":
            return None
        for fmt in ["%Y-%m-%dT%H:%M:%S", "%Y-%m-%d", "%Y/%m/%d", "%Y-%m-%d %H:%M:%S"]:
            try:
                return datetime.strptime(val, fmt)
            except ValueError:
                continue
    return None


def _datetime_or_none(val) -> datetime | None:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    from datetime import date as date_type
    if isinstance(val, date_type):
        return datetime.combine(val, datetime.min.time())
    if isinstance(val, str):
        val = val.strip()
        if not val or val == "-":
            return None
        for fmt in ["%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M:%S", "%Y-%m-%d", "%Y/%m/%d"]:
            try:
                return datetime.strptime(val, fmt)
            except ValueError:
                continue
    return None
