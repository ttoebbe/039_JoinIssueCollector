# Join — Issue Collector

Kanban-Board mit KI-gestütztem Issue Collector. Stakeholder reichen Feature
Requests per E-Mail ein; ein n8n-Workflow analysiert die Mail, bestimmt
Kategorie, Titel, Priorität und Deadline und legt daraus automatisch ein Ticket
in der Triage-Spalte des Boards an.

Aufbauend auf [024_Join](https://github.com/ttoebbe/024_Join).

---

## Wie die Demo funktioniert

1. Landing Page öffnen und „Create request" wählen
2. E-Mail an die angegebene Adresse schicken — Betreff mit dem Präfix `[JOIN]`
3. Der n8n-Workflow verarbeitet die Mail und legt das Ticket in **Triage** an
4. Der Absender bekommt eine Bestätigungsmail und wird als externer Ersteller
   am Ticket geführt
5. Wird das Ticket auf dem Board in eine andere Spalte gezogen, geht eine
   Benachrichtigung an den Ersteller

Pro Tag werden maximal **10** Anfragen verarbeitet. Der aktuelle Stand wird auf
der Landing Page angezeigt. Das Limit ist ein Kostenschutz für die KI-API.

---

## Features

- **Landing Page** — Weiche zwischen Stakeholder und Teammitglied, Prozess­erklärung, Tageslimit transparent
- **Issue Collector** — E-Mail-Empfang, KI-Analyse, automatische Ticket-Anlage
- **Triage-Spalte** — Standard-Backlog für alle neuen Tickets, manuell wie automatisch
- **Ersteller-Anzeige** — sichtbar im Task-Detail, unterscheidet intern (`Member`) und extern (`Extern`)
- **KI-Kennzeichnung** — Badge und Hinweis im Beschreibungstext
- **Statusbenachrichtigung** — Mail an den Ersteller bei Spaltenwechsel
- **Kanban-Board** — Drag & Drop, Suche, Subtasks, Prioritäten, Kontakte, Summary-Dashboard

---

## Tech-Stack

| Ebene | Technologie |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| Datenbank | Firebase Realtime Database (REST API) |
| Automatisierung | n8n (Docker, eigener VPS) |
| Build | keiner — statische Dateien |

---

## Lokal starten

Kein Build-Step nötig.

```bash
python -m http.server 8080
```

Dann `http://localhost:8080` öffnen.

Alternativ die VS-Code-Erweiterung *Live Server*: Rechtsklick auf `index.html`
→ *Open with Live Server*.

Zustände der Landing Page ohne laufendes n8n testen:

```
/html/pages/request.html            -> 0 of 10
/html/pages/request.html?used=4     -> 4 of 10
/html/pages/request.html?used=10    -> Limit erreicht
```

---

## Projektstruktur

```
├── index.html              # Landing Page (Stakeholder / Teammitglied)
├── assets/
│   ├── icons/              # aus Figma exportiert (neue Features)
│   ├── img/                # Bestand aus 024_Join (bestehende Screens)
│   ├── logos/, images/     # aus Figma
│   └── fonts/              # Inter + Open Sans als woff2
├── css/
│   ├── core/               # tokens.css (Design-Tokens), base.css
│   ├── landing/            # Landing-Strecke
│   ├── pages/              # App-Seiten
│   └── components/         # wiederverwendbare Komponenten
├── html/pages/             # App-Seiten inkl. login.html und request.html
├── js/
│   ├── core/               # Firebase-Service, Konstanten, Utilities
│   ├── features/           # auth, board, add-task, contacts, summary, landing
│   ├── components/         # Toast, Overlays
│   └── templates/          # Template-Renderer
├── n8n/                    # Workflows als JSON + Deploy-Dateien
├── docs/
│   ├── design/             # Design-Spec, Komponenten-Inventar, Referenzbilder
│   └── *Lastenheft*        # Anforderungen
└── tools/                  # Auswertungsskripte der Figma-Extraktion
```

---

## Design

Das UI der neuen Funktionen stammt aus einer Figma-Datei, die vollständig
extrahiert und dokumentiert wurde:

- `docs/design/spec.md` — Foundations, Breakpoints, Frames, Komponenten
- `docs/design/components.md` — vollständiges Komponenten-Inventar
- `docs/design/reference/` — Referenz-Screenshots je Frame
- `docs/design/MANIFEST.md` — Herkunft jeder Asset-Datei mit Node-ID

Bestehende Screens aus 024_Join wurden bewusst nicht angeglichen.

---

## Konfiguration

Die Firebase-URL steht in `js/core/constants.js`.
Zugangsdaten für n8n (Mailkonto, KI-API, Service Account) liegen ausschließlich
in der `.env` auf dem Server und sind über `.gitignore` ausgeschlossen.

---

## Lizenz

Privates, nicht kommerzielles Ausbildungsprojekt.
