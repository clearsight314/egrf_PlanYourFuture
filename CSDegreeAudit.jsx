const { useState, useEffect } = React;

const RequirementNode = ({ node, isRoot = false, color = "#1e293b" }) => {
    const hasChildren = node.children && node.children.length > 0;
    const [isExpanded, setIsExpanded] = useState(isRoot);
    const [isTaken, setIsTaken] = useState(false);
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
                    if (hasChildren) {
                        setIsExpanded(!isExpanded);
                    } else {
                        setIsTaken(!isTaken);
                    }
                }}
            >
                {!isRoot && <div className="arrow-down"></div>}
                <div>
                    {isTaken && (
                        <span
                            style={{ marginRight: "4px", fontWeight: "bold" }}
                        >
                            ✓
                        </span>
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
                        {isExpanded ? "▲ Collapse" : "▼ Expand"}
                    </div>
                )}
            </div>
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

const DegreeAuditUI = () => {
    const [auditData, setAuditData] = useState([]);

    useEffect(() => {
        fetch("./uva_cs_audit_cleaned.json")
            .then((res) => res.json())
            .then((data) => setAuditData(data))
            .catch((err) => console.error("Error loading JSON:", err));
    }, []);

    if (auditData.length === 0) {
        return (
            <div style={{ padding: "20px", color: "#64748b" }}>
                Loading UVA Audit Data...
            </div>
        );
    }

    const rootNode = auditData[0];
    const topLevelCategories = rootNode.children || [];

    const engineeringReqs = topLevelCategories.find(
        (node) =>
            node["Requirement Name"] ===
            "Engineering Universal Curriculum Requirements",
    );

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

            {/* --- ENGINEERING TREE --- */}
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

            {/* --- COMPUTER SCIENCE TREE --- */}
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
                        <li>
                            <div
                                className="node-box"
                                style={{ borderColor: "#ea580c" }}
                            >
                                CS Core Curriculum
                            </div>
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

window.DegreeAuditUI = DegreeAuditUI;