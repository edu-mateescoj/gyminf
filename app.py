# filepath: c:\Users\install\gyminf\app.py
''' ici les routes côté serveur; le code Python généré est en format JSON
Les requêtes AJAXsont traitées par le serveur Flask qui répond avec un statut de réussite
    0.1/ dans db_queries.js sont définies les fonctions AJAX qui préparent les données, utilisent la fonction utilitaire logFactory, 
envoient les requêtes POST aux routes Flask correspondantes, qui appellent app.py
    0.2/ ici les fonctions Python qui traitent les requêtes, exécutent la journalisation et renvoient un statut de réussite
FLUX:
1. flowchart-generator.js exécute fetch('/get-cfg-script').
2. Le navigateur envoie une requête GET au serveur Flask à l'adresse http://127.0.0.1:5000/get-cfg-script.
3. Le serveur Flask voit cette requête, la fait correspondre à la route et exécute la fonction get_cfg_script().
4. La fonction get_cfg_script() lit le fichier MyCFG.py sur le disque, l'emballe dans un format JSON et le renvoie au navigateur.
5. Le fetch dans le JavaScript reçoit la réponse, la décode et peut enfin utiliser le contenu du script.
'''

from datetime import datetime
import os  # AJOUT pour os.path.join

from flask import Flask, render_template, request, flash, session, jsonify, redirect, url_for
from flask_bcrypt import Bcrypt
from flask_mysqldb import MySQL  # MODIFIÉ : Import correct pour la bibliothèque moderne

import config

app = Flask(__name__)
app.secret_key = config.SECRET_KEY

# Configuration de la base de données MySQL
app.config['MYSQL_HOST'] = config.MYSQL_DATABASE_HOST
app.config['MYSQL_USER'] = config.MYSQL_DATABASE_USER
app.config['MYSQL_PASSWORD'] = config.MYSQL_DATABASE_PASSWORD
app.config['MYSQL_DB'] = config.MYSQL_DATABASE_DB
app.config['MYSQL_CURSORCLASS'] = 'DictCursor' # Recommandé pour manipuler les résultats comme des dictionnaires

mysql = MySQL(app) # MODIFIÉ : Initialisation correcte
bcrypt = Bcrypt(app)

# SUPPRIMÉ : La ligne "con = mysql.connect()" au niveau global est une mauvaise pratique.
# La connexion sera gérée par Flask par requête.

# --- Routes de l'application ---
# Une URL pour afficher la page de connexion (/). 
# Une URL pour traiter les données de connexion (/login). 
# Une URL pour afficher l'application principale (/app). 
# Une URL pour se déconnecter (/logout).

@app.route('/')
def home():
    """Affiche la page de connexion ou redirige vers l'app si déjà connecté."""
    if 'username' in session:
        return redirect(url_for('main_app_route'))
    return render_template('connexion.html')

@app.route('/login', methods=['POST'])
def authenticate():
    """Traite les données du formulaire de connexion/inscription."""
    username = request.form['username']
    password = request.form['password']
    form_type = request.form['type']

    status = signin(username, password) if form_type == 'signin' else signup(username, password)
    
    if status:
        # Succès : On redirige vers la page principale de l'application.
        return redirect(url_for('main_app_route'))
    else:
        # Échec : On reste sur la page de connexion pour afficher le message d'erreur.
        flash("Erreur de connexion ou d'inscription.", "danger")
        return redirect(url_for('home'))

@app.route('/app')
def main_app_route():
    """Affiche la page principale de l'application (layout.html)."""
    # Sécurité : si l'utilisateur n'est pas connecté, on le renvoie à la page d'accueil.
    if 'username' not in session:
        return redirect(url_for('home'))
    
    return render_template('layout.html', username=session.get('username'))

@app.route('/logout')
def logout():
    """Déconnecte l'utilisateur en supprimant son nom de la session."""
    session.pop('username', None)
    return redirect(url_for('home'))


# 1. Déclaration de la route
@app.route('/get-cfg-script')
def get_cfg_script():
    """Endpoint (URL spéciale ou 'pont sécurisé' que JavaScript peut appeler) pour charger 
    le contenu du script MyCFG.py et l'envoyer au client. C'est le backend (app.py) qui
      a accès aux fichiers sur le disque dur"""
    try:
        # 2. Construction du chemin vers le fichier
        script_path = os.path.join(app.static_folder, 'py', 'MyCFG.py')
        # 3. Lecture du fichier
        with open(script_path, 'r', encoding='utf-8') as f:
            script_content = f.read()
        # 4. Envoi de la réponse
        return jsonify({"script": script_content})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- Routes de journalisation (uniquement la nouvelle logique) ---

