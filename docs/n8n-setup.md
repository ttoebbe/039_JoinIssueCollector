# n8n-Setup — Join Issue Collector

Wie die Join-Workflows in die laufende n8n-Instanz kommen, wie sie nach Firebase
schreiben und was neben Code a Cuisine zu beachten ist.

Diese Datei beschreibt den Weg. Sie führt ihn nicht aus: Service Account anlegen,
Rules einspielen, Credential erzeugen und der Schreibtest sind Handarbeit an der
laufenden Umgebung.

Den Klickweg zum Einspielen der Rules beschreibt
[`deployment.md`](deployment.md#7-datenbank-regeln-einspielen), Abschnitt 7.
Das Gesamtbild — Webhosting, VPS, Firebase — steht im Abschnitt
[*Architektur*](../README.md#architektur) der README.

---

## 1. Ausgangslage

Die Join-Workflows bekommen **keinen eigenen Server**. Sie laufen in der
bestehenden n8n-Instanz unter `n8n.thomas-toebbe.de` auf dem
Code-a-Cuisine-VPS, gemeinsam mit den dortigen Workflows.

| | |
|---|---|
| Host | Hetzner CPX12, Ubuntu 26.04 |
| Stack | `/opt/code-a-cuisine/` — Caddy + n8n via Docker Compose |
| n8n-UI | **nicht öffentlich** — Caddy lässt nur `/webhook/*` durch, Port 5678 bindet auf Loopback |
| Zugriff auf die UI | ausschließlich über SSH-Tunnel |

Befehle am Container immer aus `/opt/code-a-cuisine/` und immer über Compose:

```bash
cd /opt/code-a-cuisine
docker compose exec n8n <befehl>
```

Das nackte `docker exec n8n …` schlägt dort fehl — der Container heißt anders,
Compose setzt den Namen aus Projekt- und Servicename zusammen.

SSH-Tunnel auf die UI:

```bash
ssh -L 5680:localhost:5678 root@<vps>
# danach im Browser: http://localhost:5680
```

Ein eigenes `n8n/deploy/` mit `docker-compose.yml` und `Caddyfile` gibt es für
Join bewusst **nicht**. Es gäbe einen zweiten Stack neben dem bestehenden — zwei
n8n-Instanzen, zwei Caddy-Konfigurationen, ein Port-Konflikt. Der Projektplan
sah das ursprünglich vor und hat sich später für die Weiternutzung des
bestehenden VPS entschieden; diese Doku ersetzt die Deploy-Struktur.

---

## 2. Schreibzugriff auf Firebase

n8n schreibt die Tickets per REST in die Realtime Database. Der Zugriff läuft
über einen **Google Service Account**, dessen Token n8n selbst holt und
erneuert. Kein JWT-Basteln in einem Code-Node, kein langlebiges Secret in der
Workflow-JSON.

### 2.1 Service Account anlegen

Im Google-Cloud-Projekt der V2-Datenbank einen Service Account erzeugen und den
JSON-Schlüssel herunterladen.

> **Die JSON-Datei gehört nirgendwo ins Repo** — nicht als Datei, nicht als
> Textblock in dieser Doku, auch nicht auszugsweise. Sie lebt ausschließlich im
> Credential-Store von n8n, also im Docker-Volume. `.gitignore` fängt die
> üblichen Dateinamen ab, aber darauf ist kein Verlass: Der Schlüssel wird
> außerhalb des Repo-Ordners abgelegt.

### 2.2 Credential in n8n anlegen

Typ **Google Service Account**.

1. `client_email` und `private_key` aus der heruntergeladenen JSON eintragen.
   Der Key enthält `\n`-Sequenzen — so übernehmen, wie n8n sie im Feld erwartet.
2. **„Set up for use in HTTP Request node" aktivieren.** Ohne diesen Schalter
   taucht das Credential im HTTP-Request-Node nicht auf.
3. Beide Scopes eintragen — Firebase verlangt genau diese zwei:

```
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/firebase.database
```

### 2.3 Im Workflow verwenden

Im HTTP-Request-Node:

**Authentication → Predefined Credential Type → Google Service Account**

n8n hängt den Token als `Authorization: Bearer <token>` an und erneuert ihn
selbstständig, wenn er abläuft.

Ziel-URL und Methode für ein Ticket:

```
PUT https://joinv2withn8n-default-rtdb.europe-west1.firebasedatabase.app/tasks/<id>.json
```

`PUT` schreibt den Datensatz unter der selbst vergebenen ID vollständig. Das ist
gewollt — der Workflow kennt alle Felder des neuen Tickets.

---

## 3. Warum nicht das Database Secret

Die Realtime Database kennt einen zweiten Weg: das Legacy Database Secret als
Query-Parameter, `?auth=SECRET`. Der ist kürzer und hier trotzdem falsch.

Firebase führt die Database Secrets ausdrücklich als **veraltet** und rät von
ihnen ab: Es sind langlebige Zugangsdaten ohne Ablauf und ohne Einschränkung —
wer eines hat, hat Vollzugriff auf die gesamte Datenbank, bis es manuell
widerrufen wird. Es stünde außerdem in der URL und damit im Klartext in jedem
Log und in jedem Workflow-Export.

Der Service-Account-Token läuft nach einer Stunde ab und wird von n8n neu geholt.
Fällt er einem Log zum Opfer, ist der Schaden zeitlich begrenzt.

Quelle: Firebase-Dokumentation, *Database Secrets* (deprecated) sowie
*Authenticate REST Requests with a Service Account*.

---

## 4. Der Rules-Kompromiss

**Die Rules bleiben weitgehend offen.** `.read` steht in
[`../database.rules.json`](../database.rules.json) auf `true`, `.write` ist auf
`tasks` und `contacts` offen. Wie die Datei in die Datenbank kommt, steht in
[`deployment.md`](deployment.md#7-datenbank-regeln-einspielen), Abschnitt 7.

Der Grund ist unangenehm und gehört ausgesprochen: Das Frontend spricht die
Realtime Database **ohne Authentifizierung** an — der Login von Join ist eine
Eigenbau-Prüfung gegen den `users`-Knoten, kein Firebase Auth. Es gibt also kein
`auth`-Objekt, gegen das eine Regel prüfen könnte. Würde `.read` geschlossen,
brächen Login, Board und Kontakte sofort und vollständig.

**Eine Ausnahme gibt es:** Auf `users` erlaubt die Regel nur noch Anlegen und
Löschen, nicht das Ändern eines bestehenden Datensatzes — sonst könnte jeder,
der die Datenbank-URL kennt, ein fremdes Konto durch Überschreiben des
`pwHash` übernehmen. Die Begründung im Detail steht in
[`deployment.md`](deployment.md), Abschnitt 7.3.

Der Service Account ändert daran **nichts**. Er ist der saubere Weg für den
Server-Pfad und die Vorbereitung darauf, die Rules später zu schließen — aber
solange das Frontend unauthentifiziert schreibt, bringt er **keinen
Zugriffsschutz**. Das ist ein bewusster Demo-Kompromiss, kein gelöstes
Sicherheitsproblem.

### Was die Rules trotzdem leisten

**Datenmüll aus dem Browser abwehren.** Validiert werden auf jedem Task:

| Feld | erlaubt |
|---|---|
| `status` | `triage`, `todo`, `inprogress`, `awaitfeedback`, `done` |
| `prio` | `urgent`, `medium`, `low` |
| `source` | `manual`, `email` |
| `aiGenerated` | Boolean |
| `createdAt` | Number |

Die Statuswerte sind Zeichen für Zeichen dieselben wie `TASK_STATUS` in
[`../js/core/constants.js`](../js/core/constants.js). Weichen sie ab, lehnt
Firebase die Schreibvorgänge der Seite kommentarlos ab — bei jeder Änderung an
einer der beiden Stellen die andere mitziehen.

**Auf die Schreibvorgänge des Workflows greifen sie dagegen nicht.** n8n
authentifiziert sich mit einem Service-Account-Token, und der gilt in der
Realtime Database als Admin-Zugriff, der alle Regeln übergeht — auch die
`.validate`-Regeln. Was der Automat schreibt, prüft allein der Code-Node
`Map AI answer` in
[`../n8n/issue-collector.workflow.json`](../n8n/issue-collector.workflow.json).
Das ist kein Versehen, sondern die Kehrseite von Abschnitt 3: derselbe Token,
der kurzlebig und widerrufbar ist, bringt eben auch volle Rechte mit.

### Wirkungsweise

`.validate` greift **nur auf Feldern, die tatsächlich geschrieben werden**.
Fehlt `prio` an einem Bestandstask, stört das nicht; die Regel wird für dieses
Feld schlicht nicht ausgewertet. Ein Schreibvorgang mit `status: "backlog"` wird
dagegen abgelehnt — die gesamte Operation, nicht nur das eine Feld.

### Was den Kompromiss auflösen würde

Echtes Firebase Auth im Frontend (anonyme Anmeldung würde genügen, um ein
`auth`-Objekt zu bekommen) und ein eigenes Firebase-Projekt für Join. Beides ist
**nicht Teil dieser Ausbaustufe** und wäre ein Eingriff in bestehende Screens,
die laut Projektregeln unangetastet bleiben.

---

## 5. Betrieb neben Code a Cuisine

Zwei Stellen, an denen sich die beiden Projekte sonst in die Quere kommen.

### 5.1 Eigene Quota-Datei

Code a Cuisine schreibt seinen Tageszähler bereits nach
`/home/node/.n8n/quota-state.json`. Join darf diese Datei **nicht mitbenutzen** —
sonst teilen sich beide Projekte ein Kontingent und blockieren sich gegenseitig.

Join verwendet im selben Volume:

```
/home/node/.n8n/join-quota-state.json
```

Aufbau der Datei — `system` ist der Tageszähler aus dem Lastenheft (10),
`perSender` begrenzt zusätzlich einen einzelnen Absender auf 3 Anfragen:

```json
{ "day": "2026-08-26", "system": 4, "perSender": { "stakeholder@example.com": 2 } }
```

Zurücksetzen, analog zum bestehenden Zähler von Code a Cuisine:

```bash
cd /opt/code-a-cuisine
docker compose exec n8n rm -f /home/node/.n8n/join-quota-state.json
docker compose exec n8n sh -c 'ls /home/node/.n8n/ | grep -c join-quota-state.json'   # 0 = reset
```

Der Zähler wird **vor** dem KI-Aufruf hochgezählt, nicht nach dem erfolgreichen
Schreiben des Tickets. Eine Mail, an der das Modell scheitert, kostet ihren Slot
trotzdem — sonst wäre das Limit kein Kostenschutz, sondern nur eine Erfolgsstatistik.

**Bekannte Schwäche: der Zähler ist Read-Modify-Write ohne Sperre.** Der
Code-Node liest die Datei, erhöht den Wert und schreibt sie zurück. Treffen zwei
Mails so dicht hintereinander ein, dass zwei Workflow-Läufe sich überlappen,
lesen beide denselben Stand und schreiben denselben erhöhten Wert — ein Slot
zählt dann nur einmal. Bei zehn Anfragen am Tag in einer Demo ist das
hinnehmbar; als stiller Fehler soll es trotzdem nicht dastehen. Sauber wäre eine
Datei-Sperre oder ein Zähler in der Datenbank statt im Dateisystem.

### 5.2 Eigene Webhook-Pfade

```
/webhook/join-status    — Statusbenachrichtigung beim Spaltenwechsel
/webhook/join-quota     — Tageslimit für die Landing Page
```

Das Präfix `join-` hält sie von den Code-a-Cuisine-Pfaden getrennt.

Caddy lässt `/webhook/*` bereits durch — für die Join-Pfade ist **nichts
zusätzlich freizuschalten**. Die Caddy-Konfiguration wird für Join nicht
angefasst.

**CORS muss der jeweilige Workflow selbst setzen.** Caddy tut das nicht. Das
erledigt der **Webhook-Node** über *Allowed Origins (CORS)* — er beantwortet
damit auch den Preflight (`OPTIONS`) selbst. Am „Respond to Webhook"-Node sind
**keine** CORS-Header von Hand zu setzen; eine frühere Fassung dieses Abschnitts
behauptete das Gegenteil, der Live-Test hat es widerlegt (Abschnitt 9.6).

---

## 6. Was der Issue Collector zusätzlich am Container braucht

Vier Punkte, die nur der Issue Collector benötigt und die nicht im Workflow
stehen können. Alle vier sind am laufenden System verifiziert, nicht vermutet.

### 6.1 `NODE_FUNCTION_ALLOW_EXTERNAL=imap`

Der IMAP-Trigger kann eine Mail **nicht verschieben**. Sein Feld *Action* kennt
genau zwei Werte, „None" und „Mark as Read"; einen Zielordner gibt es dort
nicht. Das Lastenheft verlangt das Verschieben aber zweimal ausdrücklich — nach
`erledigt` bei erfolgreicher Verarbeitung, nach `zu-bearbeiten` im Fehlerfall.
Also erledigt es ein Code-Node, der sich selbst per `require('imap')` mit dem
Postfach verbindet.

n8n lädt in Code-Nodes nur Module, die ausdrücklich freigegeben sind:

```yaml
# /opt/code-a-cuisine/docker-compose.yml
environment:
  - NODE_FUNCTION_ALLOW_EXTERNAL=imap
```

`imap@0.8.19` liegt bereits im n8n-Image, es ist also nichts nachzuinstallieren.
Die Variable ist seit dem 26.08.2026 gesetzt und am Container geprüft:
`require('imap')` liefert dort `typeof === "function"`.

Ohne die Freigabe scheitern die drei `Move mail to …`-Nodes bei jedem Lauf. Weil
sie auf `continueOnFail` stehen, fällt das nicht als roter Workflow auf — die
Mails bleiben einfach in der INBOX liegen. Der Ordnername `zu-bearbeiten` trägt
übrigens einen **Bindestrich**; im Postfach heißt er so, auch wenn das
Lastenheft „zu bearbeiten" schreibt.

**Die Zielordner brauchen das Namespace-Präfix `INBOX.`** Auf diesem Mailserver
heißen sie `INBOX.erledigt` und `INBOX.zu-bearbeiten` — nicht `erledigt` und
`zu-bearbeiten`. Ohne Präfix bricht der Move ab:

```
Client tried to access nonexistent namespace
```

Der Server legt die Unterordner unterhalb von `INBOX` an; ein Name ohne Präfix
zeigt für ihn in einen Namespace, den es nicht gibt. Die drei
`Move mail to …`-Nodes tragen das Präfix in ihrem `TARGET_FOLDER` bereits.

### 6.2 `JOIN_IMAP_USER` und `JOIN_IMAP_PASSWORD`

Dieselben Code-Nodes brauchen Zugangsdaten. Ein n8n-Credential können sie nicht
verwenden — Credentials stehen nur konfigurierten Nodes zur Verfügung, nicht dem
Code darin. Sie kämen also als Klartext in den Code-Node, und der Code-Node
steht im Workflow-Export, und der Export liegt im Repository.

Deshalb kommen sie aus der Umgebung des Containers:

```yaml
# /opt/code-a-cuisine/docker-compose.yml
environment:
  - JOIN_IMAP_USER=${JOIN_IMAP_USER}
  - JOIN_IMAP_PASSWORD=${JOIN_IMAP_PASSWORD}
```

Die Werte selbst in die `.env` neben der Compose-Datei — nie ins Repository.
Nach der Änderung `docker compose up -d` aus `/opt/code-a-cuisine`.

Die Nodes lesen sie über `$env.JOIN_IMAP_USER` und `$env.JOIN_IMAP_PASSWORD` und
werfen einen sprechenden Fehler, wenn eine der beiden fehlt. Voraussetzung ist
`N8N_BLOCK_ENV_ACCESS_IN_NODE=false`, und zwar ausdrücklich gesetzt — siehe
Abschnitt 6.3.

### 6.3 `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`

Die Variable muss **ausdrücklich in der Compose-Datei stehen**. Fehlt sie,
scheitert jeder `$env`-Zugriff im Code-Node:

```
access to env vars denied
```

Die drei `Move mail to …`-Nodes fallen damit aus, bevor sie überhaupt eine
Verbindung aufbauen — sie kommen nicht an `JOIN_IMAP_USER` und
`JOIN_IMAP_PASSWORD` heran.

```yaml
# /opt/code-a-cuisine/docker-compose.yml, Zeile 52
environment:
  - N8N_BLOCK_ENV_ACCESS_IN_NODE=false
```

Dass n8n die Variable von Haus aus auf `false` führt, half hier nicht: Ohne den
Eintrag war der Zugriff im laufenden Container blockiert. Die Zeile steht seit
dem Live-Test drin.

### 6.4 SMTP nur über Port 587

**Hetzner Cloud sperrt ausgehend die Ports 25 und 465.** Offen ist allein
**587**. Das SMTP-Credential läuft deshalb auf 587 mit **STARTTLS**:

| Feld im Credential | Wert |
|---|---|
| Port | `587` |
| SSL/TLS | **aus** |
| STARTTLS | an |

Mit Port 465 gibt es keine Fehlermeldung, an der man das erkennen könnte: Der
Versand **hängt**, bis der Execution-Timeout des Workflows zuschlägt. Der
betroffene `Send …`-Node steht bis dahin auf „running", und der Lauf bricht
zuletzt am Timeout ab statt an der Verbindung — die Ursache steht nirgends im
Log.

---

## 7. Vor dem ersten Import prüfen

Acht Punkte am Container. Alle acht sind gesetzt und am 26.08.2026 am
laufenden Container nachgewiesen.

| # | Prüfpunkt | Warum |
|---|---|---|
| 1 | Volume für `/home/node/.n8n` vorhanden | erledigt. `docker inspect code-a-cuisine-n8n-1` zeigt `volume code-a-cuisine_n8n_data … -> /home/node/.n8n`; der Container hat seither vier Neustarts überstanden, ohne Credentials oder Workflows zu verlieren. Ohne Volume wären Workflows, Credentials und der Quota-Stand nach jedem Neustart weg. |
| 2 | `WEBHOOK_URL` gesetzt | erledigt. `printenv` im Container liefert `https://n8n.thomas-toebbe.de/`. Ohne die Variable baut n8n die Webhook-URLs gegen `localhost:5678` — die Landing Page bekäme eine unbrauchbare Adresse. |
| 3 | `TZ=UTC` | bereits gesetzt. Der Tageszähler rechnet auf UTC-Mitternacht; eine andere Zeitzone verschiebt den Reset. |
| 4 | `NODE_FUNCTION_ALLOW_BUILTIN=fs` | bereits gesetzt. Ohne das kann der Quota-Guard die Zählerdatei nicht schreiben. |
| 5 | `NODE_FUNCTION_ALLOW_EXTERNAL=imap` | seit dem 26.08.2026 gesetzt. Siehe Abschnitt 6.1. |
| 6 | `JOIN_IMAP_USER` und `JOIN_IMAP_PASSWORD` | gesetzt — der Live-Test hat sich am Postfach angemeldet. Siehe Abschnitt 6.2. |
| 7 | `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` | seit dem Live-Test gesetzt, `docker-compose.yml` Zeile 52. Ohne den Eintrag scheitert `$env` im Code-Node. Siehe Abschnitt 6.3. |
| 8 | `JOIN_NOTIFY_SECRET` | seit dem Live-Test des Status-Workflows gesetzt. Muss denselben Wert tragen wie `NOTIFY_CONFIG.SECRET` im Client; fehlt sie ganz, bricht der Guard-Node mit sprechendem Fehler ab. Siehe Abschnitt 9.1. |

Prüfen lässt sich das so:

```bash
cd /opt/code-a-cuisine
docker compose exec n8n env | grep -E "WEBHOOK_URL|^TZ=|NODE_FUNCTION_ALLOW_|JOIN_IMAP_USER|N8N_BLOCK_ENV_ACCESS_IN_NODE"
docker compose exec n8n env | grep -cE "^JOIN_NOTIFY_SECRET=."   # 1 = gesetzt
docker compose config | grep -A5 volumes
```

---

## 8. Import-Weg

Über den **n8n-Editor**, per SSH-Tunnel erreichbar (siehe Abschnitt 1):
*Workflow → Import from File*, JSON aus `../n8n/` auswählen.

**Nicht über die CLI.** `n8n import:workflow` setzt importierte Workflows
inaktiv; sie müssten anschließend ohnehin einzeln in der UI aktiviert werden,
und stille Fehlschläge fallen dabei leicht durch.

Nach **jedem** Import die Workflow-Settings im Editor von Hand nachziehen — der
Import übernimmt sie nicht und lässt die Standardwerte der Instanz stehen:

| Setting | Wert | Warum |
|---|---|---|
| **Timeout** | `80` Sekunden | Der Issue Collector wartet auf die KI-Antwort; der Standardwert ist dafür zu knapp. |
| **Timezone** | `UTC` | Der Tageszähler rechnet auf UTC-Mitternacht, eine andere Zeitzone verschiebt den Reset. |
| **Error Workflow** | — | Sonst schlägt ein Fehler still fehl. |

Timeout und Timezone **stehen in der JSON** — `settings.executionTimeout: 80`
und `settings.timezone: "Etc/UTC"`. Der Import liest sie trotzdem nicht ein.
Deshalb beide nach jedem Import einzeln kontrollieren, statt sich auf die Datei
zu verlassen.

Ebenfalls nach dem Import zu setzen, weil es nicht in der JSON steckt:

- **Credentials neu zuordnen.** Der Export enthält Credential-Referenzen
  (ID und Name). Stimmen die IDs der Zielinstanz nicht überein, hängen die Nodes
  ohne Zugangsdaten in der Luft.
- **Webhook-Pfade prüfen**, damit sie nach dem Import noch `join-` tragen.
- **Workflow aktivieren.**

---

## 9. Der Status-Workflow

`n8n/status-notify.workflow.json`, Webhook `POST /webhook/join-status`. Das
Board meldet dorthin jeden Spaltenwechsel, den es tatsächlich gespeichert hat;
der Workflow entscheidet allein, ob daraus eine Mail wird.

### 9.1 `JOIN_NOTIFY_SECRET`

Die dritte Env-Variable neben `JOIN_IMAP_USER` und `JOIN_IMAP_PASSWORD`. Der
Guard-Node liest sie über `$env.JOIN_NOTIFY_SECRET` und vergleicht sie mit dem
Header `x-join-secret` der Anfrage.

```yaml
# /opt/code-a-cuisine/docker-compose.yml
environment:
  - JOIN_NOTIFY_SECRET=${JOIN_NOTIFY_SECRET}
```

Der Wert selbst in die `.env` neben der Compose-Datei. Er muss **denselben Wert
haben wie `NOTIFY_CONFIG.SECRET`** in [`../js/core/constants.js`](../js/core/constants.js) —
sonst weist der Guard jede Anfrage des Boards ab.

Voraussetzung ist wie bei den IMAP-Variablen `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`
(Abschnitt 6.3). Fehlt die Variable ganz, wirft der Guard-Node einen sprechenden
Fehler statt still alles abzulehnen — sonst wäre der Zustand „Secret nicht
gesetzt" vom Zustand „Secret falsch" nicht zu unterscheiden.

### 9.2 Warum das Secret keine Sicherheit ist

`NOTIFY_CONFIG.SECRET` steht im ausgelieferten Client-Code. Jeder, der das Board
im Browser öffnet, kann es aus den Dev-Tools lesen. Es hält Zufallsanfragen und
Scanner ab, mehr nicht — als Zugangsschutz taugt es nicht, und es soll auch nicht
als solcher gelesen werden.

Was den Endpunkt tatsächlich schützt, sind drei Eigenschaften des Workflows:

| Schutz | Wirkung |
|---|---|
| **Empfänger aus der Datenbank** | Der Node `Fetch task` holt den Ticket-Datensatz und nimmt die Adresse aus `createdBy.email`. Käme sie aus dem Request-Body, wäre der Webhook ein offener Mailversender: Wer das Secret aus dem Client-Code hat, könnte an beliebige Adressen schicken lassen. So kann der Workflow nur den Ersteller eines **existierenden** Tickets anschreiben. |
| **Statusprüfung** | `from` und `to` müssen zwei **verschiedene** der fünf gültigen Statuswerte sein. Erfundene Werte und Nicht-Wechsel fliegen raus, bevor irgendetwas gelesen wird. |
| **Deckelung** | Höchstens **3 Mails pro Ticket und Tag**. Wer eine Karte zwanzigmal hin und her schiebt, schreibt den Absender nicht zwanzigmal an. |

Der Guard prüft in genau dieser Reihenfolge: erst das Secret, dann die Felder,
dann die Statuswerte, zuletzt die Deckelung. So rührt eine Anfrage ohne Secret
die Zählerdatei nicht an.

Alles, was durchfällt, bekommt dieselbe nackte Antwort — HTTP 403 mit
`{ "status": "rejected" }`. Der Grund steht nur im Execution-Log, nicht in der
Antwort: Ein Aufrufer soll nicht erfahren, an welcher Prüfung er gescheitert ist.

**Der Client wertet die Antwort ohnehin nicht aus.** `notifyStatusChange` feuert
und vergisst — schlägt der Aufruf fehl, weil n8n aus ist, merkt das Board davon
nichts. Die drei Antworten sind zum Debuggen von Hand da.

### 9.3 Eigene Zählerdatei

```
/home/node/.n8n/join-notify-state.json
```

Die **dritte** Zählerdatei im selben Volume, getrennt von den beiden anderen:
`quota-state.json` gehört Code a Cuisine, `join-quota-state.json` dem Issue
Collector (Abschnitt 5.1). Sie zusammenzulegen hieße, dass eingehende Mails und
ausgehende Statusmails sich ein Kontingent teilen.

Aufbau — `perTask` zählt pro Ticket-ID, `day` ist der UTC-Tag:

```json
{ "day": "2026-08-26", "perTask": { "t2": 2, "t7": 1 } }
```

Zurücksetzen:

```bash
cd /opt/code-a-cuisine
docker compose exec n8n rm -f /home/node/.n8n/join-notify-state.json
docker compose exec n8n sh -c 'ls /home/node/.n8n/ | grep -c join-notify-state.json'   # 0 = reset
```

Die **bekannte Schwäche aus Abschnitt 5.1 gilt hier genauso**: Read-Modify-Write
ohne Sperre. Zwei Spaltenwechsel im selben Moment lesen denselben Stand und
zählen zusammen nur einen Slot. Bei drei Mails pro Ticket und Tag ist das
hinnehmbar.

### 9.4 CORS

Der Aufruf kommt aus dem Browser, nicht vom Server. Der Webhook-Node trägt
deshalb unter *Allowed Origins (CORS)* die Domains, von denen das Board
ausgeliefert wird:

```
https://join.thomas-toebbe.de,http://127.0.0.1:5500,http://localhost:5500,http://localhost:8080
```

Die letzten drei sind die lokalen Entwicklungsadressen: Live Server (5500, je
nach Einstellung unter `127.0.0.1` oder `localhost`) und `python -m http.server
8080` aus der [`../README.md`](../README.md).

**Diese Liste ist gegen das echte Deployment zu prüfen.** Steht dort die falsche
Domain, schlägt der Aufruf im Browser fehl, während er per `curl` funktioniert —
ein Fehlerbild, das leicht in die Irre führt, weil der Workflow im Execution-Log
sauber durchläuft und trotzdem nichts ankommt.

Den Preflight beantwortet der Webhook-Node selbst, sobald das Feld gefüllt ist.
Am Respond-Node ist dafür **nichts** nachzurüsten (Abschnitt 5.2).

An Caddy ist nichts zu tun: `/webhook/*` ist bereits durchgelassen
(Abschnitt 5.2).

### 9.5 Nach dem Import

Wie bei jedem Import (Abschnitt 8) von Hand nachziehen:

| Was | Wert |
|---|---|
| Timeout | `80` Sekunden |
| Timezone | `UTC` |
| Credentials | `Join V2 - Firebase RTDB (Service Account)` an `Fetch task`, `Join V2 - issues (SMTP)` an `Send status mail` |
| Webhook-Pfad | `join-status` |

Danach den Workflow aktivieren. Nach `JOIN_NOTIFY_SECRET` in `.env` und Compose
muss der Container einmal neu starten (`docker compose up -d`), sonst kennt der
Guard die Variable nicht.

### 9.6 Am laufenden System geprüft

Der Workflow ist importiert, aktiv und getestet;
[`../n8n/status-notify.workflow.json`](../n8n/status-notify.workflow.json) ist
der Export aus der laufenden Instanz. Vier Punkte, die am Entwurf noch offen
waren, sind damit geklärt und beim nächsten Import **nicht erneut zu prüfen**:

| Punkt | Ergebnis |
|---|---|
| `typeVersion` des Webhook-Nodes | passt. n8n zeigt am Node keinen Upgrade-Hinweis. |
| Schlüssel `options.allowedOrigins` | richtig benannt. Die vier Domains aus Abschnitt 9.4 stehen nach dem Import im Feld *Allowed Origins (CORS)*. |
| `typeVersion` der drei Respond-Nodes | passt. |
| HTTP 403 an `Respond: rejected` | kommt beim Aufrufer an — der `responseCode` aus den Node-Optionen wird durchgereicht. |

Der Preflight braucht nichts Zusätzliches: Der Webhook-Node beantwortet
`OPTIONS` selbst, am Respond-Node sind keine CORS-Header nötig. Abschnitt 5.2
sagte das Gegenteil und ist entsprechend korrigiert.

**Live-Test am Board:**

- Ein Statuswechsel an einem Ticket mit externem Ersteller löst **genau eine**
  Mail aus.
- Ab dem **vierten** Wechsel desselben Tickets am selben Tag greift die
  Deckelung — keine Mail mehr, Antwort 403 (Abschnitt 9.2).
- Ein Ticket mit internem Ersteller löst **keine** Mail aus; der Lauf endet an
  `Notify creator?` mit `skipped`.

---

## 10. Der Quota-Workflow

`n8n/quota-status.workflow.json`, Webhook `GET /webhook/join-quota`. Er liefert
der Landing Page den Stand des Tageslimits — mehr nicht. Drei Nodes:

```
Receive quota request                       [Webhook GET /webhook/join-quota]
  └─ Read counter                           [Code]
       └─ Respond: counter                  [200, {"used": n, "limit": 10}]
```

### 10.1 Dieselbe Zählerdatei, nur lesend

```
/home/node/.n8n/join-quota-state.json
```

Das ist die Datei aus Abschnitt 5.1, die der **Issue Collector schreibt**. Der
Quota-Workflow liest sie und schreibt sie nie. Daraus folgen zwei Dinge:

- Ein Aufruf des Endpunkts **verbraucht keinen Slot**. Wer die Adresse im
  Sekundentakt abruft, sperrt damit niemanden aus.
- Die Zahl kann nur **hinterherhinken**, nie vorlaufen. Zwischen Abruf und
  einer eintreffenden Mail liegt das übliche Rennen; bei zehn Anfragen am Tag
  ist das ohne Bedeutung.

Fehlt die Datei — noch keine Mail an diesem Tag, oder der Zähler wurde
zurückgesetzt —, antwortet der Workflow `used: 0`. Steht darin ein **früherer**
UTC-Tag, ebenfalls `used: 0`: `Read counter` verwendet dafür dieselbe Funktion
`resetWhenNewDay` wie der Guard des Issue Collectors, Zeichen für Zeichen. Beide
sehen damit dieselbe Tagesgrenze, und der Zähler springt auf der Landing Page
zur selben Minute auf null, in der die Mailverarbeitung wieder Slots vergibt.

### 10.2 `limit` steht an zwei Stellen

`SYSTEM_LIMIT = 10` im Node `Read counter` und `SYSTEM_LIMIT = 10` im Guard des
Issue Collectors. **n8n kennt keine geteilten Konstanten zwischen Workflows** —
die beiden Stellen sind zusammen zu ändern.

Läuft die Zahl auseinander, entsteht der unangenehme Fall lautlos: Die Seite
meldet „Limit erreicht", während das Postfach weiter Tickets anlegt, oder
umgekehrt. Ein dritter Ort trägt dieselbe Zahl, ist aber unkritisch —
`data-request-limit="10"` in
[`../html/pages/request.html`](../html/pages/request.html) dient nur als
Rückfallwert, solange der Endpunkt nicht antwortet; die Antwort überschreibt ihn.

### 10.3 Der Endpunkt ist bewusst offen

Kein Secret, kein Token. Er gibt zwei Zahlen preis: wie viele der täglichen
Anfragen verbraucht sind und wie viele es gibt. Dieselben zwei Zahlen stehen
sichtbar auf der Landing Page.

Ein Secret würde daran nichts verbessern, sondern nur so aussehen: Es müsste im
ausgelieferten Client-Code stehen, und damit hielte es jeder in der Hand, der
den Seitenquelltext öffnet — genau die Begründung aus Abschnitt 9.2, nur ohne
den Schaden, den ein missbrauchter Statuswebhook anrichten könnte. Der
Quota-Endpunkt schreibt nichts, verschickt nichts und kostet nichts.

### 10.4 CORS

Der Webhook-Node trägt **dieselbe** Liste wie der Status-Workflow
(Abschnitt 9.4):

```
https://join.thomas-toebbe.de,http://127.0.0.1:5500,http://localhost:5500,http://localhost:8080
```

Die beiden Listen sind zusammen zu pflegen. Kommt eine Domain dazu und nur
einer der beiden Workflows erfährt davon, fällt das erst im Browser auf: Der
Aufruf läuft per `curl` sauber durch, im Browser verwirft ihn die
Same-Origin-Prüfung.

### 10.5 Nach dem Import

| Was | Wert |
|---|---|
| Timeout | `80` Sekunden |
| Timezone | `UTC` |
| Credentials | keine — der Workflow spricht weder Firebase noch SMTP an |
| Webhook-Pfad | `join-quota` |
| HTTP-Methode | `GET` |

Danach aktivieren und im Browser aufrufen:

```
https://n8n.thomas-toebbe.de/webhook/join-quota
```

Erwartet wird `{"used":0,"limit":10}` beziehungsweise der Stand des Tages.

### 10.6 Was die Landing Page daraus macht

[`../js/features/landing/request-limit.js`](../js/features/landing/request-limit.js)
holt die Zahlen beim Laden der Seite, mit **3 Sekunden Timeout** über
`AbortSignal`. Drei Verhaltensweisen sind Absicht:

- **Endpunkt tot, langsam oder mit Fehler:** `used = 0`, die Seite zeigt den
  verfügbaren Zustand. Der umgekehrte Fehler wäre der schlimmere — eine
  ausgefallene n8n-Instanz würde Stakeholdern grundlos den Weg versperren.
- **`?used=` in der URL gewinnt** über die Antwort des Endpunkts. Das ist der
  Testschalter für beide UI-Zustände (`?used=4`, `?used=10`) und bleibt es.
- **`limit` aus der Antwort** übernimmt die Seite, wenn es eine Zahl größer
  null ist; sonst bleibt `data-request-limit`.

### 10.7 Am laufenden System geprüft

Der Workflow ist importiert, aktiv und getestet;
[`../n8n/quota-status.workflow.json`](../n8n/quota-status.workflow.json) ist der
Export aus der laufenden Instanz. Was am Entwurf noch offen war, ist damit
geklärt und beim nächsten Import **nicht erneut zu prüfen**:

| Punkt | Ergebnis |
|---|---|
| `respondWith: "json"` zusammen mit `={{ JSON.stringify(…) }}` | richtig so. Der Aufruf von `https://n8n.thomas-toebbe.de/webhook/join-quota` liefert `{"limit":10,"used":1}` — ein echtes JSON-Objekt, keinen String und kein doppelt kodiertes JSON. Der Ausdruck erzeugt den Text, der Node setzt den `Content-Type`; zusammen ergibt das genau **eine** Kodierung. |
| `httpMethod` im Webhook-Node | steht nicht mehr im Export. `GET` ist der Vorgabewert des Nodes, und Vorgabewerte schreibt n8n nicht mit. Der Endpunkt antwortet weiterhin auf `GET` — der Wert fehlt im JSON, nicht am Node. Abschnitt 10.5 bleibt damit gültig. |
| CORS im Browser | die Liste aus Abschnitt 10.4 stimmt. `request.html` von `http://127.0.0.1:5500` bekommt die Antwort, der Browser verwirft sie nicht. Ein `curl`-Test allein hätte das nicht gezeigt. |

**Live-Test an der Seite:** `request.html` zeigt den echten Stand des Tages —
`1 of 10` bei einer verbrauchten Anfrage. Die Zahl kommt aus dem Endpunkt, nicht
aus `data-request-limit` und nicht aus `?used=`.
