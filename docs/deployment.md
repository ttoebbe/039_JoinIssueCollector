# Deployment — Join Issue Collector

How the site gets onto the subdomain **`join.thomas-toebbe.de`**: what goes
live, how a deploy runs, and what to check afterwards.

The site runs on a self-hosted web server that GitHub never reaches. A deploy
is a button in GitHub Actions: it checks the commit and sets a release mark,
and the server fetches the mark and the files from this public repository
itself. The server side lives in a private infrastructure repository, not
here. There is **no build step** — the files in the repository are the files
that go online.

How the web server, n8n and Firebase relate to each other is shown in the
[*Architecture*](../README.md#architecture) section of the README. This file
only covers the path to the web server; the n8n side is described in
[`n8n-setup.md`](n8n-setup.md).

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
in the server's deploy script and into the check of
[`deploy.yml`](../.github/workflows/deploy.yml)**. Conversely, if one of the five is missing from the commit,
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
| Mark | The **Deploy** workflow sets a new annotated tag `live-site` on the commit once its checks pass. Every run makes a new tag object, so the same commit can go live again. |
| Fetch | Every two minutes the server asks this repository over HTTPS for `live-site`. A tag object it has not handled yet is a deploy: it fetches the commit via git. The repository is public, so no key and no token are needed — there is no deploy secret. |
| Release | The five entries of the chosen commit are unpacked into a release directory of their own, one per commit. |
| Switch | The live site is a link to one release directory. The deploy changes it in one atomic step: a visitor sees either the old or the new state, never a half-copied one. |
| Keep | The most recent releases stay on the server, so going back does not depend on the old files having survived anywhere else. |
| Report | The release holds `release.txt` with the commit and the mark. The Deploy run waits until `https://join.thomas-toebbe.de/release.txt` names its mark, so green means live. |

A failing deploy is tried three times, then the server waits for the next
mark. A commit shipped by the operator by hand stays live until the next run
of the workflow.

Because the server fetches from GitHub, **only pushed commits can be rolled
out**. A commit that exists only locally is not found, and the run aborts
before anything changes.

---

## 3. How to deploy

A deployment is a decision, not a side effect of a push: there is no push
trigger, and the server only acts on a mark the workflow set. The order is
always:

1. Merge into `main` and **push**.
2. GitHub → **Actions** → **Deploy** → **Run workflow**, from the browser or
   the GitHub app. Target `site`; leave `commit` empty for the newest `main`,
   or give the hash of a commit on `main`.
3. The run checks the five entries, `index.html` and `js/core/constants.js`,
   and only then sets the mark. It turns green once the live site names the
   mark, after about three minutes. Red before the mark means nothing
   changed.
4. Run the checks from section 4.

To go back, run **Deploy** with the hash of the previous commit — the same
button, nothing else.

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

## 6. Firebase — API key and sign-in methods

[`../js/core/auth-service.js`](../js/core/auth-service.js) signs in through
the Firebase Authentication REST API with the web API key from
`AUTH_CONFIG` in [`../js/core/constants.js`](../js/core/constants.js). The key
belongs to the web app "Join V2" registered in the project; it identifies the
project and grants nothing by itself.

The project needs two sign-in methods, both under **Authentication → Sign-in
method** in the Firebase console: **Email/Password** for members and
**Anonymous** for the guest login.

There is no authorized-domain list to maintain: it only applies to OAuth
redirects, and Join signs in with email and password over REST. An HTTP
referrer restriction on the key is possible but not set up.

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

**Only signed-in sessions get through.** `tasks` and `contacts` need
`auth != null`; every member and every guest session has that. A record under
`users/<uid>` is readable and writable only by its own account, and only with
the fields `id`, `name`, `email` and `color` — `$other` rejects anything
else, so no password data can land there again.

The login no longer reads the user list. Firebase Authentication checks
email and password, and the page then loads only its own profile.

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
| Sign up, then log in | `users/<uid>` accepts the new profile and releases it to its owner |
| Guest login | the anonymous session gets through `auth != null` |
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

