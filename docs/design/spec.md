# Design Spec — Join Issue Collector

Quelle: Figma-Datei **Join Version 1 KI-gestuetzte Automatisierung**
File Key `6OT2cRhEtUALqFQy0ukNlT` · `lastModified 2026-08-24T11:35:33Z` · `version 2391254490495657140` · Rolle `owner`

Diese Spec dokumentiert ausschliesslich, was in der Figma-Datei steht. Nichts ist geschaetzt.
Wo eine Angabe fehlt, steht **not defined in Figma**. Widersprueche sind nicht aufgeloest, sondern
in Abschnitt 6 gesammelt.

Rohdaten im Cache: `.figma-cache/file.json` (16,1 MB), `.figma-cache/image-fills.json`.
Der Endpoint `/v1/files/<key>/styles` liefert mit dem verwendeten Token **403 — `Invalid scope: ["file_content:read"]`**.
Er wird nicht gebraucht: `file.json` enthaelt die Style-Map (73 Eintraege) vollstaendig, und die
tatsaechlichen Werte stehen ohnehin nur an den Nodes.

Umfang der Datei: 3 Seiten, 101 Top-Level-Frames, 137 COMPONENT_SETs laut Datei-Header
(95 davon liegen im Node-Baum, s. Abschnitt 4.6), 419 COMPONENTs, 73 Styles, 9 verwendete Rasterbilder.

---

## 1. Foundations

### 1.1 Farbstile

Ausgegeben sind **Stilname und tatsaechlicher Wert**. Mehrere Stile tragen denselben Namen —
Figma erlaubt das, die Namen sind daher nicht als Token-Namen brauchbar. Die Spalte "Vorkommen"
zaehlt die Nodes, die den Stil referenzieren.

| Stilname | Tatsaechlicher Wert | Vorkommen | Anmerkung |
|---|---|---|---|
| `Version 2/main color` | `#2A3647` | 851 Fills, 543 Strokes | Primaerfarbe (Sidebar, Buttons, Textfarbe) |
| `white` | `#FFFFFF` | 903 + 485 + 60 + 12 + 4 Fills | fuenf gleichnamige Stile, identischer Wert |
| `black` | `#000000` | 137 + 96 + 1 Fills | drei gleichnamige Stile |
| `icon2` | `#E7E7E7` | 251 Fills | Trennlinien, inaktive Flaechen |
| `icon` | `#A8A8A8` | 213 + 6 + 2 Fills, 83 Strokes | Icon-Grau hell |
| `icon` | `#686868` | 131 Fills, 46 Strokes | Icon-Grau dunkel — **gleicher Stilname, anderer Wert** |
| `Style` | `#686868` | 121 Fills, 319 Strokes | Platzhalter-/Label-Grau |
| `Style` | `#D1D1D1` | 17 + 2 Fills, 138 Strokes | Feldrahmen default |
| `Style` | `GRADIENT_LINEAR(#9327FF → #2EA1DC)` | 8 Fills | Verlauf des KI-Badges |
| `Version 2/Ligth blue` | `#177DA8` | 147 Fills, 90 Strokes | Hover-/Aktiv-Blau (Schreibfehler im Stilnamen) |
| `Ligth blue` | `#29ABE2` | 1 + 3 Fills | zweites, helleres Blau |
| `Ligth blue` | *(nur Stroke)* `#005DFF` | 4 Strokes | **Stilname `Ligth blue`, Wert ist ein voellig anderes Blau** |
| `Version 2/main color` | `#4589FF` | 12 Fills, 76 Strokes | **Stilname sagt "main color", Wert ist Hellblau** |
| `urgent color` | `#FF3D00` | 150 Fills | Prioritaet Urgent |
| `medium color` | `#FFA800` | 126 Fills | Prioritaet Medium |
| `low color` | `#7AE229` | 64 Fills | Prioritaet Low |
| `menu color` | `#42526E` | 50 + 20 Fills | Sekundaertext, Spaltenueberschriften Board |
| `Boton gradient` | `GRADIENT_LINEAR(#F9F9F9 → #F0F0F0)` | 2 Fills | Button-Flaeche hell |

Weitere Farben kommen ohne Stilbindung direkt an Nodes vor. Die 72 im gesamten Baum
tatsaechlich verwendeten Solid-Farben, nach Haeufigkeit:

| Hex | Vorkommen | Wo |
|---|---|---|
| `#FFFFFF` | 3627 | Flaechen, Text auf dunkel |
| `#2A3647` | 1524 | Primaerfarbe |
| `#000000` | 952 | Fliesstext |
| `#D9D9D9` | 516 | Icon-Bounding-Boxen (unsichtbare Hilfsflaechen) |
| `#686868` | 446 | Sekundaertext, Feldrahmen hover |
| `#A8A8A8` | 282 | Icon-Grau |
| `#E7E7E7` | 274 | Trennlinien |
| `#CDCDCD` | 237 | deaktivierte Nav-Eintraege |
| `#FF7A00` | 209 | Avatar-Farbe |
| `#FF3D00` | 205 | Urgent |
| `#462F8A` | 189 | Avatar-Farbe |
| `#177DA8` | 187 | Hover-Blau |
| `#1FD7C1` | 187 | Label "Technical Task" |
| `#FFA800` | 166 | Medium |
| `#D1D1D1` | 130 | Feldrahmen default |
| `#29ABE2` | 114 | Logo-Akzent |
| `#7AE229` | 110 | Low |
| `#007CEE` | 103 | Link-/Mail-Blau in Kontaktliste |
| `#7B3ACF` | 102 | Label "User Story" |
| `#9747FF` | 93 | **nur Figma-Hilfsrahmen um COMPONENT_SETs — kein UI-Wert** |
| `#42526E` | 73 | Sekundaertext |
| `#4589FF` | 72 | Fokus-/Aktivrahmen |
| `#E4E2E2` | 68 | Flaechen hell |
| `#12AD9A` | 66 | Label "Technical Task" (zweiter Wert) |
| `#091931` | 61 | Button-Zustand `click` |
| `#F6F7F8` | 59 | Seitenhintergrund App |
| `#F4F4F4` | 46 | Flaeche hell |
| `#E60026` | 34 | Fehlerrot |
| `#6E52FF` | 29 | Avatar-Farbe |
| `#9327FF` | 21 | KI-Verlauf Start |
| `#FC71FF` | 21 | Avatar-Farbe |
| `#FFBB2B` | 21 | Avatar-Farbe |
| `#FF4646` | 20 | Avatar-Farbe |
| `#0B3681` | 20 | Text im Creator-Badge |
| `#00BEE8` | 17 | Avatar-Farbe |
| `#EEEEEE` | 16 | Flaeche hell |
| `#F0F0F0` | 13 | Canvas-Hintergrund Design-System-Seite |
| `#FF0000` | 10 | **nur unsichtbare Layout-Grid-Farbe** |
| `#FF8190` | 10 (+16 mit Deckkraft 0) | Fehlerflaeche |

Projektspezifische Farben aus den neuen Screens (Stakeholder / Creator / KI):

| Hex | Verwendung | Node |
|---|---|---|
| `#FFD2D2` bei 52 % Deckkraft | Hinweisflaeche "daily limit reached" | `350537:9936`, `350522:9795` |
| `#92FFBC` | Creator-Badge, Variante **member** | `350510:12310` |
| `#EBFC88` | Creator-Badge, Variante **extern** | `350510:12321` |
| `#0B3681` | Textfarbe im Creator-Badge | `350510:12313`, `350510:12324` |
| `GRADIENT_LINEAR(#9327FF → #2EA1DC)` | Badge "Ai-generated ticket" (Icon **und** Text) | `350510:12644`, `350510:12645` |
| `#DE3500` | "10 of 10 requests used" mobil | `350522:9778` |
| `#FF3D00` | "10 of 10 requests used" desktop | `350504:9579` |
| `#177DA8` | "0 of 10 requests used" (beide Tiers) | `350504:9390`, `350522:9695` |
| `#2D2D2D` | Kopfleiste im Mockup "Email mask" | `350504:9172` |

**Avatar-Palette** (Set `75584:6593` "colors", 15 Varianten, je 32 x 32, `border-radius: 45px` — voll rund):

