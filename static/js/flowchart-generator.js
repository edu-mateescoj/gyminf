// js/flowchart-generator.js

// Variable globale pour stocker l'instance de Pyodide une fois chargée.
var pyodide = null;
// Variable pour stocker le code de votre classe CFG une fois chargé.
var cfgPythonScript = "";
// Référence au bandeau de chargement
var loadingOverlay = null;

/**
 * Affiche ou masque le bandeau de chargement.
 * @param {boolean} show Vrai pour afficher, faux pour masquer.
 */
function setLoadingState(show) {
    if (!loadingOverlay) {
        loadingOverlay = document.getElementById('loading-overlay');
    }
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Initialise Pyodide et charge le script Python contenant la classe ControlFlowGraph.
 * Implémente un pattern Singleton pour éviter les rechargements multiples.
 */
async function initPyodideAndLoadScript() {
    if (pyodide !== null && cfgPythonScript !== "") {
        if (typeof window.handlePythonInput === 'function' && pyodide.globals) {
            try {
                pyodide.globals.set("js_input_handler", window.handlePythonInput);
            } catch (error) {
                console.warn("Impossible de resynchroniser handlePythonInput:", error);
            }
        }
        return;
    }

    console.log("Initialisation de Pyodide...");
    try {
        const pyodideBaseUrl = "/static/assets/pyodide/"; // Chargement local
        if (pyodide === null) {
            pyodide = await loadPyodide({ indexURL: pyodideBaseUrl });
            console.log("Pyodide chargé avec succès.");
        }

        if (typeof window.handlePythonInput === 'function') {
            pyodide.globals.set("js_input_handler", window.handlePythonInput);
        } else {
            console.warn("handlePythonInput non défini globalement. Les inputs() Python ne fonctionneront pas via l'UI.");
        }

        // Charger les packages Python nécessaires (ici, 'ast' est intégré, donc pas besoin de micropip pour lui).
        // Si autres dépendances non standard, il faudrait les charger.
        
/*        
        // Charger micropip, qui est nécessaire pour installer des paquets tiers
        console.log("Chargement de micropip...");
        await pyodide.loadPackage("micropip");
        const micropip = pyodide.pyimport("micropip");
        console.log("micropip chargé.");
        
       
        // Installer pyodide-turtle directement depuis son URL de "wheel" (.whl) FICHIER LOCAL
        // C'est la méthode correcte car il n'est ni sur PyPI, ni dans les paquets par défaut.
        // const turtleWheelUrl = "./turtle-0.0.1-py3-none-any.whl"; 
        const turtleWheelUrl = "./pyo_js_turtle-0.1.1-py3-none-any.whl"; // Version vincent bouillot
        console.log(`Installation de Turtle (version Vincent Bouillot) depuis ${turtleWheelUrl}...`);
        await micropip.install(turtleWheelUrl);
        console.log("Turtle (version Vincent Bouillot)  installé avec succès.");
*/        

        // Charger le contenu du script Python (MyCFG.py)
        if (cfgPythonScript === "") {
            const response = await fetch('/static/py/MyCFG.py');
            if (!response.ok) {
                throw new Error("Impossible de charger le script Python CFG: " + response.statusText);
            }
            cfgPythonScript = await response.text();
            console.log("Script Python CFG chargé.");

            const pyodideModulePath = '/home/pyodide/MyCFG.py';
            pyodide.FS.writeFile(pyodideModulePath, cfgPythonScript);
            await pyodide.runPythonAsync(`
import sys
module_dir = '/home/pyodide'
if module_dir not in sys.path:
    sys.path.append(module_dir)
import MyCFG
            `);
            console.log("Classe ControlFlowGraph définie dans Pyodide.");
        }

        setLoadingState(false); // Masquer le chargement après succès

    } catch (error) {
        console.error("Erreur lors de l'initialisation de Pyodide ou du chargement du script:", error);
        // Afficher une erreur à l'utilisateur dans le div du flowchart
        var flowchartDiv = document.getElementById('flowchart');
        if (flowchartDiv) {
            flowchartDiv.innerHTML = '<div class="alert alert-danger" role="alert">Erreur critique : Le moteur Python n\'a pas pu démarrer. Vérifiez la console et réessayez.</div>';
        }
        setLoadingState(false); // Masquer aussi en cas d'erreur pour ne pas bloquer la page
    }
}

/**
 * Génère le diagramme Mermaid à partir du code Python fourni.
 * @param {string} pythonCode Le code Python à analyser.
 * @returns {Promise<{mermaid:string, canonicalCode:string, ast_dump:string, detectedTypes:Object, nodeSourceSpans:Object, nodeSourceSpansEditor:Object}|null>}
 *          Une promesse qui se résout avec les résultats complets, ou null en cas d'erreur.
 */
async function generateFlowchartFromCode(pythonCode) {

    if (!pyodide || !cfgPythonScript) {
        console.error("Pyodide ou le script CFG ne sont pas initialisés.");
        // Afficher un message plus discret si l'utilisateur clique trop tôt
        var flowchartDiv = document.getElementById('flowchart');
        if (flowchartDiv) {
            flowchartDiv.innerHTML = '<div class="alert alert-info" role="alert">Le générateur de diagramme est en cours d\'initialisation. Veuillez patienter quelques instants.</div>';
        }
        return null;
    }

    if (!pythonCode || pythonCode.trim() === "") {
        console.warn("Aucun code Python fourni pour générer le diagramme.");
        return {
            mermaid: "",
            canonicalCode: "",
            ast_dump: "",
            detectedTypes: {},
            nodeSourceSpans: {},
            nodeSourceSpansEditor: {}
        }; // Important pour que displayFlowchart affiche le message "Aucun diagramme"
    }

    console.log("Génération unifiée (diagramme + code canonique)...");
    setLoadingState(true); // Afficher le chargement pendant la génération du diagramme

    try {
        // Passer le code Python à notre script.
        // Nous allons créer une instance de ControlFlowGraph et appeler ses méthodes.
        // `pyodide.globals.set` permet de rendre des variables JS accessibles depuis Python.
        pyodide.globals.set("user_python_code", pythonCode);

        // Script Python à exécuter dans Pyodide pour utiliser la classe CFG.
        const pythonRunnerScript = `
import ast # S'assurer qu'ast est importé si ce n'est pas déjà fait
from MyCFG import ControlFlowGraph

output_dict = {}
error_message = ""
try:
    current_code = user_python_code
    cfg_instance = ControlFlowGraph(current_code)
    output_dict = cfg_instance.process_and_get_results()

    # Garde-fou : si la clé n'existe pas (ancienne version Python), on la force.
    if not isinstance(output_dict, dict):
        output_dict = {}
    if "detected_types" not in output_dict:
        output_dict["detected_types"] = {}
    if "node_source_spans" not in output_dict:
        output_dict["node_source_spans"] = {}
    if "ast_dump" not in output_dict and cfg_instance.tree is not None:
        output_dict["ast_dump"] = ast.dump(cfg_instance.tree)

except Exception as e:
    import traceback
    error_message = f"Erreur Python lors de la génération du CFG: {type(e).__name__}: {str(e)}\\n{traceback.format_exc()}"
    print(error_message)
    # Structure d'erreur alignée avec la structure normale
    output_dict = {
        "mermaid": "",
        "canonical_code": "",
        "ast_dump": "",
        "detected_types": {},
        "node_source_spans": {},
        "error": error_message
    }

output_dict
`;
        // Exécuter le script runner
        const resultProxy = await pyodide.runPythonAsync(pythonRunnerScript);
        // Conversion PyProxy -> JS
        // Objectif: convertir proprement les dict Python (dont detected_types) en objets JS.
        var outputData;
        if (typeof resultProxy.toJs === 'function') {
            try {
                // dict_converter convertit les dict Python en objets JS simples
                outputData = resultProxy.toJs({ dict_converter: Object.fromEntries });
            } catch (convError) {
                console.warn("Conversion toJs avec dict_converter a échoué, fallback standard.", convError);
                let potentialMap = resultProxy.toJs();
                outputData = (potentialMap instanceof Map) ? Object.fromEntries(potentialMap) : potentialMap;
            }
        } else {
            console.warn("resultProxy.toJs n'est pas une fonction. Tentative d'accès direct.");
            outputData = resultProxy;
        }

        resultProxy.destroy(); // Libérer la mémoire du proxy
        setLoadingState(false); // Masquer le chargement après la génération
         
        // Vérifier si une erreur a été capturée dans le script Python
        if (outputData.error) {
            console.error("Erreur Python détaillée:", outputData.error);
            const flowchartDivDisplay = document.getElementById('flowchart');
            if (flowchartDivDisplay) {
                const preFormattedError = String(outputData.error).replace(/\\n/g, '<br>');
                flowchartDivDisplay.innerHTML = '<div class="alert alert-warning" role="alert"><strong>Erreur Python lors de la génération :</strong><br><pre style="white-space: pre-wrap; word-break: break-all;">' + preFormattedError + '</pre></div>';
            }
            return null; // Indiquer une erreur à la fonction appelante
        }

        // Normalisation défensive des types détectés
        const detectedTypes = (
            outputData &&
            typeof outputData.detected_types === 'object' &&
            outputData.detected_types !== null
        ) ? outputData.detected_types : {};

        const rawNodeSourceSpans = (
            outputData &&
            typeof outputData.node_source_spans === 'object' &&
            outputData.node_source_spans !== null
        ) ? outputData.node_source_spans : {};
        const nodeSourceSpansEditor = {};

        Object.entries(rawNodeSourceSpans).forEach(([nodeId, span]) => {
            nodeSourceSpansEditor[nodeId] = {
                ...span,
                editorLine: Number.isInteger(span?.lineno) ? Math.max(0, span.lineno - 1) : null,
                editorEndLine: Number.isInteger(span?.end_lineno) ? Math.max(0, span.end_lineno - 1) : null
            };
        });

        // Retourner l'objet avec tous les résultats
        return {
            mermaid: outputData.mermaid,
            canonicalCode: outputData.canonical_code,
            ast_dump: outputData.ast_dump,
            detectedTypes: detectedTypes,
            nodeSourceSpans: rawNodeSourceSpans,
            nodeSourceSpansEditor: nodeSourceSpansEditor
        };

    } catch (error) {
        console.error("Erreur JavaScript lors de l'appel à Pyodide pour générer le diagramme:", error);
        setLoadingState(false); // Masquer le chargement
        var flowchartDivError = document.getElementById('flowchart'); // Renommé
        if (flowchartDivError) {
            flowchartDivError.innerHTML = '<div class="alert alert-danger" role="alert">Erreur majeure lors de la communication avec le moteur Python. Vérifiez la console.</div>';
        }
        return null;
    }
}

window.__selectedFlowchartNodeId = window.__selectedFlowchartNodeId || null;

function clearFlowchartNodeSelection(targetDiv) {
    if (!targetDiv) return;

    targetDiv.querySelectorAll('g.node.flowchart-node-selected').forEach(nodeGroup => {
        nodeGroup.classList.remove('flowchart-node-selected');
    });

    window.__selectedFlowchartNodeId = null;

    // Garder l'éditeur synchronisé avec l'état de sélection du diagramme.
    if (typeof window.clearEditorSourceSelection === 'function') {
        window.clearEditorSourceSelection();
    }
}

function applyFlowchartNodeSelection(targetDiv, nodeId) {
    if (!targetDiv) return;

    targetDiv.querySelectorAll('g.node.flowchart-node-selected').forEach(nodeGroup => {
        nodeGroup.classList.remove('flowchart-node-selected');
    });

    if (!nodeId) {
        clearFlowchartNodeSelection(targetDiv);
        return;
    }

    const selectedNode = targetDiv.querySelector(`g.node[data-node-id="${nodeId}"]`);
    if (!selectedNode) {
        clearFlowchartNodeSelection(targetDiv);
        return;
    }

    selectedNode.classList.add('flowchart-node-selected');
    window.__selectedFlowchartNodeId = nodeId;
}

function normalizeRenderedNodeId(rawId) {
    if (!rawId || typeof rawId !== 'string') return '';

    let normalizedId = rawId;
    if (normalizedId.startsWith('flowchart-')) {
        normalizedId = normalizedId.slice('flowchart-'.length);
    }

    const lastDashIndex = normalizedId.lastIndexOf('-');
    if (lastDashIndex > 0) {
        const suffix = normalizedId.slice(lastDashIndex + 1);
        if (/^\d+$/.test(suffix)) {
            normalizedId = normalizedId.slice(0, lastDashIndex);
        }
    }

    return normalizedId;
}

function resolveRenderedNodeId(nodeGroup, nodeSourceSpansEditor) {
    if (!nodeGroup || !nodeSourceSpansEditor) return null;

    const availableNodeIds = new Set(Object.keys(nodeSourceSpansEditor));
    const candidates = [];
    const rawId = nodeGroup.getAttribute('id');

    if (rawId) {
        candidates.push(rawId);
        candidates.push(normalizeRenderedNodeId(rawId));
    }

    const titleElement = nodeGroup.querySelector('title');
    if (titleElement && titleElement.textContent) {
        candidates.push(titleElement.textContent.trim());
    }

    for (const candidate of candidates) {
        if (candidate && availableNodeIds.has(candidate)) {
            return candidate;
        }
    }

    return null;
}

function annotateFlowchartSvgNodes(targetDiv, svgElement) {
    if (!targetDiv || !svgElement) return;

    const nodeSourceSpansEditor = targetDiv.__nodeSourceSpansEditor || {};
    const nodeGroups = Array.from(svgElement.querySelectorAll('g.node'));

    nodeGroups.forEach(nodeGroup => {
        nodeGroup.classList.remove('flowchart-node-selectable', 'flowchart-node-selected');
        delete nodeGroup.dataset.nodeId;
        delete nodeGroup.dataset.editorLine;
        delete nodeGroup.dataset.editorEndLine;
        delete nodeGroup.dataset.lineno;
        delete nodeGroup.dataset.endLineno;
        delete nodeGroup.dataset.colOffset;
        delete nodeGroup.dataset.endColOffset;

        const nodeId = resolveRenderedNodeId(nodeGroup, nodeSourceSpansEditor);
        if (!nodeId) return;

        const span = nodeSourceSpansEditor[nodeId];
        nodeGroup.classList.add('flowchart-node-selectable');
        nodeGroup.dataset.nodeId = nodeId;

        if (Number.isInteger(span?.editorLine)) {
            nodeGroup.dataset.editorLine = String(span.editorLine);
        }
        if (Number.isInteger(span?.editorEndLine)) {
            nodeGroup.dataset.editorEndLine = String(span.editorEndLine);
        }
        if (Number.isInteger(span?.lineno)) {
            nodeGroup.dataset.lineno = String(span.lineno);
        }
        if (Number.isInteger(span?.end_lineno)) {
            nodeGroup.dataset.endLineno = String(span.end_lineno);
        }
        if (Number.isInteger(span?.col_offset)) {
            nodeGroup.dataset.colOffset = String(span.col_offset);
        }
        if (Number.isInteger(span?.end_col_offset)) {
            nodeGroup.dataset.endColOffset = String(span.end_col_offset);
        }
    });

    if (window.__selectedFlowchartNodeId) {
        applyFlowchartNodeSelection(targetDiv, window.__selectedFlowchartNodeId);
    }
}

function bindFlowchartSelectionHandlers(targetDiv) {
    if (!targetDiv) return;

    if (typeof targetDiv.__flowchartClickHandler === 'function') {
        targetDiv.removeEventListener('click', targetDiv.__flowchartClickHandler);
    }

    function getCurrentChallengeCodeIdForLogs() {
        if (typeof window.getCurrentChallengeCodeId === 'function') {
            return window.getCurrentChallengeCodeId();
        }
        return null;
    }

    function normalizeNodeLabel(nodeGroup) {
        return nodeGroup?.textContent ? nodeGroup.textContent.replace(/\s+/g, ' ').trim() : null;
    }

    async function logFlowchartSelection(actionType, nodeGroup, sourceSpan) {
        const currentCodeId = getCurrentChallengeCodeIdForLogs();
        if (!currentCodeId || typeof logHighlightEvent !== 'function') {
            return;
        }

        try {
            await logHighlightEvent(
                currentCodeId,
                nodeGroup?.dataset?.nodeId || null,
                actionType,
                sourceSpan || null,
                normalizeNodeLabel(nodeGroup)
            );
        } catch (error) {
            console.warn('[flowchart-generator] Impossible de journaliser le surlignage:', error);
        }
    }

    targetDiv.__flowchartClickHandler = function(event) {
        const clickedNodeGroup = event.target.closest('g.node[data-node-id]');

        if (clickedNodeGroup) {
            const sourceSpan = {
                editorLine: Number.parseInt(clickedNodeGroup.dataset.editorLine || '', 10),
                editorEndLine: Number.parseInt(clickedNodeGroup.dataset.editorEndLine || '', 10),
                lineno: Number.parseInt(clickedNodeGroup.dataset.lineno || '', 10),
                end_lineno: Number.parseInt(clickedNodeGroup.dataset.endLineno || '', 10),
                col_offset: Number.parseInt(clickedNodeGroup.dataset.colOffset || '', 10),
                end_col_offset: Number.parseInt(clickedNodeGroup.dataset.endColOffset || '', 10),
            };
            const hasExplicitSourceSpan = [
                sourceSpan.editorLine,
                sourceSpan.editorEndLine,
                sourceSpan.lineno,
                sourceSpan.end_lineno,
                sourceSpan.col_offset,
                sourceSpan.end_col_offset,
            ].some(Number.isInteger);

            applyFlowchartNodeSelection(targetDiv, clickedNodeGroup.dataset.nodeId);
            if (hasExplicitSourceSpan && typeof window.selectEditorSourceRange === 'function') {
                window.selectEditorSourceRange(sourceSpan);
            } else if (typeof window.clearEditorSourceSelection === 'function') {
                window.clearEditorSourceSelection();
            }
            logFlowchartSelection('select', clickedNodeGroup, hasExplicitSourceSpan ? sourceSpan : null);
            return;
        }

        if (event.target.closest('svg') || event.target === targetDiv) {
            const previouslySelectedNodeId = window.__selectedFlowchartNodeId;
            const previouslySelectedNode = previouslySelectedNodeId
                ? targetDiv.querySelector(`g.node[data-node-id="${previouslySelectedNodeId}"]`)
                : null;
            clearFlowchartNodeSelection(targetDiv);
            if (previouslySelectedNode) {
                logFlowchartSelection('clear', previouslySelectedNode, null);
            }
        }
    };

    targetDiv.addEventListener('click', targetDiv.__flowchartClickHandler);
}

/**
 * Affiche le diagramme Mermaid dans le div spécifié.
 * @param {string} mermaidCode La chaîne de caractères Mermaid.
 * @param {string} targetDivId L'ID du div où afficher le diagramme.
 */
function isFlowchartVisible() {
    const el = document.getElementById('flowchart');
    if (!el) return false;
    return !!(el.offsetParent || el.getClientRects().length);
}

window.__mermaidRenderInProgress = window.__mermaidRenderInProgress || false;
window.__pendingMermaidRender = window.__pendingMermaidRender || false;

window.renderPendingFlowchart = function() {
    const c = document.getElementById('flowchart');
    if (!c || !c.dataset || typeof c.dataset.mermaidSource !== 'string') return;
    if (!isFlowchartVisible()) { window.__pendingMermaidRender = true; return; }
    displayFlowchart(c.dataset.mermaidSource, 'flowchart');
};

async function displayFlowchart(mermaidCode, targetDivId, nodeSourceSpansEditor = null) {
    const flowchartContainer = document.getElementById(targetDivId);
    const zoomControls = document.getElementById('zoom-controls');
    if (!flowchartContainer) return;

    flowchartContainer.dataset.mermaidSource = mermaidCode || "";
    if (nodeSourceSpansEditor && typeof nodeSourceSpansEditor === 'object') {
        flowchartContainer.__nodeSourceSpansEditor = nodeSourceSpansEditor;
    } else if (!flowchartContainer.__nodeSourceSpansEditor) {
        flowchartContainer.__nodeSourceSpansEditor = {};
    }
    if (!isFlowchartVisible()) {
        window.__pendingMermaidRender = true;
        return;
    }

    if (window.__mermaidRenderInProgress) {
        window.__pendingMermaidRender = true;
        return;
    }
    window.__mermaidRenderInProgress = true;

    if (window.panZoomInstance && typeof window.panZoomInstance.destroy === 'function') {
        try {
            const svgEl = flowchartContainer.querySelector('svg');
            if (svgEl && bboxReady(svgEl)) window.panZoomInstance.destroy();
        } catch(e) { console.warn(e); }
        window.panZoomInstance = null;
    }

    if (!mermaidCode) {
        flowchartContainer.__nodeSourceSpansEditor = {};
        clearFlowchartNodeSelection(flowchartContainer);
        flowchartContainer.innerHTML = '<p class="text-center text-muted mt-3">Aucun diagramme à afficher.</p>';
        if (zoomControls) zoomControls.classList.remove('show');
        window.__mermaidRenderInProgress = false;
        return;
    }

    flowchartContainer.innerHTML = '';
    const tempDiv = document.createElement('div');
    tempDiv.className = 'mermaid';
    tempDiv.textContent = mermaidCode;
    flowchartContainer.appendChild(tempDiv);

    try {
        await mermaid.run({ nodes: [tempDiv] });
        const svgEl = flowchartContainer.querySelector('svg');
        if (svgEl) {
            annotateFlowchartSvgNodes(flowchartContainer, svgEl);
            bindFlowchartSelectionHandlers(flowchartContainer);
            svgEl.removeAttribute('height');
            svgEl.removeAttribute('width');
            svgEl.removeAttribute('style');
            svgEl.style.width = '100%';
            svgEl.style.height = '100%';
            svgEl.style.maxWidth = 'none';
            const tryInit = () => {
                if (!svgEl.getClientRects().length || !bboxReady(svgEl)) return false;
                if (typeof svgPanZoom === 'undefined') return false;
                window.panZoomInstance = svgPanZoom(svgEl, {
                    zoomEnabled: true,
                    controlIconsEnabled: false,
                    fit: true,
                    center: true,
                    minZoom: 0.1,
                    maxZoom: 10,
                    dblClickZoomEnabled: false
                });
                try {
                    window.panZoomInstance.resize();
                    window.panZoomInstance.fit();
                    window.panZoomInstance.center();
                } catch(e) { console.warn(e); }
                if (zoomControls) zoomControls.classList.add('show');
                return true;
            };
            if (!tryInit()) setTimeout(tryInit, 120);
        }
    } catch (error) {
        console.error("Erreur lors du rendu du diagramme Mermaid:", error);
        flowchartContainer.innerHTML = '<div class="alert alert-danger" role="alert">Erreur lors de l\'affichage du diagramme.</div>';
        if (zoomControls) zoomControls.classList.remove('show');
    } finally {
        window.__mermaidRenderInProgress = false;
        if (window.__pendingMermaidRender && isFlowchartVisible()) {
            window.__pendingMermaidRender = false;
            window.renderPendingFlowchart();
        }
    }
}

// Initialiser Pyodide et charger le script dès que la page est prête.
// Nous utilisons DOMContentLoaded pour s'assurer que le DOM est prêt avant de manipuler les divs.
document.addEventListener('DOMContentLoaded', function() {
    
    loadingOverlay = document.getElementById('loading-overlay'); // Initialiser la référence ici
    initPyodideAndLoadScript(); // affichera le bandeau

    // Initialiser Mermaid (configuration globale si nécessaire)
    const initMermaid = () => {
        if (typeof window.mermaid === 'undefined') {
            console.warn("Mermaid n'est pas encore chargé. Nouvelle tentative dans 300ms...");
            setTimeout(initMermaid, 300);
            return;
        }
        window.mermaid.initialize({
            startOnLoad: false,
            theme: 'base',
            securityLevel: 'loose',
            flowchart: {
                useMaxWidth: false,
                htmlLabels: true
            }
        });
        console.log("Mermaid initialisé.");
    };

    initMermaid();
});

// Fonction globale pour être appelée depuis d'autres scripts
// Fonction principale pour mettre à jour le diagramme, appelée par un événement externe (bouton).
/**
 * Récupère le code, génère le diagramme et l'affiche.
 * Retourne désormais aussi detectedTypes au code appelant (main.js).
 */
async function triggerFlowchartUpdate() {
    // S'assurer que codeEditorInstance est accessible (doit être défini globalement ou passé en paramètre)
    if (typeof codeEditorInstance === 'undefined' || !codeEditorInstance) {
        console.error("L'instance de CodeMirror (codeEditorInstance) n'est pas disponible.");
        alert("Erreur : L'éditeur de code n'est pas initialisé.");
        return;
    }
    var currentCode = codeEditorInstance.getValue();

    if (currentCode) {
        // 1. On appelle la fonction et on stocke l'objet complet dans "results"
        var results = await generateFlowchartFromCode(currentCode);

        // 2. On vérifie que l'objet "results" existe ET qu'il contient bien la propriété "mermaid"
        if (results && results.mermaid) {
            // 3. On passe uniquement la propriété "mermaid" à la fonction d'affichage
            await displayFlowchart(results.mermaid, 'flowchart', results.nodeSourceSpansEditor || {});
        } else {
            // Gérer le cas où la génération a échoué et n'a rien retourné de valide
            await displayFlowchart("", 'flowchart');
        }
        
        // 4. On retourne l'objet complet pour que main.js puisse l'utiliser
        //    (mermaid, canonicalCode, ast_dump, detectedTypes)
        return results;

    } else {
        // Effacer le diagramme si pas de code
        await displayFlowchart("", 'flowchart');
        return null; // Retourner null si pas de code
    }
}

// S'assurer que panZoomInstance existe dans le scope global
if (typeof window.panZoomInstance === 'undefined') {
    window.panZoomInstance = null;
}

function bboxReady(svgEl) {
    if (!svgEl) return false;
    const bb = svgEl.getBBox();
    return Number.isFinite(bb.width) && Number.isFinite(bb.height) && bb.width > 0 && bb.height > 0;
}

window.rerenderStoredFlowchart = function() {
    const c = document.getElementById('flowchart');
    if (!c || !c.dataset || typeof c.dataset.mermaidSource !== 'string') return;
    if (!isFlowchartVisible()) { window.__pendingMermaidRender = true; return; }
    displayFlowchart(c.dataset.mermaidSource, 'flowchart');
};

document.addEventListener('theme:changed', function() {
    if (typeof window.rerenderStoredFlowchart === 'function') {
        window.rerenderStoredFlowchart();
    }
});