ifelif = '''a = 5
b = 10
if a > b:
    print("a > b")
elif a == b:
    print("C'est égal")
else:
    print("a < b")
c = a + b
print(c)
'''

defif = """
x = 3
def factorial(x):
    # Calcule la factorielle
    if x <= 1:
        print("x <= 1")
        return 1
    else:
        print("x > 1")
        result = 1
        i = 2
        while i <= x:
            result = result * i
            i = i + 1
        return result
y = factorial(x)
print(y)
"""

defif2 = """
x = 3
y = factorial(x)
def factorial(x):
    # Calcule la factorielle
    if x <= 1:
        print("x <= 1")
        return 1
    else:
        print("x > 1")
        result = 1
        i = 2
        while i <= x:
            result = result * i
            i = i + 1
        return result
print(y)
"""

NestedIf = """
a = input("Qlq chose")
b = input("Qlq chose")
c = input("Qlq chose")

if a == b:    
    if a == c:
        # alors a=b=c
        if b == c: # redondant en fait
            return "Equilateral"
        #else:
            #devrait pas arriver ici
            #return "Isoscele"
    else:
        # a=b, mais a!=c
        result = "Isoscele (par a=b)"
else:
    # a!=b
    if b != c: # Nested If 3
        # a!=b, b!=c
        if a == c: # Nested If 4
            # a!=b, b!=c, a==c
            result = "Isoscele (a=c)"
        else:
            # a!=b, b!=c, a!=c
            result = "Scalene"
    else:
        # a!=b, b==c
        result = "Isoscele (b=c)"
print(result)
"""

bissextile = """
# Vérifie si une année est bissextile
if annee % 4 == 0:
    # Divisible par 4
    if annee % 100 == 0:
        # Divisible par 100
        if annee % 400 == 0:
            # Divisible par 400
            return True # Bissextile
        else:
            # Divisible par 100 mais pas par 400
            return False # Commune
    else:
        # Divisible par 4 mais pas par 100
        return True # Bissextile
else:
    # Non divisible par 4
    return False # Commune

"""

bissextile2 = """
def bissextile(annee): # Vérifie si une année est bissextile
    if annee % 4 == 0:
    # Divisible par 4
        if annee % 100 == 0:
            # Divisible par 100
            if annee % 400 == 0:
                # Divisible par 400
                return True # Bissextile
            else:
                # Divisible par 100 mais pas par 400
                return False # Commune
        else:
            # Divisible par 4 mais pas par 100
            return True # Bissextile
    else:
    # Non divisible par 4
        return False # Commune

"""

cgi_decode = """
def cgi_decode(s):
    hex_values = {
        '0': 0, '1': 1, '2': 2, '3': 3, '4': 4,
        '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
        'a': 10, 'b': 11, 'c': 12, 'd': 13, 'e': 14, 'f': 15,
        'A': 10, 'B': 11, 'C': 12, 'D': 13, 'E': 14, 'F': 15,
    }

    t = ""
    i = 0
    while i < len(s):
        c = s[i]
        if c == '+':
            t += ' '
        elif c == '%':
            digit_high, digit_low = s[i + 1], s[i + 2]
            i += 2
            if digit_high in hex_values and digit_low in hex_values:
                v = hex_values[digit_high] * 16 + hex_values[digit_low]
                t += chr(v)
            else:
                raise ValueError("Invalid encoding")
        else:
            t += c
        i += 1
    return t
"""
    
gcd = """
def gcd(a, b):
    if a<b:
        c: int = a
        a: int = b
        b: int = c

    while b != 0 :
        c: int = a
        a: int = b
        b: int = c % b
    return a
"""
    
compute_gcd = """
def compute_gcd(x, y):
    if x > y:
        small = y
    else:
        small = x
    for i in range(1, small+1):
        if((x % i == 0) and (y % i == 0)):
            gcd = i

    return gcd
"""

fib = """
def fib(n,):
    ls = [0, 1]
    for i in range(n-2):
        ls.append(ls[-1] + ls[-2])
    return ls
"""

quadsolver = """
def quad_solver(a, b, c):
    discriminant = b^2 - 4*a*c
    r1, r2 = 0, 0
    i1, i2 = 0, 0
    if discriminant >= 0:
        droot = math.sqrt(discriminant)
        r1 = (-b + droot) / (2*a)
        r2 = (-b - droot) / (2*a)
    else:
        droot = math.sqrt(-1 * discriminant)
        droot_ = droot/(2*a)
        r1, i1 = -b/(2*a), droot_
        r2, i2 = -b/(2*a), -droot_
    if i1 == 0 and i2 == 0:
        return (r1, r2)
    return ((r1,i1), (r2,i2))
"""

