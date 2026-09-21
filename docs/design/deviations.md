# Abweichungsliste — Implementierung gegen Figma

Stand: 2026-09-21 · Prüfer: Screen-für-Screen-Abgleich Desktop (1440×1024) und Mobile (428×926)

## Methode und Datenquellen

**SOLL** stammt aus dem vollständigen Figma-Dump `.figma-cache/file.json`
(File `6OT2cRhEtUALqFQy0ukNlT`, `lastModified 2026-08-24T11:35:33Z`) sowie aus
gerenderten Frame-Screenshots über den Figma-MCP. Alle SOLL-Werte sind aus dem
Node-Baum gelesen, nicht aus Screenshots geschätzt.

**IST** stammt aus der laufenden Anwendung (lokaler Static-Server, Chromium über
Playwright). Gemessen wurden `getBoundingClientRect()` und `getComputedStyle()`
nach `document.fonts.ready`, plus Screenshots derselben Viewports.

**Hinweis zu den Figma-Links:** Die beiden Links in deiner Nachricht zeigen auf
dieselbe Datei (`lXlDtUIW4xZZe5mmgNM2km`) — sie unterscheiden sich nur im
Session-Parameter `t`. Auf diese Datei besteht nur Lese-, kein Editor-Zugriff.
Die Kopie in deinem Account hat den Key `6OT2cRhEtUALqFQy0ukNlT`; darauf läuft
der Abgleich, und deren Cache liegt im Repo.

**Abgrenzung:** `CLAUDE.md` beschränkt den Design-Scope auf neue Features. Dieser
Report prüft auf deine ausdrückliche Anforderung hin **alle** Screens, also auch
die vom Alt-Team übernommenen. Was davon angefasst wird, ist eine separate
Entscheidung — die Liste bewertet nicht, sie dokumentiert.

**Legende Priorität:** `P1` sofort sichtbar / inhaltlich falsch · `P2` deutlich
sichtbare Layoutabweichung · `P3` Detail, fällt im direkten Vergleich auf.

---

## 0. Querschnittsbefunde

Diese Punkte wirken auf mehrere Screens gleichzeitig und sollten zuerst behoben
werden — einige der Einzelbefunde weiter unten verschwinden dadurch automatisch.

### D-01 · Zwei konkurrierende Token-Systeme, das alte gewinnt · P1

**SOLL:** Ein Token-System. `css/core/tokens.css` ist aus Figma abgeleitet und
laut `CLAUDE.md` die verbindliche Quelle.

**IST:** Jede App-Seite lädt `tokens.css` und **danach** `variables.css`. Da
beide `:root`-Blöcke dieselben Custom Properties definieren, überschreibt das
ältere Team-System die Figma-Werte:

| Property | tokens.css (Figma) | variables.css (überschreibt) |
|---|---|---|
| `--color-primary-hover` | `#177da8` | `#2A3D59` |
| `--color-text-muted` | `#42526e` | `#A8A8A8` |

Zusätzlich existieren Paare mit unterschiedlichem Namen und unterschiedlichem
Wert, wo die Komponenten die falsche Variante greifen:

| Bedeutung | Figma-Wert | tokens.css | variables.css | verwendet wird |
|---|---|---|---|---|
| Label „User Story" | `#7B3ACF` | `--color-label-user-story` | `--color-label-userstory: #0038ff` | **variables.css** |
| Label „Technical Task" | `#12AD9A` | `--color-label-technical` | `--color-label-technical: #1fd7c1` | **variables.css** |
| Priorität Medium | `#FFA800` | `--color-medium` | `--color-priority-medium: #ff8a00` | **variables.css** |

**Wirkung:** Board-Labels, Prioritäts-Buttons und alle Muted-Texte haben
durchgehend falsche Farben. Das ist die Ursache von D-21, D-22, D-33 und D-05.

**Betroffen:** alle Seiten außer `index.html` und `request.html` (die laden
`variables.css` nicht).

---

### D-02 · Sidebar: Menüeinträge falsch eingerückt · P2

**SOLL:** Menüeintrag `232×46 px`, Innenabstand `8px 56px`, Icon ab `x=56`,
Text ab `x=94`, Abstand zwischen Icon und Text `8px`.

**IST:** `232×50 px`, Innenabstand `10px 24px`, Icon ab `x=24`.

**Wirkung:** Icons und Beschriftungen kleben am linken Rand statt eingerückt zu
stehen. Fällt auf jedem App-Screen sofort auf.

**Betroffen:** Summary, Board, Add Task, Contacts, Help, Legal Notice, Privacy Policy

---

### D-03 · Sidebar: Text der inaktiven Menüeinträge zu hell · P3

**SOLL:** `#E7E7E7` für inaktive Einträge, `#FFFFFF` nur für den aktiven.

**IST:** durchgehend `#FFFFFF`.

**Wirkung:** Der aktive Eintrag hebt sich nur noch durch die Hintergrundfläche
ab, nicht mehr durch die Textfarbe.

---

### D-04 · Sidebar: „Add Tasks" statt „Add Task" · P1

**SOLL (Desktop):** `Add Task`

