from datetime import datetime

from flask import Flask, render_template, request, flash, session, jsonify
from flask_bcrypt import Bcrypt
from flaskext.mysql import MySQL

import config

app = Flask(__name__)
app.secret_key = config.SECRET_KEY
app.config.update(config.MYSQL_CONFIG)
mysql = MySQL()
mysql.init_app(app)
bcrypt = Bcrypt(app)
con = mysql.connect()


@app.route('/', methods=['GET'])
def home():
    return render_template('connexion.html')


@app.route('/', methods=['POST'])
def authenticate():
    username = request.form['username']
    password = request.form['password']
    type = request.form['type']

    status = signin(username, password) if type == 'signin' else signup(username, password)
    if status:
        return render_template('layout.html', username=username)
    else:
        return render_template('connexion.html')


@app.route('/code_generation', methods=['POST'])
def code_is_generated():
    data = request.get_json()
    code = data['code']
    username = session['username']
    if code_generation_log(username, code):
        return jsonify({'status': 'success' })
    else:
        return jsonify({'status': 'error' })


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


def code_generation_log(username: str, code: str) -> bool:
    cursor = con.cursor()
    status = False
    print(username)
    try:
        cursor.execute("SELECT id from user WHERE username = %s", (username,))
        user_id = cursor.fetchone()
        user_id = user_id[0]
        print(datetime.now())
        if user_id:
            cursor.execute("INSERT INTO code (user_id, code, difficulty, time_created) VALUES (%s, %s, %s, %s)", (user_id, code, 1, datetime.now()))
            con.commit()
            status = True
    except:
        status = False
    finally:
        cursor.close()
    return status