defcall = """
b = input("Entrez valeur B: ")

def ma_fonction(n):
    print("Calcul...")
    if n <= 0:
        return 1
    else:
        return n * ma_fonction(n-1)

res1 = ma_fonction(b)

l = len("hello")
res2 = ma_fonction(l)

print("Fini")
"""

nestedDef = """
def outer_function(x):
    print("outer x = ", x)

    def inner_function(y):
        print("inner y = ", y)
        return x + y

    return inner_function
result = outer_function(10)
print(result(5))  # Affiche 15
"""

for1 = """
n = input("Donnez n")
for element in range(n):
    print("Element = ", element)
print("Fini")
"""
for2 = """
n = input("Donnez n")
for element in range(n,p):
    print("Element = ", element)
    if element == 'toto':
        print("c'est toto")
    elif element == 'tata':
        print("c'est tata")
    else:
        print("ni toto ni tata")
print("encore qlql chose ici")
"""
forinrange_abc = """
for element in range(10,20,3):
    print("Element = ", element)
    if element != 'toto':
        print("pas toto")
    else:
        print("toto")
print("element = ", element, " donc sortie de la boucle")
"""
forstring = """
for element in 'abcdefghijklmnopqrstuvwxyz':
    print("Element = ", element)
"""

forlist = """
for element in [1, 2, 3, 4, 5]: 
    print("Element = ", element)
"""

while1 = """
n = input("Donnez n")
element = 0
while element < n:
    print("Element = ", element)
"""

tryeef = """
num = 1
denom = 0
try:
    frac = num / denom
except ZeroDivisionError:
    print("Division par zéro")
else:
    print("Divsion OK, ratio = ", frac)
finally:
    print("Bloc 'finally' exécuté")
"""

boucleinfinie = """
while True:
    print("Boucle infinie")
print("Ne sera jamais exécuté!")
"""

fonctioninfinie = """
def fonction_infinie():
    while True:
        print("Fonction infinie")
    print("Ne sera jamais exécuté!")
"""

bouclecontinue = """
for i in range(5):
    if i == 2:
        continue
    print(i)
"""

whilebreak = """
matrix = [
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10],
    [11, 12, 13, 0, 15],
    [16, 17, 18, 19, 20],
    [21, 22, 23, 24, 25]
]

line = 0
zero_is_found = False

while line < 5:
    column = 0
    while column < 5:
        if matrix[line][column] == 0:
            zero_is_found = True
            break         # On casse la boucle interne
        else:
            print(matrix[line][column])
            column += 1
    if zero_is_found:
        break             # On casse la boucle externe
    line += 1

if zero_is_found:
    # N'oubliez pas que les indices commencent à zéro
    print(f"Arrêt à ({line}, {column}) : un zéro a été trouvé.")
"""

if_is_raise = """
x = "hello"
if not type(x) is int:
  raise TypeError("Only integers are allowed")
"""

boolean = """
a = True
b = not a
c = False
d = a and b
e = a or c
if e == False:
    print("e est faux")
else:
    print("e est vrai")
"""
troismoyennes = '''
def moyenne1(L: List[float]) -> float:
    """
    Calcule la moyenne d'une liste de nombres.
    :param L: Liste de nombres
    :return: Moyenne des nombres
    """
    total = 0.0
    compteur = 0
    for number in L:
        total += number
        compteur += 1
    return total / compteur
def moyenne2(L: List[float]) -> float:
    """
    Calcule la moyenne d'une liste de nombres.
    :param L: Liste de nombres
    :return: Moyenne des nombres
    """
    if not L:
        return 0.0  # Évite la division par zéro si la liste est vide
    return sum(L) / len(L)
def moyenne3(L: List[float]) -> float:
    """
    Calcule la moyenne d'une liste de nombres. 
    :param L: Liste de nombres
    :return: Moyenne des nombres
    """
    if not L:
        return 0.0  # Évite la division par zéro si la liste est vide
    total = sum(L)
    compteur = len(L)
    return total / compteur
def moyenne4(L: List[float]) -> float:
    return average(L) if L else 0.0  # Utilise une fonction externe pour la moyenne, si disponible
'''