from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import license_service

router = APIRouter()


class ActivarRequest(BaseModel):
    clave: str


@router.get("/estado")
def estado():
    """Estado de la licencia. Siempre responde (la pantalla de activación
    lo necesita aunque no haya licencia)."""
    return license_service.estado()


@router.post("/activar")
def activar(req: ActivarRequest):
    res = license_service.verificar_clave(req.clave)
    if not res["valida"]:
        raise HTTPException(status_code=400, detail=res["motivo"])
    license_service.guardar_licencia(req.clave)
    return license_service.estado()
