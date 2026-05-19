from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.deuda import Deuda, DeudaItem
from app.models.producto import Producto
from app.models.venta import Venta, VentaItem
from app.schemas.deuda import (
    DeudaCreate,
    DeudaUpdate,
    DeudaItemCreate,
    DeudaResponse,
    SaldarDeudaRequest,
)
from app.schemas.venta import VentaResponse

router = APIRouter()


def _build_item(item_data: DeudaItemCreate) -> DeudaItem:
    if item_data.cantidad <= 0:
        raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a cero")
    if item_data.precio_unitario < 0:
        raise HTTPException(status_code=400, detail="El precio no puede ser negativo")
    return DeudaItem(
        producto_id=item_data.producto_id,
        nombre_producto=item_data.nombre_producto,
        cantidad=item_data.cantidad,
        precio_unitario=item_data.precio_unitario,
        subtotal=round(item_data.precio_unitario * item_data.cantidad, 2),
    )


@router.post("/", response_model=DeudaResponse)
def crear_deuda(deuda_data: DeudaCreate, db: Session = Depends(get_db)):
    if not deuda_data.nombre_cliente.strip():
        raise HTTPException(status_code=400, detail="El nombre del cliente es obligatorio")

    deuda = Deuda(
        nombre_cliente=deuda_data.nombre_cliente.strip(),
        nota=deuda_data.nota,
        items=[_build_item(i) for i in deuda_data.items],
    )
    db.add(deuda)
    db.commit()
    db.refresh(deuda)
    return deuda


@router.get("/", response_model=List[DeudaResponse])
def listar_deudas(
    q: Optional[str] = Query(None, description="Buscar por nombre del cliente"),
    db: Session = Depends(get_db),
):
    query = db.query(Deuda)
    if q:
        query = query.filter(Deuda.nombre_cliente.ilike("%{}%".format(q)))
    return query.order_by(Deuda.actualizado_en.desc()).all()


@router.get("/{deuda_id}", response_model=DeudaResponse)
def obtener_deuda(deuda_id: str, db: Session = Depends(get_db)):
    deuda = db.query(Deuda).filter(Deuda.id == deuda_id).first()
    if not deuda:
        raise HTTPException(status_code=404, detail="Deuda no encontrada")
    return deuda


@router.put("/{deuda_id}", response_model=DeudaResponse)
def actualizar_deuda(deuda_id: str, datos: DeudaUpdate, db: Session = Depends(get_db)):
    deuda = db.query(Deuda).filter(Deuda.id == deuda_id).first()
    if not deuda:
        raise HTTPException(status_code=404, detail="Deuda no encontrada")

    update_data = datos.model_dump(exclude_unset=True)
    if "nombre_cliente" in update_data:
        nombre = (update_data["nombre_cliente"] or "").strip()
        if not nombre:
            raise HTTPException(status_code=400, detail="El nombre del cliente es obligatorio")
        deuda.nombre_cliente = nombre
    if "nota" in update_data:
        deuda.nota = update_data["nota"]

    db.commit()
    db.refresh(deuda)
    return deuda


@router.post("/{deuda_id}/items", response_model=DeudaResponse)
def agregar_item(deuda_id: str, item_data: DeudaItemCreate, db: Session = Depends(get_db)):
    deuda = db.query(Deuda).filter(Deuda.id == deuda_id).first()
    if not deuda:
        raise HTTPException(status_code=404, detail="Deuda no encontrada")

    item = _build_item(item_data)
    deuda.items.append(item)
    db.commit()
    db.refresh(deuda)
    return deuda


@router.delete("/{deuda_id}/items/{item_id}", response_model=DeudaResponse)
def eliminar_item(deuda_id: str, item_id: str, db: Session = Depends(get_db)):
    deuda = db.query(Deuda).filter(Deuda.id == deuda_id).first()
    if not deuda:
        raise HTTPException(status_code=404, detail="Deuda no encontrada")

    item = (
        db.query(DeudaItem)
        .filter(DeudaItem.id == item_id, DeudaItem.deuda_id == deuda_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Producto no encontrado en la deuda")

    db.delete(item)
    db.commit()
    db.refresh(deuda)
    return deuda


@router.post("/{deuda_id}/saldar", response_model=VentaResponse)
def saldar_deuda(deuda_id: str, datos: SaldarDeudaRequest, db: Session = Depends(get_db)):
    """El cliente pagó la deuda completa: se convierte en una venta para
    llevar el control de todo lo vendido y la deuda se elimina."""
    deuda = db.query(Deuda).filter(Deuda.id == deuda_id).first()
    if not deuda:
        raise HTTPException(status_code=404, detail="Deuda no encontrada")
    if not deuda.items:
        raise HTTPException(status_code=400, detail="La deuda no tiene productos por pagar")

    total_usd = round(sum(i.subtotal for i in deuda.items), 2)
    total_bs = round(total_usd * datos.tasa_bcv, 2)

    venta = Venta(
        total_usd=total_usd,
        tasa_bcv=datos.tasa_bcv,
        total_bs=total_bs,
        metodo_pago=datos.metodo_pago.value,
        items=[
            VentaItem(
                producto_id=item.producto_id,
                nombre_producto=item.nombre_producto,
                cantidad=item.cantidad,
                precio_unitario=item.precio_unitario,
                subtotal=item.subtotal,
            )
            for item in deuda.items
        ],
    )

    # Descontar inventario de los productos del catálogo (los manuales no tienen)
    for item in deuda.items:
        if not item.producto_id:
            continue
        producto = db.query(Producto).filter(Producto.id == item.producto_id).first()
        if producto and producto.inventario is not None:
            producto.inventario = max(0, producto.inventario - item.cantidad)

    db.add(venta)
    db.delete(deuda)
    db.commit()
    db.refresh(venta)
    return venta


@router.delete("/{deuda_id}")
def eliminar_deuda(deuda_id: str, db: Session = Depends(get_db)):
    deuda = db.query(Deuda).filter(Deuda.id == deuda_id).first()
    if not deuda:
        raise HTTPException(status_code=404, detail="Deuda no encontrada")

    db.delete(deuda)
    db.commit()
    return {"mensaje": "Deuda eliminada"}
