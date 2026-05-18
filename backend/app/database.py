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


def _migrate_db():
    """Add missing columns to existing tables."""
    insp = inspect(engine)
    if "productos" in insp.get_table_names():
        columns = {col["name"] for col in insp.get_columns("productos")}
        with engine.begin() as conn:
            if "tipo_venta" not in columns:
                conn.execute(text("ALTER TABLE productos ADD COLUMN tipo_venta VARCHAR DEFAULT 'peso'"))
            if "inventario" not in columns:
                conn.execute(text("ALTER TABLE productos ADD COLUMN inventario FLOAT"))


def init_db():
    from app.models import producto, venta, tasa_bcv, sincronizacion, deuda  # noqa: F401
    Base.metadata.create_all(bind=engine)
    _migrate_db()
