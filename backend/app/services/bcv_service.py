"""Servicio para obtener la tasa USD/Bs del Banco Central de Venezuela."""
import re
from typing import Optional, Dict
from datetime import date
import httpx
from bs4 import BeautifulSoup


async def obtener_tasa_bcv() -> Optional[Dict]:
    """Obtiene la tasa USD/Bs del Banco Central de Venezuela."""
    try:
        async with httpx.AsyncClient(timeout=15.0, verify=False) as client:
            response = await client.get("https://www.bcv.org.ve/")
            response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        dolar_div = soup.find("div", {"id": "dpiGroup"})
        if not dolar_div:
            dolar_div = soup.find("div", class_="field-content")

        if dolar_div:
            tasa_text = dolar_div.get_text(strip=True)
            tasa_text = tasa_text.replace(",", ".")
            match = re.search(r"(\d+[.,]?\d*)", tasa_text)
            if match:
                tasa = float(match.group(1))
                return {"fecha": date.today().isoformat(), "tasa": tasa}

        return None
    except Exception:
        return None
