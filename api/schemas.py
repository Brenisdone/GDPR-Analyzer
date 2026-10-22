from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field


class ScanCreate(BaseModel):
    target: str = Field(min_length=4, max_length=2048)


class ScanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    target: str
    created_at: datetime
    status: str
    grade: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class ScanHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    target: str
    created_at: datetime
    status: str
    grade: Optional[str] = None