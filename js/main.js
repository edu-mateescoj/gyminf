// js/main.js
// Fichier JavaScript principal pour l'Outil de Création d'Exercices Python

// Variable globale pour l'instance de l'éditeur CodeMirror.
// Elle est déclarée ici pour être accessible dans différentes fonctions,
// notamment par triggerFlowchartUpdate dans flowchart-generator.js si besoin.
var codeEditorInstance;

// Attend que le DOM soit entièrement chargé avant d'exécuter le script.
document.addEventListener('DOMContentLoaded', function() {
    
    // Initialisation de l'éditeur CodeMirror pour la zone de texte '#code-editor'.
    codeEditorInstance = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
        mode: 'python',                // Mode de coloration syntaxique pour Python.
        theme: 'dracula',              // Thème visuel de l'éditeur.
        lineNumbers: true,             // Affichage des numéros de ligne.
        indentUnit: 4,                 // Nombre d'espaces pour une unité d'indentation.
        tabSize: 4,                    // Taille d'une tabulation.
        indentWithTabs: false,         // Indenter avec des espaces plutôt que des tabulations.
        lineWrapping: true,            // Retour à la ligne automatique pour les lignes longues.
        readOnly: false                // L'éditeur est modifiable par l'utilisateur.
    });

    // Variables pour stocker l'état lié à l'exécution du code et au défi.
    // let generatedCode = ''; // Peut-être utile si vous voulez garder une trace du code généré spécifiquement.
    let variableValuesFromExecution = {}; // Stocke les valeurs des variables après l'exécution du code Python.

    // NOTE: L'initialisation de Pyodide et Mermaid est maintenant gérée dans flowchart-generator.js
    // via initPyodideAndLoadScript() et mermaid.initialize() respectivement.
    // Il n'est pas nécessaire de les réinitialiser ici.

    // Vérifie la présence des IDs au démarrage
    const condSection = document.getElementById('frame-conditions');
    const condOptions = document.getElementById('conditions-options');
    const loopSection = document.getElementById('frame-loops');
    const loopOptions = document.getElementById('loops-options');

    console.log('condSection:', condSection);
    console.log('condOptions:', condOptions);
    console.log('loopSection:', loopSection);
    console.log('loopOptions:', loopOptions);

    // Gestion de l'affichage dynamique des cadres d'options

    /**
     * Affiche ou masque les options internes des conditions selon la coche principale.
     */
    function updateConditionsOptionsDisplay() {
        if(!condSection || !condOptions) {
            console.error('Conditions : IDs non trouvés!');
            return;
        }
        condOptions.style.display = condSection.checked ? 'flex' : 'none';
        console.log('Affichage Conditions:', condOptions.style.display);
    }

    /**
     * Affiche ou masque les options internes des boucles selon la coche principale.
     */
    function updateLoopsOptionsDisplay() {
        if(!loopSection || !loopOptions) {
            console.error('Boucles : IDs non trouvés!');
            return;
        }
        loopOptions.style.display = loopSection.checked ? 'flex' : 'none';
        console.log('Affichage Boucles:', loopOptions.style.display);
    }

    // --- Initialisation de l'état au chargement ---
    updateConditionsOptionsDisplay();
    updateLoopsOptionsDisplay();

    // --- Gestionnaires d'événements pour cases principales ---
    // Event listeners
    if(condSection)
        condSection.addEventListener('change', updateConditionsOptionsDisplay);
    if(loopSection)
        loopSection.addEventListener('change', updateLoopsOptionsDisplay);

    // --- Gestionnaire pour le bouton "Options Avancées" ---
    document.getElementById('advanced-mode').addEventListener('change', function() {
        const isAdvanced = this.checked;
        // Gestion options avancées pour Opérations
        let opDiv = document.getElementById('operations-options');
        if (isAdvanced && !document.getElementById('op-and')) {
            opDiv.insertAdjacentHTML('beforeend', `
                <div class="form-check form-check-inline">
                    <input class="form-check-input" type="checkbox" id="op-and">
                    <label class="form-check-label small" for="op-and">and</label>
                </div>
                <div class="form-check form-check-inline">
                    <input class="form-check-input" type="checkbox" id="op-or">
                    <label class="form-check-label small" for="op-or">or</label>
                </div>
                <div class="form-check form-check-inline">
                    <input class="form-check-input" type="checkbox" id="op-not">
                    <label class="form-check-label small" for="op-not">not</label>
                </div>
            `);
        } else if (!isAdvanced) {
            // Supprimer uniquement les coches avancées (si présentes)
            ['op-and', 'op-or', 'op-not'].forEach(id => {
                let el = document.getElementById(id);
                if (el) el.parentNode.remove();
            });
        }
        // Gestion options avancées pour Boucles
        let loopDiv = document.getElementById('loops-options');
        if (isAdvanced && !document.getElementById('loop-for-tuple')) {
            loopDiv.insertAdjacentHTML('beforeend', `
                <div class="form-check form-check-inline">
                    <input class="form-check-input" type="checkbox" id="loop-for-tuple">
                    <label class="form-check-label small" for="loop-for-tuple">for ... Tuple</label>
                </div>
                <div class="form-check form-check-inline">
                    <input class="form-check-input" type="checkbox" id="loop-continue">
                    <label class="form-check-label small" for="loop-continue">continue</label>
                </div>
                <div class="form-check form-check-inline">
                    <input class="form-check-input" type="checkbox" id="loop-while-op">
                    <label class="form-check-label small" for="loop-while-op">while ... op.</label>
                </div>
            `);
        } else if (!isAdvanced) {
            ['loop-for-tuple','loop-continue','loop-while-op'].forEach(id => {
                let el = document.getElementById(id);
                if (el) el.parentNode.remove();
            });
        }
    });
    //  Fin de l'affichage dynamique des cadres d'options

    // --- Gestionnaires d'événements pour les boutons ---

    // Gestionnaire pour le bouton "Générer un Code Aléatoire" (#generate-code-btn).
    const generateCodeButton = document.getElementById('generate-code-btn');
    if (generateCodeButton) {
        generateCodeButton.addEventListener('click', function() {
            console.log("Bouton 'Générer un Code Aléatoire' cliqué.");
            
            // 1. Récupérer les options de configuration sélectionnées par l'utilisateur.
            const generationOptions = {
                variables: document.getElementById('checkbox-variables').checked,
                arithmetic: document.getElementById('checkbox-arithmetic').checked,
                conditionals: document.getElementById('checkbox-conditionals').checked,
                loops: document.getElementById('checkbox-loops').checked,
                lists: document.getElementById('checkbox-lists').checked,
                strings: document.getElementById('checkbox-strings').checked,
                complexityLevel: parseInt(document.getElementById('complexity-level').value),
                numLines: parseInt(document.getElementById('num-lines').value),
                numVariables: parseInt(document.getElementById('num-variables').value)
            };

            // 2. Appeler la fonction de génération de code (doit être définie dans code-generator.js).
            var newGeneratedCode = "";
            if (typeof generateRandomPythonCode === 'function') {
                newGeneratedCode = generateRandomPythonCode(generationOptions);
            } else {
                console.warn("La fonction generateRandomPythonCode n'est pas définie (devrait être dans code-generator.js).");
                newGeneratedCode = "# Erreur: Le générateur de code aléatoire n'est pas disponible.\n# Veuillez entrer du code manuellement.";
            }
            
            // 3. Mettre à jour le contenu de l'éditeur CodeMirror avec le code généré.
            if (codeEditorInstance) {
                codeEditorInstance.setValue(newGeneratedCode);
            }
            
            // 4. Mettre à jour l'interface utilisateur pour le diagramme et le défi.
            // Le diagramme n'est PAS mis à jour ici, seulement au clic sur "Exécuter le code".
            var flowchartDisplayArea = document.getElementById('flowchart');
            if (flowchartDisplayArea) {
                flowchartDisplayArea.innerHTML = '<p class="text-center text-muted mt-3">Nouveau code généré. Cliquez sur "Exécuter le code" pour voir le diagramme.</p>';
            }
            
            // Réinitialiser les entrées de variables du défi et désactiver les boutons liés au défi.
            resetChallengeInputs(); // Fonction à définir pour nettoyer la section défi.
            const checkAnswersButton = document.getElementById('check-answers-btn');
            const showSolutionButton = document.getElementById('show-solution-btn');
            if (checkAnswersButton) checkAnswersButton.disabled = true;
            if (showSolutionButton) showSolutionButton.disabled = true;
        });
    }

    // Gestionnaire pour le bouton "Exécuter le code" (#run-code-btn).
    const runCodeButton = document.getElementById('run-code-btn');
    if (runCodeButton) {
        runCodeButton.addEventListener('click', async function() {
            console.log("Bouton 'Exécuter le code' cliqué.");
            
            if (!codeEditorInstance) {
                console.error("L'instance de CodeMirror n'est pas disponible.");
                alert("Erreur : L'éditeur de code n'est pas initialisé.");
                return;
            }
            const currentCode = codeEditorInstance.getValue();

            // 1. Mettre à jour le diagramme de flux.
            // triggerFlowchartUpdate est défini dans flowchart-generator.js.
            if (typeof triggerFlowchartUpdate === 'function') {
                await triggerFlowchartUpdate(); // Utilise codeEditorInstance globalement ou prend le code.
            } else {
                console.error("La fonction triggerFlowchartUpdate n'est pas définie.");
                alert("Erreur : La fonctionnalité de génération de diagramme n'est pas prête.");
            }

            // 2. Exécuter le code Python pour obtenir les valeurs des variables pour le défi.
            // Cette partie est complexe et implique la validation syntaxique, l'exécution tracée,
            // et la récupération des variables.
            try {
                // Réinitialiser les anciennes valeurs avant l'exécution.
                variableValuesFromExecution = {}; 
                resetChallengeInputs();

                // Fonction hypothétique pour exécuter le code et récupérer les variables.
                // Elle devrait gérer la validation syntaxique et les erreurs d'exécution.
                
                // Pour l'instant, nous simulons son appel et son résultat.
                // variableValuesFromExecution = await executeCodeAndExtractVariables(currentCode, pyodideInstance); 
                // NOTE: pyodideInstance est global dans flowchart-generator.js, 
                // mais si executeCodeAndExtractVariables est dans ce fichier, il faudrait le passer ou y accéder.
                // Pour l'instant, on suppose que la logique d'exécution est à implémenter.
                
                console.log("Logique d'exécution du code et d'extraction des variables à implémenter ici.");
                // Simuler une exécution réussie avec quelques variables pour le test de l'UI :
                // variableValuesFromExecution = { 'a': 10, 'b': 'hello', 'c': true }; 
                
                // Si vous implémentez la longue section de `tracingCode` de votre exemple précédent,
                // elle pourrait être encapsulée dans une fonction ici.
                // Par exemple :
                if (pyodide) { // pyodide est global depuis flowchart-generator.js
                     variableValuesFromExecution = await runAndTraceCodeForChallenge(currentCode, pyodide);
                } else {
                    console.warn("Pyodide n'est pas encore prêt pour exécuter le code du défi.");
                    alert("Le moteur Python n'est pas encore prêt. Veuillez patienter.");
                }


                // 3. Mettre à jour l'interface du défi avec les variables trouvées.
                populateChallengeInputs(variableValuesFromExecution); // Fonction à définir.
                
                // 4. Activer les boutons du défi si des variables ont été trouvées.
                const hasVariables = Object.keys(variableValuesFromExecution).length > 0;
                const checkAnswersButton = document.getElementById('check-answers-btn');
                const showSolutionButton = document.getElementById('show-solution-btn');
                if (checkAnswersButton) checkAnswersButton.disabled = !hasVariables;
                if (showSolutionButton) showSolutionButton.disabled = !hasVariables;

            } catch (error) {
                console.error("Erreur lors de l'exécution du code pour le défi:", error);
                // Afficher une modale d'erreur pour l'utilisateur (similaire à votre gestion d'erreur).
                // resetChallengeInputs(); // S'assurer que l'UI du défi est propre.
            }
        });
    }

    // Gestionnaire pour le bouton "Vérifier les réponses" (#check-answers-btn).
    const checkAnswersButton = document.getElementById('check-answers-btn');
    if (checkAnswersButton) {
        checkAnswersButton.addEventListener('click', function() {
            console.log("Bouton 'Vérifier les réponses' cliqué.");
            if (typeof checkStudentAnswers === 'function') { // Doit être défini dans validation.js
                const results = checkStudentAnswers(variableValuesFromExecution);
                if (typeof showFeedbackModal === 'function') { // Doit être défini (peut-être ici ou validation.js)
                    showFeedbackModal(results);
                }
            } else {
                console.warn("La fonction checkStudentAnswers n'est pas définie.");
            }
        });
    }

    // Gestionnaire pour le bouton "Révéler la solution" (#show-solution-btn).
    const showSolutionButton = document.getElementById('show-solution-btn');
    if (showSolutionButton) {
        showSolutionButton.addEventListener('click', function() {
            console.log("Bouton 'Révéler la solution' cliqué.");
            if (typeof revealCorrectSolution === 'function') { // Doit être défini dans validation.js
                revealCorrectSolution(variableValuesFromExecution);
            } else {
                console.warn("La fonction revealCorrectSolution n'est pas définie.");
            }
        });
    }
    
    // --- Fonctions utilitaires pour la section Défi ---
    // Ces fonctions manipulent l'interface utilisateur de la section "Défi Élève".
    // Elles pourraient être déplacées dans validation.js si elles deviennent volumineuses.

    /**
     * Réinitialise l'affichage des champs de saisie pour les variables du défi.
     */
    function resetChallengeInputs() {
        const container = document.getElementById('variables-container');
        if (container) {
            container.innerHTML = `
                <div class="col-12 text-center text-muted">
                    <p><i class="fas fa-code me-2"></i>Exécutez le code pour voir les variables du défi...</p>
                </div>`;
        }
        variableValuesFromExecution = {}; // Vider les valeurs stockées.
    }

    /**
     * Remplit la section du défi avec des champs de saisie pour chaque variable trouvée.
     * @param {Object} variables - Un objet où les clés sont les noms des variables et les valeurs sont leurs valeurs finales.
     */
    function populateChallengeInputs(variables) {
        const container = document.getElementById('variables-container');
        if (!container) return;
        container.innerHTML = ''; // Vider le contenu précédent.

        if (Object.keys(variables).length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center text-muted">
                    <p>Aucune variable à suivre n'a été trouvée après l'exécution du code.</p>
                </div>`;
            return;
        }

        const headerRow = document.createElement('div');
        headerRow.className = 'row mb-3'; // Pas besoin de classe spécifique 'variable-header'
        headerRow.innerHTML = `
            <div class="col-12">
                <h4 class="h6 mb-3">Quelle est la valeur de chaque variable à la fin de l'exécution ?</h4>
            </div>`;
        container.appendChild(headerRow);
        
        const variablesGrid = document.createElement('div');
        variablesGrid.className = 'row g-3'; // Grille Bootstrap pour l'espacement.
        
        // Trier les noms de variables pour un affichage cohérent.
        Object.keys(variables).sort().forEach(varName => {
            const colDiv = document.createElement('div');
            colDiv.className = 'col-lg-4 col-md-6 col-sm-12 mb-3'; // Colonnes responsives.
            
            // Utilisation de composants Bootstrap pour un look cohérent.
            const inputGroup = document.createElement('div');
            inputGroup.className = 'input-group';

            const inputGroupText = document.createElement('span');
            inputGroupText.className = 'input-group-text';
            inputGroupText.innerHTML = `<code>${varName}</code> =`; // Affichage du nom de la variable.
            
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-control student-answer-input'; // Classe pour récupérer les réponses.
            input.id = `var-input-${varName}`; // ID unique pour chaque input.
            input.name = varName; // Nom pour identifier la variable.
            input.placeholder = `Valeur de ${varName}...`;
            input.setAttribute('aria-label', `Valeur de ${varName}`);
            
            inputGroup.appendChild(inputGroupText);
            inputGroup.appendChild(input);
            colDiv.appendChild(inputGroup);
            variablesGrid.appendChild(colDiv);
        });
        container.appendChild(variablesGrid);
    }

    /**
     * Affiche la modale de feedback avec les résultats de la vérification.
     * @param {Object} feedbackResults - Les résultats de la vérification.
     */
    function showFeedbackModal(feedbackResults) {
        const modalTitle = document.getElementById('feedback-modal-label');
        const modalBody = document.getElementById('feedback-modal-content');
        const tryAgainButton = document.getElementById('modal-try-again-btn');

        if (!modalTitle || !modalBody || !tryAgainButton) return;

        // Construire le contenu HTML pour le feedback.
        // (Cette partie dépendra de la structure de feedbackResults)
        // Exemple simple :
        let contentHtml = '<ul class="list-group">';
        let allCorrect = true;
        for (const varName in feedbackResults) {
            const result = feedbackResults[varName];
            const icon = result.isCorrect ? '<i class="fas fa-check-circle text-success me-2"></i>' : '<i class="fas fa-times-circle text-danger me-2"></i>';
            contentHtml += `<li class="list-group-item">${icon}<strong>${varName}</strong>: Votre réponse '${result.studentAnswer}' - Correct: '${result.correctAnswer}'</li>`;
            if (!result.isCorrect) allCorrect = false;
        }
        contentHtml += '</ul>';

        if (allCorrect) {
            modalTitle.innerHTML = '<i class="fas fa-check-circle text-success me-2"></i> Félicitations !';
            contentHtml = '<p class="text-success">Toutes vos réponses sont correctes !</p>' + contentHtml;
            tryAgainButton.classList.add('d-none');
        } else {
            modalTitle.innerHTML = '<i class="fas fa-times-circle text-danger me-2"></i> Résultats';
            tryAgainButton.classList.remove('d-none');
        }
        
        modalBody.innerHTML = contentHtml;

        // Afficher la modale.
        const feedbackModal = new bootstrap.Modal(document.getElementById('feedback-modal'));
        feedbackModal.show();
    }


    // --- Initialisation au chargement de la page ---

    // Code Python d'exemple au démarrage.
    var defaultPythonCode = 
`# Code Python d'exemple
# Modifiez-le ou générez un nouveau code.
x = 5
y = 10
if x > y:
    result = "x est plus grand"
else:
    result = "y est plus grand ou égal"
print(result)
z = x + y`;
    if (codeEditorInstance) {
        codeEditorInstance.setValue(defaultPythonCode);
    }

    // Message initial dans la zone du diagramme.
    var flowchartDisplayArea = document.getElementById('flowchart');
    if (flowchartDisplayArea) {
        flowchartDisplayArea.innerHTML = '<p class="text-center text-muted mt-3">Cliquez sur "Exécuter le code" pour générer le diagramme de flux.</p>';
    }

    // Réinitialiser la section du défi au démarrage.
    resetChallengeInputs();
    const checkBtn = document.getElementById('check-answers-btn');
    const showSolBtn = document.getElementById('show-solution-btn');
    if (checkBtn) checkBtn.disabled = true;
    if (showSolBtn) showSolBtn.disabled = true;

}); // Fin de DOMContentLoaded


// --- Fonctions pour le Défi (à déplacer potentiellement dans validation.js) ---

/**
 * Fonction (à implémenter dans validation.js ou ici) pour exécuter le code
 * et extraire les variables pour le défi.
 * Doit retourner un objet comme {varName1: valeur1, varName2: valeur2}.
 * @param {string} code - Le code Python à exécuter.
 * @param {object} pyodide - L'instance de Pyodide.
 * @returns {Promise<Object>}
 */
async function runAndTraceCodeForChallenge(code, pyodide) {
    console.log("Exécution du code pour le défi...");
    //But: préparer et valider le code Python saisi par l’utilisateur, en l’échappant correctement 
    // et en vérifiant sa syntaxe dans Pyodide avant toute exécution ou traçage des variables.
    let tracedVariables = {};
    const escapedCodeForPythonTripleQuotes = code
    .replace(/\\/g, '\\\\') // 1. Échapper les \ en \\
    .replace(/"""/g, '\\"\\"\\"'); // 2. Échapper """ en \"\"\" (peu probable mais plus sûr)
    // Note: On n'a PAS besoin d'échapper les " simples ou ' simples ici pour """
    try {
    const syntaxValidationScript = `
error_detail = ""
parsed_code_string = """${escapedCodeForPythonTripleQuotes}""" # Injection ici
try:
    print(f"--- Contenu de parsed_code_string pour ast.parse ---") # LOG PYTHON REDIRIGÉ PAR PYODIDE DANS LA CONSOLE
    print(parsed_code_string)                                    # LOG PYTHON
    print(f"--- Fin du contenu ---")                              # LOG PYTHON
    ast.parse(parsed_code_string)
except Exception as e:
    import traceback
    error_detail = f"{type(e).__name__}: {str(e)}\\n{traceback.format_exc()}"
    # Pour débogage, voir ce que ast.parse a réellement reçu :
    # print(f"Code passé à ast.parse:\\n{parsed_code_string}") 
    raise
    
"Syntax OK"    
`;
console.log("Script de validation syntaxique pour le défi:", syntaxValidationScript); // LOG JS
await pyodide.runPythonAsync(syntaxValidationScript);
} catch (syntaxValidationError) {
    console.error("Erreur de syntaxe DANS LE CODE UTILISATEUR avant exécution du défi:", syntaxValidationError);
    // Gérer cette erreur (par exemple, afficher une modale à l'utilisateur)
    // et ne pas procéder à l'exécution de tracingWrapper.
    throw syntaxValidationError; // Ou retourner un indicateur d'erreur
}
        // Code pour tracer les variables: maintenant redondance avec escapedCodeForPythonTripleQuotes
        const escapedCodeForPythonExecution = code
    .replace(/\\/g, '\\\\')
    .replace(/"""/g, '\\"\\"\\"'); // Ou tout autre échappement nécessaire... à voir

    const tracingWrapper = `
import types    # à importer globalement pour isinstance
import json     # déjà importé par Pyodide ? pour être sûr

user_ns = {}    # Dictionnaire pour le namespace utilisateur
try:
    exec("""${escapedCodeForPythonExecution}""", user_ns)
except Exception as e:
    import traceback
    error_detail = f"{type(e).__name__}: {str(e)}\\n{traceback.format_exc()}"
    raise

_final_vars = {}

# On s'intéresse aux variables qui existent APRES l'exécution du code.
for _var_name, _val in user_ns.items(): 

    # Filtre 1: Exclure les variables purement internes au wrapper
    if _var_name.startswith('__') and _var_name.endswith('__'):
        continue

    # Filtre 2: Exclure les modules/fonctions standards et les variables spécifiques
    # (On peut ajuster cette liste selon les besoins, mais on veut éviter les variables internes de Pyodide)
    if _var_name in ['pyodide', 'sys', 'micropip', 'json', 'types', 'ast', 'traceback', 'error_detail',
                     'current_code', 'user_python_code', # Variables passées par JS au script runner
                     'cfg_instance', 'mermaid_output', 'error_message', 'output_dict', # Variables du runner de flowchart
                     'parsed_code_string', 'List', 'Dict', 'Set', 'Tuple', 'Optional'
                     ]:
        continue

    # Filtre 3: Exclure les modules et fonctions/types (sauf si vous voulez les lister)
    # La vérification isinstance est plus robuste que type(_val).__name__
    if isinstance(_val, (types.ModuleType, types.FunctionType, type, types.BuiltinFunctionType, types.BuiltinMethodType)):
        # On pourrait choisir de les lister comme "<type module>" etc. ou simplement les ignorer.
        # Pour le défi élève, on veut généralement les valeurs des variables de données.
        continue
    
    # À ce stade, _var_name est probablement une variable définie par l'utilisateur.
    # Elle peut avoir été créée par le code utilisateur, ou existait avant et a été modifiée,
    # ou existait avant et n'a pas été modifiée mais passe les filtres.

    # Logique de sérialisation (votre code existant est bon ici)
    if isinstance(_val, (str, int, float, bool, list, dict, tuple, set)) or _val is None:
        _final_vars[_var_name] = _val
    else:
        try:
            _final_vars[_var_name] = repr(_val) 
        except:
            _final_vars[_var_name] = "<valeur non sérialisable>"

json.dumps(_final_vars)
`;
        // Attention: la sérialisation JSON directe de tous les types Python peut échouer.
        // repr() est plus sûr pour l'affichage mais plus difficile à parser en retour.
        // La version avec `_final_vars[_var_name] = _val` et `json.dumps` est plus robuste si les types sont simples.

console.log("tracingWrapper passé à Pyodide pour le défi:", tracingWrapper);
try {
    // Validation syntaxique :
    // console.log("Code pour validation syntaxe défi:", `import ast; ast.parse("""${code.replace(/"/g, '\\"').replace(/\\/g, '\\\\')}""")`);
    // await pyodide.runPythonAsync(`import ast; ast.parse("""${code.replace(/"/g, '\\"').replace(/\\/g, '\\\\')}""")`);
        
        let resultJson = await pyodide.runPythonAsync(tracingWrapper);
        if (resultJson) {
            tracedVariables = JSON.parse(resultJson);
        }
        console.log("Variables tracées pour le défi:", tracedVariables);

    } catch (error) {
        console.error("Erreur lors de l'exécution tracée pour le défi:", error);
        // Afficher une modale d'erreur spécifique pour l'exécution du défi.
        alert(`Erreur lors de l'exécution du code pour le défi : ${error.message}`);
        tracedVariables = {}; // Retourner un objet vide en cas d'erreur.
    }
    return tracedVariables;
}


