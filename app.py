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

## --- Configuration MySQL ici plutôt que dans config.py (devenu obsolète du coup)---
# import config
# app.config.from_object(config)
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = 'root'
app.config['MYSQL_DB'] = 'GYMINF_POC'
app.config['MYSQL_CURSORCLASS'] = 'DictCursor'

mysql = MySQL(app)

def has_column(table, col):
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT COUNT(*) AS cnt
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = %s
          AND column_name = %s
    """, (table, col))
    r = cur.fetchone()
    cur.close()
    return r and r['cnt'] > 0

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
            INSERT INTO generation (user_id, script, difficulty, variable_manifest, requested_options, time_created)
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
    Enregistre le code original, le code canonique, la difficulté
    et, si disponible, les types détectés.
    """
    username = session.get('username')
    if not username:
        return jsonify({"status": "error", "message": "Non authentifié"}), 401

    data = request.get_json() or {}
    original_code = data.get('original_code', '')
    canonical_code = data.get('canonical_code', '')
    difficulty = data.get('difficulty', 3)
    detected_types = data.get('detected_types') or {}

    # Sécurité type: on force dict sinon vide
    if not isinstance(detected_types, dict):
        detected_types = {}

    user_id = get_user_id(username)
    if not user_id:
        return jsonify({"status": "error", "message": "Utilisateur introuvable"}), 404

    cursor = None
    try:
        cursor = mysql.connection.cursor()

        # --- INSERT dans code (prioritaire) ---
        has_orig = has_column('code', 'original_code')
        has_canon = has_column('code', 'canonical_code')
        has_script = has_column('code', 'script')
        has_time_created = has_column('code', 'time_created')
        has_timestamp = has_column('code', 'timestamp')
        has_ts = has_time_created or has_timestamp
        ts_col = 'time_created' if has_time_created else 'timestamp'

        cols = ['user_id']
        vals = [user_id]
        placeholders = ['%s']

        if has_orig:
            cols.append('original_code'); placeholders.append('%s'); vals.append(original_code)
        elif has_script:
            cols.append('script'); placeholders.append('%s'); vals.append(original_code)

        if has_canon:
            cols.append('canonical_code'); placeholders.append('%s'); vals.append(canonical_code)

        if has_ts:
            cols.append(ts_col); placeholders.append('%s'); vals.append(datetime.now())

        if has_column('code', 'difficulty'):
            cols.append('difficulty'); placeholders.append('%s'); vals.append(difficulty)

        sql = f"INSERT INTO code ({', '.join(cols)}) VALUES ({', '.join(placeholders)})"
        cursor.execute(sql, tuple(vals))
        code_id = cursor.lastrowid

        # --- INSERT metadata (best effort, ne doit JAMAIS faire échouer l'exécution) ---
        metadata_warning = None
        if detected_types:
            try:
                cm_cols = []
                cm_vals = []
                cm_placeholders = []

                if has_column('challenge_metadata', 'code_id'):
                    cm_cols.append('code_id'); cm_placeholders.append('%s'); cm_vals.append(code_id)

                if has_column('challenge_metadata', 'user_id'):
                    cm_cols.append('user_id'); cm_placeholders.append('%s'); cm_vals.append(user_id)

                if has_column('challenge_metadata', 'variable_types'):
                    cm_cols.append('variable_types'); cm_placeholders.append('%s'); cm_vals.append(json.dumps(detected_types))

                if has_column('challenge_metadata', 'requested_options'):
                    cm_cols.append('requested_options'); cm_placeholders.append('%s'); cm_vals.append(None)

                if has_column('challenge_metadata', 'variable_count'):
                    cm_cols.append('variable_count'); cm_placeholders.append('%s'); cm_vals.append(len(detected_types))

                if has_column('challenge_metadata', 'type_diversity'):
                    unique_types = {str(v) for v in detected_types.values() if v is not None}
                    cm_cols.append('type_diversity'); cm_placeholders.append('%s'); cm_vals.append(len(unique_types))

                if has_column('challenge_metadata', 'time_created'):
                    cm_cols.append('time_created'); cm_placeholders.append('%s'); cm_vals.append(datetime.now())
                elif has_column('challenge_metadata', 'timestamp'):
                    cm_cols.append('timestamp'); cm_placeholders.append('%s'); cm_vals.append(datetime.now())

                # On n'insert que si on a au moins user_id + variable_types
                if 'user_id' in cm_cols and 'variable_types' in cm_cols:
                    cm_sql = f"""
                        INSERT INTO challenge_metadata ({', '.join(cm_cols)})
                        VALUES ({', '.join(cm_placeholders)})
                    """
                    cursor.execute(cm_sql, tuple(cm_vals))

            except Exception as meta_e:
                metadata_warning = str(meta_e)
                print(f"[WARN] log_execution metadata skipped: {meta_e}")

        mysql.connection.commit()

        return jsonify({
            "status": "success",
            "code_id": code_id,
            "warning": metadata_warning
        })

    except Exception as e:
        print(f"Erreur log_execution: {e}")
        mysql.connection.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if cursor:
            cursor.close()


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
        ts_col = 'time_created' if has_column('verify_answer', 'time_created') else 'timestamp'
        cursor.execute(f"""
            INSERT INTO verify_answer (user_id, code_id, predictions, correctness, {ts_col})
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
        ts_col = 'time_created' if has_column('reveal_solution', 'time_created') else 'timestamp'
        cursor.execute(f"""
            INSERT INTO reveal_solution (user_id, code_id, {ts_col})
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
    example_name = data.get('example_name', None)
    if not example_name:
        return jsonify({"status": "error", "message": "example_name manquant"}), 400
        
    user_id = get_user_id(username)
    if not user_id:
        return jsonify({"status": "error", "message": "Utilisateur introuvable"}), 404

    try:
        cursor = mysql.connection.cursor()
        cursor.execute("""
            INSERT INTO load_event (user_id, event_type, example_name, timestamp)
            VALUES (%s, %s, %s, %s)
        """, (user_id, event_type, example_name, datetime.now()))
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
    - total_examples : nombre total de chargements d'exemples
    """
    # Protection : seul un enseignant connecté peut accéder à l'API
    if 'username' not in session or not is_teacher(session['username']):
        return jsonify({"error": "Non autorisé"}), 403

    try:
        cursor = mysql.connection.cursor()

        # Compter les élèves (on exclut les enseignants du décompte)
        cursor.execute("SELECT COUNT(*) as total FROM user WHERE role = 'student'")
        total_users = cursor.fetchone()['total']

        cursor.execute("""
            SELECT COUNT(*) as total
            FROM generation
            WHERE user_id IN (SELECT ID FROM user WHERE role='student')
        """)
        total_generations = cursor.fetchone()['total']

        cursor.execute("""
            SELECT COUNT(*) as total
            FROM code
            WHERE user_id IN (SELECT ID FROM user WHERE role='student')
        """)
        total_executions = cursor.fetchone()['total']

        cursor.execute("""
            SELECT COUNT(*) as total
            FROM verify_answer
            WHERE user_id IN (SELECT ID FROM user WHERE role='student')
        """)
        total_verifications = cursor.fetchone()['total']

        cursor.execute("""
            SELECT COUNT(*) as total
            FROM reveal_solution
            WHERE user_id IN (SELECT ID FROM user WHERE role='student')
        """)
        total_reveals = cursor.fetchone()['total']

        cursor.execute("""
            SELECT COUNT(*) as total
            FROM load_event
            WHERE user_id IN (SELECT ID FROM user WHERE role='student')
        """)
        total_examples = cursor.fetchone()['total']

        cursor.close()

        return jsonify({
            "total_users": total_users,
            "total_generations": total_generations,
            "total_executions": total_executions,
            "total_verifications": total_verifications,
            "total_reveals": total_reveals,
            "total_examples": total_examples
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

        # Join sur UNE SEULE metadata par (code_id, user_id): la plus récente
        cursor.execute("""
            SELECT 
                va.code_id,
                va.predictions,
                va.correctness,
                va.time_created,
                cm.variable_types
            FROM verify_answer va
            LEFT JOIN (
                SELECT cm1.code_id, cm1.user_id, cm1.variable_types
                FROM challenge_metadata cm1
                INNER JOIN (
                    SELECT code_id, user_id, MAX(time_created) AS max_time
                    FROM challenge_metadata
                    GROUP BY code_id, user_id
                ) latest
                  ON latest.code_id = cm1.code_id
                 AND latest.user_id = cm1.user_id
                 AND latest.max_time = cm1.time_created
            ) cm
              ON va.code_id = cm.code_id
             AND va.user_id = cm.user_id
            WHERE va.user_id = %s
            ORDER BY va.time_created ASC
        """, (student_id,))

        rows = cursor.fetchall()
        cursor.close()

        type_stats = {}
        timeline = []

        for row in rows:
            correctness = json.loads(row['correctness']) if row['correctness'] else {}
            var_types = json.loads(row['variable_types']) if row['variable_types'] else {}

            batch_correct = 0
            batch_total = 0

            for var_name, status in correctness.items():
                var_type = var_types.get(var_name, 'unknown')
                if var_type not in type_stats:
                    type_stats[var_type] = {"correct": 0, "incorrect": 0, "empty": 0}

                if status == "vrai":
                    type_stats[var_type]["correct"] += 1
                    batch_correct += 1
                elif status == "faux":
                    type_stats[var_type]["incorrect"] += 1
                else:
                    type_stats[var_type]["empty"] += 1

                batch_total += 1

            if batch_total > 0:
                timeline.append({
                    "code_id": row["code_id"],
                    "time": str(row["time_created"]),
                    "success_rate": round(batch_correct / batch_total, 2)
                })

        type_success_rates = {}
        for var_type, stats in type_stats.items():
            total_attempts = stats["correct"] + stats["incorrect"]
            type_success_rates[var_type] = {
                "success_rate": round(stats["correct"] / total_attempts, 2) if total_attempts > 0 else None,
                "total_attempts": total_attempts,
                "empty_count": stats["empty"],
                "correct": stats["correct"],
                "incorrect": stats["incorrect"]
            }

        return jsonify({"by_type": type_success_rates, "timeline": timeline})

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
    app.run(debug=True, host='0.0.0.0', port=5000)

