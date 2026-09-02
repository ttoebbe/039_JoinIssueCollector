# Design spec — Join Issue Collector

Source: Figma file **Join Version 1 KI-gestuetzte Automatisierung**
File key `6OT2cRhEtUALqFQy0ukNlT` · `lastModified 2026-08-24T11:35:33Z` · `version 2391254490495657140` · role `owner`

This spec documents exclusively what is in the Figma file. Nothing is estimated.
Where a value is missing, it says **not defined in Figma**. Contradictions are not
resolved but collected in section 6.

Raw data in the cache: `.figma-cache/file.json` (16.1 MB), `.figma-cache/image-fills.json`.
The endpoint `/v1/files/<key>/styles` returns **403 — `Invalid scope: ["file_content:read"]`**
with the token used. It is not needed: `file.json` contains the complete style map
(73 entries), and the actual values only live on the nodes anyway.

Scope of the file: 3 pages, 101 top-level frames, 137 COMPONENT_SETs per the file header
(95 of them are in the node tree, see section 4.6), 419 COMPONENTs, 73 styles, 9 raster images in use.

---

## 1. Foundations

### 1.1 Color styles

Listed are **style name and actual value**. Several styles carry the same name —
Figma allows that, so the names are unusable as token names. The "Occurrences"
column counts the nodes referencing the style.

| Style name | Actual value | Occurrences | Note |
|---|---|---|---|
| `Version 2/main color` | `#2A3647` | 851 fills, 543 strokes | primary color (sidebar, buttons, text color) |
| `white` | `#FFFFFF` | 903 + 485 + 60 + 12 + 4 fills | five identically named styles, identical value |
| `black` | `#000000` | 137 + 96 + 1 fills | three identically named styles |
| `icon2` | `#E7E7E7` | 251 fills | separators, inactive surfaces |
| `icon` | `#A8A8A8` | 213 + 6 + 2 fills, 83 strokes | icon gray, light |
| `icon` | `#686868` | 131 fills, 46 strokes | icon gray, dark — **same style name, different value** |
| `Style` | `#686868` | 121 fills, 319 strokes | placeholder/label gray |
| `Style` | `#D1D1D1` | 17 + 2 fills, 138 strokes | field border default |
| `Style` | `GRADIENT_LINEAR(#9327FF → #2EA1DC)` | 8 fills | gradient of the AI badge |
| `Version 2/Ligth blue` | `#177DA8` | 147 fills, 90 strokes | hover/active blue (typo in the style name) |
| `Ligth blue` | `#29ABE2` | 1 + 3 fills | second, lighter blue |
| `Ligth blue` | *(stroke only)* `#005DFF` | 4 strokes | **style name `Ligth blue`, value is a completely different blue** |
| `Version 2/main color` | `#4589FF` | 12 fills, 76 strokes | **style name says "main color", value is light blue** |
| `urgent color` | `#FF3D00` | 150 fills | priority urgent |
| `medium color` | `#FFA800` | 126 fills | priority medium |
| `low color` | `#7AE229` | 64 fills | priority low |
| `menu color` | `#42526E` | 50 + 20 fills | secondary text, board column headings |
| `Boton gradient` | `GRADIENT_LINEAR(#F9F9F9 → #F0F0F0)` | 2 fills | light button surface |

More colors appear directly on nodes without a style binding. The 72 solid colors
actually used across the whole tree, by frequency:

| Hex | Occurrences | Where |
|---|---|---|
| `#FFFFFF` | 3627 | surfaces, text on dark |
| `#2A3647` | 1524 | primary color |
| `#000000` | 952 | body text |
| `#D9D9D9` | 516 | icon bounding boxes (invisible helper surfaces) |
| `#686868` | 446 | secondary text, field border hover |
| `#A8A8A8` | 282 | icon gray |
| `#E7E7E7` | 274 | separators |
| `#CDCDCD` | 237 | disabled nav entries |
| `#FF7A00` | 209 | avatar color |
| `#FF3D00` | 205 | urgent |
| `#462F8A` | 189 | avatar color |
| `#177DA8` | 187 | hover blue |
| `#1FD7C1` | 187 | "Technical Task" label |
| `#FFA800` | 166 | medium |
| `#D1D1D1` | 130 | field border default |
| `#29ABE2` | 114 | logo accent |
| `#7AE229` | 110 | low |
| `#007CEE` | 103 | link/mail blue in the contact list |
| `#7B3ACF` | 102 | "User Story" label |
| `#9747FF` | 93 | **only Figma's helper frames around COMPONENT_SETs — not a UI value** |
| `#42526E` | 73 | secondary text |
| `#4589FF` | 72 | focus/active border |
| `#E4E2E2` | 68 | light surfaces |
| `#12AD9A` | 66 | "Technical Task" label (second value) |
| `#091931` | 61 | button state `click` |
| `#F6F7F8` | 59 | app page background |
| `#F4F4F4` | 46 | light surface |
| `#E60026` | 34 | error red |
| `#6E52FF` | 29 | avatar color |
| `#9327FF` | 21 | AI gradient start |
| `#FC71FF` | 21 | avatar color |
| `#FFBB2B` | 21 | avatar color |
| `#FF4646` | 20 | avatar color |
| `#0B3681` | 20 | text in the creator badge |
| `#00BEE8` | 17 | avatar color |
| `#EEEEEE` | 16 | light surface |
| `#F0F0F0` | 13 | canvas background of the design-system page |
| `#FF0000` | 10 | **only the invisible layout-grid color** |
| `#FF8190` | 10 (+16 at opacity 0) | error surface |

Project-specific colors from the new screens (stakeholder / creator / AI):

