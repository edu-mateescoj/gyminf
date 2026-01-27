# Mode classe LAN (GYMINF)

## Prérequis
- Python 3.11+
- Pip install des dépendances de l’appli (Flask, flask-bcrypt, flask-mysqldb, requests pour le script de test).

## Lancer le serveur (offline / LAN)
```bash
set FLASK_APP=app.py
flask run --host=0.0.0.0 --port=5000
# ou
python app.py  # déjà host=0.0.0.0, port=5000, debug=True
```

## Vérifier le chargement local des assets
1. Démarrer le serveur.
2. Lancer le script de vérif :
```bash
python scripts/check_local_assets.py --base-url http://127.0.0.1:5000
```
3. Le script échoue si un statut HTTP est non 200/304 ou si le Content-Type du .wasm n’est pas `application/wasm`.

## Points à retenir
- Aucun CDN requis : Bootstrap, FontAwesome, CodeMirror, Mermaid, Pyodide sont servis depuis `static/assets/...`.
- Les routes `/`, `/login`, `/app` restent protégées selon la logique existante; `/static/...` reste public pour charger les assets.

# Procédure de test local + LAN (sans Live Server)

1. Démarrer Flask (mode unique Jinja) :
   ```bash
   set FLASK_APP=app.py
   flask run --host=0.0.0.0 --port=5000
   # ou
   python app.py
   ```

2. Vérifier l’accès :
   - Local : http://127.0.0.1:5000/
   - LAN   : http://192.168.x.x:5000/ ...à voir ipconfig

3. Tester les endpoints (avec serveur déjà lancé) :
   ```bash
   python scripts/check_endpoints.py --base-url http://127.0.0.1:5000
   ```
   Ou laisser le script démarrer Flask :
   ```bash
   python scripts/check_endpoints.py --start-server
   ```

4. Rappels :
   - Ne pas utiliser Live Server ni le port 5501.
   - Tous les assets sont servis via `{{ url_for('static', ...) }}` depuis `static/`.