`#FF7A00` · `#FF5EB3` · `#6E52FF` · `#9327FF` · `#00BEE8` · `#1FD7C1` · `#FF745E` · `#FFA35E` ·
`#FC71FF` · `#FFC701` · `#0038FF` · `#C3FF2B` · `#FFE62B` · `#FF4646` · `#FFBB2B`

### 1.2 Textstile

28 Textstile, teils mehrfach unter demselben Namen mit **unterschiedlichen Werten**.
Zeilenhoehe durchgaengig 120 %, Letter-Spacing durchgaengig 0.

| Stilname | Familie | Groesse | Gewicht | Zeilenhoehe | Vorkommen |
|---|---|---|---|---|---|
| `Version 2/t1` | Inter | 61 px | 700 | 73,2 px | 32 |
| `Version 2/t2` | Inter | 47 px | 500 | 56,4 px | 15 |
| `Version 2/t4` | Open Sans | 28 px | 400 | 33,6 px | 1 |
| `Version 2/t5` | Inter | 27 px | 400 | 32,4 px | 13 |
| `Version 2/t5` | Open Sans | 23 px | 400 | 27,6 px | 6 |
| `Version 2/t6` | Inter | 20 px | 400 | 24 px | 604 |
| `Version 2/t6` | Inter | 21 px | 400 | 25,2 px | 6 |
| `Version 2/t6` | Open Sans | 19 px | 400 | 22,8 px | 32 |
| `Version 3/t6` | Open Sans | 21 px | 400 | 25,2 px | 1 |
| `Version 2/body` | Inter | 16 px | 400 | 19,2 px | 1776 |
| `Version 2/body` | Open Sans | 16 px | 400 | 19,2 px | 68 |
| `Version 2/t7` | Inter | 14 px | 400 | 16,8 px | 29 |
| `Version 2/t7` | Inter | 12 px | 400 | 14,4 px | 98 |
| `t7` | Poppins | 12 px | 400 | 14,4 px | 1 |
| `Version 2/label` | Inter | 13 px | 400 | 15,6 px | 5 |

Die Stilnamen `t1`…`t7` sind nicht monoton nach Groesse sortiert und teils doppelt belegt.
Als Token-Namen sind sie unbrauchbar — s. Abschnitt 6.

### 1.3 Tatsaechlich verwendete Schriften

Ermittelt aus **allen Text-Nodes**, nicht aus den Stilen. Das ist die Einkaufsliste fuer `assets/fonts/`.

| Familie | Gewichte | Text-Nodes | Rolle |
|---|---|---|---|
| **Inter** | 400 (2614), 700 (472), 600 (54), 500 (18) | 3158 | Haupt-UI-Schrift |
| **Open Sans** | 400 (115), 700 (22), 600 (1) | 138 | neuere Screens (Stakeholder, Welcome), Rechtstexte |
| **Poppins** | 400 (42), 700 (2) | 44 | ausschliesslich die Fehlermeldung "This field is required" (12 px) sowie zwei Canvas-Titel |
| **Mulish** | 700 (3), 500 (2) | 5 | ausschliesslich das Label "Move to" in der mobilen Move-Task-Ansicht |
| **Figtree** | 700, 800, 600, 500, 400 | 10 | nur Canvas-Beschriftungen und Datei-Thumbnail — **kein UI** |
| **Patrick Hand** | 400 | 17 | nur handschriftliche Notizen des Design-Teams — **kein UI** |

Alle sechs Familien sind auf Google Fonts frei verfuegbar. Es gibt keine kommerzielle Schrift in der Datei.
Geladen wurden Inter, Open Sans, Poppins und Mulish nach `assets/fonts/` samt `assets/fonts/fonts.css`
(Subsets `latin` + `latin-ext`, s. `assets/MANIFEST.md` Abschnitt 5).

Im Design vorkommende Schriftgroessen (px):
`12, 13, 14, 16, 18, 19, 20, 21, 22, 23, 24, 27, 28, 32, 36, 40, 47, 54, 56, 61, 64` —
zusaetzlich `99, 209, 300` ausschliesslich in Canvas-Beschriftungen.

### 1.4 Layout-Grid

Genau **ein** Grid ist definiert und liegt auf 39 Frames:

```
pattern     COLUMNS
count       12
sectionSize 65 px
gutterSize  30 px
offset      0
alignment   CENTER
visible     false
color       #FF0000 @10 %  (Hilfsfarbe)
```

Dasselbe Grid liegt unveraendert auf 428-px-, 1440-px- und 3400-px-Frames.
Rechnerisch belegt es 12 × 65 + 11 × 30 = **1110 px** — das passt in keinen der drei Tiers,
und es ist ueberall ausgeblendet. **Das Grid ist kein Layout-Vorgabe, sondern Altbestand.**
Die Frames, auf denen es liegt, haben keinen erkennbaren Bezug dazu. Siehe Abschnitt 6.

Auf diesen Frames liegt es **nicht**: allen Stakeholder-, Welcome- und Email-mask-Screens,
allen Board-Frames der mobilen Fassung ausser den unten gelisteten, und der gesamten
Design-System-Seite ausser den beiden Widescreen-Artboards.

### 1.5 Effekte (Schatten)

12 Effektstile, teils gleichnamig mit unterschiedlichen Werten. Alle `DROP_SHADOW`, alle in Schwarz mit Deckkraft.

| Stilname | x | y | Blur | Spread | Farbe | Vorkommen | Wo |
|---|---|---|---|---|---|---|---|
| `nuevo` | 0 | 0 | 4 | 0 | `#000000` @10 % | 160 + 9 | Karten, Felder |
| `nuevo` | 0 | 0 | 4 | 0 | `#000000` @16 % | 41 | staerkere Variante, **gleicher Name** |
| `shadoe backlog box` | 0 | 0 | 10 | 3 | `#000000` @8 % | 167 + 2 | Board-Karten, Overlay-Panels |
| `shadoe backlog box` | 0 | 0 | 14 | 3 | `#000000` @14 % | 11 | **gleicher Name, anderer Wert** |
| `shadoe backlog box` | 0 | 0 | 14 | 3 | `#000000` @4 % | 1 | **gleicher Name, dritter Wert** |
| `stronger` | 0 | 4 | 4 | 0 | `#000000` @25 % | 47 | Button hover/click |
| `stronger` | 0 | 4 | 8 | 0 | `#000000` @20 % | 2 | **gleicher Name, anderer Wert** |
| `Barra superior` | 0 | 4 | 4 | 0 | `#000000` @10 % | 40 + 2 | Header |
| `Drop Shadow` | 0 | 0 | 5 | 3 | `#000000` @4 % | 3 | vereinzelt |

Als CSS:

```css
--shadow-card:    0 0 4px  0   rgba(0, 0, 0, 0.10);  /* Stil "nuevo" */
--shadow-panel:   0 0 10px 3px rgba(0, 0, 0, 0.08);  /* Stil "shadoe backlog box" */
--shadow-button:  0 4px 4px 0  rgba(0, 0, 0, 0.25);  /* Stil "stronger" */
--shadow-header:  0 4px 4px 0  rgba(0, 0, 0, 0.10);  /* Stil "Barra superior" */
```

### 1.6 Radien

Alle an COMPONENT-, FRAME- und RECTANGLE-Nodes gesetzten `cornerRadius`-Werte:

| Radius | Vorkommen | Rolle |
|---|---|---|
| 3 px | 173 | Checkbox |
| 4 px | 26 | Creator-Badge, "Profil"/"E-mail"-Links |
| **5 px** | 95 | **nur Figmas COMPONENT_SET-Rahmen — kein UI-Wert** |
| 6 px | 2 | vereinzelt |
| **8 px** | 604 | Buttons, Labels, Hinweisflaechen, Bilder auf der Stakeholder-Seite |
| **10 px** | 836 | Eingabefelder, Primary-Check-Button, Nav-Eintraege |
| **16 px** | 137 | grosse Panels |
| 20 px | 32 | Sprechblasen (teils asymmetrisch, s. u.) |
| 21 px | 2 | vereinzelt |
| **24 px** | 184 | Board-Karten |
| **30 px** | 65 | Login-/Welcome-Karte |
| 37, 40, 42, 43, 46, 49, 50, 51 px | je 1–5 | Einzelfaelle in Icon-Hilfsflaechen |
| **45 px** | 693 | Avatar-Kreise (voll rund bei 32–56 px Kantenlaenge) |
| 56, 58, 70, 72, 74, 77 px | je 1–27 | Einzelfaelle |
| 559 px | 23 | Grossflaechen (voll rund) |

