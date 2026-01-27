# Rapport de migration CDN -> Local (GYMINF)

## URLs externes supprimées
| Fichier | URL externe | Remplacement local |
| --- | --- | --- |
| templates/layout.html | https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js | static/assets/pyodide/pyodide.js |
| templates/layout.html | https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css | static/assets/bootstrap/bootstrap.min.css |
| templates/layout.html | https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js | static/assets/bootstrap/bootstrap.bundle.min.js |
| templates/layout.html | https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/codemirror.min.css | static/assets/codemirror/codemirror.min.css |
| templates/layout.html | https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/theme/solarized.min.css | static/assets/codemirror/theme/solarized.min.css |
| templates/layout.html | https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/theme/dracula.min.css | static/assets/codemirror/theme/dracula.min.css |
| templates/layout.html | https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/codemirror.min.js | static/assets/codemirror/codemirror.min.js |
| templates/layout.html | https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/mode/python/python.min.js | static/assets/codemirror/mode/python.min.js |
| templates/layout.html | https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css | static/assets/fontawesome/css/all.min.css |
| templates/layout.html | https://cdn.jsdelivr.net/npm/mermaid@10.2.4/dist/mermaid.min.js | static/assets/mermaid/mermaid.min.js |

## Notes
- Aucune occurrence de localhost/127.0.0.1 ou ports hardcodés détectée dans les JS/CSS fournis.
- Pyodide charge désormais ses fichiers depuis /static/assets/pyodide/ via indexURL.
- Content-Type .wasm déjà configuré dans app.py (mimetypes.add_type).

## Points de contrôle
- Vérifier que les assets suivants existent sous static/assets (tout en minuscules) : bootstrap/, codemirror/, fontawesome/, mermaid/, pyodide/.
- Lancer le script `scripts/check_local_assets.py` une fois le serveur démarré pour valider les endpoints (voir README_LAN.md).
