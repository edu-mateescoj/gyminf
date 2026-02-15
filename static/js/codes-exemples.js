// js/exemples-code.js

const PREDEFINED_EXAMPLES = [
    {
        name: "If/Elif/Else Simple",
        code: `a = 5
b = 10
if a > b:
    print("a > b")
elif a == b:
    print("C'est égal")
else:
    print("a < b")
c = a + b
print(c)`
    },
    {
        name: "Factorielle (Fonction)",
        code: `x = 3
def factorial(n):
    # Calcule la factorielle
    if n <= 1:
        # print("n <= 1") # Commentaires optionnels
        return 1
    else:
        # print("n > 1")
        result = 1
        i = 2
        while i <= n:
            result = result * i
            i = i + 1
        return result
y = factorial(x)
print(y)`
    },
    {
        name: "If Imbriqués (Triangle)",
        code: `a = input("Côté a: ")
b = input("Côté b: ")
c = input("Côté c: ")

# On suppose que a, b, c sont des nombres après conversion
# Pour l'exemple, on les traite comme des chaînes pour la comparaison
# Dans un vrai cas, il faudrait convertir en int ou float

if a == b:    
    if a == c:
        result = "Equilateral"
    else:
        result = "Isoscele (a=b)"
else:
    if b == c:
        result = "Isoscele (b=c)"
    elif a == c:
        result = "Isoscele (a=c)"
    else:
        result = "Scalene"
print(result)`
    },
    {
        name: "Année Bissextile (Fonction)",
        code: `def est_bissextile(annee):
    if annee % 4 == 0:
        if annee % 100 == 0:
            if annee % 400 == 0:
                return True # Bissextile
            else:
                return False # Commune
        else:
            return True # Bissextile
    else:
        return False # Commune

an = 2024
if est_bissextile(an):
    print(f"{an} est une année bissextile.")
else:
    print(f"{an} est une année commune.")`
    },
    {
        name: "Boucle For Simple",
        code: `for i in range(5):
    print(f"Itération numéro {i}")
print("Fin de la boucle")`
    },
    {
        name: "Boucle While avec Break",
        code: `compteur = 0
while True:
    compteur += 1
    print(f"Compteur: {compteur}")
    if compteur >= 5:
        print("Limite atteinte, sortie de la boucle.")
        break`
    },
    {
        name: "Graphique Turtle Simple",
        code: `import turtle

# Prépare la tortue pour le dessin
t = turtle.Turtle()
t.speed(5) # Vitesse de dessin (1-10)

# Cycler une liste de couleurs
colors = ['red', 'green', 'blue', 'orange']
for c in colors:
    t.color(c)    # Fixer la couleur
    t.forward(75) # Avancer
    t.left(90)    # Tourner a gauche de 90 degrés

# Changer la forme de la tortue
t.shape("turtle")
`
    },
{
        name: "Erreur dans le maximum",
        code: `def trouver_maximum(liste_nombres):
    maximum_actuel = 0
    for nombre in liste_nombres:
        if nombre > maximum_actuel:
            maximum_actuel = nombre
        return maximum_actuel
        
print(trouver_maximum([10, 50, 20]))
# Résultat obtenu : 10
# Résultat attendu : 50
`},
{
        name: "Erreur dans les félicitations",
        code: `note = 5.5

if note >= 4.0:
    print("Admis")
elif note >= 5.0:
    print("Félicitations du jury")
else:
    print("Recalé")

# Résultat obtenu : "Admis"
# Résultat attendu : "Félicitations du jury"
`
},
{
        name: "Erreur dans la moyenne",
        code: `nombres = [12, 15, 20]
total = 0
compteur = 0

for n in nombres:
    total = total + n
compteur = compteur + 1

moyenne = total / compteur
print(moyenne)

# Résultat obtenu : 47.0
# Résultat attendu : 15.66...
`
}

];