// Code Generator JavaScript file for the Python Code Exercise Authoring Tool

// Function to generate random Python code based on user options
function generateRandomPythonCode(options) {
    const {
        variables,
        arithmetic,
        conditionals,
        loops,
        lists,
        strings,
        complexityLevel,
        numLines,
        numVariables
    } = options;

    // Define variable names for better readability
    const variableNames = ['a', 'b', 'c', 'd', 'x', 'y', 'z', 'i', 'j', 'k', 'n', 'm', 'total', 'result', 'count'];
    const stringVariableNames = ['text', 'message', 'name', 'word', 'sentence'];
    const listVariableNames = ['numbers', 'values', 'data', 'items', 'elements'];
    
    // Helper function to get random integer between min and max (inclusive)
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    // Helper function to get random item from an array
    function getRandomItem(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
    
    // Helper function to generate a string literal
    function generateStringLiteral() {
        const words = ['hello', 'world', 'python', 'code', 'programming', 'exercise', 'computer', 'science', 'learning'];
        return `"${getRandomItem(words)}"`;
    }
    
    // Helper function to generate a list literal
    function generateListLiteral() {
        const size = getRandomInt(2, 5);
        const items = [];
        for (let i = 0; i < size; i++) {
            items.push(getRandomInt(-10, 10));
        }
        return `[${items.join(', ')}]`;
    }
    
    // Generate code line by line
    let code = [];
    let availableVariables = [];
    let availableListVariables = [];
    let availableStringVariables = [];
    let indentLevel = 0;
    let inLoop = false;
    let inIf = false;
    
    // Initialize variables
    let initializedVars = 0;
    while (initializedVars < numVariables && initializedVars < variableNames.length) {
        const varName = variableNames[initializedVars];
        
        if (lists && Math.random() < 0.2) {
            code.push(`${varName} = ${generateListLiteral()}`);
            availableListVariables.push(varName);
        } else if (strings && Math.random() < 0.2) {
            code.push(`${varName} = ${generateStringLiteral()}`);
            availableStringVariables.push(varName);
        } else {
            const value = getRandomInt(-10, 10);
            code.push(`${varName} = ${value}`);
            availableVariables.push(varName);
        }
        
        initializedVars++;
    }
    
    // Generate more code lines
    for (let lineIndex = code.length; lineIndex < numLines; lineIndex++) {
        let lineOptions = [];
        
        // Calculate indent prefix
        const indentPrefix = '    '.repeat(indentLevel);
        
        // Add potential options based on selected categories
        if (arithmetic && availableVariables.length > 0) {
            lineOptions.push('arithmetic');
        }
        
        if (conditionals && !inIf && indentLevel < 1 && availableVariables.length > 0) {
            lineOptions.push('conditional');
        }
        
        if (loops && !inLoop && indentLevel < 1 && lineIndex < numLines - 2) {
            lineOptions.push('loop');
        }
        
        if (lists && availableListVariables.length > 0) {
            lineOptions.push('list_operation');
        }
        
        if (strings && availableStringVariables.length > 0) {
            lineOptions.push('string_operation');
        }
        
        // Default to assignment if no options or not enough variables
        if (lineOptions.length === 0 && availableVariables.length > 0) {
            lineOptions.push('arithmetic');
        } else if (lineOptions.length === 0) {
            const varName = variableNames[initializedVars % variableNames.length];
            const value = getRandomInt(-10, 10);
            code.push(`${indentPrefix}${varName} = ${value}`);
            availableVariables.push(varName);
            continue;
        }
        
        // Choose random option
        const option = getRandomItem(lineOptions);
        
        switch (option) {
            case 'arithmetic':
                if (availableVariables.length > 0) {
                    const target = getRandomItem(availableVariables);
                    const source = getRandomItem(availableVariables);
                    const operators = ['+', '-', '*', '//', '%'];
                    const operator = getRandomItem(operators);
                    const secondOperand = Math.random() < 0.7 ? getRandomItem(availableVariables) : getRandomInt(-5, 5);
                    
                    code.push(`${indentPrefix}${target} = ${source} ${operator} ${secondOperand}`);
                }
                break;
                
            case 'conditional':
                if (availableVariables.length > 0) {
                    const variable = getRandomItem(availableVariables);
                    const compareOperators = ['>', '<', '>=', '<=', '==', '!='];
                    const compareOperator = getRandomItem(compareOperators);
                    const compareValue = Math.random() < 0.7 ? getRandomItem(availableVariables) : getRandomInt(-10, 10);
                    
                    code.push(`${indentPrefix}if ${variable} ${compareOperator} ${compareValue}:`);
                    indentLevel++;
                    inIf = true;
                    
                    // Add a simple assignment inside the if block
                    const target = getRandomItem(availableVariables);
                    code.push(`${indentPrefix}    ${target} = ${getRandomInt(-10, 10)}`);
                    
                    // If complex enough, add an else block
                    if (complexityLevel >= 2 && Math.random() < 0.5) {
                        code.push(`${indentPrefix}else:`);
                        code.push(`${indentPrefix}    ${target} = ${getRandomInt(-10, 10)}`);
                        lineIndex += 2; // Account for the else lines
                    }
                    
                    lineIndex++; // Account for the if block's inner line
                    indentLevel--;
                    inIf = false;
                }
                break;
                
            case 'loop':
                const loopVar = 'i';
                const loopCount = getRandomInt(2, 5);
                code.push(`${indentPrefix}for ${loopVar} in range(${loopCount}):`);
                indentLevel++;
                inLoop = true;
                
                // Add a simple operation inside the loop
                if (availableVariables.length > 0) {
                    const target = getRandomItem(availableVariables);
                    code.push(`${indentPrefix}    ${target} = ${target} + ${loopVar}`);
                } else if (availableListVariables.length > 0) {
                    const listVar = getRandomItem(availableListVariables);
                    code.push(`${indentPrefix}    if ${loopVar} < len(${listVar}):`);
                    code.push(`${indentPrefix}        ${listVar}[${loopVar}] = ${loopVar}`);
                    lineIndex += 1; // Account for nested if
                } else {
                    const newVar = variableNames[initializedVars % variableNames.length];
                    code.push(`${indentPrefix}    ${newVar} = ${loopVar} * ${getRandomInt(1, 5)}`);
                    availableVariables.push(newVar);
                    initializedVars++;
                }
                
                lineIndex++; // Account for the loop block's inner line
                indentLevel--;
                inLoop = false;
                break;
                
            case 'list_operation':
                if (availableListVariables.length > 0) {
                    const listVar = getRandomItem(availableListVariables);
                    const operations = ['append', 'insert', 'access', 'length'];
                    const operation = getRandomItem(operations);
                    
                    switch (operation) {
                        case 'append':
                            code.push(`${indentPrefix}${listVar}.append(${getRandomInt(-10, 10)})`);
                            break;
                        case 'insert':
                            code.push(`${indentPrefix}${listVar}.insert(${getRandomInt(0, 2)}, ${getRandomInt(-10, 10)})`);
                            break;
                        case 'access':
                            if (availableVariables.length > 0) {
                                const target = getRandomItem(availableVariables);
                                code.push(`${indentPrefix}${target} = ${listVar}[${getRandomInt(0, 2)}]`);
                            }
                            break;
                        case 'length':
                            if (availableVariables.length > 0) {
                                const target = getRandomItem(availableVariables);
                                code.push(`${indentPrefix}${target} = len(${listVar})`);
                            }
                            break;
                    }
                }
                break;
                
            case 'string_operation':
                if (availableStringVariables.length > 0) {
                    const strVar = getRandomItem(availableStringVariables);
                    const operations = ['length', 'concatenate', 'slice'];
                    const operation = getRandomItem(operations);
                    
                    switch (operation) {
                        case 'length':
                            if (availableVariables.length > 0) {
                                const target = getRandomItem(availableVariables);
                                code.push(`${indentPrefix}${target} = len(${strVar})`);
                            }
                            break;
                        case 'concatenate':
                            code.push(`${indentPrefix}${strVar} = ${strVar} + ${generateStringLiteral()}`);
                            break;
                        case 'slice':
                            code.push(`${indentPrefix}${strVar} = ${strVar}[${getRandomInt(0, 2)}:${getRandomInt(3, 5)}]`);
                            break;
                    }
                }
                break;
        }
    }
    
    return code.join('\n');
}
