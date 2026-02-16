Choisir l’offre

Infomaniak Public Cloud (VM) ou Managed Kubernetes/Containers.
Base MySQL managée (Database as a Service) pour éviter de gérer le SGBD toi‑même.
Préparer l’app

WSGI avec gunicorn : gunicorn -b 0.0.0.0:5000 app:app
Fichier requirements.txt (Flask, flask-mysqldb, bcrypt, gunicorn…).
Variables d’environnement : SECRET_KEY, MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB.
Pyodide reste servi en statique (fichiers JS/CSS), aucun besoin serveur.
Déploiement (VM ou container)

Option VM : installer Python 3.11, pip install -r requirements.txt, lancer gunicorn via systemd, mettre un nginx en reverse proxy (443→gunicorn:5000).
Option container : Dockerfile simple, exposer 5000, déployer sur Managed Kubernetes/Container.
Configurer le pare-feu / security groups pour 80/443, bloquer 5000 en public, laisser MySQL accessible seulement depuis le backend.
Base de données

Créer une instance MySQL managée.
Importer tes scripts static/sql/*.sql (structure + migrations).
Vérifier les noms de colonnes existants (script vs code, time_created vs timestamp) avant import.
DNS et HTTPS

Pointer ton domaine vers l’IP / load balancer.
Terminer TLS sur nginx (Let’s Encrypt) ou via l’ingress Kubernetes.
Tests

Vérifier le login (bcrypt), le dashboard (routes /api/dashboard/*), et les logs (/log/generation, /log/execution, /log/verify_answers, /log/reveal_solution, /log/load_example, /log/challenge_metadata).
Tester Pyodide en production (taille des assets, cache navigateur).