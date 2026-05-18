from datetime import datetime
from sqlalchemy import create_engine, text
from app.database import _apply_legacy_date_fix
from app.routers.sync import _parse_fecha


def _engine(tmp_path):
    eng = create_engine("sqlite:///{}".format(tmp_path / "m.db"))
    with eng.begin() as c:
        c.exec_driver_sql(
            "CREATE TABLE ventas (id TEXT PRIMARY KEY, fecha TEXT)"
        )
        # Heredada (UTC, antes del corte) y nueva (Caracas, después del corte)
        c.exec_driver_sql(
            "INSERT INTO ventas VALUES "
            "('vieja','2026-03-23 16:42:23.080537'),"
            "('nueva','2026-05-18 12:15:25.195376')"
        )
    return eng


def test_migracion_corrige_solo_fechas_heredadas(tmp_path):
    eng = _engine(tmp_path)
    with eng.begin() as c:
        _apply_legacy_date_fix(c)
    with eng.connect() as c:
        vieja = c.execute(text("SELECT fecha FROM ventas WHERE id='vieja'")).scalar()
        nueva = c.execute(text("SELECT fecha FROM ventas WHERE id='nueva'")).scalar()
        ver = c.exec_driver_sql("PRAGMA user_version").scalar()
    # 16:42 UTC -> 12:42 Caracas
    assert vieja == "2026-03-23 12:42:23"
    # La nueva (posterior al corte) no se toca
    assert nueva == "2026-05-18 12:15:25.195376"
    assert ver == 1


def test_migracion_es_idempotente(tmp_path):
    eng = _engine(tmp_path)
    with eng.begin() as c:
        _apply_legacy_date_fix(c)
    with eng.begin() as c:
        _apply_legacy_date_fix(c)  # segunda corrida no debe volver a desfasar
    with eng.connect() as c:
        vieja = c.execute(text("SELECT fecha FROM ventas WHERE id='vieja'")).scalar()
    assert vieja == "2026-03-23 12:42:23"


def test_migracion_sin_tabla_ventas(tmp_path):
    eng = create_engine("sqlite:///{}".format(tmp_path / "vacia.db"))
    with eng.begin() as c:
        _apply_legacy_date_fix(c)  # no debe fallar si no hay tabla ventas
        ver = c.exec_driver_sql("PRAGMA user_version").scalar()
    assert ver == 1


def test_parse_fecha_formatos():
    assert _parse_fecha("2026-03-23T16:42:23.080537") == datetime(2026, 3, 23, 16, 42, 23, 80537)
    assert _parse_fecha("2026-03-23 16:42:23") == datetime(2026, 3, 23, 16, 42, 23)
    # Con offset de zona -> se descarta el tzinfo, queda hora de pared
    assert _parse_fecha("2026-05-18T12:15:25-04:00") == datetime(2026, 5, 18, 12, 15, 25)
    assert _parse_fecha(None) is None
    assert _parse_fecha("") is None
    assert _parse_fecha("basura") is None
