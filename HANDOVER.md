# HANDOVER – Aero-Design v2

Stand wird nach jedem Commit überschrieben (kein Tagebuch).

## Ziel
Design v2 aus `C:\Users\Katrin\Documents\DHBW\5. Semester\eichberg\design-vorlage-v2\design-vorlage-v2`
(nur lesen) auf alle Seiten und Zustände des Frontends bringen: Light Standard, Dark per Topbar-Schalter,
sauberes Komponenten-Set. Logik, API, Routing, State bleiben. Plan:
`C:\Users\Katrin\.claude\plans\aufgabe-setz-das-wiggly-lobster.md`.

## Erledigt
- Start: `make harness-sync`/`harness-check` grün, Baseline grün (vue-tsc, 85 Dateien / 945 Tests) – Commit 1d1fa30.
- Etappe a: Tokens v2 (Light/Dark), Typo-/Maß-/Layout-Tokens, Tailwind mappt nur Variablen, Logos → `based-*.png`,
  `tests/unit/design/tokens.spec.ts` – Commit siehe `git log` (Message „Move the design tokens to the v2 values…“).

## Offen (Reihenfolge)
b Basis-Komponenten · c Layout-Shell · d Login + Dashboard · e Apps + App-Detail + Markdown-Fix ·
f übrige Seiten · g Aufräumen · Abschluss (ADR-Commit im deployment-Repo)

## Nächster Schritt
Etappe b: Basis-Komponenten in `src/components/ui/` (BaseButton erweitern: `icon`, `disabledReason`; Card, PageHeader,
StatusBadge/Badge, EmptyState, AlertBox, ToggleSwitch, SegmentedControl, MeterBar, DataTable, ActionMenu, FormField/BaseSelect,
PageToc, InfoList, StatStrip, Breadcrumb) jeweils mit Spec. Klassen in `src/styles/components.css` nur mit Tokens.

## Entscheidungen
- Repo hat schon Aero v1 (tokens.css, components.css, useTheme, ThemeToggle, Anti-Flash) → Weiterentwicklung, kein Neubau.
- Tokens nur in `src/styles/tokens.css`; Tailwind 3.4 mappt via CSS-Variablen; kein neuer Styling-Ansatz.
- Theme: `localStorage['theme']` (try/catch), Default Light, Anti-Flash-Skript in `index.html`.
- Anrede bleibt „Sie“ überall (Prompt-Ausnahme „du“ entfällt, bestätigt).
- Profil-Seiten (`/user`, `/user/openstack`) in die App-Shell (Route-Meta `layout: 'app'`), `UserLayout` wird gelöscht.
- ADR am Ende als eigener Commit im `deployment`-Repo, ohne Push.
- Breadcrumb: `services/breadcrumb.service.ts` + `useBreadcrumbs`, keine Router-Änderung.
- Logos im Repo sind byte-identisch zur Vorlage → umbenannt (`based-logo-light/-dark.png`, `based-icon.png`).
- Tailwind-Schriftskala ersetzt die Standardstufen: xs12 sm13 base14 md15 lg17 xl18 2xl20 3xl22 4xl26 5xl28 6xl30 (Tokens `--text-*`).
  Layout-Utilities: `max-w-page/detail/narrow/reading`, `w-sidebar`, `h-topbar`, `px-page-x`, `gap-section`, `p-panel`.
- Text-Tokens: `text-heading`, `text-fg`, `text-fg-body`, `text-fg-muted`, `text-fg-subtle`, `text-nav`, `text-disabled`.
- `fg-subtle` ist bewusst dunkler als das Vorlagen-Grau (#5C6874 statt #6A7682), sonst < 4,5:1 auf Glas.
- Vitest blankt CSS-Imports (auch `?raw`) → Token-Test liest per `fs`.
- Kein Push, kein PR.

## Bekannte Probleme / offene Fragen
- `--logo-plate-*`, `--mesh-bg`, `--surface-banner/sunken`, `--meter-high-bg` sind noch vorhanden (noch benutzt), fallen in d/g weg.

## Checks nach jeder Etappe
```
cd deployment && make harness-check
docker exec frontend-dev sh -lc 'cd /app && npx vue-tsc -b'
docker exec frontend-dev sh -lc 'cd /app && npx vitest --run --coverage'
docker exec frontend-dev sh -lc 'cd /app && npx eslint .'
rg -n '#[0-9a-fA-F]{3,8}\b' src --glob '!src/styles/tokens.css'
```
Neue Dateien → `docker restart frontend-dev`. Budget nach jedem Commit prüfen (≤ 7 % ≈ 1,05 Mio. → stoppen).
