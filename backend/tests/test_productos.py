def test_crear_producto(client):
    response = client.post("/productos/", json={
        "nombre": "Harina PAN 1kg",
        "precio": 1.50,
        "peso": 1.0,
        "unidad": "kg",
        "qr_code": "HARINA001",
        "categoria": "granos",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["nombre"] == "Harina PAN 1kg"
    assert data["precio"] == 1.50
    assert data["qr_code"] == "HARINA001"
    assert data["activo"] is True


def test_crear_producto_qr_duplicado(client):
    client.post("/productos/", json={"nombre": "Prod A", "precio": 1.0, "qr_code": "QR001"})
    response = client.post("/productos/", json={"nombre": "Prod B", "precio": 2.0, "qr_code": "QR001"})
    assert response.status_code == 400
    assert "código QR" in response.json()["detail"]


def test_listar_productos(client):
    client.post("/productos/", json={"nombre": "Arroz", "precio": 1.20, "categoria": "granos"})
    client.post("/productos/", json={"nombre": "Leche", "precio": 1.80, "categoria": "lácteos"})

    response = client.get("/productos/")
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_listar_productos_por_categoria(client):
    client.post("/productos/", json={"nombre": "Arroz", "precio": 1.20, "categoria": "granos"})
    client.post("/productos/", json={"nombre": "Leche", "precio": 1.80, "categoria": "lácteos"})

    response = client.get("/productos/?categoria=granos")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["categoria"] == "granos"


def test_buscar_producto_por_nombre(client):
    client.post("/productos/", json={"nombre": "Harina PAN", "precio": 1.50})
    client.post("/productos/", json={"nombre": "Arroz", "precio": 1.20})

    response = client.get("/productos/buscar?q=harina")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert "Harina" in data[0]["nombre"]


def test_buscar_producto_por_qr(client):
    client.post("/productos/", json={"nombre": "Pasta", "precio": 0.90, "qr_code": "PASTA001"})

    response = client.get("/productos/qr/PASTA001")
    assert response.status_code == 200
    assert response.json()["nombre"] == "Pasta"


def test_buscar_qr_no_encontrado(client):
    response = client.get("/productos/qr/NOEXISTE")
    assert response.status_code == 404


def test_actualizar_producto(client):
    resp = client.post("/productos/", json={"nombre": "Arroz", "precio": 1.20})
    producto_id = resp.json()["id"]

    response = client.put(f"/productos/{producto_id}", json={"precio": 1.50})
    assert response.status_code == 200
    assert response.json()["precio"] == 1.50
    assert response.json()["nombre"] == "Arroz"


def test_desactivar_producto(client):
    resp = client.post("/productos/", json={"nombre": "Temporal", "precio": 0.50})
    producto_id = resp.json()["id"]

    response = client.delete(f"/productos/{producto_id}")
    assert response.status_code == 200

    # Verify it's deactivated
    resp2 = client.get(f"/productos/{producto_id}")
    assert resp2.json()["activo"] is False


def test_obtener_producto_no_existe(client):
    response = client.get("/productos/no-existe-id")
    assert response.status_code == 404
