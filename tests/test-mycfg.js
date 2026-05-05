document.addEventListener('DOMContentLoaded', () => {
    let cfgSnapshotQueue = Promise.resolve();

    function buildCfgSnapshot(code) {
        const runSnapshot = async () => {
            await initPyodideAndLoadScript();

            pyodide.globals.set('cfg_test_code', code);
            const snapshotJson = await pyodide.runPythonAsync(`
import json
from MyCFG import ControlFlowGraph

cfg = ControlFlowGraph(cfg_test_code)
cfg.process_and_get_results()

json.dumps({
    "edges": sorted(list(cfg.edges)),
    "node_labels": cfg.node_labels,
    "node_types": cfg.node_types,
    "node_source_spans": cfg.node_source_spans,
})
            `);

            return JSON.parse(snapshotJson);
        };

        const result = cfgSnapshotQueue.then(runSnapshot);
        cfgSnapshotQueue = result.catch(() => {});
        return result;
    }

    function findNodeIdByLabelFragment(snapshot, labelFragment) {
        const entry = Object.entries(snapshot.node_labels).find(([, nodeLabel]) => nodeLabel.includes(labelFragment));

        if (!entry) {
            throw new Error(`Noeud introuvable pour le fragment: ${labelFragment}`);
        }

        return entry[0];
    }

    function getOutgoingEdges(snapshot, nodeId) {
        return snapshot.edges.filter(([fromNode]) => fromNode === nodeId);
    }

    function getNodeLabelsByType(snapshot, nodeType) {
        return Object.entries(snapshot.node_labels)
            .filter(([nodeId]) => snapshot.node_types[nodeId] === nodeType)
            .map(([, nodeLabel]) => nodeLabel);
    }

    function getNodeSourceSpan(snapshot, nodeId) {
        return snapshot.node_source_spans[nodeId] || null;
    }

    describe('CFG MyCFG', () => {
        it('Relie break d\'un for a la sortie de boucle', async () => {
            const snapshot = await buildCfgSnapshot('for x in [1, 2]:\n    break\nprint("done")');
            const breakNodeId = findNodeIdByLabelFragment(snapshot, 'Break');
            const afterNodeId = findNodeIdByLabelFragment(snapshot, 'done');
            const breakEdges = getOutgoingEdges(snapshot, breakNodeId).filter(([, , label]) => label === 'break');

            expect(breakEdges.length).toBe(1);

            const breakTargetId = breakEdges[0][1];
            expect(snapshot.node_types[breakTargetId]).toBe('Junction');
            expect(getOutgoingEdges(snapshot, breakTargetId).some(([, toNode]) => toNode === afterNodeId)).toBe(true);
        });

        it('Relie break d\'un while a la sortie de boucle', async () => {
            const snapshot = await buildCfgSnapshot('while True:\n    break\nprint("after")');
            const breakNodeId = findNodeIdByLabelFragment(snapshot, 'Break');
            const afterNodeId = findNodeIdByLabelFragment(snapshot, 'after');
            const breakEdges = getOutgoingEdges(snapshot, breakNodeId).filter(([, , label]) => label === 'break');

            expect(breakEdges.length).toBe(1);

            const breakTargetId = breakEdges[0][1];
            expect(snapshot.node_types[breakTargetId]).toBe('Junction');
            expect(getOutgoingEdges(snapshot, breakTargetId).some(([, toNode]) => toNode === afterNodeId)).toBe(true);
        });

        it('Découpe un while booléen sur la conjonction finale', async () => {
            const snapshot = await buildCfgSnapshot(
                'while ((count > 0) or has_value) and z > 0:\n    count -= 1\nprint("after")'
            );
            const decisionLabels = getNodeLabelsByType(snapshot, 'Decision');

            expect(
                decisionLabels.some(label => label.includes('(count > 0 or has_value)\nand z > 0'))
            ).toBe(true);
        });

        it('Fait contourner else a un break de for', async () => {
            const snapshot = await buildCfgSnapshot(
                'for x in [1, 2]:\n    break\nelse:\n    print("no break")\nprint("after")'
            );
            const breakNodeId = findNodeIdByLabelFragment(snapshot, 'Break');
            const elseNodeId = findNodeIdByLabelFragment(snapshot, 'no break');
            const afterNodeId = findNodeIdByLabelFragment(snapshot, 'after');
            const breakEdges = getOutgoingEdges(snapshot, breakNodeId).filter(([, , label]) => label === 'break');

            expect(breakEdges.length).toBe(1);

            const breakTargetId = breakEdges[0][1];
            const outgoingTargets = getOutgoingEdges(snapshot, breakTargetId).map(([, toNode]) => toNode);

            expect(outgoingTargets.includes(afterNodeId)).toBe(true);
            expect(outgoingTargets.includes(elseNodeId)).toBe(false);
        });

        it('Affiche un littéral de liste homogène sans le marquer mixte', async () => {
            const snapshot = await buildCfgSnapshot('for item in [1, 2, 3]:\n    print(item)');
            const decisionLabels = getNodeLabelsByType(snapshot, 'Decision');

            expect(decisionLabels.some(label => label.includes('[1, 2, 3]'))).toBe(true);
            expect(decisionLabels.some(label => label.includes('nombre'))).toBe(true);
            expect(decisionLabels.some(label => label.includes('élément mixte'))).toBe(false);
        });

        it('Reconnaît une liste littérale homogène avec entier négatif', async () => {
            const snapshot = await buildCfgSnapshot('for item in [5, -3, 4, 4, 1]:\n    print(item)');
            const decisionLabels = getNodeLabelsByType(snapshot, 'Decision');

            expect(decisionLabels.some(label => label.includes('[5, -3, 4, 4, 1]'))).toBe(true);
            expect(decisionLabels.some(label => label.includes('nombre'))).toBe(true);
            expect(decisionLabels.some(label => label.includes('élément mixte'))).toBe(false);
        });

        it('Affiche une variable de liste sans quotes ni préfixe verbeux', async () => {
            const snapshot = await buildCfgSnapshot('values = [1, 2, 3]\nfor item in values:\n    print(item)');
            const decisionLabels = getNodeLabelsByType(snapshot, 'Decision');

            expect(decisionLabels.some(label => label.includes('values'))).toBe(true);
            expect(decisionLabels.some(label => label.includes("'values'"))).toBe(false);
            expect(decisionLabels.some(label => label.includes('variable (liste)'))).toBe(false);
        });

        it('Conserve le type nombre pour une variable de liste contenant un entier négatif', async () => {
            const snapshot = await buildCfgSnapshot('values = [5, -3, 4, 4, 1]\nfor item in values:\n    print(item)');
            const decisionLabels = getNodeLabelsByType(snapshot, 'Decision');

            expect(decisionLabels.some(label => label.includes('values'))).toBe(true);
            expect(decisionLabels.some(label => label.includes('nombres'))).toBe(true);
            expect(decisionLabels.some(label => label.includes('élément mixte'))).toBe(false);
        });

        it('Affiche une variable issue d\'un appel sans rappeler sa provenance', async () => {
            const snapshot = await buildCfgSnapshot('values = compute()\nfor item in values:\n    print(item)');
            const decisionLabels = getNodeLabelsByType(snapshot, 'Decision');

            expect(decisionLabels.some(label => label.includes('values'))).toBe(true);
            expect(decisionLabels.some(label => label.includes('résultat d\'appel de fonction'))).toBe(false);
            expect(decisionLabels.some(label => label.includes('contenu:'))).toBe(false);
        });

        it('Affiche un littéral chaîne avec sa syntaxe Python', async () => {
            const snapshot = await buildCfgSnapshot('for ch in "abc":\n    print(ch)');
            const decisionLabels = getNodeLabelsByType(snapshot, 'Decision');

            expect(decisionLabels.some(label => label.includes("'abc'"))).toBe(true);
            expect(decisionLabels.some(label => label.includes('la variable'))).toBe(false);
            expect(decisionLabels.some(label => label.includes('contenu:'))).toBe(false);
        });

        it('Fusionne des affectations simples consécutives dans un seul rectangle', async () => {
            const snapshot = await buildCfgSnapshot('x = 1\ny = 2\nz = 3\nprint(z)');
            const mergedEntry = Object.entries(snapshot.node_labels).find(([, nodeLabel]) =>
                nodeLabel === 'x ← 1\ny ← 2\nz ← 3'
            );

            expect(mergedEntry).toBeDefined();
            expect(snapshot.node_types[mergedEntry[0]]).toBe('AssignmentBlock');
            expect(
                Object.values(snapshot.node_labels).filter(nodeLabel => nodeLabel.includes('←')).length
            ).toBe(1);

            const mergedNodeId = mergedEntry[0];
            const printNodeId = findNodeIdByLabelFragment(snapshot, 'print(z)');
            expect(getOutgoingEdges(snapshot, mergedNodeId).some(([, toNode]) => toNode === printNodeId)).toBe(true);
        });

        it('Fusionne aussi les affectations augmentées dans le bloc unifié', async () => {
            const snapshot = await buildCfgSnapshot('count = 3\ncount += 1\ncount -= 2\nprint(count)');
            const mergedEntry = Object.entries(snapshot.node_labels).find(([, nodeLabel]) =>
                nodeLabel === 'count ← 3\ncount += 1\ncount -= 2'
            );

            expect(mergedEntry).toBeDefined();
            expect(snapshot.node_types[mergedEntry[0]]).toBe('AssignmentBlock');
            expect(
                Object.values(snapshot.node_labels).some(nodeLabel => nodeLabel === 'count += 1')
            ).toBe(false);
            expect(
                Object.values(snapshot.node_labels).some(nodeLabel => nodeLabel === 'count -= 2')
            ).toBe(false);
        });

        it('Expose des plages source AST pour les noeuds du CFG', async () => {
            const snapshot = await buildCfgSnapshot('x = 1\ny = 2\nwhile x > 0:\n    x -= 1');
            const assignBlockNodeId = findNodeIdByLabelFragment(snapshot, 'x ← 1\ny ← 2');
            const whileNodeId = findNodeIdByLabelFragment(snapshot, 'x > 0');
            const assignBlockSpan = getNodeSourceSpan(snapshot, assignBlockNodeId);
            const whileSpan = getNodeSourceSpan(snapshot, whileNodeId);

            expect(assignBlockSpan).toBeDefined();
            expect(assignBlockSpan.lineno).toBe(1);
            expect(assignBlockSpan.end_lineno).toBe(2);
            expect(whileSpan).toBeDefined();
            expect(whileSpan.lineno).toBe(3);
        });

        it('Ancre la décision if sur node.test uniquement', async () => {
            const snapshot = await buildCfgSnapshot('if x > 0:\n    print(x)');
            const ifNodeId = findNodeIdByLabelFragment(snapshot, 'x > 0');
            const ifSpan = getNodeSourceSpan(snapshot, ifNodeId);

            expect(ifSpan).toBeDefined();
            expect(ifSpan.lineno).toBe(1);
            expect(ifSpan.end_lineno).toBe(1);
            expect(ifSpan.col_offset).toBe(3);
            expect(ifSpan.end_col_offset).toBe(8);
        });

        it('Ancre la décision while sur node.test uniquement', async () => {
            const snapshot = await buildCfgSnapshot('while x > 0:\n    x -= 1');
            const whileNodeId = findNodeIdByLabelFragment(snapshot, 'x > 0');
            const whileSpan = getNodeSourceSpan(snapshot, whileNodeId);

            expect(whileSpan).toBeDefined();
            expect(whileSpan.lineno).toBe(1);
            expect(whileSpan.end_lineno).toBe(1);
            expect(whileSpan.col_offset).toBe(6);
            expect(whileSpan.end_col_offset).toBe(11);
        });

        it('Ancre les noeuds de contrôle du for sur la seule ligne d’en-tête', async () => {
            const snapshot = await buildCfgSnapshot('for item in values:\n    print(item)');
            const forControlFragments = [
                'contient des éléments',
                'Le premier élément',
                'Encore un élément',
                "l'élément suivant"
            ];

            forControlFragments.forEach(labelFragment => {
                const nodeId = findNodeIdByLabelFragment(snapshot, labelFragment);
                const span = getNodeSourceSpan(snapshot, nodeId);

                expect(span).toBeDefined();
                expect(span.lineno).toBe(1);
                expect(span.end_lineno).toBe(1);
                expect(span.col_offset).toBe(0);
                expect(span.end_col_offset).toBe(19);
            });
        });

        it('Ancre Start fonction sur la ligne def et laisse End fonction sans span source', async () => {
            const snapshot = await buildCfgSnapshot('def fetch(config):\n    return config');
            const startNodeId = findNodeIdByLabelFragment(snapshot, 'Start fetch');
            const endNodeId = findNodeIdByLabelFragment(snapshot, 'End fetch');
            const startSpan = getNodeSourceSpan(snapshot, startNodeId);
            const endSpan = getNodeSourceSpan(snapshot, endNodeId);

            expect(startSpan).toBeDefined();
            expect(startSpan.lineno).toBe(1);
            expect(startSpan.end_lineno).toBe(1);
            expect(startSpan.col_offset).toBe(0);
            expect(startSpan.end_col_offset).toBe(18);
            expect(endSpan).toBe(null);
        });

        it('Ne fusionne pas des affectations top-level séparées par un def', async () => {
            const snapshot = await buildCfgSnapshot(
                'a = 1\ndef fetch(config):\n    return config\nb = 2\nprint(b)'
            );
            const assignmentBlockLabels = getNodeLabelsByType(snapshot, 'AssignmentBlock');

            expect(assignmentBlockLabels.includes('a ← 1\nb ← 2')).toBe(false);
            expect(findNodeIdByLabelFragment(snapshot, 'a ← 1')).toBeDefined();
            expect(findNodeIdByLabelFragment(snapshot, 'b ← 2')).toBeDefined();
        });
    });
});