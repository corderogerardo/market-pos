from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class SyncResponse(BaseModel):
    id: str
    fecha: datetime
    estado: str
    detalles: Optional[str]

    model_config = {"from_attributes": True}
