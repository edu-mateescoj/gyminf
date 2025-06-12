// js/code-generator.js

/**
 * Génère du code Python aléatoire basé sur un ensemble d'options détaillées.
 * @param {object} options - Les options sélectionnées par l'utilisateur depuis l'interface.
 * @returns {string} Le code Python généré.
 */
function generateRandomPythonCode(options) {
    console.log("Début de generateRandomPythonCode avec options :", JSON.parse(JSON.stringify(options))); // Log profond des options

    // --- Constantes et Aides ---
    const VAR_NAMES_POOL = ['x', 'y', 'z', 'a', 'b', 'c', 'val', 'res', 'temp', 'i', 'j', 'k', 'item', 'count', 'total', 'data', 'text', 'flag', 'num', 'idx'];
    
    // Fonctions pour générer des littéraux (vos fonctions)
    function generateStringLiteral() {
        const words = ["alpha", "beta", "gamma", "delta", "omega", "sigma", "kappa"]; // Liste un peu différente pour varier
        return `"${getRandomItem(words)}"`;
    }
    function generateListLiteral(itemType = 'int', difficulty = 3) { // itemType peut être 'int', 'str', 'bool'
        const size = getRandomInt(2, Math.min(5, 2 + difficulty)); // Taille de liste dépend un peu de la difficulté
        const items = [];
        for (let i = 0; i < size; i++) {
            if (itemType === 'int') {
                items.push(getRandomInt(-valueRange, valueRange));
            } else if (itemType === 'str') {
                items.push(generateStringLiteral()); // Peut devenir `'"hello"'` donc attention à l'usage
            } else if (itemType === 'bool') {
                items.push(getRandomItem(BOOL_LITERALS));
            } else { // Par défaut int
                items.push(getRandomInt(-valueRange, valueRange));
            }
        }
        if (itemType === 'str') { // Les chaînes dans une liste ne doivent pas avoir de guillemets doubles internes si la liste utilise des guillemets simples
             return `[${items.map(s => s.replace(/^"|"$/g, "'")).join(', ')}]`; // Remplace " par ' pour les éléments str
        }
        return `[${items.join(', ')}]`;
    }

    const BOOL_LITERALS = ["True", "False"];

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    function getRandomItem(arr) {
        if (!arr || arr.length === 0) return null;
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // --- Initialisation du Contexte de Génération ---
    let codeLines = [];
    let indentLevel = 0;
    let availableVariables = { int: [], float: [], str: [], list: [], bool: [] };
    let allDeclaredVarNames = new Set();
    let nextVarIndexPool = getRandomInt(0, VAR_NAMES_POOL.length); // Index pour piocher dans VAR_NAMES_POOL

    function getNewVarName() {
        let name;
        let attempts = 0;
        do {
            name = VAR_NAMES_POOL[nextVarIndexPool % VAR_NAMES_POOL.length]; 
            if (nextVarIndexPool >= VAR_NAMES_POOL.length) {
                name += Math.floor(nextVarIndexPool / VAR_NAMES_POOL.length);
            }
            nextVarIndexPool = (nextVarIndexPool + 1) % (VAR_NAMES_POOL.length); // tourner dans le pool
            if (nextVarIndexPool === 0) nextVarIndexPool = getRandomInt(0, VAR_NAMES_POOL.length); // Réinitialiser si on a fait un tour complet

            attempts++;

        } while (allDeclaredVarNames.has(name) && attempts < VAR_NAMES_POOL.length * 3); // Limite pour éviter boucle infinie
        
        if (allDeclaredVarNames.has(name)) { // Si toujours en conflit, générer un nom vraiment unique
            name = `var_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        }
        allDeclaredVarNames.add(name);
        return name;
    }
    
    const difficulty = options.difficultyLevelGlobal || 3;
    const valueRange = difficulty <= 2 ? 5 : (difficulty <= 4 ? 10 : 30); // Plage ajustée

    // --- 1. Initialisation des Variables ---
    console.log("Phase 1: Initialisation des variables");
    let varsToDeclareByType = [
        { type: 'int', count: options.var_int_count || 0 },
        { type: 'float', count: options.var_float_count || 0 },
        { type: 'str', count: options.var_str_count || 0 },
        { type: 'list', count: options.var_list_count || 0 },
        { type: 'bool', count: options.var_bool_count || 0 },
    ];

    // Utilisation d'une boucle for...of pour pouvoir utiliser break sur la boucle externe
    for (const varTypeInfo of varsToDeclareByType) {
        for (let i = 0; i < varTypeInfo.count; i++) {
            if (allDeclaredVarNames.size >= options.numTotalVariablesGlobal) {
                console.log("Limite de variables totales atteinte pendant la déclaration par type.");
                break; // Sort de la boucle for (let i...)
            }
            const varName = getNewVarName();
            let initialValue; // Nom de variable corrigé
            switch (varTypeInfo.type) {
                case 'int':
                    initialValue = getRandomInt(-valueRange, valueRange);
                    availableVariables.int.push(varName);
                    break;
                case 'float':
                    initialValue = parseFloat((getRandomInt(-valueRange, valueRange) + Math.random() - 0.5).toFixed(2));
                    availableVariables.float.push(varName);
                    break;
                case 'str':
                    initialValue = generateStringLiteral();
                    availableVariables.str.push(varName);
                    break;
                case 'list':
                    // Choisir un type d'item pour la liste, peut-être basé sur d'autres options
                    let listItemType = 'int';
                    if (options.var_str_count > 0 && Math.random() < 0.3) listItemType = 'str';
                    else if (options.var_bool_count > 0 && Math.random() < 0.2) listItemType = 'bool';
                    initialValue = generateListLiteral(listItemType, difficulty);
                    availableVariables.list.push(varName);
                    break;
                case 'bool':
                    initialValue = getRandomItem(BOOL_LITERALS);
                    availableVariables.bool.push(varName);
                    break;
            }
            if (initialValue !== undefined) {
                codeLines.push(`${"    ".repeat(indentLevel)}${varName} = ${initialValue}`);
            }
        }
        // Vérifier si on doit sortir de la boucle externe aussi
        if (allDeclaredVarNames.size >= options.numTotalVariablesGlobal) {
            console.log("Limite de variables totales atteinte, sortie de la boucle de déclaration des types.");
            break; // Sort de la boucle for (const varTypeInfo...)
        }
    }
    
    // Compléter avec des 'int' si le total n'est pas atteint et que 'int' est implicitement possible
    if (options.var_int_count === 0 && varsToDeclareByType.find(v => v.type === 'int').count === 0) {
        // Si var_int_count n'était pas une option explicite mais qu'on veut quand même des int par défaut
        // ou si on n'a pas d'option var_int_count et qu'on veut quand même des int.
        // Pour l'instant, on se base sur le fait que var_int_count existe.
    }

    while (allDeclaredVarNames.size < options.numTotalVariablesGlobal && 
           allDeclaredVarNames.size < MAX_TOTAL_VARIABLES_GLOBAL &&
           codeLines.length < options.numLinesGlobal) { // Ajout condition sur les lignes
        const varName = getNewVarName();
        const value = getRandomInt(-valueRange, valueRange);
        codeLines.push(`${"    ".repeat(indentLevel)}${varName} = ${value}`);
        availableVariables.int.push(varName);
    }
    console.log(`Après init vars: ${codeLines.length} lignes, ${allDeclaredVarNames.size} variables.`);
    console.log("Variables disponibles:", JSON.parse(JSON.stringify(availableVariables)));


    // --- 2. Génération du Corps du Code ---
    console.log("Phase 2: Génération du corps du code");
    let linesGeneratedSoFar = codeLines.length;
    const targetLines = options.numLinesGlobal;

    function getAvailableVar(types = ['int', 'float', 'str', 'list', 'bool'], canBeLiteral = false, literalType = 'int') {
        const possibleVars = [];
        types.forEach(type => {
            if (availableVariables[type] && availableVariables[type].length > 0) {
                possibleVars.push(...availableVariables[type]); // Spread syntax can be used when all elements from an object or array need to be included in a new array or object, or should be applied one-by-one in a function call's arguments list.
                // Ajouter les variables de ce type
            }
        });

        if (canBeLiteral && (possibleVars.length === 0 || Math.random() < 0.3 / difficulty)) { // Moins de littéraux si difficulté faible
            if (literalType === 'int') return getRandomInt(0, valueRange);
            if (literalType === 'float') return parseFloat((getRandomInt(0, valueRange) + Math.random() - 0.5).toFixed(2));
            if (literalType === 'str') return generateStringLiteral();
            if (literalType === 'bool') return getRandomItem(BOOL_LITERALS);
        }
        if (possibleVars.length > 0) return getRandomItem(possibleVars);
        const allVars = Object.values(availableVariables).flat();
        if (allVars.length > 0) return getRandomItem(allVars);
        // Si aucune variable du tout, retourner un littéral par défaut
        if (literalType === 'int') return getRandomInt(0, 10);
        return "None"; // Fallback ultime
    }
    
    // --- Fonctions (si activées) ---
    let functionName = null;
    let functionParams = [];
    if (options.main_functions && linesGeneratedSoFar < targetLines) {
        if (options.func_def_ab && allDeclaredVarNames.size <= MAX_TOTAL_VARIABLES_GLOBAL - 2) {
            functionParams = [getNewVarName(), getNewVarName()];
        } else if (options.func_def_a && allDeclaredVarNames.size <= MAX_TOTAL_VARIABLES_GLOBAL - 1) {
            functionParams = [getNewVarName()];
        }
        
        if (functionParams.length > 0) { // Seulement si on a pu créer des paramètres
            functionName = "calcul"; // Nom de fonction simple
            codeLines.push(`${"    ".repeat(indentLevel)}def ${functionName}(${functionParams.join(', ')}):`);
            // Ajouter les paramètres aux variables disponibles DANS LE SCOPE de la fonction (non géré ici, simplifions)
            // Pour l'instant, on ne les ajoute pas à availableVariables globales.
            indentLevel++;
            let funcBodyLines = 0;

            // Builtins dans la fonction
            if (options.builtin_print && linesGeneratedSoFar + funcBodyLines < targetLines) {
                const printableVar = getRandomItem(functionParams) || getAvailableVar(['int', 'float', 'str', 'bool'], true, 'str');
                codeLines.push(`${"    ".repeat(indentLevel)}print(${printableVar})`); funcBodyLines++;
            }
            if (options.builtin_input && linesGeneratedSoFar + funcBodyLines < targetLines && allDeclaredVarNames.size < MAX_TOTAL_VARIABLES_GLOBAL) {
                const inputVar = getNewVarName(); availableVariables.str.push(inputVar); // input() retourne str
                codeLines.push(`${"    ".repeat(indentLevel)}${inputVar} = input("Valeur: ")`); funcBodyLines++;
            }
            if (options.builtin_len && linesGeneratedSoFar + funcBodyLines < targetLines) {
                const lenVar = getRandomItem(functionParams.filter(p => typeof p === 'string')) || getAvailableVar(['str', 'list'], true, 'str');
                if (lenVar && (typeof lenVar === 'string' || Array.isArray(eval(lenVar.toString())))) { // eval est risqué, à améliorer
                    const lenResultVar = getNewVarName(); availableVariables.int.push(lenResultVar);
                    codeLines.push(`${"    ".repeat(indentLevel)}${lenResultVar} = len(${lenVar})`); funcBodyLines++;
                }
            }
            // TODO: Ajouter les autres builtins (chr, ord, min, max, sum)
            // Pour min, max, sum, il faudrait une liste de nombres comme argument.

            if (options.func_return && linesGeneratedSoFar + funcBodyLines < targetLines) {
                const returnVar = getRandomItem(functionParams) || getAvailableVar(['int', 'float', 'bool'], true, 'int') || "None";
                codeLines.push(`${"    ".repeat(indentLevel)}return ${returnVar}`); funcBodyLines++;
            }
            if (funcBodyLines === 0) { codeLines.push(`${"    ".repeat(indentLevel)}pass`); funcBodyLines++; }
            indentLevel--;
            linesGeneratedSoFar += funcBodyLines + 1;

            if (linesGeneratedSoFar < targetLines) {
                let callArgs = functionParams.map(() => getAvailableVar(['int', 'float'], true, 'int'));
                codeLines.push(`${"    ".repeat(indentLevel)}${functionName}(${callArgs.join(', ')})`);
                linesGeneratedSoFar++;
            }
        }
    }

    // --- Génération de lignes supplémentaires (opérations, conditions, boucles) ---
    let attempts = 0;
    const MAX_ATTEMPTS_PER_LINE_GENERATION_CYCLE = 5; 

    // Helper pour générer une instruction simple (opération ou assignation)
    function generateSimpleInstruction(currentIndent) {
        const indentStr = "    ".repeat(currentIndent);
        const numVars = [...availableVariables.int, ...availableVariables.float];
        if (numVars.length > 0 && (options.op_plus_minus || options.op_mult_div_pow || options.op_modulo_floor)) {
            // Tenter une opération arithmétique
            const targetVar = getRandomItem(numVars);
            const operand1 = targetVar; // Souvent on modifie la variable elle-même ou une autre var numérique
            let operand2 = getAvailableVar(['int', 'float'], true, (availableVariables.float.includes(operand1) ? 'float' : 'int'));
            
            let opsPool = [];
            if (options.op_plus_minus) opsPool.push('+', '-');
            if (options.op_mult_div_pow) opsPool.push('*', '/'); // ** peut être trop, // et % plus tard
            if (options.op_modulo_floor && difficulty > 2) opsPool.push('%', '//');
            
            if (opsPool.length > 0) {
                const operator = getRandomItem(opsPool);
                if (['/', '%', '//'].includes(operator) && parseFloat(operand2) === 0) {
                    operand2 = (operator === '/') ? 1.0 : 1;
                }
                return `${indentStr}${targetVar} = ${operand1} ${operator} ${operand2}`;
            }
        }
        // Fallback: assigner un littéral à une variable existante ou nouvelle
        let targetVarForAssign = getAvailableVar(['int', 'float', 'bool']);
        if (!targetVarForAssign && allDeclaredVarNames.size < MAX_TOTAL_VARIABLES_GLOBAL) {
            targetVarForAssign = getNewVarName();
            availableVariables.int.push(targetVarForAssign); // Nouvelle var est int par défaut
        }
        if (targetVarForAssign) {
            const literalValue = availableVariables.bool.includes(targetVarForAssign) ? getRandomItem(BOOL_LITERALS) : getRandomInt(-valueRange, valueRange);
            return `${indentStr}${targetVarForAssign} = ${literalValue}`;
        }
        return `${indentStr}pass # Fallback simple instruction`;
    }


    while (linesGeneratedSoFar < targetLines && attempts < targetLines * MAX_ATTEMPTS_PER_LINE_GENERATION_CYCLE) {
        let addedLineThisTurn = false;
        const currentIndentStr = "    ".repeat(indentLevel);
        
        let possibleActions = [];
        // On ne propose une action que si elle est cochée ET qu'on a assez de lignes restantes pour elle
        if ((options.op_plus_minus || options.op_mult_div_pow || options.op_modulo_floor) && linesGeneratedSoFar < targetLines) possibleActions.push('arithmetic');
        if (options.main_conditions && options.cond_if && linesGeneratedSoFar < targetLines - 1) possibleActions.push('condition_if'); // if + corps = 2 lignes min
        if (options.main_loops && options.loop_for_range && linesGeneratedSoFar < targetLines - 1) possibleActions.push('loop_for_range');
        if (options.main_loops && options.loop_for_list && availableVariables.list.length > 0 && linesGeneratedSoFar < targetLines - 1) possibleActions.push('loop_for_list');
        if (options.main_loops && options.loop_for_str && availableVariables.str.length > 0 && linesGeneratedSoFar < targetLines - 1) possibleActions.push('loop_for_str');
        if (options.main_loops && options.loop_while && linesGeneratedSoFar < targetLines - 2) possibleActions.push('loop_while'); // while + corps + break = 3 lignes min

        if (possibleActions.length === 0) {
            if (linesGeneratedSoFar < targetLines) { // Si on a de la place, on fait une assignation simple
                const simpleLine = generateSimpleInstruction(indentLevel);
                if (!simpleLine.includes("# Fallback simple instruction") || codeLines.length < MIN_POSSIBLE_CODE_LINES) {
                    codeLines.push(simpleLine);
                    linesGeneratedSoFar++;
                    addedLineThisTurn = true;
                }
            }
            if (!addedLineThisTurn) { // Si même l'assignation simple échoue ou qu'on n'a plus de place
                 attempts++; continue;
            }
        } else {
             attempts = 0; // Réinitialiser les tentatives si on a des actions possibles
        }


        const action = getRandomItem(possibleActions);
        // console.log(`Lignes: ${linesGeneratedSoFar}/${targetLines}. Action choisie: ${action}`);

        switch (action) {
            case 'arithmetic':
                const arithmeticLine = generateSimpleInstruction(indentLevel);
                if (!arithmeticLine.includes("# Fallback simple instruction")) {
                    codeLines.push(arithmeticLine);
                    linesGeneratedSoFar++; addedLineThisTurn = true;
                }
                break;

            case 'condition_if':
                const condVar = getAvailableVar(['int', 'float', 'bool'], true, 'bool');
                const compVal = (typeof condVar === 'boolean' || availableVariables.bool.includes(condVar)) ? getRandomItem(BOOL_LITERALS) : getRandomInt(0, valueRange);
                const compOp = (typeof condVar === 'boolean' || availableVariables.bool.includes(condVar)) ? "==" : getRandomItem(['>', '<', '==', '!=', '>=', '<=']);
                
                codeLines.push(`${currentIndentStr}if ${condVar} ${compOp} ${compVal}:`);
                indentLevel++;
                codeLines.push(generateSimpleInstruction(indentLevel)); // Instruction dans le if
                indentLevel--;
                linesGeneratedSoFar += 2; addedLineThisTurn = true;

                if (options.cond_if_else && linesGeneratedSoFar < targetLines -1) {
                    codeLines.push(`${currentIndentStr}else:`);
                    indentLevel++;
                    codeLines.push(generateSimpleInstruction(indentLevel)); // Instruction dans le else
                    indentLevel--;
                    linesGeneratedSoFar += 2;
                }
                // TODO: Gérer elif, elif-else plus finement
                break;

            case 'loop_for_range':
                const iterVarRange = getNewVarName(); 
                // Ne pas ajouter aux variables globales si c'est juste un itérateur local à la boucle
                codeLines.push(`${currentIndentStr}for ${iterVarRange} in range(${getRandomInt(2, Math.min(5, difficulty + 2))}):`);
                indentLevel++;
                // Instruction dans la boucle, utilisant potentiellement iterVarRange
                let numVarsForLoopBody = [...availableVariables.int, ...availableVariables.float];
                if (numVarsForLoopBody.length > 0) {
                    const targetInLoop = getRandomItem(numVarsForLoopBody);
                    codeLines.push(`${"    ".repeat(indentLevel)}${targetInLoop} = ${targetInLoop} + ${iterVarRange}`);
                } else {
                     codeLines.push(generateSimpleInstruction(indentLevel));
                }
                indentLevel--;
                linesGeneratedSoFar += 2; addedLineThisTurn = true;
                break;
            
            case 'loop_for_list':
                const listToIterate = getRandomItem(availableVariables.list); // On s'assure qu'elle existe via possibleActions
                const iterVarList = getNewVarName(); 
                codeLines.push(`${currentIndentStr}for ${iterVarList} in ${listToIterate}:`);
                indentLevel++;
                codeLines.push(generateSimpleInstruction(indentLevel)); // Opération simple sur iterVarList ou autre
                indentLevel--;
                linesGeneratedSoFar += 2; addedLineThisTurn = true;
                break;

            case 'loop_for_str':
                const strToIterate = getRandomItem(availableVariables.str); // Assuré d'exister
                const iterVarStr = getNewVarName(); 
                codeLines.push(`${currentIndentStr}for ${iterVarStr} in ${strToIterate}:`);
                indentLevel++;
                // Pour une chaîne, on pourrait faire un print ou une concaténation
                if (options.builtin_print && Math.random() < 0.5) {
                    codeLines.push(`${"    ".repeat(indentLevel)}print(${iterVarStr})`);
                } else {
                    codeLines.push(generateSimpleInstruction(indentLevel));
                }
                indentLevel--;
                linesGeneratedSoFar += 2; addedLineThisTurn = true;
                break;
            
            case 'loop_while':
                const whileCondVar = getAvailableVar(['bool', 'int'], true, 'bool');
                let whileCompVal = getRandomItem(BOOL_LITERALS);
                let whileCompOp = "==";
                if (typeof whileCondVar === 'number' || availableVariables.int.includes(whileCondVar)) {
                    whileCompVal = getRandomInt(0,1); // 0 ou 1 pour comparer avec un int
                    whileCompOp = getRandomItem(["!=", ">", "<"]); // Pour avoir une chance de terminer
                }
                // Pour une boucle while, il faut une variable qui sera modifiée pour sortir
                let loopControlVar = null;
                if (availableVariables.int.length > 0 && Math.random() < 0.7) {
                    loopControlVar = getRandomItem(availableVariables.int);
                } else if (allDeclaredVarNames.size < MAX_TOTAL_VARIABLES_GLOBAL) {
                    loopControlVar = getNewVarName();
                    availableVariables.int.push(loopControlVar);
                    codeLines.push(`${currentIndentStr}${loopControlVar} = ${getRandomInt(difficulty + 1, difficulty + 3)} # Init pour while`);
                    linesGeneratedSoFar++;
                }

                if (loopControlVar) {
                    codeLines.push(`${currentIndentStr}while ${loopControlVar} > 0:`);
                    indentLevel++;
                    codeLines.push(generateSimpleInstruction(indentLevel)); // Instruction dans le while
                    codeLines.push(`${"    ".repeat(indentLevel)}${loopControlVar} = ${loopControlVar} - 1 # Décrémentation pour sortir`);
                    indentLevel--;
                    linesGeneratedSoFar += 3; addedLineThisTurn = true;
                } else { // Fallback si on n'a pas pu créer de variable de contrôle
                    codeLines.push(`${currentIndentStr}while ${whileCondVar} ${whileCompOp} ${whileCompVal}:`);
                    indentLevel++;
                    codeLines.push(`${"    ".repeat(indentLevel)}# Corps du while...`);
                    codeLines.push(`${"    ".repeat(indentLevel)}break # Sécurité`);
                    indentLevel--;
                    linesGeneratedSoFar += 3; addedLineThisTurn = true;
                }
                break;
        }
        
        if (!addedLineThisTurn) attempts++;
        // else attempts = 0; // On a déjà réinitialisé si possibleActions n'était pas vide
    }
    console.log(`Fin de la génération principale: ${codeLines.length} lignes.`);

    while(codeLines.length < MIN_POSSIBLE_CODE_LINES) {
        codeLines.push("pass # Ligne de remplissage finale");
    }
    if (codeLines.length === 0 && MIN_POSSIBLE_CODE_LINES > 0) { // S'assurer qu'on retourne au moins quelque chose
        codeLines.push("pass # Code minimal");
    }
    
    const finalCode = codeLines.join('\n');
    console.log("[CODE-GENERATOR] Code final sur le point d'être retourné:\n---\n" + finalCode + "\n---");
    console.log(`[CODE-GENERATOR] Type de finalCode: ${typeof finalCode}, Longueur: ${finalCode ? finalCode.length : 'N/A'}`);
    return finalCode;
}