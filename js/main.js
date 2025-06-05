// js/main.js
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
    { id: 'builtin-print', label: 'print()' }, { id: 'builtin-input', label: 'input()' },
    { id: 'builtin-len', label: 'len()' }
];
const BUILTINS_ADVANCED = [
    { id: 'builtin-chr', label: 'chr()' }, { id: 'builtin-ord', label: 'ord()' },
    { id: 'builtin-min', label: 'min()' }, { id: 'builtin-max', label: 'max()' },
    { id: 'builtin-sum', label: 'sum()' }
];

var codeEditorInstance;

document.addEventListener('DOMContentLoaded', function() {
    codeEditorInstance = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
        mode: 'python', theme: 'dracula', lineNumbers: true, indentUnit: 4,
        tabSize: 4, indentWithTabs: false, lineWrapping: true, readOnly: false
    });
    let variableValuesFromExecution = {};

    // --- Éléments DOM Globaux pour la Configuration ---
    const difficultyGlobalSelect = document.getElementById('difficulty-level-global');
    const numLinesGlobalSelect = document.getElementById('num-lines-global');
    const numTotalVariablesGlobalSelect = document.getElementById('num-total-variables-global');
    const advancedModeCheckbox = document.getElementById('advanced-mode');

    // --- HTML Templates pour les options de syntaxe de BASE ---
    // Ces templates sont utilisés pour injecter les options de base lorsque les cadres sont activés.
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
            <div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="func-def-a"><label class="form-check-label small" for="func-def-a">def f(a)</label></div>
            <div class="form-check form-check-inline" id="func-builtins-main-container"></div>
            <div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="func-return"><label class="form-check-label small" for="func-return">return</label></div>
        </div>`;

    // --- Fonctions Utilitaires ---
    function populateSelectWithOptions(selectElement, min, max, currentSelectedVal) {
        if (!selectElement) return;
        const previousValue = parseInt(selectElement.value);
        selectElement.innerHTML = '';
        for (let i = min; i <= max; i++) {
            const option = new Option(i, i); // text, value
            selectElement.add(option);
        }
        if (!isNaN(currentSelectedVal) && currentSelectedVal >= min && currentSelectedVal <= max) {
            selectElement.value = currentSelectedVal;
        } else if (!isNaN(previousValue) && previousValue >= min && previousValue <= max) {
            selectElement.value = previousValue;
        } else {
            selectElement.value = min;
        }
    }

    // --- Initialisation et gestion des options de syntaxe dynamiques (Ctrl, Loop, Func) ---
    function initializeDynamicSyntaxOptions() {
        console.log("Initialisation des options dynamiques des cadres de syntaxe...");
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
    
    // Configuration spécifique après injection des options de fonctions (pour builtins)
    function setupFunctionOptionsExtras(funcOptionsContainer) {
        if (!funcOptionsContainer) return;
        const builtinsMainContainer = funcOptionsContainer.querySelector('#func-builtins-main-container');
        if (builtinsMainContainer) {
            createBuiltinsMainCheckbox(builtinsMainContainer);
        }
    }
    
    initializeDynamicSyntaxOptions(); // Appel PRINCIPAL pour initialiser Ctrl, Loop, Func

    // --- Gestion des sélecteurs de nombre de variables par type ---
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
                checkbox.removeEventListener('change', updateVarCountSelectVisibility); // Eviter doublons
                checkbox.addEventListener('change', updateVarCountSelectVisibility);
                updateVarCountSelectVisibility(); // Etat initial
            }
        }
    });

    // --- Logique de parenté pour les options de Conditions (Ctrl) ---
    function setupConditionalParenting(container) {
        if (!container) return;
        const ifSimple = container.querySelector('#cond-if'); const ifElse = container.querySelector('#cond-if-else');
        const ifElif = container.querySelector('#cond-if-elif'); const ifElifElse = container.querySelector('#cond-if-elif-else');
        const allCtrlOptions = [ifSimple, ifElse, ifElif, ifElifElse];

        allCtrlOptions.forEach(opt => { // Ajouter listener générique pour updateGlobalConfig
            if(opt) opt.addEventListener('change', () => {
                setTimeout(updateGlobalConfigSelectors,0); // setTimeout pour ordre d'execution
                setTimeout(handleVisualInterdependencies,0);
            });
        });

        [ifElse, ifElif, ifElifElse].forEach(child => {
            if (child) child.addEventListener('change', () => { if (child.checked) { if (ifSimple) ifSimple.checked = true; if (child === ifElifElse && ifElif) ifElif.checked = true; }});
        });
        if (ifSimple) ifSimple.addEventListener('change', () => { if (!ifSimple.checked) { if (ifElse) ifElse.checked = false; if (ifElif) ifElif.checked = false; if (ifElifElse) ifElifElse.checked = false; }});
        if (ifElif) ifElif.addEventListener('change', () => { if (!ifElif.checked) { if (ifElifElse) ifElifElse.checked = false; }});
    }

    // --- Gestion spécifique des options de Builtins ---
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

    // --- Gestionnaire pour le "Mode avancé" ---
    if (advancedModeCheckbox) {
        advancedModeCheckbox.addEventListener('change', function() {
            const isAdvanced = this.checked;
            addAdvancedOperationOptionsIfNeeded(isAdvanced);
            const condContainer = document.querySelector('#conditions-options-container > .d-flex.flex-column.gap-1'); if (condContainer) addAdvancedConditionOptionsIfNeeded(condContainer, isAdvanced);
            const loopContainer = document.querySelector('#loops-options-container > .d-flex.flex-column.gap-1'); if (loopContainer) addAdvancedLoopOptionsIfNeeded(loopContainer, isAdvanced);
            const funcBaseOptsContainer = document.querySelector('#functions-options-container > .d-flex.flex-column.gap-1'); if (funcBaseOptsContainer) addAdvancedFunctionOptionsIfNeeded(funcBaseOptsContainer, isAdvanced); // Gère les options avancées de func HORS builtins
            const funcBuiltinsCheckbox = document.getElementById('func-builtins'); const builtinsOptionsWrapper = document.getElementById('func-builtins-options-wrapper');
            if (funcBuiltinsCheckbox && funcBuiltinsCheckbox.checked && builtinsOptionsWrapper) populateBuiltinOptionsColumns(builtinsOptionsWrapper); // Repeuple les builtins
            updateGlobalConfigSelectors(); handleVisualInterdependencies();
        });
    }

    // --- Fonctions pour ajouter/supprimer les options AVANCÉES ---

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
    // addAdvancedFunctionOptionsIfNeeded ne doit plus s'occuper de la checkbox builtins elle-même,
    // mais des autres options avancées de fonctions.
    function addAdvancedFunctionOptionsIfNeeded(container, isAdvancedModeActiveOverride = null) {
        if (!container) return;
        const isAdvanced = isAdvancedModeActiveOverride !== null ? isAdvancedModeActiveOverride :
                           (document.getElementById('advanced-mode') ? document.getElementById('advanced-mode').checked : false);
        // Les options avancées de fonction (hors builtins, qui sont gérés par populateBuiltinOptionsColumns)
        const advancedFunctionOptions = [
            { id: 'func-def-ab', label: 'def f(a,b)' },
            { id: 'func-op-list', label: 'opList' },
            { id: 'func-op-str', label: 'opStr' }
        ];
        advancedFunctionOptions.forEach(opt => {
            let existingOption = container.querySelector(`#${opt.id}`);
            if (isAdvanced) {
                if (!existingOption) {
                    // Injecter avant le conteneur de la checkbox builtins si possible, ou à la fin.
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
     * Calcule les minimums pour lignes/variables 
     * RETIRÉ : LE score de difficulté conceptuelle.
     * @returns {object} { minLines: number, minVariables: number}
     */
     /**
     * Calcule les totaux de variables, lignes et score de difficulté.
     * Cette fonction sera appelée pour mettre à jour les sélecteurs globaux.
     */
    function calculateGlobalRequirements() {
        let minTotalLines = MIN_POSSIBLE_CODE_LINES;
        let minTotalVariables = 0; // Commence à 0, car on compte explicitement
        let conceptualDifficultyScore = 0; // heuristique un peu bidon... à revoir
        // Score de difficulté *conceptuelle* ?? basé sur les options sélectionnées

        const getChecked = (id) => document.getElementById(id) ? document.getElementById(id).checked : false;
        // prendre le type et utiliser VAR_COUNT_LIMITS si le sélecteur n'est pas là ou non visible
        const getVarCount = (type) => {
            const checkbox = document.getElementById(`var-${type}`);
            const select = document.getElementById(`var-${type}-count`);
            if (checkbox && checkbox.checked && select && select.style.display !== 'none') {
                return parseInt(select.value);
            }
            return 0; // Retourne 0 si la checkbox de type n'est pas cochée ou le select masqué
        };

        // 1. Variables par type
        let varCounts = {
            int: getVarCount('int'),
            float: getVarCount('float'),
            str: getVarCount('str'),
            list: getVarCount('list'),
            bool: getVarCount('bool'),
        };
        
        let explicitVarDeclarations = 0;
        if (varCounts.int > 0) { explicitVarDeclarations += varCounts.int; conceptualDifficultyScore += 0; } // int est basique
        if (varCounts.float > 0) { explicitVarDeclarations += varCounts.float; conceptualDifficultyScore += varCounts.float * 1; }
        if (varCounts.str > 0) { explicitVarDeclarations += varCounts.str; conceptualDifficultyScore += varCounts.str * 2; }
        if (varCounts.list > 0) { explicitVarDeclarations += varCounts.list; conceptualDifficultyScore += varCounts.list * 3; }
        if (varCounts.bool > 0) { explicitVarDeclarations += varCounts.bool; conceptualDifficultyScore += varCounts.bool * 1; }
        
        minTotalVariables = Math.max(MIN_POSSIBLE_TOTAL_VARIABLES_GLOBAL, explicitVarDeclarations);
        minTotalLines = Math.max(minTotalLines, explicitVarDeclarations); // 1 ligne par déclaration

        // 2. Opérations
        if (getChecked('op-mult-div-pow') || getChecked('op-modulo-floor')) { minTotalLines +=1; conceptualDifficultyScore += 2; if(minTotalVariables < 2 && explicitVarDeclarations < 2) minTotalVariables = Math.max(minTotalVariables, 2); }
        if (getChecked('op-and') || getChecked('op-or')) { minTotalLines +=1; conceptualDifficultyScore += 3; if(minTotalVariables < 2 && explicitVarDeclarations < 2) minTotalVariables = Math.max(minTotalVariables, 2); }
        if (getChecked('op-not')) { minTotalLines +=1; conceptualDifficultyScore += 2; if(minTotalVariables < 1 && explicitVarDeclarations < 1) minTotalVariables = Math.max(minTotalVariables, 1); }
        if (getChecked('op-slice-ab') || getChecked('op-slice-abs')) {
            conceptualDifficultyScore += 4;
            if (varCounts.str > 0 || varCounts.list > 0) minTotalLines +=1;
            else { minTotalLines +=2; if(minTotalVariables < 1 && explicitVarDeclarations < 1) minTotalVariables = Math.max(minTotalVariables, 1); }
        }

        // 3. Conditions (Ctrl)
        let baseCondLines = 0; let condImpact = 0;
        if (getChecked('cond-if')) { baseCondLines = 2; condImpact = 2;}
        if (getChecked('cond-if-else')) { baseCondLines = Math.max(baseCondLines, 4); condImpact = Math.max(condImpact, 3);}
        if (getChecked('cond-if-elif')) { baseCondLines = Math.max(baseCondLines, 4); condImpact = Math.max(condImpact, 4);}
        if (getChecked('cond-if-elif-else')) { baseCondLines = Math.max(baseCondLines, 6); condImpact = Math.max(condImpact, 5);}
        
        if (baseCondLines > 0) {
            conceptualDifficultyScore += condImpact;
            minTotalLines += baseCondLines;
            if (minTotalVariables < 1 && explicitVarDeclarations < 1) minTotalVariables = Math.max(minTotalVariables, 1);
            if (getChecked('cond-if-if')) { minTotalLines += baseCondLines; conceptualDifficultyScore += 5; if(minTotalVariables < 2 && explicitVarDeclarations < 2) minTotalVariables = Math.max(minTotalVariables, 2);}
            if (getChecked('cond-if-if-if')) { minTotalLines += baseCondLines * 2; conceptualDifficultyScore += 8; if(minTotalVariables < 3 && explicitVarDeclarations < 3) minTotalVariables = Math.max(minTotalVariables, 3);}
        }

        // 4. Boucles (Loop) - Adapter la logique comme pour les conditions
        let loopSpecificVars = 0; // Variables spécifiquement pour les boucles (itération, bornes)
        if (getChecked('loop-for-range')) { loopSpecificVars = Math.max(loopSpecificVars, 1); /* i */ }
        if (getChecked('loop-range-ab')) { loopSpecificVars = Math.max(loopSpecificVars, 2); /* a, b (si pas déjà des vars) */ }
        if (getChecked('loop-range-abs')) { loopSpecificVars = Math.max(loopSpecificVars, 3); /* a, b, s */ }
        // Les variables de for sur list/str sont souvent la variable d'itération.
        // La liste/str elle-même est comptée dans varCounts.
        
        // On n'ajoute loopSpecificVars à minTotalVariables que si elles ne sont pas déjà couvertes par explicitVarDeclarations.
        // C'est compliqué... pour l'instant, on s'assure juste que minTotalVariables est assez grand.
        if (getChecked('frame-loops')) {
            minTotalVariables = Math.max(minTotalVariables, loopSpecificVars);
        }
        // ... (reprendre la logique de calcul de minTotalLines et conceptualDifficultyScore pour les boucles)

        let baseLoopLines = 0; let loopVarCount = 0; let loopImpact = 0;
        if (getChecked('loop-for-range')) { baseLoopLines=2; loopVarCount=1; loopImpact=3;}
        if (getChecked('loop-for-list') || getChecked('loop-for-str')) { baseLoopLines=Math.max(baseLoopLines,2); loopVarCount=Math.max(loopVarCount,1); loopImpact=Math.max(loopImpact,4);}
        if (getChecked('loop-while')) { baseLoopLines=Math.max(baseLoopLines,2); loopVarCount=Math.max(loopVarCount,1); loopImpact=Math.max(loopImpact,5);}

        if (baseLoopLines > 0) {
            minTotalLines += baseLoopLines;
            minTotalVariables = Math.max(minTotalVariables, loopVarCount); // Les variables de boucle s'ajoutent si nécessaire
            conceptualDifficultyScore += loopImpact;
            if (getChecked('loop-nested-for2')) { minTotalLines +=2; minTotalVariables = Math.max(minTotalVariables, loopVarCount+1); conceptualDifficultyScore += 6;}
            if (getChecked('loop-nested-for3')) { minTotalLines +=4; minTotalVariables = Math.max(minTotalVariables, loopVarCount+2); conceptualDifficultyScore += 9;}
        }
        if (getChecked('loop-range-ab')) { conceptualDifficultyScore += 2; minTotalVariables = Math.max(minTotalVariables, 2); } // a, b
        if (getChecked('loop-range-abs')) { conceptualDifficultyScore += 3; minTotalVariables = Math.max(minTotalVariables, 3); } // a, b, s
        if (getChecked('loop-while-op')) { conceptualDifficultyScore += 1; if(minTotalVariables < 2 && explicitVarDeclarations < 2) minTotalVariables = Math.max(minTotalVariables, 2);}


        // 5. Fonctions (Func)
        if (getChecked('frame-functions')) {
            minTotalLines += 2; // def f(): pass
            conceptualDifficultyScore += 5;
            let funcParams = 0;
            if (getChecked('func-def-a')) funcParams = 1;
            if (getChecked('func-def-ab')) funcParams = Math.max(funcParams, 2);
            minTotalVariables = Math.max(minTotalVariables, funcParams);
            
            if (getChecked('func-return')) { minTotalLines +=1; conceptualDifficultyScore += 2; }
            if (getChecked('func-builtins')) { minTotalLines +=1; conceptualDifficultyScore += 1; }
            if (getChecked('func-op-list')) { minTotalLines +=1; conceptualDifficultyScore += 3; if (varCounts.list === 0 && explicitVarDeclarations < 1) minTotalVariables = Math.max(minTotalVariables, 1);}
            if (getChecked('func-op-str')) { minTotalLines +=1; conceptualDifficultyScore += 3; if (varCounts.str === 0 && explicitVarDeclarations < 1) minTotalVariables = Math.max(minTotalVariables, 1);}
            // Prise en compte des builtins sélectionnés
            if (getChecked('func-builtins')) {
                conceptualDifficultyScore += 1; // Le fait d'utiliser des builtins ajoute un peu
                let builtinsSelectedCount = 0;
                BUILTINS_BASE.forEach(b => { if (getChecked(b.id)) builtinsSelectedCount++; });
                if (advancedModeCheckbox.checked) {
                    BUILTINS_ADVANCED.forEach(b => { if (getChecked(b.id)) builtinsSelectedCount++; });
                }
                if (builtinsSelectedCount > 0) {
                    minTotalLines += builtinsSelectedCount; // 1 ligne par appel de builtin (approximatif)
                    conceptualDifficultyScore += builtinsSelectedCount * 0.5; // Chaque builtin ajoute un peu de complexité
                }
            }
            minTotalLines +=1; // Appel de la fonction
        }

        // --- Calcul final du niveau de difficulté global (1-6) ---
        let calculatedDifficultyLevel = 1;
        if (conceptualDifficultyScore > 0) {
            // Échelle de mapping : ARBITRAIRE
            // 0-5 pts -> niv 1, 6-10 -> niv 2, 11-15 -> niv 3, 16-22 -> niv 4, 23-30 -> niv 5, >30 -> niv 6
            if (conceptualDifficultyScore <= 5) calculatedDifficultyLevel = 1;
            else if (conceptualDifficultyScore <= 10) calculatedDifficultyLevel = 2;
            else if (conceptualDifficultyScore <= 18) calculatedDifficultyLevel = 3;
            else if (conceptualDifficultyScore <= 28) calculatedDifficultyLevel = 4;
            else if (conceptualDifficultyScore <= 40) calculatedDifficultyLevel = 5;
            else calculatedDifficultyLevel = 6;
        }
        // Synchroniser le sélecteur de difficulté global avec le niveau calculé
        if (difficultyGlobalSelect) difficultyGlobalSelect.value = calculatedDifficultyLevel;


        // Application des bornes globales pour lignes et total de variables
        minTotalLines = Math.min(Math.max(minTotalLines, MIN_POSSIBLE_CODE_LINES), MAX_CODE_LINES);
        minTotalVariables = Math.min(Math.max(minTotalVariables, MIN_POSSIBLE_TOTAL_VARIABLES_GLOBAL), MAX_TOTAL_VARIABLES_GLOBAL);
        
        // console.log(`GLOBAL REQS - Lines: ${minTotalLines}, Total Vars: ${minTotalVariables}, Conceptual Score: ${conceptualDifficultyScore}, Calc Diff: ${calculatedDifficultyLevel}`);
        return { minLines: minTotalLines, minVariables: minTotalVariables };
    }


     /**
     * Met à jour les options des menus déroulants pour "Longueur du Code" et "Nombre de variables"
     * en fonction des minimums calculés.
     */
    function updateGlobalConfigSelectors() {
        const { minLines, minVariables } = calculateGlobalRequirements();
        
        const currentNumLinesVal = numLinesGlobalSelect ? parseInt(numLinesGlobalSelect.value) : minLines;
        const currentNumTotalVariablesVal = numTotalVariablesGlobalSelect ? parseInt(numTotalVariablesGlobalSelect.value) : minVariables;

        populateSelectWithOptions(numLinesGlobalSelect, minLines, MAX_CODE_LINES, currentNumLinesVal);
        populateSelectWithOptions(numTotalVariablesGlobalSelect, minVariables, MAX_TOTAL_VARIABLES_GLOBAL, currentNumTotalVariablesVal);
        // console.log("Sélecteurs de configuration globale (Longueur, Nb Total Vars) mis à jour.");
    }

    // --- Attachement des listeners 
    // pour la mise à jour des sélecteurs globaux ET interdépendances ---
    // Le listener sur syntaxConfigArea et advancedModeCheckbox appellera déjà updateGlobalConfigSelectors
    // et handleVisualInterdependencies avec un setTimeout.
    // Délégation pour toutes les checkboxes de syntaxe (base et avancées)
    const syntaxConfigArea = document.querySelector('.card-body .row.g-2.flex-wrap.align-items-start');
    if (syntaxConfigArea) {
        syntaxConfigArea.addEventListener('change', function(event) {
            if (event.target.type === 'checkbox' || event.target.classList.contains('var-count-select')) {
                setTimeout(updateGlobalConfigSelectors, 50); // Délai pour le DOM
                // Gérer les interdépendances visuelles après chaque changement de syntaxe
                setTimeout(handleVisualInterdependencies, 60); // Léger décalage
            }
        });
    }
    // Le listener pour advancedModeCheckbox est déjà configuré pour appeler updateGlobalConfigSelectors
    // et handleVisualInterdependencies via son propre setTimeout.
    // On s'assure juste que handleVisualInterdependencies est aussi appelé.
    // // Listener direct pour le mode avancé car il affecte ce qui est disponible pour le calcul
    if (advancedModeCheckbox) { // advancedModeCheckbox est déjà défini plus haut
        advancedModeCheckbox.addEventListener('change', () => {
            // updateGlobalConfigSelectors est déjà appelé par le listener du mode avancé dans la section précédente
            // On ajoute juste l'appel pour les interdépendances ici aussi, après que les options avancées soient (dés)injectées
            setTimeout(handleVisualInterdependencies, 150); // Un délai un peu plus long pour être sûr
        });
    }
    // Le listener pour difficultyGlobalSelect N'EST PLUS NÉCESSAIRE ici pour appeler updateGlobalConfigSelectors,
    // car la difficulté est maintenant un résultat du calcul. Si l'utilisateur la change, 
    // c'est une entrée pour la génération, pas pour recalculer les autres min/max.

    // Appel initial pour les interdépendances et la configuration globale
    updateGlobalConfigSelectors();
    handleVisualInterdependencies(); // Appel initial pour les interdépendances

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


    // --- Gestionnaire pour "Générer un Code Aléatoire" ---
    const generateCodeButton = document.getElementById('generate-code-btn');
    if (generateCodeButton) {
        generateCodeButton.addEventListener('click', function() {
            //console.log("Bouton 'Générer un Code Aléatoire' cliqué.");
            const getChecked = (id) => document.getElementById(id) ? document.getElementById(id).checked : false;
            const getSelectVal = (id, defaultValIfNotFound = 0, typeIfVarCount = null) => {
                const sel = document.getElementById(id);
                if (typeIfVarCount) { // C'est un var-count-select
                    const typeCheckbox = document.getElementById(`var-${typeIfVarCount}`);
                    if (!typeCheckbox || !typeCheckbox.checked || !sel || sel.style.display === 'none') {
                        return 0; // Si le type n'est pas coché ou select masqué, compte pour 0
                    }
                }
                return sel ? parseInt(sel.value) : defaultValIfNotFound;
            };
            const generationOptions = {
                // Variables et leur nombre
                var_int_count: getSelectVal('var-int-count', 0, 'int'), // Nouveau
                var_float_count: getSelectVal('var-float-count', 0, 'float'),
                var_str_count: getSelectVal('var-str-count', 0, 'str'),
                var_list_count: getSelectVal('var-list-count', 0, 'list'),
                var_bool_count: getSelectVal('var-bool-count', 0, 'bool'),

                // Opérations
                op_plus_minus: getChecked('op-plus-minus'), // Toujours true car disabled
                op_mult_div_pow: getChecked('op-mult-div-pow'), 
                op_modulo_floor: getChecked('op-modulo-floor'),
                op_and: getChecked('op-and'), 
                op_or: getChecked('op-or'), 
                op_not: getChecked('op-not'),
                op_slice_ab: getChecked('op-slice-ab'), 
                op_slice_abs: getChecked('op-slice-abs'),

                // Conditions (Ctrl)
                main_conditions: getChecked('frame-conditions'),
                cond_if: getChecked('cond-if'), 
                cond_if_else: getChecked('cond-if-else'),
                cond_if_elif: getChecked('cond-if-elif'), 
                cond_if_elif_else: getChecked('cond-if-elif-else'),
                cond_if_if: getChecked('cond-if-if'), 
                cond_if_if_if: getChecked('cond-if-if-if'),

                // Boucles (Loop)
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

                // Fonctions (Func)
                main_functions: getChecked('frame-functions'),
                func_def_a: getChecked('func-def-a'),
                // func_builtins: getChecked('func-builtins'), // La case principale builtins
                // Builtins spécifiques (seront false si #func-builtins n'est pas cochée car ils ne seront pas dans le DOM)
                builtin_print: getChecked('builtin-print'),
                builtin_input: getChecked('builtin-input'),
                builtin_len: getChecked('builtin-len'),
                builtin_chr: getChecked('builtin-chr'),   // Avancé
                builtin_ord: getChecked('builtin-ord'),   // Avancé
                builtin_min: getChecked('builtin-min'),   // Avancé
                builtin_max: getChecked('builtin-max'),   // Avancé
                builtin_sum: getChecked('builtin-sum'),   // Avancé
                
                func_return: getChecked('func-return'),
                func_def_ab: getChecked('func-def-ab'),     // Avancé
                func_op_list: getChecked('func-op-list'),   // Avancé
                func_op_str: getChecked('func-op-str'),     // Avancé
                
                // Paramètres globaux
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
            if(codeEditorInstance) codeEditorInstance.setValue(newGeneratedCode);
            var flowchartDisplayArea = document.getElementById('flowchart');
            if (flowchartDisplayArea) flowchartDisplayArea.innerHTML = '<p class="text-center text-muted mt-3">Nouveau code généré. Cliquez sur "Lancer..."</p>';
            resetChallengeInputs();
            const checkBtn = document.getElementById('check-answers-btn');
            const showSolBtn = document.getElementById('show-solution-btn');
            if(checkBtn) checkBtn.disabled = true;
            if(showSolBtn) showSolBtn.disabled = true;
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
                // contentHtml += `Attendu : <code>${result.correctAnswer}</code>.`;
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
            //correctAnswer: correctAnswerAsString, 
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