| Hex | Use | Node |
|---|---|---|
| `#FFD2D2` at 52 % opacity | "daily limit reached" notice surface | `350537:9936`, `350522:9795` |
| `#92FFBC` | creator badge, variant **member** | `350510:12310` |
| `#EBFC88` | creator badge, variant **extern** | `350510:12321` |
| `#0B3681` | text color in the creator badge | `350510:12313`, `350510:12324` |
| `GRADIENT_LINEAR(#9327FF → #2EA1DC)` | "Ai-generated ticket" badge (icon **and** text) | `350510:12644`, `350510:12645` |
| `#DE3500` | "10 of 10 requests used" mobile | `350522:9778` |
| `#FF3D00` | "10 of 10 requests used" desktop | `350504:9579` |
| `#177DA8` | "0 of 10 requests used" (both tiers) | `350504:9390`, `350522:9695` |
| `#2D2D2D` | header bar in the "Email mask" mockup | `350504:9172` |

**Avatar palette** (set `75584:6593` "colors", 15 variants, 32 x 32 each, `border-radius: 45px` — fully round):

`#FF7A00` · `#FF5EB3` · `#6E52FF` · `#9327FF` · `#00BEE8` · `#1FD7C1` · `#FF745E` · `#FFA35E` ·
`#FC71FF` · `#FFC701` · `#0038FF` · `#C3FF2B` · `#FFE62B` · `#FF4646` · `#FFBB2B`

### 1.2 Text styles

28 text styles, some repeated under the same name with **different values**.
Line height is 120 % throughout, letter spacing 0 throughout.

| Style name | Family | Size | Weight | Line height | Occurrences |
|---|---|---|---|---|---|
| `Version 2/t1` | Inter | 61 px | 700 | 73.2 px | 32 |
| `Version 2/t2` | Inter | 47 px | 500 | 56.4 px | 15 |
| `Version 2/t4` | Open Sans | 28 px | 400 | 33.6 px | 1 |
| `Version 2/t5` | Inter | 27 px | 400 | 32.4 px | 13 |
| `Version 2/t5` | Open Sans | 23 px | 400 | 27.6 px | 6 |
| `Version 2/t6` | Inter | 20 px | 400 | 24 px | 604 |
| `Version 2/t6` | Inter | 21 px | 400 | 25.2 px | 6 |
| `Version 2/t6` | Open Sans | 19 px | 400 | 22.8 px | 32 |
| `Version 3/t6` | Open Sans | 21 px | 400 | 25.2 px | 1 |
| `Version 2/body` | Inter | 16 px | 400 | 19.2 px | 1776 |
| `Version 2/body` | Open Sans | 16 px | 400 | 19.2 px | 68 |
| `Version 2/t7` | Inter | 14 px | 400 | 16.8 px | 29 |
| `Version 2/t7` | Inter | 12 px | 400 | 14.4 px | 98 |
| `t7` | Poppins | 12 px | 400 | 14.4 px | 1 |
| `Version 2/label` | Inter | 13 px | 400 | 15.6 px | 5 |

The style names `t1`…`t7` are not sorted monotonically by size and are partly
assigned twice. As token names they are unusable — see section 6.

### 1.3 Fonts actually in use

Determined from **all text nodes**, not from the styles. This is the shopping
list for `assets/fonts/`.

| Family | Weights | Text nodes | Role |
|---|---|---|---|
| **Inter** | 400 (2614), 700 (472), 600 (54), 500 (18) | 3158 | main UI font |
| **Open Sans** | 400 (115), 700 (22), 600 (1) | 138 | newer screens (stakeholder, welcome), legal texts |
| **Poppins** | 400 (42), 700 (2) | 44 | exclusively the error message "This field is required" (12 px) and two canvas titles |
| **Mulish** | 700 (3), 500 (2) | 5 | exclusively the "Move to" label in the mobile move-task view |
| **Figtree** | 700, 800, 600, 500, 400 | 10 | only canvas annotations and the file thumbnail — **not UI** |
| **Patrick Hand** | 400 | 17 | only handwritten notes of the design team — **not UI** |

All six families are freely available on Google Fonts. There is no commercial font
in the file. Inter, Open Sans, Poppins and Mulish were downloaded to `assets/fonts/`
together with `assets/fonts/fonts.css` (subsets `latin` + `latin-ext`, see
`docs/design/MANIFEST.md` section 5). Poppins and Mulish remained unused in the
implementation and were removed from the repo again — reachable through the git history.

Font sizes occurring in the design (px):
`12, 13, 14, 16, 18, 19, 20, 21, 22, 23, 24, 27, 28, 32, 36, 40, 47, 54, 56, 61, 64` —
plus `99, 209, 300` exclusively in canvas annotations.

### 1.4 Layout grid

Exactly **one** grid is defined and sits on 39 frames:

```
pattern     COLUMNS
count       12
sectionSize 65 px
gutterSize  30 px
offset      0
alignment   CENTER
visible     false
color       #FF0000 @10 %  (helper color)
```

The same grid sits unchanged on 428 px, 1440 px and 3400 px frames.
Arithmetically it occupies 12 × 65 + 11 × 30 = **1110 px** — which fits none of the
three tiers, and it is hidden everywhere. **The grid is not a layout directive but
a leftover.** The frames it sits on have no recognizable relation to it. See section 6.

It does **not** sit on: any of the stakeholder, welcome and email-mask screens, any
of the mobile board frames except those listed below, and the entire design-system
page except the two widescreen artboards.

### 1.5 Effects (shadows)

12 effect styles, some identically named with different values. All `DROP_SHADOW`,
all black with opacity.

