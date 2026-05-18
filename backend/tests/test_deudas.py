import pytest


@pytest.fixture
def productos_test(client):
    p1 = client.post("/productos/", json={"nombre": "Arroz", "precio": 1.20, "qr_code": "ARR01"}).json()
    p2 = client.post("/productos/", json={"nombre": "Pasta", "precio": 0.90, "qr_code": "PAS01"}).json()
    return p1, p2


def test_crear_deuda_con_items(client, productos_test):
    p1, p2 = productos_test
    response = client.post("/deudas/", json={
        "nombre_cliente": "Juan",
        "nota": "Paga el viernes",
        "items": [
            {"producto_id": p1["id"], "nombre_producto": "Arroz", "cantidad": 2, "precio_unitario": 1.20},
            {"producto_id": p2["id"], "nombre_producto": "Pasta", "cantidad": 3, "precio_unitario": 0.90},
        ],
    })
    assert response.status_code == 200
    data = response.json()
    assert data["nombre_cliente"] == "Juan"
    assert data["nota"] == "Paga el viernes"
    # 2*1.20 + 3*0.90 = 2.40 + 2.70 = 5.10
    assert data["total_usd"] == 5.10
    assert len(data["items"]) == 2


def test_crear_deuda_sin_nombre(client):
    response = client.post("/deudas/", json={"nombre_cliente": "   ", "items": []})
    assert response.status_code == 400


def test_crear_deuda_item_manual(client):
    response = client.post("/deudas/", json={
        "nombre_cliente": "Maria",
        "items": [{"nombre_producto": "Refresco", "cantidad": 1, "precio_unitario": 1.50}],
    })
    assert response.status_code == 200
    data = response.json()
    assert data["items"][0]["producto_id"] is None
    assert data["total_usd"] == 1.50


def test_listar_deudas(client):
    client.post("/deudas/", json={"nombre_cliente": "Ana", "items": []})
    client.post("/deudas/", json={"nombre_cliente": "Luis", "items": []})
    response = client.get("/deudas/")
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_buscar_deuda_por_nombre(client):
    client.post("/deudas/", json={"nombre_cliente": "Pedro Perez", "items": []})
    client.post("/deudas/", json={"nombre_cliente": "Ana Gomez", "items": []})
    response = client.get("/deudas/?q=pedro")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["nombre_cliente"] == "Pedro Perez"


def test_agregar_item_a_deuda(client):
    deuda = client.post("/deudas/", json={
        "nombre_cliente": "Carlos",
        "items": [{"nombre_producto": "Pan", "cantidad": 1, "precio_unitario": 0.50}],
    }).json()
    response = client.post(f"/deudas/{deuda['id']}/items", json={
        "nombre_producto": "Queso", "cantidad": 2, "precio_unitario": 3.00,
    })
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    # 0.50 + 2*3.00 = 6.50
    assert data["total_usd"] == 6.50


def test_eliminar_item_pagado_reduce_total(client):
    deuda = client.post("/deudas/", json={
        "nombre_cliente": "Sofia",
        "items": [
            {"nombre_producto": "Leche", "cantidad": 1, "precio_unitario": 2.00},
            {"nombre_producto": "Huevos", "cantidad": 1, "precio_unitario": 3.00},
        ],
    }).json()
    assert deuda["total_usd"] == 5.00

    item_id = deuda["items"][0]["id"]
    response = client.delete(f"/deudas/{deuda['id']}/items/{item_id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["total_usd"] == 3.00


def test_eliminar_deuda_completa(client):
    deuda = client.post("/deudas/", json={"nombre_cliente": "Diego", "items": []}).json()
    response = client.delete(f"/deudas/{deuda['id']}")
    assert response.status_code == 200
    assert client.get(f"/deudas/{deuda['id']}").status_code == 404


def test_actualizar_deuda(client):
    deuda = client.post("/deudas/", json={"nombre_cliente": "Old Name", "items": []}).json()
    response = client.put(f"/deudas/{deuda['id']}", json={
        "nombre_cliente": "New Name", "nota": "actualizada",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["nombre_cliente"] == "New Name"
    assert data["nota"] == "actualizada"


def test_item_cantidad_invalida(client):
    response = client.post("/deudas/", json={
        "nombre_cliente": "Test",
        "items": [{"nombre_producto": "X", "cantidad": 0, "precio_unitario": 1.00}],
    })
    assert response.status_code == 400


def test_deuda_no_encontrada(client):
    assert client.get("/deudas/no-existe").status_code == 404
    assert client.delete("/deudas/no-existe").status_code == 404
