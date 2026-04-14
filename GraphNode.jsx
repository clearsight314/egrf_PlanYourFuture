const { useState, useEffect } = React;

const GraphNode = ({ node }) => {
    const [isTaken, setIsTaken] = useState(false);

    return (
        <div
            className={`graph-node ${isTaken ? "taken" : ""}`}
            style={{
                left: `${node.px}px`,
                top: `${node.py}px`,
            }}
            onClick={() => setIsTaken(!isTaken)}
        >
            {isTaken && <span className="checkmark">✓</span>}
            {node.id}
        </div>
    );
};

const CourseGraph = () => {
    const [graphData, setGraphData] = useState(null);

    useEffect(() => {
        fetch("./cs_course_graph.json")
            .then((res) => {
                if (!res.ok) throw new Error("Network response was not ok");
                return res.json();
            })
            .then((data) => setGraphData(data))
            .catch((err) => {
                console.error("Could not fetch ./cs_course_graph.json.", err);
            });
    }, []);

    if (!graphData) {
        return <div className="graph-wrapper">Loading Course Graph...</div>;
    }

    const { nodes, links } = graphData;

    const nodesByLayer = {};
    nodes.forEach((n) => {
        if (!nodesByLayer[n.layer]) nodesByLayer[n.layer] = [];
        nodesByLayer[n.layer].push(n);
    });

    const maxNodesInLayer = Math.max(
        ...Object.values(nodesByLayer).map((arr) => arr.length),
    );
    const numLayers = Object.keys(nodesByLayer).length;

    const NODE_SPACING_X = 100;
    const LAYER_SPACING_Y = 120;
    const PADDING = 65;

    const canvasWidth = Math.max(
        1000,
        maxNodesInLayer * NODE_SPACING_X + PADDING * 2,
    );
    const canvasHeight = Math.max(
        600,
        numLayers * LAYER_SPACING_Y + PADDING * 2,
    );

    const positionedNodes = [];
    Object.keys(nodesByLayer).forEach((layerStr) => {
        const layer = parseInt(layerStr);
        const layerNodes = nodesByLayer[layer];

        layerNodes.sort((a, b) => a.x - b.x);

        const numNodes = layerNodes.length;

        const rowWidth = numNodes * NODE_SPACING_X;
        const startX = canvasWidth / 2 - rowWidth / 2 + NODE_SPACING_X / 2;

        layerNodes.forEach((node, index) => {
            positionedNodes.push({
                ...node,
                px: startX + index * NODE_SPACING_X,
                py: PADDING + layer * LAYER_SPACING_Y,
            });
        });
    });

    const nodeLookup = positionedNodes.reduce((acc, node) => {
        acc[node.id] = node;
        return acc;
    }, {});

    return (
        <div className="graph-wrapper">
            <h1 className="graph-header">CS Prerequisites</h1>
            <div className="graph-canvas-container">
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

                        {links.map((link, i) => {
                            const sourceNode = nodeLookup[link.source];
                            const targetNode = nodeLookup[link.target];

                            if (!sourceNode || !targetNode) return null;

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

                    {positionedNodes.map((node) => (
                        <GraphNode key={node.id} node={node} />
                    ))}
                </div>
            </div>
        </div>
    );
};

window.CourseGraph = CourseGraph;
