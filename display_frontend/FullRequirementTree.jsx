// FullRequirementTree.jsx
// Complete CS degree audit visualization with requirement tree and interactive prerequisite graphs
// Features: expandable requirement hierarchy, clickable courses, prerequisite graph visualization with constraints

(() => {
    const { useState, useEffect } = React;

    // GraphNode Component
    // Renders a single course node in the prerequisite graph with dynamic styling based on completion status
    const GraphNode = ({ node, isTaken, isDisabled, isGrayedOut, onClick }) => {
        // Determine node styling based on state
        let bg = "#ffffff";
        let border = "#ea580c";
        let color = "#1e293b";

        if (isTaken) {
            // Course is marked as completed
            if (isGrayedOut) {
                // Completed but the requirement is already satisfied by other courses
                bg = "#f1f5f9";
                border = "#94a3b8";
                color = "#475569";
            } else {
                // Completed and contributes to current requirement
                bg = "#dcfce7"; // Light green
                border = "#16a34a"; // Green border
                color = "#14532d";
            }
        } else if (isGrayedOut || isDisabled) {
            // Course cannot be taken yet (disabled) or requirement already satisfied (grayed out)
            bg = "#f8fafc";
            border = "#cbd5e1";
            color = "#94a3b8";
        }

        // Render the course node with absolute positioning
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
                    // Reduce opacity for disabled/grayed courses to visually de-emphasize them
                    opacity: (isDisabled || isGrayedOut) && !isTaken ? 0.5 : 1,
                    transition: "all 0.3s ease",
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    // Only allow toggling if not disabled
                    if (!isDisabled) {
                        onClick(node.id);
                    }
                }}
            >
                {/* Display checkmark when course is marked as completed */}
                {isTaken && (
                    <span className="checkmark" style={{ marginRight: "4px" }}>
                        ✓
                    </span>
                )}
                {node.id}
            </div>
        );
    };

    // SubGraph Component
    // Renders a filtered prerequisite graph for a specific requirement (subset of full course graph)
    const SubGraph = ({
        graphData,
        allowedCourseIds,
        reqType,
        anyCount,
        globalTakenCourses,
        toggleCourse,
        inheritedDisabled,
        inheritedGrayedOut,
    }) => {
        // Exit early if graph data is missing
        if (!graphData || !graphData.nodes) return null;

        // Filter nodes to only those relevant to this requirement
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

        // Normalize layer numbers so minimum layer starts at 0
        // This ensures the graph displays correctly even if filtered courses don't start at layer 0
        const minLayer = Math.min(...filteredNodes.map((n) => n.layer));
        const normalizedNodes = filteredNodes.map((n) => ({
            ...n,
            layer: n.layer - minLayer, // Adjust layer to start from 0
        }));

        // Filter edges to only those between included courses
        // Only show prerequisite connections within the filtered course set
        const filteredLinks = graphData.links.filter(
            (l) =>
                normalizedNodes.some((n) => n.id === l.source) &&
                normalizedNodes.some((n) => n.id === l.target),
        );

        // Organize nodes by their layer (depth in prerequisite hierarchy)
        const nodesByLayer = {};
        normalizedNodes.forEach((n) => {
            if (!nodesByLayer[n.layer]) nodesByLayer[n.layer] = [];
            nodesByLayer[n.layer].push(n);
        });

        // Calculate canvas dimensions
        // Find the widest layer and number of layers to size the SVG appropriately
        const maxNodesInLayer = Math.max(
            ...Object.values(nodesByLayer).map((arr) => arr.length),
        );
        const numLayers = Object.keys(nodesByLayer).length;

        // Positioning constants (pixels)
        const NODE_SPACING_X = 90; // Horizontal distance between nodes in same layer
        const LAYER_SPACING_Y = 100; // Vertical distance between layers
        const PADDING = 40; // Margin around the entire graph

        // Calculate canvas size to fit all nodes
        const canvasWidth = Math.max(
            300,
            maxNodesInLayer * NODE_SPACING_X + PADDING * 2,
        );
        const canvasHeight = Math.max(
            150,
            numLayers * LAYER_SPACING_Y + PADDING * 2,
        );

        // Calculate pixel positions for each node
        // Position nodes by layer, centering each layer horizontally
        const positionedNodes = [];
        Object.keys(nodesByLayer).forEach((layerStr) => {
            const layer = parseInt(layerStr);
            const layerNodes = nodesByLayer[layer];

            // Sort nodes left-to-right for consistent positioning
            layerNodes.sort((a, b) => a.x - b.x);

            const numNodes = layerNodes.length;
            // Calculate starting x position to center the layer
            const rowWidth = numNodes * NODE_SPACING_X;
            const startX = canvasWidth / 2 - rowWidth / 2 + NODE_SPACING_X / 2;

            // Assign pixel coordinates to each node in the layer
            layerNodes.forEach((node, index) => {
                positionedNodes.push({
                    ...node,
                    px: startX + index * NODE_SPACING_X, // X position in pixels
                    py: PADDING + layer * LAYER_SPACING_Y, // Y position in pixels
                });
            });
        });

        // Create lookup map for quick node access by ID
        // Used when rendering edges to find target/source positions
        const nodeLookup = positionedNodes.reduce((acc, node) => {
            acc[node.id] = node;
            return acc;
        }, {});

        const takenInGraphCount = positionedNodes.filter((n) =>
            globalTakenCourses.has(n.id),
        ).length;

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
                    {
                        reqType === "ANY"
                            ? `Fulfill Any ${anyCount}` // Show constraint for "choose N" requirements
                            : "Fulfill All" // All courses required
                    }
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
                        {/* Define arrowhead marker for edge endpoints */}
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

                        {/* Render prerequisite edges as directed lines with arrowheads */}
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

                    {/* Course nodes layer (rendered on top of edges)  */}
                    {positionedNodes.map((node) => {
                        // Determine course state (taken, disabled, grayed out)
                        const isTaken = globalTakenCourses.has(node.id);
                        let isDisabled = false;
                        let isGrayedOut = false;

                        //  Constraint logic for "ANY" requirements (choose N of M)
                        if (reqType === "ANY") {
                            // Disable courses once we have enough taken to satisfy the "any" constraint
                            if (
                                (inheritedDisabled ||
                                    takenInGraphCount >= anyCount) &&
                                !isTaken
                            ) {
                                isDisabled = true;
                                isGrayedOut = true;
                            }
                        } else {
                            //  Constraint logic for "ALL" requirements (all courses required)
                            // Gray out courses only if all courses are already taken
                            if (
                                inheritedGrayedOut ||
                                (takenInGraphCount === positionedNodes.length &&
                                    positionedNodes.length > 0)
                            ) {
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
                                onClick={toggleCourse}
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
        depth = 1,
        globalTakenCourses,
        toggleCourse,
        inheritedDisabled = false,
        inheritedGrayedOut = false,
    }) => {
        // Component state
        const [isExpanded, setIsExpanded] = useState(isRoot); // Whether children are visible
        const [showGraph, setShowGraph] = useState(false); // Whether to display prerequisite graph

        // Extract requirement metadata
        const hasChildren = node.children && node.children.length > 0;
        const reqName =
            node["Requirement Name"] ||
            node["Requirement ID"] ||
            "Unnamed Requirement";

        // Parse constraint from details (e.g., "Fulfill any 3 of the following")
        const details = node.details || [];
        const constraintText = details[0]?.Constraint || "";

        // Parse whether this is an "ALL" (all courses required) or "ANY" (N of M) requirement
        let reqType = "ALL";
        let anyCount = 1;

        if (constraintText.includes("Fulfill any")) {
            reqType = "ANY";
            // Extract the count from "Fulfill any 3 of the following" format
            const match = constraintText.match(/Fulfill any (\d+)/);
            if (match) {
                anyCount = parseInt(match[1], 10);
            }
        }

        const extractAllCourses = () => {
            const courses = new Set();
            const courseRegex = /[A-Z]{2,4}\s\d{4}/g; // Match course codes like "CS 3140"

            // Recursively traverse requirement tree to collect all course codes
            const traverse = (n) => {
                const rawString = JSON.stringify(n);
                const matches = rawString.match(courseRegex) || [];
                matches.forEach((c) => courses.add(c));

                // Continue traversing children
                if (n.children) {
                    n.children.forEach(traverse);
                }
            };

            traverse(node);
            return [...courses];
        };

        // Get all courses belonging to this requirement
        const nodeCourses = extractAllCourses();
        // Show graph button only for top-level requirements with multiple courses
        const allowGraph = nodeCourses.length > 1 && depth === 1;

        // A "class node" is a leaf node representing a single course
        const isClassNode = !hasChildren && nodeCourses.length === 1;
        const courseId = isClassNode ? nodeCourses[0] : null;
        const isTaken = isClassNode ? globalTakenCourses.has(courseId) : false;

        // Only leaf nodes with exactly one course are clickable and can be toggled
        const extractClickableTreeCourses = () => {
            const clickable = new Set();
            const courseRegex = /[A-Z]{2,4}\s\d{4}/g; // Match course codes like "CS 3140"

            // Recursively traverse tree, collecting only leaf-node courses
            const traverse = (n) => {
                const hasChild = n.children && n.children.length > 0;
                const rawString = JSON.stringify(n);
                const matches = rawString.match(courseRegex) || [];
                const uniqueMatches = [...new Set(matches)];

                // Add course if this is a leaf node (no children) with exactly one course
                if (!hasChild && uniqueMatches.length === 1) {
                    clickable.add(uniqueMatches[0]);
                } else if (hasChild) {
                    // Recurse into child nodes for more courses
                    n.children.forEach(traverse);
                }
            };

            traverse(node);
            return [...clickable];
        };

        const treeClickables = extractClickableTreeCourses();
        // Find courses that exist in both the requirement tree and the prerequisite graph
        const graphClickables =
            graphData && graphData.nodes
                ? nodeCourses.filter((c) =>
                      graphData.nodes.some((n) => n.id === c),
                  )
                : [];

        // Merge tree and graph clickables to get all actionable courses
        // Duplicates are removed using Set
        const actionableCourses = [
            ...new Set([...treeClickables, ...graphClickables]),
        ];

        // Count how many actionable courses have been marked as taken
        const takenActionableCount = actionableCourses.filter((c) =>
            globalTakenCourses.has(c),
        ).length;

        // "ANY" satisfied when taken count >= required count
        // "ALL" satisfied when all actionable courses are taken
        let isSatisfiedAny = false;
        let isSatisfiedAll = false;

        if (reqType === "ANY") {
            // For "choose N" requirements, check if we have enough taken courses
            isSatisfiedAny = takenActionableCount >= anyCount;
        } else {
            // For "all required" requirements, check if all courses are taken
            isSatisfiedAll =
                takenActionableCount === actionableCourses.length &&
                actionableCourses.length > 0;
        }

        // If this requirement is satisfied, disable/gray out children accordingly
        const passDownDisabled = inheritedDisabled || isSatisfiedAny;
        const passDownGrayedOut = inheritedGrayedOut || isSatisfiedAll;

        // Different colors for containers vs leaf course nodes
        let nodeBg = hasChildren && !isExpanded ? "#f8fafc" : "#ffffff";
        let nodeBorder = color;
        let nodeTextColor = "#1e293b";
        let nodeOpacity = 1;
        let isNodeDisabled = false;

        // Apply styling for class nodes (individual course leaves)
        if (isClassNode) {
            // Disable if inherited disabled and not yet taken
            isNodeDisabled = inheritedDisabled && !isTaken;
            let isNodeGrayedOut = inheritedGrayedOut || isNodeDisabled;

            if (isTaken) {
                // Course is completed
                if (isNodeGrayedOut) {
                    // Completed but not needed (requirement already satisfied)
                    nodeBg = "#f1f5f9";
                    nodeBorder = "#94a3b8";
                    nodeTextColor = "#475569";
                } else {
                    // Completed and contributes to requirement
                    nodeBg = "#dcfce7"; // Light green
                    nodeBorder = "#16a34a"; // Green
                    nodeTextColor = "#14532d";
                }
            } else if (isNodeGrayedOut || isNodeDisabled) {
                // Course disabled or not applicable
                nodeBg = "#f8fafc";
                nodeBorder = "#cbd5e1";
                nodeTextColor = "#94a3b8";
                nodeOpacity = 0.5;
            }
        }

        return (
            <li>
                <div
                    className="node-box"
                    style={{
                        borderColor: isClassNode ? nodeBorder : color,
                        backgroundColor: isClassNode
                            ? nodeBg
                            : hasChildren && !isExpanded
                              ? "#f8fafc"
                              : "#ffffff",
                        color: isClassNode ? nodeTextColor : "#1e293b",
                        opacity: isClassNode ? nodeOpacity : 1,
                        borderBottomWidth:
                            hasChildren && !isExpanded ? "4px" : "1px",
                        maxWidth: showGraph ? "100%" : "240px",
                        width: showGraph ? "fit-content" : "auto",
                        cursor: isClassNode
                            ? isNodeDisabled
                                ? "not-allowed"
                                : "pointer"
                            : "default",

                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                    }}
                    onClick={(e) => {
                        if (isClassNode) {
                            e.stopPropagation();
                            if (!isNodeDisabled) {
                                toggleCourse(courseId);
                            }
                        }
                    }}
                >
                    {!isRoot && <div className="arrow-down"></div>}

                    <div
                        onClick={() => {
                            if (!isClassNode) {
                                setIsExpanded(!isExpanded);
                            }
                        }}
                        style={{ cursor: isClassNode ? "inherit" : "pointer" }}
                    >
                        <div style={{ fontWeight: "bold" }}>
                            {isClassNode && isTaken && (
                                <span style={{ marginRight: "6px" }}>✓</span>
                            )}
                            {reqName}
                        </div>

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

                    {allowGraph && (
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

                    {showGraph && allowGraph && (
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: "100%", cursor: "default" }}
                        >
                            <SubGraph
                                graphData={graphData}
                                allowedCourseIds={nodeCourses}
                                reqType={reqType}
                                anyCount={anyCount}
                                globalTakenCourses={globalTakenCourses}
                                toggleCourse={toggleCourse}
                                inheritedDisabled={passDownDisabled}
                                inheritedGrayedOut={passDownGrayedOut}
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
                                depth={depth + 1}
                                globalTakenCourses={globalTakenCourses}
                                toggleCourse={toggleCourse}
                                inheritedDisabled={passDownDisabled}
                                inheritedGrayedOut={passDownGrayedOut}
                            />
                        ))}
                    </ul>
                )}
            </li>
        );
    };

    // FullRequirementTree Component
    // Top-level component that:
    // - Loads the cleaned audit JSON and the course prerequisite graph JSON
    // - Tracks globally 'taken' courses (clickable state shared across entire tree)
    // - Renders the root requirement and recursively renders `RequirementNode` items
    const FullRequirementTree = () => {
        // Audit JSON (hierarchical requirement tree)
        const [auditData, setAuditData] = useState([]);
        // Course prerequisite graph data used by SubGraph visualizations
        const [graphData, setGraphData] = useState(null);

        // Global set of courses the user has marked as taken.
        // Stored as a Set for O(1) membership checks and easy toggle semantics.
        const [globalTakenCourses, setGlobalTakenCourses] = useState(new Set());

        // Toggle a course's taken state in the global set.
        // This is passed down to leaf course nodes and graph nodes so clicks update shared state.
        const toggleCourse = (courseId) => {
            setGlobalTakenCourses((prev) => {
                const next = new Set(prev);
                if (next.has(courseId)) {
                    next.delete(courseId);
                } else {
                    next.add(courseId);
                }
                return next;
            });
        };

        // Load both JSON files on mount.
        // Errors are logged to console but do not crash the UI.
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

        // Simple loading state while both JSON files arrive
        if (auditData.length === 0 || !graphData) {
            return (
                <div style={{ padding: "40px" }}>
                    Loading Full Requirement Tree...
                </div>
            );
        }

        // The audit JSON root contains top-level categories; we filter out engineering-wide requirements
        const rootNode = auditData[0];
        const topLevelCategories = rootNode.children || [];
        const csReqs = topLevelCategories.filter(
            (node) =>
                node["Requirement Name"] !==
                "Engineering Universal Curriculum Requirements",
        );

        // Render the degree audit tree. The visual layout is a flow-tree with the root "Computer Science".
        // Each top-level requirement is rendered with a `RequirementNode` that handles recursion,
        // local expand/collapse, and optional embedded graphs via `SubGraph`.
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
                                            globalTakenCourses={
                                                globalTakenCourses
                                            }
                                            toggleCourse={toggleCourse}
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
