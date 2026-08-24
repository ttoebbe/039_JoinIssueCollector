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

/**
 * Creates a random salt for password hashing.
 * @returns {string} 32 hex characters.
 */
function createPasswordSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Hashes a password with its salt using SHA-256.
 * @param {string} password - Plain password.
 * @param {string} salt - Salt stored alongside the user.
 * @returns {Promise<string>} 64 hex characters.
 */
async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
