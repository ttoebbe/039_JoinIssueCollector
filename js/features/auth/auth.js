/**
 * Starts the intro animation.
 * @param {HTMLElement} img
 * @param {HTMLElement} bg
 */
function startAnimation(img, bg) {
  if (!img || !bg) return;
  img.classList.add("animated");
  bg.classList.add("bg-animated");
  if (window.innerWidth <= 480) {
    setTimeout(() => {
      img.src = "/assets/img/homepage-join.svg";
    }, 500);
  }
  setTimeout(() => {
    bg.style.display = "none";
  }, 500);
}

/**
 * Skips the intro animation and places the logo at its end position.
 * @param {HTMLElement} img
 * @param {HTMLElement} bg
 */
function skipAnimation(img, bg) {
  if (!img || !bg) return;
  img.src = "/assets/img/homepage-join.svg";
  img.classList.add("animation-skipped");
  bg.style.display = "none";
}

/**
 * Plays the intro animation once per session.
 */
function initAnimation() {
  const img = document.getElementById("img-animation");
  const bg = document.getElementById("bg");
  if (!img || !bg) return;
  if (sessionStorage.getItem("animationShown") === "true") {
    skipAnimation(img, bg);
    return;
  }
  sessionStorage.setItem("animationShown", "true");
  if (window.innerWidth <= 480) img.src = "/assets/img/capa-1.svg";
  setTimeout(() => startAnimation(img, bg), 200);
}

/**
 * Shows the signup success overlay.
 */
function showSuccessOverlay() {
  const overlay = document.getElementById("success-overlay");
  if (overlay) overlay.style.display = "flex";
}

// DOMContentLoaded listener for auth init.
document.addEventListener("DOMContentLoaded", handleAuthReady);

/**
 * Starts the auth init once the page is ready.
 */
function handleAuthReady() {
  withPageReady(runAuthInit);
}

/**
 * Initialises animation, login and signup.
 */
function runAuthInit() {
  initAnimation();
  initLogin();
  renderSignupFields();
  initSignup();
}
