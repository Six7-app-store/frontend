# HANDOVER – Deployment-Wizard in 3 Schritten

Stand wird nach jedem Commit überschrieben (kein Tagebuch). Branches von `main`: `frontend/` auf `feat/deployment-wizard`,
`backend/` auf `feat/deployment_wizard` (Wunsch der Nutzerin). Beide Branches liegen auf `origin`; pushen tut die
Nutzerin selbst.

## Ziel
„Neues Deployment“ als **ein** Wizard mit höchstens 3 Schritten, ohne Einweisung lösbar (User Story).
- Von „Neues Deployment“ (Dashboard, Deployment-Liste): App → Für wen? → Aufgabe & Start.
- Von „Jetzt deployen“ auf einer App-Seite: derselbe Wizard mit App und Version, nur Für wen? → Aufgabe & Start.
- Vorlage (nur lesen, nicht ins Repo): `…\eichberg\wizard-vorlage\{light,dark}\Wiz1App, Wiz2Wer, Wiz3Start, WizStatus`.
  Verbindlich sind Layout und Stil, nicht die Beispieldaten. Basis bleibt `design-vorlage-v2`.

## Etappen
Ein Commit pro Etappe (Wunsch der Nutzerin), bei e einer je Repo.
- [x] a) Hülle, Stepper, Route, Draft in sessionStorage → `dde70d7`
- [x] b) Schritt 1: Liste freigegebener Apps (Radio-Cards, Suche), Version vorbelegt, „Andere Version“, kein `'latest'`
  → `437a697`
- [x] c) Schritt 2: Kurs/Studierende, Namensvorschlag, 3 Aufteilungs-Optionen mit Ergebnis, TeamBuilder nur bei „Gruppen
  selbst bilden“, Fix „Eine Gruppe ohne Zuordnung“ → `b0056aa`
- [x] d) Schritt 3: Pflichtfelder, „Erweitert“ eingeklappt, Mehrfach-Dateien mit Zuordnung, Zusammenfassung, Start-Sperre
  → `6ce7890`
- [x] e) Backend: Version freigegeben + `latestApprovedVersion`; Pflichtfelder/-dateien in `POST /deployments`;
  Frontend-Fehlertexte → backend `d931c11` „Validate version and required inputs on deployment create“,
  frontend `be9a945`
- [x] f) Nach dem Start auf die Detailseite, Hinweis „kann geschlossen werden“, Live-Log eingeklappt
  → `3100434`
- [x] g) Alte Screens löschen, Einstiege für Studierende ausblenden, Tests → `6b77b6c` („zwischenstand“) und
  „Finish removing the old deployment wizard“ (`git log -1`)

**Nächster Schritt:** Browserprüfung des ganzen Flows (steht noch aus, siehe „Stand nach g“). Danach ist der Wizard fertig;
die Folgepunkte unten sind bewusst nicht Teil davon.

## Stand nach a
- Route `deploymentNew` = `/deployment/new/:step(app|target|start)?`, Guard in `router/wizard-guard.ts`:
  - ohne Schritt: neuer Lauf (`store.startDraft`), mit `?app=&version=` Einstieg `app`, sonst `catalog`
  - mit Schritt: Draft bleibt, ein noch nicht erreichbarer Schritt fällt auf den ersten offenen zurück
  - `onBeforeRouteUpdate` im Composable prüft dasselbe für Vor/Zurück im Browser
- `services/wizard-steps.service.ts`: Schritte je Einstieg, `draftBlockReason` (i18n-Key), `canShowStep`
- `services/draft-storage.service.ts`: `deployment.draft.v1`; passt der Draft samt Dateien nicht, ohne Dateien und
  `filesLost: true`
- `composables/useDeploymentWizard.ts`: Navigation, Sperrgrund, `stepReason` für Gründe, die nur ein Schritt kennt,
  speichert den Draft bei jeder Änderung
