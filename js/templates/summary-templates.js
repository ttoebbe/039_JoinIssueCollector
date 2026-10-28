/**
 * Builds the HTML for the greeting overlay.
 * @param {{ text: string, name: string }} params
 * @returns {string}
 */
function buildGreetingOverlayHtml({ text, name }) {
  const nameHtml = name ? `<h2 class="greeting-overlay-name">${name}</h2>` : "";
  return `<div class="greeting-overlay-content"><p class="greeting-overlay-text">${text}</p>${nameHtml}</div>`;
}

/**
 * Builds the KPI card grid of the summary page.
 * @returns {string}
 */
function getSummaryKpisTemplate() {
  return (
    getKpiTopCardTemplate("group-7.svg", "count-todo", STATUS_LABELS.todo) +
    getKpiTopCardTemplate("frame-59.svg", "count-done", STATUS_LABELS.done) +
    getKpiUrgentCardTemplate() +
    getKpiEmailCardTemplate() +
    getKpiBottomCardTemplate("count-board", "Aufgaben im Board") +
    getKpiBottomCardTemplate("count-in-progress", "Aufgaben in Bearbeitung") +
    getKpiBottomCardTemplate("count-awaiting", STATUS_LABELS.awaitfeedback)
  );
}

/**
 * Builds one of the two icon cards in the top row of the KPI grid.
 * @param {string} icon - File name inside /assets/img/icons/
 * @param {string} id - Element id of the counter
 * @param {string} label - Card label
 * @returns {string}
 */
function getKpiTopCardTemplate(icon, id, label) {
  return `
    <a href="board.html" class="kpi-card kpi-top">
      <div class="kpi-icon"><img src="/assets/img/icons/${icon}" alt="" /></div>
      <div class="kpi-stack">
        <div class="kpi-number" id="${id}">0</div>
        <div class="kpi-label">${label}</div>
      </div>
    </a>
  `;
}

/**
 * Builds the wide card that pairs the urgent count with the next deadline.
 * @returns {string}
 */
function getKpiUrgentCardTemplate() {
  return `
    <a href="board.html" class="kpi-card kpi-wide">
      ${getKpiUrgentSideTemplate()}
      <div class="kpi-divider"></div>
      ${getKpiDeadlineSideTemplate()}
    </a>
  `;
}

/**
 * Builds the urgent half of the wide card.
 * @returns {string}
 */
function getKpiUrgentSideTemplate() {
  return `
    <div class="kpi-wide-left">
      <div class="kpi-icon kpi-icon--stack">
        <img class="icon-bg" src="/assets/img/icons/ellipse-4.svg" alt="" />
        <img class="icon-fg" src="/assets/img/icons/Prio-Urgent-white.svg" alt="" />
      </div>
      <div class="kpi-stack">
        <div class="kpi-number" id="count-urgent">0</div>
        <div class="kpi-label">${PRIORITY_LABELS.urgent}</div>
      </div>
    </div>
  `;
}

/**
 * Builds the deadline half of the wide card.
 * @returns {string}
 */
function getKpiDeadlineSideTemplate() {
  return `
    <div class="kpi-wide-right">
      <div class="kpi-date" id="next-deadline-date">—</div>
      <div class="kpi-sub">Nächste Frist</div>
    </div>
  `;
}

/**
 * Builds the card counting the tickets that came in by email.
 * @returns {string}
 */
function getKpiEmailCardTemplate() {
  return `
    <a href="board.html" class="kpi-card kpi-square">
      <div class="kpi-number kpi-number--ai" id="count-email">0</div>
      <div class="kpi-label">E-Mail-Anfragen</div>
    </a>
  `;
}

/**
 * Builds one of the three counter cards in the bottom row of the KPI grid.
 * @param {string} id - Element id of the counter
 * @param {string} label - Card label
 * @returns {string}
 */
function getKpiBottomCardTemplate(id, label) {
  return `
    <a href="board.html" class="kpi-card kpi-bottom">
      <div class="kpi-number" id="${id}">0</div>
      <div class="kpi-label">${label}</div>
    </a>
  `;
}
