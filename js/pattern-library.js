// Remplacer module.exports par une variable globale

/**
 * Bibliothèque de patterns pour la génération de code Python pédagogique
 * Chaque pattern définit une structure syntaxique avec des placeholders à remplir
 */

// Bibliothèque globale de patterns pour le code Python
const PATTERN_LIBRARY = {
    // --- CONSTANTES POUR LA GÉNÉRATION ---
    
    // Noms de variables appropriés par type (conformes à PEP8)
    VAR_NAMES_BY_TYPE: {
        int: ['count', 'total', 'num', 'value', 'index', 'i', 'j', 'k', 'x', 'y', 'z', 'age', 'score'],
        float: ['price', 'rate', 'ratio', 'avg', 'score', 'factor', 'pi', 'epsilon', 'scale'],
        str: ['name', 'text', 'message', 'word', 'label', 'title', 'code', 'prefix', 'suffix', 'greeting'],
        list: ['items', 'values', 'data', 'elements', 'numbers', 'results', 'scores', 'names', 'words'],
        bool: ['is_valid', 'found', 'done', 'active', 'enabled', 'exists', 'has_value', 'ready', 'completed']
    },

    // Valeurs littérales pour chaque type
    LITERALS_BY_TYPE: {
        int: (difficulty) => {
            // Plus la difficulté augmente, plus les valeurs possibles sont grandes
            const range = Math.min(5 + difficulty * 5, 50);
            return Math.floor(Math.random() * range * 2) - range;
        },
        float: (difficulty) => {
            const range = Math.min(5 + difficulty * 5, 50);
            const value = (Math.random() * range * 2) - range;
            return parseFloat(value.toFixed(2));
        },
        str: (difficulty) => {
            const simpleWords = ["hello", "world", "python", "code", "text"];
            const mediumWords = ["message", "example", "program", "welcome", "student"];
            const complexWords = ["algorithm", "function", "variable", "developer", "computation"];
            
            let wordPool;
            if (difficulty <= 2) {
                wordPool = simpleWords;
            } else if (difficulty <= 4) {
                wordPool = [...simpleWords, ...mediumWords];
            } else {
                wordPool = [...simpleWords, ...mediumWords, ...complexWords];
            }
            
            return `"${wordPool[Math.floor(Math.random() * wordPool.length)]}"`;
        },
        bool: () => {
            return Math.random() > 0.5 ? "True" : "False";
        },
        list: (difficulty, types = ['int']) => {
            const size = Math.min(2 + difficulty, 6); // Entre 2 et 8 éléments
            const items = [];
            
            // Créer une liste avec différents types selon la difficulté
            for (let i = 0; i < size; i++) {
                // Choisir un type pour cet élément (si homogène, toujours le premier)
                const heterogeneity = difficulty >= 4 && types.length > 1;
                const typeIndex = heterogeneity ? Math.floor(Math.random() * types.length) : 0;
                const type = types[typeIndex];
                
                // Générer une valeur selon le type
                switch(type) {
                    case 'int':
                        items.push(PATTERN_LIBRARY.LITERALS_BY_TYPE.int(difficulty));
                        break;
                    case 'str':
                        items.push(PATTERN_LIBRARY.LITERALS_BY_TYPE.str(difficulty));
                        break;
                    case 'bool':
                        items.push(PATTERN_LIBRARY.LITERALS_BY_TYPE.bool());
                        break;
                    default:
                        items.push(0); // Fallback
                }
            }
            
            return `[${items.join(', ')}]`;
        }
    },

    // Noms de fonction pédagogiques adaptés
    FUNCTION_NAMES: [
        'calculate', 'compute', 'process', 'transform', 'convert',
        'analyze', 'validate', 'check', 'verify', 'format',
        'get_data', 'update', 'create', 'generate', 'build',
        'initialize', 'setup', 'configure', 'prepare', 'find',
        'search', 'retrieve', 'fetch', 'display', 'show',
        'sum', 'multiply', 'divide', 'subtract', 'compare',
        'filter', 'sort', 'count', 'average', 'normalize'
    ],

    // --- PATTERNS D'OPÉRATIONS PAR TYPE DE VARIABLE ---
    OPERATION_PATTERNS: {
        'int': [
            // Niveau 1: Opérations arithmétiques de base
            {
                pattern: '{var} = {var} + {int_literal}',
                description: 'Addition d\'un entier',
                difficulty: 1,
                generateCode: (context) => {
                    const varName = context.varName;
                    const value = getRandomInt(1, Math.min(5, context.difficulty + 1));
                    return `${varName} = ${varName} + ${value}`;
                }
            },
            {
                pattern: '{var} += {int_literal}',
                description: 'Addition avec opérateur composé',
                difficulty: 2,
                generateCode: (context) => {
                    const varName = context.varName;
                    const value = getRandomInt(1, Math.min(5, context.difficulty + 1));
                    return `${varName} += ${value}`;
                }
            },
            {
                pattern: '{var} = {var} - {int_literal}',
                description: 'Soustraction d\'un entier',
                difficulty: 1,
                generateCode: (context) => {
                    const varName = context.varName;
                    const value = getRandomInt(1, Math.min(5, context.difficulty + 1));
                    return `${varName} = ${varName} - ${value}`;
                }
            },
            // Niveau 2: Opérations arithmétiques avancées
            {
                pattern: '{var} = {var} * {int_literal}',
                description: 'Multiplication d\'un entier',
                difficulty: 2,
                generateCode: (context) => {
                    const varName = context.varName;
                    const value = getRandomInt(2, Math.min(5, context.difficulty + 1));
                    return `${varName} = ${varName} * ${value}`;
                }
            },
            {
                pattern: '{var} *= {int_literal}',
                description: 'Multiplication avec opérateur composé',
                difficulty: 3,
                generateCode: (context) => {
                    const varName = context.varName;
                    const value = getRandomInt(2, Math.min(4, context.difficulty));
                    return `${varName} *= ${value}`;
                }
            },
            // Niveau 3: Division entière et modulo
            {
                pattern: '{var} = {var} // {int_literal}',
                description: 'Division entière',
                difficulty: 3,
                generateCode: (context) => {
                    const varName = context.varName;
                    const value = getRandomInt(2, Math.min(4, context.difficulty));
                    return `${varName} = ${varName} // ${value}`;
                }
            },
            {
                pattern: '{var} = {var} % {int_literal}',
                description: 'Modulo (reste de division)',
                difficulty: 3,
                generateCode: (context) => {
                    const varName = context.varName;
                    const value = getRandomInt(2, Math.min(5, context.difficulty + 1));
                    return `${varName} = ${varName} % ${value}`;
                }
            },
            // Niveau 4-5: Expressions conditionnelles et opérations avancées
            {
                pattern: '{var} = {int_literal} if {condition} else {var}',
                description: 'Expression conditionnelle',
                difficulty: 5,
                generateCode: (context) => {
                    const varName = context.varName;
                    const value = getRandomInt(-10, 10);
                    return `${varName} = ${value} if ${varName} < 0 else ${varName}`;
                }
            },
            {
                pattern: '{var} = {var} ** {int_literal}',
                description: 'Élévation à une puissance',
                difficulty: 4,
                generateCode: (context) => {
                    const varName = context.varName;
                    const value = getRandomInt(2, 3); // Limiter pour éviter overflow
                    return `${varName} = ${varName} ** ${value}`;
                }
            }
        ],
        'str': [
            // Niveau 1: Concaténation de base
            {
                pattern: '{var} = {var} + {str_literal}',
                description: 'Concaténation de chaînes',
                difficulty: 1,
                generateCode: (context) => {
                    const varName = context.varName;
                    const texts = ["texte", "donnée", "valeur", "info", "mot"];
                    const text = texts[Math.floor(Math.random() * texts.length)];
                    return `${varName} = ${varName} + " ${text}"`;
                }
            },
            {
                pattern: '{var} += {str_literal}',
                description: 'Concaténation avec opérateur composé',
                difficulty: 2,
                generateCode: (context) => {
                    const varName = context.varName;
                    const texts = [" ajout", " suite", " fin", " extra"];
                    const text = texts[Math.floor(Math.random() * texts.length)];
                    return `${varName} += "${text}"`;
                }
            },
            // Niveau 2-3: Méthodes de chaîne simples
            {
                pattern: '{var} = {var}.upper()',
                description: 'Conversion en majuscules',
                difficulty: 3,
                generateCode: (context) => {
                    return `${context.varName} = ${context.varName}.upper()`;
                }
            },
            {
                pattern: '{var} = {var}.lower()',
                description: 'Conversion en minuscules',
                difficulty: 3,
                generateCode: (context) => {
                    return `${context.varName} = ${context.varName}.lower()`;
                }
            },
            // Niveau 4: Méthodes de chaîne plus avancées
            {
                pattern: '{var} = {var}.replace({old}, {new})',
                description: 'Remplacement dans une chaîne',
                difficulty: 4,
                generateCode: (context) => {
                    const varName = context.varName;
                    // Remplacer un caractère par sa version majuscule
                    const index = Math.floor(Math.random() * 2);
                    return `${varName} = ${varName}.replace(${varName}[${index}], ${varName}[${index}].upper())`;
                }
            },
            {
                pattern: '{var} = {var}.strip()',
                description: 'Suppression des espaces',
                difficulty: 4,
                generateCode: (context) => {
                    return `${context.varName} = ${context.varName}.strip()`;
                }
            },
            // Niveau 5: Slicing et expressions conditionnelles
            {
                pattern: '{var} = {var}[{start}:{end}]',
                description: 'Extraction de sous-chaîne (slicing)',
                difficulty: 5,
                generateCode: (context) => {
                    const varName = context.varName;
                    return `${varName} = ${varName}[1:4]  # Extrait du 2ème au 4ème caractère`;
                }
            },
            {
                pattern: '{var} = {var} + ({suffix} if {condition} else {alt_suffix})',
                description: 'Concaténation conditionnelle',
                difficulty: 5,
                generateCode: (context) => {
                    const varName = context.varName;
                    return `${varName} = ${varName} + (" modifié" if len(${varName}) > 5 else " court")`;
                }
            }
        ],
        'bool': [
            // Niveau 1: Inversion simple
            {
                pattern: '{var} = not {var}',
                description: 'Inversion de booléen',
                difficulty: 1,
                generateCode: (context) => {
                    return `${context.varName} = not ${context.varName}`;
                }
            },
            // Niveau 2: Comparaisons simples
            {
                pattern: '{var} = {int_literal} > {int_literal}',
                description: 'Comparaison de valeurs',
                difficulty: 2,
                generateCode: (context) => {
                    const varName = context.varName;
                    const val1 = getRandomInt(-5, 5);
                    const val2 = getRandomInt(-5, 5);
                    const ops = ['>', '<', '==', '!=', '>=', '<='];
                    const op = ops[Math.floor(Math.random() * ops.length)];
                    return `${varName} = ${val1} ${op} ${val2}`;
                }
            },
            // Niveau 3-4: Opérations logiques
            {
                pattern: '{var} = {bool_literal} and {bool_literal}',
                description: 'Opération logique AND',
                difficulty: 3,
                generateCode: (context) => {
                    const varName = context.varName;
                    const val1 = Math.random() > 0.5 ? "True" : "False";
                    const val2 = Math.random() > 0.5 ? "True" : "False";
                    return `${varName} = ${val1} and ${val2}`;
                }
            },
            {
                pattern: '{var} = {bool_literal} or {bool_literal}',
                description: 'Opération logique OR',
                difficulty: 3,
                generateCode: (context) => {
                    const varName = context.varName;
                    const val1 = Math.random() > 0.5 ? "True" : "False";
                    const val2 = Math.random() > 0.5 ? "True" : "False";
                    return `${varName} = ${val1} or ${val2}`;
                }
            },
            // Niveau 5: Expressions plus complexes
            {
                pattern: '{var} = {var} != {bool_literal}',
                description: 'Comparaison avec négation',
                difficulty: 5,
                generateCode: (context) => {
                    const varName = context.varName;
                    const val = Math.random() > 0.5 ? "True" : "False";
                    return `${varName} = ${varName} != ${val}`;
                }
            }
        ],
        'list': [
            // Niveau 1-2: Ajout d'éléments
            {
                pattern: '{var}.append({element})',
                description: 'Ajout d\'élément à la liste',
                difficulty: 2,
                generateCode: (context) => {
                    const varName = context.varName;
                    const value = getRandomInt(1, 10);
                    return `${varName}.append(${value})`;
                }
            },
            // Niveau 3: Accès aux éléments
            {
                pattern: '{var}[{index}] = {element}',
                description: 'Modification d\'élément',
                difficulty: 3,
                generateCode: (context) => {
                    const varName = context.varName;
                    const index = getRandomInt(0, 2);
                    const value = getRandomInt(1, 10);
                    return `${varName}[${index}] = ${value}  # Modifie l'élément à l'index ${index}`;
                }
            },
            // Niveau 4: Méthodes avancées
            {
                pattern: '{var}.insert({index}, {element})',
                description: 'Insertion à un index spécifique',
                difficulty: 4,
                generateCode: (context) => {
                    const varName = context.varName;
                    const index = getRandomInt(0, 2);
                    const value = getRandomInt(1, 10);
                    return `${varName}.insert(${index}, ${value})`;
                }
            },
            {
                pattern: '{var}.sort()',
                description: 'Tri de la liste',
                difficulty: 4,
                generateCode: (context) => {
                    return `${context.varName}.sort()`;
                }
            },
            // Niveau 5: Slicing et expressions plus complexes
            {
                pattern: '{var} = {var}[{start}:{end}]',
                description: 'Extraction d\'une sous-liste',
                difficulty: 5,
                generateCode: (context) => {
                    const varName = context.varName;
                    const start = getRandomInt(0, 1);
                    const end = getRandomInt(start + 1, start + 3);
                    return `${varName} = ${varName}[${start}:${end}]  # Extrait une partie de la liste`;
                }
            }
        ],
        'float': [
            // Niveau 1-2: Opérations arithmétiques de base
            {
                pattern: '{var} = {var} + {float_literal}',
                description: 'Addition d\'un flottant',
                difficulty: 1,
                generateCode: (context) => {
                    const varName = context.varName;
                    const value = (Math.random() * 5).toFixed(2);
                    return `${varName} = ${varName} + ${value}`;
                }
            },
            {
                pattern: '{var} = {var} * {float_literal}',
                description: 'Multiplication d\'un flottant',
                difficulty: 2,
                generateCode: (context) => {
                    const varName = context.varName;
                    const value = (1 + Math.random() * 3).toFixed(2);
                    return `${varName} = ${varName} * ${value}`;
                }
            },
            // Niveau 3-4: Arrondis et fonctions mathématiques
            {
                pattern: '{var} = round({var}, {digits})',
                description: 'Arrondi à N décimales',
                difficulty: 4,
                generateCode: (context) => {
                    const varName = context.varName;
                    const digits = getRandomInt(1, 3);
                    return `${varName} = round(${varName}, ${digits})`;
                }
            },
            // Niveau 5: Opérations plus complexes
            {
                pattern: '{var} = int({var})',
                description: 'Conversion en entier',
                difficulty: 5,
                generateCode: (context) => {
                    return `${context.varName} = int(${context.varName})`;
                }
            }
        ]
    },

    // --- PATTERNS POUR LES STRUCTURES DE CONTRÔLE ---
    STRUCTURE_PATTERNS: {
        'if': [
            // Niveau 1: If simple
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
            // Niveau 2: If-else
            {
                pattern: 'if {condition}: {block} else: {block}',
                description: 'Structure conditionnelle avec else',
                difficulty: 2,
                requiredOptions: ['cond_if', 'cond_if_else'],
                generateCode: (context) => {
                    const condition = generateConditionExpression(context);
                    return `if ${condition}:\n${indent(context.bodyCode)}\nelse:\n${indent(context.elseCode)}`;
                }
            },
            // Niveau 3-4: If-elif-else
            {
                pattern: 'if {condition1}: {block1} elif {condition2}: {block2} else: {block3}',
                description: 'Structure conditionnelle à branches multiples',
                difficulty: 3,
                requiredOptions: ['cond_if', 'cond_if_elif', 'cond_if_elif_else'],
                generateCode: (context) => {
                    const condition1 = generateConditionExpression(context);
                    const condition2 = generateConditionExpression(context, condition1);
                    return `if ${condition1}:\n${indent(context.bodyCode)}\nelif ${condition2}:\n${indent(context.elifCode)}\nelse:\n${indent(context.elseCode)}`;
                }
            }
        ],
        'for': [
            // Niveau 1: For avec range simple
            {
                pattern: 'for {iterator} in range({int_literal}): {block}',
                description: 'Boucle for avec range simple',
                difficulty: 1,
                requiredOptions: ['loop_for_range'],
                generateCode: (context) => {
                    const iterator = generateUniqueIteratorName('int');
                    const limit = getRandomInt(2, Math.min(5, context.difficulty + 3));
                    return `for ${iterator} in range(${limit}):\n${indent(context.bodyCode)}`;
                }
            },
            // Niveau 2-3: For avec range plus complexe
            {
                pattern: 'for {iterator} in range({start}, {end}): {block}',
                description: 'Boucle for avec range à plage spécifiée',
                difficulty: 3,
                requiredOptions: ['loop_for_range'],
                generateCode: (context) => {
                    const iterator = generateUniqueIteratorName('int');
                    const start = getRandomInt(1, 3);
                    const end = getRandomInt(start + 2, start + 5);
                    return `for ${iterator} in range(${start}, ${end}):\n${indent(context.bodyCode)}`;
                }
            },
            // Niveau 2: For sur liste
            {
                pattern: 'for {iterator} in {list}: {block}',
                description: 'Boucle for sur une liste',
                difficulty: 2,
                requiredOptions: ['loop_for_list'],
                generateCode: (context) => {
                    const iterator = generateUniqueIteratorName('list');
                    const list = context.declaredVarsByType.list.length > 0 ? 
                        context.declaredVarsByType.list[Math.floor(Math.random() * context.declaredVarsByType.list.length)] : 
                        '[1, 2, 3]';
                    return `for ${iterator} in ${list}:\n${indent(context.bodyCode)}`;
                }
            },
            // Niveau 3: For sur chaîne
            {
                pattern: 'for {iterator} in {str}: {block}',
                description: 'Boucle for sur une chaîne de caractères',
                difficulty: 3,
                requiredOptions: ['loop_for_str'],
                generateCode: (context) => {
                    const iterator = generateUniqueIteratorName('str');
                    const str = context.declaredVarsByType.str.length > 0 ? 
                        context.declaredVarsByType.str[Math.floor(Math.random() * context.declaredVarsByType.str.length)] : 
                        '"hello"';
                    return `for ${iterator} in ${str}:\n${indent(context.bodyCode)}`;
                }
            }
        ],
        'while': [
            // Niveau 3: While simple
            {
                pattern: 'while {condition}: {block}',
                description: 'Boucle while simple',
                difficulty: 3,
                requiredOptions: ['loop_while'],
                generateCode: (context) => {
                    // Pour assurer que la boucle se termine, utiliser une condition qui devient fausse
                    const counterVar = generateUniqueVarName('int');
                    const setup = `${counterVar} = ${getRandomInt(3, 5)}`;
                    context.counterVar = counterVar;
                    const condition = `${counterVar} > 0`;
                    
                    // Générer le corps avec une décrémentation
                    const decrementLine = `${counterVar} -= 1  # Décrémente pour terminer la boucle`;
                    const body = context.bodyCode ? `${context.bodyCode}\n${indent(decrementLine)}` : indent(decrementLine);
                    
                    return `${setup}\nwhile ${condition}:\n${indent(body)}`;
                }
            },
            // Niveau 4-5: While avec condition plus complexe
            {
                pattern: 'while {complex_condition}: {block}',
                description: 'Boucle while avec condition complexe',
                difficulty: 5,
                requiredOptions: ['loop_while'],
                generateCode: (context) => {
                    const counterVar = generateUniqueVarName('int');
                    const limitVar = generateUniqueVarName('int');
                    
                    const setup = `${counterVar} = 0\n${limitVar} = ${getRandomInt(3, 5)}`;
                    context.counterVar = counterVar;
                    const condition = `${counterVar} < ${limitVar} and ${Math.random() > 0.5 ? "True" : `${limitVar} > 2`}`;
                    
                    const incrementLine = `${counterVar} += 1  # Incrémente pour progression`;
                    const body = context.bodyCode ? `${context.bodyCode}\n${indent(incrementLine)}` : indent(incrementLine);
                    
                    return `${setup}\nwhile ${condition}:\n${indent(body)}`;
                }
            }
        ],
        'function': [
            // Niveau 3: Fonction simple sans paramètre
            {
                pattern: 'def {name}(): {block}',
                description: 'Fonction sans paramètre',
                difficulty: 3,
                requiredOptions: ['func_def'],
                generateCode: (context) => {
                    const funcName = getRandomItem(PATTERN_LIBRARY.FUNCTION_NAMES);
                    return `def ${funcName}():\n${indent(context.bodyCode)}\n\n# Appel de la fonction\n${funcName}()`;
                }
            },
            // Niveau 4: Fonction avec un paramètre
            {
                pattern: 'def {name}({param}): {block}',
                description: 'Fonction avec un paramètre',
                difficulty: 4,
                requiredOptions: ['func_def', 'func_def_a'],
                generateCode: (context) => {
                    const funcName = getRandomItem(PATTERN_LIBRARY.FUNCTION_NAMES);
                    const paramName = chooseAppropriateParameterName(funcName);
                    const paramValue = getAppropriateParamValue(paramName);
                    
                    return `def ${funcName}(${paramName}):\n${indent(context.bodyCode)}\n\n# Appel de la fonction\n${funcName}(${paramValue})`;
                }
            },
            // Niveau 5: Fonction avec plusieurs paramètres et return
            {
                pattern: 'def {name}({param1}, {param2}): {block} return {result}',
                description: 'Fonction avec retour de valeur',
                difficulty: 5,
                requiredOptions: ['func_def', 'func_def_ab', 'func_return'],
                generateCode: (context) => {
                    const funcName = getRandomItem(PATTERN_LIBRARY.FUNCTION_NAMES);
                    const params = chooseAppropriateParameterNames(funcName, 2);
                    const paramValues = params.map(param => getAppropriateParamValue(param));
                    
                    // Générer un corps qui utilise les paramètres
                    let body = context.bodyCode;
                    if (context.options.var_int_count > 0) {
                        const resultVar = generateUniqueVarName('int');
                        body = `${resultVar} = ${params[0]} + ${params[1]}\n${indent(context.bodyCode)}`;
                        
                        return `def ${funcName}(${params.join(", ")}):\n${indent(body)}\n${indent(`return ${resultVar}`)}\n\n# Appel de la fonction\nresult = ${funcName}(${paramValues.join(", ")})`;
                    } else {
                        return `def ${funcName}(${params.join(", ")}):\n${indent(body)}\n${indent("return True")}\n\n# Appel de la fonction\nresult = ${funcName}(${paramValues.join(", ")})`;
                    }
                }
            }
        ]
    },

    // --- PATTERNS POUR LES CORPS DES STRUCTURES ---
    BLOCK_BODY_PATTERNS: {
        'if_body': [
            // Niveau 1: Corps simple (une ligne)
            {
                pattern: '{var_modification}',
                difficulty: 1,
                generateCode: (context) => {
                    const targetVar = selectAppropriateVariable(context);
                    if (!targetVar) return "pass";
                    
                    const varType = getTypeOfVariable(targetVar, context);
                    return generateVariedOperation(varType, targetVar, context.difficulty);
                }
            },
            // Niveau 3-4: Corps plus complexe (plusieurs lignes)
            {
                pattern: '{var_modification}\n{var_modification}',
                difficulty: 3,
                generateCode: (context) => {
                    const targetVar1 = selectAppropriateVariable(context);
                    if (!targetVar1) return "pass";
                    
                    const varType1 = getTypeOfVariable(targetVar1, context);
                    const op1 = generateVariedOperation(varType1, targetVar1, context.difficulty);
                    
                    // Essayer de trouver une deuxième variable différente
                    let targetVar2;
                    let attempts = 0;
                    do {
                        targetVar2 = selectAppropriateVariable(context);
                        attempts++;
                    } while (targetVar2 === targetVar1 && attempts < 5);
                    
                    if (!targetVar2 || targetVar2 === targetVar1) {
                        return op1;
                    }
                    
                    const varType2 = getTypeOfVariable(targetVar2, context);
                    const op2 = generateVariedOperation(varType2, targetVar2, context.difficulty);
                    
                    return `${op1}\n${op2}`;
                }
            },
            // Niveau 5: Corps avec imbrication
            {
                pattern: '{nested_if}',
                difficulty: 5,
                generateCode: (context) => {
                    if (context.difficulty < 5) return "pass";
                    
                    const targetVar = selectAppropriateVariable(context);
                    if (!targetVar) return "pass";
                    
                    const varType = getTypeOfVariable(targetVar, context);
                    const condition = generateSimpleCondition(context);
                    const trueOperation = generateVariedOperation(varType, targetVar, context.difficulty);
                    
                    return `if ${condition}:\n${indent(trueOperation)}`;
                }
            }
        ],
        'for_body': [
            // Niveau 1: Corps simple utilisant l'itérateur
            {
                pattern: '{accumulation_pattern}',
                difficulty: 1,
                generateCode: (context) => {
                    const targetVar = selectAppropriateVariable(context);
                    if (!targetVar) return "pass";
                    
                    const iterVar = context.iteratorVar || "i";
                    const varType = getTypeOfVariable(targetVar, context);
                    
                    // Le comportement dépend du type de la cible
                    if (varType === 'int') {
                        return `${targetVar} += ${iterVar}  # Accumulation`;
                    } else if (varType === 'str') {
                        return `${targetVar} += str(${iterVar})  # Conversion et concaténation`;
                    } else if (varType === 'list') {
                        return `${targetVar}.append(${iterVar})  # Ajout à la liste`;
                    } else {
                        return `print(${iterVar})  # Affichage simple`;
                    }
                }
            },
            // Niveau 3: Corps avec condition sur l'itérateur
            {
                pattern: '{conditional_accumulation}',
                difficulty: 3,
                generateCode: (context) => {
                    const targetVar = selectAppropriateVariable(context);
                    if (!targetVar) return "pass";
                    
                    const iterVar = context.iteratorVar || "i";
                    const varType = getTypeOfVariable(targetVar, context);
                    
                    // Condition sur l'itérateur
                    let condition;
                    if (context.iteratorType === 'int') {
                        condition = `${iterVar} % 2 == 0`;  // Si itérateur est pair
                    } else if (context.iteratorType === 'str') {
                        condition = `${iterVar} in "aeiou"`;  // Si itérateur est une voyelle
                    } else {
                        condition = `${iterVar} > 0` + (context.difficulty >= 4 ? ` and ${iterVar} < 10` : "");  // Condition générique
                    }
                    
                    // Opération à effectuer si la condition est vraie
                    let operation;
                    if (varType === 'int') {
                        operation = `${targetVar} += ${iterVar}`;
                    } else if (varType === 'str') {
                        operation = `${targetVar} += str(${iterVar}).upper()`;
                    } else if (varType === 'list') {
                        operation = `${targetVar}.append(${iterVar})`;
                    } else {
                        operation = `print(${iterVar})`;
                    }
                    
                    return `if ${condition}:\n${indent(operation)}`;
                }
            }
        ],
        'while_body': [
            // Niveau 2: Corps simple
            {
                pattern: '{var_modification}',
                difficulty: 2,
                generateCode: (context) => {
                    const targetVar = selectAppropriateVariable(context);
                    if (!targetVar) return "pass";
                    
                    const varType = getTypeOfVariable(targetVar, context);
                    return generateVariedOperation(varType, targetVar, context.difficulty);
                }
            },
            // Niveau 4: Corps avec condition
            {
                pattern: '{conditional_modification}',
                difficulty: 4,
                generateCode: (context) => {
                    const targetVar = selectAppropriateVariable(context);
                    if (!targetVar) return "pass";
                    
                    const varType = getTypeOfVariable(targetVar, context);
                    const operation = generateVariedOperation(varType, targetVar, context.difficulty);
                    
                    // Condition basée sur le compteur de la boucle
                    const counterVar = context.counterVar || "counter";
                    const condition = `${counterVar} % 2 == 0`;
                    
                    return `if ${condition}:\n${indent(operation)}`;
                }
            }
        ],
        'function_body': [
            // Niveau 3: Corps simple utilisant le paramètre
            {
                pattern: '{param_usage}',
                difficulty: 3,
                generateCode: (context) => {
                    const params = context.params || [];
                    if (params.length === 0) {
                        // Fonction sans paramètre
                        const targetVar = selectAppropriateVariable(context);
                        if (!targetVar) return "pass";
                        
                        const varType = getTypeOfVariable(targetVar, context);
                        return generateVariedOperation(varType, targetVar, context.difficulty);
                    } else {
                        // Fonction avec paramètre(s)
                        const param = params[0];
                        
                        // Si on a un résultat à calculer
                        if (context.resultVar) {
                            if (params.length >= 2) {
                                return `${context.resultVar} = ${params[0]} + ${params[1]}  # Calcul avec les paramètres`;
                            } else {
                                return `${context.resultVar} = ${params[0]} * 2  # Calcul avec le paramètre`;
                            }
                        } else if (context.options.builtin_print) {
                            return `print("Valeur:", ${param})  # Affichage du paramètre`;
                        } else {
                            const targetVar = selectAppropriateVariable(context);
                            if (!targetVar) return "pass";
                            
                            return `${targetVar} = ${param}  # Utilisation du paramètre`;
                        }
                    }
                }
            },
            // Niveau 5: Corps avec logique conditionnelle
            {
                pattern: '{param_conditional_logic}',
                difficulty: 5,
                generateCode: (context) => {
                    const params = context.params || [];
                    if (params.length === 0) return "pass";
                    
                    const param = params[0];
                    const condition = params.length >= 2 ? 
                        `${params[0]} > ${params[1]}` : 
                        `${param} > 0`;
                    
                    // Opération conditionnelle
                    if (context.resultVar) {
                        return `if ${condition}:\n${indent(`${context.resultVar} = ${param} * 2`)}\nelse:\n${indent(`${context.resultVar} = ${param}`)}`;
                    } else {
                        return `if ${condition}:\n${indent(`print("Positif: ${param}")`)}\nelse:\n${indent(`print("Non positif: ${param}")`)}`;
                    }
                }
            }
        ]
    },

    // --- PATTERNS POUR UN PROGRAMME COMPLET ---
    PROGRAM_PATTERNS: [
        // Niveau 1: Variables et opérations simples
        {
            name: 'variables-basic',
            description: 'Déclaration et opérations sur variables simples',
            difficulty: 1,
            structure: [
                '{variable_declarations}',
                '{variable_operations}'
            ]
        },
        // Niveau 2: Variables avec condition simple
        {
            name: 'variables-conditionals',
            description: 'Définition de variables suivie d\'un bloc conditionnel',
            difficulty: 2,
            requiredOptions: ['cond_if'],
            structure: [
                '{variable_declarations}',
                '{conditional_block}',
                '{variable_operations}'
            ]
        },
        // Niveau 3: Variables avec boucle
        {
            name: 'variables-loop',
            description: 'Définition de variables suivie d\'une boucle',
            difficulty: 3,
            requiredOptions: ['loop_for_range', 'loop_for_list', 'loop_for_str', 'loop_while'],
            structure: [
                '{variable_declarations}',
                '{loop_block}',
                '{result_computation}'
            ]
        },
        // Niveau 4: Variables, boucles et conditions combinées
        {
            name: 'mixed-control-structures',
            description: 'Mélange de structures de contrôle',
            difficulty: 4,
            requiredOptions: ['cond_if', 'loop_for_range', 'loop_for_list', 'loop_for_str', 'loop_while'],
            structure: [
                '{variable_declarations}',
                '{conditional_block}',
                '{loop_block}',
                '{result_computation}'
            ]
        },
        // Niveau 5: Programme avec fonction
        {
            name: 'function-based',
            description: 'Programme organisé autour d\'une fonction',
            difficulty: 5,
            requiredOptions: ['func_def'],
            structure: [
                '{variable_declarations}',
                '{function_definition}',
                '{result_computation}'
            ]
        }
    ]
};
// --- FONCTIONS UTILITAIRES ---

