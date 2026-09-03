/**
 * Gets a DOM element by ID.
 * @param {string} id - The element ID
 * @returns {HTMLElement|null} The matching element or null
 */
function getById(id) {
  return document.getElementById(id);
}

/**
 * Loads the current user from session storage.
 * @returns {Object|null} Current user or null
 */
function loadCurrentUser() {
  return getCurrentUser();
}

/**
 * Loads tasks from Firebase and normalizes them.
 * @returns {Promise<Array>} Array of tasks
 */
async function loadTasks() {
  try {
    const firebaseData = await TaskService.getAll();
    const tasks = normalizeTasks(firebaseData);
    return tasks;
  } catch (error) {
    console.error("Error loading tasks:", error);
    return [];
  }
}

/**
 * Checks whether a task has urgent priority.
 * @param {Object} task - Task object
 * @returns {boolean} True if urgent
 */
function isUrgent(task) {
  const priorityValue = String(task?.prio || "").toLowerCase().trim();
  return priorityValue === "urgent" || priorityValue === "high" || priorityValue === "alta";
}

/**
 * Checks whether a task was raised by email through the issue collector.
 * The n8n workflow stamps `source` on every ticket it creates.
 * @param {Object} task - Task object
 * @returns {boolean} True if the task came in by email
 */
function isEmailRequest(task) {
  return String(task?.source || "").toLowerCase().trim() === "email";
}

/**
 * Parses a task due date into a Date object.
 * @param {Object} task - Task object
 * @returns {Date|null} Parsed due date or null
 */
function parseDueDate(task) {
  const rawDueDate = task?.dueDate;
  if (!rawDueDate) return null;
  const parsedDate = new Date(rawDueDate);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

/**
 * Formats a Date into a long US date string.
 * @param {Date} dateObj - Date to format
 * @returns {string} Formatted date string
 */
function formatDateLong(dateObj) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(dateObj);
  } catch {
    return dateObj.toISOString().slice(0, 10);
  }
}

/**
 * Calculates KPI counters from tasks.
 * @param {Array} tasks - Task list
 * @returns {Object} KPI data
 */
function calcKPIs(tasks) {
  const kpiData = initKpi(tasks);
  const urgentOpenDates = [];
  for (const task of tasks) {
    updateKpiForTask(kpiData, task, urgentOpenDates);
  }
  setNextUrgentDeadline(kpiData, urgentOpenDates);
  return kpiData;
}

/**
 * Initializes KPI data structure.
 * @param {Array} tasks - Task list
 * @returns {Object} KPI data
 */
function initKpi(tasks) {
  return {
    board: tasks.length,
    triage: 0,
    todo: 0,
    inProgress: 0,
    awaiting: 0,
    done: 0,
    urgentOpen: 0,
    emailRequests: 0,
    nextUrgentDeadline: null,
  };
}

/**
 * Updates KPI counters for a single task.
 * @param {Object} kpiData - KPI accumulator
 * @param {Object} task - Task data
 * @param {Array<Date>} urgentOpenDates - Collected urgent due dates
 */
function updateKpiForTask(kpiData, task, urgentOpenDates) {
  const status = normalizeStatus(task?.status);
  incrementStatusCount(kpiData, status);
  trackUrgentOpen(kpiData, task, status, urgentOpenDates);
  if (isEmailRequest(task)) kpiData.emailRequests++;
}

/**
 * Increments KPI counts based on task status.
 * @param {Object} kpiData - KPI accumulator
 * @param {string} status - Normalized status
 */
function incrementStatusCount(kpiData, status) {
  if (status === TASK_STATUS.TRIAGE) kpiData.triage++;
  else if (status === TASK_STATUS.TODO) kpiData.todo++;
  else if (status === TASK_STATUS.IN_PROGRESS) kpiData.inProgress++;
  else if (status === TASK_STATUS.AWAIT_FEEDBACK) kpiData.awaiting++;
  else if (status === TASK_STATUS.DONE) kpiData.done++;
}

/**
 * Tracks urgent open tasks and their due dates.
 * @param {Object} kpiData - KPI accumulator
 * @param {Object} task - Task data
 * @param {string} status - Normalized status
 * @param {Array<Date>} urgentOpenDates - Collected urgent due dates
 */
function trackUrgentOpen(kpiData, task, status, urgentOpenDates) {
  if (!isUrgent(task) || status === "done") return;
  kpiData.urgentOpen++;
  const dueDate = parseDueDate(task);
  if (dueDate) urgentOpenDates.push(dueDate);
}

/**
 * Sets the next urgent deadline in the KPI data.
 * @param {Object} kpiData - KPI accumulator
 * @param {Array<Date>} urgentOpenDates - Collected urgent due dates
 */
