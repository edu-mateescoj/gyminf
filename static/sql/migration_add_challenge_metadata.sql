-- ==========================================================================
-- MIGRATION : Ajout de la table challenge_metadata
-- 
-- Stocke les types réels des variables Python extraits du namespace Pyodide
-- après chaque exécution de code. Alimentée par /log/challenge_metadata.
-- Utilisée par le dashboard enseignant pour le taux de succès par type.
--
-- À exécuter UNE SEULE FOIS sur la base existante.
-- ==========================================================================

USE GYMINF_POC;

CREATE TABLE IF NOT EXISTS challenge_metadata (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- Référence vers le code exécuté
    code_id INT NOT NULL,
    -- Référence vers l'élève
    user_id INT NOT NULL,
    -- Types réels des variables extraits depuis le namespace Pyodide (JSON)
    -- Ex: {"x": "int", "name": "str", "items": "list"}
    variables_types JSON NOT NULL,
    -- Options de génération demandées par l'élève (JSON, NULL si code saisi manuellement)
    -- Ex: {"var_int_count": 2, "difficulty": 3, "structures": ["if", "for_range"]}
    requested_options JSON,
    -- Nombre total de variables dans le défi
    variable_count INT NOT NULL DEFAULT 0,
    -- Nombre de types Python distincts (int, str, list...) dans le défi
    type_diversity INT NOT NULL DEFAULT 0,
    time_created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (code_id) REFERENCES code(ID) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(ID) ON DELETE CASCADE ON UPDATE CASCADE
);