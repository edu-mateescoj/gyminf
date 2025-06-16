// Validation JavaScript file for the Python Code Exercise Authoring Tool

// Function to check student answers against actual variable values
function checkAnswers(actualValues) {
    const results = {
        correct: [],
        incorrect: []
    };
    
    // Get all variable input elements
    const inputs = document.querySelectorAll('.variable-input');
    
    // Check each input against the actual value
    inputs.forEach(input => {
        const varName = input.name;
        const studentAnswer = input.value.trim();
        const actualValue = actualValues[varName];
        
        // Convert the actual value to string for comparison
        let actualValueString;
        
        if (actualValue === null) {
            actualValueString = 'None';
        } else if (Array.isArray(actualValue) || (typeof actualValue === 'object' && actualValue.constructor === Array)) {
            // Handle Python lists which come through Pyodide
            actualValueString = JSON.stringify(actualValue).replace(/"/g, "'");
        } else if (typeof actualValue === 'string') {
            actualValueString = `'${actualValue}'`;
        } else {
            actualValueString = String(actualValue);
        }
        
        // Check if the student answer matches the actual value
        // Note: We normalize both strings for simple matching
        const normalizedActual = normalizeValue(actualValueString);
        const normalizedStudent = normalizeValue(studentAnswer);
        
        if (normalizedStudent === normalizedActual) {
            results.correct.push({
                varName,
                studentAnswer,
                actualValue: actualValueString
            });
            input.classList.add('correct');
            input.classList.remove('incorrect');
        } else {
            results.incorrect.push({
                varName,
                studentAnswer,
                actualValue: actualValueString
            });
            input.classList.add('incorrect');
            input.classList.remove('correct');
        }
    });
    
    return results;
}

// Helper function to normalize values for comparison
function normalizeValue(value) {
    // Convert to lowercase and remove whitespace
    let normalized = String(value).toLowerCase().replace(/\s+/g, '');
    
    // Handle Python-specific representations
    normalized = normalized
        .replace(/(['"])(.*?)\1/g, (match, quote, content) => content) // Remove quotes around strings
        .replace(/\[|\]/g, '')  // Remove list brackets
        .replace(/,/g, '');     // Remove commas
    
    return normalized;
}

// Function to show feedback in the modal
function showFeedback(results) {
    const modalContent = document.getElementById('feedback-modal-content');
    let content = '';
    
    // Calculate the score
    const totalAnswers = results.correct.length + results.incorrect.length;
    const score = Math.round((results.correct.length / totalAnswers) * 100);
    
    // Determine score class and emoji
    let scoreClass, scoreEmoji;
    if (score === 100) {
        scoreClass = 'alert-success';
        scoreEmoji = '🎉';
    } else if (score >= 70) {
        scoreClass = 'alert-warning';
        scoreEmoji = '👍';
    } else {
        scoreClass = 'alert-danger';
        scoreEmoji = '🤔';
    }
    
    // Add score summary with emoji
    content += `<div class="alert ${scoreClass}">
                    <div class="d-flex align-items-center justify-content-between mb-2">
                        <h4 class="mb-0">Your Score: ${score}%</h4>
                        <span style="font-size: 1.5rem;">${scoreEmoji}</span>
                    </div>
                    <p class="mb-0">You got ${results.correct.length} out of ${totalAnswers} variables correct.</p>
                </div>`;
    
    // Create a responsive table for results
    content += '<div class="table-responsive mt-3 mb-3">';
    content += '<table class="table table-sm">';
    content += `<thead>
                    <tr>
                        <th>Variable</th>
                        <th>Your Answer</th>
                        <th>Correct Value</th>
                        <th>Result</th>
                    </tr>
                </thead>`;
    content += '<tbody>';
    
    // Add all results to the table
    [...results.correct, ...results.incorrect].sort((a, b) => a.varName.localeCompare(b.varName)).forEach(item => {
        const isCorrect = results.correct.some(correct => correct.varName === item.varName);
        content += `<tr class="${isCorrect ? 'table-success' : 'table-danger'}">
                        <td><code>${item.varName}</code></td>
                        <td>${item.studentAnswer}</td>
                        <td>${item.actualValue}</td>
                        <td>${isCorrect ? 
                            '<span class="badge bg-success"><i class="fas fa-check"></i></span>' : 
                            '<span class="badge bg-danger"><i class="fas fa-times"></i></span>'}
                        </td>
                    </tr>`;
    });
    
    content += '</tbody></table></div>';
    
    // Show the tips if there are incorrect answers
    if (results.incorrect.length > 0) {
        content += '<div class="alert alert-info mt-3">';
        content += '<h5><i class="fas fa-lightbulb me-2"></i>Tips:</h5>';
        content += '<ul class="mb-0">';
        content += '<li>Remember that Python is case-sensitive.</li>';
        content += '<li>Make sure you use the correct quotation marks for strings.</li>';
        content += '<li>For lists, use square brackets and commas: [1, 2, 3]</li>';
        content += '<li>Be careful with calculations involving division and integer operations.</li>';
        content += '</ul>';
        content += '</div>';
    }
    
    // Update the modal content and show it
    modalContent.innerHTML = content;
    
    // Show the modal
    const feedbackModal = new bootstrap.Modal(document.getElementById('feedback-modal'));
    feedbackModal.show();
}

// Function to reveal the solution
function revealSolution(actualValues) {
    // Get all variable input elements
    const inputs = document.querySelectorAll('.variable-input');
    
    // Prepare solution table content for the modal
    const modalContent = document.getElementById('feedback-modal-content');
    let content = '';
    
    content += `
        <div class="alert alert-info">
            <div class="d-flex align-items-center justify-content-between mb-2">
                <h4 class="mb-0">Solution Revealed</h4>
                <span style="font-size: 1.5rem;">💡</span>
            </div>
            <p class="mb-0">All answers have been filled in with the correct values.</p>
        </div>
    `;
    
    // Create a solutions table
    content += '<div class="table-responsive mt-3">';
    content += '<table class="table table-sm table-hover">';
    content += `<thead>
                    <tr>
                        <th>Variable</th>
                        <th>Final Value</th>
                    </tr>
                </thead>`;
    content += '<tbody>';
    
    // Sort variable names for consistency
    Object.keys(actualValues).sort().forEach(varName => {
        const actualValue = actualValues[varName];
        
        // Convert the actual value to string for display
        let actualValueString;
        
        if (actualValue === null) {
            actualValueString = 'None';
        } else if (Array.isArray(actualValue) || (typeof actualValue === 'object' && actualValue.constructor === Array)) {
            // Handle Python lists which come through Pyodide
            actualValueString = JSON.stringify(actualValue).replace(/"/g, "'");
        } else if (typeof actualValue === 'string') {
            actualValueString = `'${actualValue}'`;
        } else {
            actualValueString = String(actualValue);
        }
        
        // Add to the table
        content += `<tr>
                        <td><code>${varName}</code></td>
                        <td><strong>${actualValueString}</strong></td>
                    </tr>`;
        
        // Update the input values on the form
        const input = document.querySelector(`.variable-input[name="${varName}"]`);
        if (input) {
            input.value = actualValueString;
            input.classList.add('correct');
            input.classList.remove('incorrect');
        }
    });
    
    content += '</tbody></table></div>';
    
    // Add a learning tip
    content += `
        <div class="alert alert-light mt-3 mb-0">
            <i class="fas fa-info-circle me-2"></i>
            <small>Try to trace through the code step-by-step to understand how these values were calculated. This practice will improve your programming skills!</small>
        </div>
    `;
    
    // Update the modal content and show it
    modalContent.innerHTML = content;
    
    // Show the modal
    const feedbackModal = new bootstrap.Modal(document.getElementById('feedback-modal'));
    feedbackModal.show();
}
