/**
 * Saves the current user.
 * @param {Object} user
 */
async function saveCurrentUser(user) {
  setCurrentUser(user);
}

/**
 * Loads the profile of a signed-in user.
 * The rules only release a user's own record, so this works right after sign-in.
 * @param {string} uid - Firebase Auth user id.
 * @returns {Promise<Object|null>} Profile with name, email and color, or null.
 */
async function loadUserProfile(uid) {
  return (await UserService.get(uid)) ?? null;
}

/**
 * Reports an auth error that has no field of its own.
 * @param {string} error - Error code from the auth API.
 */
function showAuthServiceError(error) {
  console.error("Auth error:", error);
  showErrorToast("Connection error. Try again.");
}