/**
 * Fonction (à implémenter dans validation.js) pour vérifier les réponses de l'élève.
 * @param {Object} correctVariableValues - Les valeurs correctes des variables.
 * @returns {Object} - Un objet détaillant les résultats de la vérification.
 */
function checkStudentAnswers(correctVariableValues) {
    console.log("Vérification des réponses de l'élève...");
    const results = {};
    const inputs = document.querySelectorAll('.student-answer-input');
    inputs.forEach(input => {
        const varName = input.name;
        const studentAnswer = input.value.trim();
        const correctAnswer = correctVariableValues[varName];
        
        // Logique de comparaison simple (à affiner pour les types)
        // Pour l'instant, on compare les chaînes après conversion.
        let isCorrect = false;
        let correctAnswerStr = String(correctAnswer);
        if (typeof correctAnswer === 'string') {
            isCorrect = studentAnswer === correctAnswer;
        } else if (typeof correctAnswer === 'boolean') {
            isCorrect = studentAnswer.toLowerCase() === correctAnswerStr.toLowerCase();
        } else if (typeof correctAnswer === 'number') {
            isCorrect = parseFloat(studentAnswer) === correctAnswer;
        } else { // Pour listes, dictionnaires, etc., la comparaison de chaînes est une approximation
            isCorrect = studentAnswer === correctAnswerStr; 
        }

        results[varName] = {
            studentAnswer: studentAnswer,
            correctAnswer: correctAnswerStr, // Afficher la version chaîne de la réponse correcte
            isCorrect: isCorrect
        };
    });
    console.log("Résultats de la vérification:", results);
    return results;
}

/**
 * Fonction (à implémenter dans validation.js) pour révéler la solution.
 * @param {Object} correctVariableValues - Les valeurs correctes des variables.
 */
function revealCorrectSolution(correctVariableValues) {
    console.log("Révélation de la solution...");
    const inputs = document.querySelectorAll('.student-answer-input');
    inputs.forEach(input => {
        const varName = input.name;
        if (correctVariableValues.hasOwnProperty(varName)) {
            input.value = String(correctVariableValues[varName]); // Convertir en chaîne pour l'input
            input.classList.add('is-valid'); // Style visuel pour montrer la solution
            input.disabled = true; // Empêcher la modification après révélation
        }
    });
    // Désactiver les boutons après avoir révélé la solution
    const checkBtn = document.getElementById('check-answers-btn');
    const showSolBtn = document.getElementById('show-solution-btn');
    if (checkBtn) checkBtn.disabled = true;
    if (showSolBtn) showSolBtn.disabled = true;
}