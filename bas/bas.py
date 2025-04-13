import ast
import astor
import dis
import meta
#import codegen


def ast_to_mermaid(code):
    tree = ast.parse(code)  # gnérer l'arbre AST
    graph = ["flowchart TD"]    # # Initialiser le Mermaid

    def visit(node, parent=None):
        node_id = str(id(node))
        label = type(node).__name__ # Utiliser le nom du type de node comme label
        graph.append(f'{node_id}["{label}"]')
        if parent:
            graph.append(f"{parent} --> {node_id}")
        for child in ast.iter_child_nodes(node):
            visit(child, node_id)

    visit(tree)
    return "\\n".join(graph)

code = "a = 3"
print(ast_to_mermaid(code).replace("\\n", "\n"))
