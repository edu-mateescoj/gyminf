def visit_If(self, node: ast.If, parent_id: str) -> str:
    condition = ast.unparse(node.test)
    if_id = self.add_node(f"If {condition}")
    self.add_edge(parent_id, if_id)

    # Branche True
    true_end_id = None
    if node.body:
        # Premier statement de la branche True
        first_true_id = self.visit(node.body[0], if_id)
        self.add_edge(if_id, first_true_id, "True")
        current_id = first_true_id
        for stmt in node.body[1:]:
            next_id = self.visit(stmt, current_id)
            self.add_edge(current_id, next_id)
            current_id = next_id
        true_end_id = current_id

    # Branche False
    false_end_id = None
    if node.orelse:
        first_false_id = self.visit(node.orelse[0], if_id)
        self.add_edge(if_id, first_false_id, "False")
        current_id = first_false_id
        for stmt in node.orelse[1:]:
            next_id = self.visit(stmt, current_id)
            self.add_edge(current_id, next_id)
            current_id = next_id
        false_end_id = current_id
    
    # On retourne le dernier nœud de la branche appropriée
    if node.orelse:
        return false_end_id
    return true_end_id if true_end_id else if_id