# filepath: c:\Users\install\gyminf\config.py

# Clé secrète pour la session Flask
SECRET_KEY = 'root'

# Configuration de la base de données MySQL
MYSQL_DATABASE_USER = 'root'
MYSQL_DATABASE_PASSWORD = 'root'
MYSQL_DATABASE_DB = 'GYMINF_POC'
MYSQL_DATABASE_HOST = 'localhost'

# pour démarrer Flask accessible à toute machine du réseau
#  sur http://<IP>:5000/
# C:\Users\install\gyminf>python -m flask run --host=0.0.0.0 --port=5000