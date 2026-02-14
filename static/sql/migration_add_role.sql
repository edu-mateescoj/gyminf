-- ==========================================================================
-- MIGRATION : Ajout du rôle utilisateur (student / teacher)
-- 
-- À exécuter UNE SEULE FOIS sur la base existante.
-- Cette migration :
-- 1. Ajoute la colonne 'role' à la table 'user' (par défaut 'student')
-- 2. Promeut votre compte en 'teacher'
--
-- Exécution :
--   mysql -u root GYMINF_POC < static/sql/migration_add_role.sql
-- Ou directement dans phpMyAdmin / MySQL Workbench.
-- ==========================================================================

USE GYMINF_POC;

-- Étape 1 : Ajouter la colonne 'role'
-- Tous les utilisateurs existants deviennent 'student' par défaut
-- ⚠️ Si la colonne existe déjà, cette requête échouera (c'est normal, ignorez l'erreur)
ALTER TABLE user
    ADD COLUMN role ENUM('student', 'teacher') NOT NULL DEFAULT 'student';

-- Étape 2 : Promouvoir VOTRE compte en enseignant
UPDATE user SET role = 'teacher' WHERE username = 'edu-mateescoj';