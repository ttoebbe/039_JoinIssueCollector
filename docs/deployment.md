# Deployment — Join Issue Collector

How the site gets onto the subdomain **`join.thomas-toebbe.de`**: what goes
live, how a deploy runs, and what to check afterwards.

The site runs on a self-hosted web server. The server fetches the files from
this public repository itself; the deploy script lives in a private
infrastructure repository, not here. There is **no build step** — the files
in the repository are the files that go online.

How the web server, n8n and Firebase relate to each other is shown in the
[*Architecture*](../README.md#architecture) section of the README. This file
only covers the path to the web server; the n8n side is described in
[`n8n-setup.md`](n8n-setup.md).

> **Legacy route, will be removed.** Until October 2026 the site was
> uploaded to a Hetzner web space via SFTP by
> [`../.github/workflows/deploy-frontend.yml`](../.github/workflows/deploy-frontend.yml).
> The workflow and its `SFTP_*` secrets stay until the old web space for
> `join` is dismantled. Section 8 documents them until then.

---

## 1. What gets deployed — and what does not

The deploy does not mirror the repository. It unpacks exactly five entries
of the chosen commit and puts **only those** online:

```
index.html
html/
css/
js/
assets/
```

This is an **allowlist, not an exclusion list** — deliberately:

- A build-based project would ship its cleanly separated build folder. Join
  has none. Shipping the repository root would put `.git/`, `docs/`, `n8n/`,
  `database.rules.json` and `firebase.json` onto the web server.
- An exclusion list ages badly: whatever is added to the repository later would
  automatically go online until someone remembers to exclude it. With an
  allowlist it is the other way round — new things stay offline until they are
  added here.

**If a sixth folder is added that should be served, it must go into the list
in the deploy script** — and, as long as it exists, into the legacy workflow
from section 8. Conversely, if one of the five is missing from the commit,
the run aborts instead of rolling out an incomplete site. After unpacking,
the script additionally verifies that `index.html` and
`js/core/constants.js` really are there.

### No `.htaccess`, no rewrites

Join is **not** a single-page application. These are real HTML files under real
paths, there are no client routes and therefore nothing to rewrite. The web
server delivers the files as they are and redirects HTTP to HTTPS itself
(`301`). An `.htaccess` in the repository would have no effect.

---

## 2. How the server rolls out

| Step | What happens |
|---|---|
| Fetch | The server fetches `main` from this repository via git over HTTPS. The repository is public, so no key and no token are needed — there is no deploy secret. |
| Release | The five entries of the chosen commit are unpacked into a release directory of their own, one per commit. |
| Switch | The live site is a link to one release directory. The deploy changes it in one atomic step: a visitor sees either the old or the new state, never a half-copied one. |
| Keep | The most recent releases stay on the server, so going back does not depend on the old files having survived anywhere else. |

Because the server fetches from GitHub, **only pushed commits can be rolled
out**. A commit that exists only locally is not found, and the run aborts
before anything changes.

---

## 3. How to deploy

A deployment is a decision, not a side effect of a push: there is no push
trigger and nothing that fetches on its own. The order is always:

1. Merge into `main` and **push**.
2. Start the deploy via SSH from the workstation. Command and host are in the
   private infrastructure repository. Without an argument it rolls out the
   latest `main`, with a commit hash exactly that commit.
3. Run the checks from section 4.

To go back, roll out the previous commit by its hash — the same command,
nothing else.

---

## 4. Checks after a deploy

On `https://join.thomas-toebbe.de`, with the browser console open:

| What | Expectation |
|---|---|
| Landing page | loads with images and fonts. If they are missing, `assets/` was not rolled out |
| Daily counter | *Create request* shows the **real** count, e.g. `1 of 10` — not a stubborn `0 of 10` |
| Board | log in, board loads the tasks from Firebase, Triage column is present |
| Legal pages | *Legal notice* and *Privacy policy* are reachable |
| Console | no 404 on `/css/…`, `/js/…`, `/assets/…`, `/webhook/…`; no CORS message |

All paths in the project are absolute (`/css/…`, `/js/…`, `/assets/…`). That
only works because the site sits in the **document root** of the subdomain
and not in a subdirectory — otherwise the page would show up without any
styling.

The counter is the only item that can fail even with a perfectly rolled-out
site: it comes from n8n through the web server, see the next section.

---

## 5. Webhooks and CORS

The page calls two n8n webhooks, and both run through the site's own origin:

```
https://join.thomas-toebbe.de/webhook/join-status
https://join.thomas-toebbe.de/webhook/join-quota
```

The web server passes exactly these two paths on to n8n, nothing else. Live,
page and webhooks share one origin, so the **browser applies no CORS** at
all.

The CORS lists in the two workflows still matter — for local development. A
page served from `localhost` calls the same absolute URLs, which is a
cross-origin request, and the browser only hands over the response if the
local address is in the list. Both workflows carry it in the webhook node
under `options.allowedOrigins`:

| File | `allowedOrigins` |
|---|---|
| [`../n8n/status-notify.workflow.json`](../n8n/status-notify.workflow.json) | `https://join.thomas-toebbe.de,http://127.0.0.1:5500,http://localhost:5500,http://localhost:8080` |
| [`../n8n/quota-status.workflow.json`](../n8n/quota-status.workflow.json) | the same list |

**So there is nothing to add.** The three `localhost` entries are the local
development addresses and stay in deliberately; the live domain does no harm.

Note: the list in the repository is the export. What counts is what the
**running** n8n instance holds — [`n8n-setup.md`](n8n-setup.md), sections
9.4 and 10.4.

If the counter shows a stubborn `0 of 10` live, open
`https://join.thomas-toebbe.de/webhook/join-quota` directly in the browser:

| Answer | Cause |
|---|---|
| `{"limit":10,"used":…}` | n8n and the web server are fine — look at the page and its console |
| `404` | the web server does not pass the path on, or the workflow is not active |
| `502` or `504` | the web server does not reach n8n |

The page itself never shows these errors: it falls back to `0 used` and
stays usable ([`n8n-setup.md`](n8n-setup.md), section 10.6).

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
site — which is why the deploy verifies that this file is there.

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
frontend anyway. They still never go online — the deploy's allowlist only
knows the five entries from section 1.

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

---

## 8. Legacy route: GitHub Actions via SFTP — will be removed

[`../.github/workflows/deploy-frontend.yml`](../.github/workflows/deploy-frontend.yml)
uploads the five entries from section 1 via SFTP to the Hetzner web space
that served the site until October 2026. **It no longer changes the live
site:** `join.thomas-toebbe.de` does not point to that web space anymore.
The workflow and its secrets stay only until the old web space for `join` is
dismantled; then both are removed. Until then the following applies,
unchanged.

### 8.1 Trigger and upload

The workflow has **only** `workflow_dispatch` as its trigger: GitHub →
repository → *Actions* tab → *Deploy frontend* → *Run workflow* → branch
`main`. Two simultaneous runs wait for each other instead of cancelling one
another — an aborted mirror leaves a half-uploaded site behind.

It copies the five entries into a staging directory and uploads them with
`lftp mirror --reverse --delete`: files missing from staging disappear from
the server. That is the reason for the safety check in 8.3.

### 8.2 The secrets

All of them as **repository secrets** (no GitHub environment).

| Name | Required | Form | Source |
|---|---|---|---|
| `SFTP_HOST` | yes | hostname of the web space — no `sftp://`, no path | konsoleH → *Product overview* → *FTP main user*, field **Server** |
| `SFTP_USER` | yes | login name of the FTP account | konsoleH → *Product overview* → *FTP main user*, field **Login name** |
| `SFTP_PORT` | no | `22` | only set if the hoster specifies a different port. Without the secret the workflow uses 22 |
| `SFTP_REMOTE_DIR` | yes | `/public_html/join` — the document root of `join` on the web space, absolute path | konsoleH, confirmed via the WebFTP breadcrumb. Background in 8.3 |
| `SFTP_PASSWORD` | one of the two | the SFTP user's password | password manager |
| `SFTP_KEY` | one of the two | complete private key including the `-----BEGIN …-----`/`-----END …-----` lines | password manager. The public part must be registered with the hoster |

**`SFTP_HOST` and `SFTP_USER` are deliberately not spelled out here.** This
repository is public, and both values are part of the SFTP login — together
with the password they would form a complete set of credentials.

If a required secret is missing, the run aborts in the very first step and
names **which** one. The same happens if neither `SFTP_PASSWORD` nor
`SFTP_KEY` is set. If both are present, the key wins.

### 8.3 `SFTP_REMOTE_DIR` — never the account root

The value must point to the **document directory of the subdomain**, i.e. the
directory where `index.html` should end up. **The account root would be
wrong, with severe consequences:** the upload runs with `--delete`. If the
target points to the level above the subdomains, the run deletes everything
that does not belong to Join — that is, the other subdomains of the same
account.

That is why the workflow checks the value before uploading anything: it must
be an absolute path with at least one segment below the root. `/`, an empty
value or a relative path abort the run. This check catches an *obviously* too
vague value — it cannot know whether a specific path is the right one.

### 8.4 Setting a secret from Git Bash — the MSYS trap

**Git Bash (MSYS) converts arguments that look like Unix paths into Windows
paths before a native `.exe` even sees them.** So

```bash
gh secret set SFTP_REMOTE_DIR --body "/public_html/join"
```

ends up as `C:/Program Files/Git/public_html/join` in the secret. `gh` reports
**exit 0**, and `gh secret list` shows only names and timestamps, no values —
the mistake stays invisible until the workflow runs. The safe route is via
stdin, where no conversion applies:

```bash
printf '%s' "/public_html/join" | gh secret set SFTP_REMOTE_DIR --repo ttoebbe/039_JoinIssueCollector
```

Exactly this case occurred on the first deploy, and the safety check from 8.3
caught it: the mangled value starts with `C:` instead of `/`, the run aborted
before the first `lftp` call started.
