/**
 * Définition des patterns d'opération valides pour chaque type
 * avec vérification intrinsèque de la compatibilité des types
 */
const OPERATION_PATTERNS = {
    'int': [
        {
            pattern: '{var} = {var} + {int}',
            description: 'Addition',
            minDifficulty: 1,
            generate: (varName, difficulty) => {
                const value = getRandomInt(1, difficulty+1);
                return `${varName} = ${varName} + ${value}`;
            }
        },
        {
            pattern: '{var} = {int} + {var}',
            description: 'Addition inversée',
            minDifficulty: 1,
            generate: (varName, difficulty) => {
                const value = getRandomInt(1, difficulty+1);
                return `${value} + ${varName}`;
            }
        },
        {
            pattern: '{var} += {int}',
            description: 'Addition avec opérateur composé',
            minDifficulty: 2,
            generate: (varName, difficulty) => {
                const value = getRandomInt(1, difficulty+1);
                return `${varName} += ${value}`;
            }
        },
        {
            pattern: '{var} = {var} * {int}',
            description: 'Multiplication',
            minDifficulty: 2,
            generate: (varName, difficulty) => {
                const value = getRandomInt(2, difficulty+1);
                return `${varName} = ${varName} * ${value}`;
            }
        },
        // Plus de patterns pour int...
    ],
    'str': [
        {
            pattern: '{var} = {var} + {str}',
            description: 'Concaténation',
            minDifficulty: 1,
            generate: (varName, difficulty) => {
                const text = getRandomItem(["texte", "donnée", "valeur", "info"]);
                return `${varName} = ${varName} + " ${text}"`;
            }
        },
        {
            pattern: '{var} += {str}',
            description: 'Concaténation avec +=',
            minDifficulty: 1,
            generate: (varName, difficulty) => {
                const text = getRandomItem(["texte", "donnée", "valeur", "info"]);
                return `${varName} += " ${text}"`;
            }
        },
        {
            pattern: '{var} = {var}.upper()',
            description: 'Conversion en majuscules',
            minDifficulty: 3,
            generate: (varName) => `${varName} = ${varName}.upper()`
        },
        // Plus de patterns pour str...
    ],
    'list': [
        {
            pattern: '{var}.append({int})',
            description: 'Ajout d\'élément',
            minDifficulty: 1,
            generate: (varName, difficulty) => {
                const value = getRandomInt(1, difficulty+3);
                return `${varName}.append(${value})`;
            }
        },
        // Plus de patterns pour list...
    ],
    // Autres types...
};

/**
 * Patterns pour les opérations entre types mixtes
 * Ces patterns sont particulièrement importants pour éviter les erreurs de type
 */
const MIXED_TYPE_PATTERNS = [
    {
        types: ['str', 'int'],
        pattern: '{str} = {str} + str({int})',
        description: 'Concaténation string+int avec conversion',
        minDifficulty: 2,
        generate: (strVar, intVar) => {
            return `${strVar} = ${strVar} + str(${intVar})`;
        }
    },
    {
        types: ['str', 'list'],
        pattern: '{str} = {str} + str({list})',
        description: 'Concaténation string+liste avec conversion',
        minDifficulty: 3,
        generate: (strVar, listVar) => {
            return `${strVar} = ${strVar} + str(${listVar})`;
        }
    },
    // Autres patterns mixtes...
];

/**
 * Patterns spécifiques pour les corps de structures
 */
const STRUCTURE_BODY_PATTERNS = {
    'for_list': [
        {
            pattern: '{var_int} = {var_int} + {loop_var}',
            description: 'Additionner l\'élément à une variable entière',
            minDifficulty: 1,
            applicableTypes: ['int', 'int'],
            generate: (targetVar, loopVar) => `${targetVar} = ${targetVar} + ${loopVar}`
        },
        {
            pattern: '{var_str} = {var_str} + str({loop_var})',
            description: 'Concaténer l\'élément à une chaîne avec conversion',
            minDifficulty: 1,
            applicableTypes: ['str', 'any'],
            generate: (targetVar, loopVar) => `${targetVar} = ${targetVar} + str(${loopVar})`
        },
        {
            pattern: 'if {loop_var} > 0:',
            description: 'Condition sur l\'élément de liste',
            minDifficulty: 2,
            applicableTypes: ['any', 'numeric'],
            generate: (targetVar, loopVar) => 
                `if ${loopVar} > 0:\n    ${targetVar} += 1`
        },
        // Plus de patterns...
    ],
    'for_str': [
        // Patterns pour for_str...
    ],
    'while': [
        // Patterns pour while...
    ],
    // Autres types de structures...
};
````