/**
 * Génère une expression de condition appropriée au contexte
 * @param {Object} context - Contexte de génération
 * @param {string} [excludeCondition] - Condition à exclure pour éviter la répétition
 * @returns {string} - Expression de condition
 */
function generateConditionExpression(context, excludeCondition) {
    const { declaredVarsByType, difficulty } = context;
    
    // Options pour les conditions selon la difficulté
    const conditionOptions = [];
    
    // Utiliser une variable bool existante
    if (declaredVarsByType.bool && declaredVarsByType.bool.length > 0) {
        declaredVarsByType.bool.forEach(varName => {
            const condition = varName;
            if (condition !== excludeCondition) {
                conditionOptions.push(condition);
            }
            
            if (difficulty >= 3) {
                const notCondition = `not ${varName}`;
                if (notCondition !== excludeCondition) {
                    conditionOptions.push(notCondition);
                }
            }
        });
    }
    
    // Utiliser une variable int existante pour comparaison
    if (declaredVarsByType.int && declaredVarsByType.int.length > 0) {
        declaredVarsByType.int.forEach(varName => {
            const operators = ['>', '<', '==', '!=', '>=', '<='];
            const values = [-5, -1, 0, 1, 5, 10];
            
            operators.forEach(op => {
                values.forEach(val => {
                    const condition = `${varName} ${op} ${val}`;
                    if (condition !== excludeCondition) {
                        conditionOptions.push(condition);
                    }
                });
            });
        });
    }
    
    // Conditions littérales
    conditionOptions.push(...['True', 'False']);
    
    // Si difficulté élevée, ajouter des conditions composées
    if (difficulty >= 4 && conditionOptions.length >= 2) {
        const operators = ['and', 'or'];
        const basicConditions = [...conditionOptions];
        
        operators.forEach(op => {
            for (let i = 0; i < basicConditions.length; i++) {
                for (let j = 0; j < basicConditions.length; j++) {
                    if (i !== j) {
                        const compound = `${basicConditions[i]} ${op} ${basicConditions[j]}`;
                        if (compound !== excludeCondition) {
                            conditionOptions.push(compound);
                        }
                    }
                }
            }
        });
    }
    
    // Si aucune option, utiliser une condition par défaut
    if (conditionOptions.length === 0) {
        return difficulty >= 3 ? "len(str(5)) > 0" : "True";
    }
    
    // Sélectionner une condition aléatoirement
    return getRandomItem(conditionOptions);
}

