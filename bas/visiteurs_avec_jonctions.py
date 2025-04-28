import ast
from typing import List, Dict, Set, Tuple, Optional

class ControlFlowGraph:
    def __init__(self, code: str):
        self.tree = ast.parse(code)
        self.nodes: List[Tuple[str, str]] = [] # Liste de tuples (id, label)
        self.edges: Set[Tuple[str, str, str]] = set() # Utiliser un Set pour éviter doublons exacts
        self.node_counter = 0
        self.loop_stack = [] # Pour gérer break/continue: stocke (loop_id, exit_node_id)
        # Dictionnaire pour retrouver facilement le label d'un noeud par son ID
        self.node_labels: Dict[str, str] = {}
        # Dictionnaire pour stocker les informations sur les noeuds terminaux (Return, Break, Continue)
        self.terminal_nodes: Set[str] = set()

    def get_node_id(self) -> str:
        self.node_counter += 1
        return f"node{self.node_counter}"

    def add_node(self, label: str, node_type: str = "Process") -> str:
        """Ajoute un noeud avec un label et un type (pour Mermaid)."""
        node_id = self.get_node_id()
        # Stocke le type pour faciliter le rendu Mermaid plus tard si besoin
        # Pour l'instant, on stocke juste l'ID et le label principal
        self.nodes.append((node_id, label))
        self.node_labels[node_id] = label # Ajout pour recherche facile
        return node_id

    def add_edge(self, from_node: str, to_node: str, label: str = ""):
        """Ajoute une arête au graphe, évite les doublons exacts."""
        # Vérification simple pour éviter les boucles immédiates sur soi-même sans label (sauf si voulu)
        if from_node == to_node and not label:
             print(f"Warning: Tentative d'ajout d'une boucle sur {from_node} sans label.")
             return
        # Vérification pour ne pas ajouter d'arête depuis un noeud terminal connu
        if from_node in self.terminal_nodes:
            # print(f"Debug: Ignored edge from terminal node {from_node} ({self.node_labels.get(from_node)}) to {to_node}")
            return
        # Vérification que les noeuds existent (optionnel mais bon pour debug)
        # if from_node not in self.node_labels or to_node not in self.node_labels:
        #     print(f"Warning: Tentative d'ajout d'arête entre noeuds non existants: {from_node} -> {to_node}")
        #     return

        self.edges.add((from_node, to_node, label))

    def _is_terminal(self, node: ast.AST) -> bool:
        """Vérifie si un noeud AST est un terminal (Return, Break, Continue)."""
        return isinstance(node, (ast.Return, ast.Break, ast.Continue))

    def visit_body(self, body: List[ast.AST], entry_node_ids: List[str]) -> List[str]:
        """
        Visite une séquence d'instructions (un "body").
        Prend une liste de noeuds d'entrée possibles.
        Retourne une liste de noeuds de sortie (d'où le flux peut continuer).
        """
        current_node_ids = list(entry_node_ids) # Copie pour éviter de modifier l'original

        for i, stmt in enumerate(body):
            next_node_ids = []
            is_last_stmt = (i == len(body) - 1)

            # Pour chaque noeud parent possible de cette instruction
            for parent_id in current_node_ids:
                 # Si le parent est déjà un terminal, on ne continue pas depuis lui
                if parent_id in self.terminal_nodes:
                    continue

                # Visite l'instruction actuelle, en lui passant le parent actuel
                # `visit` retournera la liste des noeuds d'où le flux sort de cette instruction
                exit_nodes = self.visit(stmt, parent_id)
                next_node_ids.extend(exit_nodes)

            # Les noeuds de sortie de l'instruction actuelle deviennent
            # les noeuds d'entrée pour la suivante
            current_node_ids = list(set(next_node_ids)) # Enlève les doublons potentiels

            # Si current_node_ids est vide, cela signifie que tous les chemins
            # se sont terminés (par ex. par des Return), on peut arrêter de traiter le reste du body.
            if not current_node_ids:
                break

        # Retourne les derniers noeuds atteints qui ne sont pas terminaux
        # Ces noeuds sont les points de sortie naturels du 'body'
        final_exits = [node_id for node_id in current_node_ids if node_id not in self.terminal_nodes]
        return final_exits


    def visit(self, node: ast.AST, parent_id: str) -> List[str]:
        """
        Visite un noeud AST. Prend l'ID du noeud parent *unique* qui mène à ce noeud.
        Retourne une liste des ID des noeuds qui représentent les sorties séquentielles de ce noeud.
        Une liste vide signifie que le chemin se termine ici (Return, Break, Continue).
        """
        method = f'visit_{type(node).__name__}'
        visitor = getattr(self, method, self.generic_visit)

        # Appel de la méthode de visite appropriée
        exit_nodes = visitor(node, parent_id)

        # Si le noeud visité est un terminal, on l'enregistre
        if self._is_terminal(node):
             # Le visiteur spécifique (visit_Return etc) doit retourner un seul ID, celui du noeud créé
             # On s'assure qu'il est bien marqué comme terminal ici.
             if exit_nodes:
                 self.terminal_nodes.add(exit_nodes[0])
             return [] # Les terminaux n'ont pas de sortie séquentielle naturelle

        return exit_nodes


    def connect_finals_to_end(self, end_id: str):
        """
        Connecte tous les noeuds qui n'ont pas d'arête sortante connue (et ne sont pas 'End' ou déjà terminaux)
        au noeud 'End' final du graphe principal (Module/Fonction).
        """
        # Noeuds qui sont sources d'une arête
        source_nodes = set(from_node for from_node, _, _ in self.edges)
        # Noeuds qui sont des cibles d'une arête (utile ?)
        # target_nodes = set(to_node for _, to_node, _ in self.edges)

        for node_id, label in self.nodes:
            # Ne pas connecter 'End' à lui-même
            if node_id == end_id:
                continue
            # Ne pas connecter un noeud déjà marqué comme terminal (Return, Break, etc.)
            if node_id in self.terminal_nodes:
                 continue
             # Si un noeud n'est la source d'aucune arête sortante...
            if node_id not in source_nodes:
                 # ...et qu'il n'est pas le noeud de fin lui-même, le connecter à la fin.
                # print(f"Debug: Connecting final node {node_id} ({label}) to End node {end_id}")
                self.add_edge(node_id, end_id)


    def visit_Module(self, node: ast.Module, parent_id: Optional[str] = None) -> List[str]: # parent_id non utilisé ici
        start_id = self.add_node("Start", node_type="StartEnd")
        # La visite du corps commence à partir du noeud Start
        exit_nodes = self.visit_body(node.body, [start_id])

        end_id = self.add_node("End", node_type="StartEnd")
        # Connecter toutes les sorties normales du corps principal au noeud End
        for node_id in exit_nodes:
            if node_id not in self.terminal_nodes: # Double sécurité
                self.add_edge(node_id, end_id)

        # Connecter les retours implicites ou non connectés à End
        self.connect_finals_to_end(end_id)
        # Pour un Module, la "sortie" n'a pas vraiment de sens, on retourne l'ID de fin.
        return [end_id] # On pourrait retourner une liste vide aussi.

    def visit_FunctionDef(self, node: ast.FunctionDef, parent_id: str) -> List[str]:
        # Un noeud pour la définition elle-même (pas vraiment dans le flux d'exécution de l'appelant)
        # On pourrait choisir de ne pas le connecter au flux principal ou de le représenter différemment.
        # Ici, on le connecte pour montrer où la fonction est définie.
        func_def_id = self.add_node(f"Fonction définie: <br> {node.name}(...)", node_type="Subroutine")
        self.add_edge(parent_id, func_def_id)

        # Créer un graphe séparé pour le corps de la fonction ? Non, intégrons-le.
        # Créer un noeud "Start" spécifique à la fonction pour clarté
        func_start_id = self.add_node(f"Start {node.name}", node_type="StartEnd")

        # Visiter le corps de la fonction à partir de son propre Start
        exit_nodes = self.visit_body(node.body, [func_start_id])

        # Créer un noeud "End" spécifique à la fonction
        func_end_id = self.add_node(f"End {node.name}", node_type="StartEnd")

        # Connecter les sorties normales du corps de la fonction à son noeud End
        for node_id in exit_nodes:
             if node_id not in self.terminal_nodes:
                self.add_edge(node_id, func_end_id)

        # Connecter les retours non connectés (implicites ou autres) au End de la fonction
        self.connect_finals_to_end(func_end_id) # Utilise les noeuds générés pour cette fonction

        # La définition de fonction elle-même continue le flux principal.
        return [func_def_id]

    def visit_If(self, node: ast.If, parent_id: str) -> List[str]:
        """
        Visite un noeud If. Gère les branches et crée un point de jonction.
        Retourne l'ID du noeud de jonction comme unique sortie séquentielle.
        """
        condition = ast.unparse(node.test).replace('"', '"') # Échapper les guillemets pour Mermaid
        if_id = self.add_node(f"If {condition}", node_type="Decision")
        self.add_edge(parent_id, if_id)

        # Créer le noeud de jonction *avant* de visiter les branches
        # Cela simplifie la connexion des sorties des branches vers ce point unique.
        join_id = self.add_node("jonction", node_type="Junction") # Utiliser un label simple ou vide

        # --- Branche True ---
        true_exit_nodes = []
        if node.body:
            # Visiter le corps de la branche True, en partant de if_id
            # visit_body retournera les noeuds finaux de cette branche
            true_exit_nodes = self.visit_body(node.body, [if_id])
            # Trouver le premier noeud de la branche pour y attacher le label "True"
            # C'est le premier noeud ajouté après if_id qui a if_id comme parent
            first_true_node_id = None
            for f, t, _ in self.edges:
                if f == if_id and t != join_id: # Exclure une éventuelle connexion directe if->join
                     # Vérifier que ce noeud t vient bien du body (pas trivial sans plus d'info)
                     # On suppose que le premier edge ajouté depuis if_id (autre que vers join) est le bon
                     potential_first = t
                     # Heuristique : on prend le premier ajouté (le plus petit ID numérique)
                     if first_true_node_id is None or int(potential_first[4:]) < int(first_true_node_id[4:]):
                         first_true_node_id = potential_first
                 # Cas particulier: si le body commence par un autre If
                 # Il faut trouver le noeud "If ..." ajouté par l'appel récursif

            # Si on a trouvé le premier noeud, on modifie l'arête existante pour ajouter "True"
            # C'est un peu un hack, idéalement add_edge devrait gérer les labels optionnels mieux
            if first_true_node_id:
                edge_to_modify = (if_id, first_true_node_id, "")
                if edge_to_modify in self.edges:
                    self.edges.remove(edge_to_modify)
                    self.add_edge(if_id, first_true_node_id, "True")
                else:
                    # Si l'arête simple n'existe pas (cas étrange), on l'ajoute avec le label
                    self.add_edge(if_id, first_true_node_id, "True")
                    # print(f"Debug If-True: Adding edge {if_id} -> {first_true_node_id} [True]")

            # Connecter toutes les sorties non terminales de la branche True au noeud de jonction
            for exit_node in true_exit_nodes:
                if exit_node not in self.terminal_nodes:
                    self.add_edge(exit_node, join_id)
        else:
            # Si la branche True est vide (ex: 'if condition: pass'), connecter If directement à Join avec "True"
             self.add_edge(if_id, join_id, "True")


        # --- Branche False ---
        false_exit_nodes = []
        if node.orelse:
            # Visiter le corps de la branche False (Else), en partant de if_id
            false_exit_nodes = self.visit_body(node.orelse, [if_id])
            # Trouver le premier noeud de la branche False pour le label
            first_false_node_id = None
            # Logique similaire à la branche True pour trouver le premier noeud
            # On cherche une arête if_id -> X qui n'a pas le label "True"
            for f, t, lbl in self.edges:
                if f == if_id and t != join_id and lbl != "True":
                     potential_first = t
                     # Heuristique: si une arête sans label existe vers un noeud différent du premier noeud True
                     # Ou si une arête avec un label autre que "True" existe.
                     is_different_from_true_start = not first_true_node_id or potential_first != first_true_node_id
                     if is_different_from_true_start and (first_false_node_id is None or int(potential_first[4:]) < int(first_false_node_id[4:])):
                         first_false_node_id = potential_first

            # Modifier/Ajouter l'arête avec le label "False"
            if first_false_node_id:
                edge_to_modify = (if_id, first_false_node_id, "")
                if edge_to_modify in self.edges:
                    self.edges.remove(edge_to_modify)
                    self.add_edge(if_id, first_false_node_id, "False")
                else:
                    self.add_edge(if_id, first_false_node_id, "False")
                    # print(f"Debug If-False: Adding edge {if_id} -> {first_false_node_id} [False]")


            # Connecter toutes les sorties non terminales de la branche False au noeud de jonction
            for exit_node in false_exit_nodes:
                if exit_node not in self.terminal_nodes:
                    self.add_edge(exit_node, join_id)
        else:
            # Si pas de branche 'else', la condition 'False' mène directement au point de jonction
            self.add_edge(if_id, join_id, "False")

        # Si le noeud de jonction n'a aucune entrée utile (tout finit par Return/Break/...),
        # il peut être considéré comme terminal aussi, mais laissons le pour la structure.
        # On vérifie si join_id a des parents *autres* que if_id via les branches
        join_parents = {f for f, t, l in self.edges if t == join_id}
        # Si les seuls parents sont if_id (via True et/ou False direct) OU si toutes les branches finissaient en terminal
        all_true_terminal = all(n in self.terminal_nodes for n in true_exit_nodes) if node.body else True
        all_false_terminal = all(n in self.terminal_nodes for n in false_exit_nodes) if node.orelse else True

        # Si toutes les branches se terminent ou sont vides, le join_id ne sera atteint par aucune exécution normale.
        # Mais on le retourne quand même car c'est le point structurel après le If.
        # Si au moins une branche peut atteindre la jonction, on la retourne.
        if not join_parents: # Si rien ne mène à la jonction
             # print(f"Debug: Join node {join_id} has no non-terminal predecessors.")
             # On pourrait le marquer comme terminal ou le supprimer, mais gardons-le.
             # Si on le supprime, il faut retourner une liste vide. Retournons-le pour l'instant.
             pass


        # Le noeud de jonction est la seule sortie séquentielle de la structure If/Else
        return [join_id]


    def visit_For(self, node: ast.For, parent_id: str) -> List[str]:
        iterator = ast.unparse(node.target).replace('"', '"')
        iterable = ast.unparse(node.iter).replace('"', '"')
        loop_id = self.add_node(f"For {iterator} in {iterable}", node_type="Decision") # Considéré comme un point de décision/entrée
        self.add_edge(parent_id, loop_id)

        # Noeud de sortie de boucle (après terminaison normale)
        exit_node_id = self.add_node("Sortie de boucle For", node_type="Junction")
        self.add_edge(loop_id, exit_node_id, "Terminée") # Arête pour sortie normale

        # Empiler les informations de la boucle pour Break/Continue
        self.loop_stack.append((loop_id, exit_node_id))

        # Visiter le corps de la boucle, en partant de l'entrée de boucle (loop_id)
        body_exit_nodes = self.visit_body(node.body, [loop_id])

        # Connecter les sorties normales du corps de boucle au début de la boucle pour la prochaine itération
        for exit_node in body_exit_nodes:
            if exit_node not in self.terminal_nodes: # Ne pas reconnecter depuis Return, Break, Continue
                self.add_edge(exit_node, loop_id, "itération suivante")

        # Gérer la branche 'else' de la boucle (exécutée si la boucle termine sans 'break')
        # TODO: Ajouter la gestion de node.orelse pour les boucles For/While

        self.loop_stack.pop()

        # La sortie séquentielle après la boucle est le noeud de sortie de boucle
        return [exit_node_id]

    def visit_While(self, node: ast.While, parent_id: str) -> List[str]:
        condition = ast.unparse(node.test).replace('"', '"')
        while_id = self.add_node(f"While {condition}", node_type="Decision")
        self.add_edge(parent_id, while_id)

        # Noeud de sortie quand la condition est fausse
        exit_node_id = self.add_node("Sortie de boucle While", node_type="Junction")
        self.add_edge(while_id, exit_node_id, "False") # Condition fausse -> sortie

        # Empiler pour Break/Continue
        self.loop_stack.append((while_id, exit_node_id))

        # Visiter le corps de la boucle, qui commence si la condition est Vraie.
        # Il faut un moyen d'indiquer que le corps ne commence que si 'True'.
        # On peut insérer un noeud intermédiaire ou juste savoir que le corps part de `while_id`.
        # L'arête while_id -> premier noeud du corps devrait idéalement porter le label "True".
        body_exit_nodes = self.visit_body(node.body, [while_id])

        # Attacher le label "True" à la première arête sortant de while_id vers le corps
        if node.body:
            first_body_node_id = None
            # Trouve la première arête sortant de while_id qui n'est pas vers exit_node_id
            for f, t, lbl in self.edges:
                if f == while_id and t != exit_node_id:
                    potential_first = t
                    if first_body_node_id is None or int(potential_first[4:]) < int(first_body_node_id[4:]):
                        first_body_node_id = potential_first

            if first_body_node_id:
                 edge_to_modify = (while_id, first_body_node_id, "")
                 if edge_to_modify in self.edges:
                     self.edges.remove(edge_to_modify)
                     self.add_edge(while_id, first_body_node_id, "True")
                 else:
                     # Ajouter si elle n'existait pas sans label (peu probable avec visit_body)
                     self.add_edge(while_id, first_body_node_id, "True")


        # Connecter les sorties normales du corps de boucle au test de la boucle pour la prochaine itération
        for exit_node in body_exit_nodes:
             if exit_node not in self.terminal_nodes:
                self.add_edge(exit_node, while_id, "itération suivante")

        # TODO: Ajouter la gestion de node.orelse pour les boucles While

        self.loop_stack.pop()

        # La sortie séquentielle est le noeud de sortie de boucle
        return [exit_node_id]

    def visit_Return(self, node: ast.Return, parent_id: str) -> List[str]:
        value = ast.unparse(node.value).replace('"', '"') if node.value else ""
        return_id = self.add_node(f"Return {value}", node_type="Return")
        self.add_edge(parent_id, return_id)
        self.terminal_nodes.add(return_id) # Marquer comme terminal
        # Retourne l'ID du noeud créé, mais la visite globale le traitera comme terminal (retournera [])
        return [return_id]

    def visit_Break(self, node: ast.Break, parent_id: str) -> List[str]:
        break_id = self.add_node("Break", node_type="Jump")
        self.add_edge(parent_id, break_id)
        self.terminal_nodes.add(break_id) # Marquer comme terminal pour son chemin

        if self.loop_stack:
            # Connecter le Break au noeud de sortie de la boucle la plus interne
            _, loop_exit_id = self.loop_stack[-1]
            self.add_edge(break_id, loop_exit_id)
        else:
            # Break en dehors d'une boucle - erreur Python, mais on peut le gérer
             print("Warning: 'break' outside loop detected.")
             # Connecter à rien de spécifique ou à un noeud d'erreur ? Pour l'instant, il termine juste ce chemin.

        return [break_id] # Traité comme terminal par visit()

    def visit_Continue(self, node: ast.Continue, parent_id: str) -> List[str]:
        continue_id = self.add_node("Continue", node_type="Jump")
        self.add_edge(parent_id, continue_id)
        self.terminal_nodes.add(continue_id) # Marquer comme terminal pour son chemin

        if self.loop_stack:
            # Connecter Continue au début (test) de la boucle la plus interne
            loop_start_id, _ = self.loop_stack[-1]
            self.add_edge(continue_id, loop_start_id)
        else:
            # Continue en dehors d'une boucle - erreur Python
             print("Warning: 'continue' outside loop detected.")

        return [continue_id] # Traité comme terminal par visit()

    def generic_visit(self, node: ast.AST, parent_id: str) -> List[str]:
        # Pour les noeuds simples (expressions, etc.)
        try:
            label = ast.unparse(node).replace('"', '"')
            # Limiter la longueur pour éviter des noeuds énormes
            max_len = 60
            if len(label) > max_len:
                label = label[:max_len-3] + "..."
            node_id = self.add_node(label, node_type="Process")
            self.add_edge(parent_id, node_id)
            return [node_id] # Retourne lui-même comme sortie séquentielle
        except Exception as e:
            # Si unparse échoue pour un type de noeud non prévu
            label = f"Noeud AST: {type(node).__name__}"
            print(f"Warning: Impossible de 'unparse' le noeud {label}. Erreur: {e}")
            node_id = self.add_node(label, node_type="Process")
            self.add_edge(parent_id, node_id)
            return [node_id]


    def visit_Assign(self, node: ast.Assign, parent_id: str) -> List[str]:
        # Formatter pour être plus lisible et éviter les problèmes avec Mermaid si trop long
        targets = ", ".join([ast.unparse(t).replace('"', '"') for t in node.targets])
        value = ast.unparse(node.value).replace('"', '"')
        label = f"{targets} = {value}"
        max_len = 60
        if len(label) > max_len:
             # Essayer de raccourcir la valeur si possible
             value_short = value[:max_len - len(targets) - 6] + "..." if len(value) > max_len - len(targets) - 6 else value
             label = f"{targets} = {value_short}"
             if len(label) > max_len: # Si même ça c'est trop long
                 label = label[:max_len-3] + "..."

        assign_id = self.add_node(f"{label}", node_type="Process") # Utiliser f-string propre
        self.add_edge(parent_id, assign_id)
        return [assign_id]

    def visit_Expr(self, node: ast.Expr, parent_id: str) -> List[str]:
        # Souvent des appels de fonction (print, etc.) ou des expressions seules
        # On visite la valeur interne pour obtenir le label
        return self.visit(node.value, parent_id)

    def visit_Call(self, node: ast.Call, parent_id: str) -> List[str]:
        # Gérer les appels de fonction
        func_name = ast.unparse(node.func).replace('"', '"')
        args_str = ", ".join([ast.unparse(a).replace('"', '"') for a in node.args])
        # Limiter la longueur des arguments
        max_arg_len = 30
        if len(args_str) > max_arg_len:
            args_str = args_str[:max_arg_len-3] + "..."

        label = f"Appel: {func_name}({args_str})"
        call_id = self.add_node(label, node_type="Process")
        self.add_edge(parent_id, call_id)
        return [call_id]

    def filter_edges(self):
        """
        Filtre les arêtes pour Mermaid. Actuellement, le Set gère les doublons exacts.
        Cette fonction pourrait être utilisée pour des logiques plus complexes si nécessaire
        (par ex. supprimer une arête A->B si une arête A->B|Label existe),
        mais la gestion actuelle des labels dans visit_If/While tente déjà de faire cela.
        Pour l'instant, on retourne juste les arêtes stockées.
        """
        # La logique de priorisation label vs non-label est implicitement gérée
        # par le remove/add dans visit_If et visit_While.
        return self.edges


    def to_mermaid(self) -> str:
        mermaid = ["graph TD"]

        # Ajout des noeuds avec syntaxe Mermaid basée sur le label/type
        # (Note: on n'utilise pas le 'node_type' stocké pour l'instant, on se base sur le label)
        for node_id, label in self.nodes:
            # Nettoyer le label pour Mermaid (guillemets doubles)
            safe_label = label.replace('"', '#quot;') # Remplacer par entité HTML ou autre chose sûr

            if label == "Start" or label.startswith("Start "):
                mermaid.append(f'    {node_id}(("{safe_label}"))') # Cercle double pour Start
            elif label == "End" or label.startswith("End "):
                mermaid.append(f'    {node_id}(("{safe_label}"))') # Cercle double pour End
            elif label.startswith("If ") or label.startswith("While ") or label.startswith("For "):
                 mermaid.append(f'    {node_id}{{{safe_label}}}') # Losange pour Décision/Boucle
            elif label in ["jonction", "Sortie de boucle For", "Sortie de boucle While"]:
                 # Utiliser un cercle simple pour les jonctions/sorties de boucle
                 # Mermaid ne supporte pas directement un petit cercle vide, utilisons un cercle standard
                 mermaid.append(f'    {node_id}(({label}))') # Petit cercle (ou autre forme discrète)
            elif label.startswith("Return"):
                 mermaid.append(f'    {node_id}[/"{safe_label}"\\]') # Forme spécifique pour Return (parallélogramme incliné)
            elif label in ["Break", "Continue"]:
                 mermaid.append(f'    {node_id}(("{safe_label}"))') # Rond simple pour Break/Continue
            elif label.startswith("Fonction définie"):
                 mermaid.append(f'    {node_id}[/{safe_label}/]') # Parallélogramme pour définition
            elif label.startswith("Appel:"):
                 mermaid.append(f'    {node_id}[|{safe_label}|]') # Rectangle avec barre verticale pour appel
            else:
                 # Rectangle standard pour les autres processus/assignations
                 mermaid.append(f'    {node_id}["{safe_label}"]')

        # Ajout des arêtes filtrées
        for from_node, to_node, label in self.filter_edges():
            safe_edge_label = label.replace('"', '#quot;')
            if safe_edge_label:
                mermaid.append(f"    {from_node} -->|{safe_edge_label}| {to_node}")
            else:
                mermaid.append(f"    {from_node} --> {to_node}")

        return "\n".join(mermaid)

