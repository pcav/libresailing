#!/usr/bin/env python3
"""
index_immagini_postgres.py

Scansiona una cartella (ricorsivamente) alla ricerca di immagini .jpg/.jpeg/.png,
per ognuna:
  - calcola l'hash MD5 del contenuto
  - estrae (se presenti) le coordinate GPS dagli EXIF
  - estrae titolo e didascalia da XMP (dc:title / dc:description) e, come fallback
    per i JPEG, dai campi IPTC (Object Name / Caption-Abstract)

e sincronizza il tutto con una tabella PostgreSQL/PostGIS usando il PERCORSO del file
come chiave logica del record. Le coordinate GPS vengono salvate come geometria
puntuale in una colonna `geometry(Point, 4326)` (non come due colonne lat/lon):
  - file nuovo (percorso non presente in tabella)      -> INSERT nuovo record
  - file esistente ma hash cambiato                     -> UPDATE posizione, titolo,
                                                             didascalia, hash, dimensione
  - file esistente con hash invariato                   -> nessuna modifica
  - record in tabella il cui file non è più presente     -> DELETE del record
    nella cartella scansionata

Richiede un database PostgreSQL con l'estensione PostGIS disponibile
(lo script esegue "CREATE EXTENSION IF NOT EXISTS postgis;" all'avvio).

Dipendenze Python:
    pip install pillow psycopg2-binary iptcinfo3

Configurazione: modifica le costanti nella sezione "CONFIGURAZIONE" qui sotto
e poi esegui semplicemente:
    python index_immagini_postgres.py
"""

import hashlib
import os
import sys
from datetime import datetime

from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

import psycopg2
from psycopg2.extras import execute_values

from synctdm_conf import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD


# =============================================================================
# CONFIGURAZIONE - modifica questi valori secondo le tue esigenze
# =============================================================================

CARTELLA = "/home/paolo/TdM"                # cartella con le immagini da scansionare (ricorsivo)

TABELLA = "photo_tdm"               # nome della tabella di destinazione
BATCH_SIZE = 200                   # quante righe inserire/aggiornare per volta

ELIMINA_RECORD_ORFANI = True       # True: elimina i record dei file non più presenti
                                    # nella cartella scansionata

# =============================================================================

ESTENSIONI_VALIDE = (".jpg", ".jpeg", ".png")


# --------------------------------------------------------------------------- #
# Hash
# --------------------------------------------------------------------------- #

def calcola_hash(percorso_file: str, algoritmo: str = "md5", blocco: int = 65536) -> str:
    """Calcola l'hash del contenuto del file, leggendolo a blocchi per non saturare la RAM."""
    h = hashlib.new(algoritmo)
    with open(percorso_file, "rb") as f:
        for chunk in iter(lambda: f.read(blocco), b""):
            h.update(chunk)
    return h.hexdigest()


# --------------------------------------------------------------------------- #
# EXIF - coordinate GPS
# --------------------------------------------------------------------------- #

def _converti_in_gradi(valore) -> float:
    """Converte una tupla EXIF (gradi, minuti, secondi) in gradi decimali."""
    gradi, minuti, secondi = valore
    return float(gradi) + float(minuti) / 60.0 + float(secondi) / 3600.0


def estrai_coordinate_gps(img: Image.Image, percorso_file: str):
    """
    Restituisce (latitudine, longitudine) come float con segno (nord/est positivi),
    oppure (None, None) se l'immagine non ha dati GPS nell'EXIF.
    """
    try:
        exif_raw = img._getexif()
        if not exif_raw:
            return None, None

        exif = {TAGS.get(k, k): v for k, v in exif_raw.items()}
        gps_info = exif.get("GPSInfo")
        if not gps_info:
            return None, None

        gps = {GPSTAGS.get(k, k): v for k, v in gps_info.items()}

        lat = gps.get("GPSLatitude")
        lat_ref = gps.get("GPSLatitudeRef")
        lon = gps.get("GPSLongitude")
        lon_ref = gps.get("GPSLongitudeRef")

        if not (lat and lon and lat_ref and lon_ref):
            return None, None

        latitudine = _converti_in_gradi(lat)
        if lat_ref in ("S", "s"):
            latitudine = -latitudine

        longitudine = _converti_in_gradi(lon)
        if lon_ref in ("W", "w"):
            longitudine = -longitudine

        return latitudine, longitudine
    except Exception as e:
        print(f"  [WARN] impossibile leggere EXIF GPS da '{percorso_file}': {e}", file=sys.stderr)
        return None, None


# --------------------------------------------------------------------------- #
# XMP / IPTC - titolo e didascalia
# --------------------------------------------------------------------------- #

