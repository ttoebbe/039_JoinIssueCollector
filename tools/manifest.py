"""Write assets/MANIFEST.md from the export map, the downloaded files and the cached node data."""
import sys, json, os, glob, struct
sys.path.insert(0, 'tools')
from fig import *

d = load()
index = {}
for p in pages(d):
    for n, _, _, _ in walk(p):
        index[n['id']] = (n, p['name'])


def size_of(path):
    """Return (width, height) of a PNG or JPEG file without external libraries."""
    with open(path, 'rb') as f:
        head = f.read(26)
    if head[:8] == b'\x89PNG\r\n\x1a\n':
        return struct.unpack('>II', head[16:24])
    if head[:3] == b'\xff\xd8\xff':
        with open(path, 'rb') as f:
            f.read(2)
            while True:
                b = f.read(1)
                if not b:
                    return None
                if b != b'\xff':
                    continue
                m = f.read(1)
                while m == b'\xff':
                    m = f.read(1)
                if m[0] in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                    f.read(3)
                    hh, ww = struct.unpack('>HH', f.read(4))
                    return (ww, hh)
                ln = struct.unpack('>H', f.read(2))[0]
                f.read(ln - 2)
    return None


emap = json.load(open('tools/export-map.json'))
L = []
A = L.append
A('# Asset manifest')
A('')
A('Quelle: Figma-Datei `Join Version 1 KI-gestuetzte Automatisierung`, File Key `6OT2cRhEtUALqFQy0ukNlT`,')
A('Stand `lastModified 2026-08-24T11:35:33Z`, Version `2391254490495657140`.')
A('Alle Masse in px. "Anzeigemass" = Groesse des Nodes im Figma-Design.')
A('')
A('## 1. Logos (SVG, Export aus Figma)')
A('')
A('| Datei | Quell-Node | Node-Name | Anzeigemass | Herkunft |')
A('|---|---|---|---|---|')
for nid, rel in emap.items():
    if not rel.startswith('logos/'):
        continue
    path = os.path.join('assets', rel)
    if not os.path.exists(path):
        continue
    n, pg = index.get(nid, (None, '-'))
    ab = (n.get('absoluteBoundingBox') or {}) if n else {}
    A('| `%s` | `%s` | %s | %g x %g | Figma /v1/images SVG |'
      % (rel, nid, n['name'] if n else '?', round(ab.get('width', 0)), round(ab.get('height', 0))))

A('')
A('## 2. Icons aus Figma (SVG)')
A('')
A('| Datei | Quell-Node | Node-Name | Anzeigemass | Herkunft |')
A('|---|---|---|---|---|')
rebuilt = {'icons/nav-backlog.svg', 'icons/web-grid.svg', 'icons/write-task.svg', 'icons/send-check.svg'}
for nid, rel in emap.items():
    if not rel.startswith('icons/'):
        continue
    path = os.path.join('assets', rel)
    if not os.path.exists(path):
        continue
    n, pg = index.get(nid, (None, '-'))
    ab = (n.get('absoluteBoundingBox') or {}) if n else {}
    src = 'Figma /v1/images SVG'
    if rel in rebuilt:
        src = 'Figma /v1/files/.../nodes?geometry=paths, SVG rekonstruiert (Node liegt in einem ausgeblendeten Elternteil, Render-API liefert null)'
    A('| `%s` | `%s` | %s | %g x %g | %s |'
      % (rel, nid, n['name'] if n else '?', round(ab.get('width', 0)), round(ab.get('height', 0)), src))

