# n8n-Workflows

Hier liegen die exportierten Workflow-JSONs des Issue Collectors. Sie entstehen
in Phase 6 und 7 — solange stehen hier bewusst **keine leeren Platzhalter**.

## Die drei Workflows

| Datei | Aufgabe |
|---|---|
| `issue-collector.json` | Holt die Mails aus dem Postfach, prüft den Tageszähler, lässt die Mail von der KI analysieren (Kategorie, Titel, Priorität, Deadline), legt das Ticket in der Triage-Spalte an und bestätigt dem Absender den Eingang. |
| `status-notify.json` | Webhook `/webhook/join-status`. Das Board meldet einen Spaltenwechsel; der Workflow schickt dem Ersteller eine Statusmail. |
| `quota-status.json` | Webhook `/webhook/join-quota`. Liefert der Landing Page den aktuellen Stand des Tageslimits (verbraucht / maximal). |

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