/**
 * Génère une condition simple pour les corps de bloc
 */
function generateSimpleCondition(context) {
    const { difficulty } = context;
    
    const conditions = [
        "True",
        "False",
        "x > 0",
        "len('abc') == 3",
        "5 % 2 == 1",
        "3 + 2 == 5",
        "'a' in 'abc'"
    ];
    
    const advancedConditions = [
        "sum([1, 2]) == 3",
        "all([True, False]) == False",
        "any([True, False]) == True",
        "bool('') == False",
        "isinstance(5, int)"
    ];
    
    return getRandomItem(difficulty >= 4 ? [...conditions, ...advancedConditions] : conditions);
}

/**
 * Sélectionne une variable appropriée dans le contexte
 * @param {Object} context - Contexte de génération
 * @returns {string|null} - Nom de la variable ou null si aucune n'est disponible
 */
function selectAppropriateVariable(context) {
    const { declaredVarsByType } = context;
    
    // Récupérer toutes les variables disponibles
    const allVars = [];
    for (const type in declaredVarsByType) {
        if (declaredVarsByType[type] && declaredVarsByType[type].length) {
            allVars.push(...declaredVarsByType[type]);
        }
    }
    
    if (allVars.length === 0) return null;
    return getRandomItem(allVars);
}

/**
 * Indente un bloc de code
 * @param {string} code - Code à indenter
 * @param {number} level - Niveau d'indentation (défaut: 1)
 * @returns {string} - Code indenté
 */