A('')
A('## 3. Icons aus der Material-Symbols-Bibliothek (SVG)')
A('')
A('Diese Nodes tragen im Figma-Baum Material-Symbols-Namen und die typische 24x24-Bounding-Box-Kindebene.')
A('Sie wurden **nicht** aus Figma exportiert, sondern aus der Originalquelle geladen:')
A('`github.com/google/material-design-icons`, Pfad `symbols/web/<name>/materialsymbolsoutlined/<name>_24px.svg`.')
A('Lizenz: Apache License 2.0. Alle Dateien 24 x 24 mit `viewBox="0 -960 960 960"`, einfarbig.')
A('')
A('| Datei | Material-Name | Verwendung im Design |')
A('|---|---|---|')
USE = {
    'add': 'Plus in den Add-task-Buttons',
    'arrow-downward': 'Prioritaets-Pfeil / Move-to-Menue mobil',
    'arrow-drop-down': 'Select-Feld Pfeil',
    'arrow-upward': 'Move-to-Menue mobil',
    'attach-email': 'Task-Overlay, Creator extern',
    'call': 'Kontakt-Detail Telefon',
    'check': 'Primary-Check-Button, Subtask-Check',
    'delete': 'Kontakt bzw. Task loeschen',
    'done': 'Subtask erledigt',
    'edit': 'Kontakt bzw. Task bearbeiten',
    'edit-square': 'Menuepunkt Add Task',
    'event': 'Due-date-Feld',
    'help': 'Header-Hilfe',
    'language': 'Task-Overlay',
    'lock': 'Passwortfeld',
    'login': 'Menuepunkt Log In',
    'mail': 'Kontakt-Detail E-Mail',
    'more-vert': 'Kontakt-Optionen mobil',
    'perm-contact-calendar': 'Menuepunkt Contacts',
    'person': 'Name-Feld / Creator-Profil-Link',
    'person-add': 'Add-new-contact-Button',
    'search': 'Board-Suche',
    'swap-horiz': 'Move-task-Ansicht mobil',
    'visibility': 'Passwort anzeigen',
    'visibility-off': 'Passwort verbergen',
    'wand-stars': 'Badge Ai-generated ticket',
    'work': 'Stakeholder-Weiche auf der Welcome-Seite',
}
for f in sorted(glob.glob('assets/icons/material/*.svg')):
    b = os.path.basename(f)[:-4]
    A('| `icons/material/%s.svg` | `%s` | %s |' % (b, b.replace('-', '_'), USE.get(b, '-')))

A('')
A('## 4. Rasterbilder (Originaldateien, unskaliert)')
A('')
A('Bezogen ueber `imageRef` -> `/v1/files/<key>/images` (Originaldatei), **nicht** ueber `/v1/images`.')
A('Letzteres wuerde auf die Anzeigegroesse herunterrendern und Aufloesung verschenken.')
A('')
A('| Datei | imageRef | Verwendet in | Anzeigemass | Originalmass | Format | Qualitaet |')
A('|---|---|---|---|---|---|---|')
IMG = [
    ('stakeholder-intro.png', '24c901d1e37ef8529724616925b8d8061028aaa6',
     [('350504:9382', 'Stakeholder Desktop', 416, 280), ('350522:9698', 'Stakeholder Mobile', 292, 201)]),
    ('stakeholder-limit-reached.png', '55db20f86941dca1776256be5a7411b1318fed45',
     [('350519:7107', 'Stakeholder limit reached Desktop', 416, 283), ('350522:9780', 'Stakeholder limit reached Mobile', 292, 215)]),
    ('email-mask-inbox.png', '2ea570c61b6f9ba1a4c2fbb8a5bb3ed05dc65a0a',
     [('350504:9170', 'Email mask Desktop, Hintergrund', 1438, 646)]),
    ('email-mask-compose.png', '0eaf3efd8d98baf88d78af5616b6a7d52b9f8628',
     [('350504:9173', 'Email mask Desktop, Compose-Fenster', 1134, 583)]),
    ('email-mask-mobile.jpg', '352b683483d0d125c3d1ab6be5de2fb9895e6d3f',
     [('350522:9508', 'Email mask Mobile', 383, 810)]),
    ('thumbnail-board.jpg', '2debe70c90e67845e32c46623b77a05c110040eb',
     [('71072:5049', 'Seite TN, Datei-Thumbnail', 1328, 1147)]),
    ('thumbnail-summary.jpg', '1eea4e17c4137baebb75a64225067bf1bcd03bb0',
     [('71072:5050', 'Seite TN, Datei-Thumbnail', 958, 681)]),
    ('widescreen-hint-play-button.png', '2e19b7ee08dfa7dccc463670d142908032184500',
     [('353017:10353', 'Widescreen-Erklaertext', 234, 130)]),
    ('widescreen-hint-responsive-menu.png', '5775edcee8a140ca0d0ea83079057d7f1e07fc0c',
     [('353017:10354', 'Widescreen-Erklaertext', 602, 905)]),
]
for name, ref, uses in IMG:
    path = os.path.join('assets', 'images', name)
    if not os.path.exists(path):
        continue
    ow, oh = size_of(path)
    fmt = 'PNG' if name.endswith('.png') else 'JPEG'
    need_w = max(u[2] for u in uses)
    need_h = max(u[3] for u in uses)
    warn = 'ok' if (ow >= need_w and oh >= need_h) else '**Original kleiner als Anzeigegroesse**'
    usestr = '<br>'.join('`%s` %s' % (u[0], u[1]) for u in uses)
    dispstr = '<br>'.join('%g x %g' % (u[2], u[3]) for u in uses)
    A('| `images/%s` | `%s` | %s | %s | %d x %d | %s | %s |'
      % (name, ref[:12] + '...', usestr, dispstr, ow, oh, fmt, warn))

