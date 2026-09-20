/**
 * Sends the browser one step back in its history.
 */
function goBackFromLegalPage() {
  window.history.back();
}

/**
 * Wires the back buttons of the legal pages.
 */
function wireLegalBackButtons() {
  document.querySelectorAll(".policy-back").forEach((button) => {
    button.addEventListener("click", goBackFromLegalPage);
  });
}

// DOMContentLoaded listener for legal page init.
document.addEventListener("DOMContentLoaded", wireLegalBackButtons);