## 2. Fonction principale pour générer des opérations variées

````javascript

# ---

function generateVariedOperation(type, varName, difficulty) {
    // Sélectionner les patterns disponibles pour ce type et cette difficulté
    const availablePatterns = OPERATION_PATTERNS[type]
        ? OPERATION_PATTERNS[type].filter(p => p.minDifficulty <= difficulty)
        : [];
    
    if (availablePatterns.length === 0) {
        // Fallback pour les types sans patterns ou trop difficiles
        return `${varName} = ${varName}  # Opération identité`;
    }
    
    // Sélectionner un pattern aléatoire parmi ceux disponibles
    const selectedPattern = getRandomItem(availablePatterns);
    
    // Générer l'opération
    return selectedPattern.generate(varName, difficulty);
}
````

## 3. Fonction pour générer des opérations entre types différents

````javascript

# ---

function generateMixedTypeOperation(difficulty) {
    // Filtrer les patterns selon la difficulté
    const availablePatterns = MIXED_TYPE_PATTERNS
        .filter(p => p.minDifficulty <= difficulty);
    
    if (availablePatterns.length === 0) return null;
    
    // Sélectionner un pattern aléatoire
    const selectedPattern = getRandomItem(availablePatterns);
    
    // Vérifier si nous avons les variables nécessaires
    const requiredTypes = selectedPattern.types;
    const selectedVars = [];
    
    for (const type of requiredTypes) {
        if (declaredVarsByType[type] && declaredVarsByType[type].length > 0) {
            selectedVars.push(getRandomItem(declaredVarsByType[type]));
        } else {
            return null; // Pas assez de variables des types requis
        }
    }
    
    // Générer l'opération mixte
    return selectedPattern.generate(...selectedVars);
}
````

## 4. Fonction améliorée pour les corps de structures

````javascript

# ---

/**
 * Table de compatibilité des opérations entre types Python
 */
const TYPE_COMPATIBILITY = {
    'str': {
        '+': ['str'],                 // str + str -> str
        '+=': ['str'],                // str += str -> str
        '*': ['int'],                 // str * int -> str
        '*=': ['int'],                // str *= int -> str
        'in': ['str'],                // char in str -> bool
        'not in': ['str'],            // char not in str -> bool
        '[]': ['int'],                // str[int] -> str
        '[:]': ['int', 'int'],        // str[int:int] -> str
    },
    'int': {
        '+': ['int', 'float'],        // int + (int|float) -> (int|float)
        '-': ['int', 'float'],        // int - (int|float) -> (int|float)
        '*': ['int', 'float', 'str'], // int * (int|float|str) -> (int|float|str)
        '/': ['int', 'float'],        // int / (int|float) -> float
        '//': ['int', 'float'],       // int // (int|float) -> int
        '%': ['int', 'float'],        // int % (int|float) -> int
        '**': ['int', 'float'],       // int ** (int|float) -> (int|float)
        // Plus d'opérations...
    },
    // Autres types...
};

/**
 * Vérifie si une opération est valide entre deux types Python.
 * @param {string} leftType - Type de la variable de gauche
 * @param {string} operator - Opérateur
 * @param {string} rightType - Type de la variable/valeur de droite
 * @returns {boolean} - True si l'opération est valide
 */
function isOperationValid(leftType, operator, rightType) {
    if (!TYPE_COMPATIBILITY[leftType]) return false;
    if (!TYPE_COMPATIBILITY[leftType][operator]) return false;
    
    return TYPE_COMPATIBILITY[leftType][operator].includes(rightType);
}
````

## 6. Comment intégrer cette solution dans votre architecture

1. **Créez un module pour les patterns**: Stockez les définitions OPERATION_PATTERNS, MIXED_TYPE_PATTERNS, etc. dans un fichier séparé que vous importerez.

2. **Modifiez generateVariedOperation**: Remplacez la logique actuelle par celle basée sur les patterns.

3. **Améliorez generateStructureBody**: Utilisez les patterns définis pour générer des corps de structure plus robustes.

4. **Ajoutez la vérification de types**: Utilisez isOperationValid comme garde-fou avant de générer une opération.

