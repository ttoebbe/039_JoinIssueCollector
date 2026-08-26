/**
 * @file Drives the two states of the stakeholder request page.
 *
 * Figma note 350537:9980 on the "Stakeholder limit reached" frame:
 * "This screen only appears after the daily limit has been reached!
 *  By default, show the previous frame: 'Stakeholder'."
 *
 * The real count comes from the n8n workflow that throttles the mailbox — it
 * reads the same counter file the issue collector writes and answers
 * `{ used, limit }` (see n8n/quota-status.workflow.json).
 *
 * A `used` parameter in the URL overrides the live count and stays in place as
 * the test data source for both UI states:
 *   request.html          -> the live count, state follows it
 *   request.html?used=4   -> 4 of 10, state "available"
 *   request.html?used=10  -> 10 of 10, state "limit-reached"
 *
 * When the endpoint fails or does not answer in time, the page falls back to
 * "0 used" and stays usable. A dead n8n instance must not lock stakeholders
 * out of a limit that was never reached — that error would be the worse one.
 */

const STATUS_ENDPOINT = 'https://n8n.thomas-toebbe.de/webhook/join-quota';
const STATUS_TIMEOUT_MS = 3000;

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
 * Reads the `used` override from the query string. An unparsable value still
 * counts as an override so the test switch never falls through to the network.
 * @returns {number|null} The overridden count, or null when the URL carries none.
 */
function readUsedOverride() {
  const raw = new URLSearchParams(window.location.search).get('used');
  if (raw === null) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/**
 * Asks the n8n endpoint for today's counter, giving up after a short timeout.
 * @returns {Promise<Object|null>} The payload, or null when nothing usable arrived.
 */
async function fetchQuota() {
  try {
    const response = await fetch(STATUS_ENDPOINT, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(STATUS_TIMEOUT_MS),
    });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

/**
 * Takes the limit from the endpoint when it is plausible, otherwise keeps the
 * one configured on the page.
 * @param {Object|null} quota Payload of the quota endpoint.
 * @param {number} fallback Limit read from `data-request-limit`.
 * @returns {number} The limit to render.
 */
function resolveLimit(quota, fallback) {
  const parsed = Number(quota?.limit);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Takes the used count from the endpoint. Anything missing or nonsensical
 * reads as 0, which shows the page in its available state.
 * @param {Object|null} quota Payload of the quota endpoint.
 * @param {number} limit Upper bound used for clamping.
 * @returns {number} A value between 0 and `limit`.
 */
function resolveUsed(quota, limit) {
  const parsed = Number(quota?.used);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, limit);
}

/**
 * Resolves the counter to render: the `?used=` override when the URL carries
 * one, otherwise the live values from n8n.
 * @param {number} fallbackLimit Limit read from `data-request-limit`.
 * @returns {Promise<{used: number, limit: number}>} The counter state.
 */
async function readCounterState(fallbackLimit) {
  const override = readUsedOverride();
  if (override !== null) {
    return { used: Math.min(override, fallbackLimit), limit: fallbackLimit };
  }
  const quota = await fetchQuota();
  const limit = resolveLimit(quota, fallbackLimit);
  return { used: resolveUsed(quota, limit), limit };
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
 * Boots the request page: wires the mail links, then renders the counter once
 * the override or the endpoint has been resolved.
 * @returns {Promise<void>}
 */
async function init() {
  const root = document.querySelector('[data-request-limit]');
  if (!root) return;
  wireRequestMailLinks(document);
  const fallbackLimit = readLimit(root);
  const counter = await readCounterState(fallbackLimit);
  update(root, counter.used, counter.limit);
}

init();
