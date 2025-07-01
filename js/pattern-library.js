const OPERATION_PATTERNS = {
    'int': [
        {
            pattern: '{var} = {var} + {int_literal}',
            description: 'Addition d\'un entier',
            difficulty: 1,
            generateCode: (context) => {
                const varName = context.varName;
                const value = getRandomInt(1, context.difficulty + 1);
                return `${varName} = ${varName} + ${value}`;
            }
        },
        {
            pattern: '{var} += {int_literal}',
            description: 'Addition avec opérateur composé',
            difficulty: 2,
            generateCode: (context) => {
                const varName = context.varName;
                const value = getRandomInt(1, context.difficulty + 1);
                return `${varName} += ${value}`;
            }
        },
        // Autres patterns pour int...
    ],
    'str': [
        {
            pattern: '{var} = {var} + {str_literal}',
            description: 'Concaténation de chaînes',
            difficulty: 1,
            generateCode: (context) => {
                const varName = context.varName;
                const text = getRandomItem(["texte", "donnée", "valeur", "info"]);
                return `${varName} = ${varName} + " ${text}"`;
            }
        },
        {
            pattern: '{var} = {var}.upper()',
            description: 'Conversion en majuscules',
            difficulty: 3,
            generateCode: (context) => {
                return `${context.varName} = ${context.varName}.upper()`;
            }
        },
        // Autres patterns pour str...
    ],
    // Autres types (bool, list, float...)
};

const STRUCTURE_PATTERNS = {
    'if': [
        {
            pattern: 'if {condition}: {block}',
            description: 'Structure conditionnelle simple',
            difficulty: 1,
            requiredOptions: ['cond_if'],
            generateCode: (context) => {
                const condition = generateConditionExpression(context);
                return `if ${condition}:\n${indent(context.bodyCode)}`;
            }
        },
        {
            pattern: 'if {condition}: {block} else: {block}',
            description: 'Structure conditionnelle avec else',
            difficulty: 2,
            requiredOptions: ['cond_if', 'cond_if_else'],
            generateCode: (context) => {
                const condition = generateConditionExpression(context);
                return `if ${condition}:\n${indent(context.bodyCode)}\nelse:\n${indent(context.elseCode)}`;
            }
        }
        // Autres patterns if...
    ],
    'for': [
        {
            pattern: 'for {iterator} in range({int_literal}): {block}',
            description: 'Boucle for avec range simple',
            difficulty: 1,
            requiredOptions: ['loop_for_range'],
            generateCode: (context) => {
                const iterator = generateUniqueIteratorName('int');
                const limit = getRandomInt(2, context.difficulty + 3);
                return `for ${iterator} in range(${limit}):\n${indent(context.bodyCode)}`;
            }
        }
        // Autres patterns for...
    ]
    // Autres structures (while, for-list, functions...)
};

// Patterns pour le corps des structures
const BLOCK_BODY_PATTERNS = {
    'if_body': [
        {
            pattern: '{var_modification}',
            difficulty: 1,
            generateCode: (context) => {
                const targetVar = selectAppropriateVariable(context);
                return generateVariedOperation(getTypeOfVariable(targetVar), targetVar, context.difficulty);
            }
        },
        // Autres patterns pour corps de if...
    ],
    'for_body': [
        {
            pattern: '{accumulation_pattern}',
            difficulty: 1,
            generateCode: (context) => {
                const targetVar = selectAppropriateVariable(context);
                return `${targetVar} += ${context.iteratorVar}`;
            }
        },
        // Autres patterns pour corps de for...
    ]
    // Autres types de corps...
};

// Patterns pour un programme complet
const PROGRAM_PATTERNS = [
    {
        name: 'variables-conditionals',
        description: 'Définition de variables suivie d\'un bloc conditionnel',
        difficulty: 1,
        requiredOptions: ['cond_if'],
        structure: [
            '{variable_declarations}',
            '{conditional_block}',
            '{variable_operations}'
        ]
    },
    {
        name: 'variables-loop',
        description: 'Définition de variables suivie d\'une boucle',
        difficulty: 2,
        requiredOptions: ['loop_for_range', 'loop_for_list', 'loop_for_str', 'loop_while'],
        structure: [
            '{variable_declarations}',
            '{loop_block}',
            '{result_computation}'
        ]
    }
    // Autres patterns de programme...
];

// Fonctions utilitaires pour la génération
function generateConditionExpression(context) {
    // Logique pour générer une condition appropriée
}

function selectAppropriateVariable(context) {
    // Sélectionne une variable appropriée au contexte
}

// Exporter les patterns
module.exports = {
    OPERATION_PATTERNS,
    STRUCTURE_PATTERNS,
    BLOCK_BODY_PATTERNS,
    PROGRAM_PATTERNS
};