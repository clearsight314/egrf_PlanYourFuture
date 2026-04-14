const { useState, useEffect } = React;

// ── Helper: parse pick-count from a node's details constraints ────────────────
const getPickCount = (details) => {
    if (!details) return null;
    for (const d of details) {
        const c = (d.Constraint || "").trim();
        const m = c.match(/^Fulfill any (\d+) of the following/);
        if (m) return parseInt(m[1], 10);
        if (/^Fulfill any of the following/.test(c)) return 1;
    }
    return null;
};

// ── Helper: parse required credit count from a node's details constraints ─────
const getCreditCount = (details) => {
    if (!details) return null;
    let best = null;
    for (const d of details) {
        const c = (d.Constraint || "").trim();
        // "At least X.0 units in total" (summary line — prefer this)
        let m = c.match(/at least ([\d.]+) units in total/i);
        if (m) return parseFloat(m[1]);
        // "Take at least X.0 units that match..."
        m = c.match(/take at least ([\d.]+) units/i);
        if (m && (best === null || parseFloat(m[1]) > best)) best = parseFloat(m[1]);
    }
    return best;
};

// ── Shared panel shell ────────────────────────────────────────────────────────
const PanelShell = ({ accentColor, badge, title, subtitle, onClose, children }) => (
    <div style={{
        position: "fixed", top: 0, right: 0, width: "340px", height: "100vh",
        background: "#fff", boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
        zIndex: 1000, display: "flex", flexDirection: "column", overflow: "hidden",
        fontFamily: "system-ui, sans-serif",
    }}>
        <div style={{
            padding: "16px 20px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc",
            display: "flex", alignItems: "flex-start", gap: "12px",
        }}>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: accentColor, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
                    {badge}
                </div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", lineHeight: 1.3 }}>
                    {title}
                </div>
                {subtitle && (
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>{subtitle}</div>
                )}
            </div>
            <button onClick={onClose} style={{
                background: "none", border: "none", fontSize: "20px", cursor: "pointer",
                color: "#94a3b8", lineHeight: 1, padding: "2px 4px", borderRadius: "4px",
            }} title="Close">×</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>{children}</div>
    </div>
);

const TableBtn = ({ active, disabled, onActive, onInactive, activeLabel, inactiveLabel, activeColor }) => (
    <button
        onClick={active ? onActive : onInactive}
        disabled={disabled && !active}
        style={{
            background: active ? `${activeColor}22` : disabled ? "#f1f5f9" : activeColor,
            color: active ? activeColor : disabled ? "#94a3b8" : "white",
            border: active ? `1px solid ${activeColor}66` : "none",
            borderRadius: "4px", padding: "4px 10px", fontSize: "11px", fontWeight: 600,
            cursor: active || !disabled ? "pointer" : "default", whiteSpace: "nowrap",
        }}
    >
        {active ? activeLabel : inactiveLabel}
    </button>
);