| Style name | x | y | Blur | Spread | Color | Occurrences | Where |
|---|---|---|---|---|---|---|---|
| `nuevo` | 0 | 0 | 4 | 0 | `#000000` @10 % | 160 + 9 | cards, fields |
| `nuevo` | 0 | 0 | 4 | 0 | `#000000` @16 % | 41 | stronger variant, **same name** |
| `shadoe backlog box` | 0 | 0 | 10 | 3 | `#000000` @8 % | 167 + 2 | board cards, overlay panels |
| `shadoe backlog box` | 0 | 0 | 14 | 3 | `#000000` @14 % | 11 | **same name, different value** |
| `shadoe backlog box` | 0 | 0 | 14 | 3 | `#000000` @4 % | 1 | **same name, third value** |
| `stronger` | 0 | 4 | 4 | 0 | `#000000` @25 % | 47 | button hover/click |
| `stronger` | 0 | 4 | 8 | 0 | `#000000` @20 % | 2 | **same name, different value** |
| `Barra superior` | 0 | 4 | 4 | 0 | `#000000` @10 % | 40 + 2 | header |
| `Drop Shadow` | 0 | 0 | 5 | 3 | `#000000` @4 % | 3 | isolated |

As CSS:

```css
--shadow-card:    0 0 4px  0   rgba(0, 0, 0, 0.10);  /* style "nuevo" */
--shadow-panel:   0 0 10px 3px rgba(0, 0, 0, 0.08);  /* style "shadoe backlog box" */
--shadow-button:  0 4px 4px 0  rgba(0, 0, 0, 0.25);  /* style "stronger" */
--shadow-header:  0 4px 4px 0  rgba(0, 0, 0, 0.10);  /* style "Barra superior" */
```

### 1.6 Radii

All `cornerRadius` values set on COMPONENT, FRAME and RECTANGLE nodes:

| Radius | Occurrences | Role |
|---|---|---|
| 3 px | 173 | checkbox |
| 4 px | 26 | creator badge, "Profil"/"E-mail" links |
| **5 px** | 95 | **only Figma's COMPONENT_SET frames — not a UI value** |
| 6 px | 2 | isolated |
| **8 px** | 604 | buttons, labels, notice surfaces, images on the stakeholder page |
| **10 px** | 836 | input fields, primary check button, nav entries |
| **16 px** | 137 | large panels |
| 20 px | 32 | speech bubbles (partly asymmetric, see below) |
| 21 px | 2 | isolated |
| **24 px** | 184 | board cards |
| **30 px** | 65 | login/welcome card |
| 37, 40, 42, 43, 46, 49, 50, 51 px | 1–5 each | single cases in icon helper surfaces |
| **45 px** | 693 | avatar circles (fully round at 32–56 px edge length) |
| 56, 58, 70, 72, 74, 77 px | 1–27 each | single cases |
| 559 px | 23 | large surfaces (fully round) |

Asymmetric radii only occur on speech bubbles:
`20/20/0/20`, `0/20/20/20`, `20/0/20/20`, `0/20/0/0` (3 nodes each).

> **A single project-wide radius token does not work here.** With 3, 4, 8, 10, 16, 24, 30
> and "fully round" there are at least eight deliberately different values plus roughly 15
> single cases. Recommendation: named tokens per part (`--radius-checkbox: 3px`,
> `--radius-button: 8px`, `--radius-field: 10px`, `--radius-card: 24px`,
> `--radius-panel: 30px`, `--radius-avatar: 50%`) instead of one variable.

---

## 2. Breakpoints and responsive behavior

### 2.1 What the file specifies

The file's only breakpoint statement is written verbatim in frame `353017:10351`
(page "Page Components design system", area "Desktop - Widescreen"):

> Um ein einheitliches Design auf groesseren Bildschirmen zu gewaehrleisten, bieten wir eine
> Breitbild-Layout-Loesung an. **Fuege bei der Umsetzung einen Breakpoint bei 1440px hinzu.**

*(To ensure a consistent design on larger screens, a widescreen layout solution is
provided. **Add a breakpoint at 1440px in the implementation.**)*

Plus the two implementation rules from the same notes (`353017:10360`, `353021:9422`):

> Fuer den Login-Screen alles innerhalb der gleichen Grenzen wie in der normalen Desktop-Version zentriert.

*(For the login screen, keep everything centered within the same bounds as in the normal desktop version.)*

> Fuer die App den Header und die Menueleiste skalieren, den Inhalt jedoch an derselben Stelle belassen.

*(For the app, scale the header and the menu bar, but keep the content in the same place.)*

### 2.2 Existing artboard widths

| Tier | Artboard width | Frame count | Evidence |
|---|---|---|---|
| Mobile | **428 px** | 28 screens (height 926 px) | `332:1228`, `350522:9621`, … |
| Desktop | **1440 px** | 26 screens (height 1024 px) | `45:1747`, `350504:9311`, … |
| Widescreen | **3400 px** | 3 screens (height 1440 px) | `353017:10317` Log in, `353017:10369` Summary user, `353017:10405` Contacts |
| — | 1920 px | 13 frames | **working canvases of the design-system page, not screens** |

Additionally, 41 smaller frames (overlays, toasts, menus) between 70 and 1302 px wide
that correspond to no viewport but are placed into a screen.

### 2.3 Uncovered viewport ranges

Explicitly recorded, because these are **implementation decisions, not design
directives**:

| Range | Status |
|---|---|
| < 428 px | **no artboard.** Smaller phones (e.g. 360 px, 390 px) are not designed. |
| 429 – 1439 px | **no artboard.** The entire tablet range (768 px, 834 px, 1024 px, 1280 px) is missing. |
| 1441 – 3399 px | **no artboard.** There is no intermediate step between desktop and widescreen. |
| > 3400 px | **no artboard.** |

