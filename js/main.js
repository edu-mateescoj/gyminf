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
        console.log("Tentative d'initialisation des options dynamiques DOM...");// Récupération des éléments DOM pour les sections Conditions et Boucles.

        const condSectionCheckbox = document.getElementById('frame-conditions');
        // Le conteneur où les options seront injectées
        const condOptionsTargetContainer = document.getElementById('conditions-options-container'); 
        
        const loopSectionCheckbox = document.getElementById('frame-loops');
        // Le conteneur où les options des boucles seront injectées
        const loopOptionsTargetContainer = document.getElementById('loops-options-container');

        const funcSectionCheckbox = document.getElementById('frame-functions');
        // Le conteneur où les options des boucles seront injectées
        const funcOptionsTargetContainer = document.getElementById('functions-options-container');

        if (!condSectionCheckbox || !condOptionsTargetContainer || !loopSectionCheckbox || 
            !loopOptionsTargetContainer) {
            console.error("Un ou plusieurs éléments DOM cibles pour les options dynamiques sont introuvables.");
            return;
        }

        // HTML pour les options de conditions (BASE - SANS les if imbriqués)
        const conditionsOptionsHTML_Base = `
            <div class="d-flex flex-column gap-1">
                <div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="cond-if"><label class="form-check-label small" for="cond-if">if:</label></div>
                <div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="cond-if-else"><label class="form-check-label small" for="cond-if-else">if:_else:</label></div>
                <div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="cond-if-elif"><label class="form-check-label small" for="cond-if-elif">if:_elif:</label></div>
                <div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="cond-if-elif-else"><label class="form-check-label small" for="cond-if-elif-else">elif:_else:</label></div>
                <!-- Les if...if et if...if...if sont maintenant en mode avancé -->
            </div>`;
        
        // HTML pour les options de boucles (BASE - SANS les boucles imbriquées)
        const loopsOptionsHTML_Base = `
            <div class="d-flex flex-column gap-1">
                <div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="loop-for-range"><label class="form-check-label small" for="loop-for-range">for_range</label></div>
                <div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="loop-for-list"><label class="form-check-label small" for="loop-for-list">for_List</label></div>
                <div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="loop-for-str"><label class="form-check-label small" for="loop-for-str">for_Str</label></div>
                <div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="loop-while"><label class="form-check-label small" for="loop-while">while_</label></div>
            </div>`;

        // HTML pour les options de fonctions (BASE)
        const functionsOptionsHTML_Base = `
            <div class="d-flex flex-column gap-1">
                <div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="func-def-a"><label class="form-check-label small" for="func-def-a">def f(a)</label></div>
                <div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="func-builtins"><label class="form-check-label small" for="func-builtins">builtins</label></div>
                <div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="func-return"><label class="form-check-label small" for="func-return">return</label></div>
                <!-- Les autres options seront en mode avancé ou ajoutées ici si de base -->
            </div>`;


        function updateConditionsOptionsDOM() {
            if (condSectionCheckbox.checked) {
                condOptionsTargetContainer.innerHTML = conditionsOptionsHTML_Base;
                console.log('Options (de base) pour Conditions INJECTÉES dans le DOM.');
                const internalContainer = condOptionsTargetContainer.querySelector('.d-flex.flex-column.gap-1');
                if (internalContainer) addAdvancedConditionOptionsIfNeeded(internalContainer);
            } else {
                condOptionsTargetContainer.innerHTML = ''; // Retire les options du DOM
                console.log('Options Conditions RETIRÉES du DOM.');
            }
        }

        function updateLoopsOptionsDOM() {
            if (loopSectionCheckbox.checked) {
                loopOptionsTargetContainer.innerHTML = loopsOptionsHTML_Base;
                console.log('Options Boucles INJECTÉES dans le DOM.');
                const internalContainer = loopOptionsTargetContainer.querySelector('.d-flex.flex-column.gap-1');
                if (internalContainer) addAdvancedLoopOptionsIfNeeded(internalContainer);
            } else {
                loopOptionsTargetContainer.innerHTML = ''; // Retire les options du DOM
                console.log('Options Boucles RETIRÉES du DOM.');
            }
        }

        function updateFunctionsOptionsDOM() {
            if (funcSectionCheckbox.checked) {
                funcOptionsTargetContainer.innerHTML = functionsOptionsHTML_Base;
                console.log('Options Fonctions (base) INJECTÉES.');
                const internalContainer = funcOptionsTargetContainer.querySelector('.d-flex.flex-column.gap-1');
                if (internalContainer) addAdvancedFunctionOptionsIfNeeded(internalContainer);
            } else {
                funcOptionsTargetContainer.innerHTML = '';
                console.log('Options Fonctions RETIRÉES.');
            }
        }

        // Attacher listener pour func + Appel initial 

        condSectionCheckbox.removeEventListener('change', updateConditionsOptionsDOM);
        condSectionCheckbox.addEventListener('change', updateConditionsOptionsDOM);
        
        loopSectionCheckbox.removeEventListener('change', updateLoopsOptionsDOM);
        loopSectionCheckbox.addEventListener('change', updateLoopsOptionsDOM);

        funcSectionCheckbox.addEventListener('change', updateFunctionsOptionsDOM);
        updateFunctionsOptionsDOM();

        // État initial
        updateConditionsOptionsDOM();
        updateLoopsOptionsDOM();
        console.log("Options dynamiques (DOM manipulation) initialisées.");
    }

    // Appeler la fonction d'initialisation
    initializeDynamicOptions();


    // --- Gestionnaire pour le bouton "Options Avancées" ---
    const advancedModeCheckbox = document.getElementById('advanced-mode');
    if (advancedModeCheckbox) {
        advancedModeCheckbox.addEventListener('change', function() {
            const isAdvanced = this.checked;

            // Gestion pour Opérations (reste pareil, car #operations-options est toujours dans le DOM)
            const opOptionsDiv = document.getElementById('operations-options'); // Cible le bon conteneur d'options
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

            // Gestion options avancées pour Boucles (doit maintenant cibler le conteneur interne s'il existe)
            const loopOptionsInternalContainer = document.querySelector('#loops-options-container > .d-flex.flex-column.gap-1');
            if (loopOptionsInternalContainer) { // Vérifier que le conteneur existe: les options de boucles sont actuellement affichées
                addAdvancedLoopOptionsIfNeeded(loopOptionsInternalContainer, isAdvanced);
            } else if (!isAdvanced) {
                // Si on désactive le mode avancé et que les options de boucles ne sont pas affichées,
                // il n'y a rien à faire directement sur les options avancées de boucles puisqu'elles ne sont pas dans le DOM.
                // Elles ne seront pas ajoutées la prochaine fois que les boucles seront affichées.
                // Si loopOptionsInternalContainer est null (parce que les boucles ne sont pas cochées),
            // addAdvancedLoopOptionsIfNeeded sera appelé correctement par updateLoopsOptionsDOM quand les boucles seront cochées.
            }

            // idem pour Conditions et Fonctions
            const condOptionsInternalContainer = document.querySelector('#conditions-options-container > .d-flex.flex-column.gap-1');
            if (condOptionsInternalContainer) addAdvancedConditionOptionsIfNeeded(condOptionsInternalContainer, isAdvanced);
            const funcOptionsInternalContainer = document.querySelector('#functions-options-container > .d-flex.flex-column.gap-1');
            if (funcOptionsInternalContainer) addAdvancedFunctionOptionsIfNeeded(funcOptionsInternalContainer, isAdvanced);


        });
    }
    // Fonction utilitaire pour ajouter/supprimer les options avancées des boucles
    // Prend en paramètre le conteneur où injecter et l'état du mode avancé
    function addAdvancedLoopOptionsIfNeeded(container, isAdvancedModeActiveOverride = null) {
        if (!container) return;

        // Détermine si le mode avancé est actif. Si un override est fourni, l'utilise, sinon vérifie la checkbox.
        const isAdvanced = isAdvancedModeActiveOverride !== null ? isAdvancedModeActiveOverride :
                           (document.getElementById('advanced-mode') ? document.getElementById('advanced-mode').checked : false);

        // options avancées pour les boucles ACTUELLEMENT
        const advancedLoopOptions = [
            { id: 'loop-nested-for2', label: 'for^2' },
            { id: 'loop-nested-for3', label: 'for^3' },
            { id: 'loop-while-op', label: 'while<op>' } // ça on garde
        ];

        // IDs des anciennes options à trasher (si on les rencontre)
        const oldAdvancedLoopOptionIDs = ['loop-for-tuple', 'loop-continue'];

        if (isAdvanced) {
            console.log("Mode avancé activé pour les boucles. Ajout des options.");
            advancedLoopOptions.forEach(opt => {
                if (!container.querySelector(`#${opt.id}`)) {
                    container.insertAdjacentHTML('beforeend', 
                        `<div class="form-check form-check-inline">
                            <input class="form-check-input" type="checkbox" id="${opt.id}">
                            <label class="form-check-label small" for="${opt.id}">${opt.label}</label>
                         </div>`
                    );
                }
            });
            // S'assurer que les anciennes sont bien supprimées
            oldAdvancedLoopOptionIDs.forEach(idSuffix => {
                let el = container.querySelector(`#${idSuffix}`);
                if (el && el.parentNode && el.parentNode.classList.contains('form-check')) {
                     el.parentNode.remove();
                }
            });
        } else {
            console.log("Mode avancé désactivé pour les boucles. Suppression des options.");
            // Supprimer toutes les options avancées définies (nouvelles et anciennes pour être sûr)
            const allPossibleAdvancedLoopIDs = advancedLoopOptions.map(o => o.id).concat(oldAdvancedLoopOptionIDs);
            allPossibleAdvancedLoopIDs.forEach(idSuffix => {
                let el = container.querySelector(`#${idSuffix}`);
                if (el && el.parentNode && el.parentNode.classList.contains('form-check')) {
                     el.parentNode.remove();
                }
            });
        }
    }

    function addAdvancedConditionOptionsIfNeeded(container, isAdvancedModeActiveOverride = null) {
        if (!container) return;
        const isAdvanced = isAdvancedModeActiveOverride !== null ? isAdvancedModeActiveOverride :
                           (document.getElementById('advanced-mode') ? document.getElementById('advanced-mode').checked : false);

        const advancedConditionOptions = [
            { id: 'cond-if-if', label: 'if:_if:' },
            { id: 'cond-if-if-if', label: 'if:_if:_if:' }
        ];

        if (isAdvanced) {
            console.log("Mode avancé activé pour les Conditions. Ajout des options.");
            advancedConditionOptions.forEach(opt => {
                if (!container.querySelector(`#${opt.id}`)) {
                    container.insertAdjacentHTML('beforeend', 
                        `<div class="form-check form-check-inline">
                            <input class="form-check-input" type="checkbox" id="${opt.id}">
                            <label class="form-check-label small" for="${opt.id}">${opt.label}</label>
                         </div>`
                    );
                }
            });
        } else {
            console.log("Mode avancé désactivé pour les Conditions. Suppression des options.");
            advancedConditionOptions.forEach(opt => {
                let el = container.querySelector(`#${opt.id}`);
                if (el && el.parentNode && el.parentNode.classList.contains('form-check')) {
                     el.parentNode.remove();
                }
            });
        }
    }

    function addAdvancedFunctionOptionsIfNeeded(container, isAdvancedModeActiveOverride = null) {
        if (!container) return;
        const isAdvanced = isAdvancedModeActiveOverride !== null ? isAdvancedModeActiveOverride :
                           (document.getElementById('advanced-mode') ? document.getElementById('advanced-mode').checked : false);

        const advancedFunctionOptions = [
            { id: 'func-def-ab', label: 'def f(a,b)' },
            { id: 'func-op-list', label: 'opList' }, // Opérations sur listes (ex: .append, len())
            { id: 'func-op-str', label: 'opStr' }   // Opérations sur chaînes (ex: +, slicing, len())
        ];
        // Les options de base sont: func-def-a, func-builtins, func-return

        if (isAdvanced) {
            console.log("Mode avancé activé pour les Fonctions. Ajout des options.");
            advancedFunctionOptions.forEach(opt => {
                if (!container.querySelector(`#${opt.id}`)) {
                    container.insertAdjacentHTML('beforeend', 
                        `<div class="form-check form-check-inline">
                            <input class="form-check-input" type="checkbox" id="${opt.id}">
                            <label class="form-check-label small" for="${opt.id}">${opt.label}</label>
                         </div>`
                    );
                }
            });
        } else {
            console.log("Mode avancé désactivé pour les Fonctions. Suppression des options.");
            advancedFunctionOptions.forEach(opt => {
                let el = container.querySelector(`#${opt.id}`);
                if (el && el.parentNode && el.parentNode.classList.contains('form-check')) {
                     el.parentNode.remove();
                }
            });
        }
    }
