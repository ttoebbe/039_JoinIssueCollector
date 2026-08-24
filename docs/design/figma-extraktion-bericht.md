# Abschlussbericht — Figma-Extraktion und erster Entwurf

Projekt: **Join — Issue Collector**
Figma-Datei `6OT2cRhEtUALqFQy0ukNlT`, Stand `2026-08-24T11:35:33Z`, Rolle `owner`
Durchlaufen: Phase 1–6 des Workflows `claude/figma-extraktion-workflow.md`

---

## 1. Was fertig ist

### Phase 2 — Extraktion

| Artefakt | Umfang |
|---|---|
| `.figma-cache/file.json` | 16,1 MB Rohdaten, 3 Seiten, vollstaendig |
| `.figma-cache/image-fills.json` | 20 `imageRef`-Eintraege, 9 davon verwendet |
| `.figma-cache/geometry-nodes.json` | Pfadgeometrie fuer 4 nicht renderbare Icons |
| `docs/design/spec.md` | 828 Zeilen: Foundations, Breakpoints, Frames, Komponenten, Notizen, offene Punkte |
| `docs/design/components.md` | 1025 Zeilen, alle 95 COMPONENT_SETs mit jeder Variante |
| `assets/MANIFEST.md` | Herkunft jeder Datei mit Node-ID, Original- und Anzeigemass |
| `assets/icons/` | 48 SVGs aus Figma + 27 Material-Symbols-SVGs aus der Originalquelle |
| `assets/logos/` | 4 SVGs (dunkel, hell, Splash, Wortmarke) |
| `assets/images/` | 9 Rasterbilder in **Originalaufloesung**, kein Downscaling |
| `assets/fonts/` | 8 woff2-Dateien + fertiges `fonts.css` (Inter, Open Sans, Poppins, Mulish) |
| `docs/design/reference/` | 44 von 101 Referenz-Screenshots (s. Punkt 3) |
| `tools/` | Auswertungsskripte, arbeiten ausschliesslich gegen den Cache |

Alle Schriften der Datei sind frei verfuegbar — **keine kommerzielle Schrift**, kein offener Punkt bei den Fonts.
Alle Rasterbilder liegen in hoeherer Aufloesung vor als ihre Anzeigegroesse — **kein Qualitaetsrisiko**.

### Phase 5 — Erster Entwurf

Umgesetzt ist die **Stakeholder-Landing-Page** — der einzige Frontend-Teil, den das Lastenheft
fordert. Board, Summary, Contacts und Add-Task sind Bestandteil des bestehenden Join-Projekts
und stehen nicht im Lastenheft; sie wurden extrahiert und dokumentiert, aber nicht neu gebaut.

| Datei | Inhalt |
|---|---|
| `index.html` | Welcome-Screen mit der Weiche Stakeholder / Teammitglied (Node 350504:9300 / 350522:9493) |
| `request.html` | Request-Screen mit beiden Zustaenden (Node 350504:9311 / 350504:9548) |
| `styles/tokens.css` | Alle Foundations als Custom Properties, jede mit Herkunftskommentar |
| `styles/base.css` | Reset, Dokumentgrundlagen |
| `styles/components.css` | Buttons, Text-Button, Icon-Button, Alert, Zaehler, Rollenauswahl |
| `styles/pages.css` | Layouts beider Seiten, Breakpoints 768 px und 1440 px |
| `scripts/request-limit.js` | Zaehler und Zustandswechsel, JSDoc, alle Funktionen unter 14 Zeilen |

### Phase 6 — Gemessene Abweichung gegen die Figma-Referenz

Gemessen im Browser bei 1440 x 1024 gegen die Node-Koordinaten der Datei:

| Element | Figma | Umsetzung | Delta |
|---|---|---|---|
| Welcome-Karte | 326, 310 · 789 x 403 | 326, 310 · 789 x 404 | 0 / +1 |
| Button „Create request" | 398, 609 · 196 x 48 | 399, 610 · 195 x 48 | +1 / -1 |
| Button „Member log in" | 739, 609 · 165 x 48 | 739, 610 · 164 x 47 | 0 / -1 |
| Trennstrich unter „Welcome" | 660, 420 · 120 x 3 | 660, 421 · 120 x 3 | 0 |
| Fusszeile Welcome | y 949 · h 35 | y 949 · h 35 | 0 |
| Logo Request-Seite | 40, 29 · 46 x 56 | 40, 29 · 46 x 56 | 0 |
| Zurueck-Pfeil | 160, 85 · 37 x 37 | 160, 85 · **44 x 44** | Touch-Target, bewusst |
| Zaehler (rechte Kante) | 1281 | 1280 | -1 |
| Lead-Text | 238.5, 303 · 502 x 68 | 238, 310 · 502 x 67 | +7 y |
| Illustration | 788.5, 303 · 416 x 280 | 788, 310 · 416 x 280 | +7 y |
| Prosablock | 238.5, 411 · 502 x 158 | 238, 417 · 502 x 153 | +6 y |
| Aktionsbutton | 238.5, 623 · 293 x 60 | 238, 630 · 292 x 60 | +7 y |

