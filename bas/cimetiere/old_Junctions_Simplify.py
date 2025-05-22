import ast
from typing import List, Dict, Set, Tuple, Optional

class ControlFlowGraph:
    def __init__(self, code: str):
        self.tree = ast.parse(code)
        self.nodes: List[Tuple[str, str]] = []
        self.edges: Set[Tuple[str, str, str]] = set()
        self.node_counter = 0
        # (continue_target, break_target_is_loop_exit_cond_node, retest_target)
        self.loop_stack: List[Tuple[str, str, str]] = [] 
        self.node_labels: Dict[str, str] = {}
        self.terminal_nodes: Set[str] = set() # Nodes like Return, Break, Continue that stop normal flow
        self.node_types: Dict[str, str] = {}
        
        self._function_scope_stack: List[Set[str]] = []

    def get_node_id(self) -> str:
        self.node_counter += 1
        new_id = f"node{self.node_counter:02d}"
        if self._function_scope_stack:
            self._function_scope_stack[-1].add(new_id)
        return new_id

    def add_node(self, label: str, node_type: str = "Process") -> str:
        node_id = self.get_node_id()
        self.nodes.append((node_id, label))
        self.node_labels[node_id] = label
        self.node_types[node_id] = node_type
        return node_id

    def add_edge(self, from_node: str, to_node: str, label: str = ""):
        if not from_node or not to_node:
            return
        if from_node == to_node and not label: # Avoid self-loops without labels (often from empty branches)
            # print(f"Warning: Tentative d'ajout d'auto-arête non labellisée: {from_node} -> {to_node}")
            return
            
        # Allow Jumps (Break/Continue) and Returns to have outgoing edges if explicitly added
        # but generally, terminal nodes shouldn't sprout new generic edges.
        # connect_finals_to_end handles Return nodes specifically.
        # Break/Continue are handled by their specific visitors.
        if from_node in self.terminal_nodes and \
           self.node_types.get(from_node) not in ("Jump", "Return"): # Return needs to connect to function end
            return
            
        if from_node not in self.node_labels or to_node not in self.node_labels:
            return
        self.edges.add((from_node, to_node, label))

    def _is_terminal_ast_node(self, node: ast.AST) -> bool:
        return isinstance(node, (ast.Return, ast.Break, ast.Continue))

    def visit_body(self, body: List[ast.AST], entry_node_ids: List[str]) -> List[str]:
        """
        Visite une séquence d'instructions (un "corps").
        Gère la création de jonctions si nécessaire entre les instructions.
        Retourne une liste d'ID de nœuds qui sont les points de sortie de ce corps.
        """
        active_ids_for_current_statement = list(set(entry_node_ids))

        for i, stmt in enumerate(body):
            if not active_ids_for_current_statement: # Plus de chemins actifs
                break
            
            # Points d'entrée pour l'instruction courante (filtrer les terminaux)
            current_stmt_entry_points = [pid for pid in active_ids_for_current_statement 
                                         if pid not in self.terminal_nodes]
            
            if not current_stmt_entry_points:
                 active_ids_for_current_statement = [] # Tous les chemins étaient terminaux
                 break

            # Collecter les points de sortie de l'instruction courante, pour tous les chemins d'entrée
            exits_from_current_stmt_all_paths: List[str] = []
            for parent_id in current_stmt_entry_points:
                # visit() retourne les ID des nœuds de sortie de stmt pour ce parent_id
                exit_nodes_from_stmt_path = self.visit(stmt, parent_id)
                exits_from_current_stmt_all_paths.extend(exit_nodes_from_stmt_path)
            
            # Les points de sortie de l'instruction courante deviennent les points d'entrée potentiels pour la suivante
            # (ou les points de sortie finaux du corps si c'est la dernière instruction)
            active_ids_for_current_statement = list(set(exits_from_current_stmt_all_paths))

            # Logique de Jonction:
            # Si ce n'est PAS la dernière instruction et que l'instruction courante a produit
            # PLUSIEURS points de sortie non-terminaux, nous les fusionnons avec un nœud de jonction.
            is_last_statement = (i == len(body) - 1)
            non_terminal_active_ids = [pid for pid in active_ids_for_current_statement 
                                       if pid not in self.terminal_nodes]

            if not is_last_statement and len(non_terminal_active_ids) > 1:
                # Créer un seul nœud de jonction
                junction_id = self.add_node("Junction", node_type="Junction")
                for pid in non_terminal_active_ids:
                    self.add_edge(pid, junction_id)
                
                # Le nœud de jonction devient le seul point d'entrée non-terminal pour la prochaine instruction.
                # On conserve les points terminaux s'il y en avait (bien que ce soit rare à ce stade).
                terminal_active_ids = [pid for pid in active_ids_for_current_statement if pid in self.terminal_nodes]
                active_ids_for_current_statement = [junction_id] + terminal_active_ids
        
        # Retourne tous les points de sortie actifs (terminaux ou non) du corps
        return active_ids_for_current_statement


    def visit(self, node: ast.AST, parent_id: Optional[str]) -> List[str]:
        method_name = f'visit_{type(node).__name__}'
        visitor = getattr(self, method_name, self.generic_visit)
        
        if parent_id is None and not isinstance(node, (ast.Module, ast.FunctionDef)):
            # print(f"Critical Warning: visit() appelé avec parent_id=None pour noeud {type(node).__name__}")
            return []

        exit_nodes: List[str] = visitor(node, parent_id)

        # Si le nœud AST lui-même est terminal (Return, Break, Continue),
        # alors les nœuds CFG qu'il a créés sont marqués comme terminaux.
        # visit() retournera alors [] pour indiquer qu'il n'y a pas de continuation de flux normale.
        if self._is_terminal_ast_node(node): 
            for node_id in exit_nodes: # Normalement un seul nœud créé par R/B/C
                self.terminal_nodes.add(node_id)
            return [] # Pas de continuation de flux normale depuis un nœud terminal AST
        
        return exit_nodes # Retourne les points de sortie pour le flux normal

    def connect_finals_to_end(self, target_end_id: str, scope_node_ids: Optional[Set[str]] = None):
        """
        Connecte les nœuds sans arête sortante (dans la portée donnée) au target_end_id.
        Spécialement pour les fins de chemin implicites et les nœuds Return.
        """
        source_nodes_with_outgoing_edges = set(from_node for from_node, _, _ in self.edges)
        
        nodes_to_check = scope_node_ids if scope_node_ids is not None else set(self.node_labels.keys())

        for node_id in list(nodes_to_check): # Itérer sur une copie
            if node_id not in self.node_labels: continue # Nœud potentiellement supprimé (logique future)
            if node_id == target_end_id: continue

            is_return_node = self.node_types.get(node_id) == "Return"
            
            # Si un nœud est un 'Return', il DOIT être connecté au 'End' de sa fonction.
            # S'il est dans terminal_nodes mais n'est PAS un 'Return' (ex: Break, Continue),
            # ses sauts sont déjà gérés, donc on ne le connecte pas au 'End' général.
            if node_id in self.terminal_nodes and not is_return_node:
                continue
            
            # Si le nœud n'a pas d'arête sortante, OU s'il est un 'Return' (qui peut avoir une arête
            # vers lui-même si on le considère terminal, mais doit quand même se connecter au End),
            # alors on le connecte.
            if node_id not in source_nodes_with_outgoing_edges or is_return_node:
                self.add_edge(node_id, target_end_id)


    def visit_Module(self, node: ast.Module, parent_id: Optional[str] = None) -> List[str]:
        start_id = self.add_node("Start", node_type="StartEnd")
        
        function_defs = [n for n in node.body if isinstance(n, ast.FunctionDef)]
        other_statements = [n for n in node.body if not isinstance(n, ast.FunctionDef)]

        # 1. Visiter les définitions de fonctions.
        #    Elles créent leurs propres sous-graphes et ne sont pas dans le flux principal du module.
        #    Leur 'parent_id' est None car elles sont au niveau du module.
        for func_def_node in function_defs:
            self.visit(func_def_node, None) 

        # 2. Visiter les autres instructions pour le flux principal du module.
        #    Commence à partir du nœud 'Start' du module.
        module_flow_exits = self.visit_body(other_statements, [start_id])
        
        module_end_id = self.add_node("End", node_type="StartEnd")

        # 3. Connecter les sorties normales du flux principal au nœud 'End' du module.
        for node_id in module_flow_exits:
            if node_id not in self.terminal_nodes: # Ne pas connecter si c'est déjà un break/continue global
                self.add_edge(node_id, module_end_id)
        
        # 4. Connecter les fins implicites et les 'Return' globaux (rare, mais possible) au 'End' du module.
        #    On ne spécifie pas de scope_node_ids pour cibler les nœuds globaux du module.
        #    Les nœuds de fonction sont gérés par leur propre connect_finals_to_end.
        global_scope_ids = set(self.node_labels.keys())
        for func_scope in self._function_scope_stack: # Exclure les nœuds de fonction
            global_scope_ids -= func_scope
        self.connect_finals_to_end(module_end_id, scope_node_ids=global_scope_ids) 

        return [] # Le module lui-même n'a pas de "sortie" vers un parent

    def visit_FunctionDef(self, node: ast.FunctionDef, parent_id: Optional[str]) -> List[str]:
        # 1. Nœud de déclaration dans le flux parent (s'il y en a un, ex: fonction imbriquée)
        func_decl_label = f"Déclaration: {node.name}(...)"
        func_decl_id = self.add_node(func_decl_label, node_type="SubroutineDeclaration")

        # Si la fonction est définie dans un autre flux (ex: module ou autre fonction),
        # on connecte le parent à ce nœud de déclaration.
        # Ce nœud de déclaration est le point de continuation du flux parent.
        parent_flow_continuation = []
        if parent_id:
            self.add_edge(parent_id, func_decl_id)
            parent_flow_continuation = [func_decl_id]

        # 2. Gérer la portée pour les nœuds internes à cette fonction
        self._function_scope_stack.append(set()) # Nouvelle portée
        # Ajouter func_decl_id à la portée de la fonction parente, pas la nouvelle.
        # get_node_id s'en charge si _function_scope_stack n'est pas vide.
        # Si c'est une fonction top-level, func_decl_id n'appartient à aucune portée de fonction.
        # Pour être sûr, si on vient de push une nouvelle portée, on l'enlève de celle-ci
        # et on l'ajoute à la précédente (si elle existe).
        if len(self._function_scope_stack) > 1: # On est dans une fonction imbriquée
            if func_decl_id in self._function_scope_stack[-1]:
                 self._function_scope_stack[-1].remove(func_decl_id)
            self._function_scope_stack[-2].add(func_decl_id)


        # 3. Créer Start et End pour le *corps* de la fonction (sous-graphe)
        func_body_start_id = self.add_node(f"Start {node.name}", node_type="StartEnd")
        # S'assurer que func_body_start_id est dans la portée actuelle
        if self._function_scope_stack and func_body_start_id not in self._function_scope_stack[-1]:
             self._function_scope_stack[-1].add(func_body_start_id)

        func_body_end_id = self.add_node(f"End {node.name}", node_type="StartEnd")
        if self._function_scope_stack and func_body_end_id not in self._function_scope_stack[-1]:
             self._function_scope_stack[-1].add(func_body_end_id)


        # 4. Visiter le corps de la fonction
        #    Les sorties normales du corps (non-Return)
        body_normal_exit_nodes = self.visit_body(node.body, [func_body_start_id])

        # 5. Connecter les sorties normales du corps au nœud End de la fonction
        for node_id in body_normal_exit_nodes:
            if node_id not in self.terminal_nodes: # Ne pas connecter si c'est un break/continue dans la fonction
                self.add_edge(node_id, func_body_end_id)

        # 6. Connecter tous les 'Return' et fins de chemin implicites DANS CETTE FONCTION
        #    à son propre func_body_end_id. Utiliser la portée actuelle.
        current_function_scope_ids = self._function_scope_stack[-1]
        self.connect_finals_to_end(func_body_end_id, scope_node_ids=current_function_scope_ids)

        # 7. Restaurer la portée de fonction précédente
        self._function_scope_stack.pop()

        # 8. Retourner le nœud de déclaration pour que le flux parent continue (si applicable)
        return parent_flow_continuation


    def visit_If(self, node: ast.If, parent_id: str) -> List[str]:
        condition = ast.unparse(node.test).replace('"', '"')
        if_id = self.add_node(f"{condition}", node_type="Decision")
        self.add_edge(parent_id, if_id)

        # Points de sortie finaux de la structure If globale (après la fusion potentielle des branches)
        final_exit_nodes_after_if: List[str] = []
        
        true_branch_start_node: Optional[str] = None
        false_branch_start_node: Optional[str] = None

        # --- Branche True ---
        if node.body:
            # Pour identifier le premier nœud de la branche, on capture l'état avant/après
            nodes_before_true_branch = set(n_id for n_id, _ in self.nodes)
            true_branch_exits = self.visit_body(node.body, [if_id]) # visit_body gère les jonctions internes à la branche
            nodes_after_true_branch = set(n_id for n_id, _ in self.nodes)
            new_nodes_in_true_branch = sorted(list(nodes_after_true_branch - nodes_before_true_branch), 
                                              key=lambda x: int(x.replace("node","")))
            if new_nodes_in_true_branch:
                true_branch_start_node = new_nodes_in_true_branch[0]
            
            final_exit_nodes_after_if.extend(true_branch_exits)
        else: # Branche True vide
            # Si la branche True est vide, le flux continue directement depuis if_id avec la condition True
            final_exit_nodes_after_if.append(if_id) 

        # --- Branche False (orelse) ---
        if node.orelse:
            nodes_before_false_branch = set(n_id for n_id, _ in self.nodes)
            false_branch_exits = self.visit_body(node.orelse, [if_id]) # visit_body pour orelse
            nodes_after_false_branch = set(n_id for n_id, _ in self.nodes)
            new_nodes_in_false_branch = sorted(list(nodes_after_false_branch - nodes_before_false_branch),
                                               key=lambda x: int(x.replace("node","")))
            if new_nodes_in_false_branch:
                false_branch_start_node = new_nodes_in_false_branch[0]

            final_exit_nodes_after_if.extend(false_branch_exits)
        else: # Branche False vide
            # Si la branche False est vide, le flux continue directement depuis if_id avec la condition False
            final_exit_nodes_after_if.append(if_id)

        # Labellisation des arêtes sortantes du nœud 'if_id'
        # Si une branche a créé des nœuds, l'arête de if_id vers le premier nœud de cette branche
        # a été ajoutée par visit_body (via le premier self.visit(stmt, if_id)).
        # Nous la supprimons pour la recréer avec le bon label "True" ou "False".

        if true_branch_start_node: # La branche True a du contenu
            # L'arête (if_id, true_branch_start_node, "") a été créée par le premier appel à visit() dans visit_body
            if (if_id, true_branch_start_node, "") in self.edges:
                self.edges.remove((if_id, true_branch_start_node, ""))
            self.add_edge(if_id, true_branch_start_node, "True")
        elif not node.body: # Branche True vide, if_id est une sortie pour "True"
            # Si on veut étiqueter l'arête qui sort de if_id quand la branche est vide,
            # il faudrait un nœud "Pass" ou un mécanisme plus complexe.
            # Pour l'instant, si la branche est vide, if_id lui-même est un point de sortie.
            # Le label "True" sera sur l'arête if_id -> (jonction ou instruction suivante)
            # Ceci est géré par le fait que if_id est dans final_exit_nodes_after_if.
            # Si une jonction est créée après le if, elle aura une entrée de if_id.
            # On pourrait essayer d'ajouter le label à cette arête plus tard, mais c'est complexe.
            pass


        if false_branch_start_node: # La branche False a du contenu
            if (if_id, false_branch_start_node, "") in self.edges:
                self.edges.remove((if_id, false_branch_start_node, ""))
            self.add_edge(if_id, false_branch_start_node, "False")
        elif not node.orelse: # Branche False vide
            pass # Idem que pour la branche True vide.

        # Retourner les points de sortie uniques. visit_body s'occupera de les fusionner si nécessaire.
        return list(set(final_exit_nodes_after_if))


    def visit_For(self, node: ast.For, parent_id: str) -> List[str]: # current_function_end_id enlevé
        iterator_str = ast.unparse(node.target).replace('"', '"')
        iterable_node = node.iter
        
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
            else: 
                return self._visit_for_generic_iterable(node, parent_id, iterator_str)

            init_label = f"{iterator_str} = {start_val_str}"
            init_node_id = self.add_node(init_label, node_type="Process")
            self.add_edge(parent_id, init_node_id)

            condition_op = "<"
            try:
                # Essayer d'évaluer le pas pour déterminer l'opérateur de condition
                # Ceci est une heuristique et peut échouer pour des pas complexes
                temp_step_for_eval = step_val_str.replace('#quot;', '') # Enlever les quotes pour eval
                if temp_step_for_eval: # S'assurer qu'il y a quelque chose à évaluer
                    # Utiliser ast.literal_eval pour une évaluation sûre
                    evaluated_step = ast.literal_eval(temp_step_for_eval)
                    if isinstance(evaluated_step, (int, float)) and evaluated_step < 0:
                        condition_op = ">" # Ou ">=" si on veut inclure la borne pour un pas négatif
            except (ValueError, SyntaxError):
                pass # Garder "<" par défaut si l'évaluation échoue

            loop_cond_label = f"{iterator_str} {condition_op} {stop_val_str}"
            loop_cond_id = self.add_node(loop_cond_label, node_type="Decision")
            self.add_edge(init_node_id, loop_cond_id)

            # La branche "False" (terminaison normale de la boucle) est un point de sortie global.
            # Elle part de loop_cond_id.
            loop_overall_exit_points.append(loop_cond_id) 

            increment_label = f"{iterator_str} = {iterator_str} + {step_val_str}"
            increment_node_id = self.add_node(increment_label, node_type="Process")
            
            # break_target est loop_cond_id (la sortie "False" de la condition)
            # continue_target est increment_node_id
            # retest_target est loop_cond_id (après l'incrément)
            self.loop_stack.append((increment_node_id, loop_cond_id, loop_cond_id)) 

            true_branch_start_node: Optional[str] = None
            if node.body:
                nodes_before_body = {n_id for n_id, _ in self.nodes}
                # Le corps de la boucle commence à partir de la condition "True"
                body_exit_nodes = self.visit_body(node.body, [loop_cond_id])
                nodes_after_body = {nid for nid,_ in self.nodes}
                new_nodes_in_body = sorted(list(nodes_after_body - nodes_before_body), key=lambda x: int(x.replace("node","")))
                if new_nodes_in_body:
                    true_branch_start_node = new_nodes_in_body[0]
                
                # Les sorties normales du corps mènent à l'incrémentation
                for exit_node in body_exit_nodes:
                    if exit_node not in self.terminal_nodes: # Ne pas connecter si c'est un break/continue
                        self.add_edge(exit_node, increment_node_id)

            if true_branch_start_node: 
                if (loop_cond_id, true_branch_start_node, "") in self.edges: 
                    self.edges.remove((loop_cond_id, true_branch_start_node, ""))
                self.add_edge(loop_cond_id, true_branch_start_node, "True")
            elif not node.body: # Corps vide, la branche "True" va directement à l'incrément
                self.add_edge(loop_cond_id, increment_node_id, "True")

            self.add_edge(increment_node_id, loop_cond_id) # Retour à la condition après incrément
            
            # Gérer orelse
            # La clause 'orelse' d'une boucle for s'exécute si la boucle se termine normalement
            # (c'est-à-dire, pas par un 'break'). Elle suit la condition "False".
            false_branch_start_node: Optional[str] = None # Pour le label "False"
            if node.orelse:
                # Si orelse existe, loop_cond_id (sortie False) ne va pas directement à la suite,
                # mais au début de orelse.
                if loop_cond_id in loop_overall_exit_points:
                    loop_overall_exit_points.remove(loop_cond_id)

                nodes_before_orelse = {nid for nid,_ in self.nodes}
                # orelse_exit_nodes sont les sorties de la branche orelse
                orelse_exit_nodes = self.visit_body(node.orelse, [loop_cond_id]) 
                nodes_after_orelse = {nid for nid,_ in self.nodes}
                new_nodes_in_orelse = sorted(list(nodes_after_orelse - nodes_before_orelse), key=lambda x: int(x.replace("node","")))
                if new_nodes_in_orelse:
                    false_branch_start_node = new_nodes_in_orelse[0]
                
                loop_overall_exit_points.extend(orelse_exit_nodes)
            
            if false_branch_start_node: 
                if (loop_cond_id, false_branch_start_node, "") in self.edges: 
                    self.edges.remove((loop_cond_id, false_branch_start_node, ""))
                self.add_edge(loop_cond_id, false_branch_start_node, "False")
            elif not node.orelse : 
                # Pas de orelse, l'arête "False" part de loop_cond_id vers la suite.
                # Le label "False" sera sur l'arête loop_cond_id -> (jonction ou instruction suivante)
                # Ceci est géré par le fait que loop_cond_id est dans loop_overall_exit_points.
                pass
                
            self.loop_stack.pop()
            return list(set(loop_overall_exit_points))   
        else: 
            return self._visit_for_generic_iterable(node, parent_id, iterator_str)

    def _visit_for_generic_iterable(self, node: ast.For, parent_id: str, iterator_str: str) -> List[str]:
        iterable_label = ast.unparse(node.iter).replace('"', '"')
        loop_decision_label = f"For {iterator_str} in {iterable_label}"
        loop_decision_id = self.add_node(loop_decision_label, node_type="Decision")
        self.add_edge(parent_id, loop_decision_id)
        
        loop_overall_exit_points: List[str] = [loop_decision_id] # Sortie "Terminée/Vide"

        # Pour for générique: continue et retest vont au nœud de décision.
        # Break va aussi à la sortie "Terminée/Vide" de ce nœud.
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
                if exit_node not in self.terminal_nodes:
                    self.add_edge(exit_node, loop_decision_id) # Retour au test
        
        if iteration_branch_start_node:
            if (loop_decision_id, iteration_branch_start_node, "") in self.edges: 
                self.edges.remove((loop_decision_id, iteration_branch_start_node, ""))
            self.add_edge(loop_decision_id, iteration_branch_start_node, "itération")
        elif not node.body: # Corps vide, branche "itération" revient directement au test
             self.add_edge(loop_decision_id, loop_decision_id, "itération")


        terminated_branch_start_node: Optional[str] = None
        if node.orelse:
            if loop_decision_id in loop_overall_exit_points:
                loop_overall_exit_points.remove(loop_decision_id)
            
            nodes_before_orelse = {nid for nid,_ in self.nodes}
            orelse_exit_nodes = self.visit_body(node.orelse, [loop_decision_id])
            nodes_after_orelse = {nid for nid,_ in self.nodes}
            new_nodes_in_orelse = sorted(list(nodes_after_orelse - nodes_before_orelse), key=lambda x: int(x.replace("node","")))
            if new_nodes_in_orelse:
                terminated_branch_start_node = new_nodes_in_orelse[0]
            loop_overall_exit_points.extend(orelse_exit_nodes)
        
        if terminated_branch_start_node:
            if (loop_decision_id, terminated_branch_start_node, "") in self.edges: 
                self.edges.remove((loop_decision_id, terminated_branch_start_node, ""))
            self.add_edge(loop_decision_id, terminated_branch_start_node, "Terminée / Vide")
        elif not node.orelse:
            pass # L'arête "Terminée / Vide" sera implicite via loop_overall_exit_points

        self.loop_stack.pop()
        return list(set(loop_overall_exit_points))
    
    def visit_While(self, node: ast.While, parent_id: str) -> List[str]: # current_function_end_id enlevé
        condition = ast.unparse(node.test).replace('"', '"')
        while_id = self.add_node(f"While {condition}", node_type="Decision")
        self.add_edge(parent_id, while_id)
        
        # La branche "False" (terminaison normale) part de while_id
        loop_overall_exit_points: List[str] = [while_id] 

        # break_target est while_id (sortie "False")
        # continue_target et retest_target sont while_id (re-tester la condition)
        self.loop_stack.append((while_id, while_id, while_id))

        true_branch_start_node: Optional[str] = None
        if node.body:
            nodes_before_body = {nid for nid,_ in self.nodes}
            body_exit_nodes = self.visit_body(node.body, [while_id]) # Corps part de la condition "True"
            nodes_after_body = {nid for nid,_ in self.nodes}
            new_nodes_in_body = sorted(list(nodes_after_body - nodes_before_body), key=lambda x: int(x.replace("node","")))
            if new_nodes_in_body:
                true_branch_start_node = new_nodes_in_body[0]
            
            for exit_node in body_exit_nodes:
                if exit_node not in self.terminal_nodes:
                    self.add_edge(exit_node, while_id) # Retour au test
        
        if true_branch_start_node:
            if (while_id, true_branch_start_node, "") in self.edges: 
                self.edges.remove((while_id, true_branch_start_node, ""))
            self.add_edge(while_id, true_branch_start_node, "True")
        elif not node.body: # Corps vide, "True" revient directement au test
            self.add_edge(while_id, while_id, "True")


        false_branch_start_node: Optional[str] = None
        if node.orelse:
            if while_id in loop_overall_exit_points:
                loop_overall_exit_points.remove(while_id) # orelse remplace la sortie directe
            
            nodes_before_orelse = {nid for nid,_ in self.nodes}
            orelse_exit_nodes = self.visit_body(node.orelse, [while_id]) # orelse part de la condition "False"
            nodes_after_orelse = {nid for nid,_ in self.nodes}
            new_nodes_in_orelse = sorted(list(nodes_after_orelse - nodes_before_orelse), key=lambda x: int(x.replace("node","")))
            if new_nodes_in_orelse:
                false_branch_start_node = new_nodes_in_orelse[0]
            loop_overall_exit_points.extend(orelse_exit_nodes)
        
        if false_branch_start_node:
            if (while_id, false_branch_start_node, "") in self.edges: 
                self.edges.remove((while_id, false_branch_start_node, ""))
            self.add_edge(while_id, false_branch_start_node, "False")
        elif not node.orelse:
            pass # L'arête "False" sera implicite via loop_overall_exit_points
            
        self.loop_stack.pop()
        return list(set(loop_overall_exit_points))


    def visit_Return(self, node: ast.Return, parent_id: str) -> List[str]:
        value = ast.unparse(node.value).replace('"', '"') if node.value else ""
        return_id = self.add_node(f"Return {value}", node_type="Return")
        self.add_edge(parent_id, return_id)
        # visit() marquera return_id comme terminal et retournera []
        return [return_id] 

    def visit_Break(self, node: ast.Break, parent_id: str) -> List[str]: # _current_function_end_id enlevé
        break_id = self.add_node("Break", node_type="Jump")
        self.add_edge(parent_id, break_id)
        if self.loop_stack:
            _, loop_exit_target, _ = self.loop_stack[-1]
            # Un 'break' saute à la sortie normale de la boucle (souvent la condition de la boucle elle-même,
            # d'où partira l'arête "False" ou "Terminée").
            # On pourrait ajouter une arête explicite de break_id vers loop_exit_target avec un label "break",
            # mais cela peut surcharger. Le fait que break_id soit terminal et que loop_exit_target
            # soit un point de sortie de la boucle suffit généralement.
            # Pour l'instant, on ne crée pas d'arête explicite pour le saut du break.
            # Le fait que break_id soit dans self.terminal_nodes empêchera visit_body de le connecter.
            # La logique de `connect_finals_to_end` ne le connectera pas non plus.
            # Le flux reprendra à partir des `loop_overall_exit_points` retournés par visit_For/While.
            # Pour une visualisation plus claire du saut, on pourrait faire :
            # self.add_edge(break_id, loop_exit_target, "break") # Optionnel
            pass
        else:
            # print("Warning: 'break' outside loop detected.")
            pass # AST validation should catch this, but good to be aware
        # visit() marquera break_id comme terminal et retournera []
        return [break_id]

    def visit_Continue(self, node: ast.Continue, parent_id: str) -> List[str]: # _current_function_end_id enlevé
        continue_id = self.add_node("Continue", node_type="Jump")
        self.add_edge(parent_id, continue_id)
        if self.loop_stack:
            loop_continue_target, _, _ = self.loop_stack[-1]
            self.add_edge(continue_id, loop_continue_target) # Explicitement connecter à la cible du continue
        else:
            # print("Warning: 'continue' outside loop detected.")
            pass
        # visit() marquera continue_id comme terminal et retournera []
        return [continue_id]

    def generic_visit(self, node: ast.AST, parent_id: str) -> List[str]:
        try:
            label = ast.unparse(node).replace('"', '"')
            node_type = "Process"
            if isinstance(node, ast.Pass):
                label = "Pass"
            max_len = 60 # Augmenté un peu pour plus de clarté
            if len(label) > max_len: label = label[:max_len-3] + "..."
            
            node_id = self.add_node(label, node_type=node_type)
            if parent_id: self.add_edge(parent_id, node_id)
            return [node_id]
        except Exception: # e
            label = f"Noeud AST: {type(node).__name__}"
            # print(f"Warning: Impossible de 'unparse' le noeud {label}. Erreur: {e}")
            node_id = self.add_node(label, node_type="Process")
            if parent_id: self.add_edge(parent_id, node_id)
            return [node_id]

    def visit_Assign(self, node: ast.Assign, parent_id: str) -> List[str]:
        targets_str = ", ".join([ast.unparse(t).replace('"', '"') for t in node.targets])
        value_str = ast.unparse(node.value).replace('"', '"')
        
        label = f"{targets_str} = {value_str}"
        node_type = "Process"

        max_len = 60
        if len(label) > max_len:
             # Tenter de raccourcir la partie droite (value) en premier
             available_len_for_value = max_len - len(targets_str) - 6 # " = ..."
             if available_len_for_value > 10 : # Assez de place pour une valeur raccourcie significative
                 short_value = value_str[:available_len_for_value] + "..." if len(value_str) > available_len_for_value else value_str
                 label = f"{targets_str} = {short_value}"
             else: # Sinon, raccourcir le tout
                 label = label[:max_len-3] + "..."
        
        assign_id = self.add_node(label, node_type=node_type)
        self.add_edge(parent_id, assign_id)
        return [assign_id]

    def visit_Expr(self, node: ast.Expr, parent_id: str) -> List[str]:
        # Une instruction Expr contient une valeur qui est évaluée.
        # Souvent un appel de fonction (print(), custom_func()) ou une expression seule.
        # On visite la valeur interne.
        return self.visit(node.value, parent_id)

    def visit_Call(self, node: ast.Call, parent_id: str) -> List[str]:
        func_name_str = ast.unparse(node.func).replace('"', '#quot;') # Sécuriser le nom de la fonction aussi
        
        # Sécuriser les arguments positionnels
        args_list = [ast.unparse(a).replace('"', '#quot;') for a in node.args]
        
        # Sécuriser les arguments nommés (keywords)
        double_quote_char = '"' 
        kwargs_list = [
        # Utiliser la variable dans le replace
        f'{k.arg}={ast.unparse(k.value).replace(double_quote_char, "#quot;")}'
        for k in node.keywords
        ]
        all_args_str = ", ".join(args_list + kwargs_list)
        
        max_arg_len = 30 # Longueur max pour la chaîne des arguments
        if len(all_args_str) > max_arg_len: 
            all_args_str = all_args_str[:max_arg_len-3] + "..."
        
        label_prefix = "Appel: "
        node_type = "Process" 

        if func_name_str in ["print", "input"]:
            node_type = "IoOperation"
            label_prefix = "" 

        label = f"{label_prefix}{func_name_str}({all_args_str})"

        call_id = self.add_node(label, node_type=node_type)
        self.add_edge(parent_id, call_id)
        return [call_id]

    def _simplify_junctions(self) -> Tuple[List[Tuple[str, str]], Set[Tuple[str, str, str]]]:
        """
        Simplifie les jonctions triviales (1 entrée, 1 sortie) pour un rendu Mermaid plus propre.
        Ne modifie pas self.nodes/self.edges directement, mais retourne des versions simplifiées.
        L'intention était de nettoyer les chaînes linéaires de jonctions intermédiaires superflues, 
        par exemple A -> J1 -> J2 -> J3 -> B deviendrait A -> B si J1, J2, J3 sont triviales (et déjà créées évidemment)
        Attention: cette simplification peut ne pas couvrir tous les cas complexes ou les jonctions qui sont des cibles de sauts (continue/break).
        Pour l'instant, on ne simplifie pas les jonctions cibles de 'continue'.
        """
        simplified_nodes = []
        simplified_edges = set()
        
        # Identifier les jonctions à potentiellement supprimer/court-circuiter
        junction_map: Dict[str, str] = {} # junction_id -> son unique successeur
        nodes_to_keep = set(n_id for n_id, _ in self.nodes)

        # Cibles de 'continue' ne doivent pas être simplifiées si elles sont des jonctions
        continue_targets = set()
        # loop_stack: (continue_target, break_target, retest_target)
        # On ne peut pas accéder à loop_stack ici car il est temporaire pendant la visite.
        # On pourrait stocker les cibles de continue si nécessaire, ou simplement être prudent.
        # Pour l'instant, une jonction est simplifiée si elle a 1 entrée / 1 sortie.

        # Première passe: identifier les jonctions triviales
        for j_id, _ in self.nodes:
            if self.node_types.get(j_id) == "Junction":
                incoming_edges = [edge for edge in self.edges if edge[1] == j_id]
                outgoing_edges = [edge for edge in self.edges if edge[0] == j_id]

                if len(incoming_edges) == 1 and len(outgoing_edges) == 1:
                    # Vérifier que la jonction n'est pas une cible de continue (difficile sans info)
                    # ou qu'elle ne boucle pas sur elle-même (ex: jonction après un if vide dans une boucle)
                    pred_node = incoming_edges[0][0]
                    succ_node = outgoing_edges[0][1]
                    if pred_node != j_id and succ_node != j_id : # Pas une boucle sur elle-même
                        # Marquer pour suppression et redirection
                        junction_map[j_id] = succ_node 
                        nodes_to_keep.remove(j_id)


        # Deuxième passe: construire les listes simplifiées
        for node_id, label in self.nodes:
            if node_id in nodes_to_keep:
                simplified_nodes.append((node_id, label))

        for from_n, to_n, edge_label in self.edges:
            # Rediriger 'from_n' si c'est une jonction simplifiée (ne devrait pas arriver si from_n est supprimé)
            # Rediriger 'to_n' si c'est une jonction simplifiée
            
            current_from = from_n
            current_to = to_n

            # Si la destination est une jonction mappée, sauter vers sa cible
            # Répéter au cas où plusieurs jonctions triviales se suivent
            while current_to in junction_map:
                current_to = junction_map[current_to]
            
            # Si la source est une jonction mappée (ne devrait pas être nécessaire si on ne les ajoute pas)
            # while current_from in junction_map:
            #    current_from = junction_map[current_from]


            if current_from in nodes_to_keep and current_to in nodes_to_keep:
                # Éviter d'ajouter une arête si elle mène à une jonction qui a été retirée
                # et que cette arête était la seule entrée de cette jonction.
                # La logique ci-dessus avec current_to devrait gérer ça.
                if from_n != current_from or to_n != current_to: # Si une redirection a eu lieu
                    # Conserver le label de l'arête originale menant à la jonction (si pertinent)
                    # ou de l'arête sortant de la jonction. Typiquement, les arêtes vers/depuis jonction sont non labellisées.
                    pass # Utiliser edge_label original pour l'instant

                # Éviter les auto-boucles créées par la simplification, sauf si labellisées
                if current_from == current_to and not edge_label:
                    continue
                
                simplified_edges.add((current_from, current_to, edge_label))
            # Si from_n est une jonction supprimée, son arête entrante sera redirigée.
            # Si to_n est une jonction supprimée, l'arête actuelle ne sera pas ajoutée.

        return simplified_nodes, simplified_edges


    def to_mermaid(self) -> str:
        # Optionnel: simplifier les jonctions avant de générer Mermaid
        # Pour l'instant, on affiche toutes les jonctions pour voir leur comportement.
        # Pour activer la simplification :
        # display_nodes, display_edges = self._simplify_junctions()
        # Sinon :
        display_nodes = self.nodes
        display_edges = self.edges
        
        mermaid = ["graph TD"]
        # idées de styles optionnel
        '''mermaid.extend([
            "    classDef StartEnd fill:#9f9,stroke:#333,stroke-width:2px;",
            "    classDef Decision fill:#bbf,stroke:#333,stroke-width:2px;",
            "    classDef Process fill:#fc9,stroke:#333,stroke-width:2px;",
            "    classDef IoOperation fill:#9cf,stroke:#333,stroke-width:2px;",
            "    classDef Junction fill:#ccc,stroke:#333,stroke-width:1px,rx:20,ry:20;", # Cercle pour jonction
            "    classDef Return fill:#f99,stroke:#333,stroke-width:2px;",
            "    classDef Jump fill:#f9f,stroke:#333,stroke-width:2px;",
            "    classDef SubroutineDeclaration fill:#ddd,stroke:#333,stroke-width:2px,stroke-dasharray: 5 5;"
        ])'''

        node_definitions = []
        node_styles = []

        processed_node_ids = set() # Pour éviter les doublons si simplify_junctions n'est pas parfait

        for node_id, label in display_nodes:
            if node_id in processed_node_ids: continue
            processed_node_ids.add(node_id)

            safe_label = label.replace('"', '#quot;').replace('\n', '<br/>') # Gérer les retours à la ligne
            node_type = self.node_types.get(node_id, "Process")

            shape_open = "["
            shape_close = "]"

            if node_type == "StartEnd": shape_open, shape_close = "((", "))" # Stade
            elif node_type == "Decision": shape_open, shape_close = "{", "}" # Losange
            elif node_type == "Junction": 
                if not safe_label or safe_label == "Junction": # Jonction sans label ou avec "Junction"
                    shape_open, shape_close = "((", "))" # Petit cercle
                    safe_label = "." # Rendre la jonction petite et sans texte
                else: # Jonction avec un label spécifique (rare)
                    shape_open, shape_close = "(", ")" # Ovale
            elif node_type == "Return": shape_open, shape_close = "[/", "\\]" # Parallélogramme incliné (approximatif)
            elif node_type == "Jump": shape_open, shape_close = "((", "))" # Stade (comme StartEnd)
            elif node_type == "SubroutineDeclaration": shape_open, shape_close = "([", "])" # Rectangle avec doubles bords
            # elif node_type == "SubroutineDefinition": shape_open, shape_close = "[/", "/]" # Non utilisé actuellement
            elif node_type == "IoOperation": shape_open, shape_close = "[/", "\\]" # Parallélogramme pour I/O
            # Process est le défaut (rectangle)

            node_definitions.append(f'    {node_id}{shape_open}"{safe_label}"{shape_close}')
            node_styles.append(f'    class {node_id} {node_type};')
        
        mermaid.extend(sorted(list(set(node_definitions)))) # set pour dédupliquer si besoin
        mermaid.extend(sorted(list(set(node_styles))))


        edge_definitions = []
        for from_node, to_node, label in display_edges:
            safe_edge_label = label.replace('"', '#quot;')
            # Vérifier que les nœuds existent toujours (surtout si simplification activée)
            if not any(n[0] == from_node for n in display_nodes) or \
               not any(n[0] == to_node for n in display_nodes):
                continue

            if safe_edge_label: 
                edge_definitions.append(f"    {from_node} -->|{safe_edge_label}| {to_node}")
            else: 
                edge_definitions.append(f"    {from_node} --> {to_node}")
        
        mermaid.extend(sorted(list(set(edge_definitions)))) # set pour dédupliquer
        return "\n".join(mermaid)

############### Choisir le code à tester ###############
import exemples
selected_code = exemples.defif2
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