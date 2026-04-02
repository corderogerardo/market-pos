import uuid
from typing import Optional
from datetime import datetime
from zoneinfo import ZoneInfo

VE_TZ = ZoneInfo("America/Caracas")
from sqlalchemy import String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Sincronizacion(Base):
    __tablename__ = "sincronizaciones"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    fecha: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(VE_TZ))
    estado: Mapped[str] = mapped_column(String, nullable=False)
    detalles: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