Asymmetrische Radien kommen nur bei Sprechblasen vor:
`20/20/0/20`, `0/20/20/20`, `20/0/20/20`, `0/20/0/0` (je 3 Nodes).

> **Ein projektweites Radius-Token funktioniert hier nicht.** Es gibt mit 3, 4, 8, 10, 16, 24, 30 und "voll rund"
> mindestens acht bewusst unterschiedliche Werte plus rund 15 Einzelfaelle. Empfehlung: benannte Tokens je
> Bauteil (`--radius-checkbox: 3px`, `--radius-button: 8px`, `--radius-field: 10px`, `--radius-card: 24px`,
> `--radius-panel: 30px`, `--radius-avatar: 50%`) statt einer einzigen Variablen.

---

## 2. Breakpoints und responsives Verhalten

### 2.1 Was die Datei vorgibt

Die einzige Breakpoint-Aussage der Datei steht woertlich im Frame `353017:10351`
(Seite "Page Components design system", Bereich "Desktop - Widescreen"):

> Um ein einheitliches Design auf groesseren Bildschirmen zu gewaehrleisten, bieten wir eine
> Breitbild-Layout-Loesung an. **Fuege bei der Umsetzung einen Breakpoint bei 1440px hinzu.**

Dazu die beiden Umsetzungsregeln aus denselben Notizen (`353017:10360`, `353021:9422`):

> Fuer den Login-Screen alles innerhalb der gleichen Grenzen wie in der normalen Desktop-Version zentriert.

> Fuer die App den Header und die Menueleiste skalieren, den Inhalt jedoch an derselben Stelle belassen.

### 2.2 Vorhandene Artboard-Breiten

| Tier | Artboard-Breite | Anzahl Frames | Belege |
|---|---|---|---|
| Mobile | **428 px** | 28 Screens (Hoehe 926 px) | `332:1228`, `350522:9621`, … |
| Desktop | **1440 px** | 26 Screens (Hoehe 1024 px) | `45:1747`, `350504:9311`, … |
| Widescreen | **3400 px** | 3 Screens (Hoehe 1440 px) | `353017:10317` Log in, `353017:10369` Summary user, `353017:10405` Contacts |
| — | 1920 px | 13 Frames | **Arbeitsflaechen der Design-System-Seite, keine Screens** |

Ausserdem 41 kleinere Frames (Overlays, Toasts, Menues) zwischen 70 und 1302 px Breite,
die keinem Viewport entsprechen, sondern in einen Screen eingesetzt werden.

### 2.3 Nicht abgedeckte Viewport-Bereiche

Ausdruecklich festgehalten, weil es sich um **Implementierungsentscheidungen, nicht um Design-Vorgaben** handelt:

| Bereich | Status |
|---|---|
| < 428 px | **kein Artboard.** Kleinere Telefone (z. B. 360 px, 390 px) sind nicht designt. |
| 429 – 1439 px | **kein Artboard.** Der gesamte Tablet-Bereich (768 px, 834 px, 1024 px, 1280 px) fehlt. |
| 1441 – 3399 px | **kein Artboard.** Zwischen Desktop und Widescreen liegt kein Zwischenschritt. |
| > 3400 px | **kein Artboard.** |

Konkret bedeutet das: Die Notiz nennt genau **einen** Breakpoint (1440 px). Fuer den Uebergang
Mobile → Desktop gibt es **keine** Angabe. Der uebliche Ansatz (Breakpoint bei 768 px oder bei 1024 px)
ist nicht durch die Datei gedeckt und muss als Entscheidung markiert werden.

### 2.4 App-Shell (Desktop 1440 px)

Aus `45:2195` "Summary user", stellvertretend fuer alle eingeloggten Desktop-Screens:

| Element | Node | Wert |
|---|---|---|
| Seitenhintergrund | `45:2195` | `#F6F7F8` |
| Sidebar `ContentLeft` | `45:2208` | Breite **232 px**, volle Hoehe, Fill `#2A3647`, Auto-Layout vertikal, Gap 103 px, Padding 64 / 0 / 64 / 0, Schatten `0 0 4px 0 rgba(0,0,0,0.10)` |
| Logo in der Sidebar | `47:616` | 100 x 122 px, weiss |
| Nav-Block | `47:447` | Breite 232 px, Auto-Layout vertikal, Gap 15 px |
| Nav-Eintrag | `45:2489` | 232 x **46 px**, Auto-Layout horizontal, Gap 8 px, Padding 8 / 56 / 8 / 56, aktiv Fill `#091931`, Radius 8 px |
| Inhaltsspalte `ContentRight` | `352965:6607` | Breite **1208 px** (= 1440 − 232), Auto-Layout vertikal, Gap 110 px |
| Header | `69360:4547` | 1208 x **96 px**, Fill `#FFFFFF`, Auto-Layout horizontal, Gap 34 px, Padding 20 / 40 / 20 / 116, Schatten `0 4px 4px 0 rgba(0,0,0,0.10)` |
| Content-Bereich | `352965:6606` | Breite 1025 px, Auto-Layout vertikal, Gap 56 px, Offset x 327 px |

Header-Komponente isoliert (`567:3148`): 1440 x 96 px, Padding 20 / 40 / 20 / **348**.
Der Wert 348 gilt nur fuer die freistehende Komponente; im eingebauten Zustand sind es 116 px
(348 − 232 Sidebar). Fuer die Umsetzung ist der eingebaute Wert massgeblich.

### 2.5 Widescreen (3400 px)

`353017:10369` "Summary user": Sidebar `353017:10370` bleibt bei **232 px**,
`Content` `353017:10385` waechst auf **3168 px** (= 3400 − 232). Das deckt sich mit der Notiz
"Header und Menueleiste skalieren, den Inhalt jedoch an derselben Stelle belassen".

`353017:10317` "Log in": voller 3400-px-Rahmen, die Login-Karte bleibt mittig in den
Desktop-Massen. Deckt sich mit der Notiz zum Login-Screen.

---

## 3. Frames je Tier

Vollstaendige Liste aller Top-Level-Frames. Spalte "Visible" markiert Frames, die in Figma
ausgeblendet sind — diese liefern auch kein Render (s. Abschnitt 6.7).

#### Mobile (428 px artboards) — 51 frames

