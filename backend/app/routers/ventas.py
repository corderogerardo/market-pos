from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from datetime import date, datetime
from app.database import get_db
from app.models.producto import Producto
from app.models.venta import Venta, VentaItem
from app.schemas.venta import VentaCreate, VentaResponse, ResumenDiario, MetodoPago

router = APIRouter()


@router.post("/", response_model=VentaResponse)
def crear_venta(venta_data: VentaCreate, db: Session = Depends(get_db)):
    if not venta_data.items:
        raise HTTPException(status_code=400, detail="La venta debe tener al menos un producto")

    total_usd = 0.0
    items = []

    for item_data in venta_data.items:
        producto = db.query(Producto).filter(Producto.id == item_data.producto_id).first()
        if not producto:
            raise HTTPException(status_code=404, detail="Producto {} no encontrado".format(item_data.producto_id))
        if not producto.activo:
            raise HTTPException(status_code=400, detail="Producto '{}' no está activo".format(producto.nombre))

        subtotal = producto.precio * item_data.cantidad
        total_usd += subtotal

        items.append(
            VentaItem(
                producto_id=producto.id,
                nombre_producto=producto.nombre,
                cantidad=item_data.cantidad,
                precio_unitario=producto.precio,
                subtotal=subtotal,
            )
        )

    total_bs = total_usd * venta_data.tasa_bcv

    venta = Venta(
        total_usd=round(total_usd, 2),
        tasa_bcv=venta_data.tasa_bcv,
        total_bs=round(total_bs, 2),
        metodo_pago=venta_data.metodo_pago.value,
        items=items,
    )

    db.add(venta)
    db.commit()
    db.refresh(venta)
    return venta


@router.get("/", response_model=List[VentaResponse])
def listar_ventas(
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    metodo_pago: Optional[MetodoPago] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Venta)

    if fecha_desde:
        query = query.filter(Venta.fecha >= datetime.combine(fecha_desde, datetime.min.time()))
    if fecha_hasta:
        query = query.filter(Venta.fecha <= datetime.combine(fecha_hasta, datetime.max.time()))
    if metodo_pago:
        query = query.filter(Venta.metodo_pago == metodo_pago.value)

    return query.order_by(Venta.fecha.desc()).all()


@router.get("/resumen-diario", response_model=ResumenDiario)
def resumen_diario(
    fecha: Optional[date] = Query(None, description="Fecha del resumen (default: hoy)"),
    db: Session = Depends(get_db),
):
    target_date = fecha or date.today()

    start = datetime.combine(target_date, datetime.min.time())
    end = datetime.combine(target_date, datetime.max.time())
    ventas = (
        db.query(Venta)
        .filter(Venta.fecha >= start, Venta.fecha <= end)
        .all()
    )

    por_metodo = {}
    total_usd = 0.0
    total_bs = 0.0

    for v in ventas:
        total_usd += v.total_usd
        total_bs += v.total_bs
        if v.metodo_pago not in por_metodo:
            por_metodo[v.metodo_pago] = {"total_usd": 0.0, "total_bs": 0.0, "cantidad": 0}
        por_metodo[v.metodo_pago]["total_usd"] += v.total_usd
        por_metodo[v.metodo_pago]["total_bs"] += v.total_bs
        por_metodo[v.metodo_pago]["cantidad"] += 1

    return ResumenDiario(
        fecha=target_date.isoformat(),
        total_ventas=len(ventas),
        total_usd=round(total_usd, 2),
        total_bs=round(total_bs, 2),
        por_metodo_pago=por_metodo,
    )


@router.get("/{venta_id}", response_model=VentaResponse)
def obtener_venta(venta_id: str, db: Session = Depends(get_db)):
    venta = db.query(Venta).filter(Venta.id == venta_id).first()
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    return venta
