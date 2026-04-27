// GraphNode.jsx
// Visualizes a directed acyclic graph (DAG) of CS course prerequisites
// Features: displays courses as nodes connected by arrows, allows marking courses as completed

(() => {
    const { useState, useEffect } = React;

    // ── GraphNode Component ─────────────────────────────────────────────────────────
    // Renders a single course node in the prerequisite graph
    // Props:
    //   - node: course data object with id, px (x-position), py (y-position), and layer info
    // Features: Click to mark course as taken, displays checkmark when completed
    const GraphNode = ({ node }) => {
        const [isTaken, setIsTaken] = useState(false);

        // Position node using absolute positioning and render with optional checkmark
        return (
            <div
                className={`graph-node ${isTaken ? "taken" : ""}`}
                style={{
                    left: `${node.px}px`,
                    top: `${node.py}px`,
                }}
                onClick={() => setIsTaken(!isTaken)}
            >
                {/* Show checkmark when course is marked as completed */}
                {isTaken && <span className="checkmark">✓</span>}
                {node.id}
            </div>
        );
    };

    // CourseGraph Component
    // Main component that loads graph data and orchestrates visualization
    const CourseGraph = () => {
        // State to hold the graph data (nodes and edges) from JSON
        const [graphData, setGraphData] = useState(null);

        // Load the CS course graph JSON file containing all courses and prerequisites
        useEffect(() => {
            fetch("./cs_course_graph.json")
                .then((res) => {
                    if (!res.ok) throw new Error("Network response was not ok");
                    return res.json();
                })
                .then((data) => setGraphData(data))
                .catch((err) => {
                    console.error(
                        "Could not fetch ./cs_course_graph.json.",
                        err,
                    );
                });
        }, []);

        // Show loading state while graph data is being fetched
        if (!graphData) {
            return <div className="graph-wrapper">Loading Course Graph...</div>;
        }

        // Extract nodes and edges (links) from the graph data
        const { nodes, links } = graphData;

        // Group nodes by their prerequisite depth (layer) for hierarchical positioning
        // Layer 0 = foundational courses, higher layers = more advanced courses
        const nodesByLayer = {};
        nodes.forEach((n) => {
            if (!nodesByLayer[n.layer]) nodesByLayer[n.layer] = [];
            nodesByLayer[n.layer].push(n);
        });

        // Calculate canvas dimensions based on the densest layer and number of layers
        const maxNodesInLayer = Math.max(
            ...Object.values(nodesByLayer).map((arr) => arr.length),
        );
        const numLayers = Object.keys(nodesByLayer).length;

        // Positioning constants (in pixels)
        const NODE_SPACING_X = 100; // Horizontal spacing between nodes in same layer
        const LAYER_SPACING_Y = 120; // Vertical spacing between layers
        const PADDING = 65; // Margin around the entire graph

        // Calculate canvas size to fit all nodes
        const canvasWidth = Math.max(
            1000,
            maxNodesInLayer * NODE_SPACING_X + PADDING * 2,
        );
        const canvasHeight = Math.max(
            600,
            numLayers * LAYER_SPACING_Y + PADDING * 2,
        );

        // Calculate positions for each node
        const positionedNodes = [];
        Object.keys(nodesByLayer).forEach((layerStr) => {
            const layer = parseInt(layerStr);
            const layerNodes = nodesByLayer[layer];

            // Sort nodes left-to-right by their x-coordinate
            layerNodes.sort((a, b) => a.x - b.x);

            const numNodes = layerNodes.length;

            // Calculate starting x-position to center layer on canvas
            const rowWidth = numNodes * NODE_SPACING_X;
            const startX = canvasWidth / 2 - rowWidth / 2 + NODE_SPACING_X / 2;

            // Assign pixel positions to each node
            layerNodes.forEach((node, index) => {
                positionedNodes.push({
                    ...node,
                    px: startX + index * NODE_SPACING_X,
                    py: PADDING + layer * LAYER_SPACING_Y,
                });
            });
        });

        // Maps course ID to its positioned node (for drawing edges)
        const nodeLookup = positionedNodes.reduce((acc, node) => {
            acc[node.id] = node;
            return acc;
        }, {});

        return (
            <div className="graph-wrapper">
                <h1 className="graph-header">CS Prerequisites</h1>
                <div className="graph-canvas-container">
                    {/* Canvas Container */}
                    <div
                        style={{
                            position: "relative",
                            width: `${canvasWidth}px`,
                            height: `${canvasHeight}px`,
                            margin: "0 auto",
                        }}
                    >
                        <svg
                            className="graph-svg-layer"
                            style={{ width: "100%", height: "100%" }}
                        >
                            {/* Arrow marker definition for edge endpoints */}
                            <defs>
                                <marker
                                    id="arrowhead"
                                    markerWidth="10"
                                    markerHeight="7"
                                    refX="9"
                                    refY="3.5"
                                    orient="auto"
                                >
                                    <polygon
                                        points="0 0, 10 3.5, 0 7"
                                        fill="#94a3b8"
                                    />
                                </marker>
                            </defs>

                            {/* Draw all prerequisite links as lines with arrow heads */}
                            {links.map((link, i) => {
                                const sourceNode = nodeLookup[link.source];
                                const targetNode = nodeLookup[link.target];

                                if (!sourceNode || !targetNode) return null;

                                // Draw line from prerequisite course to dependent course
                                return (
                                    <line
                                        key={i}
                                        x1={sourceNode.px}
                                        y1={sourceNode.py}
                                        x2={targetNode.px}
                                        y2={targetNode.py}
                                        stroke="#cbd5e1"
                                        strokeWidth="2"
                                        markerEnd="url(#arrowhead)"
                                    />
                                );
                            })}
                        </svg>

                        {/* Course nodes layer (rendered on top of edges) */}
                        {positionedNodes.map((node) => (
                            <GraphNode key={node.id} node={node} />
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    // Export component to global window scope for use in HTML
    window.CourseGraph = CourseGraph;
})();
