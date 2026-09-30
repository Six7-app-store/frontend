# HANDOVER – Aero-Design v2

Stand wird nach jedem Commit überschrieben (kein Tagebuch). Branch: `feat/more_rebranding`, nichts gepusht.

## Ziel
Design v2 aus der Vorlage (nur lesen) auf alle Seiten und Zustände des Frontends bringen: Light Standard, Dark per
Topbar-Schalter, sauberes Komponenten-Set. Logik, API, Routing, State bleiben.
- Vorlage: `app-store/design-vorlage-v2/` (`light/V2L*.dc.html`, `dark/V2*.dc.html`, `logos/`); bei Katrin
  `…\eichberg\design-vorlage-v2\design-vorlage-v2`. Die Dateien rendern ohne `support.js` direkt im Browser.
- Plan (freigegeben, enthält Seitenliste, Inventar, Risiken): `app-store/aero-v2-plan.md`; bei Katrin
  `C:\Users\Katrin\.claude\plans\aufgabe-setz-das-wiggly-lobster.md`.

Regeln aus `CLAUDE.md` (Arbeitsordner) und `frontend/AGENTS.md` gelten: alles im Container, nie `.env`/`.pem`/Schlüsseldateien,
kein Push, `.claude/` nicht anfassen.

## Erledigt (Commits, `git log --oneline`)
- Start: Harness grün, Baseline 85 Dateien / 945 Tests – 1d1fa30 (HANDOVER.md).
- a) Tokens v2, Typo-/Maß-/Layout-Tokens, Tailwind-Mapping, Logos → `based-*.png`, `tests/unit/design/tokens.spec.ts` – 479c90d.
- b) Basis-Komponenten + Specs – 77fdebd.
- c) Layout-Shell (`components/layout/`, `breadcrumb.service.ts`, `useBreadcrumbs`, `useLocale`, Profil-Routen in der Shell) – 199dc8e.
- d) Commit „Rebuild the login, status pages and dashboard in the v2 design“ (`git log -1`):
  - Sichtprüfung der Shell (Light/Dark, eingeklappt, Benutzermenü) gegen die Vorlage und angeglichen: Logo-Zeile mit Linie, Nav ab 16px,
    Topbar-Knöpfe transparent (`btn-ghost btn-icon`), Trenner vor dem Benutzermenü, Icon `PanelLeft`. `.glass-control` entfernt.
  - `AuthLayout` als Split: Hero (Logo, „Click'n Deploy“, „DHBW Mannheim“, Glanzstreifen, `aria-hidden`) + Glas-Panel 520px mit
    DE/EN und Theme unten; unter `lg` nur Panel mit kleinem Logo. Tokens `--login-hero-sheen`, `--login-panel-w`, `--login-panel-pad-x`.
  - `LoginView` („Anmelden“, `BaseButton size="lg"`), `StatusPage`/`StatusScreen` ohne `min-h-screen`, linksbündig, Titel als `h1`.
    `LtiCourseMapView`: übersprungene Mitglieder als `AlertBox`, „Später“ als Ghost-Button.
  - `DashboardView` neu: `PageHeader size="greeting"` („Guten Abend, Name“), „Neues Deployment“ oben rechts (ohne Credentials
    deaktiviert mit `disabledReason`), `CredentialMissingBanner` (baut jetzt auf `AlertBox`, `lock` = Ton `info` + Schloss-Icon),
    `StatStrip` (Zahl vor Label wie Vorlage), Ressourcen als `Card` + `DataTable dense` + `MeterBar` mit Legende, Skeleton,
    Hinweis ohne Credentials, Fehlerzustand. Scoped CSS und Hero-Banner weg.
  - Rot bei Auslastung entfernt: `useQuotas` ohne `getColorClass`/`getTextColorClass`/`isQuotaCritical` (+ deren Tests),
    `.meter-fill-high`, `--meter-high-bg`, `.surface-banner`, `--surface-banner-bg` gelöscht.
  - `DataTable` wie Vorlage: Kopf 12px normal, ohne Kopflinie, Zeilen mit Linie oben, 56px (`dense` 48px).
  - **Bugfix:** Klassen aus `@layer components`, die per Template-String gebaut wurden (`alert-${tone}`, `meter-fill-${level}`,
    `status-dot-${tone}`), hat Tailwind nie erzeugt → AlertBox ohne Farbe. Jetzt feste Maps in `AlertBox`, `MeterBar`, `StatusBadge`.
    Regel: Klassennamen immer wörtlich in den Code schreiben.
  - Neue Specs: `layouts/AuthLayout`, `components/CredentialMissingBanner`, AlertBox-Icon, DataTable-`dense`; Dashboard-Spec
    auf das neue Verhalten umgestellt (Begrüßung im `h1`, Balken grün/gelb statt Rot, Hauptaktion gesperrt mit Grund).
  - Stand: vue-tsc grün, 108 Dateien / 1057 Tests grün, Coverage 91,9/86,8/74,7/91,9, eslint leer, keine Hex-Treffer.

## Offen (Reihenfolge)
e Apps + App-Detail + Markdown-Fix · f übrige Seiten · g Aufräumen · Abschluss
(alle Harness-Checks, HANDOVER = Endstand, ADR-Commit im `deployment`-Repo, Schlussbericht laut Plan)

## Nächster Schritt (als Erstes)
Etappe e: `AppsView` (Karten ohne Icon, ganze Karte klickbar, Status Punkt+Text, Link „Details & Deployment“, Filter als
`SegmentedControl`), `AddAppsView` (FormField, Markdown-Editor, Live-Vorschau), `AppsDetailView` mit Tabs Übersicht (Kopf mit
Versionsanzahl + Repo-Link/Kopieren, Beschreibung links, rechts sticky „Deployment starten“ + `PageToc` + `InfoList`) und App Store
(Sichtbarkeit, Versions-`DataTable`, „Zurückziehen“ mit Bestätigung, Löschen im „…“-Menü). Markdown-Fix laut Plan
(`breaks: false`, Inline-Code-Chip ohne Backticks in der typography-Konfiguration, kleinere Überschriften) +
`tests/unit/components/MarkdownRenderer.spec.ts`. Vorlagen: `V2LApps`, `V2LAppDetail`, `V2LAppStore` (+ Dark).

## Sichtprüfung (so geht's ohne Browser-MCP)
Headless Chrome per `puppeteer-core` (im Scratchpad installiert, nicht im Repo). Login per Keycloak-Formular
(`tobias.admin` = Admin, `michael.eichberg` = Lehrender, `luca.baeck` = Student, Passwort `1234`). Theme: `localStorage.theme`
setzen und neu laden. Zustände ohne Seed-Daten (z. B. Quotas): API-Antworten per Request-Interception fälschen, dabei
CORS-Header mitschicken (Backend läuft auf `localhost:8000`). Vorlagen lassen sich als `file://` genauso screenshotten.
Nach Änderungen an `tailwind.config.js`: `docker restart frontend-dev`, sonst fehlen neue Utilities.

## Entscheidungen
- Repo hatte schon Aero v1 (tokens.css, components.css, useTheme, ThemeToggle, Anti-Flash) → Weiterentwicklung, kein Neubau.
- Tokens nur in `src/styles/tokens.css`; Tailwind 3.4 mappt via CSS-Variablen; kein neuer Styling-Ansatz; `tokens.spec.ts` prüft
  gleiche Token-Namen, Kontrast ≥ 4,5:1, keine Farbliterale außerhalb.
- Theme: `localStorage['theme']` (try/catch), Default Light, Anti-Flash in `index.html`. `ThemeToggle`-Label nennt das Ziel-Theme
  (`theme.toDark`/`theme.toLight`), kein `aria-pressed`. `useTheme` ist ein Modul-Singleton (Tests müssen den Zustand zurücksetzen).
- Anrede bleibt „Sie“ in neuen Texten; bestehende „du“-Texte (z. B. `banners.credentialsMissing`) bleiben unverändert.
- Profil-Seiten in der App-Shell; ADR am Ende als eigener Commit im `deployment`-Repo, ohne Push.
- Breadcrumb ohne Router-Änderung (`breadcrumb.service.ts`); `meta.titleKey` bleibt für den aktiven Nav-Eintrag.
- „Zurück zu…“-Links entfernt (Breadcrumb ersetzt sie). i18n-Keys `AppsDetailView.backToOverview`, `CourseDetailView.back` ungenutzt
  → in g löschen (`DeploymentDetailView.backToList` wird im Fehlerzustand noch benutzt).
- Schriftskala ersetzt Tailwind-Standard: xs12 sm13 base14 md15 lg17 xl18 2xl20 3xl22 4xl26 5xl28 6xl30.
  Utilities: `max-w-page/detail/narrow/reading`, `w-sidebar`, `w-login-panel`, `h-topbar`, `px-page-x`, `px-login-x`, `gap-section`,
  `p-panel`, `h-control/-sm/-lg/-icon`, `divide-faint/-subtle`.
  Text: `text-heading`, `text-fg`, `text-fg-body`, `text-fg-muted`, `text-fg-subtle`, `text-nav`, `text-disabled`.
- Komponenten-API: `BaseButton` (`variant` primary|secondary|danger|ghost, `size` sm|md|lg, `icon`+`label`, `disabledReason`),
  `Card` (`title`, `flush`, Slots `header`/`actions`), `PageHeader` (`size` page|detail|greeting, Slots `actions`/`meta`),
  `StatusBadge` (`tone`,`size`,`icon`) + Wrapper `deployment/DeploymentStatusBadge`, `app/AppVersionStatusBadge`, `Badge` (`tone`),
  `EmptyState`, `AlertBox` (`tone`, `title`, `icon`, Slot `actions`), `SegmentedControl`, `MeterBar`,
  `DataTable` (`columns`, `rowKey`, `rowTo`, `caption`, `dense`, Slots `cell-<id>`/`empty`), `ActionMenu` (`items`, `label`, Slot `trigger`),
  `FormField`, `BaseSelect`, `PageToc`, `InfoList`, `StatStrip`, `Breadcrumb`. Types: `types/tone.ts`, `ui/{breadcrumb,menu,segment,badge-tones}.ts`.
  Links, die wie Buttons aussehen: `RouterLink` mit `class="btn btn-primary"` (BaseButton ist immer ein `<button>`).
- Maße: Die Vorlage rendert ohne `box-sizing: border-box`, dort sind 36px-Controls effektiv 38px hoch. Wir bleiben bei 36px (Token).
- Hero-Texte im Login nutzen `text-fg`/`text-fg-muted` statt der Vorlagenwerte #2A2E33/#6C7A82 (keine neuen Farb-Token; #6C7A82
  läge unter 4,5:1). Gestrichelter Platzhalterrahmen der Vorlage entfällt (war nur Platzhalter).