function indent(code, level = 1) {
    const spaces = "    ".repeat(level);
    return code.split('\n').map(line => spaces + line).join('\n');
}

/**
 * Détermine le type d'une variable dans le contexte
 * @param {string} varName - Nom de la variable
 * @param {Object} context - Contexte de génération
 * @returns {string} - Type de la variable
 */
function getTypeOfVariable(varName, context) {
    const { declaredVarsByType } = context;
    
    for (const type in declaredVarsByType) {
        if (declaredVarsByType[type] && declaredVarsByType[type].includes(varName)) {
            return type;
        }
    }
    
    // Inférer le type par convention de nommage
    if (varName.startsWith('is_') || varName.startsWith('has_')) {
        return 'bool';
    } else if (varName.includes('list') || varName.endsWith('s')) {
        return 'list';
    } else if (varName.includes('str') || varName.includes('text')) {
        return 'str';
    } else if (varName.includes('float') || varName.includes('price')) {
        return 'float';
    }
    
    // Par défaut
    return 'int';
}

/**
 * Génère une opération variée pour un type de variable
 * @param {string} type - Type de la variable
 * @param {string} varName - Nom de la variable
 * @param {number} difficulty - Niveau de difficulté
 * @returns {string} - Code de l'opération
 */
function generateVariedOperation(type, varName, difficulty) {
    const patterns = PATTERN_LIBRARY.OPERATION_PATTERNS[type];
    if (!patterns) return `${varName} = ${varName}  # Type non supporté`;
    
    // Filtrer les patterns selon la difficulté
    const availablePatterns = patterns.filter(p => p.difficulty <= difficulty);
    if (availablePatterns.length === 0) {
        // Fallback pour les types sans patterns ou difficulté insuffisante
        return `${varName} = ${varName}  # Pas d'opération disponible`;
    }
    
    // Sélectionner un pattern aléatoirement
    const selectedPattern = getRandomItem(availablePatterns);
    
    // Générer l'opération
    return selectedPattern.generateCode({ varName, difficulty });
}

