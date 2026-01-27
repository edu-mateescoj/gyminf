import argparse, subprocess, sys, time, urllib.request

ENDPOINTS = [
    ("/app", None),
    ("/static/css/styles.css", "text/css"),
    ("/static/js/main.js", "application/javascript"),
    ("/static/assets/pyodide/pyodide.js", "application/javascript"),
    ("/static/assets/pyodide/pyodide.asm.wasm", "application/wasm"),
    ("/static/assets/pyodide/python_stdlib.zip", None),
]

def fetch(url: str):
    try:
        with urllib.request.urlopen(url) as resp:
            return resp.getcode(), resp.headers.get("Content-Type", "")
    except Exception as exc:
        return None, str(exc)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:5000", help="URL de base du serveur Flask")
    parser.add_argument("--start-server", action="store_true", help="Démarrer python app.py avant les vérifs")
    args = parser.parse_args()

    proc = None
    if args.start_server:
        proc = subprocess.Popen([sys.executable, "app.py"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        time.sleep(3)  # laisser le temps au serveur de démarrer

    ok = True
    for path, expected_ct in ENDPOINTS:
        url = args.base_url.rstrip("/") + path
        status, ct = fetch(url)
        status_ok = status in (200, 302)
        ct_ok = expected_ct is None or (ct.lower().startswith(expected_ct) if ct else False)
        if not (status_ok and ct_ok):
            ok = False
            print(f"[FAIL] {url} status={status} ct={ct}")
        else:
            print(f"[OK]   {url} status={status} ct={ct}")

    if proc:
        proc.terminate()
    return 0 if ok else 1

if __name__ == "__main__":
    sys.exit(main())
