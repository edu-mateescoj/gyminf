CREATE DATABASE IF NOT EXISTS GYMINF_POC;
USE GYMINF_POC;

CREATE TABLE IF NOT EXISTS user (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL
);

-- NOUVELLE TABLE pour stocker uniquement le code généré initialement
CREATE TABLE IF NOT EXISTS generation (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    script TEXT,
    difficulty INT,
    time_created DATETIME,
    FOREIGN KEY (user_id) REFERENCES user(id)
);

-- TABLE MODIFIÉE
CREATE TABLE IF NOT EXISTS code (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    code TEXT,
    canonical_code TEXT,
    difficulty INT NOT NULL,
    time_created DATETIME NOT NULL,

    FOREIGN KEY (user_id) REFERENCES user(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS diagram (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    code_id INT NOT NULL,
    time_created DATETIME NOT NULL,

    FOREIGN KEY (user_id) REFERENCES user(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

    FOREIGN KEY (code_id) REFERENCES code(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS reveal_solution (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    code_id INT NOT NULL,
    time_created DATETIME NOT NULL,

    FOREIGN KEY (user_id) REFERENCES user(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

    FOREIGN KEY (code_id) REFERENCES code(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS verify_answer (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    code_id INT NOT NULL,
    time_created DATETIME NOT NULL,
    predictions JSON,
    correctness JSON,

    FOREIGN KEY (user_id) REFERENCES user(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

    FOREIGN KEY (code_id) REFERENCES code(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS load_event (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    example_name VARCHAR(255) NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id)
);

-- Rappels utiles en session:
-- SHOW TABLES;
-- DESCRIBE user;
