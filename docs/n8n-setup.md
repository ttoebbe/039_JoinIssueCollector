# n8n setup — Join Issue Collector

How the Join workflows get into the running n8n instance, how they write to
Firebase, and what to watch out for next to Code a Cuisine.

This file describes the procedure. It does not execute it: creating the
service account, publishing the rules, creating the credential and the write
test are manual work on the running environment.

The click path for publishing the rules is described in
[`deployment.md`](deployment.md#7-publishing-the-database-rules), section 7.
The big picture — web hosting, VPS, Firebase — is in the
[*Architecture*](../README.md#architecture) section of the README.

---

## 1. Starting point

The Join workflows get **no server of their own**. They run in the existing
n8n instance at `n8n.thomas-toebbe.de` on the Code a Cuisine VPS, alongside
the workflows already there.

| | |
|---|---|
| Host | Hetzner CPX12, Ubuntu 26.04 |
| Stack | `/opt/code-a-cuisine/` — Caddy + n8n via Docker Compose |
| n8n UI | **not public** — Caddy only lets `/webhook/*` through, port 5678 binds to loopback |
| UI access | exclusively via SSH tunnel |

Commands against the container always from `/opt/code-a-cuisine/` and always
via Compose:

```bash
cd /opt/code-a-cuisine
docker compose exec n8n <command>
```

A bare `docker exec n8n …` fails there — the container has a different name,
Compose builds it from project and service name.

SSH tunnel to the UI:

```bash
ssh -L 5680:localhost:5678 root@<vps>
# then in the browser: http://localhost:5680
```

There is deliberately **no** separate `n8n/deploy/` with `docker-compose.yml`
and `Caddyfile` for Join. It would mean a second stack next to the existing
one — two n8n instances, two Caddy configurations, a port conflict. The
project plan originally envisaged that and later decided to keep using the
existing VPS; this documentation replaces the deploy structure.

---

## 2. Write access to Firebase

n8n writes the tickets to the Realtime Database via REST. Access runs through
a **Google service account** whose token n8n fetches and renews itself. No
JWT crafting in a code node, no long-lived secret in the workflow JSON.

### 2.1 Creating the service account

Create a service account in the Google Cloud project of the V2 database and
download the JSON key.

> **The JSON file does not belong anywhere in the repo** — not as a file, not
> as a text block in this documentation, not even in excerpts. It lives
> exclusively in n8n's credential store, i.e. in the Docker volume.
> `.gitignore` catches the usual file names, but that is nothing to rely on:
> the key is stored outside the repo folder.

### 2.2 Creating the credential in n8n

Type **Google Service Account**.

1. Enter `client_email` and `private_key` from the downloaded JSON. The key
   contains `\n` sequences — paste them the way n8n expects them in the field.
2. **Enable "Set up for use in HTTP Request node".** Without this switch the
   credential does not appear in the HTTP request node.
3. Enter both scopes — Firebase requires exactly these two:

```
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/firebase.database
```

### 2.3 Using it in the workflow

In the HTTP request node:

**Authentication → Predefined Credential Type → Google Service Account**

n8n attaches the token as `Authorization: Bearer <token>` and renews it on
its own when it expires.

Target URL and method for a ticket:

```
PUT https://joinv2withn8n-default-rtdb.europe-west1.firebasedatabase.app/tasks/<id>.json
```

`PUT` writes the record completely under the self-assigned ID. That is
intended — the workflow knows all fields of the new ticket.

---

## 3. Why not the database secret

The Realtime Database knows a second route: the legacy database secret as a
query parameter, `?auth=SECRET`. It is shorter and still wrong here.

Firebase explicitly lists database secrets as **deprecated** and advises
against them: they are long-lived credentials without expiry and without
restriction — whoever has one has full access to the entire database until
it is manually revoked. It would also sit in the URL and therefore in plain
text in every log and every workflow export.

The service account token expires after an hour and is re-fetched by n8n. If
it falls victim to a log, the damage is limited in time.

Source: Firebase documentation, *Database Secrets* (deprecated) and
*Authenticate REST Requests with a Service Account*.

---

## 4. The rules compromise

**The rules stay largely open.** `.read` is `true` in
[`../database.rules.json`](../database.rules.json), `.write` is open on
`tasks` and `contacts`. How the file gets into the database is described in
[`deployment.md`](deployment.md#7-publishing-the-database-rules), section 7.

The reason is uncomfortable and deserves to be said out loud: the frontend
talks to the Realtime Database **without authentication** — Join's login is a
home-grown check against the `users` node, not Firebase Auth. So there is no
`auth` object a rule could test against. Closing `.read` would break login,
board and contacts immediately and completely.

**There is one exception:** on `users` the rule now only allows creating and
deleting, not modifying an existing record — otherwise anyone who knows the
database URL could take over someone else's account by overwriting its
`pwHash`. The detailed reasoning is in [`deployment.md`](deployment.md),
section 7.3.

The service account changes **nothing** about this. It is the clean route for
the server path and the preparation for closing the rules later — but as long
as the frontend writes unauthenticated, it provides **no access control**.
This is a deliberate demo compromise, not a solved security problem.

### What the rules still accomplish

**Fending off garbage from the browser.** Validated on every task:

| Field | allowed |
|---|---|
| `status` | `triage`, `todo`, `inprogress`, `awaitfeedback`, `done` |
| `prio` | `urgent`, `medium`, `low` |
| `source` | `manual`, `email` |
| `aiGenerated` | boolean |
| `createdAt` | number |

The status values are character for character the same as `TASK_STATUS` in
[`../js/core/constants.js`](../js/core/constants.js). If they diverge,
Firebase silently rejects the page's writes — whenever one of the two places
changes, update the other.

**They have no effect on the workflow's writes.** n8n authenticates with a
service account token, which the Realtime Database treats as admin access
that bypasses all rules — including the `.validate` rules. What the
automation writes is checked solely by the code node `Map AI answer` in
[`../n8n/issue-collector.workflow.json`](../n8n/issue-collector.workflow.json).
That is not an oversight but the flip side of section 3: the same token that
is short-lived and revocable also comes with full rights.

### How it takes effect

`.validate` only applies **to fields that are actually written**. If `prio`
is missing on a legacy task, that does not matter; the rule is simply not
evaluated for that field. A write with `status: "backlog"`, however, is
rejected — the entire operation, not just the one field.

### What would resolve the compromise

Real Firebase Auth in the frontend (anonymous sign-in would suffice to get an
`auth` object) and a dedicated Firebase project for Join. Both are **not part
of this stage** and would touch existing screens, which the project rules say
stay untouched.

---

## 5. Operating next to Code a Cuisine

Two places where the two projects would otherwise get in each other's way.

### 5.1 Its own quota file

Code a Cuisine already writes its daily counter to
`/home/node/.n8n/quota-state.json`. Join must **not** share this file —
otherwise both projects share one quota and block each other.

Join uses, in the same volume:

```
/home/node/.n8n/join-quota-state.json
```

Structure of the file — `system` is the daily counter from the requirements
(10), `perSender` additionally limits a single sender to 3 requests:

```json
{ "day": "2026-08-26", "system": 4, "perSender": { "stakeholder@example.com": 2 } }
```

Resetting, analogous to Code a Cuisine's existing counter:

```bash
cd /opt/code-a-cuisine
docker compose exec n8n rm -f /home/node/.n8n/join-quota-state.json
docker compose exec n8n sh -c 'ls /home/node/.n8n/ | grep -c join-quota-state.json'   # 0 = reset
```

The counter is incremented **before** the AI call, not after the ticket has
been written successfully. A mail the model fails on still costs its slot —
otherwise the limit would not be a cost guard but merely a success statistic.

**Known weakness: the counter is read-modify-write without a lock.** The code
node reads the file, increments the value and writes it back. If two mails
arrive so close together that two workflow runs overlap, both read the same
state and write the same incremented value — one slot then counts only once.
With ten requests a day in a demo that is acceptable; it still should not sit
here as a silent flaw. The clean solution would be a file lock or a counter
in the database instead of the file system.

### 5.2 Its own webhook paths

```
/webhook/join-status    — status notification on column change
/webhook/join-quota     — daily limit for the landing page
```

The `join-` prefix keeps them apart from the Code a Cuisine paths.

Caddy already lets `/webhook/*` through — **nothing additional** needs to be
opened for the Join paths. The Caddy configuration is not touched for Join.

**CORS must be set by each workflow itself.** Caddy does not do it. The
**webhook node** handles it via *Allowed Origins (CORS)* — it thereby also
answers the preflight (`OPTIONS`) itself. **No** CORS headers are to be set
manually on the "Respond to Webhook" node; an earlier version of this section
claimed the opposite, the live test disproved it (section 9.6).

---

## 6. What the issue collector additionally needs on the container

Four items only the issue collector needs and that cannot live in the
workflow. All four are verified on the running system, not assumed.

### 6.1 `NODE_FUNCTION_ALLOW_EXTERNAL=imap`

The IMAP trigger **cannot move** a mail. Its *Action* field knows exactly two
values, "None" and "Mark as Read"; there is no target folder. The
requirements, however, explicitly demand moving twice — to `erledigt` on
successful processing, to `zu-bearbeiten` on failure. So a code node does it,
connecting to the mailbox itself via `require('imap')`.

n8n only loads modules in code nodes that are explicitly allowed:

```yaml
# /opt/code-a-cuisine/docker-compose.yml
environment:
  - NODE_FUNCTION_ALLOW_EXTERNAL=imap
```

`imap@0.8.19` is already in the n8n image, so nothing needs to be installed.
The variable has been set since 2026-08-26 and verified on the container:
`require('imap')` returns `typeof === "function"` there.

Without the allowance, the three `Move mail to …` nodes fail on every run.
Because they are set to `continueOnFail`, this does not show up as a red
workflow — the mails simply stay in the INBOX. Note that the folder name
`zu-bearbeiten` carries a **hyphen**; that is its name in the mailbox, even
though the requirements write "zu bearbeiten".

**The target folders need the namespace prefix `INBOX.`** On this mail server
they are called `INBOX.erledigt` and `INBOX.zu-bearbeiten` — not `erledigt`
and `zu-bearbeiten`. Without the prefix the move aborts:

```
Client tried to access nonexistent namespace
```

The server creates the subfolders below `INBOX`; a name without the prefix
points into a namespace that does not exist for it. The three
`Move mail to …` nodes already carry the prefix in their `TARGET_FOLDER`.

### 6.2 `JOIN_IMAP_USER` and `JOIN_IMAP_PASSWORD`

The same code nodes need credentials. They cannot use an n8n credential —
credentials are only available to configured nodes, not to the code inside
them. They would therefore end up as plain text in the code node, and the
code node is in the workflow export, and the export is in the repository.

So they come from the container's environment:

```yaml
# /opt/code-a-cuisine/docker-compose.yml
environment:
  - JOIN_IMAP_USER=${JOIN_IMAP_USER}
  - JOIN_IMAP_PASSWORD=${JOIN_IMAP_PASSWORD}
```

The values themselves go into the `.env` next to the Compose file — never
into the repository. After the change, `docker compose up -d` from
`/opt/code-a-cuisine`.

The nodes read them via `$env.JOIN_IMAP_USER` and `$env.JOIN_IMAP_PASSWORD`
and throw a descriptive error if either is missing. The prerequisite is
`N8N_BLOCK_ENV_ACCESS_IN_NODE=false`, explicitly set — see section 6.3.

### 6.3 `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`

The variable must be **explicitly present in the Compose file**. If it is
missing, every `$env` access in a code node fails:

```
access to env vars denied
```

The three `Move mail to …` nodes then fail before they even open a
connection — they cannot reach `JOIN_IMAP_USER` and `JOIN_IMAP_PASSWORD`.

```yaml
# /opt/code-a-cuisine/docker-compose.yml, line 52
environment:
  - N8N_BLOCK_ENV_ACCESS_IN_NODE=false
```

That n8n nominally defaults the variable to `false` did not help here:
without the entry, access in the running container was blocked. The line has
been in place since the live test.

### 6.4 SMTP only via port 587

**Hetzner Cloud blocks outgoing ports 25 and 465.** Only **587** is open. The
SMTP credential therefore runs on 587 with **STARTTLS**:

| Credential field | Value |
|---|---|
| Port | `587` |
| SSL/TLS | **off** |
| STARTTLS | on |

With port 465 there is no error message to recognize this by: the send
**hangs** until the workflow's execution timeout strikes. The affected
`Send …` node shows "running" until then, and the run finally aborts at the
timeout rather than at the connection — the cause appears nowhere in the log.

---

## 7. Checks before the first import

Eight items on the container. All eight are set and were verified on the
running container on 2026-08-26.

| # | Check | Why |
|---|---|---|
| 1 | Volume for `/home/node/.n8n` present | done. `docker inspect code-a-cuisine-n8n-1` shows `volume code-a-cuisine_n8n_data … -> /home/node/.n8n`; the container has since survived four restarts without losing credentials or workflows. Without a volume, workflows, credentials and the quota state would be gone after every restart. |
| 2 | `WEBHOOK_URL` set | done. `printenv` in the container returns `https://n8n.thomas-toebbe.de/`. Without the variable, n8n builds webhook URLs against `localhost:5678` — the landing page would get a useless address. |
| 3 | `TZ=UTC` | already set. The daily counter calculates against UTC midnight; a different timezone shifts the reset. |
| 4 | `NODE_FUNCTION_ALLOW_BUILTIN=fs` | already set. Without it the quota guard cannot write the counter file. |
| 5 | `NODE_FUNCTION_ALLOW_EXTERNAL=imap` | set since 2026-08-26. See section 6.1. |
| 6 | `JOIN_IMAP_USER` and `JOIN_IMAP_PASSWORD` | set — the live test logged into the mailbox. See section 6.2. |
| 7 | `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` | set since the live test, `docker-compose.yml` line 52. Without the entry, `$env` fails in code nodes. See section 6.3. |
| 8 | `JOIN_NOTIFY_SECRET` | set since the live test of the status workflow. Must carry the same value as `NOTIFY_CONFIG.SECRET` in the client; if it is missing entirely, the guard node aborts with a descriptive error. See section 9.1. |

This can be verified like so:

```bash
cd /opt/code-a-cuisine
docker compose exec n8n env | grep -E "WEBHOOK_URL|^TZ=|NODE_FUNCTION_ALLOW_|JOIN_IMAP_USER|N8N_BLOCK_ENV_ACCESS_IN_NODE"
docker compose exec n8n env | grep -cE "^JOIN_NOTIFY_SECRET=."   # 1 = set
docker compose config | grep -A5 volumes
```

---

## 8. Import route

Via the **n8n editor**, reachable through the SSH tunnel (see section 1):
*Workflow → Import from File*, choose the JSON from `../n8n/`.

**Not via the CLI.** `n8n import:workflow` sets imported workflows to
inactive; they would have to be activated individually in the UI anyway, and
silent failures slip through easily.

After **every** import, adjust the workflow settings by hand in the editor —
the import does not carry them over and leaves the instance defaults in
place:

| Setting | Value | Why |
|---|---|---|
| **Timeout** | `80` seconds | The issue collector waits for the AI answer; the default is too tight for that. |
| **Timezone** | `UTC` | The daily counter calculates against UTC midnight, a different timezone shifts the reset. |
| **Error workflow** | — | Otherwise an error fails silently. |

Timeout and timezone **are in the JSON** — `settings.executionTimeout: 80`
and `settings.timezone: "Etc/UTC"`. The import still does not read them. So
check both individually after every import instead of relying on the file.

Also to be set after the import, because it is not in the JSON:

- **Re-assign credentials.** The export contains credential references (ID
  and name). If the target instance's IDs do not match, the nodes hang in the
  air without credentials.
- **Check the webhook paths** so they still carry `join-` after the import.
- **Activate the workflow.**

---

## 9. The status workflow

`n8n/status-notify.workflow.json`, webhook `POST /webhook/join-status`. The
board reports every column change there that it has actually saved; the
workflow alone decides whether that becomes an email.

### 9.1 `JOIN_NOTIFY_SECRET`

The third env variable next to `JOIN_IMAP_USER` and `JOIN_IMAP_PASSWORD`. The
guard node reads it via `$env.JOIN_NOTIFY_SECRET` and compares it with the
request's `x-join-secret` header.

```yaml
# /opt/code-a-cuisine/docker-compose.yml
environment:
  - JOIN_NOTIFY_SECRET=${JOIN_NOTIFY_SECRET}
```

The value itself goes into the `.env` next to the Compose file. It must carry
**the same value as `NOTIFY_CONFIG.SECRET`** in
[`../js/core/constants.js`](../js/core/constants.js) — otherwise the guard
rejects every request from the board.

As with the IMAP variables, the prerequisite is
`N8N_BLOCK_ENV_ACCESS_IN_NODE=false` (section 6.3). If the variable is
missing entirely, the guard node throws a descriptive error instead of
silently rejecting everything — otherwise the state "secret not set" would be
indistinguishable from "secret wrong".

### 9.2 Why the secret is not security

`NOTIFY_CONFIG.SECRET` sits in the shipped client code. Anyone who opens the
board in a browser can read it from the dev tools. It keeps out random
requests and scanners, nothing more — it is no access control and must not be
read as one.

What actually protects the endpoint are three properties of the workflow:

| Protection | Effect |
|---|---|
| **Recipient from the database** | The `Fetch task` node loads the ticket record and takes the address from `createdBy.email`. If it came from the request body, the webhook would be an open mail sender: anyone with the secret from the client code could have mails sent to arbitrary addresses. This way the workflow can only write to the creator of an **existing** ticket. |
| **Status check** | `from` and `to` must be two **different** ones of the five valid status values. Invented values and non-changes are thrown out before anything is read. |
| **Cap** | At most **3 mails per ticket per day**. Someone dragging a card back and forth twenty times does not write to the sender twenty times. |

The guard checks in exactly this order: first the secret, then the fields,
then the status values, last the cap. A request without the secret thus never
touches the counter file.

Everything that fails gets the same bare answer — HTTP 403 with
`{ "status": "rejected" }`. The reason only appears in the execution log, not
in the response: a caller should not learn which check they failed.

**The client does not evaluate the response anyway.** `notifyStatusChange`
fires and forgets — if the call fails because n8n is down, the board never
notices. The three responses exist for manual debugging.

### 9.3 Its own counter file

```
/home/node/.n8n/join-notify-state.json
```

The **third** counter file in the same volume, separate from the other two:
`quota-state.json` belongs to Code a Cuisine, `join-quota-state.json` to the
issue collector (section 5.1). Merging them would mean incoming mails and
outgoing status mails share one quota.

Structure — `perTask` counts per ticket ID, `day` is the UTC day:

```json
{ "day": "2026-08-26", "perTask": { "t2": 2, "t7": 1 } }
```

Resetting:

```bash
cd /opt/code-a-cuisine
docker compose exec n8n rm -f /home/node/.n8n/join-notify-state.json
docker compose exec n8n sh -c 'ls /home/node/.n8n/ | grep -c join-notify-state.json'   # 0 = reset
```

The **known weakness from section 5.1 applies here just the same**:
read-modify-write without a lock. Two column changes in the same instant read
the same state and together count only one slot. With three mails per ticket
per day that is acceptable.

### 9.4 CORS

The call comes from the browser, not from a server. The webhook node
therefore lists, under *Allowed Origins (CORS)*, the domains the board is
served from:

```
https://join.thomas-toebbe.de,http://127.0.0.1:5500,http://localhost:5500,http://localhost:8080
```

The last three are the local development addresses: Live Server (5500, under
`127.0.0.1` or `localhost` depending on its settings) and
`python -m http.server 8080` from the [`../README.md`](../README.md).

**This list must be checked against the real deployment.** With the wrong
domain in there, the call fails in the browser while it works via `curl` — a
failure picture that easily misleads, because the workflow runs cleanly in
the execution log and still nothing arrives.

The webhook node answers the preflight itself once the field is filled. There
is **nothing** to retrofit on the respond node (section 5.2).

Nothing to do on Caddy: `/webhook/*` is already allowed through
(section 5.2).

### 9.5 After the import

As with every import (section 8), adjust by hand:

| What | Value |
|---|---|
| Timeout | `80` seconds |
| Timezone | `UTC` |
| Credentials | `Join V2 - Firebase RTDB (Service Account)` on `Fetch task`, `Join V2 - issues (SMTP)` on `Send status mail` |
| Webhook path | `join-status` |

Then activate the workflow. After adding `JOIN_NOTIFY_SECRET` to `.env` and
Compose, the container must restart once (`docker compose up -d`), otherwise
the guard does not know the variable.

### 9.6 Verified on the running system

The workflow is imported, active and tested;
[`../n8n/status-notify.workflow.json`](../n8n/status-notify.workflow.json) is
the export from the running instance. Four items that were still open in the
draft are thereby settled and need **not be re-checked** on the next import:

| Item | Result |
|---|---|
| `typeVersion` of the webhook node | fine. n8n shows no upgrade hint on the node. |
| Key `options.allowedOrigins` | correctly named. The four domains from section 9.4 appear in the *Allowed Origins (CORS)* field after the import. |
| `typeVersion` of the three respond nodes | fine. |
| HTTP 403 on `Respond: rejected` | reaches the caller — the `responseCode` from the node options is passed through. |

The preflight needs nothing extra: the webhook node answers `OPTIONS` itself,
no CORS headers are needed on the respond node. Section 5.2 used to say the
opposite and has been corrected accordingly.

**Live test on the board:**

- A status change on a ticket with an external creator triggers **exactly
  one** mail.
- From the **fourth** change of the same ticket on the same day the cap
  kicks in — no more mail, response 403 (section 9.2).
- A ticket with an internal creator triggers **no** mail; the run ends at
  `Notify creator?` with `skipped`.

---

## 10. The quota workflow

`n8n/quota-status.workflow.json`, webhook `GET /webhook/join-quota`. It
serves the landing page the state of the daily limit — nothing more. Three
nodes:

```
Receive quota request                       [Webhook GET /webhook/join-quota]
  └─ Read counter                           [Code]
       └─ Respond: counter                  [200, {"used": n, "limit": 10}]
```

### 10.1 The same counter file, read-only

```
/home/node/.n8n/join-quota-state.json
```

This is the file from section 5.1 that the **issue collector writes**. The
quota workflow reads it and never writes it. Two things follow:

- A call to the endpoint **consumes no slot**. Polling the address every
  second locks nobody out.
- The number can only **lag behind**, never run ahead. Between a poll and an
  arriving mail lies the usual race; with ten requests a day that does not
  matter.

If the file is missing — no mail yet that day, or the counter was reset —
the workflow answers `used: 0`. If it contains an **earlier** UTC day,
likewise `used: 0`: `Read counter` uses the same `resetWhenNewDay` function
as the issue collector's guard, character for character. Both therefore see
the same day boundary, and the counter on the landing page jumps to zero in
the same minute the mail processing hands out slots again.

### 10.2 `limit` lives in two places

`SYSTEM_LIMIT = 10` in the `Read counter` node and `SYSTEM_LIMIT = 10` in the
issue collector's guard. **n8n has no shared constants between workflows** —
the two places must be changed together.

If the number drifts apart, the unpleasant case happens silently: the page
reports "limit reached" while the mailbox keeps creating tickets, or the
other way round. A third place carries the same number but is uncritical —
`data-request-limit="10"` in
[`../html/pages/request.html`](../html/pages/request.html) serves only as the
fallback while the endpoint does not answer; the response overrides it.

### 10.3 The endpoint is deliberately open

No secret, no token. It reveals two numbers: how many of the daily requests
are used and how many exist. The same two numbers are visible on the landing
page.

A secret would not improve anything, it would only look like it: it would
have to sit in the shipped client code, putting it in the hands of anyone who
opens the page source — exactly the reasoning from section 9.2, just without
the damage a misused status webhook could do. The quota endpoint writes
nothing, sends nothing and costs nothing.

### 10.4 CORS

The webhook node carries **the same** list as the status workflow
(section 9.4):

```
https://join.thomas-toebbe.de,http://127.0.0.1:5500,http://localhost:5500,http://localhost:8080
```

The two lists must be maintained together. If a domain is added and only one
of the two workflows learns of it, this only shows up in the browser: the
call runs cleanly via `curl`, the browser's same-origin check discards it.

### 10.5 After the import

| What | Value |
|---|---|
| Timeout | `80` seconds |
| Timezone | `UTC` |
| Credentials | none — the workflow talks to neither Firebase nor SMTP |
| Webhook path | `join-quota` |
| HTTP method | `GET` |

Then activate and call it in the browser:

```
https://n8n.thomas-toebbe.de/webhook/join-quota
```

Expected is `{"used":0,"limit":10}` or the current state of the day.

### 10.6 What the landing page does with it

[`../js/features/landing/request-limit.js`](../js/features/landing/request-limit.js)
fetches the numbers on page load, with a **3-second timeout** via
`AbortSignal`. Three behaviors are intentional:

- **Endpoint dead, slow or erroring:** `used = 0`, the page shows the
  available state. The opposite failure would be the worse one — a downed
  n8n instance would block stakeholders for no reason.
- **`?used=` in the URL wins** over the endpoint's answer. That is the test
  switch for both UI states (`?used=4`, `?used=10`) and remains so.
- **`limit` from the response** is adopted by the page if it is a number
  greater than zero; otherwise `data-request-limit` stays.

### 10.7 Verified on the running system

The workflow is imported, active and tested;
[`../n8n/quota-status.workflow.json`](../n8n/quota-status.workflow.json) is
the export from the running instance. What was still open in the draft is
thereby settled and need **not be re-checked** on the next import:

| Item | Result |
|---|---|
| `respondWith: "json"` together with `={{ JSON.stringify(…) }}` | correct as is. Calling `https://n8n.thomas-toebbe.de/webhook/join-quota` returns `{"limit":10,"used":1}` — a real JSON object, no string and no double-encoded JSON. The expression produces the text, the node sets the `Content-Type`; together that is exactly **one** encoding. |
| `httpMethod` in the webhook node | no longer in the export. `GET` is the node's default value, and n8n does not write defaults. The endpoint still answers `GET` — the value is missing from the JSON, not from the node. Section 10.5 remains valid. |
| CORS in the browser | the list from section 10.4 is right. `request.html` served from `http://127.0.0.1:5500` receives the answer, the browser does not discard it. A `curl` test alone would not have shown that. |

**Live test on the page:** `request.html` shows the real state of the day —
`1 of 10` with one request used. The number comes from the endpoint, not
from `data-request-limit` and not from `?used=`.
