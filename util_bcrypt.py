import bcrypt

psw = input("Donne ta chaine : ")
psw_bytes = psw.encode("utf-8")  # convertit la chaîne en bytes pour bcrypt

hashed = bcrypt.hashpw(psw_bytes, bcrypt.gensalt())
print(hashed.decode())

