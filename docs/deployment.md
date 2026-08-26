# Deployment — Join Issue Collector

Wie die Seite auf die Subdomain **`join.thomas-toebbe.de`** kommt: was
hochgeladen wird, welche Secrets der Workflow braucht und was nach dem ersten
Deploy zu prüfen ist.

Der Workflow liegt in
[`../.github/workflows/deploy-frontend.yml`](../.github/workflows/deploy-frontend.yml)
und lädt die Dateien per SFTP auf den Hetzner-Webspace. Es gibt **keinen
Build-Step** — die Dateien im Repository sind die Dateien, die online gehen.

---

## 1. Was deployt wird — und was nicht

Der Workflow spiegelt nicht das Repository, sondern kopiert vorher genau fünf
Einträge in ein Staging-Verzeichnis und lädt **nur dieses** hoch:

```
index.html
html/
css/
js/
assets/
```

Das ist eine **Positivliste, keine Ausschlussliste** — und zwar bewusst:

- Code a Cuisine spiegelt `dist/…/browser`, einen sauber abgegrenzten
  Build-Ordner. Join hat keinen. Ein Spiegeln des Wurzelverzeichnisses würde
  `.git/`, `docs/`, `n8n/`, `tools/`, `database.rules.json` und `CLAUDE.md`
  mit auf den Webspace legen.
- Eine Ausschlussliste altert schlecht: Was später im Repository dazukommt,
  wäre automatisch online, bis jemand daran denkt, es auszuschließen. Bei einer
  Positivliste ist es umgekehrt — Neues bleibt offline, bis es hier eingetragen
  wird.

**Kommt ein sechster Ordner dazu, der ausgeliefert werden soll, muss er in die
Liste im Workflow.** Fehlt umgekehrt einer der fünf im Checkout, bricht der Lauf
ab, statt eine unvollständige Seite hochzuladen. Zusätzlich wird nach dem
Kopieren geprüft, dass `index.html` und `js/core/constants.js` wirklich im
Staging liegen.

Hochgeladen wird mit `lftp mirror --reverse --delete`: Dateien, die im Staging
fehlen, verschwinden auf dem Server. Das hält alte Stände sauber weg — und ist
der Grund für die Schutzprüfung in Abschnitt 2.

### Keine `.htaccess`

Join ist **keine** Single-Page-Application. Es sind echte HTML-Dateien unter
echten Pfaden, es gibt keine Client-Routen und damit nichts umzuschreiben. Die
`.htaccess` aus dem Code-a-Cuisine-Deployment entfällt hier ersatzlos, der
Workflow legt keine an.

**Offen:** Ob ein HTTPS-Redirect nötig ist, entscheidet die Hosting-Verwaltung.
Erzwingt der Hoster HTTPS bereits selbst, ist nichts zu tun. Falls nicht, wäre
das der einzige Grund, doch eine `.htaccess` einzuführen — dann aber als Datei
im Repository, damit der Mirror sie nicht beim nächsten Lauf löscht.

---

## 2. Die Secrets

Alle als **Repository-Secrets** (kein GitHub-Environment).

| Name | Pflicht | Form | Herkunft |
|---|---|---|---|
| `SFTP_HOST` | ja | `wXXXXXXX.kasserver.com` oder die Server-Adresse des Hosters | Hosting-Verwaltung, SFTP-Zugangsdaten. Identisch mit dem Wert im Code-a-Cuisine-Repo, wenn es derselbe Webspace ist |
| `SFTP_USER` | ja | `ssh-wXXXXXXX` — der Benutzername des SFTP-Zugangs | Hosting-Verwaltung, dort wo der Zugang angelegt wurde |
| `SFTP_PORT` | nein | `22` | nur setzen, wenn der Hoster einen abweichenden Port nennt. Ohne das Secret nimmt der Workflow 22 |
| `SFTP_REMOTE_DIR` | ja | absoluter Pfad, z. B. `/join.thomas-toebbe.de` | siehe unten |
| `SFTP_PASSWORD` | eine von beiden | das Passwort des SFTP-Benutzers | Passwortmanager |
| `SFTP_KEY` | eine von beiden | vollständiger privater Schlüssel inklusive `-----BEGIN …-----`/`-----END …-----`-Zeilen | Passwortmanager. Der öffentliche Teil muss beim Hoster hinterlegt sein |

Fehlt ein Pflicht-Secret, bricht der Lauf gleich im ersten Schritt ab und nennt
**welches** fehlt. Ist weder `SFTP_PASSWORD` noch `SFTP_KEY` gesetzt, ebenso.
Liegen beide vor, gewinnt der Schlüssel.

### `SFTP_REMOTE_DIR` — nie der Account-Root

Der Wert muss auf das **Dokumentenverzeichnis der Subdomain** zeigen, also auf
das Verzeichnis, in dem am Ende `index.html` liegen soll. Erkennbar ist es
daran, dass es dem Namen der Subdomain entspricht oder in der Hosting-Verwaltung
als deren Dokumentenstamm ausgewiesen ist — bei mehreren Subdomains auf einem
Account liegen sie üblicherweise als Geschwisterverzeichnisse nebeneinander.

**Der Account-Root wäre falsch, und zwar folgenschwer:** Der Upload läuft mit
`--delete`. Zeigt das Ziel auf die Ebene über den Subdomains, löscht der erste
Lauf alles, was nicht zu Join gehört — also die anderen Subdomains desselben
Accounts.

