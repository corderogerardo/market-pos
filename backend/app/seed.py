"""Script para poblar la base de datos con datos de prueba."""
from app.database import SessionLocal, init_db
from app.models.producto import Producto
from app.models.tasa_bcv import TasaBCV
from datetime import date

PRODUCTOS_SEED = [
    {"nombre": "Harina PAN 1kg", "precio": 1.50, "peso": 1.0, "unidad": "kg", "qr_code": "HARINA001", "categoria": "granos"},
    {"nombre": "Arroz 1kg", "precio": 1.20, "peso": 1.0, "unidad": "kg", "qr_code": "ARROZ001", "categoria": "granos"},
    {"nombre": "Pasta 500g", "precio": 0.90, "peso": 0.5, "unidad": "kg", "qr_code": "PASTA001", "categoria": "granos"},
    {"nombre": "Aceite de maíz 1L", "precio": 2.50, "peso": 1.0, "unidad": "kg", "qr_code": "ACEITE001", "categoria": "aceites"},
    {"nombre": "Azúcar 1kg", "precio": 1.00, "peso": 1.0, "unidad": "kg", "qr_code": "AZUCAR001", "categoria": "granos"},
    {"nombre": "Leche completa 1L", "precio": 1.80, "peso": 1.0, "unidad": "kg", "qr_code": "LECHE001", "categoria": "lácteos"},
    {"nombre": "Queso blanco 500g", "precio": 3.00, "peso": 0.5, "unidad": "kg", "qr_code": "QUESO001", "categoria": "lácteos"},
    {"nombre": "Pollo entero 1kg", "precio": 3.50, "peso": 1.0, "unidad": "kg", "qr_code": "POLLO001", "categoria": "carnes"},
    {"nombre": "Carne molida 1kg", "precio": 5.00, "peso": 1.0, "unidad": "kg", "qr_code": "CARNE001", "categoria": "carnes"},
    {"nombre": "Plátano maduro 1kg", "precio": 1.00, "peso": 1.0, "unidad": "kg", "qr_code": "PLATANO001", "categoria": "frutas"},
    {"nombre": "Tomate 1kg", "precio": 1.50, "peso": 1.0, "unidad": "kg", "qr_code": "TOMATE001", "categoria": "verduras"},
    {"nombre": "Cebolla 1kg", "precio": 1.20, "peso": 1.0, "unidad": "kg", "qr_code": "CEBOLLA001", "categoria": "verduras"},
    {"nombre": "Papa 1kg", "precio": 0.80, "peso": 1.0, "unidad": "kg", "qr_code": "PAPA001", "categoria": "verduras"},
    {"nombre": "Refresco 2L", "precio": 1.50, "peso": 2.0, "unidad": "kg", "qr_code": "REFRESCO001", "categoria": "bebidas"},
    {"nombre": "Agua mineral 1.5L", "precio": 0.50, "peso": 1.5, "unidad": "kg", "qr_code": "AGUA001", "categoria": "bebidas"},
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
