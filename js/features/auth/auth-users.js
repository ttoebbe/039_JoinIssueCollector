/**
 * Saves the current user.
 * @param {Object} user
 */
async function saveCurrentUser(user) {
  setCurrentUser(user);
}

/**
 * Loads users from storage.
 * @returns {Promise<Array>}
 */
async function loadUsers() {
  try {
    const users = await UserService.getAll();
    return users ? Object.values(users) : [];
  } catch (error) {
    console.error("Error loading users:", error);
    return [];
  }
}

/**
 * Generates the next sequential user ID from the existing users.
 * Mirrors the task ID scheme in data-utils.js: a prefix plus a running number.
 * @param {Array<{id?: string}>} users - Users already stored.
 * @returns {string} Next user ID, e.g. "u0", "u23".
 */
function generateNextUserId(users) {
  const numbers = (users ?? [])
    .map((user) => Number.parseInt(String(user?.id ?? "").slice(1), 10))
    .filter((value) => Number.isFinite(value));
  if (numbers.length === 0) return "u0";
  return `u${Math.max(...numbers) + 1}`;
}
