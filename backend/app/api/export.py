"""Data export API."""

import json
from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.export_service import export_csv, export_excel

router = APIRouter(prefix="/api/export", tags=["export"])


@router.post("/data")
async def export_data(
    db: AsyncSession = Depends(get_db),
    format: str = Query("excel", description="excel or csv"),
    columns: str | None = Query(None, description="Comma-separated column names"),
    filters: str | None = Query(None),
    filter_logic: str = Query("AND"),
    start_date: date | None = None,
    end_date: date | None = None,
):
    """Export filtered data as Excel or CSV file."""
    filter_list = json.loads(filters) if filters else []
    col_list = [c.strip() for c in columns.split(",")] if columns else None

    if format == "csv":
        output = await export_csv(db, col_list, filter_list, filter_logic, start_date, end_date)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": "attachment; filename=export.csv"},
        )
    else:
        output = await export_excel(db, col_list, filter_list, filter_logic, start_date, end_date)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=export.xlsx"},
        )
