import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

VE_TZ = ZoneInfo("America/Caracas")
from sqlalchemy import String, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class TasaBCV(Base):
    __tablename__ = "tasa_bcv"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    fecha: Mapped[str] = mapped_column(String, nullable=False)
    tasa: Mapped[float] = mapped_column(Float, nullable=False)
    consultado_en: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(VE_TZ))
