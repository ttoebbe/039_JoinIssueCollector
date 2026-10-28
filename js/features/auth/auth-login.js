/**
 * Wires login error handlers.
 * @param {Object} fields
 */
function wireLoginErrorHandlers({ emailInput, passwordInput }) {
  emailInput.addEventListener("input", () =>
    clearFieldError("email-error", emailInput),
  );
  passwordInput.addEventListener("input", () =>
    clearFieldError("password-error", passwordInput),
  );
  emailInput.addEventListener("blur", () =>
    validateLoginEmailField(emailInput, "email-error"),
  );
  passwordInput.addEventListener("blur", () =>
    validateLoginPasswordField(passwordInput, "password-error"),
  );
}

/**
 * Wires the login form when its elements are present.
 */
function initLogin() {
  const state = getLoginState();
  if (!state) return;
  wireLoginForm(state);
}

/**
 * Gets login form state.
 * @returns {Object|null}
 */
function getLoginState() {
  const form = document.getElementById("login-form");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginButton = document.getElementById("login-button");
  const guestLoginButton = document.getElementById("guest-login-button");
  if (!form || !emailInput || !passwordInput || !loginButton) return null;
  return { form, emailInput, passwordInput, loginButton, guestLoginButton };
}

/**
 * Wires login form handlers.
 * @param {Object} state
 */
function wireLoginForm(state) {
  wireLoginErrorHandlers(state);
  wireLoginSubmit(state);
  wireGuestLogin(state);
  setupPasswordToggle(
    "password",
    "password-lock-icon",
    "password-visibility-toggle",
  );
}

/**
 * Wires login form submit.
 * @param {Object} state
 */
function wireLoginSubmit(state) {
  state.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await handleLoginSubmit(state);
  });
}

/**
 * Handles login submit.
 * @param {Object} state
 */
async function handleLoginSubmit(state) {
  if (!validateLoginInputs(state)) return;
  await runLogin(state);
}

/**
 * Runs the login flow.
 * @param {Object} state
 */
async function runLogin(state) {
  setLoginBusy(state, true);
  try {
    await attemptLogin(state);
  } finally {
    setLoginBusy(state, false);
  }
}

/**
 * Attempts login with credentials.
 * @param {Object} fields
 */
async function attemptLogin({ emailInput, passwordInput }) {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const { uid, error } = await signInWithEmail(email, password);
  if (error) return handleLoginError(error, emailInput, passwordInput);
  const profile = await loadUserProfile(uid);
  await saveCurrentUser({
    id: uid,
    name: profile?.name ?? email,
    email,
    color: profile?.color,
  });
  window.location.href = ROUTES.SUMMARY;
}

/**
 * Shows a failed sign-in: wrong credentials at the fields, anything else as toast.
 * @param {string} error - Error code from the auth API.
 * @param {HTMLInputElement} emailInput
 * @param {HTMLInputElement} passwordInput
 */
function handleLoginError(error, emailInput, passwordInput) {
  if (error === "NETWORK_ERROR") return showAuthServiceError(error);
  showLoginErrorState(emailInput, passwordInput);
}

/**
 * Wires guest login.
 * @param {Object} state
 */
function wireGuestLogin({ guestLoginButton }) {
  guestLoginButton?.addEventListener("click", async (e) => {
    e.preventDefault();
    await runGuestLogin();
  });
}

/**
 * Signs the guest in anonymously and opens the summary.
 */
async function runGuestLogin() {
  const { uid, error } = await signInAsGuest();
  if (error) return showAuthServiceError(error);
  await saveCurrentUser({ id: uid, name: "Gast", guest: true });
  window.location.href = ROUTES.SUMMARY;
}

/**
 * Sets login busy state.
 * @param {Object} state
 * @param {boolean} busy
 */
function setLoginBusy({ loginButton }, busy) {
  if (!loginButton) return;
  loginButton.disabled = busy;
}
