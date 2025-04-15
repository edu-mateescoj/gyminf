import ast
import astor
import dis
#import meta
#import codegen


def ast_to_mermaid(code):
    tree = ast.parse(code)  # gnérer l'arbre AST
    graph = []    # # Initialiser le Mermaid
    node_id = 0 ###

    def visit(node, parent=None):
        nonlocal node_id
        node_id += 1 #node_id = str(id(node))
        label = type(node).__name__ # Utiliser le nom du type de node comme label
        graph.append(f'{node_id}["{label}"]')
        if parent:
            graph.append(f"{parent} --> {node_id}")
        for child in ast.iter_child_nodes(node):
            visit(child, node_id)

    visit(tree)
    return "flowchart TD\\n"+"\\n".join(graph)

code = '''x = 10
if x > 5:
    print("grand")
else:
    print("petit")'''
#print(ast_to_mermaid(code).replace("\\n", "\n"))

tree = ast.parse(code)
for node in ast.iter_child_nodes(tree):
    print(node)
    if isinstance(node, ast.Assign):
        print(type(node).__name__)

##### SOURCE
'''https://docs.python.org/3/library/ast.html
ast.iter_fields(node)
Yield a tuple of (fieldname, value) for each field in node._fields that is present on node.

ast.iter_child_nodes(node)
Yield all direct child nodes of node, that is, all fields that are nodes and all items of fields that are lists of nodes.

ast.walk(node)
Recursively yield all descendant nodes in the tree starting at node (including node itself), in no specified order. This is useful if you only want to modify nodes in place and don’t care about the context.

class ast.NodeVisitor
A node visitor base class that walks the abstract syntax tree and calls a visitor function for every node found. This function may return a value which is forwarded by the visit() method.

This class is meant to be subclassed, with the subclass adding visitor methods.

visit(node)
Visit a node. The default implementation calls the method called self.visit_classname where classname is the name of the node class, or generic_visit() if that method doesn’t exist.

generic_visit(node)
This visitor calls visit() on all children of the node.

'''