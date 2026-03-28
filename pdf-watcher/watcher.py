"""
PDF Watcher – Vigilante de facturas para descuento automático de stock
======================================================================
Monitorea una carpeta local. Cuando aparece un PDF nuevo:
  1. Extrae texto directamente del PDF (pdfplumber, sin OCR)
  2. Parsea código de artículo y cantidad de cada línea
  3. Envía un POST a la Supabase Edge Function con los datos

Dependencias:
    pip install watchdog requests pdfplumber python-dotenv

Formato de factura soportado (Robles Pinturerias):
  CODIGO  UNIDAD  DESCRIPCION  CANTIDAD  PRECIO  ...
  Ej: 06010741 kg ZEOFLEX MAS.P/PLAST.0.7KG. 1,00 33.076,95 ...
"""

import os
import re
import json
import time
import hashlib
import logging
from pathlib import Path

import requests
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import pdfplumber
from dotenv import load_dotenv

# ──────────────────────────────────────────────────────────────────
# CONFIGURACIÓN (desde .env)
# ──────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")

# Carpeta a vigilar
WATCH_FOLDER = os.getenv("WATCH_FOLDER", r"C:\Facturas")

# Ubicación de ventas (sucursal que vende el stock)
# Valores válidos: "sucursal_1", "sucursal_2", "sucursal_3", "deposito_central"
UBICACION_VENTA = os.getenv("UBICACION_VENTA", "sucursal_1")

# URL de tu Supabase Edge Function
EDGE_FUNCTION_URL = os.getenv("EDGE_FUNCTION_URL", "")

# Clave secreta que configurarás también en la Edge Function
API_SECRET_KEY = os.getenv("API_SECRET_KEY", "")

# ──────────────────────────────────────────────────────────────────
# LOGGING
# ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(BASE_DIR / "watcher.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger(__name__)


def validate_config() -> None:
    missing = []
    if not EDGE_FUNCTION_URL:
        missing.append("EDGE_FUNCTION_URL")
    if not API_SECRET_KEY:
        missing.append("API_SECRET_KEY")
    if missing:
        msg = (
            "Faltan variables en .env: "
            + ", ".join(missing)
            + ". Crea/edita pdf-watcher/.env"
        )
        log.error(msg)
        raise SystemExit(1)

# ──────────────────────────────────────────────────────────────────
# BASE DE DATOS LOCAL de archivos ya procesados (evita duplicados)
# ──────────────────────────────────────────────────────────────────

PROCESSED_DB = BASE_DIR / "processed_files.json"


def load_processed() -> set:
    if PROCESSED_DB.exists():
        try:
            with open(PROCESSED_DB, "r", encoding="utf-8") as f:
                return set(json.load(f))
        except (json.JSONDecodeError, OSError):
            pass
    return set()


def save_processed(processed: set) -> None:
    with open(PROCESSED_DB, "w", encoding="utf-8") as f:
        json.dump(list(processed), f)


