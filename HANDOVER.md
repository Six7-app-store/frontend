# HANDOVER – Aero-Design v2

Stand wird nach jedem Commit überschrieben (kein Tagebuch). Branch: `feat/more_rebranding`, nichts gepusht.

## Ziel
Design v2 aus `C:\Users\Katrin\Documents\DHBW\5. Semester\eichberg\design-vorlage-v2\design-vorlage-v2`
(nur lesen) auf alle Seiten und Zustände des Frontends bringen: Light Standard, Dark per Topbar-Schalter,
sauberes Komponenten-Set. Logik, API, Routing, State bleiben. Plan (freigegeben, enthält Seitenliste, Inventar,
Risiken): `C:\Users\Katrin\.claude\plans\aufgabe-setz-das-wiggly-lobster.md`.
Regeln aus `CLAUDE.md` (Arbeitsordner) und `frontend/AGENTS.md` gelten: alles im Container, nie `.env`/`.pem`/`.key`,
kein Push, `.claude/` nicht anfassen.

## Erledigt (Commits, `git log --oneline`)
- Start: Harness grün, Baseline 85 Dateien / 945 Tests – 1d1fa30 (HANDOVER.md).
- a) Tokens v2, Typo-/Maß-/Layout-Tokens, Tailwind-Mapping, Logos → `based-*.png`, `tests/unit/design/tokens.spec.ts` – 479c90d.
- b) Basis-Komponenten + Specs – 77fdebd.
- c) Layout-Shell – Commit „Replace the layout with sidebar, topbar and breadcrumb“ (`git log -1`): `components/layout/`
  (AppSidebar, SidebarNavItem, SidebarGroup, AppTopbar, UserMenu, LocaleSwitch), `AppLayout` schlank,
  `services/breadcrumb.service.ts`, `composables/useBreadcrumbs.ts` (`useBreadcrumbEntity` in AppsDetail-, CourseDetail-,
  DeploymentDetailView gesetzt), `useLocale`, `ActionMenu` mit `trigger`-Slot, Profil-Routen `layout:'app'`,
  `UserLayout`/`BackLink`/`useMeshBg`/`--logo-plate-*`/`--mesh-bg` gelöscht, `.nav-item`-CSS. Stand: vue-tsc grün,
  106 Dateien / 1061 Tests grün, Coverage 91,8/86,8/74,7/91,8, eslint leer, keine Hex-Treffer, `make harness-check` grün.
  **Offen in c:** visuelle Prüfung im Browser (Light + Dark, eingeklappt) wurde noch nicht gemacht.

## Offen (Reihenfolge)
d Login + Dashboard · e Apps + App-Detail + Markdown-Fix · f übrige Seiten · g Aufräumen · Abschluss
(alle Harness-Checks, HANDOVER = Endstand, ADR-Commit im `deployment`-Repo, Schlussbericht laut Plan)

## Nächster Schritt (als Erstes)
1. `docker restart frontend-dev`, dann Browser (chrome-devtools MCP) auf `http://localhost:5173`: Shell in Light und Dark
   sichten (Sidebar 216px, Breadcrumb, eingeklappt, Benutzermenü, Theme-/DE-EN-Schalter). Login: `<vorname>.<nachname>@dhbw.de`,
   Passwort `1234` (Seed). Auffälligkeiten beheben.
2. Dann Etappe d: `AuthLayout` → Split-Layout (Hero links mit Logo, „Click'n Deploy“, „DHBW Mannheim“, dekorative Fläche; Glas-Panel
   rechts; DE/EN + `ThemeToggle` auch hier; `--login-hero-bg`, `--login-panel-*` Tokens existieren), `LoginView` „Anmelden“ +
   Button „Mit DHBW anmelden“ (`BaseButton size="lg"`), LTI/Callback über `StatusPage/StatusScreen` im neuen Stil (Doppel-
   Verschachtelung `min-h-screen` in der Karte bereinigen). Danach `DashboardView`: Begrüßungszeile (`PageHeader size="greeting"`,
   Hauptaktion „Neues Deployment“ oben rechts), `StatStrip`, Ressourcen-`DataTable` mit `MeterBar`, Zustand ohne Credentials
   (`AlertBox` + „Jetzt einrichten“ als einzige rote Aktion, „Neues Deployment“ disabled mit `disabledReason`, Ressourcen nur Hinweistext),
   Skeleton/Fehlerzustand; `CredentialMissingBanner` auf `AlertBox` aufbauen; scoped Styles und Hero-Banner in `DashboardView` entfernen;
   `surface-banner`, `meter-fill-high` (+ Token) entfernen, sobald ungenutzt.

## Entscheidungen
- Repo hatte schon Aero v1 (tokens.css, components.css, useTheme, ThemeToggle, Anti-Flash) → Weiterentwicklung, kein Neubau.
- Tokens nur in `src/styles/tokens.css`; Tailwind 3.4 mappt via CSS-Variablen; kein neuer Styling-Ansatz; `tokens.spec.ts` prüft
  gleiche Token-Namen, Kontrast ≥ 4,5:1, keine Farbliterale außerhalb.
- Theme: `localStorage['theme']` (try/catch), Default Light, Anti-Flash in `index.html`. `ThemeToggle`-Label nennt das Ziel-Theme
  (`theme.toDark`/`theme.toLight`), kein `aria-pressed`. `useTheme` ist ein Modul-Singleton (Tests müssen den Zustand zurücksetzen).
