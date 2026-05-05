/**
 * Petit framework de test unitaire maison pour le navigateur.
 * Auteur: GitHub Copilot
 */

const TestRunner = {
    results: [],
    currentSuite: "",

    describe: function(name, callback) {
        this.currentSuite = name;
        console.group(name);
        try {
            callback();
        } catch (e) {
            console.error("Erreur dans la suite " + name, e);
        }
        console.groupEnd();
    },

    it: async function(name, callback) {
        const testName = `${this.currentSuite} > ${name}`;
        const startTime = performance.now();
        try {
            await callback();
            const duration = (performance.now() - startTime).toFixed(2);
            this.logResult(testName, "success", `Passé (${duration}ms)`);
        } catch (error) {
            console.error(`Test échoué: ${testName}`, error);
            this.logResult(testName, "failure", error.message || error);
        }
    },

    expect: function(actual) {
        return {
            toBe: (expected) => {
                if (actual !== expected) throw new Error(`Attendu: ${expected}, Reçu: ${actual}`);
            },
            notToBe: (expected) => {
                if (actual === expected) throw new Error(`Ne devait pas être: ${expected}`);
            },
            toContain: (substring) => {
                if (!actual.includes(substring)) throw new Error(`La chaîne ne contient pas "${substring}".`);
            },
            notToContain: (substring) => {
                if (actual.includes(substring)) throw new Error(`La chaîne ne devait pas contenir "${substring}".`);
            },
            toBeGreaterThan: (number) => {
                if (!(actual > number)) throw new Error(`Devait être > ${number}, Reçu: ${actual}`);
            },
            toBeDefined: () => {
                if (actual === undefined || actual === null) throw new Error('Devait être défini.');
            },
            toMatch: (regex) => {
                if (!regex.test(actual)) throw new Error(`Ne correspond pas au pattern ${regex}.`);
            }
        };
    },

    logResult: function(name, status, message) {
        const container = document.getElementById('test-results');
        if (!container) return;

        const div = document.createElement('div');
        div.className = `alert ${status === 'success' ? 'alert-success' : 'alert-danger'} p-2 mb-1`;
        div.innerHTML = `
            <i class="fas ${status === 'success' ? 'fa-check-circle' : 'fa-times-circle'} me-2"></i>
            <strong>${name}</strong>: ${message}
        `;
        container.appendChild(div);

        this.updateSummary(status);
    },

    stats: { total: 0, success: 0, failure: 0 },

    updateSummary: function(status) {
        this.stats.total++;
        if (status === 'success') this.stats.success++;
        else this.stats.failure++;

        const summary = document.getElementById('test-summary');
        if (summary) {
            summary.innerHTML = `
                <span class="badge bg-primary">Total: ${this.stats.total}</span>
                <span class="badge bg-success">Succès: ${this.stats.success}</span>
                <span class="badge bg-danger">Echecs: ${this.stats.failure}</span>
            `;
        }
    }
};

window.describe = TestRunner.describe.bind(TestRunner);
window.it = TestRunner.it.bind(TestRunner);
window.expect = TestRunner.expect.bind(TestRunner);