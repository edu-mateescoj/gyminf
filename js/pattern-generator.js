// Retirer l'import require et utiliser la variable globale PATTERN_LIBRARY

/**
 * Générateur de code Python basé sur des patterns
 * Utilise la bibliothèque de patterns pour produire du code pédagogique
 * qui respecte les contraintes d'options et de difficulté
 */

/**
 * Sélectionne et applique un pattern de programme complet
 * @param {Object} options - Options sélectionnées par l'utilisateur
 * @returns {string} - Code Python généré
 */
function generateProgramByPattern(options) {
    console.log("Génération de code avec l'approche par patterns");
    
    // Référencer les patterns depuis la variable globale
    const PROGRAM_PATTERNS = PATTERN_LIBRARY.PROGRAM_PATTERNS;
    
    // Filtrer les patterns disponibles selon les options et le niveau de difficulté
    const availablePatterns = PROGRAM_PATTERNS.filter(pattern => {
        // Vérifier la difficulté
        if (pattern.difficulty > options.difficultyLevelGlobal) return false;
        
        // Vérifier les options requises (au moins une doit être présente)
        if (pattern.requiredOptions) {
            return pattern.requiredOptions.some(opt => options[opt]);
        }
        return true;
    });
    
    // Si aucun pattern ne correspond, utiliser un modèle basique
    if (availablePatterns.length === 0) {
        console.log("Aucun pattern disponible pour ces options, utilisation d'un modèle basique");
        return generateBasicProgram(options);
    }
    
    // Sélectionner un pattern aléatoirement parmi ceux disponibles
    const selectedPattern = getRandomItem(availablePatterns);
    console.log(`Pattern sélectionné: ${selectedPattern.name}`);
    
    // Initialiser le contexte de génération
    const context = {
        options: options,
        difficulty: options.difficultyLevelGlobal,
        declaredVarsByType: {
            int: [], float: [], str: [], list: [], bool: []
        },
        allDeclaredVarNames: new Set()
    };
    
    // Générer le code selon la structure du pattern sélectionné
    const codeBlocks = [];
    
    for (const section of selectedPattern.structure) {
        switch (section) {
            case '{variable_declarations}':
                codeBlocks.push(generateVariableDeclarations(context));
                break;
            case '{conditional_block}':
                codeBlocks.push(generateConditionalBlock(context));
                break;
            case '{loop_block}':
                codeBlocks.push(generateLoopBlock(context));
                break;
            case '{variable_operations}':
                codeBlocks.push(generateVariableOperations(context));
                break;
            case '{result_computation}':
                codeBlocks.push(generateResultComputation(context));
                break;
            case '{function_definition}':
                codeBlocks.push(generateFunctionDefinition(context));
                break;
            default:
                // Si c'est une chaîne littérale, l'ajouter telle quelle
                if (section.startsWith('{') && section.endsWith('}')) {
                    console.warn(`Placeholder inconnu: ${section}`);
                } else {
                    codeBlocks.push(section);
                }
        }
    }
    
    // Filtrer les blocs vides et joindre tous les blocs de code générés
    return codeBlocks.filter(block => block && block.trim().length > 0).join('\n\n');
}

/**
 * Génère les déclarations de variables selon les options et le contexte
 * @param {Object} context - Contexte de génération
 * @returns {string} - Code Python pour les déclarations de variables
 */
function generateVariableDeclarations(context) {
    const { options } = context;
    const lines = [];
    
    // Déterminer les types de variables à générer et leur quantité
    const types = [
        { type: 'int', count: options.var_int_count || 0 },
        { type: 'float', count: options.var_float_count || 0 },
        { type: 'str', count: options.var_str_count || 0 },
        { type: 'list', count: options.var_list_count || 0 },
        { type: 'bool', count: options.var_bool_count || 0 }
    ];
    
    // Générer des variables pour chaque type activé dans les options
    for (const { type, count } of types) {
        if (count > 0) {
            for (let i = 0; i < count; i++) {
                // Créer un nom unique pour cette variable
                const varName = generateUniqueVarName(type, context);
                
                // Générer une valeur appropriée pour ce type
                let value;
                if (type === 'list') {
                    // Pour les listes, déterminer les types d'éléments selon les autres options
                    const elementTypes = ['int'];
                    if (options.var_str_count > 0) elementTypes.push('str');
                    if (options.var_bool_count > 0) elementTypes.push('bool');
                    
                    value = PATTERN_LIBRARY.LITERALS_BY_TYPE.list(
                        context.difficulty,
                        elementTypes
                    );
                } else {
                    value = PATTERN_LIBRARY.LITERALS_BY_TYPE[type](context.difficulty);
                }
                
                // Ajouter la ligne de déclaration
                lines.push(`${varName} = ${value}`);
                
                // Mettre à jour le contexte
                context.declaredVarsByType[type].push(varName);
                context.allDeclaredVarNames.add(varName);
            }
        }
    }
    
    // S'assurer qu'on a au moins une variable si aucune n'est spécifiée
    if (lines.length === 0) {
        const varName = generateUniqueVarName('int', context);
        lines.push(`${varName} = 10  # Variable par défaut`);
        context.declaredVarsByType.int.push(varName);
        context.allDeclaredVarNames.add(varName);
    }
    
    return lines.join('\n');
}

