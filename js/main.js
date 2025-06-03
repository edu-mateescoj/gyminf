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
    let variableValuesFromExecution = {}; // Stocke les valeurs des variables après l'exécution du code Python.

    // --- Gestion de l'affichage dynamique des cadres d'options ---
        // Fonction d'initialisation pour les options dynamiques
    function initializeDynamicOptions() {
        console.log("Tentative d'initialisation des options dynamiques...");// Récupération des éléments DOM pour les sections Conditions et Boucles.

        const condSectionCheckbox = document.getElementById('frame-conditions');
        const condOptionsContainer = document.getElementById('conditions-options');
        const loopSectionCheckbox = document.getElementById('frame-loops');
        const loopOptionsContainer = document.getElementById('loops-options');

    // Log initial pour vérifier si les éléments sont bien trouvés.
        // Log amélioré pour voir si les éléments sont trouvés à ce stade
        console.log('ELEMENT CHECK - Checkbox Conditions (frame-conditions):', condSectionCheckbox ? 'Trouvé' : 'NON TROUVÉ');
        console.log('ELEMENT CHECK - Conteneur Options Conditions (conditions-options):', condOptionsContainer ? 'Trouvé' : 'NON TROUVÉ');
        console.log('ELEMENT CHECK - Checkbox Boucles (frame-loops):', loopSectionCheckbox ? 'Trouvé' : 'NON TROUVÉ');
        console.log('ELEMENT CHECK - Conteneur Options Boucles (loops-options):', loopOptionsContainer ? 'Trouvé' : 'NON TROUVÉ');

    /**
     * Affiche ou masque les options internes des conditions selon l'état de la case à cocher principale.
     */
    function updateConditionsOptionsDisplay() {
        // La vérification des éléments est maintenant déjà faite dans initializeDynamicOptions
    
        // Si la case principale "Conditions" est cochée, affiche les options spécifiques (display: 'flex').
        // Sinon, les masque (display: 'none').
        // 'flex' est utilisé car le conteneur d'options est stylé avec `d-flex`.
        condOptionsContainer.style.display = condSectionCheckbox.checked ? 'flex' : 'none';
        console.log('État affichage options Conditions changé pour:', condOptionsContainer.style.display, '(Checkbox cochée:', condSectionCheckbox.checked, ')');
        
        // BORDURE DEBOGAGE
        /*if (condSectionCheckbox.checked) {
            condOptionsContainer.style.border = "2px solid red"; 
            condOptionsContainer.style.padding = "5px"; // Ajout d'un padding pour le rendre plus visible
        } else {
            condOptionsContainer.style.border = "none";
            condOptionsContainer.style.padding = "0";
        }*/
    }

    /**
     * Affiche ou masque les options internes des boucles selon l'état de la case à cocher principale.
     */
    function updateLoopsOptionsDisplay() {
         // La vérification des éléments est maintenant déjà faite dans initializeDynamicOptions

        // Si la case principale "Boucles" est cochée, affiche les options spécifiques (display: 'flex').
        // Sinon, les masque (display: 'none').
        loopOptionsContainer.style.display = loopSectionCheckbox.checked ? 'flex' : 'none';
        console.log('État affichage options Boucles changé pour:', loopOptionsContainer.style.display, '(Checkbox cochée:', loopSectionCheckbox.checked, ')');
    }

    // On peut enlever les anciens listeners avant d'ajouter les nouveaux, par précaution,
    // bien qu'avec DOMContentLoaded, cela ne devrait pas être nécessaire s'il ne s'exécute qu'une fois.
    
    // Pour éviter les attachements multiples si cette fonction était appelée plusieurs fois (peu probable ici)
    condSectionCheckbox.removeEventListener('change', updateConditionsOptionsDisplay);
    condSectionCheckbox.addEventListener('change', updateConditionsOptionsDisplay);
    
    loopSectionCheckbox.removeEventListener('change', updateLoopsOptionsDisplay);
    loopSectionCheckbox.addEventListener('change', updateLoopsOptionsDisplay);

    // --- Initialisation de l'état d'affichage au chargement de la page ---
    // Appelle les fonctions une fois au début pour s'assurer que l'état initial (masqué par défaut si non coché) est correct.
    updateConditionsOptionsDisplay();
    updateLoopsOptionsDisplay();
    console.log("Options dynamiques initialisées et listeners attachés.");
    }

    // Appeler la fonction d'initialisation
    initializeDynamicOptions();


    // --- Gestionnaire pour le bouton "Options Avancées" ---
    const advancedModeCheckbox = document.getElementById('advanced-mode');
    if (advancedModeCheckbox) {
        advancedModeCheckbox.addEventListener('change', function() {
            const isAdvanced = this.checked;
            const opOptionsDiv = document.getElementById('operations-options'); // Cible le bon conteneur d'options
            const loopOptionsDiv = document.getElementById('loops-options');

            // Gestion options avancées pour Opérations
            if (opOptionsDiv) { // Vérifier que le conteneur existe
                if (isAdvanced) {
                    // Ajouter les options avancées si elles n'existent pas déjà
                    if (!document.getElementById('op-and')) {
                        opOptionsDiv.insertAdjacentHTML('beforeend', `
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="checkbox" id="op-and">
                                <label class="form-check-label small" for="op-and">and</label>
                            </div>`);
                    }
                    if (!document.getElementById('op-or')) {
                        opOptionsDiv.insertAdjacentHTML('beforeend', `
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="checkbox" id="op-or">
                                <label class="form-check-label small" for="op-or">or</label>
                            </div>`);
                    }
                    if (!document.getElementById('op-not')) {
                        opOptionsDiv.insertAdjacentHTML('beforeend', `
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="checkbox" id="op-not">
                                <label class="form-check-label small" for="op-not">not</label>
                            </div>`);
                    }
                } else {
                    // Supprimer les options avancées si elles existent
                    ['op-and', 'op-or', 'op-not'].forEach(id => {
                        let el = document.getElementById(id);
                        if (el && el.parentNode) el.parentNode.remove(); });
                }
            } else {
                console.warn("Conteneur 'operations-options' non trouvé pour le mode avancé.");
            }

            // Gestion options avancées pour Boucles
            if (loopOptionsDiv) { // Vérifier que le conteneur existe
                if (isAdvanced) {
                    // Ajouter les options avancées si elles n'existent pas déjà
                     if (!document.getElementById('loop-for-tuple')) {
                        loopOptionsDiv.insertAdjacentHTML('beforeend', `
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="checkbox" id="loop-for-tuple">
                                <label class="form-check-label small" for="loop-for-tuple">for ... Tuple</label>
                            </div>`);
                    }
                    if (!document.getElementById('loop-continue')) {
                        loopOptionsDiv.insertAdjacentHTML('beforeend', `
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="checkbox" id="loop-continue">
                                <label class="form-check-label small" for="loop-continue">continue</label>
                            </div>`);
                    }
                    if (!document.getElementById('loop-while-op')) {
                        loopOptionsDiv.insertAdjacentHTML('beforeend', `
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="checkbox" id="loop-while-op">
                                <label class="form-check-label small" for="loop-while-op">while ... op.</label>
                            </div>`);
                    }
                } else {
                     // Supprimer les options avancées si elles existent
                    ['loop-for-tuple','loop-continue','loop-while-op'].forEach(id => {
                        let el = document.getElementById(id);
                         if (el && el.parentNode) el.parentNode.remove(); });
                }
            } else {
                console.warn("Conteneur 'loops-options' non trouvé pour le mode avancé.");
            }
        });
    } else {
        console.warn("Checkbox 'advanced-mode' non trouvée.");
    }
    //  Fin de l'affichage dynamique des cadres d'options

    // --- Gestionnaires d'événements pour les boutons ---

    // Gestionnaire pour le bouton "Générer un Code Aléatoire" (#generate-code-btn).
    const generateCodeButton = document.getElementById('generate-code-btn');
    if (generateCodeButton) {
        generateCodeButton.addEventListener('click', function() {
            console.log("Bouton 'Générer un Code Aléatoire' cliqué.");
            
            // Récupération dynamique des options AU MOMENT du clic
            const generationOptions = {
                // Variables: 'frame-variables' est désactivé et coché, donc on se base sur les sous-options.
                var_int: document.getElementById('var-int') ? document.getElementById('var-int').checked : false, // Toujours true car disabled & checked
                var_float: document.getElementById('var-float') ? document.getElementById('var-float').checked : false,
                var_str: document.getElementById('var-str') ? document.getElementById('var-str').checked : false,
                var_list: document.getElementById('var-list') ? document.getElementById('var-list').checked : false,
                var_bool: document.getElementById('var-bool') ? document.getElementById('var-bool').checked : false,
                
                // Opérations: 'frame-operations' est désactivé et coché.
                op_plus_minus: document.getElementById('op-plus-minus') ? document.getElementById('op-plus-minus').checked : false, // Toujours true
                op_mult_div_pow: document.getElementById('op-mult-div-pow') ? document.getElementById('op-mult-div-pow').checked : false,
                op_modulo_floor: document.getElementById('op-modulo-floor') ? document.getElementById('op-modulo-floor').checked : false,
                op_and: document.getElementById('op-and') ? document.getElementById('op-and').checked : false, // Mode avancé
                op_or: document.getElementById('op-or') ? document.getElementById('op-or').checked : false,   // Mode avancé
                op_not: document.getElementById('op-not') ? document.getElementById('op-not').checked : false,   // Mode avancé

                // Conditions: principal + sous-options
                main_conditions: document.getElementById('frame-conditions') ? document.getElementById('frame-conditions').checked : false,
                cond_if: document.getElementById('cond-if') ? document.getElementById('cond-if').checked : false,
                cond_if_else: document.getElementById('cond-if-else') ? document.getElementById('cond-if-else').checked : false,
                cond_if_elif: document.getElementById('cond-if-elif') ? document.getElementById('cond-if-elif').checked : false,
                cond_if_elif_else: document.getElementById('cond-if-elif-else') ? document.getElementById('cond-if-elif-else').checked : false,
                cond_if_if: document.getElementById('cond-if-if') ? document.getElementById('cond-if-if').checked : false,
                cond_if_if_if: document.getElementById('cond-if-if-if') ? document.getElementById('cond-if-if-if').checked : false,
                
                // Boucles: principal + sous-options
                main_loops: document.getElementById('frame-loops') ? document.getElementById('frame-loops').checked : false,
                loop_for_range: document.getElementById('loop-for-range') ? document.getElementById('loop-for-range').checked : false,
                loop_for_list: document.getElementById('loop-for-list') ? document.getElementById('loop-for-list').checked : false,
                loop_for_str: document.getElementById('loop-for-str') ? document.getElementById('loop-for-str').checked : false,
                loop_while: document.getElementById('loop-while') ? document.getElementById('loop-while').checked : false,
                loop_for_tuple: document.getElementById('loop-for-tuple') ? document.getElementById('loop-for-tuple').checked : false, // Mode avancé
                loop_continue: document.getElementById('loop-continue') ? document.getElementById('loop-continue').checked : false, // Mode avancé
                loop_while_op: document.getElementById('loop-while-op') ? document.getElementById('loop-while-op').checked : false, // Mode avancé
                                
                complexityLevel: parseInt(document.getElementById('complexity-level').value),
                numLines: parseInt(document.getElementById('num-lines').value),
                numVariables: parseInt(document.getElementById('num-variables').value)
            };
            // Pour débogage, vérifiez que les options sont correctement récupérées
            console.log("Options de génération pour code-generator.js:", generationOptions);


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
            var flowchartDisplayArea = document.getElementById('flowchart');
            if (flowchartDisplayArea) {
                flowchartDisplayArea.innerHTML = '<p class="text-center text-muted mt-3">Nouveau code généré. Cliquez sur "Lancer le diagramme et les défis" pour voir le diagramme.</p>';
            }
            
            // Réinitialiser les entrées de variables du défi et désactiver les boutons liés au défi.
            resetChallengeInputs(); 
            const checkAnswersButton = document.getElementById('check-answers-btn');
            const showSolutionButton = document.getElementById('show-solution-btn');
            if (checkAnswersButton) checkAnswersButton.disabled = true;
            if (showSolutionButton) showSolutionButton.disabled = true;
        });
       } else {
        console.warn("Bouton 'generate-code-btn' non trouvé.");
    }

    // Gestionnaire pour le bouton "Lancer le diagramme et les défis" (#run-code-btn).
    const runCodeButton = document.getElementById('run-code-btn');
    if (runCodeButton) {
        runCodeButton.addEventListener('click', async function() {
            console.log("Bouton 'Lancer le diagramme et les défis' cliqué.");
            
            if (!codeEditorInstance) {
                console.error("L'instance de CodeMirror n'est pas disponible.");
                alert("Erreur : L'éditeur de code n'est pas initialisé.");
                return;
            }
            const currentCode = codeEditorInstance.getValue();

            // 1. Mettre à jour le diagramme de flux.
            if (typeof triggerFlowchartUpdate === 'function') {
                await triggerFlowchartUpdate(); 
            } else {
                console.error("La fonction triggerFlowchartUpdate n'est pas définie.");
                alert("Erreur : La fonctionnalité de génération de diagramme n'est pas prête.");
            }

            // 2. Exécuter le code Python pour obtenir les valeurs des variables pour le défi.
            try {
                variableValuesFromExecution = {}; 
                resetChallengeInputs();
                
                if (typeof pyodide !== 'undefined' && pyodide) { // pyodide est global depuis flowchart-generator.js
                     variableValuesFromExecution = await runAndTraceCodeForChallenge(currentCode, pyodide);
                } else {
                    console.warn("Pyodide n'est pas encore prêt pour exécuter le code du défi.");
                    alert("Le moteur Python n'est pas encore prêt. Veuillez patienter.");
                    // S'assurer que les boutons de défi restent désactivés si Pyodide n'est pas prêt
                    const checkAnswersButton = document.getElementById('check-answers-btn');
                    const showSolutionButton = document.getElementById('show-solution-btn');
                    if (checkAnswersButton) checkAnswersButton.disabled = true;
                    if (showSolutionButton) showSolutionButton.disabled = true;
                    return; // Ne pas continuer si Pyodide n'est pas prêt
                }

                // 3. Mettre à jour l'interface du défi avec les variables trouvées.
                populateChallengeInputs(variableValuesFromExecution); 
                
                // 4. Activer les boutons du défi si des variables ont été trouvées.
                const hasVariables = Object.keys(variableValuesFromExecution).length > 0;
                const checkAnswersButton = document.getElementById('check-answers-btn');
                const showSolutionButton = document.getElementById('show-solution-btn');
                if (checkAnswersButton) checkAnswersButton.disabled = !hasVariables;
                if (showSolutionButton) showSolutionButton.disabled = !hasVariables;

            } catch (error) {
                console.error("Erreur lors de l'exécution du code pour le défi:", error);
                // Afficher une modale d'erreur ou un message à l'utilisateur.
                // S'assurer que les boutons de défi sont désactivés en cas d'erreur.
                const checkAnswersButton = document.getElementById('check-answers-btn');
                const showSolutionButton = document.getElementById('show-solution-btn');
                if (checkAnswersButton) checkAnswersButton.disabled = true;
                if (showSolutionButton) showSolutionButton.disabled = true;
            }
        });
    }

    // Gestionnaire pour le bouton "Vérifier les réponses" (#check-answers-btn).
    const checkAnswersButton = document.getElementById('check-answers-btn');
    if (checkAnswersButton) {
        checkAnswersButton.addEventListener('click', function() {
            console.log("Bouton 'Vérifier les réponses' cliqué.");
            if (typeof checkStudentAnswers === 'function') { 
                const results = checkStudentAnswers(variableValuesFromExecution);
                if (typeof showFeedbackModal === 'function') { 
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
            if (typeof revealCorrectSolution === 'function') { 
                revealCorrectSolution(variableValuesFromExecution);
            } else {
                console.warn("La fonction revealCorrectSolution n'est pas définie.");
            }
        });
    }
    
    // --- Fonctions utilitaires pour la section Défi ---

    /**
     * Réinitialise l'affichage des champs de saisie pour les variables du défi.
     */
    function resetChallengeInputs() {
        const container = document.getElementById('variables-container');
        if (container) {
            container.innerHTML = `
                <div class="col-12 text-center text-muted">
                    <p><i class="fas fa-code me-2"></i>Lancer le diagramme et les défis pour voir les variables...</p>
                </div>`;
        }
        variableValuesFromExecution = {}; 
    }

    /**
     * Remplit la section du défi avec des champs de saisie pour chaque variable trouvée.
     * @param {Object} variables - Un objet où les clés sont les noms des variables et les valeurs sont leurs valeurs finales.
     */
    function populateChallengeInputs(variables) {
        const container = document.getElementById('variables-container');
        if (!container) return;
        container.innerHTML = ''; 

        if (Object.keys(variables).length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center text-muted">
                    <p>Aucune variable à suivre n'a été trouvée après l'exécution du code. Essayez d'ajouter des affectations de variables dans votre code.</p>
                </div>`;
            return;
        }

        const headerRow = document.createElement('div');
        headerRow.className = 'row mb-3'; 
        headerRow.innerHTML = `
            <div class="col-12">
                <h4 class="h6 mb-3">Quelle est la valeur de chaque variable à la fin de l'exécution ?</h4>
            </div>`;
        container.appendChild(headerRow);
        
        const variablesGrid = document.createElement('div');
        variablesGrid.className = 'row g-3'; 
        
        Object.keys(variables).sort().forEach(varName => {
            const colDiv = document.createElement('div');
            colDiv.className = 'col-lg-4 col-md-6 col-sm-12'; // mb-3 retiré pour le mettre sur input-group direct
            
            const inputGroup = document.createElement('div');
            inputGroup.className = 'input-group mb-3'; // Ajout de mb-3 ici

            const inputGroupText = document.createElement('span');
            inputGroupText.className = 'input-group-text';
            inputGroupText.innerHTML = `<code>${varName}</code> =`; 
            
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-control student-answer-input'; 
            input.id = `var-input-${varName}`; 
            input.name = varName; 
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
     * @param {Object} feedbackResults - Les résultats de la vérification. Structure: { varName: { studentAnswer: '', correctAnswer: '', isCorrect: true/false }}
     */
    function showFeedbackModal(feedbackResults) {
        const modalEl = document.getElementById('feedback-modal');
        if (!modalEl) return;

        const modalTitle = modalEl.querySelector('.modal-title'); // Utilise querySelector sur l'élément modal
        const modalBody = modalEl.querySelector('.modal-body');   // Utilise querySelector
        const tryAgainButton = modalEl.querySelector('#modal-try-again-btn'); // Utilise querySelector

        if (!modalTitle || !modalBody || !tryAgainButton) {
            console.error("Éléments de la modale de feedback non trouvés.");
            return;
        }
        
        let contentHtml = '<ul class="list-group list-group-flush">'; // list-group-flush pour enlever les bordures externes
        let allCorrect = true;
        let hasResults = false;

        for (const varName in feedbackResults) {
            hasResults = true;
            const result = feedbackResults[varName];
            const iconClass = result.isCorrect ? 'fa-check-circle text-success' : 'fa-times-circle text-danger';
            const listItemClass = result.isCorrect ? 'list-group-item-success' : 'list-group-item-danger';
            
            contentHtml += `<li class="list-group-item ${listItemClass}">`;
            contentHtml += `<i class="fas ${iconClass} me-2"></i>`;
            contentHtml += `<strong>${varName}</strong>: Votre réponse : <code class="user-answer">${result.studentAnswer || "(vide)"}</code>. `;
            if (!result.isCorrect) {
                allCorrect = false;
                contentHtml += `Attendu : <code>${result.correctAnswer}</code>.`;
            }
            contentHtml += `</li>`;
        }
        contentHtml += '</ul>';

        if (!hasResults) {
             modalTitle.innerHTML = '<i class="fas fa-info-circle me-2"></i> Pas de réponses';
             contentHtml = '<p>Vous n\'avez fourni aucune réponse. Veuillez essayer de prédire les valeurs des variables.</p>';
             tryAgainButton.classList.add('d-none');
        } else if (allCorrect) {
            modalTitle.innerHTML = '<i class="fas fa-check-circle text-success me-2"></i> Félicitations !';
            contentHtml = '<p class="text-success mb-2">Toutes vos réponses sont correctes ! Excellent travail !</p>' + contentHtml;
            tryAgainButton.classList.add('d-none'); // Cache le bouton "Réessayer" si tout est correct
        } else {
            modalTitle.innerHTML = '<i class="fas fa-exclamation-triangle text-warning me-2"></i> Résultats';
            contentHtml = '<p class="mb-2">Certaines réponses sont incorrectes. Vérifiez les détails ci-dessous :</p>' + contentHtml;
            tryAgainButton.classList.remove('d-none'); // Montre le bouton "Réessayer"
        }
        
        modalBody.innerHTML = contentHtml;

        const feedbackModalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
        feedbackModalInstance.show();
    }

    // --- Initialisation au chargement de la page ---

    var defaultPythonCode = 
`# Code Python d'exemple
# Modifiez-le ou générez un nouveau code.
x = 5
y = 10
if x > y:
    result = "x est plus grand"
else:
    result = "y est plus grand ou égal"
# print(result) # Mis en commentaire pour ne pas interférer avec l'extraction des variables
z = x + y`;
    if (codeEditorInstance) {
        codeEditorInstance.setValue(defaultPythonCode);
    }

    var flowchartDisplayArea = document.getElementById('flowchart');
    if (flowchartDisplayArea) {
        flowchartDisplayArea.innerHTML = '<p class="text-center text-muted mt-3">Cliquez sur "Lancer le diagramme et les défis" pour générer le diagramme de flux.</p>';
    }

    resetChallengeInputs();
    const checkBtn = document.getElementById('check-answers-btn');
    const showSolBtn = document.getElementById('show-solution-btn');
    if (checkBtn) checkBtn.disabled = true;
    if (showSolBtn) showSolBtn.disabled = true;

}); // Fin de DOMContentLoaded


// --- Fonctions pour le Défi (déplacées de l'intérieur de DOMContentLoaded pour être globales si nécessaire, mais restent dans ce scope) ---

async function runAndTraceCodeForChallenge(code, pyodideInstance) { // pyodideInstance au lieu de pyodide global
    console.log("Exécution du code pour le défi...");
    let tracedVariables = {};

    const escapedCodeForPythonTripleQuotes = code
        .replace(/\\/g, '\\\\') 
        .replace(/"""/g, '\\"\\"\\"'); 

    // Validation syntaxique préliminaire dans Pyodide
    const syntaxValidationScript = `
import ast
import traceback

error_detail = ""
parsed_code_string = """${escapedCodeForPythonTripleQuotes}"""

try:
    ast.parse(parsed_code_string)
    _syntax_check_result = "Syntax OK"
except Exception as e:
    _syntax_check_result = f"Syntax Error: {type(e).__name__}: {str(e)}\\n{traceback.format_exc()}"

_syntax_check_result # Retourne le résultat
`;
    try {
        console.log("Script de validation syntaxique pour le défi (avant exécution Pyodide):", syntaxValidationScript);
        let syntaxCheckResult = await pyodideInstance.runPythonAsync(syntaxValidationScript);
        console.log("Résultat de la validation syntaxique (Pyodide):", syntaxCheckResult);
        if (syntaxCheckResult !== "Syntax OK") {
            console.error("Erreur de syntaxe détectée par Pyodide avant l'exécution tracée:", syntaxCheckResult);
            alert(`Erreur de syntaxe dans votre code Python:\n${syntaxCheckResult}`);
            return {}; // Retourne un objet vide car l'exécution ne peut pas continuer
        }
    } catch (e) { // Erreur inattendue durant la validation elle-même (rare)
        console.error("Erreur inattendue durant la validation syntaxique avec Pyodide:", e);
        alert(`Une erreur inattendue est survenue lors de la vérification de la syntaxe de votre code:\n${e.message}`);
        return {};
    }
    
    // Le code de traçage est injecté après la validation
    // Assurez-vous que `escapedCodeForPythonTripleQuotes` est utilisé ici aussi pour la cohérence
    const tracingWrapper = `
import types
import json

user_ns = {} 
_final_vars = {}
_error_detail_trace = None

try:
    exec("""${escapedCodeForPythonTripleQuotes}""", user_ns) # Utilise la même version échappée
except Exception as e:
    import traceback
    _error_detail_trace = f"{type(e).__name__}: {str(e)}\\n{traceback.format_exc()}"


if _error_detail_trace is None: # Pas d'erreur d'exécution
    for _var_name, _val in user_ns.items():
        if _var_name.startswith('__') and _var_name.endswith('__'):
            continue
        if _var_name in ['pyodide', 'sys', 'micropip', 'json', 'types', 'ast', 'traceback', 
                         'error_detail', 'current_code', 'user_python_code', 
                         'cfg_instance', 'mermaid_output', 'error_message', 'output_dict',
                         'parsed_code_string', 'List', 'Dict', 'Set', 'Tuple', 'Optional',
                         '_syntax_check_result', '_error_detail_trace', 'user_ns', '_final_vars', # Exclure les variables du wrapper
                         '_var_name', '_val' # Exclure les variables de boucle du wrapper
                         ]:
            continue
        if isinstance(_val, (types.ModuleType, types.FunctionType, type, types.BuiltinFunctionType, types.BuiltinMethodType)):
            continue
        
        if isinstance(_val, (str, int, float, bool, list, dict, tuple, set)) or _val is None:
            _final_vars[_var_name] = _val
        else:
            try:
                _final_vars[_var_name] = repr(_val) 
            except:
                _final_vars[_var_name] = "<valeur non sérialisable>"

# Retourne un dictionnaire avec les variables ou les détails de l'erreur
json.dumps({"variables": _final_vars, "error": _error_detail_trace}) 
`;

    console.log("Wrapper de traçage passé à Pyodide pour le défi:", tracingWrapper);
    try {
        let resultJson = await pyodideInstance.runPythonAsync(tracingWrapper);
        if (resultJson) {
            const result = JSON.parse(resultJson);
            if (result.error) {
                console.error("Erreur d'exécution lors du traçage pour le défi:", result.error);
                alert(`Erreur lors de l'exécution de votre code Python:\n${result.error}`);
                return {}; // Retourne un objet vide en cas d'erreur d'exécution
            }
            tracedVariables = result.variables;
        }
        console.log("Variables tracées pour le défi:", tracedVariables);

    } catch (error) { // Erreur inattendue durant l'exécution du wrapper lui-même
        console.error("Erreur majeure lors de l'exécution tracée pour le défi (wrapper):", error);
        alert(`Une erreur majeure est survenue lors de l'exécution de votre code : ${error.message}`);
        tracedVariables = {}; 
    }
    return tracedVariables;
}


