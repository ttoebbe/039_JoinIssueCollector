# Deployment — Join Issue Collector

How the site gets onto the subdomain **`join.thomas-toebbe.de`**: what is
uploaded, which secrets the workflow needs, and what to check after the first
deploy.

The workflow lives in
[`../.github/workflows/deploy-frontend.yml`](../.github/workflows/deploy-frontend.yml)
and uploads the files to the Hetzner web space via SFTP. There is **no build
step** — the files in the repository are the files that go online.

How web hosting, the n8n VPS and Firebase relate to each other is shown in the
[*Architecture*](../README.md#architecture) section of the README. This file
only covers the path to the web hosting; the n8n side is described in
[`n8n-setup.md`](n8n-setup.md).

---

## 1. What gets deployed — and what does not

The workflow does not mirror the repository. It first copies exactly five
entries into a staging directory and uploads **only that**:

```
index.html
html/
css/
js/
assets/
```

This is an **allowlist, not an exclusion list** — deliberately:

- A build-based project would mirror its cleanly separated build folder. Join
  has none. Mirroring the repository root would put `.git/`, `docs/`, `n8n/`,
  `database.rules.json` and `firebase.json` onto the web space.
- An exclusion list ages badly: whatever is added to the repository later would
  automatically go online until someone remembers to exclude it. With an
  allowlist it is the other way round — new things stay offline until they are
  added here.

**If a sixth folder is added that should be served, it must go into the list
in the workflow.** Conversely, if one of the five is missing from the checkout,
the run aborts instead of uploading an incomplete site. After copying, the
workflow additionally verifies that `index.html` and `js/core/constants.js`
really are in the staging directory.

The upload runs with `lftp mirror --reverse --delete`: files missing from
staging disappear from the server. That keeps old states cleanly out of the
way — and is the reason for the safety check in section 2.

### No `.htaccess`

Join is **not** a single-page application. These are real HTML files under real
paths, there are no client routes and therefore nothing to rewrite. No
`.htaccess` is needed and the workflow does not create one.

The HTTPS question is settled: the hoster enforces HTTPS itself —
`http://join.thomas-toebbe.de` answers `301 Moved Permanently` to the HTTPS
URL (verified 2026-08-27). Should an `.htaccess` ever become necessary after
all, it must live as a file in the repository **and** in the allowlist,
otherwise the next `--delete` mirror removes it again.

---

## 2. The secrets

All of them as **repository secrets** (no GitHub environment).

| Name | Required | Form | Source |
|---|---|---|---|
| `SFTP_HOST` | yes | hostname of the web space — no `sftp://`, no path | konsoleH → *Product overview* → *FTP main user*, field **Server** |
| `SFTP_USER` | yes | login name of the FTP account | konsoleH → *Product overview* → *FTP main user*, field **Login name** |
| `SFTP_PORT` | no | `22` | only set if the hoster specifies a different port. Without the secret the workflow uses 22 |
| `SFTP_REMOTE_DIR` | yes | `/public_html/join` — the document root of `join.thomas-toebbe.de`, absolute path | konsoleH, confirmed via the WebFTP breadcrumb. Background below |
| `SFTP_PASSWORD` | one of the two | the SFTP user's password | password manager |
| `SFTP_KEY` | one of the two | complete private key including the `-----BEGIN …-----`/`-----END …-----` lines | password manager. The public part must be registered with the hoster |

**`SFTP_HOST` and `SFTP_USER` are deliberately not spelled out here.** This
repository is public, and both values are part of the SFTP login — together
with the password they would form a complete set of credentials. They belong
in the secrets, not in the documentation; the *Source* column says where to
find them instead.

If a required secret is missing, the run aborts in the very first step and
names **which** one. The same happens if neither `SFTP_PASSWORD` nor
`SFTP_KEY` is set. If both are present, the key wins.

### `SFTP_REMOTE_DIR` — never the account root

The value must point to the **document directory of the subdomain**, i.e. the
directory where `index.html` should end up. It is recognizable by matching the
subdomain's name or by being listed as its document root in the hosting
administration — with several subdomains on one account they usually sit next
to each other as sibling directories.

**The account root would be wrong, with severe consequences:** the upload runs
with `--delete`. If the target points to the level above the subdomains, the
first run deletes everything that does not belong to Join — that is, the other
subdomains of the same account.

That is why the workflow checks the value before uploading anything: it must
be an absolute path with at least one segment below the root. `/`, an empty
value or a relative path abort the run. This check catches an *obviously* too
vague value — it cannot know whether a specific path is the right one. **Look
the path up in the hosting administration once, do not guess.**

### Setting the secret from Git Bash — the MSYS trap

Anyone setting the value via CLI instead of the web UI walks into a silent
trap on Windows. **Git Bash (MSYS) converts arguments that look like Unix
paths into Windows paths before a native `.exe` even sees them.** So

```bash
gh secret set SFTP_REMOTE_DIR --body "/public_html/join"
```

ends up as `C:/Program Files/Git/public_html/join` in the secret. `gh` reports
**exit 0**, and `gh secret list` shows only names and timestamps, no values —
the mistake stays invisible until the workflow runs.

The safe route is via stdin, where no conversion applies:

```bash
printf '%s' "/public_html/join" | gh secret set SFTP_REMOTE_DIR --repo ttoebbe/039_JoinIssueCollector
```

Exactly this case occurred on the first deploy, and **the safety check above
caught it**: the mangled value starts with `C:` instead of `/`, the run
aborted before the first `lftp` call started. No `--delete` ever ran against a
wrong target — which is why the check exists in the workflow.

### Click path for creating secrets

GitHub → repository → *Settings* → *Secrets and variables* → *Actions* →
*New repository secret*. Enter name and value, *Add secret*. Once per secret.

The name must be written **exactly** as in the table, including
capitalization. A typo in the name looks like a missing secret.

---

## 3. How to deploy

The workflow has **only** `workflow_dispatch` as its trigger — no push
trigger. A commit on `main` therefore does not change the live site; a
deployment is a decision, not a side effect of committing.

GitHub → repository → *Actions* tab → *Deploy frontend* on the left →
*Run workflow* on the right → choose branch (`main`) → *Run workflow*.

Two simultaneous runs would get in each other's way. They therefore wait for
each other instead of cancelling one another — an aborted mirror leaves a
half-uploaded site behind.

---

## 4. Checks after the first deploy

On `https://join.thomas-toebbe.de`, with the browser console open:

| What | Expectation |
|---|---|
| Landing page | loads with images and fonts. If they are missing, `assets/` was not uploaded |
| Daily counter | *Create request* shows the **real** count, e.g. `1 of 10` — not a stubborn `0 of 10` |
| Board | log in, board loads the tasks from Firebase, Triage column is present |
| Legal pages | *Legal notice* and *Privacy policy* are reachable |
| Console | no 404 on `/css/…`, `/js/…`, `/assets/…`; no CORS message |

All paths in the project are absolute (`/css/…`, `/js/…`, `/assets/…`). That
only works if the site sits in the **document root** of the subdomain and not
in a subdirectory — a wrong `SFTP_REMOTE_DIR` shows up here as a page without
any styling.

The counter is the only item that can fail even with perfectly uploaded
files: it comes from n8n, see the next section.

---

## 5. CORS — checked, nothing to do

Two n8n workflows are called from the browser and carry their origin list in
the webhook node under `options.allowedOrigins`. If the live domain is not in
there, the browser discards the response even though the call itself goes
through — everything works locally, nothing works live.

Both files were re-checked for this deployment:

| File | `allowedOrigins` | `https://join.thomas-toebbe.de` included |
|---|---|---|
| [`../n8n/status-notify.workflow.json`](../n8n/status-notify.workflow.json) | `https://join.thomas-toebbe.de,http://127.0.0.1:5500,http://localhost:5500,http://localhost:8080` | **yes** |
| [`../n8n/quota-status.workflow.json`](../n8n/quota-status.workflow.json) | the same list | **yes** |

**So there is nothing to add.** The three `localhost` entries are the local
development addresses and stay in deliberately.

Note: the list in the repository is the export. What counts is what the
**running** n8n instance holds. If the counter misbehaves live even though
the endpoint answers via `curl`, this is the first place to look —
[`n8n-setup.md`](n8n-setup.md), sections 9.4 and 10.4.

---

## 6. Firebase — nothing to adjust

The project plan lists "adjust key referrer and authorized domain for the
production subdomain" for this phase. **That does not apply to Join.**

[`../js/core/firebase-service.js`](../js/core/firebase-service.js) talks to
the Realtime Database via REST and builds the URL as
`${API_CONFIG.BASE_URL}/${path}.json` — **without an API key**. There is
neither a key with a referrer restriction nor Firebase Auth with a domain
allowlist that would need the new subdomain. The item is dropped entirely.

What actually limits access are the rules in
[`../database.rules.json`](../database.rules.json); see
[`n8n-setup.md`](n8n-setup.md), section 4.

The database URL is set in
[`../js/core/constants.js`](../js/core/constants.js) and ships with the
site — which is why the workflow verifies that this file is in staging.

---

## 7. Publishing the database rules

[`../database.rules.json`](../database.rules.json) lives in the repository,
but **no automation publishes it**. The file is the template; it only takes
effect once its content has been published in the Firebase console.

### 7.1 The procedure

1. Open [console.firebase.google.com](https://console.firebase.google.com)
   and sign in.
2. Choose the project of the V2 database — it is the one whose database URL
   is set in [`../js/core/constants.js`](../js/core/constants.js)
   (`joinv2withn8n-default-rtdb…`, region `europe-west1`).
3. Choose **Build → Realtime Database** on the left. If the project has
   several database instances, select the right one at the top — the URL must
   match `API_CONFIG.BASE_URL`.
4. Open the **Rules** tab.
5. Paste the **complete** content of `database.rules.json` into the editor,
   replacing what is there. No manual merging — the file in the repository is
   the authoritative state.
6. Click **Publish**. The editor reports syntax errors beforehand; if the
   button does not become active, the pasted text is incomplete.
7. Then run the checks from 7.4.

The rules take effect immediately, reloading the page is enough. A frontend
deploy is **not** required for this — the two are separate paths.

### 7.2 The same procedure via the CLI

Anyone who prefers not to touch the console can publish the rules locally.
This is **no substitute** for 7.1 but the second door to the same file — both
publish exactly the content of `database.rules.json`.

```bash
npm install -g firebase-tools   # once
firebase login                  # interactive, no token needed
firebase deploy --only database
```

The two files the CLI needs for this sit in the repository root and are
checked in:

- [`../firebase.json`](../firebase.json) — points to `database.rules.json`
- [`../.firebaserc`](../.firebaserc) — carries the project ID `joinv2withn8n`

Neither contains anything secret: the project ID is part of the database URL
in [`../js/core/constants.js`](../js/core/constants.js), which ships with the
frontend anyway. They still never reach the web space — the deploy workflow's
allowlist only knows the five entries from section 1.

After the deploy, run the same checks as after the console route, section 7.4.

### 7.2.1 Why this does not move into the GitHub Action

`firebase login` is interactive and does not work in a CI run. The action
would instead need a Firebase token with write access to the database, stored
as a secret **in a public repository** — for a file that practically never
changes: the rules depend on the status values and the priority field, and
those have been stable since phase 2.

The local route needs no secret. The login state lives on Thomas's machine,
not in the repository. Should a second reason to deploy against Firebase
regularly appear later, the decision is to be re-evaluated.

### 7.3 What the rules do — and what they do not

The core in three sentences; the detailed reasoning is in
[`n8n-setup.md`](n8n-setup.md), section 4.

**`.read` stays `true`.** The frontend talks to the database without
authentication — Join has no Firebase Auth and checks the login itself
against the `users` node. There is no `auth` object a rule could test
against; a read ban would break the login immediately. This is the
documented compromise, not negligence.

**`.write` is no longer global but per node.** `tasks` and `contacts` stay
open — both are written from the unauthenticated frontend, nothing changes
there. `users` gets a tighter rule:

```
"users": { "$userId": { ".write": "!data.exists() || !newData.exists()" } }
```

It allows **creating** a record (`!data.exists()`) and **deleting** it
(`!newData.exists()`, so test accounts can still be removed from the
console), but forbids **modifying** an existing one. An attacker who knows
the database URL — it is in `constants.js` and therefore in the public
repository — cannot take over someone else's account by overwriting its
`pwHash`.

**The global `.write: true` had to go for this.** In the Realtime Database,
write rules cascade downwards: once access is granted at a higher level, the
rules below are not evaluated at all. A `.write` at the root would have made
the `users` rule ineffective. That is why the write permission now hangs on
`tasks` and `contacts` individually.

Sign-up is unaffected: `UserService.create` writes via `PUT` to `users/<id>`
with a freshly assigned ID, where nothing exists yet — `!data.exists()`
matches. There is one side effect after all: should the ID assignment in
`generateNextUserId` ever land on an already taken ID, registration now fails
instead of silently overwriting the foreign record. That is the intended
direction.

The field-level `.validate` rules on `users` limit `name` and `email` in
length and require strings for `pwHash` and `pwSalt` — the same garbage brake
as on `tasks`.

**The `.validate` rules catch faulty writes from the browser** — wrong status
values, an unknown priority, a `createdAt` as text. They are a garbage brake,
not access control.

**They have no effect on n8n.** The workflow writes with a service account
token, which the Realtime Database treats as admin access that bypasses all
rules. What comes out of the automation is checked solely by the code node
`Map AI answer` in
[`../n8n/issue-collector.workflow.json`](../n8n/issue-collector.workflow.json).

### 7.4 The test after publishing

On `https://join.thomas-toebbe.de`, with the browser console open. Four
steps, because together they write every validated field once:

| Step | Verifies |
|---|---|
| Log in | `.read` on `users` is open |
| Create a task (*Add task*) | `status`, `prio`, `source`, `aiGenerated`, `createdAt` in one go |
| Drag a task to another column | `status` when the whole task is written back |
| Create a contact | write access outside of `tasks` |

A violation shows up as a red toast "Connection error. Try again." and in the
console as `Firebase Error (400)` with the text of the rejected rule —
[`../js/core/firebase-service.js`](../js/core/firebase-service.js) logs the
response before the toast appears.

**If something breaks, a `.validate` rule is too strict.** Then **remove**
the affected rule and report the case — do not water the pattern down until
it barely passes. A rule that is only almost right is worse than none: it
creates the impression of a check that no longer exists.

### 7.5 The known pitfall: `prio` and the legacy values

Two places in the frontend still catch the V1 values `high` and `alta`:

- [`../js/features/board/render-cards-prio.js`](../js/features/board/render-cards-prio.js),
  lines 82–83
- [`../js/features/summary/summary.js`](../js/features/summary/summary.js),
  line 40

Both values are **not** allowed by the rule — `prio` only permits `urgent`,
`medium` and `low`. For a legacy task with `prio: "high"` that would mean:
displaying works, **moving does not.** On a column change the board writes
the **whole** task back via `TaskService.update` with a `PUT` (see
`persistStatusChange` in
[`../js/features/board/draganddrop.js`](../js/features/board/draganddrop.js)),
including the unchanged `prio` — and Firebase rejects the entire operation,
not just the one field.

**There are no such tasks in the V2 database**; the V1 data was deliberately
not imported. The item is still documented here because it strikes exactly
when someone later imports V1 tasks: the import itself would go through, the
moving would only fail afterwards.