/**
 * Génère un bloc conditionnel (if, if/else, if/elif/else)
 * @param {Object} context - Contexte de génération
 * @returns {string} - Code Python pour le bloc conditionnel
 */
function generateConditionalBlock(context) {
    const { options, difficulty } = context;
    
    // Vérifier que les options permettent de générer une condition
    if (!options.cond_if) {
        return "";
    }
    
    // Récupérer les patterns de structure conditionnelle
    const STRUCTURE_PATTERNS = PATTERN_LIBRARY.STRUCTURE_PATTERNS.if;
    
    // Filtrer les patterns conditionnels selon la difficulté et les options
    const availablePatterns = STRUCTURE_PATTERNS.filter(pattern => {
        if (pattern.difficulty > difficulty) return false;
        
        // Vérifier les options requises
        if (pattern.requiredOptions) {
            return pattern.requiredOptions.every(opt => options[opt]);
        }
        return true;
    });
    
    if (availablePatterns.length === 0) return "";
    
    // Sélectionner un pattern aléatoirement
    const selectedPattern = getRandomItem(availablePatterns);
    
    // Préparer les différentes branches de la condition
    const bodyContext = { ...context, parentStructure: 'if' };
    const bodyCode = generateBlockBody('if_body', bodyContext);
    
    let elifCode = "";
    let elseCode = "";
    
    // Générer le corps du else et du elif si nécessaire
    if (selectedPattern.pattern.includes('elif')) {
        const elifContext = { ...context, parentStructure: 'elif' };
        elifCode = generateBlockBody('if_body', elifContext);
    }
    
    if (selectedPattern.pattern.includes('else:')) {
        const elseContext = { ...context, parentStructure: 'else' };
        elseCode = generateBlockBody('if_body', elseContext);
    }
    
    // Générer le code final
    return selectedPattern.generateCode({
        ...context,
        bodyCode,
        elifCode,
        elseCode
    });
}

/**
 * Génère un corps de bloc approprié au contexte
 * @param {string} blockType - Type de bloc ('if_body', 'for_body', etc.)
 * @param {Object} context - Contexte de génération
 * @returns {string} - Code Python pour le corps du bloc
 */
function generateBlockBody(blockType, context) {
    const { difficulty } = context;
    const BLOCK_BODY_PATTERNS = PATTERN_LIBRARY.BLOCK_BODY_PATTERNS;
    
    // Vérifier si ce type de bloc existe
    if (!BLOCK_BODY_PATTERNS[blockType]) {
        console.warn(`Type de bloc inconnu: ${blockType}`);
        return "pass";
    }
    
    // Filtrer les patterns selon la difficulté
    const availablePatterns = BLOCK_BODY_PATTERNS[blockType].filter(pattern => 
        pattern.difficulty <= difficulty
    );
    
    if (availablePatterns.length === 0) {
        return "pass";  // Si aucun pattern disponible, utiliser 'pass'
    }
    
    // Sélectionner un pattern aléatoirement
    const selectedPattern = getRandomItem(availablePatterns);
    
    // Générer le code du corps
    return selectedPattern.generateCode(context);
}

/**
 * Génère un bloc de boucle selon les options et le contexte
 * @param {Object} context - Contexte de génération
 * @returns {string} - Code Python pour le bloc de boucle
 */
function generateLoopBlock(context) {
    const { options, difficulty } = context;
    
    // Vérifier quelles options de boucle sont activées
    const loopOptions = [];
    if (options.loop_for_range) loopOptions.push('for');
    if (options.loop_for_list) loopOptions.push('for');
    if (options.loop_for_str) loopOptions.push('for');
    if (options.loop_while) loopOptions.push('while');
    
    if (loopOptions.length === 0) {
        return ""; // Aucune option de boucle activée
    }
    
    // Sélectionner un type de boucle aléatoirement parmi ceux disponibles
    const loopType = getRandomItem(loopOptions);
    
    // Récupérer les patterns pour ce type de boucle
    const STRUCTURE_PATTERNS = PATTERN_LIBRARY.STRUCTURE_PATTERNS[loopType];
    
    // Filtrer les patterns selon la difficulté et les options
    const availablePatterns = STRUCTURE_PATTERNS.filter(pattern => {
        if (pattern.difficulty > difficulty) return false;
        
        // Vérifier les options requises
        if (pattern.requiredOptions) {
            return pattern.requiredOptions.every(opt => options[opt]);
        }
        return true;
    });
    
    if (availablePatterns.length === 0) return "";
    
    // Sélectionner un pattern aléatoirement
    const selectedPattern = getRandomItem(availablePatterns);
    
    // Préparer le corps de la boucle
    const bodyContext = { 
        ...context, 
        parentStructure: loopType,
        iteratorVar: loopType === 'for' ? 'i' : '',
        iteratorType: options.loop_for_str ? 'str' : (options.loop_for_list ? 'list' : 'int')
    };
    const bodyCode = generateBlockBody(`${loopType}_body`, bodyContext);
    
    // Générer le code final
    return selectedPattern.generateCode({
        ...context,
        bodyCode
    });
}

