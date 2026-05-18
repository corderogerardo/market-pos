#!/usr/bin/env python3
"""Build the Python backend into a standalone binary using PyInstaller.

Places the output in frontend/src-tauri/binaries/ with the correct
target-triple suffix that Tauri expects for externalBin.
"""
import os
import platform
import shutil
import struct
import subprocess
import sys

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
BINARIES_DIR = os.path.join(ROOT_DIR, "frontend", "src-tauri", "binaries")


def get_target_triple():
    """Return the Rust-style target triple for the current platform."""
    machine = platform.machine().lower()
    system = platform.system().lower()

    # Architecture mapping
    arch_map = {
        "x86_64": "x86_64",
        "amd64": "x86_64",
        "aarch64": "aarch64",
        "arm64": "aarch64",
    }
    arch = arch_map.get(machine, machine)

    if system == "darwin":
        return "{}-apple-darwin".format(arch)
    elif system == "linux":
        return "{}-unknown-linux-gnu".format(arch)
    elif system == "windows":
        return "{}-pc-windows-msvc".format(arch)
    else:
        raise RuntimeError("Unsupported platform: {} {}".format(system, machine))


def main():
    triple = get_target_triple()
    print("Building backend for target: {}".format(triple))

    # Install pyinstaller if needed
    subprocess.check_call(
        [sys.executable, "-m", "pip", "install", "pyinstaller"],
    )

    # Run PyInstaller
    subprocess.check_call(
        [
            sys.executable, "-m", "PyInstaller",
            "--onefile",
            "--name", "market-pos-api",
            "--distpath", os.path.join(BACKEND_DIR, "dist"),
            "--workpath", os.path.join(BACKEND_DIR, "build"),
            "--specpath", BACKEND_DIR,
            # Hidden imports for uvicorn (dynamic imports)
            "--hidden-import", "uvicorn.logging",
            "--hidden-import", "uvicorn.loops",
            "--hidden-import", "uvicorn.loops.auto",
            "--hidden-import", "uvicorn.loops.asyncio",
            "--hidden-import", "uvicorn.protocols",
            "--hidden-import", "uvicorn.protocols.http",
            "--hidden-import", "uvicorn.protocols.http.auto",
            "--hidden-import", "uvicorn.protocols.http.h11_impl",
            "--hidden-import", "uvicorn.protocols.websockets",
            "--hidden-import", "uvicorn.protocols.websockets.auto",
            "--hidden-import", "uvicorn.lifespan",
            "--hidden-import", "uvicorn.lifespan.on",
            "--hidden-import", "uvicorn.lifespan.off",
            # Hidden imports for SQLAlchemy
            "--hidden-import", "sqlalchemy.dialects.sqlite",
            # Hidden imports for app modules (imported dynamically in some paths)
            "--hidden-import", "app.main",
            "--hidden-import", "app.database",
            "--hidden-import", "app.models.producto",
            "--hidden-import", "app.models.venta",
            "--hidden-import", "app.models.tasa_bcv",
            "--hidden-import", "app.models.sincronizacion",
            "--hidden-import", "app.models.deuda",
            "--hidden-import", "app.routers.productos",
            "--hidden-import", "app.routers.ventas",
            "--hidden-import", "app.routers.tasa_bcv",
            "--hidden-import", "app.routers.sync",
            "--hidden-import", "app.routers.deudas",
            "--hidden-import", "app.routers.licencia",
            "--hidden-import", "app.schemas.producto",
            "--hidden-import", "app.schemas.venta",
            "--hidden-import", "app.schemas.tasa_bcv",
            "--hidden-import", "app.schemas.sync",
            "--hidden-import", "app.schemas.deuda",
            "--hidden-import", "app.services.bcv_service",
            "--hidden-import", "app.services.google_drive",
            "--hidden-import", "app.services.license_service",
            # Exclude test dependencies
            "--exclude-module", "pytest",
            "--exclude-module", "pytest_asyncio",
            # Collect all submodules for packages that use dynamic imports
            "--collect-submodules", "uvicorn",
            "--collect-submodules", "sqlalchemy",
            "--collect-submodules", "pydantic",
            "--collect-submodules", "cryptography",
            # Entry point
            "market-pos-api.py",
        ],
        cwd=BACKEND_DIR,
    )

    # Create binaries directory
    os.makedirs(BINARIES_DIR, exist_ok=True)

    # Determine source and destination filenames
    if sys.platform == "win32":
        src_name = "market-pos-api.exe"
        dst_name = "market-pos-api-{}.exe".format(triple)
    else:
        src_name = "market-pos-api"
        dst_name = "market-pos-api-{}".format(triple)

    src = os.path.join(BACKEND_DIR, "dist", src_name)
    dst = os.path.join(BINARIES_DIR, dst_name)

    shutil.copy2(src, dst)

    # Make executable on Unix
    if sys.platform != "win32":
        os.chmod(dst, 0o755)

    print("Backend binary ready: {}".format(dst))
    print("Target triple: {}".format(triple))


if __name__ == "__main__":
    main()
