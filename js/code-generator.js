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
    
    if (options.main_loops) {
        if (options.loop_for_range) structures.push('for_range');
        if (options.loop_for_list && declaredVarsByType.list.length > 0) structures.push('for_list');
        if (options.loop_for_str && declaredVarsByType.str.length > 0) structures.push('for_str');
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
    function generateForRangeLoop() {
        const indent = safeIndent(indentLevel);
        const loopVar = generateUniqueVarName('int');
        const rangeLimit = getRandomInt(3, 6);
        
        codeLines.push(`${indent}for ${loopVar} in range(${rangeLimit}):`);
        indentLevel++;
        
        // Corps de la boucle - opération simple
        const loopBodyIndent = safeIndent(indentLevel);
        
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
        const indent = safeIndent(indentLevel);
        const listVar = getRandomItem(declaredVarsByType.list);
        const loopVar = generateUniqueVarName('int'); // Nom pour l'élément de liste
        
        codeLines.push(`${indent}for ${loopVar} in ${listVar}:`);
        indentLevel++;
        
        // Corps de la boucle
        const loopBodyIndent = safeIndent(indentLevel);
        
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
        const indent = safeIndent(indentLevel);
        
        // tester si il n'y a pas de variable string disponible
        // sinon en créer une
        if (declaredVarsByType.str.length === 0) {
            const strVar = generateUniqueVarName('str');
            const strValue = LITTERALS_BY_TYPE.str();
            codeLines.push(`${indent}${strVar} = ${strValue}`);
            // mettre à jour les listes:
            declaredVarsByType.str.push(strVar);
            allDeclaredVarNames.add(strVar);
            linesGenerated++;
        }
        // création de strVar effectuée: ce sera notre itérable
        const strVar = getRandomItem(declaredVarsByType.str);
        // maintenant choisir un nom pour l'itérateur
        const charVar = generateUniqueVarName('str');
        codeLines.push(`${indent}for ${charVar} in ${strVar}:`);
        indentLevel++;
        
        // Corps de la boucle
        const loopBodyIndent = safeIndent(indentLevel);
        let loopBody;
        
        // Choisir une opération pour le corps de la boucle
        if (options.builtin_print) {
            // Utiliser print si disponible
            loopBody = `print(${charVar})`;
        } else if (declaredVarsByType.str.length > 1) {
            // Si une autre chaîne est disponible, y concaténer les caractères
            const targetStr = getRandomItem(declaredVarsByType.str.filter(s => s !== strVar));
            loopBody = `${targetStr} = ${targetStr} + ${charVar}`;
        } else if (declaredVarsByType.int.length > 0) {
            // Si un entier est disponible, incrémenter si le caractère est un chiffre
            const targetInt = getRandomItem(declaredVarsByType.int);
            if (charVar.isDigit()) {
                loopBody = `${loopBodyIndent}    ${targetInt} = int(${charVar})`
            }
            loopBody = `${loopBodyIndent}    ${targetInt} = ${targetInt} + ${getRandomItem(['+','-'])} + ${getRandomInt(1,3)}`;
            linesGenerated++; // Ligne supplémentaire pour le if
        } else {
            // Sinon, rien
            loopBody = "pass";
        }
        
        codeLines.push(`${loopBodyIndent}${loopBody}`);
        indentLevel--;
        linesGenerated += 2;
    }
    
    // Génération d'une boucle while
    function generateWhileLoop() {
        const indent = "    ".repeat(Math.max(0, indentLevel)); // Prévenir l'indentation négative
        
        // Générer une condition adaptée pour while (qui ne sera pas toujours vraie)
        const { condition, intVar } = generateCondition(['while_safe', 'int'], true);
        
        // Utiliser la condition générée
        codeLines.push(`${indent}while ${condition}:`);
        indentLevel++;
        
        // Corps de la boucle
        const loopBodyIndent = safeIndent(indentLevel);
        
        // Si on a une variable numérique, la décrémenter pour éviter une boucle infinie
        if (intVar) {
            codeLines.push(`${loopBodyIndent}${intVar} -= 1`);
        } else {
            // Fallback: utiliser n'importe quelle variable int existante
            if (declaredVarsByType.int.length > 0) {
                const counterVar = getRandomItem(declaredVarsByType.int);
                codeLines.push(`${loopBodyIndent}${counterVar} = ${counterVar} - 1`);
            } else {
                // Créer une variable temporaire et la modifier
                const tempVar = generateUniqueVarName('int');
                codeLines.push(`${loopBodyIndent}${tempVar} = 1  # Valeur temporaire`);
                declaredVarsByType.int.push(tempVar);
                allDeclaredVarNames.add(tempVar);
            }
        }
        
        indentLevel = Math.max(0, indentLevel - 1); // Garantir une indentation non négative
        linesGenerated += 2;
    }
    
    // Génération d'une fonction simple
    function generateFunction() {
        const indent = safeIndent(indentLevel);
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
        const funcBodyIndent = safeIndent(indentLevel);
        
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
// --- EXÉCUTION DE LA GÉNÉRATION ---

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

function ensureRequiredVariables() {
    // Pour les conditions
    if (options.main_conditions && options.cond_if) {
        if (declaredVarsByType.bool.length === 0 && declaredVarsByType.int.length === 0) {
            // Préférer créer une variable bool car plus explicite pour les conditions
            const varName = generateUniqueVarName('bool');
            codeLines.push(`${varName} = ${getRandomItem(["True", "False"])}`);
            declaredVarsByType.bool.push(varName);
            allDeclaredVarNames.add(varName);
            linesGenerated++;
        }
    }
    
    // Pour les boucles - CHAQUE BOUCLE SÉLECTIONNÉE AJOUTE UNE VARIABLE D'ITÉRATION
    if (options.main_loops) {
        // Pour for_range, garantir une variable d'itération
        if (options.loop_for_range) {
            const iterVarName = generateUniqueVarName('int');
            // Ne pas ajouter la ligne de code mais enregistrer la variable comme requise
            allDeclaredVarNames.add(iterVarName);
            declaredVarsByType.int.push(iterVarName);
            // On ne génère pas de ligne ici car la variable sera créée dans la boucle
            }
        }
        // Pour for_list, garantir une liste et une variable d'itération
        if (options.loop_for_list) {
            // Créer la liste si nécessaire
            if (declaredVarsByType.list.length === 0) {
                const listName = generateUniqueVarName('list');
                codeLines.push(`${listName} = ${LITERALS_BY_TYPE.list(difficulty)}`);
                declaredVarsByType.list.push(listName);
                allDeclaredVarNames.add(listName);
                linesGenerated++;
            }
            
            // Préenregistrer la variable d'itération
            const iterVarName = generateUniqueVarName('int');
            allDeclaredVarNames.add(iterVarName);
            declaredVarsByType.int.push(iterVarName);
        }
        
        // Pour for_str, garantir une chaîne et une variable d'itération
        if (options.loop_for_str) {
            // Créer la chaîne si nécessaire
            if (declaredVarsByType.str.length === 0) {
                const strName = generateUniqueVarName('str');
                codeLines.push(`${strName} = ${LITERALS_BY_TYPE.str()}`);
                declaredVarsByType.str.push(strName);
                allDeclaredVarNames.add(strName);
                linesGenerated++;
            }
            
            // Préenregistrer la variable d'itération
            const iterVarName = generateUniqueVarName('str'); // Pour for_str, l'itérateur est de type str
            allDeclaredVarNames.add(iterVarName);
            declaredVarsByType.str.push(iterVarName);
        }
        
        // Pour while, garantir une variable de compteur
        if (options.loop_while) {
            if (declaredVarsByType.int.length === 0) {
                const counterName = generateUniqueVarName('int');
                codeLines.push(`${counterName} = ${getRandomInt(3, 5)}`);
                declaredVarsByType.int.push(counterName);
                allDeclaredVarNames.add(counterName);
                linesGenerated++;
            }
        }
    // vérification supplémentaire pour garantir que toutes les variables 
    // dans declaredVarsByType sont réellement déclarées dans le code python
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
}

// Calculer lignes minimales nécessaires et variables essentielles
const requiredLines = calculateRequiredLines();
const availableForVariables = Math.max(1, targetLines - requiredLines);

// --- EXÉCUTION DE LA GÉNÉRATION (NOUVELLE LOGIQUE) ---

// 1. Initialiser les variables de base selon les options utilisateur
ensureVariablesForOptions();

// 2. Générer les structures dans un ordre aléatoire
generateControlStructures();

// 3. Compléter avec des opérations si besoin
if (linesGenerated < targetLines) {
    generateOperations();
}

// 4. Ajouter des opérations supplémentaires pour atteindre le nombre de lignes souhaité
while (linesGenerated < targetLines) {
    if (!addFiller()) break; // Sortir si impossible d'ajouter plus d'opérations
}

function addFiller() {
// Ajoute une opération simple pour compléter le nombre de lignes requis
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
        return true;
    } else {
        // Si aucune variable n'est disponible, ajouter un commentaire ou pass
        codeLines.push("# Pas de variables disponibles pour plus d'opérations");
        linesGenerated++;
        return false;
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