def _estrai_testo_alt(valore):
    """
    I campi Dublin Core (dc:title, dc:description) nell'XMP sono tipicamente
    strutturati come rdf:Alt -> rdf:li (con eventuale attributo xml:lang).
    Questa funzione prova a estrarre il testo semplice indipendentemente
    dalla forma esatta restituita dal parser XMP di Pillow.
    """
    if valore is None:
        return None
    if isinstance(valore, str):
        return valore.strip() or None
    if isinstance(valore, dict):
        alt = valore.get("Alt") or valore.get("rdf:Alt")
        if alt is not None:
            li = alt.get("li") if isinstance(alt, dict) else None
            if isinstance(li, dict):
                testo = li.get("text") or li.get("#text")
                if testo:
                    return str(testo).strip() or None
                # a volte il dict ha solo il testo come unico valore
                for v in li.values():
                    if isinstance(v, str):
                        return v.strip() or None
            if isinstance(li, list) and li:
                primo = li[0]
                if isinstance(primo, dict):
                    testo = primo.get("text") or primo.get("#text")
                    return (str(testo).strip() or None) if testo else None
                if isinstance(primo, str):
                    return primo.strip() or None
            if isinstance(li, str):
                return li.strip() or None
        if "text" in valore:
            return str(valore["text"]).strip() or None
    return None


def _trova_nodo_description(nodo):
    """Cerca ricorsivamente il nodo rdf:Description all'interno del dict XMP di Pillow."""
    if isinstance(nodo, dict):
        if "Description" in nodo:
            return nodo["Description"]
        for v in nodo.values():
            trovato = _trova_nodo_description(v)
            if trovato is not None:
                return trovato
    return None


def estrai_titolo_didascalia_xmp(img: Image.Image):
    """Estrae (titolo, didascalia) dai metadati XMP, se presenti. Richiede Pillow >= 9.1."""
    titolo, didascalia = None, None
    try:
        getxmp = getattr(img, "getxmp", None)
        if getxmp is None:
            return None, None
        xmp = getxmp()
        if not xmp:
            return None, None

        descr = _trova_nodo_description(xmp) or xmp
        nodi = descr if isinstance(descr, list) else [descr]

        for nodo in nodi:
            if not isinstance(nodo, dict):
                continue
            for chiave, valore in nodo.items():
                chiave_lower = chiave.lower()
                if titolo is None and "title" in chiave_lower:
                    titolo = _estrai_testo_alt(valore)
                if didascalia is None and ("description" in chiave_lower or "caption" in chiave_lower):
                    didascalia = _estrai_testo_alt(valore)
    except Exception:
        pass
    return titolo, didascalia


def estrai_titolo_didascalia_iptc(percorso_file: str):
    """Estrae (titolo, didascalia) dai campi IPTC IIM. Funziona solo su JPEG."""
    titolo, didascalia = None, None
    try:
        from iptcinfo3 import IPTCInfo
        info = IPTCInfo(percorso_file, force=True)

        ogg = info["object name"]
        if ogg:
            titolo = ogg.decode("utf-8", errors="replace") if isinstance(ogg, bytes) else str(ogg)
            titolo = titolo.strip() or None

        cap = info["caption/abstract"]
        if cap:
            didascalia = cap.decode("utf-8", errors="replace") if isinstance(cap, bytes) else str(cap)
            didascalia = didascalia.strip() or None
    except Exception:
        pass
    return titolo, didascalia


def estrai_titolo_didascalia(img: Image.Image, percorso_file: str):
    """
    Combina XMP e IPTC: prova prima l'XMP (standard più moderno e usato anche
    da PNG), e usa l'IPTC come fallback per i campi eventualmente mancanti
    (solo per i file JPEG, dove l'IPTC IIM è supportato).
    """
    titolo, didascalia = estrai_titolo_didascalia_xmp(img)

    if (titolo is None or didascalia is None) and percorso_file.lower().endswith((".jpg", ".jpeg")):
        titolo_iptc, didascalia_iptc = estrai_titolo_didascalia_iptc(percorso_file)
        titolo = titolo or titolo_iptc
        didascalia = didascalia or didascalia_iptc

    return titolo, didascalia


# --------------------------------------------------------------------------- #
# Scansione filesystem
# --------------------------------------------------------------------------- #

def trova_immagini(cartella: str):
    """Genera i percorsi assoluti di tutte le immagini valide nella cartella (ricorsivo)."""
    for root, _dirs, files in os.walk(cartella):
        for nome in files:
            if nome.lower().endswith(ESTENSIONI_VALIDE):
                yield os.path.abspath(os.path.join(root, nome))


# --------------------------------------------------------------------------- #
# PostgreSQL
# --------------------------------------------------------------------------- #

def crea_tabella(conn, tabella: str):
    with conn.cursor() as cur:
        cur.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
    conn.commit()

    ddl = f"""
    CREATE TABLE IF NOT EXISTS {tabella} (
        id              SERIAL PRIMARY KEY,
        percorso        TEXT NOT NULL UNIQUE,
        nome_file       TEXT NOT NULL,
        hash_md5        TEXT NOT NULL,
        titolo          TEXT,
        didascalia      TEXT,
        posizione       geometry(Point, 4326),
        dimensione_byte BIGINT,
        data_scansione  TIMESTAMP NOT NULL DEFAULT NOW()
    );
    """
    with conn.cursor() as cur:
        cur.execute(ddl)
        # Indice spaziale, utile per query geografiche (bounding box, distanza, ecc.)
        cur.execute(
            f"CREATE INDEX IF NOT EXISTS idx_{tabella}_posizione "
            f"ON {tabella} USING GIST (posizione);"
        )
    conn.commit()


