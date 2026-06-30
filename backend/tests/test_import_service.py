import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.database import Base
from app.models.lead import Lead
from app.models.upload import UploadBatch
from app.services.import_service import _utcnow_naive, import_from_excel


class ImportReplacementTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        self.sessions = async_sessionmaker(self.engine, expire_on_commit=False)
        async with self.engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)

    async def asyncTearDown(self):
        await self.engine.dispose()

    async def test_successful_import_replaces_previous_dataset(self):
        async with self.sessions() as db:
            db.add(Lead(batch_id="old-batch", source_id="old-row"))
            await db.commit()

            with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as file:
                filepath = file.name

            try:
                with (
                    patch(
                        "app.services.import_service.assemble_file",
                        return_value=(filepath, "replacement.xlsx"),
                    ),
                    patch(
                        "app.services.import_service.stream_excel_rows",
                        return_value=iter([[{"source_id": "new-row"}]]),
                    ),
                    patch("app.services.import_service.validate_row", return_value=[]),
                    patch("app.services.import_service.cleanup_upload"),
                ):
                    result = await import_from_excel(db, "upload-id", {})

                rows = (await db.execute(select(Lead))).scalars().all()
                self.assertEqual(result["valid_rows"], 1)
                self.assertEqual(len(rows), 1)
                self.assertEqual(rows[0].source_id, "new-row")
                self.assertEqual(rows[0].batch_id, result["batch_id"])
                batch = await db.get(UploadBatch, result["batch_id"])
                self.assertIsNotNone(batch.completed_at)
                self.assertIsNone(batch.completed_at.tzinfo)
            finally:
                Path(filepath).unlink(missing_ok=True)

    async def test_failed_import_preserves_previous_dataset(self):
        async with self.sessions() as db:
            db.add(Lead(batch_id="old-batch", source_id="old-row"))
            await db.commit()

            with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as file:
                filepath = file.name

            try:
                with (
                    patch(
                        "app.services.import_service.assemble_file",
                        return_value=(filepath, "broken.xlsx"),
                    ),
                    patch(
                        "app.services.import_service.stream_excel_rows",
                        side_effect=RuntimeError("parse failed"),
                    ),
                    patch("app.services.import_service.cleanup_upload"),
                ):
                    with self.assertRaisesRegex(RuntimeError, "parse failed"):
                        await import_from_excel(db, "upload-id", {})

                count = await db.scalar(select(func.count()).select_from(Lead))
                old_row = (await db.execute(select(Lead))).scalar_one()
                self.assertEqual(count, 1)
                self.assertEqual(old_row.source_id, "old-row")
            finally:
                Path(filepath).unlink(missing_ok=True)

    async def test_import_without_valid_rows_preserves_previous_dataset(self):
        async with self.sessions() as db:
            db.add(Lead(batch_id="old-batch", source_id="old-row"))
            await db.commit()

            with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as file:
                filepath = file.name

            try:
                with (
                    patch(
                        "app.services.import_service.assemble_file",
                        return_value=(filepath, "empty.xlsx"),
                    ),
                    patch(
                        "app.services.import_service.stream_excel_rows",
                        return_value=iter([]),
                    ),
                    patch("app.services.import_service.cleanup_upload"),
                ):
                    with self.assertRaisesRegex(ValueError, "没有可导入的有效数据"):
                        await import_from_excel(db, "upload-id", {})

                old_row = (await db.execute(select(Lead))).scalar_one()
                self.assertEqual(old_row.source_id, "old-row")
            finally:
                Path(filepath).unlink(missing_ok=True)

    def test_utcnow_is_timezone_naive_for_database_compatibility(self):
        self.assertIsNone(_utcnow_naive().tzinfo)


if __name__ == "__main__":
    unittest.main()
