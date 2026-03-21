"""Servicio para subir/descargar backups a Google Drive."""
import os
import json
from typing import Optional
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
import io

SCOPES = ["https://www.googleapis.com/auth/drive.file"]
CONFIG_DIR = os.path.join(os.path.expanduser("~"), ".market-pos")
TOKEN_PATH = os.path.join(CONFIG_DIR, "google_token.json")
CREDENTIALS_PATH = os.path.join(CONFIG_DIR, "google_credentials.json")
FOLDER_NAME = "Market POS Backups"


def _ensure_config_dir():
    os.makedirs(CONFIG_DIR, exist_ok=True)


def is_configured() -> bool:
    """Check if Google Drive credentials are set up."""
    return os.path.exists(CREDENTIALS_PATH)


def get_credentials() -> Optional[Credentials]:
    """Get valid Google Drive credentials, refreshing or re-authenticating as needed."""
    _ensure_config_dir()
    creds = None

    if os.path.exists(TOKEN_PATH):
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)

    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            with open(TOKEN_PATH, "w") as f:
                f.write(creds.to_json())
            return creds
        except Exception:
            creds = None

    if not creds:
        if not os.path.exists(CREDENTIALS_PATH):
            return None
        flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, SCOPES)
        creds = flow.run_local_server(port=9090, open_browser=True)
        with open(TOKEN_PATH, "w") as f:
            f.write(creds.to_json())

    return creds


def _get_or_create_folder(service) -> str:
    """Get or create the backup folder in Google Drive."""
    results = (
        service.files()
        .list(
            q="name='{}' and mimeType='application/vnd.google-apps.folder' and trashed=false".format(FOLDER_NAME),
            spaces="drive",
            fields="files(id, name)",
        )
        .execute()
    )
    files = results.get("files", [])

    if files:
        return files[0]["id"]

    folder_metadata = {
        "name": FOLDER_NAME,
        "mimeType": "application/vnd.google-apps.folder",
    }
    folder = service.files().create(body=folder_metadata, fields="id").execute()
    return folder["id"]


def upload_to_drive(filepath: str) -> dict:
    """Upload a backup file to Google Drive."""
    creds = get_credentials()
    if not creds:
        raise Exception(
            "Google Drive no configurado. Coloque el archivo credentials.json en: {}".format(CREDENTIALS_PATH)
        )

    service = build("drive", "v3", credentials=creds)
    folder_id = _get_or_create_folder(service)

    filename = os.path.basename(filepath)
    file_metadata = {"name": filename, "parents": [folder_id]}
    media = MediaFileUpload(filepath, mimetype="application/json")

    file = (
        service.files()
        .create(body=file_metadata, media_body=media, fields="id, name, webViewLink")
        .execute()
    )

    return {
        "id": file.get("id"),
        "nombre": file.get("name"),
        "url": file.get("webViewLink"),
    }


def download_latest_from_drive(dest_path: str) -> Optional[str]:
    """Download the most recent backup from Google Drive."""
    creds = get_credentials()
    if not creds:
        raise Exception("Google Drive no configurado")

    service = build("drive", "v3", credentials=creds)
    folder_id = _get_or_create_folder(service)

    results = (
        service.files()
        .list(
            q="'{}' in parents and trashed=false".format(folder_id),
            spaces="drive",
            fields="files(id, name, createdTime)",
            orderBy="createdTime desc",
            pageSize=1,
        )
        .execute()
    )

    files = results.get("files", [])
    if not files:
        return None

    file_id = files[0]["id"]
    file_name = files[0]["name"]

    request = service.files().get_media(fileId=file_id)
    fh = io.BytesIO()
    downloader = MediaIoBaseDownload(fh, request)
    done = False
    while not done:
        _, done = downloader.next_chunk()

    dest_file = os.path.join(dest_path, file_name)
    with open(dest_file, "wb") as f:
        f.write(fh.getvalue())

    return dest_file
