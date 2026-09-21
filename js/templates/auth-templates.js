/**
 * Builds the name field of the signup form.
 * @returns {string}
 */
function getSignupNameFieldTemplate() {
  return `
  <div class="input-field-wrapper">
    <div class="input-control">
      <input type="text" id="sign-up-name" name="username" placeholder="Name" />
      <img src="/assets/img/icons/person.svg" alt="" class="input-icon-username position" />
    </div>
    <div class="field-error" id="username-error"></div>
  </div>`;
}

/**
 * Builds the email field of the signup form.
 * @returns {string}
 */
function getSignupEmailFieldTemplate() {
  return `
  <div class="input-field-wrapper">
    <div class="input-control">
      <input type="email" id="sign-up-email" name="email" placeholder="Email" autocomplete="email" />
      <img src="/assets/img/icons/mail.svg" alt="" class="input-icon-email position" />
    </div>
    <div class="field-error" id="sign-up-email-error"></div>
  </div>`;
}

/**
 * Builds the password field of the signup form.
 * @returns {string}
 */
function getSignupPasswordFieldTemplate() {
  return `
  <div class="input-field-wrapper">
    <div class="input-control">
      <input type="password" id="sign-up-password" name="password" placeholder="Password" autocomplete="new-password" />
      <img src="/assets/img/icons/lock.svg" class="input-icon-password position" id="sign-up-password-lock-icon" alt="" />
      <img src="/assets/img/icons/visibility_off.svg" class="input-icon-password position d-none"
        id="sign-up-password-visibility-toggle" alt="Toggle password visibility" />
    </div>
    <div class="field-error" id="sign-up-password-error"></div>
  </div>`;
}

/**
 * Builds the confirm password field of the signup form.
 * @returns {string}
 */
function getSignupConfirmFieldTemplate() {
  return `
  <div class="input-field-wrapper">
    <div class="input-control">
      <input type="password" id="sign-up-confirm-password" name="confirm_password" placeholder="Confirm Password" autocomplete="new-password" />
      <img src="/assets/img/icons/lock.svg" class="input-icon-confirm-password position" id="sign-up-confirm-password-lock-icon" alt="" />
      <img src="/assets/img/icons/visibility_off.svg" class="input-icon-confirm-password position d-none"
        id="sign-up-confirm-password-visibility-toggle" alt="Toggle password visibility" />
    </div>
    <div class="field-error" id="sign-up-confirm-password-error"></div>
  </div>`;
}

/**
 * Renders the signup input fields into their placeholder.
 * Runs before initSignup so the wiring finds every element.
 */
function renderSignupFields() {
  const host = document.getElementById("sign-up-fields");
  if (!host) return;
  host.innerHTML =
    getSignupNameFieldTemplate() +
    getSignupEmailFieldTemplate() +
    getSignupPasswordFieldTemplate() +
    getSignupConfirmFieldTemplate();
}
