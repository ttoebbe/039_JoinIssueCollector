/**
 * Shows the login error state.
 * @param {HTMLInputElement} emailInput
 * @param {HTMLInputElement} passwordInput
 */
function showLoginErrorState(emailInput, passwordInput) {
  showFieldError(
    "email-error",
    "E-Mail-Adresse oder Passwort ungültig",
    emailInput,
  );
  showFieldError(
    "password-error",
    "E-Mail-Adresse oder Passwort ungültig",
    passwordInput,
  );
}

/**
 * Clears the login error state.
 * @param {HTMLInputElement} emailInput
 * @param {HTMLInputElement} passwordInput
 */
function clearLoginErrorState(emailInput, passwordInput) {
  emailInput?.classList.remove("input-error");
  passwordInput?.classList.remove("input-error");
}

/**
 * Validates login inputs.
 * @param {Object} fields
 * @returns {boolean}
 */
function validateLoginInputs({ emailInput, passwordInput }) {
  clearLoginErrorState(emailInput, passwordInput);
  let valid = true;
  if (!validateLoginEmailField(emailInput, "email-error")) valid = false;
  if (!validateLoginPasswordField(passwordInput, "password-error"))
    valid = false;
  return valid;
}

/**
 * Shows the signup error state.
 * @param {HTMLInputElement} passwordInput
 * @param {HTMLInputElement} confirmPasswordInput
 */
function showSignupErrorState(passwordInput, confirmPasswordInput) {
  passwordInput?.classList.add("input-error");
  confirmPasswordInput?.classList.add("input-error");
}

/**
 * Clears the signup error state.
 * @param {HTMLInputElement} passwordInput
 * @param {HTMLInputElement} confirmPasswordInput
 */
function clearSignupErrorState(passwordInput, confirmPasswordInput) {
  passwordInput?.classList.remove("input-error");
  confirmPasswordInput?.classList.remove("input-error");
}

/**
 * Validates signup inputs.
 * @param {Object} fields
 * @returns {boolean}
 */
function validateSignupInputs(fields) {
  const { nameInput, emailInput, passwordInput, policyCheckbox } = fields;
  clearSignupErrorState(passwordInput, fields.confirmPasswordInput);
  clearFieldError("sign-up-policy-error", policyCheckbox);
  const results = [
    validateUsernameField(nameInput, "username-error"),
    validateEmailField(emailInput, "sign-up-email-error"),
    validatePasswordField(passwordInput, "sign-up-password-error"),
    validateConfirmField(fields),
    validatePolicyField(policyCheckbox),
  ];
  return results.every(Boolean);
}

/**
 * Validates the confirm password field of the signup form.
 * @param {Object} fields
 * @returns {boolean}
 */
function validateConfirmField(fields) {
  return validateConfirmPasswordField(
    fields.passwordInput,
    fields.confirmPasswordInput,
    "sign-up-confirm-password-error",
  );
}

/**
 * Validates the privacy policy checkbox of the signup form.
 * @param {HTMLInputElement} policyCheckbox
 * @returns {boolean}
 */
function validatePolicyField(policyCheckbox) {
  if (policyCheckbox.checked) return true;
  showFieldError(
    "sign-up-policy-error",
    "Bitte akzeptieren Sie die Datenschutzerklärung.",
    policyCheckbox,
  );
  return false;
}

/**
 * Runs a validator with optional auto-dismiss handler.
 * @param {any} arg1
 * @param {any} arg2
 * @param {any} arg3
 * @param {Function} arg4
 * @returns {boolean}
 */
function validateFieldWithAutoDismiss(arg1, arg2, arg3, arg4) {
  if (typeof arg4 === "function") return arg4(arg1, arg2, arg3);
  if (typeof arg3 === "function") return arg3(arg1, arg2);
  return false;
}

/**
 * Shows required field errors for signup.
 * @param {HTMLInputElement} passwordInput
 * @param {HTMLInputElement} confirmPasswordInput
 * @returns {boolean}
 */
function showSignupRequiredError(passwordInput, confirmPasswordInput) {
  showFieldError(
    "sign-up-password-error",
    "Bitte füllen Sie alle Pflichtfelder aus.",
    passwordInput,
  );
  showFieldError(
    "sign-up-confirm-password-error",
    "Bitte füllen Sie alle Pflichtfelder aus.",
    confirmPasswordInput,
  );
  return false;
}

/**
 * Shows policy errors for signup.
 * @param {HTMLInputElement} passwordInput
 * @param {HTMLInputElement} confirmPasswordInput
 * @returns {boolean}
 */
function showSignupPolicyError(passwordInput, confirmPasswordInput) {
  showFieldError(
    "sign-up-policy-error",
    "Bitte akzeptieren Sie die Datenschutzerklärung.",
    document.getElementById("sign-up-policy"),
  );
  return false;
}

/**
 * Handles email blur for signup.
 * Whether the address is taken only shows on submit: the user list is no
 * longer readable before sign-in.
 * @param {HTMLInputElement} emailInput
 */
function handleSignupEmailBlur(emailInput) {
  validateEmailField(emailInput, "sign-up-email-error");
}

/**
 * Validates the username field.
 * @param {HTMLInputElement} inputEl
 * @param {string} errorId
 * @returns {boolean}
 */
