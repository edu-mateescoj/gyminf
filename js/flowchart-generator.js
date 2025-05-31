// js/flowchart-generator.js

// Variable globale pour stocker l'instance de Pyodide une fois chargée.
var pyodide = null;
// Variable pour stocker le code de votre classe CFG une fois chargé.
var cfgPythonScript = "";
// Référence au bandeau de chargement
var loadingOverlay = null;

/**
 * Affiche ou masque le bandeau de chargement.
 * @param {boolean} show Vrai pour afficher, faux pour masquer.
 */
function setLoadingState(show) {
    if (!loadingOverlay) {
        loadingOverlay = document.getElementById('loading-overlay');
    }
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

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
        setLoadingState(false); // Masquer le chargement après succès

    } catch (error) {
        console.error("Erreur lors de l'initialisation de Pyodide ou du chargement du script:", error);
        // Afficher une erreur à l'utilisateur dans le div du flowchart
        var flowchartDiv = document.getElementById('flowchart');
        if (flowchartDiv) {
            flowchartDiv.innerHTML = '<div class="alert alert-danger" role="alert">Erreur critique : Le moteur Python n\'a pas pu démarrer. Vérifiez la console et réessayez.</div>';
        }
        setLoadingState(false); // Masquer aussi en cas d'erreur pour ne pas bloquer la page
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
        // Afficher un message plus discret si l'utilisateur clique trop tôt
        var flowchartDiv = document.getElementById('flowchart');
        if (flowchartDiv) {
            flowchartDiv.innerHTML = '<div class="alert alert-info" role="alert">Le générateur de diagramme est en cours d\'initialisation. Veuillez patienter quelques instants.</div>';
        }
        return null;
    }

    if (!pythonCode || pythonCode.trim() === "") {
        console.warn("Aucun code Python fourni pour générer le diagramme.");
        return ""; // Important pour que displayFlowchart affiche le message "Aucun diagramme"
    }

    console.log("Génération du diagramme pour le code :", pythonCode);
    setLoadingState(true); // Afficher le chargement pendant la génération du diagramme

    try {
        // Passer le code Python à notre script.
        // Nous allons créer une instance de ControlFlowGraph et appeler ses méthodes.
        // `pyodide.globals.set` permet de rendre des variables JS accessibles depuis Python.
        pyodide.globals.set("user_python_code", pythonCode);

        // Script Python à exécuter dans Pyodide pour utiliser la classe CFG.
        var pythonRunnerScript = `
import ast # S'assurer qu'ast est importé si ce n'est pas déjà fait
# La classe ControlFlowGraph est déjà définie par l'exécution de cfgPythonScript lors de initPyodideAndLoadScript

mermaid_output = ""
error_message = ""
try:
    # Récupérer le code utilisateur passé depuis JavaScript
    current_code = user_python_code # Variable globale JS rendue accessible à Python
    
    # Créer une instance de la classe ControlFlowGraph
    #    Le __init__ de ControlFlowGraph fait ast.parse(current_code) et initialise les structures.
    cfg_instance = ControlFlowGraph(current_code) 
    
    # Lancer la visite à partir de la racine de l'AST (le module) pour construire le CFG interne (remplir self.nodes, self.edges, etc.)
    #    cfg_instance.tree est déjà initialisé par le __init__
    cfg_instance.visit(cfg_instance.tree, None) # Le parent initial est None
    
    # Obtenir la sortie Mermaid
    mermaid_output = cfg_instance.to_mermaid()

    if mermaid_output is None: # Sécurité supplémentaire
        mermaid_output = "graph TD\\n    error_node[Erreur: to_mermaid a retourné None en Python]"  

except Exception as e:
    import traceback
    error_message = f"Erreur Python lors de la génération du CFG: {type(e).__name__}: {str(e)}\\n{traceback.format_exc()}"
    print(error_message) # Afficher dans la console Pyodide (visible dans la console du navigateur)

# Renvoyer la sortie Mermaid (ou une chaîne vide si erreur) et le message d'erreur
# Ces variables seront accessibles depuis JavaScript via pyodide.globals.get()
output_dict = {"mermaid": mermaid_output, "error": error_message}
output_dict # C'est le dict retourné à JS
`;
        // Exécuter le script runner
        var resultProxy = await pyodide.runPythonAsync(pythonRunnerScript);
        var output = resultProxy.toJs(); // Convertir le dictionnaire Python en objet JS
        resultProxy.destroy(); // Libérer la mémoire du proxy
        setLoadingState(false); // Masquer le chargement après la génération
        console.log("Résultat de la génération du diagramme:", output); // DEBUG
        // Vérifier si une erreur a été capturée dans le script Python
        if (output.error) {
            console.error("Erreur Python détaillée:", output.error);
            // Afficher l'erreur dans le div du flowchart
            var flowchartDivDisplay  = document.getElementById('flowchart'); // Renommé pour éviter conflit
            if (flowchartDivDisplay) {
                var preFormattedError = output.error.replace(/\\n/g, '<br>'); // Remplacer les sauts de ligne Python
                flowchartDiv.innerHTML = '<div class="alert alert-warning" role="alert"><strong>Erreur lors de la génération du diagramme :</strong><br><pre style="white-space: pre-wrap; word-break: break-all;">' + preFormattedError + '</pre></div>';
            }
            return null; // Indiquer une erreur
        }

        //DEBUG messages erreur avec retours undefined
        console.log("Chaîne Mermaid générée par Python:", output.mermaid); // LOG 1
        console.log("Type de output.mermaid:", typeof output.mermaid); // LOG 2
        
        // S'assurer que output.mermaid est une chaîne. Si Python retourne None, output.mermaid sera null.
        var returnValue = typeof output.mermaid === 'string' ? output.mermaid : "graph TD\n    py_ret_not_str[Erreur: Python n'a pas retourné une chaîne pour Mermaid]";
        console.log("Valeur retournée par generateFlowchartFromCode:", returnValue); // LOG 3
        console.log("Type de la valeur retournée:", typeof returnValue); // LOG 4
        return returnValue;

    } catch (error) {
        console.error("Erreur JavaScript lors de l'appel à Pyodide pour générer le diagramme:", error);
        setLoadingState(false); // Masquer le chargement
        var flowchartDivError = document.getElementById('flowchart'); // Renommé
        if (flowchartDivError) {
            flowchartDivError.innerHTML = '<div class="alert alert-danger" role="alert">Erreur majeure lors de la communication avec le moteur Python. Vérifiez la console.</div>';
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

    console.log("displayFlowchart appelée avec mermaidCode de type:", typeof mermaidCode);
    // console.log("Contenu mermaidCode:", mermaidCode); // Décommenter pour voir la chaîne exacte
    // 
    var flowchartContainer = document.getElementById(targetDivId);
    if (!flowchartContainer) {
        console.error("Le conteneur de diagramme avec l'ID '" + targetDivId + "' n'a pas été trouvé.");
        return;
    }

    if (mermaidCode === null) { 
        // Une erreur a déjà été affichée par generateFlowchartFromCode
        return;
    }
    // Si mermaidCode est undefined (ne devrait plus arriver avec les garde-fous dans generateFlowchartFromCode)
    // ou une chaîne vide.
    if (typeof mermaidCode !== 'string' || mermaidCode.trim() === "") {
        console.warn("mermaidCode est invalide ou vide. Affichage du message par défaut.");
        flowchartContainer.innerHTML = '<p class="text-center text-muted mt-3">Aucun diagramme à afficher ou code invalide. Entrez du code Python et cliquez sur "Exécuter le code".</p>';
        // Si la chaîne est vide mais valide (ex: "graph TD"), Mermaid pourrait quand même essayer de la rendre.
        // On s'assure ici que si c'est vide après trim, on affiche notre message.
        if (typeof mermaidCode === 'string' && mermaidCode.trim() === "" && mermaidCode.indexOf("graph") === -1) {
             return;
        }
    }
/*
 * MOD:
    // Gérer explicitement undefined en plus de null
    if (mermaidCode === null || typeof mermaidCode === 'undefined') {
        // Le message d'erreur est déjà affiché par generateFlowchartFromCode si null
        // Si undefined, on peut afficher un message générique ou ne rien faire si generateFlowchartFromCode
        // est censé toujours retourner string ou null.
        // Pour être sûr, si c'est undefined, on peut le traiter comme une chaîne vide.
        if (typeof mermaidCode === 'undefined') {
            console.warn("displayFlowchart a reçu 'undefined' pour mermaidCode. Traité comme une chaîne vide.");
            mermaidCode = ""; // Traiter undefined comme une chaîne vide
        } else { // C'était null, donc une erreur a déjà été affichée
            return;
        }
    }
*/
    try {
        // Nettoyer le conteneur avant d'ajouter le nouveau diagramme
        flowchartContainer.innerHTML = ''; 
        
        // Créer un élément temporaire pour que Mermaid puisse le traiter
        var tempDiv = document.createElement('div');
        tempDiv.className = 'mermaid'; // La classe que Mermaid recherche
        tempDiv.textContent = mermaidCode; // Mettre le code Mermaid ici
        flowchartContainer.appendChild(tempDiv);

        // Forcer Mermaid à re-parser et rendre le nouveau contenu
        // delete tempDiv.dataset.processed; // Au cas où Mermaid marque les éléments
        await mermaid.run({
            nodes: [tempDiv] // Spécifier le nœud à rendre pour éviter de re-rendre les anciens
        });
        console.log("Diagramme Mermaid rendu.");

    } catch (error) {
        console.error("Erreur lors du rendu du diagramme Mermaid:", error, "Avec le code Mermaid:", mermaidCode);
        var errorText = error.message || "Erreur inconnue de rendu Mermaid.";
        if (mermaidCode.trim() === "") { // Si la chaîne était vide, l'erreur est normale
            errorText = "La chaîne Mermaid était vide. " + errorText;
        }
        flowchartContainer.innerHTML = '<div class="alert alert-danger" role="alert">Erreur lors de l\'affichage du diagramme :<br><pre style="white-space: pre-wrap; word-break: break-all;">' + errorText + '</pre></div>';
    }
}

// Initialiser Pyodide et charger le script dès que la page est prête.
// Nous utilisons DOMContentLoaded pour s'assurer que le DOM est prêt avant de manipuler les divs.
document.addEventListener('DOMContentLoaded', function() {
    
    loadingOverlay = document.getElementById('loading-overlay'); // Initialiser la référence ici
    initPyodideAndLoadScript(); // affichera le bandeau

    // Initialiser Mermaid (configuration globale si nécessaire)
    mermaid.initialize({
        startOnLoad: false, // Nous allons appeler mermaid.run() manuellement
        // theme: 'dark', // Mermaid devrait hériter du thème Bootstrap via data-bs-theme="dark" sur <html> (peut entrer en conflit avec Bootstrap??)
        securityLevel: 'loose', // Si vous avez des problèmes avec des labels HTML complexes
        flowchart: {
            htmlLabels: true // Important pour que <br/> fonctionne bien dans les labels
            // useMaxWidth: false // Pourrait aider si les diagrammes sont coupés
        }
    });
});

// Fonction globale pour être appelée depuis d'autres scripts
// Fonction principale pour mettre à jour le diagramme, appelée par un événement externe (bouton).
/**
 * Récupère le code, génère le diagramme et l'affiche.
 */
async function triggerFlowchartUpdate() {
    // S'assurer que codeEditorInstance est accessible (doit être défini globalement ou passé en paramètre)
    if (typeof codeEditorInstance === 'undefined' || !codeEditorInstance) {
        console.error("L'instance de CodeMirror (codeEditorInstance) n'est pas disponible.");
        alert("Erreur : L'éditeur de code n'est pas initialisé.");
        return;
    }
    var currentCode = codeEditorInstance.getValue();

    if (currentCode) {
        var mermaidString = await generateFlowchartFromCode(currentCode);
        // displayFlowchart gère maintenant null et les chaînes vides
        await displayFlowchart(mermaidString, 'flowchart');
    } else {
        // Effacer le diagramme si pas de code
        await displayFlowchart("", 'flowchart');
    }
}