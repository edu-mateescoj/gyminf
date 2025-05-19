import ast
from typing import List, Dict, Set, Tuple, Optional

class ControlFlowGraph:
    def __init__(self, code: str):
        self.tree = ast.parse(code)
        self.nodes: List[Tuple[str, str]] = []
        self.edges: Set[Tuple[str, str, str]] = set()
        self.node_counter = 0
        self.loop_stack: List[Tuple[str, str, str]] = [] # (continue_target, break_target_is_loop_exit_cond_node, retest_target)
        self.node_labels: Dict[str, str] = {}
        self.terminal_nodes: Set[str] = set()
        self.node_types: Dict[str, str] = {}
        
        # Pile pour gérer les portées des fonctions imbriquées
        # Chaque élément est un Set d'IDs de noeuds pour cette portée de fonction
        self._function_scope_stack: List[Set[str]] = []
        
        ## Pour aider à définir la portée des noeuds pour connect_finals_to_end dans une fonction
        #self._current_function_node_ids: Optional[Set[str]] = None

    def get_node_id(self) -> str:
        self.node_counter += 1
        new_id = f"node{self.node_counter:02d}"
         # Si on est dans une portée de fonction, ajouter le nouvel ID à la portée actuelle
        if self._function_scope_stack:
            self._function_scope_stack[-1].add(new_id)
        return new_id
        
        #if self._current_function_node_ids is not None:
        #    self._current_function_node_ids.add(new_id)
        #return new_id

    def add_node(self, label: str, node_type: str = "Process") -> str:
        node_id = self.get_node_id() # get_node_id va l'ajouter à _current_function_node_ids si actif
        self.nodes.append((node_id, label))
        self.node_labels[node_id] = label
        self.node_types[node_id] = node_type
        return node_id

    def add_edge(self, from_node: str, to_node: str, label: str = ""):
        if not from_node or not to_node:
            # print(f"Warning: Tentative d'ajout d'arête avec noeud None: {from_node} -> {to_node}")
            return
        if from_node == to_node and not label:
            return
        # Permettre aux Jumps (Break/Continue) d'avoir une arête sortante même s'ils sont terminaux
        if from_node in self.terminal_nodes and self.node_types.get(from_node) != "Jump":
            return
        if from_node not in self.node_labels or to_node not in self.node_labels:
            # print(f"Warning: Tentative d'ajout d'arête entre noeuds non existants: {from_node} -> {to_node}")
            return
        self.edges.add((from_node, to_node, label))

    def _is_terminal_ast_node(self, node: ast.AST) -> bool:
        return isinstance(node, (ast.Return, ast.Break, ast.Continue))


    def visit_body(self, body: List[ast.AST], entry_node_ids: List[str]) -> List[str]:
        active_parent_ids = list(set(entry_node_ids)) 

        for stmt in body:
            if not active_parent_ids: 
                break
            
            current_stmt_entry_points = [pid for pid in active_parent_ids if pid not in self.terminal_nodes]
            
            if not current_stmt_entry_points:
                 active_parent_ids = [] 
                 break

            next_active_parent_ids = []
            for parent_id in current_stmt_entry_points:
                exit_nodes_from_stmt = self.visit(stmt, parent_id) # current_function_end_id n'est plus passé ici
                next_active_parent_ids.extend(exit_nodes_from_stmt)
            
            active_parent_ids = list(set(next_active_parent_ids))

        return [pid for pid in active_parent_ids if pid not in self.terminal_nodes]

    def visit(self, node: ast.AST, parent_id: Optional[str]) -> List[str]: # parent_id peut être None pour Module
        method_name = f'visit_{type(node).__name__}'
        visitor = getattr(self, method_name, self.generic_visit)
        
        # Pour le Module, parent_id est None, géré par visit_Module
        # Pour les autres, parent_id doit exister.
        if parent_id is None and not isinstance(node, (ast.Module, ast.FunctionDef)):
            print(f"Critical Warning: visit() appelé avec parent_id=None pour noeud {type(node).__name__}")
            return []

        # Les visiteurs spécifiques n'ont plus besoin de current_function_end_id
        # car la portée est gérée par _function_scope_stack
        exit_nodes: List[str] = visitor(node, parent_id)

        if self._is_terminal_ast_node(node): 
            if exit_nodes: 
                created_node_id = exit_nodes[0]
                self.terminal_nodes.add(created_node_id)
            else:
                print(f"Warning: Visiteur pour noeud terminal {type(node).__name__} n'a pas retourné d'ID.")
            return [] 
        return exit_nodes

    def connect_finals_to_end(self, target_end_id: str, scope_node_ids: Optional[Set[str]] = None):
        source_nodes = set(from_node for from_node, _, _ in self.edges)
        
        nodes_to_check_ids = scope_node_ids
        if nodes_to_check_ids is None: # Si pas de portée, vérifier tous les noeuds
            nodes_to_check_ids = set(self.node_labels.keys())

        for node_id in list(nodes_to_check_ids): # Itérer sur une copie si on modifie self.edges
            if node_id not in self.node_labels: # Le noeud a pu être supprimé (logique future)
                continue

            if node_id == target_end_id:
                continue
            
            is_return_node = self.node_types.get(node_id) == "Return"
            
            # Un Return doit toujours être connecté s'il n'a pas de sortie, même s'il est dans terminal_nodes.
            # Les autres terminaux (Break/Continue) ont déjà leurs sauts gérés.
            if node_id in self.terminal_nodes and not is_return_node:
                continue
            
            if node_id not in source_nodes: # S'il n'a pas d'arête sortante
                self.add_edge(node_id, target_end_id)


    def visit_Module(self, node: ast.Module, parent_id: Optional[str] = None) -> List[str]:
        # parent_id est None ici, et _current_function_end_id n'est pas pertinent pour le module lui-même
        start_id = self.add_node("Start", node_type="StartEnd")
        
        function_defs = [n for n in node.body if isinstance(n, ast.FunctionDef)]
        other_statements = [n for n in node.body if not isinstance(n, ast.FunctionDef)]

        # Visiter les définitions de fonctions d'abord. Elles construisent leur propre sous-graphe.
        # Elles ne retournent rien au flux du module.
        for func_def_node in function_defs:
            self.visit(func_def_node, None) # parent_id est None pour les func defs top-level

        # Visiter les autres statements pour le flux principal du module
        current_module_flow_exits = self.visit_body(other_statements, [start_id])
        
        module_end_id = self.add_node("End", node_type="StartEnd")
        for node_id in current_module_flow_exits:
            self.add_edge(node_id, module_end_id)
        
        # Connecter les fins du module (celles qui ne sont pas dans une fonction)
        # On ne passe pas de scope_node_ids ici, pour connecter les fins globales du module.
        # Les fins de fonction auront déjà été connectées à leur propre End de fonction.
        self.connect_finals_to_end(module_end_id) 

        return []

    def visit_FunctionDef(self, node: ast.FunctionDef, parent_id: Optional[str]) -> List[str]:
        # 1. Créer un noeud de "Déclaration" pour cette fonction dans le flux parent (si parent_id existe)
        # Ce noeud est juste pour montrer où la fonction est définie.
        func_decl_label = f"Déclaration: {node.name}(...)"
        func_decl_id = self.add_node(func_decl_label, node_type="SubroutineDeclaration") # Nouveau type

        current_flow_continuation = []
        if parent_id:
            self.add_edge(parent_id, func_decl_id)
            current_flow_continuation = [func_decl_id] # Le flux du parent continue après la déclaration

        # 2. Gérer la portée pour les noeuds internes à cette fonction
        self._function_scope_stack.append(set()) # Nouvelle portée pour cette fonction
        
        # 3. Créer les noeuds Start et End pour le *corps* de cette fonction
        func_start_id = self.add_node(f"Start {node.name}", node_type="StartEnd")
        func_end_id = self.add_node(f"End {node.name}", node_type="StartEnd")

        # 4. Visiter le corps de la fonction
        body_normal_exit_nodes = self.visit_body(node.body, [func_start_id])

        # 5. Connecter les sorties normales du corps (non-Return) au noeud End de la fonction
        for node_id in body_normal_exit_nodes:
            self.add_edge(node_id, func_end_id)

        # 6. Connecter tous les 'Return' et fins de chemin implicites DANS CETTE FONCTION
        #    à son propre func_end_id.
        #    On utilise le SCOPE ACTUEL.
        current_scope_ids = self._function_scope_stack[-1] # Obtenir la portée actuelle
        self.connect_finals_to_end(func_end_id, scope_node_ids=current_scope_ids)

        # 7. Restaurer la portée de fonction précédente (pour les fonctions imbriquées)
        self._function_scope_stack.pop()

        # 8. Retourner le noeud de déclaration pour que le flux parent continue,
        #    ou [] si c'est une fonction top-level (parent_id is None).
        return current_flow_continuation


    def visit_If(self, node: ast.If, parent_id: str) -> List[str]:
        condition = ast.unparse(node.test).replace('"', '"')
        if_id = self.add_node(f"If {condition}", node_type="Decision")
        self.add_edge(parent_id, if_id)

        final_exit_nodes_after_if: List[str] = []
        
        # Pour stocker le premier noeud créé par visit_body pour chaque branche
        true_branch_start_node: Optional[str] = None
        false_branch_start_node: Optional[str] = None

        # --- Branche True ---
        if node.body:
            nodes_before_true = {nid for nid,_ in self.nodes}
            true_branch_exits = self.visit_body(node.body, [if_id])
            nodes_after_true = {nid for nid,_ in self.nodes}
            new_nodes_in_true = sorted(list(nodes_after_true - nodes_before_true), key=lambda x: int(x.replace("node","")))
            if new_nodes_in_true:
                true_branch_start_node = new_nodes_in_true[0]
            final_exit_nodes_after_if.extend(true_branch_exits)
        else: # Branche True vide
            final_exit_nodes_after_if.append(if_id) # if_id est une sortie directe pour la condition True

        # --- Branche False ---
        if node.orelse:
            nodes_before_false = {nid for nid,_ in self.nodes}
            false_branch_exits = self.visit_body(node.orelse, [if_id])
            nodes_after_false = {nid for nid,_ in self.nodes}
            new_nodes_in_false = sorted(list(nodes_after_false - nodes_before_false), key=lambda x: int(x.replace("node","")))
            if new_nodes_in_false:
                false_branch_start_node = new_nodes_in_false[0]
            final_exit_nodes_after_if.extend(false_branch_exits)
        else: # Branche False vide
            final_exit_nodes_after_if.append(if_id) # if_id est une sortie directe pour la condition False

        # Labellisation des arêtes
        # Supprimer les arêtes non labellisées de if_id vers les débuts de branche si elles existent
        # (créées par le premier appel à self.visit(stmt, if_id) dans visit_body)
        if true_branch_start_node:
            if (if_id, true_branch_start_node, "") in self.edges:
                self.edges.remove((if_id, true_branch_start_node, ""))
            self.add_edge(if_id, true_branch_start_node, "True")
        elif not node.body and false_branch_start_node: # True vide, False non vide
            # L'arête if_id -> (suite) doit être "True"
            # On ne peut pas le faire ici directement sans jonction.
            # On pourrait marquer if_id pour que la prochaine arête sortante (non False) soit True.
            # Pour l'instant, on ajoute une arête vers la cible de la branche False avec label True
            # ce qui est incorrect. Il faut une meilleure solution pour les branches vides.
            # Temporairement, on ne labellise pas si la branche est vide et l'autre existe.
            pass
        elif not node.body and not node.orelse: # Les deux branches vides
             # On pourrait avoir if_id --True--> suite ET if_id --False--> suite
             # C'est ambigu. Pour l'instant, pas de labels spécifiques.
             pass
    
        if false_branch_start_node:
            if (if_id, false_branch_start_node, "") in self.edges:
                self.edges.remove((if_id, false_branch_start_node, ""))
            self.add_edge(if_id, false_branch_start_node, "False")
        elif not node.orelse and true_branch_start_node: # False vide, True non vide
            pass # Idem, label "False" difficile à placer
    
        unique_exits = list(set(final_exit_nodes_after_if))
        
        ## Si if_id est une sortie (branche vide) et que l'autre branche est terminale, if_id n'est pas terminal.
        ## Si les deux branches ont des sorties et que ces sorties sont toutes terminales (et ne sont pas if_id), alors []
        non_if_id_exits = [n for n in unique_exits if n != if_id]
        if non_if_id_exits and all(n in self.terminal_nodes for n in non_if_id_exits):
            # Si if_id est la seule sortie non terminale (parce que les branches étaient vides),
            # alors le if n'est pas terminal en soi.
            if if_id in unique_exits and len(non_if_id_exits) == 0 : # if_id est la seule sortie
                return [if_id]
            return [] 

        return unique_exits

    # ... visit_For, _visit_for_generic_iterable, visit_While ...
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
                return self._visit_for_generic_iterable(node, parent_id, iterator_str)

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

            ## La branche "False" (terminaison normale) du losange est un point de sortie global
            loop_overall_exit_points.append(loop_cond_id) # L'arête "False" partira de là vers la suite

            increment_label = f"{iterator_str} = {iterator_str} + {step_val_str}"
            increment_node_id = self.add_node(increment_label, node_type="Process")
            
            self.loop_stack.append((increment_node_id, loop_cond_id, loop_cond_id)) 
            # # continue_target_id, break_target_id, retest_target_id := dans l'ordre: 
            # 'vers qui fait sauter le flux' pour les 'continue', les 'break', et 'test' de continuation de boucle

            true_branch_start_node: Optional[str] = None
            if node.body:# Visiter le corps
                nodes_before_body = {n_id for n_id, _ in self.nodes}
                body_exit_nodes = self.visit_body(node.body, [loop_cond_id])
                nodes_after_body = {nid for nid,_ in self.nodes}
                new_nodes_in_body = sorted(list(nodes_after_body - nodes_before_body), key=lambda x: int(x.replace("node","")))
                if new_nodes_in_body:
                    true_branch_start_node = new_nodes_in_body[0]
                for exit_node in body_exit_nodes:
                    self.add_edge(exit_node, increment_node_id)


            if true_branch_start_node: # Labelliser après avoir connecté le corps à l'incrément
                if (loop_cond_id, true_branch_start_node, "") in self.edges: self.edges.remove((loop_cond_id, true_branch_start_node, ""))
                self.add_edge(loop_cond_id, true_branch_start_node, "True")
            
            self.add_edge(increment_node_id, loop_cond_id)
            
            # Gérer orelse
            false_branch_start_node: Optional[str] = None
            if node.orelse:
                nodes_before_orelse = {nid for nid,_ in self.nodes}
                orelse_exit_nodes = self.visit_body(node.orelse, [loop_cond_id]) 
                nodes_after_orelse = {nid for nid,_ in self.nodes}
                new_nodes_in_orelse = sorted(list(nodes_after_orelse - nodes_before_orelse), key=lambda x: int(x.replace("node","")))
                if new_nodes_in_orelse:
                    false_branch_start_node = new_nodes_in_orelse[0]
                loop_overall_exit_points.extend(orelse_exit_nodes)
                if loop_cond_id in loop_overall_exit_points: 
                    loop_overall_exit_points.remove(loop_cond_id)
            
            if false_branch_start_node: # Labelliser la branche orelse (qui est la sortie "False" de la condition de boucle)
                if (loop_cond_id, false_branch_start_node, "") in self.edges: self.edges.remove((loop_cond_id, false_branch_start_node, ""))
                self.add_edge(loop_cond_id, false_branch_start_node, "False")
            elif not node.orelse : # Pas de orelse, l'arête "False" part de loop_cond_id vers la suite
                 # Le label "False" sera sur l'arête loop_cond_id -> (instruction suivante)
                 # Géré par visit_body si loop_cond_id est retourné.
                 # On a besoin de marquer que cette sortie est "False".
                 pass # Pour l'instant, pas de label explicite pour la sortie directe.
                
            self.loop_stack.pop()
            return list(set(loop_overall_exit_points))   
        else: # Itérable générique
            return self._visit_for_generic_iterable(node, parent_id, iterator_str)

    def _visit_for_generic_iterable(self, node: ast.For, parent_id: str, iterator_str: str) -> List[str]:
        iterable_label = ast.unparse(node.iter).replace('"', '"')
        loop_decision_label = f"For {iterator_str} in {iterable_label}"
        loop_decision_id = self.add_node(loop_decision_label, node_type="Decision")
        self.add_edge(parent_id, loop_decision_id)
        loop_overall_exit_points: List[str] = [loop_decision_id] # Sortie "Terminée/Vide"

        self.loop_stack.append((loop_decision_id, loop_decision_id, loop_decision_id))

        iteration_branch_start_node: Optional[str] = None
        if node.body:
            nodes_before_body = {nid for nid,_ in self.nodes}
            body_exit_nodes = self.visit_body(node.body, [loop_decision_id])
            nodes_after_body = {nid for nid,_ in self.nodes}
            new_nodes_in_body = sorted(list(nodes_after_body - nodes_before_body), key=lambda x: int(x.replace("node","")))
            if new_nodes_in_body:
                iteration_branch_start_node = new_nodes_in_body[0]
            for exit_node in body_exit_nodes:
                self.add_edge(exit_node, loop_decision_id)
        
        if iteration_branch_start_node:
            if (loop_decision_id, iteration_branch_start_node, "") in self.edges: self.edges.remove((loop_decision_id, iteration_branch_start_node, ""))
            self.add_edge(loop_decision_id, iteration_branch_start_node, "itération")

        # Gestion orelse (sortie "Terminée/Vide")
        terminated_branch_start_node: Optional[str] = None
        if node.orelse:
            nodes_before_orelse = {nid for nid,_ in self.nodes}
            orelse_exit_nodes = self.visit_body(node.orelse, [loop_decision_id])
            nodes_after_orelse = {nid for nid,_ in self.nodes}
            new_nodes_in_orelse = sorted(list(nodes_after_orelse - nodes_before_orelse), key=lambda x: int(x.replace("node","")))
            if new_nodes_in_orelse:
                terminated_branch_start_node = new_nodes_in_orelse[0]
            loop_overall_exit_points.extend(orelse_exit_nodes)
            if loop_decision_id in loop_overall_exit_points:
                loop_overall_exit_points.remove(loop_decision_id)
        
        if terminated_branch_start_node:
            if (loop_decision_id, terminated_branch_start_node, "") in self.edges: self.edges.remove((loop_decision_id, terminated_branch_start_node, ""))
            self.add_edge(loop_decision_id, terminated_branch_start_node, "Terminée / Vide")
        elif not node.orelse: # Pas de orelse, l'arête "Terminée / Vide" part de loop_decision_id vers la suite
            pass

        self.loop_stack.pop()
        return list(set(loop_overall_exit_points))
    
    def visit_While(self, node: ast.While, parent_id: str) -> List[str]:
        condition = ast.unparse(node.test).replace('"', '"')
        while_id = self.add_node(f"While {condition}", node_type="Decision")
        self.add_edge(parent_id, while_id)
        loop_overall_exit_points: List[str] = [while_id] # La branche "False" part de while_id

        self.loop_stack.append((while_id, while_id, while_id)) # (continue_target, break_target_is_loop_exit, retest_target)

        true_branch_start_node: Optional[str] = None
        if node.body:
            nodes_before_body = {nid for nid,_ in self.nodes}
            body_exit_nodes = self.visit_body(node.body, [while_id])
            nodes_after_body = {nid for nid,_ in self.nodes}
            new_nodes_in_body = sorted(list(nodes_after_body - nodes_before_body), key=lambda x: int(x.replace("node","")))
            if new_nodes_in_body:
                true_branch_start_node = new_nodes_in_body[0]
            for exit_node in body_exit_nodes:
                self.add_edge(exit_node, while_id)
        
        if true_branch_start_node:
            if (while_id, true_branch_start_node, "") in self.edges: self.edges.remove((while_id, true_branch_start_node, ""))
            self.add_edge(while_id, true_branch_start_node, "True")

        # Gestion orelse (sortie "False")
        false_branch_start_node: Optional[str] = None
        if node.orelse:
            nodes_before_orelse = {nid for nid,_ in self.nodes}
            orelse_exit_nodes = self.visit_body(node.orelse, [while_id])
            nodes_after_orelse = {nid for nid,_ in self.nodes}
            new_nodes_in_orelse = sorted(list(nodes_after_orelse - nodes_before_orelse), key=lambda x: int(x.replace("node","")))
            if new_nodes_in_orelse:
                false_branch_start_node = new_nodes_in_orelse[0]
            loop_overall_exit_points.extend(orelse_exit_nodes)
            if while_id in loop_overall_exit_points:
                loop_overall_exit_points.remove(while_id)
        
        if false_branch_start_node:
            if (while_id, false_branch_start_node, "") in self.edges: self.edges.remove((while_id, false_branch_start_node, ""))
            self.add_edge(while_id, false_branch_start_node, "False")
        elif not node.orelse: # Pas de orelse, l'arête "False" part de while_id vers la suite
            pass
            
        self.loop_stack.pop()
        return list(set(loop_overall_exit_points))


    def visit_Return(self, node: ast.Return, parent_id: str) -> List[str]:
        value = ast.unparse(node.value).replace('"', '"') if node.value else ""
        return_id = self.add_node(f"Return {value}", node_type="Return")
        self.add_edge(parent_id, return_id)
        return [return_id] # visit() le marquera comme terminal et retournera []

    # ... visit_Break, visit_Continue, generic_visit, visit_Assign, visit_Expr, visit_Call ...
    def visit_Break(self, node: ast.Break, parent_id: str, _current_function_end_id: Optional[str] = None) -> List[str]:
        break_id = self.add_node("Break", node_type="Jump")
        self.add_edge(parent_id, break_id)
        if self.loop_stack:
            _, loop_exit_condition_node, _ = self.loop_stack[-1]
            # Le break saute à la sortie "False" / "Terminée" de la condition de boucle.
            # Cette connexion est implicite car le chemin s'arrête et le flux reprendra
            # à partir des `loop_overall_exit_points` retournés par visit_For/While.
            # Pour une visualisation plus explicite, on pourrait connecter break_id à loop_exit_condition_node
            # avec un label "break", mais cela peut surcharger le graphe.
            # Pour l'instant, on le laisse comme un terminal simple.
            pass
        else:
            print("Warning: 'break' outside loop detected.")
        return [break_id]

    def visit_Continue(self, node: ast.Continue, parent_id: str) -> List[str]:
        continue_id = self.add_node("Continue", node_type="Jump")
        self.add_edge(parent_id, continue_id)
        if self.loop_stack:
            loop_continue_target, _, _ = self.loop_stack[-1]
            self.add_edge(continue_id, loop_continue_target)
        else:
            print("Warning: 'continue' outside loop detected.")
        return [continue_id] ## visit() le marquera comme terminal

    def generic_visit(self, node: ast.AST, parent_id: str) -> List[str]:
        try:
            label = ast.unparse(node).replace('"', '"')
            node_type = "Process"
            if isinstance(node, ast.Pass):
                label = "Pass"
            max_len = 60
            if len(label) > max_len: label = label[:max_len-3] + "..."
            node_id = self.add_node(label, node_type=node_type)
            if parent_id: self.add_edge(parent_id, node_id) # Vérifier parent_id
            return [node_id]
        except Exception as e:
            label = f"Noeud AST: {type(node).__name__}"
            print(f"Warning: Impossible de 'unparse' le noeud {label}. Erreur: {e}")
            node_id = self.add_node(label, node_type="Process")
            if parent_id: self.add_edge(parent_id, node_id)
            return [node_id]

    def visit_Assign(self, node: ast.Assign, parent_id: str) -> List[str]:
        targets = ", ".join([ast.unparse(t).replace('"', '"') for t in node.targets])
        value_str = ast.unparse(node.value).replace('"', '"')
        label = f"{targets} = {value_str}"
        node_type = "Process"
        # TODO: Réintégrer la logique de détection de type d'appel pour node_type

        max_len = 60
        if len(label) > max_len:
             short_value = value_str[:max_len - len(targets) - 6] + "..." if len(value_str) > max_len - len(targets) - 6 else value_str
             label = f"{targets} = {short_value}"
             if len(label) > max_len: label = label[:max_len-3] + "..."
        assign_id = self.add_node(label, node_type=node_type)
        self.add_edge(parent_id, assign_id)
        return [assign_id]

    def visit_Expr(self, node: ast.Expr, parent_id: str) -> List[str]:
        # MOD: appeler visit avec 2 arguments positionnels
        return self.visit(node.value, parent_id)

    def visit_Call(self, node: ast.Call, parent_id: str) -> List[str]:
        func_name_str = ast.unparse(node.func).replace('"', '"')
        args_str_val = ", ".join([ast.unparse(a).replace('"', '"') for a in node.args])
        max_arg_len = 30
        if len(args_str_val) > max_arg_len: args_str_val = args_str_val[:max_arg_len-3] + "..."
        
        label_prefix = "Appel: "
        node_type = "Process" # Par défaut

        # TODO: Logique de détection de type d'appel
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

    def to_mermaid(self) -> str: # Version simplifiée pour afficher toutes les arêtes
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
            elif node_type == "Junction": node_definitions.append(f'    {node_id}(["{safe_label}"])') # Au cas où
            elif node_type == "Return": node_definitions.append(f'    {node_id}[\\"{safe_label}"\\]')
            elif node_type == "Jump": node_definitions.append(f'    {node_id}(("{safe_label}"))')
            elif node_type == "SubroutineDeclaration": node_definitions.append(f'    {node_id}(["{safe_label}"])')
            elif node_type == "SubroutineDefinition": node_definitions.append(f'    {node_id}[/"{safe_label}"/]')
            elif node_type == "Process": node_definitions.append(f'    {node_id}["{safe_label}"]')
            else:
                print(f"Warning: Type de noeud inconnu '{node_type}' pour node_id '{node_id}'.")
                node_definitions.append(f'    {node_id}["{safe_label}"]')
        
        mermaid.extend(sorted(node_definitions))

        for from_node, to_node, label in self.edges: # Utiliser self.edges directement
            safe_edge_label = label.replace('"', '#quot;')
            if from_node not in self.node_labels or to_node not in self.node_labels:
                continue
            if safe_edge_label: edge_definitions.append(f"    {from_node} -->|{safe_edge_label}| {to_node}")
            else: edge_definitions.append(f"    {from_node} --> {to_node}")
        
        mermaid.extend(sorted(edge_definitions))
        return "\n".join(mermaid)

############### Choisir le code à tester ###############
import exemples
selected_code = exemples.bissextile2
########################################################

# --- Génération et Affichage ---
print(f"--- Code Python analysé ---")
print(selected_code)

cfg = ControlFlowGraph(selected_code)
# Lancer la visite à partir de la racine de l'AST (le module)
cfg.visit(cfg.tree, None) # Le parent initial est None
print(ast.dump(cfg.tree))
print("\n--- Mermaid Généré ---")
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