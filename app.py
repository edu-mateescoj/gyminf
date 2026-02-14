# ==========================================================================
# app.py — Serveur Flask principal de l'application GYMINF
# ==========================================================================

import json
import bcrypt
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_mysqldb import MySQL

app = Flask(__name__)
app.secret_key = 'gyminf_secret_key_change_me_in_production'

# --- Configuration MySQL ---
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = 'root'
app.config['MYSQL_DB'] = 'GYMINF_POC'
app.config['MYSQL_CURSORCLASS'] = 'DictCursor'

mysql = MySQL(app)


# ==========================================================================
# FONCTIONS UTILITAIRES
# ==========================================================================

def get_user_id(username):
    """
    Retrouve l'ID d'un utilisateur à partir de son username.
    """
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT ID FROM user WHERE username = %s", (username,))
    row = cursor.fetchone()
    cursor.close()
    return row['ID'] if row else None


def is_teacher(username):
    """
    Vérifie si l'utilisateur a le rôle 'teacher'.
    Utilisé pour protéger l'accès au dashboard enseignant.
    
    Retourne False si :
    - l'utilisateur n'existe pas
    - la colonne 'role' n'existe pas encore (migration non appliquée)
    - l'utilisateur a le rôle 'student'
    """
    try:
        cursor = mysql.connection.cursor()
        cursor.execute("SELECT role FROM user WHERE username = %s", (username,))
        row = cursor.fetchone()
        cursor.close()
        return row is not None and row.get('role') == 'teacher'
    except Exception as e:
        # Si la colonne 'role' n'existe pas encore, on ne plante pas
        print(f"Avertissement is_teacher: {e} — Avez-vous exécuté migration_add_role.sql ?")
        return False


# ==========================================================================
# ROUTES D'AUTHENTIFICATION
# ==========================================================================

@app.route('/')
def home():
    """
    Page d'accueil : redirige vers l'app si l'utilisateur est déjà connecté,
    sinon affiche la page de connexion.
    """
    if 'username' in session:
        return redirect(url_for('main_app_route'))
    return render_template('connexion.html')


@app.route('/login', methods=['POST'])
def login():
    """
    Gère la connexion (signin) et l'inscription (signup).
    Le champ caché 'type' dans le formulaire détermine l'action.
    """
    username = request.form.get('username')
    password = request.form.get('password')
    form_type = request.form.get('type')

    # ⚠️ DEBUG TEMPORAIRE — à supprimer après résolution
    print(f"[DEBUG LOGIN] type={form_type}, username={username}")

    cursor = mysql.connection.cursor()

    if form_type == 'signup':
        # --- Inscription ---
        cursor.execute("SELECT ID FROM user WHERE username = %s", (username,))
        if cursor.fetchone():
            print(f"[DEBUG] Signup refusé — username '{username}' existe déjà")
            cursor.close()
            return redirect(url_for('home'))
        # Hash bcrypt avant insertion
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        cursor.execute(
            "INSERT INTO user (username, password, role) VALUES (%s, %s, 'student')",
            (username, hashed)
        )
        mysql.connection.commit()
        session['username'] = username
        print(f"[DEBUG] Signup OK — '{username}' créé")
        cursor.close()
        return redirect(url_for('main_app_route'))

    elif form_type == 'signin':
        # --- Connexion ---
        cursor.execute(
            "SELECT ID, username, password, role FROM user WHERE username = %s",
            (username,)
        )
        user = cursor.fetchone()
        cursor.close()
        if user and bcrypt.checkpw(password.encode(), user['password'].encode()):
            session['username'] = user['username']
            print(f"[DEBUG] Signin OK — '{username}'")
            return redirect(url_for('main_app_route'))
        else:
            print(f"[DEBUG] Signin ÉCHOUÉ — username='{username}' non trouvé ou password incorrect")
            return redirect(url_for('home'))

    print(f"[DEBUG] type de formulaire inconnu: '{form_type}'")
    return redirect(url_for('home'))


@app.route('/logout')
def logout():
    """Déconnexion de l'utilisateur.  Supprime la session."""
    session.pop('username', None)
    return redirect(url_for('home'))


# ==========================================================================
# ROUTE PRINCIPALE DE L'APPLICATION
# ==========================================================================