| Node ID | Frame | W x H | Auto-layout | Gap | Padding T/R/B/L | Fill | Visible |
|---|---|---|---|---|---|---|---|
| `128:3199` | Floating contact v2 | 461 x 364 | VERTICAL | 21.0 | - | - | yes |
| `405:3185` | Contacts mobile | 428 x 926 | - | - | - | #F6F7F8 | yes |
| `69391:5411` | Summary guest mobile | 428 x 926 | - | - | - | #F6F7F8 | yes |
| `332:1588` | Summary user mobile | 428 x 926 | - | - | - | #F6F7F8 | yes |
| `371:3494` | Add task mobile | 428 x 926 | - | - | - | #F6F7F8 | yes |
| `332:1228` | Board mobile | 428 x 926 | - | - | - | #F6F7F8 | yes |
| `48008:4160` | Board mobile - task added | 428 x 926 | - | - | - | #F6F7F8 | yes |
| `75880:7611` | Board mobile - task deleted 1 | 428 x 926 | - | - | - | #F6F7F8 | yes |
| `75880:7791` | Board mobile - task deleted 2 | 428 x 926 | - | - | - | #F6F7F8 | yes |
| `405:3768` | Contact view Anton mobile | 428 x 926 | - | - | - | #F6F7F8 | yes |
| `597:3831` | Contact view Tatjana mobile | 428 x 926 | - | - | - | #F6F7F8 | yes |
| `48008:5112` | Contacts mobile - deleted | 428 x 926 | - | - | - | #F6F7F8 | yes |
| `350522:9506` | Email mask | 428 x 926 | - | - | - | #FBF9FE | yes |
| `664:3772` | Forgot Password - Reset | 428 x 926 | - | - | - | #F6F7F8 | **no** |
| `664:3733` | Forgot Password - Send email | 428 x 926 | - | - | - | #F6F7F8 | **no** |
| `425:3588` | Greeting page - Guest mobile | 428 x 926 | - | - | - | #F6F7F8 | yes |
| `356:2865` | Greeting page - User mobile | 428 x 926 | - | - | - | #F6F7F8 | yes |
| `558:3482` | Help | 428 x 926 | - | - | - | #F6F7F8 | yes |
| `558:3436` | Legal Notice | 428 x 926 | - | - | - | #F6F7F8 | yes |
| `87229:6143` | Legal Notice - External (before signing up or logging in) mobile | 428 x 926 | - | - | - | #F6F7F8 | yes |
| `332:1638` | Log in mobile | 428 x 926 | - | - | - | #F6F7F8 | yes |
| `71688:5338` | Privacy Policy | 428 x 926 | - | - | - | #F6F7F8 | yes |
| `87229:6162` | Privacy Policy - External (before signing up or logging in) mobile | 428 x 926 | - | - | - | #F6F7F8 | yes |
| `332:1665` | Screen 1 - logo | 428 x 926 | - | - | - | #2A3647 | yes |
| `350522:9493` | Screen 1 - logo | 428 x 926 | - | - | - | #2A3647 | yes |
| `425:3460` | Sign up mobile | 428 x 926 | - | - | - | #F6F7F8 | yes |
| `350522:9621` | Stakeholder | 428 x 926 | - | - | - | #F6F7F8 | yes |
| `350522:9722` | Stakeholder limit reached | 428 x 926 | - | - | - | #F6F7F8 | yes |
| `294678:8877` | move task view | 428 x 926 | - | - | - | #F6F7F8 | yes |
| `597:3724` | Overlay add contact mobile | 396 x 760 | - | - | - | #FFFFFF | yes |
| `597:4085` | Overlay edit 2 contact mobile | 396 x 760 | - | - | - | #FFFFFF | yes |
| `597:3917` | Overlay edit contact mobile | 396 x 760 | - | - | - | #FFFFFF | yes |
| `75925:19271` | task overlay mobile | 396 x 701 | VERTICAL | 16.0 | 32/24/32/24 | #FFFFFF | yes |
| `75925:19196` | task overlay mobile | 396 x 785 | VERTICAL | 16.0 | 32/24/32/24 | #FFFFFF | yes |
| `10119:3717` | sent message confirmation | 388 x 74 | VERTICAL | - | - | - | **no** |
| `10175:3745` | sent message confirmation mobile | 371 x 74 | VERTICAL | - | - | - | **no** |
| `204:4005` | Added to back log V1 | 326 x 74 | VERTICAL | - | - | - | yes |
| `585:4885` | Added to board | 326 x 74 | VERTICAL | 4.0 | - | - | yes |
| `597:4042` | Conyact succ.. created overlay | 326 x 74 | VERTICAL | - | - | - | yes |
| `576:4862` | Conyact succ.. created overlay | 326 x 74 | VERTICAL | - | - | - | yes |
| `70877:6383` | You Signed Up successfully | 326 x 74 | VERTICAL | - | - | - | yes |
| `664:3851` | confirmation of reset password process | 326 x 74 | VERTICAL | - | - | - | **no** |
| `70877:6386` | You Signed Up successfully | 312 x 74 | VERTICAL | - | - | - | yes |
| `294678:9849` | Frame 379 | 295 x 244 | - | - | - | - | yes |
| `656:3857` | confirmation of reset password process | 278 x 74 | VERTICAL | - | - | - | **no** |
| `356:3090` | Submenu | 150 x 204 | VERTICAL | - | 10/10/10/10 | #2A3647 | yes |
| `454:7561` | Submenu | 150 x 204 | VERTICAL | - | 10/10/10/10 | #2A3647 | yes |
| `71395:18200` | Contact options | 116 x 100 | VERTICAL | - | 10/10/10/10 | #FFFFFF | yes |
| `71395:18181` | Contact options | 116 x 100 | VERTICAL | - | 10/10/10/10 | #FFFFFF | yes |
| `294678:9855` | overlay default | 106 x 113 | VERTICAL | 16.0 | 6/8/16/8 | #2A3647 | yes |
| `294678:9801` | overlay hover | 106 x 113 | VERTICAL | 16.0 | 6/8/16/8 | #2A3647 | yes |

#### Desktop (1440 px artboards) — 33 frames

| Node ID | Frame | W x H | Auto-layout | Gap | Padding T/R/B/L | Fill | Visible |
|---|---|---|---|---|---|---|---|
| `45:850` | Add task | 1440 x 1024 | HORIZONTAL | - | - | #F6F7F8 | yes |
| `75601:15058` | Add task - Clear funtion (See prototype) | 1440 x 1024 | HORIZONTAL | - | - | #F6F7F8 | yes |
| `75609:20277` | Board - Task deleted 1 | 1440 x 1024 | HORIZONTAL | - | - | #F6F7F8 | yes |
| `75609:19912` | Board - Task deleted 1 | 1440 x 1024 | HORIZONTAL | - | - | #F6F7F8 | yes |
| `47989:5803` | Board Task added | 1440 x 1024 | HORIZONTAL | - | - | #F6F7F8 | yes |
| `45:1747` | Board W.O. Todo task | 1440 x 1024 | HORIZONTAL | - | - | #F6F7F8 | yes |
| `71338:5048` | Contacts - Anton Deleted | 1440 x 1024 | HORIZONTAL | - | - | #F6F7F8 | yes |
| `33:282` | Contacts default | 1440 x 1024 | HORIZONTAL | - | - | #F6F7F8 | yes |
| `576:4499` | Contacts- View contact - Anton | 1440 x 1024 | HORIZONTAL | - | - | #F6F7F8 | yes |
| `576:4866` | Contacts- View contact - Tatjana | 1440 x 1024 | HORIZONTAL | - | - | #F6F7F8 | yes |
| `350504:9168` | Email mask | 1440 x 1024 | VERTICAL | 10.0 | - | #FFFFFF | yes |
| `656:3836` | Forgot my password - Reset password | 1440 x 1024 | - | - | - | #F6F7F8 | **no** |
| `656:3794` | Forgot my password - send email | 1440 x 1024 | - | - | - | #F6F7F8 | **no** |
| `71454:18330` | Help | 1440 x 1024 | VERTICAL | - | - | #F6F7F8 | yes |
| `556:3088` | Legal Notice - External (before signing up or logging in) | 1440 x 1024 | VERTICAL | - | - | #F6F7F8 | yes |
| `87229:6028` | Legal Notice- Internal | 1440 x 1024 | VERTICAL | - | - | #F6F7F8 | yes |
| `301:1107` | Log in | 1440 x 1024 | - | - | - | #F6F7F8 | yes |
| `556:3338` | Privacy Policy - External (before signing up or logging in) | 1440 x 1024 | VERTICAL | 10.0 | - | #F6F7F8 | yes |
| `87229:6059` | Privacy Policy- Internal | 1440 x 1024 | VERTICAL | 10.0 | - | #F6F7F8 | yes |
| `423:2510` | Sign up | 1440 x 1024 | - | - | - | #F6F7F8 | yes |
| `350504:9311` | Stakeholder | 1440 x 1024 | - | - | - | #F6F7F8 | yes |
| `350504:9548` | Stakeholder _limit reached | 1440 x 1024 | - | - | - | #F6F7F8 | yes |
| `425:3639` | Summary Guest | 1440 x 1024 | VERTICAL | 10.0 | - | #F6F7F8 | yes |
| `45:2195` | Summary user | 1440 x 1024 | VERTICAL | 10.0 | - | #F6F7F8 | yes |
| `350504:9300` | Welcome | 1440 x 1024 | - | - | - | #2A3647 | yes |
| `310:1373` | page 1 | 1440 x 1024 | - | - | - | #F6F7F8 | yes |
| `242516:6122` | Hinweis | 1302 x 1608 | HORIZONTAL | 10.0 | 90/90/90/90 | #FFFF00 | yes |
| `576:4756` | Overlay add contact | 1212 x 592 | - | - | - | #FFFFFF | yes |
| `48005:7645` | Overlay edit contact | 1212 x 592 | - | - | - | #FFFFFF | yes |
| `627:3647` | Overlay edit contact | 1212 x 592 | - | - | - | #FFFFFF | yes |
| `204:3903` | Floating add task Backlog v1 | 1116 x 870 | - | - | - | #FFFFFF | yes |
| `454:2992` | task overlay v1 | 525 x 957 | VERTICAL | 24.0 | 48/40/48/40 | #FFFFFF | yes |
| `75624:20773` | task overlay v1 | 525 x 920 | VERTICAL | 24.0 | 48/40/48/40 | #FFFFFF | yes |

