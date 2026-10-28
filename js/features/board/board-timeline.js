/**
 * Timeline view of the board: one bar per task from its creation to its due
 * date, grouped by status and coloured by priority. Titles go in through
 * textContent only, because tasks arrive from external e-mails.
 */

const TIMELINE_STATUS_ORDER = ["triage", "todo", "inprogress", "awaitfeedback", "done"];

/**
 * Wires the view toggle and the clicks on timeline rows and bars.
 */
function wireBoardTimeline() {
  document.querySelectorAll("[data-board-view]").forEach((button) => {
    button.addEventListener("click", () => setBoardView(button.dataset.boardView));
  });
  document.getElementById("boardTimeline")?.addEventListener("click", handleTimelineClick);
}

/**
 * Switches between the column view and the timeline view.
 * @param {string} view - "columns" or "timeline".
 */
function setBoardView(view) {
  const page = document.querySelector(".board-page");
  if (!page) return;
  page.dataset.view = view;
  document.querySelectorAll("[data-board-view]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.boardView === view));
  });
  if (view === "timeline") scrollTimelineToToday();
}

/**
 * Scrolls the timeline so today sits one week right of the title column;
 * otherwise a long-running task would open the view months in the past.
 */
function scrollTimelineToToday() {
  const scroller = document.getElementById("boardTimeline");
  const today = scroller?.querySelector(".board-timeline-weeks .board-timeline-today");
  const week = scroller?.querySelector(".board-timeline-week");
  if (!today || !week) return;
  scroller.scrollLeft = Math.max(0, today.offsetLeft - week.offsetWidth);
}

/**
 * Opens the task detail when a row title or a bar is clicked.
 * @param {MouseEvent} event
 */
function handleTimelineClick(event) {
  const target = event.target.closest("[data-task-id]");
  if (target) openTaskDetailOverlay(target.dataset.taskId);
}

/**
 * Renders the timeline for the tasks that pass the search.
 * @param {Array<Object>} tasks
 */
function renderTimeline(tasks) {
  const timeline = document.getElementById("boardTimeline");
  if (!timeline) return;
  if (!tasks.length) {
    timeline.replaceChildren(createTimelineElement("p", "board-timeline-empty", "Keine Aufgaben"));
    return;
  }
  const range = getTimelineRange(tasks);
  const chart = createTimelineElement("div", "board-timeline-chart");
  chart.style.setProperty("--timeline-weeks", String(range.weeks));
  chart.appendChild(createTimelineHeader(range));
  appendTimelineGroups(chart, tasks, range);
  timeline.replaceChildren(chart);
  scrollTimelineToToday();
}

/**
 * Creates an element with a class and optional text.
 * @param {string} tagName
 * @param {string} className
 * @param {string} [text]
 * @returns {HTMLElement}
 */
function createTimelineElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/**
 * Creates the header row with one label per calendar week.
 * @param {{ start: number, weeks: number }} range
 * @returns {HTMLElement}
 */
function createTimelineHeader(range) {
  const header = createTimelineElement("div", "board-timeline-row board-timeline-row--head");
  header.appendChild(createTimelineElement("span", "board-timeline-corner", "Aufgabe"));
  const weeks = createTimelineElement("div", "board-timeline-track board-timeline-weeks");
  for (let week = 0; week < range.weeks; week++) {
    weeks.appendChild(createWeekLabel(addDays(range.start, week * 7)));
  }
  weeks.appendChild(createTodayMarker(range, "Heute"));
  header.appendChild(weeks);
  return header;
}

/**
 * Creates the label of one calendar week, e.g. "KW 45 · 02.11.".
 * @param {number} weekStart - Local midnight of the Monday.
 * @returns {HTMLElement}
 */
function createWeekLabel(weekStart) {
  const text = `KW ${getIsoWeek(weekStart)} · ${formatTimelineDate(weekStart)}`;
  return createTimelineElement("span", "board-timeline-week", text);
}

/**
 * Creates the vertical line that marks today.
 * @param {{ today: number }} range
 * @param {string} [text] - Label shown above the line in the header.
 * @returns {HTMLElement}
 */
