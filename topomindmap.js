(function () {
    // Load D3.js if not already loaded
    function loadD3(callback) {
        if (window.d3) {
            callback();
        } else {
            const script = document.createElement('script');
            script.src = 'https://d3js.org/d3.v7.min.js';
            script.onload = callback;
            document.head.appendChild(script);
        }
    }

    loadD3(() => {
        // Create the widget container
        const widget = document.createElement('div');
        widget.style.position = 'absolute';
        widget.style.top = '10px';
        widget.style.left = '10px';
        widget.style.width = '95vw'; // Fit within the iPhone screen width
        widget.style.height = '80vh'; // Fit within the iPhone screen height
        widget.style.border = '2px solid #ccc';
        widget.style.borderRadius = '8px';
        widget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        widget.style.background = '#fff';
        widget.style.overflow = 'hidden';
        widget.style.zIndex = 1000;
        widget.style.cursor = 'grab';

        document.body.appendChild(widget);

        // Add a draggable header
        const header = document.createElement('div');
        header.style.width = '100%';
        header.style.height = '40px';
        header.style.background = '#f1f1f1';
        header.style.borderBottom = '1px solid #ccc';
        header.style.cursor = 'grab';
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.justifyContent = 'center';
        header.textContent = 'Mindmap Widget';
        widget.appendChild(header);

        // Drag functionality for the widget
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        header.addEventListener('touchstart', (e) => {
            isDragging = true;
            const touch = e.touches[0];
            offsetX = touch.clientX - widget.offsetLeft;
            offsetY = touch.clientY - widget.offsetTop;
            header.style.cursor = 'grabbing';
        });

        document.addEventListener('touchmove', (e) => {
            if (isDragging) {
                const touch = e.touches[0];
                widget.style.left = `${touch.clientX - offsetX}px`;
                widget.style.top = `${touch.clientY - offsetY}px`;
            }
        });

        document.addEventListener('touchend', () => {
            isDragging = false;
            header.style.cursor = 'grab';
        });

        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - widget.offsetLeft;
            offsetY = e.clientY - widget.offsetTop;
            header.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                widget.style.left = `${e.clientX - offsetX}px`;
                widget.style.top = `${e.clientY - offsetY}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            header.style.cursor = 'grab';
        });

        // Add content container
        const content = document.createElement('div');
        content.style.width = '100%';
        content.style.height = 'calc(100% - 40px)';
        content.style.overflow = 'auto'; // Scrollable content area
        widget.appendChild(content);

        // Add controls and SVG inside the content
        const controls = document.createElement('div');
        controls.id = 'controls';
        controls.style.padding = '10px';
        controls.style.background = '#f9f9f9';
        controls.style.borderBottom = '1px solid #ccc';
        controls.innerHTML = `
            <label for="mode">Select Mode:</label>
            <select id="mode" style="margin-left: 10px; padding: 5px;">
                <option value="drag">Drag Nodes</option>
                <option value="add">Add New Node</option>
                <option value="edit">Change Node Text</option>
                <option value="delete">Delete Node</option>
            </select>
        `;
        content.appendChild(controls);

        // --- New Controls for Saving/Loading/Deleting Mindmaps ---
        // Save button (prompts for a name)
        const saveButton = document.createElement('button');
        saveButton.id = 'saveGraph';
        saveButton.textContent = 'Save';
        saveButton.style.marginLeft = '10px';
        controls.appendChild(saveButton);

        // Dropdown to show saved mindmaps
        const savedDropdown = document.createElement('select');
        savedDropdown.id = 'savedMindmapDropdown';
        savedDropdown.style.marginLeft = '10px';
        controls.appendChild(savedDropdown);

        // Load button (loads the selected mindmap)
        const loadButton = document.createElement('button');
        loadButton.id = 'loadGraph';
        loadButton.textContent = 'Load';
        loadButton.style.marginLeft = '10px';
        controls.appendChild(loadButton);

        // Delete button (deletes the selected mindmap)
        const deleteButton = document.createElement('button');
        deleteButton.id = 'deleteGraph';
        deleteButton.textContent = 'Delete';
        deleteButton.style.marginLeft = '10px';
        controls.appendChild(deleteButton);
        // --- End New Controls ---

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'mindmap';
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', 'calc(100% - 40px)');
        svg.style.overflow = 'visible';
        content.appendChild(svg);

        // Initialize the D3 visualization
        const colors = d3.schemeCategory10;

        // The default graph (with links defined by string IDs)
        let graph = {
            nodes: [
                { id: 'Main Idea', color: colors[0] },
                { id: 'Sub Idea 1', color: colors[1] },
                { id: 'Sub Idea 2', color: colors[2] },
            ],
            links: [
                { source: 'Main Idea', target: 'Sub Idea 1' },
                { source: 'Main Idea', target: 'Sub Idea 2' },
            ],
        };

        // Helper to ensure that each link’s source and target are node objects.
        // (This function is called after loading a saved graph.)
        function resolveLinks(g) {
            g.links.forEach(function (l) {
                if (typeof l.source === "string") {
                    l.source = g.nodes.find(n => n.id === l.source);
                }
                if (typeof l.target === "string") {
                    l.target = g.nodes.find(n => n.id === l.target);
                }
            });
        }
        // Resolve links for the default graph.
        resolveLinks(graph);

        const svgD3 = d3.select(svg);
        const simulation = d3.forceSimulation(graph.nodes)
            .force('link', d3.forceLink(graph.links).id((d) => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(widget.offsetWidth / 2, widget.offsetHeight / 2))
            .on('tick', ticked);

        let link = svgD3.selectAll('.link')
            .data(graph.links)
            .enter().append('line')
            .attr('class', 'link')
            .attr('stroke', '#aaa')
            .attr('stroke-width', 2);

        let node = svgD3.selectAll('.node')
            .data(graph.nodes)
            .enter().append('g')
            .attr('class', 'node')
            .call(d3.drag()
                .on('start', dragStart)
                .on('drag', dragged)
                .on('end', dragEnd))
            .on('click', handleClick);

        node.append('circle')
            .attr('r', 10)
            .attr('fill', (d) => d.color);

        node.append('text')
            .attr('dy', -15)
            .attr('text-anchor', 'middle')
            .text((d) => d.id);

        const modeSelector = document.getElementById('mode');
        let selectedMode = 'drag';

        modeSelector.addEventListener('change', (e) => {
            selectedMode = e.target.value;
        });

        function ticked() {
            link
                .attr('x1', (d) => d.source.x)
                .attr('y1', (d) => d.source.y)
                .attr('x2', (d) => d.target.x)
                .attr('y2', (d) => d.target.y);

            node
                .attr('transform', (d) => `translate(${d.x},${d.y})`);
        }

        function dragStart(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            if (selectedMode === 'drag') {
                d.fx = event.x;
                d.fy = event.y;
            }
        }

        function dragEnd(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            if (selectedMode === 'drag') {
                d.fx = null;
                d.fy = null;
            }
        }

        function handleClick(event, d) {
            if (selectedMode === 'add') {
                addNode(d);
            } else if (selectedMode === 'edit') {
                editNode(d);
            } else if (selectedMode === 'delete') {
                deleteNode(d);
            }
        }

        function addNode(sourceNode) {
            const newNodeName = prompt('Enter the name for the new node:');
            if (!newNodeName) return;

            const colorIndex = graph.nodes.length % colors.length;
            const newNode = { id: newNodeName, color: colors[colorIndex] };

            graph.nodes.push(newNode);
            graph.links.push({ source: sourceNode.id, target: newNode.id });

            // Clean up the new link’s source/target references and restart.
            resolveLinks(graph);
            restart();
        }

        function editNode(node) {
            const newName = prompt('Enter the new text for this node:', node.id);
            if (!newName) return;
            node.id = newName;
            restart();
        }

        function deleteNode(node) {
            graph.nodes = graph.nodes.filter((n) => n.id !== node.id);
            graph.links = graph.links.filter((l) => l.source.id !== node.id && l.target.id !== node.id);
            restart();
        }

        function restart() {
            // Update links
            link = svgD3.selectAll('.link').data(graph.links);
            link.exit().remove();
            link = link.enter().append('line')
                .attr('class', 'link')
                .attr('stroke', '#aaa')
                .attr('stroke-width', 2)
                .merge(link);

            // Update nodes
            node = svgD3.selectAll('.node').data(graph.nodes);
            node.exit().remove();

            const nodeEnter = node.enter().append('g')
                .attr('class', 'node')
                .call(d3.drag()
                    .on('start', dragStart)
                    .on('drag', dragged)
                    .on('end', dragEnd))
                .on('click', handleClick);

            nodeEnter.append('circle')
                .attr('r', 10)
                .attr('fill', (d) => d.color);

            nodeEnter.append('text')
                .attr('dy', -15)
                .attr('text-anchor', 'middle');

            node = nodeEnter.merge(node);
            node.select('text').text((d) => d.id);

            simulation.nodes(graph.nodes);
            simulation.force('link').links(graph.links);
            simulation.alpha(1).restart();
        }

        // ----- Local Storage Functionality -----
        const storageKey = 'mindmaps';

        function updateSavedDropdown() {
            const savedMindmaps = JSON.parse(localStorage.getItem(storageKey)) || {};
            // Clear current options
            savedDropdown.innerHTML = '';
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '-- Select Mindmap --';
            savedDropdown.appendChild(defaultOption);

            Object.keys(savedMindmaps).forEach((name) => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                savedDropdown.appendChild(option);
            });
        }

        // When saving, create a clean copy so that each link stores just string IDs.
        saveButton.addEventListener('click', () => {
            const mindmapName = prompt('Enter a name to save this mindmap:');
            if (!mindmapName) return;

            const savedMindmaps = JSON.parse(localStorage.getItem(storageKey)) || {};
            const cleanGraph = {
                nodes: graph.nodes.map(n => ({ id: n.id, color: n.color })),
                links: graph.links.map(l => ({
                    source: (l.source && l.source.id) ? l.source.id : l.source,
                    target: (l.target && l.target.id) ? l.target.id : l.target
                }))
            };
            savedMindmaps[mindmapName] = cleanGraph;
            localStorage.setItem(storageKey, JSON.stringify(savedMindmaps));
            alert('Mindmap saved!');
            updateSavedDropdown();
        });

        loadButton.addEventListener('click', () => {
            const selectedName = savedDropdown.value;
            if (!selectedName) {
                alert('Please select a saved mindmap to load.');
                return;
            }
            const savedMindmaps = JSON.parse(localStorage.getItem(storageKey)) || {};
            if (!savedMindmaps[selectedName]) {
                alert('Mindmap not found.');
                return;
            }
            // Stop simulation and clear the current mindmap from the screen.
            simulation.stop();
            svgD3.selectAll('.node').remove();
            svgD3.selectAll('.link').remove();

            // Load and deep-copy the saved graph.
            graph = JSON.parse(JSON.stringify(savedMindmaps[selectedName]));
            // Resolve links so that source/target become node objects.
            resolveLinks(graph);

            simulation.nodes(graph.nodes);
            simulation.force('link').links(graph.links);
            restart();
            alert('Mindmap loaded!');
        });

        deleteButton.addEventListener('click', () => {
            const selectedName = savedDropdown.value;
            if (!selectedName) {
                alert('Please select a saved mindmap to delete.');
                return;
            }
            const savedMindmaps = JSON.parse(localStorage.getItem(storageKey)) || {};
            if (!savedMindmaps[selectedName]) {
                alert('Mindmap not found.');
                return;
            }
            delete savedMindmaps[selectedName];
            localStorage.setItem(storageKey, JSON.stringify(savedMindmaps));
            alert('Mindmap deleted!');
            updateSavedDropdown();
        });
        // ----- End Local Storage Functionality -----

        // Initial render and update of saved mindmap dropdown
        restart();
        updateSavedDropdown();
    });
})();
