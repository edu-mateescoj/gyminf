function generateDynamicExercise() {
    const variableNames = Object.keys(variableNamesWithTypes.anglais);
    let selectedVariables = [];
    while (selectedVariables.length < 3) {
        const randomIndex = Math.floor(Math.random() * variableNames.length);
        const variable = variableNames[randomIndex];
        if (!selectedVariables.includes(variable)) {
            selectedVariables.push(variable);
        }
    }
    // Définir des valeurs initiales aléatoires
    let expressions = [];
    currentCorrectAnswers = {}; // Réinitialiser les réponses correctes
    /* méthode forEach ... explications ci-dessous
    variable : chaque variable sélectionnée de selectedVariables.
    index : indice de l'élément courant dans le tableau selectedVariables. Cet index sera utilisé pour accéder aux 
    identifiants correspondants des champs de saisie (inputId) et des labels (labelId) qui sont stockés dans des 
tableaux séparés. Ces tableaux sont indexés de la même manière que selectedVariables, donc l'index de chaque variable dans 
selectedVariables correspond à l'index de son ID dans la liste des id d'input et dans celle des id de label.
Il faut assigner dynamiquement les placeholders et les labels pour chaque champ d'input selon la variable traitée.*/
    
    // Réinitialiser les valeurs et la couleur des inputs avant de générer de nouveaux exercices
    ['v1-answer', 'r-answer', 'v3-answer'].forEach(inputId => {
        const inputElement = document.getElementById(inputId);
        if (inputElement) {
            inputElement.value = ""; // Réinitialisation : j'écrase la valeur
            inputElement.style.backgroundColor = ""; // Réinitialisation de la couleur de fond
        }
    });
    
    selectedVariables.forEach((variable, index) => {
        let value = Math.floor(Math.random() * 10) + 1; // Valeurs aléatoires pour l'exemple
        expressions.push(`${variable} = ${value}`);
        const inputId = ['v1-answer', 'r-answer', 'v3-answer'][index];
        currentCorrectAnswers[inputId] = value.toString(); // Sauvegarde des réponses correctes
       
        // Mise à jour des placeholders et des labels
       
        const labelId = ['labelA', 'labelB', 'labelC'][index];
        document.getElementById(inputId).placeholder = `Valeur de ${variable}`;
        document.getElementById(labelId).textContent = `Valeur de ${variable} :`;
    });

    // Affichage des expressions générées
    document.getElementById('code-display').textContent = expressions.join('\n');
}

// Appel initial pour configurer un exercice par défaut
generateDynamicExercise();


function verifyAnswers() {
  //astuce débogage
  console.log('Vérification des réponses...');
    // Exemple simple de vérification des réponses
    let answers = {
        "v1-answer": document.getElementById('v1-answer').value,
        "r-answer": document.getElementById('r-answer').value,
        "v3-answer": document.getElementById('v3-answer').value
    };

    // Itération sur chaque réponse pour vérifier et appliquer la couleur appropriée
    Object.keys(answers).forEach(id => {
        const userAnswer = answers[id];
        const correctAnswer = currentCorrectAnswers[id];
        const inputElement = document.getElementById(id);

        if (userAnswer === "") {
            inputElement.style.backgroundColor = ""; // Pas de coloration si pas de réponse
        } else if (userAnswer === correctAnswer) {
            inputElement.style.backgroundColor = 'lightgreen'; // Vert si correct
        } else {
            inputElement.style.backgroundColor = 'salmon'; // Rouge si incorrect
        }
    });
}
/*
  // Vérification des réponses de l'utilisateur
  Object.keys(correctAnswers).forEach(id => {
    const userAnswer = document.getElementById(id).value;
    const isCorrect = userAnswer === correctAnswers[id];
    document.getElementById(id).style.backgroundColor = isCorrect ? 'lightgreen' : 'salmon';
  });
}
*/
/*
  document.getElementById('v1-answer').value = '2';
  document.getElementById('r-answer').value = '2';
  document.getElementById('v3-answer').value = '4';
  */
function showAnswers() {
  //astuce débogage
  console.log('Appel de la fonction...');
  // Utilise currentCorrectAnswers pour afficher les bonnes réponses
    Object.keys(currentCorrectAnswers).forEach(id => {
        const inputElement = document.getElementById(id);
        inputElement.value = currentCorrectAnswers[id]; // Utiliser la valeur correcte stockée
        inputElement.style.backgroundColor = 'lightgray'; // Réinitialiser la couleur de fond
    });
  // Réinitialiser la couleur de fond des réponses
  document.querySelectorAll('input[type=text]').forEach(input => {
    input.style.backgroundColor = 'lightgray';
  });
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('verify-button').addEventListener('click', verifyAnswers);
    document.getElementById('show-button').addEventListener('click', showAnswers);
    document.getElementById('generate-button').addEventListener('click', generateDynamicExercise);
    generateDynamicExercise(); // Générer un premier exercice au chargement
});