import argparse
import sys
import requests

ENDPOINTS = [
    ("/", None),
    ("/app", None),  # peut rediriger si non authentifié; statut 200/302 toléré
    ("/static/css/styles.css", "text/css"),
    ("/static/js/main.js", "application/javascript"),
    ("/static/assets/pyodide/pyodide.js", "application/javascript"),
    ("/static/assets/pyodide/python_stdlib.zip", None),
    ("/static/assets/pyodide/pyodide.asm.wasm", "application/wasm"),  # ajuster au nom réel du .wasm
]

def check(base_url: str) -> int:
    ok = True
    for path, expected_ct in ENDPOINTS:
        url = base_url.rstrip("/") + path
        try:
            resp = requests.get(url, allow_redirects=True)
            status_ok = resp.status_code in (200, 304, 302)
            ct_ok = expected_ct is None or (resp.headers.get("Content-Type") or "").startswith(expected_ct)
            if not (status_ok and ct_ok):
                ok = False
                print(f"[FAIL] {url} status={resp.status_code} ct={resp.headers.get('Content-Type')}")
            else:
                print(f"[OK]   {url} status={resp.status_code} ct={resp.headers.get('Content-Type')}")
        except Exception as exc:
            ok = False
            print(f"[ERR]  {url} error={exc}")
    return 0 if ok else 1

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sanity check des endpoints locaux (offline).")
    parser.add_argument("--base-url", default="http://127.0.0.1:5000", help="Base URL du serveur Flask.")
    args = parser.parse_args()
    sys.exit(check(args.base_url))