# --- Exemples d'utilisation ---
code = '''a = 5
b = 10
if a > b:
    print("a > b")
else:
    print("a <= b")
c = a + b
print(c)
'''
code2 = """
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
code3 = """
a=1
b=1
c=2
if a == b:
    # First level check
    if a == c: # Nested If 1
        # a=b=c
        if b == c: # Nested If 2 (actually redundant here)
            result = "Equilateral"
        else:
            # Should not happen if a=b and a=c
            result = "Error state 1"
    else:
        # a=b, a!=c
        result = "Isoscele (a=b)"
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
code4 = """
def bissextile(annee):
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

b = bissextile(2000) # True
b = bissextile(1900) # False
b = bissextile(2024) # True
"""

# Choisir le code à tester
selected_code = code3

# --- Génération et Affichage ---
print(f"--- Code Python analysé ---")
print(selected_code)
print("\n--- Mermaid Généré ---")

cfg = ControlFlowGraph(selected_code)
# Lancer la visite à partir de la racine de l'AST (le module)
cfg.visit(cfg.tree, None) # Le parent initial est None

print(cfg.to_mermaid())

# Optionnel : Afficher les noeuds et arêtes pour le débogage
# print("\n--- Noeuds (ID, Label) ---")
# for n in cfg.nodes:
#     print(n)
# print("\n--- Arêtes (From, To, Label) ---")
# for e in sorted(list(cfg.edges)): # Trié pour la lisibilité
#     print(e)
# print("\n--- Noeuds Terminaux ---")
# print(cfg.terminal_nodes)