Deshalb prüft der Workflow den Wert, bevor er etwas hochlädt: Er muss ein
absoluter Pfad mit mindestens einem Segment unterhalb des Roots sein. `/`,
ein leerer Wert oder ein relativer Pfad brechen den Lauf ab. Diese Prüfung
erkennt einen *offensichtlich* zu vagen Wert — sie kann nicht wissen, ob ein
konkreter Pfad der richtige ist. **Den Pfad einmal in der Hosting-Verwaltung
nachsehen, nicht raten.**

### Klickpfad zum Anlegen

GitHub → Repository → *Settings* → *Secrets and variables* → *Actions* →
*New repository secret*. Dort Name und Wert eintragen, *Add secret*. Für jedes
Secret einmal.

Der Name muss **exakt** so geschrieben sein wie in der Tabelle, Großschreibung
eingeschlossen. Ein Tippfehler im Namen sieht aus wie ein fehlendes Secret.

---

## 3. Wie man deployt

Der Workflow hat **nur** `workflow_dispatch` als Auslöser — kein Push-Trigger.
Ein Commit auf `main` verändert die Live-Seite also nicht; ein Deployment ist
eine Entscheidung, kein Nebeneffekt des Committens.

GitHub → Repository → Reiter *Actions* → links *Deploy frontend* → rechts
*Run workflow* → Branch wählen (`main`) → *Run workflow*.

Zwei gleichzeitige Läufe würden sich ins Gehege kommen. Sie warten deshalb
aufeinander, statt sich gegenseitig abzubrechen — ein abgebrochener Mirror
hinterlässt eine halb hochgeladene Seite.

---

## 4. Nach dem ersten Deploy prüfen

Auf `https://join.thomas-toebbe.de`, mit offener Browser-Konsole:

| Was | Erwartung |
|---|---|
| Landing Page | lädt mit Bildern und Schriften. Fehlen sie, ist `assets/` nicht mit hochgeladen |
| Tageszähler | *Create request* zeigt den **echten** Stand, z. B. `1 of 10` — nicht stur `0 of 10` |
| Board | Login, Board lädt die Tasks aus Firebase, Triage-Spalte ist da |
| Legal-Seiten | *Legal notice* und *Privacy policy* sind erreichbar |
| Konsole | keine 404 auf `/css/…`, `/js/…`, `/assets/…`; keine CORS-Meldung |

Alle Pfade im Projekt sind absolut (`/css/…`, `/js/…`, `/assets/…`). Das
funktioniert nur, wenn die Seite im **Dokumentenstamm** der Subdomain liegt und
nicht in einem Unterverzeichnis — ein falscher `SFTP_REMOTE_DIR` fällt hier als
Seite ohne jedes Styling auf.

Der Zähler ist der einzige Punkt, der auch bei perfekt hochgeladenen Dateien
scheitern kann: Er kommt aus n8n, siehe nächster Abschnitt.

---

## 5. CORS — geprüft, nichts zu tun

Zwei n8n-Workflows werden aus dem Browser heraus aufgerufen und tragen ihre
Origin-Liste im Webhook-Node unter `options.allowedOrigins`. Steht die
Live-Domain dort nicht drin, verwirft der Browser die Antwort, obwohl der Aufruf
selbst durchläuft — lokal funktioniert dann alles, live nicht.

Beide Dateien wurden für dieses Deployment nachgeprüft:

| Datei | `allowedOrigins` | `https://join.thomas-toebbe.de` enthalten |
|---|---|---|
| [`../n8n/status-notify.workflow.json`](../n8n/status-notify.workflow.json) | `https://join.thomas-toebbe.de,http://127.0.0.1:5500,http://localhost:5500,http://localhost:8080` | **ja** |
| [`../n8n/quota-status.workflow.json`](../n8n/quota-status.workflow.json) | dieselbe Liste | **ja** |

**Es ist also nichts nachzutragen.** Die drei `localhost`-Einträge sind die
lokalen Entwicklungsadressen und bleiben absichtlich stehen.

Zu beachten: Die Liste im Repository ist der Export. Maßgeblich ist, was in der
**laufenden** n8n-Instanz steht. Weicht der Zähler live ab, obwohl der Endpunkt
per `curl` antwortet, ist das der erste Ort zum Nachsehen —
[`n8n-setup.md`](n8n-setup.md), Abschnitte 9.4 und 10.4.

---

## 6. Firebase — nichts nachzuziehen

Der Projektplan nennt für diese Phase „Key-Referrer und autorisierte Domain für
die Prod-Subdomain nachziehen". **Das trifft auf Join nicht zu.**

[`../js/core/firebase-service.js`](../js/core/firebase-service.js) spricht die
Realtime Database über REST an und baut die URL als
`${API_CONFIG.BASE_URL}/${path}.json` — **ohne API-Key**. Es gibt weder einen
Key mit Referrer-Beschränkung noch Firebase Auth mit einer Domain-Allowlist, die
um die neue Subdomain zu ergänzen wäre. Der Punkt entfällt ersatzlos.

Was den Zugriff tatsächlich begrenzt, sind die Regeln in
[`../database.rules.json`](../database.rules.json); dazu
[`n8n-setup.md`](n8n-setup.md), Abschnitt 4.

Die Datenbank-URL steht in
[`../js/core/constants.js`](../js/core/constants.js) und wird mit
ausgeliefert — deshalb prüft der Workflow, dass diese Datei im Staging liegt.