function checkStudentAnswers(correctVariableValues) {
    console.log("Vérification des réponses de l'élève...");
    const results = {};
    const inputs = document.querySelectorAll('.student-answer-input');
    
    if (inputs.length === 0 && Object.keys(correctVariableValues).length > 0) {
        // Cas où il y a des variables attendues, mais pas d'inputs (par ex. si populateChallengeInputs a échoué)
        // Ou si l'élève n'a pas eu la chance de répondre.
        // On peut choisir de retourner un message spécial ou un objet vide.
        console.warn("Aucun champ de réponse trouvé, mais des variables étaient attendues.");
    }

    // S'il y a des variables attendues, on s'attend à des inputs correspondants
    Object.keys(correctVariableValues).forEach(varName => {
        const inputElement = document.getElementById(`var-input-${varName}`);
        const studentAnswerRaw = inputElement ? inputElement.value : ""; // Valeur vide si l'input n'est pas trouvé
        const studentAnswerTrimmed = studentAnswerRaw.trim();
        const correctAnswer = correctVariableValues[varName];
        
        let isCorrect = false;
        let correctAnswerAsString = String(correctAnswer); // Pour l'affichage et la comparaison par défaut

        // Logique de comparaison améliorée par type
        if (typeof correctAnswer === 'string') {
            // Pour les chaînes, la casse et les espaces comptent.
            // Si on veut ignorer la casse : studentAnswerTrimmed.toLowerCase() === correctAnswer.toLowerCase()
            // Si on veut que les guillemets soient optionnels:
            // ex: si correctAnswer est "hello", l'élève peut taper hello, "hello", ou 'hello'
            let normalizedStudentAnswer = studentAnswerTrimmed;
            if ((studentAnswerTrimmed.startsWith('"') && studentAnswerTrimmed.endsWith('"')) ||
                (studentAnswerTrimmed.startsWith("'") && studentAnswerTrimmed.endsWith("'"))) {
                normalizedStudentAnswer = studentAnswerTrimmed.substring(1, studentAnswerTrimmed.length - 1);
            }
            isCorrect = normalizedStudentAnswer === correctAnswer;
        } else if (typeof correctAnswer === 'boolean') {
            // Pour les booléens, comparer de manière insensible à la casse "True", "true", "False", "false"
            isCorrect = studentAnswerTrimmed.toLowerCase() === correctAnswerAsString.toLowerCase();
        } else if (typeof correctAnswer === 'number') {
            // Pour les nombres, comparer les valeurs numériques
            // Gérer le cas où la réponse de l'élève n'est pas un nombre valide
            const studentNumber = parseFloat(studentAnswerTrimmed);
            if (!isNaN(studentNumber)) {
                isCorrect = studentNumber === correctAnswer;
            } else {
                isCorrect = false; // La réponse n'est pas un nombre, donc incorrecte
            }
        } else if (Array.isArray(correctAnswer) || (typeof correctAnswer === 'object' && correctAnswer !== null)) {
            // Pour les listes, dictionnaires, tuples, etc.
            // L'élève doit entrer une représentation Python valide. Ex: [1, 2], {"a": 1}
            // Comparer la représentation chaîne peut être une approximation, mais Python `eval` est risqué.
            // Une approche plus sûre serait de parser la réponse de l'élève si possible.
            // Pour l'instant, on se base sur une correspondance de la représentation chaîne (avec repr() pour la valeur correcte)
            correctAnswerAsString = reprPythonVal(correctAnswer); // Utilise une fonction pour obtenir une représentation canonique
            isCorrect = studentAnswerTrimmed === correctAnswerAsString;
             // Tentative de comparaison plus robuste pour list/dict via JSON (si l'élève tape du JSON valide)
            try {
                const studentParsed = JSON.parse(studentAnswerTrimmed.replace(/'/g, '"')); // Tenter de normaliser les apostrophes en guillemets pour JSON
                if (JSON.stringify(studentParsed) === JSON.stringify(correctAnswer)) {
                    isCorrect = true;
                }
            } catch (e) {
                // Ignorer l'erreur de parsing, isCorrect reste basé sur la comparaison de chaînes
            }
        } else if (correctAnswer === null) {
            isCorrect = studentAnswerTrimmed.toLowerCase() === 'none' || studentAnswerTrimmed.toLowerCase() === 'null';
            correctAnswerAsString = 'None';
        } else { 
            // Autres types ou cas non gérés, comparaison simple de chaînes
            isCorrect = studentAnswerTrimmed === correctAnswerAsString;
        }

        results[varName] = {
            studentAnswer: studentAnswerTrimmed, // Stocker la réponse nettoyée
            correctAnswer: correctAnswerAsString, 
            isCorrect: isCorrect
        };
    });

    console.log("Résultats de la vérification:", results);
    return results;
}

/**
 * Helper function to get a Python-like string representation for non-basic types.
 * @param {*} value - The value to represent.
 * @returns {string} - The string representation.
 */
function reprPythonVal(value) {
    if (typeof value === 'string') {
        // Python strings are usually represented with single quotes if they don't contain them,
        // or double if they do. For simplicity, always use single unless it causes issues.
        if (value.includes("'") && !value.includes('"')) return `"${value}"`;
        return `'${value}'`;
    }
    if (Array.isArray(value)) {
        return `[${value.map(reprPythonVal).join(', ')}]`;
    }
    if (typeof value === 'object' && value !== null) { // Dictionaries
        const items = Object.keys(value).map(key => `${reprPythonVal(key)}: ${reprPythonVal(value[key])}`);
        return `{${items.join(', ')}}`;
    }
    if (value === null) return 'None';
    if (typeof value === 'boolean') return value ? 'True' : 'False';
    return String(value);
}


function revealCorrectSolution(correctVariableValues) {
    console.log("Révélation de la solution...");
    const inputs = document.querySelectorAll('.student-answer-input');
    inputs.forEach(input => {
        const varName = input.name;
        if (correctVariableValues.hasOwnProperty(varName)) {
            // Utiliser reprPythonVal pour un affichage cohérent avec ce que l'élève pourrait taper pour des types complexes
            input.value = reprPythonVal(correctVariableValues[varName]);
            input.classList.remove('is-invalid'); // Enlever potentiel style d'erreur
            input.classList.add('is-valid');    // Ajouter style de succès/validé
            input.disabled = true; 
        }
    });
    const checkBtn = document.getElementById('check-answers-btn');
    const showSolBtn = document.getElementById('show-solution-btn');
    if (checkBtn) checkBtn.disabled = true;
    if (showSolBtn) showSolBtn.disabled = true;
}