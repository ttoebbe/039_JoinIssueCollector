/**
 * Seeds demo contacts into the V2 Realtime Database over REST.
 * Writes only under contacts/ so users/ and tasks/ stay untouched.
 * Usage: node tools/seed-demo-contacts.mjs [--force]
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

const DEMO_CONTACTS = [
  { id: "c0", name: "Anja Schulz",      email: "anja.schulz@example.com",      phone: "+49 151 1234561", color: "#FF7A00" },
  { id: "c1", name: "Anton Mayer",      email: "anton.mayer@example.com",      phone: "+49 151 1234562", color: "#29ABE2" },
  { id: "c2", name: "Benedikt Ziegler", email: "benedikt.ziegler@example.com", phone: "+49 151 1234563", color: "#02CF2F" },
  { id: "c3", name: "David Eisenberg",  email: "david.eisenberg@example.com",  phone: "+49 151 1234564", color: "#AF1616" },
  { id: "c4", name: "Emmanuel Mauer",   email: "emmanuel.mauer@example.com",   phone: "+49 151 1234565", color: "#9327FF" },
  { id: "c5", name: "Eva Fischer",      email: "eva.fischer@example.com",      phone: "+49 151 1234566", color: "#FF7527" },
  { id: "c6", name: "Marcel Bauer",     email: "marcel.bauer@example.com",     phone: "+49 151 1234567", color: "#6E52FF" },
  { id: "c7", name: "Sofia Kraus",      email: "sofia.kraus@example.com",      phone: "+49 151 1234568", color: "#FC71FF" },
  { id: "c8", name: "Tatjana Wolf",     email: "tatjana.wolf@example.com",     phone: "+49 151 1234569", color: "#FFBB2B" },
  { id: "c9", name: "Lukas Brenner",    email: "lukas.brenner@example.com",    phone: "+49 151 1234570", color: "#1FD7C1" },
];

/**
 * Reads API_CONFIG.BASE_URL out of js/core/constants.js.
 * Keeps a single source of truth for the database URL.
 * @returns {string} Base URL without trailing slash
 */
function readBaseUrl() {
  const source = readFileSync(join(HERE, "..", "js", "core", "constants.js"), "utf8");
  const match = source.match(/BASE_URL:\s*['"]([^'"]+)['"]/);
  if (!match) throw new Error("BASE_URL not found in js/core/constants.js");
  return match[1].replace(/\/+$/, "");
}

/**
 * Fetches the current contacts node.
 * @param {string} baseUrl
 * @returns {Promise<Object|null>}
 */
async function fetchContacts(baseUrl) {
  const response = await fetch(`${baseUrl}/contacts.json`);
  if (!response.ok) throw new Error(`GET contacts failed: ${response.status}`);
  return await response.json();
}

/**
 * Writes one contact under contacts/<id>.
 * @param {string} baseUrl
 * @param {Object} contact
 * @returns {Promise<void>}
 */
async function putContact(baseUrl, contact) {
  const response = await fetch(`${baseUrl}/contacts/${contact.id}.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(contact),
  });
  if (!response.ok) throw new Error(`PUT ${contact.id} failed: ${response.status}`);
}

/**
 * Entry point.
 * @returns {Promise<void>}
 */
async function main() {
  const force = process.argv.includes("--force");
  const baseUrl = readBaseUrl();
  const existing = await fetchContacts(baseUrl);
  const count = existing ? Object.keys(existing).length : 0;
  if (count > 0 && !force) {
    console.error(`contacts/ already holds ${count} entries. Re-run with --force to overwrite them.`);
    process.exitCode = 1;
    return;
  }
  for (const contact of DEMO_CONTACTS) {
    await putContact(baseUrl, contact);
    console.log(`wrote ${contact.id} ${contact.name}`);
  }
  console.log(`done: ${DEMO_CONTACTS.length} contacts written to ${baseUrl}/contacts`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
