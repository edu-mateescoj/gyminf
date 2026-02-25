/** ici dans static/js/db_queries.js 
 * fichier intermédiaire entre layout.html (l'UI) et app.py (serveur Flask)
 * contient des fonctions pour envoyer des requêtes POST au serveur Flask
*/
const IS_STATIC_VERSION = false; // 'false'== version Flask/MySQL

// ==========================================================================
// ÉNUMÉRATION DES TYPES DE LOG
// Chaque valeur correspond à un endpoint Flask dans app.py
// ==========================================================================

const log_enum = Object.freeze({
    GENERATION:          'generation',
    EXECUTION:          'execution',
    FLOWCHART_GENERATION:'flowchart_generation',
    VERIFY_ANSWERS:      'verify_answers',
    REVEAL_SOLUTION:     'reveal_solution',
    LOAD_EXAMPLE:        'load_example',
    // NOUVEAU : métadonnées du défi (types de variables extraits de Pyodide)
    CHALLENGE_METADATA:  'challenge_metadata'
});

// ==========================================================================
// FACTORY D'ENVOI DE LOGS
// Détermine l'URL de l'endpoint Flask en fonction du type de log
// ==========================================================================

/**
 * Envoie un log au serveur Flask via une requête POST.
 * Si IS_STATIC_VERSION est true, le log est simplement affiché en console.
 * 
 * @param {string} type - Le type de log (utiliser log_enum)
 * @param {string} body - Le corps de la requête en JSON stringifié
 * @returns {Promise<Object|null>} La réponse du serveur (parsée en JSON), ou null
 */
async function logFactory(type, body) {
    // Déterminer l'URL de l'endpoint selon le type de log
    let log_url = "";
    switch (type) {
        case log_enum.GENERATION:
            log_url = '/log/generation';
            break;
        case log_enum.FLOWCHART_GENERATION:
            log_url = '/log/flowchart_generation';
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
        case log_enum.EXECUTION:
            log_url = '/log/execution';
            break;
        // NOUVEAU : endpoint pour les métadonnées du défi
        case log_enum.CHALLENGE_METADATA:
            log_url = '/log/challenge_metadata';
            break;
        default:
            console.warn("[db_queries] Type de log inconnu:", type);
            return null;
    }

    // Si le type est inconnu, ne rien envoyer
    if (!log_url) {
        console.warn(`[db_queries] Type de log inconnu: ${type}`);
        return null;
    }

    // Mode statique (sans serveur Flask) : afficher en console uniquement
    if (IS_STATIC_VERSION) {
        console.log(`[db_queries][STATIC] ${type} →`, JSON.parse(body));
        return null;
    }

    // Mode connecté : envoyer la requête au serveur Flask
    try {
        const response = await fetch(log_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: body
        });
        if (!response.ok) {
            console.error(`[db_queries] Erreur HTTP ${response.status} pour ${log_url}`);
            return null;
        }
        return await response.json();
    } catch (e) {
        console.error(`[db_queries] Erreur réseau pour ${log_url}:`, e);
        return null;
    }
}

// ==========================================================================
// FONCTIONS DE JOURNALISATION SPÉCIALISÉES
// Chaque fonction prépare le body JSON et appelle logFactory
// ==========================================================================

/**
 * Journalise une génération de code (bouton "Générer").
 * ENRICHI : inclut désormais le manifeste des types et les options de génération.
 * 
 * @param {string} code - Le code Python généré
 * @param {number} difficulty - La difficulté choisie (1 à 5)
 * @param {Object|null} manifest - Le manifeste retourné par code-generator.js
 *   Ex: { variableManifest: {"x": "int"}, requestedOptions: {"var_int_count": 2} }
 */
async function logGeneratedCode(code, difficulty, manifest) {
    let body = JSON.stringify({
        code: code,
        difficulty: difficulty,
        // Nouveau : transmettre le manifeste des types de variables
        variable_manifest: manifest ? manifest.variableManifest : null,
        // Nouveau : transmettre les options de génération choisies par l'élève
        requested_options: manifest ? manifest.requestedOptions : null
    });
    return await logFactory(log_enum.GENERATION, body);
}

/**
 * Journalise une exécution de code (bouton "Lancer").
 * Retourne le code_id attribué par le serveur, nécessaire pour les logs suivants.
 * 
 * @param {string} originalCode - Le code Python tel que saisi par l'élève
 * @param {string} canonicalCode - Le code normalisé (pour comparaison)
 * @param {number} difficulty - La difficulté
 * @param {Object} [detectedTypes={}] - Types détectés remontés depuis Pyodide/MyCFG
 * @returns {Promise<Object|null>} Réponse contenant { code_id: ... } ou null
 */
async function logExecutedCode(originalCode, canonicalCode, difficulty, detectedTypes = {}) {
    let body = JSON.stringify({
        original_code: originalCode,
        canonical_code: canonicalCode,
        difficulty: difficulty,
        // clé alignée avec le process front; le backend peut l'ignorer sans casser le flux
        detected_types: detectedTypes
    });
    return await logFactory(log_enum.EXECUTION, body);
}

/**
 * Journalise une vérification de réponses (bouton "Vérifier").
 * 
 * @param {number} codeId - L'ID du code (retourné par logExecutedCode)
 * @param {Object} predictions - Les prédictions de l'élève (ex: {"x": "5"})
 * @param {Object} correctness - Le résultat par variable (ex: {"x": "vrai"})
 */
async function logVerifyAnswers(codeId, predictions, correctness) {
    let body = JSON.stringify({
        code_id: codeId,
        predictions: predictions,
        correctness: correctness
    });
    return await logFactory(log_enum.VERIFY_ANSWERS, body);
}

/**
 * Journalise une révélation de solution (bouton "Révéler").
 * 
 * @param {number} codeId - L'ID du code
 */
async function logRevealSolution(codeId) {
    let body = JSON.stringify({
        code_id: codeId
    });
    return await logFactory(log_enum.REVEAL_SOLUTION, body);
}

/**
 * Journalise le chargement d'un exemple prédéfini.
 * @param {string} exampleName - Le nom de l'exemple chargé
 * @param {string} [eventType='load_example'] - Type d'événement (optionnel)
 */
async function logLoadExample(exampleName, eventType = 'load_example') {
    let body = JSON.stringify({
        event_type: eventType,
        example_name: exampleName
    });
    return await logFactory(log_enum.LOAD_EXAMPLE, body);
}

/**
 * NOUVEAU : Journalise les métadonnées du défi (types de variables réels).
 * 
 * Appelée après l'exécution du code, quand les types des variables
 * ont été extraits depuis le namespace Pyodide.
 * Ces données sont utilisées par le dashboard enseignant pour calculer
 * le taux de succès par type de variable.
 * 
 * @param {number} codeId - L'ID du code exécuté (retourné par logExecutedCode)
 * @param {Object} variableTypes - Mapping {nomVariable: typePython} depuis Pyodide
 *   Ex: {"x": "int", "name": "str", "items": "list"}
 * @param {Object|null} requestedOptions - Les options de génération choisies
 *   Ex: {"var_int_count": 2, "difficulty": 3, "structures": ["if", "for_range"]}
 */
async function logChallengeMetadata(codeId, variableTypes, requestedOptions) {
    let body = JSON.stringify({
        code_id: codeId,
        variable_types: variableTypes,
        requested_options: requestedOptions || null
    });
    return await logFactory(log_enum.CHALLENGE_METADATA, body);
}