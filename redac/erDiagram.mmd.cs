erDiagram
    USER {
        INT id PK
        VARCHAR username
        VARCHAR password
    }

    GENERATION {
        INT id PK
        INT user_id FK
        TEXT script
        INT difficulty
        DATETIME time_created
    }

    CODE {
        INT id PK
        INT user_id FK
        TEXT code
        TEXT canonical_code
        INT difficulty
        DATETIME time_created
    }

    DIAGRAM {
        INT id PK
        INT user_id FK
        INT code_id FK
        DATETIME time_created
    }

    REVEAL_SOLUTION {
        INT id PK
        INT user_id FK
        INT code_id FK
        DATETIME time_created
    }

    VERIFY_ANSWER {
        INT id PK
        INT user_id FK
        INT code_id FK
        JSON predictions
        JSON correctness
        DATETIME time_created
    }

    LOAD_EVENT {
        INT id PK
        INT user_id FK
        VARCHAR example_name
        DATETIME timestamp
    }

    %% Relationships
    USER ||--o{ GENERATION : "génère_aléatoirement"
    USER ||--o{ CODE : "lance"
    USER ||--o{ DIAGRAM : "lance_visualisation"
    CODE ||--o{ DIAGRAM : "est_visualisé_par"
    USER ||--o{ REVEAL_SOLUTION : "révèle"
    CODE ||--o{ REVEAL_SOLUTION : "a_pour_solution"
    USER ||--o{ VERIFY_ANSWER : "vérifie"
    CODE ||--o{ VERIFY_ANSWER : "réconcilie_réponses_et_solutions"
    USER ||--o{ LOAD_EVENT : "charge_exemple_prédéfini"