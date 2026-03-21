from __future__ import annotations
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.producto import Producto
from app.schemas.producto import ProductoCreate, ProductoUpdate, ProductoResponse

router = APIRouter()


@router.post("/", response_model=ProductoResponse)
def crear_producto(producto: ProductoCreate, db: Session = Depends(get_db)):
    if producto.qr_code:
        existente = db.query(Producto).filter(Producto.qr_code == producto.qr_code).first()
        if existente:
            raise HTTPException(status_code=400, detail="Ya existe un producto con ese código QR")

    db_producto = Producto(**producto.model_dump())
    db.add(db_producto)
    db.commit()
    db.refresh(db_producto)
    return db_producto


@router.get("/", response_model=List[ProductoResponse])
def listar_productos(
    activo: Optional[bool] = None,
    categoria: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Producto)
    if activo is not None:
        query = query.filter(Producto.activo == activo)
    if categoria:
        query = query.filter(Producto.categoria == categoria)
    return query.order_by(Producto.nombre).all()


@router.get("/buscar", response_model=List[ProductoResponse])
def buscar_productos(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    return (
        db.query(Producto)
        .filter(
            Producto.activo == True,  # noqa: E712
            (Producto.nombre.ilike("%{}%".format(q))) | (Producto.qr_code == q),
        )
        .order_by(Producto.nombre)
        .all()
    )


@router.get("/qr/{qr_code}", response_model=ProductoResponse)
def buscar_por_qr(qr_code: str, db: Session = Depends(get_db)):
    producto = db.query(Producto).filter(Producto.qr_code == qr_code, Producto.activo == True).first()  # noqa: E712
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto


@router.get("/{producto_id}", response_model=ProductoResponse)
def obtener_producto(producto_id: str, db: Session = Depends(get_db)):
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto


@router.put("/{producto_id}", response_model=ProductoResponse)
def actualizar_producto(producto_id: str, datos: ProductoUpdate, db: Session = Depends(get_db)):
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    update_data = datos.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(producto, key, value)

    db.commit()
    db.refresh(producto)
    return producto


@router.delete("/{producto_id}")
def eliminar_producto(producto_id: str, db: Session = Depends(get_db)):
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    producto.activo = False
    db.commit()
    return {"mensaje": "Producto desactivado"}
