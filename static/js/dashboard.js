/**
 * @file dashboard.js
 * 
 * Script dédié au dashboard enseignant.
 * 
 * Responsabilités :
 * - Charger les métriques globales depuis l'API /api/dashboard/overview
 * - Charger la liste des élèves et leurs métriques depuis /api/dashboard/students
 * - Afficher le détail d'un élève (graphiques Chart.js) :
 *     • Taux de succès par type de variable (bar chart)
 *     • Évolution chronologique du taux de succès (line chart)
 *     • Dispersion / couverture des concepts (polar area chart)
 *     • Résumé numérique (point faible détecté, couverture, etc.)
 * 
 * Métriques calculées côté serveur (app.py) :
 * - Engagement : exécutions / générations
 * - Ténacité : vérifications / exécutions
 * - Autonomie : 1 - (révélations / vérifications)
 * 
 * Métriques calculées côté client (ici) :
 * - Taux de succès par type de variable
 * - Couverture des concepts (dispersion)
 */

// ==========================================================================
// VARIABLES GLOBALES
// ==========================================================================

/** @type {Chart|null} Instance du graphique "Taux de succès par type" */
let chartSuccessByType = null;

/** @type {Chart|null} Instance du graphique "Évolution chronologique" */
let chartTimeline = null;

/** @type {Chart|null} Instance du graphique "Dispersion" */
let chartDispersion = null;

/**
 * Palette de couleurs par type de variable Python.
 * Chaque type a une couleur de fond (bg) et une couleur de bordure (border).
 * Utilisé dans tous les graphiques pour une cohérence visuelle.
 */
const TYPE_COLORS = {
    'int':      { bg: 'rgba(54, 162, 235, 0.7)',  border: 'rgb(54, 162, 235)' },
    'float':    { bg: 'rgba(255, 159, 64, 0.7)',   border: 'rgb(255, 159, 64)' },
    'str':      { bg: 'rgba(75, 192, 192, 0.7)',   border: 'rgb(75, 192, 192)' },
    'list':     { bg: 'rgba(153, 102, 255, 0.7)',  border: 'rgb(153, 102, 255)' },
    'bool':     { bg: 'rgba(255, 99, 132, 0.7)',   border: 'rgb(255, 99, 132)' },
    'dict':     { bg: 'rgba(255, 205, 86, 0.7)',   border: 'rgb(255, 205, 86)' },
    'tuple':    { bg: 'rgba(201, 203, 207, 0.7)',  border: 'rgb(201, 203, 207)' },
    'NoneType': { bg: 'rgba(100, 100, 100, 0.7)',  border: 'rgb(100, 100, 100)' },
    'unknown':  { bg: 'rgba(50, 50, 50, 0.7)',     border: 'rgb(50, 50, 50)' }
};


// ==========================================================================
// INITIALISATION AU CHARGEMENT DE LA PAGE
// ==========================================================================

document.addEventListener('DOMContentLoaded', function () {
    // Charger les données initiales
    loadOverview();
    loadStudents();

    // Bouton "Actualiser" : recharger toutes les données
    document.getElementById('refresh-btn').addEventListener('click', () => {
        loadOverview();
        loadStudents();
    });

    // Bouton "Fermer" : masquer le panneau de détail d'un élève
    document.getElementById('close-detail-btn').addEventListener('click', () => {
        document.getElementById('student-detail-panel').classList.remove('active');
    });
});


// ==========================================================================
// SECTION 1 : VUE D'ENSEMBLE (5 métriques globales)
// ==========================================================================

/**
 * Charge les métriques globales depuis l'API et met à jour les cartes.
 * Appelle GET /api/dashboard/overview
 */
