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

        # Dictionnaire pour stocker des informations sur les variables affectées à des littéraux
        # Clef:= nom de la variable (str) - Valeur:= tuple (type_ast_node, valeur_reelle_ou_description_type)
        # Ex: "my_string" -> (ast.Constant, "chaîne")
        self.variable_assignments: Dict[str, Tuple[type, Any]] = {}

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
        
        # --- DEBUG ---
        #import inspect
        #caller_name = inspect.stack()[1].function
        #print(f"DEBUG add_node: ID={node_id}, Label='{label}', Type='{node_type}', Called by='{caller_name}'")
        # --- FIN DEBUG ---

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
        """
        Visite une boucle 'for' AST en utilisant une structure détaillée unifiée.
        Si l'itérable est un range() avec des arguments littéraux, il est traité comme une liste explicite.
        """
        iterator_variable_str = ast.unparse(node.target).replace('"', '"')
        iterable_node = node.iter # L'objet AST de l'itérable

        iterable_kind_desc, elements_type_desc, iterable_display_name = \
            self._get_iterable_description(iterable_node)

        # Option pour simplifier si l'itérable est un littéral non vide
        # (ex: "abc", [1,2], range(5) qui n'est jamais vide)
        skip_first_check = False
        if isinstance(iterable_node, (ast.Constant, ast.List, ast.Tuple, ast.Set)): # Littéral itérable
            if isinstance(iterable_node, ast.Constant) and iterable_node.value: # Chaîne non vide
                skip_first_check = True
            elif hasattr(iterable_node, 'elts') and iterable_node.elts: # Liste/Tuple non vide
                skip_first_check = True
        elif isinstance(iterable_node, ast.Call) and \
             isinstance(iterable_node.func, ast.Name) and \
             iterable_node.func.id == 'range':
            # Si _evaluate_range_to_list_str a réussi ET que la liste n'est pas vide
             if "[" in iterable_display_name and iterable_display_name != "[]": # Heuristique !!
                skip_first_check = True
        
        # Un range peut être vide, mais pour la structure, on pourrait le traiter comme non vide initialement
        # si on veut sauter le premier test. Cependant, range(0) est vide, range(2,1) aussi...
        # Il faudrait évaluer les arguments de range pour être sûr.
        # Pour l'instant, on ne saute pas pour range().
        #   pass


        current_parent_for_loop_structure = parent_id
        entry_decision_id = None 

        if not skip_first_check:
            # 1. Première Décision: Y a-t-il des éléments à traiter ?
            # Utiliser une formulation neutre pour le type d'itérable.
            entry_decision_label = f"{iterable_kind_desc.capitalize()} {iterable_display_name}<br>contient des {elements_type_desc}s ?"
            entry_decision_id = self.add_node(entry_decision_label, node_type="Decision")
            self.add_edge(parent_id, entry_decision_id)
            current_parent_for_loop_structure = entry_decision_id
        
        # 2. Initialisation de la variable locale au premier élément
        init_var_label = f"{iterator_variable_str} ← premier {elements_type_desc}<br>de {iterable_display_name}"
        init_var_id = self.add_node(init_var_label, node_type="Process")
        
        if entry_decision_id: # Si la première décision existe (on ne l'a pas sautée)
            self.add_edge(entry_decision_id, init_var_id, "Oui")
        else: # On a sauté la première vérification, connecter directement depuis le parent de la boucle For
            self.add_edge(parent_id, init_var_id)

        # Nœuds pour le re-test et la mise à jour de l'itérateur
        retest_decision_label = f"Encore un {elements_type_desc}<br>dans {iterable_display_name} ?"
        retest_decision_id = self.add_node(retest_decision_label, node_type="Decision")
        
        next_var_label = f"{iterator_variable_str} ← {elements_type_desc} suivant<br>de {iterable_display_name}"
        next_var_id = self.add_node(next_var_label, node_type="Process")

        # --- Connexions et Flux ---
        loop_overall_exit_points: List[str] = []        
        if entry_decision_id:
            # La branche "Non" de entry_decision_id est une sortie de la structure de boucle.
            # L'arête sera créée par visit_body si loop_overall_exit_points contient entry_decision_id.
            loop_overall_exit_points.append(entry_decision_id) 
        
        # Configuration de la pile pour break/continue
        # continue -> va au retest_decision_id (pour vérifier s'il y a un suivant)
        # break -> sort de la boucle (géré par le fait que retest_decision_id est une sortie "Non")
        # retest (après le corps) -> va au retest_decision_id
        self.loop_stack.append((retest_decision_id, retest_decision_id, retest_decision_id))

        # Visiter le corps de la boucle
        body_exit_nodes: List[str] = []
        first_node_of_body: Optional[str] = None
        if node.body:
            nodes_before_body = {nid for nid, _ in self.nodes}
            # Le corps de la boucle commence après l'initialisation de la variable (init_var_id)
            body_exit_nodes = self.visit_body(node.body, [init_var_id]) 
            nodes_after_body = {nid for nid, _ in self.nodes}
            new_nodes_in_body = sorted(list(nodes_after_body - nodes_before_body), key=lambda x: int(x.replace("node", "")))
            if new_nodes_in_body:
                first_node_of_body = new_nodes_in_body[0]
                # S'assurer que l'arête init_var_id -> first_node_of_body est simple (sans label "Oui")
                if (init_var_id, first_node_of_body, "Oui") in self.edges:
                    self.edges.remove((init_var_id, first_node_of_body, "Oui"))
                    self.add_edge(init_var_id, first_node_of_body, "") # Flux direct
                elif (init_var_id, first_node_of_body, "") not in self.edges and \
                     (init_var_id, first_node_of_body, "Non") not in self.edges : # Éviter double arête
                     self.add_edge(init_var_id, first_node_of_body, "")


            # Les sorties normales du corps mènent au nœud de re-test
            for exit_node in body_exit_nodes:
                if exit_node not in self.terminal_nodes:
                    self.add_edge(exit_node, retest_decision_id)
        else: 
            # Corps vide : init_var_id mène directement au retest_decision_id
            self.add_edge(init_var_id, retest_decision_id)
            # body_exit_nodes reste vide, ce qui est correct

        # Connexion de la deuxième décision (retest_decision_id)
        self.add_edge(retest_decision_id, next_var_id, "Oui") # Si encore des éléments, prendre le suivant
        # La branche "Non" de retest_decision_id est une sortie de la structure de boucle.
        loop_overall_exit_points.append(retest_decision_id) 

        # L'élément suivant (next_var_id) retourne au début du traitement du corps.
        if first_node_of_body: # Si le corps n'était pas vide et qu'on a identifié son début
            self.add_edge(next_var_id, first_node_of_body)
        elif node.body : # Corps non vide, mais first_node_of_body non trouvé (ne devrait pas arriver si la logique est bonne)
            print(f"Warning: Impossible de connecter next_var_id au début du corps de la boucle for {iterator_variable_str}")
            self.add_edge(next_var_id, retest_decision_id) # Fallback moins précis, crée une petite boucle sur le test
        else: # Corps vide, next_var_id retourne directement au retest
            self.add_edge(next_var_id, retest_decision_id)

        # Gestion de la clause 'orelse'
        if node.orelse:
            # orelse est exécuté après que retest_decision_id est "Non" (et si pas de break).
            # On doit s'assurer que retest_decision_id n'est plus une sortie directe si orelse existe.
            if retest_decision_id in loop_overall_exit_points:
                loop_overall_exit_points.remove(retest_decision_id)
            
            # Labelliser l'arête retest_decision_id -> début de orelse avec "Non"
            nodes_before_orelse = {nid for nid,_ in self.nodes}
            orelse_exit_nodes = self.visit_body(node.orelse, [retest_decision_id])
            nodes_after_orelse = {nid for nid,_ in self.nodes}
            new_nodes_in_orelse = sorted(list(nodes_after_orelse - nodes_before_orelse), key=lambda x: int(x.replace("node","")))
            
            if new_nodes_in_orelse:
                first_node_orelse  = new_nodes_in_orelse[0]
                if (retest_decision_id, first_node_orelse, "") in self.edges:
                    self.edges.remove((retest_decision_id, first_node_orelse, ""))
                self.add_edge(retest_decision_id, first_node_orelse, "Non") 
            elif not orelse_exit_nodes : # orelse est vide mais existe
                 # La branche "Non" de retest_decision_id doit mener à la suite.
                 # On la remet comme point de sortie.
                 loop_overall_exit_points.append(retest_decision_id)
            
            # Les sorties de orelse sont des sorties globales de la structure for.
            loop_overall_exit_points.extend(orelse_exit_nodes)
        
        self.loop_stack.pop() # Fin de la gestion de cette boucle.
        return list(set(loop_overall_exit_points))
    

    def _visit_for_generic_iterable(self, node: ast.For, parent_id: str, iterator_variable_str: str) -> List[str]:
        """Visite une boucle 'for' avec un itérable générique : PAS un range() explicite.
        Détaille la structure itérable & itérateur pour une description pédagogique.
        Formulations à discuter..."""

        iterable_type_desc, elements_type_desc, iterable_display_name = \
            self._get_iterable_description(node.iter)

        # --- Nœuds de la structure de boucle ---
        # 1. Première Décision: Y a-t-il des éléments ?
        entry_decision_label = f"{iterable_type_desc} '{iterable_display_name}'<br>a des {elements_type_desc}s à traiter ?"
        entry_decision_id = self.add_node(entry_decision_label, node_type="Decision")
        self.add_edge(parent_id, entry_decision_id)

        # 2. Initialisation de la variable locale au premier élément (si True à la première décision de rentrée dans l'itérable)
        init_var_label = f"{iterator_variable_str} ← premier {elements_type_desc}<br>de la {iterable_type_desc} '{iterable_display_name}'"
        init_var_id = self.add_node(init_var_label, node_type="Process")
        # L'arête entry_decision_id --True--> init_var_id sera ajoutée après avoir identifié init_var_id

        # Deux types de nœuds pour la suite de la structure
        # test: on itère ? 
        retest_decision_label = f"Encore un {elements_type_desc} à traiter<br>dans la {iterable_type_desc} '{iterable_display_name}' ?"
        retest_decision_id = self.add_node(retest_decision_label, node_type="Decision")
        # au cas où on itère:
        next_var_label = f"{iterator_variable_str} ← {elements_type_desc} suivant<br>de la {iterable_type_desc} '{iterable_display_name}'"
        next_var_id = self.add_node(next_var_label, node_type="Process")

        # --- Connexions ---
        loop_overall_exit_points: List[str] = []        
        # Connexion de la première décision (entry_decision_id)
        self.add_edge(entry_decision_id, init_var_id, "True") # Si éléments existent, initialiser
        loop_overall_exit_points.append(entry_decision_id)   # La branche "False" de entry_decision_id est une sortie

        # Mettre à jour la pile des boucles
        #1. continue_target: retest_decision_id (on re-teste s'il y a un suivant AVANT de prendre le suivant)
        #2. break_target: retest_decision_id (la sortie "False" de ce test est la sortie de boucle)
        #3. retest_target (après le corps): retest_decision_id
        self.loop_stack.append((retest_decision_id, retest_decision_id, retest_decision_id))

        # 3. VISITER LE CORPS DE LA BOUCLE
        # Le corps commence APRÈS l'initialisation de la variable avec le premier élément (init_var_id).
        body_exit_nodes: List[str] = []
        first_node_of_body: Optional[str] = None

        if node.body:
            nodes_before_body = {nid for nid, _ in self.nodes}
            # Le corps est visité en partant de init_var_id
            body_exit_nodes = self.visit_body(node.body, [init_var_id])
            nodes_after_body = {nid for nid, _ in self.nodes}
            new_nodes_in_body = sorted(
                list(nodes_after_body - nodes_before_body),
                key=lambda x: int(x.replace("node", ""))
            )
            if new_nodes_in_body:
                first_node_of_body = new_nodes_in_body[0]
                # S'assurer que l'arête init_var_id -> first_node_of_body n'a pas de label (ou le bon)
                # visit_body crée cette arête via son premier appel à self.visit.
                # On ne met pas de label "True" ici, c'est un flux direct après init_var_id.
                if (init_var_id, first_node_of_body, "True") in self.edges: # Au cas où une logique l'aurait mis
                    self.edges.remove((init_var_id, first_node_of_body, "True"))
                    self.add_edge(init_var_id, first_node_of_body, "") # Flux direct

            # Les sorties normales du corps mènent au nœud de re-test (retest_decision_id)
            for exit_node in body_exit_nodes:
                if exit_node not in self.terminal_nodes:
                    self.add_edge(exit_node, retest_decision_id)
        else: 
            # Corps vide : init_var_id mène directement au retest_decision_id
            self.add_edge(init_var_id, retest_decision_id)
            body_exit_nodes = [init_var_id] # Pour la logique de retour de boucle

        # Connexion de la deuxième décision (retest_decision_id)
        self.add_edge(retest_decision_id, next_var_id, "True") # Si encore des éléments, prendre le suivant
        loop_overall_exit_points.append(retest_decision_id) # La branche "False" de retest_decision_id est une sortie

        # L'élément suivant (next_var_id) retourne au début du traitement du corps.
        if first_node_of_body: # Si le corps n'était pas vide et qu'on a identifié son début
            self.add_edge(next_var_id, first_node_of_body)
        elif node.body : # Corps non vide, mais first_node_of_body non trouvé (ne devrait pas arriver)
            print(f"Warning: Impossible de connecter next_var_id au début du corps de la boucle for {iterator_variable_str}")
            self.add_edge(next_var_id, retest_decision_id) # Fallback moins précis
        else: # Corps vide, next_var_id retourne directement au retest
            self.add_edge(next_var_id, retest_decision_id)

