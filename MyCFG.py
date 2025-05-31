import ast
from typing import List, Dict, Set, Tuple, Optional

class ControlFlowGraph:
    def __init__(self, code: str):
        self.tree = ast.parse(code)
        self.nodes: List[Tuple[str, str]] = [] # Liste des tuples (node_id, label)
        self.edges: Set[Tuple[str, str, str]] = set() # Ensemble des tuples (from_node, to_node, label)
        self.node_counter = 0 # Compteur pour générer des ID de nœuds uniques
        
        # Pile pour gérer les cibles de 'continue', 'break' et de re-test pour les boucles imbriquées
        # Chaque élément est un tuple: (continue_target, break_target_is_loop_exit_cond_node, retest_target)
        self.loop_stack: List[Tuple[str, str, str]] = [] 
        
        self.node_labels: Dict[str, str] = {} # Dictionnaire: node_id -> label
        self.terminal_nodes: Set[str] = set() # Ensemble des ID de nœuds qui terminent un flux (Return, Break, Continue)
        self.node_types: Dict[str, str] = {} # Dictionnaire: node_id -> type de nœud (Process, Decision, etc.)
        
        # Pile pour gérer les portées des fonctions imbriquées.
        # Chaque élément est un Set d'IDs de nœuds pour cette portée de fonction.
        self._function_scope_stack: List[Set[str]] = []
        
        # Stockage des ID de nœuds pour chaque fonction définie, utilisé pour les sous-graphes Mermaid.
        # Dictionnaire: function_name -> Set[node_id]
        self.function_subgraph_nodes: Dict[str, Set[str]] = {}
        # Stockage des ID de nœuds pour le flux principal (module), utilisé pour le sous-graphe Mermaid.
        self.main_flow_nodes: Set[str] = set()


    def get_node_id(self) -> str:
        """Génère un nouvel ID de nœud unique et l'ajoute à la portée de fonction actuelle si applicable."""
        self.node_counter += 1
        new_id = f"node{self.node_counter:02d}"
        
        if self._function_scope_stack:
            # Si nous sommes dans la portée d'une fonction, ajouter ce nœud à cette portée.
            self._function_scope_stack[-1].add(new_id)
        else:
            # Sinon, ce nœud appartient au flux principal (module).
            self.main_flow_nodes.add(new_id)
        return new_id

    def add_node(self, label: str, node_type: str = "Process") -> str:
        """Ajoute un nouveau nœud au graphe."""
        node_id = self.get_node_id() # get_node_id gère l'ajout aux ensembles pour les sous-graphes
        self.nodes.append((node_id, label))
        self.node_labels[node_id] = label
        self.node_types[node_id] = node_type
        return node_id

    def add_edge(self, from_node: str, to_node: str, label: str = ""):
        """Ajoute une arête au graphe, avec vérifications."""
        if not from_node or not to_node:
            # Éviter les arêtes avec des nœuds non définis.
            return
        if from_node == to_node and not label:
            # Éviter les auto-boucles non labellisées (souvent issues de branches vides).
            return
            
        # Permettre aux nœuds de saut (Break/Continue) et de Retour d'avoir des arêtes sortantes
        # si elles sont explicitement ajoutées par leurs visiteurs respectifs.
        # Les autres nœuds terminaux ne devraient pas avoir de nouvelles arêtes génériques sortantes.
        if from_node in self.terminal_nodes and \
           self.node_types.get(from_node) not in ("Jump", "Return"):
            return
            
        if from_node not in self.node_labels or to_node not in self.node_labels:
            # Éviter les arêtes entre des nœuds non (encore) existants.
            return
        self.edges.add((from_node, to_node, label))

    def _is_terminal_ast_node(self, node: ast.AST) -> bool:
        """Vérifie si un nœud AST est un nœud qui termine le flux normal (Return, Break, Continue)."""
        return isinstance(node, (ast.Return, ast.Break, ast.Continue))

    def visit_body(self, body: List[ast.AST], entry_node_ids: List[str]) -> List[str]:
        """
        Visite une séquence d'instructions (un "corps").
        Gère la création de jonctions si nécessaire entre les instructions.
        Retourne une liste d'ID de nœuds qui sont les points de sortie de ce corps.
        """
        active_ids_for_current_statement = list(set(entry_node_ids))

        for i, stmt in enumerate(body):
            if not active_ids_for_current_statement: 
                # Plus de chemins actifs à traiter dans ce corps.
                break
            
            # Points d'entrée pour l'instruction courante (filtrer les nœuds déjà terminaux).
            current_stmt_entry_points = [pid for pid in active_ids_for_current_statement 
                                         if pid not in self.terminal_nodes]
            
            if not current_stmt_entry_points:
                 # Tous les chemins menant à cette instruction étaient terminaux.
                 active_ids_for_current_statement = [] 
                 break

            # Collecter les points de sortie de l'instruction courante, pour tous les chemins d'entrée.
            exits_from_current_stmt_all_paths: List[str] = []
            for parent_id in current_stmt_entry_points:
                # visit() retourne les ID des nœuds de sortie de stmt pour ce parent_id.
                exit_nodes_from_stmt_path = self.visit(stmt, parent_id)
                exits_from_current_stmt_all_paths.extend(exit_nodes_from_stmt_path)
            
            # Les points de sortie de l'instruction courante deviennent les points d'entrée potentiels pour la suivante.
            active_ids_for_current_statement = list(set(exits_from_current_stmt_all_paths))

            # Logique de Jonction:
            # Si ce n'est PAS la dernière instruction et que l'instruction courante a produit
            # PLUSIEURS points de sortie non-terminaux, nous les fusionnons avec un nœud de jonction.
            is_last_statement = (i == len(body) - 1)
            non_terminal_active_ids = [pid for pid in active_ids_for_current_statement 
                                       if pid not in self.terminal_nodes]

            if not is_last_statement and len(non_terminal_active_ids) > 1:
                # Créer un seul nœud de jonction.
                junction_id = self.add_node(".", node_type="Junction")
                for pid in non_terminal_active_ids:
                    self.add_edge(pid, junction_id)
                
                # Le nœud de jonction devient le seul point d'entrée non-terminal pour la prochaine instruction.
                # On conserve les points terminaux s'il y en avait.
                terminal_active_ids = [pid for pid in active_ids_for_current_statement if pid in self.terminal_nodes]
                active_ids_for_current_statement = [junction_id] + terminal_active_ids
        
        # Retourne tous les points de sortie actifs (terminaux ou non) du corps.
        return active_ids_for_current_statement


    def visit(self, node: ast.AST, parent_id: Optional[str]) -> List[str]:
        """Méthode de visite générique qui appelle le visiteur spécifique au type de nœud AST."""
        method_name = f'visit_{type(node).__name__}'
        visitor = getattr(self, method_name, self.generic_visit)
        
        # parent_id est None pour le Module ou les FunctionDef de haut niveau.
        if parent_id is None and not isinstance(node, (ast.Module, ast.FunctionDef)):
            # print(f"Critical Warning: visit() appelé avec parent_id=None pour noeud {type(node).__name__}")
            return []

        exit_nodes: List[str] = visitor(node, parent_id)

        # Si le nœud AST lui-même est terminal (Return, Break, Continue),
        # alors les nœuds CFG qu'il a créés sont marqués comme terminaux.
        if self._is_terminal_ast_node(node): 
            for node_id in exit_nodes: # Normalement un seul nœud créé par R/B/C.
                self.terminal_nodes.add(node_id)
            return [] # Pas de continuation de flux normale depuis un nœud terminal AST.
        
        return exit_nodes # Retourne les points de sortie pour le flux normal.

    def connect_finals_to_end(self, target_end_id: str, scope_node_ids: Optional[Set[str]] = None):
        """
        Connecte les nœuds sans arête sortante (dans la portée donnée) au target_end_id.
        Utilisé pour les fins de chemin implicites et les nœuds Return.
        """
        source_nodes_with_outgoing_edges = set(from_node for from_node, _, _ in self.edges)
        
        # Si scope_node_ids n'est pas fourni, considérer tous les nœuds.
        nodes_to_check = scope_node_ids if scope_node_ids is not None else set(self.node_labels.keys())

        for node_id in list(nodes_to_check): # Itérer sur une copie car self.edges peut être modifié.
            if node_id not in self.node_labels: continue # Nœud potentiellement supprimé (logique future).
            if node_id == target_end_id: continue # Ne pas connecter un nœud à lui-même de cette façon.

            is_return_node = self.node_types.get(node_id) == "Return"
            
            # Si un nœud est un 'Return', il DOIT être connecté au 'End' de sa fonction/module.
            # S'il est dans terminal_nodes mais n'est PAS un 'Return' (ex: Break, Continue),
            # ses sauts sont déjà gérés, donc on ne le connecte pas au 'End' général ici.
            if node_id in self.terminal_nodes and not is_return_node:
                continue
            
            # Si le nœud n'a pas d'arête sortante, OU s'il est un 'Return', alors on le connecte.
            if node_id not in source_nodes_with_outgoing_edges or is_return_node:
                self.add_edge(node_id, target_end_id)


    def visit_Module(self, node: ast.Module, parent_id: Optional[str] = None) -> List[str]:
        """Visite le nœud racine du module AST."""
        # Le nœud Start du module. parent_id est None ici.
        # get_node_id ajoutera start_id à self.main_flow_nodes.
        start_id = self.add_node("Start", node_type="StartEnd") 
        
        function_defs = [n for n in node.body if isinstance(n, ast.FunctionDef)]
        other_statements = [n for n in node.body if not isinstance(n, ast.FunctionDef)]

        # 1. Visiter les définitions de fonctions.
        #    Elles créent leurs propres sous-graphes et ne sont pas dans le flux principal du module.
        for func_def_node in function_defs:
            self.visit(func_def_node, None) # parent_id est None pour les func defs top-level.

        # 2. Visiter les autres instructions pour le flux principal du module.
        #    Commence à partir du nœud 'Start' du module.
        module_flow_exits = self.visit_body(other_statements, [start_id])
        
        # Le nœud End du module. get_node_id l'ajoutera à self.main_flow_nodes.
        module_end_id = self.add_node("End", node_type="StartEnd")

        # 3. Connecter les sorties normales du flux principal au nœud 'End' du module.
        for node_id in module_flow_exits:
            if node_id not in self.terminal_nodes: # Ne pas connecter si c'est déjà un break/continue global.
                self.add_edge(node_id, module_end_id)
        
        # 4. Connecter les fins implicites et les 'Return' globaux (rare) au 'End' du module.
        #    On utilise self.main_flow_nodes qui a été rempli par get_node_id pour les nœuds du module.
        self.connect_finals_to_end(module_end_id, scope_node_ids=self.main_flow_nodes) 

        return [] # Le module lui-même n'a pas de "sortie" vers un parent.

    def visit_FunctionDef(self, node: ast.FunctionDef, parent_id: Optional[str]) -> List[str]:
        """Visite une définition de fonction AST."""
        # 1. Gérer la portée pour les nœuds internes à cette fonction.
        #    Crée un nouvel ensemble vide pour les ID de nœuds de cette fonction.
        self._function_scope_stack.append(set()) 
        
        # 2. Créer Start et End pour le *corps* de la fonction (sous-graphe).
        #    Ces nœuds seront automatiquement ajoutés à la portée de la fonction actuelle
        #    (et donc à self._function_scope_stack[-1]) par get_node_id.
        func_body_start_id = self.add_node(f"Start {node.name}", node_type="StartEnd")
        func_body_end_id = self.add_node(f"End {node.name}", node_type="StartEnd")

        # 3. Visiter le corps de la fonction.
        #    Les points d'entrée sont le nœud Start de cette fonction.
        body_normal_exit_nodes = self.visit_body(node.body, [func_body_start_id])

        # 4. Connecter les sorties normales du corps (non-Return) au nœud End de la fonction.
        for node_id in body_normal_exit_nodes:
            if node_id not in self.terminal_nodes: # Ne pas connecter si c'est un break/continue dans la fonction.
                self.add_edge(node_id, func_body_end_id)

        # 5. Récupérer tous les ID de nœuds de cette fonction et les stocker pour les sous-graphes Mermaid.
        #    Puis, dépiler la portée.
        current_function_node_ids = self._function_scope_stack.pop()
        self.function_subgraph_nodes[node.name] = current_function_node_ids
        
        # 6. Connecter tous les 'Return' et fins de chemin implicites DANS CETTE FONCTION
        #    à son propre func_body_end_id. Utiliser les ID de nœuds collectés pour cette fonction.
        self.connect_finals_to_end(func_body_end_id, scope_node_ids=current_function_node_ids)
        
        # La fonction ne s'insère plus dans le flux parent, donc retourne [].
        return []
    
    def visit_If(self, node: ast.If, parent_id: str) -> List[str]:
        """Visite une instruction 'if' AST."""
        condition_text = ast.unparse(node.test).replace('"', '"') # Remplacer les guillemets pour Mermaid.
        if_decision_id = self.add_node(f"{condition_text}", node_type="Decision")
        self.add_edge(parent_id, if_decision_id)

        # Points de sortie finaux de la structure If globale.
        final_exit_nodes_after_if: List[str] = []
        
        true_branch_first_node_id: Optional[str] = None
        false_branch_first_node_id: Optional[str] = None

        # --- Branche True (node.body) ---
        if node.body:
            # Pour identifier le premier nœud de la branche, on capture l'état avant/après.
            nodes_before_true_branch = set(n_id for n_id, _ in self.nodes)
            true_branch_exits = self.visit_body(node.body, [if_decision_id])
            nodes_after_true_branch = set(n_id for n_id, _ in self.nodes)
            
            # Trouver les nouveaux nœuds ajoutés dans cette branche.
            new_nodes_in_true_branch = sorted(
                list(nodes_after_true_branch - nodes_before_true_branch), 
                key=lambda x: int(x.replace("node","")) # Trier par numéro de nœud pour la stabilité.
            )
            if new_nodes_in_true_branch:
                true_branch_first_node_id = new_nodes_in_true_branch[0]
            
            final_exit_nodes_after_if.extend(true_branch_exits)
        else: 
            # Branche True vide: le flux continue depuis if_decision_id avec la condition True.
            final_exit_nodes_after_if.append(if_decision_id) 

        # --- Branche False (node.orelse) ---
        if node.orelse: # Peut être un 'else' ou un 'elif' (qui est un autre If).
            nodes_before_false_branch = set(n_id for n_id, _ in self.nodes)
            false_branch_exits = self.visit_body(node.orelse, [if_decision_id])
            nodes_after_false_branch = set(n_id for n_id, _ in self.nodes)

            new_nodes_in_false_branch = sorted(
                list(nodes_after_false_branch - nodes_before_false_branch),
                key=lambda x: int(x.replace("node",""))
            )
            if new_nodes_in_false_branch:
                false_branch_first_node_id = new_nodes_in_false_branch[0]

            final_exit_nodes_after_if.extend(false_branch_exits)
        else: 
            # Branche False vide: le flux continue depuis if_decision_id avec la condition False.
            final_exit_nodes_after_if.append(if_decision_id)

        # Labellisation des arêtes sortantes du nœud de décision 'if_decision_id'.
        if true_branch_first_node_id: 
            # L'arête (if_decision_id, true_branch_first_node_id, "") a été créée par le premier appel
            # à visit() dans visit_body. Nous la supprimons pour la recréer avec le label "True".
            if (if_decision_id, true_branch_first_node_id, "") in self.edges:
                self.edges.remove((if_decision_id, true_branch_first_node_id, ""))
            self.add_edge(if_decision_id, true_branch_first_node_id, "True")
        # else: Si la branche True est vide, if_decision_id est une sortie. Le label "True"
        #       sera sur l'arête if_decision_id -> (jonction ou instruction suivante).
        #       Ceci est géré par le fait que if_decision_id est dans final_exit_nodes_after_if.

        if false_branch_first_node_id: 
            if (if_decision_id, false_branch_first_node_id, "") in self.edges:
                self.edges.remove((if_decision_id, false_branch_first_node_id, ""))
            self.add_edge(if_decision_id, false_branch_first_node_id, "False")
        # else: Idem pour la branche False vide.
        
        # Retourner les points de sortie uniques. visit_body s'occupera de les fusionner si nécessaire.
        return list(set(final_exit_nodes_after_if))

    def visit_For(self, node: ast.For, parent_id: str) -> List[str]: 
        """Visite une boucle 'for' AST en distinguant les cas for .. in range(...)"""
        iterator_variable_str = ast.unparse(node.target).replace('"', '"')
        iterable_node = node.iter
        
        # Points de sortie de la boucle For (ceux qui mènent à l'instruction *après* la boucle).
        loop_overall_exit_points: List[str] = []

        # Cas spécial pour for i in range(...) pour une représentation plus détaillée.
        if isinstance(iterable_node, ast.Call) and \
           isinstance(iterable_node.func, ast.Name) and \
           iterable_node.func.id == 'range':

            range_args = iterable_node.args
            start_val_str = "0"; stop_val_str = ""; step_val_str = "1" # Valeurs par défaut pour range.
            if len(range_args) == 1: 
                stop_val_str = ast.unparse(range_args[0]).replace('"', '#quot;')
            elif len(range_args) >= 2:
                start_val_str = ast.unparse(range_args[0]).replace('"', '#quot;')
                stop_val_str = ast.unparse(range_args[1]).replace('"', '#quot;')
                if len(range_args) == 3: 
                    step_val_str = ast.unparse(range_args[2]).replace('"', '#quot;')
            else: # Fallback si range() a un nombre inattendu d'arguments.
                return self._visit_for_generic_iterable(node, parent_id, iterator_variable_str)

            # Nœud d'initialisation.
            init_label = f"{iterator_variable_str} = {start_val_str}"
            init_node_id = self.add_node(init_label, node_type="Process")
            self.add_edge(parent_id, init_node_id)

            # Nœud de condition.
            condition_op = "<" # Opérateur par défaut.
            try: # Essayer de déterminer si le pas est négatif.
                temp_step_for_eval = step_val_str.replace('#quot;', '') 
                if temp_step_for_eval: 
                    evaluated_step = ast.literal_eval(temp_step_for_eval) # Évaluation sûre.
                    if isinstance(evaluated_step, (int, float)) and evaluated_step < 0:
                        condition_op = ">" 
            except (ValueError, SyntaxError):
                pass # Garder "<" par défaut si l'évaluation échoue.

            loop_condition_label = f"{iterator_variable_str} {condition_op} {stop_val_str}"
            loop_condition_id = self.add_node(loop_condition_label, node_type="Decision")
            self.add_edge(init_node_id, loop_condition_id)

            # La branche "False" (terminaison normale) du losange est un point de sortie global.
            loop_overall_exit_points.append(loop_condition_id) 

            # Nœud d'incrémentation.
            increment_label = f"{iterator_variable_str} = {iterator_variable_str} + {step_val_str}"
            increment_node_id = self.add_node(increment_label, node_type="Process")
            
            # Mettre à jour la pile des boucles pour 'break' et 'continue'.
            # break_target: loop_condition_id (la sortie "False" de la condition).
            # continue_target: increment_node_id.
            # retest_target: loop_condition_id (après l'incrément).
            self.loop_stack.append((increment_node_id, loop_condition_id, loop_condition_id)) 

            # Visiter le corps de la boucle (branche "True").
            true_branch_first_node_id: Optional[str] = None
            if node.body:
                nodes_before_body = {n_id for n_id, _ in self.nodes}
                body_exit_nodes = self.visit_body(node.body, [loop_condition_id])
                nodes_after_body = {nid for nid,_ in self.nodes}
                new_nodes_in_body = sorted(list(nodes_after_body - nodes_before_body), key=lambda x: int(x.replace("node","")))
                if new_nodes_in_body:
                    true_branch_first_node_id = new_nodes_in_body[0]
                
                # Les sorties normales du corps mènent à l'incrémentation.
                for exit_node in body_exit_nodes:
                    if exit_node not in self.terminal_nodes: 
                        self.add_edge(exit_node, increment_node_id)

            if true_branch_first_node_id: 
                if (loop_condition_id, true_branch_first_node_id, "") in self.edges: 
                    self.edges.remove((loop_condition_id, true_branch_first_node_id, ""))
                self.add_edge(loop_condition_id, true_branch_first_node_id, "True")
            elif not node.body: # Corps vide, la branche "True" va directement à l'incrément.
                self.add_edge(loop_condition_id, increment_node_id, "True")

            # L'incrément retourne à la condition.
            self.add_edge(increment_node_id, loop_condition_id) 
            
            # Gérer la clause 'orelse' de la boucle.
            # Elle s'exécute si la boucle se termine normalement (pas par un 'break').
            false_branch_first_node_id: Optional[str] = None 
            if node.orelse:
                # Si orelse existe, loop_condition_id (sortie False) ne va pas directement à la suite,
                # mais au début de orelse.
                if loop_condition_id in loop_overall_exit_points:
                    loop_overall_exit_points.remove(loop_condition_id)

                nodes_before_orelse = {nid for nid,_ in self.nodes}
                orelse_exit_nodes = self.visit_body(node.orelse, [loop_condition_id]) 
                nodes_after_orelse = {nid for nid,_ in self.nodes}
                new_nodes_in_orelse = sorted(list(nodes_after_orelse - nodes_before_orelse), key=lambda x: int(x.replace("node","")))
                if new_nodes_in_orelse:
                    false_branch_first_node_id = new_nodes_in_orelse[0]
                
                loop_overall_exit_points.extend(orelse_exit_nodes) # Les sorties de orelse sont des sorties globales.
            
            if false_branch_first_node_id: 
                if (loop_condition_id, false_branch_first_node_id, "") in self.edges: 
                    self.edges.remove((loop_condition_id, false_branch_first_node_id, ""))
                self.add_edge(loop_condition_id, false_branch_first_node_id, "False")
            # elif not node.orelse : Pas de orelse, l'arête "False" part de loop_condition_id vers la suite.
                
            self.loop_stack.pop() # Fin de la gestion de cette boucle.
            return list(set(loop_overall_exit_points))   
        else: # Itérable générique (non-range).
            return self._visit_for_generic_iterable(node, parent_id, iterator_variable_str)

    def _visit_for_generic_iterable(self, node: ast.For, parent_id: str, iterator_variable_str: str) -> List[str]:
        """Visite une boucle 'for' avec un itérable générique."""
        iterable_text = ast.unparse(node.iter).replace('"', '"')
        loop_decision_label = f"For {iterator_variable_str} in {iterable_text}"
        loop_decision_id = self.add_node(loop_decision_label, node_type="Decision")
        self.add_edge(parent_id, loop_decision_id)
        
        # La sortie "Terminée/Vide" de la boucle.
        loop_overall_exit_points: List[str] = [loop_decision_id] 

        # Pour un 'for' générique: 'continue' et re-test vont au nœud de décision.
        # 'break' va aussi à la sortie "Terminée/Vide" de ce nœud.
        self.loop_stack.append((loop_decision_id, loop_decision_id, loop_decision_id))

        # Visiter le corps (branche "itération").
        iteration_branch_first_node_id: Optional[str] = None
        if node.body:
            nodes_before_body = {nid for nid,_ in self.nodes}
            body_exit_nodes = self.visit_body(node.body, [loop_decision_id])
            nodes_after_body = {nid for nid,_ in self.nodes}
            new_nodes_in_body = sorted(list(nodes_after_body - nodes_before_body), key=lambda x: int(x.replace("node","")))
            if new_nodes_in_body:
                iteration_branch_first_node_id = new_nodes_in_body[0]
            
            # Les sorties normales du corps retournent au test de la boucle.
            for exit_node in body_exit_nodes:
                if exit_node not in self.terminal_nodes:
                    self.add_edge(exit_node, loop_decision_id) 
        
        if iteration_branch_first_node_id:
            if (loop_decision_id, iteration_branch_first_node_id, "") in self.edges: 
                self.edges.remove((loop_decision_id, iteration_branch_first_node_id, ""))
            self.add_edge(loop_decision_id, iteration_branch_first_node_id, "itération")
        elif not node.body: # Corps vide, la branche "itération" revient directement au test.
             self.add_edge(loop_decision_id, loop_decision_id, "itération")


        # Gérer 'orelse' (sortie "Terminée/Vide").
        terminated_branch_first_node_id: Optional[str] = None
        if node.orelse:
            if loop_decision_id in loop_overall_exit_points:
                loop_overall_exit_points.remove(loop_decision_id) # orelse remplace la sortie directe.
            
            nodes_before_orelse = {nid for nid,_ in self.nodes}
            orelse_exit_nodes = self.visit_body(node.orelse, [loop_decision_id])
            nodes_after_orelse = {nid for nid,_ in self.nodes}
            new_nodes_in_orelse = sorted(list(nodes_after_orelse - nodes_before_orelse), key=lambda x: int(x.replace("node","")))
            if new_nodes_in_orelse:
                terminated_branch_first_node_id = new_nodes_in_orelse[0]
            loop_overall_exit_points.extend(orelse_exit_nodes)
        
        if terminated_branch_first_node_id:
            if (loop_decision_id, terminated_branch_first_node_id, "") in self.edges: 
                self.edges.remove((loop_decision_id, terminated_branch_first_node_id, ""))
            self.add_edge(loop_decision_id, terminated_branch_first_node_id, "Terminée / Vide")
        # elif not node.orelse: L'arête "Terminée / Vide" sera implicite via loop_overall_exit_points.

        self.loop_stack.pop()
        return list(set(loop_overall_exit_points))
    
    def visit_While(self, node: ast.While, parent_id: str) -> List[str]: 
        """Visite une boucle 'while' AST."""
        condition_text = ast.unparse(node.test).replace('"', '"')
        while_decision_id = self.add_node(f"While {condition_text}", node_type="Decision")
        self.add_edge(parent_id, while_decision_id)
        
        # La branche "False" (terminaison normale) part de while_decision_id.
        loop_overall_exit_points: List[str] = [while_decision_id] 

        # break_target: while_decision_id (sortie "False").
        # continue_target et retest_target: while_decision_id (re-tester la condition).
        self.loop_stack.append((while_decision_id, while_decision_id, while_decision_id))

        # Visiter le corps (branche "True").
        true_branch_first_node_id: Optional[str] = None
        if node.body:
            nodes_before_body = {nid for nid,_ in self.nodes}
            body_exit_nodes = self.visit_body(node.body, [while_decision_id]) 
            nodes_after_body = {nid for nid,_ in self.nodes}
            new_nodes_in_body = sorted(list(nodes_after_body - nodes_before_body), key=lambda x: int(x.replace("node","")))
            if new_nodes_in_body:
                true_branch_first_node_id = new_nodes_in_body[0]
            
            # Les sorties normales du corps retournent au test.
            for exit_node in body_exit_nodes:
                if exit_node not in self.terminal_nodes:
                    self.add_edge(exit_node, while_decision_id) 
        
        if true_branch_first_node_id:
            if (while_decision_id, true_branch_first_node_id, "") in self.edges: 
                self.edges.remove((while_decision_id, true_branch_first_node_id, ""))
            self.add_edge(while_decision_id, true_branch_first_node_id, "True")
        elif not node.body: # Corps vide, "True" revient directement au test.
            self.add_edge(while_decision_id, while_decision_id, "True")

        # Gérer 'orelse' (sortie "False").
        false_branch_first_node_id: Optional[str] = None
        if node.orelse:
            if while_decision_id in loop_overall_exit_points:
                loop_overall_exit_points.remove(while_decision_id) # orelse remplace la sortie directe.
            
            nodes_before_orelse = {nid for nid,_ in self.nodes}
            orelse_exit_nodes = self.visit_body(node.orelse, [while_decision_id]) 
            nodes_after_orelse = {nid for nid,_ in self.nodes}
            new_nodes_in_orelse = sorted(list(nodes_after_orelse - nodes_before_orelse), key=lambda x: int(x.replace("node","")))
            if new_nodes_in_orelse:
                false_branch_first_node_id = new_nodes_in_orelse[0]
            loop_overall_exit_points.extend(orelse_exit_nodes)
        
        if false_branch_first_node_id:
            if (while_decision_id, false_branch_first_node_id, "") in self.edges: 
                self.edges.remove((while_decision_id, false_branch_first_node_id, ""))
            self.add_edge(while_decision_id, false_branch_first_node_id, "False")
        # elif not node.orelse: L'arête "False" sera implicite via loop_overall_exit_points.
            
        self.loop_stack.pop()
        return list(set(loop_overall_exit_points))

    def visit_Return(self, node: ast.Return, parent_id: str) -> List[str]:
        """Visite une instruction 'return' AST."""
        value_text = ast.unparse(node.value).replace('"', '"') if node.value else ""
        return_node_id = self.add_node(f"Return {value_text}", node_type="Return")
        self.add_edge(parent_id, return_node_id)
        # visit() marquera return_node_id comme terminal et retournera [].
        return [return_node_id] 

    def visit_Break(self, node: ast.Break, parent_id: str) -> List[str]: 
        """Visite une instruction 'break' AST."""
        break_node_id = self.add_node("Break", node_type="Jump")
        self.add_edge(parent_id, break_node_id)
        # Le 'break' saute à la sortie de la boucle.
        # Aucune arête explicite n'est ajoutée ici pour le saut lui-même;
        # le fait que le nœud soit terminal et que la boucle ait des points de sortie définis gère cela.
        # if self.loop_stack:
        #     _, loop_exit_target, _ = self.loop_stack[-1]
        #     # self.add_edge(break_node_id, loop_exit_target, "break") # Optionnel pour visualiser le saut
        return [break_node_id] # visit() le marquera comme terminal.

    def visit_Continue(self, node: ast.Continue, parent_id: str) -> List[str]: 
        """Visite une instruction 'continue' AST."""
        continue_node_id = self.add_node("Continue", node_type="Jump")
        self.add_edge(parent_id, continue_node_id)
        if self.loop_stack:
            loop_continue_target, _, _ = self.loop_stack[-1]
            self.add_edge(continue_node_id, loop_continue_target) # Explicitement connecter à la cible du continue.
        # else: # 'continue' en dehors d'une boucle (erreur Python).
        return [continue_node_id] # visit() le marquera comme terminal.

    def generic_visit(self, node: ast.AST, parent_id: str) -> List[str]:
        """Visiteur par défaut pour les nœuds AST non gérés spécifiquement."""
        try:
            # Essayer de générer une étiquette à partir du code source du nœud.
            label_text = ast.unparse(node).replace('"', '"')
            node_type = "Process" # Type par défaut.
            if isinstance(node, ast.Pass): # Cas spécial pour 'pass'.
                label_text = "Pass"
            
            # Tronquer les étiquettes trop longues.
            max_label_length = 60 
            if len(label_text) > max_label_length: 
                label_text = label_text[:max_label_length-3] + "..."
            
            new_node_id = self.add_node(label_text, node_type=node_type)
            if parent_id: # Connecter au parent si un parent existe.
                self.add_edge(parent_id, new_node_id)
            return [new_node_id]
        except Exception: # Si unparse échoue.
            label_text = f"Noeud AST: {type(node).__name__}"
            # print(f"Warning: Impossible de 'unparse' le noeud {label_text}. Erreur: {e}")
            new_node_id = self.add_node(label_text, node_type="Process")
            if parent_id: 
                self.add_edge(parent_id, new_node_id)
            return [new_node_id]

    def visit_Assign(self, node: ast.Assign, parent_id: str) -> List[str]:
        """Visite une instruction d'assignation AST."""
        targets_str = ", ".join([ast.unparse(t).replace('"', '"') for t in node.targets])
        value_str = ast.unparse(node.value).replace('"', '"')
        
        label_text = f"{targets_str} = {value_str}"
        node_type = "Process"

        max_label_length = 60
        if len(label_text) > max_label_length:
             # Tenter de raccourcir la partie droite (valeur) en premier.
             available_len_for_value = max_label_length - len(targets_str) - 6 # Pour " = ..."
             if available_len_for_value > 10 : # Assez de place pour une valeur raccourcie significative.
                 short_value = value_str[:available_len_for_value] + "..." if len(value_str) > available_len_for_value else value_str
                 label_text = f"{targets_str} = {short_value}"
             else: # Sinon, raccourcir le tout.
                 label_text = label_text[:max_label_length-3] + "..."
        
        assign_node_id = self.add_node(label_text, node_type=node_type)
        self.add_edge(parent_id, assign_node_id)
        return [assign_node_id]

    def visit_Expr(self, node: ast.Expr, parent_id: str) -> List[str]:
        """Visite une instruction d'expression AST (souvent un appel de fonction autonome)."""
        # Une instruction Expr contient une valeur qui est évaluée (ex: print(), une fonction personnalisée).
        # On visite la valeur interne.
        return self.visit(node.value, parent_id)

    def visit_Call(self, node: ast.Call, parent_id: str) -> List[str]:
        """Visite un appel de fonction AST."""
        func_name_str = ast.unparse(node.func).replace('"', '#quot;') # Sécuriser le nom de la fonction.
        
        # Arguments positionnels.
        args_list_str = [ast.unparse(a).replace('"', '#quot;') for a in node.args]
        
        # Arguments nommés (keywords).
        double_quote_char = '"' # Pour éviter les problèmes de backslash dans les f-strings.
        kwargs_list_str = [
            f'{k.arg}={ast.unparse(k.value).replace(double_quote_char, "#quot;")}'
            for k in node.keywords
        ]
        
        all_args_concatenated_str = ", ".join(args_list_str + kwargs_list_str)
        
        # Tronquer la chaîne des arguments si elle est trop longue.
        max_args_display_length = 30 
        if len(all_args_concatenated_str) > max_args_display_length: 
            all_args_concatenated_str = all_args_concatenated_str[:max_args_display_length-3] + "..."
        
        node_type = "Process" # Type par défaut.
        label_text = f"{func_name_str}({all_args_concatenated_str})" # Étiquette de base.

        # Style spécifique pour les opérations d'I/O.
        if func_name_str in ["print", "input"]:
            node_type = "IoOperation"
        else: # Pour les autres appels, on peut ajouter "Appel:" pour les distinguer.
            label_text = f"Appel: {label_text}"

        call_node_id = self.add_node(label_text, node_type=node_type)
        self.add_edge(parent_id, call_node_id)
        return [call_node_id]

    def _simplify_junctions(self) -> Tuple[List[Tuple[str, str]], Set[Tuple[str, str, str]]]:
        """
        Tente de simplifier les jonctions triviales (1 entrée, 1 sortie).
        NOTE: Actuellement, visit_body ne crée pas de jonctions 1-entrée/1-sortie,
              donc cette fonction n'aura probablement pas d'effet.
              Elle est conservée pour une utilisation future potentielle.
        """
        simplified_nodes_tuples: List[Tuple[str,str]] = [] # Pour garder l'ordre des nœuds.
        simplified_edges = set()
        
        junction_to_successor_map: Dict[str, str] = {} # Mappe: junction_id_simplifiée -> son unique successeur.
        nodes_to_keep_ids = set(n_id for n_id, _ in self.nodes) # Commencer avec tous les nœuds.

        # Première passe: identifier les jonctions triviales à simplifier.
        for junction_candidate_id, _ in self.nodes:
            if self.node_types.get(junction_candidate_id) == "Junction":
                incoming_edges = [edge for edge in self.edges if edge[1] == junction_candidate_id]
                outgoing_edges = [edge for edge in self.edges if edge[0] == junction_candidate_id]

                if len(incoming_edges) == 1 and len(outgoing_edges) == 1:
                    predecessor_node = incoming_edges[0][0]
                    successor_node = outgoing_edges[0][1]
                    
                    # Éviter de simplifier si cela crée une auto-boucle sur la jonction elle-même.
                    if predecessor_node != junction_candidate_id and successor_node != junction_candidate_id : 
                        junction_to_successor_map[junction_candidate_id] = successor_node 
                        if junction_candidate_id in nodes_to_keep_ids:
                            nodes_to_keep_ids.remove(junction_candidate_id) # Marquer pour suppression.

        # Deuxième passe: construire les listes de nœuds et d'arêtes simplifiées.
        for node_id, label in self.nodes:
            if node_id in nodes_to_keep_ids: # N'ajouter que les nœuds conservés.
                simplified_nodes_tuples.append((node_id, label))

        for from_node, to_node, edge_label in self.edges:
            current_from_node = from_node
            current_to_node = to_node

            # Rediriger la destination si elle pointe vers une jonction simplifiée.
            # Répéter au cas où plusieurs jonctions triviales se suivent.
            while current_to_node in junction_to_successor_map:
                current_to_node = junction_to_successor_map[current_to_node]
            
            # Si la source et la destination (après redirection) sont des nœuds conservés.
            if current_from_node in nodes_to_keep_ids and current_to_node in nodes_to_keep_ids:
                # Éviter les auto-boucles créées par la simplification, sauf si elles sont labellisées.
                if current_from_node == current_to_node and not edge_label:
                    continue
                simplified_edges.add((current_from_node, current_to_node, edge_label))
        
        return simplified_nodes_tuples, simplified_edges

    def to_mermaid(self) -> str:
        """Génère la représentation du graphe en syntaxe Mermaid, avec sous-graphes."""
        
        # Utiliser les nœuds et arêtes originaux. La simplification n'est pas activée par défaut.
        # Pour activer la simplification (si des jonctions 1-1 étaient créées) :
        # display_nodes_tuples, display_edges = self._simplify_junctions()
        display_nodes_tuples = self.nodes
        display_edges = self.edges
        
        mermaid_lines = ["graph TD"] # Orientation de haut en bas.
        
        # Définitions de style pour les types de nœuds.
        mermaid_lines.extend([
            "    classDef StartEnd fill:#999,stroke:#fff,stroke-width:2px;",
            "    classDef Decision fill:#999,stroke:#fff,stroke-width:2px;",
            "    classDef Process fill:#999,stroke:#fff,stroke-width:2px;",
            "    classDef IoOperation fill:#999,stroke:#fff,stroke-width:2px;",
            "    classDef Junction fill:#999,stroke:#fff,stroke-width:1px;", # Cercle pour jonction.
            "    classDef Return fill:#999,stroke:#fff,stroke-width:2px;",
            "    classDef Jump fill:#999,stroke:#fff,stroke-width:2px;"
        ])

        # --- Sous-graphe pour le Flux Principal ---
        if self.main_flow_nodes: # S'il y a des nœuds dans le flux principal.
            mermaid_lines.append("    subgraph Flux Principal")
            for node_id, label_text in display_nodes_tuples:
                if node_id in self.main_flow_nodes:
                    safe_label = label_text.replace('"', '#quot;').replace('\n', '<br/>')
                    node_type = self.node_types.get(node_id, "Process")
                    shape_open, shape_close = self._get_mermaid_node_shape(node_type, safe_label)
                    mermaid_lines.append(f'        {node_id}{shape_open}"{safe_label}"{shape_close}')
            mermaid_lines.append("    end")

        # --- Sous-graphes pour chaque Fonction Définie ---
        for func_name, node_ids_in_func in self.function_subgraph_nodes.items():
            if node_ids_in_func: # S'il y a des nœuds dans cette fonction.
                mermaid_lines.append(f'    subgraph Fonction {func_name}')
                for node_id, label_text in display_nodes_tuples:
                    if node_id in node_ids_in_func:
                        safe_label = label_text.replace('"', '#quot;').replace('\n', '<br/>')
                        node_type = self.node_types.get(node_id, "Process")
                        shape_open, shape_close = self._get_mermaid_node_shape(node_type, safe_label)
                        mermaid_lines.append(f'        {node_id}{shape_open}"{safe_label}"{shape_close}')
                mermaid_lines.append("    end")
        
        # --- Application des styles aux nœuds (en dehors des sous-graphes) ---
        node_style_lines = []
        for node_id, _ in display_nodes_tuples:
            node_type = self.node_types.get(node_id, "Process")
            node_style_lines.append(f'    class {node_id} {node_type};')
        mermaid_lines.extend(sorted(list(set(node_style_lines)))) # set pour dédupliquer.

        # --- Définition des Arêtes ---
        edge_definitions = []
        for from_node, to_node, edge_label_text in display_edges:
            safe_edge_label = edge_label_text.replace('"', '#quot;')
            # Vérifier que les nœuds existent toujours (surtout si la simplification était activée).
            if not any(n[0] == from_node for n in display_nodes_tuples) or \
               not any(n[0] == to_node for n in display_nodes_tuples):
                continue

            if safe_edge_label: 
                edge_definitions.append(f"    {from_node} -->|{safe_edge_label}| {to_node}")
            else: 
                edge_definitions.append(f"    {from_node} --> {to_node}")
        
        mermaid_lines.extend(sorted(list(set(edge_definitions)))) # set pour dédupliquer.
        return "\n".join(mermaid_lines)

    def _get_mermaid_node_shape(self, node_type: str, label: str) -> Tuple[str, str]:
        """Helper pour obtenir les délimiteurs de forme Mermaid en fonction du type de nœud."""
        shape_open = "[" ; shape_close = "]" # Forme par défaut (rectangle).
        if node_type == "StartEnd": shape_open, shape_close = "((", "))" # Stade.
        elif node_type == "Decision": shape_open, shape_close = "{", "}" # Losange.
        elif node_type == "Junction": 
            # Si la jonction n'a pas de label ou un label générique "Junction", la rendre petite (cercle).
            if not label or label == "Junction" or label == "#quot;Junction#quot;": 
                shape_open, shape_close = "((", "))" # Petit cercle.
                # safe_label = "" # Rendre la jonction sans texte (déjà géré par le label vide).
            else: # Jonction avec un label spécifique (rare).
                shape_open, shape_close = "(", ")" # Ovale.
        elif node_type == "Return": shape_open, shape_close = "[/", "\\]" # Parallélogramme incliné.
        elif node_type == "Jump": shape_open, shape_close = "((", "))" # Stade (comme StartEnd).
        elif node_type == "IoOperation": shape_open, shape_close = "[/", "\\]" # Parallélogramme pour I/O.
        return shape_open, shape_close

# FIN DU FICHIER EN MODE MODULE


'''
############### Choisir le code à tester ###############
import exemples
selected_code = exemples.defif
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
'''
