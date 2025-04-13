// la variable JavaScript mermaidCode contient le texte Mermaid généré par Pyodide


// Fonction pour injecter le graphe Mermaid dans le conteneur HTML existant
async function afficherFlowchart(mermaidCode) {
    const container = document.getElementById('flowchart');

    // Injection du contenu Mermaid dans le conteneur
    container.innerHTML = `<pre class="mermaid">${mermaidCode}</pre>`;

    // Déclenchement du rendu Mermaid.js
    await mermaid.run({
        nodes: [container.querySelector('.mermaid')],
    });
}

// Charger Pyodide
async function main() {
    let pyodide = await loadPyodide();

    // Analyse du code Python et génération du graphe Mermaid
    await pyodide.runPythonAsync(`
import ast

def ast_to_mermaid(code):
    tree = ast.parse(code)  # gnérer l'arbre AST
    graph = ["graph TD"]    # # Initialiser le graphe Mermaid

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
    `);

    const codePython = `x = 10
if x > 5:
    print("grand")
else:
    print("petit")`;

    //alternative
    /* 
    let mermaidGraph = pyodide.globals.get("ast_to_mermaid")(codePython);
    document.getElementById("mermaid").innerHTML = mermaidGraph;
    // Rendu Mermaid.js
    mermaid.init(undefined, document.querySelectorAll(".mermaid"));
*/
    let ast_to_mermaid = pyodide.globals.get("ast_to_mermaid");
    let mermaidGraph = ast_to_mermaid(codePython);

    // Injecter et afficher dans ton conteneur HTML actuel
    await afficherFlowchart(mermaidGraph);

}

main();