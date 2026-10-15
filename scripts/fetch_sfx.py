#!/usr/bin/env python3
"""Downloads the 3 Mixkit sound effects used in the mix into assets/sfx/ and checks each SHA-256.
The Mixkit Sound Effects Free License allows them in the video but not shared on their own,
so the files are fetched at build time and never committed (assets/sfx/ is git-ignored).
Licence and sources: LICENSES/mixkit.md"""
import hashlib, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SFX = {
    "sweep.wav": ("https://assets.mixkit.co/active_storage/sfx/166/166.wav",
                  "ca5a0206a7e6b12893a5727cb98a9d43ab02893153465eb21d43fb7b9e6616c3"),
    "click.wav": ("https://assets.mixkit.co/active_storage/sfx/1120/1120.wav",
                  "1a7789372a284b2dc2f106da1375b4a3aa4ef3e794c5cbc1b404a1096a6aa467"),
    "tone.wav": ("https://assets.mixkit.co/active_storage/sfx/2870/2870.wav",
                 "084b78463e30dae4aac5edbf9e9c93cdee5ece4a4a688352e6a2b6686f9b1f4a"),
}

def main():
    out = ROOT / "assets/sfx"; out.mkdir(parents=True, exist_ok=True)
    for name, (url, sha) in SFX.items():
        f = out / name
        if not (f.exists() and hashlib.sha256(f.read_bytes()).hexdigest() == sha):
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            f.write_bytes(urllib.request.urlopen(req, timeout=60).read())
        got = hashlib.sha256(f.read_bytes()).hexdigest()
        if got != sha:
            raise SystemExit(f"{name}: SHA-256 {got} does not match {sha}")
        print(f"{name} ok")

if __name__ == "__main__":
    main()
