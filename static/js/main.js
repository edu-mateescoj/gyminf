// js/main.js
/**
 * @file main.js
 * Fichier principal orchestrant l'ensemble de l'interface utilisateur.
 * Gère l'initialisation de l'éditeur, les gestionnaires d'événements pour les boutons,
 * la configuration de la génération de code, et la communication avec le moteur Pyodide.
 * Il délègue la logique spécifique au "Défi" au module validation.js.
 */
const MAX_CODE_LINES = 30;
const MAX_TOTAL_VARIABLES_GLOBAL = 20;
const MIN_POSSIBLE_CODE_LINES = 3;
const MIN_POSSIBLE_TOTAL_VARIABLES_GLOBAL = 1;

const VAR_COUNT_LIMITS = {
    int: { min: 1, max: 3 },
    float: { min: 1, max: 2 },
    str: { min: 1, max: 2 },
    list: { min: 1, max: 2 },
    bool: { min: 1, max: 3 }
};

const BUILTINS_BASE = [
    { id: 'builtin-print', label: 'print()' },
    { id: 'builtin-input', label: 'input()' },
    { id: 'builtin-len', label: 'len()' },
    { id: 'builtin-isinstance', label: 'isinstance()' }
];
const BUILTINS_ADVANCED = [
    { id: 'builtin-chr', label: 'chr()' },
    { id: 'builtin-ord', label: 'ord()' },
    { id: 'builtin-min', label: 'min()' },
    { id: 'builtin-max', label: 'max()' },
    { id: 'builtin-sum', label: 'sum()' }
];

const conditionsOptionsHTML_Base = `
    <div class="d-flex flex-column gap-1">
        <div class="form-check form-check-inline"><input class="form-check-input ctrl-option" data-ctrl-type="if_simple" type="checkbox" id="cond-if"><label class="form-check-label small" for="cond-if">if:</label></div>
        <div class="form-check form-check-inline"><input class="form-check-input ctrl-option" data-ctrl-type="if_else" data-ctrl-parent="cond-if" type="checkbox" id="cond-if-else"><label class="form-check-label small" for="cond-if-else">if:_else:</label></div>
        <div class="form-check form-check-inline"><input class="form-check-input ctrl-option" data-ctrl-type="if_elif" data-ctrl-parent="cond-if" type="checkbox" id="cond-if-elif"><label class="form-check-label small" for="cond-if-elif">if:_elif:</label></div>
        <div class="form-check form-check-inline"><input class="form-check-input ctrl-option" data-ctrl-type="if_elif_else" data-ctrl-parents="cond-if,cond-if-elif" type="checkbox" id="cond-if-elif-else"><label class="form-check-label small" for="cond-if-elif-else">elif:_else:</label></div>
    </div>`;
const loopsOptionsHTML_Base = `
    <div class="d-flex flex-column gap-1">
        <div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="loop-for-range"><label class="form-check-label small" for="loop-for-range">for_range</label></div>
        <div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="loop-for-list"><label class="form-check-label small" for="loop-for-list">for_List</label></div>
        <div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="loop-for-str"><label class="form-check-label small" for="loop-for-str">for_Str</label></div>
        <div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="loop-while"><label class="form-check-label small" for="loop-while">while_</label></div>
    </div>`;
const functionsOptionsHTML_Base = `
    <div class="d-flex flex-column gap-1">
        <div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="func-def-simple"><label class="form-check-label small" for="func-def-simple">def</label></div>
        <div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="func-def-a"><label class="form-check-label small" for="func-def-a">def f(a)</label></div>
        <div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="func-return"><label class="form-check-label small" for="func-return">return</label></div>
        <div class="form-check form-check-inline" id="func-builtins-main-container"></div>
    </div>`;


// --- Variables d'état globales ---
let lastLoadedCode = ""; // Pour restaurer l'état après génération/chargement
let isEditorEditable = false;
var codeEditorInstance;
let variableValuesFromExecution = {}; // Pour stocker les valeurs des variables après l'exécution du code
let lastDiagramAstDump = ""; // Pour la synchronisation diagramme/code
let lastLoggedCanonicalCode = ""; // Stocke le dernier code normalisé qui a été journalisé
let currentChallengeCodeId = null; // Pour stocker l'ID du code de défi actuel

// --- Variables DOM globales (déclarées ici pour être accessibles partout) ---
let difficultyGlobalSelect;
let numLinesGlobalSelect;
let numTotalVariablesGlobalSelect;
let advancedModeCheckbox;
let challengeVariablesContainer;
let checkAnswersButton;
let showSolutionButton;
let feedbackModal;

// --- Fonctions de gestion de l'éditeur ---
function setEditorEditable(editable) {
    isEditorEditable = editable;
    if (codeEditorInstance) {
        codeEditorInstance.setOption('readOnly', !editable);
    }
    const btn = document.getElementById('toggle-editable-btn');
    if (btn) {
        btn.innerHTML = editable
            ? '<i class="far fa-edit"></i> Rendre non éditable'
            : '<i class="fas fa-edit"></i> Rendre éditable';
    }
}

// --- Mémoriser le code après génération ou chargement d'exemple ---
function memorizeLoadedCode(code) {
    lastLoadedCode = code;
}

// --- Fonctions pour ajouter/supprimer les options AVANCÉES ---
// NOTE: Ces fonctions sont déplacées avant leur utilisation pour corriger les erreurs de référence.

// Gère les options avancées pour le cadre "Op" (opérateurs logiques, slicing)
function addAdvancedOperationOptionsIfNeeded(isAdvancedModeActiveOverride = null) {
    const opOptionsDiv = document.getElementById('operations-options');
    if (!opOptionsDiv) return;
    const isAdvanced = isAdvancedModeActiveOverride !== null ? isAdvancedModeActiveOverride :
                       (document.getElementById('advanced-mode') ? document.getElementById('advanced-mode').checked : false);
    const advancedOpOptions = [
        { id: 'op-and', label: 'and' }, { id: 'op-or', label: 'or' }, { id: 'op-not', label: 'not' },
        { id: 'op-slice-ab', label: '[:]' }, // Slicing simple [a:b]
        { id: 'op-slice-abs', label: '[::]' } // Slicing avec step [a:b:s]
    ];

    if (isAdvanced) {
        advancedOpOptions.forEach(opt => {
            if (!opOptionsDiv.querySelector(`#${opt.id}`)) { // Vérifie à l'intérieur du conteneur
                opOptionsDiv.insertAdjacentHTML('beforeend', `<div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="${opt.id}"><label class="form-check-label small" for="${opt.id}">${opt.label}</label></div>`);
            }
        });
    } else {
        advancedOpOptions.forEach(opt => {
            let el = opOptionsDiv.querySelector(`#${opt.id}`);
            if (el && el.parentNode && el.parentNode.classList.contains('form-check')) el.parentNode.remove();
        });
    }
}

// Ajoute/Supprime les options avancées pour les Conditions (Ctrl)
function addAdvancedConditionOptionsIfNeeded(container, isAdvancedModeActiveOverride = null) {
    if (!container) return;
    const isAdvanced = isAdvancedModeActiveOverride !== null ? isAdvancedModeActiveOverride :
                       (document.getElementById('advanced-mode') ? document.getElementById('advanced-mode').checked : false);
    // Options avancées pour les conditions (if imbriqués)
    const advancedConditionOptions = [
        { id: 'cond-if-if', label: 'if:_if:' },
        { id: 'cond-if-if-if', label: 'if:_if:_if:' }
    ];
    if (isAdvanced) {
        // console.log("Mode avancé pour Conditions: Ajout.");
        advancedConditionOptions.forEach(opt => {
            if (!container.querySelector(`#${opt.id}`)) container.insertAdjacentHTML('beforeend', `<div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="${opt.id}"><label class="form-check-label small" for="${opt.id}">${opt.label}</label></div>`);
        });
    } else {
        // console.log("Mode avancé pour Conditions: Suppression.");
        advancedConditionOptions.forEach(opt => {
            let el = container.querySelector(`#${opt.id}`);
            if (el && el.parentNode && el.parentNode.classList.contains('form-check')) el.parentNode.remove();
        });
    }
}