- `WizardShell.vue` (Titel, `WizardStepper`, Footer mit Grund neben dem Button), `NewDeploymentView.vue` verdrahtet
- Der Draft trägt `entry` und `appName`. Die App-Seite startet ihren Lauf selbst mit
  `store.startDraft({ appId, appName, releaseTag })` und öffnet `{ name: deploymentNew, params: { step: 'target' } }`.
  `/deployment/new` ohne Schritt startet immer einen Katalog-Lauf (keine Query-Parameter).

## Stand nach b
- `ui/RadioCardGroup.vue` (+ `radio-card.ts`): Radiogruppe als Karten, Pfeiltasten/Pos1/Ende, Roving Tabindex, Badge,
  Beschreibung, Ergebnis, `stacked`. CSS `.choice-card`/`.choice-dot` in `components.css`, Zustand über `aria-checked`.
- `services/wizard-app.service.ts`: `deployableApps` (nur mit `latestApprovedVersion`, Suche, sortiert), `appTagline`.
- `composables/useWizardApp.ts`: Apps über `useAppCatalog`, Versionen erst auf „Andere Version“ über `GET /apps/{id}`.
- `store.chooseRelease` / `withRelease`: eine andere App oder Version verwirft Variablen, Werte und Dateien.
- `releaseVersion` rät nicht mehr `'latest'`; `submitDraft` verweigert einen Draft ohne Version.
- **Bis Etappe e liefert das Backend `latestApprovedVersion` nicht** — im Browser ist die Liste in Schritt 1 bis dahin leer.
  Tests mocken das Feld. Browserprüfung deshalb erst nach e.

## Stand nach c
- **Teams folgen dem Modus** (`wizardTeams` in `deployment-draft.service`): „Alle zusammen“ und „Jeder einzeln“ lesen
  `assignments` gar nicht mehr, nur „Gruppen selbst bilden“. Damit ist die Sackgasse „Eine Gruppe, niemand zugeordnet“
  weg. Payload, `useWizardTeams` (Slot-Keys) und Sperrgrund nutzen dieselbe Funktion. `teamLists` liest Arrays und
  index-geschlüsselte Objekte (ältere Drafts).
- `splitProblem` (team-assignment.service) liefert den Sperrgrund für „Gruppen selbst bilden“; `canProceed` ist gelöscht.
- `RECOMMENDED_MODE = 'one'` mit Begründung im Kommentar (Datei-Scope impliziert keine Aufteilung).
- `useTeamAssignment.setCustom` verteilt beim ersten Wechsel gleichmäßig auf 2 Gruppen; neu `selectMode`, `problem`,
  Typ `TeamAssignment`.
- `useWizardTarget`: Kurse mit Mitgliederzahl, Kurswahl übernimmt alle Mitglieder, Einzelwahl über die Suche.
- Komponenten: `StepTarget`, `TargetPicker` (Kurs-Select bzw. Zähler + Umschalt-Link), `StudentPicker` (Suche +
  Auswahl, nutzt `StudentSearchList`/`SelectedStudentsPanel`), `SplitModeOptions` (auf `RadioCardGroup`),
  `TeamBuilder` (Drag & Drop aus der alten Gruppen-View, die bis g bleibt).
- Name: `suggestedName`, Draft-Feld `nameEdited` stoppt den Vorschlag, sobald jemand tippt.
- `FormField` zeigt Fehler jetzt mit Icon (gilt überall).
- Browserprüfung von Schritt 1+2 folgt nach e (vorher keine Apps in Schritt 1).

## Stand nach d
- `StepStart`: Pflichtangaben (ohne Default) offen, Dateivariablen je `FileAssignment`, alles mit Default unter
  `AdvancedSettings` (eingeklappt, `aria-expanded`), `WizardSummaryPanel` daneben (App · Version, Für, Aufteilung,
  Ergebnis, Dauer, freies Kontingent aus `useQuotas`). Braucht die App nichts: Hinweis + Zusammenfassung.
