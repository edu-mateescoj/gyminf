-- ========================================================================== 
-- MIGRATION : Ajout de la table highlight_event
--
-- Stocke les interactions de surlignage déclenchées depuis le logigramme.
-- Chaque événement est rattaché à un code exécuté et à un utilisateur.
--
-- À exécuter UNE SEULE FOIS sur la base existante.
-- ==========================================================================

USE GYMINF_POC;

CREATE TABLE IF NOT EXISTS highlight_event (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    code_id INT NOT NULL,
    node_id VARCHAR(64),
    action_type VARCHAR(32) NOT NULL,
    node_label TEXT,
    source_span JSON,
    time_created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES user(ID) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (code_id) REFERENCES code(ID) ON DELETE CASCADE ON UPDATE CASCADE
);