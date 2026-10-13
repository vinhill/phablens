#!/usr/bin/env python3
"""Create an upload-ready ZIP of the PhabLens Firefox extension."""

from pathlib import Path
import json
import sys
import zipfile


ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "manifest.json"
OUTPUT_DIR = ROOT / "artifacts"


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    name = "phablens-{}-firefox.zip".format(manifest["version"])
    OUTPUT_DIR.mkdir(exist_ok=True)
    output = OUTPUT_DIR / name
    if output.exists():
        print(
            "Warning: {} already exists and will be overwritten".format(output.relative_to(ROOT)),
            file=sys.stderr,
        )

    # Keep the archive rooted at manifest.json. The extension is plain JS, so
    # only its manifest and runtime source directory are needed.
    files = [MANIFEST, *sorted((ROOT / "src").rglob("*"))]
    files = [path for path in files if path.is_file()]
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in files:
            archive.write(path, path.relative_to(ROOT))

    print("Created {} ({} files)".format(output.relative_to(ROOT), len(files)))


if __name__ == "__main__":
    main()
