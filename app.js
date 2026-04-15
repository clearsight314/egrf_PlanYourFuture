//
function updateSummary() {
    // Intentionally empty — the React App component listens to dropdown
    // change events directly and re-renders based on the selected major.
}

function populate(selectId, items, placeholder) {
    const sel = document.getElementById(selectId);
    sel.innerHTML = `<option value="">${placeholder}</option>`;
    items.forEach((item) => {
        const opt = document.createElement("option");
        opt.value = item;
        opt.textContent = item;
        sel.appendChild(opt);
    });
    sel.disabled = false;
}

async function loadData() {
    const response = await fetch("majors_data.json");
    const data = await response.json();

    populate("sel-major", data.majors, "— Select Major —");
    populate("sel-minor", data.minors, "N/A");
    populate("sel-major2", data.majors2, "N/A");
    populate("sel-minor2", data.minors2, "N/A");

    document.getElementById("loading").style.display = "none";
    document.getElementById("placeholder").style.display = "block";
}

loadData().catch((err) => {
    document.getElementById("loading").textContent =
        "Failed to load data: " + err.message;
});

function updateSummary() {
    // Handled by event listeners inside DegreeAuditUI
}
