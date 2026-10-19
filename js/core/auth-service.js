/**
 * Firebase Authentication over its REST API.
 * Signs users in, keeps the ID token the database rules ask for and renews it
 * before it expires. The session lives in sessionStorage, like the current user.
 */

const TOKEN_RENEW_MARGIN_MS = 60000;

/**
 * Sends a POST request to an auth endpoint.
 * A network failure is reported like an API error, so callers check one field.
 * @param {string} url - Endpoint URL including the API key.
 * @param {RequestInit} init - Headers and body of the request.
 * @returns {Promise<Object>} Parsed response; carries `error` on failure.
 */
async function postAuthRequest(url, init) {
  try {
    const response = await fetch(url, { method: "POST", ...init });
    return await response.json();
  } catch (error) {
    console.error("Auth request failed:", error);
    return { error: { message: "NETWORK_ERROR" } };
  }
}

/**
 * Calls an action of the Identity Toolkit accounts API.
 * @param {string} action - Action name, e.g. "signInWithPassword".
 * @param {Object} body - JSON payload.
 * @returns {Promise<Object>} Parsed response; carries `error` on failure.
 */
function callAccountsApi(action, body) {
  const url = `${AUTH_CONFIG.ACCOUNTS_URL}:${action}?key=${AUTH_CONFIG.API_KEY}`;
  return postAuthRequest(url, {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Stores the tokens of a sign-in or refresh response.
 * @param {{idToken: string, refreshToken: string, expiresIn: string, uid: string}} tokens
 */
function storeAuthSession({ idToken, refreshToken, expiresIn, uid }) {
  const expiresAt = Date.now() + Number(expiresIn) * 1000;
  const session = { idToken, refreshToken, expiresAt, uid };
  sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

/**
 * Reads the stored auth session.
 * @returns {{idToken: string, refreshToken: string, expiresAt: number, uid: string}|null}
 */
function readAuthSession() {
  try {
    return JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY));
  } catch {
    return null;
  }
}

/**
 * Removes the stored auth session.
 */
function clearAuthSession() {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
}

/**
 * Runs a sign-in style action and keeps the tokens it returns.
 * @param {string} action - Accounts API action.
 * @param {Object} body - JSON payload.
 * @returns {Promise<{uid?: string, error?: string}>} The user id or an error code.
 */
async function startAuthSession(action, body) {
  const payload = { ...body, returnSecureToken: true };
  const result = await callAccountsApi(action, payload);
  if (result.error) return { error: result.error.message };
  const { idToken, refreshToken, expiresIn, localId } = result;
  storeAuthSession({ idToken, refreshToken, expiresIn, uid: localId });
  return { uid: localId };
}

/**
 * Signs in with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{uid?: string, error?: string}>}
 */
function signInWithEmail(email, password) {
  return startAuthSession("signInWithPassword", { email, password });
}

/**
 * Creates an account with email and password and signs it in.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{uid?: string, error?: string}>}
 */
function signUpWithEmail(email, password) {
  return startAuthSession("signUp", { email, password });
}

/**
 * Signs in anonymously for the guest login.
 * @returns {Promise<{uid?: string, error?: string}>}
 */
function signInAsGuest() {
  return startAuthSession("signUp", {});
}

/**
 * Exchanges the refresh token for a new ID token.
 * Drops the session when the refresh token is no longer accepted.
 * @param {{refreshToken: string}} session
 * @returns {Promise<string|null>} The new ID token, or null.
 */
async function refreshIdToken(session) {
  const url = `${AUTH_CONFIG.TOKEN_URL}?key=${AUTH_CONFIG.API_KEY}`;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: session.refreshToken,
  });
  const result = await postAuthRequest(url, { body });
  if (result.error) {
    clearAuthSession();
    return null;
  }
  storeRefreshedSession(result);
  return result.id_token;
}

/**
 * Stores the tokens of a refresh response, which names its fields in snake case.
 * @param {{id_token: string, refresh_token: string, expires_in: string, user_id: string}} result
 */
function storeRefreshedSession(result) {
  storeAuthSession({
    idToken: result.id_token,
    refreshToken: result.refresh_token,
    expiresIn: result.expires_in,
    uid: result.user_id,
  });
}

/**
 * Returns a valid ID token, renewing it shortly before it expires.
 * @returns {Promise<string|null>} The ID token, or null without a session.
 */
async function getIdToken() {
  const session = readAuthSession();
  if (!session) return null;
  if (Date.now() < session.expiresAt - TOKEN_RENEW_MARGIN_MS) {
    return session.idToken;
  }
  return refreshIdToken(session);
}
