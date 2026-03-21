from pydantic import BaseModel
from datetime import datetime


class TasaBCVResponse(BaseModel):
    id: str
    fecha: str
    tasa: float
    consultado_en: datetime

    model_config = {"from_attributes": True}


class TasaBCVManual(BaseModel):
    tasa: float
