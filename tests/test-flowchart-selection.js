document.addEventListener('DOMContentLoaded', () => {
    describe('Sélection interactive du logigramme', () => {
        it('Désélectionne aussi le texte quand on clique dans le vide du diagramme', async () => {
            const targetDiv = document.createElement('div');
            targetDiv.innerHTML = `
                <svg>
                    <g class="node" data-node-id="node02" data-editor-line="1" data-editor-end-line="1" data-lineno="2" data-end-lineno="2" data-col-offset="0" data-end-col-offset="6">
                        <rect width="10" height="10"></rect>
                    </g>
                </svg>
            `;
            document.body.appendChild(targetDiv);

            let currentEditorSelection = null;
            window.selectEditorSourceRange = function(sourceSpan) {
                currentEditorSelection = sourceSpan;
            };
            window.clearEditorSourceSelection = function() {
                currentEditorSelection = null;
            };
            window.__selectedFlowchartNodeId = null;

            bindFlowchartSelectionHandlers(targetDiv);

            const nodeRect = targetDiv.querySelector('rect');
            nodeRect.dispatchEvent(new MouseEvent('click', { bubbles: true }));

            expect(currentEditorSelection).toBeDefined();
            expect(targetDiv.querySelectorAll('g.node.flowchart-node-selected').length).toBe(1);

            const svgElement = targetDiv.querySelector('svg');
            svgElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));

            expect(currentEditorSelection).toBe(null);
            expect(targetDiv.querySelectorAll('g.node.flowchart-node-selected').length).toBe(0);

            targetDiv.remove();
        });

        it('N applique aucun fallback éditeur pour un noeud sans span source', async () => {
            const targetDiv = document.createElement('div');
            targetDiv.innerHTML = `
                <svg>
                    <g class="node" data-node-id="node02" data-editor-line="1" data-editor-end-line="1" data-lineno="2" data-end-lineno="2" data-col-offset="0" data-end-col-offset="6">
                        <rect class="with-span" width="10" height="10"></rect>
                    </g>
                    <g class="node" data-node-id="node03">
                        <rect class="without-span" width="10" height="10"></rect>
                    </g>
                </svg>
            `;
            document.body.appendChild(targetDiv);

            let currentEditorSelection = null;
            window.selectEditorSourceRange = function(sourceSpan) {
                currentEditorSelection = sourceSpan;
            };
            window.clearEditorSourceSelection = function() {
                currentEditorSelection = null;
            };
            window.__selectedFlowchartNodeId = null;

            bindFlowchartSelectionHandlers(targetDiv);

            targetDiv.querySelector('rect.with-span').dispatchEvent(new MouseEvent('click', { bubbles: true }));
            expect(currentEditorSelection).toBeDefined();

            targetDiv.querySelector('rect.without-span').dispatchEvent(new MouseEvent('click', { bubbles: true }));

            expect(currentEditorSelection).toBe(null);
            expect(targetDiv.querySelectorAll('g.node.flowchart-node-selected').length).toBe(1);
            expect(targetDiv.querySelector('g.node.flowchart-node-selected').dataset.nodeId).toBe('node03');

            targetDiv.remove();
        });
    });
});