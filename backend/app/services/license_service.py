"""Sistema de licencias por clave universal.

La app se activa con UNA sola clave maestra que solo posee el dueño. No se
genera una clave por equipo ni se firma nada: la misma clave sirve para
cualquier instalación. En el código solo vive el SHA-256 de la clave (con
un "pepper" fijo), nunca la clave en texto plano, así leer el binario no
revela la clave directamente.

Esto NO es inviolable ante ingeniería inversa (quien parchee el binario
puede saltarse la validación) ni evita que la clave se comparta entre
equipos: es disuasión simple, a cambio de cero fricción para activar.
"""
import hashlib
import hmac
import os
from typing import Optional

# Marca de agua de la clave universal. Generado con scripts/license_tool.py.
# Es sha256(_PEPPER + clave). Cambiar la clave => regenerar este hash.
_PEPPER = "market-pos::licencia-universal::v1"
MASTER_KEY_HASH = "1c5b5b371ed9ad3aa89559277caa91c7cf5de598926670d64dfa2696676ff6ef"

_DATA_DIR = os.path.join(os.path.expanduser("~"), ".market-pos")
LICENSE_PATH = os.path.join(_DATA_DIR, "licencia.lic")

_estado_cache: Optional[dict] = None


def _hash_clave(clave: str) -> str:
    return hashlib.sha256((_PEPPER + clave).encode("utf-8")).hexdigest()


def get_machine_id() -> str:
    """ID informativo del equipo. Ya no se usa para validar (la clave es
    universal), pero se mantiene por compatibilidad con la API/soporte."""
    import platform

    base = "{}|{}".format(platform.node(), platform.system())
    h = hashlib.sha256(base.encode("utf-8")).hexdigest()[:32].upper()
    return "-".join(h[i : i + 8] for i in range(0, 32, 8))


def verificar_clave(clave: str) -> dict:
    """Verifica la clave universal. Nunca lanza excepción.
    Devuelve {valida, motivo, datos?}."""
    if not clave or not clave.strip():
        return {"valida": False, "motivo": "No hay licencia"}
    if hmac.compare_digest(_hash_clave(clave.strip()), MASTER_KEY_HASH):
        return {"valida": True, "motivo": "", "datos": {"tipo": "universal"}}
    return {"valida": False, "motivo": "Clave de licencia incorrecta"}


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
        "info": None,
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
