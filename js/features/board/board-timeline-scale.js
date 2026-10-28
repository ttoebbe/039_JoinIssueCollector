/**
 * Date math for the board timeline: which weeks it shows and where a day
 * sits on it. Days are local midnights; weeks start on Monday.
 */

const TIMELINE_DAY_MS = 86400000;
const TIMELINE_MIN_WEEKS = 4;

/**
 * Returns local midnight of the given moment.
 * @param {number} ms - Timestamp in milliseconds.
 * @returns {number}
 */
function getStartOfDay(ms) {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * Adds whole calendar days, so a daylight saving switch keeps midnight.
 * @param {number} ms - Local midnight.
 * @param {number} days - Days to add.
 * @returns {number}
 */
function addDays(ms, days) {
  const date = new Date(ms);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

/**
 * Returns the Monday of the week that contains the given day.
 * @param {number} ms - Local midnight.
 * @returns {number}
 */
function getWeekStart(ms) {
  const weekday = (new Date(ms).getDay() + 6) % 7;
  return addDays(ms, -weekday);
}

/**
 * Returns the ISO 8601 week number.
 * @param {number} ms - Local midnight.
 * @returns {number}
 */
function getIsoWeek(ms) {
  const thursday = new Date(addDays(getWeekStart(ms), 3));
  const yearStart = new Date(thursday.getFullYear(), 0, 1).getTime();
  const daysSinceYearStart = Math.round((thursday.getTime() - yearStart) / TIMELINE_DAY_MS);
  return Math.floor(daysSinceYearStart / 7) + 1;
}

/**
 * Parses the due date of a task ("YYYY-MM-DD") as local midnight.
 * @param {Object} task
 * @returns {number} NaN when the task has no valid due date.
 */
function getTaskDueDay(task) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(task?.dueDate || ""));
  if (!match) return NaN;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
}

/**
 * Returns the day a task was created on.
 * @param {Object} task
 * @returns {number} NaN when the creation time is missing.
 */
function getTaskStartDay(task) {
  const createdAt = Number(task?.createdAt);
  return Number.isFinite(createdAt) && createdAt > 0 ? getStartOfDay(createdAt) : NaN;
}

/**
 * Computes the visible range: whole weeks from the earliest start to the
 * latest due date, always including today and at least TIMELINE_MIN_WEEKS.
 * @param {Array<Object>} tasks
 * @returns {{ start: number, end: number, weeks: number, today: number }}
 */
function getTimelineRange(tasks) {
  const today = getStartOfDay(Date.now());
  const days = tasks
    .flatMap((task) => [getTaskStartDay(task), getTaskDueDay(task)])
    .filter(Number.isFinite);
  const start = getWeekStart(Math.min(today, ...days));
  const lastDay = Math.max(today, ...days);
  const weeks = Math.max(TIMELINE_MIN_WEEKS, countWeeksUntil(start, lastDay));
  return { start, end: addDays(start, weeks * 7), weeks, today };
}

/**
 * Counts the weeks from a Monday up to and including a given day.
 * @param {number} weekStart - Local midnight of a Monday.
 * @param {number} lastDay - Local midnight of the last day to show.
 * @returns {number}
 */
function countWeeksUntil(weekStart, lastDay) {
  const days = Math.round((lastDay - weekStart) / TIMELINE_DAY_MS) + 1;
  return Math.ceil(days / 7);
}

/**
 * Converts a day into its horizontal position on the timeline.
 * @param {number} ms - Local midnight.
 * @param {{ start: number, end: number }} range
 * @returns {number} Percent of the track width.
 */
function getTimelinePercent(ms, range) {
  return ((ms - range.start) / (range.end - range.start)) * 100;
}

/**
 * Formats a day as "06.11." or, with the year, as "06.11.2026".
 * @param {number} ms - Local midnight.
 * @param {boolean} [withYear=false]
 * @returns {string}
 */
function formatTimelineDate(ms, withYear = false) {
  const options = { day: "2-digit", month: "2-digit" };
  if (withYear) options.year = "numeric";
  return new Date(ms).toLocaleDateString("de-DE", options);
}