**IST:** `Add Tasks`

**Anmerkung:** Im Figma ist der Mobile-Frame `332:1228` (Board mobile) hier
selbst inkonsistent und zeigt „Add Tasks". Der Desktop-Frame und der
Summary-Mobile-Frame `332:1588` zeigen beide „Add Task". Die Mehrheit und die
Seitenüberschrift (`Add Task`) sprechen für den Singular.

---

### D-05 · Sidebar-Fußzeile: Links zentriert statt linksbündig, falsche Farbe · P2

**SOLL:** Beide Links linksbündig ab `x=60`, Textfarbe `#E7E7E7`,
Zeilenabstand `39px` (`y=886` und `y=925`).

**IST:** Beide Links auf der Sidebar-Mitte (`x=116`) **zentriert**, dadurch
unterschiedliche linke Kanten: „Privacy Policy" beginnt bei `x=63`,
„Legal notice" bei `x=70`. Textfarbe `#A8A8A8` (Folge von D-01).

**Wirkung:** Die beiden Links stehen sichtbar versetzt untereinander.

---

### D-06 · Header: Schatten fehlt · P3

**SOLL:** `drop-shadow 0 4px 4px rgba(0,0,0,0.10)`, Innenabstand
`20px 40px 20px 116px`.

**IST:** kein `box-shadow`, `padding: 0`.

**Wirkung:** Der Header setzt sich nicht vom Inhalt ab; der Seitentitel beginnt
weiter links als vorgesehen.

---

### D-07 · Inhaltsbereich beginnt zu weit oben · P2

**SOLL:** Abstand Header-Unterkante zum ersten Inhaltselement `110px`
(Auto-Layout-Gap), Inhalt beginnt bei `y=206`, linke Kante `x=327`.

**IST:** Summary `y=120`, Board `y=128`, Add Task `y=128`, linke Kante
`x=264`–`292`.

**Wirkung:** Auf allen App-Screens sitzt der Inhalt rund 80 px zu hoch und
30–60 px zu weit links. Das ist die auffälligste durchgehende Layoutabweichung.

---

### D-08 · Eingabefelder: Rahmenfarbe und Innenabstand · P3

**SOLL:** Rahmen `1px #686868`, Innenabstand `12px 21px` (bzw. `12px 16px`),
Schriftgröße `20px`.

**IST:** Rahmen `1px #D1D1D1`, Innenabstand `10px 48px 10px 21px` (Login) bzw.
`12px 14px` (Add Task), Schriftgröße `16px` auf Add Task.

**Wirkung:** Felder wirken heller umrandet und flacher als im Design.

---

### D-09 · Fokus-Zustand nutzt Bootstrap-Blau statt Design-Token · P3

**SOLL:** `--color-border-field-focus: #177DA8`, Fokus-Ring
`--focus-ring: 0 0 0 3px rgba(23,125,168,0.55)`.

**IST:** `css/pages/login.css:229` setzt `border-color: #007bff` und
`box-shadow: 0 0 5px rgba(0,123,255,0.3)`.

---

## 1. Log in (`html/pages/login.html`)

Figma Desktop `301:1107` · Mobile `332:1638`

### D-10 · Karte zu flach, Innenabstand falsch · P2

**SOLL:** Karte `652×449 px`, Innenabstand `48px 115px`, vertikaler Abstand
zwischen den Blöcken `32px`, Schatten `0 0 14px 3px rgba(0,0,0,0.14)`,
Radius `30px`.

**IST:** `652×370 px` (`css/pages/login.css:123` setzt `max-height: 449px`, die
tatsächliche Höhe ergibt sich aus dem Inhalt), Innenabstand `48px 11px`,
Schatten `0 2px 10px rgba(0,0,0,0.1)`.

**Wirkung:** Die Karte ist 79 px zu flach und der Schatten fällt nach unten statt
allseitig.

### D-11 · Überschrift: falsches Gewicht und falsche Farbe · P2

**SOLL:** `Inter Bold (700)`, `61px`, Farbe `#000000`.

**IST:** `font-weight: 600`, Farbe `#2A3647`, Größe über
`clamp(48px, 5vw, 61px)` — bei 1440 px zufällig korrekt, darunter zu klein.

### D-12 · Unterstrich unter der Überschrift zu kurz · P2

**SOLL:** `150px` breit.

**IST:** `90px` (`css/pages/login.css:182`).

### D-13 · Abstand zwischen Passwortfeld und Buttons zu klein · P2

**SOLL:** `56px` zwischen Feld-Unterkante und Button-Oberkante.

**IST:** `20px`.

**Ursache:** In `html/pages/login.html` wird `<div class="input-fields">` nicht
geschlossen. Dadurch landet `.form-buttons` **innerhalb** des Flex-Containers,
und dessen `margin-bottom: 40px` greift nicht als Abstand zu den Buttons,
sondern der `gap: 20px` der Feldliste.

**Zusatz:** Das fehlende schließende `</div>` ist zugleich ein Markup-Fehler.

### D-14 · „Guest Log in"-Button: Rahmen zu dick, Textfarbe falsch · P3