// ── Elective side panel (from elective_classes.json) ─────────────────────────
const ElectivePanel = ({ electiveReq, courses, addedCourses, pickCount, creditCount, onAddCourse, onRemoveCourse, onClose }) => {
    if (!electiveReq) return null;
    const isRange = (c) => c.startsWith("[range]");
    const specific = courses.filter(c => !isRange(c));
    const atMax = pickCount != null && addedCourses.length >= pickCount;
    const creditLabel = creditCount != null
        ? `${creditCount % 1 === 0 ? creditCount : creditCount} credits required`
        : null;
    const subtitle = [
        pickCount != null
            ? `Pick ${pickCount} — ${addedCourses.length}/${pickCount} selected`
            : `${specific.length} courses${courses.some(isRange) ? " + ranges" : ""}`,
        creditLabel,
    ].filter(Boolean).join("  ·  ");

    return (
        <PanelShell accentColor="#7c3aed" badge="Elective Options" title={electiveReq.name} subtitle={subtitle} onClose={onClose}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ background: "#f1f5f9", position: "sticky", top: 0, zIndex: 1 }}>
                        <th style={{ textAlign: "left", padding: "8px 16px", fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Course</th>
                        <th style={{ width: "90px", padding: "8px 16px" }}></th>
                    </tr>
                </thead>
                <tbody>
                    {courses.map((course, i) => {
                        const range = isRange(course);
                        const added = addedCourses.includes(course);
                        return (
                            <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: added ? "#f5f3ff" : range ? "#fafafa" : "white" }}>
                                <td style={{ padding: "8px 16px", fontSize: range ? "11px" : "13px", color: range ? "#94a3b8" : "#1e293b", fontStyle: range ? "italic" : "normal", fontWeight: range ? 400 : 500, wordBreak: "break-word" }}>
                                    {range ? course.replace("[range] ", "") : course}
                                </td>
                                <td style={{ padding: "8px 16px", textAlign: "center" }}>
                                    {!range && (
                                        <TableBtn
                                            active={added}
                                            disabled={atMax}
                                            onActive={() => onRemoveCourse(course)}
                                            onInactive={() => onAddCourse(course)}
                                            activeLabel="Remove"
                                            inactiveLabel="Add"
                                            activeColor="#7c3aed"
                                        />
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </PanelShell>
    );
};

// ── Choice panel (Fulfill any N of tree children) ─────────────────────────────
const ChoicePanel = ({ choiceReq, pickedIds, onToggle, onClose }) => {
    if (!choiceReq) return null;
    const { name, pickCount, children } = choiceReq;
    const atMax = pickedIds.length >= pickCount;
    const subtitle = `Pick ${pickCount === 1 ? "1" : `${pickCount}`} of ${children.length} — ${pickedIds.length}/${pickCount} selected`;

    return (
        <PanelShell accentColor="#d97706" badge={pickCount === 1 ? "Choose One" : `Choose ${pickCount}`} title={name} subtitle={subtitle} onClose={onClose}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ background: "#f1f5f9", position: "sticky", top: 0, zIndex: 1 }}>
                        <th style={{ textAlign: "left", padding: "8px 16px", fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Option</th>
                        <th style={{ width: "90px", padding: "8px 16px" }}></th>
                    </tr>
                </thead>
                <tbody>
                    {children.map((child) => {
                        const childId = child["Requirement ID"];
                        const picked = pickedIds.includes(childId);
                        return (
                            <tr key={childId} style={{ borderBottom: "1px solid #f1f5f9", background: picked ? "#fffbeb" : "white" }}>
                                <td style={{ padding: "8px 16px", fontSize: "13px", color: "#1e293b", fontWeight: 500, wordBreak: "break-word" }}>
                                    {child["Requirement Name"]}
                                </td>
                                <td style={{ padding: "8px 16px", textAlign: "center" }}>
                                    <TableBtn
                                        active={picked}
                                        disabled={atMax}
                                        onActive={() => onToggle(childId)}
                                        onInactive={() => onToggle(childId)}
                                        activeLabel="Remove"
                                        inactiveLabel="Select"
                                        activeColor="#d97706"
                                    />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </PanelShell>
    );
};

// ── Requirement tree node ────────────────────────────────────────────────────
const RequirementNode = ({
    node,
    isRoot = false,
    color = "#1e293b",
    electiveData,
    programName,
    addedElectives,
    pickedChoices,
    onElectiveClick,
    onChoiceClick,
}) => {
    const reqName = node["Requirement Name"] || node["Requirement ID"] || "Unnamed Requirement";
    const nodeId = node["Requirement ID"];
    const details = node.details || [];

    // ── Elective detection (elective_classes.json) ──────────────────────────
    const electiveKey = `${programName} - ${reqName}`;
    const isElective = !!(electiveData && electiveData[electiveKey]);

    // ── Filter out "Additional X Credit (If Needed)" noise nodes ───────────
    const isAdditionalCredit = (n) =>
        /additional \d+ credit.*if needed/i.test(n["Requirement Name"] || "");

    // ── Choice detection ("Fulfill any N of" with tree children) ───────────
    const rawChildren = (node.children || []).filter(c => !isAdditionalCredit(c));
    const pickCount = !isElective ? getPickCount(details) : null;
    const isChoice = !isElective && pickCount != null && rawChildren.length > 0;

    // Sort children by the first number in their name (lowest first)
    const sortedChildren = [...rawChildren].sort((a, b) => {
        const num = (n) => {
            const m = (n["Requirement Name"] || "").match(/(\d+)/);
            return m ? parseInt(m[1], 10) : 9999;
        };
        return num(a) - num(b);
    });

    // ── Determine children to render ────────────────────────────────────────
    let displayChildren;
    if (isElective) {
        // Show only user-added elective courses
        const addedCourses = (addedElectives && addedElectives[nodeId]) || [];
        displayChildren = addedCourses.map((course) => ({
            "Requirement ID": `elective-${nodeId}-${course}`,
            "Requirement Name": course,
            children: [], details: [],
            _isAddedElective: true,
        }));
    } else if (isChoice) {
        const chosen = (pickedChoices && pickedChoices[nodeId]) || [];
        // Default: show the lowest-numbered pickCount children.
        // After user picks: show only their chosen ones.
        displayChildren = chosen.length > 0
            ? rawChildren.filter(c => chosen.includes(c["Requirement ID"]))
            : sortedChildren.slice(0, pickCount);
    } else {
        displayChildren = rawChildren;
    }

    const handleClick = () => {
        if (isElective) {
            onElectiveClick({ id: nodeId, name: reqName, key: electiveKey });
        } else if (isChoice) {
            // Pass all options (sorted) to the panel so user can pick from the full list
            onChoiceClick({ id: nodeId, name: reqName, pickCount, children: sortedChildren });
        }
    };

    const isClickable = isElective || isChoice;
    const nodeClass = [
        "node-box",
        isElective ? "elective-node" : "",
        isChoice ? "choice-node" : "",
        node._isAddedElective ? "added-elective-node" : "",
    ].filter(Boolean).join(" ");

    const nodeColor = node._isAddedElective ? "#7c3aed" : color;

    return (
        <li>
            <div
                className={nodeClass}
                style={{ borderColor: nodeColor, cursor: isClickable ? "pointer" : "default" }}
                onClick={handleClick}
                title={isElective ? `Click to pick ${reqName} electives` : isChoice ? `Click to choose ${reqName}` : undefined}
            >
                {!isRoot && <div className="arrow-down"></div>}
                {reqName}
                {isElective && (
                    <span style={{ display: "block", fontSize: "6px", color: "#7c3aed", marginTop: "1px" }}>▼ elective</span>
                )}
                {isChoice && (
                    <span style={{ display: "block", fontSize: "6px", color: "#d97706", marginTop: "1px" }}>
                        {pickCount === 1 ? "▼ pick 1" : `▼ pick ${pickCount}`}
                    </span>
                )}
            </div>

            {displayChildren.length > 0 && (
                <ul>
                    {displayChildren.map((childNode) => (
                        <RequirementNode
                            key={childNode["Requirement ID"]}
                            node={childNode}
                            color={childNode._isAddedElective ? "#7c3aed" : color}
                            electiveData={electiveData}
                            programName={programName}
                            addedElectives={addedElectives}
                            pickedChoices={pickedChoices}
                            onElectiveClick={onElectiveClick}
                            onChoiceClick={onChoiceClick}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
};

// ── Main UI ──────────────────────────────────────────────────────────────────
const DegreeAuditUI = () => {
    const [allAuditData, setAllAuditData] = useState(null);
    const [electiveData, setElectiveData] = useState(null);
    const [selectedMajorName, setSelectedMajorName] = useState("");
    const [showDistinguished, setShowDistinguished] = useState(false);
    // Elective panel state
    const [selectedElective, setSelectedElective] = useState(null);
    const [addedElectives, setAddedElectives] = useState({});
    // Choice panel state
    const [selectedChoice, setSelectedChoice] = useState(null); // { id, name, pickCount, children }
    const [pickedChoices, setPickedChoices] = useState({});     // { [nodeId]: childId[] }

    useEffect(() => {
        fetch("./all_majors_audit.json")
            .then((res) => res.json())
            .then((data) => setAllAuditData(data))
            .catch((err) => console.error("Error loading JSON:", err));

        fetch("./elective_classes.json")
            .then((res) => res.json())
            .then((data) => setElectiveData(data))
            .catch((err) => console.error("Error loading elective data:", err));

        const sel = document.getElementById("sel-major");
        if (sel) {
            const handler = () => {
                setSelectedMajorName(sel.value);
                setSelectedElective(null);
                setAddedElectives({});
                setSelectedChoice(null);
                setPickedChoices({});
            };
            sel.addEventListener("change", handler);
            return () => sel.removeEventListener("change", handler);
        }
    }, []);

    // ── Elective handlers ────────────────────────────────────────────────────
    const handleElectiveClick = (elective) => {
        setSelectedChoice(null);
        setSelectedElective((prev) => prev && prev.id === elective.id ? null : elective);
    };

    const handleAddCourse = (course) => {
        if (!selectedElective) return;
        setAddedElectives((prev) => {
            const existing = prev[selectedElective.id] || [];
            if (existing.includes(course)) return prev;
            return { ...prev, [selectedElective.id]: [...existing, course] };
        });
    };

    const handleRemoveCourse = (course) => {
        if (!selectedElective) return;
        setAddedElectives((prev) => {
            const existing = prev[selectedElective.id] || [];
            return { ...prev, [selectedElective.id]: existing.filter((c) => c !== course) };
        });
    };

    // ── Choice handlers ──────────────────────────────────────────────────────
    const handleChoiceClick = (choice) => {
        setSelectedElective(null);
        setSelectedChoice((prev) => prev && prev.id === choice.id ? null : choice);
    };

    const handleChoiceToggle = (childId) => {
        if (!selectedChoice) return;
        const { id: parentId, pickCount } = selectedChoice;
        setPickedChoices((prev) => {
            const existing = prev[parentId] || [];
            if (existing.includes(childId)) {
                return { ...prev, [parentId]: existing.filter((x) => x !== childId) };
            }
            // For pick-1, replace; for pick-N, append up to limit
            if (pickCount === 1) {
                return { ...prev, [parentId]: [childId] };
            }
            if (existing.length >= pickCount) return prev;
            return { ...prev, [parentId]: [...existing, childId] };
        });
    };

    const handleClosePanel = () => {
        setSelectedElective(null);
        setSelectedChoice(null);
    };

    if (!allAuditData) {
        return <div style={{ padding: "20px", color: "#64748b" }}>Loading audit data...</div>;
    }

    if (!selectedMajorName) {
        return <div style={{ padding: "20px", color: "#64748b" }}>Select a major to view its requirements.</div>;
    }

    const programEntry = Object.values(allAuditData).find(
        (p) => p.program_name === selectedMajorName,
    );

    if (!programEntry) {
        return <div style={{ padding: "20px", color: "#64748b" }}>No audit data found for {selectedMajorName}.</div>;
    }

    const tree = programEntry.tree;
    const rootNode = tree[0];
    const topLevelCategories = rootNode?.children || [];

    const isDistinguished = (node) =>
        /distinguished/i.test(node["Requirement Name"] || "");

    const isGeneralReq = (node) => {
        const name = node["Requirement Name"] || "";
        return name.includes("Universal Curriculum") || name.includes("General Education");
    };

    const visibleCategories = showDistinguished
        ? topLevelCategories
        : topLevelCategories.filter((n) => !isDistinguished(n));

    const generalReqs = visibleCategories.filter(isGeneralReq);
    const majorReqs = visibleCategories.filter((n) => !isGeneralReq(n));
    const hasDistinguished = topLevelCategories.some(isDistinguished);

    const getGeneralLabel = () => {
        if (generalReqs.some((n) => (n["Requirement Name"] || "").includes("Engineering Universal"))) return "General Engineering Requirements";
        if (generalReqs.some((n) => (n["Requirement Name"] || "").includes("Architecture Universal"))) return "General Architecture Requirements";
        return "General Education Requirements";
    };

    // Elective panel data
    const selectedCourses = selectedElective && electiveData ? (electiveData[selectedElective.key] || []) : [];
    const addedForSelected = selectedElective ? (addedElectives[selectedElective.id] || []) : [];
    // pickCount + creditCount for elective node: look it up in tree if available
    const findNode = (nodes, id) => {
        for (const n of nodes) {
            if (n["Requirement ID"] === id) return n;
            const found = findNode(n.children || [], id);
            if (found) return found;
        }
        return null;
    };
    const electiveNode = selectedElective ? findNode(tree, selectedElective.id) : null;
    const electivePickCount = electiveNode ? getPickCount(electiveNode.details || []) : null;
    const electiveCreditCount = electiveNode ? getCreditCount(electiveNode.details || []) : null;

    // Choice panel data
    const pickedForChoice = selectedChoice ? (pickedChoices[selectedChoice.id] || []) : [];

    const panelOpen = !!(selectedElective || selectedChoice);

    const sharedProps = {
        electiveData,
        programName: programEntry.program_name,
        addedElectives,
        pickedChoices,
        onElectiveClick: handleElectiveClick,
        onChoiceClick: handleChoiceClick,
    };

    return (
        <>
            <div style={{
                fontFamily: "system-ui, sans-serif",
                padding: "40px",
                maxWidth: "100%",
                boxSizing: "border-box",
                marginRight: panelOpen ? "340px" : "0",
                transition: "margin-right 0.2s ease",
            }}>
                <h1 style={{
                    fontSize: "28px", fontWeight: "bold", color: "#0f172a",
                    marginBottom: "40px", borderBottom: "2px solid #cbd5e1", paddingBottom: "16px",
                }}>
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
                                        <RequirementNode key={node["Requirement ID"]} node={node} isRoot={true} color="#1e3a8a" {...sharedProps} />
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </>
                )}

                {majorReqs.length > 0 && (
                    <>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: generalReqs.length > 0 ? "60px" : "0", marginBottom: "16px" }}>
                            <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#ea580c" }}>
                                {programEntry.program_name} Pathways
                            </h2>
                            {hasDistinguished && (
                                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#64748b", cursor: "pointer", userSelect: "none" }}>
                                    <input
                                        type="checkbox"
                                        checked={showDistinguished}
                                        onChange={(e) => setShowDistinguished(e.target.checked)}
                                        style={{ cursor: "pointer" }}
                                    />
                                    Show Distinguished Major
                                </label>
                            )}
                        </div>
                        <div className="flow-tree-container">
                            <div className="flow-tree">
                                <ul>
                                    {majorReqs.map((node) => (
                                        <RequirementNode key={node["Requirement ID"]} node={node} isRoot={true} color="#ea580c" {...sharedProps} />
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {selectedElective && (
                <ElectivePanel
                    electiveReq={selectedElective}
                    courses={selectedCourses}
                    addedCourses={addedForSelected}
                    pickCount={electivePickCount}
                    creditCount={electiveCreditCount}
                    onAddCourse={handleAddCourse}
                    onRemoveCourse={handleRemoveCourse}
                    onClose={handleClosePanel}
                />
            )}

            {selectedChoice && (
                <ChoicePanel
                    choiceReq={selectedChoice}
                    pickedIds={pickedForChoice}
                    onToggle={handleChoiceToggle}
                    onClose={handleClosePanel}
                />
            )}
        </>
    );
};

window.DegreeAuditUI = DegreeAuditUI;
