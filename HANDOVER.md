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
- e) Commit „Bring the apps pages and rendered Markdown to the v2 design“ (`git log -1`):
  - `app/AppCard` (ganze Karte = Link, ohne Icon, Status als Punkt/Icon + Text, Vorschau aus `descriptionPreview`: erste
    Überschrift + erster Absatz als Klartext) in `AppsView` und als Vorschau in `AddAppsView`. Filter = `SegmentedControl size="md"`.
  - `AppsDetailView` (`max-w-detail`): `AppDetailHeader` = `PageHeader size="detail"` + Meta (Versionen · Repo mono + `CopyButton`),
    „Bearbeiten“ + „…“-Menü (Löschen). Tabs ohne Icons. `AppOverviewTab`: Artikel (660px) + sticky Spalte (`#deploy`-Slot mit
    `AppDeploySidebar` als Card/FormField/BaseSelect, `PageToc` aus den H2 der Beschreibung, `InfoList` App + Version).
    `AppStoreTab`: AlertBox-Hinweise, Sichtbarkeit als Panel mit ToggleSwitch, Versionen als `DataTable`, „Zurückziehen“ jetzt mit
    Bestätigung (ConfirmModal in der View), Lösch-Bereich unten.
  - `AddAppsView`: Formular in Cards mit `FormField`/`BaseInput`, Sichtbarkeit als `SegmentedControl`, Info als `AlertBox`,
    „Abbrechen“ + „App hinzufügen“ unten rechts, Absenden über `<form @submit>` (Enter funktioniert).
  - Markdown: Rendering als reine Funktion `renderMarkdown` in `services/markdown.service.ts` (+ `markdownHeadings`, `headingId`,
    `plainText`), `breaks: false`, Überschriften mit `md-…`-IDs (für die TOC; im Browser geprüft, DOMPurify lässt sie stehen).
    Gestaltung komplett in der typography-Konfiguration (`tailwind.config.js`): Text 15/1.65, H1 20, H2 17, H3 15, Inline-Code als
    Chip ohne Backticks, Tabellen/Listen/Zitate/Codeblöcke im Vorlagenstil. `.md-compact` für die kompakte Variante.
  - `StatusBadge` normal statt fett, neue Größe `xs`; `AppVersionStatusBadge`: veröffentlicht/in Prüfung/abgelehnt als Punkt,
    privat = Schloss, nicht eingereicht = Uhr. `PageHeader`: Aktionen unten (Liste), oben (Detail), mittig (Begrüßung); Untertitel 14px.
  - `InfoList` kann `href`; `.link`-Klasse (unterstrichen, nicht rot); `CopyButton` (Icon) als Ghost-Icon-Button mit `aria-label`.
  - Snapshots HelpView + DeploymentDetailView aktualisiert (nur Klassen und `aria-label` der Kopier-Buttons, per Diff geprüft).
  - Stand: vue-tsc grün, 110 Dateien / 1082 Tests grün, Coverage 92,0/87,5/75,7/92,0, eslint leer, keine Hex-Treffer.

- f1) Commit „Move the deployment pages to the v2 design“ (`git log -1`):
  - `DeploymentsListView` als `DataTable` (Name, App, Version mono, Status, Erstellt, Chevron; ganze Zeile = Link);
    Studierende im selben Raster mit drei Zuständen (Status + Hinweis-Spalte).
  - Detail: `DeploymentDetailHeader` = `PageHeader` (Meta: Status · Version; Pausieren sekundär, Löschen `danger` mit
    `disabledReason`). `DeploymentOverviewCards` = drei `Card`s mit `InfoList` (Rolle übersetzt, Repo als Link).
    `DetailSection` gelöscht, alle Abschnitte sind `Card` (neu: `count`-Prop). Infrastruktur mit i18n, `AlertBox`, `Badge`.
    VM-Karte: „Details“ sekundär, „Redeploy“ grau→rot (bei fehlender VM rot als Hauptaktion). Gruppen- und Task-Zeilen sind
    echte Buttons. `DeploymentRedeployModal` und Team-Texte übersetzt.
  - Klassen-Durchgang über alle `.vue`: `uppercase`/`tracking-*` weg, `text-[10px]`→`text-xs`, `font-bold`→`font-semibold`,
    `hover:text-accent-fg`→`hover:text-heading` (nur statische `class`-Attribute).
  - Charakterisierungstest: Klassen-Selektoren durch `data-testid`s ersetzt (`member-row`, `member-username`, `group-card`,
    `group-name`, `variable-card`, `resources-error`, `task-row`, `phase-label`, `redeploy-address`); Snapshots nach
    Textvergleich aktualisiert (nur gewollte Textänderungen: i18n statt Englisch, Kopf-Meta, Rolle übersetzt, kein Avatar).
  - Sichtprüfung mit gemockten Deployments (Mock-Datei im Scratchpad, Pfad-Regex, Port 8000).
  - Stand: 110 Dateien / 1082 Tests grün, Coverage 92,0/87,5/75,8/92,0, eslint leer, keine Hex-Treffer.