function validateUsernameField(inputEl, errorId) {
  const value = inputEl.value.trim();
  const error = getUsernameValidationError(value);
  if (error) {
    showFieldError(errorId, error, inputEl);
    return false;
  }
  clearFieldError(errorId, inputEl);
  return true;
}

/**
 * Gets the username validation error.
 * @param {string} value
 * @returns {string|null}
 */
function getUsernameValidationError(value) {
  if (!value) return "Bitte geben Sie einen Namen ein.";
  if (value.length < 2) return "Der Name muss mindestens 2 Zeichen lang sein.";
  if (!/^[a-zA-Z]/.test(value)) return "Der Name muss mit einem Buchstaben beginnen.";
  if (/\s{2,}/.test(value))
    return "Der Name darf keine aufeinanderfolgenden Leerzeichen enthalten.";
  if (!/^[a-zA-Z][a-zA-Z0-9_\- ]*$/.test(value)) {
    return "Der Name darf nur Buchstaben, Ziffern, einzelne Leerzeichen, _ und - enthalten.";
  }
  return null;
}

/**
 * Validates the signup email field.
 * @param {HTMLInputElement} inputEl
 * @param {string} errorId
 * @returns {boolean}
 */
function validateEmailField(inputEl, errorId) {
  const value = inputEl.value.trim();
  if (!value) {
    showFieldError(errorId, "Bitte geben Sie eine E-Mail-Adresse ein.", inputEl);
    return false;
  }
  if (!isValidEmail(value)) {
    showFieldError(errorId, "Ungültige E-Mail-Adresse.", inputEl);
    return false;
  }
  clearFieldError(errorId, inputEl);
  return true;
}

/**
 * Validates the login email field.
 * @param {HTMLInputElement} inputEl
 * @param {string} errorId
 * @returns {boolean}
 */
function validateLoginEmailField(inputEl, errorId) {
  const value = inputEl.value.trim();
  if (!value) {
    showFieldError(errorId, "Bitte geben Sie eine E-Mail-Adresse ein.", inputEl);
    return false;
  }
  if (!isValidEmail(value)) {
    showFieldError(errorId, "Ungültige E-Mail-Adresse.", inputEl);
    return false;
  }
  return true;
}

/**
 * Validates the password field.
 * @param {HTMLInputElement} inputEl
 * @param {string} errorId
 * @returns {boolean}
 */
function validatePasswordField(inputEl, errorId) {
  const value = inputEl.value.trim();
  const error = getPasswordValidationError(value);
  return applyPasswordValidationResult(errorId, inputEl, error);
}

/**
 * Gets the password validation error.
 * @param {string} value
 * @returns {string}
 */
function getPasswordValidationError(value) {
  if (!value) return "Bitte geben Sie ein Passwort ein.";
  if (value.length < 6) return "Das Passwort muss mindestens 6 Zeichen lang sein.";
  if (/\s/.test(value)) return "Das Passwort darf keine Leerzeichen enthalten.";
  return "";
}

/**
 * Applies the password validation result.
 * @param {string} errorId
 * @param {HTMLInputElement} inputEl
 * @param {string} error
 * @returns {boolean}
 */
function applyPasswordValidationResult(errorId, inputEl, error) {
  if (error) {
    showFieldError(errorId, error, inputEl);
    return false;
  }
  clearFieldError(errorId, inputEl);
  return true;
}

/**
 * Validates the login password field.
 * @param {HTMLInputElement} inputEl
 * @param {string} errorId
 * @returns {boolean}
 */
function validateLoginPasswordField(inputEl, errorId) {
  const value = inputEl.value.trim();
  if (!value) {
    showFieldError(errorId, "Bitte geben Sie ein Passwort ein.", inputEl);
    return false;
  }
  return true;
}

/**
 * Validates the confirm password field.
 * @param {HTMLInputElement} passwordInput
 * @param {HTMLInputElement} confirmPasswordInput
 * @param {string} errorId
 * @returns {boolean}
 */
function validateConfirmPasswordField(
  passwordInput,
  confirmPasswordInput,
  errorId,
) {
  const value = confirmPasswordInput.value.trim();
  if (!value) {
    showFieldError(
      errorId,
      "Bitte bestätigen Sie Ihr Passwort.",
      confirmPasswordInput,
    );
    return false;
  }
  if (value !== passwordInput.value.trim()) {
    showFieldError(errorId, "Die Passwörter stimmen nicht überein.", confirmPasswordInput);
    return false;
  }
  clearFieldError(errorId, confirmPasswordInput);
  return true;
}

/**
 * Shows a field error.
 * @param {string} errorId
 * @param {string} message
 * @param {HTMLElement} inputEl
 */
function showFieldError(errorId, message, inputEl) {
  const errorEl = document.getElementById(errorId);
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.classList.add("show");
  inputEl?.classList.add("input-error");
}

/**
 * Clears a field error.
 * @param {string} errorId
 * @param {HTMLElement} inputEl
 */
function clearFieldError(errorId, inputEl) {
  const errorEl = document.getElementById(errorId);
  if (!errorEl) return;
  errorEl.classList.remove("show");
  errorEl.textContent = "";
  inputEl?.classList.remove("input-error");
}
