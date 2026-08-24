Figma → erster Entwurf — Workflow für die nächste Aufgabe

Stand: 07.08.2026. Ziel: In EINEM Prompt vom Lastenheft + Figma-Link zum ersten lauffähigen Entwurf — Schrift, Größen, Farben, Bilder, Icons exakt aus den extrahierten Daten, nichts geschätzt.

Verifizierte Fakten (getestet bzw. recherchiert)
api.figma.com ist aus der Cowork-CLOUD-Umgebung NICHT erreichbar (Verbindung geblockt). Im Modus "Auf deinem Computer" (Desktop-App, Auswahl "Run this task" beim Start) läuft curl lokal und erreicht die API.
Der Figma-MCP-Connector ist zwar verbunden (Account toebbe.thomas), aber auf dem Starter-Plan mit View-Seat gelten laut Figma-Doku nur ca. 6 Tool-Aufrufe PRO MONAT. Für eine vollständige Extraktion unbrauchbar — höchstens für einen einzelnen gezielten Abruf.
Personal Access Tokens gibt es auch im Free-Plan kostenlos (Figma → Settings → Security → Personal access tokens, Scope "File content: read"). Die REST API hat kein Monatslimit, nur Raten-Limits pro Minute.
Voraussetzungen (liefert Thomas beim Start)
Lastenheft (Datei anhängen oder in den Ordner legen).
Die Figma-Datei vorher in den EIGENEN Figma-Account importieren (Kopie/Blueprint). Auf das Original der Developer Akademie besteht kein erweiterter Zugriff — egal, gearbeitet wird immer auf der eigenen Kopie.
File Key aus der URL der importierten Kopie (figma.com/design/<KEY>/...). NIE die alte Akademie-URL verwenden — Node-IDs ändern sich beim Kopieren.
Personal Access Token.
Zielordner für das Projekt.

Task in der Desktop-App im Modus "Auf deinem Computer" starten (nicht in der Cloud), damit curl api.figma.com erreicht.

GESAMTABLAUF (Reihenfolge ist verbindlich)
Phase 1 — Lastenheft lesen (VOR Figma)

Lastenheft vollständig lesen und daraus eine Funktions-Checkliste erstellen: Seiten, Funktionen, technische Vorgaben (Stack, responsive Anforderungen, Validierung, Barrierefreiheit, Abgabeform). Der TECH-STACK wird dem Lastenheft entnommen — er variiert je Projekt. Steht er nicht drin: nachfragen, nicht annehmen. Die Checkliste ist die Prüfliste für Phase 6.

Phase 2 — Figma komplett extrahieren

Die Schritte 0–8 weiter unten ("Figma-Extraktion im Detail"). Ergebnis: docs/design/spec.md + assets/ + .figma-cache/.

Phase 3 — Abgleich Lastenheft ↔ Design
Was verlangt das Lastenheft, das im Design fehlt? (typisch: Fehlerzustände, Hover/Focus, leere Listen, Ladezustände, Erfolgsmeldungen)
Was zeigt das Design, das im Lastenheft nicht steht?
Beides in die Spec, Abschnitt "Open questions and conflicts". Lücken werden NOTIERT, nicht durch Raten gefüllt.
Phase 4 — Zwischenbericht (kein Stopp)

Kurz im Chat: Umfang (Frames, Komponenten, Assets), Widersprüche, Lücken aus Phase 3. Danach automatisch weiter — Thomas kann eingreifen, muss aber nicht.

Phase 5 — Erster Entwurf

Strikt aus der Spec bauen, in dieser Reihenfolge:

Foundations als CSS Custom Properties (Farben, Schriftfamilien, Schriftgrößen, Zeilenhöhen, Abstände, Radien, Schatten) — jede Variable mit Herkunftskommentar (Stilname aus Figma).
fonts.css einbinden (aus Schritt 6C), Assets aus assets/ referenzieren — keine Platzhalter.
Komponenten (Buttons, Cards etc.) mit allen Varianten/Zuständen aus der Spec.
Seiten/Layouts je Breakpoint-Tier. Alle Werte kommen aus den extrahierten Daten. Wo die Spec "not defined in Figma" sagt: sinnvolle Entscheidung treffen und im Code als Kommentar /* not defined in Figma: ... */ markieren.
Phase 6 — Verifikation
Entwurf im Browser rendern, Screenshots machen und gegen die Figma-Referenz-Screenshots halten; Abweichungen (Abstände, Größen, Farben) korrigieren.
Lastenheft-Checkliste aus Phase 1 Punkt für Punkt abhaken; offene Punkte im Abschlussbericht nennen.
Abschlussbericht: was fertig ist, was offen ist, welche Entscheidungen Thomas treffen muss.
Figma-Extraktion im Detail (Phase 2)