function createTodayMarker(range, text) {
  const marker = createTimelineElement("span", "board-timeline-today");
  marker.style.left = `${getTimelinePercent(range.today, range)}%`;
  if (text) marker.appendChild(createTimelineElement("span", "board-timeline-today-label", text));
  return marker;
}

/**
 * Appends one group per status that has tasks, in board column order.
 * @param {HTMLElement} chart
 * @param {Array<Object>} tasks
 * @param {Object} range
 */
function appendTimelineGroups(chart, tasks, range) {
  TIMELINE_STATUS_ORDER.forEach((status) => {
    const group = tasks.filter((task) => normalizeStatus(task?.status) === status);
    if (!group.length) return;
    chart.appendChild(createTimelineGroupRow(`${STATUS_LABELS[status]} · ${group.length}`));
    group.sort(compareByDueDay).forEach((task) => chart.appendChild(createTimelineRow(task, range)));
  });
}

/**
 * Creates the heading row of a status group.
 * @param {string} title - Status label with the number of tasks.
 * @returns {HTMLElement}
 */
function createTimelineGroupRow(title) {
  const row = createTimelineElement("div", "board-timeline-row board-timeline-row--group");
  row.appendChild(createTimelineElement("h2", "board-timeline-group", title));
  row.appendChild(createTimelineElement("div", "board-timeline-track"));
  return row;
}

/**
 * Sorts tasks by due date; tasks without one go last.
 * @param {Object} first
 * @param {Object} second
 * @returns {number}
 */
function compareByDueDay(first, second) {
  const firstDue = getTaskDueDay(first);
  const secondDue = getTaskDueDay(second);
  if (!Number.isFinite(firstDue)) return Number.isFinite(secondDue) ? 1 : 0;
  if (!Number.isFinite(secondDue)) return -1;
  return firstDue - secondDue;
}

/**
 * Creates the row of one task: title button and track with its bar.
 * @param {Object} task
 * @param {Object} range
 * @returns {HTMLElement}
 */
function createTimelineRow(task, range) {
  const row = createTimelineElement("div", "board-timeline-row");
  row.appendChild(createTimelineLabel(task));
  const track = createTimelineElement("div", "board-timeline-track");
  track.appendChild(createTodayMarker(range));
  track.appendChild(createTimelineBar(task, range));
  row.appendChild(track);
  return row;
}

/**
 * Creates the title button that opens the task detail.
 * @param {Object} task
 * @returns {HTMLButtonElement}
 */
function createTimelineLabel(task) {
  const title = task?.title || task?.name || "(Ohne Titel)";
  const label = createTimelineElement("button", "board-timeline-label", title);
  label.type = "button";
  label.title = title;
  label.dataset.taskId = String(task?.id ?? "");
  return label;
}

/**
 * Creates the bar from creation to due date, or a hint when there is no due date.
 * @param {Object} task
 * @param {Object} range
 * @returns {HTMLElement}
 */
function createTimelineBar(task, range) {
  const due = getTaskDueDay(task);
  if (!Number.isFinite(due)) return createTimelineElement("span", "board-timeline-no-due", "Keine Frist");
  const created = getTaskStartDay(task);
  const start = Number.isFinite(created) ? Math.min(created, due) : due;
  const prio = normalizePrioKey(task?.prio);
  const bar = createTimelineElement("span", `board-timeline-bar board-timeline-bar--${prio}`, formatTimelineDate(due));
  bar.dataset.taskId = String(task?.id ?? "");
  bar.title = `Frist ${formatTimelineDate(due, true)}`;
  placeTimelineBar(bar, start, addDays(due, 1), range);
  return bar;
}

/**
 * Positions a bar between two days on the track.
 * @param {HTMLElement} bar
 * @param {number} from - First day, local midnight.
 * @param {number} until - Day after the last day, local midnight.
 * @param {Object} range
 */
function placeTimelineBar(bar, from, until, range) {
  const left = getTimelinePercent(from, range);
  bar.style.left = `${left}%`;
  bar.style.width = `${getTimelinePercent(until, range) - left}%`;
}