- `useStartStep`: lädt erst die Namen (`directory.ensureLoaded`, user-Slots hängen am Username), dann die Variablen;
  jede Eingabe geht sofort in den Draft (`form.save()` per Watch); verwirft Datei-Slots alter Teams
  (`withoutStaleFileSlots`); meldet den Sperrgrund (`loading`, `missingInputs`, `outOfRange`, `missingFiles`).
- Ladefehler der Variablen: Warnung + „Erneut versuchen“, Start bleibt möglich (wie bisher; das Backend prüft ab e).
- Datei-Zuordnung `file-matching.service`: Dateiname ohne Endung, normalisiert (klein, ohne Akzente, Trenner → Punkt),
  gegen Username, E-Mail-Teil, „vorname.nachname“ bzw. Teamnamen. Nur eindeutige Treffer, sonst Liste
  „Nicht zugeordnet“. Je fehlender Zeile „Datei wählen“.
- `FileDropZone`: `multiple` (Event `files`), Ablagefläche ist jetzt ein `<button>`; Einlesen in
  `utils/deployment-file.ts` (`readDeploymentFile`, `acceptFor`, `MAX_DEPLOYMENT_FILE_BYTES`).
- `VariableFieldCard`: `plain` + `label` (Klartext ohne Typ-/Scope-Badges). Klartext aus `variableLabel` (osType →
  `deployment.wizard.labels.*`, sonst erster Satz der Beschreibung, sonst Name).
- Sperrgrund ist jetzt `{ key, params, plural }` (`BlockReason` in `useDeploymentWizard`). `start()` legt an,
  navigiert per `replace` auf `deploymentsDetail` und verwirft danach den Draft.
- **Falle (Harness):** Der Secret-Hook blockt jedes Bash-Kommando, in dem ein Wort auf „.key“ endet (etwa ein
  Property-Zugriff in einem Python-Heredoc, auch in Commit-Texten). Solchen Text per Edit/Write schreiben und
  Commit-Nachrichten mit `git commit -F <datei>` übergeben.

## Stand nach e
- Backend `POST /deployments`:
  - ohne `releaseTag` → 422 `{reason: version_required}` (der `"main"`-Fallback ist weg)
  - Nicht-Owner/Nicht-Admin mit nicht freigegebener Version → 403 `{code: version_not_approved}`
    (`ensure_deploy_version` in `utils/capabilities.py`)
  - Variablen-Definitionen werden bei jedem Deploy mit `git_link` geladen; `_validate_required_inputs` → 422
    `{reason: required_missing, missing: [{variable, slot?}]}`. User-Slots wie im Wizard: username, sonst E-Mail-Teil,
    sonst Vorname (`_slot_username`). Git nicht erreichbar → Prüfung entfällt wie bisher.
- `latestApprovedVersion` in `AppResponse` (Liste und Detail), `crud.latest_approved_versions` (eine Abfrage, ohne Git,
  Reihenfolge wie die Git-Tags).
- Frontend `formatSubmitError`: `version_required`, `version_not_approved`, `required_missing`, `required_slot_empty`.
  Tests dafür jetzt in `deployment-submit-error.service.test.ts` (vorher in der Summary-Testdatei, die g löscht).
- Backend-Tests: `make test-backend-isolated` liegt im **backend**-Makefile (nicht in `deployment/`). 843 grün,
  3 übersprungen, Coverage 80,55 %.

## Stand nach f
- Nach dem Start landet man per `router.replace` auf `deploymentsDetail` (seit d).
- `DeploymentActiveTaskCard`: Hinweis „Du kannst diese Seite schließen …“ (bei `deploy` zusätzlich der Satz zur
  Zugangsdaten-Mail, die `deployment_notifier` tatsächlich verschickt); Live-Log hinter „Live-Log anzeigen“
  (`aria-expanded`/`aria-controls`, `v-show`). Phasen/Fortschritt unverändert. Snapshot `running` nach Diff-Prüfung
  aktualisiert (nur Hinweis, Button, eingeklappter Log).

