CREATE DATABASE IF NOT EXISTS GYMINF_POC;
USE GYMINF_POC;

CREATE TABLE IF NOT EXISTS user (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    -- Rôle de l'utilisateur : 'student' ou 'teacher'
    -- Permet de restreindre l'accès au dashboard enseignant
    role ENUM('student', 'teacher') NOT NULL DEFAULT 'student'
);

-- NOUVELLE TABLE pour stocker uniquement le code généré initialement
CREATE TABLE IF NOT EXISTS generation (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    code TEXT NOT NULL,
    difficulty INT DEFAULT 3,
    -- Manifeste des types de variables demandés lors de la génération (JSON)
    -- Ex: {"x": "int", "name": "str"}
    variable_manifest JSON,
    -- Options de génération choisies par l'élève (JSON)
    -- Ex: {"var_int_count": 2, "difficulty": 3, "structures": ["if","for_range"]}
    requested_options JSON,
    time_created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- TABLE MODIFIÉE
CREATE TABLE IF NOT EXISTS code (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    original_code TEXT,
    canonical_code TEXT,
    difficulty INT DEFAULT 3,
    time_created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS diagram (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    code_id INT,
    mermaid_code TEXT,
    time_created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (code_id) REFERENCES code(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS reveal_solution (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    code_id INT,
    time_created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (code_id) REFERENCES code(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS verify_answer (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    code_id INT,
    -- Prédictions de l'élève (JSON) : {"x": "5", "name": "'hello'"}
    predictions JSON,
    -- Résultat par variable (JSON) : {"x": "vrai", "name": "faux"}
    correctness JSON,
    time_created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (code_id) REFERENCES code(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS load_event (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_type VARCHAR(100),
    time_created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ==========================================================================
-- NOUVELLES TABLES POUR LE DASHBOARD ENSEIGNANT
-- ==========================================================================

-- Table des métadonnées de chaque défi (types réels des variables Python)
-- Alimentée après chaque exécution de code via le wrapper Pyodide
CREATE TABLE IF NOT EXISTS challenge_metadata (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- Référence vers le code exécuté
    code_id INT NOT NULL,
    -- Référence vers l'élève
    user_id INT NOT NULL,
    -- Types réels des variables extraits depuis le namespace Pyodide (JSON)
    -- Ex: {"x": "int", "name": "str", "items": "list"}
    variable_types JSON NOT NULL,
    -- Options de génération demandées par l'élève (JSON, peut être NULL si code saisi manuellement)
    -- Ex: {"var_int_count": 2, "var_str_count": 1, "difficulty": 3, "structures": ["if", "for_range"]}
    requested_options JSON,
    -- Nombre total de variables dans le défi
    variable_count INT NOT NULL DEFAULT 0,
    -- Nombre de types distincts (int, str, list...) dans le défi
    type_diversity INT NOT NULL DEFAULT 0,
    time_created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (code_id) REFERENCES code(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Rappels utiles en session:
-- SHOW TABLES;
-- DESCRIBE challenge_metadata;
