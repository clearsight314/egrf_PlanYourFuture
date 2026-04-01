const { useState, useEffect } = React;

const RequirementNode = ({ node }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasChildren = node.children && node.children.length > 0;
    const reqName = node["Requirement Name"] || "Unnamed Requirement";

    return (
        <div>
            <div onClick={() => hasChildren && setIsExpanded(!isExpanded)}>
                {hasChildren && <span>{isExpanded ? "▼" : "▶"}</span>}
                {!hasChildren && <span></span>}

                <span>{reqName}</span>
            </div>

            {isExpanded && hasChildren && (
                <div>
                    {node.children.map((childNode) => (
                        <RequirementNode
                            key={childNode["Requirement ID"]}
                            node={childNode}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const DegreeAuditUI = () => {
    const [auditData, setAuditData] = useState([]);

    useEffect(() => {
        console.log("Degree audit component good");
        fetch("./uva_cs_audit.json")
            .then((res) => res.json())
            .then((data) => setAuditData(data))
            .catch((err) => console.error("Error loading JSON:", err));
    }, []);

    if (auditData.length === 0) return <div>Loading UVA Audit Data...</div>;

    return (
        <div>
            <h2>Computer Science (B.S.) Audit</h2>
            {auditData.map((rootNode) => (
                <RequirementNode
                    key={rootNode["Requirement ID"]}
                    node={rootNode}
                />
            ))}
        </div>
    );
};

window.DegreeAuditUI = DegreeAuditUI;