**SOLL:** Rahmen `1px #2A3647`, Textfarbe `#2A3647`.

**IST:** Rahmen `2px`, Textfarbe `#000000`.

### D-15 · Beschriftungen in falscher Schreibweise · P1

| Element | SOLL | IST |
|---|---|---|
| Primärer Button | `Log in` | `Log In` |
| Sekundärer Button | `Guest Log in` | `Guest Log In` |
| Button oben rechts | `Sign up` | `Sign Up` |

### D-16 · Logo an falscher Position · P2

**SOLL:** `100×122 px` bei `x=77, y=80`.

**IST:** `100×122 px` bei `x=30, y=15` — das Logo klebt in der Ecke.

**Anmerkung:** Auf `sign-up.html` sitzt dasselbe Logo korrekt bei `77,80`. Die
beiden Auth-Seiten sind untereinander inkonsistent.

### D-17 · „Not a Join user?" bricht um und läuft aus dem Header · P2

**SOLL:** einzeilig, `153×24 px`, Abstand zum Sign-up-Button `35px`.

**IST:** `css/pages/login.css:87` setzt `width: 153px; height: 24px` fest. Der
Text passt nur mit dem geladenen Inter-Font exakt hinein; solange der Fallback
greift oder Metriken minimal abweichen, bricht er auf zwei Zeilen um und läuft
aus dem 49 px hohen Header heraus. Im Screenshot ist der Umbruch sichtbar.

### D-18 · Mobile: Buttons über volle Breite statt 180 px · P2

**SOLL (428 px):** Karte `396×475` bei `16,226`; Buttons untereinander je
`180×51 px`, Abstand `21px`, zentriert; Eingabefelder `364px`; Logo `64×78` bei
`38,37`.

**IST:** Karte `350×395` bei `39,266`; Buttons je `328×48`, Abstand `16px`;
Eingabefelder `328px`; Logo `40×48` bei `30,15`.

---

## 2. Sign up (`html/pages/sign-up.html`)

Figma Desktop `423:2510`

### D-19 · Fußzeile: „Legacy notice" statt „Legal notice" · P1

**SOLL:** `Legal notice`

**IST:** `Legacy notice` — Tippfehler. Auf `login.html` steht an derselben Stelle
korrekt „Legal notice".

### D-20 · Feldbeschriftungen und Texte weichen ab · P1

| Element | SOLL | IST |
|---|---|---|
| Erstes Feld (Platzhalter) | `Name` | `Username` |
| Überschrift | `Sign up` | `Sign Up` |
| Submit-Button | `Sign up` | `Sign Up` |
| Checkbox-Text | `I accept the Privacy policy` | `I agree to the Privacy Policy` |

### D-21 · Checkbox ist unformatiert und zu klein · P1

**SOLL:** `24×24 px`, Radius `3px`, Rahmen `2px #2A3647`.

**IST:** natives `<input type="checkbox">`, `13×13 px`, ungestylt.

**Zusatz:** Verstößt gegen die Projektvorgabe „Touch-Targets mindestens
44 × 44 px".

### D-22 · Karte zu flach, Feldabstand zu klein · P2

**SOLL:** Karte `598×630` bei `421,197`; Abstand zwischen den Feldern `24px`;
Submit-Button `126×55`.

**IST:** Karte `598×570` bei `421,227`; Feldabstand `16px`; Submit `110×48`.

### D-23 · Zurück-Pfeil in falscher Farbe · P3

**SOLL:** Pfeil in dunklem Petrol (Teil des Icon-Sets, `32×32`).

**IST:** hellblau `#29ABE2`.

---

## 3. Summary (`html/pages/summary.html`)

Figma Desktop `45:2195` · Mobile `332:1588`

### D-24 · Begrüßung an völlig falscher Position · P2

**SOLL:** Begrüßungsblock rechts neben den Kacheln, vertikal auf Höhe der
mittleren Kachelreihe — `385×136 px` bei `967,548`.

**IST:** oben rechts bei `980,190` — rund 358 px zu hoch.

### D-25 · Name in der Begrüßung: falsches Blau · P2

**SOLL:** `#177DA8` (dunkles Petrol).

**IST:** `#29ABE2` (helles Cyan).

### D-26 · Begrüßungstext mit Ausrufezeichen statt Komma · P3

**SOLL:** `Good morning,` — Komma, weil der Name in der Folgezeile den Satz
fortsetzt.

**IST:** `Good afternoon!` — Ausrufezeichen, danach der Name als eigener Block.

### D-27 · Seitentitel: Größe und Farbe · P2

**SOLL:** `Join 360` in `Inter Bold 61px`, Farbe `#000000`; Untertitel
`Key Metrics at a Glance` in `Inter Regular 27px`, Farbe `#2A3647`; Abstand
zwischen beiden `30px`.

**IST:** Titel `64px`, Farbe `#2A3647`; Untertitel `20px`.

### D-28 · Kacheln zu breit und zu flach · P2

