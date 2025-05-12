import ast
from typing import List, Dict, Set, Tuple, Optional # Optional pour les types de retour

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
        """Le fait d'ajouter Break/Continue à terminal_nodes permet au visiteur (visit_body ou à la fonction visit 
        qui l'appelle) de savoir qu'il ne doit pas chercher à connecter ce nœud à l'instruction suivante dans le 
        bloc source"""
        self.node_types: Dict[str, str] = {}
    
    def get_node_id(self) -> str:
        self.node_counter += 1
        return f"node{self.node_counter}"

    def add_node(self, label: str, node_type: str = "Process") -> str: 
        """Ajoute un noeud avec un label et un type (pour Mermaid)."""
        node_id = self.get_node_id()
        self.nodes.append((node_id, label))
        self.node_labels[node_id] = label # Ajout pour recherche facile
        # Stocke le type pour faciliter le rendu Mermaid selon SEMANTIQUE déterminée lors de l'analyse AST, 
        # et pas selon contenu textuel
        self.node_types[node_id] = node_type # Stocker le type
        return node_id

    def add_edge(self, from_node: str, to_node: str, label: str = ""):
        """Ajoute une arête au graphe, évite les doublons exacts."""
        # Vérification simple pour éviter les boucles immédiates sur soi-même sans label (sauf si voulu)
        if from_node == to_node and not label:
             print(f"Warning: Tentative d'ajout d'une boucle sur {from_node} sans label.")
             return
        # Vérification pour ne pas ajouter d'arête depuis un noeud terminal connu
        if from_node in self.terminal_nodes:
            print(f"Debug: Ignored edge from terminal node {from_node} ({self.node_labels.get(from_node)}) to {to_node}") #
            return
        # Vérification que les noeuds existent (optionnel mais bon pour debug)
        if from_node not in self.node_labels or to_node not in self.node_labels:
            print(f"Warning: Tentative d'ajout d'arête entre noeuds non existants: {from_node} -> {to_node}")
            return

        self.edges.add((from_node, to_node, label))

    def _is_terminal(self, node: ast.AST) -> bool:
        """
        Vérifie si un noeud AST représente une instruction qui interrompt
        le flux d'exécution séquentiel local (ne continue pas à l'instruction suivante).
        Ceci inclut Return (termine la fonction) et Break/Continue (sautent ailleurs).
        """
        return isinstance(node, (ast.Return, ast.Break, ast.Continue))
    

    def visit_body(self, body: List[ast.AST], entry_node_ids: List[str]) -> List[str]:
        """
        Visite une séquence d'instructions (un "body").
        Prend une liste de noeuds d'entrée possibles.
        Retourne une liste de noeuds de sortie (d'où le flux peut continuer).
        """
        current_node_ids = list(entry_node_ids) # Copie pour éviter de modifier l'original

        for i, stmt in enumerate(body):
            next_node_ids = [] # Liste pour stocker les noeuds de sortie de cette instruction
            # Si c'est la dernière instruction du body, on peut marquer la sortie comme terminale
            # (par exemple, un return dans une fonction ou un break dans une boucle)
            is_last_stmt = (i == len(body) - 1) 
            parents_to_process = list(current_node_ids)
            current_node_ids = [] # Réinitialiser pour collecter les sorties de cette étape

            for parent_id in parents_to_process:
            # Pour chaque noeud parent possible de cette instruction

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
        Méthode centrale de visite d'un noeud AST.

        Cette méthode délègue le traitement spécifique (création de noeud graphe,
        ajout d'arête depuis parent_id) à une méthode `visit_NodeType`.

        Elle gère ensuite la logique de continuation du flux :
        - Si le noeud AST est un 'terminal' (Return, Break, Continue),
          elle marque le noeud graphe correspondant comme tel et retourne une liste vide,
          indiquant l'arrêt du flux séquentiel local.
        - Sinon, elle retourne la liste des noeuds graphes de sortie fournis par le
          visiteur spécifique, qui représentent les points de continuation possibles.

        Args:
            node: Le noeud AST à visiter.
            parent_id: L'ID du noeud parent *unique* qui mène séquentiellement à ce noeud AST.

        Returns:
            Une liste des ID des noeuds graphes qui représentent les sorties
            séquentielles de ce noeud. Une liste vide signifie que le chemin
            s'arrête ici (Return) ou saute ailleurs (Break, Continue) et ne
            continue pas à l'instruction suivante du bloc source.
        """
        method = f'visit_{type(node).__name__}' #on construit le nom de la méthode à appeler
        visitor = getattr(self, method, self.generic_visit) #on récupère la méthode, sinon generic_visit

        # Appel de la méthode de visite appropriée
        # Le visiteur spécifique est responsable de :
        # 1. Créer le(s) noeud(s) graphe(s) pour représenter 'node'.
        # 2. Ajouter la/les arêtes depuis 'parent_id' vers le(s) noeud(s) créé(s).
        # 3. Retourner une liste des ID des noeuds graphes qui constituent les points
        #    de sortie *séquentielle* de cette instruction/structure.
        exit_nodes: List[str] = visitor(node, parent_id)

        ############## Gestion centralisée des noeuds qui stoppent le flux séquentiel
        # Vérifie si le noeud AST original est de type Return, Break, ou Continue.
        if self._is_terminal(node):
            """
            Convention: Pour ces noeuds (Return, Break, Continue), le visiteur spécifique 
            (ex: visit_Return) doit avoir créé *un seul* noeud graphe et doit retourner 
            une liste contenant uniquement l'ID de ce noeud (ex: [return_id]).
            """
            if exit_nodes: # Vérifie que le visiteur a bien retourné l'ID attendu.
                created_node_id = exit_nodes[0]
                # C'est ici, dans la méthode `visit` centrale, que nous ajoutons l'ID du noeud 
                # (qui représente notre Return, Break, ou Continue) à l'ensemble `self.terminal_nodes`.
                # Cela le marque comme un point d'arrêt pour le flux *séquentiel*, indiquant
                # qu'il ne faut pas le connecter à l'instruction suivante dans le code source.
                self.terminal_nodes.add(created_node_id)
            else:
                # Si exit_nodes est vide, c'est inattendu pour un noeud terminal, logguer un avertissement.
                print(f"Warning: Visiteur pour noeud terminal {type(node).__name__} n'a pas retourné d'ID.")

            # Indiquer à l'appelant (souvent `visit_body`) qu'il n'y a pas de sortie séquentielle
            # depuis ce noeud terminal. Le flux s'arrête (Return) ou saute (Break/Continue).
            return []

        # Si le noeud AST n'est pas un terminal (ex: Assign, If, For, etc.),
        # on retourne simplement la liste des noeuds de sortie séquentielle
        # fournie par le visiteur spécifique. L'appelant (ex: `visit_body`) utilisera
        # ces noeuds comme points de départ pour l'instruction suivante.
        return exit_nodes


    def connect_finals_to_end(self, end_id: str):
        """
        Connecte tous les noeuds qui n'ont pas d'arête sortante connue (et ne sont pas 'End' ou déjà terminaux)
        au noeud 'End' final du graphe principal (Module/Fonction).
        """
        # Noeuds qui sont sources d'une arête
        source_nodes = set(from_node for from_node, _, _ in self.edges)
        # Noeuds qui sont des cibles d'une arête
        target_nodes = set(to_node for _, to_node, _ in self.edges)

        for node_id, label in self.nodes:
            # Ne pas connecter 'End' à lui-même
            if node_id == end_id:
                continue
            # Ne pas connecter un noeud déjà marqué comme terminal 
            # (pour le moment: Return, Break, Continue)
            if node_id in self.terminal_nodes:
                continue   
            """ Sans cette vérification ci-dessus, connect_finals_to_end pourrait incorrectement 
                 le connecter au End global, alors que son flux doit aller ailleurs (sortie de
                  boucle ou début d'itération)"""
             # Si un noeud n'est la source d'aucune arête sortante...
            if node_id not in source_nodes:
                 # ...et qu'il n'est pas le noeud de fin lui-même, le connecter à la fin.
                # print(f"Debug: Connecting final node {node_id} ({label}) to End node {end_id}")
                self.add_edge(node_id, end_id)


    def visit_Module(self, node: ast.Module, parent_id: list = None) -> list: # parent_id non utilisé ici
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
        return [end_id] # On pourrait retourner une liste vide aussi?


    def visit_FunctionDef(self, node: ast.FunctionDef, parent_id: str) -> List[str]:
        # Un noeud pour la définition elle-même (séparé du flux d'exécution de l'appelant)
        # On pourrait choisir de le connecter au flux principal ou de le représenter différemment??
        # POUR LE MOMENT: PAS 100% SATISFAISANT
        # si la défintion de fonction fait jsute partie du script sans être le script
        # alors el flux qui définit la fonction n'est pas inséré dans le flux principal mais on rend visible 
        # un élément "définition de fonction" et chaque élément qui appelle pourra être syntaxé différemment 
        # Si le script := 'FunctionDef' alors on rajoute un mini-flux avec son 'start--end' connecté par la fin 
        # pour montrer où la fonction retourne.
        # TO DO: corriger bug de l'arête terminale ajoutée par défaut
        # TO DO : ajouter affichage appels récursifs ??

        func_def_id = self.add_node(f"Définition de Fonction<br> {node.name}(...)", node_type="SubroutineDefinition")
        '''MOD
        self.add_edge(parent_id, func_def_id)'''
        if parent_id:
            # Connecter la définition de la fonction au parent
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
            self.add_edge(node_id, func_end_id)
        self.connect_finals_to_end(func_end_id) # Connecter les retours non connectés
        return [func_def_id] # WARNING La définition de fonction elle-même continue le flux principal.


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
        
        # Objectif ici:
        # Savoir si tous les chemins de la branche d’un 'if' se terminent par un nœud terminal (Return, Break, ou Continue)
        # Si all_true_terminal et all_false_terminal sont tous deux True alors :
        # toutes les branches du if se terminent (aucun chemin ne continue après le if) alors :
        # On peut alors ne pas créer de nœud de jonction inutile après le if.        
        if node.body:
            all_true_terminal = all(n in self.terminal_nodes for n in true_exit_nodes)
        else: 
            all_true_terminal = True #la branche n'existe pas: faut initialiser explicitement à True
        #idem branche Flase
        if node.orelse:
            all_false_terminal = all(n in self.terminal_nodes for n in false_exit_nodes)
        else:
            all_false_terminal = True

       #######################
        '''
        option A
        
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
        '''
        ###########################
        '''
        option B
        '''
        if all_true_terminal and all_false_terminal:
            # Toutes les branches sont terminales, la jonction est inutile
            return []
        else:
            # Au moins une branche peut continuer, la jonction est utile
            return [join_id]
    ########################### 

    def visit_For(self, node: ast.For, parent_id: str) -> List[str]:
        iterator_str = ast.unparse(node.target).replace('"', '"') # la variable de boucle
        iterable = ast.unparse(node.iter).replace('"', '"') # PAS l'objet itérable !!!!!
        iterable_node = node.iter
        # CAS DU FOR IN RANGE range : identifier cas range(b) ou range(a, b) ou range(a, b, c) ... => identifer step, nb_iter
        # nb_paramètres = 1 ou 2 ou 3
        
        # --- Cas spécifique: for {iterator} in range(...) ---
        # ATTENTION ast.unparse(node.iter) convertit en STRING l'objet node.iter (eg. un ast.Call)
        # donc isinstance(iterable, ast.Call) JAMAIS VRAI
        if isinstance(iterable_node, ast.Call) and isinstance(iterable_node.func, ast.Name) and \
           iterable_node.func.id == 'range':

            # Extraire les arguments de range()
            range_args = iterable_node.args
            start_val_str = "0" # Valeur par défaut si 1 seul argument := range(stop)
            stop_val_str = ""   # sera remplacée poru sûr
            step_val_str = "1"  # Valeur par défaut du step

            if len(range_args) == 1: # range(stop)
                stop_val_str = ast.unparse(range_args[0])
            elif len(range_args) >= 2: # range(start, stop, [step])
                start_val_str = ast.unparse(range_args[0])
                stop_val_str = ast.unparse(range_args[1])
                if len(range_args) == 3:
                    step_val_str = ast.unparse(range_args[2])
            else:
                # Cas de range() invalide, fallback vers la méthode générique
                print(f"Warning: Appel à range() avec un nombre d'arguments inattendu: {len(range_args)}. Fallback.")
                return self._generic_visit(node, parent_id)
            
            #gestion du nœud graphe d'initialisation de l'itérateur
            init_label = f"{iterator_str} = {start_val_str}"
            init_node_id = self.add_node(init_label, node_type="Process")
            self.add_edge(parent_id, init_node_id)

            #gestion du nœud graphe dela condition de boucle
            # en fait l'écriture de al condition dépend de si 'step' est <0 ou >0 ...
            # PROBLEME : si 'stop' est stockée dans une variable !!!
            # heuristique: si step >0 alors on utilise {i} < {stop} sinon {i} > {stop}
            condition_op = "<"
            try:
                # Tenter d'évaluer step si c'est une constante numérique
                # Note: step_val_str vient de ast.unparse, il faut être prudent avec literal_eval
                # Si step_val_str est "var_step" alors literal_eval échoue!!
                # On ne peut évaluer que si c'est un littéral
                temp_step_for_eval = step_val_str.replace('"', '') # Enlever l'échappement pour literal_eval
                step_numeric = ast.literal_eval(temp_step_for_eval)
                if isinstance(step_numeric, (int, float)) and step_numeric < 0:
                    condition_op = ">" # Ou plutôt, la condition de continuation serait i > stop et la condition d'arrêt i <= stop.
                                       # Gardons < pour le label du losange, c'est la condition de *continuation* la plus courante à visualiser.
            except (ValueError, SyntaxError, TypeError):
                pass # Impossible d'évaluer step, on garde "<"

            loop_cond_label = f"{iterator_str} {condition_op} {stop_val_str}"
            loop_cond_id = self.add_node(loop_cond_label, node_type="Decision")
            self.add_edge(init_node_id, loop_cond_id)

            '''MOD
            loop_id = self.add_node(f"For {iterator} in {iterable}", node_type="Decision") # Considéré comme un point de décision/entrée
            self.add_edge(parent_id, loop_id)'''

            # Noeud de sortie de boucle (après terminaison normale)
            exit_node_label = f"Sortie de boucle For <br> {iterator_str}"
            exit_node_id = self.add_node(exit_node_label, node_type="Junction")
            self.add_edge(loop_cond_id, exit_node_id, "False/Terminée") # Arête pour sortie normale

            #gestion du nœud d'incrémentation de l'itérateur
            increment_label = f"{iterator_str} = {iterator_str} + {step_val_str}"
            increment_node_id = self.add_node(increment_label, node_type="Process")
            
            # Empiler les informations de la boucle pour Break/Continue
            '''MOD
            self.loop_stack.append((loop_id, exit_node_id))'''
            # 'Continue' doit sauter au noeud d'incrémentation.
            # 'Break' doit sauter à exit_node_id.
            # Le point de retour après incrémentation est loop_cond_id.
            self.loop_stack.append((increment_node_id, exit_node_id, loop_cond_id))

            # Visiter le corps de la boucle, en partant de l'entrée de boucle (loop_id)
            '''MOD
            body_exit_nodes = self.visit_body(node.body, [loop_id])'''

            # Visiter le corps de la boucle
            # Le corps commence si la condition (loop_cond_id) est "True".
            body_exit_nodes = self.visit_body(node.body, [loop_cond_id])
            # Attacher le label "True" à la première arête sortant de loop_cond_id vers le corps
            if node.body:
                self._label_first_edge_from_decision(loop_cond_id, exit_node_id, "True")

            # Connecter les sorties normales du corps de boucle au début de la boucle pour la prochaine itération
            #MAINTENANT CONNECTÉE A L'INCREMENTATION
            for exit_node in body_exit_nodes:
                if exit_node not in self.terminal_nodes: # Ne pas reconnecter depuis Return, Break, Continue
                    '''MOD
                    self.add_edge(exit_node, loop_id, "itération suivante")'''
                    self.add_edge(exit_node, increment_node_id) # Connecter au noeud d'incrémentation
            self.add_edge(increment_node_id, loop_cond_id, "itération suivante")

            # Gérer la branche 'else' de la boucle (exécutée si la boucle termine sans 'break')
            # TODO
            if node.orelse:
                    # La branche 'else' est exécutée après la sortie normale de la boucle (pas après un break)
                    # Donc, elle part de 'exit_node_id' si on considère que 'exit_node_id' est la sortie *avant* le 'else'.
                    # Ou, plus simplement, elle part de l'arête "Terminée" (False) du loop_cond_id,
                    # mais avant le 'exit_node_id' final.
                    # Pour l'instant, connectons-la après le 'exit_node_id' si elle existe.
                    # Cela nécessite de repenser 'exit_node_id' comme la sortie *après* le 'else'.
                    # Solution plus simple:
                    #   LoopCond -- False --> ElseBodyStart
                    #   ElseBodyEnd --> FinalLoopExit
                    #   LoopCond -- (si pas de else) False --> FinalLoopExit
                    #   Break --> FinalLoopExit
                    # Pour l'instant, on ignore le 'orelse' pour For, car sa sémantique est un peu complexe à visualiser simplement.
                    # print(f"Warning: La branche 'orelse' des boucles 'for' n'est pas encore gérée visuellement.")
                    pass
            
            self.loop_stack.pop()
            # La sortie séquentielle après la boucle est le noeud de sortie de boucle
            return [exit_node_id]
            
        else:
            # --- Cas générique: for {target} in {iterable} ---
            # Si l'itérable n'est pas un range, on le traite comme un itérable générique.
            return self._visit_for_generic_iterable(node, parent_id, iterator_str)

    def _visit_for_generic_iterable(self, node: ast.For, parent_id: str, iterator_str: str) -> List[str]:
        """
        Gère les boucles 'for' avec des itérables non-'range' (listes, etc.).
        Représentation simplifiée.
        """
        iterable_str = ast.unparse(node.iter).replace('"', '"')
        loop_decision_label = f"For {iterator_str} in {iterable_str}"
        loop_decision_id = self.add_node(loop_decision_label, node_type="Decision")
        self.add_edge(parent_id, loop_decision_id)

        exit_node_id = self.add_node(f"Sortie de boucle For <br>{iterator_str}", node_type="Junction")
        # Pour un itérable générique, la condition "Terminée" est quand l'itérable est vide.
        self.add_edge(loop_decision_id, exit_node_id, "Terminée / Vide")

        # Pour 'continue' dans un for générique, on revient au test de la boucle.
        # Pour 'break', on va à la sortie.
        self.loop_stack.append((loop_decision_id, exit_node_id, loop_decision_id)) # (continue_target, break_target, retest_target)

        # Le corps de la boucle est exécuté pour chaque élément.
        body_exit_nodes = self.visit_body(node.body, [loop_decision_id])
        if node.body:
            self._label_first_edge_from_decision(loop_decision_id, exit_node_id, "itération")


        # Connecter les sorties normales du corps de boucle au début de la boucle pour la prochaine itération
        for exit_node in body_exit_nodes:
            self.add_edge(exit_node, loop_decision_id) # Pas de label "itération suivante" explicite ici, implicite

        # Gérer 'orelse' (ignoré pour l'instant pour simplicité)
        # if node.orelse:
        #     print(f"Warning: La branche 'orelse' des boucles 'for' génériques n'est pas encore gérée visuellement.")

        self.loop_stack.pop()
        return [exit_node_id]
    

    def _label_first_edge_from_decision(self, decision_node_id: str, other_exit_node_id: Optional[str], label_to_add: str):
        """
        Helper pour trouver la première arête sortant d'un noeud de décision
        vers le corps (et non vers une autre sortie comme la sortie de boucle ou la branche else)
        retire l'arête existante (supposée sans label) et en ajoute une nouvelle avec le label désiré ("True", "Suivant").
        heuristique : la "première" est basée sur le plus petit ID numérique du nœud cible"""
        first_body_edge_target = None
        # Trouver toutes les arêtes sortant du noeud de décision
        candidate_edges = [(f, t, lbl) for f, t, lbl in self.edges if f == decision_node_id]

        # Filtrer celles qui ne vont pas vers une sortie déjà connue (comme exit_node_id pour False/Terminée)
        # et qui n'ont pas déjà un label (ou un label différent de celui qu'on veut ajouter)
        potential_body_starts = []
        for f, t, lbl in candidate_edges:
            if t != other_exit_node_id: # Ne pas prendre l'arête vers la sortie "False" ou "Terminée"
                # Si l'arête n'a pas de label ou un label différent, c'est un candidat
                if not lbl or lbl != label_to_add:
                    potential_body_starts.append(t)

        if potential_body_starts:
            # Heuristique: prendre le noeud avec le plus petit ID numérique comme "premier"
            first_body_edge_target = min(potential_body_starts, key=lambda x: int(x.replace("node", "")))

        if first_body_edge_target:
            edge_to_modify = (decision_node_id, first_body_edge_target, "") # Chercher l'arête sans label
            if edge_to_modify in self.edges:
                self.edges.remove(edge_to_modify)
                self.add_edge(decision_node_id, first_body_edge_target, label_to_add)
            else:
                # Si l'arête sans label n'existe pas (peut-être déjà labellisée par une autre logique),
                # on vérifie si une arête avec un label différent existe, ou on ajoute la nouvelle.
                # Pour simplifier, on ajoute juste la nouvelle si l'arête sans label n'est pas trouvée.
                # Cela pourrait créer des arêtes multiples si une arête déjà labellisée existe.
                # Une logique plus robuste vérifierait si une arête (decision_node_id, first_body_edge_target, ANY_LABEL) existe.
                # Pour l'instant, on assume qu'on labellise une arête initialement sans label.
                # Si l'arête (decision_node_id, first_body_edge_target, label_to_add) n'existe pas déjà:
                if not (decision_node_id, first_body_edge_target, label_to_add) in self.edges:
                    self.add_edge(decision_node_id, first_body_edge_target, label_to_add)

    def visit_While(self, node: ast.While, parent_id: str) -> List[str]:
        condition = ast.unparse(node.test).replace('"', '"')
        while_id = self.add_node(f"While {condition}", node_type="Decision")
        self.add_edge(parent_id, while_id)

        # Noeud de sortie quand la condition est fausse
        exit_node_id = self.add_node("Sortie de boucle While ({condition})", node_type="Junction")
        self.add_edge(while_id, exit_node_id, "False") # Condition fausse -> sortie

        # Empiler pour Break/Continue
        self.loop_stack.append((while_id, exit_node_id, while_id))

        body_exit_nodes = []
        if node.body:
            body_exit_nodes = self.visit_body(node.body, [while_id])
            self._label_first_edge_from_decision(while_id, exit_node_id, "True")

            for exit_node in body_exit_nodes:
                self.add_edge(exit_node, while_id) # Retour pour la prochaine itération (pas de label "itération suivante" ici)

        # Gérer 'orelse' (ignoré pour l'instant pour simplicité)
        # if node.orelse:
        #     print(f"Warning: La branche 'orelse' des boucles 'while' n'est pas encore gérée visuellement.")

        self.loop_stack.pop()
        return [exit_node_id]

    def visit_Return(self, node: ast.Return, parent_id: str) -> List[str]:
        value = ast.unparse(node.value).replace('"', '"') if node.value else ""
        return_id = self.add_node(f"Return {value}", node_type="Return")
        self.add_edge(parent_id, return_id)
        '''MOD
        self.terminal_nodes.add(return_id) # Marquer comme terminal''' #déplacé dans visit()
        # Retourne l'ID du noeud créé, mais la visite globale le traitera comme terminal (retournera [])
        return [return_id]

    def visit_Break(self, node: ast.Break, parent_id: str) -> List[str]:
        break_id = self.add_node("Break", node_type="Jump")
        self.add_edge(parent_id, break_id)
        ''' MOD
        self.terminal_nodes.add(break_id) # Marquer comme terminal pour son chemin''' #déplacé dans visit()

        if self.loop_stack:
            _, loop_exit_target, _ = self.loop_stack[-1] # (continue_target, break_target, retest_target)
            self.add_edge(break_id, loop_exit_target)
        else:
            # Break en dehors d'une boucle - erreur Python, mais on peut le gérer
             print("Warning: 'break' outside loop detected.")
             # Connecter à rien de spécifique ou à un noeud d'erreur ? Pour l'instant, il termine juste ce chemin.

        return [break_id] # Traité comme terminal par visit()

    def visit_Continue(self, node: ast.Continue, parent_id: str) -> List[str]:
        continue_id = self.add_node("Continue", node_type="Jump")
        self.add_edge(parent_id, continue_id)
        '''MOD
        self.terminal_nodes.add(continue_id) # Marquer comme terminal pour son chemin''' #déplacé dans visit()

        if self.loop_stack:
            loop_continue_target, _, _ = self.loop_stack[-1] # (continue_target, break_target, retest_target)
            self.add_edge(continue_id, loop_continue_target)
        else:
            # Continue en dehors d'une boucle - erreur Python
             print("Warning: 'continue' outside loop detected.")

        return [continue_id] # Traité comme terminal par visit()

    def generic_visit(self, node: ast.AST, parent_id: str) -> List[str]:
        # Pour les noeuds simples (expressions, etc.)
        try:
            label = ast.unparse(node).replace('"', '"')
            node_type = "Process" # Type par défaut
            if isinstance(node, ast.Pass):
                label = "Pass" # Label plus propre pour Pass
            # ... (autres cas spécifiques si nécessaire) ...
            
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
        node_type = "Process" # Par défaut
        
        # --- Logique de détection de type d'appel (à réintégrer/adapter de votre version précédente) ---
        if isinstance(node.value, ast.Call):
            func_node = node.value.func
            func_name = None
            if isinstance(func_node, ast.Name): func_name = func_node.id
            elif isinstance(func_node, ast.Attribute): func_name = func_node.attr

            # Exemple simplifié (vous avez des listes BUILTIN_FUNCTIONS, IO_FUNCTIONS, user_defined_functions)
            # if func_name in self.IO_FUNCTIONS: node_type = "IoOperation"
            # elif func_name in self.user_defined_functions: node_type = "UserFunctionCallAssign"
            pass # Laisser "Process" pour l'instant pour ce focus

        max_len = 60
        if len(label) > max_len:
             value_short = value_str[:max_len - len(targets) - 6] + "..." if len(value_str) > max_len - len(targets) - 6 else value_str
             label = f"{targets} = {value_short}"
             if len(label) > max_len: label = label[:max_len-3] + "..."

        assign_id = self.add_node(label, node_type=node_type)
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

        label = f"Appel: <br>{func_name}({args_str})"
        node_type = "Process" # Par défaut

        # --- Logique de détection de type d'appel (pour plu stard) ---
        # if func_name in self.IO_FUNCTIONS: node_type = "IoOperation"
        # elif func_name in self.user_defined_functions: node_type = "UserFunctionCall"
        pass # Laisser "Process" pour l'instant

        call_id = self.add_node(label, node_type=node_type)
        self.add_edge(parent_id, call_id)
        return [call_id]

    def filter_edges(self):
        """
        Filtrer les arêtes pour Mermaid?? Actuellement, le Set gère les doublons exacts.
        Cette fonction pourrait être utilisée pour des logiques plus complexes si nécessaire
        (par ex. supprimer une arête A->B si une arête A->B|Label existe),
        mais la gestion actuelle des labels dans visit_If/While tente déjà de faire ça.
        Pour l'instant, on retourne juste les arêtes stockées.
        """
        # La logique de priorisation label vs non-label est implicitement gérée
        # par le remove/add dans visit_If et visit_While... on laisse tomber filtrage des arêtes?
        return self.edges


    def to_mermaid(self) -> str:
        mermaid = ["graph TD"]
        node_definitions = []
        edge_definitions = []

        # Ajout des noeuds avec syntaxe Mermaid basée sur le label/type
        # (Note: on n'utilise pas le 'node_type' stocké pour l'instant, on se base sur le label)
        for node_id, label in self.nodes:
            # Nettoyer le label pour Mermaid (guillemets doubles)
            safe_label = label.replace('"', '#quot;') # Remplacer par entité HTML ou autre chose sûr
            node_type = self.node_types.get(node_id, "Process")

            if node_type == "StartEnd":
                node_definitions.append(f'    {node_id}((("{safe_label}")))')
            elif node_type == "Decision":
                 node_definitions.append(f'    {node_id}{{"{safe_label}"}}')
            elif node_type == "Junction":
                 node_definitions.append(f'    {node_id}([{safe_label}])') # Pilule
            elif node_type == "Return":
                node_definitions.append(f'    {node_id}[\\"{safe_label}"\\]') # Parallélogramme \
            elif node_type == "Jump":
                 node_definitions.append(f'    {node_id}(("{safe_label}"))') # Cercle
            elif node_type == "SubroutineDefinition": # Nouveau type pour clarté
                 node_definitions.append(f'    {node_id}[/"{safe_label}"/]') # Parallélogramme /
            # --- Types pour appels (à réactiver avec la logique dans visit_Assign/visit_Call) ---
            # elif node_type == "IoOperation":
            #      node_definitions.append(f'    {node_id}[/"{safe_label}"/]')
            # elif node_type == "UserFunctionCallAssign" or node_type == "UserFunctionCall":
            #      node_definitions.append(f'    {node_id}[("{safe_label}")]') # Cylindre
            elif node_type == "Process": # Cas pour les assignations simples, Pass, etc.
                 node_definitions.append(f'    {node_id}["{safe_label}"]')
            else: # Fallback pour tout type inconnu, utiliser un rectangle
                 print(f"Warning: Type de noeud inconnu '{node_type}' pour node_id '{node_id}'. Utilisation d'un rectangle.")
                 node_definitions.append(f'    {node_id}["{safe_label}"]')

        for from_node, to_node, label in self.filter_edges():
            safe_edge_label = label.replace('"', '#quot;')
            if safe_edge_label:
                edge_definitions.append(f"    {from_node} -->|{safe_edge_label}| {to_node}")
            else:
                edge_definitions.append(f"    {from_node} --> {to_node}")

        mermaid.extend(sorted(node_definitions))
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
selected_code = exemples.for2
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
# print("\n--- Noeuds (ID, Label) ---")
# for n in cfg.nodes:
#     print(n)
# print("\n--- Arêtes (From, To, Label) ---")
# for e in sorted(list(cfg.edges)): # Trié pour la lisibilité
#     print(e)
# print("\n--- Noeuds Terminaux ---")
# print(cfg.terminal_nodes)