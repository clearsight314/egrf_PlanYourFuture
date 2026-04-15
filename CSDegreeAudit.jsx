const { useState, useEffect } = React;

// Returns the pick-count from "Fulfill any N of the following" constraints, or null
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

// Returns the highest required credit count found in constraints, or null
const getCreditCount = (details) => {
    if (!details) return null;
    let best = null;
    for (const d of details) {
        const c = (d.Constraint || "").trim();
        const m1 = c.match(/at least ([\d.]+) units in total/i);
        if (m1) return parseFloat(m1[1]);
        const m2 = c.match(/take at least ([\d.]+) units/i);
        if (m2 && (best === null || parseFloat(m2[1]) > best)) best = parseFloat(m2[1]);
    }
    return best;
};

// Fixed right-edge panel shell shared by both side panels
const PanelShell = ({ accentColor, badge, title, subtitle, onClose, children }) => (
    <div style={{ position: "fixed", top: 0, right: 0, width: "340px", height: "100vh", background: "#fff", boxShadow: "-4px 0 24px rgba(0,0,0,0.15)", zIndex: 1000, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: accentColor, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>{badge}</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", lineHeight: 1.3 }}>{title}</div>
                {subtitle && <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>{subtitle}</div>}
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#94a3b8", lineHeight: 1, padding: "2px 4px", borderRadius: "4px" }} title="Close">×</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>{children}</div>
    </div>
);

const TableBtn = ({ active, disabled, onToggle, activeLabel, inactiveLabel, activeColor }) => (
    <button onClick={onToggle} disabled={disabled && !active} style={{
        background: active ? `${activeColor}22` : disabled ? "#f1f5f9" : activeColor,
        color: active ? activeColor : disabled ? "#94a3b8" : "white",
        border: active ? `1px solid ${activeColor}66` : "none",
        borderRadius: "4px", padding: "4px 10px", fontSize: "11px", fontWeight: 600,
        cursor: active || !disabled ? "pointer" : "default", whiteSpace: "nowrap",
    }}>{active ? activeLabel : inactiveLabel}</button>
);

// Generic table panel — rows: [{ id, label, active, disabled, isInfo, bg }]
const SidePanel = ({ accentColor, badge, title, subtitle, colHeader, rows, onToggle, activeLabel, inactiveLabel, onClose }) => (
    <PanelShell accentColor={accentColor} badge={badge} title={title} subtitle={subtitle} onClose={onClose}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
                <tr style={{ background: "#f1f5f9", position: "sticky", top: 0, zIndex: 1 }}>
                    <th style={{ textAlign: "left", padding: "8px 16px", fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>{colHeader}</th>
                    <th style={{ width: "90px", padding: "8px 16px" }} />
                </tr>
            </thead>
            <tbody>
                {rows.map(({ id, label, active, disabled, isInfo, bg }) => (
                    <tr key={id} style={{ borderBottom: "1px solid #f1f5f9", background: bg || "white" }}>
                        <td style={{ padding: "8px 16px", fontSize: isInfo ? "11px" : "13px", color: isInfo ? "#94a3b8" : "#1e293b", fontStyle: isInfo ? "italic" : "normal", fontWeight: isInfo ? 400 : 500, wordBreak: "break-word" }}>{label}</td>
                        <td style={{ padding: "8px 16px", textAlign: "center" }}>
                            {!isInfo && <TableBtn active={active} disabled={disabled} onToggle={() => onToggle(id)} activeLabel={activeLabel} inactiveLabel={inactiveLabel} activeColor={accentColor} />}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </PanelShell>
);

// ── Elective side panel ───────────────────────────────────────────────────────
const ElectivePanel = ({ electiveReq, courses, addedCourses, pickCount, creditCount, onToggleCourse, onClose }) => {
    if (!electiveReq) return null;
    const isRange = c => c.startsWith("[range]");
    const atMax = pickCount != null && addedCourses.length >= pickCount;
    const subtitle = [
        pickCount != null
            ? `Pick ${pickCount} — ${addedCourses.length}/${pickCount} selected`
            : `${courses.filter(c => !isRange(c)).length} courses${courses.some(isRange) ? " + ranges" : ""}`,
        creditCount != null ? `${creditCount} credits required` : null,
    ].filter(Boolean).join("  ·  ");
    const rows = courses.map((c, i) => ({
        id: String(i), label: isRange(c) ? c.replace("[range] ", "") : c,
        active: addedCourses.includes(c), disabled: atMax, isInfo: isRange(c),
        bg: addedCourses.includes(c) ? "#f5f3ff" : isRange(c) ? "#fafafa" : "white",
    }));
    return <SidePanel accentColor="#7c3aed" badge="Elective Options" title={electiveReq.name} subtitle={subtitle} colHeader="Course" rows={rows} onToggle={i => onToggleCourse(courses[+i])} activeLabel="Remove" inactiveLabel="Add" onClose={onClose} />;
};

// ── Choice panel (Fulfill any N of tree children) ─────────────────────────────
const ChoicePanel = ({ choiceReq, pickedIds, onToggle, onClose }) => {
    if (!choiceReq) return null;
    const { name, pickCount, children } = choiceReq;
    const atMax = pickedIds.length >= pickCount;
    const rows = children.map(c => ({
        id: c["Requirement ID"], label: c["Requirement Name"],
        active: pickedIds.includes(c["Requirement ID"]), disabled: atMax,
        bg: pickedIds.includes(c["Requirement ID"]) ? "#fffbeb" : "white",
    }));
    return <SidePanel accentColor="#d97706" badge={pickCount === 1 ? "Choose One" : `Choose ${pickCount}`} title={name} subtitle={`Pick ${pickCount} of ${children.length} — ${pickedIds.length}/${pickCount} selected`} colHeader="Option" rows={rows} onToggle={onToggle} activeLabel="Remove" inactiveLabel="Select" onClose={onClose} />;
};

// ── Requirement tree node ────────────────────────────────────────────────────
const RequirementNode = ({
    node, isRoot = false, color = "#1e293b",
    electiveData, programName, addedElectives, pickedChoices, isRodmanScholar,
    onElectiveClick, onChoiceClick,
}) => {
    const reqName = node["Requirement Name"] || node["Requirement ID"] || "Unnamed Requirement";
    const nodeId = node["Requirement ID"];
    const details = node.details || [];

    const electiveKey = `${programName} - ${reqName}`;
    const isElective = !!(electiveData && electiveData[electiveKey]);

    const rawChildren = (node.children || [])
        .filter(c => !/additional \d+ credit.*if needed/i.test(c["Requirement Name"] || ""))
        .filter(c => isRodmanScholar
            ? !/^Engineering Foundations (I|II)$/i.test(c["Requirement Name"] || "")
            : !/rodman/i.test(c["Requirement Name"] || ""));

    const pickCount = isElective ? null : getPickCount(details);
    const isChoice = !isElective && pickCount != null && rawChildren.length > 0;

    const numOf = n => { const m = (n["Requirement Name"] || "").match(/(\d+)/); return m ? +m[1] : 9999; };
    const sortedChildren = [...rawChildren].sort((a, b) => numOf(a) - numOf(b));

    let displayChildren;
    if (isElective) {
        const addedCourses = (addedElectives && addedElectives[nodeId]) || [];
        displayChildren = addedCourses.map(course => ({
            "Requirement ID": `elective-${nodeId}-${course}`,
            "Requirement Name": course,
            children: [], details: [], _isAddedElective: true,
        }));
    } else if (isChoice) {
        const chosen = (pickedChoices && pickedChoices[nodeId]) || [];
        displayChildren = chosen.length > 0
            ? rawChildren.filter(c => chosen.includes(c["Requirement ID"]))
            : sortedChildren.slice(0, pickCount);
    } else {
        displayChildren = rawChildren;
    }

    const handleClick = () => {
        if (isElective) onElectiveClick({ id: nodeId, name: reqName, key: electiveKey });
        else if (isChoice) onChoiceClick({ id: nodeId, name: reqName, pickCount, children: sortedChildren });
    };

    const isClickable = isElective || isChoice;
    const nodeClass = ["node-box", isElective && "elective-node", isChoice && "choice-node", node._isAddedElective && "added-elective-node"].filter(Boolean).join(" ");
    const nodeColor = node._isAddedElective ? "#7c3aed" : color;

    return (
        <li>
            <div className={nodeClass} style={{ borderColor: nodeColor, cursor: isClickable ? "pointer" : "default" }} onClick={handleClick}
                title={isElective ? `Click to pick ${reqName} electives` : isChoice ? `Click to choose ${reqName}` : undefined}>
                {!isRoot && <div className="arrow-down" />}
                {reqName}
                {isElective && <span style={{ display: "block", fontSize: "6px", color: "#7c3aed", marginTop: "1px" }}>▼ elective</span>}
                {isChoice && <span style={{ display: "block", fontSize: "6px", color: "#d97706", marginTop: "1px" }}>▼ pick {pickCount}</span>}
            </div>
            {displayChildren.length > 0 && (
                <ul>
                    {displayChildren.map(childNode => (
                        <RequirementNode key={childNode["Requirement ID"]} node={childNode}
                            color={childNode._isAddedElective ? "#7c3aed" : color}
                            electiveData={electiveData} programName={programName}
                            addedElectives={addedElectives} pickedChoices={pickedChoices}
                            isRodmanScholar={isRodmanScholar}
                            onElectiveClick={onElectiveClick} onChoiceClick={onChoiceClick} />
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
    const [isRodmanScholar, setIsRodmanScholar] = useState(false);
    const [selectedElective, setSelectedElective] = useState(null);
    const [addedElectives, setAddedElectives] = useState({});
    const [selectedChoice, setSelectedChoice] = useState(null);
    const [pickedChoices, setPickedChoices] = useState({});

    useEffect(() => {
        fetch("./all_majors_audit.json").then(r => r.json()).then(setAllAuditData).catch(console.error);
        fetch("./elective_classes.json").then(r => r.json()).then(setElectiveData).catch(console.error);

        const sel = document.getElementById("sel-major");
        if (sel) {
            const handler = () => {
                setSelectedMajorName(sel.value);
                setSelectedElective(null);
                setAddedElectives({});
                setSelectedChoice(null);
                setPickedChoices({});
                setIsRodmanScholar(false);
            };
            sel.addEventListener("change", handler);
            return () => sel.removeEventListener("change", handler);
        }
    }, []);

    const handleElectiveClick = (elective) => {
        setSelectedChoice(null);
        setSelectedElective(prev => prev?.id === elective.id ? null : elective);
    };

    // Single toggle handler for adding/removing an elective course
    const handleElectiveCourseToggle = (course) => {
        if (!selectedElective) return;
        setAddedElectives(prev => {
            const existing = prev[selectedElective.id] || [];
            return {
                ...prev,
                [selectedElective.id]: existing.includes(course)
                    ? existing.filter(c => c !== course)
                    : [...existing, course],
            };
        });
    };

    const handleChoiceClick = (choice) => {
        setSelectedElective(null);
        setSelectedChoice(prev => prev?.id === choice.id ? null : choice);
    };

    const handleChoiceToggle = (childId) => {
        if (!selectedChoice) return;
        const { id: parentId, pickCount } = selectedChoice;
        setPickedChoices(prev => {
            const existing = prev[parentId] || [];
            if (existing.includes(childId)) return { ...prev, [parentId]: existing.filter(x => x !== childId) };
            if (pickCount === 1) return { ...prev, [parentId]: [childId] };
            if (existing.length >= pickCount) return prev;
            return { ...prev, [parentId]: [...existing, childId] };
        });
    };

    const closePanel = () => { setSelectedElective(null); setSelectedChoice(null); };

    if (!allAuditData) return <div style={{ padding: "20px", color: "#64748b" }}>Loading audit data...</div>;
    if (!selectedMajorName) return <div style={{ padding: "20px", color: "#64748b" }}>Select a major to view its requirements.</div>;

    const programEntry = Object.values(allAuditData).find(p => p.program_name === selectedMajorName);
    if (!programEntry) return <div style={{ padding: "20px", color: "#64748b" }}>No audit data found for {selectedMajorName}.</div>;

    const tree = programEntry.tree;
    const topLevelCategories = tree[0]?.children || [];

    const isDistinguished = n => /distinguished/i.test(n["Requirement Name"] || "");
    const isGeneralReq = n => {
        const name = n["Requirement Name"] || "";
        return name.includes("Universal Curriculum") || name.includes("General Education");
    };

    const visibleCategories = showDistinguished ? topLevelCategories : topLevelCategories.filter(n => !isDistinguished(n));
    const generalReqs = visibleCategories.filter(isGeneralReq);
    const majorReqs = visibleCategories.filter(n => !isGeneralReq(n));
    const hasDistinguished = topLevelCategories.some(isDistinguished);

    const getGeneralLabel = () => {
        const nm = n => n["Requirement Name"] || "";
        if (generalReqs.some(n => nm(n).includes("Engineering Universal"))) return "General Engineering Requirements";
        if (generalReqs.some(n => nm(n).includes("Architecture Universal"))) return "General Architecture Requirements";
        return "General Education Requirements";
    };

    // Recursively find a node by Requirement ID to read its constraints
    const findNode = (nodes, id) => {
        for (const n of nodes) {
            if (n["Requirement ID"] === id) return n;
            const f = findNode(n.children || [], id);
            if (f) return f;
        }
        return null;
    };

    const electiveNode = selectedElective ? findNode(tree, selectedElective.id) : null;
    const selectedCourses = selectedElective ? (electiveData?.[selectedElective.key] || []) : [];
    const addedForSelected = selectedElective ? (addedElectives[selectedElective.id] || []) : [];
    const pickedForChoice = selectedChoice ? (pickedChoices[selectedChoice.id] || []) : [];
    const panelOpen = !!(selectedElective || selectedChoice);
    const isEngineeringGeneral = generalReqs.some(n => (n["Requirement Name"] || "").includes("Engineering Universal"));

    const sharedProps = {
        electiveData, programName: programEntry.program_name,
        addedElectives, pickedChoices, isRodmanScholar,
        onElectiveClick: handleElectiveClick, onChoiceClick: handleChoiceClick,
    };

    const renderTree = (nodes, color) => (
        <div className="flow-tree-container">
            <div className="flow-tree">
                <ul>{nodes.map(n => <RequirementNode key={n["Requirement ID"]} node={n} isRoot color={color} {...sharedProps} />)}</ul>
            </div>
        </div>
    );

    const checkLabel = (checked, onChange, label) => (
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#64748b", cursor: "pointer", userSelect: "none" }}>
            <input type="checkbox" checked={checked} onChange={onChange} style={{ cursor: "pointer" }} />{label}
        </label>
    );

    return (
        <>
            <div style={{ fontFamily: "system-ui, sans-serif", padding: "40px", maxWidth: "100%", boxSizing: "border-box", marginRight: panelOpen ? "340px" : "0", transition: "margin-right 0.2s ease" }}>
                <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#0f172a", marginBottom: "40px", borderBottom: "2px solid #cbd5e1", paddingBottom: "16px" }}>
                    {programEntry.program_name} Requirements
                </h1>

                {generalReqs.length > 0 && (
                    <>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                            <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#1e3a8a", margin: 0 }}>{getGeneralLabel()}</h2>
                            {isEngineeringGeneral && checkLabel(isRodmanScholar, e => setIsRodmanScholar(e.target.checked), "Rodman Scholar")}
                        </div>
                        {renderTree(generalReqs, "#1e3a8a")}
                    </>
                )}

                {majorReqs.length > 0 && (
                    <>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: generalReqs.length > 0 ? "60px" : "0", marginBottom: "16px" }}>
                            <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#ea580c" }}>{programEntry.program_name} Pathways</h2>
                            {hasDistinguished && checkLabel(showDistinguished, e => setShowDistinguished(e.target.checked), "Show Distinguished Major")}
                        </div>
                        {renderTree(majorReqs, "#ea580c")}
                    </>
                )}
            </div>

            {selectedElective && (
                <ElectivePanel
                    electiveReq={selectedElective}
                    courses={selectedCourses}
                    addedCourses={addedForSelected}
                    pickCount={electiveNode ? getPickCount(electiveNode.details || []) : null}
                    creditCount={electiveNode ? getCreditCount(electiveNode.details || []) : null}
                    onToggleCourse={handleElectiveCourseToggle}
                    onClose={closePanel}
                />
            )}

            {selectedChoice && (
                <ChoicePanel choiceReq={selectedChoice} pickedIds={pickedForChoice} onToggle={handleChoiceToggle} onClose={closePanel} />
            )}
        </>
    );
};

window.DegreeAuditUI = DegreeAuditUI;