Concretely: the note names exactly **one** breakpoint (1440 px). For the mobile →
desktop transition there is **no** statement. The usual approach (breakpoint at
768 px or 1024 px) is not covered by the file and must be marked as a decision.

### 2.4 App shell (desktop 1440 px)

From `45:2195` "Summary user", representative of all logged-in desktop screens:

| Element | Node | Value |
|---|---|---|
| Page background | `45:2195` | `#F6F7F8` |
| Sidebar `ContentLeft` | `45:2208` | width **232 px**, full height, fill `#2A3647`, auto-layout vertical, gap 103 px, padding 64 / 0 / 64 / 0, shadow `0 0 4px 0 rgba(0,0,0,0.10)` |
| Logo in the sidebar | `47:616` | 100 x 122 px, white |
| Nav block | `47:447` | width 232 px, auto-layout vertical, gap 15 px |
| Nav entry | `45:2489` | 232 x **46 px**, auto-layout horizontal, gap 8 px, padding 8 / 56 / 8 / 56, active fill `#091931`, radius 8 px |
| Content column `ContentRight` | `352965:6607` | width **1208 px** (= 1440 − 232), auto-layout vertical, gap 110 px |
| Header | `69360:4547` | 1208 x **96 px**, fill `#FFFFFF`, auto-layout horizontal, gap 34 px, padding 20 / 40 / 20 / 116, shadow `0 4px 4px 0 rgba(0,0,0,0.10)` |
| Content area | `352965:6606` | width 1025 px, auto-layout vertical, gap 56 px, offset x 327 px |

Header component in isolation (`567:3148`): 1440 x 96 px, padding 20 / 40 / 20 / **348**.
The 348 value only applies to the free-standing component; in its placed state it is
116 px (348 − 232 sidebar). The placed value is authoritative for the implementation.

### 2.5 Widescreen (3400 px)

`353017:10369` "Summary user": sidebar `353017:10370` stays at **232 px**,
`Content` `353017:10385` grows to **3168 px** (= 3400 − 232). This matches the note
"scale the header and the menu bar, but keep the content in the same place".

`353017:10317` "Log in": full 3400 px frame, the login card stays centered at
desktop dimensions. Matches the note about the login screen.

---

## 3. Frames per tier

Complete list of all top-level frames. The "Visible" column marks frames that are
hidden in Figma — these also render nothing (see section 6.7).

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

#### Widescreen (3400 px artboards) — 1 frame

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

## 4. Components

The **complete** listing of all 95 COMPONENT_SETs with every variant is in
[components.md](components.md) — generated from the cache, not maintained by hand.
Listed here are the parts needed first for the implementation.

Principle from the workflow: **the variant is authoritative, not the set.** The set
frame (e.g. "139 x 219") is Figma's container with 20 px padding and a purple helper
frame `#9747FF` at radius 5 px. Neither is UI.

### 4.1 Buttons

**Primary — `Button wo icon` (`301:1814`), desktop**

| Variant | Size | Padding | Radius | Fill | Shadow | Text |
|---|---|---|---|---|---|---|
| Default | 99 x 49 (hug) | 15 / 24 / 15 / 24 | 8 px | `#2A3647` | — | Inter 16 / 400, `#FFFFFF` |
| Hover | 99 x 49 | 15 / 24 / 15 / 24 | 8 px | `#177DA8` | `0 4px 4px 0 rgba(0,0,0,0.25)` | Inter 16 / 400, `#FFFFFF` |
| click | 99 x 49 | 15 / 24 / 15 / 24 | 8 px | `#091931` | `0 4px 4px 0 rgba(0,0,0,0.25)` | Inter 16 / 400, `#FFFFFF` |

**Secondary — `Button seconday wo icon` (`301:1829`), desktop**

| Variant | Size | Padding | Radius | Fill | Stroke | Shadow | Text |
|---|---|---|---|---|---|---|---|
| Default | 99 x 49 | 15 / 24 / 15 / 24 | 8 px | transparent | `#2A3647` 1 px | — | Inter 16 / 400, `#2A3647` |
| Hover | 99 x 49 | 15 / 24 / 15 / 24 | 8 px | transparent | `#177DA8` **2 px** | `0 4px 4px 0 rgba(0,0,0,0.25)` | Inter 16 / 400, `#177DA8` |
| click | 99 x 49 | 15 / 24 / 15 / 24 | 8 px | transparent | `#091931` 1 px | `0 4px 4px 0 rgba(0,0,0,0.25)` | Inter 16 / 400, `#091931` |

The stroke switches between 1 px and 2 px per state. Without a countermeasure
(`box-shadow: inset 0 0 0 Npx` or `outline`) this produces a 1 px layout shift per
side on hover in the browser.

**Mobile variants** (`371:2121` primary, `371:2128` secondary): 104 x **27 px**,
padding 4 / 18 / 4 / 18, radius 8 px, only the Default and Hover states. No `click`
state defined.

> A 27 px button height is well below the 44 px minimum for touch targets. See section 6.

**Primary check button** (`70:783`): 183 x 56 px, padding 16 all around, gap 4 px,
radius 10 px, fill default `#2A3647` / hover `#177DA8` / click `#091931`, text
Inter 21 / 700 in `#FFFFFF`, icon `check` 24 x 24 on the right. On the stakeholder
page with deviating padding 16 / 18 / 16 / 18 and fill `#177DA8` already in the
default state (`350504:9384`).

**Secondary with icon** (`70:784`): 126 x 56 px, padding 16 all around, gap 4 px,
radius 10 px, stroke default `#2A3647` 1 px / hover `#177DA8` 2 px / click `#091931`
1 px, text Inter 20 / 400, icon `iconoir:cancel` 24 x 24.

