(() => {
    const { useState, useEffect } = React;

    const GraphNode = ({ node, isTaken, isDisabled, isGrayedOut, onClick }) => {
        let bg = "#ffffff";
        let border = "#ea580c";
        let color = "#1e293b";

        if (isTaken) {
            if (isGrayedOut) {
                bg = "#f1f5f9";
                border = "#94a3b8";
                color = "#475569";
            } else {
                bg = "#dcfce7";
                border = "#16a34a";
                color = "#14532d";
            }
        } else if (isGrayedOut || isDisabled) {
            bg = "#f8fafc";
            border = "#cbd5e1";
            color = "#94a3b8";
        }

        return (
            <div
                className="graph-node"
                style={{
                    left: `${node.px}px`,
                    top: `${node.py}px`,
                    backgroundColor: bg,
                    borderColor: border,
                    color: color,
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    opacity: (isDisabled || isGrayedOut) && !isTaken ? 0.5 : 1,
                    transition: "all 0.3s ease",
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isDisabled) {
                        onClick(node.id);
                    }
                }}
            >
                {isTaken && (
                    <span className="checkmark" style={{ marginRight: "4px" }}>
                        ✓
                    </span>
                )}
                {node.id}
            </div>
        );
    };

    const SubGraph = ({ graphData, allowedCourseIds, reqType, anyCount }) => {
        const [takenNodes, setTakenNodes] = useState(new Set());

        if (!graphData || !graphData.nodes) return null;

        let filteredNodes = graphData.nodes.filter((n) =>
            allowedCourseIds.includes(n.id),
        );

        if (filteredNodes.length === 0) {
            return (
                <div
                    style={{
                        padding: "20px",
                        color: "#ef4444",
                        fontSize: "12px",
                        marginTop: "10px",
                        borderTop: "1px dashed #cbd5e1",
                    }}
                >
                    No CS courses from this requirement were found in the Graph
                    Data.
                </div>
            );
        }

        const minLayer = Math.min(...filteredNodes.map((n) => n.layer));
        const normalizedNodes = filteredNodes.map((n) => ({
            ...n,
            layer: n.layer - minLayer,
        }));

        const filteredLinks = graphData.links.filter(
            (l) =>
                normalizedNodes.some((n) => n.id === l.source) &&
                normalizedNodes.some((n) => n.id === l.target),
        );

        const nodesByLayer = {};
        normalizedNodes.forEach((n) => {
            if (!nodesByLayer[n.layer]) nodesByLayer[n.layer] = [];
            nodesByLayer[n.layer].push(n);
        });

        const maxNodesInLayer = Math.max(
            ...Object.values(nodesByLayer).map((arr) => arr.length),
        );
        const numLayers = Object.keys(nodesByLayer).length;

        const NODE_SPACING_X = 90;
        const LAYER_SPACING_Y = 100;
        const PADDING = 40;

        const canvasWidth = Math.max(
            300,
            maxNodesInLayer * NODE_SPACING_X + PADDING * 2,
        );
        const canvasHeight = Math.max(
            150,
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

        const handleNodeClick = (nodeId) => {
            const newTaken = new Set(takenNodes);
            if (newTaken.has(nodeId)) {
                newTaken.delete(nodeId);
            } else {
                newTaken.add(nodeId);
            }
            setTakenNodes(newTaken);
        };

        return (
            <div
                style={{
                    marginTop: "16px",
                    marginBottom: "8px",
                    borderTop: "2px dashed #cbd5e1",
                    paddingTop: "16px",
                }}
            >
                <div
                    style={{
                        fontSize: "12px",
                        color: "#64748b",
                        marginBottom: "8px",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                    }}
                >
                    Course Map (
                    {reqType === "ANY"
                        ? `Fulfill Any ${anyCount}`
                        : "Fulfill All"}
                    )
                </div>
                <div
                    className="graph-canvas-container"
                    style={{
                        position: "relative",
                        width: `${canvasWidth}px`,
                        height: `${canvasHeight}px`,
                        margin: "0 auto",
                        backgroundColor: "#f8fafc",
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

                        {filteredLinks.map((link, i) => {
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

                    {positionedNodes.map((node) => {
                        const isTaken = takenNodes.has(node.id);
                        let isDisabled = false;
                        let isGrayedOut = false;

                        if (reqType === "ANY") {
                            if (takenNodes.size >= anyCount && !isTaken) {
                                isDisabled = true;
                                isGrayedOut = true;
                            }
                        } else {
                            // "ALL" Requirement
                            if (takenNodes.size === positionedNodes.length) {
                                isGrayedOut = true;
                            }
                        }

                        return (
                            <GraphNode
                                key={node.id}
                                node={node}
                                isTaken={isTaken}
                                isDisabled={isDisabled}
                                isGrayedOut={isGrayedOut}
                                onClick={handleNodeClick}
                            />
                        );
                    })}
                </div>
            </div>
        );
    };

    const RequirementNode = ({
        node,
        graphData,
        isRoot = false,
        color = "#1e293b",
    }) => {
        const [isExpanded, setIsExpanded] = useState(isRoot);
        const [showGraph, setShowGraph] = useState(false);

        const hasChildren = node.children && node.children.length > 0;
        const reqName =
            node["Requirement Name"] ||
            node["Requirement ID"] ||
            "Unnamed Requirement";

        const details = node.details || [];
        const constraintText = details[0]?.Constraint || "";

        let reqType = "ALL";
        let anyCount = 1;

        if (constraintText.includes("Fulfill any")) {
            reqType = "ANY";
            const match = constraintText.match(/Fulfill any (\d+)/);
            if (match) {
                anyCount = parseInt(match[1], 10);
            }
        }

        const extractAllCourses = () => {
            const courses = new Set();
            const courseRegex = /[A-Z]{2,4}\s\d{4}/g;

            const traverse = (n) => {
                const rawString = JSON.stringify(n);
                const matches = rawString.match(courseRegex) || [];
                matches.forEach((c) => courses.add(c));

                if (n.children) {
                    n.children.forEach(traverse);
                }
            };

            traverse(node);
            return [...courses];
        };

        const nodeCourses = extractAllCourses();
        const hasCourses = nodeCourses.length > 1;

        return (
            <li>
                <div
                    className="node-box"
                    style={{
                        borderColor: color,
                        backgroundColor:
                            hasChildren && !isExpanded ? "#f8fafc" : "#ffffff",
                        borderBottomWidth:
                            hasChildren && !isExpanded ? "4px" : "1px",
                        maxWidth: showGraph ? "100%" : "240px",
                        width: showGraph ? "fit-content" : "auto",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                    }}
                >
                    {!isRoot && <div className="arrow-down"></div>}

                    <div
                        style={{
                            cursor: "pointer",
                            width: "100%",
                            padding: "4px",
                        }}
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <div style={{ fontWeight: "bold" }}>{reqName}</div>

                        {hasChildren && (
                            <div
                                style={{
                                    fontSize: "9px",
                                    marginTop: "4px",
                                    color: color,
                                    fontWeight: "bold",
                                }}
                            >
                                {isExpanded
                                    ? "▲ Hide Courses"
                                    : "▼ View Courses"}
                            </div>
                        )}
                    </div>

                    {hasCourses && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowGraph(!showGraph);
                            }}
                            style={{
                                marginTop: "8px",
                                padding: "6px 12px",
                                fontSize: "11px",
                                backgroundColor: showGraph ? color : "#f1f5f9",
                                color: showGraph ? "white" : color,
                                border: `1px solid ${color}`,
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontWeight: "bold",
                                transition: "all 0.2s",
                            }}
                        >
                            {showGraph ? "Collapse Tree ✖" : "Expand Tree "}
                        </button>
                    )}

                    {showGraph && (
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: "100%", cursor: "default" }}
                        >
                            <SubGraph
                                graphData={graphData}
                                allowedCourseIds={nodeCourses}
                                reqType={reqType}
                                anyCount={anyCount}
                            />
                        </div>
                    )}
                </div>

                {isExpanded && hasChildren && (
                    <ul>
                        {node.children.map((childNode) => (
                            <RequirementNode
                                key={childNode["Requirement ID"]}
                                node={childNode}
                                graphData={graphData}
                                color={color}
                            />
                        ))}
                    </ul>
                )}
            </li>
        );
    };

    const FullRequirementTree = () => {
        const [auditData, setAuditData] = useState([]);
        const [graphData, setGraphData] = useState(null);

        useEffect(() => {
            fetch("./json_files/uva_cs_audit_cleaned.json")
                .then((res) => res.json())
                .then((data) => setAuditData(data))
                .catch((err) =>
                    console.error("Error loading Audit JSON:", err),
                );

            fetch("./json_files/cs_course_graph.json")
                .then((res) => res.json())
                .then((data) => setGraphData(data))
                .catch((err) =>
                    console.error("Error loading Graph JSON:", err),
                );
        }, []);

        if (auditData.length === 0 || !graphData) {
            return (
                <div style={{ padding: "40px" }}>
                    Loading Full Requirement Tree...
                </div>
            );
        }

        const rootNode = auditData[0];
        const topLevelCategories = rootNode.children || [];
        const csReqs = topLevelCategories.filter(
            (node) =>
                node["Requirement Name"] !==
                "Engineering Universal Curriculum Requirements",
        );

        return (
            <div
                style={{
                    fontFamily: "system-ui, sans-serif",
                    padding: "40px",
                    backgroundColor: "#f0f2f5",
                }}
            >
                <h1
                    style={{
                        fontSize: "28px",
                        fontWeight: "bold",
                        color: "#0f172a",
                        marginBottom: "40px",
                    }}
                >
                    BSCS Degree Prerequisites
                </h1>

                <div
                    className="flow-tree-container"
                    style={{ backgroundColor: "#ffffff" }}
                >
                    <div className="flow-tree">
                        <ul>
                            <li>
                                <div
                                    className="node-box"
                                    style={{ borderColor: "#ea580c" }}
                                >
                                    Computer Science
                                </div>
                                <ul>
                                    {csReqs.map((node) => (
                                        <RequirementNode
                                            key={node["Requirement ID"]}
                                            node={node}
                                            graphData={graphData}
                                            color="#ea580c"
                                        />
                                    ))}
                                </ul>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    };

    window.FullRequirementTree = FullRequirementTree;
})();
