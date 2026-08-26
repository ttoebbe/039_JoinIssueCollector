# Deployment — Join Issue Collector

Wie die Seite auf die Subdomain **`join.thomas-toebbe.de`** kommt: was
hochgeladen wird, welche Secrets der Workflow braucht und was nach dem ersten
Deploy zu prüfen ist.

Der Workflow liegt in
[`../.github/workflows/deploy-frontend.yml`](../.github/workflows/deploy-frontend.yml)
und lädt die Dateien per SFTP auf den Hetzner-Webspace. Es gibt **keinen
Build-Step** — die Dateien im Repository sind die Dateien, die online gehen.

Wie Webhosting, n8n-VPS und Firebase zusammenhängen, zeigt der Abschnitt
[*Architektur*](../README.md#architektur) in der README. Diese Datei behandelt
nur den Weg aufs Webhosting; der n8n-Teil steht in
[`n8n-setup.md`](n8n-setup.md).

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
| `SFTP_HOST` | ja | Hostname des Webspace — ohne `sftp://`, ohne Pfad | konsoleH → *Produktübersicht* → *FTP-Hauptbenutzer*, Feld **Server** |
| `SFTP_USER` | ja | Loginname des FTP-Zugangs | konsoleH → *Produktübersicht* → *FTP-Hauptbenutzer*, Feld **Loginname** |
| `SFTP_PORT` | nein | `22` | nur setzen, wenn der Hoster einen abweichenden Port nennt. Ohne das Secret nimmt der Workflow 22 |
| `SFTP_REMOTE_DIR` | ja | `/public_html/join` — der Dokumentenstamm von `join.thomas-toebbe.de`, absoluter Pfad | konsoleH, per WebFTP-Breadcrumb bestätigt. Hintergrund unten |
| `SFTP_PASSWORD` | eine von beiden | das Passwort des SFTP-Benutzers | Passwortmanager |
| `SFTP_KEY` | eine von beiden | vollständiger privater Schlüssel inklusive `-----BEGIN …-----`/`-----END …-----`-Zeilen | Passwortmanager. Der öffentliche Teil muss beim Hoster hinterlegt sein |

**`SFTP_HOST` und `SFTP_USER` stehen hier bewusst nicht im Klartext.** Dieses
Repository ist öffentlich, und beide Werte sind Teil der SFTP-Anmeldung — zusammen
mit dem Passwort ergäben sie einen vollständigen Zugang. Sie gehören in die
Secrets, nicht in die Dokumentation; die Spalte *Herkunft* sagt stattdessen, wo
sie zu finden sind.

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

### Das Secret aus Git Bash setzen — die MSYS-Falle

Wer den Wert per CLI setzt statt über die Weboberfläche, tritt unter Windows in
eine stille Falle. **Git Bash (MSYS) wandelt Argumente, die wie Unix-Pfade
aussehen, in Windows-Pfade um, bevor eine native `.exe` sie überhaupt sieht.**
Aus

```bash
gh secret set SFTP_REMOTE_DIR --body "/public_html/join"
```

wird im Secret `C:/Program Files/Git/public_html/join`. `gh` meldet dabei
**Exit 0**, und `gh secret list` zeigt nur Namen und Zeitstempel, keine Werte —
der Fehler bleibt bis zum Workflow-Lauf unsichtbar.

Sicher ist der Weg über stdin, dort greift keine Konvertierung:

```bash
printf '%s' "/public_html/join" | gh secret set SFTP_REMOTE_DIR --repo ttoebbe/039_JoinIssueCollector
```

Genau dieser Fall ist beim ersten Deploy eingetreten, und **die Schutzprüfung
oben hat ihn abgefangen**: Der verbogene Wert beginnt mit `C:` statt mit `/`,
der Lauf brach ab, bevor der erste `lftp`-Aufruf startete. Deshalb lief kein
`--delete` gegen ein falsches Ziel — der Grund, warum die Prüfung im Workflow
steht.

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

---

## 7. Datenbank-Regeln einspielen

[`../database.rules.json`](../database.rules.json) liegt im Repository, aber
**kein Automatismus spielt sie ein**. Die Datei ist die Vorlage; wirksam wird
sie erst, wenn ihr Inhalt in der Firebase-Konsole veröffentlicht wurde.

### 7.1 Der Weg

1. [console.firebase.google.com](https://console.firebase.google.com) öffnen
   und anmelden.
2. Das Projekt der V2-Datenbank wählen — es ist das, dessen Datenbank-URL in
   [`../js/core/constants.js`](../js/core/constants.js) steht
   (`joinv2withn8n-default-rtdb…`, Region `europe-west1`).
3. Links **Build → Realtime Database** wählen. Hat das Projekt mehrere
   Datenbank-Instanzen, oben die richtige auswählen — die URL muss zu
   `API_CONFIG.BASE_URL` passen.
4. Reiter **Regeln** (englisch *Rules*) öffnen.
5. Den **kompletten** Inhalt von `database.rules.json` in den Editor einfügen
   und das ersetzen, was dort steht. Kein Zusammenführen von Hand — die Datei
   im Repository ist der maßgebliche Stand.
6. **Veröffentlichen** (*Publish*) klicken. Der Editor meldet Syntaxfehler
   vorher; wird der Knopf nicht aktiv, ist der eingefügte Text unvollständig.
7. Danach die Prüfung aus 7.4 durchgehen.

Die Regeln greifen sofort, ein Neuladen der Seite genügt. Ein Deploy des
Frontends ist dafür **nicht** nötig — beides sind getrennte Wege.

### 7.2 Warum von Hand und nicht über die CLI

Firebase kann das auch: `firebase deploy --only database` spielt die Regeln aus
dem Repository ein. Der Weg ist hier trotzdem nicht eingerichtet, weil er vier
Dinge nach sich zieht, die es sonst im Projekt nicht gibt:

- eine `firebase.json`, die auf `database.rules.json` zeigt
- eine `.firebaserc` mit der Projekt-ID
- die Firebase CLI — lokal oder als Schritt in der Action
- ein weiteres GitHub-Secret, ein Service-Account-Token mit Deploy-Rechten

Das wäre eine ganze Werkzeugkette für **eine Datei, die sich praktisch nie
ändert**: Die Regeln hängen an den Statuswerten und am Prioritätsfeld, und die
sind seit Phase 2 stabil. Ändern sie sich doch, ist der Weg oben in zwei Minuten
erledigt. Kommt später ein zweiter Grund dazu, regelmäßig gegen Firebase zu
deployen, ist die Entscheidung neu zu bewerten.

### 7.3 Was die Regeln leisten — und was nicht

Der Kern in drei Sätzen; die Begründung im Detail steht in
[`n8n-setup.md`](n8n-setup.md), Abschnitt 4.

**`.read` bleibt auf `true`.** Das Frontend spricht die Datenbank ohne
Authentifizierung an — Join hat kein Firebase Auth, sondern prüft den Login
selbst gegen den `users`-Knoten. Es gibt also kein `auth`-Objekt, gegen das eine
Regel prüfen könnte; ein Leseverbot bräche die Anmeldung sofort. Das ist der
dokumentierte Kompromiss, keine Nachlässigkeit.

**`.write` steht nicht mehr global auf `true`, sondern pro Knoten.** `tasks` und
`contacts` bleiben offen — beide werden aus dem unauthentifizierten Frontend
geschrieben, daran ändert sich nichts. `users` bekommt eine engere Regel:

```
"users": { "$userId": { ".write": "!data.exists() || !newData.exists()" } }
```

Sie erlaubt das **Anlegen** eines Datensatzes (`!data.exists()`) und sein
**Löschen** (`!newData.exists()`, damit Testkonten weiter aus der Konsole
entfernt werden können), verbietet aber das **Ändern** eines bestehenden. Ein
Angreifer, der die Datenbank-URL kennt — sie steht in `constants.js` und damit
im öffentlichen Repository —, kann so kein fremdes Konto übernehmen, indem er
dessen `pwHash` überschreibt.

**Das globale `.write: true` musste dafür weichen.** In der Realtime Database
kaskadieren Schreibregeln nach unten: Ist der Zugriff auf einer höheren Ebene
einmal erlaubt, werden die Regeln darunter gar nicht mehr ausgewertet. Ein
`.write` an der Wurzel hätte die `users`-Regel wirkungslos gemacht. Deshalb
hängt die Schreiberlaubnis jetzt an `tasks` und `contacts` einzeln.

Der Sign-up bleibt davon unberührt: `UserService.create` schreibt per `PUT` auf
`users/<id>` mit einer frisch vergebenen ID, dort existiert noch nichts —
`!data.exists()` trifft zu. Eine Nebenwirkung gibt es doch: Läuft die ID-Vergabe
in `generateNextUserId` einmal auf eine bereits belegte ID, schlägt die
Registrierung jetzt fehl, statt den fremden Datensatz stillschweigend zu
überschreiben. Das ist die gewollte Richtung.

Die Feld-`.validate`-Regeln auf `users` begrenzen `name` und `email` in der
Länge und verlangen für `pwHash` und `pwSalt` Zeichenketten — dieselbe
Datenmüll-Bremse wie auf `tasks`.

**Die `.validate`-Regeln fangen fehlerhafte Schreibvorgänge aus dem Browser
ab** — falsche Statuswerte, eine unbekannte Priorität, ein `createdAt` als Text.
Sie sind eine Datenmüll-Bremse, kein Zugriffsschutz.

**Auf n8n wirken sie nicht.** Der Workflow schreibt mit einem
Service-Account-Token, und der gilt in der Realtime Database als Admin-Zugriff,
der alle Regeln übergeht. Was aus dem Automaten kommt, prüft allein der
Code-Node `Map AI answer` in
[`../n8n/issue-collector.workflow.json`](../n8n/issue-collector.workflow.json).

### 7.4 Der Test nach dem Einspielen

Auf `https://join.thomas-toebbe.de`, mit offener Browser-Konsole. Vier Schritte,
weil sie zusammen jedes validierte Feld einmal schreiben:

| Schritt | Prüft |
|---|---|
| Einloggen | `.read` auf `users` ist offen |
| Task anlegen (*Add task*) | `status`, `prio`, `source`, `aiGenerated`, `createdAt` in einem Rutsch |
| Task in eine andere Spalte ziehen | `status` beim Zurückschreiben des ganzen Tasks |
| Kontakt anlegen | Schreibzugriff außerhalb von `tasks` |

Sichtbar wird ein Verstoß als roter Toast „Connection error. Try again." und in
der Konsole als `Firebase Error (400)` mit dem Text der abgelehnten Regel —
[`../js/core/firebase-service.js`](../js/core/firebase-service.js) protokolliert
die Antwort, bevor der Toast erscheint.

**Bricht etwas, ist eine `.validate`-Regel zu streng.** Dann die betroffene
Regel **entfernen** und den Fall melden — nicht das Muster aufweichen, bis es
gerade so durchgeht. Eine Regel, die nur noch fast stimmt, ist schlimmer als
keine: Sie erweckt den Eindruck einer Prüfung, die es nicht mehr gibt.

### 7.5 Die bekannte Stolperstelle: `prio` und die Alt-Werte

Zwei Stellen im Frontend fangen bis heute die V1-Werte `high` und `alta` ab:

- [`../js/features/board/render-cards-prio.js`](../js/features/board/render-cards-prio.js),
  Zeilen 82–83
- [`../js/features/summary/summary.js`](../js/features/summary/summary.js),
  Zeile 40

Beide Werte sind laut Regel **nicht** erlaubt — `prio` lässt nur `urgent`,
`medium` und `low` zu. Für einen Bestandstask mit `prio: "high"` hieße das:
Anzeigen geht, **Verschieben nicht.** Das Board schreibt beim Spaltenwechsel
über `TaskService.update` den **ganzen** Task per `PUT` zurück (siehe
`persistStatusChange` in
[`../js/features/board/draganddrop.js`](../js/features/board/draganddrop.js)),
also auch das unveränderte `prio` — und Firebase lehnt die gesamte Operation ab,
nicht nur das eine Feld.

**In der V2-Datenbank gibt es solche Tasks nicht**, die V1-Daten wurden bewusst
nicht importiert. Der Punkt steht hier trotzdem, weil er genau dann zuschlägt,
wenn jemand später V1-Tasks nachzieht: Der Import selbst liefe durch, das
Verschieben scheiterte erst hinterher.