- Sicherheits-Hook: Bash-Kommandos mit einem Token, das auf die Schlüssel-Dateiendung (k-e-y hinter einem Punkt) endet, werden
  blockiert, auch bei Eigenschaftszugriffen → solche Änderungen mit Edit/Write. Mehrere Heredocs in einem Bash-Aufruf brechen
  in dieser Shell → Dateien mit Write anlegen.
- Snapshots nur nach Diff-Prüfung aktualisieren (bisher ausschließlich Klassen/Struktur/Meta-Änderungen).

## Bekannte Probleme / offene Fragen
- `make harness-check`: Unter Windows ohne `make` direkt `python deployment/harness/sync.py --check`. Auf Luis' Rechner meldet es
  Drift in `backend/` und `worker/` (`.claude/hooks/agent_guard.py`, `.claude/settings.json`); die Repos liegen auf anderen Branches
  (`ci/auto-trigger-staging-deploy`). Frontend ist synchron. Nicht Teil dieser Aufgabe, nicht angefasst.
- Noch vorhanden, fallen in e–g weg: `ScopeBadge`, `DetailSection` (Icon-Kachel), `surface-sunken` (AppDeploySidebar,
  DeploymentActiveTaskCard, Modal), `--surface-banner-shadow` (über `shadow-lg`/`shadow-banner` im Wizard), `bg-panel`-Hüllen
  (`bg-panel rounded-2xl p-10`) statt `Card`, `btn-ghost`-Altaufrufe, scoped Styles in `Toast`/`Modal`/`DeploymentProgressBar`,
  `VariableInput.vue:92` (harte `gray`/`white`-Klassen), ungenutztes Asset `src/assets/onlySix7-green-withoutBackground.png`.
