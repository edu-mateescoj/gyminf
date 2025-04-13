// Fonction pour convertir du code Python en diagramme Mermaid
function generateFlowchart(pythonCode) {
    // Débuter avec une structure de diagramme vide
    const nodes = [];
    const connections = [];
    let nodeCounter = 1;
    
    // Récupérer un identifiant unique pour un nœud
    function getNodeId() {
        const id = `node${nodeCounter}`;
        nodeCounter += 1;
        return id;
    }
    
    // Obtenir le niveau d'indentation (nombre entier
    // nb de groupes de 4 espaces)
    function getIndentLevel(line) {
        let indent = 0;
        for (let i = 0; i < line.length; i++) {
            if (line[i] === ' ') indent++;
            else if (line[i] === '\t') indent += 4;
            else break;
        }
        return Math.floor(indent / 4);
    }
    
    // Clean line: trim() et remplace " par '
    // pour éviter les conflits avec guillemets Mermaid"
    function cleanLine(line) {
        return line.trim().replace(/"/g, "'");
    }
    
    // Parse the lines into a more structured format
    function parseLines(lines) {
        const parsedLines = [];
        const elseMarkers = [];
        
        // First pass - parse all lines
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim() === '') continue;
            
            const indentLevel = getIndentLevel(line);
            const cleanedLine = cleanLine(line);
            
            let type = 'statement';
            let content = cleanedLine;
            
            if (cleanedLine.startsWith('if ') && cleanedLine.endsWith(':')) {
                type = 'if';
                content = cleanedLine.slice(3, -1); // supprime 'if ' et ':'
            } 
            else if (cleanedLine.startsWith('elif ') && cleanedLine.endsWith(':')) {
                type = 'elif';
                content = cleanedLine.slice(5, -1); // supprime 'elif ' et ':'
            }
            else if (cleanedLine.startsWith('else:')) {
                type = 'else-marker';
                content = 'else';
                
                // cherche le parent if ou elif
                let parentIf = null;
                for (let j = parsedLines.length - 1; j >= 0; j--) {
                    if (parsedLines[j].indentLevel < indentLevel && 
                        (parsedLines[j].type === 'if' || parsedLines[j].type === 'elif')) {
                        parentIf = parsedLines[j];
                        break;
                    }
                }
                
                if (parentIf) {
                    elseMarkers.push({
                        lineIndex: i,
                        indentLevel: indentLevel,
                        parentIf: parentIf
                    });
                }
                
                // ne pas créer de node pour la ligne 'else:'
                continue;
            }
            else if (cleanedLine.startsWith('for ') && cleanedLine.endsWith(':')) {
                type = 'for';
                content = cleanedLine.slice(4, -1); // spprime 'for ' et ':'
            }
            else if (cleanedLine.startsWith('while ') && cleanedLine.endsWith(':')) {
                type = 'while';
                content = cleanedLine.slice(6, -1); // supprime 'while ' et ':'
            }
            
            parsedLines.push({
                lineIndex: i,
                indentLevel: indentLevel,
                content: content,
                type: type,
                nodeId: null, // sera assigné ensuite
                elseBlock: false
            });
        }
        
        // marquer les instructions qui sont dans des blocs 'else'
        for (const marker of elseMarkers) {
            for (let i = 0; i < parsedLines.length; i++) {
                const line = parsedLines[i];
                
                //Si cette ligne vient après le 'else:' et est à un niveau d'indentation supérieur 
                // (plus profond) alors elle fait partie du bloc 'else'
                // et elle est marquée comme telle
                if (line.lineIndex > marker.lineIndex && line.indentLevel > marker.indentLevel) {
                    line.elseBlock = true;
                    line.elseParent = marker.parentIf;
                }
                // on est passé hors du bloc 'else': arrêter le marquage
                else if (line.lineIndex > marker.lineIndex && line.indentLevel <= marker.indentLevel) {
                    break;
                }
            }
        }
        
        return parsedLines;
    }
    
    // Analyse le control flow entre les nodes
    function analyzeControlFlow(parsedLines) {
        // créer les nodes et determiner le control flow
        const allNodes = [];
        
        // Le node de départ
        //TODO : 'start' est un rond comme vu par les élèves
        const startId = getNodeId();
        nodes.push(`${startId}[Start]`);
        allNodes.push({
            nodeId: startId,
            type: 'start',
            next: []
        });
        
        // Créer les nodes à chaque ligne
        for (let i = 0; i < parsedLines.length; i++) {
            const line = parsedLines[i];
            const nodeId = getNodeId();
            line.nodeId = nodeId;
            
            // créer le node approprié selon type
            // TODO les types 'for' et 'while'
            if (line.type === 'if' || line.type === 'elif') {
                nodes.push(`${nodeId}{${line.content}}`);
            } 
            else if (line.type === 'for' || line.type === 'while') {
                nodes.push(`${nodeId}((${line.content}))`);
            }
            else {
                nodes.push(`${nodeId}[${line.content}]`);
            }
            
            // créer les métadonnées du node
            allNodes.push({
                nodeId: nodeId,
                type: line.type,
                next: []
            });
        }
        
        // Déterminer la séquence - quel node suit lequel
        for (let i = 0; i < parsedLines.length; i++) {
            const currentLine = parsedLines[i];
            const currentNode = allNodes.find(n => n.nodeId === currentLine.nodeId);
            
            // Si c'est une condition ('if' ou 'elif')
            if (currentLine.type === 'if' || currentLine.type === 'elif') {
                // trouver la première instruction de la branche "True" 
                // parcourir les instructions indentées sous le if
                let trueNode = null;
                for (let j = i + 1; j < parsedLines.length; j++) {
                    if (parsedLines[j].indentLevel > currentLine.indentLevel) {
                        trueNode = parsedLines[j];
                        break;
                    }
                    else if (parsedLines[j].indentLevel === currentLine.indentLevel) {
                        // node au même niveau, on sort
                        break;
                    }
                }
                
                // trouver la prochaine instruction pour la branche "False"
                let falseNode = null;
                
                // d'abord chercher un 'else' ou 'elif' au même niveau d'indentation
                let hasElseBlock = false;
                for (let j = i + 1; j < parsedLines.length; j++) {
                    // si on trouve un 'else' au même niveau
                    // et qui appartient à notre if
                    if (parsedLines[j].elseBlock && parsedLines[j].elseParent === currentLine) {
                        falseNode = parsedLines[j];
                        hasElseBlock = true;
                        break;
                    }
                    // si on trouve un 'elif' au même niveau
                    // et qui appartient à notre if
                    else if (parsedLines[j].indentLevel === currentLine.indentLevel && 
                            parsedLines[j].type === 'elif') {
                        falseNode = parsedLines[j];
                        hasElseBlock = true;
                        break;
                    }
                    // on sort si on trouve un node au même niveau
                    else if (parsedLines[j].indentLevel < currentLine.indentLevel) {
                        break;
                    }
                }
                
                // si aucun else/elif n'a été trouvé, on cherche la prochaine instruction
                // qui n'est pas dans le bloc else/elif
                if (!hasElseBlock) {
                    // on cherche la prochaine instruction, au même niveau
                    // ou un niveau supérieur
                    // qui n'est pas un elif
                    for (let j = i + 1; j < parsedLines.length; j++) {
                        // If at same indentation level but not an elif 
                        // (already handled by else/elif check)
                        if (parsedLines[j].indentLevel === currentLine.indentLevel && 
                            parsedLines[j].type !== 'elif') {
                            falseNode = parsedLines[j];
                            break;
                        }
                        // si on est à un niveau supérieur : fin de l'if 
                        else if (parsedLines[j].indentLevel < currentLine.indentLevel) {
                            falseNode = parsedLines[j];
                            break;
                        }
                    }
                }
                
                // Connect to the True branch (Yes) - this should connect to the indented code
                if (trueNode) {
                    connections.push(`${currentLine.nodeId} -->|Yes| ${trueNode.nodeId}`);
                    currentNode.next.push({ condition: 'yes', nodeId: trueNode.nodeId });
                    
                    // Find the last statement in the True branch
                    let lastTrueNode = trueNode;
                    for (let j = i + 1; j < parsedLines.length; j++) {
                        if (parsedLines[j].indentLevel > currentLine.indentLevel) {
                            lastTrueNode = parsedLines[j];
                        }
                        else if (parsedLines[j].indentLevel <= currentLine.indentLevel) {
                            break;
                        }
                    }
                }
                
                // Find the next statement after the entire if-else block
                // This is common code that both branches should connect to
                let nextOutsideBlock = null;
                let inElseBlock = false;
                
                // Look for the first statement at the same indentation level after skipping
                // all if/elif/else blocks
                for (let j = i + 1; j < parsedLines.length; j++) {
                    // Skip any indented code (part of the if/else block)
                    if (parsedLines[j].indentLevel > currentLine.indentLevel) {
                        continue;
                    }
                    // Skip any else/elif at the same level (part of the if/else structure)
                    else if (parsedLines[j].indentLevel === currentLine.indentLevel && 
                            (parsedLines[j].type === 'elif' || parsedLines[j].type === 'else-marker')) {
                        inElseBlock = true;
                        continue;
                    }
                    // If we find a statement at the same level as our if, and it's not
                    // an elif/else that belongs to our if, it's the start of code after the if/else block
                    else if (parsedLines[j].indentLevel === currentLine.indentLevel && !inElseBlock) {
                        nextOutsideBlock = parsedLines[j];
                        break;
                    }
                    // If we go back up to a higher level, also consider this the end of the if/else block
                    else if (parsedLines[j].indentLevel < currentLine.indentLevel) {
                        nextOutsideBlock = parsedLines[j];
                        break;
                    }
                }
                
                // Connect the last True branch node to the code after the if/else block
                if (nextOutsideBlock && lastTrueNode) {
                    connections.push(`${lastTrueNode.nodeId} --> ${nextOutsideBlock.nodeId}`);
                }
                
                // Connect to the False branch (No) - this should connect to the else/elif or next statement
                if (falseNode) {
                    connections.push(`${currentLine.nodeId} -->|No| ${falseNode.nodeId}`);
                    currentNode.next.push({ condition: 'no', nodeId: falseNode.nodeId });
                    
                    // If there's a nextOutsideBlock found in the true branch, we need to connect the 
                    // last node in the false branch to it as well
                    if (nextOutsideBlock) {
                        // Find the last statement in the False branch
                        let lastFalseNode = falseNode;
                        let falseNodeIndex = parsedLines.indexOf(falseNode);
                        
                        // If this is an 'else' block
                        if (falseNode.elseBlock) {
                            for (let j = falseNodeIndex; j < parsedLines.length; j++) {
                                if (parsedLines[j].indentLevel > currentLine.indentLevel) {
                                    lastFalseNode = parsedLines[j];
                                }
                                else if (parsedLines[j].indentLevel <= currentLine.indentLevel) {
                                    break;
                                }
                            }
                        }
                        // If this is an 'elif' we need to look at its indented block
                        else if (falseNode.type === 'elif') {
                            // We don't need to handle this case explicitly as the elif will be processed
                            // in its own iteration and connect to the nextOutsideBlock
                        }
                        // Connect the last node in the false branch to the common code
                        if (lastFalseNode && lastFalseNode !== falseNode) {
                            connections.push(`${lastFalseNode.nodeId} --> ${nextOutsideBlock.nodeId}`);
                        }
                        // If falseNode is a direct statement (not in an else/elif block)
                        else if (lastFalseNode === falseNode && falseNode.type === 'statement') {
                            connections.push(`${falseNode.nodeId} --> ${nextOutsideBlock.nodeId}`);
                        }
                    }
                }
            }
            // If this is a regular statement
            else if (currentLine.type === 'statement') {
                // Connect to the next statement in sequence
                let nextNode = null;
                
                // If this statement is the last in a sequence at its indentation level,
                // we need to find what comes after the block
                let isLastInBlock = true;
                for (let j = i + 1; j < parsedLines.length; j++) {
                    if (parsedLines[j].indentLevel === currentLine.indentLevel) {
                        // There's another statement at the same level
                        nextNode = parsedLines[j];
                        isLastInBlock = false;
                        break;
                    }
                    else if (parsedLines[j].indentLevel < currentLine.indentLevel) {
                        // We've exited to a higher level
                        nextNode = parsedLines[j];
                        break;
                    }
                }
                
                // If we found a next node, connect to it
                if (nextNode) {
                    connections.push(`${currentLine.nodeId} --> ${nextNode.nodeId}`);
                    currentNode.next.push({ condition: 'next', nodeId: nextNode.nodeId });
                }
            }
            // Handle loops
            else if (currentLine.type === 'for' || currentLine.type === 'while') {
                // Connect to the first statement in the loop body
                let loopBodyStart = null;
                for (let j = i + 1; j < parsedLines.length; j++) {
                    if (parsedLines[j].indentLevel > currentLine.indentLevel) {
                        loopBodyStart = parsedLines[j];
                        break;
                    }
                    else if (parsedLines[j].indentLevel <= currentLine.indentLevel) {
                        break;
                    }
                }
                
                // If we found a loop body, connect to it
                if (loopBodyStart) {
                    connections.push(`${currentLine.nodeId} --> ${loopBodyStart.nodeId}`);
                    currentNode.next.push({ condition: 'body', nodeId: loopBodyStart.nodeId });
                }
                
                // Find the last statement in the loop body to connect back to the loop
                let loopBodyEnd = null;
                for (let j = i + 1; j < parsedLines.length; j++) {
                    if (parsedLines[j].indentLevel > currentLine.indentLevel) {
                        loopBodyEnd = parsedLines[j];
                    }
                    else if (parsedLines[j].indentLevel <= currentLine.indentLevel) {
                        break;
                    }
                }
                
                // If we found a loop body end, connect it back to the loop
                if (loopBodyEnd) {
                    connections.push(`${loopBodyEnd.nodeId} --> ${currentLine.nodeId}`);
                }
                
                // Connect the loop to the next statement after the loop
                let afterLoop = null;
                for (let j = i + 1; j < parsedLines.length; j++) {
                    if (parsedLines[j].indentLevel <= currentLine.indentLevel) {
                        afterLoop = parsedLines[j];
                        break;
                    }
                }
                
                // If we found a statement after the loop, connect the loop to it
                if (afterLoop) {
                    connections.push(`${currentLine.nodeId} --> ${afterLoop.nodeId}`);
                    currentNode.next.push({ condition: 'after', nodeId: afterLoop.nodeId });
                }
            }
        }
        
        // Connect the start node to the first statement
        if (parsedLines.length > 0) {
            connections.push(`${startId} --> ${parsedLines[0].nodeId}`);
            allNodes[0].next.push({ condition: 'start', nodeId: parsedLines[0].nodeId });
        }
        
        return allNodes;
    }
    
    // Main flowchart generation logic
    const lines = pythonCode.trim().split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) {
        // No code, just return a simple "No code" node
        return `
<div class="mermaid">
flowchart TD
    node1[No code provided]
</div>
`;
    }
    
    // Parse and analyze the code
    const parsedLines = parseLines(lines);
    analyzeControlFlow(parsedLines);
    
    // Find all orphaned nodes (nodes with no connections) and connect them to a central "Start" node
    const orphanedNodes = parsedLines.filter(line => !connections.some(c => c.includes(line.nodeId)));
    
    // For each orphaned node, find where it logically belongs by checking its indentation
    // and context in the original code
    orphanedNodes.forEach(orphan => {
        let parentNode = null;
        
        // If this is in an else block, make a new connection
        if (orphan.elseBlock && orphan.elseParent) {
            connections.push(`${orphan.elseParent.nodeId} -->|No| ${orphan.nodeId}`);
        } else {
            // Find any preceding node to connect to
            for (let i = parsedLines.indexOf(orphan) - 1; i >= 0; i--) {
                const prevNode = parsedLines[i];
                
                // Check if this node is already part of the connection graph
                if (connections.some(c => c.includes(prevNode.nodeId))) {
                    // If no direct connection to our orphan, add one
                    if (!connections.some(c => c.includes(`${prevNode.nodeId} -->`) && c.includes(orphan.nodeId))) {
                        connections.push(`${prevNode.nodeId} --> ${orphan.nodeId}`);
                    }
                    break;
                }
            }
            
            // If still orphaned, connect to start
            if (!connections.some(c => c.includes(orphan.nodeId))) {
                connections.push(`node1 --> ${orphan.nodeId}`);
            }
        }
    });
    
    // Create the mermaid flowchart
    const flowchartCode = `
<div class="mermaid">
flowchart TD
    ${nodes.join('\n    ')}
    ${connections.join('\n    ')}
</div>
`;
    
    return flowchartCode;
}

// Helper function to display the flowchart in the UI
function displayFlowchart(flowchartCode) {
    document.getElementById('flowchart').innerHTML = flowchartCode;
    
    // Manually trigger Mermaid to render the flowchart
    mermaid.init(undefined, '.mermaid');
}
