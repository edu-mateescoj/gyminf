# Parité de surlignage Gyminf

## Objectif

Gyminf aligne désormais la version Flask sur la sémantique de surlignage stabilisée dans la version statique du projet.
Le but est pédagogique : faire ressortir le point de contrôle effectivement évalué, puis garder le diagramme et l'éditeur synchronisés lors des clics et des désélections.

## Chaîne technique

- `static/py/MyCFG.py` construit le CFG, les labels Mermaid et les `node_source_spans`.
- `static/js/flowchart-generator.js` exécute `MyCFG.py` dans Pyodide, normalise les spans pour l'éditeur, annote le SVG Mermaid et gère la sélection interactive.
- `static/js/main.js` applique ou efface la sélection CodeMirror via `selectEditorSourceRange()` et `clearEditorSourceSelection()`.
- `static/js/db_queries.js` journalise les clics de surlignage vers Flask si un `code_id` courant existe.
- `app.py` persiste ces interactions dans la table `highlight_event`.

## Règles de span

- Les noeuds `Decision` d'un `if` ou d'un `while` sont ancrés sur `node.test` seulement.
- Les noeuds synthétiques de contrôle d'un `for` sont ancrés sur la ligne d'en-tête `for ... in ...`.
- `Start fonction` est ancré sur la ligne `def ...`.
- `End fonction` ne porte pas de plage source et ne doit déclencher aucune sélection textuelle.
- Les blocs d'affectations unifiés couvrent le premier et le dernier statement du bloc, mais un `def` top-level casse volontairement cette contiguïté.

## Synchronisation diagramme / éditeur

- Un clic sur un noeud Mermaid annoté sélectionne son span source correspondant dans CodeMirror.
- Un clic sur un noeud sans span explicite garde le noeud visuellement sélectionné mais efface la sélection texte.
- Un clic dans le vide du SVG retire la sélection à la fois dans le diagramme et dans l'éditeur.

## Journalisation serveur

- Les événements sont envoyés sur `/log/highlight_event`.
- Le front ne journalise un clic que si un `code_id` courant existe déjà, ce qui rattache la trace à un code exécuté.
- Le payload persiste : `code_id`, `node_id`, `action_type`, `node_label`, `source_span` et `time_created`.

## Validation conseillée

1. Lancer `tests/index.html` via un serveur HTTP à la racine du repo Gyminf.
2. Lancer `python -m unittest tests.test_highlight_route` depuis la racine du repo.
3. Vérifier manuellement dans l'application Flask connectée les cas `if`, `while`, `for`, `Start fonction`, `End fonction` et la désélection par clic dans le vide.