import ast
import astor
import graphviz
#import meta
#import codegen

code = '''x = 10
y = 12
if x > 5:
    print("grand")
else:
    print("petit")'''

def ast_to_mermaid(codeinput):
    tree = ast.parse(codeinput)  # gnérer l'arbre AST
    graph = []    # # Initialiser le Mermaid
    parents_dict = {}
    
    def visit(node, parent=None):
        node_id = str(id(node))
        label = type(node).__name__ # Utiliser le nom du type de node comme label

        if isinstance(node, ast.Assign):
            label = (str((astor.to_source(node)))).strip()
            graph.append(f'{node_id}["{label}"]')
            if parent is not None:
                parents_dict[node_id] = parent #[node] ou [node_id]

        if isinstance(node, ast.If):
            n = len(str(astor.to_source(node)).strip().splitlines()[0])
            label = "{"+(str(astor.to_source(node))).strip().splitlines()[0][3:n-1]+"}"
            graph.append(f'{node_id}{label}')
            if parent is not None:
                parents_dict[node_id] = parent #[node] ou [node_id]

        #if parent:
            #graph.append(f"{parent} --> {node_id}")

        for child in ast.iter_child_nodes(node):
            visit(child, node_id)

    visit(tree)
    print(parents_dict)

    # for children, parent in parents_dict.items():
    #     for child in children:
    #         graph.append(f"{parent} --> {child}")

    return "flowchart TD\\n"+"\\n".join(graph)

print(ast_to_mermaid(code).replace("\\n", "\n"))

tree = ast.parse(code)
for child in ast.iter_child_nodes(tree):
    print("-----------------------------------")
    if isinstance(child, ast.Assign):
        #print(type(child).__name__)
        #print(child.targets[0].id, "=", child.value.n)  # Affichage de la cible de l'assignation
        print("[",(str((astor.to_source(child)))).strip(),"]")
        #print(str(id(child)))
    elif isinstance(child, ast.If):
        #print(type(child).__name__)
        n = len(str(astor.to_source(child)).strip().splitlines()[0])
        print("{",(str(astor.to_source(child))).strip().splitlines()[0][3:n-1],"}")
        #print("Condition:", ast.dump(child.test))
        #print("Corps: A CONSTRUIRE AVEC...", ast.dump(child))
    elif isinstance(child, ast.Expr):
        print(type(child).__name__)
        print("Expression:", ast.dump(child.value))
    else:
        print("\n AUTRE : ",type(child).__name__)

    print('line',child.lineno, 'col',child.col_offset)  # pour info



class mynode(object):
    def __init__(self, node, node_from = None, node_to = None):
        self.node_type = type(node).__name__
        
    def get_node(self):
        if isinstance(node, ast.Assign):
            return "["+ node.targets[0].id + "=" + node.value.n + "]"
        elif isinstance(node, ast.If):
            return "{" + node.targets[0].id + "}"
        

    def set_to(self, id_to):
        self.node_to = id_to
    def set_from(self, id_from):
        self.node_from = id_from


#print(ast.dump(tree, indent=2))  # Affichage + compact
# 
# ##### SOURCE
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