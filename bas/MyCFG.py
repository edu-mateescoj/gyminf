import ast
from typing import List, Dict, Set, Tuple, Optional

class ControlFlowGraph:
    def __init__(self, code: str):
        self.tree = ast.parse(code)
        self.nodes: List[Tuple[str, str]] = []
        self.edges: Set[Tuple[str, str, str]] = set()
        self.node_counter = 0
        # loop_stack: (continue_target_id, break_exit_id, loop_condition_id)
        self.loop_stack: List[Tuple[str, str, str]] = []
        self.node_labels: Dict[str, str] = {}
        self.terminal_nodes: Set[str] = set()
        self.node_types: Dict[str, str] = {}
        # Pour stocker les ID de début et de fin des fonctions définies
        self.function_scopes: Dict[str, Tuple[str, str]] = {} # func_name -> (start_node_id, end_node_id)

    def get_node_id(self) -> str:
        self.node_counter += 1
        return f"node{self.node_counter:02d}"

    def add_node(self, label: str, node_type: str = "Process") -> str:
        node_id = self.get_node_id()
        self.nodes.append((node_id, label))
        self.node_labels[node_id] = label
        self.node_types[node_id] = node_type
        return node_id

    def add_edge(self, from_node: str, to_node: str, label: str = ""):
        if not from_node or not to_node:
            print(f"Warning: Tentative d'ajout d'arête avec noeud None: {from_node} -> {to_node}")
            return
        if from_node == to_node and not label:
            return # Ignorer boucles simples sans label
        if from_node in self.terminal_nodes and self.node_types.get(from_node) != "Jump": # Sauf pour Break/Continue
             # Les Jumps (Break/Continue) peuvent avoir une arête sortante vers leur cible de saut
            # print(f"Debug: Ignored edge from terminal node {from_node} ({self.node_labels.get(from_node)}) to {to_node}")
            return
        if from_node not in self.node_labels or to_node not in self.node_labels:
            # print(f"Warning: Tentative d'ajout d'arête entre noeuds non existants: {from_node} -> {to_node}")
            return
        self.edges.add((from_node, to_node, label))

    def _is_terminal_ast_node(self, node: ast.AST) -> bool: # Renommé pour clarté
        return isinstance(node, (ast.Return, ast.Break, ast.Continue))

    def visit_body(self, body: List[ast.AST], entry_node_ids: List[str], current_function_end_id: Optional[str] = None) -> List[str]:
        """
        Visite une séquence d'instructions.
        `current_function_end_id` est l'ID du noeud "End" de la fonction en cours de visite,
        utilisé pour connecter les 'Return' de cette portée.
        Retourne les points de sortie séquentiels du body.
        """
        active_parent_ids = list(set(entry_node_ids)) # Assurer l'unicité et copier

        for stmt in body:
            if not active_parent_ids: # Tous les chemins précédents se sont terminés
                break

            # Les noeuds de sortie de l'instruction précédente deviennent les entrées de celle-ci.
            # Filtrer ceux qui sont déjà marqués comme terminaux (sauf si ce sont des sauts qui ont déjà leur cible)
            current_stmt_entry_points = [pid for pid in active_parent_ids if pid not in self.terminal_nodes or self.node_types.get(pid) == "Jump"]
            
            if not current_stmt_entry_points:
                 active_parent_ids = [] # Plus de chemins actifs
                 break

            next_active_parent_ids = []
            for parent_id in current_stmt_entry_points:
                # Passer current_function_end_id pour que les sous-appels (ex: visit_Return) sachent où se connecter
                # si nous décidons de gérer la connexion des Return directement dans visit_Return.
                # Pour l'instant, connect_finals_to_end s'en charge.
                exit_nodes_from_stmt = self.visit(stmt, parent_id, current_function_end_id)
                next_active_parent_ids.extend(exit_nodes_from_stmt)
            
            active_parent_ids = list(set(next_active_parent_ids))

        # Retourner les points de sortie finaux du body qui ne sont pas terminaux
        return [pid for pid in active_parent_ids if pid not in self.terminal_nodes]

    def visit(self, node: ast.AST, parent_id: str, current_function_end_id: Optional[str] = None) -> List[str]:
        method_name = f'visit_{type(node).__name__}'
        visitor = getattr(self, method_name, self.generic_visit)
        
        # Passer current_function_end_id aux visiteurs spécifiques si nécessaire
        # Pour l'instant, la plupart ne l'utilisent pas directement, mais visit_Return pourrait.
        if hasattr(visitor, '__code__') and 'current_function_end_id' in visitor.__code__.co_varnames:
            exit_nodes: List[str] = visitor(node, parent_id, current_function_end_id)
        else:
            exit_nodes: List[str] = visitor(node, parent_id)


        if self._is_terminal_ast_node(node): # Basé sur le type de noeud AST
            if exit_nodes: # Le visiteur doit avoir retourné l'ID du noeud créé
                created_node_id = exit_nodes[0]
                self.terminal_nodes.add(created_node_id)
                # Si c'est un Return et qu'on est dans une fonction, on pourrait le connecter ici.
                # Mais connect_finals_to_end est plus général.
                # if isinstance(node, ast.Return) and current_function_end_id:
                #     self.add_edge(created_node_id, current_function_end_id)

            return [] # Les noeuds AST terminaux n'ont pas de sortie séquentielle "naturelle"
        return exit_nodes

    def connect_finals_to_end(self, target_end_id: str, scope_node_ids: Optional[Set[str]] = None):
        """
        Connecte les noeuds finaux (sans sortie) au target_end_id.
        Si scope_node_ids est fourni, ne connecte que les noeuds dans cette portée.
        """
        source_nodes = set(from_node for from_node, _, _ in self.edges)
        nodes_to_check = self.nodes
        if scope_node_ids:
            nodes_to_check = [(nid, lbl) for nid, lbl in self.nodes if nid in scope_node_ids]

        for node_id, label in nodes_to_check:
            if node_id == target_end_id:
                continue
            # Ne pas connecter un noeud déjà marqué comme terminal *sauf si c'est un Return non connecté*
            # Les Break/Continue sont gérés par leurs sauts explicites.
            is_return_node = self.node_types.get(node_id) == "Return"
            
            if node_id in self.terminal_nodes and not is_return_node:
                continue
            
            if node_id not in source_nodes: # S'il n'a pas d'arête sortante
                # Si c'est un Return, il doit aller à target_end_id (qui devrait être le func_end_id)
                # Si ce n'est pas un Return (fin implicite de bloc), il va aussi à target_end_id
                self.add_edge(node_id, target_end_id)


    def visit_Module(self, node: ast.Module, parent_id: Optional[str] = None, _current_function_end_id: Optional[str] = None) -> List[str]:
        start_id = self.add_node("Start", node_type="StartEnd")
        
        # Séparer les définitions de fonctions des autres statements
        function_defs = [n for n in node.body if isinstance(n, ast.FunctionDef)]
        other_statements = [n for n in node.body if not isinstance(n, ast.FunctionDef)]

        # Visiter les définitions de fonctions d'abord (elles ne contribuent pas au flux principal du module)
        for func_def_node in function_defs:
            self.visit(func_def_node, None) # parent_id est None pour les fonctions top-level

        # Visiter les autres statements pour le flux principal du module
        exit_nodes_module_body = self.visit_body(other_statements, [start_id])
        
        end_id = self.add_node("End", node_type="StartEnd")
        for node_id in exit_nodes_module_body:
            self.add_edge(node_id, end_id)
        
        # Collecter tous les noeuds du module (hors fonctions) pour connect_finals_to_end
        # C'est approximatif, une vraie gestion de portée serait mieux.
        module_scope_nodes = {nid for nid, _ in self.nodes if nid not in self.function_scopes.values()} # Très simplifié
        self.connect_finals_to_end(end_id, scope_node_ids=None) # Pour l'instant, connecte tout

        return [] # Module ne retourne pas de flux

    def visit_FunctionDef(self, node: ast.FunctionDef, parent_id: Optional[str], _current_function_end_id: Optional[str] = None) -> List[str]:
        # 1. Créer un noeud pour la *déclaration* de la fonction (pas dans le flux d'exécution principal)
        # Ce noeud est juste pour montrer que la fonction existe.
        func_decl_label = f"Déclaration: {node.name}(...)"
        # On ne l'ajoute pas au flux principal si parent_id est None (module-level)
        # Si parent_id existe (nested function), on pourrait le connecter. Pour l'instant, on le laisse flottant.
        # func_decl_id = self.add_node(func_decl_label, node_type="SubroutineDeclaration")
        # if parent_id:
        #     self.add_edge(parent_id, func_decl_id)

        # 2. Créer les noeuds Start et End pour le *corps* de cette fonction (son propre sous-graphe)
        func_start_id = self.add_node(f"Start {node.name}", node_type="StartEnd")
        func_end_id = self.add_node(f"End {node.name}", node_type="StartEnd")
        self.function_scopes[node.name] = (func_start_id, func_end_id) # Stocker la portée

        # 3. Visiter le corps de la fonction, en passant func_end_id
        body_normal_exit_nodes = self.visit_body(node.body, [func_start_id], func_end_id)

        # 4. Connecter les sorties normales du corps au noeud End de la fonction
        for node_id in body_normal_exit_nodes:
            self.add_edge(node_id, func_end_id)

        # 5. Connecter tous les 'Return' et fins de chemin implicites de CETTE fonction à son func_end_id
        # Pour cela, il faut identifier les noeuds appartenant à cette fonction.
        # C'est complexe sans une vraie gestion de portée des noeuds.
        # On va essayer une heuristique : connecter les terminaux créés *pendant* la visite du corps.
        # Une meilleure solution serait que visit_body collecte les noeuds créés dans sa portée.
        # Pour l'instant, on se fie à un connect_finals_to_end "global" pour la fonction.
        
        # Collecter les IDs des noeuds créés pendant la visite de cette fonction
        # (approximatif, basé sur le compteur de noeuds avant/après)
        # Cette approche est fragile. Une vraie gestion de portée est nécessaire.
        # Pour l'instant, on va laisser connect_finals_to_end dans visit_FunctionDef
        # essayer de connecter les retours.
        
        # On identifie les noeuds de cette fonction (approximatif)
        # Tous les noeuds créés entre func_start_id et func_end_id (inclus)
        # plus les noeuds du corps. C'est difficile à tracer sans passer une liste de "noeuds de la portée".
        # Pour l'instant, on se fie à ce que les Returns soient marqués terminaux et connect_finals_to_end fasse le travail.
        
        # On récupère tous les noeuds de la fonction (ceux créés depuis func_start_id)
        # C'est une simplification. Idéalement, visit_body retournerait les noeuds de sa portée.
        # Pour l'instant, on se fie à ce que les Return soient connectés par connect_finals_to_end.
        # On va appeler connect_finals_to_end spécifiquement pour cette fonction.
        # On a besoin d'une liste des noeuds qui sont DANS cette fonction.
        # C'est le point le plus délicat pour isoler les FunctionDef.

        # Tentative de connecter les Return de la portée actuelle
        # On suppose que les noeuds Return ont été ajoutés à self.terminal_nodes
        # et que self.node_types[nid] == "Return"
        # On ne connecte que les Return qui n'ont pas encore de sortie.
        source_nodes = set(from_node for from_node, _, _ in self.edges)
        for term_id in list(self.terminal_nodes): # Copie car on peut modifier self.edges
            if self.node_types.get(term_id) == "Return" and term_id not in source_nodes:
                # Comment savoir si ce Return appartient à *cette* fonction ?
                # Heuristique : s'il a été créé après func_start_id et avant/par func_end_id.
                # C'est fragile.
                # Pour l'instant, on connecte tous les Return non connectés au func_end_id actuel.
                # Cela posera problème avec les fonctions imbriquées.
                # Solution pour l'instant: connect_finals_to_end appelé à la fin du module gèrera.
                # On ne fait PAS de connexion spéciale des Return ici, on laisse connect_finals_to_end
                # de visit_Module le faire, ou on améliore connect_finals_to_end avec une portée.
                pass # Laisser connect_finals_to_end du module gérer, ou améliorer connect_finals_to_end

        # La définition de fonction ne continue pas le flux du parent (module)
        return []


    def visit_If(self, node: ast.If, parent_id: str, current_function_end_id: Optional[str] = None) -> List[str]:
        condition = ast.unparse(node.test).replace('"', '"')
        if_id = self.add_node(f"If {condition}", node_type="Decision")
        self.add_edge(parent_id, if_id)

        final_exit_nodes_after_if: List[str] = []
        
        # Garder une trace des premiers noeuds de chaque branche pour la labellisation
        first_node_true_branch: Optional[str] = None
        first_node_false_branch: Optional[str] = None

        # --- Branche True ---
        if node.body:
            # Obtenir les noeuds existants avant de visiter la branche
            nodes_before_true_branch = {n_id for n_id, _ in self.nodes}
            true_branch_exits = self.visit_body(node.body, [if_id], current_function_end_id)
            # Identifier le premier noeud créé dans cette branche
            nodes_after_true_branch = {n_id for n_id, _ in self.nodes}
            newly_created_in_true = list(nodes_after_true_branch - nodes_before_true_branch)
            if newly_created_in_true:
                 # Trier par ID pour obtenir le "premier" (suppose des IDs séquentiels)
                 newly_created_in_true.sort(key=lambda x: int(x.replace("node","")))
                 first_node_true_branch = newly_created_in_true[0]
                 self.add_edge(if_id, first_node_true_branch, "True") # Ajouter l'arête labellisée
            elif not true_branch_exits: # Branche vide ou se termine complètement
                 pass # Pas de premier noeud, pas d'arête True à ajouter ici
            final_exit_nodes_after_if.extend(true_branch_exits)
        else: # Branche True vide
            final_exit_nodes_after_if.append(if_id) # if_id est une sortie
            # Le label "True" sera sur l'arête if_id -> (instruction suivante)
            # Il faut une manière de dire à visit_body de labelliser cette arête.
            # Pour l'instant, on marque if_id comme nécessitant un label "True" pour sa prochaine sortie.
            # C'est complexe. On va d'abord se concentrer sur les branches non vides.

        # --- Branche False ---
        if node.orelse:
            nodes_before_false_branch = {n_id for n_id, _ in self.nodes}
            false_branch_exits = self.visit_body(node.orelse, [if_id], current_function_end_id)
            nodes_after_false_branch = {n_id for n_id, _ in self.nodes}
            newly_created_in_false = list(nodes_after_false_branch - nodes_before_false_branch)
            if newly_created_in_false:
                 newly_created_in_false.sort(key=lambda x: int(x.replace("node","")))
                 first_node_false_branch = newly_created_in_false[0]
                 self.add_edge(if_id, first_node_false_branch, "False")
            elif not false_branch_exits:
                 pass
            final_exit_nodes_after_if.extend(false_branch_exits)
        else: # Branche False vide
            final_exit_nodes_after_if.append(if_id)

        # Supprimer les arêtes non labellisées de if_id vers les débuts de branche si on a ajouté des labellisées
        # (visit_body a pu créer if_id -> first_node_true_branch sans label)
        if first_node_true_branch and (if_id, first_node_true_branch, "") in self.edges:
            self.edges.remove((if_id, first_node_true_branch, ""))
        if first_node_false_branch and (if_id, first_node_false_branch, "") in self.edges:
            self.edges.remove((if_id, first_node_false_branch, ""))
            
        unique_exits = list(set(final_exit_nodes_after_if))
        # Si if_id est une sortie (branche vide) et que l'autre branche est terminale, if_id n'est pas terminal.
        # Si les deux branches ont des sorties et que ces sorties sont toutes terminales, alors []
        if unique_exits and all(n in self.terminal_nodes for n in unique_exits if n != if_id):
            # Si if_id est la seule sortie non terminale, on le retourne.
            if if_id in unique_exits and not any(n not in self.terminal_nodes for n in unique_exits if n != if_id):
                 return [if_id]
            return []

        return unique_exits

    # _label_first_edge_from_decision N'EST PLUS UTILISEE DANS CETTE APPROCHE POUR IF

    def visit_For(self, node: ast.For, parent_id: str, current_function_end_id: Optional[str] = None) -> List[str]:
        iterator_str = ast.unparse(node.target).replace('"', '"')
        iterable_node = node.iter
        
        # Points de sortie de la boucle For (ceux qui mènent à l'instruction *après* la boucle)
        loop_overall_exit_points: List[str] = []

        if isinstance(iterable_node, ast.Call) and \
           isinstance(iterable_node.func, ast.Name) and \
           iterable_node.func.id == 'range':

            range_args = iterable_node.args
            start_val_str = "0"; stop_val_str = ""; step_val_str = "1"
            if len(range_args) == 1: stop_val_str = ast.unparse(range_args[0]).replace('"', '#quot;')
            elif len(range_args) >= 2:
                start_val_str = ast.unparse(range_args[0]).replace('"', '#quot;')
                stop_val_str = ast.unparse(range_args[1]).replace('"', '#quot;')
                if len(range_args) == 3: step_val_str = ast.unparse(range_args[2]).replace('"', '#quot;')
            else: # Fallback
                return self._visit_for_generic_iterable(node, parent_id, iterator_str, current_function_end_id)

            init_label = f"{iterator_str} = {start_val_str}"
            init_node_id = self.add_node(init_label, node_type="Process")
            self.add_edge(parent_id, init_node_id)

            condition_op = "<"
            try:
                temp_step_for_eval = step_val_str.replace('"', '')
                if temp_step_for_eval:
                    step_numeric = ast.literal_eval(temp_step_for_eval)
                    if isinstance(step_numeric, (int, float)) and step_numeric < 0: condition_op = ">"
            except: pass

            loop_cond_label = f"{iterator_str} {condition_op} {stop_val_str}"
            loop_cond_id = self.add_node(loop_cond_label, node_type="Decision")
            self.add_edge(init_node_id, loop_cond_id)

            # La branche "False" (terminaison normale) du losange est un point de sortie global
            loop_overall_exit_points.append(loop_cond_id) # L'arête "False" partira de là vers la suite

            increment_label = f"{iterator_str} = {iterator_str} + {step_val_str}"
            increment_node_id = self.add_node(increment_label, node_type="Process")
            
            self.loop_stack.append((increment_node_id, loop_cond_id, loop_cond_id)) # (continue_target, break_target_placeholder, retest_target)
                                                                                  # break_target sera loop_cond_id (pour sa branche False)

            # Visiter le corps
            nodes_before_body = {n_id for n_id, _ in self.nodes}
            body_exit_nodes = self.visit_body(node.body, [loop_cond_id], current_function_end_id)
            if node.body:
                nodes_after_body = {n_id for n_id, _ in self.nodes}
                newly_created_in_body = list(nodes_after_body - nodes_before_body)
                if newly_created_in_body:
                    newly_created_in_body.sort(key=lambda x: int(x.replace("node","")))
                    first_node_body = newly_created_in_body[0]
                    if (loop_cond_id, first_node_body, "") in self.edges: self.edges.remove((loop_cond_id, first_node_body, ""))
                    self.add_edge(loop_cond_id, first_node_body, "True")


            for exit_node in body_exit_nodes:
                self.add_edge(exit_node, increment_node_id)
            self.add_edge(increment_node_id, loop_cond_id) # Retour à la condition
            
            # Gérer orelse
            if node.orelse:
                nodes_before_orelse = {n_id for n_id, _ in self.nodes}
                orelse_exit_nodes = self.visit_body(node.orelse, [loop_cond_id], current_function_end_id) # orelse part de la condition False
                nodes_after_orelse = {n_id for n_id, _ in self.nodes}
                newly_created_in_orelse = list(nodes_after_orelse - nodes_before_orelse)
                if newly_created_in_orelse:
                    newly_created_in_orelse.sort(key=lambda x: int(x.replace("node","")))
                    first_node_orelse = newly_created_in_orelse[0]
                    if (loop_cond_id, first_node_orelse, "") in self.edges: self.edges.remove((loop_cond_id, first_node_orelse, ""))
                    self.add_edge(loop_cond_id, first_node_orelse, "False") # Label False vers orelse
                loop_overall_exit_points.extend(orelse_exit_nodes)
                # Si orelse existe, loop_cond_id n'est plus une sortie directe pour "False"
                loop_overall_exit_points.remove(loop_cond_id) if loop_cond_id in loop_overall_exit_points else None
            else:
                # Si pas de orelse, l'arête "False" de loop_cond_id pointera vers la suite
                # loop_cond_id est déjà dans loop_overall_exit_points
                pass
                
            self.loop_stack.pop()
            return list(set(loop_overall_exit_points))
            
        else: # Itérable générique
            return self._visit_for_generic_iterable(node, parent_id, iterator_str, current_function_end_id)

    def _visit_for_generic_iterable(self, node: ast.For, parent_id: str, iterator_str: str, current_function_end_id: Optional[str] = None) -> List[str]:
        iterable_label = ast.unparse(node.iter).replace('"', '"')
        loop_decision_label = f"For {iterator_str} in {iterable_label}"
        loop_decision_id = self.add_node(loop_decision_label, node_type="Decision")
        self.add_edge(parent_id, loop_decision_id)

        loop_overall_exit_points: List[str] = [loop_decision_id] # Sortie "Terminée/Vide"

        self.loop_stack.append((loop_decision_id, loop_decision_id, loop_decision_id))

        nodes_before_body = {n_id for n_id, _ in self.nodes}
        body_exit_nodes = self.visit_body(node.body, [loop_decision_id], current_function_end_id)
        if node.body:
            nodes_after_body = {n_id for n_id, _ in self.nodes}
            newly_created_in_body = list(nodes_after_body - nodes_before_body)
            if newly_created_in_body:
                newly_created_in_body.sort(key=lambda x: int(x.replace("node","")))
                first_node_body = newly_created_in_body[0]
                if (loop_decision_id, first_node_body, "") in self.edges: self.edges.remove((loop_decision_id, first_node_body, ""))
                self.add_edge(loop_decision_id, first_node_body, "itération")


        for exit_node in body_exit_nodes:
            self.add_edge(exit_node, loop_decision_id)

        if node.orelse:
            nodes_before_orelse = {n_id for n_id, _ in self.nodes}
            orelse_exit_nodes = self.visit_body(node.orelse, [loop_decision_id], current_function_end_id)
            nodes_after_orelse = {n_id for n_id, _ in self.nodes}
            newly_created_in_orelse = list(nodes_after_orelse - nodes_before_orelse)
            if newly_created_in_orelse:
                newly_created_in_orelse.sort(key=lambda x: int(x.replace("node","")))
                first_node_orelse = newly_created_in_orelse[0]
                if (loop_decision_id, first_node_orelse, "") in self.edges: self.edges.remove((loop_decision_id, first_node_orelse, ""))
                self.add_edge(loop_decision_id, first_node_orelse, "Terminée / Vide")
            loop_overall_exit_points.extend(orelse_exit_nodes)
            loop_overall_exit_points.remove(loop_decision_id) if loop_decision_id in loop_overall_exit_points else None
        else:
            pass # loop_decision_id est déjà une sortie pour "Terminée / Vide"

        self.loop_stack.pop()
        return list(set(loop_overall_exit_points))
    
    def visit_While(self, node: ast.While, parent_id: str, current_function_end_id: Optional[str] = None) -> List[str]:
        condition = ast.unparse(node.test).replace('"', '"')
        while_id = self.add_node(f"While {condition}", node_type="Decision")
        self.add_edge(parent_id, while_id)

        loop_overall_exit_points: List[str] = [while_id] # La branche "False" part de while_id

        self.loop_stack.append((while_id, while_id, while_id)) # (continue_target, break_target_is_loop_exit, retest_target)

        body_exit_nodes = []
        if node.body:
            nodes_before_body = {n_id for n_id, _ in self.nodes}
            body_exit_nodes = self.visit_body(node.body, [while_id], current_function_end_id)
            nodes_after_body = {n_id for n_id, _ in self.nodes}
            newly_created_in_body = list(nodes_after_body - nodes_before_body)
            if newly_created_in_body:
                newly_created_in_body.sort(key=lambda x: int(x.replace("node","")))
                first_node_body = newly_created_in_body[0]
                if (while_id, first_node_body, "") in self.edges: self.edges.remove((while_id, first_node_body, ""))
                self.add_edge(while_id, first_node_body, "True")

            for exit_node in body_exit_nodes:
                self.add_edge(exit_node, while_id)

        if node.orelse:
            nodes_before_orelse = {n_id for n_id, _ in self.nodes}
            orelse_exit_nodes = self.visit_body(node.orelse, [while_id], current_function_end_id)
            nodes_after_orelse = {n_id for n_id, _ in self.nodes}
            newly_created_in_orelse = list(nodes_after_orelse - nodes_before_orelse)
            if newly_created_in_orelse:
                newly_created_in_orelse.sort(key=lambda x: int(x.replace("node","")))
                first_node_orelse = newly_created_in_orelse[0]
                if (while_id, first_node_orelse, "") in self.edges: self.edges.remove((while_id, first_node_orelse, ""))
                self.add_edge(while_id, first_node_orelse, "False")
            loop_overall_exit_points.extend(orelse_exit_nodes)
            loop_overall_exit_points.remove(while_id) if while_id in loop_overall_exit_points else None
        else:
            # while_id est déjà une sortie pour "False"
            pass
            
        self.loop_stack.pop()
        return list(set(loop_overall_exit_points))

    def visit_Return(self, node: ast.Return, parent_id: str, current_function_end_id: Optional[str] = None) -> List[str]:
        value = ast.unparse(node.value).replace('"', '"') if node.value else ""
        return_id = self.add_node(f"Return {value}", node_type="Return")
        self.add_edge(parent_id, return_id)
        # La connexion au func_end_id est gérée par connect_finals_to_end pour la portée de la fonction
        return [return_id] # visit() le marquera comme terminal et retournera []

    def visit_Break(self, node: ast.Break, parent_id: str, _current_function_end_id: Optional[str] = None) -> List[str]:
        break_id = self.add_node("Break", node_type="Jump")
        self.add_edge(parent_id, break_id)
        if self.loop_stack:
            _, loop_exit_condition_node, _ = self.loop_stack[-1]
            # Un break signifie que le flux saute à la sortie "False" ou "Terminée" du noeud de condition de la boucle.
            # L'arête break_id -> (ce qui suit la boucle) sera créée par visit_body
            # car break_id sera retourné comme un point de sortie de la structure de boucle.
            # Non, break est un terminal. Il ne continue pas.
            # On doit le connecter à la sortie de la boucle.
            # La sortie de la boucle est représentée par le noeud de condition lui-même, via sa branche False/Terminée.
            # Donc, un break devrait pointer vers le noeud qui suit la boucle.
            # Pour l'instant, on ne connecte pas explicitement. Le chemin s'arrête.
            # Le flux reprendra après la boucle.
            #
            # Correction: Break est un terminal, mais il *doit* pointer vers la sortie de la boucle.
            # La "sortie de la boucle" est le point d'où part l'arête "False" ou "Terminée".
            # C'est le noeud de condition de la boucle lui-même.
            # Donc, un break devrait être connecté à ce qui suit la boucle.
            # Pour l'instant, on ne le connecte pas explicitement ici.
            # Le `visit_For/While` retourne le `loop_cond_id` comme un point de sortie.
            # Le `visit_body` connectera ce `loop_cond_id` (via sa branche False) à la suite.
            # Un `Break` termine son chemin, et le flux reprendra après la boucle.
            #
            # Nouvelle approche: le break_target est le loop_cond_id (pour sa branche False)
            # self.add_edge(break_id, loop_exit_condition_node, "break") # Label optionnel
            pass # Le break est terminal, le flux reprendra après la boucle.
        else:
            print("Warning: 'break' outside loop detected.")
        return [break_id] # visit() le marquera comme terminal

    def visit_Continue(self, node: ast.Continue, parent_id: str, _current_function_end_id: Optional[str] = None) -> List[str]:
        continue_id = self.add_node("Continue", node_type="Jump")
        self.add_edge(parent_id, continue_id)
        if self.loop_stack:
            loop_continue_target, _, _ = self.loop_stack[-1]
            self.add_edge(continue_id, loop_continue_target)
        else:
            print("Warning: 'continue' outside loop detected.")
        return [continue_id] # visit() le marquera comme terminal

    def generic_visit(self, node: ast.AST, parent_id: str, _current_function_end_id: Optional[str] = None) -> List[str]:
        try:
            label = ast.unparse(node).replace('"', '"')
            node_type = "Process"
            if isinstance(node, ast.Pass):
                label = "Pass"
            max_len = 60
            if len(label) > max_len: label = label[:max_len-3] + "..."
            node_id = self.add_node(label, node_type=node_type)
            self.add_edge(parent_id, node_id)
            return [node_id]
        except Exception as e:
            label = f"Noeud AST: {type(node).__name__}"
            print(f"Warning: Impossible de 'unparse' le noeud {label}. Erreur: {e}")
            node_id = self.add_node(label, node_type="Process")
            self.add_edge(parent_id, node_id)
            return [node_id]

    def visit_Assign(self, node: ast.Assign, parent_id: str, _current_function_end_id: Optional[str] = None) -> List[str]:
        targets = ", ".join([ast.unparse(t).replace('"', '"') for t in node.targets])
        value_str = ast.unparse(node.value).replace('"', '"')
        label = f"{targets} = {value_str}"
        node_type = "Process"
        # TODO: Réintégrer la logique de détection de type d'appel pour node_type
        # if isinstance(node.value, ast.Call): ...
        max_len = 60
        if len(label) > max_len:
             short_value = value_str[:max_len - len(targets) - 6] + "..." if len(value_str) > max_len - len(targets) - 6 else value_str
             label = f"{targets} = {short_value}"
             if len(label) > max_len: label = label[:max_len-3] + "..."
        assign_id = self.add_node(label, node_type=node_type)
        self.add_edge(parent_id, assign_id)
        return [assign_id]

    def visit_Expr(self, node: ast.Expr, parent_id: str, current_function_end_id: Optional[str] = None) -> List[str]:
        # Passer current_function_end_id au cas où node.value est un Return (improbable mais pour être sûr)
        return self.visit(node.value, parent_id, current_function_end_id)

    def visit_Call(self, node: ast.Call, parent_id: str, _current_function_end_id: Optional[str] = None) -> List[str]:
        func_name_str = ast.unparse(node.func).replace('"', '"')
        args_str_val = ", ".join([ast.unparse(a).replace('"', '"') for a in node.args])
        max_arg_len = 30
        if len(args_str_val) > max_arg_len: args_str_val = args_str_val[:max_arg_len-3] + "..."
        
        label_prefix = "Appel: "
        node_type = "Process" # Par défaut

        # Logique pour identifier le type d'appel (simplifié)
        # Vous aurez besoin de self.user_defined_functions et IO_FUNCTIONS ici
        # if func_name_str in getattr(self, 'IO_FUNCTIONS', {}):
        #     node_type = "IoOperation"
        #     label_prefix = "" # Pas de "Appel:" pour print/input
        # elif func_name_str in getattr(self, 'user_defined_functions', {}):
        #     node_type = "UserFunctionCall"
        
        label = f"{label_prefix}{func_name_str}({args_str_val})"
        if "<br>" not in label_prefix and node_type != "IoOperation": # Eviter double <br>
             label = f"Appel: <br>{func_name_str}({args_str_val})"


        call_id = self.add_node(label, node_type=node_type)
        self.add_edge(parent_id, call_id)
        return [call_id]

    def filter_edges(self): # Actuellement non utilisé pour filtrage complexe
        return self.edges

    def to_mermaid(self) -> str:
        mermaid = ["graph TD"]
        mermaid.extend(["classDef RedFalse stroke:red,stroke-width:3px;",
                        "classDef GreenTrue stroke:green,stroke-width:3px;",
                        "classDef Dashed stroke:green,stroke-width:3px,stroke-dasharray:4,2",
                        "classDef Decision fill:#bbf,stroke:#333,stroke-width:3px;"])

        node_definitions = []
        edge_definitions = []

        for node_id, label in self.nodes:
            safe_label = label.replace('"', '#quot;')
            node_type = self.node_types.get(node_id, "Process")

            if node_type == "StartEnd": node_definitions.append(f'    {node_id}(("{safe_label}"))')
            elif node_type == "Decision": node_definitions.append(f'    {node_id}{{"{safe_label}"}}')
            elif node_type == "Junction": node_definitions.append(f'    {node_id}(["{safe_label}"])')
            elif node_type == "Return": node_definitions.append(f'    {node_id}[\\"{safe_label}"\\]')
            elif node_type == "Jump": node_definitions.append(f'    {node_id}(("{safe_label}"))')
            elif node_type == "SubroutineDefinition": node_definitions.append(f'    {node_id}[/"{safe_label}"/]')
            # elif node_type == "IoOperation": node_definitions.append(f'    {node_id}[/"{safe_label}"/]')
            # elif node_type == "UserFunctionCall": node_definitions.append(f'    {node_id}[("{safe_label}")]')
            elif node_type == "Process": node_definitions.append(f'    {node_id}["{safe_label}"]')
            else:
                print(f"Warning: Type de noeud inconnu '{node_type}' pour node_id '{node_id}'.")
                node_definitions.append(f'    {node_id}["{safe_label}"]')
        
        mermaid.extend(sorted(node_definitions))

        for from_node, to_node, label in self.edges:
            safe_edge_label = label.replace('"', '#quot;')
            if from_node not in self.node_labels or to_node not in self.node_labels:
                # print(f"Debug: Arête ignorée dans to_mermaid (noeud non défini): {from_node} -> {to_node}")
                continue
            if safe_edge_label: edge_definitions.append(f"    {from_node} -->|{safe_edge_label}| {to_node}")
            else: edge_definitions.append(f"    {from_node} --> {to_node}")
        
        mermaid.extend(sorted(edge_definitions))
        return "\n".join(mermaid)

############### Exemples d'utilisation ###############
import exemples
'''
LISTE_EXEMPLES = [
ifelif, defif, NestedIf, bissextile, defcall
cgi_decode, gcd, compute_gcd, fib, quadsolver, 
defcall, for1, while1, boucleinfinie, 
tryeef, bouclecontinue, whilebreak, if_is_raise
]
'''
############### Choisir le code à tester ###############
selected_code = exemples.bissextile2
########################################################

# --- Génération et Affichage ---
print(f"--- Code Python analysé ---")
print(selected_code)
print("\n--- Mermaid Généré ---")

cfg = ControlFlowGraph(selected_code)
# Lancer la visite à partir de la racine de l'AST (le module)
cfg.visit(cfg.tree, None) # Le parent initial est None
print(ast.dump(cfg.tree))
print(cfg.to_mermaid())

# Optionnel : Afficher les noeuds et arêtes pour le débogage
print("\n--- Noeuds (ID, Label) ---")
for n in cfg.nodes:
     print(n)
print("\n--- Arêtes (From, To, Label) ---")
for e in sorted(list(cfg.edges)): # Trié pour la lisibilité
     print(e)
print("\n--- Noeuds Terminaux ---")
print(cfg.terminal_nodes)