@app.route('/app')
def main_app_route():
    """
    Page principale de l'outil de création d'exercices Python.
    Nécessite d'être authentifié.
    """
    if 'username' not in session:
        return redirect(url_for('home'))

    username = session['username']
    user_role = 'student' # Valeur par défaut de sécurité

    try:
        cursor = mysql.connection.cursor()
        # On récupère le rôle de l'utilisateur connecté
        cursor.execute("SELECT role FROM user WHERE username = %s", (username,))
        row = cursor.fetchone()
        cursor.close()
        
        if row and 'role' in row:
            user_role = row['role']
    except Exception as e:
        print(f"Erreur récupération rôle: {e}")

    # IMPORTANT : On passe 'role' au template ici
    return render_template('layout.html', username=username, role=user_role)


# ==========================================================================
# ROUTES DE JOURNALISATION (LOGGING)
# ==========================================================================

@app.route('/log/generation', methods=['POST'])
def log_generation():
    """
    Journalise une génération de code (bouton Générer).
    Enregistre le code, la difficulté, le manifeste des types, et les options.
    """
    username = session.get('username')
    if not username:
        return jsonify({"status": "error", "message": "Non authentifié"}), 401

    data = request.get_json()
    code = data.get('code', '')
    difficulty = data.get('difficulty', 3)
    # Nouveau : manifeste des types et options de génération (depuis code-generator.js)
    variable_manifest = data.get('variable_manifest')
    requested_options = data.get('requested_options')

    user_id = get_user_id(username)
    if not user_id:
        return jsonify({"status": "error", "message": "Utilisateur introuvable"}), 404

    try:
        cursor = mysql.connection.cursor()
        cursor.execute("""
            INSERT INTO generation (user_id, code, difficulty, variable_manifest, requested_options, time_created)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            user_id, code, difficulty,
            json.dumps(variable_manifest) if variable_manifest else None,
            json.dumps(requested_options) if requested_options else None,
            datetime.now()
        ))
        mysql.connection.commit()
        gen_id = cursor.lastrowid
        cursor.close()
        return jsonify({"status": "success", "generation_id": gen_id})
    except Exception as e:
        print(f"Erreur log_generation: {e}")
        mysql.connection.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/log/execution', methods=['POST'])
def log_execution():
    """
    Journalise une exécution de code (bouton Lancer).
    Enregistre le code original, le code canonique et la difficulté.
    Retourne le code_id pour référencer les actions suivantes (vérification, révélation, etc.).
    """
    username = session.get('username')
    if not username:
        return jsonify({"status": "error", "message": "Non authentifié"}), 401

    data = request.get_json()
    original_code = data.get('original_code', '')
    canonical_code = data.get('canonical_code', '')
    difficulty = data.get('difficulty', 3)

    user_id = get_user_id(username)
    if not user_id:
        return jsonify({"status": "error", "message": "Utilisateur introuvable"}), 404

    try:
        cursor = mysql.connection.cursor()
        cursor.execute("""
            INSERT INTO code (user_id, original_code, canonical_code, difficulty, time_created)
            VALUES (%s, %s, %s, %s, %s)
        """, (user_id, original_code, canonical_code, difficulty, datetime.now()))
        mysql.connection.commit()
        code_id = cursor.lastrowid
        cursor.close()
        return jsonify({"status": "success", "code_id": code_id})
    except Exception as e:
        print(f"Erreur log_execution: {e}")
        mysql.connection.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/log/flowchart_generation', methods=['POST'])
def log_flowchart_generation():
    """Journalise la génération d'un diagramme de flux (flowchart Mermaid)."""
    username = session.get('username')
    if not username:
        return jsonify({"status": "error", "message": "Non authentifié"}), 401

    data = request.get_json()
    code_id = data.get('code_id')
    mermaid_code = data.get('mermaid_code', '')

    user_id = get_user_id(username)
    if not user_id:
        return jsonify({"status": "error", "message": "Utilisateur introuvable"}), 404

    try:
        cursor = mysql.connection.cursor()
        cursor.execute("""
            INSERT INTO diagram (user_id, code_id, mermaid_code, time_created)
            VALUES (%s, %s, %s, %s)
        """, (user_id, code_id, mermaid_code, datetime.now()))
        mysql.connection.commit()
        cursor.close()
        return jsonify({"status": "success"})
    except Exception as e:
        print(f"Erreur log_flowchart_generation: {e}")
        mysql.connection.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/log/verify_answers', methods=['POST'])
def log_verify_answers():
    """
    Journalise une vérification de réponses par l'élève (bouton Vérifier).
    Enregistre les prédictions de l'élève et leur exactitude.
    """
    username = session.get('username')
    if not username:
        return jsonify({"status": "error", "message": "Non authentifié"}), 401

    data = request.get_json()
    code_id = data.get('code_id')
    predictions = data.get('predictions', {})
    correctness = data.get('correctness', {})

    user_id = get_user_id(username)
    if not user_id:
        return jsonify({"status": "error", "message": "Utilisateur introuvable"}), 404

    try:
        cursor = mysql.connection.cursor()
        cursor.execute("""
            INSERT INTO verify_answer (user_id, code_id, predictions, correctness, time_created)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            user_id, code_id,
            json.dumps(predictions),
            json.dumps(correctness),
            datetime.now()
        ))
        mysql.connection.commit()
        cursor.close()
        return jsonify({"status": "success"})
    except Exception as e:
        print(f"Erreur log_verify_answers: {e}")
        mysql.connection.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/log/reveal_solution', methods=['POST'])
def log_reveal_solution():
    """Journalise une révélation de solution par l'élève (bouton Révéler)."""
    username = session.get('username')
    if not username:
        return jsonify({"status": "error", "message": "Non authentifié"}), 401

    data = request.get_json()
    code_id = data.get('code_id')

    user_id = get_user_id(username)
    if not user_id:
        return jsonify({"status": "error", "message": "Utilisateur introuvable"}), 404

    try:
        cursor = mysql.connection.cursor()
        cursor.execute("""
            INSERT INTO reveal_solution (user_id, code_id, time_created)
            VALUES (%s, %s, %s)
        """, (user_id, code_id, datetime.now()))
        mysql.connection.commit()
        cursor.close()
        return jsonify({"status": "success"})
    except Exception as e:
        print(f"Erreur log_reveal_solution: {e}")
        mysql.connection.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/log/load_example', methods=['POST'])
def log_load_example():
    """Journalise le chargement d'un exemple prédéfini par l'élève."""
    username = session.get('username')
    if not username:
        return jsonify({"status": "error", "message": "Non authentifié"}), 401

    data = request.get_json()
    event_type = data.get('event_type', 'load_example')

    user_id = get_user_id(username)
    if not user_id:
        return jsonify({"status": "error", "message": "Utilisateur introuvable"}), 404

    try:
        cursor = mysql.connection.cursor()
        cursor.execute("""
            INSERT INTO load_event (user_id, event_type, time_created)
            VALUES (%s, %s, %s)
        """, (user_id, event_type, datetime.now()))
        mysql.connection.commit()
        cursor.close()
        return jsonify({"status": "success"})
    except Exception as e:
        print(f"Erreur log_load_example: {e}")
        mysql.connection.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================================================
# ROUTE DE JOURNALISATION : MÉTADONNÉES DU DÉFI (TYPES DE VARIABLES)
# ==========================================================================

@app.route('/log/challenge_metadata', methods=['POST'])
def log_challenge_metadata():
    """
    Journalise les métadonnées du défi après exécution du code.
    
    Enregistre :
    - Les types réels des variables Python (extraits du namespace Pyodide)
    - Les options de génération demandées par l'élève
    - Le nombre de variables et la diversité des types
    
    Ces données alimentent le dashboard enseignant pour analyser
    les taux de succès par type de variable et la dispersion.
    """
    username = session.get('username')
    if not username:
        return jsonify({"status": "error", "message": "Non authentifié"}), 401

    data = request.get_json()
    code_id = data.get('code_id')
    variable_types = data.get('variable_types', {})
    requested_options = data.get('requested_options')

    # Validation des données obligatoires
    if not code_id or not variable_types:
        return jsonify({"status": "error", "message": "Données manquantes (code_id ou variable_types)"}), 400

    user_id = get_user_id(username)
    if not user_id:
        return jsonify({"status": "error", "message": "Utilisateur introuvable"}), 404

    try:
        cursor = mysql.connection.cursor()

        # Calculer la diversité des types (nombre de types Python distincts)
        # Ex: {"x": "int", "y": "int", "name": "str"} → type_diversity = 2
        unique_types = set(variable_types.values())
        type_diversity = len(unique_types)

        cursor.execute("""
            INSERT INTO challenge_metadata 
            (code_id, user_id, variable_types, requested_options, variable_count, type_diversity, time_created)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            code_id,
            user_id,
            json.dumps(variable_types),
            json.dumps(requested_options) if requested_options else None,
            len(variable_types),
            type_diversity,
            datetime.now()
        ))
        mysql.connection.commit()
        cursor.close()
        return jsonify({"status": "success"})
    except Exception as e:
        print(f"Erreur log_challenge_metadata: {e}")
        mysql.connection.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================================================
# DASHBOARD ENSEIGNANT — PAGE PRINCIPALE
# ==========================================================================

@app.route('/dashboard')
def dashboard():
    """
    Page principale du dashboard enseignant.
    Accessible uniquement aux utilisateurs connectés ayant le rôle 'teacher'.
    
    Pour donner le rôle enseignant à un utilisateur :
        UPDATE user SET role = 'teacher' WHERE username = 'votre_nom';
    """
    # Vérifier que l'utilisateur est connecté
    if 'username' not in session:
        return redirect(url_for('home'))

    # Vérifier que l'utilisateur a le rôle enseignant
    if not is_teacher(session['username']):
        # Rediriger vers l'app avec un message (ou une page d'erreur)
        return redirect(url_for('main_app_route'))

    return render_template('dashboard.html', username=session.get('username'))


# ==========================================================================
# DASHBOARD ENSEIGNANT — API : VUE D'ENSEMBLE
# ==========================================================================

@app.route('/api/dashboard/overview', methods=['GET'])
def api_dashboard_overview():
    """
    API : Retourne les métriques globales pour la vue d'ensemble du dashboard.
    
    Métriques retournées :
    - total_users : nombre total d'élèves inscrits
    - total_generations : nombre total de codes générés
    - total_executions : nombre total de codes exécutés (défis lancés)
    - total_verifications : nombre total de vérifications de réponses
    - total_reveals : nombre total de solutions révélées
    """
    # Protection : seul un enseignant connecté peut accéder à l'API
    if 'username' not in session or not is_teacher(session['username']):
        return jsonify({"error": "Non autorisé"}), 403

    try:
        cursor = mysql.connection.cursor()

        # Compter les élèves (on exclut les enseignants du décompte)
        cursor.execute("SELECT COUNT(*) as total FROM user WHERE role = 'student'")
        total_users = cursor.fetchone()['total']

        # Compter les générations de code
        cursor.execute("SELECT COUNT(*) as total FROM generation")
        total_generations = cursor.fetchone()['total']

        # Compter les exécutions de code (défis lancés)
        cursor.execute("SELECT COUNT(*) as total FROM code")
        total_executions = cursor.fetchone()['total']

        # Compter les vérifications de réponses
        cursor.execute("SELECT COUNT(*) as total FROM verify_answer")
        total_verifications = cursor.fetchone()['total']

        # Compter les solutions révélées
        cursor.execute("SELECT COUNT(*) as total FROM reveal_solution")
        total_reveals = cursor.fetchone()['total']

        cursor.close()

        return jsonify({
            "total_users": total_users,
            "total_generations": total_generations,
            "total_executions": total_executions,
            "total_verifications": total_verifications,
            "total_reveals": total_reveals
        })
    except Exception as e:
        print(f"Erreur api_dashboard_overview: {e}")
        return jsonify({"error": str(e)}), 500


# ==========================================================================
# DASHBOARD ENSEIGNANT — API : MÉTRIQUES PAR ÉLÈVE
# ==========================================================================

@app.route('/api/dashboard/students', methods=['GET'])
def api_dashboard_students():
    """
    API : Retourne les métriques détaillées pour chaque élève.
    
    Pour chaque élève, on calcule :
    - generation_count : combien de codes l'élève a générés
    - execution_count : combien de codes l'élève a exécutés
    - verification_count : combien de fois l'élève a vérifié ses réponses
    - reveal_count : combien de fois l'élève a révélé la solution
    - avg_difficulty : difficulté moyenne des codes exécutés
    - last_activity : date de la dernière activité
    
    Métriques dérivées (calculées côté serveur) :
    - engagement_rate : exécutions / générations (l'élève va-t-il jusqu'au bout ?)
    - tenacity : vérifications / exécutions (persévérance par défi)
    - autonomy : 1 - (révélations / vérifications) (résout-il seul ?)
    """
    if 'username' not in session or not is_teacher(session['username']):
        return jsonify({"error": "Non autorisé"}), 403

    try:
        cursor = mysql.connection.cursor()

        # Requête principale : agréger les métriques pour chaque élève
        # On utilise des sous-requêtes LEFT JOIN pour gérer les élèves sans activité
        cursor.execute("""
            SELECT 
                u.ID,
                u.username,
                
                -- Quantité d'utilisation (comptages bruts)
                COALESCE(gen.gen_count, 0)       AS generation_count,
                COALESCE(exec_t.exec_count, 0)   AS execution_count,
                COALESCE(verif.verif_count, 0)    AS verification_count,
                COALESCE(rev.reveal_count, 0)     AS reveal_count,
                
                -- Dernière activité (la date la plus récente parmi toutes les tables)
                GREATEST(
                    COALESCE(gen.last_gen,     '2000-01-01'),
                    COALESCE(exec_t.last_exec, '2000-01-01'),
                    COALESCE(verif.last_verif, '2000-01-01')
                ) AS last_activity,
                
                -- Difficulté moyenne des codes exécutés
                COALESCE(exec_t.avg_difficulty, 0) AS avg_difficulty
                
            FROM user u
            
            -- Sous-requête : comptage des générations
            LEFT JOIN (
                SELECT user_id,
                       COUNT(*)          AS gen_count,
                       MAX(time_created) AS last_gen
                FROM generation
                GROUP BY user_id
            ) gen ON u.ID = gen.user_id
            
            -- Sous-requête : comptage des exécutions
            LEFT JOIN (
                SELECT user_id,
                       COUNT(*)          AS exec_count,
                       MAX(time_created) AS last_exec,
                       AVG(difficulty)   AS avg_difficulty
                FROM code
                GROUP BY user_id
            ) exec_t ON u.ID = exec_t.user_id
            
            -- Sous-requête : comptage des vérifications
            LEFT JOIN (
                SELECT user_id,
                       COUNT(*)          AS verif_count,
                       MAX(time_created) AS last_verif
                FROM verify_answer
                GROUP BY user_id
            ) verif ON u.ID = verif.user_id
            
            -- Sous-requête : comptage des révélations de solution
            LEFT JOIN (
                SELECT user_id,
                       COUNT(*) AS reveal_count
                FROM reveal_solution
                GROUP BY user_id
            ) rev ON u.ID = rev.user_id
            
            -- On n'affiche que les élèves (pas les enseignants)
            WHERE u.role = 'student'
            
            ORDER BY last_activity DESC
        """)

        students = cursor.fetchall()
        cursor.close()

        # --- Calcul des métriques dérivées pour chaque élève ---
        enriched_students = []
        for student in students:
            gen_count   = student['generation_count']
            exec_count  = student['execution_count']
            verif_count = student['verification_count']
            reveal_count = student['reveal_count']

            # MÉTRIQUE : Engagement = exécutions / générations
            # Interprétation : L'élève va-t-il jusqu'au défi après avoir généré un code ?
            # Valeur attendue : environ 1.0 (chaque génération mène à une exécution)
            engagement_rate = round(exec_count / gen_count, 2) if gen_count > 0 else 0

            # MÉTRIQUE : Ténacité = vérifications / exécutions
            # Interprétation : Combien de fois l'élève tente de répondre par défi
            # Valeur élevée = persévérance, l'élève essaye plusieurs fois
            tenacity = round(verif_count / exec_count, 2) if exec_count > 0 else 0

            # MÉTRIQUE : Autonomie = 1 - (révélations / vérifications)
            # Interprétation : Proche de 1 = l'élève résout seul. Proche de 0 = dépend de la solution
            # On clamp à 0 minimum (ne peut pas être négatif)
            if verif_count > 0:
                autonomy = round(1 - (reveal_count / verif_count), 2)
                autonomy = max(0, autonomy)
            else:
                # Pas de vérification → on ne peut pas juger, on met 1.0 par défaut
                autonomy = 1.0

            # Construire l'objet enrichi
            student_data = dict(student)

            # Renommer ID (MySQL) en id (JS)
            if 'ID' in student_data:
                student_data['id'] = student_data.pop('ID')

            # Forcer avg_difficulty en float (gère "0.0000" ou None)
            if 'avg_difficulty' in student_data:
                try:
                    student_data['avg_difficulty'] = float(student_data['avg_difficulty'])
                except Exception:
                    student_data['avg_difficulty'] = None

            # Convertir la date en chaîne
            if student_data.get('last_activity'):
                student_data['last_activity'] = str(student_data['last_activity'])

            # Ajout des métriques dérivées
            student_data['engagement_rate'] = engagement_rate
            student_data['tenacity'] = tenacity
            student_data['autonomy'] = autonomy

            enriched_students.append(student_data)

        return jsonify(enriched_students)

    except Exception as e:
        print(f"Erreur api_dashboard_students: {e}")
        return jsonify({"error": str(e)}), 500


# ==========================================================================
# DASHBOARD ENSEIGNANT — API : TAUX DE SUCCÈS PAR TYPE DE VARIABLE
# ==========================================================================

@app.route('/api/dashboard/student/<int:student_id>/predictions', methods=['GET'])
def api_dashboard_student_predictions(student_id):
    """
    API : Retourne le taux de succès des prédictions de valeurs par type de variable
    pour un élève donné.
    
    Retourne :
    - by_type : taux de succès ventilé par type Python (int, str, list, etc.)
    - timeline : évolution chronologique du taux de succès (un point par défi)
    
    Logique :
    1. On récupère chaque vérification de l'élève (verify_answer)
    2. On la croise avec les types de variables (challenge_metadata)
    3. On agrège les résultats (correct/incorrect) par type de variable
    """
    if 'username' not in session or not is_teacher(session['username']):
        return jsonify({"error": "Non autorisé"}), 403

    try:
        cursor = mysql.connection.cursor()

        # Récupérer toutes les vérifications de cet élève
        # avec les types de variables associés (via challenge_metadata)
        cursor.execute("""
            SELECT 
                va.code_id,
                va.predictions,
                va.correctness,
                va.time_created,
                cm.variable_types
            FROM verify_answer va
            LEFT JOIN challenge_metadata cm 
                ON va.code_id = cm.code_id 
                AND va.user_id = cm.user_id
            WHERE va.user_id = %s
            ORDER BY va.time_created ASC
        """, (student_id,))

        rows = cursor.fetchall()
        cursor.close()

        # --- Agrégation par type de variable ---
        # Structure : {"int": {"correct": 5, "incorrect": 3, "empty": 2}, ...}
        type_stats = {}

        # --- Chronologie : taux de succès par vérification ---
        timeline = []

        for row in rows:
            # Décoder le JSON de correctness et variable_types
            correctness = json.loads(row['correctness']) if row['correctness'] else {}
            var_types = json.loads(row['variable_types']) if row['variable_types'] else {}

            # Compteurs pour cette vérification (pour la timeline)
            batch_correct = 0
            batch_total = 0

            # Parcourir chaque variable vérifiée
            for var_name, status in correctness.items():
                # Retrouver le type Python de cette variable
                var_type = var_types.get(var_name, 'unknown')

                # Initialiser les compteurs pour ce type si nécessaire
                if var_type not in type_stats:
                    type_stats[var_type] = {"correct": 0, "incorrect": 0, "empty": 0}

                # Incrémenter selon le résultat
                if status == "vrai":
                    type_stats[var_type]["correct"] += 1
                    batch_correct += 1
                elif status == "faux":
                    type_stats[var_type]["incorrect"] += 1
                else:
                    # Champ laissé vide par l'élève
                    type_stats[var_type]["empty"] += 1

                batch_total += 1

            # Ajouter un point à la timeline (un point par vérification)
            if batch_total > 0:
                timeline.append({
                    "code_id": row['code_id'],
                    "time": str(row['time_created']),
                    "success_rate": round(batch_correct / batch_total, 2)
                })

        # --- Calculer le taux de succès par type ---
        type_success_rates = {}
        for var_type, stats in type_stats.items():
            # On ne compte que les tentatives réelles (correct + incorrect, pas les vides)
            total_attempts = stats["correct"] + stats["incorrect"]
            type_success_rates[var_type] = {
                "success_rate": round(stats["correct"] / total_attempts, 2) if total_attempts > 0 else None,
                "total_attempts": total_attempts,
                "empty_count": stats["empty"],
                "correct": stats["correct"],
                "incorrect": stats["incorrect"]
            }

        return jsonify({
            "by_type": type_success_rates,
            "timeline": timeline
        })

    except Exception as e:
        print(f"Erreur api_dashboard_student_predictions: {e}")
        return jsonify({"error": str(e)}), 500


# ==========================================================================
# DASHBOARD ENSEIGNANT — API : DISPERSION (COUVERTURE DES CONCEPTS)
# ==========================================================================

@app.route('/api/dashboard/student/<int:student_id>/dispersion', methods=['GET'])
def api_dashboard_student_dispersion(student_id):
    """
    API : Analyse la dispersion / variété des concepts explorés par un élève.
    
    Retourne :
    - types_explored : liste des types Python manipulés par l'élève
    - structures_explored : liste des structures de contrôle utilisées
    - type_coverage : proportion de types explorés sur les 5 possibles (0.0 à 1.0)
    - structure_coverage : proportion de structures explorées sur les 6 possibles
    - progression : évolution de la diversité au fil du temps
    
    Interprétation :
    - Couverture élevée = l'élève explore largement les concepts
    - Couverture faible = l'élève reste dans sa zone de confort
    """
    if 'username' not in session or not is_teacher(session['username']):
        return jsonify({"error": "Non autorisé"}), 403

    try:
        cursor = mysql.connection.cursor()

        # Récupérer toutes les métadonnées de défi de cet élève
        cursor.execute("""
            SELECT 
                cm.variable_types,
                cm.requested_options,
                cm.type_diversity,
                cm.variable_count,
                cm.time_created
            FROM challenge_metadata cm
            WHERE cm.user_id = %s
            ORDER BY cm.time_created ASC
        """, (student_id,))

        rows = cursor.fetchall()
        cursor.close()

        # --- Agréger la couverture des types et structures ---
        all_types_seen = set()       # Tous les types Python rencontrés
        all_structures_seen = set()  # Toutes les structures de contrôle utilisées
        difficulty_progression = []  # Évolution chronologique de la diversité

        for row in rows:
            # Décoder les JSON
            var_types = json.loads(row['variable_types']) if row['variable_types'] else {}
            options = json.loads(row['requested_options']) if row['requested_options'] else {}

            # Collecter les types vus
            all_types_seen.update(var_types.values())

            # Collecter les structures vues (depuis les options de génération)
            if 'structures' in options:
                all_structures_seen.update(options['structures'])

            # Point de progression chronologique
            difficulty_progression.append({
                "time": str(row['time_created']),
                "type_diversity": row['type_diversity'],
                "variable_count": row['variable_count']
            })

        # --- Calculer les taux de couverture ---

        # Les 5 types de variables possibles dans l'outil
        possible_types = {'int', 'float', 'str', 'list', 'bool'}
        # Couverture = proportion de types explorés parmi les possibles
        type_coverage = round(
            len(all_types_seen & possible_types) / len(possible_types), 2
        )

        # Les 6 structures de contrôle possibles dans l'outil
        possible_structures = {'if', 'for_range', 'for_list', 'for_str', 'while', 'function'}
        # Couverture = proportion de structures explorées parmi les possibles
        structure_coverage = round(
            len(all_structures_seen & possible_structures) / len(possible_structures), 2
        ) if possible_structures else 0

        return jsonify({
            "types_explored": list(all_types_seen),
            "structures_explored": list(all_structures_seen),
            "type_coverage": type_coverage,
            "structure_coverage": structure_coverage,
            "progression": difficulty_progression
        })

    except Exception as e:
        print(f"Erreur api_dashboard_student_dispersion: {e}")
        return jsonify({"error": str(e)}), 500


# ==========================================================================
# LANCEMENT DU SERVEUR
# ==========================================================================

if __name__ == '__main__':
    app.run(debug=True)