#### Widescreen (3400 px artboards) — 1 frames

| Node ID | Frame | W x H | Auto-layout | Gap | Padding T/R/B/L | Fill | Visible |
|---|---|---|---|---|---|---|---|
| `353017:10313` | Desktop-Widescreen | 3533 x 9441 | - | - | - | - | yes |

#### Design-system canvases (1920 px) — 13 frames

| Node ID | Frame | W x H | Auto-layout | Gap | Padding T/R/B/L | Fill | Visible |
|---|---|---|---|---|---|---|---|
| `75568:1460` | 00 General elements | 1920 x 1214 | - | - | - | #F0F0F0 | yes |
| `75880:7974` | 00 General elements mobile | 1920 x 1120 | - | - | - | #F0F0F0 | yes |
| `75587:6627` | 01 Log in - Sign up | 1920 x 1120 | - | - | - | #F0F0F0 | yes |
| `75880:8202` | 01 Log in | sign up mobile | 1920 x 1476 | - | - | - | #F0F0F0 | yes |
| `75592:8305` | 02 Summary | 1920 x 1080 | - | - | - | #F0F0F0 | yes |
| `75880:8421` | 02 Summary mobile | 1920 x 493 | - | - | - | #F0F0F0 | yes |
| `75592:8534` | 03 Add task | 1920 x 2702 | - | - | - | #F0F0F0 | yes |
| `75880:8531` | 03 Add task mobile | 1920 x 2305 | - | - | - | #F0F0F0 | yes |
| `75592:11201` | 04 Board | 1920 x 6149 | - | - | - | #F0F0F0 | yes |
| `75918:13895` | 04 Board mobile | 1920 x 6140 | - | - | - | #F0F0F0 | yes |
| `75592:11047` | 05 Contacts | 1920 x 1909 | - | - | - | #F0F0F0 | yes |
| `75936:20128` | 05 Contacts mobile | 1920 x 1322 | - | - | - | #F0F0F0 | yes |
| `71072:5048` | Join Tumbnail | 1920 x 1080 | - | - | - | #124658 | yes |
---

## 4. Komponenten

Die **vollstaendige** Auflistung aller 95 COMPONENT_SETs mit jeder Variante steht in
[components.md](components.md) — generiert aus dem Cache, nicht von Hand gepflegt.
Hier stehen die Bauteile, die fuer die Umsetzung zuerst gebraucht werden.

Grundsatz aus dem Workflow: **Massgeblich ist die Variante, nicht das Set.** Der Set-Rahmen
(z. B. "139 x 219") ist Figmas Sammelbehaelter mit 20 px Padding und einem violetten
Hilfsrahmen `#9747FF` bei Radius 5 px. Beides ist kein UI.

### 4.1 Buttons

**Primary — `Button wo icon` (`301:1814`), Desktop**

| Variante | Groesse | Padding | Radius | Fill | Schatten | Text |
|---|---|---|---|---|---|---|
| Default | 99 x 49 (hug) | 15 / 24 / 15 / 24 | 8 px | `#2A3647` | — | Inter 16 / 400, `#FFFFFF` |
| Hover | 99 x 49 | 15 / 24 / 15 / 24 | 8 px | `#177DA8` | `0 4px 4px 0 rgba(0,0,0,0.25)` | Inter 16 / 400, `#FFFFFF` |
| click | 99 x 49 | 15 / 24 / 15 / 24 | 8 px | `#091931` | `0 4px 4px 0 rgba(0,0,0,0.25)` | Inter 16 / 400, `#FFFFFF` |

**Secondary — `Button seconday wo icon` (`301:1829`), Desktop**

| Variante | Groesse | Padding | Radius | Fill | Stroke | Schatten | Text |
|---|---|---|---|---|---|---|---|
| Default | 99 x 49 | 15 / 24 / 15 / 24 | 8 px | transparent | `#2A3647` 1 px | — | Inter 16 / 400, `#2A3647` |
| Hover | 99 x 49 | 15 / 24 / 15 / 24 | 8 px | transparent | `#177DA8` **2 px** | `0 4px 4px 0 rgba(0,0,0,0.25)` | Inter 16 / 400, `#177DA8` |
| click | 99 x 49 | 15 / 24 / 15 / 24 | 8 px | transparent | `#091931` 1 px | `0 4px 4px 0 rgba(0,0,0,0.25)` | Inter 16 / 400, `#091931` |

Der Stroke wechselt zwischen 1 px und 2 px je Zustand. Ohne Gegenmassnahme (`box-shadow: inset 0 0 0 Npx`
oder `outline`) erzeugt das im Browser einen Layout-Shift von 1 px pro Seite beim Hover.

**Mobile-Varianten** (`371:2121` primary, `371:2128` secondary): 104 x **27 px**, Padding 4 / 18 / 4 / 18,
Radius 8 px, nur die Zustaende Default und Hover. Kein `click`-Zustand definiert.

> 27 px Buttonhoehe liegt deutlich unter dem 44-px-Mindestwert fuer Touch-Targets. Siehe Abschnitt 6.

**Primary check button** (`70:783`): 183 x 56 px, Padding 16 rundum, Gap 4 px, Radius 10 px,
Fill Default `#2A3647` / Hover `#177DA8` / click `#091931`, Text Inter 21 / 700 in `#FFFFFF`,
Icon `check` 24 x 24 rechts. Auf der Stakeholder-Seite mit abweichendem Padding 16 / 18 / 16 / 18
und Fill `#177DA8` bereits im Default (`350504:9384`).

**Secondary mit Icon** (`70:784`): 126 x 56 px, Padding 16 rundum, Gap 4 px, Radius 10 px,
Stroke Default `#2A3647` 1 px / Hover `#177DA8` 2 px / click `#091931` 1 px, Text Inter 20 / 400,
Icon `iconoir:cancel` 24 x 24.

**Text Button** (`70889:6497`): 109 x 35 px, Padding 8 rundum, Gap 8 px, kein Radius, kein Fill.
Default Inter 16 / 400 in `#686868`; Variante 2 identisch, aber **Gewicht 700**. Auf dunklem
Hintergrund (Welcome-Screen) ist die Textfarbe `#FFFFFF`.

### 4.2 Eingabefelder

**`Text field` (`75597:14102`), Desktop** — 440 x 48 px, Padding 12 / 16 / 12 / 16, Radius 10 px, Fill `#FFFFFF`:

| Variante | Stroke | Textfarbe |
|---|---|---|
| Default | `#D1D1D1` 1 px | Platzhalter Inter 20 / 400 |
| hover | `#686868` 1 px | Platzhalter |
| click | `#177DA8` 1 px | Cursor |
| write | `#177DA8` 1 px | Eingabe |

**`Text field mobile` (`75880:8624`)** — 396 x 48 px, gleiches Padding und Radius, Text Inter 16 / 400.
Abweichung: Default hat hier bereits `#686868` 1 px statt `#D1D1D1`, und ein `hover`-Zustand fehlt.

**Fehlerzustand:** Die Fehlermeldung "This field is required" liegt als eigener Text-Node vor —
**Poppins 12 px / 400**, waehrend das restliche UI Inter verwendet. Ein Feldzustand "error" mit
rotem Rahmen ist als Komponentenvariante **not defined in Figma**; die roten Werte `#E60026`
und `#FF8190` kommen nur an Einzelnodes vor.

**`Check button` (`70870:6309`)** — 24 x 24 px:

| Variante | Radius | Fill | Inhalt |
|---|---|---|---|
| Default | 3 px | — | Rechteck 16 x 16, Stroke `#2A3647` 2 px |
| hover disable | **43 px** | `#EDF2FA` | Rechteck 16 x 16, Stroke `#2A3647` 2 px |
| checked | 3 px | — | Haken-Gruppe 16 x 16 |
| hover checked | **51 px** | `#EDF2FA` | Haken-Gruppe |

