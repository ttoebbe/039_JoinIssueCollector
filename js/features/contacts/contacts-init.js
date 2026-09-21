/**
 * Loads the contacts and renders the contacts page.
 * @returns {Promise<void>}
 */
async function initContactsPage() {
  const listElement = document.querySelector(".contact-list");
  if (!listElement) {
    return;
  }
  await loadContactsFromFirebase();
  renderContactList(listElement, getContactData());
  preselectFirstContact(listElement);
  setupAddContactOverlay(listElement);
  setupHeaderBackButton();
  onPageVisible(() => reloadContactsData(listElement));
}

/**
 * Preselects the first contact so the detail pane is not empty.
 * Figma 576:4499 opens with a contact shown; on mobile the list stays in front.
 * @param {HTMLElement} listElement
 */
function preselectFirstContact(listElement) {
  if (window.matchMedia("(max-width: 1250px)").matches) return;
  const first = listElement.querySelector(".contact-entry");
  if (first) first.click();
}

/**
 * Reloads contacts from Firebase and updates the list.
 * @param {HTMLElement} listElement
 */
async function reloadContactsData(listElement) {
  try {
    await loadContactsFromFirebase();
    renderContactList(listElement, getContactData());
  } catch (error) {
    console.error("Error reloading contacts:", error);
  }
}

/**
 * Starts the contacts page init once the page is ready.
 */
function handleContactsReady() {
  withPageReady(initContactsPage);
}

// DOMContentLoaded listener for contacts init.
document.addEventListener("DOMContentLoaded", handleContactsReady);