## Avantages de cette approche

1. **Robustesse intrinsèque**: Chaque pattern est défini pour être valide en Python, éliminant les erreurs de type.
  
2. **Maintenabilité améliorée**: Les patterns sont clairement définis et documentés, facilitant les ajouts ou modifications.

3. **Extensibilité**: Ajoutez facilement de nouveaux patterns sans toucher à la logique du générateur.

4. **Contrôle précis de la difficulté**: Chaque pattern a un niveau de difficulté minimal, permettant une progression pédagogique claire.

5. **Variété garantie**: Vous pouvez définir autant de patterns que nécessaire pour enrichir l'expérience d'apprentissage.

Cette approche transformerait votre générateur en un système plus robuste et plus facile à maintenir, tout en offrant une plus grande variété de structures générées.

# ---

/**
 * Définition des patterns d'opération valides pour chaque type
 * avec vérification intrinsèque de la compatibilité des types
 */
const OPERATION_PATTERNS = {
    'int': [
        {
            pattern: '{var} = {var} + {int}',
            description: 'Addition',
            minDifficulty: 1,
            generate: (varName, difficulty) => {
                const value = getRandomInt(1, difficulty+1);
                return `${varName} = ${varName} + ${value}`;
            }
        },
        {
            pattern: '{var} = {int} + {var}',
            description: 'Addition inversée',
            minDifficulty: 1,
            generate: (varName, difficulty) => {
                const value = getRandomInt(1, difficulty+1);
                return `${value} + ${varName}`;
            }
        },
        {
            pattern: '{var} += {int}',
            description: 'Addition avec opérateur composé',
            minDifficulty: 2,
            generate: (varName, difficulty) => {
                const value = getRandomInt(1, difficulty+1);
                return `${varName} += ${value}`;
            }
        },
        {
            pattern: '{var} = {var} * {int}',
            description: 'Multiplication',
            minDifficulty: 2,
            generate: (varName, difficulty) => {
                const value = getRandomInt(2, difficulty+1);
                return `${varName} = ${varName} * ${value}`;
            }
        },
        // Plus de patterns pour int...
    ],
    'str': [
        {
            pattern: '{var} = {var} + {str}',
            description: 'Concaténation',
            minDifficulty: 1,
            generate: (varName, difficulty) => {
                const text = getRandomItem(["texte", "donnée", "valeur", "info"]);
                return `${varName} = ${varName} + " ${text}"`;
            }
        },
        {
            pattern: '{var} += {str}',
            description: 'Concaténation avec +=',
            minDifficulty: 1,
            generate: (varName, difficulty) => {
                const text = getRandomItem(["texte", "donnée", "valeur", "info"]);
                return `${varName} += " ${text}"`;
            }
        },
        {
            pattern: '{var} = {var}.upper()',
            description: 'Conversion en majuscules',
            minDifficulty: 3,
            generate: (varName) => `${varName} = ${varName}.upper()`
        },
        // Plus de patterns pour str...
    ],
    'list': [
        {
            pattern: '{var}.append({int})',
            description: 'Ajout d\'élément',
            minDifficulty: 1,
            generate: (varName, difficulty) => {
                const value = getRandomInt(1, difficulty+3);
                return `${varName}.append(${value})`;
            }
        },
        // Plus de patterns pour list...
    ],
    // Autres types...
};

/**
 * Patterns pour les opérations entre types mixtes
 * Ces patterns sont particulièrement importants pour éviter les erreurs de type
 */
const MIXED_TYPE_PATTERNS = [
    {
        types: ['str', 'int'],
        pattern: '{str} = {str} + str({int})',
        description: 'Concaténation string+int avec conversion',
        minDifficulty: 2,
        generate: (strVar, intVar) => {
            return `${strVar} = ${strVar} + str(${intVar})`;
        }
    },
    {
        types: ['str', 'list'],
        pattern: '{str} = {str} + str({list})',
        description: 'Concaténation string+liste avec conversion',
        minDifficulty: 3,
        generate: (strVar, listVar) => {
            return `${strVar} = ${strVar} + str(${listVar})`;
        }
    },
    // Autres patterns mixtes...
];

/**
 * Patterns spécifiques pour les corps de structures
 */
