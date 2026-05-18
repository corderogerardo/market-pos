import uuid
from typing import List, Optional
from datetime import datetime
from zoneinfo import ZoneInfo

VE_TZ = ZoneInfo("America/Caracas")
from sqlalchemy import String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Deuda(Base):
    __tablename__ = "deudas"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    nombre_cliente: Mapped[str] = mapped_column(String, nullable=False)
    nota: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(VE_TZ))
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(VE_TZ), onupdate=lambda: datetime.now(VE_TZ)
    )

    items: Mapped[List["DeudaItem"]] = relationship(
        "DeudaItem", back_populates="deuda", cascade="all, delete-orphan"
    )

    @property
    def total_usd(self) -> float:
        return round(sum(i.subtotal for i in self.items), 2)


class DeudaItem(Base):
    __tablename__ = "deuda_items"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    deuda_id: Mapped[str] = mapped_column(String, ForeignKey("deudas.id"), nullable=False)
    producto_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    nombre_producto: Mapped[str] = mapped_column(String, nullable=False)
    cantidad: Mapped[float] = mapped_column(Float, nullable=False)
    precio_unitario: Mapped[float] = mapped_column(Float, nullable=False)
    subtotal: Mapped[float] = mapped_column(Float, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(VE_TZ))

    deuda: Mapped["Deuda"] = relationship("Deuda", back_populates="items")
