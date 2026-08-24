# docs/design

| Datei | Inhalt |
|---|---|
| `spec.md` | Design Spec: Foundations, Breakpoints, Frames, Komponenten, Notizen, offene Punkte |
| `components.md` | Vollstaendiges Komponenten-Inventar, generiert aus dem Cache |
| `reference/` | Referenz-Screenshots je Top-Level-Frame, `scale=1` |

Der Rohdaten-Cache liegt in `.figma-cache/`. Er ist absichtlich **nicht** in `.gitignore`
eingetragen - sobald dieses Verzeichnis ein Git-Repository ist, gehoert die Zeile
`.figma-cache/` nach `.git/info/exclude`, damit der Cache lokal bleibt, ohne die
Ignore-Regeln des Projekts zu belegen.
