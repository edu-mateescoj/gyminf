/** ici dans static/js/db_queries.js 
 * fichier intermédiaire entre layout.html (l'UI) et app.py (serveur Flask)
 * contient des fonctions pour envoyer des requêtes POST au serveur Flask
*/
const IS_STATIC_VERSION = true; // 'false'== version Flask/MySQL

/* description du processus: 
 * 1. l'utilisateur effectue une action dans l'UI qui peut être de 2 types: soit la création d'un code PYthon soit la suite correspondante (flowchart et défis)
 * 2. l'action déclenche une fonction dans ce fichier (db_queries.js)
 * 3. cette fonction crée un corps de requête JSON et appelle logFactory(type, body)
 * 4. logFactory envoie une requête POST au serveur Flask avec le type d'action et le corps
 * TRAITEMENT CÔTÉ SERVEUR (DANS app.py):
 * 5. le serveur Flask traite la requête et enregistre les données dans la base de données
 * PLUS PRÉCISÉMENT - Toujours dans app.py::
 *     Les "routes" /code_generation et /flowchart_generation" reçoivent les données
 *     Elles extraient le code et l'identifiant utilisateur depuis la session
 *     Elles appellent code_generation_log() ou flowchart_generation_log()

 *     Les fonctions de journalisation créent des "curseurs MySQL"  
 *     Elles exécutent des requêtes SQL pour insérer les données
 *     Elles confirment les modifications avec con.commit()
 *     Elles retournent un statut de réussite ou d'échec
 */

// énumération des types d'actions de journalisation prédéfinies:
// maintenabilité avec log_enum.CODE_GENERATION même si "code_generation" renommée
// + sécurité + auto-complétion dans l'IDE
const log_enum = Object.freeze({ // fige les paires clé-valeur pour éviter modifications/ajouts/suppressions
    GENERATION: 'generation',
    // CODE_GENERATION: 'code_generation', 
    FLOWCHART_GENERATION: 'flowchart_generation', // Pour le code exécuté (flowchart+défi)
    VERIFY_ANSWERS: 'verify_answers',
    REVEAL_SOLUTION: 'reveal_solution',
    LOAD_EXAMPLE: 'load_example'
});

// ---- ANCIENNES FONCTIONS
/**
function codeIsGenerated(code) { // appelée par main.js quand événements pertinents définissant l'input 'code'(génération + chargement + édition)
    let body = JSON.stringify({code: code});
    logFactory(log_enum.CODE_GENERATION, body);
}
function flowchartIsGenerated() { // MODIFIÉ
    // On envoie les deux versions du code au backend.
    // Le backend décidera quoi en faire. AVANT, il n'utilisait que l'original.
    let body = JSON.stringify({
        code: originalCode, 
        canonical_code: canonicalCode
    });
    logFactory(log_enum.FLOWCHART_GENERATION, body);
}
*/

// --- NOUVELLES FONCTIONS ---

/**
 * Journalise le code Python initialement généré par l'outil.
 * @param {string} code - Le code Python généré.
 * @param {number} difficulty - Le niveau de difficulté sélectionné.
 */
function logGeneratedCode(code, difficulty) {
    // console.log("DEBUG - logGeneratedCode appelée avec difficulté:", difficulty);
    let body = JSON.stringify({
        code: code,
        difficulty: difficulty
    });
    logFactory(log_enum.GENERATION, body);
}

/**
 * Journalise le code qui a été exécuté pour générer le flowchart et le défi.
 * Ce code peut avoir été modifié manuellement par l'élève.
 * @param {string} originalCode - Le code brut de l'éditeur.
 * @param {string} canonicalCode - La version normalisée du code par AST.
 * @param {number} difficulty - Le niveau de difficulté associé.
 * @returns {Promise} - Promesse qui se résout avec la réponse du serveur, permet à la promesse de remonter jusqu'à main.js.
 */
function logExecutedCode(originalCode, canonicalCode, difficulty) {
    // console.log("DEBUG - logExecutedCode appelée avec difficulté:", difficulty);
    let body = JSON.stringify({
        code: originalCode, 
        canonical_code: canonicalCode,
        difficulty: difficulty
    });
    return logFactory(log_enum.FLOWCHART_GENERATION, body);
}

/**
 * Journalise le résultat de la vérification des réponses de l'élève.
 * @param {object} results - L'objet contenant les résultats de la vérification :
 *      Les noms de variables
 *      Les réponses des élèves
 *      Le statut correct/incorrect).
 * @param {number} codeId - L'ID du défi actuel.
 */
function logVerifyAnswers(results, codeId) {
    let body = JSON.stringify({
        results: results,
        code_id: codeId
    });
    logFactory(log_enum.VERIFY_ANSWERS, body);
}

/**
 * Journalise le fait que l'élève a cliqué sur le bouton pour révéler la solution.
 */
function logRevealSolution(codeId) {
    // Pas besoin d'envoyer de données spécifiques, l'événement lui-même est l'information.
    let body = JSON.stringify({
        code_id : codeId
    });
    logFactory(log_enum.REVEAL_SOLUTION, body);
}

/**
 * Nouvelle fonction pour journaliser le chargement d'un exemple.
 * @param {string} exampleName - Le nom de l'exemple qui a été chargé.
 */
function logLoadExample(exampleName) {
    // Prépare le corps de la requête avec le nom de l'exemple.
    let body = JSON.stringify({
        example_name: exampleName
    });
    // Appelle la factory avec le type approprié.
    logFactory(log_enum.LOAD_EXAMPLE, body);
}

/** fonction utilitaire centrale! point de passage obligatoire pour toute communication avec le backend 
 * Détermine l'URL cible en fonction du type de log,
 * envoie une requête POST avec les données au format JSON,
 * traite la réponse du serveur 
 * */
function logFactory(type, body) {
    let log_url = ""
    switch (type) {
        case log_enum.GENERATION:
            log_url = '/log/generation'; // AVANT '/code_generation';
            break;
        case log_enum.FLOWCHART_GENERATION:
            log_url = '/log/flowchart_generation'; // AVANT '/flowchart_generation';
            break;
        case log_enum.VERIFY_ANSWERS:
            log_url = '/log/verify_answers';
            break;
        case log_enum.REVEAL_SOLUTION:
            log_url = '/log/reveal_solution';
            break;
        case log_enum.LOAD_EXAMPLE:
            log_url = '/log/load_example';
            break;

        default:
            log_url = null;
    }

    if (log_url != null) {

        //fetch(log_url, { // envoie une requête POST au serveur Flask, données au format JSON
        // CORRECTION : On retourne la promesse du fetch pour que la fonction appelante puisse traiter la réponse.
        return fetch(log_url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: body,
            // CORRECTION CRITIQUE : On demande au navigateur d'inclure les cookies (pour la session).
            credentials: 'same-origin' 
        })
        .then(response => {
            // console.log(`DÉBUG - Statut de la réponse:`, response.status);
            if (!response.ok) {
                throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            // console.log('DÉBUG - Réponse du serveur:', data);
            if (data.status !== 'success') {
                console.error(`Échec de la journalisation: ${data.message}`);
            }
            return data; // Retourne les données pour que la chaîne .then() continue.
        })
        
        .catch(error => {
            console.error('DÉBUG - Erreur de communication avec le serveur:', error);
            // En cas d'erreur, on propage l'erreur pour que le `await` dans main.js puisse la catcher.
            throw error;
        });
    } else {
        console.error("DÉBUG - URL invalide, aucune requête envoyée pour le type:", type);
        // Retourner une promesse rejetée si l'URL est invalide.
        return Promise.reject(new Error("URL de journalisation invalide."));
    }
}