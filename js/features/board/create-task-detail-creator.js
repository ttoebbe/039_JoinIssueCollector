/**
 * Creates the creator block for the task detail overlay: the member/extern
 * badge on its own line, followed by the "Creator:" row. Returns null for
 * legacy tasks that carry no creator record.
 * @param {Object} task
 * @returns {HTMLElement|null}
 */
function createCreatorRow(task) {
  const creator = task?.createdBy;
  if (!creator?.name) return null;
  const wrap = document.createElement("div");
  wrap.className = "task-detail-creator";
  wrap.appendChild(createCreatorBadge(creator));
  wrap.appendChild(createCreatorLine(creator));
  return wrap;
}

/**
 * Creates the row holding the label, the creator name and the follow-up
 * action.
 * @param {Object} creator
 * @returns {HTMLElement}
 */
function createCreatorLine(creator) {
  const row = document.createElement("div");
  row.className = "task-detail-creator-row";
  row.appendChild(createCreatorLabel());
  row.appendChild(createCreatorName(creator));
  const action = createCreatorAction(creator);
  if (action) row.appendChild(action);
  return row;
}

/**
 * Creates the label of the creator row.
 * @returns {HTMLElement}
 */
function createCreatorLabel() {
  const label = document.createElement("span");
  label.className = "task-detail-creator-label";
  label.textContent = "Creator:";
  return label;
}

/**
 * Creates the badge that tells a team member from an external requester.
 * Anything other than "extern" counts as a member.
 * @param {Object} creator
 * @returns {HTMLElement}
 */
function createCreatorBadge(creator) {
  const type = creator?.type === "extern" ? "extern" : "member";
  const badge = document.createElement("span");
  badge.className = "task-detail-creator-badge";
  badge.dataset.type = type;
  badge.appendChild(createCreatorBadgeIcon(type));
  badge.appendChild(document.createTextNode(getCreatorTypeLabel(type)));
  return badge;
}

/**
 * Creates the icon of the creator badge.
 * @param {string} type
 * @returns {HTMLImageElement}
 */
function createCreatorBadgeIcon(type) {
  const icon = document.createElement("img");
  icon.src = "/assets/icons/creator-badge-" + type + ".svg";
  icon.alt = "";
  return icon;
}

/**
 * Maps a creator type to its badge label.
 * @param {string} type
 * @returns {string}
 */
function getCreatorTypeLabel(type) {
  return type === "extern" ? "Extern" : "Member";
}

/**
 * Creates the creator name element.
 * @param {Object} creator
 * @returns {HTMLElement}
 */
function createCreatorName(creator) {
  const name = document.createElement("span");
  name.className = "task-detail-creator-name";
  name.textContent = creator?.name || "";
  return name;
}

/**
 * Creates the action next to the creator: an email link for external
 * requesters, the contacts page for members. Labels follow the design
 * ("E-mail" / "Profil"). Guest sessions store an empty email, so they get
 * no action at all.
 * @param {Object} creator
 * @returns {HTMLAnchorElement|null}
 */
function createCreatorAction(creator) {
  if (!creator?.email) return null;
  const isExtern = creator.type === "extern";
  const link = document.createElement("a");
  link.className = "task-detail-creator-action";
  link.dataset.type = isExtern ? "extern" : "member";
  link.href = isExtern ? "mailto:" + creator.email : "/html/pages/contacts.html";
  link.appendChild(createCreatorActionIcon());
  link.appendChild(document.createTextNode(isExtern ? "E-mail" : "Profil"));
  return link;
}

/**
 * Creates the icon of the creator action. The glyph is applied via CSS mask
 * so it follows the link's text color in default and hover state.
 * @returns {HTMLElement}
 */
function createCreatorActionIcon() {
  const icon = document.createElement("span");
  icon.className = "task-detail-creator-action-icon";
  icon.setAttribute("aria-hidden", "true");
  return icon;
}