# AVANT 
        '''
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
        '''

        # Gérer 'orelse' (sortie "Terminée/Vide").
        ## terminated_branch_first_node_id: Optional[str] = None
        
        if node.orelse:
            # orelse est exécuté après que retest_decision_id est False.
            # Donc, la branche "False" de retest_decision_id mène à orelse.
            if retest_decision_id  in loop_overall_exit_points:
                loop_overall_exit_points.remove(retest_decision_id ) # orelse remplace la sortie directe.
            
            # Labelliser l'arête retest_decision_id -> début de orelse avec "False"
            nodes_before_orelse = {nid for nid,_ in self.nodes}
            orelse_exit_nodes = self.visit_body(node.orelse, [retest_decision_id])
            nodes_after_orelse = {nid for nid,_ in self.nodes}
            new_nodes_in_orelse = sorted(list(nodes_after_orelse - nodes_before_orelse), key=lambda x: int(x.replace("node","")))
            
            if new_nodes_in_orelse:
                first_node_orelse  = new_nodes_in_orelse[0]
                if (retest_decision_id, first_node_orelse, "") in self.edges:
                    self.edges.remove((retest_decision_id, first_node_orelse, ""))
                self.add_edge(retest_decision_id, first_node_orelse, "False")
            elif not orelse_exit_nodes : # orelse est vide mais existe
                 # L'arête False de retest_decision_id pointe vers la suite
                 # On doit s'assurer que retest_decision_id est une sortie si orelse est vide
                 loop_overall_exit_points.append(retest_decision_id) 
            # else: Si pas de orelse, la branche "False" de retest_decision_id est déjà une sortie via loop_overall_exit_points.

            # Les sorties de orelse sont des sorties globales.
            loop_overall_exit_points.extend(orelse_exit_nodes)
        
        '''if terminated_branch_first_node_id:
            if (loop_decision_id, terminated_branch_first_node_id, "") in self.edges: 
                self.edges.remove((loop_decision_id, terminated_branch_first_node_id, ""))
            self.add_edge(loop_decision_id, terminated_branch_first_node_id, "Terminée / Vide")
        # elif not node.orelse: L'arête "Terminée / Vide" sera implicite via loop_overall_exit_points.
'''
        self.loop_stack.pop() # Fin de la gestion de cette boucle.
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
        print(f"DEBUG: generic_visit appelée pour {type(node).__name__} (parent: {parent_id})")
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

        value_node = node.value
        value_str_for_label = ast.unparse(value_node).replace('"', '"') if value_node else ""
        
        # Tenter de stocker des informations sur l'affectation pour une inférence de type ultérieure
        for target_node in node.targets:
            if isinstance(target_node, ast.Name): # Cible d'affectation simple (variable).
                var_name = target_node.id
                assigned_value_type_ast = type(value_node) # Le type du noeud AST (ast.Constant, ast.List, etc.)
                # On stocke le type du noeud AST et une représentation de la valeur
                # Pour les constantes, on peut stocker la valeur réelle
                # Pour les listes/tuples, on pourrait stocker une description ou les types des éléments
                if isinstance(value_node, ast.Constant):
                    self.variable_assignments[var_name] = (assigned_value_type_ast, value_node.value)
                elif isinstance(value_node, (ast.List, ast.Tuple, ast.Set)):
                    # Pour les collections, on pourrait analyser les éléments ici ou simplement stocker le type de collection.
                    # Pour l'instant, stockons juste le type AST
                    self.variable_assignments[var_name] = (assigned_value_type_ast, type(value_node).__name__)
                elif isinstance(value_node, ast.Name):
                    source_var_name = value_node.id
                    if source_var_name in self.variable_assignments:
                        # Propager l'information de la variable source
                        self.variable_assignments[var_name] = self.variable_assignments[source_var_name]
                    else:
                        # On ne connaît pas le type de la variable source, donc on ne stocke rien de précis pour var_name
                        self.variable_assignments[var_name] = (ast.Name, "variable (type inconnu)") # Ou autre??
                elif isinstance(value_node, ast.Call):
                    # Tenter d'inférer le type de retour si c'est une fonction connue
                    func_name_str = ast.unparse(value_node.func) # Peut être complexe (ex: obj.method)
                    # Heuristique simple pour les builtins courants
                    if isinstance(value_node.func, ast.Name):
                        called_func_name = value_node.func.id
                        if called_func_name in ['len','int']:
                            self.variable_assignments[var_name] = (ast.Call, "nombre (entier)") # len retourne un int
                        elif called_func_name in ['str', 'upper', 'lower', 'chr', 'type']:
                            self.variable_assignments[var_name] = (ast.Call, "chaîne")
                        elif called_func_name in ['sum', 'min', 'max', 'abs', 'ord', 'float', 'pow']:
                            self.variable_assignments[var_name] = (ast.Call, "nombre")
                        else:
                            self.variable_assignments[var_name] = (ast.Call, f"résultat de {called_func_name}()")
                    else:
                        self.variable_assignments[var_name] = (ast.Call, f"résultat d'appel de fonction")


        # --- Création du noeud pour l'instruction d'assignation elle-même ---
        targets_str_for_label = ", ".join([ast.unparse(t).replace('"', '"') for t in node.targets])
        label_text = f"{targets_str_for_label} = {value_str_for_label}"
        node_type_for_assign_node = "Process" # Type par défaut pour les assignations.


        max_label_length = 60
        if len(label_text) > max_label_length:
             # Tenter de raccourcir la partie droite (valeur) en premier.
             available_len_for_value = max_label_length - len(targets_str) - 6 # Pour " = ..."
             if available_len_for_value > 10 : # Assez de place pour une valeur raccourcie significative.
                 short_value = value_str[:available_len_for_value] + "..." if len(value_str) > available_len_for_value else value_str
                 label_text = f"{targets_str} = {short_value}"
             else: # Sinon, raccourcir le tout.
                 label_text = label_text[:max_label_length-3] + "..."
        
        assign_node_id = self.add_node(label_text, node_type=node_type_for_assign_node)
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
        max_args_display_length = 60 
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


    def _evaluate_range_to_list_str(self, range_args_nodes: List[ast.AST]) -> Optional[str]:
        """
        Tente d'évaluer les arguments d'un ast.Call à range() et de retourner
        la liste de nombres explicite sous forme de chaîne, ou None si l'évaluation échoue.
        Limite le nombre d'éléments pour éviter des chaînes trop longues.
        """
        MAX_RANGE_ELEMENTS_TO_DISPLAY = 10 # Limite pour l'affichage

        args_values = []
        for arg_node in range_args_nodes:
            if isinstance(arg_node, ast.Constant) and isinstance(arg_node.value, int):
                args_values.append(arg_node.value)
            else:
                return None # Un argument n'est pas un entier littéral, on ne peut pas dérouler

        start, stop, step = 0, 0, 1 # Valeurs par défaut Python pour range
        if len(args_values) == 1:
            stop = args_values[0]
        elif len(args_values) == 2:
            start, stop = args_values[0], args_values[1]
        elif len(args_values) == 3:
            start, stop, step = args_values[0], args_values[1], args_values[2]
        else:
            return None # Nombre d'arguments incorrect

        if step == 0:
            return None # step ne peut pas être 0

        result_numbers = []
        current_val = start
        count = 0

        if step > 0:
            while current_val < stop and count < MAX_RANGE_ELEMENTS_TO_DISPLAY:
                result_numbers.append(current_val)
                current_val += step
                count += 1
        else: # step < 0
            while current_val > stop and count < MAX_RANGE_ELEMENTS_TO_DISPLAY:
                result_numbers.append(current_val)
                current_val += step # step est négatif, donc on soustrait
                count += 1
        
        list_str = "[" + ", ".join(map(str, result_numbers))
        if count == MAX_RANGE_ELEMENTS_TO_DISPLAY and \
           ((step > 0 and current_val < stop) or (step < 0 and current_val > stop)):
            list_str += ", ..." # Indiquer que la liste est tronquée
        list_str += "]"
        return list_str


    def _get_iterable_description(self, iterable_node: ast.AST) -> \
                                 Tuple[str, str, str, str, str]:
        """
        Tente de donner une description du type de l'itérable et de ses éléments.
        Retourne: (
            iterable_kind_desc: "la séquence", "la collection", "la variable", "le résultat de func()"
                (neutre pour éviter les problèmes de genre avec le nom de l'itérable)
            elements_type_desc_raw: "caractère", "nombre", "chaîne", "booléen", "variable", "mixte", "élément"
            iterable_display_name: "'abc'", "ma_liste", "range(10)" 
                (nom ou littéral pour affichage)
            article_indefini_element: "un", "une"
            article_defini_element: "le", "la", "l'"
            )
        """
        iterable_kind_desc = "la collection" # Terme générique et neutre
        elements_type_desc_raw = "élément"
        # Par défaut, iterable_display_name est la représentation textuelle de l'itérable.
        # On l'affine pour les noms de variables et les chaînes littérales.
        iterable_display_name = ast.unparse(iterable_node).replace('"',"#quot;")
        article_indefini_element = "un" # par défaut
        article_defini_element = "l'"  # par défaut

        actual_node_to_inspect = iterable_node
        original_iterable_name_if_any = None

        if isinstance(iterable_node, ast.Name):
            original_iterable_name_if_any = iterable_node.id
            iterable_display_name = f"'{iterable_node.id}'" # Nom de la variable
            iterable_kind_desc = "la variable" # Plus spécifique
            if iterable_node.id in self.variable_assignments:
                assigned_ast_type, assigned_value_or_desc = self.variable_assignments[iterable_node.id]
                if assigned_ast_type == ast.Constant and isinstance(assigned_value_or_desc, str):
                    actual_node_to_inspect = ast.Constant(value=assigned_value_or_desc)
                    # iterable_kind_desc reste "la variable", mais on inspecte son contenu
                elif assigned_ast_type == ast.List:
                    actual_node_to_inspect = ast.List(elts=[], ctx=ast.Load()) # Simuler pour type
                    iterable_kind_desc = "la variable (liste)"
                    # Si assigned_value_or_desc est "liste de nombres", on peut l'utiliser pour elements_type_desc
                    if isinstance(assigned_value_or_desc, str) and "liste de" in assigned_value_or_desc:
                        if "nombres" in assigned_value_or_desc: elements_type_desc_raw = "nombre"
                        elif "chaînes" in assigned_value_or_desc: elements_type_desc_raw = "chaîne"
                elif assigned_ast_type == ast.Tuple:
                    actual_node_to_inspect = ast.Tuple(elts=[], ctx=ast.Load())
                    iterable_kind_desc = "la variable (tuple)"
                # ... (ajouter Set, Dict si nécessaire pour variable_assignments) ...
                elif assigned_ast_type == ast.Call and isinstance(assigned_value_or_desc, str): # ex: "résultat de len()"
                    # elements_type_desc_raw reste "élément"
                    # Déterminer les articles pour "élément"
                    article_indefini_element = "un"; article_defini_element = "l'"
                    iterable_kind_desc = f"la variable (contenu: {assigned_value_or_desc})"
                    elements_type_desc_raw = "élément" # On ne sait pas plus
                    return iterable_kind_desc, elements_type_desc_raw, iterable_display_name.strip("'"), article_indefini_element, article_defini_element


        # Analyse de actual_node_to_inspect (qui peut être l'original ou un reconstitué/simulé)
        if isinstance(actual_node_to_inspect, ast.Constant):
            if isinstance(actual_node_to_inspect.value, str):
                iterable_kind_desc = "la chaîne" if not original_iterable_name_if_any else iterable_kind_desc # Garder "la variable" si c'en était une
                elements_type_desc_raw = "caractère" # forcément
                # Mettre des guillemets simples autour du littéral chaîne pour l'affichage
                escaped_value = actual_node_to_inspect.value.replace('"','#quot;')
                iterable_display_name = f"{escaped_value}"
        
        elif isinstance(actual_node_to_inspect, (ast.List, ast.Tuple)):
            if isinstance(actual_node_to_inspect, ast.List):
                iterable_kind_desc = "la liste" if not original_iterable_name_if_any else iterable_kind_desc
            else: # ast.Tuple
                iterable_kind_desc = "le tuple" if not original_iterable_name_if_any else iterable_kind_desc

            if hasattr(actual_node_to_inspect, 'elts') and actual_node_to_inspect.elts:
                element_types_seen = set()
                for elt_node in actual_node_to_inspect.elts:
                    current_el_type_str = "mixte" 
                    if isinstance(elt_node, ast.Constant):
                        if isinstance(elt_node.value, (int, float)): 
                            current_el_type_str = "nombre"
                        elif isinstance(elt_node.value, str): 
                            # Différencier caractère de chaîne
                            if len(elt_node.value) == 1:
                                current_el_type_str = "caractère"
                            else:
                                current_el_type_str = "chaîne"
                        elif isinstance(elt_node.value, bool): 
                            current_el_type_str = "booléen"
                    elif isinstance(elt_node, ast.Name): 
                        current_el_type_str = "variable"
                    element_types_seen.add(current_el_type_str)

                if len(element_types_seen) == 1: 
                    elements_type_desc_raw = element_types_seen.pop()
                elif element_types_seen: 
                    elements_type_desc_raw = "élément mixte"
                # else: elements_type_desc reste "élément" (liste/tuple vide ou types non identifiables)
            else: # Liste ou tuple vide
                elements_type_desc_raw = "élément"

        elif isinstance(actual_node_to_inspect, ast.Tuple):
            iterable_kind_desc = "le tuple" if not original_iterable_name_if_any else iterable_kind_desc
            elements_type_desc_raw = "élément" # Peut être affiné

        elif isinstance(actual_node_to_inspect, ast.Set):
            iterable_kind_desc = "l'ensemble" if not original_iterable_name_if_any else iterable_kind_desc
            elements_type_desc_raw = "élément" # Peut être affiné

        elif isinstance(actual_node_to_inspect, ast.Dict):
            iterable_kind_desc = "le dictionnaire" if not original_iterable_name_if_any else iterable_kind_desc
            elements_type_desc_raw = "clé"

        elif isinstance(actual_node_to_inspect, ast.Call) and \
             isinstance(actual_node_to_inspect.func, ast.Name) and \
             actual_node_to_inspect.func.id == 'range':
            # Tenter de dérouler le range
            evaluated_range_str = self._evaluate_range_to_list_str(actual_node_to_inspect.args)
            if evaluated_range_str:
                iterable_kind_desc = "la séquence" # Ou "la liste (générée par range)"
                elements_type_desc_raw = "nombre"
                iterable_display_name = evaluated_range_str # Affiche la liste explicite
            else: # N'a pas pu dérouler (args non littéraux)
                iterable_kind_desc = "la séquence (range)"
                elements_type_desc_raw = "nombre"
                # iterable_display_name est déjà ast.unparse(iterable_node)

        elif isinstance(actual_node_to_inspect, ast.Call): # Autre appel de fonction
            if iterable_kind_desc == "la collection" or iterable_kind_desc == "l'itérable": # Si pas déjà mis par la logique de variable
                func_name = ast.unparse(actual_node_to_inspect.func).replace('"', '#quot;')
                iterable_kind_desc = f"le résultat de {func_name}()"
            # elements_type_desc reste "élément"
        
        # Si c'était une variable à l'origine et qu'on n'a pas pu déterminer son type de contenu plus précisément
        if original_iterable_name_if_any and iterable_kind_desc in ["la collection", "l'itérable"]:
            iterable_kind_desc = f"la variable"

        # Déterminer les articles en fonction de elements_type_desc_raw
        if elements_type_desc_raw == "caractère": article_indefini_element = "un"; article_defini_element = "le"
        elif elements_type_desc_raw == "nombre": article_indefini_element = "un"; article_defini_element = "le"
        elif elements_type_desc_raw == "chaîne": article_indefini_element = "une"; article_defini_element = "la"
        elif elements_type_desc_raw == "booléen": article_indefini_element = "un"; article_defini_element = "le"
        elif elements_type_desc_raw == "clé": article_indefini_element = "une"; article_defini_element = "la"
        # "variable", "élément mixte", "élément" restent avec "un" et "l'" par défaut.
        
        # Retourner iterable_display_name.strip("'") si c'était un nom de variable,
        # mais pas si c'est un littéral chaîne qui doit garder ses guillemets.
        # La logique actuelle pour iterable_display_name le gère déjà bien.
        return iterable_kind_desc, elements_type_desc, iterable_display_name, \
               article_indefini_element, article_defini_element
    

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
        display_edges = set(self.edges)  # Copie pour modification

        ###################
        mermaid_lines = ["graph TD"] # Orientation de haut en bas.
        
        # Définitions de style pour les types de nœuds.
        mermaid_lines.extend([
            "    classDef StartEnd fill:#555,stroke:#fff,stroke-width:2px;",
            "    classDef Decision fill:#555,stroke:#fff,stroke-width:2px;",
            "    classDef Process fill:#555,stroke:#fff,stroke-width:2px;",
            "    classDef IoOperation fill:#555,stroke:#fff,stroke-width:2px;",
            "    classDef Junction fill:#555,stroke:#fff,stroke-width:1px;", # Cercle pour jonction.
            "    classDef Return fill:#555,stroke:#fff,stroke-width:2px;",
            "    classDef Jump fill:#555,stroke:#fff,stroke-width:2px;"
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

##############
# --- correction finale des labels d'arêtes sortantes des décisions ---
        # pas réussi à m'assurer que les arêtes sortantes des décisions aient un label "False"
        # Si une décision a une arête sortante sans label, on la relabelise en "False".
        decision_nodes = {nid for nid, typ in self.node_types.items() if typ == "Decision"}
        relabeled_edges = set()
        for from_node, to_node, label in list(display_edges):
            if from_node in decision_nodes and label == "":
                # Relabel en "False"
                display_edges.remove((from_node, to_node, label))
                relabeled_edges.add((from_node, to_node, "False"))
        display_edges = display_edges | relabeled_edges
# --- fin de la correction des labels d'arêtes sortantes des décisions ---      
        

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
        print("\n--- DEBUG: Arêtes envoyées à Mermaid ---")
        for e in display_edges:
            print(e)
        return "\n".join(mermaid_lines)

    def _get_mermaid_node_shape(self, node_type: str, label: str) -> Tuple[str, str]:
        """Helper pour obtenir les délimiteurs de forme Mermaid en fonction du type de nœud."""
        shape_open = "[" ; shape_close = "]" # Forme par défaut (rectangle).
        if node_type == "StartEnd": shape_open, shape_close = "(((", ")))" # cercle doublé
        elif node_type == "Decision": shape_open, shape_close = "{", "}" # Losange.
        elif node_type == "Junction": 
            # Si la jonction n'a pas de label ou un label générique "Junction", la rendre petite (cercle).
            if not label or label == "Junction" or label == "#quot;Junction#quot;": 
                shape_open, shape_close = "((", "))" # Petit cercle.
                # safe_label = "" # Rendre la jonction sans texte (déjà géré par le label vide).
            else: # Jonction avec un label spécifique.
                shape_open, shape_close = "((", "))"
        elif node_type == "Return": shape_open, shape_close = "[(", ")]" # Parallélogramme incliné.
        elif node_type == "Jump": shape_open, shape_close = "((", "))" # Stade (comme StartEnd).
        elif node_type == "IoOperation": shape_open, shape_close = "[/", "/]" # Parallélogramme pour I/O.
        return shape_open, shape_close


############### Choisir le code à tester ###############
import exemples
selected_code = exemples.focus
########################################################

# --- Génération et Affichage ---
print(f"--- Code Python analysé ---")
print(selected_code)

cfg = ControlFlowGraph(selected_code)
# Lance la visite à partir de la racine de l'AST (le module)
cfg.visit(cfg.tree, None) # Le parent initial est None

print(ast.dump(cfg.tree))

print(cfg.to_mermaid())
print("\n--- Mermaid Généré ---")

'''# Affiche les noeuds et arêtes pour le débogage
print("\n--- Noeuds (ID, Label) ---")
for n in cfg.nodes:
     print(n)
print("\n--- Arêtes (From, To, Label) ---")
for e in sorted(list(cfg.edges)): # Trié pour la lisibilité
     print(e)
print("\n--- Noeuds Terminaux ---")
print(cfg.terminal_nodes)
print("\n--- Fin des impressions CFG ---")'''
# Test la version Python 3.9+ avec ast.unparse
print(ast.unparse(ast.parse(selected_code)))

print(cfg.variable_assignments)