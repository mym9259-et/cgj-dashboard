from datetime import datetime

from pydantic import BaseModel


class FilterPresetCreate(BaseModel):
    name: str
    config_json: dict


class FilterPresetRead(BaseModel):
    id: int
    name: str
    config_json: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