- Anrede bleibt „Sie“ überall (Prompt-Ausnahme „du“ entfällt, vom Nutzer bestätigt).
- Profil-Seiten in der App-Shell; ADR am Ende als eigener Commit im `deployment`-Repo, ohne Push.
- Breadcrumb ohne Router-Änderung (`breadcrumb.service.ts`); `meta.titleKey` bleibt für den aktiven Nav-Eintrag.
- „Zurück zu…“-Links entfernt (Breadcrumb ersetzt sie); ihre Tests entfernt. i18n-Keys `AppsDetailView.backToOverview`,
  `CourseDetailView.back` sind jetzt ungenutzt → in g löschen (`DeploymentDetailView.backToList` wird im Fehlerzustand noch benutzt).
- Schriftskala ersetzt Tailwind-Standard: xs12 sm13 base14 md15 lg17 xl18 2xl20 3xl22 4xl26 5xl28 6xl30.
  Utilities: `max-w-page/detail/narrow/reading`, `w-sidebar`, `h-topbar`, `px-page-x`, `gap-section`, `p-panel`, `h-control/-sm/-lg/-icon`.
  Text: `text-heading`, `text-fg`, `text-fg-body`, `text-fg-muted`, `text-fg-subtle`, `text-nav`, `text-disabled`.
- Komponenten-API: `BaseButton` (`variant` primary|secondary|danger|ghost, `size` sm|md|lg, `icon`+`label`, `disabledReason`),
  `Card` (`title`, `flush`, Slots `header`/`actions`), `PageHeader` (`size` page|detail|greeting, Slots `actions`/`meta`),
  `StatusBadge` (`tone`,`size`,`icon`) + Wrapper `deployment/DeploymentStatusBadge`, `app/AppVersionStatusBadge`, `Badge` (`tone`),
  `EmptyState`, `AlertBox`, `SegmentedControl`, `MeterBar`, `DataTable` (`columns`, `rowKey`, `rowTo`, `caption`, Slots `cell-<id>`/`empty`),
  `ActionMenu` (`items`, `label`, Slot `trigger`), `FormField`, `BaseSelect`, `PageToc`, `InfoList`, `StatStrip`, `Breadcrumb`.
  Types: `types/tone.ts`, `ui/{breadcrumb,menu,segment,badge-tones}.ts`.
- Sicherheits-Hook: Bash-Kommandos mit einem Token, das auf die Schlüssel-Dateiendung (k-e-y hinter einem Punkt) endet, werden
  blockiert, auch bei Eigenschaftszugriffen → solche Änderungen mit Edit/Write statt Bash/Python-Heredoc. Mehrere Heredocs in einem
  Bash-Aufruf brechen in dieser Shell → Dateien mit Write anlegen.
- Snapshots nur nach Diff-Prüfung aktualisieren (bisher ausschließlich Klassen/Struktur/Meta-Änderungen).

## Bekannte Probleme / offene Fragen
- Noch vorhanden, fallen in d–g weg: `ScopeBadge`, `DetailSection` (Icon-Kachel), `surface-banner`/`surface-sunken`, `bg-panel`-Hüllen
  (`bg-panel rounded-2xl p-10`) statt `Card`, `meter-fill-high`/`--meter-high-bg`, `btn-ghost`-Altaufrufe, scoped Styles in
  `DashboardView`/`Toast`/`Modal`/`DeploymentProgressBar`, `VariableInput.vue:92` (harte `gray`/`white`-Klassen), ungenutztes Asset
  `src/assets/onlySix7-green-withoutBackground.png`.
- Nicht migrierte Aufrufer übergeben `px-4 py-2` o. ä. an `BaseButton` (überschreibt das `.btn`-Padding) → beim Seitenumbau entfernen.
- Seiten haben teils eigene Außenabstände/`max-w`; Shell-Main hat jetzt `px-page-x py-page-y` → doppelte Abstände beim Umbau entfernen.
  Profil-Seiten (`UserView`, `SettingsOpenStackView`) verlieren die `max-w-3xl`-Zentrierung des alten `UserLayout` → in f mit `max-w-detail` lösen.
- Hartcodierte Texte: `DeploymentRedeployModal.vue` (DE), `DeploymentTeamsCard.vue:56` (EN), `ScopeBadge` („Pro Team“) → i18n (f).
- Fehlende Bestätigungsdialoge (neu, f/e): Wizard „Zurücksetzen“, Version zurückziehen, Logo entfernen.

## Checks nach jeder Etappe (nur bei grün committen)
```
cd deployment && make harness-check
docker exec frontend-dev sh -lc 'cd /app && npx vue-tsc -b'
docker exec frontend-dev sh -lc 'cd /app && npx vitest --run --coverage'   # Schwellen 89/84/71/89 nicht senken
docker exec frontend-dev sh -lc 'cd /app && npx eslint .'
rg -n '#[0-9a-fA-F]{3,8}\b' src --glob '!src/styles/tokens.css'            # muss leer sein
```
Neue Dateien → `docker restart frontend-dev`. Commit-Stil: englischer Imperativ, Trailer
`Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. HANDOVER.md mit jedem Commit aktualisieren und mitcommitten.
Budget nach jedem Commit prüfen (≤ 7 % übrig → sofort stoppen und übergeben).
