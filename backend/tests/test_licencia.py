import pytest

from app.services import license_service as L

CLAVE_TEST = "FNC3T-WLAJ8-2GX74-3FG6V-TRT9P"


@pytest.fixture
def clave_universal(monkeypatch):
    """Fija una clave universal conocida para las pruebas (sin tocar la
    clave real embebida ni el archivo de licencia del equipo)."""
    monkeypatch.setattr(L, "MASTER_KEY_HASH", L._hash_clave(CLAVE_TEST))
    L._estado_cache = None
    return CLAVE_TEST


def test_machine_id_estable_y_formateado():
    a = L.get_machine_id()
    b = L.get_machine_id()
    assert a == b
    assert len(a) == 35 and a.count("-") == 3  # XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX


def test_clave_universal_valida(clave_universal):
    res = L.verificar_clave(clave_universal)
    assert res["valida"] is True
    assert res["datos"]["tipo"] == "universal"


def test_clave_universal_ignora_espacios(clave_universal):
    assert L.verificar_clave("  " + clave_universal + "\n")["valida"] is True


def test_rechaza_clave_incorrecta(clave_universal):
    res = L.verificar_clave("OTRA-CLAVE-CUALQUIERA")
    assert res["valida"] is False
    assert "incorrecta" in res["motivo"].lower()


def test_rechaza_clave_vacia(clave_universal):
    assert L.verificar_clave("")["valida"] is False
    assert L.verificar_clave("   ")["valida"] is False


def test_endpoint_estado(client):
    r = client.get("/licencia/estado")
    assert r.status_code == 200
    body = r.json()
    assert "activa" in body and "machine_id" in body


def test_endpoint_activar_clave_invalida(client):
    r = client.post("/licencia/activar", json={"clave": "basura"})
    assert r.status_code == 400


def test_endpoint_activar_y_persistir(client, clave_universal, tmp_path, monkeypatch):
    # Redirige el guardado a tmp para no tocar la licencia real del equipo.
    lic = tmp_path / "licencia.lic"
    monkeypatch.setattr(L, "LICENSE_PATH", str(lic))
    monkeypatch.setattr(L, "_DATA_DIR", str(tmp_path))
    r = client.post("/licencia/activar", json={"clave": clave_universal})
    assert r.status_code == 200
    assert r.json()["activa"] is True
    assert lic.exists()
