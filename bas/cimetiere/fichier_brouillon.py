import ast
from typing import List, Dict, Set # Optional

class ControlFlowGraph:
    def __init__(self, code: str):
        self.tree = ast.parse(code)
        self.nodes: List[tuple] = []
        self.edges: List[tuple] = []
        self.node_counter = 0
        self.loop_stack = []
        self.current_node = None
        self.return_nodes: Dict[str, str] = {}  # Pour réutiliser les mêmes noeuds Return

    def get_node_id(self) -> str:
        self.node_counter += 1
        return f"node{self.node_counter}"

    def add_node(self, label: str) -> str:
        node_id = self.get_node_id()
        self.nodes.append((node_id, label))
        return node_id

    def add_edge(self, from_node: str, to_node: str, label: str = ""):
        self.edges.append((from_node, to_node, label))

    def visit(self, node: ast.AST, parent_ids: list = None) -> List[str]:
        """Visite un noeud AST de façon appropriée au type en délégant son traitement à la méthode de visite correspondante, 
        et retourne la liste des noeuds de sortie possibles."""
        method = f'visit_{type(node).__name__}' #on construit le nom de la méthode à appeler
        visitor = getattr(self, method, self.generic_visit) #on récupère la méthode, sinon generic_visit
        if parent_ids != None: #on appelle la méthode de visite appropriée
            return visitor(node, parent_ids or []) #en lui passant le noeud et la liste des parents
        else:
            return visitor(node, []) 
        
    def visit_Module(self, node: ast.Module, parent_ids: List[str] = None) -> List[str]:
        start_id = self.add_node("Start")
        current_ids = [start_id]
        for stmt in node.body:
            current_ids = self.visit(stmt, current_ids)
        end_id = self.add_node("End")
        self.connect_exits(current_ids, end_id)
        return [end_id]

    def visit_FunctionDef(self, node: ast.FunctionDef, parent_ids: List[str]) -> List[str]:
        func_id = self.add_node(f"Fonction définie: <br> {node.name}")
        self.connect_exits(parent_ids, func_id)
        current_ids = [func_id]
        for stmt in node.body:
            current_ids = self.visit(stmt, current_ids)
        return current_ids

    def visit_If(self, node: ast.If, parent_ids: List[str]) -> List[str]:
        condition = ast.unparse(node.test)
        if_id = self.add_node(f"If {condition}")
        self.connect_exits(parent_ids, if_id) 

        # Branche True
        true_exits = []
        if node.body:
            true_exits = self.visit_block(node.body, [if_id], label="True")
        else:
            true_exits = [if_id]

        # Branche False
        false_exits = []
        if node.orelse:
            false_exits = self.visit_block(node.orelse, [if_id], label="False")
        else:
            false_exits = [if_id]

        # On retourne toutes les sorties possibles
        return true_exits + false_exits

    def visit_block(self, stmts, parent_ids, label=None):
        """Visite une séquence d'instructions (liste de 'statements') en partant des parent_ids (un ou plusieurs!) 
        avec ajout d'un label (True, False...) et retourne la liste des sorties."""
        current_ids = parent_ids
        for i, stmt in enumerate(stmts): #parcourir les instructions du bloc
            next_ids = [] #où stocker les noeuds de sortie
            for cid in current_ids: #parcourir les noeuds (courants <-- parents)
                # Ajoute l'arête avec label seulement pour la première instruction
                if i == 0 and label: #pour identifier la première instruction d'une branche if
                    stmt_exits = self.visit(stmt, [cid]) #on visite l'instruction, on passe le noeud parent courant
                    self.add_edge(cid, stmt_exits[0], label) #on ajoute une arête vers la sortie de l'instruction
                else:
                    stmt_exits = self.visit(stmt, [cid]) #idem
                    self.add_edge(cid, stmt_exits[0]) #pas de label
                next_ids.extend(stmt_exits) #on ajoute les sorties de l'instruction à la liste des sorties du bloc
            current_ids = next_ids #on va passer aux instructions suivantes, les sorties courantes deviennent les parents
        return current_ids #on retourne la liste des sorties du bloc: les noeuds où le graphe peut sortir après avoir exécuté toutes les instructions du bloc

    def visit_For(self, node: ast.For, parent_ids: List[str]) -> List[str]:
        iterator = ast.unparse(node.target)
        iterable = ast.unparse(node.iter)
        loop_id = self.add_node(f"For {iterator} in {iterable}")
        self.connect_exits(parent_ids, loop_id)
        self.loop_stack.append(loop_id)
        body_exits = self.visit_block(node.body, [loop_id])
        # Retour de boucle
        for exit_id in body_exits:
            self.add_edge(exit_id, loop_id, "itération suivante")
        # Sortie de boucle
        exit_id = self.add_node("Sortie de boucle")
        self.add_edge(loop_id, exit_id, "Terminée")
        self.loop_stack.pop()
        return [exit_id]

    def visit_While(self, node: ast.While, parent_ids: List[str]) -> List[str]:
        condition = ast.unparse(node.test)
        while_id = self.add_node(f"While {condition}")
        self.connect_exits(parent_ids, while_id)
        self.loop_stack.append(while_id)
        body_exits = self.visit_block(node.body, [while_id])
        for exit_id in body_exits:
            self.add_edge(exit_id, while_id, "itération suivante")
        exit_id = self.add_node("Sortie de boucle")
        self.add_edge(while_id, exit_id, "False")
        self.loop_stack.pop()
        return [exit_id]

    def visit_Return(self, node: ast.Return, parent_ids: List[str]) -> List[str]:
        value = ast.unparse(node.value) if node.value else ""
        # Réutilisation du même nœud pour chaque return identique
        if value not in self.return_nodes:
            return_id = self.add_node(f"Return {value}")
            self.return_nodes[value] = return_id
        else:
            return_id = self.return_nodes[value]
        self.connect_exits(parent_ids, return_id)
        return [return_id]

    def visit_Break(self, node: ast.Break, parent_ids: List[str]) -> List[str]:
        if self.loop_stack:
            break_id = self.add_node("Break")
            self.connect_exits(parent_ids, break_id)
            # Pas de gestion avancée de la sortie ici
            return [break_id]
        return parent_ids

    def visit_Continue(self, node: ast.Continue, parent_ids: List[str]) -> List[str]:
        if self.loop_stack:
            continue_id = self.add_node("Continue")
            self.connect_exits(parent_ids, continue_id)
            self.add_edge(continue_id, self.loop_stack[-1])
            return [continue_id]
        return parent_ids

    def generic_visit(self, node: ast.AST, parent_ids: List[str]) -> List[str]:
        node_id = self.add_node(ast.unparse(node))
        self.connect_exits(parent_ids, node_id)
        return [node_id]

    def visit_Assign(self, node: ast.Assign, parent_ids: List[str]) -> List[str]:
        targets = ", ".join([ast.unparse(t) for t in node.targets])
        value = ast.unparse(node.value)
        assign_id = self.add_node(f"Assignation: <br> {targets} = {value}")
        self.connect_exits(parent_ids, assign_id)
        return [assign_id]

    def connect_exits(self, from_ids: List[str], to_id: str):
        """Ajoute une arête de chaque nœud de sortie vers le nœud suivant."""
        for fid in from_ids:
            self.add_edge(fid, to_id)

    def to_mermaid(self) -> str:
        mermaid = ["graph TD"]
        for node_id, label in self.nodes:
            if label in ["Start", "End"]:
                mermaid.append(f"    {node_id}(({label}))")
            elif label in ["Sortie de boucle","Break","Continue","Function", "jonction"]:
                mermaid.append(f"    {node_id}([{label}])")
            elif label[0:3] in ["If ", "Whi", "For"]:
                mermaid.append(f"    {node_id}{{{label}}}")
            elif label.startswith("Return"):
                mermaid.append(f"    {node_id}([\"{label}\"])")
            else:
                mermaid.append(f"    {node_id}[\"{label}\"]")
        for from_node, to_node, label in self.edges:
            if label:
                mermaid.append(f"    {from_node} -->|{label}| {to_node}")
            else:
                mermaid.append(f"    {from_node} --> {to_node}")
        return "\n".join(mermaid)

# Exemple d'utilisation
code3 = """
if a == b:
    if a == c:
        if b == c:
            return "Equilateral"
        else:
            return "Isoscele"
    else:
        return "Isoscele"
else:
    if b != c:
        if a == c:
            return "Isoscele"
        else:
            return "Scalene"
    else:
        return "Isoscele"
"""
cfg = ControlFlowGraph(code3)
cfg.visit(cfg.tree)
print(cfg.to_mermaid())