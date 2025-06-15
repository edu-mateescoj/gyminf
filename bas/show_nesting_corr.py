import ast

class SyntaxVisitor(ast.NodeVisitor):
    def __init__(self):
        self.nesting_level = 0
        self.max_nesting = 0

    def visit(self, node, prefix="", indent=0):
        node_type = type(node).__name__
        print(f"{prefix}{'    '*indent}{node_type} (niveau avant={self.nesting_level})")
        self.nesting_level += 1
        self.max_nesting = max(self.nesting_level, self.max_nesting)

        fields = list(ast.iter_fields(node))
        n = len(fields)
        for idx, (field, value) in enumerate(fields):
            is_last = (idx == n - 1)
            branch = "└──" if is_last else "├──"
            field_indent = indent + 1
            field_prefix = f"{prefix}{'    '*field_indent}{branch} {field}:"
            if isinstance(value, ast.AST):
                print(field_prefix)
                next_prefix = prefix + ('    ' if is_last else '│   ')
                self.visit(value, next_prefix, field_indent)
            elif isinstance(value, list):
                print(f"{prefix}{'    '*field_indent}{branch} {field}: [")
                for i, item in enumerate(value):
                    item_is_last = (i == len(value) - 1)
                    item_branch = "└──" if item_is_last else "├──"
                    item_prefix = f"{prefix}{'    '*(field_indent+1)}{item_branch} [{i}]"
                    if isinstance(item, ast.AST):
                        print(item_prefix)
                        next_prefix = prefix + ('    ' if is_last else '│   ') + ('    ' if item_is_last else '│   ')
                        self.visit(item, next_prefix, field_indent + 1)
                    else:
                        print(f"{item_prefix} (simple arg): {repr(item)}")
                print(f"{prefix}{'    '*field_indent}]")
            else:
                print(f"{field_prefix} (simple arg) {repr(value)}")

        self.nesting_level -= 1

code = "for i in range(10):\n    if i % 2 == 0:\n        print(i)"

tree = ast.parse(code)
v = SyntaxVisitor()
v.visit(tree)
print(f"\nmax_nesting: {v.max_nesting}\n")