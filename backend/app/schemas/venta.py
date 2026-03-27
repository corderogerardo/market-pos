from typing import List, Dict
from pydantic import BaseModel
from datetime import datetime
from enum import Enum


class MetodoPago(str, Enum):
    efectivo = "efectivo"
    pago_movil = "pago_movil"
    punto_de_venta = "punto_de_venta"


class VentaItemCreate(BaseModel):
    producto_id: str
    cantidad: float


class VentaCreate(BaseModel):
    items: List[VentaItemCreate]
    metodo_pago: MetodoPago
    tasa_bcv: float


class VentaItemResponse(BaseModel):
    id: str
    producto_id: str
    nombre_producto: str
    cantidad: float
    precio_unitario: float
    subtotal: float

    model_config = {"from_attributes": True}


class VentaResponse(BaseModel):
    id: str
    fecha: datetime
    total_usd: float
    tasa_bcv: float
    total_bs: float
    metodo_pago: MetodoPago
    items: List[VentaItemResponse]

    model_config = {"from_attributes": True}


class ResumenDiario(BaseModel):
    fecha: str
    total_ventas: int
    total_usd: float
    total_bs: float
    por_metodo_pago: Dict[str, Dict[str, float]]


class ResumenMensual(BaseModel):
    mes: str
    total_ventas: int
    total_usd: float
    total_bs: float
    por_metodo_pago: Dict[str, Dict[str, float]]
