from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.tasa_bcv import TasaBCV
from app.schemas.tasa_bcv import TasaBCVResponse, TasaBCVManual
from app.services.bcv_service import obtener_tasa_bcv

router = APIRouter()


@router.get("/", response_model=TasaBCVResponse)
def tasa_actual(db: Session = Depends(get_db)):
    tasa = db.query(TasaBCV).order_by(TasaBCV.consultado_en.desc()).first()
    if not tasa:
        raise HTTPException(status_code=404, detail="No hay tasa BCV registrada")
    return tasa


@router.post("/actualizar", response_model=TasaBCVResponse)
async def actualizar_tasa(db: Session = Depends(get_db)):
    resultado = await obtener_tasa_bcv()
    if not resultado:
        raise HTTPException(status_code=503, detail="No se pudo obtener la tasa del BCV")

    nueva_tasa = TasaBCV(fecha=resultado["fecha"], tasa=resultado["tasa"])
    db.add(nueva_tasa)
    db.commit()
    db.refresh(nueva_tasa)
    return nueva_tasa


@router.post("/manual", response_model=TasaBCVResponse)
def registrar_tasa_manual(datos: TasaBCVManual, db: Session = Depends(get_db)):
    from datetime import date

    nueva_tasa = TasaBCV(fecha=date.today().isoformat(), tasa=datos.tasa)
    db.add(nueva_tasa)
    db.commit()
    db.refresh(nueva_tasa)
    return nueva_tasa


@router.get("/historial", response_model=List[TasaBCVResponse])
def historial_tasas(limit: int = 30, db: Session = Depends(get_db)):
    return db.query(TasaBCV).order_by(TasaBCV.consultado_en.desc()).limit(limit).all()