// Ajoute/Supprime les options avancées pour les Boucles (Loop)
function addAdvancedLoopOptionsIfNeeded(container, isAdvancedModeActiveOverride = null) {
    if (!container) return;
    const isAdvanced = isAdvancedModeActiveOverride !== null ? isAdvancedModeActiveOverride :
                       (document.getElementById('advanced-mode') ? document.getElementById('advanced-mode').checked : false);
    // Options avancées pour les boucles (boucles imbriquées, while avec opérateur)
    const advancedLoopOptions = [
        { id: 'loop-nested-for2', label: 'for^2' },
        { id: 'loop-nested-for3', label: 'for^3' },
        { id: 'loop-while-op', label: 'while{op}' },
        { id: 'loop-range-ab', label: 'range(a,b)'},
        { id: 'loop-range-abs', label: 'range(a,b,s)'}
    ];
    // Anciennes options à s'assurer de supprimer si elles existent
    const oldAdvancedLoopOptionIDs = ['loop-for-tuple', 'loop-continue'];
    if (isAdvanced) {
        // console.log("Mode avancé pour Boucles: Ajout.");
        advancedLoopOptions.forEach(opt => {
            if (!container.querySelector(`#${opt.id}`)) container.insertAdjacentHTML('beforeend', `<div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="${opt.id}"><label class="form-check-label small" for="${opt.id}">${opt.label}</label></div>`);
        });
        oldAdvancedLoopOptionIDs.forEach(idSuffix => { let el = container.querySelector(`#${idSuffix}`); if (el && el.parentNode) el.parentNode.remove(); });
    } else {
        // console.log("Mode avancé pour Boucles: Suppression.");
        const allPossibleAdvancedLoopIDs = advancedLoopOptions.map(o => o.id).concat(oldAdvancedLoopOptionIDs);
        allPossibleAdvancedLoopIDs.forEach(idSuffix => { let el = container.querySelector(`#${idSuffix}`); if (el && el.parentNode) el.parentNode.remove(); });
    }
}

// Ajoute/Supprime les options avancées pour les Fonctions (Func)
function addAdvancedFunctionOptionsIfNeeded(container, isAdvancedModeActiveOverride = null) {
    if (!container) return;
    const isAdvanced = isAdvancedModeActiveOverride !== null ? isAdvancedModeActiveOverride :
                       (document.getElementById('advanced-mode') ? document.getElementById('advanced-mode').checked : false);
    // Les options avancées de fonction (hors builtins)
    const advancedFunctionOptions = [
        { id: 'func-def-ab', label: 'def f(a,b)' },
        { id: 'func-op-list', label: 'opList' },
        { id: 'func-op-str', label: 'opStr' }
    ];
    advancedFunctionOptions.forEach(opt => {
        let existingOption = container.querySelector(`#${opt.id}`);
        if (isAdvanced) {
            if (!existingOption) {
                const builtinsMainContainer = container.querySelector('#func-builtins-main-container');
                const injectionHTML = `<div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="${opt.id}"><label class="form-check-label small" for="${opt.id}">${opt.label}</label></div>`;
                if (builtinsMainContainer) {
                    builtinsMainContainer.insertAdjacentHTML('beforebegin', injectionHTML);
                } else {
                    container.insertAdjacentHTML('beforeend', injectionHTML);
                }
            }
        } else {
            if (existingOption && existingOption.parentElement && existingOption.parentElement.classList.contains('form-check')) {
                existingOption.parentElement.remove();
            }
        }
    });
}


/**
 * Configure la logique de dépendance entre les options de conditions
 * (if, if/else, if/elif, if/elif/else)
 * @param {HTMLElement} container - Le conteneur des options de conditions
 */
function setupConditionalParenting(container) {
    if (!container) return;
    const ifSimple = container.querySelector('#cond-if'); 
    const ifElse = container.querySelector('#cond-if-else');
    const ifElif = container.querySelector('#cond-if-elif'); 
    const ifElifElse = container.querySelector('#cond-if-elif-else');
    
    const allCtrlOptions = [ifSimple, ifElse, ifElif, ifElifElse];
    
    // Mettre à jour les minimums requis quand une option change
    allCtrlOptions.forEach(opt => {
        if(opt) opt.addEventListener('change', () => {
            setTimeout(updateGlobalConfigSelectors,0);
            setTimeout(handleVisualInterdependencies,0);
        });
    });
    
    // Gérer les dépendances parent/enfant
    [ifElse, ifElif, ifElifElse].forEach(child => {
        if (child) child.addEventListener('change', () => { 
            if (child.checked) { 
                if (ifSimple) ifSimple.checked = true; 
                if (child === ifElifElse && ifElif) ifElif.checked = true; 
            }
        });
    });
    
    // Si on désactive le parent, désactiver tous les enfants
    if (ifSimple) ifSimple.addEventListener('change', () => { 
        if (!ifSimple.checked) { 
            if (ifElse) ifElse.checked = false; 
            if (ifElif) ifElif.checked = false; 
            if (ifElifElse) ifElifElse.checked = false; 
        }
    });
    
    // Si on désactive if/elif, désactiver if/elif/else
    if (ifElif) ifElif.addEventListener('change', () => { 
        if (!ifElif.checked) { 
            if (ifElifElse) ifElifElse.checked = false; 
        }
    });
}

/**
 * Remplit un élément select avec des options de min à max, et sélectionne valueToSelect.
 * @param {HTMLSelectElement} selectElement - L'élément select à remplir.
 * @param {number} min - La valeur minimale.
 * @param {number} max - La valeur maximale.
 * @param {number} valueToSelect - La valeur à sélectionner.
 */
function populateSelectWithOptions(selectElement, min, max, valueToSelect) {
    if (!selectElement) return;
    const targetValue = valueToSelect;
    const previousValue = selectElement.value;
    selectElement.innerHTML = '';
    for (let i = min; i <= max; i++) {
        const option = new Option(i, i);
        selectElement.add(option);
    }
    if (targetValue >= min && targetValue <= max) {
        selectElement.value = targetValue;
    } else {
        selectElement.value = min;
    }
    if (previousValue !== selectElement.value) {
        const label = selectElement.closest('.form-group')?.querySelector('label');
        if (label) {
            const originalColor = label.style.color;
            label.style.transition = "color 0.5s ease";
            label.style.color = "#0d6efd";
            setTimeout(() => {
                label.style.color = originalColor;
                setTimeout(() => {
                    label.style.transition = "";
                }, 500);
            }, 2000);
        }
    }
}

// --- Fonction d'initialisation et d'exécution ---
function initializeUI() {
    // 1. Définir et charger le code Python par défaut dans l'éditeur.
    const defaultPythonCode =
`# Code Python d'exemple
# Modifiez-le ou générez un nouveau code.
x = 5
y = 10
if x > y:
    result = "x est plus grand"
else:
    result = "y est plus grand ou égal"
z = x + y`;

    if (codeEditorInstance) {
        codeEditorInstance.setValue(defaultPythonCode);
        memorizeLoadedCode(defaultPythonCode); // Mémoriser ce code comme "dernier état connu"
    }

    // 2. Afficher les messages d'accueil dans les cartes "Diagramme" et "Défi".
    const flowchartDisplayArea = document.getElementById('flowchart');
    if (flowchartDisplayArea) {
        flowchartDisplayArea.innerHTML = '<p class="text-center text-muted mt-3">Cliquez sur "Lancer le diagramme et les défis" pour générer le diagramme de flux.</p>';
    }

    // 3. Appel à la fonction de validation.js pour réinitialiser la section défi.
    if (typeof resetChallengeInputs === 'function') {
        resetChallengeInputs(challengeVariablesContainer);
    } else {
        // Fallback vers la fonction interne si validation.js n'est pas chargé
        const container = document.getElementById('variables-container');
        if (container) {
            container.innerHTML = `
                <div class="col-12 text-center text-muted">
                    <p><i class="fas fa-code me-2"></i>Lancer le diagramme et les défis pour voir les variables...</p>
                </div>`;
        }
    }

    // 4. Désactiver les boutons du défi, car aucun code n'a encore été exécuté.
    if (checkAnswersButton) checkAnswersButton.disabled = true;
    if (showSolutionButton) showSolutionButton.disabled = true;

    // 5. Mettre les cartes dans leur état visuel par défaut (bordure bleue/info).
    setDiagramAndChallengeCardState("default");
}

