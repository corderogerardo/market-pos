import pytest


@pytest.fixture
def productos_test(client):
    """Create test products and return their IDs."""
    p1 = client.post("/productos/", json={"nombre": "Arroz", "precio": 1.20, "qr_code": "ARR01"}).json()
    p2 = client.post("/productos/", json={"nombre": "Pasta", "precio": 0.90, "qr_code": "PAS01"}).json()
    p3 = client.post("/productos/", json={"nombre": "Aceite", "precio": 2.50, "qr_code": "ACE01"}).json()
    return p1, p2, p3


def test_crear_venta_efectivo(client, productos_test):
    p1, p2, _ = productos_test
    response = client.post("/ventas/", json={
        "items": [
            {"producto_id": p1["id"], "cantidad": 2},
            {"producto_id": p2["id"], "cantidad": 3},
        ],
        "metodo_pago": "efectivo",
        "tasa_bcv": 36.50,
    })
    assert response.status_code == 200
    data = response.json()
    # 2*1.20 + 3*0.90 = 2.40 + 2.70 = 5.10
    assert data["total_usd"] == 5.10
    assert data["total_bs"] == round(5.10 * 36.50, 2)
    assert data["metodo_pago"] == "efectivo"
    assert len(data["items"]) == 2


def test_crear_venta_pago_movil(client, productos_test):
    p1, _, _ = productos_test
    response = client.post("/ventas/", json={
        "items": [{"producto_id": p1["id"], "cantidad": 1}],
        "metodo_pago": "pago_movil",
        "tasa_bcv": 36.50,
    })
    assert response.status_code == 200
    assert response.json()["metodo_pago"] == "pago_movil"


def test_crear_venta_punto_de_venta(client, productos_test):
    p1, _, _ = productos_test
    response = client.post("/ventas/", json={
        "items": [{"producto_id": p1["id"], "cantidad": 1}],
        "metodo_pago": "punto_de_venta",
        "tasa_bcv": 36.50,
    })
    assert response.status_code == 200
    assert response.json()["metodo_pago"] == "punto_de_venta"


def test_crear_venta_sin_items(client):
    response = client.post("/ventas/", json={
        "items": [],
        "metodo_pago": "efectivo",
        "tasa_bcv": 36.50,
    })
    assert response.status_code == 400
    assert "al menos un producto" in response.json()["detail"]


def test_crear_venta_producto_no_existe(client):
    response = client.post("/ventas/", json={
        "items": [{"producto_id": "no-existe", "cantidad": 1}],
        "metodo_pago": "efectivo",
        "tasa_bcv": 36.50,
    })
    assert response.status_code == 404


def test_crear_venta_producto_inactivo(client, productos_test):
    p1, _, _ = productos_test
    client.delete(f"/productos/{p1['id']}")

    response = client.post("/ventas/", json={
        "items": [{"producto_id": p1["id"], "cantidad": 1}],
        "metodo_pago": "efectivo",
        "tasa_bcv": 36.50,
    })
    assert response.status_code == 400
    assert "no está activo" in response.json()["detail"]


def test_listar_ventas(client, productos_test):
    p1, _, _ = productos_test
    client.post("/ventas/", json={
        "items": [{"producto_id": p1["id"], "cantidad": 1}],
        "metodo_pago": "efectivo",
        "tasa_bcv": 36.50,
    })
    client.post("/ventas/", json={
        "items": [{"producto_id": p1["id"], "cantidad": 2}],
        "metodo_pago": "pago_movil",
        "tasa_bcv": 36.50,
    })

    response = client.get("/ventas/")
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_filtrar_ventas_por_metodo_pago(client, productos_test):
    p1, _, _ = productos_test
    client.post("/ventas/", json={
        "items": [{"producto_id": p1["id"], "cantidad": 1}],
        "metodo_pago": "efectivo",
        "tasa_bcv": 36.50,
    })
    client.post("/ventas/", json={
        "items": [{"producto_id": p1["id"], "cantidad": 2}],
        "metodo_pago": "pago_movil",
        "tasa_bcv": 36.50,
    })

    response = client.get("/ventas/?metodo_pago=efectivo")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["metodo_pago"] == "efectivo"


def test_resumen_diario(client, productos_test):
    from datetime import datetime
    from zoneinfo import ZoneInfo
    p1, p2, _ = productos_test
    client.post("/ventas/", json={
        "items": [{"producto_id": p1["id"], "cantidad": 2}],
        "metodo_pago": "efectivo",
        "tasa_bcv": 36.50,
    })
    client.post("/ventas/", json={
        "items": [{"producto_id": p2["id"], "cantidad": 3}],
        "metodo_pago": "pago_movil",
        "tasa_bcv": 36.50,
    })

    # Use Venezuela date since ventas are stored in VE timezone
    today_utc = datetime.now(ZoneInfo("America/Caracas")).strftime("%Y-%m-%d")
    response = client.get("/ventas/resumen-diario?fecha={}".format(today_utc))
    assert response.status_code == 200
    data = response.json()
    assert data["total_ventas"] == 2
    assert "efectivo" in data["por_metodo_pago"]
    assert "pago_movil" in data["por_metodo_pago"]


def test_obtener_venta_por_id(client, productos_test):
    p1, _, _ = productos_test
    resp = client.post("/ventas/", json={
        "items": [{"producto_id": p1["id"], "cantidad": 1}],
        "metodo_pago": "efectivo",
        "tasa_bcv": 36.50,
    })
    venta_id = resp.json()["id"]

    response = client.get(f"/ventas/{venta_id}")
    assert response.status_code == 200
    assert response.json()["id"] == venta_id


def test_venta_guarda_nombre_producto(client, productos_test):
    p1, _, _ = productos_test
    resp = client.post("/ventas/", json={
        "items": [{"producto_id": p1["id"], "cantidad": 1}],
        "metodo_pago": "efectivo",
        "tasa_bcv": 36.50,
    })
    data = resp.json()
    assert data["items"][0]["nombre_producto"] == "Arroz"