Die Radien 43 px und 51 px bei 24 px Kantenlaenge bedeuten schlicht "voll rund" — der Hover-Zustand
ist ein runder Hintergrund hinter der eckigen Checkbox.

### 4.3 Board-Karten und Labels

**`Cards` (`75609:16188`)** — Radius **24 px**, Padding 16 rundum, Gap 10 px, Fill `#FFFFFF`,
Schatten `0 0 10px 3px rgba(0,0,0,0.08)`. Vier Varianten mit Breiten 220 / 235 / 239 px und
Hoehen 177 / 196 / 228 / 246 px — die Karte ist hug-height, die Breite ergibt sich aus der Spalte.

**`Labels Board card label` (`75609:16164`)** — Padding 4 / 16 / 4 / 16, Radius 8 px, Text Inter 16 / 400 in `#FFFFFF`:

| Variante | Groesse | Fill | Text |
|---|---|---|---|
| User story | 113 x 27 | `#7B3ACF` | "User Story" |
| Thecnicaal Task | 144 x 27 | `#12AD9A` | "Technical Task" |

Der Variantenname enthaelt einen Tippfehler, der Text nicht. In der Overlay-Fassung
(`75609:16289`) ist das Label 208 x 36 px mit Padding 4 / 24 / 4 / 24 und Text Inter 23 / 400.

**`Priority symbols` (`75609:16169`)** — je 32 x 32 px, Padding 10 / 18 / 10 / 18:
Low (`#7AE229`), Urgent (`#FF3D00`), Medium (`#FFA800`). Exportiert nach
`assets/icons/prio-low.svg`, `prio-urgent.svg`, `prio-medium.svg`.

**`Progress Subtasks` (`350510:9424`)** — 188 x 19 px, Auto-Layout horizontal, Gap 10 px,
Text Inter 16 / 400. Drei Varianten: "0/2 Subtasks", "1/2 Subtasks", "2/2 Subtasks".

### 4.4 Projektspezifische Komponenten (Issue Collector)

**`Creator` (`350510:12396`)** — die Anzeige des Ticket-Erstellers im Task-Detail. Zwei Varianten:

| | member (`350510:12395`) | extern (`350510:12394`) |
|---|---|---|
| Groesse | 445 x 25, Auto-Layout horizontal, Gap 16 px | 445 x 25, Auto-Layout horizontal, Gap 24 px |
| Label | "Creator:" Inter 20 / 400, `#2A3647` | identisch |
| Badge-Fill | `#92FFBC` (Gruen) | `#EBFC88` (Gelbgruen) |
| Badge-Padding / Radius | 0 / 4 / 0 / 4, Radius 4 px | 0 / 4 / 0 / 4, Radius 4 px |
| Badge-Text | "Member", Inter 16 / 400, `#0B3681` | "Extern", Inter 16 / 400, `#0B3681` |
| Badge-Icon | 18 x 14 (`350510:12310`) | 14 x 14 (`350510:12321`) |
| Name | "Anja Schulz", Open Sans 19 / 400, `#000000` | "Felix Henri Richter", Open Sans 19 / 400, `#000000` |
| Aktion rechts | `See profile` → "Profil" | `Send email` → "E-mail" |

Damit ist die Lastenheft-Forderung "unterscheiden, ob der Ersteller intern oder extern ist"
im Design geloest: **Farbe + Wort + unterschiedliche Folgeaktion**.

**`See profile` (`350510:12346`)** und **`Send email` (`350510:12342`)** — 63 x 24 bzw. 76 x 24 px,
Padding 0 / 3 / 0 / 3, Gap 4 px, Radius 4 px, Text Inter 16 / 400 in `#42526E`.
Zustaende Default (kein Fill) / Hover (`#2A3647`) / on click (`#2A3647`).

> Hover und on click sind identisch definiert. Beim Fill `#2A3647` bleibt die Textfarbe laut Datei
> `#42526E` — das ergibt ein Kontrastverhaeltnis von rund **1,6 : 1** und ist unlesbar. Siehe Abschnitt 6.

**Badge "Ai-generated ticket"** (`350510:12641`, mobil `350526:9752`) — Auto-Layout horizontal, Gap 8 px,
Gesamtgroesse 177 x 22 px. Icon `wand_stars` 22 x 22 (Vektor 16 x 16) und Text
"Ai-generated ticket" Inter 16 / 400 — **beide** mit dem Verlauf `linear-gradient(#9327FF, #2EA1DC)`.
Im Task-Overlay sitzt der Badge rechts neben dem Kategorie-Label
(Desktop `350510:12659`: Gap 8 px, Label 208 x 36, Badge x-Offset 216 px).

Das erfuellt die Lastenheft-Forderung "Hinweis, dass das Ticket KI-generiert wurde" — allerdings
als **Badge im Kopfbereich**, nicht als Text im Beschreibungsfeld. Siehe Abschnitt 6.

### 4.5 Navigation und Board-Spalten

**Sidebar-Nav** (`47:14` "Menu") — 232 px breit, 5 Eintraege je 232 x 46 px, Gap 15 px,
Padding 8 / 56 / 8 / 56, Radius 8 px, aktiver Eintrag Fill `#091931`, Text Inter 16 / 400 `#FFFFFF`,
Icon 30 x 30. Eintraege: Summary · Add Task · Board · **Backlog** · Contacts.

> Der Eintrag "Backlog" ist in **jeder** Variante des Sets auf `visible: false` gesetzt und liegt
> auf derselben y-Position wie "Board" (beide y = 142 bzw. 421,98). Er ist ein ausgeblendeter
> Alternativentwurf. In der Widescreen-Fassung (`I353017:10384;45:2497`) ist er dagegen sichtbar.
> Seine Textfarbe ist dort `#CDCDCD` — dieselbe wie im ausgeblendeten Zustand. Siehe Abschnitt 6.

**Board-Spalten** — Desktop `45:1747`, mobil `332:1228`. Fuenf Spalten in dieser Reihenfolge:

| Spalte | Desktop | Mobil |
|---|---|---|
| **Triage** | Inter 20 / 700, `#42526E` | Inter 27 / 700, `#2A3647` |
| To do | Inter 20 / 700, `#42526E` | Inter 27 / 700, `#2A3647` |
| In progress | Inter 20 / 700, `#42526E` | Inter 27 / 700, `#2A3647` |
| Await feedback | Inter 20 / 700, `#42526E` | Inter 27 / 700, `#2A3647` |
| Done | Inter 20 / 700, `#42526E` | Inter 27 / 700, `#2A3647` |

Board-Verteilung Desktop (`75609:16029`): 1208 px breit, Auto-Layout horizontal, Gap **16 px**,
Padding 0 / 24 / 0 / 24. Mobil (`75918:14018`): 396 px, Auto-Layout vertikal, Gap **24 px**.

Die "Triage"-Spalte aus dem Lastenheft ist damit im Design vorhanden — und zwar als **erste** Spalte.

### 4.6 Anmerkung zur Komponentenzahl

Der Datei-Header meldet 137 `componentSets` und 419 `components`. Im Node-Baum finden sich
95 COMPONENT_SETs und 3 freistehende COMPONENTs. Die Differenz sind Komponenten aus verknuepften
Bibliotheken, die in dieser Datei nur als Instanz vorkommen, sowie Eintraege aus geloeschten Frames.
Fuer die Umsetzung ist der Node-Baum massgeblich.

---

## 5. Notes from the source file

Woertlich uebernommen, in der Originalsprache. Deutsche Uebersetzung nur zusaetzlich, wo der
Originaltext englisch ist.

**`242516:6122` — "Hinweis" (Seite "Join Desktop and Mobile design", Figtree 99 px)**

> Hinweis: Für die Figma-Designs, die für die Praxisprojekte genutzt werden, ist in der Regel kein Bearbeitungszugriff erforderlich.
>
> Informationen zum Widescreen-Design findest du auf der “Page Components” Seite.

**`353017:10351` — Widescreen-Erklaerung (Seite "Page Components design system", Figtree 99 px)**

> Um ein einheitliches Design auf größeren Bildschirmen zu gewährleisten, bieten wir eine Breitbild-Layout-Lösung an. Füge bei der Umsetzung einen Breakpoint bei 1440px hinzu.
>
> Wenn dein Bildschirm eine höhere Auflösung unterstützt, kannst du diese aktivieren, indem du
> auf den Play-Button in der oberen rechten Ecke klickst
>
> und die „Responsive"-Ansicht auswählst.