@app.route('/log/generation', methods=['POST'])
def generation_log_route():
    """Route pour journaliser le code généré par l'outil."""
    data = request.get_json()
    username = session.get('username')
    code = data.get('code')
    difficulty = data.get('difficulty', 1)

    if not username or not code:
        return jsonify({"status": "error", "message": "Données manquantes"}), 400
    
    success = generation_log(username, code, difficulty)
    if success:
        return jsonify({"status": "success", "message": "Code généré journalisé."})
    else:
        return jsonify({"status": "error", "message": "Erreur serveur lors de la journalisation."}), 500

@app.route('/log/flowchart_generation', methods=['POST'])
def flowchart_generation_log_route():
    """Route pour journaliser le code exécuté (flowchart + défi)."""
    data = request.get_json()
    username = session.get('username')
    original_code = data.get('code')
    canonical_code = data.get('canonical_code')
    difficulty = data.get('difficulty', 1)

    if not all([username, original_code, canonical_code]):
        return jsonify({"status": "error", "message": "Données manquantes"}), 400
    
    code_id = executed_code_log(username, original_code, canonical_code, difficulty)
    
    if code_id:
        user_id = get_user_id(username)
        if user_id:
            diagram_log(user_id, code_id)
            return jsonify({"status": "success", "message": "Code exécuté et diagramme journalisés."})
    
    return jsonify({"status": "error", "message": "Erreur serveur lors de la journalisation du code exécuté."}), 500

# --- Fonctions de gestion des utilisateurs ---

def get_user_id(username):
    """Fonction utilitaire pour récupérer l'ID d'un utilisateur."""
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT id FROM user WHERE username = %s", (username,))
    user = cursor.fetchone()
    cursor.close()
    return user['id'] if user else None

def signin(username, password):
    cursor = mysql.connection.cursor()
    cursor.execute('SELECT * FROM user WHERE username = %s', (username,))
    user = cursor.fetchone()
    cursor.close()

    if user and bcrypt.check_password_hash(user['password'], password):
        session['username'] = username
        return True
    return False

def signup(username, password):
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    cursor = mysql.connection.cursor()
    try:
        cursor.execute('INSERT INTO user (username, password) VALUES (%s, %s)', (username, hashed_password))
        mysql.connection.commit()
        session['username'] = username
        return True
    except Exception:
        return False
    finally:
        cursor.close()

# --- Fonctions utilitaires de journalisation ---

def generation_log(username: str, code: str, difficulty: int) -> bool:
    """Journalise le code initialement généré dans la table 'generation'."""
    user_id = get_user_id(username)
    if not user_id: return False
    
    try:
        cursor = mysql.connection.cursor()
        cursor.execute("INSERT INTO generation (user_id, script, difficulty, time_created) VALUES (%s, %s, %s, %s)",
                       (user_id, code, difficulty, datetime.now()))
        mysql.connection.commit()
        return True
    except Exception as e:
        print(f"Erreur dans generation_log: {e}")
        return False
    finally:
        cursor.close()

def executed_code_log(username: str, original_code: str, canonical_code: str, difficulty: int) -> int | None:
    """Journalise le code exécuté dans la table 'code' et retourne son ID."""
    user_id = get_user_id(username)
    if not user_id: return None

    try:
        cursor = mysql.connection.cursor()
        cursor.execute("INSERT INTO code (user_id, code, canonical_code, difficulty, time_created) VALUES (%s, %s, %s, %s, %s)",
                       (user_id, original_code, canonical_code, difficulty, datetime.now()))
        mysql.connection.commit()
        new_code_id = cursor.lastrowid
        return new_code_id
    except Exception as e:
        print(f"Erreur dans executed_code_log: {e}")
        return None
    finally:
        cursor.close()

def diagram_log(user_id: int, code_id: int) -> bool:
    """Journalise la création d'un diagramme, en le liant à un code exécuté."""
    try:
        cursor = mysql.connection.cursor()
        cursor.execute("INSERT INTO diagram (user_id, code_id, time_created) VALUES (%s, %s, %s)",
                       (user_id, code_id, datetime.now()))
        mysql.connection.commit()
        return True
    except Exception as e:
        print(f"Erreur dans diagram_log: {e}")
        return False
    finally:
        cursor.close()

if __name__ == "__main__":
    app.run(debug=True)
