// Main JavaScript file for the Python Code Exercise Authoring Tool

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize CodeMirror editor
    const codeEditor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
        mode: 'python',
        theme: 'dracula',
        lineNumbers: true,
        indentUnit: 4,
        tabSize: 4,
        indentWithTabs: false,
        lineWrapping: true,
        readOnly: false
    });

    // Initialize variables to store code execution state
    let pyodideInstance = null;
    let generatedCode = '';
    let variableValues = {};
    let isFeedbackModalOpen = false;
    
    // Initialize Mermaid
    mermaid.initialize({
        startOnLoad: true,
        theme: 'dark',
        flowchart: {
            curve: 'linear',
            useMaxWidth: false
        }
    });

    // Initialize Pyodide
    async function initPyodide() {
        if (!pyodideInstance) {
            try {
                console.log("Loading Pyodide...");
                pyodideInstance = await loadPyodide();
                console.log("Pyodide loaded successfully");
            } catch (error) {
                console.error("Error loading Pyodide:", error);
                alert("Failed to load Pyodide. Please check console for details.");
            }
        }
        return pyodideInstance;
    }

    // Call initPyodide immediately
    initPyodide();

    // Generate Random Code Button Click Handler
    document.getElementById('generate-code-btn').addEventListener('click', async function() {
        const options = {
            variables: document.getElementById('checkbox-variables').checked,
            arithmetic: document.getElementById('checkbox-arithmetic').checked,
            conditionals: document.getElementById('checkbox-conditionals').checked,
            loops: document.getElementById('checkbox-loops').checked,
            lists: document.getElementById('checkbox-lists').checked,
            strings: document.getElementById('checkbox-strings').checked,
            complexityLevel: parseInt(document.getElementById('complexity-level').value),
            numLines: parseInt(document.getElementById('num-lines').value),
            numVariables: parseInt(document.getElementById('num-variables').value)
        };

        // Generate code
        generatedCode = generateRandomPythonCode(options);
        
        // Update CodeMirror with the generated code
        codeEditor.setValue(generatedCode);
        
        // Generate and display the flowchart
        const flowchartCode = generateFlowchart(generatedCode);
        displayFlowchart(flowchartCode);
        
        // Reset variable values and UI
        resetVariableInputs();
        document.getElementById('check-answers-btn').disabled = true;
        document.getElementById('show-solution-btn').disabled = true;
    });

    // Run Code Button Click Handler
    document.getElementById('run-code-btn').addEventListener('click', async function() {
        if (!pyodideInstance) {
            pyodideInstance = await initPyodide();
        }
        
        const code = codeEditor.getValue();
        generatedCode = code;

        // Reset variable values UI
        resetVariableInputs();
        
        try {
            // First, attempt to validate the syntax of the code
            try {
                // Validate syntax before executing - catches SyntaxError, IndentationError, etc.
                await pyodideInstance.runPythonAsync(`
import ast
try:
    ast.parse("""${code.replace(/"/g, '\\"').replace(/\\/g, '\\\\')}""")
except Exception as e:
    error_type = type(e).__name__
    error_msg = str(e)
    raise Exception(f"{error_type}: {error_msg}")
`);
            } catch (syntaxError) {
                // Display a more user-friendly error message for syntax errors
                console.error("Python syntax error:", syntaxError);
                
                // Create an error message modal
                const errorModal = document.createElement('div');
                errorModal.className = 'modal fade';
                errorModal.id = 'syntaxErrorModal';
                errorModal.setAttribute('tabindex', '-1');
                errorModal.setAttribute('aria-labelledby', 'syntaxErrorModalLabel');
                errorModal.setAttribute('aria-hidden', 'true');
                
                // Format the error message nicely
                const errorMessage = syntaxError.message;
                let formattedErrorMessage = errorMessage;
                
                // Extract specific information for common errors
                if (errorMessage.includes('IndentationError')) {
                    formattedErrorMessage = 'Indentation Error: Check your code indentation. Python uses 4 spaces per indent level.';
                } else if (errorMessage.includes('SyntaxError')) {
                    formattedErrorMessage = 'Syntax Error: Your code contains a syntax error. Check for missing colons, parentheses, or other syntax issues.';
                }
                
                errorModal.innerHTML = `
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-danger text-white">
                            <h5 class="modal-title" id="syntaxErrorModalLabel">Python Error</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-danger">
                                <i class="fas fa-exclamation-triangle me-2"></i>
                                <span>${formattedErrorMessage}</span>
                            </div>
                            <p>Please fix the syntax errors in your code before running it.</p>
                            <div class="text-monospace p-3 bg-light code-error-details overflow-auto">
                                <pre class="mb-0">${errorMessage}</pre>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
                `;
                
                // Add the modal to the document body
                document.body.appendChild(errorModal);
                
                // We need to wait for the DOM to be updated before creating the Bootstrap modal
                setTimeout(() => {
                    const modalElement = document.getElementById('syntaxErrorModal');
                    const bsModal = new bootstrap.Modal(modalElement);
                    bsModal.show();
                }, 100);
                
                // Clean up the modal when it's hidden
                document.getElementById('syntaxErrorModal').addEventListener('hidden.bs.modal', function() {
                    document.body.removeChild(errorModal);
                });
                
                // Clear any previous results
                resetVariableInputs();
                return;
            }

            // If syntax check passes, proceed with execution
            // Use a much simpler approach with string output
            const tracingCode = `
# Execute the original code first
${code}

# Now extract the variables after execution
import builtins
import types
import json

# Create empty result string to hold our variable values
result = ""

# Create a copy of the globals dictionary to prevent modification during iteration
global_vars = dict(globals())

# Get items from the copy instead and build a simple formatted string
user_vars = []

for var_name, var_value in global_vars.items():
    # Skip special variables, modules, functions, classes
    if (not var_name.startswith('__') and 
        not isinstance(var_value, types.ModuleType) and
        not isinstance(var_value, types.FunctionType) and
        not isinstance(var_value, type) and
        not callable(var_value) and
        var_name != 'user_vars' and
        var_name != 'global_vars' and
        var_name != 'result'):
        
        # Add this variable to our collection as a simple string
        user_vars.append(f"{var_name}:{repr(var_value)}")
        print(f"Found var: {var_name} = {repr(var_value)}")

# Join all variables with a delimiter 
print(f"Found {len(user_vars)} variables")
"|||".join(user_vars)
`;

            // Execute the code with Pyodide
            const result = await pyodideInstance.runPythonAsync(tracingCode);
            
            // Get the result as a JavaScript string
            const resultStr = result.toString();
            console.log("Python variables string:", resultStr);
            
            // Parse the delimited string into variable data
            variableValues = {};
            
            if (resultStr && resultStr.length > 0) {
                // Split by our delimiter
                const varPairs = resultStr.split('|||');
                
                // Process each variable from the string
                varPairs.forEach(pair => {
                    // Split name:value
                    const colonPos = pair.indexOf(':');
                    if (colonPos > 0) {
                        const name = pair.substring(0, colonPos);
                        const valueStr = pair.substring(colonPos + 1);
                        
                        // Try to parse the value - this is a simplification
                        let value;
                        
                        // Handle different Python types
                        if (valueStr === 'True') value = true;
                        else if (valueStr === 'False') value = false;
                        else if (valueStr === 'None') value = null;
                        else if (valueStr.startsWith("'") || valueStr.startsWith('"')) {
                            // String - remove quotes
                            value = valueStr.substring(1, valueStr.length - 1);
                        }
                        else if (!isNaN(valueStr)) {
                            // Number
                            value = Number(valueStr);
                        }
                        else {
                            // Default to string
                            value = valueStr;
                        }
                        
                        // Store in our variableValues object
                        variableValues[name] = value;
                    }
                });
            }
            
            // Log variables found for debugging
            const varNames = Object.keys(variableValues);
            console.log("Variables found:", varNames);
            
            // Generate and display the flowchart
            const flowchartCode = generateFlowchart(code);
            displayFlowchart(flowchartCode);
            
            // Populate variable inputs for the student challenge
            populateVariableInputs(variableValues);
            
            // Enable check answers button if we found variables
            const hasVariables = Object.keys(variableValues).length > 0;
            document.getElementById('check-answers-btn').disabled = !hasVariables;
            document.getElementById('show-solution-btn').disabled = !hasVariables;
        } catch (error) {
            console.error("Error executing Python code:", error);
            
            // Extract a meaningful error message
            let errorMessage = error.message || "Unknown error occurred";
            
            // For Pyodide-specific errors, try to extract the actual Python error
            if (errorMessage.includes("Error: ")) {
                // Extract the Python error from the Pyodide error message
                const pythonErrorMatch = errorMessage.match(/Error: (.*)/);
                if (pythonErrorMatch && pythonErrorMatch[1]) {
                    errorMessage = pythonErrorMatch[1];
                }
            }
            
            // Handle common Python errors more user-friendly
            let userFriendlyMessage = "Error running Python code";
            if (errorMessage.includes("ZeroDivisionError")) {
                userFriendlyMessage = "Division by Zero Error";
            } else if (errorMessage.includes("NameError")) {
                userFriendlyMessage = "Variable Name Error";
            } else if (errorMessage.includes("TypeError")) {
                userFriendlyMessage = "Type Error";
            } else if (errorMessage.includes("ValueError")) {
                userFriendlyMessage = "Value Error";
            } else if (errorMessage.includes("IndexError")) {
                userFriendlyMessage = "Index Error";
            }
            
            // Create an error message modal for runtime errors
            const errorModal = document.createElement('div');
            errorModal.className = 'modal fade';
            errorModal.id = 'runtimeErrorModal';
            errorModal.setAttribute('tabindex', '-1');
            errorModal.setAttribute('aria-labelledby', 'runtimeErrorModalLabel');
            errorModal.setAttribute('aria-hidden', 'true');
            
            errorModal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title" id="runtimeErrorModalLabel">Runtime Error</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-danger">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            <span>${userFriendlyMessage}</span>
                        </div>
                        <p>There was an error while executing your code:</p>
                        <div class="text-monospace p-3 bg-light code-error-details overflow-auto">
                            <pre class="mb-0">${errorMessage}</pre>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
            `;
            
            document.body.appendChild(errorModal);
            
            // We need to wait for the DOM to be updated before creating the Bootstrap modal
            setTimeout(() => {
                const modalElement = document.getElementById('runtimeErrorModal');
                const bsModal = new bootstrap.Modal(modalElement);
                bsModal.show();
            }, 100);
            
            // Clean up the modal when it's hidden
            document.getElementById('runtimeErrorModal').addEventListener('hidden.bs.modal', function() {
                document.body.removeChild(errorModal);
            });
            
            // Clear any previous results
            resetVariableInputs();
        }
    });

    // Check Answers Button Click Handler
    document.getElementById('check-answers-btn').addEventListener('click', function() {
        const results = checkAnswers(variableValues);
        showFeedback(results);
    });

    // Show Solution Button Click Handler
    document.getElementById('show-solution-btn').addEventListener('click', function() {
        revealSolution(variableValues);
    });

    // Helper function to reset variable inputs UI
    function resetVariableInputs() {
        const container = document.getElementById('variables-container');
        container.innerHTML = `
            <div class="col-12 text-center py-3">
                <div class="d-flex flex-column align-items-center text-muted">
                    <i class="fas fa-code-branch mb-2" style="font-size: 1.5rem;"></i>
                    <p class="mb-0"><i class="fas fa-code me-2"></i>Générez ou exécutez le code pour voir les variables...</p>
                </div>
            </div>`;
        variableValues = {};
    }

    // Helper function to populate variable inputs
    function populateVariableInputs(variables) {
        const container = document.getElementById('variables-container');
        container.innerHTML = '';
        
        if (Object.keys(variables).length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-3">
                    <div class="alert alert-info d-inline-block">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-info-circle me-3" style="font-size: 1.5rem;"></i>
                            <div>
                                <p class="mb-0">No variables found in the code.</p>
                                <small class="text-muted">Try adding variables like: a = 5, total = 0, etc.</small>
                            </div>
                        </div>
                    </div>
                </div>`;
            return;
        }

        // Create header row for variables
        const headerRow = document.createElement('div');
        headerRow.className = 'row mb-3 variable-header';
        headerRow.innerHTML = `
            <div class="col-12">
                <h4 class="h6 mb-3">Quelle est la valeur de chaque variable en sortie?</h4>
            </div>
        `;
        container.appendChild(headerRow);
        
        // Create a responsive grid for variables
        const variablesGrid = document.createElement('div');
        variablesGrid.className = 'row g-3'; // Use g-3 for better spacing with Bootstrap 5
        
        Object.keys(variables).sort().forEach(varName => {
            const colDiv = document.createElement('div');
            colDiv.className = 'col-lg-4 col-md-6 col-sm-12'; // More responsive column classes
            
            const card = document.createElement('div');
            card.className = 'card h-100 variable-card';
            
            const cardBody = document.createElement('div');
            cardBody.className = 'card-body';
            
            const varNameDisplay = document.createElement('h5');
            varNameDisplay.className = 'card-title variable-name';
            varNameDisplay.innerHTML = `<code>${varName}</code>`;
            
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group mt-2';
            
            const label = document.createElement('label');
            label.className = 'form-label';
            label.htmlFor = `var-${varName}`;
            label.textContent = `Valeur finale:`;
            
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-control variable-input';
            input.id = `var-${varName}`;
            input.name = varName;
            input.placeholder = `Écrire ici la valeur... attention syntaxe!`;
            
            formGroup.appendChild(label);
            formGroup.appendChild(input);
            cardBody.appendChild(varNameDisplay);
            cardBody.appendChild(formGroup);
            card.appendChild(cardBody);
            colDiv.appendChild(card);
            variablesGrid.appendChild(colDiv);
        });
        
        container.appendChild(variablesGrid);
    }

    // Helper function to display flowchart
    function displayFlowchart(flowchartCode) {
        const flowchartDiv = document.getElementById('flowchart');
        flowchartDiv.innerHTML = flowchartCode;
        
        // Re-render Mermaid flowchart
        mermaid.init(undefined, '.mermaid');
    }
});
