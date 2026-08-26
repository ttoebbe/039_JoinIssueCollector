/**
 * @file Reports a column change to the n8n status notification workflow.
 *
 * The workflow decides on its own whether a mail goes out: it resolves the
 * creator from the database, skips internal creators and caps the mails per
 * ticket and day. The board only reports what happened.
 */

/**
 * Builds the request body the status workflow expects.
 * @param {Object} task
 * @param {string} from - Previous status
 * @param {string} to - New status
 * @returns {{ taskId: string, title: string, from: string, to: string }}
 */
function buildStatusPayload(task, from, to) {
  return {
    taskId: String(task?.id ?? ""),
    title: String(task?.title ?? ""),
    from: String(from ?? ""),
    to: String(to ?? ""),
  };
}

/**
 * Builds the fetch options for the status webhook.
 * @param {Object} payload - The request body
 * @returns {RequestInit}
 */
function buildStatusRequest(payload) {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Join-Secret": NOTIFY_CONFIG.SECRET,
    },
    body: JSON.stringify(payload),
  };
}

/**
 * Tells the n8n workflow that a task moved to another column.
 * Fire and forget: a failing webhook must never block the board.
 * @param {Object} task
 * @param {string} from - Previous status
 * @param {string} to - New status
 * @returns {void}
 */
function notifyStatusChange(task, from, to) {
  const payload = buildStatusPayload(task, from, to);
  if (!payload.taskId) return;
  fetch(NOTIFY_CONFIG.ENDPOINT, buildStatusRequest(payload)).catch(() => {});
}