**Text button** (`70889:6497`): 109 x 35 px, padding 8 all around, gap 8 px, no
radius, no fill. Default Inter 16 / 400 in `#686868`; variant 2 identical but
**weight 700**. On dark backgrounds (welcome screen) the text color is `#FFFFFF`.

### 4.2 Input fields

**`Text field` (`75597:14102`), desktop** — 440 x 48 px, padding 12 / 16 / 12 / 16,
radius 10 px, fill `#FFFFFF`:

| Variant | Stroke | Text color |
|---|---|---|
| Default | `#D1D1D1` 1 px | placeholder Inter 20 / 400 |
| hover | `#686868` 1 px | placeholder |
| click | `#177DA8` 1 px | cursor |
| write | `#177DA8` 1 px | input |

**`Text field mobile` (`75880:8624`)** — 396 x 48 px, same padding and radius, text
Inter 16 / 400. Deviation: default already has `#686868` 1 px here instead of
`#D1D1D1`, and a `hover` state is missing.

**Error state:** the error message "This field is required" exists as a standalone
text node — **Poppins 12 px / 400**, while the rest of the UI uses Inter. A field
state "error" with a red border as a component variant is **not defined in Figma**;
the red values `#E60026` and `#FF8190` only occur on individual nodes.

**`Check button` (`70870:6309`)** — 24 x 24 px:

| Variant | Radius | Fill | Content |
|---|---|---|---|
| Default | 3 px | — | rectangle 16 x 16, stroke `#2A3647` 2 px |
| hover disable | **43 px** | `#EDF2FA` | rectangle 16 x 16, stroke `#2A3647` 2 px |
| checked | 3 px | — | check-mark group 16 x 16 |
| hover checked | **51 px** | `#EDF2FA` | check-mark group |

The radii 43 px and 51 px on a 24 px edge simply mean "fully round" — the hover
state is a round background behind the square checkbox.

### 4.3 Board cards and labels

**`Cards` (`75609:16188`)** — radius **24 px**, padding 16 all around, gap 10 px,
fill `#FFFFFF`, shadow `0 0 10px 3px rgba(0,0,0,0.08)`. Four variants with widths
220 / 235 / 239 px and heights 177 / 196 / 228 / 246 px — the card is hug-height,
the width comes from the column.

**`Labels Board card label` (`75609:16164`)** — padding 4 / 16 / 4 / 16, radius 8 px,
text Inter 16 / 400 in `#FFFFFF`:

| Variant | Size | Fill | Text |
|---|---|---|---|
| User story | 113 x 27 | `#7B3ACF` | "User Story" |
| Thecnicaal Task | 144 x 27 | `#12AD9A` | "Technical Task" |

The variant name contains a typo, the text does not. In the overlay version
(`75609:16289`) the label is 208 x 36 px with padding 4 / 24 / 4 / 24 and text
Inter 23 / 400.

**`Priority symbols` (`75609:16169`)** — 32 x 32 px each, padding 10 / 18 / 10 / 18:
Low (`#7AE229`), Urgent (`#FF3D00`), Medium (`#FFA800`). Exported to
`assets/icons/prio-low.svg`, `prio-urgent.svg`, `prio-medium.svg`.

**`Progress Subtasks` (`350510:9424`)** — 188 x 19 px, auto-layout horizontal,
gap 10 px, text Inter 16 / 400. Three variants: "0/2 Subtasks", "1/2 Subtasks",
"2/2 Subtasks".

### 4.4 Project-specific components (issue collector)

**`Creator` (`350510:12396`)** — the display of the ticket creator in the task
detail. Two variants:

| | member (`350510:12395`) | extern (`350510:12394`) |
|---|---|---|
| Size | 445 x 25, auto-layout horizontal, gap 16 px | 445 x 25, auto-layout horizontal, gap 24 px |
| Label | "Creator:" Inter 20 / 400, `#2A3647` | identical |
| Badge fill | `#92FFBC` (green) | `#EBFC88` (yellow-green) |
| Badge padding / radius | 0 / 4 / 0 / 4, radius 4 px | 0 / 4 / 0 / 4, radius 4 px |
| Badge text | "Member", Inter 16 / 400, `#0B3681` | "Extern", Inter 16 / 400, `#0B3681` |
| Badge icon | 18 x 14 (`350510:12310`) | 14 x 14 (`350510:12321`) |
| Name | "Anja Schulz", Open Sans 19 / 400, `#000000` | "Felix Henri Richter", Open Sans 19 / 400, `#000000` |
| Action on the right | `See profile` → "Profil" | `Send email` → "E-mail" |

This resolves the requirements item "distinguish whether the creator is internal or
external" in the design: **color + word + different follow-up action**.

**`See profile` (`350510:12346`)** and **`Send email` (`350510:12342`)** — 63 x 24
and 76 x 24 px, padding 0 / 3 / 0 / 3, gap 4 px, radius 4 px, text Inter 16 / 400 in
`#42526E`. States default (no fill) / hover (`#2A3647`) / on click (`#2A3647`).

> Hover and on click are defined identically. With the fill `#2A3647` the text color
> stays `#42526E` per the file — a contrast ratio of roughly **1.6 : 1**, unreadable.
> See section 6.

**"Ai-generated ticket" badge** (`350510:12641`, mobile `350526:9752`) — auto-layout
horizontal, gap 8 px, total size 177 x 22 px. Icon `wand_stars` 22 x 22 (vector
16 x 16) and text "Ai-generated ticket" Inter 16 / 400 — **both** with the gradient
`linear-gradient(#9327FF, #2EA1DC)`. In the task overlay the badge sits to the right
of the category label (desktop `350510:12659`: gap 8 px, label 208 x 36, badge
x-offset 216 px).

