/** ici dans static/js/db_queries.js 
 * fichier intermédiaire entre layout.html (l'UI) et app.py (serveur Flask)
 * contient des fonctions pour envoyer des requêtes POST au serveur Flask
*/

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
    CODE_GENERATION: 'code_generation', 
    FLOWCHART_GENERATION: 'flowchart_generation',
    VERIFY_ANSWERS: 'verify_answers',
    CHECK_SOLUTION: 'check_solution'
});

function codeIsGenerated(code) { // appelée par main.js quand événements pertinents définissant l'input 'code'(génération + chargement + édition)
    let body = JSON.stringify({code: code});
    logFactory(log_enum.CODE_GENERATION, body);
}


function flowchartIsGenerated() { // appelé par layout.html au clique sur "run-code-btn"
    let code = lastLoadedCode; // fourni par main.js
    let body = JSON.stringify({code: code});
    logFactory(log_enum.FLOWCHART_GENERATION, body);
}

/** fonction utilitaire centrale! point de passage obligatoire pour toute communication avec le backend 
 * Détermine l'URL cible en fonction du type de log,
 * envoie une requête POST avec les données au format JSON,
 * traite la réponse du serveur 
 * */
function logFactory(type, body) {
    let log_url = ""
    switch (type) {
        case log_enum.CODE_GENERATION:
            log_url = '/code_generation';
            break;
        case log_enum.FLOWCHART_GENERATION:
            log_url = '/flowchart_generation';
            break;
        default:
            log_url = null;
    }
    console.log(log_url);
    if (log_url != null) {
        fetch(log_url, { // envoie une requête POST au serveur Flask, données au format JSON
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: body
        })
            .then(response => response.json()) // convertit la réponse en JSON
            .then(data => { // traite la réponse du serveur
                if (data.status === 'success') {
                    console.log('Success');
                } else {
                    console.log('DB INSERT failed: ' + data);
                }
            });
    }
}