# n8n-Workflows

Hier liegen die Workflow-JSONs des Issue Collectors. Sie entstehen in Phase 6
und 7 — solange stehen hier bewusst **keine leeren Platzhalter**.

## Die drei Workflows

| Datei | Aufgabe |
|---|---|
| `issue-collector.workflow.json` | Holt die Mails aus dem Postfach, prüft den Tageszähler, lässt die Mail von der KI analysieren (Kategorie, Titel, Priorität, Deadline), legt das Ticket in der Triage-Spalte an und bestätigt dem Absender den Eingang. |
| `status-notify.json` | Webhook `/webhook/join-status`. Das Board meldet einen Spaltenwechsel; der Workflow schickt dem Ersteller eine Statusmail. |
| `quota-status.json` | Webhook `/webhook/join-quota`. Liefert der Landing Page den aktuellen Stand des Tageslimits (verbraucht / maximal). |

## `issue-collector.workflow.json`

> **Diese Datei ist ein Entwurf.** Sie wurde von Hand geschrieben, damit es
> überhaupt etwas zu importieren gibt — sie ist **kein** n8n-Export. Nach
> Import, Testlauf und den Korrekturen im Editor exportiert Thomas den Workflow
> aus n8n, und dieser Export **ersetzt** die Datei. Erst dann gilt sie als das,
> was das Lastenheft verlangt: der Export des laufenden Workflows.

### Die Node-Kette

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
                         └─ false → Ende ohne Antwort
```

Der `false`-Zweig des Guards trägt drei Fälle: Tageslimit erreicht,
Verarbeitungsfehler und „keine `[JOIN]`-Mail". Die ersten beiden unterscheiden
sich nur im Feld `notice`, das der Guard mit dem fertigen Antworttext füllt.
Der dritte hat ein leeres `notice` — `Notify sender?` schickt ihn ins Leere, und
genau deshalb bekommt eine Spam-Mail **keine** Antwort, wird nicht verschoben
und verbraucht keinen Quota-Slot.

### Die vier Credentials

Die Datei enthält keine Zugangsdaten. Nach dem Import zuzuordnen:

| Node | Credential-Typ | Anmerkung |
|---|---|---|
| `Email Trigger (IMAP)` | IMAP | `mail.your-server.de`, SSL/TLS, Benutzername ist die volle Adresse |
| `Send confirmation`, `Send failure notice`, `Send guard notice` | SMTP | dasselbe Postfach |
| `Fetch task ids`, `Write ticket` | Google Service Account API | `Join V2 - Firebase RTDB (Service Account)`, siehe [`../docs/n8n-setup.md`](../docs/n8n-setup.md) |
| `Google Gemini Chat Model` | Google Gemini (PaLM) API | bereits vorhanden, wird mit Code a Cuisine geteilt |

### Die zwei Env-Variablen

Die drei `Move mail to …`-Nodes bauen ihre eigene IMAP-Verbindung auf und
lesen die Zugangsdaten aus der Umgebung des Containers:

```
JOIN_IMAP_USER
JOIN_IMAP_PASSWORD
```

Sie stehen **nicht** im Workflow, weil diese Datei im Repository liegt. Warum
die Nodes überhaupt nötig sind und was sonst noch am Container zu setzen ist,
steht in [`../docs/n8n-setup.md`](../docs/n8n-setup.md).

## Wo die Workflows laufen

In der **bestehenden** n8n-Instanz unter `n8n.thomas-toebbe.de` — gemeinsam mit
den Workflows von Code a Cuisine. Join bekommt keinen eigenen Server und keine
eigene Deploy-Struktur. Daraus folgen zwei Dinge, die in
[`../docs/n8n-setup.md`](../docs/n8n-setup.md) ausführlich stehen: eine eigene
Quota-Datei und eigene Webhook-Pfade, damit sich beide Projekte nicht in die
Quere kommen.

## Vor jedem Commit prüfen

n8n schreibt beim Export normalerweise nur Credential-**Referenzen** (ID und
Name) in die JSON, keine Werte. Verlass dich nicht darauf: Ein Export kann durch
einen Code-Node, einen hart eingetragenen Header oder eine URL mit Query-Parameter
trotzdem ein Geheimnis enthalten.

Deshalb jeden Export vor dem Commit durchsehen:

```bash
grep -nE "private_key|BEGIN PRIVATE KEY|client_email|password|apiKey|Bearer |auth=" n8n/*.json
```

Treffer prüfen und entfernen. Ein Service-Account-Schlüssel gehört unter keinen
Umständen ins Repo — weder als Datei noch als Textausschnitt.

## Weiterführend

- [`../docs/n8n-setup.md`](../docs/n8n-setup.md) — Schreibzugriff auf Firebase,
  Betrieb neben Code a Cuisine, Import-Weg, Prüfliste vor dem ersten Import
- [`../database.rules.json`](../database.rules.json) — Validierungsregeln, gegen
  die der Automat ab Phase 6 schreibt