| Kachel | SOLL | IST |
|---|---|---|
| To-do / Done | je `264×168` | je `308×145` |
| Urgent + Deadline | `364×168` | `419×151` |
| Email requests | `168×168` | `197×151` |
| Tasks in Board / In Progress / Awaiting Feedback | je `168×168` | je `197×162` |

**Wirkung:** Die als Quadrate angelegten Kacheln sind im IST querformatig. Die
Abstände weichen ebenfalls ab (SOLL `32px` horizontal, `28px` vertikal; IST
`26px` horizontal, `26px` vertikal).

### D-29 · Kachel-Schatten zu weich · P3

**SOLL:** `0 0 4px rgba(0,0,0,0.10)`.

**IST:** `0 0 14px rgba(0,0,0,0.06)`.

### D-30 · Mobile: Unterstrich sitzt über statt unter dem Untertitel · P2

**SOLL (428 px):** Reihenfolge Titel → Untertitel → blauer Unterstrich.

**IST:** Titel → Unterstrich → Untertitel.

### D-31 · Mobile: Seitenrand zu schmal · P3

**SOLL:** `20px`. **IST:** `14px`.

---

## 4. Board (`html/pages/board.html`)

Figma Desktop `47989:5803` · Mobile `332:1228`

### D-32 · Spalten in jeder Spalte mit dauerhaft sichtbarem Scrollbalken · P1

**SOLL:** Keine sichtbaren Scrollbalken; die Spalten laufen über die volle
verfügbare Höhe (`688px`).

**IST:** Jede der fünf Spalten rendert einen eigenen, permanent sichtbaren
vertikalen Scrollbalken. Auf Mobile kommt pro Spalte zusätzlich ein horizontaler
Balken dazu.

**Wirkung:** Deutlichster optischer Unterschied zum Design.

### D-33 · Label-Farben falsch · P1

| Label | SOLL | IST |
|---|---|---|
| `User Story` | `#7B3ACF` (violett) | `#0038FF` (knallblau) |
| `Technical Task` | `#12AD9A` (gedämpftes Türkis) | `#1FD7C1` (helles Türkis) |

**Ursache:** D-01. Zusätzlich ist die Label-Höhe `32px` statt `27px`.

### D-34 · Kartenbeschreibung wird nicht gekürzt · P1

