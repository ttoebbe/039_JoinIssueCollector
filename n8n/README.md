# n8n workflows

This is where the issue collector's workflow JSONs live. **All three are
exports from the running instance** — imported, active and tested, no
hand-written drafts anymore.

## The three workflows

| File | Job |
|---|---|
| `issue-collector.workflow.json` | Fetches the mails from the mailbox, checks the daily counter, has the AI analyze the mail (category, title, priority, deadline, subtasks), creates the ticket in the Triage column and confirms receipt to the sender. |
| `status-notify.workflow.json` | Webhook `/webhook/join-status`. The board reports a column change; the workflow sends the creator a status mail. |
| `quota-status.workflow.json` | Webhook `/webhook/join-quota`. Serves the landing page the current state of the daily limit (used / maximum). |

## `issue-collector.workflow.json`

> **This file is the export** from the running instance — imported, active
> and tested. The test run corrected the target folders of the three
> `Move mail to …` nodes: the mail server creates them below `INBOX`, without
> the prefix the move aborts with "nonexistent namespace". See
> [`../docs/n8n-setup.md`](../docs/n8n-setup.md), section 6.1.

### The node chain

```
Email Trigger (IMAP)
  └─ Guard: filter, quota, extract          [Code]
       └─ Passed the guard?                 [IF]
            ├─ true  → Issue analysis (AI Agent) ── Google Gemini Chat Model
            │             │                      └─ Structured Output Parser
            │             └─ Map AI answer         [Code]
            │                  └─ Ticket usable?   [IF]
            │                       ├─ true  → Fetch task ids        [HTTP GET]
            │                       │            └─ Build task payload   [Code]
            │                       │                 └─ Write ticket     [HTTP PUT]
            │                       │                      └─ Send confirmation      [Send Email]
            │                       │                           └─ Move mail to erledigt   [Code]
            │                       └─ false → Send failure notice        [Send Email]
            │                                    └─ Move mail to zu-bearbeiten (AI error)  [Code]
            └─ false → Notify sender?             [IF]
                         ├─ true  → Send guard notice   [Send Email]
                         │            └─ Move mail to zu-bearbeiten (guard)  [Code]
                         └─ false → end without a reply
```

The guard's `false` branch carries three cases: daily limit reached,
processing error, and "not a `[JOIN]` mail". The first two differ only in the
`notice` field, which the guard fills with the finished reply text. The third
has an empty `notice` — `Notify sender?` sends it into the void, and exactly
that is why a spam mail gets **no** reply, is not moved and consumes no quota
slot.

### The language of a ticket

Title, summary and subtasks are written in the language the sender used —
`buildSystemPrompt` in the guard node says so, and nothing downstream
translates. Only the ticket text follows the sender; every label around it and
every reply mail stay English. That is why the guard does not detect a
language: the model sees the mail and answers in kind.

The description carries **no** AI hint sentence. The
`Ai-generated ticket` badge in the task detail
([`../js/features/board/create-task-detail.js`](../js/features/board/create-task-detail.js))
is the only place the flag shows, and it does not need a second, hard-coded
German sentence in front of every summary.

### Subtasks

The model returns `subtasks` as an array of strings — only the sub-steps the
mail names, at most five, each at most 60 characters, and an empty array when
the mail names none. `Map AI answer` checks that list the same way it checks
every other field, and `Build task payload` turns each title into
`{ title, done: false }`, the shape `normalizeSubtasksFromTask` in
[`../js/features/board/add-task-form-subtasks-normalize.js`](../js/features/board/add-task-form-subtasks-normalize.js)
produces for a manually created ticket.

**The two caps live in three places** — `MAX_SUBTASKS` / `MAX_SUBTASK_LENGTH`
in `Map AI answer`, the rule line in the guard's `buildOutputRules`, and
`maxItems` / `maxLength` in the output parser's schema. n8n shares no
constants between nodes; all three have to move together.

### The four credentials

The file contains no credentials. To assign after the import:

| Node | Credential type | Note |
|---|---|---|
| `Email Trigger (IMAP)` | IMAP | `mail.your-server.de`, SSL/TLS, the username is the full address |
| `Send confirmation`, `Send failure notice`, `Send guard notice` | SMTP | the same mailbox |
| `Fetch task ids`, `Write ticket` | Google Service Account API | `Join V2 - Firebase RTDB (Service Account)`, see [`../docs/n8n-setup.md`](../docs/n8n-setup.md) |
| `Google Gemini Chat Model` | Google Gemini (PaLM) API | already present, shared with Code a Cuisine |

### The two env variables

The three `Move mail to …` nodes open their own IMAP connection and read the
credentials from the container's environment:

```
JOIN_IMAP_USER
JOIN_IMAP_PASSWORD
```

They are **not** in the workflow, because this file lives in the repository.
Why the nodes are needed at all and what else has to be set on the container
is described in [`../docs/n8n-setup.md`](../docs/n8n-setup.md).

## `status-notify.workflow.json`

> **This file is the export** from the running instance — imported, active
> and tested. What was still open in the draft is checked off in
> [`../docs/n8n-setup.md`](../docs/n8n-setup.md), section 9.6.

The board calls the webhook from `persistStatusChange`
([`../js/features/board/draganddrop.js`](../js/features/board/draganddrop.js))
— **after** the successful write, i.e. only for a change that really is in
the database. The call is fire and forget: if n8n is down, the board never
notices.

### The node chain