//  Fin de l'affichage dynamique des cadres d'options


    // --- Gestionnaires d'événements pour les boutons ---

    // Gestionnaire pour le bouton "Générer un Code Aléatoire" (#generate-code-btn).
    const generateCodeButton = document.getElementById('generate-code-btn');
    if (generateCodeButton) {
        generateCodeButton.addEventListener('click', function() {
            
            // Pour récupérer l'état de #cond-if, il faut vérifier s'il existe :
            // const condIfCheckbox = document.getElementById('cond-if');
            // const isCondIfChecked = condIfCheckbox ? condIfCheckbox.checked : false;
            // ... faire de même pour toutes les options injectées dynamiquement.
            console.log("Bouton 'Générer un Code Aléatoire' cliqué.");
            
            // 1. Récupérer les options de génération depuis le DOM.
            const getCheckedStatus = (id) => {
                const el = document.getElementById(id);
                return el ? el.checked : false;
            };
            
            const generationOptions = {
                var_int: getCheckedStatus('var-int'), // Toujours true car disabled & checked
                var_float: getCheckedStatus('var-float'),
                var_str: getCheckedStatus('var-str'),
                var_list: getCheckedStatus('var-list'),
                var_bool: getCheckedStatus('var-bool'),
                
                op_plus_minus: getCheckedStatus('op-plus-minus'), // Toujours true
                op_mult_div_pow: getCheckedStatus('op-mult-div-pow'),
                op_modulo_floor: getCheckedStatus('op-modulo-floor'),
                op_and: getCheckedStatus('op-and'),
                op_or: getCheckedStatus('op-or'),
                op_not: getCheckedStatus('op-not'),

                main_conditions: getCheckedStatus('frame-conditions'),
                cond_if: getCheckedStatus('cond-if'), // Sera false si non injecté
                cond_if_else: getCheckedStatus('cond-if-else'),
                cond_if_elif: getCheckedStatus('cond-if-elif'),
                cond_if_elif_else: getCheckedStatus('cond-if-elif-else'),
                cond_if_if: getCheckedStatus('cond-if-if'),         // mode Avancé
                cond_if_if_if: getCheckedStatus('cond-if-if-if'),   // mode Avancé
                
                main_loops: getCheckedStatus('frame-loops'),
                loop_for_range: getCheckedStatus('loop-for-range'), // Sera false si non injecté
                loop_for_list: getCheckedStatus('loop-for-list'),
                loop_for_str: getCheckedStatus('loop-for-str'),
                loop_while: getCheckedStatus('loop-while'),
                loop_nested_for2: getCheckedStatus('loop-nested-for2'), // Avancé
                loop_nested_for3: getCheckedStatus('loop-nested-for3'), // Avancé
                loop_while_op: getCheckedStatus('loop-while-op'),       // Avancé
                                
                main_functions: getCheckedStatus('frame-functions'),
                func_def_a: getCheckedStatus('func-def-a'),
                func_builtins: getCheckedStatus('func-builtins'),
                func_return: getCheckedStatus('func-return'),
                func_def_ab: getCheckedStatus('func-def-ab'),       // Avancé
                func_op_list: getCheckedStatus('func-op-list'),     // Avancé
                func_op_str: getCheckedStatus('func-op-str'),       // Avancé

                complexityLevel: parseInt(document.getElementById('complexity-level').value),
                numLines: parseInt(document.getElementById('num-lines').value), // à abandonner ??
                numVariables: parseInt(document.getElementById('num-variables').value)
            };
            console.log("Options de génération pour code-generator.js (DOM manipulation):", generationOptions);

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