/**
 * Génère des opérations variées sur les variables déclarées
 * @param {Object} context - Contexte de génération
 * @returns {string} - Code Python pour les opérations
 */
function generateVariableOperations(context) {
    const { declaredVarsByType, difficulty } = context;
    const lines = [];
    
    // Nombre d'opérations à générer (dépend de la difficulté)
    const numOperations = Math.floor(Math.random() * (difficulty + 1)) + 1;
    
    // Liste des types disponibles (avec variables déclarées)
    const availableTypes = Object.keys(declaredVarsByType).filter(
        type => declaredVarsByType[type].length > 0
    );
    
    if (availableTypes.length === 0) {
        return "# Pas de variables disponibles pour les opérations";
    }
    
    // Historique des opérations pour éviter les répétitions
    const operationHistory = new Set();
    
    for (let i = 0; i < numOperations; i++) {
        // Sélectionner un type aléatoire
        const type = getRandomItem(availableTypes);
        
        // Sélectionner une variable de ce type
        const varName = getRandomItem(declaredVarsByType[type]);
        
        // Générer une opération variée
        const operation = generateVariedOperation(type, varName, difficulty);
        
        // Éviter les répétitions d'opérations
        if (!operationHistory.has(operation)) {
            lines.push(operation);
            operationHistory.add(operation);
        }
    }
    
    // Si aucune opération n'a été ajoutée, en ajouter une par défaut
    if (lines.length === 0 && availableTypes.length > 0) {
        const type = availableTypes[0];
        const varName = declaredVarsByType[type][0];
        lines.push(generateVariedOperation(type, varName, difficulty));
    }
    
    return lines.join('\n');
}

/**
 * Génère un calcul de résultat final
 * @param {Object} context - Contexte de génération
 * @returns {string} - Code Python pour le calcul du résultat
 */
function generateResultComputation(context) {
    const { declaredVarsByType, options, difficulty } = context;
    
    // Vérifier s'il faut utiliser un print (option builtin_print)
    const usePrint = options.builtin_print;
    
    // Sélectionner une variable à utiliser dans le calcul
    let targetVar = null;
    let targetType = null;
    
    // Priorité: int > float > list > str > bool
    const typeOrder = ['int', 'float', 'list', 'str', 'bool'];
    for (const type of typeOrder) {
        if (declaredVarsByType[type] && declaredVarsByType[type].length > 0) {
            targetVar = getRandomItem(declaredVarsByType[type]);
            targetType = type;
            break;
        }
    }
    
    if (!targetVar) {
        return usePrint ? 'print("Fin du programme")' : "# Fin du programme";
    }
    
    // Générer un calcul selon le type et la difficulté
    let result;
    if (targetType === 'int' || targetType === 'float') {
        if (difficulty >= 3) {
            const op = getRandomItem(['+', '-', '*', '/', '//']);
            const value = targetType === 'int' ? 
                getRandomInt(1, 5) : parseFloat((Math.random() * 3 + 1).toFixed(2));
            result = usePrint ? 
                `print("Résultat:", ${targetVar} ${op} ${value})` : 
                `resultat = ${targetVar} ${op} ${value}`;
        } else {
            result = usePrint ? 
                `print("Valeur finale:", ${targetVar})` : 
                `resultat = ${targetVar}`;
        }
    } else if (targetType === 'list') {
        if (difficulty >= 3) {
            const methods = ["len", "sum", "min", "max"];
            const method = getRandomItem(methods);
            result = usePrint ? 
                `print("Résultat:", ${method}(${targetVar}))` : 
                `resultat = ${method}(${targetVar})`;
        } else {
            result = usePrint ? 
                `print("Liste finale:", ${targetVar})` : 
                `resultat = ${targetVar}`;
        }
    } else if (targetType === 'str') {
        if (difficulty >= 3) {
            const methods = ["len", "upper", "lower"];
            const method = getRandomItem(methods);
            result = usePrint ? 
                `print("Texte final:", ${targetVar}${method === "len" ? `.${method}()` : ""})` : 
                `resultat = ${targetVar}${method === "len" ? `.${method}()` : ""}`;
        } else {
            result = usePrint ? 
                `print("Texte final:", ${targetVar})` : 
                `resultat = ${targetVar}`;
        }
    } else {
        result = usePrint ? 
            `print("État final:", ${targetVar})` : 
            `resultat = ${targetVar}`;
    }
    
    return result;
}

