def test_tasa_no_registrada(client):
    response = client.get("/tasa-bcv/")
    assert response.status_code == 404


def test_registrar_tasa_manual(client):
    response = client.post("/tasa-bcv/manual", json={"tasa": 36.50})
    assert response.status_code == 200
    data = response.json()
    assert data["tasa"] == 36.50


def test_obtener_tasa_actual(client):
    client.post("/tasa-bcv/manual", json={"tasa": 36.50})

    response = client.get("/tasa-bcv/")
    assert response.status_code == 200
    assert response.json()["tasa"] == 36.50


def test_historial_tasas(client):
    client.post("/tasa-bcv/manual", json={"tasa": 36.50})
    client.post("/tasa-bcv/manual", json={"tasa": 37.00})

    response = client.get("/tasa-bcv/historial")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    # Most recent first
    assert data[0]["tasa"] == 37.00


def test_tasa_manual_actualiza_actual(client):
    client.post("/tasa-bcv/manual", json={"tasa": 36.50})
    client.post("/tasa-bcv/manual", json={"tasa": 38.00})

    response = client.get("/tasa-bcv/")
    assert response.status_code == 200
    assert response.json()["tasa"] == 38.00
