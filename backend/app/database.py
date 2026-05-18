import os
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# Store database in a stable location under user's home directory
DATA_DIR = os.path.join(os.path.expanduser("~"), ".market-pos")
os.makedirs(DATA_DIR, exist_ok=True)
_default_db = "sqlite:///{}".format(os.path.join(DATA_DIR, "market.db"))
DB_PATH = os.environ.get("DATABASE_URL", _default_db)

engine = create_engine(DB_PATH, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Antes del commit ca1a302 las fechas se guardaban en UTC; después en
# America/Caracas (UTC-4 fijo, sin horario de verano desde 2016). Las ventas
# anteriores al despliegue de esa corrección quedan 4h adelantadas respecto a
# las nuevas, lo que descuadra los resúmenes por día/mes. Esta fecha separa
# datos heredados (UTC) de datos nuevos (Caracas): no existen ventas nuevas
# antes de ella porque el código corregido no existía aún.
LEGACY_FECHA_CUTOFF = "2026-04-02"


def _apply_legacy_date_fix(conn):
    """One-time: normaliza fechas heredadas (UTC) a Caracas. Idempotente vía
    PRAGMA user_version, así nunca se aplica el desfase dos veces."""
    ver = conn.exec_driver_sql("PRAGMA user_version").scalar() or 0
    if ver >= 1:
        return
    has_ventas = conn.exec_driver_sql(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='ventas'"
    ).fetchone() is not None
    if has_ventas:
        conn.execute(
            text("UPDATE ventas SET fecha = datetime(fecha, '-4 hours') WHERE fecha < :c"),
            {"c": LEGACY_FECHA_CUTOFF},
        )
    conn.exec_driver_sql("PRAGMA user_version = 1")


def _migrate_db():
    """Add missing columns and run one-time data migrations."""
    insp = inspect(engine)
    if "productos" in insp.get_table_names():
        columns = {col["name"] for col in insp.get_columns("productos")}
        with engine.begin() as conn:
            if "tipo_venta" not in columns:
                conn.execute(text("ALTER TABLE productos ADD COLUMN tipo_venta VARCHAR DEFAULT 'peso'"))
            if "inventario" not in columns:
                conn.execute(text("ALTER TABLE productos ADD COLUMN inventario FLOAT"))
    with engine.begin() as conn:
        _apply_legacy_date_fix(conn)


def init_db():
    from app.models import producto, venta, tasa_bcv, sincronizacion, deuda  # noqa: F401
    Base.metadata.create_all(bind=engine)
    _migrate_db()
