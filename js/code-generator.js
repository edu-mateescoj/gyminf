function generateRandomPythonCode(options) {
    console.log("Début de generateRandomPythonCode avec options :", JSON.parse(JSON.stringify(options)));

    // --- CONSTANTES POUR LA GÉNÉRATION ---

    const FUNCTION_NAMES = [
    'calculate', 'compute', 'process', 'transform', 'convert',
    'analyze', 'validate', 'check', 'verify', 'format',
    'get_data', 'update', 'create', 'generate', 'build',
    'initialize', 'setup', 'configure', 'prepare', 'find',
    'search', 'retrieve', 'fetch', 'display', 'show',
    'sum', 'multiply', 'divide', 'subtract', 'compare',
    'filter', 'sort', 'count', 'average', 'normalize'
    ];

    // --- CONSTANTES PARTAGÉES POUR LES NOMS ET TYPES ---

    // Noms de variables par type pour l'inférence cohérente
    const INT_VAR_NAMES = ['count', 'total', 'num', 'value', 'index', 'i', 'j', 'k', 'x', 'y', 'z', 'num1', 'num2', 'sum'];
    const FLOAT_VAR_NAMES = ['price', 'rate', 'ratio', 'avg', 'score', 'factor', 'pi', 'epsilon', 'scale'];
    const STR_VAR_NAMES = ['name', 'text', 'message', 'word', 'label', 'title', 'code', 'prefix', 'suffix', 'content', 'string', 'input'];
    const LIST_VAR_NAMES = ['items', 'values', 'data', 'elements', 'numbers', 'results', 'scores', 'names', 'collection', 'list', 'array'];
    const BOOL_VAR_NAMES = ['is_valid', 'found', 'done', 'active', 'enabled', 'exists', 'has_value', 'ready', 'flag', 'mode'];

    // Mise à jour de VAR_NAMES_BY_TYPE pour utiliser ces constantes
    const VAR_NAMES_BY_TYPE = {
        int: INT_VAR_NAMES,
        float: FLOAT_VAR_NAMES,
        str: STR_VAR_NAMES,
        list: LIST_VAR_NAMES,
        bool: BOOL_VAR_NAMES
    };

    // Catégories de fonctions pour l'inférence de paramètres
    const MATH_FUNCTIONS = ['calculate', 'compute', 'multiply', 'divide', 'subtract', 'average', 'sum'];
    const DATA_FUNCTIONS = ['process', 'filter', 'sort', 'update', 'analyze', 'count'];
    const TEXT_FUNCTIONS = ['format', 'display', 'show', 'validate', 'check', 'verify'];
    const UTIL_FUNCTIONS = ['configure', 'setup', 'initialize', 'run', 'prepare'];
    const GENERIC_FUNCTIONS = ['execute', 'handle', 'manage', 'control', 'transform', 'convert'];
    
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
        let baseName = getRandomItem(availableNames) || type;
        let newName;
        do {
            newName = `${baseName}_${counter}`;
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
    function declareVariable(type, value = null) {
        const name = generateUniqueVarName(type);
        const finalValue = value !== null ? value : LITERALS_BY_TYPE[type](difficulty, 'int');
        
        // Ajoute toujours l'initialisation au début du tableau de lignes de code.
        codeLines.unshift(`${name} = ${finalValue}`);
        
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
        let currentListCount = declaredVarsByType.list.length;
        
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
            const listValue = generateDiverseList(itemTypes, difficulty);
            const listVar = declareVariable('list', listValue);
            currentListCount++;
            // S'assurer que la liste est utilisée quelque part dans le code
            ensureListVariableIsUsed(listVar);
        }
    }
    /** 
     * Assure qu'une variable de liste est utilisée dans le code.
     * Si la variable n'est pas utilisée de manière significative, ajoute une opération conditionnelle
     * pour l'utiliser, comme un append ou un print.
     * @param {string} listVarName - Le nom de la variable de liste à vérifier.
     * @modifies {codeLines} - Modifie le tableau global codeLines en y ajoutant des opérations.
     * @returns {void}
    */
    // Générer des myList.append(random) ou print(myList[0]) conditionnels sur len() > 0 si builtins choisis
    // pour le cas où la liste est là mais pas *vraiment* utilisée
    function ensureListVariableIsUsed(listVarName) {
        // Vérifier d'abord si la variable est déjà utilisée dans le code sans avoir été déclarée
        const isUsed = codeLines.some(line => {
        // Ligne qui n'est pas une déclaration mais contient le nom de variable
        const isNotDeclaration = !line.trim().startsWith(`${listVarName} =`);
        
        // Utilisation significative: méthodes de liste, indexation, etc.
        const isSignificantUse = 
            line.includes(`${listVarName}.append(`) || 
            line.includes(`${listVarName}.extend(`) ||
            line.includes(`${listVarName}[`) ||
            line.includes(`for `) && line.includes(` in ${listVarName}:`);
        
        //
        return isNotDeclaration && line.includes(listVarName) && isSignificantUse;
    });
        // Si la variable n'est pas utilisée de façon significative, ajouter une utilisation
        if (!isUsed) {
            const useAdvancedOps = difficulty >= 4 || options.builtin_isinstance || options.builtin_len;
        
            // Ajouter une opération utilisant cette liste
        /*    const operations = [
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
          */
            const operations = [];

            // Opération basique toujours disponible
            operations.push(() => {
                codeLines.push(`${listVarName}.append(${getRandomInt(1, 10)})`);
                linesGenerated++;
            });
            
            // Opérations avancées conditionnelles
            if (useAdvancedOps) {
                operations.push(() => {
                    codeLines.push(`if len(${listVarName}) > 0:`);
                    const indent = safeIndent(1);
                    codeLines.push(`${indent}print(${listVarName}[0])`);
                    linesGenerated += 2;
                });
            }
            // Exécuter une opération aléatoire
            getRandomItem(operations)();
        }
    }

    // Générer une valeur pour un type donné
    function generateValueForType(type) {
        return LITERALS_BY_TYPE[type](difficulty);
    }
    
    /**
     * Génère une liste diversifiée d'éléments.
     * @param {Array<string>} allowedTypes - Les types de données autorisés pour les éléments de la liste.
     * @param {number} difficulty - Le niveau de difficulté pour la génération des éléments.
     * @returns {string} - Une représentation en chaîne de la liste générée.
     */
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

    // --- ANCIENNE GÉNÉRATION DES ÉLÉMENTS DE SYNTAXE ---

    // Phase 1 : Génération des variables selon les options
    function generateInitialVariables() {
        const typesToGenerate = [];
        
        // Déterminer les types à générer selon les options
        if (options.var_int_count) typesToGenerate.push({ type: 'int', count: options.var_int_count });
        if (options.var_float_count) typesToGenerate.push({ type: 'float', count: options.var_float_count });
        if (options.var_str_count) typesToGenerate.push({ type: 'str', count: options.var_str_count });
        if (options.var_list_count) typesToGenerate.push({ type: 'list', count: options.var_list_count });
        if (options.var_bool_count) typesToGenerate.push({ type: 'bool', count: options.var_bool_count });
 
        shuffleArray(typesToGenerate);

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
    /**
     * Génère une condition basée sur les variables disponibles.
     * @param {Array<string>} varTypes - Les types de variables à prendre en compte.
     * @param {boolean} preferExisting - Indique s'il faut privilégier les variables existantes.
     * @returns {string|null} - La condition générée ou null si aucune condition n'est trouvée.
     */
    function generateCondition(varTypes = ['int', 'bool', 'str', 'list'], preferExisting = true) {
        // --- AVEC CONDITIONS PRENANT EN COMPTE DIFFERENTS TYPES ---
        const possibleConditions = [];

        // 1. Collecter toutes les conditions possibles au lieu de s'arrêter à la première.
        
        // Conditions basées sur les booléens
        if (varTypes.includes('bool') && declaredVarsByType.bool.length > 0 && preferExisting) {
            declaredVarsByType.bool.forEach(boolVar => {
                possibleConditions.push(boolVar);
                possibleConditions.push(`not ${boolVar}`);
                possibleConditions.push(`True == ${boolVar}`);
                possibleConditions.push(`${boolVar} == False`);
                possibleConditions.push(`${boolVar} != True`);
                possibleConditions.push(`False != ${boolVar}`);
                possibleConditions.push(`(${getRandomItem(possibleConditions)} ${getRandomItem(['and', 'or'])} ${getRandomItem(possibleConditions)})`);
                /* déjà essayé mais moche
                possibleConditions.push(`${boolVar} == ${boolVar} or True`);
                possibleConditions.push(`${boolVar} == ${boolVar} or False`);
                */
            });
        }

        // Conditions basées sur les listes
        if (varTypes.includes('list') && declaredVarsByType.list.length > 0 && preferExisting) {
            const listVar = getRandomItem(declaredVarsByType.list);
            const compareLength = getRandomInt(0, 3);
            const compareOp = getRandomItem(['>', '==', '<=']);
            possibleConditions.push(`len(${listVar}) ${compareOp} ${compareLength}`);
            
            const valueToFind = getRandomInt(1, 10);
            possibleConditions.push(`${valueToFind} in ${listVar}`);
        }

        // Conditions basées sur les chaînes
        if (varTypes.includes('str') && declaredVarsByType.str.length > 0 && preferExisting) {
            const strVar = getRandomItem(declaredVarsByType.str);
            possibleConditions.push(`len(${strVar}) > ${getRandomInt(3, 8)}`);

            const charToFind = getRandomItem(['a', 'e', 'i', 'o', 'u', 'y']);
            possibleConditions.push(`"${charToFind}" in ${strVar}`);
        }

        // Conditions basées sur les entiers
        if (varTypes.includes('int') && declaredVarsByType.int.length > 0 && preferExisting) {
            const intVar = getRandomItem(declaredVarsByType.int);
            if (varTypes.includes('while_safe')) {
                possibleConditions.push(`${intVar} > 0`);
            } else {
                const compareValue = getRandomInt(-5, 5);
                const compareOp = getRandomItem(['>', '<', '==', '!=']);
                possibleConditions.push(`${intVar} ${compareOp} ${compareValue}`);
            }
        }

        let condition = null;
        let intVar = null;

        // 2. Choisir une condition au hasard parmi toutes celles collectées
        if (possibleConditions.length > 0) {
            condition = getRandomItem(possibleConditions);
        } 
        // 3. Si aucune condition n'a pu être créée (fallback), en créer une nouvelle.
        else {
            if (varTypes.includes('bool')) {
                const boolVar = generateUniqueVarName('bool');
                codeLines.push(`${boolVar} = ${getRandomItem(["True", "False"])}`);
                declaredVarsByType.bool.push(boolVar);
                allDeclaredVarNames.add(boolVar);
                linesGenerated++;
                condition = boolVar;
            } else if (varTypes.includes('int') || varTypes.includes('while_safe')) {
                const newIntVar = generateUniqueVarName('int');
                const value = varTypes.includes('while_safe') ? getRandomInt(3, 5) : getRandomInt(-5, 5);
                codeLines.push(`${newIntVar} = ${value}`);
                declaredVarsByType.int.push(newIntVar);
                allDeclaredVarNames.add(newIntVar);
                linesGenerated++;
                condition = `${newIntVar} > 0`;
            }
        }
        
        // Extraire la variable pour les boucles while si nécessaire
        if (condition && condition.includes('>')) {
            intVar = condition.split('>')[0].trim();
        }

        return { condition, intVar };
    }
    
    function generateControlStructures() {
   
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
    if (options.main_functions && (options.func_def_simple || options.func_def_a || options.func_def_ab)) {
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
     * @param {Object} contextOptions - Options de génération comme le niveau de difficulté
     * @returns {Array<string>} - Tableau de lignes de code pour le corps
     */
    function generateStructureBody(indentLevel, contextType, contextOptions = {}) {
        // Calculer le nombre d'instructions selon la difficulté
        const structureDifficulty = contextOptions.difficulty || difficulty;
        const instructionCount = 1 + Math.floor(structureDifficulty / 3);
    
        const indent = safeIndent(indentLevel);
        const bodyLines = [];
        
        // Ensemble pour suivre les opérations déjà ajoutées dans ce corps
        const addedOperations = new Set();

            
        // Adapter le comportement selon le contexte
        switch (contextType) {
            case 'for_range': {
            // Pour une boucle for sur range, utiliser la variable d'itération
            const loopVar = contextOptions.loopVar;
            
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
                const loopVar = contextOptions.loopVar;
                
                // Déterminer le type de variable à modifier (dépend du contenu de la liste)
                const targetType = Math.random() > 0.4 ? 'int' : 'str';
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
                const charVar = contextOptions.loopVar;
                const targetVar = ensureVariableExists('str');
                const countVar = ensureVariableExists('int');

                for (let i = 0; i < instructionCount; i++) {
                    if (i%2 === 0) {
                        // Première instruction toujours une concaténation?
                        bodyLines.push(`${indent}${targetVar} = ${targetVar} + ${charVar}`);
                        bodyLines.push(`${indent}${generateVariedOperation('str', targetVar, difficulty).replace(/;$/, '')}`);
                    } else if (structureDifficulty >= 3 && Math.random() > 0.5) {
                        // Concaténation conditionnelle pour difficulté moyenne+
                        bodyLines.push(`${indent}if ${charVar} in "aeiouy":`);
                        bodyLines.push(`${indent}    ${targetVar} += ${charVar}.upper()`);
                    } else {
                        // Utiliser generateVariedOperation pour les autres instructions
                        bodyLines.push(`${indent}${generateVariedOperation('str', targetVar, structureDifficulty).replace(/;$/, '')}`);
                    }
                }
                break;
            }
            case 'function': {
                const params = contextOptions.params || [];
                const paramTypes = contextOptions.paramTypes || params.map(() => 'int'); // Par défaut, considérer int
    
                // Un nom de variable locale pour les calculs internes
                const localResultVar = getRandomItem(["local_result","func_output","result","output"]); 
                
                // Plus de variété dans les opérations du corps de fonction
                const operations = [];
                
                if (params.length > 0) {
                    // La première instruction utilise un paramètre, c'est crucial.
                    const firstParam = params[0];
                    const firstType = paramTypes[0]; // Utiliser le type du premier paramètre

                    // Opération de base qui dépend du type probable du paramètre
                    switch (firstType) {
                        case 'str':
                            // Opérations sur chaînes
                            let chosenLetterParam = firstParam[getRandomInt(0, firstParam.length - 1)];
                            const stringOps = [
                                `${indent}${localResultVar} = ${firstParam}.upper()`,
                                `${indent}${localResultVar} = ${firstParam} + " processed"`,
                                `${indent}${localResultVar} = ${firstParam}.replace("${chosenLetterParam}", "${chosenLetterParam.toUpperCase()}")`,  // Remplacer une lettre aléatoire par sa majuscule
                                `${indent}${localResultVar} = ${firstParam}[${getRandomInt(0, firstParam.length - 1)}] + ${firstParam}`
                            ];
                            operations.push(getRandomItem(stringOps));
                            break;
                            
                        case 'list':
                            // Initialiser avant toute utilisation
                            operations.push(`${indent}${localResultVar} = []`);

                            // Opérations sur listes - conditionnées par les options ou la difficulté
                            const useAdvancedListOps = contextOptions.difficulty >= 4 || options.builtin_isinstance || options.builtin_len;
                            
                            // Version basique des opérations sur listes (sans len/isinstance)
                            const basicListOps = [
                                `${indent}${localResultVar}.append(${getRandomInt(1, 5)})`,
                                `${indent}if ${firstParam}:  # Vérifier que la liste n'est pas vide`,
                                `${indent}    ${localResultVar} = ${firstParam}[0]`,
                                `${indent}else:`,
                                `${indent}    ${localResultVar} = 0`
                            ];
                            
                            // Version avancée des opérations sur listes (avec len/isinstance)
                            const advancedListOps1 = [
                                `${indent}if isinstance(${localResultVar}, list):`,
                                `${indent}    ${localResultVar}.append(${getRandomInt(1, 5)})`,
                                `${indent}else:`,
                                `${indent}    ${localResultVar} = [${localResultVar}]`
                            ];
                            const advancedListOps2 = [
                                `${indent}if len(${firstParam}) > 0:`,
                                `${indent}    ${localResultVar} = ${firstParam}[0]`,
                                `${indent}else:`,
                                `${indent}    ${localResultVar} = 0`
                            ];
                            let selectedOps;
                            if (useAdvancedListOps) {
                                selectedOps = getRandomItem([advancedListOps1, advancedListOps2]);
                            } else {
                                selectedOps = basicListOps;
                            }
                            // Ajouter UNIQUEMENT les opérations sélectionnées
                            selectedOps.forEach(op => operations.push(op));
                            break;

                        case 'bool':
                            // Cas spécifique pour les booléens pour éviter les opérations arithmétiques non désirées
                            const boolOps = [
                                `${indent}${localResultVar} = not ${firstParam}`,
                                `${indent}${localResultVar} = ${firstParam} and ${getRandomItem(['True', 'False'])}`,
                                `${indent}${localResultVar} = ${firstParam} or ${getRandomItem(['True', 'False'])}`
                            ];
                            operations.push(getRandomItem(boolOps));
                            break;

                        case 'int':
                        case 'float':
                        default:
                            // Opérations arithmétiques avec paramètre(s)
                            if (params.length >= 2 && ['int', 'float'].includes(paramTypes[1])) {
                                // Si on a deux paramètres numériques, on peut faire des opérations entre eux
                                const secondParam = params[1];
                                const arithmeticOps = [
                                    `${indent}${localResultVar} = ${firstParam} + ${secondParam}`,
                                    `${indent}${localResultVar} = ${firstParam} - ${secondParam}`,
                                    `${indent}${localResultVar} = ${firstParam} * ${secondParam}`,
                                    `${indent}if ${secondParam} != 0:`,
                                    `${indent}    ${localResultVar} = ${firstParam} / ${secondParam}`,
                                    `${indent}else:`,
                                    `${indent}    ${localResultVar} = ${firstParam}`
                                ];
                                // Choisir entre division sécurisée et autre opération
                                if (Math.random() > 0.5) {
                                    operations.push(getRandomItem(arithmeticOps.slice(0, 3)));
                                } else {
                                    operations.push(...arithmeticOps.slice(3));
                                }
                            } else {
                                // Opérations arithmétiques variées avec un paramètre numérique
                                const mathConstant = Math.floor(Math.random() * 5) + 2; // Nombre entre 2 et 6
                                const arithmeticOps = [
                                    `${indent}${localResultVar} = ${firstParam} * ${mathConstant}`,
                                    `${indent}${localResultVar} = ${firstParam} + ${mathConstant}`,
                                    `${indent}${localResultVar} = ${firstParam} - ${mathConstant}`,
                                    `${indent}${localResultVar} = ${firstParam} ** 2`,  // Carré
                                    `${indent}${localResultVar} = ${firstParam} // ${mathConstant}`  // Division entière
                                ];
                                operations.push(getRandomItem(arithmeticOps));
                            }
                    }
                } else {
                    // Si pas de paramètre, on initialise quand même une variable locale.
                    operations.push(`${indent}${localResultVar} = ${getRandomInt(1, 10)}`);
                }
                
                // Ajouter une ou plusieurs opérations intermédiaires selon la difficulté
                const resultType = params.length > 0 ? paramTypes[0] : 'int'; // Type par défaut
                const numOperationsTarget = Math.max(1, Math.min(3, Math.floor(contextOptions.difficulty / 2)));
            
                // Instructions intermédiaires adaptées au type du résultat
                if (operations.length < numOperationsTarget) {
                    for (let i = 0; i < numOperationsTarget; i++) {
                    switch (resultType) {
                        case 'str':
                            const strOps = [
                                `${indent}${localResultVar} += "_modified"`,
                                `${indent}if len(${localResultVar}) > ${getRandomInt(1, 3)}:`,
                                `${indent}    ${localResultVar} = ${localResultVar}.upper()`,
                                `${indent}else:`,
                                `${indent}    ${localResultVar} += "_extended"`
                            ];
                            // Choisir entre opération simple et conditionnelle
                            if (Math.random() > 0.5 || i === 0) {
                                operations.push(strOps[0]);
                            } else {
                                operations.push(...strOps.slice(1));
                            }
                            break;
                            
                        case 'list':
                            const listOps = [
                                `${indent}if isinstance(${localResultVar}, list):`,
                                `${indent}    ${localResultVar}.append(${getRandomInt(1, 5)})`,
                                `${indent}else:`,
                                `${indent}    ${localResultVar} = [${localResultVar}]`
                            ];
                            operations.push(...listOps);
                            break;
                        
                        case 'bool':
                        // Opérations uniquement logiques pour les booléens, peu importe la difficulté
                            const boolOps = [
                                `${indent}${localResultVar} = not ${localResultVar}`,
                                `${indent}${localResultVar} = ${localResultVar} and ${getRandomItem(['True', 'False'])}`,
                                `${indent}${localResultVar} = ${localResultVar} or ${getRandomItem(['True', 'False'])}`
                            ];
                            
                        // Les opérations arithmétiques sur les booléens uniquement pour difficulté >= 5
                        if (contextOptions.difficulty >= 5) {
                            boolOps.push(`${indent}${localResultVar} = ${localResultVar} + ${getRandomInt(0, 1)}`);  // En Python, True + 1 = 2, False + 1 = 1
                            boolOps.push(`${indent}${localResultVar} = ${getRandomInt(1, 3)} * ${localResultVar}`);  // En Python, 2 * True = 2, 2 * False = 0
                        }    
                            operations.push(getRandomItem(boolOps));
                            break;    

                        case 'int':
                        case 'float':
                        default:
                            const numOps = [
                                `${indent}${localResultVar} += ${getRandomInt(1, 5)}`,
                                `${indent}${localResultVar} *= ${getRandomInt(2, 4)}`,
                                `${indent}if ${localResultVar} > ${getRandomInt(10, 20)}:`,
                                `${indent}    ${localResultVar} -= ${getRandomInt(1, 5)}`,
                                `${indent}else:`,
                                `${indent}    ${localResultVar} += ${getRandomInt(1, 3)}`
                            ];
                            // Choisir entre opération simple et conditionnelle
                            if (Math.random() > 0.6 || i === 0) {
                                operations.push(getRandomItem(numOps.slice(0, 2)));
                            } else {
                                operations.push(...numOps.slice(2));
                            }
                        }
                    }
                }
                // Ajouter les opérations au corps de la fonction
                bodyLines.push(...operations);


            // L'instruction de retour est toujours la dernière
            if (contextOptions.hasReturn) {
                bodyLines.push(`${indent}return ${localResultVar}`);
            } else if (contextOptions.hasPrint) {
                // Utiliser la conversion str() explicite ou formatage avec virgules pour éviter l'erreur de type
                if (resultType === 'str') {
                    bodyLines.push(`${indent}print("Résultat: " + ${localResultVar})`);
                } else {
                    bodyLines.push(`${indent}print("Résultat:", ${localResultVar})`);
                }
            }
                break;
            }
            default:
                // Fallback générique
                for (let i = 0; i < instructionCount; i++) {
                    bodyLines.push(`${indent}${generateAppropriateStatement()}`);
                }
        }
        
        // Un corps de structure ne doit JAMAIS être vide, `pass` est la seule solution.
        if (bodyLines.length === 0) {
            bodyLines.push(`${indent}pass`);
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
        
        // --- REFACTORISATION ---
        // On utilise maintenant generateCondition pour le IF principal,
        // ce qui permet d'utiliser des listes et des chaînes, et non plus seulement des booléens/entiers.
        // Le 'true' indique de préférer une variable existante.
        const { condition } = generateCondition(['bool', 'int', 'list', 'str'], true);

        // Si aucune condition n'a pu être générée (cas très rare), on abandonne.
        if (!condition) {
            return;
        }

        // Générer la ligne if avec la condition
        codeLines.push(`${indent}if ${condition}:`);
        // Augmenter l'indentation pour le corps du if
        indentLevel++;
        // Générer le corps du if avec une opération cohérente
        const ifBodyIndent = safeIndent(indentLevel);
        const ifBody = generateAppropriateStatement();
        codeLines.push(`${ifBodyIndent}${ifBody}`);
        indentLevel--;
        let linesAdded = 2; // if + corps
        
        // On traite la génération du 'elif' et du 'else' de manière indépendante.

        let hasElif = false; // Pour savoir si un elif a été ajouté

        // 1. Gérer le 'elif'
        if (options.cond_if_elif) {
            let elifCondition;
            let attempts = 0;
            do {
                elifCondition = generateCondition(['bool', 'int', 'list', 'str'], true).condition;
                attempts++;
            } while (elifCondition === condition && attempts < 5);

            if (elifCondition) {
                codeLines.push(`${indent}elif ${elifCondition}:`);
                indentLevel++;
                
                const elifBodyIndent = safeIndent(indentLevel);
                const elifBody = generateAppropriateStatement();
                codeLines.push(`${elifBodyIndent}${elifBody}`);
                indentLevel--;
                
                linesAdded += 2;
                hasElif = true;
            }
        }
        
        // 2. Gérer le 'else'
        // Le 'else' peut être ajouté après un 'if' ou un 'elif'.
        // L'option 'cond_if_elif_else' implique que 'cond_if_else' est aussi souhaité.
        if (options.cond_if_else || options.cond_if_elif_else) {
            codeLines.push(`${indent}else:`);
            indentLevel++;
            
            const elseBodyIndent = safeIndent(indentLevel);
            const elseBody = generateAppropriateStatement();
            codeLines.push(`${elseBodyIndent}${elseBody}`);
            indentLevel--;
            
            linesAdded += 2;
        }
        
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
        let useAdvancedListOps = difficulty >= 4 || options.builtin_isinstance || options.builtin_len;
    
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
        
        // Générer un corps de boucle qui respecte les contraintes
        const bodyOptions = {
            loopVar,
            difficulty,
            useAdvancedOps: useAdvancedListOps
        };
    
        const bodyLines = generateStructureBody(indentLevel, 'for_list', bodyOptions);
        
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
        const { condition, intVar } = generateCondition(['while_safe', 'int'], false);
        
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
    
    /**
     * Orchestre la génération complète d'une fonction Python :
     * 1. Choisit un nom et des paramètres pertinents en fonction des options.
     * 2. Détermine si la fonction doit retourner une valeur ou avoir un effet visible (print).
     * 3. Fait appel à `generateStructureBody` pour créer un corps de fonction cohérent.
     * 4. Décide si la fonction doit être appelée après sa définition.
     * 5. Génère l'appel de fonction, en stockant le résultat si nécessaire.
     */
    function generateFunction() {
        // Récupère l'indentation actuelle pour un formatage correct.
        const indent = safeIndent(indentLevel);
        // Choisit un nom de fonction aléatoire parmi une liste prédéfinie pour plus de réalisme.
        let funcName = getRandomItem(FUNCTION_NAMES);
        let params = [];
        
        // Détermine le nombre et les noms des paramètres en fonction des options de l'interface.
        if (options.func_def_ab) {
            // Si l'option 'def f(a, b)' est cochée, génère deux noms de paramètres pertinents.
            params = chooseAppropriateParameterNames(funcName, 2);
        } else if (options.func_def_a) {
            // Si l'option 'def f(a)' est cochée, génère un seul nom de paramètre.
            params = chooseAppropriateParameterNames(funcName, 1);
        }
        
        // Déduit le type probable de chaque paramètre à partir de son nom pour générer un corps de fonction logique.
        const paramTypes = params.map(param => {
            if (INT_VAR_NAMES.includes(param)) {
                return 'int';
            } else if (STR_VAR_NAMES.includes(param)) {
                return 'str';
            } else if (LIST_VAR_NAMES.includes(param)) {
                return 'list';
            } else if (BOOL_VAR_NAMES.includes(param)) {
                return 'bool';
            } else if (FLOAT_VAR_NAMES.includes(param)) {
                return 'float';
            } else {
                return 'int'; // Type par défaut si le nom n'est pas reconnu.
            }
        });

        // Génère la ligne de définition de la fonction (ex: "def calculate(a, b):").
        codeLines.push(`${indent}def ${funcName}(${params.join(", ")}):`);
        indentLevel++;
        
        // --- Logique de décision pour l'utilité de la fonction ---

        // Par défaut, une fonction retourne une valeur si l'option est cochée ou si la difficulté est élevée.
        let useReturnValue = options.func_return || difficulty >= 2;

        // Évalue si la fonction est "importante" (avec paramètres, return, etc.) pour décider si on doit l'appeler.
        const hasParams = params.length > 0;
        const hasAdvancedFeatures = options.func_def_ab || options.func_op_list || options.func_op_str;
        const isImportant = useReturnValue || hasAdvancedFeatures || difficulty >= 3;
        
        // Décide d'appeler la fonction si elle est jugée importante ou avec une probabilité aléatoire sinon.
        const shouldCallFunction = isImportant || (hasParams && Math.random() < 0.7) || Math.random() < 0.4;

        // Pour garantir un code pédagogique, si on décide d'appeler la fonction et que l'option 'print'
        // n'est pas disponible, on force la fonction à retourner une valeur pour que son effet soit visible.
        if (shouldCallFunction && !options.builtin_print) {
            useReturnValue = true;
        }

        // Délègue la création du corps de la fonction à `generateStructureBody`.
        const bodyLines = generateStructureBody(indentLevel, 'function', { 
            params, 
            paramTypes, // Passe les types pour générer des opérations valides.
            difficulty,
            hasReturn: useReturnValue, // Indique si un 'return' est attendu.
            hasPrint: !useReturnValue && options.builtin_print, // Un 'print' interne est possible si pas de 'return'.
            hasInput: options.builtin_input
        });
        
        // Ajoute les lignes du corps généré au code final.
        bodyLines.forEach(line => codeLines.push(line));
        indentLevel--;
        linesGenerated += 1 + bodyLines.length; // Met à jour le compteur de lignes.

        
        // --- Génération de l'appel de la fonction ---
        
        // N'appelle la fonction que si la décision a été prise et qu'il reste de la place.
        if (shouldCallFunction && linesGenerated < targetLines) {
        
            // Génère des arguments concrets pour l'appel, correspondant aux types des paramètres.
            const args = params.map((param, index) => {
                const paramType = paramTypes[index];
                return ensureVariableExists(paramType);
           });
            
            // Comportement différent selon que la fonction retourne une valeur ou non.
            if (useReturnValue) {
                // Le type de la variable de résultat doit correspondre au type de ce que la fonction retourne.
                // On infère le type de retour à partir du type du premier paramètre (meilleure heuristique disponible).
                const returnType = paramTypes.length > 0 ? paramTypes[0] : 'int';
                const resultVar = generateUniqueVarName(returnType);
                const callStatement = `${resultVar} = ${funcName}(${args.join(", ")})`;
                
                // Enregistre la nouvelle variable de résultat avec le bon type.
                allDeclaredVarNames.add(resultVar);
                declaredVarsByType[returnType].push(resultVar);
                
                // Ajoute la ligne d'appel et d'affectation.
                codeLines.push(`${indent}${callStatement}`);
                
                // Optionnellement, ajoute un 'print' pour afficher le résultat, rendant l'opération visible.
                if (options.builtin_print || difficulty >= 3) {
                    const formattedArgs = args.map((arg, index) => {
                        const argType = paramTypes[index];
                        return argType === 'str' ? arg : `str(${arg})`;
                    });
                    
                    // Adapte le message du 'print' à la difficulté.
                    if (difficulty <= 2) {
                        codeLines.push(`${indent}print("Le résultat de ${funcName} est " + str(${resultVar}))`);
                    } else {
                         // Vérifier si formattedArgs a des éléments avant de faire le join
                        const argsDisplay = formattedArgs.length > 0 
                            ? `"(" + ${formattedArgs.join(' + ", " + ')} + ")"`
                            : `"()"`;
                        codeLines.push(`${indent}print("Le résultat de " + "${funcName}" + ${argsDisplay} + " est " + str(${resultVar}))`);
                    }
                    linesGenerated += 2;
                } else {
                    linesGenerated++;
                }
            } else {
                // Si la fonction ne retourne rien (elle a probablement un 'print' interne), on l'appelle simplement.
                const callStatement = `${funcName}(${args.join(", ")})`;
                codeLines.push(`${indent}${callStatement}`);
                linesGenerated++;
            }
        }
    }

    function chooseAppropriateParameterNames(funcName, count) {
        // Paramètres possibles selon la catégorie de fonction
        const mathParams = ['x', 'y', 'n', 'a', 'b', 'num1', 'num2', 'value'];
        const dataParams = ['data', 'items', 'elements', 'values', 'collection'];
        const textParams = ['text', 'message', 'content', 'string', 'input', 'name'];
        const utilParams = ['value', 'option', 'flag', 'mode', 'config'];
        const genericParams = ['param1', 'param2', 'arg1', 'arg2', 'option1', 'option2'];
        
        // Sélectionner la liste appropriée selon le nom de la fonction
        let paramList;
        if (MATH_FUNCTIONS.includes(funcName)) {
            paramList = mathParams;
        } else if (DATA_FUNCTIONS.includes(funcName)) {
            paramList = dataParams;
        } else if (TEXT_FUNCTIONS.includes(funcName)) {
            paramList = textParams;
        } else if (UTIL_FUNCTIONS.includes(funcName)) {
            paramList = utilParams;
        } else if (GENERIC_FUNCTIONS.includes(funcName)) {
            paramList = genericParams;
        } else {
            paramList = utilParams; // Par défaut
        }
        
        // Mélanger les paramètres et en prendre le nombre demandé
        const shuffled = [...paramList].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
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
     * Ajoute une opération "variée" pour les variables non utilisées.
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
                
                // Si non utilisée, ajouter une opération l'utilisant
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
        // Pour les boucles, la logique devrait être gérée DANS chaque fonction de boucle.
        
        if (options.loop_for_list && declaredVarsByType.list.length === 0) {
            ensureVariableExists('list');
        }
        if (options.loop_for_str && declaredVarsByType.str.length === 0) {
            ensureVariableExists('str');
        }
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
                () => `${varName} = " ${getRandomItem(["texte", "donnée", "valeur", "info"])}" + ${varName}`,
                () => `${varName} = ${varName} + " ${getRandomItem(["ajout", "extension", "suite"])}"`,
                () => `${varName} = ${varName} * ${getRandomInt(2, Math.max(2, Math.floor(difficulty / 2) + 1))}  # Répétition de chaîne`,
                () => `${varName} = ${getRandomInt(2, Math.max(2, Math.floor(difficulty / 2) + 1))} * ${varName}  # Répétition de chaîne`,
                // Remplacement
                ...(difficulty >= 3 ? [
                    () => {
                        const randomIndex = getRandomInt(0, 2); // Limiter à 3 premiers caractères pour éviter IndexError
                        return `${varName} = ${varName}.replace(${varName}[${randomIndex}], ${varName}[${randomIndex}].upper())  # Remplace le caractère à l'index ${randomIndex}`;
                    }
                ] : []),
                // suppression de caractères
                () => {
                    const randomIndex = getRandomInt(0, 1); // Éviter de supprimer trop de caractères
                    return `${varName} = ${varName}.replace(${varName}[${randomIndex}], "")  # Supprime un caractère`;
                },
                // Avec commentaire
                () => `${varName} *= ${getRandomInt(2, Math.max(2, Math.floor(difficulty / 2) + 1))}  # Répétition de chaîne`,
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
                    () => `if len(${varName}) > 0: ${varName}.pop(0) # Suppression du premier élément`
                ] : [])
            ],
            'bool': [
                // Opérations logiques de base avec valeur booléenne
                () => `${varName} = not ${varName}`,
                () => `${varName} = ${getRandomItem(['True', 'False'])} or ${getRandomItem(['True', 'False'])}`,
                () => `${varName} = ${getRandomItem(['True', 'False'])} and ${getRandomItem(['True', 'False'])}`,
                // comparaison de valeurs aléatoires: confronter vite les élèves aux = et ==
                () => `${varName} = ${getRandomInt(-difficulty,difficulty)} ${getRandomItem(['==', '!=', '<', '>'])} ${getRandomInt(-difficulty, difficulty)}`,
                () => `${varName} = ${getRandomItem(['True', 'False'])} ${getRandomItem(['==', '!='])} ${getRandomItem(['True', 'False'])}`,
                // Opérations logiques de base
                ...(difficulty >= 2 ? [
                    () => `${varName} = ${getRandomItem(['True', 'False'])} ${getRandomItem(['or','and'])} ${getRandomItem(['True', 'False'])}  # Opération logique`,
                    () => `${varName} = ${getRandomInt(-difficulty,difficulty)} ${getRandomItem(['==', '!=', '<', '>', '<=', '>='])} ${getRandomInt(-difficulty, difficulty)}`,   
                    () => `${varName} = ${varName} ${getRandomItem(['or','and'])} ${getRandomItem(['True', 'False'])}  # Opération logique`,
                    () => `${varName} = ${getRandomItem(['True', 'False'])} ${getRandomItem(['or','and'])} ${varName}  # Opération logique`
                ]: []), 
                // Affectation conditionnelle avancée
                ...(difficulty >= 4 ? [
                    () => `${varName} = ${varName} if ${getRandomItem(['True', 'False'])} else not ${varName}  # Opération conditionnelle avancée`,
                    () => `${varName} = ${varName} != ${getRandomItem(['True', 'False'])}  # Opération avancée`
                ]: []),
                    // Opérations avancées
                ...(difficulty >= 5 ? [
                    () => `${varName} = ${varName} + ${getRandomInt(0, 1)}  # Opération arithmétique sur booléen (niveau avancé)`,
                    () => `${varName} = ${getRandomInt(1, 3)} * ${varName}  # Opération arithmétique sur booléen (niveau avancé)`
                ]: [])
                ],
            'float': [
                () => `${varName} = ${varName} + ${(Math.random() * difficulty + 0.1).toFixed(1)}`,
                () => `${varName} = ${varName} - ${(Math.random() * difficulty + 0.1).toFixed(1)}`,
                () => `${varName} = ${varName} * ${(1 + Math.random()).toFixed(1)}`,
                () => `${varName} = ${varName} / ${(1 + Math.random()).toFixed(1)}`,
                () => `${varName} += ${(Math.random() * 2 + 0.1).toFixed(1)}`,
                () => `${varName} -= ${(Math.random() * 2 + 0.1).toFixed(1)}`,
                ...(difficulty >= 3 ? [
                    () => `${varName} *= ${(1.5 + Math.random()).toFixed(3)}`,
                    () => `${varName} /= ${(1.5 + Math.random()).toFixed(3)}`
                ] : [])
            ]// + Autres??
        };
        
        // Vérifier si une opération identique a déjà été générée récemment
        let operation;
        let isRepeat = false;
        const maxAttempts = 5;
        let attempts = 0;
        
        do {
            // La logique de difficulté est déjà gérée dans la définition des opérations.
            const availableOps = operations[type] || [];
            if (availableOps.length > 0) {
                // Choisir une opération aléatoire parmi TOUTES celles qui sont disponibles.
                operation = getRandomItem(availableOps)();
            } else {
                // Fallback si aucune opération n'est disponible pour ce type.
                operation = `${varName} = ${varName}`;
            }           
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
            // Extraction de la valeur numérique actuelle si présente
            // Utilise une expression régulière qui capture un nombre qui n'est pas entre parenthèses
            const currentNumberMatch = operation.match(/\d+(?![^)]*\))/);
            const currentNumber = currentNumberMatch ? parseInt(currentNumberMatch[0]) : null;

            // Extraction de l'opérateur actuel si présent
            // Recherche des opérateurs arithmétiques avec ou sans signe égal
            const operatorMatch = operation.match(/[+\-*\/\/%]=?/);
            const currentOperator = operatorMatch ? operatorMatch[0] : null;

            if (currentNumber !== null) {
                // Génération d'une nouvelle valeur numérique garantie différente
                // Évite la répétition en utilisant une boucle do-while
                let newValue;
                do {
                    newValue = getRandomInt(1, 5);
                } while (newValue === currentNumber);
                
                // Remplacement du nombre dans la chaîne d'opération
                // Utilise la même expression régulière pour cibler le remplacement
                operation = operation.replace(/\d+(?![^)]*\))/, newValue);
            } 
            else if (currentOperator) {
                // Génération d'un opérateur différent
                // Sélectionne un nouvel opérateur parmi ceux disponibles, en excluant l'actuel
                const operators = ['+', '-', '*', '//'];
                const newOperator = getRandomItem(operators.filter(op => op !== currentOperator));
                operation = operation.replace(currentOperator, newOperator);
            }
            else {
                // Solution de repli : ajout d'un commentaire unique
                // Supprime tout commentaire existant et ajoute un identifiant aléatoire
                operation = operation.replace(/\s*#.*$/, '') + 
                    `  # unique_${Math.random().toString(36).substr(2, 5)}`;
            }
        }
        // Traitement spécifique pour les opérations sur chaînes de caractères
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
                
                // pour les difficultés plus élevées, ajouter des opérations plus complexes
                if (difficulty >= 3) {
                    replacements.push(`${varName} = ${varName}.upper()`);
                    replacements.push(`${varName} = ${varName}.capitalize()`);
                }
                
                // choisit un replacement random
                operation = getRandomItem(replacements);
                
                // ajout pour expliquer d'où vient la substitution
                operation += "  # Opération de chaîne valide";
            }
        }
        return operation; //[type][opIndex]();
    }

     /**
     * Objectif: garantir qu'au moins une opération est générée pour chaque type de variable
     * demandé dans les options, pour rendre leur présence plus significative.
     */
    function ensureTypeSpecificOperations() {
        const typesToCheck = [
            { option: 'var_str_count', type: 'str' },
            { option: 'var_list_count', type: 'list' },
            { option: 'var_bool_count', type: 'bool' },
            { option: 'var_float_count', type: 'float' }
            // On exclue 'int' car il est déjà très utilisé par défaut
        ];

        for (const item of typesToCheck) {
            // Si le type a été demandé et qu'une variable de ce type existe
            if (options[item.option] > 0 && declaredVarsByType[item.type].length > 0) {
                // Choisir une variable de ce type
                const varName = getRandomItem(declaredVarsByType[item.type]);
                // Générer une opération variée pour elle
                const operation = generateVariedOperation(item.type, varName, difficulty);
                
                // Ajouter l'opération si elle n'est pas déjà présente
                if (!codeLines.some(line => line.trim() === operation.trim())) {
                    codeLines.push(operation);
                    linesGenerated++;
                }
            }
        }
    }
    ///////////////////////////////////////////////////////////////////////
    // ----------------- EXÉCUTION DE LA GÉNÉRATION ----------------------

    // 1. Calculer le nombre de lignes requises et initialiser les variables de base
    // et mettre à jour options.numTotalVariablesGlobal si nécessaire
    calculateRequiredLines();
    
    // 2. S'assurer que le bon nombre de variables est créé pour chaque type
    generateInitialVariables(); // 
    ensureVariablesForOptions(); // 
    ensureListVariablesCount(); // pour garantir le bon nombre de listes
    ensureTypeSpecificOperations(); // Assure au moins une opération par type demandé
   
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
        codeLines.push("x = 10  # code de scours");
        codeLines.push("y = 20  # Valeur par défaut");
        codeLines.push("resultat = x + y");
    }

    // Finalement... Retour du code généré ...
    return codeLines.join("\n");
}
