"""Hash of everything that decides what the video shows: the script and the scene code.
encode.py stamps it into the MP4 metadata and check.py compares it, so a stale video is caught."""
import hashlib
from pathlib import Path

FILES = ("content/script.json", "scenes/design/template.html", "scenes/design/explainer.jsx", "scenes/design/animations-v3.jsx",
         "scenes/design/support.js", "scenes/design/tweaks-panel.jsx", "scenes/design/logos.json")

def build_hash(root):
    h = hashlib.sha256()
    for f in FILES:
        h.update(Path(root, f).read_bytes())
    return h.hexdigest()[:16]
