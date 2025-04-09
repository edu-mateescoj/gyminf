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
    singleLineStringErrors: false
  },
  lineNumbers: true,
  indentUnit: 4,
  matchBrackets: true
});

// Exemple de code Python par défaut
editor.setValue(`sum([1, 2, 3, 4, 5])`);

// Message de démarrage
output.value = "Initialisation de Pyodide...\n";

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
 * - Sinon, loadPyodide() détectera automatiquement l'URL à partir du script chargé.
 */
async function main() {
  let pyodide = await loadPyodide();
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
function addToOutput(text) {
  output.value += ">>> " + text + "\n";
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
    // Récupère le code dans l'éditeur
    let userCode = editor.getValue();

    // Exécute le code Python avec Pyodide
    let result = pyodide.runPython(userCode);

    // Affiche le résultat
    addToOutput(result);
  } catch (err) {
    // Affiche l'erreur dans la zone de sortie
    addToOutput(err);
  }
}
