import uuid
from typing import List
from datetime import datetime
from zoneinfo import ZoneInfo

VE_TZ = ZoneInfo("America/Caracas")
from sqlalchemy import String, Float, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

METODOS_PAGO = ("efectivo", "pago_movil", "punto_de_venta")


class Venta(Base):
    __tablename__ = "ventas"
    __table_args__ = (
        CheckConstraint(
            "metodo_pago IN ('efectivo', 'pago_movil', 'punto_de_venta')",
            name="check_metodo_pago",
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    fecha: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(VE_TZ))
    total_usd: Mapped[float] = mapped_column(Float, nullable=False)
    tasa_bcv: Mapped[float] = mapped_column(Float, nullable=False)
    total_bs: Mapped[float] = mapped_column(Float, nullable=False)
    metodo_pago: Mapped[str] = mapped_column(String, nullable=False)

    items: Mapped[List["VentaItem"]] = relationship("VentaItem", back_populates="venta", cascade="all, delete-orphan")


class VentaItem(Base):
    __tablename__ = "venta_items"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    venta_id: Mapped[str] = mapped_column(String, ForeignKey("ventas.id"), nullable=False)
    producto_id: Mapped[str] = mapped_column(String, ForeignKey("productos.id"), nullable=False)
    nombre_producto: Mapped[str] = mapped_column(String, nullable=False, default="")
    cantidad: Mapped[float] = mapped_column(Float, nullable=False)
    precio_unitario: Mapped[float] = mapped_column(Float, nullable=False)
    subtotal: Mapped[float] = mapped_column(Float, nullable=False)

    venta: Mapped["Venta"] = relationship("Venta", back_populates="items")
