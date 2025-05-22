// js/flowchart-generator.js

// Variable globale pour stocker l'instance de Pyodide une fois chargée.
var pyodide = null;
// Variable pour stocker le code de votre classe CFG une fois chargé.
var cfgPythonScript = "";

/**
 * Initialise Pyodide et charge le script Python contenant la classe ControlFlowGraph.
 */
async function initPyodideAndLoadScript() {
    console.log("Initialisation de Pyodide...");
    try {
        // Charger Pyodide
        pyodide = await loadPyodide();
        console.log("Pyodide chargé avec succès.");

        // Charger les packages Python nécessaires (ici, 'ast' est intégré, donc pas besoin de micropip pour lui).
        // Si autres dépendances non standard, il faudrait les charger.
        // await pyodide.loadPackage("micropip");
        // const micropip = pyodide.pyimport("micropip");
        // await micropip.install("nom_du_package");

        // Charger le contenu du script Python (MyCFG.py)
        const response = await fetch('MyCFG.py'); // IMPORTANT: Mettez le bon chemin ici
        if (!response.ok) {
            throw new Error("Impossible de charger le script Python CFG: " + response.statusText);
        }
        cfgPythonScript = await response.text();
        console.log("Script Python CFG chargé.");

        // Exécuter le script Python pour définir la classe ControlFlowGraph dans l'espace de noms de Pyodide.
        await pyodide.runPythonAsync(cfgPythonScript);
        console.log("Classe ControlFlowGraph définie dans Pyodide.");

    } catch (error) {
        console.error("Erreur lors de l'initialisation de Pyodide ou du chargement du script:", error);
        // Afficher une erreur à l'utilisateur dans le div du flowchart
        var flowchartDiv = document.getElementById('flowchart');
        if (flowchartDiv) {
            flowchartDiv.innerHTML = '<div class="alert alert-danger" role="alert">Erreur lors du chargement du générateur de diagramme. Vérifiez la console.</div>';
        }
    }
}

/**
 * Génère le diagramme Mermaid à partir du code Python fourni.
 * @param {string} pythonCode Le code Python à analyser.
 * @returns {Promise<string|null>} Une promesse qui se résout avec la chaîne Mermaid, ou null en cas d'erreur.
 */
async function generateFlowchartFromCode(pythonCode) {
    if (!pyodide || !cfgPythonScript) {
        console.error("Pyodide ou le script CFG ne sont pas initialisés.");
        alert("Le générateur de diagramme n'est pas prêt. Veuillez patienter ou rafraîchir la page.");
        return null;
    }

    if (!pythonCode || pythonCode.trim() === "") {
        console.warn("Aucun code Python fourni pour générer le diagramme.");
        return ""; // Retourner une chaîne vide pour effacer un diagramme précédent
    }

    console.log("Génération du diagramme pour le code :", pythonCode);

    try {
        // Passer le code Python à notre script.
        // Nous allons créer une instance de ControlFlowGraph et appeler ses méthodes.
        // `pyodide.globals.set` permet de rendre des variables JS accessibles depuis Python.
        pyodide.globals.set("user_python_code", pythonCode);

        // Script Python à exécuter dans Pyodide pour utiliser la classe CFG.
        var pythonRunnerScript = `
import ast # S'assurer qu'ast est importé si ce n'est pas déjà fait
# La classe ControlFlowGraph est déjà définie par l'exécution de cfgPythonScript

mermaid_output = ""
error_message = ""
try:
    # Récupérer le code utilisateur passé depuis JavaScript
    current_code = user_python_code 
    
    # Créer une instance de la classe ControlFlowGraph
    cfg_instance = ControlFlowGraph(current_code) 
    
    # Lancer la visite à partir de la racine de l'AST (le module)
    cfg_instance.visit(cfg_instance.tree, None) # Le parent initial est None
    
    # Obtenir la sortie Mermaid
    mermaid_output = cfg_instance.to_mermaid()
except Exception as e:
    import traceback
    error_message = f"Erreur Python lors de la génération du CFG: {type(e).__name__}: {str(e)}\\n{traceback.format_exc()}"
    print(error_message) # Afficher dans la console Pyodide (visible dans la console du navigateur)

# Renvoyer la sortie Mermaid (ou une chaîne vide si erreur) et le message d'erreur
# Ces variables seront accessibles depuis JavaScript via pyodide.globals.get()
output_dict = {"mermaid": mermaid_output, "error": error_message}
output_dict
`;
        // Exécuter le script runner
        var resultProxy = await pyodide.runPythonAsync(pythonRunnerScript);
        var output = resultProxy.toJs(); // Convertir le dictionnaire Python en objet JS
        resultProxy.destroy(); // Libérer la mémoire du proxy

        if (output.error) {
            console.error("Erreur Python détaillée:", output.error);
            // Afficher l'erreur dans le div du flowchart
            var flowchartDiv = document.getElementById('flowchart');
            if (flowchartDiv) {
                var preFormattedError = output.error.replace(/\\n/g, '<br>'); // Remplacer les sauts de ligne Python
                flowchartDiv.innerHTML = '<div class="alert alert-warning" role="alert"><strong>Erreur lors de la génération du diagramme :</strong><br><pre style="white-space: pre-wrap; word-break: break-all;">' + preFormattedError + '</pre></div>';
            }
            return null; // Indiquer une erreur
        }

        console.log("Chaîne Mermaid générée.");
        return output.mermaid;

    } catch (error) {
        console.error("Erreur JavaScript lors de l'appel à Pyodide pour générer le diagramme:", error);
        var flowchartDiv = document.getElementById('flowchart');
        if (flowchartDiv) {
            flowchartDiv.innerHTML = '<div class="alert alert-danger" role="alert">Erreur majeure lors de la communication avec le moteur Python.</div>';
        }
        return null;
    }
}