**`353017:10352`**

> Du kannst dir auch die Designs unten ansehen, um zu sehen, wie sich das Interface über breitere Bildschirmgrößen skalieren soll.

**`353017:10360` — Note 4 (Patrick Hand 99 px)**

> Für den Login-Screen alles innerhalb der gleichen Grenzen
> wie in der normalen Desktop-Version zentriert.

**`353021:9422` — Note 5**

> Für die App den Header und die Menüleiste skalieren,
> den Inhalt jedoch an derselben Stelle belassen.

**`353021:9427` — Note 6**

> Hier ein weiteres Beispiel

**`350537:9980` — Note 8 (Patrick Hand 24 px) — betrifft den Issue Collector direkt**

> This screen only appears after the daily limit has been reached!
> By default, show the previous frame: 'Stakeholder'.

*(Dieser Screen erscheint erst, nachdem das Tageslimit erreicht ist. Standardmaessig den vorigen Frame "Stakeholder" zeigen.)*

**`667:3865` und `667:3874` — Note 1 (Patrick Hand 24 px)**

> this should not be connected. The reset password only opens with the link in the email. It is just conected for show it in the prototype.

*(Das darf nicht verlinkt sein. Das Zuruecksetzen des Passworts oeffnet sich nur ueber den Link in der E-Mail. Es ist nur fuer den Prototyp verbunden.)*

**`71454:18539` — Note 2 (Desktop)**

> Only able when the privacy policy is marked

*(Nur aktiv, wenn die Datenschutzerklaerung angehakt ist.)*

**`75857:7602` — Note 3**

> only enabled when the form is filled

*(Nur aktiv, wenn das Formular ausgefuellt ist.)*

**`75857:7594` — Note 4**

> Use this card on the prototype reproduction to see the Drag and drop interaction. To see this card on the prototype first Add task.

**`75857:7590` — Note 5**

> Use these cards on the prototype reproduction to see “open” the task description overlay.

**`16566:3724` und `75857:7598` — Note 2 / Note 6 (mobil und Desktop, identischer Text)**

> Sobald Text geschrieben wurde: Bitte nur Tasks anzeigen, die den Text im Titel oder in der Beschreibung haben.

**`294678:9853` — Note 7**

> Alternative to the drag & drop function for mobile version. Not prototyped frame. It just showing how this ist going to look.

*(Alternative zur Drag-and-drop-Funktion fuer die mobile Fassung. Kein prototypisierter Frame. Zeigt nur, wie es aussehen soll.)*

**`74094:5228` — Nota 1 (Seite "Page Components design system")**

> For Favicon

*(Bezieht sich auf die daneben liegende Logo-Komponente `353:2207`, 49 x 60 px.)*

**`74134:5387` ff. — Hilfeseite (`71454:18330`), Inter 16 px, gekuerzt**

> Join is a kanban-based project management tool designed and built by a group of dedicated students as part of their web development bootcamp at the Developer Akademie. […]

---

## 6. Open questions and conflicts

Nichts hiervon ist in der Spec aufgeloest. Jeder Punkt braucht eine Entscheidung, bevor
er im Code landet.

### 6.1 Abgleich mit dem Lastenheft — im Design vorhanden

| Lastenheft-Punkt | Beleg im Design |
|---|---|
| Spalte "Triage" im Board | vorhanden, **erste** Spalte, Desktop `45:1747` und mobil `332:1228` |
| Landing Page fuer Stakeholder | `350504:9311` (Desktop) / `350522:9621` (mobil) |
| Weiche "Feature Request" vs. "Teammitglied" | `350504:9300` "Welcome" / `350522:9493` — Buttons "Create request" und "Member log in" |
| Tageslimit transparent kommunizieren | "0 of 10 requests used today" (`350504:9389/9390`) und Fliesstext "A total of 10 requests can be created per day…" |
| Zustand "Limit erreicht" | `350504:9548` / `350522:9722`, Hinweisflaeche `#FFD2D2` @52 %, Zaehler in `#FF3D00` bzw. `#DE3500` |
| Hinweis "KI-generiert" am Ticket | Badge "Ai-generated ticket" mit `wand_stars`-Icon, `350510:12641` |
| Ersteller am Ticket sichtbar | Komponente `Creator` `350510:12396` |
| Unterscheidung intern / extern | Varianten `member` (`#92FFBC`) und `extern` (`#EBFC88`) |
| Prioritaet urgent / medium / low | `Priority symbols` `75609:16169` |
| Deadline am Ticket | Feld `Due date v1` `94:448` |

### 6.2 Abgleich mit dem Lastenheft — im Design NICHT vorhanden

Diese Punkte stehen im Lastenheft, haben aber **keinen** Frame und keine Komponente in der Datei.
Sie sind Implementierungsentscheidungen, keine Design-Vorgaben.

| Fehlend | Lastenheft-Bezug |
|---|---|
| **Bestaetigungsmail** an den Absender nach erfolgreicher Ticket-Anlage | "Der Stakeholder bekommt eine Bestätigungsmail…" — kein Mail-Template im Design |
| **Fehler-Antwortmail** ("Team hat die E-Mail erhalten und meldet sich") | "Sofern es einen Fehler bei der Verarbeitung gab…" — kein Template |
| **Limit-Antwortmail** bei Ueberschreitung | "…erhält der Absender eine automatische E-Mail Antwort…" — kein Template |
| **Benachrichtigungsmail** bei Spaltenwechsel | "Sofern das Ticket in eine andere Spalte verschoben wird…" — kein Template |
| **Ladezustand** waehrend der KI-Verarbeitung | kein Skeleton, kein Spinner in der Datei |
| **Leerer Zustand** der Triage-Spalte | Board-Frames zeigen immer gefuellte Spalten |
| **Fehlerzustand** eines Eingabefelds als Komponentenvariante | nur ein loser Text-Node "This field is required" |
| **Focus-Zustand** (Tastaturfokus) | die Sets kennen `hover` und `click`, aber keinen `focus` |
| **Erfolgsmeldung** nach Ticket-Anlage aus der Landing Page | Toast `585:4885` "Added to board" existiert nur fuer den internen Flow |
| Sichtbarkeit "Ersteller" bei **manuell** erstellten Tickets | die Creator-Komponente zeigt beide Faelle, aber kein Frame zeigt sie im Add-Task-Formular |

Der `Email mask`-Screen (`350504:9168` / `350522:9506`) ist **kein Feature**, sondern ein
Mockup: ein Screenshot eines E-Mail-Clients als Rasterbild mit einem "Back"-Button darueber.
Er dient nur der Prototyp-Demonstration.

### 6.3 Im Design vorhanden, im Lastenheft nicht erwaehnt

| Element | Anmerkung |
|---|---|
| Nav-Eintrag **"Backlog"** (`45:2686`) | in allen Menu-Varianten ausgeblendet, in der Widescreen-Fassung sichtbar. Das Lastenheft nennt "Triage", nicht "Backlog". **Widerspruch: heisst der Menuepunkt Backlog und die Spalte Triage, oder ist "Backlog" der verworfene Vorname von "Triage"?** |
| Frames "Floating add task Backlog v1" (`204:3903`), "Added to back log V1" (`204:4005`) | dieselbe Namensunsicherheit |
| Komplette Kontaktverwaltung, Summary, Add-Task, Legal Notice, Privacy Policy, Help | Bestandteile des bestehenden Join-Projekts, im Lastenheft nur implizit vorausgesetzt |
| "Guest Log in" / Gastmodus | im Lastenheft nicht erwaehnt |
| Widescreen-Tier bei 3400 px | im Lastenheft nicht erwaehnt |

### 6.4 Widersprueche innerhalb der Datei