This satisfies the requirements item "note that the ticket was AI-generated" —
though as a **badge in the header area**, not as text in the description field.
See section 6.

### 4.5 Navigation and board columns

**Sidebar nav** (`47:14` "Menu") — 232 px wide, 5 entries of 232 x 46 px each,
gap 15 px, padding 8 / 56 / 8 / 56, radius 8 px, active entry fill `#091931`, text
Inter 16 / 400 `#FFFFFF`, icon 30 x 30. Entries: Summary · Add Task · Board ·
**Backlog** · Contacts.

> The "Backlog" entry is set to `visible: false` in **every** variant of the set and
> sits on the same y position as "Board" (both y = 142 and 421.98 respectively). It
> is a hidden alternative draft. In the widescreen version (`I353017:10384;45:2497`)
> it is visible, however. Its text color there is `#CDCDCD` — the same as in the
> hidden state. See section 6.

**Board columns** — desktop `45:1747`, mobile `332:1228`. Five columns in this
order:

| Column | Desktop | Mobile |
|---|---|---|
| **Triage** | Inter 20 / 700, `#42526E` | Inter 27 / 700, `#2A3647` |
| To do | Inter 20 / 700, `#42526E` | Inter 27 / 700, `#2A3647` |
| In progress | Inter 20 / 700, `#42526E` | Inter 27 / 700, `#2A3647` |
| Await feedback | Inter 20 / 700, `#42526E` | Inter 27 / 700, `#2A3647` |
| Done | Inter 20 / 700, `#42526E` | Inter 27 / 700, `#2A3647` |

Board distribution desktop (`75609:16029`): 1208 px wide, auto-layout horizontal,
gap **16 px**, padding 0 / 24 / 0 / 24. Mobile (`75918:14018`): 396 px, auto-layout
vertical, gap **24 px**.

The "Triage" column from the requirements is thus present in the design — as the
**first** column.

### 4.6 Note on the component count

The file header reports 137 `componentSets` and 419 `components`. The node tree
contains 95 COMPONENT_SETs and 3 free-standing COMPONENTs. The difference is
components from linked libraries that only appear as instances in this file, plus
entries from deleted frames. The node tree is authoritative for the implementation.

---

## 5. Notes from the source file

Quoted verbatim in their original language. An English translation is added in
italics where the original is German.

**`242516:6122` — "Hinweis" (page "Join Desktop and Mobile design", Figtree 99 px)**

> Hinweis: Für die Figma-Designs, die für die Praxisprojekte genutzt werden, ist in der Regel kein Bearbeitungszugriff erforderlich.
>
> Informationen zum Widescreen-Design findest du auf der “Page Components” Seite.

*(Note: edit access is generally not required for the Figma designs used for the
practice projects. Information on the widescreen design is on the "Page Components"
page.)*

**`353017:10351` — widescreen explainer (page "Page Components design system", Figtree 99 px)**

> Um ein einheitliches Design auf größeren Bildschirmen zu gewährleisten, bieten wir eine Breitbild-Layout-Lösung an. Füge bei der Umsetzung einen Breakpoint bei 1440px hinzu.
>
> Wenn dein Bildschirm eine höhere Auflösung unterstützt, kannst du diese aktivieren, indem du
> auf den Play-Button in der oberen rechten Ecke klickst
>
> und die „Responsive"-Ansicht auswählst.

*(To ensure a consistent design on larger screens, a widescreen layout solution is
provided. Add a breakpoint at 1440px in the implementation. If your screen supports
a higher resolution, you can activate it via the play button in the top right corner
and the "Responsive" view.)*

**`353017:10352`**

> Du kannst dir auch die Designs unten ansehen, um zu sehen, wie sich das Interface über breitere Bildschirmgrößen skalieren soll.

*(You can also look at the designs below to see how the interface should scale
across wider screen sizes.)*

**`353017:10360` — Note 4 (Patrick Hand 99 px)**

> Für den Login-Screen alles innerhalb der gleichen Grenzen
> wie in der normalen Desktop-Version zentriert.

*(For the login screen, keep everything centered within the same bounds as in the
normal desktop version.)*

**`353021:9422` — Note 5**

> Für die App den Header und die Menüleiste skalieren,
> den Inhalt jedoch an derselben Stelle belassen.

*(For the app, scale the header and the menu bar, but keep the content in the same
place.)*

**`353021:9427` — Note 6**

> Hier ein weiteres Beispiel

*(Another example here.)*

**`350537:9980` — Note 8 (Patrick Hand 24 px) — directly concerns the issue collector**

> This screen only appears after the daily limit has been reached!
> By default, show the previous frame: 'Stakeholder'.

**`667:3865` and `667:3874` — Note 1 (Patrick Hand 24 px)**

> this should not be connected. The reset password only opens with the link in the email. It is just conected for show it in the prototype.

**`71454:18539` — Note 2 (desktop)**

> Only able when the privacy policy is marked

**`75857:7602` — Note 3**

> only enabled when the form is filled

**`75857:7594` — Note 4**

> Use this card on the prototype reproduction to see the Drag and drop interaction. To see this card on the prototype first Add task.

**`75857:7590` — Note 5**

> Use these cards on the prototype reproduction to see “open” the task description overlay.

**`16566:3724` and `75857:7598` — Note 2 / Note 6 (mobile and desktop, identical text)**

> Sobald Text geschrieben wurde: Bitte nur Tasks anzeigen, die den Text im Titel oder in der Beschreibung haben.

*(Once text has been typed: only show tasks that contain the text in their title or
description.)*

**`294678:9853` — Note 7**

> Alternative to the drag & drop function for mobile version. Not prototyped frame. It just showing how this ist going to look.

