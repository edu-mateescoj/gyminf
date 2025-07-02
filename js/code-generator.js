// Retirer l'import require et modifier l'approche

/**
 * Générateur amélioré de code Python pédagogique
 * Aligne variables par type et génère une structure cohérente selon les options
 */
function generateRandomPythonCode(options) {
    console.log("Début de generateRandomPythonCode avec options :", JSON.parse(JSON.stringify(options)));

    // Vérifier si l'approche par patterns est activée et disponible
    const usePatternApproach = typeof generateProgramByPattern === 'function';

    if (usePatternApproach) {
        try {
            console.log("Utilisation du générateur par patterns");
            return generateProgramByPattern(options);
        } catch (error) {
            console.error("Erreur dans le générateur par patterns:", error);
            console.log("Fallback sur le générateur legacy");
            return generateCodeWithLegacyApproach(options);
        }
    } else {
        console.log("Générateur par patterns non disponible, utilisation du générateur legacy");
        return generateCodeWithLegacyApproach(options);
    }
} 
/**
 * Version LEGACY du générateur pour compatibilité
 * C'est l'ancien code de generateRandomPythonCode
 */
function generateCodeWithLegacyApproach(options) {
    // Valeurs littérales pour chaque type
    const LITERALS_BY_TYPE = {
        int: (difficulty) => getRandomInt(-getValueRange(difficulty), getValueRange(difficulty)),
        float: (difficulty) => parseFloat((getRandomInt(-getValueRange(difficulty), getValueRange(difficulty)) + Math.random() - 0.5).toFixed(2)),
        str: () => {
            const words = ["alpha", "beta", "gamma", "delta", "omega", "sigma", "lambda", "python", "code", "hello", "world"];
            return `"${getRandomItem(words)}"`;
        },
        bool: () => getRandomItem(["True", "False"]),
        list: (difficulty, itemType = 'int') => {
            const size = getRandomInt(2, Math.min(5, 2 + difficulty));
            const items = [];
            for (let i = 0; i < size; i++) {
                if (itemType === 'int') {
                    items.push(getRandomInt(-getValueRange(difficulty), getValueRange(difficulty)));
                } else if (itemType === 'str') {
                    const words = ["alpha", "beta", "gamma", "delta", "omega"];
                    items.push(`"${getRandomItem(words)}"`);
                } else if (itemType === 'bool') {
                    items.push(getRandomItem(["True", "False"]));
                }
            }
            return `[${items.join(', ')}]`;
        }
    };
    
    // Définir une plage de valeurs selon la difficulté mais plus grandes
    function getValueRange(difficulty) {
        return difficulty <= 3 ? 5 : (difficulty <= 5 ? 10 : 15);
    }
    
    // --- FONCTIONS UTILITAIRES ---
    
    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    function getRandomItem(array) {
        if (!array || array.length === 0) return null;
        return array[Math.floor(Math.random() * array.length)];
    }
    
    // Logique spécifique pour les variables d'itération
    let iteratorCounter = 0; // Compteur global pour les itérateurs
    const usedIteratorNames = new Set(); // Ensemble pour suivre les noms d'itérateurs utilisés
   // Générer un nom d'itérateur unique selon le type
    function generateUniqueIteratorName(type) {
        // Préfixes appropriés selon le type
        const prefixMap = {
            'int': 'i',
            'str': 'char',
            'list': 'item'
        };
        
        const prefix = prefixMap[type] || 'iter';
        let iterName;
        
        if (iteratorCounter === 0 && !usedIteratorNames.has(prefix)) {
            // Pour le premier itérateur, utiliser simplement le préfixe
            iterName = prefix;
        } else {
            // Pour les suivants, ajouter un numéro
            iterName = `${prefix}${iteratorCounter + 1}`;
        }
        
        // Incrémenter le compteur et enregistrer le nom
        iteratorCounter++;
        usedIteratorNames.add(iterName);
        
        return iterName;
    }

    // --- INITIALISATION DU CONTEXTE DE GÉNÉRATION ---
    
    const difficulty = options.difficultyLevelGlobal || 3;
    const targetLines = options.numLinesGlobal || 10;
    const MAX_TOTAL_VARIABLES = options.numTotalVariablesGlobal || 5;
    
    let codeLines = [];
    let indentLevel = 0;
    let linesGenerated = 0;
    
    // Structures pour suivre les variables générées
    let declaredVarsByType = {
        int: [],
        float: [],
        str: [],
        list: [],
        bool: []
    };
    let allDeclaredVarNames = new Set(); // Pour éviter les doublons de noms + contrôler taille du pb
    
    // Variables planifiées mais pas encore déclarées
    let plannedVarsByType = { int: [], float: [], str: [], list: [], bool: [] };
    let allPlannedVarNames = new Set();

    // --- GÉNÉRATION DE VARIABLES (NOUVELLE APPROCHE) ---

    function generateUniqueVarName(type) {
        // Noms disponibles pour ce type
        const availableNames = VAR_NAMES_BY_TYPE[type] || VAR_NAMES_BY_TYPE.int; // par défaut à 'int'
        // Filtrer les noms de variables disponibles pour ce type qui n'ont pas encore été utilisés
        const availableUnusedNames = availableNames.filter(name => !allDeclaredVarNames.has(name));
        // Si nous avons des noms disponibles non utilisés, en choisir un aléatoirement
        if (availableUnusedNames.length > 0) {
            // Sélection aléatoire pour éviter de toujours utiliser les mêmes noms dans le code généré
            return getRandomItem(availableUnusedNames);
        }
        // Si tous les noms sont pris, ajouter un suffixe numérique
        let counter = 1;
        let baseName = availableNames[0];
        let newName;
        do {
            newName = `${baseName}${counter}`;
            counter++;
        } while (allDeclaredVarNames.has(newName));
        
        return newName;
    }
    /**
     * Crée une nouvelle variable d'un type donné, l'initialise,
     * et ajoute sa déclaration au début du code.
     * @param {string} type - Le type de la variable à créer ('int', 'str', etc.).
     * @returns {string} Le nom de la variable créée.
     */
    function declareVariable(type) {
        const name = generateUniqueVarName(type);
        const value = LITERALS_BY_TYPE[type](difficulty);
        
        // Ajoute toujours l'initialisation au début du tableau de lignes de code.
        codeLines.unshift(`${name} = ${value}`);
        
        // Enregistre la nouvelle variable comme étant déclarée.
        allDeclaredVarNames.add(name);
        declaredVarsByType[type].push(name);
        linesGenerated++;
        
        return name;
    }
    /**
     * Garantit qu'une variable du type spécifié existe.
     * Si une ou plusieurs variables de ce type existent déjà, en retourne une au hasard.
     * Sinon, en déclare une nouvelle.
     * @param {string} type - Le type de la variable requise.
     * @returns {string} Le nom d'une variable existante ou nouvellement créée.
     */
    function ensureVariableExists(type) {
        // Vérifie si une variable du type demandé existe déjà.
        if (declaredVarsByType[type] && declaredVarsByType[type].length > 0) {
            // Si oui, en retourne une au hasard.
            return getRandomItem(declaredVarsByType[type]);
        }
        
        // Si non, appelle declareVariable pour en créer une.
        return declareVariable(type);
    }

    // "patch" dans la phase d'initialisation pour éviter bug du nombre de listes insuffisant
    // pour les options var_list_count
    function ensureListVariablesCount() {
        // Vérifier si le nombre actuel de listes déclarées correspond à l'option demandée
        const targetListCount = options.var_list_count || 0;
        const currentListCount = declaredVarsByType.list.length;
        
        // Si on a déjà assez de listes, ne rien faire
        if (currentListCount >= targetListCount) return;
        
        // Créer autant de listes que nécessaire
        for (let i = 0; i < targetListCount - currentListCount; i++) {
            // Déterminer le type des éléments de la liste en fonction des options sélectionnées
            let itemTypes = ['int']; // Type par défaut
            
            // Si d'autres types sont disponibles, les considérer aussi
            if (options.var_str_count > 0) itemTypes.push('str');
            if (options.var_bool_count > 0) itemTypes.push('bool');
            if (options.var_float_count > 0) itemTypes.push('float');
            
            // Génère une nouvelle liste avec des types d'éléments diversifiés
            const listVar = declareVariable('list', generateDiverseList(itemTypes, difficulty));
            
            // S'assurer que la liste est utilisée quelque part dans le code
            ensureListVariableIsUsed(listVar);
        }
    }
    // Générer une liste avec des éléments de types diversifiés
    function ensureListVariableIsUsed(listVarName) {
        // Vérifier si la variable est déjà utilisée dans le code
        const isUsed = codeLines.some(line => 
            line.includes(`${listVarName}`) && !line.startsWith(`${listVarName} =`)
        );
        
        if (!isUsed) {
            // Ajouter une opération utilisant cette liste
            const operations = [
                // Parcourir la liste
                () => {
                    const loopVar = generateUniqueIteratorName('list');
                    codeLines.push(`for ${loopVar} in ${listVarName}:`);
                    const indent = safeIndent(1);
                    codeLines.push(`${indent}print(${loopVar})`);
                    linesGenerated += 2;
                },
                // Accéder à un élément
                () => {
                    const targetVar = ensureVariableExists('int');
                    codeLines.push(`if len(${listVarName}) > 0:`);
                    const indent = safeIndent(1);
                    codeLines.push(`${indent}${targetVar} = ${targetVar} + ${listVarName}[0]`);
                    linesGenerated += 2;
                },
                // Ajouter un élément
                () => {
                    codeLines.push(`${listVarName}.append(${getRandomInt(1, 10)})`);
                    linesGenerated++;
                }
            ];
            // Exécuter une opération aléatoire
            getRandomItem(operations)();
        }
    }


    // Générer une valeur pour un type donné
    function generateValueForType(type) {
        return LITERALS_BY_TYPE[type](difficulty);
    }
    
    function generateDiverseList(allowedTypes, difficulty) {
        // Déterminer la taille de la liste en fonction de la difficulté
        const size = getRandomInt(2, Math.min(5, 2 + difficulty));
        
        // Déterminer si la liste sera homogène ou hétérogène
        const isHomogeneous = difficulty <= 3 || Math.random() < 0.7;
        
        // Sélectionner les types à utiliser
        let typesToUse;
        if (isHomogeneous) {
            // Liste homogène : un seul type
            typesToUse = [getRandomItem(allowedTypes)];
        } else {
            // Liste hétérogène : plusieurs types
            // Plus la difficulté est élevée, plus on peut mélanger de types
            const maxTypes = Math.min(allowedTypes.length, 1 + Math.floor(difficulty / 2));
            typesToUse = shuffleArray([...allowedTypes]).slice(0, getRandomInt(2, maxTypes));
        }
        
        // Générer les éléments de la liste
        const items = [];
        for (let i = 0; i < size; i++) {
            // Pour une liste homogène, utiliser toujours le même type
            // Pour une liste hétérogène, alterner entre les types sélectionnés
            const currentType = isHomogeneous ? typesToUse[0] : typesToUse[i % typesToUse.length];
            
            // Générer une valeur du type approprié
            items.push(generateValueOfType(currentType, difficulty));
        }
        
        return `[${items.join(', ')}]`;
    }

    function generateValueOfType(type, difficulty) {
        switch (type) {
            case 'int':
                return getRandomInt(-getValueRange(difficulty), getValueRange(difficulty));
            case 'float':
                return parseFloat((getRandomInt(-getValueRange(difficulty), getValueRange(difficulty)) + Math.random()).toFixed(2));
            case 'str':
                const words = ["alpha", "beta", "gamma", "delta", "epsilon", "kappa", "theta", "omega", "python", "code"];
                return `"${getRandomItem(words)}"`;
            case 'bool':
                return getRandomItem(["True", "False"]);
            default:
                return 0; // Fallback
        }
    }

    // Phase 1 : Génération des variables selon les options
    function generateVariables() {
        const typesToGenerate = [];
        
        // Déterminer les types à générer selon les options
        if (options.var_int_count) typesToGenerate.push({ type: 'int', count: options.var_int_count });
        if (options.var_float_count) typesToGenerate.push({ type: 'float', count: options.var_float_count });
        if (options.var_str_count) typesToGenerate.push({ type: 'str', count: options.var_str_count });
        if (options.var_list_count) typesToGenerate.push({ type: 'list', count: options.var_list_count });
        if (options.var_bool_count) typesToGenerate.push({ type: 'bool', count: options.var_bool_count });
        
        // Générer les variables dans l'ordre des types (pas en mélange)
        for (const typeInfo of typesToGenerate) {
            for (let i = 0; i < typeInfo.count && allDeclaredVarNames.size < MAX_TOTAL_VARIABLES; i++) {
                const varName = generateUniqueVarName(typeInfo.type);
                const value = generateValueForType(typeInfo.type);
                
                codeLines.push(`${varName} = ${value}`);
                allDeclaredVarNames.add(varName);
                declaredVarsByType[typeInfo.type].push(varName);
                linesGenerated++;
            }
        }
        
        // Si besoin de plus de variables pour atteindre le minimum (toujours en integers)
        while (allDeclaredVarNames.size < Math.min(MAX_TOTAL_VARIABLES, options.numTotalVariablesGlobal || 3) && 
               linesGenerated < targetLines) {
            const varName = generateUniqueVarName('int');
            const value = generateValueForType('int');
            
            codeLines.push(`${varName} = ${value}`);
            allDeclaredVarNames.add(varName);
            declaredVarsByType.int.push(varName);
            linesGenerated++;
        }
    }
    
    // --- GÉNÉRATION DES ÉLÉMENTS DE SYNTAXE ---
    
    // Phase 2: Générer les opérations
    function generateOperations() {
        // Plus-Minus est toujours activé
        if (options.op_plus_minus && linesGenerated < targetLines) {
            const numVars = [...declaredVarsByType.int, ...declaredVarsByType.float];
            
            if (numVars.length >= 2) {
                const target = getRandomItem(numVars);
                const operand = getRandomItem(numVars.filter(v => v !== target) || numVars);
                const op = getRandomItem(['+', '-']);
                
                codeLines.push(`${target} = ${target} ${op} ${operand}`);
                linesGenerated++;
            }
        }
        
        // Multiplication et Division
        if (options.op_mult_div_pow && linesGenerated < targetLines) {
            const numVars = [...declaredVarsByType.int, ...declaredVarsByType.float];
            
            if (numVars.length >= 1) {
                const target = getRandomItem(numVars);
                const value = getRandomInt(1, 5); // Éviter division par zéro
                const op = getRandomItem(['*', '/']);
                
                codeLines.push(`${target} = ${target} ${op} ${value}`);
                linesGenerated++;
            }
        }
        
        // Modulo et division entière
        if (options.op_modulo_floor && linesGenerated < targetLines && difficulty > 1) {
            const intVars = declaredVarsByType.int;
            
            if (intVars.length >= 1) {
                const target = getRandomItem(intVars);
                const value = getRandomInt(1, 5); // Éviter division par zéro
                const op = getRandomItem(['%', '//']);
                
                codeLines.push(`${target} = ${target} ${op} ${value}`);
                linesGenerated++;
            }
        }
        
        // Opérateurs logiques
        if ((options.op_and || options.op_or) && declaredVarsByType.bool.length >= 2 && linesGenerated < targetLines) {
            const boolVars = declaredVarsByType.bool;
            const target = getRandomItem(boolVars);
            const operand = getRandomItem(boolVars.filter(v => v !== target) || boolVars);
            const op = options.op_and ? 'and' : 'or';
            
            codeLines.push(`${target} = ${target} ${op} ${operand}`);
            linesGenerated++;
        }
        
        if (options.op_not && declaredVarsByType.bool.length >= 1 && linesGenerated < targetLines) {
            const target = getRandomItem(declaredVarsByType.bool);
            codeLines.push(`${target} = not ${target}`);
            linesGenerated++;
        }
        
        // Slicing
        if ((options.op_slice_ab || options.op_slice_abs) && 
            (declaredVarsByType.str.length > 0 || declaredVarsByType.list.length > 0) && 
            linesGenerated < targetLines) {
            
            const sliceableVars = [...declaredVarsByType.str, ...declaredVarsByType.list];
            if (sliceableVars.length > 0) {
                const varToSlice = getRandomItem(sliceableVars);
                const resultVarName = generateUniqueVarName(declaredVarsByType.str.includes(varToSlice) ? 'str' : 'list');
                
                let sliceExpr;
                if (options.op_slice_abs) {
                    sliceExpr = `${varToSlice}[1:4:2]`;
                } else {
                    sliceExpr = `${varToSlice}[1:3]`;
                }
                
                codeLines.push(`${resultVarName} = ${sliceExpr}`);
                allDeclaredVarNames.add(resultVarName);
                
                if (declaredVarsByType.str.includes(varToSlice)) {
                    declaredVarsByType.str.push(resultVarName);
                } else {
                    declaredVarsByType.list.push(resultVarName);
                }
                
                linesGenerated++;
            }
        }
    }
    
    // Phase 3: Générer les structures de contrôle
    // 1. Créer un gestionnaire central pour générer des conditions adaptées au contexte
    function generateCondition(varTypes = ['int', 'bool'], preferExisting = true) {
        // Cette fonction génère une condition appropriée selon les types disponibles
        // et garantit qu'elle ne créera pas de boucle infinie

        // Chercher d'abord dans les variables existantes
        let condition = null;
        
        // Essayer les variables booléennes si demandé
        if (varTypes.includes('bool') && declaredVarsByType.bool.length > 0 && preferExisting) {
            const boolVar = getRandomItem(declaredVarsByType.bool);
            condition = boolVar;
        } 
        // Essayer les entiers pour les comparaisons
        else if (varTypes.includes('int') && declaredVarsByType.int.length > 0 && preferExisting) {
            const intVar = getRandomItem(declaredVarsByType.int);
            // Pour while, éviter les conditions toujours vraies - préférer comparaisons décroissantes
            if (varTypes.includes('while_safe')) {
                condition = `${intVar} > 0`;
            } else {
                const compareValue = getRandomInt(-5, 5);
                const compareOp = getRandomItem(['>', '<', '==', '!=', '>=', '<=']);
                condition = `${intVar} ${compareOp} ${compareValue}`;
            }
        }
        // Créer une nouvelle variable si nécessaire
        else {
            if (varTypes.includes('bool')) {
                // Pour les conditions simples
                const boolVar = generateUniqueVarName('bool');
                const value = getRandomItem(["True", "False"]);
                codeLines.push(`${boolVar} = ${value}`);
                declaredVarsByType.bool.push(boolVar);
                allDeclaredVarNames.add(boolVar);
                linesGenerated++;
                condition = boolVar;
            } else if (varTypes.includes('int') || varTypes.includes('while_safe')) {
                // Pour while ou conditions numériques
                const intVar = generateUniqueVarName('int');
                // Pour une boucle while, initialiser avec une valeur positive
                const value = varTypes.includes('while_safe') ? 
                    getRandomInt(3, 5) : getRandomInt(-5, 5);
                codeLines.push(`${intVar} = ${value}`);
                declaredVarsByType.int.push(intVar);
                allDeclaredVarNames.add(intVar);
                linesGenerated++;
                
                if (varTypes.includes('while_safe')) {
                    condition = `${intVar} > 0`;
                } else {
                    const compareOp = getRandomItem(['>', '<', '==', '!=', '>=', '<=']);
                    const compareValue = getRandomInt(-5, 5);
                    condition = `${intVar} ${compareOp} ${compareValue}`;
                }
            }
        }
        
        return {
            condition, 
            // Renvoyer aussi la variable utilisée pour les boucles while
            // afin de pouvoir la décrémenter dans le corps
            intVar: condition && condition.includes('>') ? 
                condition.split('>')[0].trim() : null
        };
    }
    
    function generateControlStructures() {
        /*
        // Conditions
        if (options.main_conditions && options.cond_if && linesGenerated < targetLines - 1) {
            generateIfStatement();
        }
        */
        // Créer un tableau des structures possibles
        const structures = [];

        // Conditions - sans vérification de lignes restantes
        if (options.main_conditions && options.cond_if) {
        structures.push('if');
    }
    // Ne plus vérifier si des variables list OU str existent
    // && declaredVarsByType.list.length > 0
    if (options.main_loops) {
        if (options.loop_for_range) structures.push('for_range');
        if (options.loop_for_list) structures.push('for_list');
        if (options.loop_for_str) structures.push('for_str');
        if (options.loop_while) structures.push('while');
    }
    if (options.main_functions) {
        structures.push('function');
    }
    // Mélanger pour un ordre aléatoire
    shuffleArray(structures);

    // Générer les structures dans l'ordre mélangé
    for (const structure of structures) {
        switch (structure) {
            case 'if': generateIfStatement(); break;
            case 'for_range': generateForRangeLoop(); break;
            case 'for_list': generateForListLoop(); break;
            case 'for_str': generateForStrLoop(); break;
            case 'while': generateWhileLoop(); break;
            case 'function': generateFunction(); break;
            }
        }
    }

    /**
     * Génère un nombre approprié d'instructions pour le corps d'une structure.
     * @param {number} indentLevel - Niveau d'indentation actuel
     * @param {string} contextType - Type de structure ('for_list', 'for_str', 'function', etc.)
     * @param {Object} options - Options de génération comme le niveau de difficulté
     * @returns {Array<string>} - Tableau de lignes de code pour le corps
     */
    function generateStructureBody(indentLevel, contextType, options = {}) {
        // Calculer le nombre d'instructions selon la difficulté
        const structureDifficulty = options.difficulty || difficulty;
        const instructionCount = 1 + Math.floor(structureDifficulty / 3);
    
        const indent = safeIndent(indentLevel);
        const bodyLines = [];
        
        // Ensemble pour suivre les opérations déjà ajoutées dans ce corps
        const addedOperations = new Set();

            
        // Adapter le comportement selon le contexte
        switch (contextType) {
            case 'for_range': {
            // Pour une boucle for sur range, utiliser la variable d'itération
            const loopVar = options.loopVar;
            
            // Cible à modifier sera généralement un entier
            const targetVar = ensureVariableExists('int');
            
            for (let i = 0; i < instructionCount; i++) {
                let operation;
                
                if (i === 0) {
                    // La première instruction utilise toujours l'itérateur
                    operation = `${indent}${targetVar} = ${targetVar} + ${loopVar}`;
                } else {
                    // Les instructions suivantes sont plus variées
                    operation = `${indent}${generateVariedOperation('int', targetVar, structureDifficulty).replace(/;$/, '')}`;
                }
                
                // Vérifier si cette opération est déjà présente dans le corps
                if (addedOperations.has(operation)) {
                    // Ajouter un commentaire unique pour la rendre différente
                    const uniqueId = Math.random().toString(36).substring(2, 5);
                    operation = operation.replace(/\s*#.*$/, '') + `  # var_${uniqueId}`;
                }
                
                bodyLines.push(operation);
                addedOperations.add(operation);
            }
            break;
        }
            case 'for_list': {
                // Pour une boucle for sur liste, utiliser la variable d'itération
                const loopVar = options.loopVar;
                
                // Déterminer le type de variable à modifier (dépend du contenu de la liste)
                const targetType = Math.random() > 0.3 ? 'int' : 'str';
                const targetVar = ensureVariableExists(targetType);
                
                // Générer différentes opérations utilisant la variable d'itération
                for (let i = 0; i < instructionCount; i++) {
                    // Alterner entre différentes opérations
                    if (i === 0 || Math.random() > 0.5) {
                        // Opération directe avec la variable d'itération + conversion explicite str() si besoin
                        if (targetType === 'str') {
                        // évite TypeError et confronte les élèves à la conversion de types
                        bodyLines.push(`${indent}${targetVar} = ${targetVar} + str(${loopVar})`);
                        } else {
                            bodyLines.push(`${indent}${generateVariedOperation(targetType, targetVar, structureDifficulty).replace(/;$/, '')}`); // bodyLines.push(`${indent}${targetVar} = ${targetVar} + ${loopVar}`);
                        }
                    } else {
                        // Utiliser generateVariedOperation pour plus de variété
                        bodyLines.push(`${indent}${generateVariedOperation(targetType, targetVar, structureDifficulty).replace(/;$/, '')}`);
                        // défensif: supprimer les ";" de JS si ils arrivent à passer
                    }
                }
                break;
            }
            case 'for_str': {
                // Pour une boucle for sur chaîne, utiliser la variable de caractère
                const charVar = options.loopVar;
                const targetVar = ensureVariableExists('str');
                
                for (let i = 0; i < instructionCount; i++) {
                    if (i === 0) {
                        // Première instruction toujours une concaténation?
                        bodyLines.push(`${indent}${targetVar} = ${targetVar} + ${charVar}`);
                        bodyLines.push(`${indent}${generateVariedOperation('str', targetVar, difficulty).replace(/;$/, '')}`);
                    } else if (structureDifficulty >= 3 && Math.random() > 0.5) {
                        // Concaténation conditionnelle pour difficulté moyenne+
                        bodyLines.push(`${indent}if ${charVar} in "aeiou":`);
                        bodyLines.push(`${indent}    ${targetVar} += ${charVar}.upper()`);
                    } else {
                        // Utiliser generateVariedOperation pour les autres instructions
                        bodyLines.push(`${indent}${generateVariedOperation('str', targetVar, structureDifficulty).replace(/;$/, '')}`);
                    }
                }
                break;
            }
            case 'function': {
                const params = options.params || [];
                
                for (let i = 0; i < instructionCount; i++) {
                    // Adapter selon l'index dans le corps
                    if (i === 0 && params.length > 0) {
                        // Première instruction utilise un paramètre si disponible
                        const param = params[0];
                        bodyLines.push(`${indent}result = ${param} * 2`);
                    } else if (i === instructionCount-1 && options.hasReturn) {
                        // Dernière instruction peut être un return
                        if (params.length > 0) {
                            bodyLines.push(`${indent}return result`);
                        } else {
                            bodyLines.push(`${indent}return True`);
                        }
                    } else if (options.hasPrint && Math.random() > 0.5) {
                        // Instruction print si l'option est activée
                        if (params.length > 0) {
                            bodyLines.push(`${indent}print("Valeur:", ${params[0]})`);
                        } else {
                            bodyLines.push(`${indent}print("Fonction exécutée")`);
                        }
                    } else {
                        // Utiliser generateAppropriateStatement pour variété
                        bodyLines.push(`${indent}${generateAppropriateStatement()}`);
                    }
                }
                break;
            }
            default:
                // Par défaut, générer des instructions génériques
                for (let i = 0; i < instructionCount; i++) {
                    bodyLines.push(`${indent}${generateAppropriateStatement()}`);
                }
        }
        
        // Si aucune instruction n'a été générée, ajouter au moins un pass
        if (bodyLines.length === 0) {
            bodyLines.push(`${indent}pass  # Corps vide`);
        }
    
        return bodyLines;
    }

    function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
    }

    // Génération d'un if (avec else optionnel)
    function generateIfStatement() {
        const indent = safeIndent(indentLevel);
        // Utiliser notre générateur de conditions (préférant bool et int)
        let { condition } = generateCondition(['bool', 'int'], true);
        // destructuration d'objet JS ~ "unpacking" de l'objet retourné 
         
        // Générer la condition pour le if
        // Choisir une variable pour la condition selon les types de var disponibles
        if (declaredVarsByType.bool.length > 0) {
            // Si on a des booléens, utiliser directement
            const boolVar = getRandomItem(declaredVarsByType.bool);
            condition = boolVar;
        } else if (declaredVarsByType.int.length > 0) {
            // Si on a des entiers, comparer à une valeur
            const intVar = getRandomItem(declaredVarsByType.int);
            const compareValue = getRandomInt(-5, 5);
            const compareOp = getRandomItem(['>', '<', '==', '!=', '>=', '<=']);
            condition = `${intVar} ${compareOp} ${compareValue}`;
        } else {
            // Fallback: créer un booléen temporaire
            const tempVar = generateUniqueVarName('bool');
            const value = getRandomItem(["True", "False"]);
            codeLines.push(`${indent}${tempVar} = ${value}`); // on indente pas plus ici que le niveau courant car on prépare le bloc if
            declaredVarsByType.bool.push(tempVar);
            allDeclaredVarNames.add(tempVar);
            linesGenerated++;
            condition = tempVar;
        }
        // Générer la ligne if avec la condition
        codeLines.push(`${indent}if ${condition}:`);
        
        // Augmenter l'indentation pour le corps du if
        indentLevel++;

        // Générer le corps du if avec une opération cohérente
        const ifBodyIndent = safeIndent(indentLevel);
        const ifBody = generateAppropriateStatement();
        codeLines.push(`${ifBodyIndent}${ifBody}`);
        // on sort du bloc if, donc on décrémente l'indentation
        indentLevel--;
        // Compter les lignes générées jusqu'ici
        let linesAdded = 2; // if + corps
        
        // Optionnellement ajouter un elif
        if (options.cond_if_elif) {
            // Générer une nouvelle condition pour le elif
            let { elifCondition } = generateCondition(['bool', 'int'], true);
            
            // S'assurer que la condition elif est différente
            if (!elifCondition) {
                if (declaredVarsByType.bool.length > 0) {
                    const boolVar = getRandomItem(declaredVarsByType.bool);
                    elifCondition = `not ${boolVar}`;
                } else if (declaredVarsByType.int.length > 0) {
                    const intVar = getRandomItem(declaredVarsByType.int);
                    const compareValue = getRandomInt(-5, 5);
                    const compareOp = getRandomItem(['!=', '==', '<=', '>=']);
                    elifCondition = `${intVar} ${compareOp} ${compareValue}`;
                } else {
                    elifCondition = "True"; // Fallback
                }
            }
            
            codeLines.push(`${indent}elif ${elifCondition}:`);
            indentLevel++;
            
            const elifBodyIndent = safeIndent(indentLevel);
            const elifBody = generateAppropriateStatement();
            codeLines.push(`${elifBodyIndent}${elifBody}`);
            indentLevel--;
            
            linesAdded += 2; // elif + corps
            
            // Optionnellement ajouter un else après le elif (seulement si elif est activé)
            if (options.cond_if_elif_else) {
                codeLines.push(`${indent}else:`);
                indentLevel++;
                
                const elseBodyIndent = safeIndent(indentLevel);
                const elseBody = generateAppropriateStatement();
                codeLines.push(`${elseBodyIndent}${elseBody}`);
                indentLevel--;
                
                linesAdded += 2; // else + corps
            }
        }
        // Si pas de elif mais un else simple
        else if (options.cond_if_else) {
            codeLines.push(`${indent}else:`);
            indentLevel++;
            
            const elseBodyIndent = safeIndent(indentLevel);
            const elseBody = generateAppropriateStatement();
            codeLines.push(`${elseBodyIndent}${elseBody}`);
            indentLevel--;
            
            linesAdded += 2; // else + corps
        }
        
        // Mettre à jour le compteur de lignes avec le total réel
        linesGenerated += linesAdded;
}
    
    // Génération d'une boucle for..range
    //  CORPS := "VAR = VAR + ITERATEUR" UNIQUEMENT
    function generateForRangeLoop() {
        const indent = safeIndent(indentLevel);
        
        // La variable d'itération est considérée comme "déclarée" dans le contexte de la boucle
        const loopVar = generateUniqueIteratorName('int');

        const rangeLimit = getRandomInt(difficulty + 1, difficulty + 4); // Plage de 1 à 10
        
        codeLines.push(`${indent}for ${loopVar} in range(${rangeLimit}):`);
        indentLevel++;
        
        // Utiliser generateStructureBody comme pour les autres types de boucles
        const bodyLines = generateStructureBody(indentLevel, 'for_range', { 
            loopVar, 
            difficulty 
        });
        
        // Ajouter les lignes du corps au code
        bodyLines.forEach(line => codeLines.push(line));
        
        indentLevel--;
        // Mettre à jour le compteur de lignes correctement
        linesGenerated += 1 + bodyLines.length; // 1 pour la ligne "for" + nombre de lignes du corps
    }
    
    // Génération d'une boucle for..list
    function generateForListLoop() {
        const indent = safeIndent(indentLevel);
        
        // Préférer utiliser une variable de liste existante plutôt qu'un littéral
        let iterableExpr; // l'itérable 'list' pour cette boucle for
        if (declaredVarsByType.list.length > 0) {
            iterableExpr = getRandomItem(declaredVarsByType.list);
        } else {
            // Si aucune liste n'est disponible, en créer une avec des types diversifiés
            const allowedTypes = ['int'];
            if (options.var_str_count > 0) allowedTypes.push('str');
            if (options.var_bool_count > 0) allowedTypes.push('bool');
            iterableExpr = generateDiverseList(allowedTypes, difficulty);
        }
        
        // Nom pour l'élément de liste
        const loopVar = generateUniqueIteratorName('list');
        
        // Générer la ligne de la boucle
        codeLines.push(`${indent}for ${loopVar} in ${iterableExpr}:`);
        indentLevel++;
        
        // Générer un corps de boucle riche avec plusieurs instructions
        const bodyLines = generateStructureBody(indentLevel, 'for_list', { 
            loopVar, 
            difficulty
        });
        
        // Ajouter les lignes du corps au code
        bodyLines.forEach(line => codeLines.push(line));
        
        indentLevel--;
        linesGenerated += 1 + bodyLines.length; // 1 pour la ligne "for" + nombre de lignes du corps
    }
    
    // Génération d'une boucle for..str
    function generateForStrLoop() {
        const indent = safeIndent(indentLevel);
        let iterableExpr; // Expression itérable pour la boucle for
       
        // Vérifier si des variables str sont disponibles pour être parcourues
        if (options.var_str_count > 0 && declaredVarsByType.str.length > 0) {
            // Utiliser une variable de type str parmi celles déclarées
            iterableExpr = getRandomItem(declaredVarsByType.str);
        } else {
            // Sinon, utiliser directement un littéral créé pour l'occasion
            iterableExpr = LITERALS_BY_TYPE.str();
        }
        
        // Nom pour l'itérateur
        const charVar = generateUniqueIteratorName('str');
        
        codeLines.push(`${indent}for ${charVar} in ${iterableExpr}:`);
        indentLevel++;
        
        // Corps de la boucle
        const bodyLines = generateStructureBody(indentLevel, 'for_str', { 
            loopVar: charVar,
            difficulty
        });
        
        bodyLines.forEach(line => codeLines.push(line));
        
        indentLevel--;
        linesGenerated += 1 + bodyLines.length;
    }

    
    // Génération d'une boucle while
    function generateWhileLoop() {
        const indent = safeIndent(indentLevel);
        
        // Générer une condition adaptée pour while
        const { condition, intVar } = generateCondition(['while_safe', 'int'], true);
        
        // Ajouter un compteur de sécurité avant la boucle
        const safetyCounterVar = generateUniqueVarName('int');
        codeLines.push(`${indent}${safetyCounterVar} = 5  # Limite de sécurité`);
        
        // Utiliser une condition composée avec le compteur
        codeLines.push(`${indent}while ${condition} and ${safetyCounterVar} > 0:`);
        indentLevel++;
        
        // Générer le corps de la boucle
        const bodyLines = generateStructureBody(indentLevel, 'while', { 
            conditionVar: intVar,
            difficulty
        });
        
        // Ajouter les lignes du corps au code
        bodyLines.forEach(line => codeLines.push(line));
        
        // Décrémenter le compteur de sécurité à la fin du corps
        codeLines.push(`${safeIndent(indentLevel)}${safetyCounterVar} -= 1  # Décrémenter la limite de sécurité`);
        
        // S'assurer que la variable de condition est modifiée dans la bonne direction
        codeLines.push(`${safeIndent(indentLevel)}${intVar} -= 1  # Garantir la progression vers la sortie`);
        
        indentLevel--;
        linesGenerated += 3 + bodyLines.length;
    }
    
    // Génération d'une fonction simple
    function generateFunction() {
        const indent = safeIndent(indentLevel);
        let funcName = getRandomItem(FUNCTION_NAMES);
        let params = [];
        
        // Déterminer les paramètres selon les options
        if (options.func_def_ab) {
            // Pour deux paramètres, utiliser des noms significatifs en fonction du nom de la fonction
        params = chooseAppropriateParameterNames(funcName, 2);
    } else if (options.func_def_a) {
        // Pour un paramètre, utiliser un nom significatif en fonction du nom de la fonction
        params = chooseAppropriateParameterNames(funcName, 1);
    }
        
        // Définition de la fonction
        codeLines.push(`${indent}def ${funcName}(${params.join(", ")}):`);
        indentLevel++;
        
        // Générer un corps de fonction riche avec plusieurs instructions
        const bodyLines = generateStructureBody(indentLevel, 'function', { 
            params, 
            difficulty,
            hasReturn: options.func_return,
            hasPrint: options.builtin_print
        });
        
        // Ajouter les lignes du corps au code
        bodyLines.forEach(line => codeLines.push(line));
        
        indentLevel--;
        linesGenerated += 1 + bodyLines.length; // 1 pour la ligne "def" + nombre de lignes du corps

        // Appel de la fonction (si assez de place)
        if (linesGenerated < targetLines) {
            let args = params.map(param => {
                // Générer un argument approprié selon le nom du paramètre
                if (['x', 'n', 'num', 'value'].includes(param)) {
                    return getRandomInt(1, 5);
                } else if (['text', 'message', 'string'].includes(param)) {
                    return `"exemple"`;
                } else {
                    return getRandomInt(1, 5); // Valeur par défaut
                }
            });
            codeLines.push(`${indent}${funcName}(${args.join(", ")})`);
            linesGenerated++;
        }
    }
    // Nouvelle fonction pour choisir des noms de paramètres appropriés
    function chooseAppropriateParameterNames(funcName, count) {
        // Paramètres possibles selon la catégorie de fonction
        const mathParams = ['x', 'y', 'n', 'a', 'b', 'num', 'value'];
        const dataParams = ['data', 'items', 'elements', 'values', 'collection'];
        const textParams = ['text', 'message', 'content', 'string', 'input'];
        const utilParams = ['value', 'option', 'flag', 'mode', 'config'];
        
        // Sélectionner la liste appropriée selon le nom de la fonction
        let paramList;
        if (['calculate', 'compute', 'sum', 'multiply', 'divide', 'subtract', 'average'].includes(funcName)) {
            paramList = mathParams;
        } else if (['process', 'filter', 'sort', 'update', 'transform'].includes(funcName)) {
            paramList = dataParams;
        } else if (['format', 'display', 'show', 'validate'].includes(funcName)) {
            paramList = textParams;
        } else {
            paramList = utilParams;
        }
        
        // Mélanger les paramètres et en prendre le nombre demandé
        const shuffled = [...paramList].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }

    // Génération d'une opération simple pour le corps des structures de contrôle
    function generateSimpleOperation() {
        // Opérations possibles selon les variables disponibles
        if (declaredVarsByType.int.length > 0) {
            const target = getRandomItem(declaredVarsByType.int);
            return `${target} += 1`;
        } else if (declaredVarsByType.str.length > 0) {
            const target = getRandomItem(declaredVarsByType.str);
            return `${target} = ${target} + "!"`;
        } else if (declaredVarsByType.bool.length > 0) {
            const target = getRandomItem(declaredVarsByType.bool);
            return `${target} = not ${target}`;
        } else {
            return "pass";
        }
    }
    // Fonction utilitaire pour garantir des indentations valides
    function safeIndent(level) {
        return "    ".repeat(Math.max(0, level));
    }

    function generateAppropriateStatement() {
        // Cette fonction génère une instruction adaptée au contexte et aux variables disponibles
        
        // Déterminer les types de variables disponibles
        const availableTypes = Object.keys(declaredVarsByType)
            .filter(type => declaredVarsByType[type].length > 0);
        
        if (availableTypes.length === 0) {
            return "pass  # Aucune variable disponible";
        }
        
        // Choisir un type de variable au hasard parmi ceux disponibles
        const chosenType = getRandomItem(availableTypes);
        const variable = getRandomItem(declaredVarsByType[chosenType]);
        
        // Générer une instruction adaptée au type
        return generateVariedOperation(chosenType, variable, difficulty);
        /* switch (chosenType) {
            case 'int':
                return `${variable} += ${getRandomInt(1, 3)}`;
            case 'float':
                return `${variable} *= ${parseFloat((1 + Math.random()).toFixed(2))}`;
            case 'str':
                return `${variable} += "_modifié"`;
            case 'bool':
                return `${variable} = not ${variable}`;
            case 'list':
                return `${variable}.append(${getRandomInt(1, 5)})`;
            default:
                return "pass";
        }
                */
    }



    // D'abord calculer les lignes requises pour les structures demandées
    function calculateRequiredLines() {
        let requiredLines = 0;
        let requiredVars = 0;

        // Les conditions n'ajoutent pas nécessairement de variables
        if (options.main_conditions && options.cond_if) {
            requiredLines += options.cond_if_else ? 4 : 2;
        }
        
        // Boucles - chaque boucle a besoin d'au moins une variable d'itération
        if (options.main_loops) {
            if (options.loop_for_range) {
                requiredLines += 2;
                requiredVars += 1; // Variable d'itération pour for in range
            }
            if (options.loop_for_list) {
                requiredLines += 2;
                requiredVars += 1; // Variable d'itération + besoin d'une liste
            }
            if (options.loop_for_str) {
                requiredLines += 2;
                requiredVars += 1; // Variable d'itération + besoin d'une chaîne
            }
            if (options.loop_while) {
                requiredLines += 3; // +1 pour init compteur
                requiredVars += 1; // Variable de compteur
            }
        }
        
        // Fonctions
        if (options.main_functions) {
            requiredLines += 3; // def, corps, appel
            if (options.func_def_a) requiredVars += 1; // Paramètre a
            if (options.func_def_ab) requiredVars += 1; // Paramètre b supplémentaire
            if (options.builtin_print) requiredLines += 1;
            if (options.func_return) requiredLines += 1;
        }
        
        // Mettre à jour le nombre minimum de variables dans les options
        if (options.numTotalVariablesGlobal < requiredVars) {
            options.numTotalVariablesGlobal = requiredVars;
        }

        return requiredLines;
    }

    /**
     * S'assure que toutes les variables déclarées sont utilisées au moins une fois dans le code.
     * Ajoute des opérations simples pour les variables non utilisées.
     */
    function ensureAllVariablesAreUsed() {
        // Pour chaque type de variable
        for (const type in declaredVarsByType) {
            const variables = declaredVarsByType[type];
            
            // Vérifier chaque variable pour voir si elle est utilisée
            for (const varName of variables) {
                // Vérifier si la variable est utilisée quelque part dans le code (autre que sa déclaration)
                const isUsed = codeLines.some(line => {
                    return line.includes(varName) && !line.trim().startsWith(`${varName} =`);
                });
                
                // Si non utilisée, ajouter une opération simple l'utilisant
                if (!isUsed && linesGenerated < targetLines) {
                    // Générer une opération variée adaptée au type de variable
                    const operation = generateVariedOperation(type, varName, difficulty);
                    codeLines.push(operation);
                    linesGenerated++;
                }
            }
        }
    }

    function ensureVariablesOfType(type, count) {
        while (declaredVarsByType[type].length < count) {
            const varName = generateUniqueVarName(type);
            const value = generateValueForType(type);
            codeLines.push(`${varName} = ${value}`);
            declaredVarsByType[type].push(varName);
            allDeclaredVarNames.add(varName);
            linesGenerated++;
        }
    }

    function generateAppropriateStatement() {
        // Cette fonction génère une instruction adaptée au contexte et aux variables disponibles
        
        // Déterminer les types de variables disponibles
        const availableTypes = Object.keys(declaredVarsByType)
            .filter(type => declaredVarsByType[type].length > 0);
        
        if (availableTypes.length === 0) {
            return "pass  # Aucune variable disponible";
        }
        
        // Choisir un type de variable au hasard parmi ceux disponibles
        const chosenType = getRandomItem(availableTypes);
        const variable = getRandomItem(declaredVarsByType[chosenType]);
        
        // Générer une instruction adaptée au type
        switch (chosenType) {
            case 'int':
                return `${variable} += ${getRandomInt(1, 3)}`;
            case 'float':
                return `${variable} *= ${parseFloat((1 + Math.random()).toFixed(2))}`;
            case 'str':
                return `${variable} += "_modifié"`;
            case 'bool':
                return `${variable} = not ${variable}`;
            case 'list':
                return `${variable}.append(${getRandomInt(1, 5)})`;
            default:
                return "pass";
        }
    }


        // Vérification des variables planifiées (nouvelles variables)
        for (const type in plannedVarsByType) {
            // Seules les variables planifiées qui ne sont pas des itérateurs doivent être déclarées
            const varsToCheck = plannedVarsByType[type].filter(name => 
                !name.startsWith('i') && !name.startsWith('j') && 
                !name.startsWith('char') && !name.startsWith('text')
            );
            
            for (const varName of varsToCheck) {
                let initialValue;
                switch (type) {
                    case 'int': initialValue = "0"; break;
                    case 'float': initialValue = "0.0"; break;
                    case 'str': initialValue = '""'; break;
                    case 'bool': initialValue = "False"; break;
                    case 'list': initialValue = "[]"; break;
                    default: initialValue = "None";
                }
                
                codeLines.unshift(`${varName} = ${initialValue}  # Variable planifiée initialisée`);
                linesGenerated++;
                
                // Déplacer de plannedVarsByType à declaredVarsByType
                allPlannedVarNames.delete(varName);
                declaredVarsByType[type].push(varName);
                allDeclaredVarNames.add(varName);
            }
        }

        // Vérification des variables planifiées (nouvelles variables)
        for (const type in declaredVarsByType) {
            for (const varName of declaredVarsByType[type]) {
                // Vérifier si la variable apparaît déjà dans une ligne d'initialisation
                const isAlreadyDeclared = codeLines.some(line => {
                    return line.trim().startsWith(`${varName} =`);
                });
                
                // Si non déclarée, l'initialiser avec une valeur appropriée
                if (!isAlreadyDeclared) {
                    let initialValue;
                    switch (type) {
                        case 'int': initialValue = "0"; break;
                        case 'float': initialValue = "0.0"; break;
                        case 'str': initialValue = '""'; break;
                        case 'bool': initialValue = "False"; break;
                        case 'list': initialValue = "[]"; break;
                        default: initialValue = "None";
                    }
                    
                    // Ajouter la déclaration au début du code
                    codeLines.unshift(`${varName} = ${initialValue}  # Initialisation obligatoire`);
                    linesGenerated++;
                }
            }
        }

    function finalVariableCheck() {
        // S'assurer que toutes les variables "planifiées" ont été déclarées
        for (const type in plannedVarsByType) {
            // Filtrer pour exclure les variables d'itération typiques
            const varsToCheck = plannedVarsByType[type].filter(name => 
                !name.startsWith('i') && !name.startsWith('j') && 
                !name.startsWith('char') && !name.startsWith('text')
            );
            
            for (const varName of varsToCheck) {
                console.warn(`Variable planifiée non déclarée: ${varName} (${type})`);
                declareVariable(varName, type, getDefaultValueForType(type));
            }
        }
        
        // Vérification existante pour les variables déclarées
        for (const type in declaredVarsByType) {
            for (const varName of declaredVarsByType[type]) {
                const isActuallyDeclared = codeLines.some(line => 
                    line.trim().startsWith(`${varName} =`)
                );
                
                if (!isActuallyDeclared) {
                    codeLines.unshift(`${varName} = ${getDefaultValueForType(type)}  # Initialisation obligatoire`);
                    linesGenerated++;
                }
            }
        }
    }

    function getDefaultValueForType(type) {
        switch (type) {
            case 'int': return "0";
            case 'float': return "0.0";
            case 'str': return '""';
            case 'bool': return "False";
            case 'list': return "[]";
            default: return "None";
        }
    }

    /**
     * S'assure que le nombre de variables de chaque type est conforme aux options.
     * 
     */
    function ensureVariablesForOptions() {
        // Variables pour les options sélectionnées
        if (options.var_int_count > 0) {
            ensureVariablesOfType('int', options.var_int_count);
        }
        if (options.var_float_count > 0) {
            ensureVariablesOfType('float', options.var_float_count);
        }
        if (options.var_str_count > 0) {
            ensureVariablesOfType('str', options.var_str_count);
        }
        if (options.var_list_count > 0) {
            ensureVariablesOfType('list', options.var_list_count);
        }
        if (options.var_bool_count > 0) {
            ensureVariablesOfType('bool', options.var_bool_count);
        }
        
        // Variables pour les structures
        ensureRequiredVariables();
    }

    /**
     * S'assure que les variables nécessaires aux structures de contrôle
     * (conditions, boucles, etc.) sont présentes.
     */
    function ensureRequiredVariables() {
        // Pour les conditions
        if (options.main_conditions && options.cond_if) { // replier le frame 'Ctrl' devrait vouloir dire 'pas de conditionnelles'
            if (declaredVarsByType.bool.length === 0 && declaredVarsByType.int.length === 0) {
                // Préférer créer une variable bool car plus explicite pour les conditions
                ensureVariableExists('bool'); // Utiliser la nouvelle fonction propre
            }
        }
        // Pour les boucles, la logique est maintenant gérée DANS chaque fonction de boucle.
    }
    /**
     * fonction pour ajouter des opérations simples pour compléter le nombre de lignes requis.
     * Cette fonction est appelée dans un while() pour remplir le code jusqu'à atteindre targetLines.
     * Elle choisit aléatoirement un type de variable et une variable à modifier,
     */
    function addFiller() {
    if (linesGenerated >= targetLines) return false; // Si on a atteint la limite, ne rien faire

    // Garder trace des dernières opérations pour éviter les répétitions
    // L'objet window global à l'environnement du navigateur permet de se souvenir des dernières générations
    if (!window._lastFillerOps) window._lastFillerOps = [];

    // Trouver les types disponibles : quel type de variable modifier
    const availableTypes = Object.keys(declaredVarsByType).filter(type => 
        declaredVarsByType[type].length > 0
    );
    
    if (availableTypes.length === 0) {
        codeLines.push("# Pas de variables disponibles pour plus d'opérations");
        linesGenerated++;
        return true;
    }

    // Choisir un type aléatoire, en évitant de répéter le dernier type utilisé si possible
    let type;
    if (window._lastFillerOps.length > 0 && availableTypes.length > 1) {
        const lastType = window._lastFillerOps[window._lastFillerOps.length - 1].type;
        type = getRandomItem(availableTypes.filter(t => t !== lastType));
    } else {
        type = getRandomItem(availableTypes);
    }
    
    // Choisir une variable aléatoire de ce type, en évitant de répéter la dernière variable si possible
    let varToModify;
    if (window._lastFillerOps.length > 0 && declaredVarsByType[type].length > 1) {
        const lastVar = window._lastFillerOps[window._lastFillerOps.length - 1].variable;
        varToModify = getRandomItem(declaredVarsByType[type].filter(v => v !== lastVar));
    } else {
        varToModify = getRandomItem(declaredVarsByType[type]);
    }

    // Générer une opération variée pour cette variable
    // Essayer plusieurs fois de générer une opération différente
    let operation;
    let isRepeat = false;
    const maxAttempts = 3;
    let attempts = 0;

    do {
        operation = generateVariedOperation(type, varToModify, difficulty);
        
        // Vérifier si cette opération est identique à une des dernières
        isRepeat = window._lastFillerOps.some(op => op.operation === operation);
        
        attempts++;
    } while (isRepeat && attempts < maxAttempts);

    // Si après plusieurs tentatives on a toujours une répétition, forcer une variation
    if (isRepeat) {
        // Stratégie 1: Ajouter un commentaire unique pour rendre l'opération différente
        const uniqueId = Math.random().toString(36).substring(2, 5);
        operation = operation.replace(/\s*#.*$/, '') + `  # variation ${uniqueId}`;
        
        // Stratégie 2 (alternative): Essayer d'inverser l'ordre des opérandes si possible
        if (operation.includes('=') && operation.includes('+')) {
            const parts = operation.split('=');
            if (parts.length === 2) {
                const leftSide = parts[0].trim();
                const rightSide = parts[1].trim();
                
                // Si le format est "var = var + x", essayer "var = x + var"
                if (rightSide.startsWith(leftSide + ' +')) {
                    const addParts = rightSide.split('+');
                    if (addParts.length === 2) {
                        operation = `${leftSide} = ${addParts[1].trim()} + ${leftSide}`;
                    }
                }
            }
        }
    }
    
    // Mémoriser cette opération pour éviter les répétitions
    window._lastFillerOps.push({ type, variable: varToModify, operation });
    // Garder seulement les 3 dernières en mémoire
    if (window._lastFillerOps.length > 5) window._lastFillerOps.shift();

    codeLines.push(operation);
    linesGenerated++;
    return true;
}

    function generateVariedOperation(type, varName, difficulty) {
        // Tableau d'opérations possibles selon le type
        const operations = {
            'int': [
                // Incrémentation avec différentes syntaxes
                () => `${varName} = ${varName} + ${getRandomInt(1, difficulty+1)}`,
                () => `${varName} = ${getRandomInt(1, difficulty+1)} + ${varName}`,
                // Autres opérations arithmétiques
                () => `${varName} = ${varName} * ${getRandomInt(2, difficulty+1)}`,
                () => `${varName} = ${getRandomInt(2, difficulty+1)} *  ${varName}`,
                () => `${varName} = ${varName} // ${getRandomInt(2, difficulty+1)}`,
                // Avec commentaire
                () => `${varName} += ${getRandomInt(1, 3)}  # Incrémenter ${varName}`,
                () => `${varName} -= ${getRandomInt(1, 3)}  # Décrémenter ${varName}`,
                // Affectation conditionnelle
                ...(difficulty >= 5 ? [() => `${varName} = ${getRandomInt(-10, 10)} if ${varName} < 0 else ${varName} # syntaxe compacte (niveau plus avancé)`] : []),
                () => `${varName} += ${getRandomInt(1, 5)}`,
                // spread operator : expression ternaire pour condition "... sinon : rien"
                ...(difficulty >= 5 ? [() => `${varName} *= ${getRandomInt(2, 3)}`] : []),
                ...(difficulty >= 5 ? [() => `${varName} //= ${getRandomInt(2, 3)}`] : []),
                ...(difficulty >= 5 ? [() => `${varName} %= ${getRandomInt(2, 3)}`] : [])
            ],
            'str': [
                // Concaténation avec différentes syntaxes
                () => `${varName} += " ${getRandomItem(["texte", "donnée", "valeur", "info"])}"`,
                () => `${varName} = ${varName} + " ${getRandomItem(["ajout", "extension", "suite"])}"`,
                // Remplacement
                () => {
                    const randomIndex = getRandomInt(0, 2); // Limiter à 3 premiers caractères pour éviter IndexError
                    return `${varName} = ${varName}.replace(${varName}[${randomIndex}], ${varName}[${randomIndex}].upper())  # Remplace le caractère à l'index ${randomIndex}`;
                },
                // suppression de caractères
                () => {
                    const randomIndex = getRandomInt(0, 1); // Éviter de supprimer trop de caractères
                    return `${varName} = ${varName}.replace(${varName}[${randomIndex}], "")  # Supprime un caractère`;
                },
                // Avec commentaire
                () => `${varName} += "!!!"  # Ajouter une emphase !!!`,
                // Opérations conditionnelles
                ...(difficulty >= 5 ? [() => `${varName} += " (modifié)" if len(${varName}) < 20 else ""`] : []),
                // Insertion de texte
                () => `${varName} = "Début: " + ${varName}`,
                () => `${varName} = ${varName} + " Fin"`,
                // Opérations avancées
                ...(difficulty >= 3 ? [() => `${varName} = ${varName}.upper()`] : []),
                ...(difficulty >= 3 ? [() => `${varName} = ${varName}.lower()`] : []),
                ...(difficulty >= 3 ? [() => `${varName} = ${varName}.capitalize()`] : []),
                ...(difficulty >= 3 ? [() => `${varName} = ${varName}.title()`] : [])
            ],
            'list': [
                // Ajout d'éléments à la liste
                () => `${varName}.append(${getRandomInt(1, 10)})`,
                () => `${varName}.extend([${getRandomInt(1, difficulty)}, ${getRandomInt(difficulty+1, difficulty+5 )}])`,
                // si la liste est non vide: on accède à des positions spécifiques
                ...(declaredVarsByType.list.length > 0 ? [
                    () => `${varName}[${getRandomInt(0, declaredVarsByType.list.length - 1)}] = ${getRandomInt(1, difficulty+6)}`] : []),
                // Insertion d'éléments
                ...(difficulty >= 4 ? [
                    () => `${varName}.insert(${getRandomInt(0, declaredVarsByType.list.length - 1)}, ${getRandomInt(-difficulty, +difficulty)})`] : []),
                // Suppression d'éléments
                ...(declaredVarsByType.list.length > 0 ? [
                    () => `${varName}.remove(${getRandomInt(0, declaredVarsByType.list.length - 1)})  # Suppression d'un élément `] : [])
            ],
            'bool': [
                // Inversion de la valeur booléenne
                () => `${varName} = not ${varName}`,
                // comparaison de valeurs aléatoires
                () => `${varName} = ${getRandomInt(-difficulty,difficulty)} ${getRandomItem(['==', '!=', '<', '>', '<=', '>='])} ${getRandomInt(-difficulty, difficulty)}`,
                // Opérations logiques de base
                ...(difficulty >= 2 ? [
                    () => `${varName} = ${getRandomItem(['True', 'False'])} ${getRandomItem(['or','and'])} ${getRandomItem(['True', 'False'])}  # Opération logique`]: []),
                // Opérations logiques
                ...(difficulty >= 3 ? [
                    () => `${varName} = ${varName} ${getRandomItem(['or','and'])} ${getRandomItem(['True', 'False'])}  # Opération logique`]: []), 
                // Affectation conditionnelle avancée
                ...(difficulty >= 4 ? [
                    () => `${varName} = ${varName} if ${getRandomItem(['True', 'False'])} else not ${varName}  # Opération conditionnelle avancée`]: []),
                // Opérations avancées
                ...(difficulty >= 5 ? [
                    () => `${varName} = ${varName} != ${getRandomItem(['True', 'False'])}  # Opération avancée`]: [])
                ]
                // Autres...
        };
        
        // Vérifier si une opération identique a déjà été générée récemment
        let operation;
        let isRepeat = false;
        const maxAttempts = 5;
        let attempts = 0;
        
        do {
            // Sélectionner une opération appropriée au niveau de difficulté
            const availableOps = operations[type] || [];
            const opIndex = Math.min(
                Math.floor(Math.random() * availableOps.length),
                Math.floor(difficulty / 2) * 2
            );
            
            operation = availableOps[opIndex] ? availableOps[opIndex]() : `${varName} = ${varName}`;
            
            // Vérifier si cette opération est identique à la dernière
            isRepeat = window._lastFillerOps && 
                    window._lastFillerOps.length > 0 && 
                    window._lastFillerOps[window._lastFillerOps.length - 1].operation === operation;
            
            attempts++;
        } while (isRepeat && attempts < maxAttempts);
        
        // Si après plusieurs tentatives on a toujours une répétition, ajouter un commentaire unique
        // remplacer tout commentaire Python existant par un nouveau commentaire improbable
        if (isRepeat) {
            operation = operation.replace(/\s*#.*$/, '') + `  # variation ${Math.random().toString(36).substr(2, 3)}`;
        }
        // vérifier si l'opération existe déjà dans codeLines
        let exactLineExists = codeLines.some(line => 
            line.trim() === operation.trim()
        );

        // Si l'opération existe déjà dans le code, forcer une variation
        if (exactLineExists) {
            // Extract current numeric value if present
            const currentNumberMatch = operation.match(/\d+(?![^)]*\))/);
            const currentNumber = currentNumberMatch ? parseInt(currentNumberMatch[0]) : null;
            
            // Extract current operator if present
            const operatorMatch = operation.match(/[+\-*\/\/%]=?/);
            const currentOperator = operatorMatch ? operatorMatch[0] : null;
            
            if (currentNumber !== null) {
                // Generate a new number guaranteed to be different
                let newValue;
                do {
                    newValue = getRandomInt(1, 5);
                } while (newValue === currentNumber);
                
                // Replace the number
                operation = operation.replace(/\d+(?![^)]*\))/, newValue);
            } 
            else if (currentOperator) {
                // Generate a different operator
                const operators = ['+', '-', '*', '//'];
                const newOperator = getRandomItem(operators.filter(op => op !== currentOperator));
                operation = operation.replace(currentOperator, newOperator);
            }
            else {
                // Fallback: add unique comment
                operation = operation.replace(/\s*#.*$/, '') + 
                    `  # unique_${Math.random().toString(36).substr(2, 5)}`;
            }
        }
        // Handle invalid string operations more comprehensively
        if (type === 'str') {
            // Regex pour détecter les opérateurs arithmétiques invalides pour les chaînes (sauf + et *)
            const invalidArithmeticRegex = /([^\w\s"'])\s*=/; // Détecte -=, /=, //=, %=
            const invalidBinaryOpRegex = /\s([-\/]|[/]{2}|%)\s/; // Détecte -, /, //, % entre opérandes

            if (invalidArithmeticRegex.test(operation) || invalidBinaryOpRegex.test(operation)) {
                // Si l'opération est invalide, la remplacer par une opération de chaîne valide
                // Generate a more varied replacement based on difficulty
                let chosenLetter = varName[getRandomInt(0, varName.length - 1)];
                const replacements = [
                    `${varName} += " modifié"`,
                    `${varName} = ${varName} + "_suffix"`,
                    `${varName} = "prefix_" + ${varName}`,
                    `${varName} = ${varName}.replace(${varName}[0], ${varName}[0].upper())`,  // Remplacer la première lettre
                    `${varName} = ${varName}[0] + ${varName}`, // Add first character again
                    `${varName} = ${varName}.replace("${chosenLetter}", "${chosenLetter.toUpperCase()}")`,  // Remplacer une lettre aléatoire par sa majuscule
                ];
                
                // For higher difficulty, add more complex string operations
                if (difficulty >= 3) {
                    replacements.push(`${varName} = ${varName}.upper()`);
                    replacements.push(`${varName} = ${varName}.capitalize()`);
                }
                
                // Choose a random replacement
                operation = getRandomItem(replacements);
                
                // Add a comment explaining the substitution
                operation += "  # Opération de chaîne valide";
            }
        }
        return operation; //[type][opIndex]();
    }

    ///////////////////////////////////////////////////////////////////////
    // ----------------- EXÉCUTION DE LA GÉNÉRATION ----------------------

    // 1. Calculer le nombre de lignes requises et initialiser les variables de base
    // et mettre à jour options.numTotalVariablesGlobal si nécessaire
    calculateRequiredLines();
    
    // 2. S'assurer que le bon nombre de variables est créé pour chaque type
    ensureVariablesForOptions();
    ensureListVariablesCount(); // Nouvelle fonction pour garantir le bon nombre de listes
    
    // 3. Générer les structures de contrôle avec des corps enrichis
    generateControlStructures();
    
    // 4. S'assurer que toutes les variables déclarées sont utilisées
    ensureAllVariablesAreUsed();
    
    // 5. Compléter avec des opérations variées pour atteindre le nombre de lignes cible
    while (linesGenerated < targetLines) {
        if (!addFiller()) break; // Sortir si impossible d'ajouter plus d'opérations
    }
    
    // 6. Vérification finale
    finalVariableCheck();
    
    // Vérifier que le code n'est pas vide?? just in case
    if (codeLines.length === 0) {
        codeLines.push("x = 10  # Valeur par défaut");
        codeLines.push("y = 20  # Valeur par défaut");
        codeLines.push("resultat = x + y");
    }

    // Finalement... Retour du code généré ...
    return codeLines.join("\n");
}


/*
*************************************************************************************************************
*************************************************************************************************************
*/
// pour phase 0: Garantir les variables nécessaires pour les structures
function ensureVariableForStructure(type, context) {
    // type: 'condition', 'loop_body', 'function_body'
    const { declaredVarsByType, allDeclaredVarNames, codeLines, linesGenerated } = context;
    
    // Vérifier s'il y a des variables utilisables pour cette structure
    let hasValidVar = false;
    
    switch(type) {
        case 'condition': 
        // Une condition a besoin d'un booléen ou d'une variable comparable
        hasValidVar = declaredVarsByType.bool.length > 0 || declaredVarsByType.int.length > 0;
        break;
        case 'loop_body':
        // Un corps de boucle a besoin d'au moins une variable modifiable
        hasValidVar = declaredVarsByType.int.length > 0 || declaredVarsByType.list.length > 0;
        break;
        case 'function_body':
        // Une fonction a besoin de variables pour son corps
        hasValidVar = declaredVarsByType.int.length > 0 || context.funcParams?.length > 0;
        break;
    }
    
    // Si pas de variable valide, créer une appropriée
    if (!hasValidVar) {
        let varType, varValue;
        
        switch(type) {
        case 'condition':
            varType = 'bool';
            varValue = 'True';
            break;
        case 'loop_body':
        case 'function_body':
            varType = 'int';
            varValue = '0';
            break;
        }
        
        const varName = generateUniqueVarName(varType);
        codeLines.push(`${varName} = ${varValue}`);
        declaredVarsByType[varType].push(varName);
        allDeclaredVarNames.add(varName);
        linesGenerated++;
        
        return varName;
    }
    
    // Sinon, retourner une variable existante appropriée
    switch(type) {
        case 'condition':
        return declaredVarsByType.bool.length > 0 
            ? declaredVarsByType.bool[0]
            : declaredVarsByType.int[0];
        case 'loop_body':
        case 'function_body':
        return declaredVarsByType.int.length > 0 
            ? declaredVarsByType.int[0] 
            : declaredVarsByType.list[0];
    }
}

function planVariable(type) {
    const name = generateUniqueVarName(type);
    allPlannedVarNames.add(name);
    plannedVarsByType[type].push(name);
    return name;
}

function old_declareVariable(name, type, value) {
    // Générer la ligne de code de l'initialisation
    codeLines.unshift(`${name} = ${value}`);
    // Déplacer de "planifiée" à "déclarée" si nécessaire
    if (allPlannedVarNames.has(name)) {
        allPlannedVarNames.delete(name);
        const index = plannedVarsByType[type].indexOf(name); // trouver l'index de la variable planifiée
        if (index > -1) plannedVarsByType[type].splice(index, 1); // supprimer de la liste planifiée
    }
    // Ajouter aux registres des variables déclarées
    if (!allDeclaredVarNames.has(name)) {
        allDeclaredVarNames.add(name);
        declaredVarsByType[type].push(name);
    }
    linesGenerated++;
    return name;
}

function old_ensureVariableExists(type) {
    // Si on doit créer une variable, vérifier si on est dans une structure
    // qui nécessite de l'ajouter AVANT la structure plutôt que dedans
    
    // Si on est à un niveau d'indentation > 0, on est dans une structure
    if (indentLevel > 0) {
        // Trouver d'abord une variable existante
        if (declaredVarsByType[type].length > 0) {
            return getRandomItem(declaredVarsByType[type]);
        }
        
        // Sinon, créer une variable avant la boucle
        // Sauvegarder la position actuelle dans codeLines
        const currentPosition = codeLines.length;
        const name = generateUniqueVarName(type);
        
        // Trouver l'endroit où insérer la déclaration 
        // Logique n°1: juste avant la dernière ligne indentée
        let insertPosition = currentPosition - 1;
        while (insertPosition >= 0 && codeLines[insertPosition].startsWith("    ")) {
            insertPosition--;
        }
        
        // Insérer la déclaration en début de "file" des initialisations
        codeLines.unshift(`${name} = ${LITERALS_BY_TYPE[type](difficulty)}`);
        declaredVarsByType[type].push(name);
        allDeclaredVarNames.add(name);
        linesGenerated++;
        
        return name;
    }
    // Si on est à l'extérieur de toute structure, on peut créer la variable normalement
    // Si on a des variables planifiées et qu'on préfère les utiliser
    if (preferPlanned && plannedVarsByType[type].length > 0) {
        const name = getRandomItem(plannedVarsByType[type]);
        // Créer la variable avec une valeur par défaut
        return declareVariable(name, type, LITERALS_BY_TYPE[type](difficulty));
    }
    // Sinon, créer une nouvelle variable
    const name = generateUniqueVarName(type);
    return declareVariable(name, type, LITERALS_BY_TYPE[type](difficulty));
}

// Exporter la fonction principale
window.codeGenerator = {
    generateRandomPythonCode
};