Alle API-Aufrufe mit Header: X-Figma-Token: <TOKEN>

Schritt 0 — Voraussetzung prüfen
curl -s -H "X-Figma-Token: <TOKEN>" \
  "https://api.figma.com/v1/files/<KEY>" | head -c 300

Kommt JSON zurück: weiter mit Schritt 1. Kommt 403 oder Netzwerkfehler: abbrechen und Thomas sagen, was zurückkam. Nicht auf UI-Automatisierung ausweichen.

Schritt 1 — Rohdaten holen und lokal cachen
GET https://api.figma.com/v1/files/<KEY> → .figma-cache/file.json
GET https://api.figma.com/v1/files/<KEY>/styles → .figma-cache/styles.json
GET https://api.figma.com/v1/files/<KEY>/images → .figma-cache/image-fills.json (Mapping imageRef → URL der ORIGINALDATEI, unskaliert)

file.json enthält bereits ALLES an Design-Daten: alle Farben, Schriftfamilien, Schriftgrößen, Abstände, Effekte — es gibt keinen separaten Abruf für Fonts/Farben, alles kommt in diesem einen Zug.

Ab hier ausschließlich gegen den Cache arbeiten; jeder weitere API-Aufruf braucht einen Grund. .figma-cache/ in .git/info/exclude eintragen, nicht in .gitignore. Cache behalten, nicht löschen — spätere Nachfragen kosten dann keinen weiteren API-Aufruf.

Schritt 2 — Anleitungen zuerst

Im Node-Baum nach Text-Nodes mit Anweisungen des Design-Teams suchen (Namen/Inhalte mit "Note", "How to", "Hinweis", "Breakpoint", "Guideline", oder auffällig lange Textblöcke außerhalb der Screen-Frames). Diese Texte VOLLSTÄNDIG und WÖRTLICH in die Spec übernehmen, Abschnitt "Notes from the source file". Übersetzung nur zusätzlich, nie ersetzend. Sie enthalten erfahrungsgemäß die Regeln, die nirgends sonst stehen — Breakpoints, Verhalten, Sonderfälle.

Schritt 3 — Foundations

Aus styles.json und dem Node-Baum extrahieren:

Farbstile: Name UND tatsächlicher Hex-Wert, beides ausgeben, auch bei Widerspruch (Stilnamen sind oft irreführend — schon erlebt: Stil namens "
#1E5515" enthielt 
#008000).
Textstile: Familie, Größe px, Weight, Zeilenhöhe, Letter-Spacing; Gruppen mit ausgeben (Desktop / Mobile / Altbestand erkennbar halten).
Liste aller tatsächlich VERWENDETEN Schriftfamilien und Weights (aus den Text-Nodes, nicht nur aus den Stilen) — das ist die Einkaufsliste für Schritt 6C.
Layout-Grids: Spaltenzahl, Breite, Gutter, Margin, Typ; prüfen und notieren, auf WELCHE Frames das Grid tatsächlich angewendet ist — oft auf keinen.
Figma-Variablen, falls vorhanden.
Effekte (Schatten) als eigene Liste.
Schritt 4 — Frames und Breakpoints

Alle Top-Level-Frames: Name, Breite, Höhe, Auto-Layout (Richtung, Gap, Padding), Fill. Nach Breite gruppieren → Tier-Struktur ableiten (mobil / desktop / widescreen). Ausdrücklich notieren, welche Viewport-Bereiche NICHT durch ein Artboard abgedeckt sind — diese Lücken sind Implementierungsentscheidungen, keine Design-Vorgaben; das muss in der Spec stehen.

Schritt 5 — Komponenten

Alle COMPONENT_SET und COMPONENT. Pro VARIANTE (nicht pro Set — das Set ist nur Container und liefert falsche Maße): Größe, hug/fill, Padding, Gap, Radius, Fill, Stroke, Effekte, Textstil. Varianten tabellarisch nebeneinander (default/hover/active sofort sichtbar). Am Ende Radius-Übersicht: welcher Wert kommt wo vor; bei mehr als drei Werten ausdrücklich festhalten, dass ein projektweites Radius-Token nicht funktionieren wird.

Schritt 6 — Assets

Drei getrennte Wege, Unterscheidung anhand des Node-Typs:

A) VEKTOREN (VECTOR, BOOLEAN_OPERATION, Nodes ohne image-Fill): GET /v1/images/<KEY>?ids=<id1,id2,...>&format=svg → Render-URLs, dann herunterladen. Prüfen, ob Nodes aus einer Icon-Bibliothek stammen (Material Symbols: Namen wie "delete", "local_hospital" plus Bounding-Box-Kindebene). Falls ja: NICHT aus Figma exportieren, sondern direkt aus der Quelle (github.com/google/material-design-icons, Pfad symbols/web/<name>/materialsymbolsoutlined/<name>_24px.svg) — saubere Pfade auf korrektem Grid ohne Masken-Artefakte.

