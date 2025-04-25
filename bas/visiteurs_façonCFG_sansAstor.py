import ast
from typing import List, Dict, Set

class ControlFlowGraph:
    def __init__(self, code: str):
        self.tree = ast.parse(code)
        self.nodes: List[str] = []
        self.edges: List[tuple] = []
        self.node_counter = 0
        self.loop_stack = []
        self.current_node = None

    def get_node_id(self) -> str:
        self.node_counter += 1
        return f"node{self.node_counter}"

    def add_node(self, label: str) -> str:
        node_id = self.get_node_id()
        self.nodes.append((node_id, label))
        return node_id

    def add_edge(self, from_node: str, to_node: str, label: str = ""):
        self.edges.append((from_node, to_node, label))

    def visit(self, node: ast.AST, parent_id: str = None) -> str:
        method = f'visit_{type(node).__name__}'
        visitor = getattr(self, method, self.generic_visit)
        return visitor(node, parent_id)

    def visit_Module(self, node: ast.Module, parent_id: str = None) -> str:
        start_id = self.add_node("Start")
        current_id = start_id
        
        for stmt in node.body:
            current_id = self.visit(stmt, current_id)
        
        end_id = self.add_node("End")
        self.add_edge(current_id, end_id)
        return end_id

    def visit_FunctionDef(self, node: ast.FunctionDef, parent_id: str) -> str:
        func_id = self.add_node(f"Function {node.name}")
        self.add_edge(parent_id, func_id)
        
        current_id = func_id
        for stmt in node.body:
            current_id = self.visit(stmt, current_id)
        
        return current_id

    def visit_If(self, node: ast.If, parent_id: str) -> str:
        condition = ast.unparse(node.test)
        if_id = self.add_node(f"If {condition}")
        self.add_edge(parent_id, if_id)

        # Branche True
        true_end_id = None
        if node.body:
            current_id = if_id
            for stmt in node.body:
                current_id = self.visit(stmt, current_id)
            true_end_id = current_id

        # Branche False
        false_end_id = None
        if node.orelse:
            current_id = if_id
            for stmt in node.orelse:
                current_id = self.visit(stmt, current_id)
            false_end_id = current_id

        # Point de jonction
        join_id = self.add_node("jonction")
        if true_end_id:
            self.add_edge(true_end_id, join_id, "True")
        if false_end_id:
            self.add_edge(false_end_id, join_id, "False")
        else:
            self.add_edge(if_id, join_id, "False")

        return join_id

    def visit_For(self, node: ast.For, parent_id: str) -> str:
        iterator = ast.unparse(node.target)
        iterable = ast.unparse(node.iter)
        loop_id = self.add_node(f"For {iterator} in {iterable}")
        self.add_edge(parent_id, loop_id)
        
        self.loop_stack.append(loop_id)
        
        current_id = loop_id
        for stmt in node.body:
            current_id = self.visit(stmt, current_id)
        
        # Retour de boucle
        self.add_edge(current_id, loop_id, "itération suivante")
        
        # Sortie de boucle
        exit_id = self.add_node("Sortie de boucle")
        self.add_edge(loop_id, exit_id, "Terminée")
        
        self.loop_stack.pop()
        return exit_id

    def visit_While(self, node: ast.While, parent_id: str) -> str:
        condition = ast.unparse(node.test)
        while_id = self.add_node(f"While {condition}")
        self.add_edge(parent_id, while_id)
        
        self.loop_stack.append(while_id)
        
        current_id = while_id
        for stmt in node.body:
            current_id = self.visit(stmt, current_id)
        
        # Retour de boucle
        self.add_edge(current_id, while_id, "itération suivante")
        
        # Sortie de boucle
        exit_id = self.add_node("Sortie de boucle")
        self.add_edge(while_id, exit_id, "False")
        
        self.loop_stack.pop()
        return exit_id

    def visit_Return(self, node: ast.Return, parent_id: str) -> str:
        value = ast.unparse(node.value) if node.value else ""
        return_id = self.add_node(f"Return {value}")
        #return_id = self.add_node(f"une valeur de retour ici")
        self.add_edge(parent_id, return_id)
        return return_id

    def visit_Break(self, node: ast.Break, parent_id: str) -> str:
        if self.loop_stack:
            break_id = self.add_node("Break")
            self.add_edge(parent_id, break_id)
            
            # Trouver la sortie de boucle correspondante
            current_loop = self.loop_stack[-1]
            for node_id, node_label in self.nodes:
                if node_label == "Exit Loop" and node_id > current_loop:
                    self.add_edge(break_id, node_id)
                    break
            
            return break_id
        return parent_id

    def visit_Continue(self, node: ast.Continue, parent_id: str) -> str:
        if self.loop_stack:
            continue_id = self.add_node("Continue")
            self.add_edge(parent_id, continue_id)
            self.add_edge(continue_id, self.loop_stack[-1])
            return continue_id
        return parent_id

    def generic_visit(self, node: ast.AST, parent_id: str) -> str:
        node_id = self.add_node(ast.unparse(node))
        self.add_edge(parent_id, node_id)
        return node_id

    def visit_Assign(self, node: ast.Assign, parent_id: str) -> str:
        targets = ", ".join([ast.unparse(t) for t in node.targets])
        value = ast.unparse(node.value)
        assign_id = self.add_node(f"Assignation: <br> {targets} = {value}")
        self.add_edge(parent_id, assign_id)
        return assign_id
    
    def to_mermaid(self) -> str:
        mermaid = ["graph TD"]
        
        # Ajout des nœuds
        for node_id, label in self.nodes:
            if label in ["Start", "End"]:
                mermaid.append(f"    {node_id}(({label}))")
            elif label in ["Sortie de boucle","Break","Continue","Function", "jonction"]:
                mermaid.append(f"    {node_id}([{label}])")
            elif label[0:3] in ["If ", "Whi", "For"]:
                mermaid.append(f"    {node_id}{{{label}}}")
            elif label == "Return":
                continue
            else:
                mermaid.append(f"    {node_id}[\"{label}\"]")
        
        # Ajout des arêtes
        for from_node, to_node, label in self.edges:
            if label:
                mermaid.append(f"    {from_node} -->|{label}| {to_node}")
            else:
                mermaid.append(f"    {from_node} --> {to_node}")
        
        return "\n".join(mermaid)

# Exemple d'utilisation
code = '''a = 5
b = 10 
if a > b:
    print("a est plus grand que b")
else:
    print("a est plus petit ou égal à b")
'''
code2 = """
x = 3
def factorial(x):
    if x <= 1:
        return 1
    else:
        result = 1
        for i in range(2, x + 1):
            result *= i
        return result
factorial(x)
"""
#tree = ast.parse(code)
#print(ast.dump(tree, indent=2))

cfg = ControlFlowGraph(code)
cfg.visit(cfg.tree)

print(cfg.to_mermaid())