import base64
import json

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from app.services import license_service as L


@pytest.fixture
def claves(monkeypatch):
    """Par de claves efímero: parchea la pública embebida y devuelve un
    firmador, sin tocar la clave real ni el archivo de licencia real."""
    priv = Ed25519PrivateKey.generate()
    pub_pem = priv.public_key().public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    monkeypatch.setattr(L, "PUBLIC_KEY_PEM", pub_pem)
    L._estado_cache = None

    def firmar(datos: dict) -> str:
        sobre = {"datos": datos, "firma": L._b64e(priv.sign(L.canonical(datos)))}
        return L._b64e(json.dumps(sobre, ensure_ascii=False).encode())

    return firmar


def test_machine_id_estable_y_formateado():
    a = L.get_machine_id()
    b = L.get_machine_id()
    assert a == b
    assert len(a) == 35 and a.count("-") == 3  # XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX


def test_licencia_valida(claves):
    datos = {
        "cliente": "Bodega X",
        "machine_id": L.get_machine_id(),
        "emitido": "2026-05-18",
        "expira": None,
    }
    res = L.verificar_clave(claves(datos))
    assert res["valida"] is True
    assert res["datos"]["cliente"] == "Bodega X"


def test_rechaza_clave_basura(claves):
    assert L.verificar_clave("no-es-una-clave")["valida"] is False
    assert L.verificar_clave("")["valida"] is False


def test_rechaza_payload_alterado(claves):
    datos = {"cliente": "A", "machine_id": L.get_machine_id(), "emitido": "2026-05-18", "expira": None}
    clave = claves(datos)
    sobre = json.loads(L._b64d(clave))
    sobre["datos"]["cliente"] = "Pirata"  # firma ya no coincide
    alterada = L._b64e(json.dumps(sobre).encode())
    assert L.verificar_clave(alterada)["valida"] is False


def test_rechaza_otro_equipo(claves):
    datos = {"cliente": "A", "machine_id": "OTRO-EQUIPO-AAAA-BBBB", "emitido": "2026-05-18", "expira": None}
    res = L.verificar_clave(claves(datos))
    assert res["valida"] is False
    assert "equipo" in res["motivo"].lower()


def test_rechaza_licencia_vencida(claves):
    datos = {"cliente": "A", "machine_id": L.get_machine_id(), "emitido": "2020-01-01", "expira": "2020-12-31"}
    res = L.verificar_clave(claves(datos))
    assert res["valida"] is False
    assert "vencida" in res["motivo"].lower()


def test_firma_de_otra_clave_privada_no_valida(claves):
    """Una clave firmada con OTRA privada (atacante) no valida contra la
    pública embebida."""
    otra = Ed25519PrivateKey.generate()
    datos = {"cliente": "A", "machine_id": L.get_machine_id(), "emitido": "2026-05-18", "expira": None}
    sobre = {"datos": datos, "firma": L._b64e(otra.sign(L.canonical(datos)))}
    falsa = L._b64e(json.dumps(sobre).encode())
    assert L.verificar_clave(falsa)["valida"] is False


def test_endpoint_estado(client):
    r = client.get("/licencia/estado")
    assert r.status_code == 200
    body = r.json()
    assert "activa" in body and "machine_id" in body


def test_endpoint_activar_clave_invalida(client):
    r = client.post("/licencia/activar", json={"clave": "basura"})
    assert r.status_code == 400


def test_endpoint_activar_y_persistir(client, claves, tmp_path, monkeypatch):
    # Redirige el guardado a tmp para no tocar la licencia real del equipo.
    lic = tmp_path / "licencia.lic"
    monkeypatch.setattr(L, "LICENSE_PATH", str(lic))
    monkeypatch.setattr(L, "_DATA_DIR", str(tmp_path))
    datos = {
        "cliente": "Bodega Z",
        "machine_id": L.get_machine_id(),
        "emitido": "2026-05-18",
        "expira": None,
    }
    r = client.post("/licencia/activar", json={"clave": claves(datos)})
    assert r.status_code == 200
    assert r.json()["activa"] is True
    assert lic.exists()
