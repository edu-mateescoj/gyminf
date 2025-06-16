from flask import Flask, render_template, request, flash, session, make_response, redirect, url_for
from flaskext.mysql import MySQL
from flask_bcrypt import Bcrypt
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
        status =  True
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
