"""Sistema de licencias offline.

Cada licencia es un sobre JSON firmado con Ed25519 por el dueño de la app
(clave privada que NUNCA se distribuye) y enlazada al identificador de
hardware del equipo. La app solo lleva la clave pública para verificar.

Esto impide: falsificar claves (no hay clave privada), copiar la app +
licencia a otra máquina (el machine_id no coincide) y el uso casual sin
licencia. No es inviolable para alguien que haga ingeniería inversa del
binario, pero eleva mucho la barrera para una app de escritorio.
"""
import base64
import hashlib
import json
import os
import platform
import re
import subprocess
import uuid
from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from cryptography.hazmat.primitives import serialization

VE_TZ = ZoneInfo("America/Caracas")

# Clave pública del dueño (la privada se guarda fuera del repo). Reemplazada
# por scripts/license_tool.py keygen.
PUBLIC_KEY_PEM = b"""-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAoJatvE+IgUrK2l2Nd/QEab4wyc7+cQBeyWz+W3Yarlw=
-----END PUBLIC KEY-----
"""

_DATA_DIR = os.path.join(os.path.expanduser("~"), ".market-pos")
LICENSE_PATH = os.path.join(_DATA_DIR, "licencia.lic")

_estado_cache: Optional[dict] = None


def _b64e(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode("ascii")


def _b64d(s: str) -> bytes:
    return base64.urlsafe_b64decode(s.encode("ascii"))


def canonical(datos: dict) -> bytes:
    """Serialización determinista para firmar/verificar (debe coincidir
    exactamente entre la herramienta de firma y la verificación)."""
    return json.dumps(
        datos, sort_keys=True, separators=(",", ":"), ensure_ascii=False
    ).encode("utf-8")


def _raw_machine_id() -> str:
    sysname = platform.system()
    try:
        if sysname == "Windows":
            import winreg  # noqa: PLC0415

            key = winreg.OpenKey(
                winreg.HKEY_LOCAL_MACHINE,
                r"SOFTWARE\Microsoft\Cryptography",
            )
            val, _ = winreg.QueryValueEx(key, "MachineGuid")
            return "win:" + str(val)
        if sysname == "Darwin":
            out = subprocess.check_output(
                ["ioreg", "-rd1", "-c", "IOPlatformExpertDevice"],
                stderr=subprocess.DEVNULL,
            ).decode("utf-8", "ignore")
            m = re.search(r'"IOPlatformUUID"\s*=\s*"([^"]+)"', out)
            if m:
                return "mac:" + m.group(1)
        if sysname == "Linux":
            for p in ("/etc/machine-id", "/var/lib/dbus/machine-id"):
                if os.path.exists(p):
                    with open(p) as f:
                        v = f.read().strip()
                    if v:
                        return "lin:" + v
    except Exception:
        pass
    # Respaldo: MAC + nombre del equipo
    return "fb:{}:{}".format(uuid.getnode(), platform.node())


def get_machine_id() -> str:
    """ID estable y anónimo del equipo (hash), agrupado para leerlo fácil."""
    h = hashlib.sha256(_raw_machine_id().encode("utf-8")).hexdigest()[:32].upper()
    return "-".join(h[i : i + 8] for i in range(0, 32, 8))


def _load_public_key() -> Optional[Ed25519PublicKey]:
    try:
        key = serialization.load_pem_public_key(PUBLIC_KEY_PEM)
        if isinstance(key, Ed25519PublicKey):
            return key
    except Exception:
        pass
    return None


def verificar_clave(clave: str) -> dict:
    """Verifica una clave de licencia. Nunca lanza excepción.
    Devuelve {valida, motivo, datos?}."""
    if not clave or not clave.strip():
        return {"valida": False, "motivo": "No hay licencia"}
    pub = _load_public_key()
    if pub is None:
        return {"valida": False, "motivo": "Configuración de licencia inválida"}
    try:
        sobre = json.loads(_b64d(clave.strip()))
        datos = sobre["datos"]
        firma = _b64d(sobre["firma"])
        pub.verify(firma, canonical(datos))
    except (InvalidSignature, KeyError, ValueError, TypeError):
        return {"valida": False, "motivo": "Clave inválida o alterada"}
    except Exception:
        return {"valida": False, "motivo": "Clave inválida o alterada"}

    if datos.get("machine_id") != get_machine_id():
        return {
            "valida": False,
            "motivo": "La licencia no corresponde a este equipo",
        }
    expira = datos.get("expira")
    if expira:
        hoy = datetime.now(VE_TZ).date().isoformat()
        if str(expira) < hoy:
            return {"valida": False, "motivo": "Licencia vencida el " + str(expira)}
    return {"valida": True, "motivo": "", "datos": datos}


def cargar_licencia() -> Optional[str]:
    try:
        with open(LICENSE_PATH, "r", encoding="utf-8") as f:
            return f.read().strip()
    except OSError:
        return None


def guardar_licencia(clave: str) -> None:
    os.makedirs(_DATA_DIR, exist_ok=True)
    with open(LICENSE_PATH, "w", encoding="utf-8") as f:
        f.write(clave.strip())
    refrescar()


def refrescar() -> dict:
    """Recalcula y cachea el estado de la licencia."""
    global _estado_cache
    clave = cargar_licencia()
    res = verificar_clave(clave) if clave else {"valida": False, "motivo": "No hay licencia"}
    _estado_cache = {
        "activa": res["valida"],
        "motivo": res.get("motivo", ""),
        "machine_id": get_machine_id(),
        "info": res.get("datos") if res["valida"] else None,
    }
    return _estado_cache


def estado() -> dict:
    if _estado_cache is None:
        return refrescar()
    return _estado_cache


def licencia_activa() -> bool:
    return estado()["activa"]


def enforcement_enabled() -> bool:
    """Permite desactivar el bloqueo en pruebas (MARKET_POS_LICENSE_ENFORCE=0)."""
    return os.environ.get("MARKET_POS_LICENSE_ENFORCE", "1") != "0"