async function loadOverview() {
    const res = await fetch('/api/dashboard/overview', { credentials: 'same-origin' });
    if (res.status === 403) {
        alert("Session expirée ou droits insuffisants. Redirection vers la connexion.");
        window.location.href = "/logout";
        return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Mettre à jour chaque carte de métrique
    document.getElementById('metric-users').textContent         = data.total_users;
    document.getElementById('metric-generations').textContent   = data.total_generations;
    document.getElementById('metric-executions').textContent    = data.total_executions;
    document.getElementById('metric-verifications').textContent = data.total_verifications;
    document.getElementById('metric-reveals').textContent       = data.total_reveals;
}


// ==========================================================================
// SECTION 2 : TABLEAU DES ÉLÈVES
// ==========================================================================

/**
 * Charge la liste des élèves avec leurs métriques et peuple le tableau.
 * Appelle GET /api/dashboard/students
 * 
 * Chaque ligne du tableau est cliquable et ouvre le panneau de détail.
 */
async function loadStudents() {
    const tbody = document.getElementById('students-table-body');

    const res = await fetch('/api/dashboard/students', { credentials: 'same-origin' });
    if (res.status === 403) {
        // Redirection déjà gérée par loadOverview, on peut juste stopper
        return; 
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const students = await res.json();

    // Cas : aucun élève inscrit
    if (students.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-muted py-4">
                    Aucun élève trouvé.
                </td>
            </tr>`;
        return;
    }

    // Vider le tableau et le remplir avec les données
    tbody.innerHTML = '';
    students.forEach(student => {
        const tr = document.createElement('tr');
        tr.className = 'student-row';
        tr.dataset.studentId = student.id;
        tr.dataset.studentName = student.username;

        // Construction du contenu HTML de chaque ligne
        tr.innerHTML = `
            <td><strong>${escapeHtml(student.username)}</strong></td>
            <td class="text-center">${student.generation_count}</td>
            <td class="text-center">${student.execution_count}</td>
            <td class="text-center">
                ${renderGauge(student.engagement_rate, 2, 'info')}
            </td>
            <td class="text-center">
                ${renderGauge(student.tenacity, 5, 'warning')}
            </td>
            <td class="text-center">
                ${renderGauge(student.autonomy, 1, 'success')}
            </td>
            <td class="text-center">
                <span class="badge bg-secondary">
                    ${student.avg_difficulty ? student.avg_difficulty.toFixed(1) : '—'}
                </span>
            </td>
            <td>
                <small class="text-muted">${formatDate(student.last_activity)}</small>
            </td>
            <td>
                <button class="btn btn-outline-info btn-sm detail-btn" title="Voir le détail">
                    <i class="fas fa-chart-pie"></i>
                </button>
            </td>
        `;

        // Clic sur le bouton "détail" → ouvrir le panneau
        tr.querySelector('.detail-btn').addEventListener('click', (e) => {
            e.stopPropagation(); // Empêcher le clic de se propager à la ligne
            openStudentDetail(student.id, student.username);
        });

        // Clic sur la ligne entière → ouvrir le panneau aussi
        tr.addEventListener('click', () => {
            openStudentDetail(student.id, student.username);
        });

        tbody.appendChild(tr);
    });

    // --- Légende custom sous le graphique ---
    const legendDiv = document.getElementById('chart-success-legend');
    legendDiv.innerHTML = types.map(t => {
        const stats = byType[t];
        const rate = stats.success_rate !== null
            ? (stats.success_rate * 100).toFixed(0) + '%'
            : 'N/A';
        const color = (TYPE_COLORS[t] || TYPE_COLORS['unknown']).border;
        return `<span class="badge badge-type me-1" style="background-color:${color}">
                    ${t}: ${rate}
                </span>`;
    }).join('');
}


/**
 * Ouvre le panneau de détail pour un élève donné.
 * Charge en parallèle :
 * - les données de prédiction (taux de succès par type + timeline)
 * - les données de dispersion (couverture types + structures)
 * 
 * @param {number} studentId - L'ID de l'élève dans la base
 * @param {string} studentName - Le username de l'élève (pour l'affichage)
 */
async function openStudentDetail(studentId, studentName) {
    // Afficher le panneau et scroller vers lui
    const panel = document.getElementById('student-detail-panel');
    document.getElementById('detail-student-name').textContent = studentName;
    panel.classList.add('active');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
        // Charger les deux API en parallèle (plus rapide)
        const [predRes, dispRes] = await Promise.all([
            fetch(`/api/dashboard/student/${studentId}/predictions`, { credentials: 'same-origin' }),
            fetch(`/api/dashboard/student/${studentId}/dispersion`,  { credentials: 'same-origin' })
        ]);

        if (!predRes.ok || !dispRes.ok) {
            throw new Error("Erreur API (status non-OK)");
        }

        const predData = await predRes.json();
        const dispData = await dispRes.json();

        // Dessiner les 3 graphiques et le résumé
        renderSuccessByTypeChart(predData.by_type);
        renderTimelineChart(predData.timeline);
        renderDispersionChart(dispData);
        renderDetailSummary(predData, dispData);

    } catch (e) {
        console.error("Erreur lors du chargement du détail élève:", e);
        document.getElementById('detail-summary').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Erreur de chargement des données: ${e.message}
            </div>`;
    }
}


// ==========================================================================
// GRAPHIQUES CHART.JS
// ==========================================================================

/**
 * Dessine le bar chart "Taux de succès par type de variable".
 * 
 * L'axe X = les types Python (int, str, list…)
 * L'axe Y = le taux de succès en % (0 à 100)
 * Le tooltip affiche le détail : ✓ correct | ✗ incorrect | ∅ vide
 * 
 * @param {Object} byType - Données ventilées par type (depuis api predictions)
 *   Ex: { "int": { success_rate: 0.8, total_attempts: 10, correct: 8, incorrect: 2, empty_count: 1 } }
 */
function renderSuccessByTypeChart(byType) {
    const ctx = document.getElementById('chart-success-by-type').getContext('2d');

    // Détruire l'ancien graphique s'il existe (Canvas réutilisé)
    if (chartSuccessByType) chartSuccessByType.destroy();

    // Filtrer les types "unknown" pour la lisibilité
    const types = Object.keys(byType).filter(t => t !== 'unknown');

    // Préparer les données pour Chart.js
    const successRates = types.map(t =>
        byType[t].success_rate !== null ? byType[t].success_rate * 100 : 0
    );
    const bgColors     = types.map(t => (TYPE_COLORS[t] || TYPE_COLORS['unknown']).bg);
    const borderColors = types.map(t => (TYPE_COLORS[t] || TYPE_COLORS['unknown']).border);

    chartSuccessByType = new Chart(ctx, {
        type: 'bar',
        data: {
            // Labels : "int (10 essais)", "str (5 essais)", ...
            labels: types.map(t => `${t} (${byType[t].total_attempts} essais)`),
            datasets: [{
                label: 'Taux de succès (%)',
                data: successRates,
                backgroundColor: bgColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { callback: v => v + '%' }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        // Ajouter le détail correct/incorrect/vide dans le tooltip
                        afterLabel: function (context) {
                            const t = types[context.dataIndex];
                            const stats = byType[t];
                            return `✓ ${stats.correct} | ✗ ${stats.incorrect} | ∅ ${stats.empty_count}`;
                        }
                    }
                }
            }
        }
    });

    // --- Légende custom sous le graphique ---
    const legendDiv = document.getElementById('chart-success-legend');
    legendDiv.innerHTML = types.map(t => {
        const stats = byType[t];
        const rate = stats.success_rate !== null
            ? (stats.success_rate * 100).toFixed(0) + '%'
            : 'N/A';
        const color = (TYPE_COLORS[t] || TYPE_COLORS['unknown']).border;
        return `<span class="badge badge-type me-1" style="background-color:${color}">
                    ${t}: ${rate}
                </span>`;
    }).join('');
}


/**
 * Dessine le line chart "Évolution chronologique du taux de succès".
 * 
 * Deux courbes :
 * 1. Taux de succès brut par vérification (points individuels)
 * 2. Moyenne mobile sur 3 vérifications (courbe lissée, en pointillé)
 * 
 * @param {Array} timeline - Liste de points { code_id, time, success_rate }
 */
function renderTimelineChart(timeline) {
    const ctx = document.getElementById('chart-timeline').getContext('2d');

    // Détruire l'ancien graphique s'il existe
    if (chartTimeline) chartTimeline.destroy();

    // Cas : aucune donnée → graphique vide
    if (!timeline || timeline.length === 0) {
        chartTimeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Aucune donnée'],
                datasets: [{ label: 'Taux de succès', data: [0] }]
            },
            options: { responsive: true }
        });
        return;
    }

    // Préparer les labels et les données
    const labels = timeline.map((_, i) => `Défi ${i + 1}`);
    const data   = timeline.map(t => t.success_rate * 100);

    // Calcul de la moyenne mobile (fenêtre glissante de 3)
    // Pour chaque point i, on fait la moyenne des points [i-2, i-1, i]
    const movingAvg = data.map((val, i, arr) => {
        const windowStart = Math.max(0, i - 2);
        const windowSlice = arr.slice(windowStart, i + 1);
        return windowSlice.reduce((sum, v) => sum + v, 0) / windowSlice.length;
    });

    chartTimeline = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    // Courbe 1 : taux brut
                    label: 'Taux de succès (%)',
                    data: data,
                    borderColor: 'rgba(75, 192, 192, 0.6)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    fill: true,
                    tension: 0.1,       // Légère courbe
                    pointRadius: 3      // Points visibles
                },
                {
                    // Courbe 2 : moyenne mobile (lissée, en pointillé)
                    label: 'Moyenne mobile (3)',
                    data: movingAvg,
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderDash: [5, 5], // Trait pointillé
                    fill: false,
                    tension: 0.3,       // Courbe plus lisse
                    pointRadius: 0      // Pas de points
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { callback: v => v + '%' }
                }
            }
        }
    });
}