Der durchgaengige Versatz von 6–7 px stammt aus dem vergroesserten Zurueck-Pfeil
(44 px statt 37 px Touch-Target). Kein horizontaler Ueberlauf, keine Konsolenfehler.

Screenshots der Umsetzung: `docs/design/verification/`.

---

## 2. Lastenheft-Checkliste

### Allgemeine Anforderungen

| Punkt | Status |
|---|---|
| GitHub Repository eingerichtet | **offen** — das Zielverzeichnis ist noch kein Git-Repository |
| README.md aussagekraeftig | **offen** |
| n8n-Workflows als JSON eingecheckt | **offen** — n8n ist nicht Teil dieser Aufgabe |
| Sensible Daten ueber `.gitignore` ausgeschlossen | **erledigt** — `.figma-token`, `.env`, `*.local` |
| Semantisches HTML5 auf der Landing Page | **erledigt** — `main`, `section`, `h1`, `figure`, `nav`, `aria-label` |
| Font-Size mindestens 16 px, Kleingedrucktes nicht unter 14 px | **erledigt** — kleinster Wert im Entwurf ist 16 px. Das Design gibt 12 px vor; die Projektregel hat Vorrang, dokumentiert in `spec.md` 6.5 |
| JSDoc fuer Frontend-Skripte | **erledigt** — `scripts/request-limit.js` vollstaendig dokumentiert |

### Stakeholder-Experience und Landing Page

| Punkt | Status |
|---|---|
| Landing Page erstellt und zugaenglich | **erledigt** |
| Prozess erklaert (inkl. E-Mail-Adresse) | **teilweise** — Erklaertext aus dem Design uebernommen; die E-Mail-Adresse ist der Platzhalter `issues@example.org` und muss ersetzt werden |
| Weiche „Feature Request" vs. „Teammitglied" | **erledigt** — `index.html` |
| Tageslimit transparent kommuniziert | **erledigt** — Zaehler „x of 10 requests used today" plus Fliesstext |
| Automatische Antwort bei Limitueberschreitung | **offen** — n8n; im Design existiert kein Mail-Template |
| Bestaetigungsmail nach Ticket-Anlage | **offen** — n8n; kein Template im Design |
| Fehlerhinweis-Mail an den Absender | **offen** — n8n; kein Template im Design |

### Kernfunktionalitaeten (n8n und Join-Backend — nicht Teil dieser Aufgabe)

Alle Punkte zu „Triage"-Spalte, E-Mail-Empfang, KI-Parsing, Ersteller-Funktion und Throttling
sind **offen**. Das Design deckt sie visuell ab und ist dokumentiert:

| Lastenheft-Punkt | Design-Vorlage |
|---|---|
| Spalte „Triage" als Standard-Backlog | vorhanden als **erste** Board-Spalte, `45:1747` / `332:1228` |
| Prioritaet urgent / medium / low | `Priority symbols` `75609:16169`, Icons exportiert |
| Kategorie technischer Task vs. User Story | `Labels Board card label` `75609:16164` |
| Hinweis „KI-generiert" | Badge „Ai-generated ticket" `350510:12641`, Verlauf `#9327FF → #2EA1DC` |
| Ersteller sichtbar | Komponente `Creator` `350510:12396` |
| Unterscheidung intern / extern | Varianten `member` `#92FFBC` und `extern` `#EBFC88` |
| Deadline am Ticket | `Due date v1` `94:448` |

---

## 3. Was offen ist

### 3.1 Technisch offen

**57 von 101 Referenz-Screenshots fehlen.** Figmas `/v1/images` liefert seit dem Rendern der
grossen Design-System-Frames (1920 x 6140 px und 3533 x 9441 px) durchgaengig HTTP 429.
Ein Hintergrundprozess (`tools/fetch-refs.py`) laeuft weiter und laedt mit exponentiellem
Backoff nach, sobald das Kontingent zurueckgesetzt ist. Fortschritt: `.figma-cache/fetch-refs.log`.
Neustart bei Bedarf mit `python tools/fetch-refs.py` — bereits vorhandene Dateien werden uebersprungen.

**8 Frames liefern grundsaetzlich kein Rendering**, weil sie in Figma ausgeblendet sind:
die komplette Forgot-Password-Strecke (`656:3794`, `656:3836`, `664:3733`, `664:3772`) und
drei Bestaetigungs-Toasts (`656:3857`, `664:3851`, `10119:3717`, `10175:3745`).
Ihre Daten liegen vollstaendig im Cache; nur der Bild-Export ist nicht moeglich.

**`.figma-cache/` gehoert nach `.git/info/exclude`**, sobald das Verzeichnis ein Git-Repository ist.
Es steht bewusst nicht in `.gitignore`.

