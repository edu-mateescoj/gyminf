#!/usr/bin/env python3
"""
Extrait dans un fichier .py (ou affiche) tous les fragments contenant
TYPE_COMPATIBILITY, OPERATION_PATTERNS ou MIXED_TYPE_PATTERNS
depuis un fichier chatSessions Copilot (Markdown + code JS).
"""

import json
import pathlib
import re
from typing import Iterator, Union

# ---------------------------------------------------------------------------
#  ⚠️  Mets ici **ton** chemin exact
JSON_FILE = r"C:\Users\install\AppData\Roaming\Code\User\workspaceStorage" \
            r"\3762487d86e14809d2f511789a965883\chatSessions" \
            r"\a1b5d2ac-ea91-4ed8-87bd-6818ab072f71.json"
# ---------------------------------------------------------------------------

KEYWORDS = ("TYPE_COMPATIBILITY", "OPERATION_PATTERNS", "MIXED_TYPE_PATTERNS")
OUTPUT_PY = "extraits_copilot.py"      # mets None pour un simple print()

# ---------------------------------------------------------------------------


def walk_strings(node: Union[dict, list, str]) -> Iterator[str]:
    """Itère sur toutes les chaînes présentes dans le JSON (recherche récursive)."""
    if isinstance(node, dict):
        for v in node.values():
            yield from walk_strings(v)
    elif isinstance(node, list):
        for item in node:
            yield from walk_strings(item)
    elif isinstance(node, str):
        yield node


# retire l’enveloppe ```javascript … ``` (ou ```python … ```) si elle existe
_strip_fence = re.compile(r"^```[a-zA-Z]*\s*\n?|\n?```$")

def clean(text: str) -> str:
    return _strip_fence.sub("", text).strip()


def extract(path: str) -> list[str]:
    data = json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
    snippets: list[str] = []

    for s in walk_strings(data):
        if any(k in s for k in KEYWORDS):
            snippets.append(clean(s))

    return snippets


if __name__ == "__main__":
    fragments = extract(JSON_FILE)

    if OUTPUT_PY:
        out = pathlib.Path(OUTPUT_PY)
        out.write_text("\n\n# ---\n\n".join(fragments), encoding="utf-8")
        print(f"{len(fragments)} fragment(s) enregistré(s) dans {out}")
    else:
        for i, frag in enumerate(fragments, 1):
            print(f"\n# === Fragment {i} ===\n{frag}\n")
