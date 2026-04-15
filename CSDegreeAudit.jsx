const { useState, useEffect, useRef, useLayoutEffect, useMemo } = React;

// ── Constraint parsers ────────────────────────────────────────────────────────
// Read a requirement's detail constraints and extract how many items must be
// picked, or how many credits are required, so the UI can enforce limits.

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

// ── Pure helpers ─────────────────────────────────────────────────────────────

// Strip suffix like (BS), (Min), (2mj), etc. to get the base subject name
const getBaseSubject = (name) => name.replace(/\s*\([^)]*\)\s*$/, "").trim();

// Resolve a dropdown display name to an audit entry, handling 2mj/2mn suffix variants
const resolveProgram = (displayName, entries) => {
    if (!displayName || !entries) return null;

    const direct = entries.find(p => p.program_name === displayName);
    if (direct) return direct;

    // 2nd major: (BS-2mj) -> (BS), or trailing (2mj) removed
    const as1st = displayName
        .replace(/\(([A-Z0-9]+)-2mj\)/i, "($1)")
        .replace(/\s*\(2mj\)\s*$/i, "")
        .replace(/\s*\(2mj\s*$/i, "")
        .trim();
    const by1st = entries.find(p => p.program_name === as1st);
    if (by1st) return by1st;

    // Fuzzy: strip suffix parens and match base name
    const baseName = getBaseSubject(displayName);
    if (baseName) {
        const fuzzy = entries.find(p => getBaseSubject(p.program_name) === baseName);
        if (fuzzy) return fuzzy;
    }

    // 2nd minor: (2mn) -> (Min) or (mn)
    for (const suffix of ["(Min)", "(mn)"]) {
        const asMin = displayName.replace(/\s*\(2mn\)\s*$/i, " " + suffix).trim();
        const byMin = entries.find(p => p.program_name === asMin);
        if (byMin) return byMin;
    }

    return null;
};

const collectAllNames = (tree) => {
    const names = new Set();
    const collect = (nodes) => {
        for (const node of nodes) {
            const children = node.children || [];
            if (children.length === 0) {
                // Only leaf nodes represent actual courses
                const name = node["Requirement Name"];
                if (name) names.add(name);
            } else {
                collect(children);
            }
        }
    };
    collect(tree);
    return names;
};

// Returns names appearing in 2+ of the given entries; empty Set if fewer than 2 active
const computeSharedCourses = (entries) => {
    const active = entries.filter(Boolean);
    if (active.length < 2) return new Set();
    const nameSets = active.map(e => collectAllNames(e.tree));
    const shared = new Set();
    nameSets.forEach((set, i) => {
        set.forEach(name => {
            if (nameSets.some((other, j) => j !== i && other.has(name))) shared.add(name);
        });
    });
    return shared;
};

const isGeneralReq = n => {
    const name = n["Requirement Name"] || "";
    return name.includes("Universal Curriculum") || name.includes("General Education");
};

const programHasGeneralReqs = (entry) =>
    entry ? (entry.tree[0]?.children || []).some(isGeneralReq) : false;

// Measures a container ref and sets zoom to fit width; no-op if already fits
const fitZoom = (containerRef, setZoom) => {
    if (!containerRef.current) return;
    const { scrollWidth, clientWidth } = containerRef.current;
    if (scrollWidth > clientWidth) setZoom(+(clientWidth / scrollWidth).toFixed(2));
};

// ── Shared UI components ─────────────────────────────────────────────────────

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

// ── Side-panel components ─────────────────────────────────────────────────────
// ElectivePanel lets the user add/remove specific elective courses for a node.
// ChoicePanel lets the user pick N options from a "choose one/some" requirement.
// Both render inside SidePanel, which is built on the PanelShell chrome.

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

const SectionDivider = ({ label, color, programName, warning }) => (
    <div style={{ marginTop: "60px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: warning ? "10px" : "0" }}>
            <div style={{ flex: 1, height: "2px", background: `${color}33` }} />
            <span style={{ fontSize: "11px", fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>{label}</span>
            <div style={{ flex: 1, height: "2px", background: `${color}33` }} />
        </div>
        <h2 style={{ fontSize: "20px", fontWeight: "bold", color, margin: "8px 0 0" }}>{programName}</h2>
        {warning && (
            <div style={{ marginTop: "10px", padding: "10px 14px", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "8px", fontSize: "13px", color: "#92400e", display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "16px" }}>⚠️</span>
                <span>{warning}</span>
            </div>
        )}
    </div>
);

// ── Requirement tree node ─────────────────────────────────────────────────────
// Recursively renders one node in the degree-requirement tree.
// Handles three node types:
//   • Elective  — click opens ElectivePanel; added courses appear as children
//   • Choice    — click opens ChoicePanel; chosen sub-requirements are shown
//   • Standard  — always-required course or group, rendered as-is
// Nodes shared across multiple programs are highlighted in teal.

const RequirementNode = ({
    node, isRoot = false, color = "#1e293b",
    electiveData, programName, addedElectives, pickedChoices, isRodmanScholar,
    onElectiveClick, onChoiceClick, sharedCourses,
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
    const isShared = !!(sharedCourses && sharedCourses.has(reqName));
    const nodeClass = ["node-box", isElective && "elective-node", isChoice && "choice-node", node._isAddedElective && "added-elective-node", isShared && "shared-node"].filter(Boolean).join(" ");
    const nodeColor = node._isAddedElective ? "#7c3aed" : isShared ? "#0ea5e9" : color;

    return (
        <li>
            <div className={nodeClass} style={{ borderColor: nodeColor, cursor: isClickable ? "pointer" : "default" }} onClick={handleClick}
                title={isElective ? `Click to pick ${reqName} electives` : isChoice ? `Click to choose ${reqName}` : isShared ? "Counts toward multiple programs" : undefined}>
                {!isRoot && <div className="arrow-down" />}
                {reqName}
                {isElective && <span style={{ display: "block", fontSize: "6px", color: "#7c3aed", marginTop: "1px" }}>▼ elective</span>}
                {isChoice && <span style={{ display: "block", fontSize: "6px", color: "#d97706", marginTop: "1px" }}>▼ pick {pickCount}</span>}
                {isShared && !isElective && !isChoice && <span style={{ display: "block", fontSize: "6px", color: "#0ea5e9", marginTop: "1px" }}>↔ shared</span>}
            </div>
            {displayChildren.length > 0 && (
                <ul>
                    {displayChildren.map(childNode => (
                        <RequirementNode key={childNode["Requirement ID"]} node={childNode}
                            color={childNode._isAddedElective ? "#7c3aed" : color}
                            electiveData={electiveData} programName={programName}
                            addedElectives={addedElectives} pickedChoices={pickedChoices}
                            isRodmanScholar={isRodmanScholar}
                            onElectiveClick={onElectiveClick} onChoiceClick={onChoiceClick}
                            sharedCourses={sharedCourses} />
                    ))}
                </ul>
            )}
        </li>
    );
};

// ── Main UI ──────────────────────────────────────────────────────────────────
// Top-level component for the degree audit visualizer.
// Loads audit JSON and elective JSON on mount, then listens for dropdown
// changes (major, 2nd major, minor, 2nd minor) from the host page.
// Computes which requirements are shared across programs and renders each
// program's tree in its own zoomable section.

const DegreeAuditUI = () => {
    // ── State ─────────────────────────────────────────────────────────────────
    // allAuditData: full JSON keyed by program ID
    // electiveData: maps elective node keys to lists of eligible courses
    const [allAuditData, setAllAuditData] = useState(null);
    const [electiveData, setElectiveData] = useState(null);

    const [selectedMajorName,  setSelectedMajorName]  = useState("");
    const [selectedMajor2Name, setSelectedMajor2Name] = useState("");
    const [selectedMinorName,  setSelectedMinorName]  = useState("");
    const [selectedMinor2Name, setSelectedMinor2Name] = useState("");

    // ── UI toggles ────────────────────────────────────────────────────────────
    const [showDistinguished, setShowDistinguished] = useState(false);
    const [isRodmanScholar,   setIsRodmanScholar]   = useState(false);

    // ── Panel open/close state ────────────────────────────────────────────────
    const [selectedElective, setSelectedElective] = useState(null);
    const [selectedChoice,   setSelectedChoice]   = useState(null);

    // ── User selections: electives added and choices made per program slot ────
    const [addedElectivesMap, setAddedElectivesMap] = useState({ major1: {}, major2: {}, minor: {}, minor2: {} });
    const [pickedChoicesMap,  setPickedChoicesMap]  = useState({ major1: {}, major2: {}, minor: {}, minor2: {} });

    // ── Per-section zoom levels ───────────────────────────────────────────────
    const [generalZoom, setGeneralZoom] = useState(1);
    const [majorZoom,   setMajorZoom]   = useState(1);
    const [major2Zoom,  setMajor2Zoom]  = useState(1);
    const [minorZoom,   setMinorZoom]   = useState(1);
    const [minor2Zoom,  setMinor2Zoom]  = useState(1);

    // ── Refs for auto-fit zoom on initial render ───────────────────────────────
    const generalContainerRef = useRef(null);
    const majorContainerRef   = useRef(null);
    const major2ContainerRef  = useRef(null);
    const minorContainerRef   = useRef(null);
    const minor2ContainerRef  = useRef(null);

    // Fit zoom independently for major and minor containers to avoid unnecessary remeasurement
    useLayoutEffect(() => {
        fitZoom(generalContainerRef, setGeneralZoom);
        fitZoom(majorContainerRef,   setMajorZoom);
        fitZoom(major2ContainerRef,  setMajor2Zoom);
    }, [selectedMajorName, selectedMajor2Name]);

    useLayoutEffect(() => {
        fitZoom(minorContainerRef,  setMinorZoom);
        fitZoom(minor2ContainerRef, setMinor2Zoom);
    }, [selectedMinorName, selectedMinor2Name]);

    // ── Data fetch + dropdown listeners ──────────────────────────────────────
    // Fetches audit and elective JSON once on mount.
    // Attaches change listeners to the host page's <select> elements so React
    // state stays in sync when the user picks a program outside this component.
    useEffect(() => {
        fetch("./all_majors_audit.json").then(r => r.json()).then(setAllAuditData).catch(console.error);
        fetch("./elective_classes.json").then(r => r.json()).then(setElectiveData).catch(console.error);

        const addListener = (selectId, handler) => {
            const sel = document.getElementById(selectId);
            if (!sel) return null;
            sel.addEventListener("change", handler);
            return () => sel.removeEventListener("change", handler);
        };

        const cleanups = [
            addListener("sel-major", e => {
                setSelectedMajorName(e.target.value);
                setSelectedElective(null); setSelectedChoice(null);
                setIsRodmanScholar(false); setGeneralZoom(1); setMajorZoom(1);
                setAddedElectivesMap(p => ({ ...p, major1: {} }));
                setPickedChoicesMap(p => ({ ...p, major1: {} }));
            }),
            addListener("sel-major2", e => {
                setSelectedMajor2Name(e.target.value);
                setSelectedElective(null); setSelectedChoice(null);
                setMajor2Zoom(1);
                setAddedElectivesMap(p => ({ ...p, major2: {} }));
                setPickedChoicesMap(p => ({ ...p, major2: {} }));
            }),
            addListener("sel-minor", e => {
                setSelectedMinorName(e.target.value);
                setSelectedElective(null); setSelectedChoice(null);
                setMinorZoom(1);
                setAddedElectivesMap(p => ({ ...p, minor: {} }));
                setPickedChoicesMap(p => ({ ...p, minor: {} }));
            }),
            addListener("sel-minor2", e => {
                setSelectedMinor2Name(e.target.value);
                setSelectedElective(null); setSelectedChoice(null);
                setMinor2Zoom(1);
                setAddedElectivesMap(p => ({ ...p, minor2: {} }));
                setPickedChoicesMap(p => ({ ...p, minor2: {} }));
            }),
        ].filter(Boolean);

        return () => cleanups.forEach(fn => fn());
    }, []);

    // ── Panel interaction handlers ────────────────────────────────────────────
    // Open/close the elective or choice panel; toggling the same node closes it.

    const handleElectiveClick = (elective) => {
        setSelectedChoice(null);
        setSelectedElective(prev =>
            prev?.id === elective.id && prev?.programSlot === elective.programSlot ? null : elective
        );
    };

    const handleElectiveCourseToggle = (course) => {
        if (!selectedElective) return;
        const { id, programSlot } = selectedElective;
        setAddedElectivesMap(prev => {
            const slotMap = prev[programSlot] || {};
            const existing = slotMap[id] || [];
            return {
                ...prev,
                [programSlot]: {
                    ...slotMap,
                    [id]: existing.includes(course) ? existing.filter(c => c !== course) : [...existing, course],
                },
            };
        });
    };

    const handleChoiceClick = (choice) => {
        setSelectedElective(null);
        setSelectedChoice(prev =>
            prev?.id === choice.id && prev?.programSlot === choice.programSlot ? null : choice
        );
    };

    const handleChoiceToggle = (childId) => {
        if (!selectedChoice) return;
        const { id: parentId, pickCount, programSlot } = selectedChoice;
        setPickedChoicesMap(prev => {
            const slotMap = prev[programSlot] || {};
            const existing = slotMap[parentId] || [];
            if (existing.includes(childId)) return { ...prev, [programSlot]: { ...slotMap, [parentId]: existing.filter(x => x !== childId) } };
            if (pickCount === 1) return { ...prev, [programSlot]: { ...slotMap, [parentId]: [childId] } };
            if (existing.length >= pickCount) return prev;
            return { ...prev, [programSlot]: { ...slotMap, [parentId]: [...existing, childId] } };
        });
    };

    const closePanel = () => { setSelectedElective(null); setSelectedChoice(null); };

    // ── Derived data (memos) ──────────────────────────────────────────────────
    // Resolve each selected program name to its audit entry; compute the set of
    // course names that appear in more than one active program for shared highlighting.
    // All hooks must run before any early returns (Rules of Hooks)
    const auditEntries = useMemo(() => allAuditData ? Object.values(allAuditData) : [], [allAuditData]);
    const programEntry = useMemo(() => auditEntries.find(p => p.program_name === selectedMajorName) || null, [auditEntries, selectedMajorName]);
    const major2Entry  = useMemo(() => resolveProgram(selectedMajor2Name, auditEntries), [selectedMajor2Name, auditEntries]);
    const minorEntry   = useMemo(() => resolveProgram(selectedMinorName,  auditEntries), [selectedMinorName,  auditEntries]);
    const minor2Entry  = useMemo(() => resolveProgram(selectedMinor2Name, auditEntries), [selectedMinor2Name, auditEntries]);

    const sharedCourses = useMemo(
        () => computeSharedCourses([programEntry, major2Entry, minorEntry, minor2Entry]),
        [programEntry, major2Entry, minorEntry, minor2Entry]
    );

    if (!allAuditData) return <div style={{ padding: "20px", color: "#64748b" }}>Loading audit data...</div>;
    if (!selectedMajorName) return <div style={{ padding: "20px", color: "#64748b" }}>Select a major to view its requirements.</div>;
    if (!programEntry) return <div style={{ padding: "20px", color: "#64748b" }}>No audit data found for {selectedMajorName}.</div>;

    // ── Tree slicing ──────────────────────────────────────────────────────────
    // Split the primary major's top-level categories into general-education reqs
    // (Universal Curriculum / General Education blocks) and major-specific reqs.
    // "Distinguished Major" nodes are hidden unless the toggle is on.

    const tree = programEntry.tree;
    const topLevelCategories = tree[0]?.children || [];
    const isDistinguished = n => /distinguished/i.test(n["Requirement Name"] || "");
    const visibleCategories = showDistinguished ? topLevelCategories : topLevelCategories.filter(n => !isDistinguished(n));
    const generalReqs = visibleCategories.filter(isGeneralReq);
    const majorReqs   = visibleCategories.filter(n => !isGeneralReq(n));
    const hasDistinguished = topLevelCategories.some(isDistinguished);

    const getGeneralLabel = (reqs) => {
        const nm = n => n["Requirement Name"] || "";
        if (reqs.some(n => nm(n).includes("Engineering Universal"))) return "General Engineering Requirements";
        if (reqs.some(n => nm(n).includes("Architecture Universal"))) return "General Architecture Requirements";
        return "General Education Requirements";
    };

    // Skip major2's general reqs if major1 already shows the same school-wide block
    const major2ShouldSkipGeneral = generalReqs.length > 0 && major2Entry && programHasGeneralReqs(major2Entry);

    // ── Conflict detection ────────────────────────────────────────────────────
    // A minor conflicts with an active major when the base subject name matches
    // (e.g. "Computer Science (Min)" conflicts with "Computer Science (BS)").

    const activeMajorBases = [programEntry, major2Entry].filter(Boolean).map(e => getBaseSubject(e.program_name));
    const minorConflict  = minorEntry  ? activeMajorBases.includes(getBaseSubject(minorEntry.program_name))  : false;
    const minor2Conflict = minor2Entry ? activeMajorBases.includes(getBaseSubject(minor2Entry.program_name)) : false;

    const findNode = (nodes, id) => {
        for (const n of nodes) {
            if (n["Requirement ID"] === id) return n;
            const f = findNode(n.children || [], id);
            if (f) return f;
        }
        return null;
    };

    // ── Panel data resolution ─────────────────────────────────────────────────
    // Locate the elective/choice node inside the correct program's tree so we
    // can read its constraint details (pick count, credit count) for the panel.

    const treesMap = { major1: tree, major2: major2Entry?.tree, minor: minorEntry?.tree, minor2: minor2Entry?.tree };
    const activeTree = selectedElective ? treesMap[selectedElective.programSlot] : null;

    const electiveNode    = selectedElective && activeTree ? findNode(activeTree, selectedElective.id) : null;
    const selectedCourses = selectedElective ? (electiveData?.[selectedElective.key] || []) : [];
    const addedForSelected = selectedElective ? ((addedElectivesMap[selectedElective.programSlot] || {})[selectedElective.id] || []) : [];
    const pickedForChoice  = selectedChoice   ? ((pickedChoicesMap[selectedChoice.programSlot]    || {})[selectedChoice.id]   || []) : [];
    const panelOpen = !!(selectedElective || selectedChoice);

    const isEngineeringGeneral = generalReqs.some(n => (n["Requirement Name"] || "").includes("Engineering Universal"));

    const zoomBtnStyle = {
        width: "22px", height: "22px", borderRadius: "4px",
        border: "1px solid #cbd5e1", background: "#fff", color: "#475569",
        cursor: "pointer", fontSize: "15px", fontWeight: "bold",
        display: "flex", alignItems: "center", justifyContent: "center",
        lineHeight: 1, padding: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    };

    // ── Slot prop factory ─────────────────────────────────────────────────────
    // Builds the prop bundle passed to every RequirementNode for a given program
    // slot (major1, major2, minor, minor2), wiring elective/choice callbacks and
    // the per-slot state maps.

    const makeSharedProps = (slot, entry) => ({
        electiveData,
        programName: entry.program_name,
        addedElectives: addedElectivesMap[slot] || {},
        pickedChoices:  pickedChoicesMap[slot]  || {},
        isRodmanScholar: slot === "major1" ? isRodmanScholar : false,
        onElectiveClick: (elective) => handleElectiveClick({ ...elective, programSlot: slot }),
        onChoiceClick:   (choice)   => handleChoiceClick({ ...choice, programSlot: slot }),
        sharedCourses,
    });

    // ── Tree renderer ─────────────────────────────────────────────────────────
    // Wraps the requirement tree in a zoomable container with +/− buttons.
    // The zoom is applied via CSS transform so the layout engine sees the
    // unscaled size and horizontal scroll triggers auto-fit on next render.

    const renderTree = (nodes, color, zoom, setZoom, containerRef, slotProps) => (
        <div className="flow-tree-container" style={{ position: "relative" }} ref={containerRef}>
            <div style={{ position: "absolute", top: "6px", left: "6px", zIndex: 20, display: "flex", gap: "3px" }}>
                <button onClick={() => setZoom(z => Math.max(0.3, +(z - 0.1).toFixed(1)))} style={zoomBtnStyle} title="Zoom out">−</button>
                <button onClick={() => setZoom(z => Math.min(2.5, +(z + 0.1).toFixed(1)))} style={zoomBtnStyle} title="Zoom in">+</button>
            </div>
            <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center", transition: "transform 0.2s ease" }}>
                <div className="flow-tree">
                    <ul>{nodes.map(n => <RequirementNode key={n["Requirement ID"]} node={n} isRoot color={color} {...slotProps} />)}</ul>
                </div>
            </div>
        </div>
    );

    // ── Minor section renderer ────────────────────────────────────────────────
    // Shows a divider, the program name, an optional conflict warning, and the
    // tree for a minor/2nd-minor slot. Hides the tree entirely on conflict.

    const renderMinorSection = (entry, slot, label, color, conflict, zoom, setZoom, containerRef) => {
        if (!entry) return null;
        const cats = entry.tree[0]?.children || [];
        const props = makeSharedProps(slot, entry);
        const warning = conflict
            ? `A minor in ${entry.program_name} cannot be taken alongside your current major(s) — it corresponds to the same field.`
            : null;
        return (
            <>
                <SectionDivider label={label} color={color} programName={entry.program_name} warning={warning} />
                {!conflict && cats.length > 0 && renderTree(cats, color, zoom, setZoom, containerRef, props)}
            </>
        );
    };

    const major1Props = makeSharedProps("major1", programEntry);

    // ── Render ────────────────────────────────────────────────────────────────
    // Layout order: page title → general-ed reqs → major pathways →
    // 2nd major (with optional general-ed) → minor → 2nd minor →
    // shared-courses legend. Side panel (elective or choice) overlays the right
    // edge and shifts the main content left via marginRight transition.

    return (
        <>
            <div style={{ fontFamily: "system-ui, sans-serif", padding: "40px", maxWidth: "100%", boxSizing: "border-box", marginRight: panelOpen ? "340px" : "0", transition: "margin-right 0.2s ease" }}>
                <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#0f172a", marginBottom: "40px", borderBottom: "2px solid #cbd5e1", paddingBottom: "16px" }}>
                    {programEntry.program_name} Requirements
                </h1>

                {generalReqs.length > 0 && (
                    <>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                            <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#1e3a8a", margin: 0 }}>{getGeneralLabel(generalReqs)}</h2>
                            {isEngineeringGeneral && (
                                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#64748b", cursor: "pointer", userSelect: "none" }}>
                                    <input type="checkbox" checked={isRodmanScholar} onChange={e => setIsRodmanScholar(e.target.checked)} style={{ cursor: "pointer" }} />Rodman Scholar
                                </label>
                            )}
                        </div>
                        {renderTree(generalReqs, "#1e3a8a", generalZoom, setGeneralZoom, generalContainerRef, major1Props)}
                    </>
                )}

                {majorReqs.length > 0 && (
                    <>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: generalReqs.length > 0 ? "60px" : "0", marginBottom: "16px" }}>
                            <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#ea580c" }}>{programEntry.program_name} Pathways</h2>
                            {hasDistinguished && (
                                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#64748b", cursor: "pointer", userSelect: "none" }}>
                                    <input type="checkbox" checked={showDistinguished} onChange={e => setShowDistinguished(e.target.checked)} style={{ cursor: "pointer" }} />Show Distinguished Major
                                </label>
                            )}
                        </div>
                        {renderTree(majorReqs, "#ea580c", majorZoom, setMajorZoom, majorContainerRef, major1Props)}
                    </>
                )}

                {major2Entry && (() => {
                    const m2Cats   = major2Entry.tree[0]?.children || [];
                    const m2General = m2Cats.filter(isGeneralReq);
                    const m2Major   = m2Cats.filter(n => !isGeneralReq(n));
                    const m2Props   = makeSharedProps("major2", major2Entry);
                    return (
                        <>
                            <SectionDivider label="2nd Major" color="#0d9488" programName={major2Entry.program_name} />

                            {!major2ShouldSkipGeneral && m2General.length > 0 && (
                                <>
                                    <div style={{ marginBottom: "16px" }}>
                                        <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#1e3a8a", margin: 0 }}>{getGeneralLabel(m2General)}</h2>
                                    </div>
                                    {renderTree(m2General, "#1e3a8a", major2Zoom, setMajor2Zoom, major2ContainerRef, m2Props)}
                                </>
                            )}

                            {major2ShouldSkipGeneral && (
                                <div style={{ marginBottom: "16px", padding: "8px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", fontSize: "12px", color: "#166534" }}>
                                    General school requirements are shared with your 1st major and shown above.
                                </div>
                            )}

                            {m2Major.length > 0 && (
                                <>
                                    <div style={{ marginTop: m2General.length > 0 && !major2ShouldSkipGeneral ? "40px" : "0", marginBottom: "16px" }}>
                                        <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#0d9488" }}>{major2Entry.program_name} Pathways</h2>
                                    </div>
                                    {renderTree(m2Major, "#0d9488", major2Zoom, setMajor2Zoom, major2ContainerRef, m2Props)}
                                </>
                            )}
                        </>
                    );
                })()}

                {renderMinorSection(minorEntry,  "minor",  "Minor",    "#7c3aed", minorConflict,  minorZoom,  setMinorZoom,  minorContainerRef)}
                {renderMinorSection(minor2Entry, "minor2", "2nd Minor", "#db2777", minor2Conflict, minor2Zoom, setMinor2Zoom, minor2ContainerRef)}

                {sharedCourses.size > 0 && (
                    <div style={{ marginTop: "40px", padding: "12px 16px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "10px", fontSize: "13px", color: "#0c4a6e", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                        <span style={{ fontSize: "16px", marginTop: "1px" }}>↔</span>
                        <span><strong>Shared requirements</strong> — boxes outlined in teal with an "↔ shared" label count toward more than one of your selected programs. You only need to satisfy them once.</span>
                    </div>
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