**`74094:5228` — Nota 1 (page "Page Components design system")**

> For Favicon

*(Refers to the logo component `353:2207` next to it, 49 x 60 px.)*

**`74134:5387` ff. — help page (`71454:18330`), Inter 16 px, abridged**

> Join is a kanban-based project management tool designed and built by a group of dedicated students as part of their web development bootcamp at the Developer Akademie. […]

---

## 6. Open questions and conflicts

Nothing here is resolved within the spec. Each item needs a decision before it
lands in code.

### 6.1 Reconciliation with the requirements — present in the design

| Requirements item | Evidence in the design |
|---|---|
| "Triage" column on the board | present, **first** column, desktop `45:1747` and mobile `332:1228` |
| Landing page for stakeholders | `350504:9311` (desktop) / `350522:9621` (mobile) |
| Fork "feature request" vs. "team member" | `350504:9300` "Welcome" / `350522:9493` — buttons "Create request" and "Member log in" |
| Communicate the daily limit transparently | "0 of 10 requests used today" (`350504:9389/9390`) and body text "A total of 10 requests can be created per day…" |
| "Limit reached" state | `350504:9548` / `350522:9722`, notice surface `#FFD2D2` @52 %, counter in `#FF3D00` / `#DE3500` |
| "AI-generated" note on the ticket | "Ai-generated ticket" badge with `wand_stars` icon, `350510:12641` |
| Creator visible on the ticket | component `Creator` `350510:12396` |
| Internal / external distinction | variants `member` (`#92FFBC`) and `extern` (`#EBFC88`) |
| Priority urgent / medium / low | `Priority symbols` `75609:16169` |
| Deadline on the ticket | field `Due date v1` `94:448` |

### 6.2 Reconciliation with the requirements — NOT present in the design

These items are in the requirements but have **no** frame and no component in the
file. They are implementation decisions, not design directives.

| Missing | Requirements reference |
|---|---|
| **Confirmation email** to the sender after successful ticket creation | "Der Stakeholder bekommt eine Bestätigungsmail…" — no mail template in the design |
| **Error reply email** ("team has received the mail and will follow up") | "Sofern es einen Fehler bei der Verarbeitung gab…" — no template |
| **Limit reply email** on exceeding the limit | "…erhält der Absender eine automatische E-Mail Antwort…" — no template |
| **Notification email** on column change | "Sofern das Ticket in eine andere Spalte verschoben wird…" — no template |
| **Loading state** during AI processing | no skeleton, no spinner in the file |
| **Empty state** of the triage column | board frames always show filled columns |
| **Error state** of an input field as a component variant | only a loose text node "This field is required" |
| **Focus state** (keyboard focus) | the sets know `hover` and `click`, but no `focus` |
| **Success message** after ticket creation from the landing page | toast `585:4885` "Added to board" only exists for the internal flow |
| Creator visibility for **manually** created tickets | the creator component shows both cases, but no frame shows it in the add-task form |

The `Email mask` screen (`350504:9168` / `350522:9506`) is **not a feature** but a
mockup: a screenshot of an email client as a raster image with a "Back" button on
top. It only serves the prototype demonstration.

### 6.3 Present in the design, not mentioned in the requirements

| Element | Note |
|---|---|
| Nav entry **"Backlog"** (`45:2686`) | hidden in all menu variants, visible in the widescreen version. The requirements say "Triage", not "Backlog". **Contradiction: is the menu item called Backlog and the column Triage, or is "Backlog" the discarded earlier name of "Triage"?** |
| Frames "Floating add task Backlog v1" (`204:3903`), "Added to back log V1" (`204:4005`) | the same naming uncertainty |
| Complete contact management, summary, add-task, legal notice, privacy policy, help | parts of the existing Join project, only implicitly assumed by the requirements |
| "Guest Log in" / guest mode | not mentioned in the requirements |
| Widescreen tier at 3400 px | not mentioned in the requirements |

### 6.4 Contradictions within the file

| # | Contradiction | Candidates and origin |
|---|---|---|
| 1 | **Style name ≠ style value** | Style `Ligth blue` (`391580ab`) is used as stroke `#005DFF`, while two other styles of the same name are `#29ABE2`. Style `Version 2/main color` (`78b5e298`) is `#4589FF`, another of the same name is `#2A3647`. |
| 2 | **Same style name, several values** | `icon` = `#A8A8A8` **and** `#686868`. `Style` = `#686868`, `#D1D1D1` **and** a gradient. `nuevo` = shadow @10 % **and** @16 %. `shadoe backlog box` = three different shadows. `stronger` = two different ones. |
| 3 | **Text style names not monotonic** | `Version 2/t5` is Inter 27 px in one place, Open Sans 23 px in another. `Version 2/t6` is Inter 20, Inter 21 and Open Sans 19 px. `Version 2/t7` is 12 px **and** 14 px. |
| 4 | **Two font families for the same role** | Body text is partly Inter 16 / 400, partly Open Sans 16 / 400 — on the same screens (stakeholder mixes both). The older screens are Inter, the new ones Open Sans. **A decision is needed on which family applies.** |
| 5 | **Poppins only for error messages** | "This field is required" is the only place with Poppins (12 px). Either deliberate, or a leftover. |
| 6 | **Mulish only for one label** | "Move to" in the mobile move-task view. Five nodes total. |
| 7 | **Layout grid fits no frame** | 12 × 65 + 11 × 30 = 1110 px, yet sits identically on 428, 1440 and 3400 px frames and is invisible everywhere. |
| 8 | **Two desktop content widths** | `ContentRight` 1208 px (= 1440 − 232) vs. inner `Content` 1025 px with x-offset 327 px. The second value leaves 95 px on the left and 88 px on the right — not symmetric. |
| 9 | **Header padding assigned twice** | component `567:3148` has left padding 348 px, the instance in the screen 116 px. |
| 10 | **Board gap desktop vs. mobile** | 16 px against 24 px. |
| 11 | **Text field default stroke** | desktop `#D1D1D1`, mobile `#686868` — mobile also lacks the `hover` state. |
| 12 | **"Technical Task" label in two colors** | `#12AD9A` (component) and `#1FD7C1` (overlay version). |
| 13 | **Counter color "limit reached"** | desktop `#FF3D00`, mobile `#DE3500`. |
| 14 | **Hover = click** | for `See profile` and `Send email` both states are defined identically. |
| 15 | **Five equivalent `white` styles** | plus three `black` styles — pure duplicates. |

