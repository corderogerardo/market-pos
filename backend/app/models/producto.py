import uuid
from typing import Optional
from datetime import datetime
from zoneinfo import ZoneInfo

VE_TZ = ZoneInfo("America/Caracas")
from sqlalchemy import String, Float, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Producto(Base):
    __tablename__ = "productos"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    nombre: Mapped[str] = mapped_column(String, nullable=False)
    precio: Mapped[float] = mapped_column(Float, nullable=False)
    peso: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    unidad: Mapped[str] = mapped_column(String, default="kg")
    qr_code: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True)
    categoria: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    tipo_venta: Mapped[str] = mapped_column(String, default="peso")  # "peso" or "unidad"
    inventario: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(VE_TZ))
    actualizado_en: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(VE_TZ), onupdate=lambda: datetime.now(VE_TZ))