/**
 * Dessine le polar area chart "Dispersion — Couverture des concepts".
 * 
 * Affiche sur un même graphique :
 * - Les 5 types de variables (int, float, str, list, bool) : explorés ou non
 * - Les 6 structures de contrôle (if, for_range, for_list, for_str, while, function) : explorées ou non
 * 
 * Un segment coloré = concept exploré, un segment grisé = non exploré.
 * 
 * @param {Object} dispData - Données de dispersion depuis l'API
 *   Ex: { types_explored: ["int", "str"], structures_explored: ["if"], type_coverage: 0.4, ... }
 */
function renderDispersionChart(dispData) {
    const ctx = document.getElementById('chart-dispersion').getContext('2d');

    // Détruire l'ancien graphique s'il existe
    if (chartDispersion) chartDispersion.destroy();

    // Listes des concepts possibles
    const allPossibleTypes      = ['int', 'float', 'str', 'list', 'bool'];
    const allPossibleStructures = ['if', 'for_range', 'for_list', 'for_str', 'while', 'function'];

    // Pour chaque concept : 1 = exploré, 0 = non exploré
    const typeData   = allPossibleTypes.map(t => dispData.types_explored.includes(t) ? 1 : 0);
    const structData = allPossibleStructures.map(s => dispData.structures_explored.includes(s) ? 1 : 0);

    // Combiner les labels
    const labels = [
        ...allPossibleTypes.map(t => `Type: ${t}`),
        ...allPossibleStructures.map(s => `Struct: ${s}`)
    ];

    // Combiner les données
    const data = [...typeData, ...structData];

    // Couleurs : concept exploré = couleur vive, non exploré = grisé
    const backgroundColors = data.map((v, i) => {
        if (v === 1) {
            // Exploré : bleu pour les types, violet pour les structures
            return i < allPossibleTypes.length
                ? 'rgba(54, 162, 235, 0.7)'
                : 'rgba(153, 102, 255, 0.7)';
        } else {
            // Non exploré : gris foncé
            return 'rgba(50, 50, 50, 0.3)';
        }
    });

    chartDispersion = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: labels,
            datasets: [{
                // 1 pour exploré, 0.2 pour non exploré (visible mais grisé)
                data: data.map(v => v === 1 ? 1 : 0.2),
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                r: { display: false } // Masquer les graduations radiales
            },
            plugins: {
                legend: {
                    position: 'right',
                    labels: { font: { size: 10 } }
                },
                tooltip: {
                    callbacks: {
                        // Tooltip : "✓ Exploré" ou "✗ Non exploré"
                        label: function (context) {
                            return data[context.dataIndex] === 1 ? '✓ Exploré' : '✗ Non exploré';
                        }
                    }
                }
            }
        }
    });
}


