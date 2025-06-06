// Récupération du textarea pour l'affichage des résultats
const output = document.getElementById("output");

/* 
Initialisation de CodeMirror :
On "transforme" le <textarea id="code"> en éditeur interactif mode Python.
lineNumbers : numérotation des lignes 
indentUnit  : taille de l'indentation
matchBrackets : met en évidence les paires de parenthèses/brackets
mode : mode de coloration syntaxique (ici Python)
*/
const editor = CodeMirror.fromTextArea(document.getElementById("code"), {
  mode: {
    name: "python",
    version: 3,
    singleLineStringErrors: false,
    theme: "dracula",
  },
  lineNumbers: true,
  indentUnit: 4,
  matchBrackets: true
});

// Exemple de code Python par défaut
editor.setValue(`sum([1, 2, 3, 4, 5])`);

// Message de démarrage
output.value = "Initialisation de Pyodide...\n";

// Mettre à jour le diagramme lors d'un changement dans l'éditeur (avec un délai pour ne pas surcharger)
var debounceTimer;
editor.on("change", function() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() {
        var currentCode = editor.getValue();
        if (typeof updateFlowchart === 'function') { // Vérifier que la fonction est définie
            updateFlowchart(currentCode);
        }
    }, 1000); // Délai de 1 seconde après la dernière frappe
});

/**
 * Fonction principale : 
 * - Charge Pyodide (en supposant qu'il est déjà inclus via un <script> externe).
 * - Si vous avez explicitement besoin d’une version ou d’un chemin particulier,
 *   vous pouvez ajouter l'option indexURL, par exemple :
 * 
 *   let pyodide = await loadPyodide({
 *       indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/"
 *   });
 * 
 * - Autrement:
 *  let pyodide = await loadPyodide();
 */
async function main() {
    // Pas de indexURL => Pyodide doit détecter l'URL du script
  // let pyodide = await loadPyodide();
  // On pourrait ensuite charger les modules de base (turtle, numpy, matplotlib, etc.)

  let pyodide = await loadPyodide({
    // je force explicitement l'URL racine où se trouvent les packages.json, wasm, etc.
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.18.1/full/"
    });
  output.value += "Pyodide est prêt !\n";
  return pyodide;
}

// Lance le chargement de Pyodide (promesse)
// On stocke la promesse pour y accéder plus tard
let pyodideReadyPromise = main();

/**
 * Ajoute du texte au textarea de sortie (output)
 * Préfixe chaque ligne par ">>>" pour rappeler le prompt Python
 */
function addToOutput(stdout) {
  output.value += ">>> " + stdout + "\n";
}

/**
 * Exécute le code contenu dans l’éditeur CodeMirror via Pyodide
 * - Attend que Pyodide soit prêt
 * - runPython(...) exécute le code Python
 * - Ajoute la valeur de retour ou l'erreur dans le textarea de sortie
 */
async function evaluatePython() {
  // On attend que Pyodide soit chargé
  let pyodide = await pyodideReadyPromise;
  try {
    console.log(editor.getValue())

    // Récupère le code dans l'éditeur
    // getValue() renvoie le contenu du textarea
    // (qui a été transformé en éditeur CodeMirror)  
    let userCode = editor.getValue();

    // Exécute le code Python avec Pyodide
    let output = pyodide.runPython(userCode);

    // Affiche le résultat
    addToOutput(output);
  } catch (err) {
    // Affiche l'erreur dans la zone de sortie
    addToOutput(err);
  }
}
