const { useState, useEffect } = React;

const RequirementNode = ({ node, isRoot = false, color = "#1e293b" }) => {
    const hasChildren = node.children && node.children.length > 0;
    const reqName =
        node["Requirement Name"] ||
        node["Requirement ID"] ||
        "Unnamed Requirement";

    return (
        <li>
            <div className="node-box" style={{ borderColor: color }}>
                {!isRoot && <div className="arrow-down"></div>}
                {reqName}
            </div>

            {hasChildren && (
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
    const [allAuditData, setAllAuditData] = useState(null);
    const [selectedMajorName, setSelectedMajorName] = useState("");

    useEffect(() => {
        fetch("./all_majors_audit.json")
            .then((res) => res.json())
            .then((data) => setAllAuditData(data))
            .catch((err) => console.error("Error loading JSON:", err));

        const sel = document.getElementById("sel-major");
        if (sel) {
            const handler = () => setSelectedMajorName(sel.value);
            sel.addEventListener("change", handler);
            return () => sel.removeEventListener("change", handler);
        }
    }, []);

    if (!allAuditData) {
        return (
            <div style={{ padding: "20px", color: "#64748b" }}>
                Loading audit data...
            </div>
        );
    }

    if (!selectedMajorName) {
        return (
            <div style={{ padding: "20px", color: "#64748b" }}>
                Select a major to view its requirements.
            </div>
        );
    }

    const programEntry = Object.values(allAuditData).find(
        (p) => p.program_name === selectedMajorName,
    );

    if (!programEntry) {
        return (
            <div style={{ padding: "20px", color: "#64748b" }}>
                No audit data found for {selectedMajorName}.
            </div>
        );
    }

    const tree = programEntry.tree;
    const rootNode = tree[0];
    const topLevelCategories = rootNode?.children || [];

    const isGeneralReq = (node) => {
        const name = node["Requirement Name"] || "";
        return name.includes("Universal Curriculum") || name.includes("General Education");
    };

    const generalReqs = topLevelCategories.filter(isGeneralReq);
    const majorReqs = topLevelCategories.filter((n) => !isGeneralReq(n));

    const getGeneralLabel = () => {
        if (generalReqs.some((n) => (n["Requirement Name"] || "").includes("Engineering Universal"))) {
            return "General Engineering Requirements";
        }
        if (generalReqs.some((n) => (n["Requirement Name"] || "").includes("Architecture Universal"))) {
            return "General Architecture Requirements";
        }
        return "General Education Requirements";
    };

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
                {programEntry.program_name} Requirements
            </h1>

            {generalReqs.length > 0 && (
                <>
                    <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#1e3a8a", marginBottom: "16px" }}>
                        {getGeneralLabel()}
                    </h2>
                    <div className="flow-tree-container">
                        <div className="flow-tree">
                            <ul>
                                {generalReqs.map((node) => (
                                    <RequirementNode
                                        key={node["Requirement ID"]}
                                        node={node}
                                        isRoot={true}
                                        color="#1e3a8a"
                                    />
                                ))}
                            </ul>
                        </div>
                    </div>
                </>
            )}

            {majorReqs.length > 0 && (
                <>
                    <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#ea580c", marginTop: generalReqs.length > 0 ? "60px" : "0", marginBottom: "16px" }}>
                        {programEntry.program_name} Pathways
                    </h2>
                    <div className="flow-tree-container">
                        <div className="flow-tree">
                            <ul>
                                {majorReqs.map((node) => (
                                    <RequirementNode
                                        key={node["Requirement ID"]}
                                        node={node}
                                        isRoot={true}
                                        color="#ea580c"
                                    />
                                ))}
                            </ul>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

window.DegreeAuditUI = DegreeAuditUI;
