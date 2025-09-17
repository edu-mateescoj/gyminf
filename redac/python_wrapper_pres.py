# --- Dépendances standard + Pyodide + AST ---
import builtins
import io
import sys
import json
import types
import asyncio
import pyodide
from pyodide.ffi import to_js
import ast


# --- Analyse statique légère : extraction des appels de fonction dans le code élève ---
def extract_function_calls(code):
    try:
        tree = ast.parse(code)   # Parse le code source en AST Python
        calls = []
        class FunctionCallExtractor(ast.NodeVisitor):
            # Capture du motif : assignation d'un appel (ex: r = f(...))
            def visit_Assign(self, node):
                if isinstance(node.value, ast.Call):
                    call = node.value
                    if isinstance(call.func, ast.Name):
                        calls.append({
                            'func_name': call.func.id,    # nom de la fonction appelée
                            'result_var': node.targets[0].id if isinstance(node.targets[0], ast.Name) else None  
                            # variable qui reçoit le résultat (ou None)
                        })
                self.generic_visit(node)
            # Capture du motif : expression "nue" qui est un appel (ex: f(...))
            def visit_Expr(self, node):
                if isinstance(node.value, ast.Call):
                    call = node.value
                    if isinstance(call.func, ast.Name):
                        calls.append({
                            'func_name': call.func.id,   # nom de la fonction appelée
                            'result_var': None           # pas d'affectation du résultat
                        })
                self.generic_visit(node)

        extractor = FunctionCallExtractor()
        extractor.visit(tree)
        return calls
    except:
        # En cas d'échec du parsing ou d'un cas exotique, on retourne une liste vide
        return []

# --- Transformation AST : rendre input(...) awaitable pour l'I/O asynchrone côté navigateur ---
class AwaitInputTransformer(ast.NodeTransformer):
    def visit_Call(self, node):
        # On remplace chaque appel à input(...) par await input(...),
        # afin que le Python puisse attendre la promesse JS (modal côté front)
        if isinstance(node.func, ast.Name) and node.func.id == "input":
            return ast.Await(value=node)
        return self.generic_visit(node)


# --- Sauvegarde des I/O d'origine + état global de run ---
_original_print = builtins.print
_original_input = builtins.input
# --- Pont de sortie : print(...) Python -> console UI via callback JS ---
def custom_print(*args, **kwargs):
    # On détourne print(...) vers un buffer mémoire, puis on envoie la chaîne au handler JS
    s_io = io.StringIO()
    kwargs['file'] = s_io
    _original_print(*args, **kwargs)
    message = s_io.getvalue()
    js_print_handler(message)    # callback JS (injeté dans pyodide.globals depuis main.js)
# --- Pont d'entrée : input(...) Python -> modal asynchrone côté JS ---
async def custom_input(prompt=""):
    # Appelle le handler JS qui ouvre un modal et résout une Promise avec la saisie utilisateur
    response = await js_input_handler(prompt)
    # Option : log également la saisie dans la console (avec retour à la ligne)
    js_print_handler(str(prompt) + str(response) + '\\n', 'output')
    return response

# --- Remplacement temporaire des I/O Python par nos wrappers connectés au front ---
builtins.print = custom_print
builtins.input = custom_input


# Namespace d'exécution ISOLÉ pour le code élève : toutes les affectations top-level iront ici
user_ns = {}
# Collecte finale des variables filtrées + trace d'erreur éventuelle
_final_vars = {}
_error_detail_trace = None
# --- Routine principale asynchrone : transformer + exécuter le code élève dans user_ns ---
async def main():
    global _error_detail_trace, user_ns
    try:
        from ast import unparse
        # 1) Parsing du code élève
        tree = ast.parse(student_code_to_run)
        # 2) Transformation AST (rendre input(...) awaitable)
        transformed_tree = AwaitInputTransformer().visit(tree)
        ast.fix_missing_locations(transformed_tree)
        transformed_code_string = unparse(transformed_tree)
        # 3) EXÉCUTION du code transformé DANS user_ns (namespace global isolé)
        #    => toutes les variables top-level créées par l'élève deviennent des clés de user_ns
        await pyodide.code.eval_code_async(transformed_code_string, globals=user_ns)
        # 4) Heuristique post-exécution :
        #    - On relit le code source pour trouver des appels de fonctions
        #    - Si l'élève n'a PAS capturé un résultat (pas de result_var) et que la fonction est "applicable",
        #      on tente un appel forcé avec l'argument constant 4, puis on place le retour dans user_ns
        function_calls = extract_function_calls(student_code_to_run)
        for call_info in function_calls:
            if call_info['func_name'] in user_ns and callable(user_ns[call_info['func_name']]):
                func_name = call_info['func_name']
                if not call_info['result_var'] and hasattr(user_ns[func_name], '__code__'):
                    try:
                        # /!\ Appel "magique" avec 4 : marche pour des fonctions prenant un entier
                        result = user_ns[func_name](4)
                        # On expose la valeur de retour AU NIVEAU MODULE pour la collecte finale
                        result_var_name = f"{func_name}_result"
                        user_ns[result_var_name] = result
                    except:
                        # Silencieux : si ça casse (mauvaise arité/type), on n'empêche pas le reste du run
                        pass
    except Exception as e:
        # En cas d'erreur Python (SyntaxError/RuntimeError...), on stocke la trace lisible côté front
        import traceback
        _error_detail_trace = traceback.format_exc()
    finally:
        # 5) Restauration des I/O originales pour ne pas polluer les runs suivants
        builtins.print = _original_print
        builtins.input = _original_input
# --- Lancement de la coroutine principale ---
await main()


# --- Si pas d'erreur : filtrage des variables de user_ns et sérialisation JSON ---
if _error_detail_trace is None:
    for _var_name, _val in user_ns.items():
        # Exclusion 1 : symboles "internes" (dunder) et entités non sérialisables pertinentes (modules, fonctions, types)
        if _var_name.startswith('__') or isinstance(_val, (types.ModuleType, types.FunctionType, type)):
            continue
        # Exclusion 2 : liste blanche négative — variables techniques ou d'environnement
        if _var_name in ['pyodide', 'sys', 'micropip', 'json', 'types', 'ast', 'traceback',
                         'error_detail', 'current_code', 'user_python_code',
                         'cfg_instance', 'mermaid_output', 'error_message', 'output_dict',
                         'parsed_code_string', 'List', 'Dict', 'Set', 'Tuple', 'Optional',
                         '_syntax_check_result', '_error_detail_trace', 'user_ns', '_final_vars',
                         '_original_print', '_original_input', 'custom_print', 'custom_input', 's_io',
                         'js_print_handler', 'js_input_handler', 'main',
                         'turtle_setup_script', 'student_code_to_run',
                         '_var_name', '_val']:
            continue
        # Inclusion : types simples (ou None) → on les garde tels quels
        if isinstance(_val, (str, int, float, bool, list, dict, tuple, set)) or _val is None:
            _final_vars[_var_name] = _val
        else:
            # Fallback : représentation texte (repr) si non sérialisable JSON nativement
            try:
                _final_vars[_var_name] = repr(_val)
            except:
                _final_vars[_var_name] = "<valeur non sérialisable>"
# --- Sortie finale : une CHAÎNE JSON pour le front-end ---
json.dumps({"variables": _final_vars, "error": _error_detail_trace})
