let mercenaries = [];
let filters = { attackType: "", faction: "", subclass: "" };

async function loadFilters() {
  const response = await fetch("filters.json");
  const filterData = await response.json();

  // For each key in filters.json (e.g. "AttackType"), map to the DOM id (attackType)
  for (let key of Object.keys(filterData)) {
    const prop = key.charAt(0).toLowerCase() + key.slice(1); // "AttackType" -> "attackType"
    const select = document.getElementById(prop);

    if (!select) {
      console.warn(`No <select> with id="${prop}" found for filter key "${key}".`);
      continue;
    }

    select.innerHTML = `<option value="">All</option>`;
    filterData[key].forEach(option => {
      const opt = document.createElement("option");
      opt.value = option;
      opt.textContent = option;
      select.appendChild(opt);
    });

    select.addEventListener("change", () => {
      filters[prop] = select.value;
      applyFilters();
    });
  }

  const resetBtn = document.getElementById("resetFilters");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      filters = { attackType: "", faction: "", subclass: "" };
      document.querySelectorAll(".filters select").forEach(sel => sel.value = "");
      applyFilters();
    });
  }
}

async function loadMercs() {
  const response = await fetch("mercs.json");
  mercenaries = await response.json();

  // Sort mercenaries alphabetically by name
  mercenaries.sort((a, b) => a.name.localeCompare(b.name));

  // Clear all faction lists
  ["Peacekeeper", "Freemen", "Syndicate"].forEach(faction => {
    const container = document.getElementById(`list-${faction}`);
    if (container) container.innerHTML = "";
  });

  mercenaries.forEach(merc => {
    const button = document.createElement("button");
    button.textContent = merc.name;
    button.classList.add("merc-button", merc.faction); // faction class for color
    button.addEventListener("click", () => showMerc(merc));

    const container = document.getElementById(`list-${merc.faction}`);
    if (container) {
      container.appendChild(button);
    }
  });

  applyFilters();
}

function applyFilters() {
  // Apply dimming based on attackType + subclass
  document.querySelectorAll(".merc-button").forEach((button) => {
    // Find the mercenary by name
    const merc = mercenaries.find(m => m.name === button.textContent);
    if (!merc) return;

    const matches =
      (!filters.attackType || merc.attackType === filters.attackType) &&
      (!filters.subclass || merc.subclass === filters.subclass);

    button.classList.toggle("dimmed", !matches);
  });
}

function populateDropdowns(maxReboot = 7, maxLevel = 31) {
  const rebootSelect = document.getElementById("reboot");
  const levelSelect = document.getElementById("level");

  rebootSelect.innerHTML = "";
  levelSelect.innerHTML = "";

  for (let i = 0; i <= maxReboot; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i;
    rebootSelect.appendChild(opt);
  }

  for (let i = 1; i <= maxLevel; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i;
    levelSelect.appendChild(opt);
  }
}

function calculateStats(merc, reboot, level) {
  const stats = {};
  const levelGrowth = merc.level_growth || {};
  const rebootGrowth = merc.reboot_growth || {};

  // Iterate over all possible stats (e.g., 'health', 'attack')
  const allStatNames = new Set([
    ...Object.keys(levelGrowth),
    ...Object.keys(rebootGrowth),
  ]);

  for (const statName of allStatNames) {
    const levelStatArray = levelGrowth[statName] || [];
    const rebootStatArray = rebootGrowth[statName] || [];

    const levelValue = levelStatArray[level - 1] || 0; // level is 1-based
    const rebootValue = rebootStatArray[reboot] || 0;   // reboot is 0-based

    stats[statName] = levelValue + rebootValue;
  }

  return stats;
}

function showMerc(merc) {
  const detailDiv = document.getElementById("mercInfo");
  if (detailDiv) detailDiv.style.display = "block";

  document.getElementById("mercName").textContent = merc.name || "—";
  document.getElementById("mercDescription").textContent = merc.description || "";
  document.getElementById("mercSummary").textContent = merc.summary || "";
  document.getElementById("mercTips").textContent = merc.tips_and_tricks || "";

  populateDropdowns(7, 31);

  const rebootSelect = document.getElementById("reboot");
  const levelSelect = document.getElementById("level");

  function updateStatsAndSkills() {
    const reboot = parseInt(rebootSelect.value, 10);
    const level = parseInt(levelSelect.value, 10);
    const stats = calculateStats(merc, reboot, level);

    // --- Update Stats Display ---
    const statsOutput = document.getElementById("stats");
    let statsHTML = "❤️ " + Math.round(stats.health || 0);
    statsHTML += " | ⚔️ " + Math.round(stats.attack || 0);
    statsOutput.innerHTML = `<p>${statsHTML}</p>`;

    // --- Update Skills Display ---
    const skillsContainer = document.getElementById("skillsContainer");
    skillsContainer.innerHTML = ""; // Clear previous skills

    for (let i = 1; i <= 4; i++) { // Check for up to 4 skills
      if (merc[`skill_${i}_text`]) {
        let skillText = merc[`skill_${i}_text`];

        // Handle dynamic values like {skill_3_value}
        const placeholder = `{skill_${i}_value}`;
        if (skillText.includes(placeholder)) {
          const levelGrowth = merc[`skill_${i}_growth_level`] || [];
          const rebootGrowth = merc[`skill_${i}_growth_reboot`] || [];
          const levelValue = levelGrowth[level - 1] || 0;
          const rebootValue = rebootGrowth[reboot] || 0;
          const totalValue = levelValue + rebootValue;
          skillText = skillText.replace(placeholder, Math.round(totalValue));
        }

        // Create skill elements
        const skillDiv = document.createElement("div");
        skillDiv.className = "skill";

        const skillTitle = document.createElement("h3");
        skillTitle.textContent = `Skill ${i}`;

        const skillPara = document.createElement("p");
        
        const tooltipText = merc[`skill_${i}_tooltip`];
        if (tooltipText) {
          skillPara.className = "has-tooltip";
          const tooltipSpan = document.createElement("span");
          tooltipSpan.className = "tooltip-text";
          tooltipSpan.textContent = tooltipText;
          skillPara.appendChild(document.createTextNode(skillText));
          skillPara.appendChild(tooltipSpan);
        } else {
          skillPara.textContent = skillText;
        }

        skillDiv.appendChild(skillTitle);
        skillDiv.appendChild(skillPara);
        skillsContainer.appendChild(skillDiv);
      }
    }
  }

  rebootSelect.onchange = updateStatsAndSkills;
  levelSelect.onchange = updateStatsAndSkills;

  rebootSelect.value = 0;
  levelSelect.value = 1;
  updateStatsAndSkills();
}

// Run on load
window.onload = async () => {
  try {
    await loadFilters();
    await loadMercs();
  } catch (err) {
    console.error("Initialization error:", err);
  }
};
