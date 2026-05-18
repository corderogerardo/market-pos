import json
import os
from typing import List
from datetime import datetime
from zoneinfo import ZoneInfo

VE_TZ = ZoneInfo("America/Caracas")
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.producto import Producto
from app.models.venta import Venta, VentaItem
from app.models.tasa_bcv import TasaBCV
from app.models.sincronizacion import Sincronizacion
from app.models.deuda import Deuda, DeudaItem
from app.schemas.sync import SyncResponse

router = APIRouter()

# Use stable path in user home directory
BACKUP_DIR = os.path.join(os.path.expanduser("~"), ".market-pos", "backups")


def _export_data(db: Session) -> dict:
    """Export all database data to a dictionary."""
    return {
        "fecha_backup": datetime.now(VE_TZ).isoformat(),
        "productos": [
            {
                "id": p.id, "nombre": p.nombre, "precio": p.precio,
                "peso": p.peso, "unidad": p.unidad, "qr_code": p.qr_code,
                "categoria": p.categoria, "activo": p.activo,
                "creado_en": p.creado_en.isoformat() if p.creado_en else None,
                "actualizado_en": p.actualizado_en.isoformat() if p.actualizado_en else None,
            }
            for p in db.query(Producto).all()
        ],
        "ventas": [
            {
                "id": v.id, "fecha": v.fecha.isoformat() if v.fecha else None,
                "total_usd": v.total_usd, "tasa_bcv": v.tasa_bcv,
                "total_bs": v.total_bs, "metodo_pago": v.metodo_pago,
                "items": [
                    {
                        "id": i.id, "producto_id": i.producto_id,
                        "nombre_producto": i.nombre_producto,
                        "cantidad": i.cantidad, "precio_unitario": i.precio_unitario,
                        "subtotal": i.subtotal,
                    }
                    for i in v.items
                ],
            }
            for v in db.query(Venta).all()
        ],
        "tasas_bcv": [
            {
                "id": t.id, "fecha": t.fecha, "tasa": t.tasa,
                "consultado_en": t.consultado_en.isoformat() if t.consultado_en else None,
            }
            for t in db.query(TasaBCV).all()
        ],
        "deudas": [
            {
                "id": d.id, "nombre_cliente": d.nombre_cliente, "nota": d.nota,
                "creado_en": d.creado_en.isoformat() if d.creado_en else None,
                "actualizado_en": d.actualizado_en.isoformat() if d.actualizado_en else None,
                "items": [
                    {
                        "id": i.id, "producto_id": i.producto_id,
                        "nombre_producto": i.nombre_producto,
                        "cantidad": i.cantidad, "precio_unitario": i.precio_unitario,
                        "subtotal": i.subtotal,
                    }
                    for i in d.items
                ],
            }
            for d in db.query(Deuda).all()
        ],
    }


def _save_local(data: dict) -> str:
    """Save backup to local disk and return filepath."""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.now(VE_TZ).strftime("%Y%m%d_%H%M%S")
    filepath = os.path.join(BACKUP_DIR, "backup_{}.json".format(timestamp))
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return filepath


@router.post("/backup", response_model=SyncResponse)
def crear_backup(db: Session = Depends(get_db)):
    try:
        data = _export_data(db)
        filepath = _save_local(data)

        # Try to upload to Google Drive
        drive_info = ""
        try:
            from app.services.google_drive import upload_to_drive, is_configured
            if is_configured():
                result = upload_to_drive(filepath)
                drive_info = " | Google Drive: {}".format(result.get("nombre", "ok"))
        except Exception as e:
            drive_info = " | Google Drive error: {}".format(str(e)[:100])

        detalles = "Backup local: {}{}".format(filepath, drive_info)
        sync = Sincronizacion(estado="completado", detalles=detalles)
        db.add(sync)
        db.commit()
        db.refresh(sync)
        return sync

    except Exception as e:
        sync = Sincronizacion(estado="error", detalles=str(e))
        db.add(sync)
        db.commit()
        db.refresh(sync)
        return sync


