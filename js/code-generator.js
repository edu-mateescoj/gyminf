/**
 * Générateur amélioré de code Python pédagogique
 * Aligne variables par type et génère une structure cohérente selon les options
 */
function generateRandomPythonCode(options) {
    console.log("Début de generateRandomPythonCode avec options :", JSON.parse(JSON.stringify(options)));

    // --- CONSTANTES POUR LA GÉNÉRATION ---
    
    // Noms de variables appropriés par type (conformes à PEP8)
    const VAR_NAMES_BY_TYPE = {
        int: ['count', 'total', 'num', 'value', 'index', 'i', 'j', 'k', 'x', 'y', 'z'],
        float: ['price', 'rate', 'ratio', 'avg', 'score', 'factor', 'pi', 'epsilon', 'scale'],
        str: ['name', 'text', 'message', 'word', 'label', 'title', 'code', 'prefix', 'suffix'],
        list: ['items', 'values', 'data', 'elements', 'numbers', 'results', 'scores', 'names'],
        bool: ['is_valid', 'found', 'done', 'active', 'enabled', 'exists', 'has_value', 'ready']
    };
    
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
    
    // Obtenir la plage de valeurs selon la difficulté
    function getValueRange(difficulty) {
        return difficulty <= 2 ? 5 : (difficulty <= 4 ? 10 : 30);
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
    let allDeclaredVarNames = new Set(); // Pour éviter les doublons de noms
    
    // --- GÉNÉRATION DE VARIABLES (NOUVELLE APPROCHE) ---
    
    function generateUniqueVarName(type) {
        // Noms disponibles pour ce type
        const availableNames = VAR_NAMES_BY_TYPE[type] || VAR_NAMES_BY_TYPE.int;
        
        // Essayer de trouver un nom non utilisé
        for (const name of availableNames) {
            if (!allDeclaredVarNames.has(name)) {
                return name;
            }
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
    
    // Générer une valeur pour un type donné
    function generateValueForType(type) {
        return LITERALS_BY_TYPE[type](difficulty);
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
    function generateControlStructures() {
        // Conditions
        if (options.main_conditions && options.cond_if && linesGenerated < targetLines - 1) {
            generateIfStatement();
        }
        
        // Boucles
        if (options.main_loops) {
            if (options.loop_for_range && linesGenerated < targetLines - 1) {
                generateForRangeLoop();
            } else if (options.loop_for_list && declaredVarsByType.list.length > 0 && linesGenerated < targetLines - 1) {
                generateForListLoop();
            } else if (options.loop_for_str && declaredVarsByType.str.length > 0 && linesGenerated < targetLines - 1) {
                generateForStrLoop();
            } else if (options.loop_while && linesGenerated < targetLines - 2) {
                generateWhileLoop();
            }
        }
        
        // Fonctions
        if (options.main_functions && linesGenerated < targetLines - 3) {
            generateFunction();
        }
    }
    
    // Génération d'un if (avec else optionnel)
    function generateIfStatement() {
        const indent = "    ".repeat(indentLevel);
        let condition;
        
        // Choisir une variable pour la condition
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
            codeLines.push(`${indent}${tempVar} = ${value}`);
            declaredVarsByType.bool.push(tempVar);
            allDeclaredVarNames.add(tempVar);
            linesGenerated++;
            condition = tempVar;
        }
        
        // Générer le corps du if
        codeLines.push(`${indent}if ${condition}:`);
        indentLevel++;
        
        // Instruction simple dans le corps du if
        const ifBodyIndent = "    ".repeat(indentLevel);
        const simpleOp = generateSimpleOperation();
        codeLines.push(`${ifBodyIndent}${simpleOp}`);
        linesGenerated += 2;
        
        // Optionnellement ajouter un else
        if (options.cond_if_else && linesGenerated < targetLines - 1) {
            indentLevel--;
            codeLines.push(`${indent}else:`);
            indentLevel++;
            
            const elseBodyIndent = "    ".repeat(indentLevel);
            const elseOp = generateSimpleOperation();
            codeLines.push(`${elseBodyIndent}${elseOp}`);
            linesGenerated += 2;
        }
        
        indentLevel--; // Retour au niveau précédent
    }
    
    // Génération d'une boucle for..range
    function generateForRangeLoop() {
        const indent = "    ".repeat(indentLevel);
        const loopVar = generateUniqueVarName('int');
        const rangeLimit = getRandomInt(3, 6);
        
        codeLines.push(`${indent}for ${loopVar} in range(${rangeLimit}):`);
        indentLevel++;
        
        // Corps de la boucle - opération simple
        const loopBodyIndent = "    ".repeat(indentLevel);
        
        let loopBody;
        if (declaredVarsByType.int.length > 0) {
            // Modifier une variable existante
            const targetVar = getRandomItem(declaredVarsByType.int);
            loopBody = `${targetVar} += ${loopVar}`;
        } else {
            // Action simple
            loopBody = "pass";
        }
        
        codeLines.push(`${loopBodyIndent}${loopBody}`);
        indentLevel--;
        linesGenerated += 2;
    }
    
    // Génération d'une boucle for..list
    function generateForListLoop() {
        const indent = "    ".repeat(indentLevel);
        const listVar = getRandomItem(declaredVarsByType.list);
        const loopVar = generateUniqueVarName('int'); // Nom pour l'élément de liste
        
        codeLines.push(`${indent}for ${loopVar} in ${listVar}:`);
        indentLevel++;
        
        // Corps de la boucle
        const loopBodyIndent = "    ".repeat(indentLevel);
        
        let loopBody;
        if (options.builtin_print) {
            loopBody = `print(${loopVar})`;
        } else if (declaredVarsByType.int.length > 0) {
            const targetVar = getRandomItem(declaredVarsByType.int);
            loopBody = `${targetVar} += ${loopVar}`;
        } else {
            loopBody = "pass";
        }
        
        codeLines.push(`${loopBodyIndent}${loopBody}`);
        indentLevel--;
        linesGenerated += 2;
    }
    
    // Génération d'une boucle for..str
    function generateForStrLoop() {
        const indent = "    ".repeat(indentLevel);
        const strVar = getRandomItem(declaredVarsByType.str);
        const charVar = generateUniqueVarName('str');
        
        codeLines.push(`${indent}for ${charVar} in ${strVar}:`);
        indentLevel++;
        
        // Corps de la boucle
        const loopBodyIndent = "    ".repeat(indentLevel);
        let loopBody;
        
        if (options.builtin_print) {
            loopBody = `print(${charVar})`;
        } else {
            loopBody = "pass";
        }
        
        codeLines.push(`${loopBodyIndent}${loopBody}`);
        indentLevel--;
        linesGenerated += 2;
    }
    
    // Génération d'une boucle while
    function generateWhileLoop() {
        const indent = "    ".repeat(indentLevel);
        let counterVar;
        
        // Créer une variable compteur pour la boucle
        if (declaredVarsByType.int.length > 0) {
            counterVar = getRandomItem(declaredVarsByType.int);
        } else {
            counterVar = generateUniqueVarName('int');
            codeLines.push(`${indent}${counterVar} = ${getRandomInt(3, 5)}`);
            declaredVarsByType.int.push(counterVar);
            allDeclaredVarNames.add(counterVar);
            linesGenerated++;
        }
        
        codeLines.push(`${indent}while ${counterVar} > 0:`);
        indentLevel++;
        
        // Corps de la boucle
        const loopBodyIndent = "    ".repeat(indentLevel);
        codeLines.push(`${loopBodyIndent}${counterVar} -= 1`);
        indentLevel--;
        linesGenerated += 2;
    }
    
    // Génération d'une fonction simple
    function generateFunction() {
        const indent = "    ".repeat(indentLevel);
        let funcName = "calculer";
        let params = [];
        
        // Déterminer les paramètres selon les options
        if (options.func_def_ab) {
            params = ["a", "b"];
        } else if (options.func_def_a) {
            params = ["a"];
        }
        
        // Définition de la fonction
        codeLines.push(`${indent}def ${funcName}(${params.join(", ")}):`);
        indentLevel++;
        
        // Corps de la fonction
        const funcBodyIndent = "    ".repeat(indentLevel);
        
        // Ajouter des instructions au corps de la fonction
        if (options.builtin_print) {
            codeLines.push(`${funcBodyIndent}print(${params[0] || "None"})`);
        }
        
        if (options.func_return) {
            let returnValue = params[0] || "0";
            if (params.length > 1) {
                returnValue = `${params[0]} + ${params[1]}`;
            }
            codeLines.push(`${funcBodyIndent}return ${returnValue}`);
        } else {
            codeLines.push(`${funcBodyIndent}pass`);
        }
        
        indentLevel--;
        linesGenerated += 2 + (options.builtin_print ? 1 : 0) + (options.func_return ? 1 : 0);
        
        // Appel de la fonction
        if (linesGenerated < targetLines) {
            let args = params.map((_, i) => getRandomInt(1, 5));
            codeLines.push(`${indent}${funcName}(${args.join(", ")})`);
            linesGenerated++;
        }
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
    
    // --- EXÉCUTION DE LA GÉNÉRATION ---
    
    // Phase 1: Générer les variables
    generateVariables();
    
    // Phase 2: Générer les opérations
    generateOperations();
    
    // Phase 3: Générer les structures de contrôle
    generateControlStructures();
    
    // Si on n'a pas généré assez de lignes, ajouter des opérations simples
    while (linesGenerated < targetLines) {
        // Trouver quel type de variable modifier
        const types = Object.keys(declaredVarsByType).filter(type => 
            declaredVarsByType[type].length > 0
        );
        
        if (types.length > 0) {
            const type = getRandomItem(types);
            const varToModify = getRandomItem(declaredVarsByType[type]);
            
            let operation;
            switch (type) {
                case 'int':
                    operation = `${varToModify} += ${getRandomInt(1, 5)}`;
                    break;
                case 'float':
                    operation = `${varToModify} *= ${parseFloat(getRandomInt(2, 4) + '.' + getRandomInt(1, 9))}`;
                    break;
                case 'str':
                    operation = `${varToModify} += " texte"`;
                    break;
                case 'bool':
                    operation = `${varToModify} = not ${varToModify}`;
                    break;
                case 'list':
                    operation = `${varToModify}.append(${getRandomInt(1, 10)})`;
                    break;
                default:
                    operation = "pass  # Opération par défaut";
            }
            
            codeLines.push(operation);
            linesGenerated++;
        } else {
            // Si aucune variable n'est disponible, ajouter un commentaire ou pass
            codeLines.push("# Pas de variables disponibles pour plus d'opérations");
            break;
        }
    }
    
    // Vérifier que le code n'est pas vide
    if (codeLines.length === 0) {
        codeLines.push("x = 10  # Valeur par défaut");
        codeLines.push("y = 20  # Valeur par défaut");
        codeLines.push("resultat = x + y");
    }
    
    console.log("Code généré:", codeLines);
    return codeLines.join("\n");
}