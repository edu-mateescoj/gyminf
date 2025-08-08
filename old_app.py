''' ici les routes côté serveur; le code Python généré est en format JSON
Les requêtes AJAXsont traitées par le serveur Flask qui répond avec un statut de réussite
FLUX: 
    0.1/ dans db_queries.js sont définies les fonctions AJAX qui préparent les données, utilisent la fonction utilitaire logFactory, 
envoient les requêtes POST aux routes Flask correspondantes, qui appellent app.py
    0.2/ dans app.py les fonctions Python qui traitent les requêtes, exécutent la journalisation et renvoient un statut de réussite
  1/ dans layout.html les boutons ("run-code-btn" pour lancer le flowchart et les défis)
2/ dans main.js : les appels aux fonctions AJAX pour envoyer les données au serveur
'''

from datetime import datetime

from flask import Flask, render_template, request, flash, session, jsonify
from flask_bcrypt import Bcrypt
from flaskext.mysql import MySQL

import config

app = Flask(__name__) # crée une instance de l'application Flask
# __name__ est le nom du module courant, utilisé pour localiser les ressources de l'application
# Flask utilise __name__ pour savoir où chercher les fichiers de templates, les fichiers statiques
app.secret_key = config.SECRET_KEY 
# app.config.update(config.MYSQL_CONFIG) # met à jour la configuration de l'application avec les paramètres MySQL

# Configuration de la base de données MySQL
app.config['MYSQL_DATABASE_USER'] = config.MYSQL_DATABASE_USER
app.config['MYSQL_DATABASE_PASSWORD'] = config.MYSQL_DATABASE_PASSWORD
app.config['MYSQL_DATABASE_DB'] = config.MYSQL_DATABASE_DB
app.config['MYSQL_DATABASE_HOST'] = config.MYSQL_DATABASE_HOST

mysql = MySQL() # initialise l'extension MySQL
mysql.init_app(app) # lie l'application Flask à l'extension MySQL
bcrypt = Bcrypt(app) # initialise l'extension Bcrypt pour le hachage de mot de passe
con = mysql.connect() # crée l'objet con := établit la connexion à la base de données MySQL

# --- Routes de l'application ---

@app.route('/', methods=['GET']) 
# dit que la fonction gère les requêtes GET vers l'url racine '/'
# GET / POST: point de vue client
def home(): #ou main_route() ?
    return render_template('connexion.html') #fichier à voir dans le dossier "templates"
                                            #"convention over configuration" (Flask)

@app.route('/', methods=['POST'])
def authenticate():
    ''' Traite les formulaires de connexion ou inscription
    Selon les données du formulaire POST : redirige selon le type (signin ou signup)
    # Si authentification réussie, affiche layout.html, sinon renvoie à connexion.html
    '''
    username = request.form['username']
    password = request.form['password']
    type = request.form['type']

    status = signin(username, password) if type == 'signin' else signup(username, password)
    if status:
        return render_template('layout.html', username=username)
    else:
        return render_template('connexion.html')

# AJOUT
@app.route('/get-cfg-script')
def get_cfg_script():
    """Endpoint pour charger le contenu du script MyCFG.py et l'envoyer au client."""
    try:
        script_path = os.path.join(app.static_folder, 'py', 'MyCFG.py')
        with open(script_path, 'r', encoding='utf-8') as f:
            script_content = f.read()
        return jsonify({"script": script_content})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- Routes de journalisation ---

# ANCIENNES
@app.route('/code_generation', methods=['POST'])
def code_is_generated():
    ''' 
    Appelle la fonction de journalisation (stockeen base de données le username et son code généré 
    Si code généré: reçoit données JSON, en extrait le code 
    Renvoie un statut de succès ou d'erreur
    '''
    data = request.get_json()
    code = data['code']
    username = session['username']
    if code_generation_log(username, code):
        return jsonify({'status': 'success' })
    else:
        return jsonify({'status': 'error' })

@app.route('/flowchart_generation', methods=['POST'])
def flowchart_is_generated():
    '''
    Enregistre en base de données le username et le code généré
    Si flowchart généré: Reçoit les données JSON, en extrait le code
    Renvoie un statut de succès ou d'erreur
    '''
    data = request.get_json()
    code = data['code']
    username = session['username']
    if flowchart_generation_log(username, code):
        return jsonify({'status': 'success' })
    else:
        return jsonify({'status': 'error' })

# NOUVELLES

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
    
    # 1. Journaliser le code exécuté et récupérer son ID
    code_id = executed_code_log(username, original_code, canonical_code, difficulty)
    
    if code_id:
        # 2. Journaliser le diagramme en le liant à l'ID du code exécuté
        cursor = con.cursor()
        cursor.execute("SELECT id from user WHERE username = %s", (username,))
        user_id = cursor.fetchone()[0]
        cursor.close()
        diagram_log(user_id, code_id)
        return jsonify({"status": "success", "message": "Code exécuté et diagramme journalisés."})
    else:
        return jsonify({"status": "error", "message": "Erreur serveur lors de la journalisation du code exécuté."}), 500

# --- Fonctions de gestion des utilisateurs ---

def editor(username):
    return render_template('layout.html', username=username)

def signin(username, password):
    cursor = con.cursor()
    cursor.execute('SELECT * FROM user WHERE username = %s', (username,))
    user = cursor.fetchone()
    cursor.close()

    if user and bcrypt.check_password_hash(user[2], password):
        session['username'] = username
        flash("Connexion réussie.", "success")
        status = True
    else:
        flash("Erreur de connexion.", "danger")
        status = False
    return status