### 3.2 Entscheidungen, die Thomas treffen muss

| # | Frage | Warum sie offen ist |
|---|---|---|
| 1 | **Inter oder Open Sans?** | Die Datei mischt beide fuer dieselbe Rolle: die aelteren Join-Screens sind Inter, die neuen Issue-Collector-Screens Open Sans. Der Entwurf haelt beide vor (`--font-ui`, `--font-prose`) und verwendet sie genau wie das Design. Fuer ein einheitliches Produkt muss eine gewinnen. |
| 2 | **Heisst der Menuepunkt „Triage" oder „Backlog"?** | Das Lastenheft sagt Triage, die Board-Spalte im Design heisst Triage — der Sidebar-Eintrag heisst `Backlog` und ist in allen Menu-Varianten ausgeblendet, in der Widescreen-Fassung dagegen sichtbar. |
| 3 | **Breakpoint Mobile → Desktop** | Die Datei nennt nur 1440 px. Zwischen 428 px und 1440 px existiert kein Artboard. Der Entwurf setzt **768 px** und markiert das im Code als Entscheidung. |
| 4 | **KI-Hinweis: Badge oder Beschreibungstext?** | Das Lastenheft fordert den Hinweis **im Beschreibungstext** des Tickets, das Design zeigt einen **Badge im Kopfbereich**. Beides gleichzeitig waere doppelt. |
| 5 | **Echte E-Mail-Adresse** | Der Entwurf verwendet `issues@example.org` als Platzhalter in beiden `mailto:`-Links. |
| 6 | **Vier fehlende E-Mail-Templates** | Bestaetigung, Fehler, Limit, Statuswechsel — im Design nicht vorhanden, im Lastenheft gefordert. Muessen entworfen werden. |
| 7 | **Kontrastverstoss `See profile` / `Send email`** | Das Design setzt im Hover Text `#42526E` auf Fill `#2A3647` — rund 1,6 : 1. Unlesbar. Der Entwurf enthaelt diese Komponenten noch nicht; vor der Umsetzung im Task-Detail muss die Textfarbe geklaert werden. |
| 8 | **Touch-Targets mobil** | Das Design gibt 27 px hohe Buttons vor (`371:2122`). Der Entwurf erzwingt `min-height: 44px`. Das weicht sichtbar vom Artboard ab — bewusst, aber es ist eine Abweichung. |

### 3.3 Bewusste Abweichungen im Entwurf

| Abweichung | Grund |
|---|---|
| Fehlermeldungen 16 px statt 12 px | Projektregel und Lastenheft fordern mindestens 16 px |
| Zurueck-Pfeil 44 x 44 statt 37 x 37 | Touch-Target-Minimum; erzeugt den 6–7-px-Versatz aus Punkt 1 |
| Sekundaer-Button: `box-shadow: inset` statt `border` | Das Design wechselt den Stroke von 1 px auf 2 px im Hover — als Border waere das ein Layout-Shift |
| Text-Button-Hover per `text-shadow` statt `font-weight: 700` | gleiche Optik, unveraenderte Textbreite, kein Reflow der Fusszeile |
| Icons als CSS-Maske statt `<img>` | Die exportierten SVGs tragen die Farbe der Komponente (`#177DA8`), die Instanz im Screen ueberschreibt sie (`#2A3647`). Als Maske kommt die Farbe aus CSS |
| Aktionsbutton im Limit-Zustand unterhalb der Illustration | Das Design stellt ihn dort in die linke Spalte neben das Bild (`350504:9593`). Ein Layout fuer beide Zustaende ist wartbarer; die Alternative waere ein zweites Grid nur fuer diesen Fall |
| `focus-visible`-Ring ergaenzt | In keinem Component-Set der Datei ist ein Fokus-Zustand definiert |

---

## 4. Reproduzierbarkeit

```bash
# Auswertung erneut ausfuehren (nur gegen den Cache, kein API-Aufruf)
python tools/foundations.py       # Farb-, Text- und Effektstile mit tatsaechlichen Werten
python tools/components.py        # alle Component-Sets und Varianten
python tools/tree.py <node-id> 6  # Layoutbaum eines Nodes
python tools/manifest.py          # assets/MANIFEST.md neu erzeugen

# Fehlende Referenz-Screenshots nachladen (braucht die API)
python tools/fetch-refs.py

# Entwurf lokal ansehen
python -m http.server 8321
#   http://127.0.0.1:8321/index.html
#   http://127.0.0.1:8321/request.html            -> 0 of 10
#   http://127.0.0.1:8321/request.html?used=4     -> 4 of 10
#   http://127.0.0.1:8321/request.html?used=10    -> Limit erreicht
```

Der Query-Parameter `used` liefert die vom Projektstandard geforderten Testdaten fuer jeden
UI-Zustand der Seite, bis der n8n-Endpunkt existiert (`STATUS_ENDPOINT` in `scripts/request-limit.js`).
