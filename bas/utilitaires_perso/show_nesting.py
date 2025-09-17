import ast

class SyntaxVisitor(ast.NodeVisitor):
    def __init__(self):
        self.nesting_level = 0
        self.max_nesting = 0

    def visit(self, node, prefix="", indent=0, base_indent=0):
        node_type = type(node).__name__
        print(f"{prefix}{'    '*indent}{node_type} (niveau avant={self.nesting_level})")
        self.nesting_level += 1
        self.max_nesting = max(self.nesting_level, self.max_nesting)

        for field, value in ast.iter_fields(node):
            # Calcul de l'indentation pour aligner └── sous le début du champ parent
            field_indent = indent #+ 1
            field_prefix = f"{prefix}{'    '*field_indent}└── {field}:"
            if isinstance(value, ast.AST):
                print(field_prefix)
                self.visit(value, prefix, field_indent + 1, field_indent + 1)
            elif isinstance(value, list):
                print(f"{prefix}{'    '*field_indent}|\n{'    '*field_indent}{field}: [")
                for i, item in enumerate(value): # i est 0-based => compteur à i+1
                    # Aligner [i] sous le nom de la liste
                    item_prefix = f"{prefix}{'    '*(field_indent)}[{i+1}]"
                    if isinstance(item, ast.AST):
                        print(item_prefix)
                        self.visit(item, prefix, field_indent + 2, field_indent + 2)
                    else:
                        print(f"{item_prefix} (simple arg): {repr(item)}")
                # Aligner le ] avec le [ OU AUTERMENT: avec le début du nom de la liste (même indentation que └── {field}: [)]
                print(f"{prefix}{'    '*field_indent}]")
            else:
                print(f"{prefix}{'    '*field_indent}|\n{'    '*field_indent}{field}: (simple arg) {repr(value)}")

        self.nesting_level -= 1

code = '''x = 1
if x > 0:
    y = 1
else:
    y = -1
print(y)'''
tree = ast.parse(code)
v = SyntaxVisitor()
v.visit(tree)
print(f"\nmax_nesting: {v.max_nesting}\n")

code0 = """for i in range(10):
    if i % 2 == 0:
        print(i)"""
tree0 = ast.parse(code0)
v = SyntaxVisitor()
v.visit(tree0)
print(ast.dump(tree0))
print(f"\nmax_nesting: {v.max_nesting} \n")