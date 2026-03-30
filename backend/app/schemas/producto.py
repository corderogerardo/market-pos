from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class ProductoBase(BaseModel):
    nombre: str
    precio: float
    peso: Optional[float] = None
    unidad: str = "kg"
    qr_code: Optional[str] = None
    categoria: Optional[str] = None
    tipo_venta: str = "peso"
    inventario: Optional[float] = None


class ProductoCreate(ProductoBase):
    pass


class ProductoUpdate(BaseModel):
    nombre: Optional[str] = None
    precio: Optional[float] = None
    peso: Optional[float] = None
    unidad: Optional[str] = None
    qr_code: Optional[str] = None
    categoria: Optional[str] = None
    tipo_venta: Optional[str] = None
    inventario: Optional[float] = None
    activo: Optional[bool] = None


class ProductoResponse(ProductoBase):
    id: str
    activo: bool
    creado_en: datetime
    actualizado_en: datetime

    model_config = {"from_attributes": True}