/**
 * Affiche le résumé numérique dans le panneau de détail.
 * 
 * Informations affichées :
 * - Taux de succès global (toutes variables confondues)
 * - Point faible détecté (type avec le taux le plus bas, min 2 essais)
 * - Couverture des types (ex: 3/5 types explorés)
 * - Couverture des structures (ex: 2/6 structures explorées)
 * 
 * @param {Object} predData - Données de prédiction (by_type + timeline)
 * @param {Object} dispData - Données de dispersion (couvertures)
 */
function renderDetailSummary(predData, dispData) {
    const summaryDiv = document.getElementById('detail-summary');

    // --- Calcul du taux de succès global ---
    let totalCorrect  = 0;
    let totalAttempts = 0;
    for (const t in predData.by_type) {
        totalCorrect  += predData.by_type[t].correct;
        totalAttempts += predData.by_type[t].total_attempts;
    }
    const globalRate = totalAttempts > 0
        ? (totalCorrect / totalAttempts * 100).toFixed(1)
        : 'N/A';

    // --- Détection du type le plus faible ---
    // On parcourt tous les types et on cherche celui avec le taux le plus bas
    // On exige au moins 2 tentatives pour éviter les faux négatifs
    let weakestType = null;
    let weakestRate = 101; // Valeur initiale supérieure à 100%
    for (const t in predData.by_type) {
        const stats = predData.by_type[t];
        if (
            stats.total_attempts >= 2 &&
            stats.success_rate !== null &&
            stats.success_rate * 100 < weakestRate
        ) {
            weakestRate = stats.success_rate * 100;
            weakestType = t;
        }
    }

    // --- Affichage du résumé en 4 blocs ---
    summaryDiv.innerHTML = `
        <div class="row g-3">
            <!-- Bloc 1 : Taux de succès global -->
            <div class="col-6">
                <div class="p-2 rounded bg-opacity-10 bg-info">
                    <div class="small text-muted">Taux de succès global</div>
                    <div class="fs-4 fw-bold text-info">${globalRate}%</div>
                    <div class="small">${totalCorrect}/${totalAttempts} prédictions correctes</div>
                </div>
            </div>
            <!-- Bloc 2 : Point faible détecté -->
            <div class="col-6">
                <div class="p-2 rounded bg-opacity-10 bg-warning">
                    <div class="small text-muted">Point faible détecté</div>
                    <div class="fs-4 fw-bold text-warning">
                        ${weakestType ? `Type: ${weakestType}` : 'Aucun'}
                    </div>
                    <div class="small">
                        ${weakestType ? weakestRate.toFixed(0) + '% de succès' : 'Données insuffisantes'}
                    </div>
                </div>
            </div>
            <!-- Bloc 3 : Couverture des types -->
            <div class="col-6">
                <div class="p-2 rounded bg-opacity-10 bg-success">
                    <div class="small text-muted">Couverture des types</div>
                    <div class="fs-4 fw-bold text-success">
                        ${(dispData.type_coverage * 100).toFixed(0)}%
                    </div>
                    <div class="small">${dispData.types_explored.length}/5 types explorés</div>
                </div>
            </div>
            <!-- Bloc 4 : Couverture des structures -->
            <div class="col-6">
                <div class="p-2 rounded bg-opacity-10 bg-secondary">
                    <div class="small text-muted">Couverture des structures</div>
                    <div class="fs-4 fw-bold">
                        ${(dispData.structure_coverage * 100).toFixed(0)}%
                    </div>
                    <div class="small">${dispData.structures_explored.length}/6 structures explorées</div>
                </div>
            </div>
        </div>
    `;
}