/**
 * Choisit des noms de paramètres appropriés pour une fonction
 * @param {string} funcName - Nom de la fonction
 * @param {number} count - Nombre de paramètres
 * @returns {string[]} - Tableau de noms de paramètres
 */
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
    
    // Sélectionner des paramètres uniques
    const result = [];
    const shuffled = [...paramList].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < count && i < shuffled.length; i++) {
        result.push(shuffled[i]);
    }
    
    return result;
}

/**
 * Choisit un nom de paramètre approprié pour une fonction
 * @param {string} funcName - Nom de la fonction
 * @returns {string} - Nom de paramètre
 */
function chooseAppropriateParameterName(funcName) {
    return chooseAppropriateParameterNames(funcName, 1)[0];
}

/**
 * Génère une valeur appropriée pour un paramètre de fonction
 * @param {string} paramName - Nom du paramètre
 * @returns {string} - Valeur du paramètre
 */
function getAppropriateParamValue(paramName) {
    // Valeurs appropriées selon le nom du paramètre
    const mathParams = ['x', 'y', 'n', 'a', 'b', 'num', 'value'];
    const dataParams = ['data', 'items', 'elements', 'values', 'collection'];
    const textParams = ['text', 'message', 'content', 'string', 'input'];
    
    if (mathParams.includes(paramName)) {
        return Math.floor(Math.random() * 10);
    } else if (dataParams.includes(paramName)) {
        return "[1, 2, 3]";
    } else if (textParams.includes(paramName)) {
        return `"exemple"`;
    } else {
        return "True";
    }
}