**SOLL:** Die Beschreibung ist auf wenige Zeilen begrenzt und endet mit
Auslassungspunkten (im Design z. B. „Build start page with recipe
recommendation…"). Alle Karten bleiben dadurch ähnlich hoch.

**IST:** Kein `line-clamp`. Die vollständige Beschreibung wird gerendert, Karten
werden bis über 400 px hoch und die Spalten sehr ungleichmäßig.

### D-35 · Beschreibungstext zu hell · P2

**SOLL:** dunkler, gut lesbarer Fließtext.

**IST:** `#A8A8A8` — auf weißem Grund grenzwertig im Kontrast (Folge von D-01).

### D-36 · Fortschrittsanzeige gestapelt statt nebeneinander · P2

**SOLL:** Ein `188×19 px` breiter Block, Balken links, Text „0/2 Subtasks"
rechts, `space-between`.

**IST:** `board-progress-text` steht **über** `board-progress-bar`, beide als
Blockelemente untereinander. Der Block ist dadurch `38px` statt `19px` hoch, und
die Reihenfolge ist gegenüber dem Design vertauscht.

### D-37 · Karten schmaler als die Spalte · P2

**SOLL:** Spalte `220px`, Karte `220px` — die Karte füllt die Spalte.

**IST:** Spalte `216px`, Karte `185px` — rechts bleibt ein 31 px breiter Streifen
für den Scrollbalken (siehe D-32).

### D-38 · Karten-Schatten ohne Spread · P3

**SOLL:** `0 0 10px 3px rgba(0,0,0,0.08)`. **IST:** `0 0 10px 0 rgba(0,0,0,0.08)`.

### D-39 · Plus-Button je Spalte sichtbar, im Design ausgeblendet · P3

**SOLL:** Die `plus button`-Instanzen in den Spaltenköpfen sind im Figma-Frame
auf **hidden** gesetzt.

**IST:** In jedem Spaltenkopf steht rechts ein sichtbarer Plus-Button.

**Anmerkung:** Im Figma sind die `plus button`-Instanzen in **allen** Board-Frames
ausgeblendet (Desktop wie Mobile); von 118 Plus-Instanzen der Datei sind 104
`hidden`. **Entscheidung 2026-09-21: bleibt bestehen** — die Buttons legen einen
Task direkt in der geklickten Spalte an und sparen den Umweg über Triage. Die
Abweichung wird nach #51 im Commit begründet.

### D-40 · Suchfeld: Größe, Rahmen und Trenner · P3

**SOLL:** `312×48 px`, Rahmen `1px #686868`, Innenabstand `8px 16px`, vertikaler
Trennstrich zwischen Eingabe und Lupe.

**IST:** `310×44 px`, Rahmen `1px #D1D1D1`, Innenabstand `6px 10px`, kein Trenner.

### D-41 · „Add task"-Button zu klein · P3

**SOLL:** `160×48 px`, Schrift `Inter Bold 21px`, Icon `32×32`, Position `x=1192`.

**IST:** `120×44 px`, Schrift `16px`, Position `x=1272`.

### D-42 · Mobile: Karten horizontal scrollend statt untereinander · P1

**SOLL (428 px):** Spaltenüberschrift, darunter die Karten **über die volle
Breite untereinander**; leere Spalten zeigen einen gestrichelten Platzhalter
(„No tasks To do").

**IST:** Pro Spalte ein horizontaler Karussell-Container; die Karten stehen
nebeneinander und werden seitlich weggescrollt.

**Wirkung:** Grundlegend anderes Interaktionsmodell als im Design.

### D-43 · Mobile: Suchfeld zu schmal · P3

**SOLL:** volle Breite (`396px`) mit Trenner und Lupe.

**IST:** rund `240px`.

### D-44 · Mobile: Hilfe-Icon im Header, im Design nicht vorgesehen · P3

**SOLL (Mobile):** nur Avatar rechts oben.

**IST:** `?`-Icon plus Avatar.

---

## 5. Add Task (`html/pages/add-task.html`)

Figma Desktop `45:850`

### D-45 · Alle Feldbeschriftungen und Eingaben zu klein · P1

**SOLL:** Beschriftungen `Inter Regular 20px`, Eingabetext `20px`.

**IST:** beides `16px`.

**Wirkung:** Der gesamte Screen wirkt im Vergleich zum Design deutlich
kleinteiliger. Betrifft `Title*`, `Description`, `Due date*`, `Priority`,
`Assigned to`, `Category*`, `Subtasks`.

### D-46 · Seitentitel zu klein · P2

**SOLL:** `Inter Bold 61px`.

**IST:** `48px` — die `clamp()`-Untergrenze greift, weil die Titelbox über die
volle Breite (`1114px`) aufgespannt ist statt über `278px`.

### D-47 · Priorität „Medium": falsches Orange · P1

**SOLL:** `#FFA800`. **IST:** `#FF8A00` (Folge von D-01).

### D-48 · Prioritäts-Buttons zu klein, falscher Schatten · P3

**SOLL:** je `136×56 px`, Abstand `16px`, inaktiv `0 0 4px rgba(0,0,0,0.10)`.

**IST:** je `130×52 px`, inaktiv `0 2px 6px rgba(0,0,0,0.08)`.

### D-49 · Spaltenbreiten weichen ab · P3

**SOLL:** zwei Spalten à `440px`, Abstand `48px`, Gesamtbreite `976px` ab `x=327`.

**IST:** linke Spalte `460px`, rechte `411px`, ab `x=286`.

### D-50 · Pflichtfeld-Hinweis an falscher Stelle · P2

**SOLL:** `*This field is required` unten links auf einer Linie mit den Buttons
(`y=930`), Schrift `20px`.

**IST:** direkt unter dem Due-date-Feld (`y=706`).

### D-51 · Aktions-Buttons zu klein · P3

**SOLL:** `Clear` `110×56`, `Create Task` `183×56`, Schrift `Inter Bold 21px`.

**IST:** `Clear` `104×50`, `Create Task` `153×50`, Schrift `16px`.

### D-52 · Zeichenzähler ohne Entsprechung im Design · P3

**SOLL:** nicht vorhanden.

**IST:** `0/40` unter dem Titelfeld, `0/200` unter der Beschreibung.

**Anmerkung:** Insgesamt fünf Zähler (Add Task: Titel 40, Beschreibung 200;
Contacts-Overlay: Name 30, E-Mail 50, Telefon 15). Das Lastenheft fordert keine
Zeichenbegrenzung. **Entscheidung 2026-09-21: bleibt bestehen** und wird nach #51
begründet; zusätzlich ist `maxlength` im Markup zu ergänzen, da die Grenze
bislang nur im JavaScript steht.

### D-53 · Datumsfeld zeigt deutsches Format · P1

**SOLL:** Platzhalter `dd/mm/yyyy`.

**IST:** natives `<input type="date">` rendert unter deutscher Browsersprache
`tt.mm.jjjj`.

**Zusatz:** Verstößt gegen die Projektregel „UI-Texte Englisch", da der Text vom
Browser-Locale kommt und nicht kontrolliert wird.

### D-54 · Textarea: Maße und Innenabstand · P3

**SOLL:** `440×120 px`, Innenabstand `18px 16px`.

**IST:** `460×110 px`, Innenabstand `12px 14px`.

---

## 6. Contacts (`html/pages/contacts.html`)

Figma Desktop `576:4499` · Mobile `405:3185`

### D-55 · Untertitel in Großbuchstaben und gesperrt · P1

**SOLL:** `Better with a team`, `Inter Regular 27px`, Farbe `#2A3647`.

**IST:** `BETTER WITH A TEAM` — `text-transform: uppercase` plus `letter-spacing`,
in hellem Grau.

### D-56 · E-Mail-Adressen in Grau statt Blau · P1

**SOLL:** `#007CEE`.

**IST:** `#7D8DA6`.

**Wirkung:** Die E-Mail wird nicht mehr als Kontaktangabe erkennbar.

### D-57 · Kontaktnamen: Größe und Gewicht · P2

**SOLL:** `Inter Regular 20px`, Farbe `#000000`.

**IST:** `16px`, `font-weight: 600`, Farbe `#2A3647`.

### D-58 · Kontaktliste zu schmal, E-Mails werden abgeschnitten · P1

**SOLL:** Listen-Panel `456px` breit (weiß, Schatten `4px 0 6px rgba(0,0,0,0.08)`),
Listeneinträge `352×78 px`, Innenabstand `15px 24px`.

**IST:** Panel rund `313px`, dadurch werden die E-Mail-Adressen mit Ellipse
abgeschnitten (`anja.schulz@example....`). Der Panel-Schatten fehlt.

### D-59 · „Add New Contact": Schreibweise, Größe und Icon · P2

**SOLL:** `Add new contact`, Button `352×56 px`, Icon `person_add` (32×32)
**rechts** vom Text.

**IST:** `Add New Contact`, Button `289×56 px`, ein `+`-Zeichen **links** vom Text.

### D-60 · Avatar-Farbpalette weicht ab · P3

**SOLL:** Anton Mayer orange, Anja Schulz violett, Benedikt Ziegler blau-violett,
David Eisenberg pink, Eva Fischer gelb, Emmanuel Mauer türkis.

**IST:** Anton blau, Benedikt grün, David dunkelrot, Emmanuel violett.

**Anmerkung:** Die Zuordnung ergibt sich im IST aus einem Hash über den Namen.
Wenn die Figma-Palette gelten soll, muss die Farbliste übernommen werden.

### D-61 · Kein Leerzustand im Detailbereich · P2

**SOLL:** Beim Öffnen ist ein Kontakt ausgewählt und die Detailansicht gefüllt.

**IST:** Der rechte Bereich ist vollständig leer — kein Platzhalter, kein
Hinweistext.

### D-62 · Seitentitel · P3

**SOLL:** `Inter Bold 61px`, Farbe `#000000`.

**IST:** `48px`, Farbe `#2A3647`.

---

## 7. Task-Detail-Overlay (Board)

Figma Desktop `75624:20773`

### D-63 · Verdunkelung zu schwach und nicht aus dem Token · P2

**SOLL / Token:** `--color-scrim: rgba(0,0,0,0.35)`.

**IST:** `rgba(0,0,0,0.25)` fest im Stylesheet.

### D-64 · Overlay-Panel: Innenabstand und Schatten · P2

**SOLL:** `525px` breit, Innenabstand `48px 40px`, Abstand zwischen den Blöcken
`24px`, mit Schatten.

**IST:** `520px`, Innenabstand `28px 28px 20px`, **kein** `box-shadow`.

### D-65 · Datum im ISO-Format · P1

**SOLL:** `02/09/2023` (TT/MM/JJJJ).

**IST:** `2026-09-11`.

### D-66 · Subtask-Checkboxen unformatiert · P2

**SOLL:** gestylte Checkbox `24×24 px` mit Häkchen.

**IST:** natives `16×16 px`-Kästchen.

**Zusatz:** Touch-Target unter 44 px.

### D-67 · Schließen-Button als grauer Kreis · P3

**SOLL:** schlichtes `×` ohne Hintergrund, oben rechts auf einer Linie mit dem
Label.

**IST:** `32×32 px` Kreis mit Hintergrund `#F6F7F8`.

### D-68 · Beschriftungen mit Doppelpunkt / falscher Schreibweise · P3

| SOLL | IST |
|---|---|
| `Assigned To:` | `Assigned to:` |
| `Subtasks` | `Subtasks:` |

### D-69 · Trennstrich zwischen „Delete" und „Edit" fehlt · P3

**SOLL:** vertikaler Trenner zwischen den beiden Aktionen.

**IST:** nur Abstand.

---

## 8. Help (`html/pages/help.html`)

Figma Desktop `71454:18330`

### D-70 · Vollständig abweichendes Layout · P2

**SOLL:** Fließtext ohne Karten. Einleitungsabsatz, Abschnittsüberschriften
direkt im Textfluss, Aufzählung mit großen Ziffern links neben dem Text, das Wort
„Join" durchgehend als blauer Link.

**IST:** Inhalt in weißen Karten mit blauem Linksrand, darüber eine Zeile
„Guide · Join", kleine Standard-Nummerierung, Einleitungsabsatz fehlt, Texte sind
gegenüber dem Design gekürzt und umformuliert.

**Bewertung:** Das ist keine Detailabweichung, sondern eine Neugestaltung. Falls
gewollt: im Commit begründen. Falls nicht: Rückbau auf das Figma-Layout.

### D-71 · Zurück-Pfeil mit Rahmen statt frei stehend · P3

**SOLL:** freistehender Pfeil in Petrol, ohne Fläche.

**IST:** Pfeil in einer hellen, abgerundeten Fläche mit Rahmen.

---

## 9. Legal Notice / Privacy Policy

Figma Desktop `87229:6028` · `87229:6059`

### D-72 · Vollständig abweichendes Layout · P2

**SOLL:** Fließtext, `Imprint` als Zwischenüberschrift, Aufzählung mit
Platzhaltern, durchgehend verlinktes „Join".

**IST:** Karten-Layout mit blauem Linksrand, zusätzlich ein Inhaltsverzeichnis
(„Table of Contents") und eine Metazeile „Imprint (Germany) · Last updated: …".

**Entscheidung 2026-09-21:** Die **Darstellung** wird auf das Figma-Layout
zurückgebaut — beide Seiten sollen gleich aussehen. Der **Inhalt** bleibt: Das
Figma enthält nur Platzhalter (`[Student Names List]`), die Implementierung ein
vollständiges deutsches Impressum nach § 5 DDG, das rechtlich erforderlich ist.
Umzubauen sind `css/pages/policy.css` und die Struktur der beiden HTML-Dateien,
nicht die Texte. Siehe #45.

### D-73 · Aktiver Fußzeilen-Link nicht markiert · P3

**SOLL:** Auf der Legal-Notice-Seite ist „Legal notice" in der Sidebar-Fußzeile
dunkel hinterlegt (aktiver Zustand).

**IST:** keine Markierung.

---

## 10. Welcome / Landing (`index.html`)

Figma Desktop `350504:9300`

Dieser Screen ist aus dem Figma neu gebaut und trifft es weitgehend. Zwei Punkte:

### D-74 · Zusätzliches Logo oben links · P3

**SOLL:** kein Logo auf diesem Frame.

**IST:** Join-Logo oben links.

### D-75 · Einleitungstext zentriert statt linksbündig · P3

**SOLL:** Der zweizeilige Text ist linksbündig, beide Zeilen beginnen bei `x=398`.

**IST:** zentriert.

---

## 11. Request / Stakeholder (`html/pages/request.html`)

Figma Desktop `350504:9311`

Ebenfalls aus dem Figma gebaut und dicht am Design. Zwei Punkte:

### D-76 · Überschrift „Welcome" linksbündig statt zentriert · P2

**SOLL:** über die Inhaltsbreite zentriert.

**IST:** linksbündig auf der Textspalte.

### D-77 · Fließtext ohne Blocksatz · P3

**SOLL:** Die beiden Absätze sind im Blocksatz gesetzt (erkennbar an den bündigen
rechten Kanten).

**IST:** Flattersatz.

---

## Nicht geprüft

- Overlays „Add contact" / „Edit contact" (`576:4756`, `48005:7645`)
- Board-Overlay „Add task" (`204:3903`)
- Mobile-Varianten von Add Task, Contacts und den Policy-Seiten
- Zustände: Hover, Fokus, Fehler, Toast-Meldungen, Move-Menü
- Widescreen-Frame `353017:10313` (3400 px)

---

## Vorgeschlagene Issue-Schnitte

**Benennungskonvention** (abgeleitet aus Issues #1–#20 und `skills/create-issue`):

- Format `<type>: <beschreibung>`, höchstens 72 Zeichen, kein Punkt am Ende
- Nach dem Doppelpunkt durchgehend klein
- Der Titel benennt **den Missstand**, nicht die Lösung — „`style: summary tiles
  not square`", nicht „`fix: make summary tiles square`". Der Imperativ gehört in
  die Commit-Message, die das Issue per `type(#nr):` referenziert
- Typwahl in diesem Repo: `style` für Layout-, Farb- und Maßabweichungen · `fix`
  für inhaltlich Falsches (Tippfehler, Format, defektes Markup) · `refactor` für
  technische Schuld · `feat` für fehlende UI · `chore` für Entscheidungs- und
  Dokumentationsbedarf
- Beschreibung auf Deutsch, Struktur nach `create-issue`: „Was wird erwartet?" /
  „Was passiert stattdessen?" / Schritte zur Reproduktion / Labels

| # | Issue | Titel | Befunde | Prio |
|---|---|---|---|---|
| 1 | [#21](https://github.com/ttoebbe/039_JoinIssueCollector/issues/21) | `refactor: competing token systems override figma values` | D-01, D-05, D-33, D-35, D-47 | P1 |
| 2 | [#22](https://github.com/ttoebbe/039_JoinIssueCollector/issues/22) | `style: sidebar items misaligned and menu label wrong` | D-02, D-03, D-04 | P1 |
| 3 | [#23](https://github.com/ttoebbe/039_JoinIssueCollector/issues/23) | `fix: wrong capitalisation in auth buttons and headings` | D-15, D-20 | P1 |
| 4 | [#24](https://github.com/ttoebbe/039_JoinIssueCollector/issues/24) | `fix: typo "Legacy notice" in sign-up footer` | D-19 | P1 |
| 5 | [#25](https://github.com/ttoebbe/039_JoinIssueCollector/issues/25) | `fix: unclosed input-fields div breaks login button spacing` | D-13 | P1 |
| 6 | [#26](https://github.com/ttoebbe/039_JoinIssueCollector/issues/26) | `style: checkboxes unstyled and below touch target size` | D-21, D-66 | P1 |
| 7 | [#27](https://github.com/ttoebbe/039_JoinIssueCollector/issues/27) | `style: board card description not clamped` | D-34 | P1 |
| 8 | [#28](https://github.com/ttoebbe/039_JoinIssueCollector/issues/28) | `style: permanent scrollbars in board columns` | D-32, D-37 | P1 |
| 9 | [#29](https://github.com/ttoebbe/039_JoinIssueCollector/issues/29) | `style: board mobile columns scroll horizontally` | D-42, D-43 | P1 |
| 10 | [#30](https://github.com/ttoebbe/039_JoinIssueCollector/issues/30) | `style: add-task labels and inputs one size too small` | D-45, D-46, D-54 | P1 |
| 11 | [#31](https://github.com/ttoebbe/039_JoinIssueCollector/issues/31) | `fix: due dates rendered in iso and german format` | D-53, D-65 | P1 |
| 12 | [#32](https://github.com/ttoebbe/039_JoinIssueCollector/issues/32) | `style: contacts list too narrow and email colour wrong` | D-55, D-56, D-57, D-58 | P1 |
| 13 | [#33](https://github.com/ttoebbe/039_JoinIssueCollector/issues/33) | `style: content area starts too high and too far left` | D-06, D-07 | P2 |
| 14 | [#34](https://github.com/ttoebbe/039_JoinIssueCollector/issues/34) | `style: login card metrics and heading deviate from figma` | D-10, D-11, D-12, D-14, D-16, D-17 | P2 |
| 15 | [#35](https://github.com/ttoebbe/039_JoinIssueCollector/issues/35) | `style: sign-up card metrics and field spacing deviate` | D-22, D-23 | P2 |
| 16 | [#36](https://github.com/ttoebbe/039_JoinIssueCollector/issues/36) | `style: summary greeting misplaced and in wrong blue` | D-24, D-25, D-26, D-27 | P2 |
| 17 | [#37](https://github.com/ttoebbe/039_JoinIssueCollector/issues/37) | `style: summary tiles not square` | D-28, D-29 | P2 |
| 18 | [#38](https://github.com/ttoebbe/039_JoinIssueCollector/issues/38) | `style: board subtask progress stacked instead of one row` | D-36 | P2 |
| 19 | [#39](https://github.com/ttoebbe/039_JoinIssueCollector/issues/39) | `style: task overlay padding, scrim and close button deviate` | D-63, D-64, D-67, D-68, D-69 | P2 |
| 20 | [#40](https://github.com/ttoebbe/039_JoinIssueCollector/issues/40) | `feat: contacts detail pane has no empty state` | D-61 | P2 |
| 21 | [#41](https://github.com/ttoebbe/039_JoinIssueCollector/issues/41) | `style: login mobile buttons full width instead of 180px` | D-18 | P2 |
| 22 | [#42](https://github.com/ttoebbe/039_JoinIssueCollector/issues/42) | `style: summary mobile underline order and gutter wrong` | D-30, D-31 | P2 |
| 23 | [#43](https://github.com/ttoebbe/039_JoinIssueCollector/issues/43) | `style: required-field hint in wrong place on add task` | D-50 | P2 |
| 24 | [#44](https://github.com/ttoebbe/039_JoinIssueCollector/issues/44) | `style: help page layout deviates from figma` | D-70, D-71 | P2 |
| 25 | [#45](https://github.com/ttoebbe/039_JoinIssueCollector/issues/45) | `style: policy pages layout deviates from figma` | D-72, D-73 | P2 |
| 26 | [#46](https://github.com/ttoebbe/039_JoinIssueCollector/issues/46) | `style: request heading left-aligned instead of centred` | D-76, D-77 | P2 |
| 27 | [#47](https://github.com/ttoebbe/039_JoinIssueCollector/issues/47) | `style: input border colour and focus ring off-token` | D-08, D-09 | P3 |
| 28 | [#48](https://github.com/ttoebbe/039_JoinIssueCollector/issues/48) | `style: board search field and add-task button too small` | D-40, D-41 | P3 |
| 29 | [#49](https://github.com/ttoebbe/039_JoinIssueCollector/issues/49) | `style: add-task priority buttons and columns off-spec` | D-48, D-49, D-51 | P3 |
| 30 | [#50](https://github.com/ttoebbe/039_JoinIssueCollector/issues/50) | `style: contacts avatar palette and add-button icon differ` | D-59, D-60, D-62 | P3 |
| 31 | [#51](https://github.com/ttoebbe/039_JoinIssueCollector/issues/51) | `chore: board plus buttons and char counters documentation` | D-39, D-52 | P3 |
| 32 | [#52](https://github.com/ttoebbe/039_JoinIssueCollector/issues/52) | `style: landing page shows logo and centres intro copy` | D-74, D-75 | P3 |
| 33 | [#53](https://github.com/ttoebbe/039_JoinIssueCollector/issues/53) | `style: help icon shown in mobile header` | D-44 | P3 |
| 34 | [#54](https://github.com/ttoebbe/039_JoinIssueCollector/issues/54) | `style: board card shadow spread and label height off` | D-38 | P3 |
