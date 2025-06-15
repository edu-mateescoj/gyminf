import ast

class SyntaxVisitor(ast.NodeVisitor): 

    def __init__(self):
        self.has_for = False
        self.has_while = False
        self.has_if = False
        self.nesting_level = 0
        self.max_nesting = 0

    def generic_visit(self, node):
        if isinstance(node, ast.For): self.has_for = True
        if isinstance(node, ast.While): self.has_while = True
        if isinstance(node, ast.If): self.has_if = True
        self.nesting_level += 1 # Increase nesting level when entering a new block
        self.max_nesting = max(self.nesting_level, self.max_nesting)
        super().generic_visit(node) # Call the generic visit method to continue traversing the tree
        self.nesting_level -= 1 

code = "for i in range(10):\n    if i % 2 == 0:\n        print(i)"
code0 = "x = 1"
tree = ast.parse(code)
tree0 = ast.parse(code0)
v = SyntaxVisitor()

v.visit(tree0)

print(ast.dump(tree0))
print(v.has_for, v.has_if, v.max_nesting)