import uuid
from typing import Optional
from datetime import datetime, timezone
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
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    actualizado_en: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
