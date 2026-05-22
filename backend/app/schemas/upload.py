import uuid
from datetime import datetime

from pydantic import BaseModel


class PreviewResponse(BaseModel):
    columns: list[dict]  # [{index, header, sample_values: [...]}]
    suggested_mappings: dict[str, str]  # {excel_col: system_field}
    total_rows: int | None = None
    file_size: int | None = None
    detected_issues: list[str] = []


class ChunkUploadRequest(BaseModel):
    upload_id: str
    chunk_index: int
    total_chunks: int
    filename: str


class ImportRequest(BaseModel):
    upload_id: str
    mapping: dict[str, str]  # {ExcelColName: system_field_name}


class MappingSchema(BaseModel):
    name: str
    mapping_json: dict[str, str]

    model_config = {"from_attributes": True}


class MappingRead(BaseModel):
    id: int
    name: str
    mapping_json: dict[str, str]
    created_at: datetime

    model_config = {"from_attributes": True}


class UploadStatusResponse(BaseModel):
    batch_id: uuid.UUID | None = None
    status: str
    progress_pct: int = 0
    rows_processed: int = 0
    total_rows: int = 0
    error_count: int = 0
    errors: list[dict] = []


class UploadHistoryItem(BaseModel):
    batch_id: uuid.UUID
    filename: str
    row_count: int | None
    valid_count: int | None
    error_count: int | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