// --- Initialisation et gestion des options de syntaxe dynamiques (Ctrl, Loop, Func) ---
function initializeDynamicSyntaxOptions() {
    // console.log("Initialisation des options dynamiques des cadres de syntaxe...");
    // Vérifier que l'élément critique existe
    if (!advancedModeCheckbox) {
        console.warn("advancedModeCheckbox non disponible - initializeDynamicSyntaxOptions reporté");
        return;
    }

    const syntaxSectionsConfig = [
        { checkboxId: 'frame-conditions', containerId: 'conditions-options-container', baseHtmlGetter: () => conditionsOptionsHTML_Base, advancedHandler: addAdvancedConditionOptionsIfNeeded, specialSetup: setupConditionalParenting },
        { checkboxId: 'frame-loops', containerId: 'loops-options-container', baseHtmlGetter: () => loopsOptionsHTML_Base, advancedHandler: addAdvancedLoopOptionsIfNeeded },
        { checkboxId: 'frame-functions', containerId: 'functions-options-container', baseHtmlGetter: () => functionsOptionsHTML_Base, advancedHandler: addAdvancedFunctionOptionsIfNeeded, specialSetup: setupFunctionOptionsExtras }
    ];

    syntaxSectionsConfig.forEach(section => {
        const checkbox = document.getElementById(section.checkboxId);
        const targetContainer = document.getElementById(section.containerId);

        if (!checkbox || !targetContainer) {
            console.error(`Éléments manquants pour la section ${section.checkboxId}. IDs: ${section.checkboxId}, ${section.containerId}`);
            return;
        }

        const updateDOM = () => {
            if (checkbox.checked) {
                targetContainer.innerHTML = section.baseHtmlGetter();
                //  Logique pour cocher l'option de base par défaut
                if (section.checkboxId === 'frame-conditions') {
                    const ifCheckbox = targetContainer.querySelector('#cond-if');
                    if (ifCheckbox) ifCheckbox.checked = true;
                } else if (section.checkboxId === 'frame-functions') {
                    const funcSimpleCheckbox = targetContainer.querySelector('#func-def-simple');
                    if (funcSimpleCheckbox) funcSimpleCheckbox.checked = true;
                }
                const internalContainer = targetContainer.querySelector('.d-flex.flex-column.gap-1');
                if (internalContainer && section.advancedHandler) {
                    section.advancedHandler(internalContainer, advancedModeCheckbox.checked);
                }
                if (section.specialSetup) { // Appel des configurations spécifiques
                    section.specialSetup(internalContainer);
                }
            } else {
                targetContainer.innerHTML = '';
            }
            updateGlobalConfigSelectors();
        };

        checkbox.removeEventListener('change', updateDOM);
        checkbox.addEventListener('change', updateDOM);
        updateDOM(); // Appel initial pour définir l'état
    });
    console.log("Options dynamiques des cadres de syntaxe initialisées.");
}

/**
 * Crée la case à cocher principale pour les fonctions builtin et son conteneur.
 * @param {HTMLElement} parentContainer - L'élément où ajouter la case à cocher.
 */
function createBuiltinsMainCheckbox(parentContainer) {
    if (!parentContainer) return;
    parentContainer.innerHTML = '';
    const input = document.createElement('input'); input.className = 'form-check-input'; input.type = 'checkbox'; input.id = 'func-builtins';
    const label = document.createElement('label'); label.className = 'form-check-label small'; label.htmlFor = 'func-builtins'; label.textContent = 'builtins';
    const builtinsOptionsWrapper = document.createElement('div'); builtinsOptionsWrapper.id = 'func-builtins-options-wrapper';
    builtinsOptionsWrapper.className = 'mt-1'; builtinsOptionsWrapper.style.display = 'none';
    parentContainer.appendChild(input); parentContainer.appendChild(label);
    if (parentContainer.parentElement) parentContainer.parentElement.insertBefore(builtinsOptionsWrapper, parentContainer.nextSibling);
    input.addEventListener('change', toggleBuiltinOptionsVisibility);
    if (input.checked) toggleBuiltinOptionsVisibility({ target: input });
}

/**
 * Gère la visibilité des options de fonctions builtin en fonction de l'état de la case à cocher.
 * @param {Event} event - L'événement de changement de la case à cocher
 * */
function toggleBuiltinOptionsVisibility(event) {
        const builtinsCheckbox = event.target;
        const builtinsOptionsWrapper = document.getElementById('func-builtins-options-wrapper');
        if (!builtinsOptionsWrapper) return;
        if (builtinsCheckbox.checked) {
            builtinsOptionsWrapper.style.display = 'block';
            populateBuiltinOptionsColumns(builtinsOptionsWrapper);
        } else {
            builtinsOptionsWrapper.style.display = 'none'; builtinsOptionsWrapper.innerHTML = '';
        }
        updateGlobalConfigSelectors(); handleVisualInterdependencies();
    }

/**
 * Remplit le conteneur des options de fonctions builtin avec les cases à cocher appropriées.
 * @param {HTMLElement} wrapper - Le conteneur où ajouter les options.
 */
function populateBuiltinOptionsColumns(wrapper) {
    wrapper.innerHTML = ''; const isAdvanced = advancedModeCheckbox.checked;
    const rowDiv = document.createElement('div'); rowDiv.className = 'row gx-2 gy-1';
    const colBaseDiv = document.createElement('div'); colBaseDiv.className = 'col-auto';
    const colAdvancedDiv = document.createElement('div'); colAdvancedDiv.className = 'col-auto';
    const createBuiltinCheckboxList = (builtinsArray) => {
        const listContainer = document.createElement('div'); listContainer.className = 'd-flex flex-column align-items-start gap-1';
        builtinsArray.forEach(builtin => {
            const div = document.createElement('div'); div.className = 'form-check';
            const input = document.createElement('input'); input.className = 'form-check-input builtin-option-checkbox'; input.type = 'checkbox'; input.id = builtin.id; input.value = builtin.id;
            const currentlyCheckedState = document.getElementById(builtin.id)?.checked; if(currentlyCheckedState) input.checked = true;
            const label = document.createElement('label'); label.className = 'form-check-label small'; label.htmlFor = builtin.id; label.textContent = builtin.label;
            input.addEventListener('change', () => { updateGlobalConfigSelectors(); handleVisualInterdependencies(); });
            div.appendChild(input); div.appendChild(label); listContainer.appendChild(div);
        }); return listContainer;
    };
    colBaseDiv.appendChild(createBuiltinCheckboxList(BUILTINS_BASE)); rowDiv.appendChild(colBaseDiv);
    if (isAdvanced && BUILTINS_ADVANCED.length > 0) { colAdvancedDiv.appendChild(createBuiltinCheckboxList(BUILTINS_ADVANCED)); rowDiv.appendChild(colAdvancedDiv); }
    wrapper.appendChild(rowDiv);
}

/**
 * // Configuration spécifique après injection des options de fonctions (pour builtins
 * @param {HTMLElement} funcOptionsContainer - Le conteneur des options de fonctions.
 */
function setupFunctionOptionsExtras(funcOptionsContainer) {
    if (!funcOptionsContainer) return;
    const builtinsMainContainer = funcOptionsContainer.querySelector('#func-builtins-main-container');
    if (builtinsMainContainer) {
        createBuiltinsMainCheckbox(builtinsMainContainer);
    }
}

/**
 * Calcule les exigences minimales en termes de lignes de code et de variables 
 * en fonction des options de syntaxe sélectionnées.
 * @returns {Object} Un objet contenant les minimums requis pour les lignes et les variables.
 */
function calculateGlobalRequirements() {
    let minTotalLines = MIN_POSSIBLE_CODE_LINES;
    let minTotalVariables = 0;
    let conceptualDifficultyScore = 0;
    const getChecked = (id) => document.getElementById(id)?.checked || false;
    const getVarCount = (type) => {
        const checkbox = document.getElementById(`var-${type}`);
        const select = document.getElementById(`var-${type}-count`);
        return (checkbox?.checked && select && select.style.display !== 'none') ? parseInt(select.value) : 0;
    };
    let varCounts = { int: getVarCount('int'), float: getVarCount('float'), str: getVarCount('str'), list: getVarCount('list'), bool: getVarCount('bool') };
    let explicitVarDeclarations = Object.values(varCounts).reduce((sum, count) => sum + count, 0);
    minTotalVariables = Math.max(MIN_POSSIBLE_TOTAL_VARIABLES_GLOBAL, explicitVarDeclarations);
    minTotalLines = Math.max(minTotalLines, explicitVarDeclarations);
    if (getChecked('frame-loops')) {
        if (getChecked('loop-for-range')) { minTotalLines += 2; minTotalVariables += 1; }
        if (getChecked('loop-for-list')) { minTotalLines += 2; minTotalVariables += (varCounts.list === 0) ? 2 : 1; }
        if (getChecked('loop-for-str')) { minTotalLines += 2; minTotalVariables += (varCounts.str === 0) ? 2 : 1; }
        if (getChecked('loop-while')) { minTotalLines += 3; minTotalVariables += 1; }
    }
    if (getChecked('frame-conditions') && getChecked('cond-if')) { minTotalLines += 2; minTotalVariables = Math.max(minTotalVariables, 1); }
    // Simplification pour la lisibilité, la logique complète reste la même.

    minTotalLines = Math.min(Math.max(minTotalLines, MIN_POSSIBLE_CODE_LINES), MAX_CODE_LINES);
    minTotalVariables = Math.min(Math.max(minTotalVariables, MIN_POSSIBLE_TOTAL_VARIABLES_GLOBAL), MAX_TOTAL_VARIABLES_GLOBAL);

    return { minLines: minTotalLines, minVariables: minTotalVariables };
}
    
/**
 * Met à jour les options des menus déroulants pour "Longueur du Code" et "Nombre de variables"
 * en fonction des minimums calculés.
 */
