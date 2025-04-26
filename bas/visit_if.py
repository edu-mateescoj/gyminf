#indentation: prêt à coller dans classe CFG

    def visit_If(self, node: ast.If, parent_id: str) -> str:
        condition = ast.unparse(node.test)
        if_id = self.add_node(f"If {condition}")
        self.add_edge(parent_id, if_id)

        # Branche True
        true_end_id = None
        if node.body:
            current_id = if_id
            for stmt in node.body:
                next_id = self.visit(stmt, current_id)
                #on veut ajouter l'étiquette sur l'arête qui sort de la condition
                if current_id == if_id:
                    self.add_edge(current_id, next_id, "True")
                else:
                    self.add_edge(current_id, next_id, "Dupliqué")
                current_id = next_id
            true_end_id = current_id
        
        # Branche False
        false_end_id = None
        if node.orelse:
            current_id = if_id
            for stmt in node.orelse:
                next_id = self.visit(stmt, current_id)
                #on veut ajouter l'étiquette sur l'arête qui sort de la condition
                if current_id == if_id:
                    self.add_edge(current_id, next_id, "False")
                else:
                    self.add_edge(current_id, next_id, "Dupliqué")
                current_id = next_id
            false_end_id = current_id
        
        '''####################tentative 
        #supprimé le noeud de jonction pour éviter doublons
        #on veut retourner le noeud de fermeture de la branche
        #(brahce False si elle existe, sinon branche True)
        if node.orelse:
            return false_end_id
        else:
            return true_end_id
        '''########################

        ''' version initiale: étiquettes "True/False" aux jonctions
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
        '''
        # Point de jonction
        join_id = self.add_node("jonction")
        if true_end_id:
            self.add_edge(true_end_id, join_id, "True")
        if false_end_id:
            self.add_edge(false_end_id, join_id, "False")
        else:
            self.add_edge(if_id, join_id, "False")
        
        #valeur retournée par la fonction visit_If
        return join_id