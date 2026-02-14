-- ==========================================================================
-- MIGRATION : Ajout des colonnes manifeste/options dans la table generation
-- 
-- Permet de stocker les types de variables demandés lors de la génération
-- et les options choisies par l'élève (depuis code-generator.js).
--
-- À exécuter UNE SEULE FOIS sur la base existante.
-- ==========================================================================

USE GYMINF_POC;

-- Manifeste des types de variables générés (JSON)
-- Ex: {"x": "int", "name": "str"}
-- ⚠️ Si la colonne existe déjà, cette requête échouera (c'est normal, ignorez l'erreur)
ALTER TABLE generation
    ADD COLUMN variable_manifest JSON DEFAULT NULL;

-- Options de génération choisies par l'élève (JSON)
-- Ex: {"var_int_count": 2, "var_str_count": 1, "difficulty": 3}
ALTER TABLE generation
    ADD COLUMN requested_options JSON DEFAULT NULL;