B) RASTERBILDER (fill.type == "IMAGE"): Den imageRef in image-fills.json nachschlagen und die ORIGINALDATEI herunterladen. Nicht über /v1/images rendern — das skaliert auf die Anzeigegröße und verschenkt Auflösung. Auflösung jeder Datei prüfen und mit der Anzeigegröße im Design vergleichen; wo das Original kleiner ist als die Anzeigegröße: in der Spec als Qualitätsrisiko vermerken.

C) FONTS: Figma liefert nur die Schriftnamen, nicht die Dateien. Für jede in Schritt 3 gesammelte Familie prüfen, ob sie auf Google Fonts verfügbar ist. Falls ja: die verwendeten Weights als woff2 herunterladen nach assets/fonts/ und ein fertiges fonts.css (@font-face-Deklarationen) dazulegen; alternativ den Google-Fonts-Link-Tag in der Spec notieren. Falls eine Schrift NICHT frei verfügbar ist (kommerzielle Schrift): in der Spec als offenen Punkt vermerken und die nächstliegende freie Alternative nennen — nicht stillschweigend ersetzen.

Benennung: kebab-case, sprechend, abgeleitet aus Frame- und Node-Namen, nicht aus Figmas Variantensyntax ("Property 1=Italian food 1" → "banner-italian"). Ablage: assets/icons/, assets/images/, assets/logos/, assets/hero/, assets/fonts/. assets/MANIFEST.md schreiben: Dateiname, Quell-Node-ID, Originalmaß, Anzeigemaß im Design, Format, Herkunft (Figma, Google Fonts oder externe Bibliothek).

Schritt 7 — Die Spec

docs/design/spec.md, Struktur:

Foundations (Farben, Typo, Grid, Effekte)
Breakpoints und responsives Verhalten
Frames je Tier
Komponenten mit allen Varianten
Notes from the source file (wörtlich)
Open questions and conflicts (inkl. Abgleich mit Lastenheft aus Phase 3)

Regeln:

Nur dokumentieren, was aus der Datei kommt. Nichts schätzen. Unbekanntes als "not defined in Figma" kennzeichnen.
Widersprüche NICHT auflösen, sondern in Abschnitt 6 sammeln — mit allen Kandidaten und Herkunft. Typische Fälle: mehrere Content-Breiten, Stilname ≠ Stilwert, unplausible Zeilenhöhen, Touch-Targets unter 44px, uneinheitliche Radien.
Wo Design-Vorgabe mit Projektregel kollidiert (Mindestschriftgrößen, Touch-Targets, Barrierefreiheit): beide nennen, nicht stillschweigend entscheiden.
Schritt 8 — Referenz-Screenshots

Je Top-Level-Frame einen Screenshot über GET /v1/images/<KEY>?ids=...&format=png&scale=1 nach docs/design/reference/ — das ist die Vergleichsbasis für Phase 6.

Alternative Wege (geprüft, nur Fallback)
Figma-MCP-Connector in der Cloud: nur ~6 Aufrufe/Monat auf Starter/View-Seat — nur für einen einzelnen gezielten Abruf geeignet.
Lokaler Dev-Mode-MCP-Server: braucht bezahlten Dev/Full-Seat — nicht verfügbar.
Manueller Export im Figma-Editor: unbegrenzt, aber Rasterbilder werden skaliert neu gerendert (Schärfe-Problem), keine Spec, Handarbeit.
Community-Plugins (Batch-Export): machbar, halbautomatisch, keine vollständige Spec.
Browser-Automatisierung (Chrome-Extension): langsam, fehleranfällig — letzte Wahl.
.fig-Datei parsen: binäres Format, nur fragile Community-Parser — abraten.
Start-Prompt für die nächste Sitzung

In der Desktop-App neue Cowork-Aufgabe im Modus "Auf deinem Computer" starten, Projekt "Figma Daten ziehen", Lastenheft anhängen, dann:

Neue Projekt-Aufgabe. Lies zuerst das Projekt-Dokument claude/figma-extraktion-workflow.md und arbeite den Gesamtablauf (Phase 1–6) ab. Lastenheft ist angehängt. File Key: <KEY> Token: <TOKEN> Zielordner: <PFAD>

Offen
Muster-Lastenheft von Thomas noch nicht hinterlegt — sobald vorhanden, Phase 1 und 3 daran präzisieren.