| # | Widerspruch | Kandidaten und Herkunft |
|---|---|---|
| 1 | **Stilname ≠ Stilwert** | Stil `Ligth blue` (`391580ab`) wird als Stroke `#005DFF` verwendet, waehrend zwei andere Stile gleichen Namens `#29ABE2` sind. Stil `Version 2/main color` (`78b5e298`) ist `#4589FF`, ein anderer gleichen Namens ist `#2A3647`. |
| 2 | **Gleicher Stilname, mehrere Werte** | `icon` = `#A8A8A8` **und** `#686868`. `Style` = `#686868`, `#D1D1D1` **und** ein Verlauf. `nuevo` = Schatten @10 % **und** @16 %. `shadoe backlog box` = drei verschiedene Schatten. `stronger` = zwei verschiedene. |
| 3 | **Textstil-Namen nicht monoton** | `Version 2/t5` ist einmal Inter 27 px, einmal Open Sans 23 px. `Version 2/t6` ist Inter 20, Inter 21 und Open Sans 19 px. `Version 2/t7` ist 12 px **und** 14 px. |
| 4 | **Zwei Schriftfamilien fuer dieselbe Rolle** | Fliesstext ist teils Inter 16 / 400, teils Open Sans 16 / 400 — auf denselben Screens (Stakeholder mischt beide). Die aelteren Screens sind Inter, die neuen Open Sans. **Entscheidung noetig, welche Familie gilt.** |
| 5 | **Poppins nur fuer Fehlermeldungen** | "This field is required" ist die einzige Stelle mit Poppins (12 px). Entweder bewusst, oder ein Ueberbleibsel. |
| 6 | **Mulish nur fuer ein Label** | "Move to" in der mobilen Move-Task-Ansicht. Fuenf Nodes insgesamt. |
| 7 | **Layout-Grid passt auf keinen Frame** | 12 × 65 + 11 × 30 = 1110 px, liegt aber identisch auf 428-, 1440- und 3400-px-Frames und ist ueberall unsichtbar. |
| 8 | **Zwei Content-Breiten Desktop** | `ContentRight` 1208 px (= 1440 − 232) vs. innerer `Content` 1025 px mit x-Offset 327 px. Der zweite Wert ergibt links 95 px und rechts 88 px Rand — nicht symmetrisch. |
| 9 | **Header-Padding doppelt belegt** | Komponente `567:3148` hat Padding-links 348 px, die Instanz im Screen 116 px. |
| 10 | **Board-Gap Desktop vs. mobil** | 16 px gegen 24 px. |
| 11 | **Text field Default-Stroke** | Desktop `#D1D1D1`, mobil `#686868` — mobil fehlt ausserdem der `hover`-Zustand. |
| 12 | **Label "Technical Task" zwei Farben** | `#12AD9A` (Komponente) und `#1FD7C1` (Overlay-Fassung). |
| 13 | **Zaehlerfarbe "limit reached"** | Desktop `#FF3D00`, mobil `#DE3500`. |
| 14 | **Hover = click** | Bei `See profile` und `Send email` sind beide Zustaende identisch definiert. |
| 15 | **Fuenf gleichwertige `white`-Stile** | plus drei `black`-Stile — reine Duplikate. |

### 6.5 Kollision Design-Vorgabe ↔ Projektregel

Beide Seiten genannt, nichts stillschweigend entschieden.

| # | Design sagt | Projektregel sagt | Betroffen |
|---|---|---|---|
| 1 | Fehlermeldung "This field is required" in **12 px** | Globale Regel: **jede Schriftgroesse mindestens 16 px**. Lastenheft: mindestens 16 px, Kleingedrucktes nicht unter 14 px | `I353017:10337;310:1292` u. a., 98 Nodes mit 12 px |
| 2 | `Version 2/label` in **13 px**, `Version 2/t7` in **14 px** | dieselbe Regel | 5 bzw. 29 Nodes |
| 3 | Mobile Buttons **27 px hoch** (`371:2122`, `371:2129`) | Touch-Target mindestens 44 px | alle mobilen Sekundaer-/Primaerbuttons ohne Icon |
| 4 | `See profile` / `Send email`: Text `#42526E` auf Fill `#2A3647` im Hover | Kontrast mindestens 4,5 : 1 | `350510:12344`, `350510:12340` — tatsaechlich rund 1,6 : 1 |
| 5 | Nav-Eintrag "Backlog" Text `#CDCDCD` auf `#2A3647` | Kontrast mindestens 4,5 : 1 | `45:2690` — rund 4,4 : 1, knapp darunter |
| 6 | Secondary-Button wechselt Stroke 1 px → 2 px im Hover | Keine Layout-Shifts | `301:1832`, `70:797` |
| 7 | Kein `focus`-Zustand in irgendeinem Set | Tastaturbedienbarkeit | alle interaktiven Komponenten |
| 8 | Board-Karten nur per Drag & Drop verschiebbar; mobil ein "Move to"-Menue (`294678:8877`, laut Note 7 **nicht** prototypisiert) | Tastaturbedienbarkeit | Board |

### 6.6 Nicht in Figma definiert

- Breakpoint zwischen Mobile (428 px) und Desktop (1440 px) — **not defined in Figma**
- Verhalten unter 428 px und zwischen 1441 und 3399 px — **not defined in Figma**
- Alle E-Mail-Templates (Bestaetigung, Fehler, Limit, Statuswechsel) — **not defined in Figma**
- Lade- und Leerzustaende — **not defined in Figma**
- Fokus-Zustaende — **not defined in Figma**
- Animationen und Uebergangsdauern — **not defined in Figma**
- Verhalten des Zaehlers "x of 10" zwischen 1 und 9 (nur 0 und 10 sind designt) — **not defined in Figma**
- Wo genau der Hinweis "KI-generiert" im Beschreibungstext steht (das Lastenheft fordert ihn **im Beschreibungstext**, das Design zeigt einen **Badge im Kopfbereich**) — **Konflikt, nicht aufgeloest**

### 6.7 Technische Einschraenkungen bei der Extraktion

| Punkt | Befund |
|---|---|
| `/v1/files/<key>/styles` | **403** — `Invalid scope: ["file_content:read"]`. Nicht benoetigt, die Style-Map steht in `file.json`. |
| 8 Top-Level-Frames liefern kein Render | `10119:3717`, `10175:3745`, `656:3794`, `656:3836`, `656:3857`, `664:3733`, `664:3772`, `664:3851` — alle sind in Figma auf `visible: false` gesetzt (Forgot-Password-Strecke und zwei Bestaetigungs-Toasts). Ihre Daten liegen vollstaendig im Cache, nur der Bild-Export ist nicht moeglich. |
| 4 Icons liefern kein Render | `45:2688` (Backlog icon), `45:2516` (uit:web-grid), `45:2525` (Write task icon), `10119:3730` (SendCheck) — liegen in ausgeblendeten Eltern-Nodes. Sie wurden ueber `/v1/files/<key>/nodes?geometry=paths` aus der Pfadgeometrie rekonstruiert und liegen als vollwertige SVGs in `assets/icons/`. |
| Rate-Limit | `/v1/images` liefert bei grossen Frames (1920 × 6140 px, 3533 × 9441 px) HTTP 429. Die Referenz-Screenshots werden mit exponentiellem Backoff nachgeladen. |

---

## 7. Herkunft und Reproduzierbarkeit

| Artefakt | Erzeugt durch | Quelle |
|---|---|---|
| `.figma-cache/file.json` | `GET /v1/files/6OT2cRhEtUALqFQy0ukNlT` | Figma REST API |
| `.figma-cache/image-fills.json` | `GET /v1/files/<key>/images` | Figma REST API |
| `.figma-cache/geometry-nodes.json` | `GET /v1/files/<key>/nodes?geometry=paths` | Figma REST API |
| `assets/icons/*.svg`, `assets/logos/*.svg` | `GET /v1/images?format=svg` | Figma REST API |
| `assets/icons/material/*.svg` | `raw.githubusercontent.com/google/material-design-icons` | Google, Apache 2.0 |
| `assets/images/*` | Original-URLs aus `image-fills.json` | Figma S3, unskaliert |
| `assets/fonts/*` | `fonts.googleapis.com/css2` + `fonts.gstatic.com` | Google Fonts, OFL 1.1 |
| `docs/design/components.md` | `tools/components.py` gegen den Cache | — |
| `docs/design/reference/*.png` | `GET /v1/images?format=png&scale=1` | Figma REST API |
| `assets/MANIFEST.md` | `tools/manifest.py` gegen den Cache | — |

Alle Auswertungsskripte liegen in `tools/` und arbeiten ausschliesslich gegen `.figma-cache/`.
Ein erneuter API-Aufruf ist fuer Nachfragen nicht noetig.
