/**
 * @file validation.js
 * Ce fichier contient toute la logique liée à la section "Défi Élève".
 * Il gère la création des champs de réponse, la vérification des réponses,
 * la révélation de la solution et la construction du feedback.
 * Il est conçu pour être un module de logique appelé par main.js.
 */

/**
 * Peuple la section "Défi" avec des champs de saisie pour chaque variable attendue.
 * @param {Object} correctVariableValues - Un objet où les clés sont les noms des variables et les valeurs sont leurs valeurs correctes.
 * @param {HTMLElement} container - L'élément conteneur du DOM où les inputs doivent être ajoutés.
 */
function populateChallengeInputs(correctVariableValues, container) {
    if (!container) {
        console.error("Le conteneur pour les variables du défi est introuvable.");
        return;
    }
    container.innerHTML = ''; // Vider le conteneur pour toute nouvelle population

    const variableNames = Object.keys(correctVariableValues);

    if (variableNames.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center text-muted">
                <p><i class="fas fa-check-circle me-2"></i>Le code s'est exécuté sans erreur, mais ne contient pas de variables à tracer pour le défi.</p>
            </div>`;
        return;
    }

    // Création de l'en-tête pour la section
    const headerRow = document.createElement('div');
    headerRow.className = 'row mb-3';
    headerRow.innerHTML = `<div class="col-12"><h4 class="h6 mb-3">Quelle est la valeur de chaque variable à la fin de l'exécution ?</h4></div>`;
    container.appendChild(headerRow);

    // Création de la grille pour les inputs
    const variablesGrid = document.createElement('div');
    variablesGrid.className = 'row g-3';

    variableNames.sort().forEach(varName => {
        const colDiv = document.createElement('div');
        colDiv.className = 'col-lg-4 col-md-6 col-sm-12';

        const inputGroup = document.createElement('div');
        inputGroup.className = 'input-group mb-3';

        const inputGroupText = document.createElement('span');
        inputGroupText.className = 'input-group-text';
        inputGroupText.innerHTML = `<code>${varName}</code> =`;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control student-answer-input';
        input.id = `var-input-${varName}`;
        input.name = varName;
        input.placeholder = `Valeur de ${varName}...`;
        input.setAttribute('aria-label', `Valeur de ${varName}`);

        inputGroup.appendChild(inputGroupText);
        inputGroup.appendChild(input);
        colDiv.appendChild(inputGroup);
        variablesGrid.appendChild(colDiv);
    });

    container.appendChild(variablesGrid);
}

/**
 * Réinitialise la section "Défi" à son état par défaut.
 * @param {HTMLElement} container - L'élément conteneur des inputs à réinitialiser.
 */
function resetChallengeInputs(container) {
    if (!container) {
        console.error("Le conteneur pour les variables du défi est introuvable.");
        return;
    }
    container.innerHTML = ''; // Vider le conteneur pour toute nouvelle population

    // Message par défaut
    container.innerHTML = `
        <div class="col-12 text-center text-muted">
            <p><i class="fas fa-code me-2"></i>Lancer le diagramme et les défis pour voir les variables...</p>
        </div>`;
}

/**
 * Vérifie les réponses fournies par l'élève par rapport aux valeurs correctes.
 * @param {Object} correctVariableValues - Les valeurs correctes des variables.
 * @returns {Object} Un objet contenant les résultats détaillés de la vérification pour chaque variable.
 */
function checkStudentAnswers(correctVariableValues) {
    console.log("Vérification des réponses de l'élève...");
    const results = {};
    const variableNames = Object.keys(correctVariableValues);

    if (variableNames.length === 0) {
        console.warn("Aucune variable à vérifier dans ce défi.");
        return {};
    }

    variableNames.forEach(varName => {
        const inputElement = document.getElementById(`var-input-${varName}`);
        const studentAnswerRaw = inputElement ? inputElement.value.trim() : "";
        const correctAnswer = correctVariableValues[varName];
        
        // Tentative de parser la réponse de l'élève pour gérer les types (nombres, booléens, listes)
        let studentAnswerParsed;
        try {
            // JSON.parse est un bon moyen de gérer les nombres, booléens, et tableaux/listes.
            // On met en minuscule pour que "True" ou "False" soit valide.
            studentAnswerParsed = JSON.parse(studentAnswerRaw.toLowerCase());
        } catch (e) {
            // Si JSON.parse échoue, on traite la réponse comme une chaîne de caractères.
            studentAnswerParsed = studentAnswerRaw;
        }

        // Comparaison robuste en utilisant la sérialisation JSON
        const isCorrect = JSON.stringify(studentAnswerParsed) === JSON.stringify(correctAnswer);

        // Mise à jour de l'UI de l'input
        if (inputElement) {
            inputElement.classList.remove('is-valid', 'is-invalid', 'is-info');
            inputElement.classList.add(isCorrect ? 'is-valid' : 'is-invalid');
        }

        results[varName] = {
            studentAnswer: studentAnswerRaw,
            correctAnswer: JSON.stringify(correctAnswer),
            isCorrect: isCorrect
        };
    });

    return results;
}

/**
 * Révèle la solution correcte dans les champs de saisie du défi.
 * @param {Object} correctVariableValues - Les valeurs correctes à afficher.
 */
function revealCorrectSolution(correctVariableValues) {
    console.log("Révélation de la solution.");
    Object.keys(correctVariableValues).forEach(varName => {
        const inputElement = document.getElementById(`var-input-${varName}`);
        if (inputElement) {
            inputElement.value = JSON.stringify(correctVariableValues[varName]);
            inputElement.classList.remove('is-valid', 'is-invalid');
            // Ajout d'une classe 'is-info' (style custom à prévoir si besoin) pour indiquer que la solution a été révélée
            inputElement.classList.add('is-info'); 
        }
    });
}

/**
 * Construit le contenu HTML pour le modal de feedback basé sur les résultats de la vérification.
 * @param {Object} results - L'objet de résultats retourné par checkStudentAnswers.
 * @returns {{content: string, allCorrect: boolean}} Un objet contenant le HTML du contenu et un booléen indiquant si tout est correct.
 */
function buildFeedbackModalContent(results) {
    let contentHtml = '<table class="table table-bordered table-hover"><thead><tr><th>Variable</th><th>Votre Réponse</th><th class="text-center">Résultat</th></tr></thead><tbody>';
    let allCorrect = true;

    if (Object.keys(results).length === 0) {
        return { 
            content: '<div class="alert alert-secondary text-center">Aucune réponse à vérifier.</div>', 
            allCorrect: true 
        };
    }

    for (const varName in results) {
        const res = results[varName];
        const statusIcon = res.isCorrect 
            ? '<i class="fas fa-check-circle text-success fa-lg"></i>' 
            : '<i class="fas fa-times-circle text-danger fa-lg"></i>';
        
        contentHtml += `
            <tr class="${res.isCorrect ? 'table-success' : 'table-danger'}">
                <td><strong>${varName}</strong></td>
                <td><code>${res.studentAnswer || '<i>(vide)</i>'}</code></td>
                <td class="text-center align-middle">${statusIcon}</td>
            </tr>
        `;
        if (!res.isCorrect) {
            allCorrect = false;
        }
    }

    contentHtml += '</tbody></table>';
    
    // Ajout d'un message global en haut du tableau
    if (allCorrect) {
        contentHtml = `
            <div class="alert alert-success text-center">
                <h4><i class="fas fa-trophy me-2"></i>Félicitations !</h4>
                <p class="mb-0">Toutes vos réponses sont correctes. Excellent travail !</p>
            </div>` + contentHtml;
    } else {
        contentHtml = `
            <div class="alert alert-warning text-center">
                <h4><i class="fas fa-lightbulb me-2"></i>Presque !</h4>
                <p class="mb-0">Certaines réponses sont incorrectes. Analysez les résultats ci-dessous pour comprendre vos erreurs.</p>
            </div>` + contentHtml;
    }

    return { content: contentHtml, allCorrect: allCorrect };
}