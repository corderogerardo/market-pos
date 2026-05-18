#!/usr/bin/env python3
"""Herramienta del DUEÑO para emitir licencias de Market POS.

NO distribuir junto con la app. La clave privada debe quedarse solo contigo.

Uso:
  python scripts/license_tool.py keygen
      Genera el par de claves. Guarda la privada en
      ~/.market-pos-keys/clave_privada.pem e imprime la PÚBLICA para
      pegarla en backend/app/services/license_service.py (PUBLIC_KEY_PEM).

  python scripts/license_tool.py machine-id
      Imprime el ID de este equipo (lo que el cliente ve en la pantalla
      de activación y te envía).

  python scripts/license_tool.py sign --machine-id ID --cliente "Nombre" \
      [--expira 2027-01-31]
      Genera la clave de licencia para ese equipo. Se la envías al cliente
      y la pega en la pantalla de activación.
"""
import argparse
import json
import os
import stat
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "backend"))

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
)

from app.services.license_service import canonical, _b64e, get_machine_id

KEYS_DIR = os.path.join(os.path.expanduser("~"), ".market-pos-keys")
PRIV_PATH = os.path.join(KEYS_DIR, "clave_privada.pem")


def cmd_keygen(_args):
    os.makedirs(KEYS_DIR, exist_ok=True)
    if os.path.exists(PRIV_PATH):
        print("Ya existe una clave privada en {}".format(PRIV_PATH))
        print("Si generas otra, las licencias anteriores dejarán de validar.")
        if input("¿Sobrescribir? (escribe SI): ").strip() != "SI":
            return
    priv = Ed25519PrivateKey.generate()
    priv_pem = priv.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    with open(PRIV_PATH, "wb") as f:
        f.write(priv_pem)
    os.chmod(PRIV_PATH, stat.S_IRUSR | stat.S_IWUSR)  # 600

    pub_pem = priv.public_key().public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    print("Clave privada guardada en: {} (¡no la compartas!)".format(PRIV_PATH))
    print("\n--- Pega esto en license_service.py como PUBLIC_KEY_PEM ---\n")
    print(pub_pem.decode())


def _load_private(path):
    with open(path, "rb") as f:
        return serialization.load_pem_private_key(f.read(), password=None)


def cmd_machine_id(_args):
    print(get_machine_id())


def cmd_sign(args):
    priv_path = args.privada or PRIV_PATH
    if not os.path.exists(priv_path):
        sys.exit("No se encontró la clave privada en {}. Corre keygen primero.".format(priv_path))
    priv = _load_private(priv_path)
    if not isinstance(priv, Ed25519PrivateKey):
        sys.exit("La clave privada no es Ed25519.")

    datos = {
        "cliente": args.cliente,
        "machine_id": args.machine_id.strip(),
        "emitido": args.emitido,
        "expira": args.expira,  # None = perpetua
    }
    firma = priv.sign(canonical(datos))
    sobre = {"datos": datos, "firma": _b64e(firma)}
    clave = _b64e(json.dumps(sobre, ensure_ascii=False).encode("utf-8"))
    print("\n--- CLAVE DE LICENCIA (envíasela al cliente) ---\n")
    print(clave)


def main():
    import datetime

    p = argparse.ArgumentParser(description="Emisor de licencias Market POS")
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("keygen").set_defaults(func=cmd_keygen)
    sub.add_parser("machine-id").set_defaults(func=cmd_machine_id)

    s = sub.add_parser("sign")
    s.add_argument("--machine-id", required=True, help="ID del equipo del cliente")
    s.add_argument("--cliente", required=True, help="Nombre del cliente/negocio")
    s.add_argument("--expira", default=None, help="YYYY-MM-DD (vacío = perpetua)")
    s.add_argument(
        "--emitido",
        default=datetime.date.today().isoformat(),
        help="YYYY-MM-DD (por defecto hoy)",
    )
    s.add_argument("--privada", default=None, help="Ruta a clave_privada.pem")
    s.set_defaults(func=cmd_sign)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