- f2) Commit „Bring courses and approvals to the v2 design“ (`git log -1`): Kursliste als `DataTable` (`max-w-narrow`,
  Mitglieder, „…“-Menü mit Löschen + Dialog), Kursdetail mit Titel + Stift-Button, Mitglieder-`DataTable` (Avatar, E-Mail,
  Rolle als Text wie Vorlage, Entfernen grau→rot), Hinweis im Hinzufügen-Dialog als `AlertBox`. Freigaben: Filter
  „Nur mit Einreichungen“ + `ToggleSwitch` rechts, Akkordeon in einem Panel mit Trennlinien, Leerzustand im Panel mit Link,
  Aktionen als `BaseButton` (Freigeben primär, Ablehnen/Widerrufen grau→rot). **Abweichung:** Freigaben bleiben ein Akkordeon
  pro App statt einer flachen Tabelle, weil die Freigaben pro App erst beim Aufklappen geladen werden (Logik unverändert).
  Stand: 110 Dateien / 1082 Tests grün, Coverage 91,9/87,5/75,8/91,9.

- f3) Commit „Finish the remaining pages, the wizard and dialogs in v2“ (`git log -1`):
  - Hilfe als Lesespalte (720) + `PageToc` (neue Anker `help-*`, Klasse `.help-article`), Profil als Konto-Panel mit `InfoList`
    (leere Felder ausgeblendet statt „N/A“), OpenStack-Einstellungen mit `max-w-detail`, Panels und neutralem Link.
    403/404 als `EmptyState` (neu: `titleTag`) mit einer Aktion.
  - Wizard: `WizardStepLayout` mit `PageHeader`, neuer Stepper ohne Grün (erledigt = Häkchen, aktuell = Akzentring,
    `aria-current="step"`), Buttons als `BaseButton`. Schritt 1: `FormField`, Kursliste als Panel mit Checkbox-Zeilen,
    Hinweis als `AlertBox`. Schritt 2: `GroupModeSelector` = `SegmentedControl`, Zähler/Zufall als sekundäre Buttons,
    „Zurücksetzen“ grau→rot **mit Bestätigung (neu)**, Drag-Hinweis als `AlertBox`, Spalten/Chips ohne Doppelrahmen und
    Schatten. Schritt 4: drei `Card`s mit `InfoList`, Dateien als `code-chip`.
  - `.drop-zone`/`.drop-zone-active` für alle Drop-Zonen (neutral statt rot/grün). `VariableInput` ohne `gray`/`white`.
  - `Toast` und `Modal` ohne Scoped-CSS: Toast unter der Topbar mit Status-Icon und `role`; Modal mit `role="dialog"`,
    `aria-modal`, Esc, Fokus beim Öffnen, übersetztem Schließen-Button (`common.close`). Keine `<style>`-Blöcke mehr im Repo.
  - `AppEditModal`: Felder als `FormField`, **Logo entfernen mit Rückfrage (neu, inline im Dialog)**. LTI-Auswahlen als `BaseSelect`.
  - Snapshots Help/DeploymentDetail per Textvergleich geprüft (nur Klassen). Stand: 110 Dateien / 1082 Tests grün,
    Coverage 91,9/87,7/75,7/91,9, eslint leer, keine Hex-Treffer.

## Offen (Reihenfolge)
g Aufräumen · Abschluss
(alle Harness-Checks, HANDOVER = Endstand, ADR-Commit im `deployment`-Repo, Schlussbericht laut Plan)

## Nächster Schritt (als Erstes)
Etappe g, Aufräumen: ungenutzte Komponenten (`ScopeBadge`?, `EntityListState`-Varianten prüfen), Klassen (`surface-sunken`,
`--surface-banner-shadow`/`shadow-banner`, `bg-panel`-Altreste, `focus:border-accent/60`), Tokens (per Suche nach `var(--…)`),
Assets (`onlySix7-green-withoutBackground.png`), i18n-Keys (Listen unten, vorher suchen), `iconForAppName` + Tests.
Danach Hex-Suche, Komponenten-Inventar, Abschluss laut Plan (ADR im `deployment`-Repo, Schlussbericht).

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
- Ungenutzt seit e → in g löschen: `iconForAppName` (+ Tests) in `app-presentation.service.ts`, i18n `AppsCreateView.preview.
  {logoAlt,deployBtn}`, `AppsDetailView.{appInfoTitle,versionDetailsTitle,versionsAvailable,visibilityLabel,storeVisibilityTitle,
  visibilityPublic,visibilityPrivate}`, `markdownRenderer.more/less` nur falls `expandable` nirgends mehr genutzt wird (vorher suchen).
  Das App-Logo wird nirgends mehr angezeigt (Karten ohne Icon laut Plan), Upload/Bearbeiten bleibt.
- Testumgebung: Unter happy-dom packt DOMPurify Elemente aus und lässt Event-Handler stehen. Deshalb ist DOMPurify in
  `MarkdownRenderer.spec.ts` ein Spy; die Markdown-Regeln werden auf `renderMarkdown` getestet. Views stubben den Renderer ohnehin.
- Bash/Python-Heredocs: `\n` in Python-Strings landet als echter Zeilenumbruch in der Datei → Test-Strings mit `\n` per Edit/Write
  schreiben oder `[...].join('\n')` nutzen.
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
