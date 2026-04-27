// CSDegreeAudit.jsx
// Simple degree audit UI for displaying CS requirements as an expandable tree structure
// Features: Click to expand/collapse requirements, click leaf nodes to mark as completed

(() => {
    const { useState, useEffect } = React;

    // RequirementNode Component
    // Recursively renders a single requirement node in the tree structure
    // Props:
    //   - node: requirement data object with Requirement Name/ID and optional children
    //   - isRoot: whether this is the top-level root node (expanded by default)
    //   - color: border/text color for styling (cascades to children)
    // State:
    //   - isExpanded: whether child requirements are visible
    //   - isTaken: whether this leaf requirement has been marked as completed
    const RequirementNode = ({ node, isRoot = false, color = "#1e293b" }) => {
        // Determine if this node has children (group requirement) or is a leaf (single course)
        const hasChildren = node.children && node.children.length > 0;
        const [isExpanded, setIsExpanded] = useState(isRoot);
        const [isTaken, setIsTaken] = useState(false);
        // Extract requirement name, falling back to ID if name not available
        const reqName =
            node["Requirement Name"] ||
            node["Requirement ID"] ||
            "Unnamed Requirement";

        return (
            <li>
                <div
                    className="node-box"
                    style={{
                        borderColor: isTaken ? "#16a34a" : color,
                        cursor: "pointer",
                        backgroundColor: isTaken
                            ? "#dcfce7"
                            : hasChildren && !isExpanded
                              ? "#f8fafc"
                              : "#ffffff",
                        color: isTaken ? "#14532d" : "inherit",
                        borderBottomWidth:
                            hasChildren && !isExpanded ? "4px" : "1px",
                    }}
                    onClick={() => {
                        // Click groups to expand/collapse, leaf nodes to toggle completion
                        if (hasChildren) {
                            setIsExpanded(!isExpanded);
                        } else {
                            setIsTaken(!isTaken);
                        }
                    }}
                >
                    {/* Show arrow connecting to parent (unless this is root) */}
                    {!isRoot && <div className="arrow-down"></div>}
                    <div>
                        {/* Display checkmark (✓) when requirement marked as taken */}
                        {isTaken && (
                            <span
                                style={{
                                    marginRight: "4px",
                                    fontWeight: "bold",
                                }}
                            >
                                ✓
                            </span>
                        )}
                        {reqName}
                    </div>

                    {/* Show expand/collapse indicator for group nodes only */}
                    {hasChildren && (
                        <div
                            style={{
                                fontSize: "9px",
                                marginTop: "4px",
                                color: color,
                                fontWeight: "bold",
                            }}
                        >
                            {isExpanded ? "▲ Collapse" : "▼ Expand"}
                        </div>
                    )}
                </div>
                {/* Children Nodes 
                Recursively render child requirements when this node is expanded */}
                {isExpanded && hasChildren && (
                    <ul>
                        {node.children.map((childNode) => (
                            <RequirementNode
                                key={childNode["Requirement ID"]}
                                node={childNode}
                                color={color}
                            />
                        ))}
                    </ul>
                )}
            </li>
        );
    };

    // DegreeAuditUI Component
    // Main component that loads the audit JSON and renders the requirement tree
    // Separates requirements into:
    //   - Engineering Universal Curriculum Requirements (general education)
    //   - CS Major Pathways (computer science specific courses)
    const DegreeAuditUI = () => {
        // Load audit data from JSON file on component mount
        const [auditData, setAuditData] = useState([]);

        useEffect(() => {
            // Fetch the cleaned audit data from the JSON file
            fetch("./json_files/uva_cs_audit_cleaned.json")
                .then((res) => res.json())
                .then((data) => setAuditData(data))
                .catch((err) => console.error("Error loading JSON:", err));
        }, []);

        // Show loading state while data is being fetched
        if (auditData.length === 0) {
            return (
                <div style={{ padding: "20px", color: "#64748b" }}>
                    Loading UVA Audit Data...
                </div>
            );
        }

        // Extract the root requirement node and its children categories
        const rootNode = auditData[0];
        const topLevelCategories = rootNode.children || [];

        // Separate engineering general education requirements from CS-specific requirements
        const engineeringReqs = topLevelCategories.find(
            (node) =>
                node["Requirement Name"] ===
                "Engineering Universal Curriculum Requirements",
        );

        // CS requirements are all non-engineering requirement categories
        const csReqs = topLevelCategories.filter(
            (node) =>
                node["Requirement Name"] !==
                "Engineering Universal Curriculum Requirements",
        );

        // Render the main UI with two main sections
        return (
            <div
                style={{
                    fontFamily: "system-ui, sans-serif",
                    padding: "40px",
                    maxWidth: "100%",
                    boxSizing: "border-box",
                }}
            >
                <h1
                    style={{
                        fontSize: "28px",
                        fontWeight: "bold",
                        color: "#0f172a",
                        marginBottom: "40px",
                        borderBottom: "2px solid #cbd5e1",
                        paddingBottom: "16px",
                    }}
                >
                    Computer Science (B.S.) Prerequisite Map
                </h1>

                {/* Section 1: Engineering General Education Requirements */}
                <h2
                    style={{
                        fontSize: "20px",
                        fontWeight: "bold",
                        color: "#1e3a8a",
                        marginBottom: "16px",
                    }}
                >
                    General Engineering Pathways
                </h2>
                <div className="flow-tree-container">
                    <div className="flow-tree">
                        <ul>
                            {/* Render engineering requirements tree if available */}
                            {engineeringReqs ? (
                                <RequirementNode
                                    key={engineeringReqs["Requirement ID"]}
                                    node={engineeringReqs}
                                    isRoot={true}
                                    color="#1e3a8a"
                                />
                            ) : (
                                <p>No engineering requirements found.</p>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Section 2: CS Major Pathway Requirements */}
                <h2
                    style={{
                        fontSize: "20px",
                        fontWeight: "bold",
                        color: "#ea580c",
                        marginTop: "60px",
                        marginBottom: "16px",
                    }}
                >
                    CS Major Pathways
                </h2>
                <div className="flow-tree-container">
                    <div className="flow-tree">
                        <ul>
                            {/* Parent node for all CS requirements */}
                            <li>
                                <div
                                    className="node-box"
                                    style={{ borderColor: "#ea580c" }}
                                >
                                    CS Core Curriculum
                                </div>
                                {/* Render all CS requirement categories as children */}
                                <ul>
                                    {csReqs.map((node) => (
                                        <RequirementNode
                                            key={node["Requirement ID"]}
                                            node={node}
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

    // Export component to global window scope for use in HTML
    window.DegreeAuditUI = DegreeAuditUI;
})();
