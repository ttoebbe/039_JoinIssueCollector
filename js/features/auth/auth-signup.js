/**
 * Wires signup error handlers.
 * @param {Object} fields
 */
function wireSignupErrorHandlers(fields) {
  wireSignupInputHandlers(fields);
  wireSignupBlurHandlers(fields);
}

/**
 * Wires the handlers that clear a field error while the user types.
 * @param {Object} fields
 */
function wireSignupInputHandlers(fields) {
  const cleared = [
    [fields.nameInput, "username-error", "input"],
    [fields.emailInput, "sign-up-email-error", "input"],
    [fields.passwordInput, "sign-up-password-error", "input"],
    [fields.confirmPasswordInput, "sign-up-confirm-password-error", "input"],
    [fields.policyCheckbox, "sign-up-policy-error", "change"],
  ];
  cleared.forEach(([field, errorId, event]) => {
    field?.addEventListener(event, () => clearFieldError(errorId, field));
  });
}

/**
 * Wires the blur handlers that validate a signup field.
 * @param {Object} fields
 */
function wireSignupBlurHandlers(fields) {
  wireSignupSimpleBlurHandlers(fields);
  fields.emailInput.addEventListener("blur", () =>
    handleSignupEmailBlur(fields.emailInput),
  );
  fields.confirmPasswordInput.addEventListener("blur", () =>
    validateFieldWithAutoDismiss(
      fields.passwordInput,
      fields.confirmPasswordInput,
      "sign-up-confirm-password-error",
      validateConfirmPasswordField,
    ),
  );
}

/**
 * Wires the blur validation of the name and password fields.
 * @param {Object} fields
 */
function wireSignupSimpleBlurHandlers({ nameInput, passwordInput }) {
  const validated = [
    [nameInput, "username-error", validateUsernameField],
    [passwordInput, "sign-up-password-error", validatePasswordField],
  ];
  validated.forEach(([field, errorId, validate]) => {
    field.addEventListener("blur", () =>
      validateFieldWithAutoDismiss(field, errorId, validate),
    );
  });
}

/**
 * Wires signup button state.
 * @param {Object} state
 */
function wireSignupButtonState(state) {
  const update = () => setSignupButtonState(state);
  [
    state.nameInput,
    state.emailInput,
    state.passwordInput,
    state.confirmPasswordInput,
  ].forEach((el) => el.addEventListener("input", update));
  state.policyCheckbox.addEventListener("change", update);
  update();
}

/**
 * Sets the signup button state.
 * @param {Object} state
 */
function setSignupButtonState({
  nameInput,
  emailInput,
  passwordInput,
  confirmPasswordInput,
  policyCheckbox,
  signUpButton,
}) {
  signUpButton.disabled = !(
    nameInput.value.trim() &&
    emailInput.value.trim() &&
    passwordInput.value.trim() &&
    confirmPasswordInput.value.trim() &&
    policyCheckbox.checked
  );
}

/**
 * Sets signup busy state.
 * @param {Object} state
 * @param {boolean} busy
 */
function setSignupBusy(state, busy) {
  if (!state.signUpButton) return;
  if (busy) return void (state.signUpButton.disabled = true);
  setSignupButtonState(state);
}

/**
 * Wires the signup form when its elements are present.
 */
function initSignup() {
  const state = getSignupState();
  if (!state) return;
  wireSignupForm(state);
}

/**
 * Gets signup form state.
 * @returns {Object|null}
 */
function getSignupState() {
  const state = {
    form: document.getElementById("sign-up-form"),
    nameInput: document.getElementById("sign-up-name"),
    emailInput: document.getElementById("sign-up-email"),
    passwordInput: document.getElementById("sign-up-password"),
    confirmPasswordInput: document.getElementById("sign-up-confirm-password"),
    policyCheckbox: document.getElementById("sign-up-policy"),
    signUpButton: document.getElementById("sign-up-button"),
  };
  return Object.values(state).every(Boolean) ? state : null;
}

/**
 * Wires signup form handlers.
 * @param {Object} state
 */
function wireSignupForm(state) {
  wireSignupButtonState(state);
  wireSignupErrorHandlers(state);
  wireSignupSubmit(state);
  wireSignupToggles();
}

/**
 * Wires signup submit.
 * @param {Object} state
 */
function wireSignupSubmit(state) {
  state.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await handleSignupSubmit(state);
  });
}

/**
 * Handles signup submit.
 * @param {Object} state
 */
async function handleSignupSubmit(state) {
  if (!validateSignupInputs(state)) return;
  if (await checkDuplicateEmail(state.emailInput)) return;
  await runSignup(state);
}

/**
 * Runs the signup flow.
 * @param {Object} state
 */
async function runSignup(state) {
  setSignupBusy(state, true);
  try {
    await attemptSignup(state);
  } finally {
    setSignupBusy(state, false);
  }
}

/**
 * Attempts signup with inputs.
 * @param {Object} fields
 */
async function attemptSignup({ nameInput, emailInput, passwordInput }) {
  const users = await loadUsers();
  const email = emailInput.value.trim();
  if (users.some((user) => user.email === email)) {
    const message = "This email is already registered.";
    showFieldError("sign-up-email-error", message, emailInput);
    return;
  }
  const name = nameInput.value.trim();
  const password = passwordInput.value.trim();
  const newUser = await buildNewUser(users, name, email, password);
  await UserService.create(newUser);
  setTimeout(() => {
    window.location.href = ROUTES.LOGIN;
  }, 300);
}

/**
 * Builds a new user with a salted password hash.
 * @param {Array} users
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>}
 */
async function buildNewUser(users, name, email, password) {
  const pwSalt = createPasswordSalt();
  return {
    id: generateNextUserId(users),
    name,
    email,
    pwSalt,
    pwHash: await hashPassword(password, pwSalt),
    color: generateRandomColor(),
  };
}

/**
 * Wires the password visibility toggles of the signup form.
 */
function wireSignupToggles() {
  setupPasswordToggle(
    "sign-up-password",
    "sign-up-password-lock-icon",
    "sign-up-password-visibility-toggle",
  );
  setupPasswordToggle(
    "sign-up-confirm-password",
    "sign-up-confirm-password-lock-icon",
    "sign-up-confirm-password-visibility-toggle",
  );
}