const STRUCTURE_BODY_PATTERNS = {
    'for_list': [
        {
            pattern: '{var_int} = {var_int} + {loop_var}',
            description: 'Additionner l\'élément à une variable entière',
            minDifficulty: 1,
            applicableTypes: ['int', 'int'],
            generate: (targetVar, loopVar) => `${targetVar} = ${targetVar} + ${loopVar}`
        },
        {
            pattern: '{var_str} = {var_str} + str({loop_var})',
            description: 'Concaténer l\'élément à une chaîne avec conversion',
            minDifficulty: 1,
            applicableTypes: ['str', 'any'],
            generate: (targetVar, loopVar) => `${targetVar} = ${targetVar} + str(${loopVar})`
        },
        {
            pattern: 'if {loop_var} > 0:',
            description: 'Condition sur l\'élément de liste',
            minDifficulty: 2,
            applicableTypes: ['any', 'numeric'],
            generate: (targetVar, loopVar) => 
                `if ${loopVar} > 0:\n    ${targetVar} += 1`
        },
        // Plus de patterns...
    ],
    'for_str': [
        // Patterns pour for_str...
    ],
    'while': [
        // Patterns pour while...
    ],
    // Autres types de structures...
};

# ---

function generateVariedOperation(type, varName, difficulty) {
    // Sélectionner les patterns disponibles pour ce type et cette difficulté
    const availablePatterns = OPERATION_PATTERNS[type]
        ? OPERATION_PATTERNS[type].filter(p => p.minDifficulty <= difficulty)
        : [];
    
    if (availablePatterns.length === 0) {
        // Fallback pour les types sans patterns ou trop difficiles
        return `${varName} = ${varName}  # Opération identité`;
    }
    
    // Sélectionner un pattern aléatoire parmi ceux disponibles
    const selectedPattern = getRandomItem(availablePatterns);
    
    // Générer l'opération
    return selectedPattern.generate(varName, difficulty);
}

# ---

function generateMixedTypeOperation(difficulty) {
    // Filtrer les patterns selon la difficulté
    const availablePatterns = MIXED_TYPE_PATTERNS
        .filter(p => p.minDifficulty <= difficulty);
    
    if (availablePatterns.length === 0) return null;
    
    // Sélectionner un pattern aléatoire
    const selectedPattern = getRandomItem(availablePatterns);
    
    // Vérifier si nous avons les variables nécessaires
    const requiredTypes = selectedPattern.types;
    const selectedVars = [];
    
    for (const type of requiredTypes) {
        if (declaredVarsByType[type] && declaredVarsByType[type].length > 0) {
            selectedVars.push(getRandomItem(declaredVarsByType[type]));
        } else {
            return null; // Pas assez de variables des types requis
        }
    }
    
    // Générer l'opération mixte
    return selectedPattern.generate(...selectedVars);
}

# ---

/**
 * Table de compatibilité des opérations entre types Python
 */
const TYPE_COMPATIBILITY = {
    'str': {
        '+': ['str'],                 // str + str -> str
        '+=': ['str'],                // str += str -> str
        '*': ['int'],                 // str * int -> str
        '*=': ['int'],                // str *= int -> str
        'in': ['str'],                // char in str -> bool
        'not in': ['str'],            // char not in str -> bool
        '[]': ['int'],                // str[int] -> str
        '[:]': ['int', 'int'],        // str[int:int] -> str
    },
    'int': {
        '+': ['int', 'float'],        // int + (int|float) -> (int|float)
        '-': ['int', 'float'],        // int - (int|float) -> (int|float)
        '*': ['int', 'float', 'str'], // int * (int|float|str) -> (int|float|str)
        '/': ['int', 'float'],        // int / (int|float) -> float
        '//': ['int', 'float'],       // int // (int|float) -> int
        '%': ['int', 'float'],        // int % (int|float) -> int
        '**': ['int', 'float'],       // int ** (int|float) -> (int|float)
        // Plus d'opérations...
    },
    // Autres types...
};

/**
 * Vérifie si une opération est valide entre deux types Python.
 * @param {string} leftType - Type de la variable de gauche
 * @param {string} operator - Opérateur
 * @param {string} rightType - Type de la variable/valeur de droite
 * @returns {boolean} - True si l'opération est valide
 */
function isOperationValid(leftType, operator, rightType) {
    if (!TYPE_COMPATIBILITY[leftType]) return false;
    if (!TYPE_COMPATIBILITY[leftType][operator]) return false;
    
    return TYPE_COMPATIBILITY[leftType][operator].includes(rightType);
}