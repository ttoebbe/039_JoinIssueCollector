# n8n-Workflows

Hier liegen die Workflow-JSONs des Issue Collectors. **Alle drei sind
vorhanden** — es fehlt keiner mehr.

## Die drei Workflows

| Datei | Aufgabe |
|---|---|
| `issue-collector.workflow.json` | Holt die Mails aus dem Postfach, prüft den Tageszähler, lässt die Mail von der KI analysieren (Kategorie, Titel, Priorität, Deadline), legt das Ticket in der Triage-Spalte an und bestätigt dem Absender den Eingang. |
| `status-notify.workflow.json` | Webhook `/webhook/join-status`. Das Board meldet einen Spaltenwechsel; der Workflow schickt dem Ersteller eine Statusmail. |
| `quota-status.workflow.json` | Webhook `/webhook/join-quota`. Liefert der Landing Page den aktuellen Stand des Tageslimits (verbraucht / maximal). |

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

## `status-notify.workflow.json`

> **Diese Datei ist der Export** aus der laufenden Instanz — importiert, aktiv
> und getestet. Was am Entwurf noch offen war, ist in
> [`../docs/n8n-setup.md`](../docs/n8n-setup.md), Abschnitt 9.6, abgehakt.

Das Board ruft den Webhook aus `persistStatusChange`
([`../js/features/board/draganddrop.js`](../js/features/board/draganddrop.js))
auf — **nach** dem erfolgreichen Schreiben, also nur für einen Wechsel, der
wirklich in der Datenbank steht. Der Aufruf ist „fire and forget": Ist n8n aus,
merkt das Board nichts davon.

### Die Node-Kette

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

Der Guard prüft in dieser Reihenfolge: Secret, Pflichtfelder, die fünf gültigen
Statuswerte (`from` und `to` müssen verschieden sein), zuletzt die Deckelung von
**3 Mails pro Ticket und Tag**. Alles, was durchfällt, wird zu `rejected` — der
Grund steht nur im Execution-Log, nicht in der Antwort.

`Build mail` schickt nur an einen Ersteller mit `type: "extern"` und einer
Adresse. Interne Mitglieder sehen den Wechsel auf dem Board und bekommen laut
Lastenheft keine Mail; dieser Fall ist `skipped` und kein Fehler.

**Die Empfängeradresse kommt aus dem Ticket-Datensatz, nie aus dem Request.**
Das ist der Grund für den Node `Fetch task`: Käme sie aus dem Body, wäre der
Webhook ein offener Mailversender. Warum das Secret allein nichts schützt, steht
in [`../docs/n8n-setup.md`](../docs/n8n-setup.md), Abschnitt 9.2.

### Die zwei Credentials

| Node | Credential-Typ | Anmerkung |
|---|---|---|
| `Fetch task` | Google Service Account API | `Join V2 - Firebase RTDB (Service Account)`, dasselbe wie im Issue Collector |
| `Send status mail` | SMTP | `Join V2 - issues (SMTP)`, Port 587 mit STARTTLS |

### Die eine Env-Variable

```
JOIN_NOTIFY_SECRET
```

Gleicher Wert wie `NOTIFY_CONFIG.SECRET` in
[`../js/core/constants.js`](../js/core/constants.js). Steht **nicht** im
Workflow — der Guard liest sie über `$env`. Details in
[`../docs/n8n-setup.md`](../docs/n8n-setup.md), Abschnitt 9.

### CORS

Der Webhook-Node trägt unter *Allowed Origins (CORS)* die Domains, von denen das
Board ausgeliefert wird. **Die Liste ist gegen das echte Deployment zu prüfen**
— steht dort die falsche Domain, scheitert der Aufruf im Browser, während er per
`curl` durchläuft. Siehe [`../docs/n8n-setup.md`](../docs/n8n-setup.md),
Abschnitt 9.4.

## `quota-status.workflow.json`

> **Diese Datei ist ein Entwurf** — von Hand geschrieben, kein n8n-Export. Nach
> Import und Testlauf exportiert Thomas den Workflow und der Export **ersetzt**
> die Datei.

Die Landing Page ruft den Webhook beim Laden auf
([`../js/features/landing/request-limit.js`](../js/features/landing/request-limit.js))
und zeigt daraus den Tageszähler „n von 10 requests used".

### Die Node-Kette

```
Receive quota request                       [Webhook GET /webhook/join-quota]
  └─ Read counter                           [Code]
       └─ Respond: counter                  [200]
```

Drei Nodes, kein IF: Es gibt nichts zu entscheiden. `Read counter` liest
`/home/node/.n8n/join-quota-state.json` — **dieselbe Datei, die der Issue
Collector schreibt** — und antwortet mit `{"used": n, "limit": 10}`. Fehlende
Datei oder ein Stand vom Vortag ergeben beide `used: 0`; die Prüfung der
UTC-Tagesgrenze ist zeichengleich aus dem Guard des Issue Collectors
übernommen, damit beide dieselbe Grenze sehen.

**Der Workflow schreibt nie.** Ein Aufruf verbraucht deshalb keinen Quota-Slot,
und ein im Sekundentakt abgerufener Endpunkt sperrt niemanden aus.

### Keine Credentials

Der einzige der drei Workflows ohne: weder Firebase noch SMTP noch IMAP werden
angesprochen. Nach dem Import sind nur Timeout, Timezone und der Webhook-Pfad
zu kontrollieren.

### Das Limit steht an zwei Stellen

`SYSTEM_LIMIT = 10` hier im Node `Read counter` und `SYSTEM_LIMIT = 10` im Guard
des Issue Collectors. n8n kennt keine geteilten Konstanten zwischen Workflows —
**beide Stellen sind zusammen zu ändern.** Laufen sie auseinander, meldet die
Seite ein Limit, das das Postfach nicht kennt, oder umgekehrt. Details in
[`../docs/n8n-setup.md`](../docs/n8n-setup.md), Abschnitt 10.2.

### Bewusst ohne Secret

Der Endpunkt ist öffentlich. Er gibt zwei Zahlen preis, die ohnehin sichtbar auf
der Landing Page stehen. Ein Secret müsste im ausgelieferten Client-Code
mitgeliefert werden und schützte damit nichts — siehe
[`../docs/n8n-setup.md`](../docs/n8n-setup.md), Abschnitt 10.3.

### CORS

**Dieselbe** Liste wie im Status-Workflow, Zeichen für Zeichen. Kommt eine
Domain dazu, muss sie in **beide** Webhook-Nodes. Siehe
[`../docs/n8n-setup.md`](../docs/n8n-setup.md), Abschnitt 10.4.

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

- [Abschnitt *Architektur*](../README.md#architektur) in der README — wie
  Webhosting, VPS und Firebase zusammenhängen, plus das Ablaufdiagramm von der
  Mail zum Ticket
- [`../docs/n8n-setup.md`](../docs/n8n-setup.md) — Schreibzugriff auf Firebase,
  Betrieb neben Code a Cuisine, Import-Weg, Prüfliste vor dem ersten Import
- [`../docs/deployment.md`](../docs/deployment.md#7-datenbank-regeln-einspielen)
  — wie `database.rules.json` in die Datenbank kommt
- [`../database.rules.json`](../database.rules.json) — Validierungsregeln für
  Schreibvorgänge **aus dem Browser**. Der Service-Account-Token der Workflows
  gilt als Admin-Zugriff und übergeht sie
