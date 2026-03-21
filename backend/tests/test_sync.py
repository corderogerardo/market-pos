import os


def test_crear_backup(client):
    # Add some data first
    client.post("/productos/", json={"nombre": "Arroz", "precio": 1.20})
    client.post("/tasa-bcv/manual", json={"tasa": 36.50})

    response = client.post("/sync/backup")
    assert response.status_code == 200
    data = response.json()
    assert data["estado"] == "completado"


def test_historial_sync(client):
    client.post("/sync/backup")

    response = client.get("/sync/historial")
    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_restaurar_sin_backups(client):
    # Remove backups dir if exists
    backup_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backups")
    if os.path.exists(backup_dir):
        import shutil
        shutil.rmtree(backup_dir)

    response = client.post("/sync/restore")
    assert response.status_code == 200
    assert response.json()["estado"] == "error"
