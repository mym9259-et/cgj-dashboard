"""Seed the database with Sample.xlsx data for development."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import asyncio
from app.config import settings
from app.services.import_service import preview_excel, import_from_excel
from app.database import async_session, init_db, engine
from app.utils.column_matcher import suggest_mappings
from app.utils.excel_parser import read_excel_preview, read_excel_headers


async def seed():
    await init_db()

    sample_path = os.path.join(os.path.dirname(__file__), "..", "..", "Sample.xlsx")
    sample_path = os.path.abspath(sample_path)

    if not os.path.exists(sample_path):
        print(f"Sample file not found: {sample_path}")
        return

    print(f"Reading: {sample_path}")

    # Get preview and auto-mapping
    preview = read_excel_preview(sample_path, 10)
    headers = [col["header"] for col in preview["columns"]]
    mapping = suggest_mappings(headers)

    print(f"Columns: {len(headers)}")
    print(f"Mapped: {len(mapping)}/{len(headers)}")

    # Show mapping
    for h in headers:
        if h in mapping:
            print(f"  {h} -> {mapping[h]}")
        else:
            print(f"  {h} -> (未匹配)")

    # Import
    upload_id = "seed_upload"
    async with async_session() as db:
        try:
            result = await import_from_excel(db, upload_id, mapping)
            print(f"\nImport complete: {result['total_rows']} rows, {result['valid_rows']} valid, {result['error_rows']} errors")
            if result["errors"]:
                print(f"First 5 errors:")
                for err in result["errors"][:5]:
                    print(f"  Row {err['row']}: {err['errors']}")
        except Exception as e:
            print(f"Import failed: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(seed())