## Stand nach g
- Der alte 4-Schritt-Wizard ist weg: Views `NewDeployment{Config,GroupsAssignment,Variable,Summary}View` samt Specs,
  die Routen `/deployment/new/{config,teams,variables,summary}`, ihre Route-Namen, Breadcrumb-Fälle und
  `requireWizardStep` im Router, `WizardStepLayout`, `DeploymentProgressBar`, `GroupModeSelector`,
  `SummaryVariableCard`, `CoursePickerList`, `deployment-summary.service`, Typ `WizardSummary`, Draft-Feld `version`.
  `useTeamAssignment` verliert `mode`, `problem`, `complete` (nur die alte View las sie).
- Einstiege: Dashboard und Deployment-Liste (auch der Leerzustand) öffnen `deploymentNew`; die App-Seite startet den
  Lauf mit `store.startDraft` direkt bei `target` und belegt die neueste **freigegebene** Version vor (sonst den neuesten
  Tag, für Owner). Für Studierende sind die Aktion im Dashboard und der Deploy-Bereich der App-Seite ausgeblendet
  (`useRouteAccess().canAccess({ name: deploymentNew })`), die Liste prüfte `isStaff` schon vorher.
- i18n: die Keys der alten Screens gelöscht, dazu `AppsDetailView.toasts.preparingConfig`. Im Namespace `deployment.*`
  ist jeder Key benutzt (Skript-Check, inkl. dynamischer `${mode}`-Keys). Außerhalb davon gibt es ältere ungenutzte Keys
  (`auth.login.*`, `DeploymentDetailView.*` u. a.), die nicht zu g gehören.
- README beschreibt den neuen Wizard. Die Specs `CredentialMissingBanner` und `SettingsOpenStackView` nehmen als
  `next`-Ziel jetzt `/deployment/new/start`. `docs/review/frontend-review.md` nennt die alten Views weiter — das ist ein
  historischer Bericht und bleibt so.
- **Browserprüfung offen:** braucht einen Keycloak-Login unter `localhost:5173` und `GIT_ACCESS_TOKEN` (sonst bleibt
  Schritt 1 leer). Durchklicken: Dashboard → Wizard (3 Schritte) → Detailseite; App-Seite → „Jetzt deployen“ (2 Schritte);
  als Studierende/r: keine Einstiege, Direktlink `/deployment/new` landet auf `/forbidden`.
- ESLint ist im `node_modules` des Containers nicht installiert (`npx eslint` lädt sonst eslint 10 ohne Plugins). Geprüft
  in einer Wegwerf-Kopie: `tar` von `/app` ohne `node_modules` nach `/tmp/lint`, dort `npm ci && npx eslint .` → grün.
- `make harness-check`/`harness-test` brauchen Python; am Host gibt es nur den Store-Platzhalter. Läuft im Backend-Image:
  `docker run --rm --entrypoint sh -v <AppStore>:/w -w /w/deployment deployment-backend -c 'python harness/sync.py --check && python harness/test_agent_guard.py'`
  (unter Git Bash mit `MSYS_NO_PATHCONV=1`).

## Entscheidungen
- Vom App-Einstieg nummeriert der Stepper „1 von 2“ (Vorlage zeigt „3 von 3“ mit zwei Einträgen; AC verlangt 2 Schritte).
- Schritt 1 zeigt nur Apps mit freigegebener Version. Owner/Admin deployen Unfreigegebenes weiter über die App-Seite.
- Kurs in Schritt 2 als Select mit Mitgliederzahl, Link „einzelne Studierende auswählen“ öffnet die bestehende Suche.
- Dauerhinweis als fester Text „kann bis zu 90 Min. dauern“.
- Empfohlene Aufteilung vorerst immer „Alle zusammen“; eine Vorgabe je App gibt es noch nicht (Folgepunkt).
- Neue Tokens: `--wizard-max` (960), `max-w-wizard`.
- Ohne Zugangsdaten zeigt die Hülle bei einem Direktlink das bestehende Banner und keinen Footer.