/**
 * Génère un nom unique d'itérateur selon le type de boucle
 * @param {string} type - Type d'itérateur ('int', 'list', 'str')
 * @returns {string} - Nom d'itérateur
 */
function generateUniqueIteratorName(type) {
    const prefixMap = {
        'int': 'i',
        'str': 'char',
        'list': 'item'
    };
    
    return prefixMap[type] || 'iter';
}

/**
 * Génère un entier aléatoire dans un intervalle
 * @param {number} min - Valeur minimale (incluse)
 * @param {number} max - Valeur maximale (incluse)
 * @returns {number} - Entier aléatoire
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Sélectionne un élément aléatoire dans un tableau
 * @param {Array} array - Tableau d'éléments
 * @returns {*} - Élément aléatoire
 */
function getRandomItem(array) {
    if (!array || array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Génère un nom de variable unique selon le type
 * @param {string} type - Type de variable ('int', 'str', etc.)
 * @returns {string} - Nom de variable
 */
function generateUniqueVarName(type) {
    const typeNames = PATTERN_LIBRARY.VAR_NAMES_BY_TYPE[type] || PATTERN_LIBRARY.VAR_NAMES_BY_TYPE.int;
    return `${getRandomItem(typeNames)}${Math.floor(Math.random() * 100)}`;
}
// Pas d'export, la variable PATTERN_LIBRARY est globale