@router.post("/restore", response_model=SyncResponse)
def restaurar_backup(db: Session = Depends(get_db)):
    os.makedirs(BACKUP_DIR, exist_ok=True)

    # Try to download latest from Google Drive first
    try:
        from app.services.google_drive import download_latest_from_drive, is_configured
        if is_configured():
            download_latest_from_drive(BACKUP_DIR)
    except Exception:
        pass

    backups = sorted(
        [f for f in os.listdir(BACKUP_DIR) if f.endswith(".json")],
        reverse=True,
    )

    if not backups:
        sync = Sincronizacion(estado="error", detalles="No hay backups disponibles")
        db.add(sync)
        db.commit()
        db.refresh(sync)
        return sync

    filepath = os.path.join(BACKUP_DIR, backups[0])

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        for p_data in data.get("productos", []):
            existing = db.query(Producto).filter(Producto.id == p_data["id"]).first()
            if not existing:
                p = Producto(**{k: v for k, v in p_data.items() if k not in ("creado_en", "actualizado_en")})
                db.add(p)

        for v_data in data.get("ventas", []):
            existing = db.query(Venta).filter(Venta.id == v_data["id"]).first()
            if not existing:
                items_data = v_data.pop("items", [])
                v = Venta(**{k: v for k, v in v_data.items() if k != "fecha"})
                for i_data in items_data:
                    vi = VentaItem(**i_data)
                    v.items.append(vi)
                db.add(v)

        for t_data in data.get("tasas_bcv", []):
            existing = db.query(TasaBCV).filter(TasaBCV.id == t_data["id"]).first()
            if not existing:
                t = TasaBCV(**{k: v for k, v in t_data.items() if k != "consultado_en"})
                db.add(t)

        for d_data in data.get("deudas", []):
            existing = db.query(Deuda).filter(Deuda.id == d_data["id"]).first()
            if not existing:
                items_data = d_data.pop("items", [])
                d = Deuda(**{k: v for k, v in d_data.items() if k not in ("creado_en", "actualizado_en")})
                for i_data in items_data:
                    d.items.append(DeudaItem(**i_data))
                db.add(d)

        db.commit()

        sync = Sincronizacion(estado="completado", detalles="Restaurado desde {}".format(backups[0]))
        db.add(sync)
        db.commit()
        db.refresh(sync)
        return sync

    except Exception as e:
        db.rollback()
        sync = Sincronizacion(estado="error", detalles=str(e))
        db.add(sync)
        db.commit()
        db.refresh(sync)
        return sync


@router.get("/google-drive/status")
def google_drive_status():
    """Check if Google Drive is configured."""
    from app.services.google_drive import is_configured, CONFIG_DIR, CREDENTIALS_PATH
    return {
        "configurado": is_configured(),
        "config_dir": CONFIG_DIR,
        "credentials_path": CREDENTIALS_PATH,
        "instrucciones": (
            "Para activar Google Drive: "
            "1) Ve a https://console.cloud.google.com/apis/credentials "
            "2) Crea un OAuth Client ID (tipo Desktop) "
            "3) Descarga el JSON y guárdalo en: {}".format(CREDENTIALS_PATH)
        ),
    }


@router.post("/google-drive/auth")
def google_drive_auth():
    """Trigger Google Drive OAuth authentication."""
    try:
        from app.services.google_drive import get_credentials
        creds = get_credentials()
        if creds:
            return {"estado": "autenticado", "mensaje": "Google Drive conectado exitosamente"}
        return {"estado": "error", "mensaje": "No se pudo autenticar"}
    except Exception as e:
        return {"estado": "error", "mensaje": str(e)}


@router.get("/historial", response_model=List[SyncResponse])
def historial_sync(limit: int = 20, db: Session = Depends(get_db)):
    return db.query(Sincronizacion).order_by(Sincronizacion.fecha.desc()).limit(limit).all()