function updateGlobalConfigSelectors() {
    // Vérifier que les éléments sont disponibles
    if (!numLinesGlobalSelect || !numTotalVariablesGlobalSelect) {
        console.warn("Sélecteurs globaux non encore initialisés");
        return;
    }

    const { minLines, minVariables } = calculateGlobalRequirements();

    // choisi de toujours utiliser minLines et minVariables à la place => variables devenu obsolètes
    // const currentNumLinesVal = numLinesGlobalSelect ? parseInt(numLinesGlobalSelect.value) : minLines;
    // const currentNumTotalVariablesVal = numTotalVariablesGlobalSelect ? parseInt(numTotalVariablesGlobalSelect.value) : minVariables;

    // Mettre à jour le nombre de lignes disponibles, avec minLines comme minimum
    populateSelectWithOptions(numLinesGlobalSelect, minLines, MAX_CODE_LINES, minLines);
        // Si la valeur actuelle est inférieure au nouveau minimum, utiliser le minimum
        // Math.max(currentNumLinesVal, minLines));

    // Même chose pour le nombre de variables
    populateSelectWithOptions(numTotalVariablesGlobalSelect, minVariables, MAX_TOTAL_VARIABLES_GLOBAL, minVariables);
            // Math.max(currentNumTotalVariablesVal, minVariables));
}

// --- Gestion des interdépendances visuelles (ÉBAUCHE) ---
// Cette fonction gère les suggestions visuelles basées sur les options sélectionnées.
// Elle est appelée après chaque changement de syntaxe ou du mode avancé.
function handleVisualInterdependencies() {
    const getChecked = (id) => document.getElementById(id) ? document.getElementById(id).checked : false;
    // Fonction pour récupérer le compte d'une variable type si sa checkbox est cochée
    const getVarCount = (type) => {
        const checkbox = document.getElementById(`var-${type}`);
        const select = document.getElementById(`var-${type}-count`);
        if (checkbox && checkbox.checked && select && select.style.display !== 'none') {
            return parseInt(select.value);
        }
        return 0;
    };

    // Classe CSS pour le surlignage des suggestions
    const highlightClassContainer = 'suggestion-highlight-container';
    const highlightClassSelect = 'suggestion-highlight-select';

    // Fonction utilitaire pour ajouter/retirer la classe de surlignage au parent (.form-check.form-check-inline)
    const toggleHighlight = (elementId, condition) => {
        const element = document.getElementById(elementId);
        if (element && element.parentElement && element.parentElement.classList.contains('form-check')) { // Cible le div.form-check parent
            if (condition) {
                element.parentElement.classList.add(highlightClassContainer);
            } else {
                element.parentElement.classList.remove(highlightClassContainer);
            }
        } else if (element && element.tagName === 'SELECT') { // Pour les selects directement
                if (condition) {
                element.classList.add(highlightClassSelect);
            } else {
                element.classList.remove(highlightClassSelect);
            }
        }
    };

    // 1. Suggérer Slicing si List ou Str est coché
    const strIsActive = getVarCount('str') > 0;
    const listIsActive = getVarCount('list') > 0;
    toggleHighlight('op-slice-ab', strIsActive || listIsActive);
    toggleHighlight('op-slice-abs', strIsActive || listIsActive);

    // 2. Suggérer Opérateurs Logiques (and, or, not) si Bool est coché
    const boolIsActive = getVarCount('bool') > 0;
    toggleHighlight('op-and', boolIsActive);
    toggleHighlight('op-or', boolIsActive);
    toggleHighlight('op-not', boolIsActive); // 'not' suggère aussi bool

    // 3. Suggérer type Bool si 'not', 'and', ou 'or' est coché
    const logicalOpActive = getChecked('op-and') || getChecked('op-or') || getChecked('op-not');
    toggleHighlight('var-bool', logicalOpActive);
    // Si un opérateur logique est actif et qu'on a moins de bools que nécessaire (1 pour not, 2 pour and/or)
    const boolVarCountSelect = document.getElementById('var-bool-count');
    if (logicalOpActive && getChecked('var-bool')) { // Seulement si la checkbox bool est déjà cochée
            if ((getChecked('op-and') || getChecked('op-or')) && getVarCount('bool') < 2) {
            if (boolVarCountSelect) boolVarCountSelect.classList.add(highlightClassSelect);
        } else if (getChecked('op-not') && getVarCount('bool') < 1) { // Devrait toujours être au moins 1 si coché
            if (boolVarCountSelect) boolVarCountSelect.classList.add(highlightClassSelect);
        }
            else {
            if (boolVarCountSelect) boolVarCountSelect.classList.remove(highlightClassSelect);
        }
    } else {
            if (boolVarCountSelect) boolVarCountSelect.classList.remove(highlightClassSelect);
    }


    // 4. Suggérer type Str/List si Slicing est coché
    const slicingActive = getChecked('op-slice-ab') || getChecked('op-slice-abs');
    toggleHighlight('var-str', slicingActive);
    toggleHighlight('var-list', slicingActive);

    // 5. Suggérer type List si 'opList' (Func) ou 'for_List' (Loop) est coché
    const opListFuncActive = getChecked('func-op-list');
    const forListLoopActive = getChecked('loop-for-list');
    toggleHighlight('var-list', opListFuncActive || forListLoopActive || (slicingActive && !strIsActive)); // Suggère list pour slicing si str n'est pas déjà la raison

    // 6. Suggérer type Str si 'opStr' (Func) ou 'for_Str' (Loop) est coché
    const opStrFuncActive = getChecked('func-op-str');
    const forStrLoopActive = getChecked('loop-for-str');
    toggleHighlight('var-str', opStrFuncActive || forStrLoopActive || (slicingActive && !listIsActive)); // Suggère str pour slicing si list n'est pas déjà la raison

    // 7. Suggérer Opérateurs Logiques (and, or, not) si 'while{op}' (Loop) est coché
    const whileOpLoopActive = getChecked('loop-while-op');
    toggleHighlight('op-and', whileOpLoopActive || boolIsActive); // Combine avec la suggestion précédente
    toggleHighlight('op-or', whileOpLoopActive || boolIsActive);  // Combine
    toggleHighlight('op-not', whileOpLoopActive || boolIsActive); // Combine

    // console.log("Interdependencies updated.");
}


// Fonction utilitaire pour obtenir le dump AST du code courant via Pyodide
async function getAstDumpFromCode(code) {
    if (!pyodide) {
        console.warn("Pyodide n'est pas prêt.");
        return null;
    }
    try {
        // On utilise la classe ControlFlowGraph déjà chargée dans Pyodide
        pyodide.globals.set("user_python_code", code);
        const pyScript = `
import ast
try:
    # On ne fait que parser, pas besoin de générer le graphe complet ici.
    tree = ast.parse(user_python_code)
    result = ast.dump(tree)
except Exception:
    result = None # Retourne None si le code est syntaxiquement invalide
result
`;
        const astDump = await pyodide.runPythonAsync(pyScript);
        return astDump;
    } catch (e) {
        console.error("Erreur lors de la récupération du dump AST:", e);
        return null;
    }
}

/**
 * Met à jour l'état visuel des cartes du diagramme et du défi.
 * @param {string} state - "outdated" (rouge), "default" (bleu/info).
 */
function setDiagramAndChallengeCardState(state) {
    const diagramCard = document.getElementById('flowchart')?.closest('.card');
    const challengeCard = document.getElementById('variables-container')?.closest('.card');
    const checkBtn = document.getElementById('check-answers-btn');
    const showSolBtn = document.getElementById('show-solution-btn');

    [diagramCard, challengeCard].forEach(card => {
        if (!card) return;
        // Nettoyer toutes les classes de bordure potentielles
        card.classList.remove('border-danger', 'border-info', 'border-secondary');
        card.classList.remove('border'); // Retirer la classe 'border' de base aussi

        if (state === "outdated") {
            card.classList.add('border', 'border-danger');
            card.style.opacity = '0.3'; // Légèrement transparent pour indiquer l'état périmé
        } else {
            // Appliquer la bordure par défaut (bleu info)
            card.classList.add('border', 'border-info');
            card.style.opacity = "1"; // Restaure l'opacité normale
        }
    });

    // Mettre à jour le bouton "Lancer"
    const runBtn = document.getElementById('run-code-btn');
    if (runBtn) {
        runBtn.classList.remove('btn-danger', 'btn-success');
        if (state === "outdated") {
            runBtn.classList.add('btn-danger');
            if (checkBtn) checkBtn.disabled = true;
            if (showSolBtn) showSolBtn.disabled = true;
            resetChallengeInputs(challengeVariablesContainer, "outdated"); // On passe l'état pour un message personnalisé
        } else {
            runBtn.classList.add('btn-success');
        }
    }
}

// --- Fonctions pour le Défi (déplacées de l'intérieur de DOMContentLoaded pour être globales si nécessaire, mais restent dans ce scope) ---

