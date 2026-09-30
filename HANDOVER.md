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
  `tests/unit/design/tokens.spec.ts` – Commit 479c90d.
- Etappe b: Basis-Komponenten + Specs (102 Dateien / 1032 Tests grün, Coverage 91,5/86,3/74,1/91,5) – Commit f0c0188
  (Hash nach `--amend` ggf. anders: `git log -1` zeigt „Add the v2 base components and their specs“).

## Offen (Reihenfolge)
c Layout-Shell · d Login + Dashboard · e Apps + App-Detail + Markdown-Fix · f übrige Seiten · g Aufräumen ·
Abschluss (ADR-Commit im deployment-Repo)

## Nächster Schritt
Etappe c: Layout-Shell. `src/layouts/AppLayout.vue` (401 Z.) in `src/components/layout/` zerlegen: `AppSidebar` (216px, Logo
`based-logo-*`, Nav-Items, Gruppe „Verwaltung“ → Freigaben, Hilfe unten), `SidebarNavItem`, `SidebarGroup`, `AppTopbar`
(Einklapp-Button + `Breadcrumb` links; rechts `LocaleSwitch` (SegmentedControl) + `ThemeToggle` + `UserMenu`), `useLocale`,
`services/breadcrumb.service.ts` + `useBreadcrumbs` (dynamisches Label via Modul-Ref, Detail-Views setzen es), Profil-Routen
`layout:'user'` → `'app'`, `UserLayout.vue` + `BackLink` löschen, mittigen Seitentitel (`.header-title`; `meta.titleKey`
bleibt für den aktiven Nav-Eintrag) entfernen, i18n `nav.admin` „Verwaltung“/„Administration“. Snapshot
`tests/unit/layouts/__snapshots__/AppLayout.spec.ts.snap` nach Diff-Prüfung aktualisieren. Danach Doppel-Titel (PageHeader)
in den Views beachten (Etappen d–f).

## Entscheidungen
- Repo hat schon Aero v1 (tokens.css, components.css, useTheme, ThemeToggle, Anti-Flash) → Weiterentwicklung, kein Neubau.
- Tokens nur in `src/styles/tokens.css`; Tailwind 3.4 mappt via CSS-Variablen; kein neuer Styling-Ansatz.
- Theme: `localStorage['theme']` (try/catch), Default Light, Anti-Flash-Skript in `index.html`. `ThemeToggle`-Label nennt das
  Ziel-Theme (`theme.toDark`/`theme.toLight`), kein `aria-pressed`.
- Anrede bleibt „Sie“ überall (Prompt-Ausnahme „du“ entfällt, bestätigt).
- Profil-Seiten (`/user`, `/user/openstack`) in die App-Shell (Route-Meta `layout: 'app'`), `UserLayout` wird gelöscht.
- ADR am Ende als eigener Commit im `deployment`-Repo, ohne Push.
- Breadcrumb: `services/breadcrumb.service.ts` + `useBreadcrumbs`, keine Router-Änderung.
- Logos im Repo waren byte-identisch zur Vorlage → umbenannt (`based-logo-light/-dark.png`, `based-icon.png`).
- Tailwind-Schriftskala ersetzt die Standardstufen: xs12 sm13 base14 md15 lg17 xl18 2xl20 3xl22 4xl26 5xl28 6xl30 (Tokens `--text-*`).
  Layout-Utilities: `max-w-page/detail/narrow/reading`, `w-sidebar`, `h-topbar`, `px-page-x`, `gap-section`, `p-panel`,
  `h-control/-sm/-lg/-icon`.
- Text-Tokens: `text-heading`, `text-fg`, `text-fg-body`, `text-fg-muted`, `text-fg-subtle`, `text-nav`, `text-disabled`.
- `fg-subtle` ist bewusst dunkler als das Vorlagen-Grau (#5C6874 statt #6A7682), sonst < 4,5:1 auf Glas.
- Vitest blankt CSS-Imports (auch `?raw`) → Token-Test liest per `fs`.
- Komponenten-API (b): `BaseButton` (`variant` primary|secondary|danger|ghost, `size` sm|md|lg, `icon` + `label`, `disabledReason`),
  `Card` (`title`, `flush`, Slots `header`/`actions`), `PageHeader` (`size` page|detail|greeting, Slots `actions`/`meta`, kein Icon),
  `StatusBadge` (`tone`, `size`, `icon`; Punkt + Text) mit Domänen-Wrappern `deployment/DeploymentStatusBadge` und
  `app/AppVersionStatusBadge`; `Badge` (`tone` neutral|info|emphasis|success|warning|danger, Klassen in `badge-tones.ts`),
  `EmptyState`, `AlertBox`, `SegmentedControl` (+ `segment.ts`), `MeterBar` (+ `services/meter.service.ts`), `DataTable`
  (`columns` mit `id`, `class`, `hideLabel`, `interactive`; `rowTo` macht die erste Zelle zum Zeilenlink; Slots `cell-<id>`,
  `empty`), `ActionMenu` (+ `menu.ts`, Teleport, Tastatur), `FormField` (Slot-Props `id`, `describedBy`, `invalid`),
  `BaseSelect`, `PageToc`, `InfoList`, `StatStrip`, `Breadcrumb`. CSS-Klassen dazu in `src/styles/components.css`.
- `StatusTone`/`BadgeTone` in `src/types/tone.ts`; `getStatusStyles` liefert `tone` statt `badgeClass`.
- Der Sicherheits-Hook blockt Bash-Kommandos, in denen ein Token auf die Schlüssel-Dateiendung (k-e-y hinter einem Punkt) endet,
  auch bei Eigenschaftszugriffen im Code → solche Änderungen mit Edit/Write statt Bash/Python-Heredoc.
- Kein Push, kein PR.

## Bekannte Probleme / offene Fragen
- `--logo-plate-*`, `--mesh-bg`, `--surface-banner/sunken`, `--meter-high-bg`, `ScopeBadge`, `BackLink`, `UserLayout`,
  `DetailSection` sind noch vorhanden (noch benutzt), fallen in c–g weg.
- Noch nicht migrierte Aufrufer übergeben `px-4 py-2` & Co. an `BaseButton` (überschreibt das `.btn`-Padding); beim
  Seitenumbau entfernen.
- Seiten nutzen teils noch `bg-panel rounded-2xl p-10`-Hüllen statt `Card`; werden in d–f ersetzt.

## Checks nach jeder Etappe
```
cd deployment && make harness-check
docker exec frontend-dev sh -lc 'cd /app && npx vue-tsc -b'
docker exec frontend-dev sh -lc 'cd /app && npx vitest --run --coverage'
docker exec frontend-dev sh -lc 'cd /app && npx eslint .'
rg -n '#[0-9a-fA-F]{3,8}\b' src --glob '!src/styles/tokens.css'
```
Neue Dateien → `docker restart frontend-dev`. Budget nach jedem Commit prüfen (≤ 7 % ≈ 1,05 Mio. → stoppen).