### 6.5 Collision design directive ↔ project rule

Both sides stated, nothing decided silently.

| # | Design says | Project rule says | Affected |
|---|---|---|---|
| 1 | Error message "This field is required" at **12 px** | Global rule: **every font size at least 16 px**. Requirements: at least 16 px, fine print not below 14 px | `I353017:10337;310:1292` et al., 98 nodes at 12 px |
| 2 | `Version 2/label` at **13 px**, `Version 2/t7` at **14 px** | the same rule | 5 and 29 nodes respectively |
| 3 | Mobile buttons **27 px high** (`371:2122`, `371:2129`) | touch target at least 44 px | all mobile secondary/primary buttons without icon |
| 4 | `See profile` / `Send email`: text `#42526E` on fill `#2A3647` on hover | contrast at least 4.5 : 1 | `350510:12344`, `350510:12340` — actually about 1.6 : 1 |
| 5 | Nav entry "Backlog" text `#CDCDCD` on `#2A3647` | contrast at least 4.5 : 1 | `45:2690` — about 4.4 : 1, just below |
| 6 | Secondary button switches stroke 1 px → 2 px on hover | no layout shifts | `301:1832`, `70:797` |
| 7 | No `focus` state in any set | keyboard operability | all interactive components |
| 8 | Board cards movable only via drag & drop; mobile a "Move to" menu (`294678:8877`, per note 7 **not** prototyped) | keyboard operability | board |

### 6.6 Not defined in Figma

- Breakpoint between mobile (428 px) and desktop (1440 px) — **not defined in Figma**
- Behavior below 428 px and between 1441 and 3399 px — **not defined in Figma**
- All email templates (confirmation, error, limit, status change) — **not defined in Figma**
- Loading and empty states — **not defined in Figma**
- Focus states — **not defined in Figma**
- Animations and transition durations — **not defined in Figma**
- Behavior of the "x of 10" counter between 1 and 9 (only 0 and 10 are designed) — **not defined in Figma**
- Where exactly the "AI-generated" note sits in the description text (the requirements
  demand it **in the description text**, the design shows a **badge in the header
  area**) — **conflict, not resolved**

### 6.7 Technical limitations during extraction

| Item | Finding |
|---|---|
| `/v1/files/<key>/styles` | **403** — `Invalid scope: ["file_content:read"]`. Not needed, the style map is in `file.json`. |
| 8 top-level frames render nothing | `10119:3717`, `10175:3745`, `656:3794`, `656:3836`, `656:3857`, `664:3733`, `664:3772`, `664:3851` — all are set to `visible: false` in Figma (the forgot-password flow and two confirmation toasts). Their data is fully in the cache, only the image export is impossible. |
| 4 icons render nothing | `45:2688` (Backlog icon), `45:2516` (uit:web-grid), `45:2525` (Write task icon), `10119:3730` (SendCheck) — they sit in hidden parent nodes. They were reconstructed from path geometry via `/v1/files/<key>/nodes?geometry=paths` and exist as full SVGs in `assets/icons/`. |
| Rate limit | `/v1/images` returns HTTP 429 for large frames (1920 × 6140 px, 3533 × 9441 px). The reference screenshots were re-fetched with exponential backoff. |

---

## 7. Provenance and reproducibility

| Artifact | Produced by | Source |
|---|---|---|
| `.figma-cache/file.json` | `GET /v1/files/6OT2cRhEtUALqFQy0ukNlT` | Figma REST API |
| `.figma-cache/image-fills.json` | `GET /v1/files/<key>/images` | Figma REST API |
| `.figma-cache/geometry-nodes.json` | `GET /v1/files/<key>/nodes?geometry=paths` | Figma REST API |
| `assets/icons/*.svg`, `assets/logos/*.svg` | `GET /v1/images?format=svg` | Figma REST API |
| `assets/icons/material/*.svg` | `raw.githubusercontent.com/google/material-design-icons` | Google, Apache 2.0 |
| `assets/images/*` | original URLs from `image-fills.json` | Figma S3, unscaled |
| `assets/fonts/*` | `fonts.googleapis.com/css2` + `fonts.gstatic.com` | Google Fonts, OFL 1.1 |
| `docs/design/components.md` | analysis script against the cache | — |
| `docs/design/reference/*.png` | `GET /v1/images?format=png&scale=1` | Figma REST API |
| `docs/design/verification/*.png` | Playwright captures of the implemented landing page | local dev server |
| `docs/design/MANIFEST.md` | analysis script against the cache | — |

All analysis scripts worked exclusively against `.figma-cache/` and were removed
from the repo after the extraction was completed. No new API call is needed for
follow-up questions. The same applies to the reference screenshots under
`docs/design/reference/` — removed from the repo and reachable through the git
history.

The comparison screenshots under `docs/design/verification/` showed the implemented
landing page as of 2026-08-24 against the Figma frames. The comparison is complete,
the images have long ceased to reflect the code — they are removed from the repo and
reachable through the git history.