async function runAndTraceCodeForChallenge(code, pyodideInstance) {
    console.log("Exécution du code pour le défi maintenant avec I/O personnalisés...");
    clearConsole();

    const turtleCard = document.getElementById('turtle-graphics-card');
    const turtleCanvas = document.getElementById('turtle-canvas');
    let turtleSetupCode = "";

    // Correction de la structure `if/try/catch/else`
    if (code.includes("import turtle")) {
        try {
            await pyodideInstance.loadPackage('turtle');
            if (turtleCard && turtleCanvas) {
                turtleCard.style.display = 'block';
                const ctx = turtleCanvas.getContext('2d');
                ctx.clearRect(0, 0, turtleCanvas.width, turtleCanvas.height);
                turtleSetupCode = `
import sys
import pyo_js_turtle as turtle
sys.modules['turtle'] = turtle
turtle.Screen().setup(target_id='turtle-canvas')
`;
            }
        } catch (e) {
            console.error("Erreur lors du chargement du paquet Turtle:", e);
            logToConsole(formatPythonError(e.message), 'error');
            return {}; // Arrêter si Turtle échoue
        }
    } else {
        if (turtleCard) {
            turtleCard.style.display = 'none'; // Masquer si turtle n'est pas utilisé
        }
    }

    pyodideInstance.globals.set("js_print_handler", logToConsole);
    pyodideInstance.globals.set("js_input_handler", handlePythonInput);
    pyodideInstance.globals.set("student_code_to_run", code);

    const tracingWrapper = `
import builtins
import io
import sys
import json
import types
import asyncio
import pyodide
from pyodide.ffi import to_js
import ast

def extract_function_calls(code):
    try:
        tree = ast.parse(code)
        calls = []

        class FunctionCallExtractor(ast.NodeVisitor):
            def visit_Assign(self, node):
                if isinstance(node.value, ast.Call):
                    call = node.value
                    if isinstance(call.func, ast.Name):
                        calls.append({
                            'func_name': call.func.id,
                            'result_var': node.targets[0].id if isinstance(node.targets[0], ast.Name) else None
                        })
                self.generic_visit(node)

            def visit_Expr(self, node):
                if isinstance(node.value, ast.Call):
                    call = node.value
                    if isinstance(call.func, ast.Name):
                        calls.append({
                            'func_name': call.func.id,
                            'result_var': None
                        })
                self.generic_visit(node)

        extractor = FunctionCallExtractor()
        extractor.visit(tree)
        return calls
    except:
        return []

class AwaitInputTransformer(ast.NodeTransformer):
    def visit_Call(self, node):
        if isinstance(node.func, ast.Name) and node.func.id == "input":
            return ast.Await(value=node)
        return self.generic_visit(node)

_original_print = builtins.print
_original_input = builtins.input
user_ns = {}
_final_vars = {}
_error_detail_trace = None

def custom_print(*args, **kwargs):
    s_io = io.StringIO()
    kwargs['file'] = s_io
    _original_print(*args, **kwargs)
    message = s_io.getvalue()
    js_print_handler(message)

async def custom_input(prompt=""):
    response = await js_input_handler(prompt)
    js_print_handler(str(prompt) + str(response) + '\\n', 'output')
    return response

builtins.print = custom_print
builtins.input = custom_input

async def main():
    global _error_detail_trace, user_ns

    try:
        from ast import unparse
        tree = ast.parse(student_code_to_run)
        transformed_tree = AwaitInputTransformer().visit(tree)
        ast.fix_missing_locations(transformed_tree)
        transformed_code_string = unparse(transformed_tree)
        await pyodide.code.eval_code_async(transformed_code_string, globals=user_ns)

        function_calls = extract_function_calls(student_code_to_run)
        for call_info in function_calls:
            if call_info['func_name'] in user_ns and callable(user_ns[call_info['func_name']]):
                func_name = call_info['func_name']
                if not call_info['result_var'] and hasattr(user_ns[func_name], '__code__'):
                    try:
                        result = user_ns[func_name](4)
                        result_var_name = f"{func_name}_result"
                        user_ns[result_var_name] = result
                    except:
                        pass
    except Exception as e:
        import traceback
        _error_detail_trace = traceback.format_exc()
    finally:
        builtins.print = _original_print
        builtins.input = _original_input

await main()

if _error_detail_trace is None:
    for _var_name, _val in user_ns.items():
        if _var_name.startswith('__') or isinstance(_val, (types.ModuleType, types.FunctionType, type)):
            continue
        if _var_name in ['pyodide', 'sys', 'micropip', 'json', 'types', 'ast', 'traceback',
                         'error_detail', 'current_code', 'user_python_code',
                         'cfg_instance', 'mermaid_output', 'error_message', 'output_dict',
                         'parsed_code_string', 'List', 'Dict', 'Set', 'Tuple', 'Optional',
                         '_syntax_check_result', '_error_detail_trace', 'user_ns', '_final_vars',
                         '_original_print', '_original_input', 'custom_print', 'custom_input', 's_io',
                         'js_print_handler', 'js_input_handler', 'main',
                         'turtle_setup_script', 'student_code_to_run',
                         '_var_name', '_val']:
            continue
        if isinstance(_val, (str, int, float, bool, list, dict, tuple, set)) or _val is None:
            _final_vars[_var_name] = _val
        else:
            try:
                _final_vars[_var_name] = repr(_val)
            except:
                _final_vars[_var_name] = "<valeur non sérialisable>"

json.dumps({"variables": _final_vars, "error": _error_detail_trace})
`;

    console.log("Wrapper de traçage (avec I/O) passé à Pyodide:", tracingWrapper);
    let tracedVariables = {};
    try {
        let resultJson = await pyodideInstance.runPythonAsync(tracingWrapper);
        if (resultJson) {
            const result = JSON.parse(resultJson);
            if (result.error) {
                console.error("Erreur d'exécution Python capturée:", result.error);
                const friendlyError = formatPythonError(result.error);
                logToConsole(friendlyError, 'error');
                return {};
            }
            tracedVariables = result.variables;
        }
        console.log("Variables tracées pour le défi:", tracedVariables);
    } catch (error) {
        console.error("Erreur majeure lors de l'exécution tracée pour le défi (wrapper):", error);
        const friendlyError = formatPythonError(error.message);
        logToConsole(friendlyError, 'error');
        tracedVariables = {};
    }
    return tracedVariables;
}

/**
 * Helper function to get a Python-like string representation for non-basic types.
 * @param {*} value - The value to represent.
 * @returns {string} - The string representation.
 */
