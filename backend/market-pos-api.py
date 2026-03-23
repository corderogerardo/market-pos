#!/usr/bin/env python3
"""Standalone entry point for the Market POS API (used by PyInstaller)."""
import os
import sys
import uvicorn


def main():
    # Ensure data directory exists
    data_dir = os.path.join(os.path.expanduser("~"), ".market-pos")
    os.makedirs(data_dir, exist_ok=True)

    # Set database URL to stable location
    db_path = os.path.join(data_dir, "market.db")
    os.environ.setdefault("DATABASE_URL", "sqlite:///{}".format(db_path))

    # Import the app after setting env vars
    from app.main import app  # noqa: E402

    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")


if __name__ == "__main__":
    main()
