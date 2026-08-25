/**
 * @file Drives the two states of the stakeholder request page.
 *
 * Figma note 350537:9980 on the "Stakeholder limit reached" frame:
 * "This screen only appears after the daily limit has been reached!
 *  By default, show the previous frame: 'Stakeholder'."
 *
 * The real count comes from the n8n workflow that throttles the mailbox. Until
 * that endpoint exists, the count is read from the query string, which also
 * provides the test data for both UI states:
 *   request.html          -> 0 of 10, state "available"
 *   request.html?used=4   -> 4 of 10, state "available"
 *   request.html?used=10  -> 10 of 10, state "limit-reached"
 */

const STATUS_ENDPOINT = null; // not defined yet: n8n endpoint for the daily counter

const MAIL_USER = 'issues';
const MAIL_HOST = 'thomas-toebbe.de';
const MAIL_SUBJECT = '[JOIN] Feature request';

/**
 * Reads the configured daily request limit from the page root.
 * @param {HTMLElement} root Page root carrying `data-request-limit`.
 * @returns {number} The limit, defaulting to 10 as specified in the requirements.
 */
function readLimit(root) {
  const parsed = Number.parseInt(root.dataset.requestLimit ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}

/**
 * Reads how many requests were used today.
 * @param {number} limit Upper bound used for clamping.
 * @returns {number} A value between 0 and `limit`.
 */
function readUsedCount(limit) {
  const raw = new URLSearchParams(window.location.search).get('used');
  const parsed = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, limit);
}

/**
 * Writes the counter numbers into the DOM.
 * @param {HTMLElement} root Page root.
 * @param {number} used Requests used today.
 * @param {number} limit Daily limit.
 * @returns {void}
 */
function renderCounter(root, used, limit) {
  const usedField = root.querySelector('[data-counter-used]');
  const limitField = root.querySelector('[data-counter-limit]');
  if (usedField) usedField.textContent = String(used);
  if (limitField) limitField.textContent = String(limit);
}

/**
 * Switches the page between the "available" and "limit-reached" states.
 * @param {HTMLElement} root Page root.
 * @param {boolean} isExhausted Whether the daily limit is reached.
 * @returns {void}
 */
function applyLimitState(root, isExhausted) {
  root.dataset.limitReached = String(isExhausted);
  const counter = root.querySelector('[data-request-counter]');
  counter?.classList.toggle('request-counter--exhausted', isExhausted);
}

/**
 * Fetches the live counter from n8n once that endpoint exists.
 * @param {number} limit Upper bound used for clamping.
 * @returns {Promise<number|null>} The used count, or null when unavailable.
 */
async function fetchUsedCount(limit) {
  if (!STATUS_ENDPOINT) return null;
  try {
    const response = await fetch(STATUS_ENDPOINT, { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const payload = await response.json();
    return Math.min(Math.max(Number(payload.used) || 0, 0), limit);
  } catch {
    return null;
  }
}

/**
 * Renders the counter and the matching page state.
 * @param {HTMLElement} root Page root.
 * @param {number} used Requests used today.
 * @param {number} limit Daily limit.
 * @returns {void}
 */
function update(root, used, limit) {
  renderCounter(root, used, limit);
  applyLimitState(root, used >= limit);
}

/**
 * Fills in the real mailto target at runtime.
 * The address is assembled from parts so it is not harvestable from the
 * served HTML, and the subject carries the [JOIN] prefix the n8n workflow
 * filters on.
 * @param {Document} doc
 * @returns {void}
 */
function wireRequestMailLinks(doc) {
  const target = `${MAIL_USER}@${MAIL_HOST}`;
  const href = `mailto:${target}?subject=${encodeURIComponent(MAIL_SUBJECT)}`;
  doc.querySelectorAll('[data-request-mail]').forEach((link) => {
    link.setAttribute('href', href);
  });
}

/**
 * Boots the request page: renders the query-string state, then upgrades it
 * with the live count as soon as the n8n endpoint answers.
 * @returns {Promise<void>}
 */
async function init() {
  const root = document.querySelector('[data-request-limit]');
  if (!root) return;
  wireRequestMailLinks(document);
  const limit = readLimit(root);
  update(root, readUsedCount(limit), limit);
  const live = await fetchUsedCount(limit);
  if (live !== null) update(root, live, limit);
}

init();
