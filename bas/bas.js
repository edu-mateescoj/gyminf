let editor;

// tentative de fix
document.addEventListener('DOMContentLoaded', async function() {
    mermaid.initialize({
        startOnLoad: true,
        theme: "default"
    });

// la variable JavaScript mermaidCode contient le texte Mermaid généré par Pyodide

    // CodeMirror editor
    // const ...
    editor = CodeMirror.fromTextArea(document.getElementById('code-input'), {
        mode: 'python',
        theme: 'dracula',
        lineNumbers: true,
        indentUnit: 4,
        matchBrackets: true
    });

    // un code python par défaut
    editor.setValue(`x = 10
if x > 5:
    print("grand")
else:
    print("petit")`);
    
    await main(); //(editor)
});

async function main() { //(editor)
    
    // Charger Pyodide
    let pyodide = await loadPyodide();

    //code python à recevoir depuis le textarea de codemirror
    const codePython = editor.getValue();

    // Analyse du code Python et génération du graphe Mermaid
    await pyodide.runPythonAsync(`
import ast

def ast_to_mermaid(code):
    tree = ast.parse(code)  # gnérer l'arbre AST
    graph = []    # # Initialiser le graphe Mermaid vide

    def visit(node, parent=None):
        node_id = str(id(node)) # Utiliser l'id en mémoire comme identifiant unique
        label = type(node).__name__ # Utiliser le nom du type comme étiquette
        graph.append(f'{node_id}["{label}"]')

        if parent: #on est pas à la racine:
            graph.append(f"{parent} --> {node_id}") #on ajoute la relation parent-enfant

        for child in ast.iter_child_nodes(node):
            visit(child, node_id)

    visit(tree) #commence à Module
    return "flowchart TD\\n"+"\\n".join(graph[2:])
    `);

    //alternative
    /* 
    let mermaidGraph = pyodide.globals.get("ast_to_mermaid")(codePython);
    document.getElementById("mermaid").innerHTML = mermaidGraph;
    // Rendu Mermaid.js
    mermaid.init(undefined, document.querySelectorAll(".mermaid"));
*/
    let ast_to_mermaid = pyodide.globals.get("ast_to_mermaid");
    let mermaidGraph = ast_to_mermaid(codePython);

    // injecter le graphe Mermaid dans le conteneur HTML existant
    await afficherFlowchart(mermaidGraph);

}

// main();

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