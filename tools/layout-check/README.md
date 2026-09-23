# Layout check

Measures every page of Join in seven viewports and fails when the layout
breaks one of four invariants. Pure tooling: nothing in `tools/` is deployed
(`deploy-frontend.yml` only uploads `index.html`, `html/`, `css/`, `js/` and
`assets/`), and there is no `package.json` — the runner is Python.

## Run it

Once, from the repository root:

```bash
python -m venv .venv
```

```bash
.venv/Scripts/python -m pip install -r tools/layout-check/requirements.txt
```

```bash
.venv/Scripts/python -m playwright install chromium
```

(On Linux and macOS the interpreter is `.venv/bin/python`.)

Every time:

```bash
.venv/Scripts/python tools/layout-check/check_layout.py
```

Narrow it down while working on one screen:

```bash
.venv/Scripts/python tools/layout-check/check_layout.py --page board --viewport 375x667
```

`--page` and `--viewport` are repeatable; `--json FILE` also writes the raw
records. Exit code 0 means no violation, 1 means at least one.

## The invariants

| # | Rule | Typical defect |
|---|---|---|
| 1 | Every scroll or clip container: `scrollWidth - clientWidth <= 1`. The culprit column names the outermost descendant past the right edge. Ellipsis truncation is intended and skipped. | `width: 100%` plus a margin |
| 2 | No in-flow element leaves its parent's padding box (sides into which the parent scrolls are skipped). | cards spilling out of a column that is too short |
| 3 | Siblings with the same left edge must not overlap vertically. Compared is the painted extent: the box plus in-flow descendants that spill out of it. | `flex: 1` (basis 0) in a column container |
| 4 | Visible content inside `main` keeps 16 px to the left and right edge of the nearest painted surface around `main`. The culprit column names the nearest ancestor with unequal left/right padding. | a `padding: 0` shorthand wiping one side |

Measured only after `document.fonts.ready`, finished animations and two
animation frames. A page whose ready selector never appears, that throws an
uncaught error, or that loses a local request is reported as well — an empty
page would otherwise pass every rule.

## Isolation

- **Fresh port per run.** The static server binds to port 0 and sends
  `no-store`; each page x viewport gets a new browser context, so no
  stylesheet from an earlier run can be measured.
- **No live systems.** Firebase reads are answered from
  `fixtures/firebase.json`, writes are acknowledged but never sent, every
  other external request (n8n, …) is aborted. The fixture is fictional and
  has enough cards per column to expose a column that is too short.
- **Session.** Board, Summary, Contacts and Add Task get
  `join_current_user` and `animationShown` seeded into `sessionStorage`.

## Allowlist

`allowlist.json` takes entries that are intended, each with a reason:

```json
[
  { "page": "contacts", "invariant": 2, "selector": "...", "reason": "Why this is by design" }
]
```

`page` is optional. An entry without `reason` aborts the run.

## Files

| File | Purpose |
|---|---|
| `check_layout.py` | CLI, page x viewport loop, exit code |
| `invariants.js` | Measurement inside the page |
| `pages.py` | Page list, ready selectors, viewport matrix, session |
| `network_stub.py` | Firebase fixture and request blocking |
| `static_server.py` | No-store server on a fresh port |
| `report.py` | Markdown table to stdout and the Actions job summary |

CI: `.github/workflows/layout-check.yml` runs on every push to `main` and on
demand.
