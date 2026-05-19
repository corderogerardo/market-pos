#!/usr/bin/env python3
"""Herramienta del DUEÑO para la clave universal de Market POS.

Ya NO hay clave por equipo ni firma. Existe UNA sola clave maestra que
solo tú posees y que sirve para activar cualquier instalación.

Uso:
  python scripts/license_tool.py generar
      Crea una clave universal nueva al azar e imprime:
        - la CLAVE (guárdala tú; NO la subas al repo)
        - la línea MASTER_KEY_HASH para pegar en
          backend/app/services/license_service.py

  python scripts/license_tool.py hash --clave "MI-CLAVE-PERSONAL"
      Calcula el MASTER_KEY_HASH de una clave que tú elijas (por si
      prefieres una clave fácil de recordar en vez de una al azar).

Cambiar la clave (regenerar el hash) invalida la clave anterior: los
equipos ya activados deberán activarse de nuevo con la clave nueva.
"""
import argparse
import hashlib
import os
import secrets
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "backend"))

from app.services.license_service import _PEPPER  # noqa: E402

_ALFABETO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"  # sin 0/O/1/I


def _hash(clave: str) -> str:
    return hashlib.sha256((_PEPPER + clave.strip()).encode("utf-8")).hexdigest()


def _mostrar(clave: str) -> None:
    print("\n--- CLAVE UNIVERSAL (guárdala tú, NO la subas al repo) ---\n")
    print("  " + clave)
    print("\n--- Pega esta línea en license_service.py ---\n")
    print('MASTER_KEY_HASH = "{}"'.format(_hash(clave)))
    print()


def cmd_generar(_args):
    grupos = ["".join(secrets.choice(_ALFABETO) for _ in range(5)) for _ in range(5)]
    _mostrar("-".join(grupos))


def cmd_hash(args):
    if not args.clave.strip():
        sys.exit("La clave no puede estar vacía.")
    _mostrar(args.clave)


def main():
    p = argparse.ArgumentParser(description="Clave universal Market POS")
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("generar").set_defaults(func=cmd_generar)

    s = sub.add_parser("hash")
    s.add_argument("--clave", required=True, help="Clave que tú elijas")
    s.set_defaults(func=cmd_hash)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
