# n8n-Setup — Join Issue Collector

Wie die Join-Workflows in die laufende n8n-Instanz kommen, wie sie nach Firebase
schreiben und was neben Code a Cuisine zu beachten ist.

Diese Datei beschreibt den Weg. Sie führt ihn nicht aus: Service Account anlegen,
Rules einspielen, Credential erzeugen und der Schreibtest sind Handarbeit an der
laufenden Umgebung.

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

**Die Rules bleiben offen.** `.read` und `.write` stehen in
[`../database.rules.json`](../database.rules.json) auf `true`.

Der Grund ist unangenehm und gehört ausgesprochen: Das Frontend spricht die
Realtime Database **ohne Authentifizierung** an — der Login von Join ist eine
Eigenbau-Prüfung gegen den `users`-Knoten, kein Firebase Auth. Es gibt also kein
`auth`-Objekt, gegen das eine Regel prüfen könnte. Würden `.read`/`.write`
geschlossen, brächen Login, Board und Kontakte sofort und vollständig.

Der Service Account ändert daran **nichts**. Er ist der saubere Weg für den
Server-Pfad und die Vorbereitung darauf, die Rules später zu schließen — aber
solange das Frontend unauthentifiziert schreibt, bringt er **keinen
Zugriffsschutz**. Das ist ein bewusster Demo-Kompromiss, kein gelöstes
Sicherheitsproblem.

### Was die Rules trotzdem leisten

**Datenmüll abwehren.** Genau dafür sind sie da, sobald ab Phase 6 ein Automat
schreibt. Validiert werden auf jedem Task:

| Feld | erlaubt |
|---|---|
| `status` | `triage`, `todo`, `inprogress`, `awaitfeedback`, `done` |
| `prio` | `urgent`, `medium`, `low` |
| `source` | `manual`, `email` |
| `aiGenerated` | Boolean |
| `createdAt` | Number |

Die Statuswerte sind Zeichen für Zeichen dieselben wie `TASK_STATUS` in
[`../js/core/constants.js`](../js/core/constants.js). Weichen sie ab, lehnt
Firebase die Schreibvorgänge des Workflows kommentarlos ab — bei jeder Änderung
an einer der beiden Stellen die andere mitziehen.

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

**CORS muss der jeweilige Workflow selbst setzen.** Caddy tut das nicht. Der
„Respond to Webhook"-Node braucht die passenden Header für die Join-Subdomain,
sonst blockt der Browser den Aufruf von der Landing Page.

---

## 6. Was der Issue Collector zusätzlich am Container braucht

Zwei Punkte, die nur der Issue Collector benötigt und die nicht im Workflow
stehen können.

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
werfen einen sprechenden Fehler, wenn eine der beiden fehlt. Voraussetzung ist,
dass `N8N_BLOCK_ENV_ACCESS_IN_NODE` **nicht** auf `true` steht — der Standard ist
`false`, also ist normalerweise nichts zu tun.

---

## 7. Vor dem ersten Import prüfen

Sechs Punkte am Container. Die Zeilen 3 bis 5 sind gesetzt; 1, 2 und 6 sind
offen und vor dem ersten Join-Import zu klären.

| # | Prüfpunkt | Warum |
|---|---|---|
| 1 | Volume für `/home/node/.n8n` vorhanden | **offen.** Ohne Volume sind Workflows, Credentials und der Quota-Stand nach jedem Container-Neustart weg. |
| 2 | `WEBHOOK_URL` gesetzt | **offen.** Ohne die Variable baut n8n die Webhook-URLs gegen `localhost:5678` — die Landing Page bekommt eine unbrauchbare Adresse. |
| 3 | `TZ=UTC` | bereits gesetzt. Der Tageszähler rechnet auf UTC-Mitternacht; eine andere Zeitzone verschiebt den Reset. |
| 4 | `NODE_FUNCTION_ALLOW_BUILTIN=fs` | bereits gesetzt. Ohne das kann der Quota-Guard die Zählerdatei nicht schreiben. |
| 5 | `NODE_FUNCTION_ALLOW_EXTERNAL=imap` | seit dem 26.08.2026 gesetzt. Siehe Abschnitt 6.1. |
| 6 | `JOIN_IMAP_USER` und `JOIN_IMAP_PASSWORD` | **offen.** Siehe Abschnitt 6.2. |

Prüfen lässt sich das so:

```bash
cd /opt/code-a-cuisine
docker compose exec n8n env | grep -E "WEBHOOK_URL|^TZ=|NODE_FUNCTION_ALLOW_|JOIN_IMAP_USER"
docker compose config | grep -A5 volumes
```

---

## 8. Import-Weg

Über den **n8n-Editor**, per SSH-Tunnel erreichbar (siehe Abschnitt 1):
*Workflow → Import from File*, JSON aus `../n8n/` auswählen.

**Nicht über die CLI.** `n8n import:workflow` setzt importierte Workflows
inaktiv; sie müssten anschließend ohnehin einzeln in der UI aktiviert werden,
und stille Fehlschläge fallen dabei leicht durch.

Nach **jedem** Import die Workflow-Settings kontrollieren — beim Import werden
sie nicht übernommen und fallen auf die Standardwerte zurück:

- **Timeout** — der Issue Collector wartet auf die KI-Antwort, der Standardwert
  ist dafür knapp
- **Error Workflow** — sonst schlägt ein Fehler still fehl

Ebenfalls nach dem Import zu setzen, weil es nicht in der JSON steckt:

- **Credentials neu zuordnen.** Der Export enthält Credential-Referenzen
  (ID und Name). Stimmen die IDs der Zielinstanz nicht überein, hängen die Nodes
  ohne Zugangsdaten in der Luft.
- **Webhook-Pfade prüfen**, damit sie nach dem Import noch `join-` tragen.
- **Workflow aktivieren.**
