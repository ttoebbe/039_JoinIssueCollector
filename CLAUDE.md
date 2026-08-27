# Join V2 — Issue Collector · Projektregeln

## Kontext

Kanban-Board (Code-Basis: `ttoebbe/024_Join`) mit KI-gestütztem Issue Collector
über n8n. Stakeholder reichen Feature Requests per E-Mail ein; n8n analysiert
sie, klassifiziert und legt Tickets in der Triage-Spalte des Boards an.

Anforderungen: Lastenheft der Developer Akademie — fremdes Material, liegt
nur lokal und ist nicht im Repository. Was daraus für Design und Umsetzung
folgt, steht in `docs/design/spec.md` und `docs/design/components.md`.
Projektplan: siehe Claude-Projekt „Entwicklungshelferlein", `claude/plan-join-v2.md`

## Stack — nicht ändern

- Vanilla JS (ES6), HTML5, CSS. **Kein Build-Step, kein Bundler, keine Module.**
- Skripte werden als `<script>`-Tags geladen, **Reihenfolge ist bedeutsam**.
  Jede neue JS-Datei muss in *jede* betroffene HTML-Seite eingetragen werden.
- Alle Pfade **absolut** (`/css/…`, `/js/…`, `/assets/…`).
- Firebase Realtime Database über REST (`js/core/firebase-service.js`).
- n8n für Mailverarbeitung, Benachrichtigungen und Tageszähler (`n8n/`).

## Design

- **Scope: nur neue Features.** Triage-Spalte, Creator-Anzeige, AI-Badge und
  Landing Page kommen aus Figma. Bestehende Screens werden **nicht** angeglichen.
- Gemessene Werte stehen in `docs/design/spec.md` und `docs/design/components.md`
  — **dort nachsehen, nicht aus Screenshots schätzen.**
- Referenzbilder: `docs/design/reference/` — aus dem Repo entfernt, über die
  Git-Historie erreichbar
- Tokens: `css/core/tokens.css`. Keine Hex-Werte direkt in Komponenten-CSS.
- Assets liegen bereits in `/assets/icons/`, `/assets/logos/`, `/assets/images/`
  — Herkunft je Datei in `docs/design/MANIFEST.md`. **Keine Icons neu zeichnen
  und keine aus Figma nachziehen.**
- Alte Screens nutzen weiter `/assets/img/icons/` — zwei Icon-Namensräume sind
  beabsichtigt, nicht versehentlich.
- Schrift: `--font-ui` = Inter (App), `--font-prose` = Open Sans (Fließtext).
- Abweichungen vom Design sind erlaubt, aber **im Commit zu begründen**.

## Harte Regeln

- **`normalizeStatus` existiert doppelt** — `js/core/data-utils.js` und
  `js/features/board/board.js`. Änderungen immer an **beiden** Stellen.
- Gültige Statuswerte: `triage`, `todo`, `inprogress`, `awaitfeedback`, `done`.
  Neue Tasks default `triage`. Fallback für Unbekanntes bleibt `todo` —
  Bestandstasks dürfen nicht nach Triage wandern.
- **Jeder Statuswechsel läuft über `persistStatusChange`** in
  `js/features/board/draganddrop.js`. Drag-and-drop und das Move-Menü aus
  `board.js` gehen beide durch `updateTaskStatus` dorthin. Dort sitzt der
  **einzige** Hook für die n8n-Benachrichtigung (`notifyStatusChange`), und zwar
  nach dem erfolgreichen `TaskService.update`. Keinen zweiten Hook in
  `render-cards-meta.js` oder anderswo einbauen — sonst gehen Mails doppelt
  oder für Wechsel raus, die gar nicht gespeichert wurden.
- Prioritätsfeld heißt `prio`, Werte `urgent` | `medium` | `low`.
- Ersteller-Typ heißt `member` | `extern` (wie die Design-Varianten).
- **Mindestschriftgröße 16 px**, Kleingedrucktes nie unter 14 px (Lastenheft).
  Diese Regel schlägt die Design-Vorgabe, wo Figma 12 px setzt.
- Touch-Targets mindestens 44 x 44 px.
- **JSDoc für jede Funktion.**
- Code und Kommentare auf Englisch. Kommunikation mit Thomas auf Deutsch.

## Was nie ins Repo darf

`.figma-token`, API-Keys, Service-Account-JSONs, `.env`-Dateien,
Mail-Passwörter, `N8N_ENCRYPTION_KEY`.

n8n-Workflows werden als JSON exportiert und eingecheckt — **vor jedem Commit
prüfen, dass keine Credential-Werte im JSON stehen.**

## Commits

- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)
- Autor ist Thomas. **Kein** `Co-Authored-By: Claude`, kein
  „Generated with"-Hinweis, keine Session-URL.
- In sinnvollen Abständen committen: pro abgeschlossenem Teilschritt, nicht erst
  am Ende einer Phase. Ein Commit = eine nachvollziehbare Änderung.
- Mehrere Commits pro Phase → Feature-Branch, dann Merge.
- Nie ungefragt pushen.

## Infrastruktur

- n8n läuft auf dem bestehenden Hetzner-VPS (`n8n.thomas-toebbe.de`, Stack in
  `/opt/code-a-cuisine/`, Docker Compose + Caddy). Join-Workflows kommen als
  weitere Workflows in dieselbe Instanz.
- Auf dem VPS immer `docker compose exec n8n …` aus `/opt/code-a-cuisine`
  verwenden — `docker exec n8n …` funktioniert dort nicht (Containername
  weicht ab).
- n8n-UI ist nicht öffentlich: Caddy lässt nur `/webhook/*` durch, Port 5678
  lauscht auf Loopback. UI-Zugriff per SSH-Tunnel.