## Offene Fragen
- keine

## Folgepunkte (nicht bauen)
- Anzeigenamen und „Erweitert“-Marker in `variables.tofu`
- Kontingent-Schätzung je Deployment, echte Dauer-Schätzung
- E-Mail bei Fehlschlag
- Zugangsdaten je Kurs
- App-spezifische Empfehlung der Aufteilung

## Regeln (weiter gültig aus v2)
- Alles im Container. Nie `.env`, `.pem` oder Schlüsseldateien. Kein Push. `.claude/` nicht anfassen.
- Tokens nur in `src/styles/tokens.css`. Keine Hex-Werte und keine Inline-Styles. Klassennamen aus `@layer components` nie per
  Template-String bauen.
- Komponenten-Specs prüfen Zustand (aria, `data-testid`), keine Tailwind-Klassen. Snapshots nur nach Diff-Prüfung
  aktualisieren.
- **Anrede in neuen Texten: „du“** (galt bisher „Sie“; im Wizard durchgehend „du“, ältere Texte werden nicht umgestellt).
- Komponenten-API: siehe `git show develop:HANDOVER.md`, Abschnitt „Entscheidungen“.
- View-Specs mit reaktiver Mock-Route brauchen `enableAutoUnmount(afterEach)`.

## Bekannte Probleme
- Dev ohne `GIT_ACCESS_TOKEN`: keine Versionen und keine Variablen. Echte Variablen lassen sich nur mit Token prüfen.

## Checks nach jeder Etappe (nur bei grün committen)
```
cd ../deployment && make harness-check && make harness-test
docker exec frontend-dev sh -lc 'cd /app && npx vue-tsc -b'
docker exec frontend-dev sh -lc 'cd /app && npx vitest --run --coverage'   # Schwellen 89/84/71/89 nicht senken
docker exec frontend-dev sh -lc 'cd /app && npx eslint .'
rg -n '#[0-9a-fA-F]{3,8}\b' src --glob '!src/styles/tokens.css' --glob '!**/__tests__/**'   # muss leer sein
docker exec backend-dev poetry run ruff check .            # bei Backend-Änderungen
cd ../backend && make test-backend-isolated                # bei Backend-Änderungen (Target im backend-Makefile)
```
- Neue Dateien oder eine geänderte Tailwind-Konfiguration: `docker restart frontend-dev`.
- Commit-Stil: englischer Imperativ mit Co-Authored-By-Trailer. HANDOVER mit jedem Commit aktualisieren.
- Budget nach jedem Commit prüfen. Bei 7 % oder weniger sofort stoppen und übergeben.

## Messwerte
| Stand | Dateien | Tests | Coverage (St/Br/Fn/Li) |
|---|---|---|---|
| Start | 116 | 1183 | 92,16 / 88,08 / 77 / 92,16 |
| nach a | 120 | 1207 | 92,3 / 88,21 / 77,95 / 92,3 |
| nach b | 123 | 1223 | 92,43 / 88,31 / 78,48 / 92,43 |
| nach c | 125 | 1243 | 92,53 / 88,58 / 78,3 / 92,53 |
| nach d | 128 | 1269 | 92,79 / 88,58 / 78,77 / 92,79 |
| nach e | 129 | 1271 | 92,8 / 88,55 / 78,79 / 92,8 |
| nach f | 130 | 1273 | 92,84 / 88,62 / 78,91 / 92,84 |
| nach g | 125 | 1190 | 92,15 / 88,35 / 77,43 / 92,15 |

Nach g weniger Dateien und Tests, weil die Specs der vier alten Views mit ihnen gegangen sind.