def sincronizza_su_postgres(conn, tabella: str, righe: list):
    """
    Upsert basato sul PERCORSO (chiave logica del file):
      - percorso nuovo                       -> INSERT
      - percorso esistente, hash diverso      -> UPDATE di hash/titolo/didascalia/
                                                  posizione/dimensione/data_scansione
      - percorso esistente, hash invariato    -> nessuna modifica (righe intatte)

    Ogni riga in `righe` deve essere una tupla:
        (percorso, nome_file, hash_md5, titolo, didascalia, longitudine, latitudine, dimensione_byte)
    Se longitudine/latitudine sono None, ST_MakePoint restituisce una geometria NULL
    (le funzioni PostGIS sono "strict": input NULL -> output NULL).
    """
    query = f"""
        INSERT INTO {tabella}
            (percorso, nome_file, hash_md5, titolo, didascalia, posizione, dimensione_byte)
        VALUES %s
        ON CONFLICT (percorso) DO UPDATE SET
            nome_file       = EXCLUDED.nome_file,
            hash_md5        = EXCLUDED.hash_md5,
            titolo          = EXCLUDED.titolo,
            didascalia      = EXCLUDED.didascalia,
            posizione       = EXCLUDED.posizione,
            dimensione_byte = EXCLUDED.dimensione_byte,
            data_scansione  = NOW()
        WHERE {tabella}.hash_md5 IS DISTINCT FROM EXCLUDED.hash_md5 RETURNING 1;
    """
    # Template custom: longitudine/latitudine (5° e 6° valore della tupla)
    # vengono passati a ST_SetSRID(ST_MakePoint(lon, lat), 4326) invece di
    # essere inseriti come colonne dirette.
    template = "(%s, %s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s)"

    with conn.cursor() as cur:
        record_aggiornati = execute_values(cur, query, righe, template=template, fetch=True)
        aggiornamenti = len(record_aggiornati)
    conn.commit()
    return aggiornamenti


def elimina_record_orfani(conn, tabella: str, percorsi_presenti: list) -> int:
    """Elimina dalla tabella i record il cui file non è più presente nella cartella scansionata."""
    query = f"DELETE FROM {tabella} WHERE percorso <> ALL(%s) RETURNING percorso;"
    with conn.cursor() as cur:
        cur.execute(query, (percorsi_presenti,))
        eliminati = cur.fetchall()
    conn.commit()
    for (percorso,) in eliminati:
        print(f"  [RIMOSSO] record eliminato (file non più presente): {percorso}")
    return len(eliminati)


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #

def main():
    if not os.path.isdir(CARTELLA):
        print(f"Errore: la cartella '{CARTELLA}' non esiste.", file=sys.stderr)
        sys.exit(1)

    print(f"Connessione a PostgreSQL ({DB_HOST}:{DB_PORT}/{DB_NAME})...")
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
    )

    crea_tabella(conn, TABELLA)

    righe_batch = []
    percorsi_trovati = []
    totale = 0
    inizio = datetime.now()
    aggiornati = 0

    for percorso in trova_immagini(CARTELLA):
        nome_file = os.path.basename(percorso)
        print(f"Elaboro: {percorso}")
        percorsi_trovati.append(percorso)

        try:
            hash_valore = calcola_hash(percorso)
            dimensione = os.path.getsize(percorso)

            with Image.open(percorso) as img:
                lat, lon = estrai_coordinate_gps(img, percorso)
                titolo, didascalia = estrai_titolo_didascalia(img, percorso)

        except Exception as e:
            print(f"  [ERRORE] salto '{percorso}': {e}", file=sys.stderr)
            continue

        righe_batch.append(
            (percorso, nome_file, hash_valore, titolo, didascalia, lon, lat, dimensione)
        )
        totale += 1

        if len(righe_batch) >= BATCH_SIZE:
            aggiornati += sincronizza_su_postgres(conn, TABELLA, righe_batch)
            righe_batch = []

    if righe_batch:
        aggiornati += sincronizza_su_postgres(conn, TABELLA, righe_batch)

    eliminati = 0
    if ELIMINA_RECORD_ORFANI:
        # Se la cartella risulta vuota (0 immagini trovate) evitiamo di cancellare
        # tutta la tabella per errore: probabile problema di percorso.
        if percorsi_trovati:
            eliminati = elimina_record_orfani(conn, TABELLA, percorsi_trovati)
        else:
            print("[AVVISO] nessuna immagine trovata nella cartella: salto la fase di eliminazione per sicurezza.")

    conn.close()

    durata = (datetime.now() - inizio).total_seconds()
    print(
        f"\nCompletato: {totale} immagini elaborate, {eliminati} record rimossi, {aggiornati} record aggiornati"
        f"in {durata:.1f}s."
    )


if __name__ == "__main__":
    main()
