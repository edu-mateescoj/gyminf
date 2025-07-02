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
    if (!BLOCK_// filepath: c:\Users\install\gyminf\js\pattern-generator.js
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
}