// ==========================================================================
// FONCTIONS UTILITAIRES
// ==========================================================================

/**
 * Génère le HTML d'une jauge visuelle (badge + mini barre de progression).
 * Utilisée dans le tableau des élèves pour les métriques Engagement, Ténacité, Autonomie.
 * 
 * La couleur change selon le pourcentage :
 * - Vert : bon (> 60-70%)
 * - Orange : moyen (30-60%)
 * - Rouge : faible (< 30%)
 * 
 * @param {number} value - La valeur de la métrique (ex: 0.75)
 * @param {number} maxVal - La valeur maximale théorique (pour calculer le %)
 * @param {string} colorClass - Le type de couleur ('info', 'warning', 'success')
 * @returns {string} Le HTML de la jauge
 */
function renderGauge(value, maxVal, colorClass) {
    // Calculer le pourcentage (plafonné à 100%)
    const percentage = Math.min((value / maxVal) * 100, 100);

    // Déterminer la classe CSS de couleur selon le seuil
    let badgeClass = 'bg-secondary';
    if (colorClass === 'info') {
        // Engagement : vert si > 60%, orange si > 30%, rouge sinon
        badgeClass = percentage > 60 ? 'bg-info' : percentage > 30 ? 'bg-warning' : 'bg-danger';
    }
    if (colorClass === 'warning') {
        // Ténacité : vert si > 60%, orange si > 30%, rouge sinon
        badgeClass = percentage > 60 ? 'bg-success' : percentage > 30 ? 'bg-warning' : 'bg-danger';
    }
    if (colorClass === 'success') {
        // Autonomie : vert si > 70%, orange si > 40%, rouge sinon
        badgeClass = percentage > 70 ? 'bg-success' : percentage > 40 ? 'bg-warning' : 'bg-danger';
    }

    return `
        <div class="d-flex flex-column align-items-center">
            <span class="badge ${badgeClass}">${value.toFixed(2)}</span>
            <div class="progress progress-thin w-100 mt-1" style="max-width: 60px;">
                <div class="progress-bar ${badgeClass}" style="width: ${percentage}%"></div>
            </div>
        </div>
    `;
}


/**
 * Formate une date ISO en format lisible français (JJ/MM/AA HH:MM).
 * Retourne "—" si la date est invalide ou correspond à la valeur par défaut.
 * 
 * @param {string} dateStr - La date au format ISO (ex: "2026-02-14 15:33:08")
 * @returns {string} La date formatée (ex: "14/02/26 15:33")
 */
function formatDate(dateStr) {
    // Gérer les cas "pas de date" ou "date par défaut MySQL"
    if (!dateStr || dateStr === '2000-01-01 00:00:00') return '—';
    try {
        const d = new Date(dateStr);
        // Format suisse francophone : JJ.MM.AA HH:MM
        return d.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: '2-digit' })
            + ' ' + d.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
    } catch {
        // Fallback : retourner la string brute si le parsing échoue
        return dateStr;
    }
}


/**
 * Échappe les caractères HTML spéciaux pour prévenir les injections XSS.
 * Utilisé pour afficher les usernames dans le tableau sans risque.
 * 
 * @param {string} text - Le texte à échapper
 * @returns {string} Le texte échappé (safe pour innerHTML)
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}