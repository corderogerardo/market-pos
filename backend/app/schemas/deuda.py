from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.schemas.venta import MetodoPago


class DeudaItemCreate(BaseModel):
    producto_id: Optional[str] = None
    nombre_producto: str
    cantidad: float
    precio_unitario: float


class DeudaCreate(BaseModel):
    nombre_cliente: str
    nota: Optional[str] = None
    items: List[DeudaItemCreate] = []


class DeudaUpdate(BaseModel):
    nombre_cliente: Optional[str] = None
    nota: Optional[str] = None


class SaldarDeudaRequest(BaseModel):
    metodo_pago: MetodoPago
    tasa_bcv: float


class DeudaItemResponse(BaseModel):
    id: str
    producto_id: Optional[str] = None
    nombre_producto: str
    cantidad: float
    precio_unitario: float
    subtotal: float
    creado_en: datetime

    model_config = {"from_attributes": True}


class DeudaResponse(BaseModel):
    id: str
    nombre_cliente: str
    nota: Optional[str] = None
    creado_en: datetime
    actualizado_en: datetime
    total_usd: float
    items: List[DeudaItemResponse]

    model_config = {"from_attributes": True}