A('')
A('Elf weitere `imageRef`-Eintraege stehen in `.figma-cache/image-fills.json`, werden aber von keinem Node')
A('der Datei referenziert (Altbestand aus geloeschten Frames). Sie wurden nicht geladen.')

A('')
A('## 5. Schriften (woff2 + fonts.css)')
A('')
A('Figma liefert nur Schriftnamen, keine Dateien. Alle im Design verwendeten Familien sind ueber Google Fonts')
A('frei verfuegbar (SIL Open Font License 1.1) - es gibt **keine** kommerzielle Schrift in der Datei.')
A('Geladen wurden die Subsets `latin` und `latin-ext`.')
A('Inter, Open Sans und Mulish liefert Google als Variable Font aus: eine Datei je Subset deckt alle Gewichte ab,')
A('die Dateien heissen deshalb `*-var-*`.')
A('')
A('| Datei | Familie | Gewichte im Design | Groesse |')
A('|---|---|---|---|')
FONT = [
    ('inter-var-latin.woff2', 'Inter', '400, 500, 600, 700'),
    ('inter-var-latin-ext.woff2', 'Inter', '400, 500, 600, 700'),
    ('open-sans-var-latin.woff2', 'Open Sans', '400, 600, 700'),
    ('open-sans-var-latin-ext.woff2', 'Open Sans', '400, 600, 700'),
    ('poppins-400-latin.woff2', 'Poppins', '400'),
    ('poppins-400-latin-ext.woff2', 'Poppins', '400'),
    ('mulish-var-latin.woff2', 'Mulish', '500, 700'),
    ('mulish-var-latin-ext.woff2', 'Mulish', '500, 700'),
]
for f, fam, w in FONT:
    p = os.path.join('assets', 'fonts', f)
    if os.path.exists(p):
        A('| `fonts/%s` | %s | %s | %d KB |' % (f, fam, w, round(os.path.getsize(p) / 1024)))
A('| `fonts/fonts.css` | alle | @font-face inkl. `unicode-range` | %d KB |'
  % round(os.path.getsize('assets/fonts/fonts.css') / 1024))
A('')
A('**Nicht geladen:** `Patrick Hand` und `Figtree` kommen ausschliesslich in Canvas-Beschriftungen und in den')
A('Notizen des Design-Teams vor, in keinem UI-Element. `Figtree` steht zusaetzlich im Datei-Thumbnail auf Seite `TN`.')

A('')
A('## 6. Referenz-Screenshots')
A('')
A('`docs/design/reference/` - je Top-Level-Frame ein PNG in `scale=1`, Namensschema `<seite>__<frame>.png`.')
A('Das ist die Vergleichsbasis fuer die visuelle Verifikation in Phase 6.')
A('')

open('assets/MANIFEST.md', 'w', encoding='utf-8').write('\n'.join(L))
print('MANIFEST written,', len(L), 'lines')
