// Importer la bibliothèque de patterns
const { 
    OPERATION_PATTERNS, 
    STRUCTURE_PATTERNS, 
    BLOCK_BODY_PATTERNS, 
    PROGRAM_PATTERNS 
} = require('./pattern-library');

/**
 * Sélectionne et applique un pattern de programme complet
 * @param {Object} options - Options sélectionnées par l'utilisateur
 * @returns {string} - Code Python généré
 */
function generateProgramByPattern(options) {
    // Filtrer les patterns disponibles selon les options et le niveau de difficulté
    const availablePatterns = PROGRAM_PATTERNS.filter(pattern => {
        // Vérifier la difficulté
        if (pattern.difficulty > options.difficultyLevelGlobal) return false;
        
        // Vérifier les options requises
        if (pattern.requiredOptions) {
            return pattern.requiredOptions.some(opt => options[opt]);
        }
        return true;
    });

    if (availablePatterns.length === 0) {
        // Fallback si aucun pattern ne correspond
        return generateBasicProgram(options);
    }

    // Sélectionner un pattern aléatoirement parmi ceux disponibles
    const selectedPattern = getRandomItem(availablePatterns);
    
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
            default:
                // Si c'est une chaîne littérale, l'ajouter telle quelle
                if (section.startsWith('{') && section.endsWith('}')) {
                    console.warn(`Placeholder inconnu: ${section}`);
                } else {
                    codeBlocks.push(section);
                }
        }
    }

    // Joindre tous les blocs de code générés
    return codeBlocks.join('\n\n');
}

/**
 * Génère les déclarations de variables selon les options et le contexte
 */
function generateVariableDeclarations(context) {
    const { options } = context;
    const lines = [];

    // Générer des variables pour chaque type activé dans les options
    if (options.var_int_count > 0) {
        for (let i = 0; i < options.var_int_count; i++) {
            const varName = generateUniqueVarName('int', context);
            const value = getRandomInt(-10, 10); // Valeur arbitraire pour l'exemple
            lines.push(`${varName} = ${value}`);
            context.declaredVarsByType.int.push(varName);
            context.allDeclaredVarNames.add(varName);
        }
    }

    // Faire de même pour les autres types (float, str, list, bool)
    // ...

    return lines.join('\n');
}

/**
 * Génère un bloc conditionnel (if, if/else, if/elif/else)
 */
function generateConditionalBlock(context) {
    const { options, difficulty } = context;
    
    // Sélectionner un pattern conditionnel approprié
    const availablePatterns = STRUCTURE_PATTERNS.if.filter(pattern => {
        if (pattern.difficulty > difficulty) return false;
        
        // Vérifier les options requises
        if (pattern.requiredOptions) {
            return pattern.requiredOptions.every(opt => options[opt]);
        }
        return true;
    });
    
    if (availablePatterns.length === 0) return "";
    
    const selectedPattern = getRandomItem(availablePatterns);
    
    // Générer le corps du if
    const bodyContext = { ...context, parentStructure: 'if' };
    const bodyCode = generateBlockBody('if_body', bodyContext);
    
    // Générer le corps du else si nécessaire
    let elseCode = "";
    if (selectedPattern.pattern.includes('else:')) {
        const elseContext = { ...context, parentStructure: 'else' };
        elseCode = generateBlockBody('if_body', elseContext);
    }
    
    // Générer le code final
    return selectedPattern.generateCode({ 
        ...context, 
        bodyCode, 
        elseCode 
    });
}

/**
 * Génère un corps de bloc approprié au contexte
 */
function generateBlockBody(blockType, context) {
    const { difficulty } = context;
    
    // Sélectionner un pattern de corps approprié
    const availablePatterns = BLOCK_BODY_PATTERNS[blockType].filter(
        pattern => pattern.difficulty <= difficulty
    );
    
    if (availablePatterns.length === 0) return "pass";
    
    const selectedPattern = getRandomItem(availablePatterns);
    
    // Générer le code du corps
    return selectedPattern.generateCode(context);
}

/**
 * Génère une opération variée pour une variable selon son type
 */
function generateVariedOperation(type, varName, difficulty) {
    // Sélectionner les patterns disponibles pour ce type et cette difficulté
    const availablePatterns = OPERATION_PATTERNS[type]
        ? OPERATION_PATTERNS[type].filter(p => p.difficulty <= difficulty)
        : [];
    
    if (availablePatterns.length === 0) {
        // Fallback pour les types sans patterns ou difficulté insuffisante
        return `${varName} = ${varName}  # Opération identité`;
    }
    
    // Sélectionner un pattern aléatoire parmi ceux disponibles
    const selectedPattern = getRandomItem(availablePatterns);
    
    // Générer l'opération
    return selectedPattern.generateCode({ varName, difficulty });
}

module.exports = {
    generateProgramByPattern
};