- i18n ungenutzt seit d → in g löschen: `DashboardView.{title,subtitle,noCredentialsTitle,noCredentialsHint,setUpNow,quotaUsed}`
  (vorher per Suche bestätigen).
- LTI-Seiten: `select.field` in Kurs-Zuordnung und Deep-Link noch nicht auf `BaseSelect`/`FormField` (f).
- Nicht migrierte Aufrufer übergeben `px-4 py-2` o. ä. an `BaseButton` (überschreibt das `.btn`-Padding) → beim Seitenumbau entfernen.
- Seiten haben teils eigene Außenabstände/`max-w`; Shell-Main hat `px-page-x py-page-y` → doppelte Abstände beim Umbau entfernen.
  Profil-Seiten (`UserView`, `SettingsOpenStackView`) haben keine Breitenbegrenzung mehr → in f mit `max-w-detail` lösen.
- Hartcodierte Texte: `DeploymentRedeployModal.vue` (DE), `DeploymentTeamsCard.vue:56` (EN), `ScopeBadge` („Pro Team“) → i18n (f).
- Fehlende Bestätigungsdialoge (neu, e/f): Wizard „Zurücksetzen“, Version zurückziehen, Logo entfernen.

## Checks nach jeder Etappe (nur bei grün committen)
```
python deployment/harness/sync.py --check          # = make harness-check
docker exec frontend-dev sh -lc 'cd /app && npx vue-tsc -b'
docker exec frontend-dev sh -lc 'cd /app && npx vitest --run --coverage'   # Schwellen 89/84/71/89 nicht senken
docker exec frontend-dev sh -lc 'cd /app && npx eslint .'
rg -n '#[0-9a-fA-F]{3,8}\b' src --glob '!src/styles/tokens.css'            # muss leer sein
```
Neue Dateien oder Tailwind-Config geändert → `docker restart frontend-dev`. Commit-Stil: englischer Imperativ, Co-Authored-By-Trailer.
HANDOVER.md mit jedem Commit aktualisieren und mitcommitten. Budget nach jedem Commit prüfen (≤ 7 % übrig → sofort stoppen und übergeben).
