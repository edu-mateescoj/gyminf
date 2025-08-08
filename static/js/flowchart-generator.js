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
        // 1. Charger le moteur Pyodide
        pyodide = await loadPyodide();
        console.log("Pyodide chargé avec succès.");

        // DEBUG COROUTINE
        pyodide.globals.set("js_input_handler", handlePythonInput); // 

        // Charger les packages Python nécessaires (ici, 'ast' est intégré, donc pas besoin de micropip pour lui).
        // Si autres dépendances non standard, il faudrait les charger.
        
/*        
        // Charger micropip, qui est nécessaire pour installer des paquets tiers
        console.log("Chargement de micropip...");
        await pyodide.loadPackage("micropip");
        const micropip = pyodide.pyimport("micropip");
        console.log("micropip chargé.");
        
       
        // Installer pyodide-turtle directement depuis son URL de "wheel" (.whl) FICHIER LOCAL
        // C'est la méthode correcte car il n'est ni sur PyPI, ni dans les paquets par défaut.
        // const turtleWheelUrl = "./turtle-0.0.1-py3-none-any.whl"; 
        const turtleWheelUrl = "./pyo_js_turtle-0.1.1-py3-none-any.whl"; // Version vincent bouillot
        console.log(`Installation de Turtle (version Vincent Bouillot) depuis ${turtleWheelUrl}...`);
        await micropip.install(turtleWheelUrl);
        console.log("Turtle (version Vincent Bouillot)  installé avec succès.");
*/        

        // Charger le contenu du script Python (MyCFG.py)
        const response = await fetch('/static/py/MyCFG.py');
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
        return { mermaid: "", canonicalCode: "" }; // Important pour que displayFlowchart affiche le message "Aucun diagramme"
    }

    console.log("Génération unifiée (diagramme + code canonique)...");
    setLoadingState(true); // Afficher le chargement pendant la génération du diagramme

    try {
        // Passer le code Python à notre script.
        // Nous allons créer une instance de ControlFlowGraph et appeler ses méthodes.
        // `pyodide.globals.set` permet de rendre des variables JS accessibles depuis Python.
        pyodide.globals.set("user_python_code", pythonCode);

        // Script Python à exécuter dans Pyodide pour utiliser la classe CFG.
        const pythonRunnerScript = `
import ast # S'assurer qu'ast est importé si ce n'est pas déjà fait
# La classe ControlFlowGraph est déjà définie par l'exécution de cfgPythonScript lors de initPyodideAndLoadScript

output_dict = {}
error_message = ""
try:
    # Récupérer le code utilisateur passé depuis JavaScript
    current_code = user_python_code # Variable globale JS rendue accessible à Python
    
    # Créer une instance de la classe ControlFlowGraph
    #    Le __init__ de ControlFlowGraph fait ast.parse(current_code) et initialise les structures.
    cfg_instance = ControlFlowGraph(current_code) 
    
    # Appel de la nouvelle méthode unifiée qui exécute la visite, la génération Mermaid et la normalisation du code.
    # Ceci remplace les appels séparés à .visit() et .to_mermaid() pour optimiser les performances.
    output_dict = cfg_instance.process_and_get_results()
    
except Exception as e:
    import traceback
    error_message = f"Erreur Python lors de la génération du CFG: {type(e).__name__}: {str(e)}\\n{traceback.format_exc()}"
    print(error_message) # Afficher dans la console Pyodide (visible dans la console du navigateur)
    # Créer un dictionnaire d'erreur cohérent avec la sortie normale
    output_dict = {"mermaid": "", "canonical_code": "", "error": error_message}

# Renvoyer le dictionnaire complet à JavaScript
output_dict # C'est le dict retourné à JS
`;
        // Exécuter le script runner
        const resultProxy = await pyodide.runPythonAsync(pythonRunnerScript);
        // Convertir le résultat en objet JS. Si c'est un Map, il faut le traiter comme tel.
        var outputData;
        if (typeof resultProxy.toJs === 'function') {
            // La méthode standard pour convertir un PyProxy en objet JS.
            // Elle devrait retourner un objet simple si le Python retourne un dict.
            // ... Mais si elle retourne un Map, nous devons le gérer!
            let potentialMap = resultProxy.toJs(); 
            if (potentialMap instanceof Map) {
                console.log("Pyodide a retourné un Map, conversion en objet...");
                outputData = Object.fromEntries(potentialMap); // Convertit Map en objet simple
            } else {
                outputData = potentialMap; // C'était déjà un objet simple
            }
        } else {
            // Fallback si toJs n'est pas une fonction (ne devrait pas arriver avec PyProxy)
            console.warn("resultProxy.toJs n'est pas une fonction. Tentative d'accès direct.");
            outputData = resultProxy; // Peut être risqué
        }
        resultProxy.destroy(); // Libérer la mémoire du proxy
        setLoadingState(false); // Masquer le chargement après la génération
         
        // Vérifier si une erreur a été capturée dans le script Python
        if (outputData.error) {
            console.error("Erreur Python détaillée:", outputData.error);
            const flowchartDivDisplay = document.getElementById('flowchart');
            if (flowchartDivDisplay) {
                const preFormattedError = String(outputData.error).replace(/\\n/g, '<br>');
                flowchartDivDisplay.innerHTML = '<div class="alert alert-warning" role="alert"><strong>Erreur Python lors de la génération :</strong><br><pre style="white-space: pre-wrap; word-break: break-all;">' + preFormattedError + '</pre></div>';
            }
            return null; // Indiquer une erreur à la fonction appelante
        }

       // Retourner l'objet avec les deux résultats si tout s'est bien passé
        return {
            mermaid: outputData.mermaid,
            canonicalCode: outputData.canonical_code,
            ast_dump: outputData.ast_dump
        };

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
    console.log("Contenu mermaidCode:", mermaidCode); // DEBUG
    // 
    var flowchartContainer = document.getElementById(targetDivId);
    if (!flowchartContainer) {
        console.error("Le conteneur de diagramme avec l'ID '" + targetDivId + "' n'a pas été trouvé.");
        return;
    }

    if (mermaidCode === null || typeof mermaidCode === 'undefined') { 
         if (typeof mermaidCode === 'undefined') { console.warn("mermaidCode de type undefined"); }
        else { // C'était null, donc une erreur a déjà été affichée
            return; // La fonction displayFlowchart s'arrête ici.
        }
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
        // 1. On appelle la fonction et on stocke l'objet complet dans "results"
        var results = await generateFlowchartFromCode(currentCode);

        // 2. On vérifie que l'objet "results" existe ET qu'il contient bien la propriété "mermaid"
        if (results && results.mermaid) {
            // 3. On passe uniquement la propriété "mermaid" à la fonction d'affichage
            await displayFlowchart(results.mermaid, 'flowchart');
        } else {
            // Gérer le cas où la génération a échoué et n'a rien retourné de valide
            await displayFlowchart("", 'flowchart');
        }
        
        // 4. On retourne l'objet complet pour que main.js puisse l'utiliser
        return results;

    } else {
        // Effacer le diagramme si pas de code
        await displayFlowchart("", 'flowchart');
        return null; // Retourner null si pas de code
    }
}