```
Receive status change                       [Webhook POST /webhook/join-status]
  └─ Guard: verify, throttle                [Code]
       └─ Passed the guard?                 [IF]
            ├─ true  → Fetch task                [HTTP GET]
            │            └─ Build mail            [Code]
            │                 └─ Notify creator?  [IF]
            │                      ├─ true  → Send status mail   [Send Email]
            │                      │            └─ Respond: ok    [200]
            │                      └─ false → Respond: skipped    [200]
            └─ false → Respond: rejected          [403]
```

The guard checks in this order: secret, required fields, the five valid
status values (`from` and `to` must differ), and finally the cap of
**3 mails per ticket per day**. Everything that fails becomes `rejected` —
the reason only appears in the execution log, not in the response.

`Build mail` only sends to a creator with `type: "extern"` and an address.
Internal members see the change on the board and, per the requirements, get
no mail; that case is `skipped` and not an error.

**The recipient address comes from the ticket record, never from the
request.** That is the reason for the `Fetch task` node: if it came from the
body, the webhook would be an open mail sender. Why the secret alone protects
nothing is explained in [`../docs/n8n-setup.md`](../docs/n8n-setup.md),
section 9.2.

### The two credentials

| Node | Credential type | Note |
|---|---|---|
| `Fetch task` | Google Service Account API | `Join V2 - Firebase RTDB (Service Account)`, the same as in the issue collector |
| `Send status mail` | SMTP | `Join V2 - issues (SMTP)`, port 587 with STARTTLS |

### The one env variable

```
JOIN_NOTIFY_SECRET
```

Same value as `NOTIFY_CONFIG.SECRET` in
[`../js/core/constants.js`](../js/core/constants.js). It is **not** in the
workflow — the guard reads it via `$env`. Details in
[`../docs/n8n-setup.md`](../docs/n8n-setup.md), section 9.

### CORS

The webhook node lists, under *Allowed Origins (CORS)*, the domains the board
is served from. **The list must be checked against the real deployment** —
with the wrong domain in there, the call fails in the browser while it works
via `curl`. See [`../docs/n8n-setup.md`](../docs/n8n-setup.md), section 9.4.

## `quota-status.workflow.json`

> **This file is the export** from the running instance — imported, active
> and tested. What was still open in the draft is checked off in
> [`../docs/n8n-setup.md`](../docs/n8n-setup.md), section 10.7.

The landing page calls the webhook on load
([`../js/features/landing/request-limit.js`](../js/features/landing/request-limit.js))
and renders the daily counter "n of 10 requests used" from it.

### The node chain

```
Receive quota request                       [Webhook GET /webhook/join-quota]
  └─ Read counter                           [Code]
       └─ Respond: counter                  [200]
```

Three nodes, no IF: there is nothing to decide. `Read counter` reads
`/home/node/.n8n/join-quota-state.json` — **the same file the issue
collector writes** — and answers with `{"used": n, "limit": 10}`. A missing
file or a state from the previous day both yield `used: 0`; the UTC day
boundary check is taken character for character from the issue collector's
guard, so both see the same boundary.

**The workflow never writes.** A call therefore consumes no quota slot, and
an endpoint polled every second locks nobody out.

### No credentials

The only one of the three workflows without any: neither Firebase nor SMTP
nor IMAP is used. After the import, only timeout, timezone and the webhook
path need checking.

### The limit lives in two places

`SYSTEM_LIMIT = 10` here in the `Read counter` node and `SYSTEM_LIMIT = 10`
in the issue collector's guard. n8n has no shared constants between
workflows — **both places must be changed together.** If they drift apart,
the page reports a limit the mailbox does not know, or vice versa. Details in
[`../docs/n8n-setup.md`](../docs/n8n-setup.md), section 10.2.

### Deliberately without a secret

The endpoint is public. It reveals two numbers that are visible on the
landing page anyway. A secret would have to ship with the client code and
would therefore protect nothing — see
[`../docs/n8n-setup.md`](../docs/n8n-setup.md), section 10.3.

### CORS

**The same** list as in the status workflow, character for character. If a
domain is added, it must go into **both** webhook nodes. See
[`../docs/n8n-setup.md`](../docs/n8n-setup.md), section 10.4.

## Where the workflows run

In the **existing** n8n instance at `n8n.thomas-toebbe.de` — together with
the Code a Cuisine workflows. Join gets no server of its own and no deploy
structure of its own. Two things follow, described in detail in
[`../docs/n8n-setup.md`](../docs/n8n-setup.md): a dedicated quota file and
dedicated webhook paths, so the two projects cannot get in each other's way.

## Check before every commit

On export, n8n normally writes only credential **references** (ID and name)
into the JSON, no values. Do not rely on it: an export can still contain a
secret through a code node, a hard-coded header or a URL with a query
parameter.

So review every export before committing:

```bash
grep -nE "private_key|BEGIN PRIVATE KEY|client_email|password|apiKey|Bearer |auth=" n8n/*.json
```

Check and remove any hits. A service account key must never end up in the
repo under any circumstances — neither as a file nor as a text excerpt.

## Further reading

- [*Architecture*](../README.md#architecture) section in the README — how web
  hosting, VPS and Firebase relate, plus the mail-to-ticket sequence diagram
- [`../docs/n8n-setup.md`](../docs/n8n-setup.md) — write access to Firebase,
  operating next to Code a Cuisine, import route, checklist before the first
  import
- [`../docs/deployment.md`](../docs/deployment.md#7-publishing-the-database-rules)
  — how `database.rules.json` gets into the database
- [`../database.rules.json`](../database.rules.json) — validation rules for
  writes **from the browser**. The workflows' service account token counts as
  admin access and bypasses them
