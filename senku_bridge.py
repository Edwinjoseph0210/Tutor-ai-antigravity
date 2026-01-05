import os
import sys
import hashlib
from pathlib import Path

# Path to the unpacked senku code (created earlier when you provided the ZIP)
SENKU_PATH = os.path.join(os.path.dirname(__file__), 'senku_unpacked', 'senku')


def _ensure_senku_on_path():
    if SENKU_PATH not in sys.path:
        sys.path.insert(0, SENKU_PATH)


def extract_curriculum_from_pdf(pdf_path: str) -> dict:
    """Return {'pdf_hash': str, 'curriculum': list} by using Senku's ingestion modules.

    Relies on the `senku_unpacked/senku` folder present in the repository root.
    """
    _ensure_senku_on_path()

    try:
        from ingestion.document_loader import DocumentLoader
        from ingestion.curriculum_extractor import CurriculumExtractor
    except Exception as e:
        raise ImportError(f"Failed to import Senku ingestion modules: {e}")

    pdf_path = str(Path(pdf_path).resolve())
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    # Compute a stable hash for caching/keying
    h = hashlib.sha256()
    with open(pdf_path, 'rb') as f:
        while True:
            chunk = f.read(8192)
            if not chunk:
                break
            h.update(chunk)
    pdf_hash = h.hexdigest()

    # Load text
    loader = DocumentLoader()
    text = loader.load_pdf(pdf_path)

    # Extract curriculum
    extractor = CurriculumExtractor()
    curriculum = extractor.extract_curriculum(text)

    return {'pdf_hash': pdf_hash, 'curriculum': curriculum}


if __name__ == '__main__':
    print('senku_bridge available. Call extract_curriculum_from_pdf(path)')