function reprPythonVal(value) {
    if (typeof value === 'string') {
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


// --- Gestion de la Console et des I/O personnalisées ---

/**
 * Affiche un message dans la console d'exécution.
 * @param {string} message Le message à afficher.
 * @param {string} type 'output' pour une sortie standard, 'error' pour une erreur.
 */
function logToConsole(message, type = 'output') {
    const consoleOutput = document.getElementById('execution-console-output');
    if (!consoleOutput) return;

    const line = document.createElement('div');
    line.className = type === 'error' ? 'text-danger' : 'text-light';

    line.appendChild(document.createTextNode(message));

    consoleOutput.appendChild(line);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

/**
 * Efface le contenu de la console d'exécution.
 */
function clearConsole() {
    const consoleOutput = document.getElementById('execution-console-output');
    if (consoleOutput) {
        consoleOutput.innerHTML = '';
    }
}

/**
 * Gère la fonction input() de Python en affichant un modal.
 * Retourne une Promise qui se résout avec la saisie de l'utilisateur.
 * @param {string} prompt Le message à afficher à l'utilisateur.
 * @returns {Promise<string>}
 */
function handlePythonInput(prompt) {
    console.log("DEBUG : Appel à handlePythonInput avec prompt:", prompt);
    const inputModal = new bootstrap.Modal(document.getElementById('input-modal'));
    const promptElement = document.getElementById('input-modal-prompt');
    const inputField = document.getElementById('input-modal-field');
    const submitButton = document.getElementById('input-modal-submit-btn');

    promptElement.textContent = prompt || "";
    inputField.value = '';

    return new Promise((resolve) => {
        const submitListener = () => {
            const value = inputField.value;
            submitButton.removeEventListener('click', submitListener);
            inputField.removeEventListener('keydown', enterListener);
            inputModal.hide();
            resolve(value);
        };

        const enterListener = (event) => {
            if (event.key === 'Enter') {
                submitListener();
            }
        };

        submitButton.addEventListener('click', submitListener);
        inputField.addEventListener('keydown', enterListener);

        document.getElementById('input-modal').addEventListener('shown.bs.modal', () => {
            inputField.focus();
        }, { once: true });

        inputModal.show();
    });
}

/**
 * Formate une erreur Python en un message lisible pour un élève.
 * @param {string} traceback Le traceback complet de Python.
 * @returns {string} Un message d'erreur formaté et simplifié.
 */
function formatPythonError(traceback) {
    if (!traceback) return "Une erreur inconnue est survenue.";

    const lines = traceback.trim().split('\n');
    const errorLine = lines[lines.length - 1];

    const match = errorLine.match(/^(\w+):\s*(.*)$/);
    if (!match) return traceback;

    const errorType = match[1];
    const errorMessage = match[2];
    let hint = "";

    switch (errorType) {
        case 'NameError':
            hint = `'NameError': La variable ${errorMessage.split("'")[1]} a été utilisée avant d'avoir reçu une valeur. Avez-vous fait une faute de frappe ou oublié de l'initialiser ?`;
            break;
        case 'TypeError':
            hint = "'TypeError': Vous avez essayé de faire une opération entre des types de données incompatibles. Par exemple, additionner un nombre et du texte (`5 + 'hello'`). Vérifiez que vos variables ont le bon type.";
            break;
        case 'IndexError':
            hint = "'IndexError': Vous avez essayé d'accéder à un élément d'une liste ou d'une chaîne avec un indice qui n'existe pas. Par exemple, demander le 5ème élément d'une liste qui n'en a que 3.";
            break;
        case 'SyntaxError':
            hint = `'SyntaxError': Votre code contient une erreur d'écriture. Vérifiez attentivement la ligne indiquée : les deux-points (\`:\`) à la fin des \`if\`/\`for\`/\`def\`, l'indentation (les espaces au début des lignes), et les parenthèses. Message original : ${errorMessage}`;
            break;
        case 'ValueError':
            hint = `'ValueError': Une fonction a reçu un argument du bon type, mais avec une valeur inappropriée. Par exemple, \`int('abc')\`. Message original : ${errorMessage}`;
            break;
        case 'ZeroDivisionError':
            hint = "'ZeroDivisionError': Vous avez tenté de diviser un nombre par zéro, ce qui est impossible en mathématiques.";
            break;
        default:
            hint = "Une erreur est survenue. Lisez attentivement le message pour trouver un indice.";
    }

    return `Erreur détectée : ${errorLine}\n\n💡 Piste : ${hint}`;
}

/**********************************************************/
/**********************************************************/
// --- Point d'entrée principal de l'application ---
document.addEventListener('DOMContentLoaded', function() {

    // --- Initialisation de l'éditeur CodeMirror ---
    codeEditorInstance = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
        mode: 'python',
        theme: 'dracula',
        lineNumbers: true,
        firstLineNumber: 0,
        indentUnit: 4,
        tabSize: 4,
        indentWithTabs: false,
        lineWrapping: true,
        readOnly: !isEditorEditable // Initialement non éditable

    });

    // --- Initialisation des variables DOM globales ---
    difficultyGlobalSelect = document.getElementById('difficulty-level-global');
    numLinesGlobalSelect = document.getElementById('num-lines-global');
    numTotalVariablesGlobalSelect = document.getElementById('num-total-variables-global');
    advancedModeCheckbox = document.getElementById('advanced-mode');
    challengeVariablesContainer = document.getElementById('variables-container');
    checkAnswersButton = document.getElementById('check-answers-btn');
    showSolutionButton = document.getElementById('show-solution-btn');
    const feedbackModalElement = document.getElementById('feedback-modal');
    feedbackModal = feedbackModalElement ? new bootstrap.Modal(feedbackModalElement) : null;

    // --- Initialisation des boutons de la barre d'outils de l'éditeur ---
    const toggleBtn = document.getElementById('toggle-editable-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => setEditorEditable(!isEditorEditable));
    }

    const downloadBtn = document.getElementById('download-code-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!codeEditorInstance) return;
            const code = codeEditorInstance.getValue();
            const blob = new Blob([code], {type: "text/x-python"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const now = new Date();
            const yyyy = now.getFullYear().toString();
            const yy = yyyy[2] + yyyy[3];
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            a.download = `mon_code_${dd}${mm}${yy}.py`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 0);
        });
    }

    const openFileBtn = document.getElementById('open-file-btn');
    const fileInput = document.getElementById('file-input');
    if (openFileBtn && fileInput) {
        openFileBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.name.endsWith('.py')) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    if (codeEditorInstance) {
                        lastDiagramAstDump = "";
                        document.getElementById('flowchart').innerHTML = '<p class="text-center text-muted mt-3">Nouveau fichier chargé. Cliquez sur "Lancer..." pour voir le diagramme et le défi.</p>';
                        if (typeof resetChallengeInputs === 'function') {
                            resetChallengeInputs(challengeVariablesContainer);
                        }
                        document.getElementById('check-answers-btn').disabled = true;
                        document.getElementById('show-solution-btn').disabled = true;
                        codeEditorInstance.setValue(evt.target.result);
                        lastLoadedCode = evt.target.result;
                        setDiagramAndChallengeCardState("default");
                    }
                };
                reader.readAsText(file, "UTF-8");
            } else {
                alert("Choisissez un fichier .py UNIQUEMENT");
            }
            fileInput.value = "";
        });
    }

    const shareBtn = document.getElementById('share-code-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
            if (!codeEditorInstance) return;
            const code = codeEditorInstance.getValue();
            try {
                await navigator.clipboard.writeText(code);
                shareBtn.classList.add('btn-success');
                setTimeout(() => shareBtn.classList.remove('btn-success'), 1000);
            } catch (err) {
                alert("Impossible de copier dans le presse-papier.");
            }
        });
    }

    const reloadBtn = document.getElementById("reload-code-btn");
    if (reloadBtn) {
        reloadBtn.addEventListener('click', () => {
            if (lastLoadedCode && codeEditorInstance) {
                lastDiagramAstDump = "";
                document.getElementById('flowchart').innerHTML = '<p class="text-center text-muted mt-3">Code rechargé. Cliquez sur "Lancer..." pour voir le diagramme et le défi.</p>';
                if (typeof resetChallengeInputs === 'function') {
                    resetChallengeInputs(challengeVariablesContainer);
                }
                document.getElementById('check-answers-btn').disabled = true;
                document.getElementById('show-solution-btn').disabled = true;
                codeEditorInstance.setValue(lastLoadedCode);
                setDiagramAndChallengeCardState("default");
                console.log("Code rechargé depuis la dernière sauvegarde. Diagramme invalidé.");
            }
        });
    }

    // --- Gestionnaire pour "Générer un Code Aléatoire" ---
    const generateCodeButton = document.getElementById('generate-code-btn');
    if (generateCodeButton) {
        generateCodeButton.addEventListener('click', function() {
            const getChecked = (id) => document.getElementById(id) ? document.getElementById(id).checked : false;
            const getSelectVal = (id, defaultValIfNotFound = 0, typeIfVarCount = null) => {
                const sel = document.getElementById(id);
                if (typeIfVarCount) {
                    const typeCheckbox = document.getElementById(`var-${typeIfVarCount}`);
                    if (!typeCheckbox || !typeCheckbox.checked || !sel || sel.style.display === 'none') {
                        return 0;
                    }
                }
                return sel ? parseInt(sel.value) : defaultValIfNotFound;
            };
            const generationOptions = {
                var_int_count: getSelectVal('var-int-count', 0, 'int'),
                var_float_count: getSelectVal('var-float-count', 0, 'float'),
                var_str_count: getSelectVal('var-str-count', 0, 'str'),
                var_list_count: getSelectVal('var-list-count', 0, 'list'),
                var_bool_count: getSelectVal('var-bool-count', 0, 'bool'),
                op_plus_minus: getChecked('op-plus-minus'),
                op_mult_div_pow: getChecked('op-mult-div-pow'),
                op_modulo_floor: getChecked('op-modulo-floor'),
                op_and: getChecked('op-and'),
                op_or: getChecked('op-or'),
                op_not: getChecked('op-not'),
                op_slice_ab: getChecked('op-slice-ab'),
                op_slice_abs: getChecked('op-slice-abs'),
                main_conditions: getChecked('frame-conditions'),
                cond_if: getChecked('cond-if'),
                cond_if_else: getChecked('cond-if-else'),
                cond_if_elif: getChecked('cond-if-elif'),
                cond_if_elif_else: getChecked('cond-if-elif-else'),
                cond_if_if: getChecked('cond-if-if'),
                cond_if_if_if: getChecked('cond-if-if-if'),
                main_loops: getChecked('frame-loops'),
                loop_for_range: getChecked('loop-for-range'),
                loop_for_list: getChecked('loop-for-list'),
                loop_for_str: getChecked('loop-for-str'),
                loop_while: getChecked('loop-while'),
                loop_nested_for2: getChecked('loop-nested-for2'),
                loop_nested_for3: getChecked('loop-nested-for3'),
                loop_while_op: getChecked('loop-while-op'),
                loop_range_ab: getChecked('loop-range-ab'),
                loop_range_abs: getChecked('loop-range-abs'),
                main_functions: getChecked('frame-functions'),
                func_def_simple: getChecked('func-def-simple'),
                func_def_a: getChecked('func-def-a'),
                builtin_print: getChecked('builtin-print'),
                builtin_input: getChecked('builtin-input'),
                builtin_len: getChecked('builtin-len'),
                func_return: getChecked('func-return'),
                builtin_isinstance: getChecked('builtin-isinstance'),
                builtin_chr: getChecked('builtin-chr'),
                builtin_ord: getChecked('builtin-ord'),
                builtin_min: getChecked('builtin-min'),
                builtin_max: getChecked('builtin-max'),
                builtin_sum: getChecked('builtin-sum'),
                func_def_ab: getChecked('func-def-ab'),
                func_op_list: getChecked('func-op-list'),
                func_op_str: getChecked('func-op-str'),
                difficultyLevelGlobal: parseInt(difficultyGlobalSelect.value),
                numLinesGlobal: parseInt(numLinesGlobalSelect.value),
                numTotalVariablesGlobal: parseInt(numTotalVariablesGlobalSelect.value)
            };
            console.log("Options de génération finales pour code-generator:", generationOptions);

            var newGeneratedCode = "";
            if (typeof generateRandomPythonCode === 'function') {
                newGeneratedCode = generateRandomPythonCode(generationOptions);
            } else {
                console.warn("generateRandomPythonCode n'est pas définie.");
                newGeneratedCode = "# Erreur: Le générateur de code aléatoire n'est pas disponible.";
            }

            lastDiagramAstDump = "";
            if(codeEditorInstance) codeEditorInstance.setValue(newGeneratedCode);
            memorizeLoadedCode(newGeneratedCode);
            setDiagramAndChallengeCardState("default");
            
            // NOUVEL APPEL DE LOG: On journalise le code qui vient d'être généré.
            if (typeof logGeneratedCode === 'function') {
                const difficulty = parseInt(difficultyGlobalSelect.value, 10);
                logGeneratedCode(newGeneratedCode, difficulty);
            }

            var flowchartDisplayArea = document.getElementById('flowchart');
            if (flowchartDisplayArea) flowchartDisplayArea.innerHTML = '<p class="text-center text-muted mt-3">Nouveau code généré. Cliquez sur "Lancer..."</p>';

            resetChallengeInputs(challengeVariablesContainer);
            if(checkAnswersButton) checkAnswersButton.disabled = true;
            if(showSolutionButton) showSolutionButton.disabled = true;
            updateGlobalConfigSelectors();
        });
    } else {
        console.warn("Bouton 'generate-code-btn' non trouvé.");
    }

    const predefinedExamplesList = document.getElementById('predefined-examples-list');
    if (predefinedExamplesList) {
        predefinedExamplesList.querySelectorAll('a[data-example-index]').forEach(link => {
            link.addEventListener('click', function() {
                lastDiagramAstDump = "";
                console.log("chargement du code par ailleurs... on va mémoriser et invalider le diagramme");
                if (codeEditorInstance) memorizeLoadedCode(codeEditorInstance.getValue());
            });
        });
    }


    const loadPredefinedCodeBtn = document.getElementById('load-predefined-code-btn');

    if (predefinedExamplesList && typeof PREDEFINED_EXAMPLES !== 'undefined' && PREDEFINED_EXAMPLES.length > 0) {
        PREDEFINED_EXAMPLES.forEach((example, index) => {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.className = 'dropdown-item';
            link.href = '#';
            link.textContent = example.name;
            link.dataset.exampleIndex = index;

            link.addEventListener('click', function(e) {
                e.preventDefault();
                const exampleIndex = parseInt(this.dataset.exampleIndex);
                const selectedExample = PREDEFINED_EXAMPLES[exampleIndex];
                if (selectedExample && codeEditorInstance) {
                    
                    if (typeof logLoadExample === 'function') {
                        logLoadExample(selectedExample.name);
                    }
                    lastDiagramAstDump = "";
                    codeEditorInstance.setValue(selectedExample.code);
                    memorizeLoadedCode(selectedExample.code);
                    setDiagramAndChallengeCardState("default");
                    console.log(`Exemple chargé et mémorisé: ${selectedExample.name}. Diagramme invalidé.`);
                    if (typeof resetChallengeInputs === 'function') {
                        resetChallengeInputs(challengeVariablesContainer);
                    }
                    document.getElementById('check-answers-btn').disabled = true;
                    document.getElementById('show-solution-btn').disabled = true;
                    document.getElementById('flowchart').innerHTML = '<p class="text-center text-muted mt-3">Code chargé. Cliquez sur "Lancer..." pour voir le diagramme et le défi.</p>';
                }
            });
            listItem.appendChild(link);
            predefinedExamplesList.appendChild(listItem);
        });
    } else if (loadPredefinedCodeBtn) {
        loadPredefinedCodeBtn.disabled = true;
        const noExamplesItem = document.createElement('li');
        noExamplesItem.innerHTML = '<span class="dropdown-item disabled">Aucun exemple disponible</span>';
        if (predefinedExamplesList) predefinedExamplesList.appendChild(noExamplesItem);
        console.warn("PREDEFINED_EXAMPLES n'est pas défini ou est vide. Le chargement d'exemples est désactivé.");
    }


    const varTypeCheckboxes = document.querySelectorAll('.var-type-checkbox');
    varTypeCheckboxes.forEach(checkbox => {
        const varType = checkbox.id.replace('var-', '');
        const targetSelectId = checkbox.dataset.targetSelect;
        if (targetSelectId && VAR_COUNT_LIMITS[varType]) {
            const selectElement = document.getElementById(targetSelectId);
            const limits = VAR_COUNT_LIMITS[varType];
            if (selectElement) {
                populateSelectWithOptions(selectElement, limits.min, limits.max, limits.min);
                const updateVarCountSelectVisibility = () => {
                    selectElement.style.display = checkbox.checked ? 'inline-block' : 'none';
                    if (!checkbox.checked) selectElement.value = limits.min;
                    updateGlobalConfigSelectors();
                    handleVisualInterdependencies();
                };
                checkbox.removeEventListener('change', updateVarCountSelectVisibility);
                checkbox.addEventListener('change', updateVarCountSelectVisibility);
                updateVarCountSelectVisibility();
            }
        }
    });

   

    if (advancedModeCheckbox) {
        advancedModeCheckbox.addEventListener('change', function() {
            const isAdvanced = this.checked;
            addAdvancedOperationOptionsIfNeeded(isAdvanced);
            const condContainer = document.querySelector('#conditions-options-container > .d-flex.flex-column.gap-1'); if (condContainer) addAdvancedConditionOptionsIfNeeded(condContainer, isAdvanced);
            const loopContainer = document.querySelector('#loops-options-container > .d-flex.flex-column.gap-1'); if (loopContainer) addAdvancedLoopOptionsIfNeeded(loopContainer, isAdvanced);
            const funcBaseOptsContainer = document.querySelector('#functions-options-container > .d-flex.flex-column.gap-1'); if (funcBaseOptsContainer) addAdvancedFunctionOptionsIfNeeded(funcBaseOptsContainer, isAdvanced);
            const funcBuiltinsCheckbox = document.getElementById('func-builtins'); const builtinsOptionsWrapper = document.getElementById('func-builtins-options-wrapper');
            if (funcBuiltinsCheckbox && funcBuiltinsCheckbox.checked && builtinsOptionsWrapper) populateBuiltinOptionsColumns(builtinsOptionsWrapper);
            updateGlobalConfigSelectors(); handleVisualInterdependencies();
        });
    }

    const syntaxConfigArea = document.querySelector('.card-body .row.g-2.flex-wrap.align-items-start');
    if (syntaxConfigArea) {
        syntaxConfigArea.addEventListener('click', function(event) {
            if (event.target.matches('input[type="checkbox"], label, select')) {
                setTimeout(() => {
                    updateGlobalConfigSelectors();
                    handleVisualInterdependencies();
                }, 50);
            }
        });
    }

    if (advancedModeCheckbox) {
        advancedModeCheckbox.addEventListener('change', () => {
            const isAdvanced = advancedModeCheckbox.checked;
            addAdvancedOperationOptionsIfNeeded(isAdvanced);
            const condContainer = document.querySelector('#conditions-options-container > .d-flex.flex-column.gap-1'); if (condContainer) addAdvancedConditionOptionsIfNeeded(condContainer, isAdvanced);
            const loopContainer = document.querySelector('#loops-options-container > .d-flex.flex-column.gap-1'); if (loopContainer) addAdvancedLoopOptionsIfNeeded(loopContainer, isAdvanced);
            const funcBaseOptsContainer = document.querySelector('#functions-options-container > .d-flex.flex-column.gap-1'); if (funcBaseOptsContainer) addAdvancedFunctionOptionsIfNeeded(funcBaseOptsContainer, isAdvanced);
            setTimeout(() => {
                updateGlobalConfigSelectors();
                handleVisualInterdependencies();
            }, 100);
        });
    }

    if (codeEditorInstance) {
        codeEditorInstance.on('change', async function() {
            if (!pyodide) return;
            if (!lastDiagramAstDump) {
                setDiagramAndChallengeCardState("default");
                return;
            }
            const currentCode = codeEditorInstance.getValue();
            const currentAstDump = await getAstDumpFromCode(currentCode);
            if (!currentAstDump) {
                setDiagramAndChallengeCardState("outdated");
                return;
            }
            if (currentAstDump !== lastDiagramAstDump) {
                setDiagramAndChallengeCardState("outdated");
            } else {
                // Le code est redevenu identique à la dernière version exécutée.
                setDiagramAndChallengeCardState("default");
                
                // --- RESTAURATION DE L'ÉTAT DU DÉFI ---
                // Si on a des valeurs de la dernière exécution, on restaure l'affichage.
                if (Object.keys(variableValuesFromExecution).length > 0) {
                    if (typeof populateChallengeInputs === 'function') {
                        populateChallengeInputs(variableValuesFromExecution, challengeVariablesContainer);
                    }
                    if (checkAnswersButton) checkAnswersButton.disabled = false;
                    if (showSolutionButton) showSolutionButton.disabled = false;
                }
                // --- FIN DE LA RESTAURATION ---
            }
        });
    }

    const runCodeButton = document.getElementById('run-code-btn');
    if (runCodeButton) {
        runCodeButton.addEventListener('click', async function() {
            console.log("Bouton 'Lancer...' cliqué. Processus unifié démarré.");
            if (!codeEditorInstance) {
                console.error("L'instance de CodeMirror n'est pas disponible.");
                alert("Erreur : L'éditeur de code n'est pas initialisé.");
                return;
            }
            // Le code brut de l'éditeur est notre seule source de vérité.
           const originalCode = codeEditorInstance.getValue();
            // const currentCode = codeEditorInstance.getValue();
            // const currentCode = originalCode.replace(/^\s*#.*$/gm, '').trim(); // Enlève les commentaires et espaces inutiles
             
             // 1. APPEL UNIFIÉ :
            // Un seul appel asynchrone pour obtenir le diagramme, le code normalisé, et le dump de l'AST.
            let processingResults;
            try {
                if (typeof triggerFlowchartUpdate === 'function') {
                    // On s'attend à ce que triggerFlowchartUpdate retourne un objet :
                    // { mermaid: "...", canonicalCode: "...", ast_dump: "..." }
                    processingResults = await triggerFlowchartUpdate();
                } else {
                    throw new Error("La fonction triggerFlowchartUpdate n'est pas définie.");
                }
            } catch (e) {
                console.error("Erreur lors de la mise à jour du diagramme de flux:", e);
                alert("Erreur : Impossible de mettre à jour le diagramme de flux. Veuillez vérifier la console pour plus de détails.");
                return; // Arrêter le processus en cas d'échec critique.
            }

            // 2. JOURNALISATION INTELLIGENTE :
            // On ne journalise que si le code a structurellement changé.
            if (processingResults && processingResults.canonicalCode) {
                const canonicalCode = processingResults.canonicalCode;
                
                if (canonicalCode !== lastLoggedCanonicalCode) {
                    console.log("Changement structurel détecté. Journalisation des deux versions du code.");
                    
                    // On récupère la difficulté au moment de l'exécution.
                    const difficulty = parseInt(difficultyGlobalSelect.value, 10);

                    // APPEL MODIFIÉ: On utilise la nouvelle fonction avec tous les arguments.
                    if (typeof logExecutedCode === 'function') {
                        try {
                            // CORRECTION : On attend le résultat de la journalisation.
                            const logResult = await logExecutedCode(originalCode, canonicalCode, difficulty); 
                            if (logResult && logResult.code_id) {
                                // On stocke l'ID du code qui vient d'être créé.
                                currentChallengeCodeId = logResult.code_id;
                                console.log(`Défi initialisé avec code_id: ${currentChallengeCodeId}`);
                            }
                        } catch (e) {
                            console.error("Erreur lors de la journalisation du code exécuté:", e);
                        }
                    }
                    
                    // Mettre à jour la référence pour éviter les logs redondants.
                    lastLoggedCanonicalCode = canonicalCode;
                } else {
                    console.log("Aucun changement structurel. Journalisation ignorée.");
                }
            }

            // 3. MISE À JOUR DE L'AST POUR LA SYNCHRONISATION DE L'UI :
            // CORRECTION : On supprime l'appel redondant et on utilise le dump AST
            // déjà récupéré lors de l'appel unifié. C'est la clé de la fiabilité.
            if (processingResults && processingResults.ast_dump) {
                lastDiagramAstDump = processingResults.ast_dump;
                console.log("lastDiagramAstDump mis à jour via le processus unifié.");
            } else {
                // Si le traitement a échoué ou n'a pas retourné de dump, on réinitialise la référence.
                lastDiagramAstDump = "";
                console.warn("Impossible de mettre à jour le dump AST de référence via le processus unifié.");
            }
            
            // 4. EXÉCUTION DU DÉFI :
            // Mettre l'UI en état "par défaut" avant de lancer le défi.
            setDiagramAndChallengeCardState("default");
            try {
                variableValuesFromExecution = {};
                if (typeof pyodide !== 'undefined' && pyodide) {
                     // On exécute le code original de l'éditeur pour le défi.
                     variableValuesFromExecution = await runAndTraceCodeForChallenge(originalCode, pyodide);
                } else {
                    console.warn("Pyodide n'est pas encore prêt pour exécuter le code du défi.");
                    alert("Le moteur Python n'est pas encore prêt. Veuillez patienter.");
                    if (checkAnswersButton) checkAnswersButton.disabled = true;
                    if (showSolutionButton) showSolutionButton.disabled = true;
                    return;
                }
                
                // Mettre à jour l'interface du défi avec les résultats.
                if (typeof populateChallengeInputs === 'function') {
                    populateChallengeInputs(variableValuesFromExecution, challengeVariablesContainer);
                }
                const hasVariables = Object.keys(variableValuesFromExecution).length > 0;
                if (checkAnswersButton) checkAnswersButton.disabled = !hasVariables;
                if (showSolutionButton) showSolutionButton.disabled = !hasVariables;

            } catch (error) {
                console.error("Erreur lors de l'exécution du code pour le défi:", error);
                const container = document.getElementById('variables-container');
                if (container) {
                    container.innerHTML = `
                        <div class="col-12 text-center text-danger">
                            <p>Erreur lors de l'exécution du code Python pour le défi :<br>
                            <code>${error.message}</code></p>
                        </div>`;
                }
                if (checkAnswersButton) checkAnswersButton.disabled = true;
                if (showSolutionButton) showSolutionButton.disabled = true;
            }
        });
    }

    if (checkAnswersButton) {
        checkAnswersButton.addEventListener('click', function() {
            console.log("Bouton 'Vérifier les réponses' cliqué.");
            if (typeof checkStudentAnswers === 'function' 
                && typeof buildFeedbackModalContent === 'function' && feedbackModal) {
                const results = checkStudentAnswers(variableValuesFromExecution);

                if (typeof logVerifyAnswers === 'function') {
                if (currentChallengeCodeId) {
                    logVerifyAnswers(results, currentChallengeCodeId);
                } else {
                    console.warn("Impossible de journaliser la vérification : aucun code_id de défi n'est disponible.");
                }
            }
                const feedbackData = buildFeedbackModalContent(results);
                const feedbackContentElement = document.getElementById('feedback-modal-content');
                if (feedbackContentElement) {
                    feedbackContentElement.innerHTML = feedbackData.content;
                }
                feedbackModal.show();
            } else {
                console.error("Les fonctions de validation ou le modal ne sont pas définis. Assurez-vous que validation.js est chargé avant main.js.");
            }
        });
    }

    if (showSolutionButton) {
        showSolutionButton.addEventListener('click', function() {
            console.log("Bouton 'Révéler la solution' cliqué.");

            // CORRECTION : On utilise l'ID du défi en cours.
            if (typeof logRevealSolution === 'function') {
                if (currentChallengeCodeId) {
                    logRevealSolution(currentChallengeCodeId);
                } else {
                    console.warn("Impossible de journaliser la révélation : aucun code_id de défi n'est disponible.");
                }
            }

            if (typeof revealCorrectSolution === 'function') {
                revealCorrectSolution(variableValuesFromExecution);
            } else {
                console.warn("La fonction revealCorrectSolution n'est pas définie.");
            }
        });
    }

    const clearConsoleBtn = document.getElementById('clear-console-btn');
    if (clearConsoleBtn) {
        clearConsoleBtn.addEventListener('click', clearConsole);
    }
    
    const consoleHeader = document.getElementById('execution-console-header');
    const consoleBody = document.getElementById('execution-console-body');
    if (consoleHeader && consoleBody) {
        consoleHeader.addEventListener('click', function(e) {
            if (e.target.closest('#clear-console-btn')) return;
            if (consoleBody.style.display === "none") {
                consoleBody.style.display = "";
            } else {
                consoleBody.style.display = "none";
            }
        });
    }

    const clearTurtleBtn = document.getElementById('clear-turtle-canvas-btn');
    if (clearTurtleBtn) {
        clearTurtleBtn.addEventListener('click', () => {
            const canvas = document.getElementById('turtle-canvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        });
    }

    // --- Initialisation sécurisée à la fin ---
    initializeDynamicSyntaxOptions();
    updateGlobalConfigSelectors();
    handleVisualInterdependencies();
    initializeUI();
});