def signup(username, password):
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    cursor = con.cursor()
    try:
        cursor.execute('INSERT INTO user (username, password) VALUES (%s, %s)', (username, hashed_password))
        con.commit()
        flash("Compte créé avec succès.", "success")
        status = True
    except Exception as e:
        flash("Nom d'utilisateur déjà utilisé.", "danger")
        status = False
    finally:
        cursor.close()
    return status

# --- Fonctions utilitaires de journalisation ---

# ANCIENNES 
def code_generation_log(username: str, code: str) -> bool:
    '''
    Fonction de journalisation: commence par remplacer les sauts de ligne pour stockage SQL
    Stocke user_id, code, difficulty, time_created (horodatage)
    Retourne statut de réussite (True si insertion a réussi)
    '''
    cursor = con.cursor() # crée un curseur pour exécuter des requêtes SQL
    # objet con := connexion à la base de données MySQL
    # con.cursor() crée l'objet cursor qui permet d'exécuter des requêtes SQL
    # cursor := interface pour exécuter des requêtes SQL (limité à une opération à la fois)
    status = False
    try:
        cursor.execute("SELECT id from user WHERE username = %s", (username,))
        # %s := paramètre préparé pour éviter injection SQL
        user_id = cursor.fetchone()
        # fetchone() récupère la première ligne du résultat de la requête
        # renvoie None si aucune ligne trouvée, sinon un tuple (valeurs des colonnes)
        user_id = user_id[0]
        if user_id:
            code = code.replace('\n', '\\n')
            cursor.execute("INSERT INTO code (user_id, code, difficulty, time_created) VALUES (%s, %s, %s, %s)", (user_id, code, 1, datetime.now()))
            con.commit() # confirme les modifications dans la base de données
            status = True
    except:
        status = False
    finally:
        cursor.close()
    return status

def flowchart_generation_log(username: str, code: str) -> bool:
    '''
    Fonction de journalisation: commence par remplacer les sauts de ligne pour stockage SQL
    Stocke user_id, code_id, time_created (horodatage)
    Retourne un statut de réussite (True si insertion a réussi)
    '''
    cursor = con.cursor()
    status = False
    try:
        cursor.execute("SELECT id from user WHERE username = %s", (username,))
        user_row = cursor.fetchone()
        if not user_row:
            return False # Utilisateur non trouvé
        user_id = user_row[0]
        print(user_id)
        
        # On insère d'abord le nouveau code pour obtenir son ID
        # ATTENTION On écrit la difficulty en dur à '1'
        cursor.execute("INSERT INTO code (user_id, code, difficulty, time_created) VALUES (%s, %s, %s, %s)", 
                       (user_id, code, 1, datetime.now()))
        code_id = cursor.lastrowid # Récupère l'ID du dernier insert
        print(code_id)
        
        if user_id and code_id:
            cursor.execute("INSERT INTO diagram (user_id, code_id, time_created) VALUES (%s, %s, %s)",
                           (user_id, code_id, datetime.now()))
            con.commit()
            status = True
    except Exception as e:
        print(f"Erreur dans flowchart_generation_log: {e}") # Ajout d'un print pour le débogage
        status = False
    finally:
        cursor.close()
    return status

# NOUVELLES


def generation_log(username: str, code: str, difficulty: int) -> bool:
    """
    Journalise le code initialement généré dans la table 'generation'.
    Cette table sert d'archive des exercices proposés.
    """
    cursor = con.cursor()
    status = False
    try:
        cursor.execute("SELECT id from user WHERE username = %s", (username,))
        user_row = cursor.fetchone()
        if not user_row:
            print(f"Erreur de log : utilisateur '{username}' non trouvé.")
            return False
        user_id = user_row[0]
        
        cursor.execute("INSERT INTO generation (user_id, script, difficulty, time_created) VALUES (%s, %s, %s, %s)",
                       (user_id, code, difficulty, datetime.now()))
        con.commit()
        status = True
    except Exception as e:
        print(f"Erreur dans generation_log: {e}")
        status = False
    finally:
        cursor.close()
    return status

def executed_code_log(username: str, original_code: str, canonical_code: str, difficulty: int) -> int | None:
    """
    Journalise le code exécuté (potentiellement modifié) dans la table 'code'.
    Retourne l'ID de la nouvelle ligne pour lier d'autres tables (diagram, challenge_interaction).
    """
    cursor = con.cursor()
    new_code_id = None
    try:
        cursor.execute("SELECT id from user WHERE username = %s", (username,))
        user_row = cursor.fetchone()
        if not user_row:
            print(f"Erreur de log : utilisateur '{username}' non trouvé.")
            return None
        user_id = user_row[0]
        
        cursor.execute("INSERT INTO code (user_id, code, canonical_code, difficulty, time_created) VALUES (%s, %s, %s, %s, %s)",
                       (user_id, original_code, canonical_code, difficulty, datetime.now()))
        con.commit()
        new_code_id = cursor.lastrowid
    except Exception as e:
        print(f"Erreur dans executed_code_log: {e}")
    finally:
        cursor.close()
    return new_code_id

def diagram_log(user_id: int, code_id: int) -> bool:
    """Journalise la création d'un diagramme, en le liant à un code exécuté."""
    cursor = con.cursor()
    status = False
    try:
        cursor.execute("INSERT INTO diagram (user_id, code_id, time_created) VALUES (%s, %s, %s)",
                       (user_id, code_id, datetime.now()))
        con.commit()
        status = True
    except Exception as e:
        print(f"Erreur dans diagram_log: {e}")
    finally:
        cursor.close()
    return status

if __name__ == "__main__":
    # démarrer le serveur de développement pour les tests en local.
    app.run(debug=True)