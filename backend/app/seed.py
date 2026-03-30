"""Script para poblar la base de datos con datos de prueba."""
from app.database import SessionLocal, init_db
from app.models.producto import Producto
from app.models.tasa_bcv import TasaBCV
from datetime import date

PRODUCTOS_SEED = [
    {"nombre": "Harina PAN 1kg", "precio": 1.50, "peso": 1.0, "unidad": "kg", "qr_code": "HARINA001", "categoria": "granos", "tipo_venta": "unidad", "inventario": 50},
    {"nombre": "Arroz 1kg", "precio": 1.20, "peso": 1.0, "unidad": "kg", "qr_code": "ARROZ001", "categoria": "granos", "tipo_venta": "peso", "inventario": 25},
    {"nombre": "Pasta 500g", "precio": 0.90, "peso": 0.5, "unidad": "kg", "qr_code": "PASTA001", "categoria": "granos", "tipo_venta": "unidad", "inventario": 40},
    {"nombre": "Aceite de maíz 1L", "precio": 2.50, "peso": 1.0, "unidad": "l", "qr_code": "ACEITE001", "categoria": "aceites", "tipo_venta": "peso", "inventario": 20},
    {"nombre": "Azúcar 1kg", "precio": 1.00, "peso": 1.0, "unidad": "kg", "qr_code": "AZUCAR001", "categoria": "granos", "tipo_venta": "peso", "inventario": 30},
    {"nombre": "Leche completa 1L", "precio": 1.80, "peso": 1.0, "unidad": "l", "qr_code": "LECHE001", "categoria": "lácteos", "tipo_venta": "unidad", "inventario": 24},
    {"nombre": "Queso blanco 500g", "precio": 3.00, "peso": 0.5, "unidad": "kg", "qr_code": "QUESO001", "categoria": "lácteos", "tipo_venta": "peso", "inventario": 10},
    {"nombre": "Pollo entero 1kg", "precio": 3.50, "peso": 1.0, "unidad": "kg", "qr_code": "POLLO001", "categoria": "carnes", "tipo_venta": "peso", "inventario": 15},
    {"nombre": "Carne molida 1kg", "precio": 5.00, "peso": 1.0, "unidad": "kg", "qr_code": "CARNE001", "categoria": "carnes", "tipo_venta": "peso", "inventario": 10},
    {"nombre": "Plátano maduro 1kg", "precio": 1.00, "peso": 1.0, "unidad": "kg", "qr_code": "PLATANO001", "categoria": "frutas", "tipo_venta": "peso", "inventario": 20},
    {"nombre": "Tomate 1kg", "precio": 1.50, "peso": 1.0, "unidad": "kg", "qr_code": "TOMATE001", "categoria": "verduras", "tipo_venta": "peso", "inventario": 15},
    {"nombre": "Cebolla 1kg", "precio": 1.20, "peso": 1.0, "unidad": "kg", "qr_code": "CEBOLLA001", "categoria": "verduras", "tipo_venta": "peso", "inventario": 15},
    {"nombre": "Papa 1kg", "precio": 0.80, "peso": 1.0, "unidad": "kg", "qr_code": "PAPA001", "categoria": "verduras", "tipo_venta": "peso", "inventario": 25},
    {"nombre": "Refresco 2L", "precio": 1.50, "peso": 2.0, "unidad": "l", "qr_code": "REFRESCO001", "categoria": "bebidas", "tipo_venta": "unidad", "inventario": 30},
    {"nombre": "Agua mineral 1.5L", "precio": 0.50, "peso": 1.5, "unidad": "l", "qr_code": "AGUA001", "categoria": "bebidas", "tipo_venta": "unidad", "inventario": 48},
]


def seed_db():
    init_db()
    db = SessionLocal()

    try:
        if db.query(Producto).count() == 0:
            for p_data in PRODUCTOS_SEED:
                db.add(Producto(**p_data))
            db.commit()
            print(f"✓ {len(PRODUCTOS_SEED)} productos creados")

        if db.query(TasaBCV).count() == 0:
            tasa = TasaBCV(fecha=date.today().isoformat(), tasa=36.50)
            db.add(tasa)
            db.commit()
            print("✓ Tasa BCV inicial registrada (36.50)")

        print("✓ Base de datos lista")
    finally:
        db.close()


if __name__ == "__main__":
    seed_db()