function setNextUrgentDeadline(kpiData, urgentOpenDates) {
  urgentOpenDates.sort((a, b) => {
    return a - b;
  });
  kpiData.nextUrgentDeadline = urgentOpenDates[0] || null;
}

/**
 * Renders the greeting and user info in the summary header.
 * @param {Object} user - Current user
 */
function renderUser(user) {
  const greeting = getTimeBasedGreeting(new Date());
  setText("greeting-text", user?.guest ? `${greeting}!` : `${greeting},`);
  if (getById("user-name")) setText("user-name", user?.name || "Guest");
  if (getById("user-initials")) setText("user-initials", getInitials(user?.name || "Guest"));
}

/**
 * Renders the KPI card grid into its placeholder.
 */
function renderKpiGrid() {
  const host = getById("summary-kpis");
  if (!host) return;
  host.innerHTML = getSummaryKpisTemplate();
}

/**
 * Renders KPI counters on the summary page.
 * @param {Object} kpiData - KPI data to render
 */
function renderKPIs(kpiData) {
  setText("count-todo", String(kpiData.todo));
  setText("count-done", String(kpiData.done));
  setText("count-in-progress", String(kpiData.inProgress));
  setText("count-awaiting", String(kpiData.awaiting));
  setText("count-urgent", String(kpiData.urgentOpen));
  setText("count-email", String(kpiData.emailRequests));
  if (getById("count-board")) setText("count-board", String(kpiData.board));
  setText(
    "next-deadline-date",
    kpiData.nextUrgentDeadline ? formatDateLong(kpiData.nextUrgentDeadline) : "—"
  );
}

/**
 * Renders the summary for the current user and keeps it in sync.
 * @returns {Promise<void>}
 */
async function initSummary() {
  const user = loadCurrentUser();
  if (!user) return redirectToLogin();
  renderKpiGrid();
  renderUser(user);
  runMobileGreeting(user);
  await reloadSummaryData();
  onPageVisible(reloadSummaryData);
}

/**
 * Reloads the tasks and renders the KPI tiles from them.
 * @returns {Promise<void>}
 */
async function reloadSummaryData() {
  const tasks = await loadTasks();
  renderKPIs(calcKPIs(tasks));
}

/**
 * Sends a visitor without a session to the login page.
 */
function redirectToLogin() {
  window.location.href = ROUTES.LOGIN;
}

/**
 * Runs the mobile greeting overlay flow.
 * @param {Object} user - Current user
 */
function runMobileGreeting(user) {
  if (!shouldShowMobileGreeting()) return;
  const data = getGreetingData(user);
  const overlay = buildGreetingOverlay(data);
  markMobileGreetingShown();
  showGreetingOverlay(overlay);
}

/**
 * Determines whether the mobile greeting should be shown.
 * @returns {boolean} True if greeting should be displayed
 */
function shouldShowMobileGreeting() {
  return window.innerWidth <= 480 && sessionStorage.getItem("mobileGreetingShown") !== "true";
}

/**
 * Remembers for this session that the mobile greeting was shown.
 */
function markMobileGreetingShown() {
  sessionStorage.setItem("mobileGreetingShown", "true");
}

/**
 * Builds greeting text and name data for the overlay.
 * @param {Object} user - Current user
 * @returns {{ text: string, name: string }} Greeting data
 */
function getGreetingData(user) {
  const greeting = getTimeBasedGreeting(new Date());
  return {
    text: user?.guest ? `${greeting}!` : `${greeting},`,
    name: user?.guest ? "" : user?.name || "Guest",
  };
}

/**
 * Builds the greeting overlay element.
 * @param {{ text: string, name: string }} data - Greeting data
 * @returns {HTMLElement} Overlay element
 */
function buildGreetingOverlay(data) {
  const overlay = document.createElement("div");
  overlay.className = "greeting-overlay is-visible";
  overlay.innerHTML = buildGreetingOverlayHtml(data);
  return overlay;
}

/**
 * Displays the greeting overlay for a short duration.
 * @param {HTMLElement} overlay - Overlay element
 */
function showGreetingOverlay(overlay) {
  document.body.appendChild(overlay);
  setTimeout(() => overlay.remove(), 2000);
}

document.addEventListener("DOMContentLoaded", handleSummaryReady);

/**
 * Initializes the summary once the page is ready.
 */
function handleSummaryReady() {
  withPageReady(runSummaryInit);
}

/**
 * Runs the summary init and reports a failure to the console.
 * @returns {Promise<void>}
 */
async function runSummaryInit() {
  await initSummary().catch((err) => {
    console.error("Summary init error:", err);
  });
}