/**
 * Génère une définition de fonction et son appel
 * @param {Object} context - Contexte de génération
 * @returns {string} - Code Python pour la définition de fonction
 */
function generateFunctionDefinition(context) {
    const { options, difficulty } = context;
    
    // Vérifier les options de fonction
    if (!options.func_def) {
        return "";
    }
    
    // Récupérer les patterns pour les fonctions
    const STRUCTURE_PATTERNS = PATTERN_LIBRARY.STRUCTURE_PATTERNS.function;
    
    // Filtrer les patterns selon la difficulté et les options
    const availablePatterns = STRUCTURE_PATTERNS.filter(pattern => {
        if (pattern.difficulty > difficulty) return false;
        
        // Vérifier les options requises
        if (pattern.requiredOptions) {
            return pattern.requiredOptions.every(opt => options[opt]);
        }
        return true;
    });
    
    if (availablePatterns.length === 0) return "";
    
    // Sélectionner un pattern aléatoirement
    const selectedPattern = getRandomItem(availablePatterns);
    
    // Préparer le contexte pour le corps de la fonction
    const funcContext = { 
        ...context, 
        parentStructure: 'function',
        params: [],
        resultVar: ''
    };
    
    // Ajouter les paramètres au contexte selon le pattern
    if (selectedPattern.pattern.includes('{param}')) {
        funcContext.params.push('a');
    } else if (selectedPattern.pattern.includes('{param1}')) {
        funcContext.params.push('a', 'b');
    }
    
    // Si la fonction a un return, ajouter un résultat
    if (selectedPattern.pattern.includes('return')) {
        funcContext.resultVar = 'result';
    }
    
    // Générer le corps de la fonction
    const bodyCode = generateBlockBody('function_body', funcContext);
    
    // Générer le code final
    return selectedPattern.generateCode({
        ...context,
        bodyCode,
        params: funcContext.params,
        resultVar: funcContext.resultVar
    });
}

/**
 * Génère un programme basique lorsqu'aucun pattern ne correspond aux options
 * @param {Object} options - Options sélectionnées par l'utilisateur
 * @returns {string} - Code Python basique
 */
function generateBasicProgram(options) {
    // Créer un contexte minimal
    const context = {
        options: options,
        difficulty: options.difficultyLevelGlobal || 1,
        declaredVarsByType: {
            int: [], float: [], str: [], list: [], bool: []
        },
        allDeclaredVarNames: new Set()
    };
    
    // Générer au moins deux variables pour les exemples
    let code = generateVariableDeclarations(context);
    
    // Ajouter une opération simple
    code += '\n\n# Opérations de base';
    if (context.declaredVarsByType.int.length > 0) {
        const varName = context.declaredVarsByType.int[0];
        code += `\n${varName} += 5`;
    } else if (context.declaredVarsByType.str.length > 0) {
        const varName = context.declaredVarsByType.str[0];
        code += `\n${varName} += " supplémentaire"`;
    }
    
    // Ajouter un calcul final avec print
    code += '\n\n# Affichage du résultat';
    
    let targetVar = null;
    for (const type in context.declaredVarsByType) {
        if (context.declaredVarsByType[type].length > 0) {
            targetVar = context.declaredVarsByType[type][0];
            break;
        }
    }
    
    if (targetVar) {
        code += `\nprint("Résultat:", ${targetVar})`;
    } else {
        code += '\nprint("Programme terminé")';
    }
    
    return code;
}

/**
 * Génère un nom de variable unique qui n'existe pas déjà dans le contexte
 * @param {string} type - Type de la variable
 * @param {Object} context - Contexte de génération
 * @returns {string} - Nom de variable unique
 */
function generateUniqueVarName(type, context) {
    const typeNames = PATTERN_LIBRARY.VAR_NAMES_BY_TYPE[type] || PATTERN_LIBRARY.VAR_NAMES_BY_TYPE.int;
    let varName;
    let counter = 1;
    
    do {
        // Prendre un nom aléatoire et ajouter un compteur
        const baseName = getRandomItem(typeNames);
        varName = `${baseName}${counter}`;
        counter++;
        
        // Vérifier que le nom n'est pas déjà utilisé
        // Limiter le nombre de tentatives pour éviter les boucles infinies
    } while (context.allDeclaredVarNames.has(varName) && counter < 100);
    
    return varName;
}