/**
 * Affiche le diagramme Mermaid dans le div spécifié.
 * @param {string} mermaidCode La chaîne de caractères Mermaid.
 * @param {string} targetDivId L'ID du div où afficher le diagramme.
 */
async function displayFlowchart(mermaidCode, targetDivId) {
    var flowchartContainer = document.getElementById(targetDivId);
    if (!flowchartContainer) {
        console.error("Le conteneur de diagramme avec l'ID '" + targetDivId + "' n'a pas été trouvé.");
        return;
    }

    if (mermaidCode === null) { // Erreur lors de la génération
        // Le message d'erreur est déjà affiché par generateFlowchartFromCode
        return;
    }
    if (mermaidCode.trim() === "") {
        flowchartContainer.innerHTML = '<p class="text-center text-muted mt-3">Aucun diagramme à afficher. Entrez ou générez du code Python.</p>';
        return;
    }

    try {
        // Nettoyer le conteneur avant d'ajouter le nouveau diagramme
        flowchartContainer.innerHTML = ''; 
        
        // Créer un élément temporaire pour que Mermaid puisse le traiter
        var tempDiv = document.createElement('div');
        tempDiv.className = 'mermaid'; // La classe que Mermaid recherche
        tempDiv.textContent = mermaidCode; // Mettre le code Mermaid ici
        flowchartContainer.appendChild(tempDiv);

        // Demander à Mermaid de rendre tous les éléments avec la classe 'mermaid'
        // qui n'ont pas encore été rendus.
        await mermaid.run({
            nodes: [tempDiv] // Spécifier le nœud à rendre pour éviter de re-rendre les anciens
        });
        console.log("Diagramme Mermaid rendu.");

    } catch (error) {
        console.error("Erreur lors du rendu du diagramme Mermaid:", error);
        flowchartContainer.innerHTML = '<div class="alert alert-danger" role="alert">Erreur lors de l\'affichage du diagramme :<br><pre>' + error.message + '</pre></div>';
    }
}

// Initialiser Pyodide et charger le script dès que la page est prête.
// Nous utilisons DOMContentLoaded pour s'assurer que le DOM est prêt avant de manipuler les divs.
document.addEventListener('DOMContentLoaded', function() {
    initPyodideAndLoadScript();

    // Initialiser Mermaid (configuration globale si nécessaire)
    mermaid.initialize({
        startOnLoad: false, // Nous allons appeler mermaid.run() manuellement
        // theme: 'dark', // Si vous voulez forcer un thème Mermaid (peut entrer en conflit avec Bootstrap)
        // securityLevel: 'loose', // Si vous avez des problèmes avec des labels HTML complexes
        flowchart: {
            // Options spécifiques aux flowcharts si besoin
            // useMaxWidth: false // Pourrait aider si les diagrammes sont coupés
        }
    });
});

// Fonction globale (ou exportée si vous utilisez des modules JS) pour être appelée depuis d'autres scripts
// Par exemple, depuis main.js après la génération de code ou la modification de l'éditeur.
/**
 * Met à jour le flowchart en fonction du code actuel dans l'éditeur.
 * @param {string} currentCode Le code Python actuel.
 */
async function updateFlowchart(currentCode) {
    if (!currentCode && typeof codeEditorInstance !== 'undefined' && codeEditorInstance) {
        // Si currentCode n'est pas fourni, essayer de le prendre de l'éditeur CodeMirror
        // (supposant que codeEditorInstance est une variable globale pour l'instance CodeMirror)
        currentCode = codeEditorInstance.getValue();
    }

    if (currentCode) {
        var mermaidString = await generateFlowchartFromCode(currentCode);
        if (mermaidString !== null) { // Ne pas essayer d'afficher si la génération a échoué
            await displayFlowchart(mermaidString, 'flowchart');
        }
    } else {
        // Effacer le diagramme si pas de code
        await displayFlowchart("", 'flowchart');
    }
}