def file_hash(path: str) -> str:
    """SHA-256 del archivo para identificación única."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


# ──────────────────────────────────────────────────────────────────
# EXTRACCIÓN DE TEXTO (pdfplumber)
# ──────────────────────────────────────────────────────────────────

# Formato de línea de artículo en la factura:
#   CODIGO  UNIDAD  DESCRIPCION  CANTIDAD  PRECIO  ...
#   Ej: 06010741 kg ZEOFLEX MAS.P/PLAST.0.7KG. 1,00 33.076,95 27,00 8930,78 24.146,17
#
# Reglas:
#   - CODIGO: 5-10 dígitos al inicio de la línea
#   - UNIDAD: token sin espacios (kg, lt, un, etc.)
#   - DESCRIPCION: texto libre (puede contener puntos y barras)
#   - CANTIDAD: primer número con exactly 2 decimales separados por coma (ej: 1,00)
_LINE_RE = re.compile(
    r"^(\d{5,10})"     # código de artículo
    r"\s+\S+"           # unidad
    r"\s+(.+?)"         # descripción (lazy)
    r"\s+(\d[\d\.]*)"  # parte entera de la cantidad (puede tener puntos miles)
    r","                # separador decimal (coma)
    r"\d{2}"            # dos decimales
    r"(?:\s|$)"         # debe seguir espacio o fin de línea
)


def extract_items_from_pdf(pdf_path: str) -> list[dict]:
    """
    Extrae items de una factura PDF con texto seleccionable.
    Retorna lista de {"codigo": str, "descripcion": str, "cantidad": int}.
    """
    items = []

    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ""
                log.debug(f"  Página {page_num} texto:\n{text}")
                for line in text.splitlines():
                    line = line.strip()
                    m = _LINE_RE.match(line)
                    if not m:
                        continue
                    codigo = m.group(1)
                    descripcion = m.group(2).strip()
                    # cantidad: quitar puntos de miles → int
                    cantidad = int(round(float(m.group(3).replace(".", ""))))
                    if cantidad > 0:
                        items.append({"codigo": codigo, "descripcion": descripcion, "cantidad": cantidad})
                        log.info(f"  Detectado → código={codigo}  desc={descripcion}  cantidad={cantidad}")
    except Exception as e:
        log.error(f"Error leyendo PDF {pdf_path}: {e}")

    if not items:
        log.warning("No se detectaron productos. Revisá el formato de la factura.")

    return items


# ──────────────────────────────────────────────────────────────────
# API
# ──────────────────────────────────────────────────────────────────

def send_to_api(items: list[dict], filename: str) -> bool:
    headers = {
        "Content-Type": "application/json",
        "x-api-key": API_SECRET_KEY,
    }

    all_ok = True

    for item in items:
        payload = {**item, "ubicacion": UBICACION_VENTA}
        try:
            resp = requests.post(
                EDGE_FUNCTION_URL,
                json=payload,
                headers=headers,
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            log.info(
                f"[{filename}] ✓ {item['codigo']} -{item['cantidad']} unid."
                f"  Stock anterior: {data.get('stock_anterior')}  → Nuevo: {data.get('stock_nuevo')}"
            )
        except requests.exceptions.HTTPError as e:
            body = e.response.text if e.response else "sin respuesta"
            log.error(f"[{filename}] HTTP {e.response.status_code} para {item}: {body}")
            all_ok = False
        except requests.exceptions.RequestException as e:
            log.error(f"[{filename}] Error de red para {item}: {e}")
            all_ok = False

    return all_ok


# ──────────────────────────────────────────────────────────────────
# WATCHDOG
# ──────────────────────────────────────────────────────────────────

class PDFHandler(FileSystemEventHandler):
    def __init__(self):
        self.processed = load_processed()
        self.last_attempt: dict[str, float] = {}
        self.retry_interval_sec = 60

    def on_created(self, event):
        if event.is_directory:
            return
        if not event.src_path.lower().endswith(".pdf"):
            return
        # Espera breve para que el archivo esté completamente escrito
        time.sleep(2)
        self._process(event.src_path)

    def retry_pending(self) -> None:
        try:
            for name in os.listdir(WATCH_FOLDER):
                if not name.lower().endswith(".pdf"):
                    continue
                self._process(os.path.join(WATCH_FOLDER, name))
        except OSError as e:
            log.error(f"No se pudo escanear carpeta vigilada: {e}")

    def _process(self, path: str) -> None:
        try:
            fhash = file_hash(path)
        except OSError as e:
            log.error(f"No se pudo leer {path}: {e}")
            return

        now = time.time()
        last = self.last_attempt.get(fhash, 0)
        if now - last < self.retry_interval_sec:
            return

        if fhash in self.processed:
            log.info(f"Archivo ya procesado, ignorando: {os.path.basename(path)}")
            return

        self.last_attempt[fhash] = now

        filename = os.path.basename(path)
        log.info(f"{'─'*50}")
        log.info(f"Nuevo PDF detectado: {filename}")

        items = extract_items_from_pdf(path)

        if not items:
            log.warning(f"Sin productos extraídos en {filename}. Archivo marcado como procesado.")
            self.processed.add(fhash)
            save_processed(self.processed)
            return

        ok = send_to_api(items, filename)
        if ok:
            self.processed.add(fhash)
            save_processed(self.processed)
            return

        log.warning(
            f"[{filename}] Queda pendiente para reintento automático en {self.retry_interval_sec}s "
            "(por ejemplo si el producto aún no existe en base)."
        )


# ──────────────────────────────────────────────────────────────────
# ENTRY POINT
# ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    validate_config()
    os.makedirs(WATCH_FOLDER, exist_ok=True)
    log.info(f"Iniciando vigilante en: {WATCH_FOLDER}")
    log.info(f"Endpoint: {EDGE_FUNCTION_URL}")
    log.info(f"Ubicación de venta: {UBICACION_VENTA}")

    handler = PDFHandler()
    observer = Observer()
    observer.schedule(handler, WATCH_FOLDER, recursive=False)
    observer.start()

    try:
        while True:
            handler.retry_pending()
            time.sleep(5)
    except KeyboardInterrupt:
        log.info("Deteniendo vigilante...")
        observer.stop()

    observer.join()
    log.info("Vigilante detenido.")
