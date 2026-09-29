# Frontend-Review — Duplikate, God-Components, Clean-Code

Stand: Branch `refactor/second_review` (Basis `ed4da92`), 28.09.2026.
Umfang: `src/` des Frontend-Repos (Vue 3.5, TypeScript 5.9, Pinia 3, Vue Router 4, vue-i18n 10,
Vite 7, Vitest 3 + happy-dom, ESLint 10 flat config).
Maßstab: Clean-Code-Regeln 1–10 aus dem Auftrag. Regelnummern stehen im Text als **R1 … R10**.

## Kurzfazit

- Das erste Refactoring hat die Deployment-Detailseite sauber zerlegt: 7 Composables und
  14 rein präsentationale Komponenten. Der Wizard (4 Views, zusammen 3 019 Zeilen), die App-Views
  und der `OpenStackResourcePicker` sind davon aber unberührt und weiter die Hauptproblemzone.
- **7 echte God-Components.** Die größte ist `NewDeploymentVariableView.vue` mit 1 101 Zeilen.
  Darin sind rund 190 Template-Zeilen doppelt: der Packer- und der Terraform-Block sind nahezu
  identisch.
- **Duplikate sind überwiegend „gleiches Wissen“, nicht Zufall.** Beispiele: den Versions-Tag aus
  `releaseTag` lesen (4×, die Kopien weichen voneinander ab), der Anzeigename von Studierenden
  (6×), Teams gleichmäßig aufteilen (2×), der OpenStack-Fetch-Switch (2×), die Status-Farben (3×),
  die Regel „Owner oder Admin“ (5×, ebenfalls abweichend).
- **Fehlerbehandlung ist nicht einheitlich (R6).** Es gibt 4 Varianten für „lesbare
  Fehlermeldung“, und zwei davon in `utils/http-error.ts` widersprechen sich. Die Store-Felder
  `error` werden nirgends angezeigt. Die LTI-Views lesen `err.response` direkt.
- **Die Baseline ist nicht grün:** 5 Tests sind rot, 1 Lint-Fehler.
  - Die Tests zeigen **zwei Regressionen aus Merge und Rebranding**, darunter einen echten Fehler:
    Die Einzelauswahl von Studierenden im Wizard schlüsselt wieder auf `keycloak_id`.
  - Weitere echte Fehler: Die LTI-Buttons sind unsichtbar (die Farbe `primary` existiert nicht
    mehr). Der SSE-Stream umgeht die LTI-Token-Logik.
  - Diese Fehler kommen **vor** jedem Refactoring (Schritt 0).
- Der Refactoring-Plan hat 16 einzeln mergebare Schritte. Zuerst kommen die Fehlerbehebungen,
  dann reine Helfer mit Unit-Tests, zuletzt die großen View-Zerlegungen hinter
  Charakterisierungstests.

## 0. Baseline und Befehle

Frontend-spezifische `make`-Targets für Test und Lint gibt es im `deployment/Makefile` nicht; es
gibt nur `dev-restart-frontend`, `shell-frontend` usw. Deshalb gelten die Befehle aus
`AGENTS.md`, jeweils im Container:

| Prüfung | Befehl | Ergebnis am 28.09. |
|---|---|---|
| Tests | `docker exec frontend-dev sh -lc 'cd /app && npx vitest --run'` | **616 / 621 grün, 5 rot** |
| Lint | `docker exec frontend-dev sh -lc 'cd /app && npx eslint .'` | **1 Fehler**: `VariableInput.vue:27` `props` ungenutzt |
| Typecheck | `docker exec frontend-dev sh -lc 'cd /app && npx vue-tsc -b --noEmit'` | grün |

**Die roten Tests sind Regressionen, keine veralteten Tests:**

1. **`NewDeploymentConfigView.spec.ts:296`, „selects an individual student“.**
   - Das Template schlüsselt die Einzelauswahl auf `student.keycloak_id`
     (`NewDeploymentConfigView.vue:460-469, 498, 507`). Script und Kommentar (`:35-42`) sowie
     Commit `d14d17c` sagen aber `userId`.
   - Folge: Wer per Moodle-LTI angelegt wurde, also ohne `keycloak_id`, lässt sich einzeln nicht
     auswählen. Ausgewählte IDs lösen sich nicht im Cache auf, der nach `userId` schlüsselt.
   - Das ist ein **Funktionsfehler**.
2. **`NewDeploymentGroupsAssignmentView.spec.ts:305-353`, 4 Drag-Tests.**
   - Das Rebranding (`60f392d`) hat die `data-testid="group-dropzone-*"` entfernt.
   - Die Tests prüfen außerdem noch die alte Palette (`bg-emerald-50`).
   - Zusätzlich fehlt die Absicht „Team-Karte vergrößert sich beim Überfahren nicht“: `:536`
     setzt weiterhin `scale-[1.02]`.

## 1. Duplikate

Legende: **G** = gleiches Wissen (zusammenführen), **A** = gleiches Wissen, aber die Kopien
weichen schon voneinander ab (zusammenführen **und** das Soll-Verhalten klären),
**Z** = nur zufällig ähnlich (so lassen).

### 1a. Logik

| # | Fundstellen | Was ist dupliziert | Art | Vorschlag gemeinsame Stelle |
|---|---|---|---|---|
| D1 | `stores/deployment.store.ts:178-185`, `views/NewDeploymentSummaryView.vue:56-61` und `:375-381`, `views/NewDeploymentVariableView.vue:361-362` | Versions-Tag aus `draft.releaseTag` (String/Objekt) lesen. Die Store-Kopie akzeptiert zusätzlich `.name`; die Variable-View gibt bei fehlendem `version` das ganze Objekt zurück. | A | `resolveReleaseVersion(tag)` in neuem `services/deployment-draft.service.ts` |
| D2 | `NewDeploymentVariableView.vue:387-398`, `NewDeploymentSummaryView.vue:398-411` (dazu das nicht exportierte `parseUserInputVar` in `services/deployment-input.service.ts:17-21`) | `userInputVar` parsen (JSON-String oder Objekt) | G | `parseUserInputVar` exportieren und in beiden Views nutzen |
| D3 | `NewDeploymentVariableView.vue:38-40`, `components/VariableInput.vue:51-56` | HCL-Typprüfungen `isBool` / `isNumber` / `isList` | G | `services/variable-types.ts` |
| D4 | `NewDeploymentVariableView.vue:280, 482, 511`, `NewDeploymentSummaryView.vue:295`, `components/OpenStackResourcePicker.vue:249, 423-427, 461` | Kommagetrennten String in eine Liste zerlegen (`split(',').map(trim).filter`) | G | `splitCsv()` in `services/variable-types.ts` |
| D5 | `deployment.store.ts:236-243`, `NewDeploymentSummaryView.vue:85-94` | Packer-Wert im Multi-Image-Layout auflösen. Der Kommentar in `deployment.store.ts:229-231` räumt die Dopplung selbst ein. | G | `resolvePackerValue()` in `services/deployment-variables.service.ts` |
| D6 | `NewDeploymentVariableView.vue:254-256` im Vergleich zu `services/deployment-variables.service.ts:24-33` | „Ist Multi-Image?“: einmal aus den Definitionen abgeleitet, einmal aus der Form der Werte | A | Eine Ableitung im Service, beide Aufrufer nutzen sie |
| D7 | `deployment.store.ts:198-215`, `NewDeploymentGroupsAssignmentView.vue:356-365` | Studierende gleichmäßig auf N Teams verteilen (floor + remainder) | G | `distributeEvenly(ids, count)` in `deployment-draft.service.ts` |
| D8 | `deployment.store.ts:210` (`Team-n`), `NewDeploymentVariableView.vue:166` (`Team-n`), `services/deployment-input.service.ts:35` (`Gruppe n`), `NewDeploymentGroupsAssignmentView.vue:77, 88, 109, 199, 210` (i18n `vmDefaultName`) | Ersatzname für ein Team | A | Eine Funktion `defaultTeamName(i)` über i18n |
| D9 | `NewDeploymentGroupsAssignmentView.vue:297-305` und `:323-331` | Eine Person aus allen Gruppen entfernen | G | Lokale Funktion `removeEverywhere(id)`; später im Composable `useTeamAssignment` |
| D10 | `NewDeploymentConfigView.vue:472-474, 502-504`, `NewDeploymentGroupsAssignmentView.vue:512-521, 579-588`, `NewDeploymentSummaryView.vue:559-563, 596-600` (Variante in `NewDeploymentVariableView.vue:170-173`) | Anzeigename von Studierenden (Vor-/Nachname → username → email → id) | G | `userDisplayName(user, fallbackId)` in `utils/user-display.ts` |
| D11 | `NewDeploymentConfigView.vue:43, 56-65`, `NewDeploymentGroupsAssignmentView.vue:15-30`, `deployment.store.ts:61` | Drei Kopien des Studierenden-Caches (lokal, reaktiver Spiegel, Store) | G | Nur `deploymentStore.studentCache` (als reaktive Map oder `Record`) |
| D12 | `CourseDetailView.vue:98-134`, `NewDeploymentConfigView.vue:270-332` | Personensuche: 300 ms Debounce, Mindestlänge 2, `userApi.search`, Startliste `role: 'student'` | G | Composable `useUserSearch({ limit })` |
| D13 | `useOpenStackResourceCache.ts:195-218` (`fetchList`), `OpenStackResourcePicker.vue:124-147` (`fetchByType`) | Weiche osType → API-Aufruf (10 Fälle; `listImages('active')`, AZ `'compute'`) | G | `openstackResourcesApi.listByType(type, { networkId, azService })` in `api/openstack-resources.api.ts` |
| D14 | `InfrastructureVmCard.vue:58-66`, `InfrastructureVmDrawer.vue:84-91` (Notlösung in `useVmPresentation.ts:11-14`) | Farbton für den VM-Lifecycle (`'grey'` vs `'gray'`) | A | `lifecycleTone(status)` in `composables/useVmPresentation.ts` |
| D15 | `DeploymentsListView.vue:108-124`, `DeploymentDetailHeader.vue:50-52`, `DeploymentTaskHistory.vue:85-87`; Soll-Stelle ist `utils/deployment-status-styles.ts` | Status → Badge- und Icon-Farbe | G | Nur `getStatusStyles()`; dafür ein Feld `iconClass` ergänzen |
| D16 | `useDeploymentStream.ts:135, 150`; Soll-Stelle ist `services/deployment-tasks.service.ts:9` | Die Status-Mengen „live“ und „terminal“ (dazu in Großschreibung) | G | `isLiveTaskStatus()` / `isTerminalTaskStatus()` |
| D17 | `useDeploymentStream.ts:81, 110`, `services/deployment-phases.service.ts:21` | Standard-Phasenzahl 11 | G | `DEFAULT_PHASE_COUNT` importieren |
| D18 | `useRole.ts:24-30`, `AppsDetailView.vue:79-91`, `AppsView.vue:41`, `useDeploymentOwnerView.ts:22-26`, `app.store.ts:17` / `deployment.store.ts:69` | Die Regel „Owner oder Admin/Staff“. Für Deployments steht einmal „Admin oder Owner“ (`canOperateDeployment`), einmal „Staff oder Owner“ (`isOwnerView`). | A | `useRole` als einzige Stelle; die Regel gegen das Backend (`capabilities`) klären |
| D19 | `auth.store.ts:38-43`, `useRole.ts:18-21` | Rollenprüfungen (isAdmin, isStaff …) | G | `useRole` behalten; die Getter im Store entfernen (`AppsView.vue:34, 92` umstellen) |
| D20 | `AppsView.vue:43-50`, `AppsDetailView.vue:96-101` | Freigabe-Status einer App („approved schlägt pending“) | G | `services/app-presentation.service.ts` |
| D21 | `AppsView.vue:79`, `AppsDetailView.vue:193, 369` | ID-Fallback `appId \|\| id \|\| _id` | G | Einmal im API-Mapper normalisieren (`api/app.api.ts`) |
| D22 | `AddAppsView.vue:61-67`, `services/app-presentation.service.ts:7-17` | Icon aus dem App-Namen (die Vorschau zeigt z. B. bei „kali“ ein anderes Icon als der Katalog) | A | Nur `iconForAppName` |
| D23 | `AddAppsView.vue:69-122`, `AppsDetailView.vue:282-324` | Bild-Upload: validieren → Vorschau → Change- und Drop-Handler | G | Composable `useImageUpload()` + Komponente `ImageDropZone` |
| D24 | `LtiCallbackView.vue:44-50`, `SettingsOpenStackView.vue:241-247`; ungefiltert in `LoginView.vue:13` → `useKeycloak.ts:128, 147` | Filter für sichere Weiterleitungsziele (Schutz vor Open Redirect) | A | `safeInternalPath(next, router)` in `utils/`; auch für `returnUrl` anwenden |
| D25 | `useDeploymentResources.ts:61-73`, `InfrastructureVmDrawer.vue:62-72`, `OpenStackResourcePicker.vue:362-374` | HTTP-Status 404 / 412 / 502 → Meldung „OpenStack-Ressource“ | G | `describeOpenStackError(err)` in `utils/http-error.ts` bzw. `services/` |
| D26 | `utils/http-error.ts:63-71` im Vergleich zu `:81-89`, `openstack-credentials.store.ts:21-35`, `AppsDetailView.vue:379-381` | Lesbare Backend-Meldung ermitteln (`message` vs `reason`) | A | Nur `getErrorDetailMessage`; `extractErrorMessage` und `extractError` entfernen |
| D27 | `app.store.ts` (5×: 23-26 … 72-75), `course.store.ts` (5×: 21-24 … 74-77); Vorbild `deployment.store.ts:20-25` | `{ setLoading, setError }`-Kontext für `runRequest` | G | `requestContext()` aus `stores/_request.ts` exportieren |
| D28 | `router/index.ts:120, 134, 157, 168, 229, 235, 244, 253` | `['teacher', 'admin']` als Rollenliste | G | Konstante `STAFF_ROLES`; die 4 Wizard-Routen über eine `wizardRoute()`-Fabrik |
| D29 | `router/index.ts:38-59` im Vergleich zu `NewDeploymentGroupsAssignmentView.vue:126-129`, `NewDeploymentVariableView.vue:301-304`, `deployment.store.ts:174-176` | Vorbedingungen des Wizards. Die Kopien in den Views sind durch den Guard tote Zweige. | G | Nur den Guard behalten |
| D30 | `i18n/index.ts:6`, `AppLayout.vue:65`; `api/axios.ts:69`, `services/auth.service.ts:14, 22, 37` | localStorage-Schlüssel `'locale'` und `'user'` | G | Konstanten; `axios.ts` ruft `AuthService.clearStoredUser()` |
| D31 | `SettingsOpenStackView.vue:57`, `UserView.vue:24-28`, `DeploymentsListView.vue:44-51`; Soll-Stelle ist `utils/format.ts` | Datum formatieren mit festem `'de-DE'` (auch `format.ts:15` ist fest `'de-DE'`, obwohl die App die Sprache wechselt). Der Name `formatDate` meint je nach Datei zwei verschiedene Funktionen. | A | `utils/format.ts` richtet sich nach der i18n-Sprache; Aliasnamen auflösen |
| D32 | `OpenStackResourcePicker.vue:470-481` (lokales `formatBytes`, `formatRam`), `InfrastructureVmCard.vue:100`, `useQuotas.ts:115-116`, `NewDeploymentSummaryView.vue:168`, `FileDropZone.vue:88, 160` | Umrechnung Bytes/MB/GB, jeweils mit anderer Rundung | G | `formatBytes` (mit GB-Stufe) und `formatMegabytes` in `utils/format.ts` |
| D33 | `template_key ?? 'default'` 8× (`deployment.store.ts:238, 280`, `NewDeploymentSummaryView.vue:88, 106`, `NewDeploymentVariableView.vue:238, 259, 324, 369, 470`) | Standard-Template-Schlüssel | G | `templateKeyOf(v)` in `deployment-variables.service.ts` |
| — | `DeploymentsListView.vue:80-104` (Status → Studierenden-Zustand), `DeploymentActiveTaskCard.vue:54-58` (Verbindungs-Badge), Timer 1,5/2/3/5 s, `2 * 1024 * 1024` in `FileDropZone` vs `MAX_IMAGE_BYTES` | ähnlich aussehend, aber andere Bedeutung | Z | so lassen |

### 1b. Templates

| # | Fundstellen | Was ist dupliziert | Art | Vorschlag gemeinsame Stelle |
|---|---|---|---|---|
| T1 | `NewDeploymentVariableView.vue:666-855` (Packer), `:874-1063` (Terraform) | Die gesamte Variablenkarte, rund 190 Zeilen. Unterschiede: nur Formularschlüssel und `accent`. | G | `components/deployment-wizard/VariableFieldCard.vue` (Props `variable`, `formKey`) |
| T2 | innerhalb T1: `:737-774` und `:787-853` (je 2×) | Pro Team / pro Person die Eingaben bzw. Dateifelder, 8× derselbe Warnkasten | G | `ScopedSlotList.vue` (Slot pro Eintrag) |
| T3 | `NewDeploymentSummaryView.vue:622-645` und `:647-670` | Zusammenfassungskarte Packer/Terraform | G | `SummaryVariableCard.vue` |
| T4 | Footer `NewDeploymentConfigView.vue:529-546`, `NewDeploymentGroupsAssignmentView.vue:607-629`, `NewDeploymentVariableView.vue:1070-1099`, `NewDeploymentSummaryView.vue:720-735`; Header `Config:349-356` = `Summary:502-510`, abweichend `Groups:386-394` und `Variable:621-628` | Zurück/Weiter-Leiste und Kopf der Wizard-Schritte (3 Kopf-Designs, 4 Breiten) | G | `WizardStepLayout.vue` (Slots `header` und `footer`, Props `step`, `nextDisabled`). Die einheitliche Breite ist eine UX-Entscheidung. |
| T5 | `DeploymentDeleteModal.vue:22-41`, `DeploymentPauseResumeModal.vue:26-58`, `DeploymentRedeployModal.vue:23-48`, `CoursesView.vue:233-259`, `CourseDetailView.vue:445-471`, `AppsDetailView.vue:720-739` | Bestätigungsdialog (Text + Cancel/Confirm mit Busy-Zustand). Delete hat keinen Busy-Schutz. | G | `components/ui/ConfirmModal.vue` |
| T6 | `AdminAppsView.vue:459-496` und `:499-535`, `AppsDetailView.vue:832-876` | Modal mit Begründungs-Textarea | G | `components/ui/ReasonModal.vue` |
| T7 | `AdminAppsView.vue:238-247`, `AppsDetailView.vue:626-636`, `AddAppsView.vue:295-305`, `VariableInput.vue:97-106` | Toggle-Schalter (2 Geometrien) | G | `components/ui/ToggleSwitch.vue` |
| T8 | `AddAppsView.vue:217-239`, `AppsDetailView.vue:781-815` | Drop-Zone für Bilder (siehe D23); `FileDropZone.vue` stammt laut eigenem Kommentar daraus, wird dort aber nicht genutzt | G | `ImageDropZone.vue` |
| T9 | `AppsDetailView.vue:450-477`, `NewDeploymentConfigView.vue:388-408`, `SettingsOpenStackView.vue:364-380`, `MarkdownEditor.vue:182-203` | Tab-Leiste (4 Implementierungen; in `Config` sehen aktiv und inaktiv gleich aus) | G | `components/ui/TabBar.vue` |
| T10 | `AppsView.vue:92-116` im Vergleich zu `.segment` in `styles/components.css:96-117` | Segment-Control von Hand gebaut | G | vorhandene `.segment`-Klassen nutzen |
| T11 | Spinner in drei Stilen: Loader2 (`DeploymentDetailView.vue:386-389` u. a.), CSS-Kreis (`AppsDetailView.vue:409`, `NewDeploymentSummaryView.vue:521`, `NewDeploymentVariableView.vue:634`, `AdminAppsView.vue:350`, `OpenStackResourcePicker.vue:747`), nur Text (`CourseDetailView.vue:246`, `UserView.vue:38`, `SettingsOpenStackView.vue:281`, `InfrastructureVmDrawer.vue:174`) | Lade- und Leerzustände neben `ui/EntityListState.vue` | G | `EntityListState` um `isError` erweitern und auch für Detailseiten nutzen; eine `Spinner`-Komponente |
| T12 | `SettingsOpenStackView.vue:258-266`, `HelpView.vue:7-15`, `AddAppsView.vue:177`, `CourseDetailView.vue:251-282`, `AppsDetailView.vue:417-447`, `DeploymentDetailHeader.vue:42-45`; Zurück-Links: `AppsDetailView.vue:398`, `CourseDetailView.vue:238`, `DeploymentDetailHeader.vue:35-40` (`<button>` in `RouterLink`, ungültiges HTML), `UserLayout.vue:12-18` | Seitenkopf neben `ui/PageHeader.vue` (4 Überschriftengrößen) | G | `PageHeader` um einen `back`-Prop bzw. einen `leading`-Slot erweitern |
| T13 | `DeploymentTaskHistory.vue:91-95`, `DeploymentTaskDetail.vue:69-73`, `DeploymentsListView.vue:206-212`, `DeploymentDetailHeader.vue:53-57` | Status-Badge (nur der Header übersetzt das Label) | G | `components/ui/StatusBadge.vue` auf Basis von `getStatusStyles` |
| T14 | 6 LTI-/Callback-Views: `LtiLinkView.vue:112-164`, `LtiCourseMapView.vue:173-333`, `LtiDeepLinkView.vue:112-179`, `LtiCallbackView.vue:76`, `LtiSessionExpiredView.vue:15`, `CallbackView.vue:32` | Status-Bildschirm (zentrierte Spalte, Icon, Titel, Text, Fehlerblock) | G | `components/ui/StatusScreen.vue` |
| T15 | `AppsView.vue:144-184`, `CoursesView.vue:151-198`; die Vorschau-Kopie `AddAppsView.vue:313-367` ist schon abgedriftet | Karte im Entitäten-Raster (Icon-Kachel, Titel, Button) | G | `EntityCard.vue` mit Slots; die Vorschau nutzt dieselbe Karte |
| T16 | `AdminAppsView.vue:404-411` = `:436-443` (byte-identisch) | Approve-Button | G | `v-if` zusammenlegen |
| T17 | Unterkarten `InfrastructureVmDrawer.vue:188, 220, 263, 310, 349, 412, 450, 505`; Abschnittskarten `bg-panel rounded-xl border border-subtle p-6 shadow-sm` 9× in `components/deployment/*`, obwohl `ui/Card.vue` dasselbe ist | Section-Shell mit Titelzeile und Zähler | G | `ui/Card.vue` nutzen, dazu `DetailSection.vue` (Icon, Titel, Zähler, Slot) |
| T18 | `text-xs text-fg-muted uppercase tracking-wide mb-1` ~18× (`DeploymentOverviewCards.vue`, `DeploymentTaskDetail.vue` …); 12 gleiche Felder in `SettingsOpenStackView.vue:384-463`; 8 gleiche Feldkarten in `UserView.vue:62-136` | Label/Wert-Felder bzw. Formularfelder | G | `LabeledValue.vue` bzw. `FormField.vue` oder `v-for` über eine Feldkonfiguration |
| T19 | `DeploymentTaskDetail.vue:125-133` = `:199-207`; `DeploymentMemberAccess.vue:62, 78, 102` | Kopieren-Button | G | `CopyButton.vue` |
| T20 | Initialen dreifach unterschiedlich: `DeploymentOverviewCards.vue:105-108`, `AppLayout.vue:188-190`, `CourseDetailView.vue:311-313, 396-398`; Benutzerzeile `CourseDetailView.vue:310-318, 395-403`, `DeploymentTeamsCard.vue:77-86` | Avatar bzw. Benutzerzeile | G | `UserAvatar.vue`, `UserRow.vue` |
| — | `MarkdownEditor` vs `MarkdownRenderer` (der Editor nutzt den Renderer); `DeploymentGroupsCard` vs `DeploymentTeamsCard` (unterschiedliche Datenquellen, fachlich zu klären); Karte vs Akkordeon vs Detail bei den App-Views; die Drag-Zonen des Team-Assignments | ähnlich, aber verschieden | Z | so lassen (Groups/Teams: fachlich klären, ob die Groups-Karte redundant ist) |

## 2. God-Components und Bewertung aller Dateien über ~300 Zeilen

| Datei | Zeilen | Urteil |
|---|---|---|
| `views/NewDeploymentVariableView.vue` | 1 101 | **God-Component**, siehe 2.1 |
| `views/AppsDetailView.vue` | 879 | **God-Component**, siehe 2.2 |
| `components/OpenStackResourcePicker.vue` | 857 | **God-Component**, siehe 2.3 |
| `views/NewDeploymentSummaryView.vue` | 737 | **God-Component**, siehe 2.4 |
| `views/NewDeploymentGroupsAssignmentView.vue` | 632 | **God-Component**, siehe 2.5 |
| `views/NewDeploymentConfigView.vue` | 549 | **God-Component**, siehe 2.6 |
| `views/AdminAppsView.vue` | 538 | **zu groß**, siehe 2.7 |
| `components/InfrastructureVmDrawer.vue` | 526 | zu groß: der Fetch liegt in der Komponente, und die Section-Shell wiederholt sich 8× (T17, D14, D25). Ziel: der Fetch geht als `loadResourceDetail` nach `useDeploymentResources`; die Drawer-Komponente ist rein präsentational; `DetailSection` × 8. Etwa 250 Zeilen erreichbar. |
| `views/SettingsOpenStackView.vue` | 479 | mittel: Die Logik ist schlank (läuft über den Store). Das Template wiederholt 12 Felder (T18). Das Befüllen des Formulars und das Bauen des Payloads (`:60-109, :198-214`) sollten als reine Funktionen nach `services/openstack-credential-form.service.ts`. `confirm()` wird statt `ConfirmModal` genutzt, Datumsformat siehe D31. Die Lock-Prüfung steht 3× (`:112, :155, :171`). |
| `views/CourseDetailView.vue` | 472 | mittel: `userApi` wird direkt aufgerufen (R2), die Suche ist dupliziert (D12), zwei Modals stehen inline (T5). Ziel: `useUserSearch`, `AddMembersModal.vue`, `ConfirmModal`. |
| `views/AddAppsView.vue` | 399 | mittel: `appApi.create` direkt, obwohl `appStore.createApp` existiert (R2). Dazu D22, D23, T7, T15. Die hartkodierte GitHub-URL `:380` weicht vom geladenen, aber ungenutzten `githubAppInstallUrl` (`:50-59`) ab. |
| `layouts/AppLayout.vue` | 391 | **in Ordnung.** Rund 150 Zeilen sind scoped CSS, das Script ist schlank. Nur Kleinigkeiten: `Profil`/`Abmelden` sind hartkodiert, Inline-Styles am Logo `:100-102`, der Schlüssel `'locale'` (D30). |
| `views/DeploymentDetailView.vue` | 389 | **in Ordnung (reiner Orchestrator)**, das Ergebnis des ersten Refactorings. Rund die Hälfte sind Kommentare. Neue Probleme sind **Prop-Drilling** und Benennung, siehe 3 (R-PD). |
| `composables/useDeploymentStream.ts` | 355 | Größe begründet (SSE-Transport plus Parser). Aber: eigenes `fetch` mit Keycloak-Token **ohne den LTI-Zweig** (siehe 3, V2), dazu D16 und D17. Der `parseFrame`-Parser sollte nach `utils/sse.ts`, damit er einzeln testbar ist. |
| `router/index.ts` | 341 | in Ordnung als einzige Routentabelle. Probleme: D28, Pfad-Strings im Guard statt `ROUTE_NAMES` (`:303-334`), `setTimeout(100)` als Warte-Hack (`:294-296`). |
| `views/LtiCourseMapView.vue` | 336 | mittel: komplett ohne i18n, alte Farbpalette (**unsichtbarer Button**), liest `err.response` direkt, `router.replace('/deployments')`. |
| `stores/deployment.store.ts` | 327 | `submitDraft` (`:167-327`, rund 160 Zeilen) ist Mapping-Logik, keine Store-Aufgabe (R1, R10). Ziel: `buildDeploymentPayload(draft)` in `services/deployment-draft.service.ts`, mit D1, D5, D7. Unbenutzte Getter und `courseCache` streichen. |
| `types/index.ts` | 593 | **in Ordnung**, reine Typdeklarationen. Optional nach Domänen aufteilen; keine Priorität. |
| `i18n/locales/de.ts`, `en.ts` | 1 116 / 1 113 | **begründet**, das sind Daten. |
| `src/__snapshots__/HelpView.spec.ts.snap` | 400 | **verwaist** (der echte Snapshot liegt unter `tests/unit/views/__snapshots__/`) → löschen |

### 2.1 `NewDeploymentVariableView.vue` (1 101 Zeilen)
**Verantwortlichkeiten darin:**
1. Laden der Variablen-Definitionen inklusive Deduplizierung (`:358-374`)
2. Vorladen des OpenStack-Caches (`:376-385`)
3. Rehydrierung aus dem Draft (`:306-355`, zwei Pfade)
4. Initialbelegung aus `userInputVar` und Defaults (`:387-436`)
5. Scoped-Slot-Modell pro Team/Person (`:57-119, 181-208`)
6. File-Slot-Verwaltung (`:210-228`)
7. Aufteilen nach Packer-Template (`:234-262`)
8. Normalisierung und Diff gegen Defaults (`:265-297`)
9. Serialisierung in den Draft (`:458-543`, 85 Zeilen, R4)
10. Required-Prüfung (`:552-584`)
11. Abgleich bei Team-Umbenennung (`:589-615`)
12. Tooltip- und Fokus-UI
13. Zwei nahezu identische Karten-Templates (T1, T2)

**Zielstruktur:**
- `services/variable-types.ts`: `isBool`, `isNumber`, `isList`, `splitCsv`, `normalizeValue`, `isEmptyValue`
- `services/variable-form.service.ts` (rein, einzeln testbar):
  - `dedupeDefinitions`
  - `formKeyFor`
  - `slotKeysFor(v, teams)`
  - `seedScopedDefault`
  - `hydrateFormValues(defs, draft)` (führt die beiden Pfade zusammen)
  - `serializeFormValues(defs, values)` → `{ changed, all }`
  - `missingRequired(defs, values, teams)`
  - `reconcileSlots`
  - `formatSlotLabel` (über i18n)
- `composables/useVariableForm.ts`: reaktiver Zustand, `load()`, `next()`, der Watcher für Teams
- `composables/useWizardTeams.ts`: `wizardTeams` aus Draft und `studentCache`; wird auch von der Summary genutzt
- Komponenten:
  - `VariableFieldCard.vue`: Kopf, Marker-Fehler, Tooltip, Badges, Scope-Hinweis, dann Delegation
  - `ScopedVariableInputs.vue`
  - `FileVariableSlots.vue`
  - `VariableSection.vue`: Packer- bzw. Terraform-Spalte mit Template-Gruppierung
- `WizardStepLayout` (T4)
- **Ziel für die View:** rund 150 Zeilen

### 2.2 `AppsDetailView.vue` (879 Zeilen)
**Verantwortlichkeiten darin:**
- Laden von App und Freigaben (direkt über `appApi`, R2)
- Rechte (D18)
- Aufbereitung der Versionsdaten (`:112-149`)
- Deploy-Einstieg in den Wizard
- Einreichen und Zurückziehen einer Version inklusive Mapping 409/422
- Privatsphäre-Toggle
- Bearbeiten-Modal inklusive Bild-Upload (D23)
- Löschen
- Template mit Kopf, Tab-Leiste, Übersicht, Deploy-Sidebar, Store-Tab und Versionstabelle, dazu 3 Modals

**Zielstruktur:**
- `app.store.ts` bekommt `fetchAppById` (vorhanden, bisher ungenutzt), `updateApp`, `deleteApp` sowie neu `fetchApprovals`, `submitVersion`, `withdrawVersion`. Alternativ ein Composable `useAppDetail(appId)`, gemäß Zielregel.
- `services/app-presentation.service.ts`: `versionOptions`, `versionInfo`, `appBannerStatus` (D20)
- Komponenten:
  - `AppDetailHeader.vue`
  - `AppOverviewTab.vue` (Beschreibung, App-Info, `AppVersionInfo`)
  - `AppDeploySidebar.vue`
  - `AppStoreTab.vue` (Banner, Sichtbarkeit mit `ToggleSwitch`, `VersionApprovalTable`)
  - `AppEditModal.vue` (mit `ImageDropZone`)
  - `SubmitVersionModal.vue`
  - `ConfirmModal`
- Toten Zustand `submittingVersion` streichen: er wird nie gesetzt, `:63, 676, 680, 697, 701` lesen ihn nur.
- **Ziel für die View:** rund 150 Zeilen

### 2.3 `OpenStackResourcePicker.vue` (857 Zeilen)
**Verantwortlichkeiten darin:**
1. API-Weiche nach Typ (D13)
2. Anpassung der Rohdaten pro Typ für die Anzeige (`:149-230`)
3. Auswahlmodell für Single/Multi/CSV (`:235-335`)
4. Laden, Refresh und Fehlerabbildung (D25)
5. Freitext-Fallback
6. Eigene Formatierer (D32)
7. Positionierung, Listener und Teleport des schwebenden Dropdowns (`:504-589`)
8. Template für Trigger, Chips, Panel, Suche, Leer-, Fehler- und Ladezustand sowie Footer

**Zielstruktur:**
- `api/openstack-resources.api.ts`: `listByType` (D13)
- `services/openstack-resource-presentation.ts`: `adaptResource(type, raw, t)` und `formatRam`
- `composables/useResourceSelection.ts`: `selectedKeys`, `toggle`, `removeChip`, `normalizeModelValue`
- `composables/useFloatingDropdown.ts`: Position, Flip-up, Listener, Cleanup; generisch und wiederverwendbar
- `composables/useOsResourceList.ts`: `load`, `refresh`, Fehlerzustand, Cache-Priming
- Komponenten: `ResourcePickerTrigger.vue`, `ResourcePickerPanel.vue`
- Totes Emit `credentials-missing` (`:86, :406-409`) und den irreführenden Kommentar `:61-64` entfernen: Weder `VariableInput` noch `NewDeploymentVariableView` hören darauf.
- **Ziel:** rund 250 Zeilen

### 2.4 `NewDeploymentSummaryView.vue` (737 Zeilen)
**Verantwortlichkeiten darin:**
- Laden bzw. Zusammenführen der Variablen als Fallback bei Deep-Link (`:341-443`)
- D1, D2, D5
- Aufbau der Zusammenfassungszeilen (`:96-130, 238-318`)
- Zusammenfassung der Datei-Uploads
- Mapping der Submit-Fehler (`:148-193`)
- Submit mit Sperre gegen Doppelklick
- Template mit 3 Abschnitten, 2 gleichen Variablenkarten (T3), 2 gleichen Namensausdrücken (D10) und hartkodiertem Deutsch (`:681, 691, 695`)

**Zielstruktur:**
- `services/deployment-summary.service.ts`: `toSummaryEntry`, `renderOsValue`, `formatSummaryValue`, `fileVarSummaries`
- `services/deployment-submit-error.service.ts`: `formatSubmitError(err, t)`
- Komponenten: `SummaryVariableCard.vue`, `SummaryTeamsSection.vue`, `SummaryFilesCard.vue`
- `useWizardTeams` (siehe 2.1) und `WizardStepLayout`
- **Ziel:** rund 150 Zeilen

### 2.5 `NewDeploymentGroupsAssignmentView.vue` (632 Zeilen)
**Verantwortlichkeiten darin:**
- Reaktiver Spiegel des Studierenden-Caches (D11)
- Nachladen fehlender Personen über `userApi` direkt (R2)
- Gruppenmodus (one / eachUser / custom)
- Anzahl und Namen der Teams inklusive Default-Namen (D8)
- Drag-and-drop-Zustand
- Verschieben bzw. Entfernen (D9)
- Shuffle (D7)
- Weiter-Freigabe als 1-Zeilen-Ausdruck im Template (`:624`)
- IIFEs für den Anzeigenamen im Template (D10)

**Zielstruktur:**
- `services/team-assignment.service.ts` (rein): `moveStudent`, `removeStudent`, `shuffleInto`, `unassigned`, `canProceed`
- `composables/useTeamAssignment.ts`: Modus, Anzahl, Namen, Watcher
- `composables/useStudentDirectory.ts`: Cache plus Nachladen; wird auch von Config und Summary genutzt
- Komponenten:
  - `StudentChip.vue` (draggable)
  - `TeamDropCard.vue`
  - `UnassignedPool.vue`
  - `GroupModeSelector.vue`
- `WizardStepLayout`
- **Ziel:** rund 180 Zeilen

### 2.6 `NewDeploymentConfigView.vue` (549 Zeilen)
**Verantwortlichkeiten darin:**
- Laden der Kurse und Personen (`courseApi` / `userApi` direkt, R2)
- Mitgliedslisten pro Kurs mit Nebenläufigkeitsgrenze (`:128-161`)
- Studierenden-Cache (D11)
- Auswahl über Kurs bzw. einzeln
- Sync von `courseIds`
- Debounced Suche (D12)
- Validierung für „Weiter“ (D29)
- Credential-Gate
- Tabs (T9)
- Template-**Fehler** bei `keycloak_id` (siehe Abschnitt 0)

**Zielstruktur:**
- `composables/useCourseStudents.ts`: Kurse, Mitglieder-Cache, `loadCounts`, `isCourseSelected`, `toggleCourse`
- `useUserSearch` (D12)
- `useStudentDirectory` (siehe 2.5)
- Komponenten: `CoursePickerList.vue`, `StudentSearchList.vue`, `SelectedStudentsPanel.vue`, `TabBar`, `WizardStepLayout`
- **Ziel:** rund 150 Zeilen

### 2.7 `AdminAppsView.vue` (538 Zeilen)
**Verantwortlichkeiten darin:**
- Laden (`appApi` direkt)
- Zähler-Maps
- Lazy-Accordion
- approve / reject / revoke inklusive lokaler Zustandspatches
- Filter
- Zwei fast gleiche Modals (T6), zweimal derselbe Approve-Button (T16)

`submitRejection` bekommt 8 Parameter (`:158-192`) und lässt sich als Store-Aktion besser schneiden.

**Fehler:** Das Reject-Modal zeigt `rejectTarget.appName`, das immer `''` ist (`:148, :466-467`). Der Parameter `_appName` in `handleApprove` ist ungenutzt.

**Zielstruktur:**
- `composables/useAppApprovals.ts` (bzw. ein Store-Modul): `loadAll`, `loadApprovals`, `approve`, `reject`, `revoke`, `sortedApps`
- Komponenten: `ApprovalAccordionItem.vue`, `VersionApprovalTable.vue` (geteilt mit AppsDetail), `ReasonModal`, `ToggleSwitch`
- **Ziel:** rund 150 Zeilen

## 3. Weitere Regelverstöße

Schweregrad: **hoch** = Fehler oder Sicherheits-/Datenrisiko, **mittel** = Wartbarkeitsrisiko, **niedrig** = Kosmetik.

| # | Datei:Zeile | Regel | Schweregrad | Befund → Vorschlag |
|---|---|---|---|---|
| V1 | `views/NewDeploymentConfigView.vue:460-469, 498, 507` | R5 | **hoch** | Die Auswahl schlüsselt auf `keycloak_id` statt `userId` (Regression, roter Test) → auf `userId` umstellen |
| V2 | `composables/useDeploymentStream.ts:209-220` | R5, R6, AGENTS.md | **hoch** | Eigenes `fetch` und selbst angehängter Keycloak-Token. Der LTI-Zweig und die 401-Behandlung aus `api/axios.ts` fehlen, und `Authorization: ''` wird gesendet → `resolveAuthHeader(url)` aus `api/axios.ts` exportieren und `deploymentApi.streamUrl(id)` nutzen |
| V3 | `views/LtiCourseMapView.vue:181-296`, `views/LtiDeepLinkView.vue:115-172` | R5 | **hoch** | Die Klassen `bg-primary`/`text-primary` gibt es seit dem Rebranding nicht mehr → der Button ist unsichtbar. Dazu Rohfarben `gray`/`amber`/`green` → Tokens (`btn-primary`, `text-fg-muted` …) |
| V4 | `tests/unit/views/NewDeploymentGroupsAssignmentView.spec.ts:305-353`, `NewDeploymentGroupsAssignmentView.vue:536, 556` | R10 | **hoch** | Testids beim Rebranding entfernt, die Tests prüfen die alte Palette → Testids wieder setzen, Tests auf Zustand statt Farbe prüfen lassen, `scale` entfernen |
| V5 | `views/AdminAppsView.vue:148, 466-467` | R8 | mittel | `appName` ist immer leer (sichtbarer Fehler) → echten Namen übergeben |
| V6 | alle 5 `views/Lti*View.vue` (z. B. `LtiCourseMapView.vue:65-103, 148, 177-331`), `LtiLinkView.vue:31-161` u. a. | R5, R7 | mittel | Komplett ohne i18n (hartkodiertes Deutsch). Wenn das Absicht ist (nur Moodle-DE), in AGENTS.md begründen; sonst `lti.*`-Schlüssel anlegen. |
| V7 | `LtiCourseMapView.vue:63, 90, 100`, `LtiDeepLinkView.vue:39, 46, 49`, `LtiLinkView.vue:34, 52` | R6 | mittel | Lesen `err.response` direkt → `getErrorStatus` und ein neues `getErrorCode` in `utils/http-error.ts` |
| V8 | `utils/http-error.ts:81-89` vs `:63-71`; `stores/openstack-credentials.store.ts:21-35`; `AppsDetailView.vue:379-381` | R6 | mittel | 4 Meldungs-Parser (D26); `extractErrorMessage` zeigt Maschinencodes im Toast (`useDeploymentLifecycle.ts:147, 180`) |
| V9 | `stores/_request.ts:56`, `course.store.ts:97, 108, 118`, `deployment.store.ts:106` | R6 | mittel | `getErrorDetail(err) as string` erzeugt `[object Object]` bei strukturiertem `detail` → `getErrorDetailMessage` |
| V10 | `stores/app.store.ts`, `course.store.ts`, `deployment.store.ts` (Feld `error`) | R6, R9 | mittel | `error` wird nirgends angezeigt; die englischen Ersatztexte (`'Failed to …'`) sind totes Wissen → Konzept festlegen: Store-Aktionen werfen weiter, die View bzw. das Composable zeigt einen Toast über `t()`. Dann Feld und Ersatztexte entfernen oder durch i18n-Schlüssel ersetzen. |
| V11 | `composables/useDashboard.ts:23-25` + `views/DashboardView.vue:45` | R6 | mittel | Das Promise wird verworfen: `fetchStats()` ohne `await`/`catch` → unbehandelte Rejection |
| V12 | 13 View-Importe aus `@/api/*` (u. a. `AddAppsView.vue:7`, `AppsDetailView.vue:5`, `AdminAppsView.vue:14`, `AppsView.vue:11`, `CoursesView.vue:10`, `CourseDetailView.vue:7`, `NewDeployment{Config,GroupsAssignment}View.vue`, `Lti{CourseMap,DeepLink}View.vue`) | R2, AGENTS.md | mittel | Gegen die Zielregel `View → (Store \| Composable) → api`. Die vorhandenen `appStore`-Aktionen sind ungenutzt. `CoursesView.vue:37-50` macht N+1 Aufrufe von `listMembers`. |
| V13 | `components/InfrastructureVmDrawer.vue:18, 49-81` | R2 | mittel | Präsentationskomponente mit eigenem API-Fetch → Fetch nach `useDeploymentResources` |
| V14 | `views/DeploymentDetailView.vue:137-148, 257-269` → `DeploymentActiveTaskCard.vue` (10 Props, davon 2 Phasen-Indizes `streamCurrentPhaseIndex`/`currentPhaseIndex`); `DeploymentInfrastructureSection` (7 Props, 2 Ebenen); `DeploymentTaskHistory` → `DeploymentTaskDetail` (3 Props, 2 Ebenen); `DeploymentTeamsCard` bekommt `teams` **und** `enrichedTeams` | R1, R7 (neu durch Refactoring 1) | mittel | Prop-Drilling → das Stream-Ergebnis als ein Objekt übergeben (`:stream="liveStream"`) oder per `provide`/`inject` wie bei der Zwischenablage. `activeStepIndex` nicht in `currentPhaseIndex` umbenennen. `teams` entfernen. |
| V15 | `DeploymentDeleteModal.vue`, `DeploymentRedeployModal.vue`, `DeploymentPauseResumeModal.vue` (je 42–59 Zeilen, je 1 Nutzung) | R1, R3 (neu durch Refactoring 1) | niedrig | Zu kleinteilig und dreifach gleich → `ConfirmModal` (T5). Delete bekommt dabei den fehlenden Busy-Schutz. |
| V16 | `router/index.ts:294-296` | R5, R9 | mittel | `setTimeout(100)` wartet auf die Auth → auf ein `authStore.ready`-Promise warten |
| V17 | `router/index.ts:303-334`, `api/axios.ts:58, 72`, `LtiCallbackView.vue:33, 62`, `LtiCourseMapView.vue:140`, `LtiLinkView.vue:78, 97` | R5 | niedrig | Pfad-Strings statt `ROUTE_NAMES` |
| V18 | `components/ui/BaseButton.vue:20-43` | R7 | niedrig | Die Varianten `green` → `btn-secondary` und `yellow` → `btn-primary` sind irreführend; es gibt keinen `size`-Prop, deshalb bauen Aufrufer rohe Buttons. Varianten in `secondary` umbenennen, `yellow` streichen, `size` ergänzen. |
| V19 | `views/NewDeploymentSummaryView.vue:681, 691, 695`, `NewDeploymentVariableView.vue:189-204, 663`, `AppLayout.vue:37, 111, 152, 211, 219`, `DeploymentRedeployModal.vue:25-44`, `DeploymentInfrastructureSection.vue:50, 68-139`, `DeploymentOverviewCards.vue:28`, `DeploymentMemberAccess.vue:58, 88`, `InfrastructureVmCard.vue:52, 100, 175-181`, `InfrastructureVmDrawer.vue:281, 389, 394`, `ui/Modal.vue:27, 33`, `ui/ScopeBadge.vue:24, 28`, `UserView.vue` (`'N/A'` 8×), `CallbackView.vue:21-44`, `deployment.store.ts:175` | R5, R7 | mittel | Hartkodierte Texte an i18n vorbei; Status wird roh angezeigt (`DeploymentTaskHistory.vue:94`, `DeploymentTaskDetail.vue:72`, `DeploymentsListView.vue:211`) |
| V20 | `NewDeploymentConfigView.vue:180, 227, 361-363, 479, 509`, `AppsDetailView.vue:769, 773`, `DeploymentOverviewCards.vue:33`, `NewDeploymentGroupsAssignmentView.vue:550, 593` | R7 | niedrig | i18n-Schlüssel fremder Views (`CourseDetailView.*`, `AppsDetailView.*` …) koppeln Views aneinander → gemeinsame Schlüssel (`common.*`, `deployment.*`) |
| V21 | `components/VariableInput.vue:15-19, 27, 33-35, 72-76` | R8, R9 | niedrig | Der Prop `accent` ist tot (die Klasse ist konstant), der Doc-Kommentar zu blau/lila ist veraltet, `props` ist ungenutzt (**Lint-Fehler**) → Prop und Kommentar entfernen |
| V22 | `views/NewDeploymentVariableView.vue:20` (`// Plus - removed`), `:53` (Alias `effectiveScope`), `:128` (Parameter `_subnet` ungenutzt), `:591` (`_newTeams, _oldTeams`) | R8 | niedrig | Toter bzw. auskommentierter Code |
| V23 | `views/AppsDetailView.vue:63` (`submittingVersion` wird nie gesetzt), `AdminAppsView.vue:126` (`_appName`), `AddAppsView.vue:50-59` (`githubAppInstallUrl` geladen, nie gerendert) | R8, R9 | niedrig | Toter Zustand bzw. ein unnötiger Request |
| V24 | `api/auth.api.ts` (ganze Datei), `components/RoleGate.vue` (Kommentar in `DashboardView.vue:115` behauptet eine Nutzung), `assets/vue.svg`, `src/__snapshots__/HelpView.spec.ts.snap`, `views/DeploymentsView.vue:1-3` (leeres Script) | R8 | niedrig | Tote Dateien |
| V25 | `useRole.ts:24-36` (7 `can*`-Helfer), `auth.store.ts:36-43, 163` (Getter und `hasRole`), `app.store.ts:15, 33, 44, 56, 71`, `deployment.store.ts:62, 67-81` (`courseCache`, `myDeployments`, `deploymentsByStatus`, `draftAppDetails`), `useTheme.ts:6`, `deployment-lifecycle.service.ts:28` | R8, R9 | niedrig | Ungenutzte Exporte, Getter und Aktionen. Ausnahme: Die `appStore`-Aktionen werden durch V12 **benutzt statt gelöscht**. |
| V26 | `composables/useAuth.ts`, `composables/useToast.ts` | R9 | niedrig | Reine 1:1-Fassaden. `useAuth` hat einen einzigen Nutzer (`AppLayout.vue:30`, nur `logout`) → streichen. `useToast` ist harmlos; es bleibt als stabiler Einstiegspunkt. |
| V27 | `app.store.ts:89` | R7 | niedrig | `import` am Dateiende (wegen Zirkularität) → Getter `myApps` entfällt (V25), damit auch der Import |
| V28 | `DeploymentDetailHeader.vue:35-40` | — | niedrig | `<button>` in `RouterLink`: verschachtelte interaktive Elemente sind ungültiges HTML |
| V29 | `views/CourseDetailView.vue:13, 32`, `CoursesView.vue:11, 27`, `AddAppsView.vue:8` | R8 | niedrig | Gerüst-Kommentare („i18n importieren“) |
| V30 | Tests liegen teils in `tests/unit/**`, teils in `src/**/__tests__/` | R10 | niedrig | Ablageort vereinheitlichen (Entscheidung nötig, kein Blocker) |
| V31 | `utils/format.ts:64` (`MAX_IMAGE_BYTES` in `format.ts`, genutzt von `utils/file.ts`) | R1 | niedrig | Konstante nach `utils/file.ts` verschieben |

## 4. Refactoring-Plan

Grundsätze für jeden Schritt:
- Ein Schritt ergibt einen PR bzw. Commit im Frontend-Repo.
- Vor dem Merge: `vitest --run`, `eslint .` und `vue-tsc -b` im Container grün.
- Die Coverage fällt nicht unter `vitest.config.ts` (derzeit 30 %).
- Wo die bestehenden Tests die Logik nicht abdecken, kommt **zuerst** ein
  Charakterisierungstest (im selben PR, als eigener Commit vor der Änderung).
- Verhalten ändert sich nur in Schritt 0 und 1: das sind Fehlerbehebungen, als solche benannt.
- Reihenfolge nach Risiko und Nutzen: erst die Fehler, dann reine Helfer, dann die großen
  Zerlegungen.

| Nr. | Schritt | Betroffene Dateien | Absicherung |
|---|---|---|---|
| **0** | **Baseline grün (Fehlerbehebung).** Auswahl in `Config` wieder auf `userId` (V1). Testids für die Drop-Zonen wieder setzen, Tests auf den Zustand statt auf `bg-emerald-50` umstellen, `scale-[1.02]` entfernen (V4). Lint-Fehler in `VariableInput` beheben (V21). | `NewDeploymentConfigView.vue`, `NewDeploymentGroupsAssignmentView.vue`, `VariableInput.vue`, `tests/unit/views/NewDeployment{Config,GroupsAssignment}View.spec.ts` | Die 5 roten Tests werden grün; die Drag-Tests prüfen weiter dieselbe Absicht (Hervorhebung bleibt über Kindelementen) |
| **1** | **Sichtbare Fehler in LTI und Stream.** `bg-primary` u. a. auf Tokens umstellen (V3). Den SSE-Stream über `resolveAuthHeader` aus `api/axios.ts` führen, inklusive LTI-Zweig und 401 → `/lti/expired` (V2). Reject-Modal-Name (V5). `fetchStats`-Rejection abfangen (V11). | `LtiCourseMapView.vue`, `LtiDeepLinkView.vue`, `api/axios.ts`, `api/deployment.api.ts`, `useDeploymentStream.ts`, `AdminAppsView.vue`, `DashboardView.vue` | Bestehende Specs `LtiCourseMapView`, `LtiDeepLinkView`, `useDeploymentLiveStream.test.ts`, `DeploymentDetailView.characterization.spec.ts`. **Neu:** Unit-Test für `resolveAuthHeader` (LTI aktiv / Keycloak / `/lti/link`), ein Test „Stream sendet LTI-Token“, ein AdminApps-Test „Modal zeigt App-Namen“ |
| **2** | **Toten Code entfernen** (V21–V25, V27, V29, verwaister Snapshot, `useAuth`). Die `appStore`-Aktionen noch **nicht** löschen. | siehe V21–V29 | Nur Löschungen; `vue-tsc` findet übersehene Importe; alle Tests bleiben grün |
| **3** | **Reine Helfer mit Tests** (keine Verhaltensänderung): `services/variable-types.ts` (D3, D4), `utils/user-display.ts` (D10), `services/deployment-draft.service.ts` mit `resolveReleaseVersion`, `distributeEvenly`, `defaultTeamName` (D1, D7, D8), `parseUserInputVar` exportieren (D2), `templateKeyOf`/`resolvePackerValue` (D5, D33), `utils/format.ts` erweitern (D31, D32), `DEFAULT_PHASE_COUNT` und `isTerminalTaskStatus` (D16, D17), `safeInternalPath` (D24). Danach die Aufrufer umstellen. | neue `services/*` und `utils/*`; Aufrufer in den 4 Wizard-Views, `deployment.store.ts`, `VariableInput.vue`, `OpenStackResourcePicker.vue`, `useDeploymentStream.ts`, `SettingsOpenStackView.vue`, `LtiCallbackView.vue`, `LoginView.vue` | **Zuerst** Unit-Tests der neuen Helfer mit den heutigen Ein- und Ausgaben **jeder** Kopie. Bei den abweichenden Kopien (D1, D8, D24) das Soll festlegen und im PR-Text nennen. Die Wizard-Specs (`NewDeployment*View.spec.ts`, `deployment.store.test.ts`) müssen unverändert grün bleiben. |
| **4** | **Einheitliche Fehlerbehandlung** (R6): `getErrorCode` ergänzen, `extractErrorMessage` und `extractError` durch `getErrorDetailMessage` ersetzen (D26), Casts reparieren (V9), `describeOpenStackError` einführen (D25), die LTI-Views auf die Helfer umstellen (V7), das Konzept für das Store-Feld `error` festlegen und `requestContext` teilen (V10, D27) | `utils/http-error.ts`, `stores/_request.ts`, `app.store.ts`, `course.store.ts`, `deployment.store.ts`, `openstack-credentials.store.ts`, `useDeploymentLifecycle.ts`, `useDeploymentResources.ts`, `InfrastructureVmDrawer.vue`, `OpenStackResourcePicker.vue`, `Lti*View.vue` | `utils/__tests__/http-error.test.ts` erweitern (`getErrorCode`, `describeOpenStackError`); `SettingsOpenStackView.spec.ts`, `useDeploymentLifecycle.test.ts`, `useDeploymentResources.test.ts` bleiben grün. Die geänderten Toast-Texte (Code → lesbarer Text) sind gewollt und stehen im PR. |
| **5** | **Single Source of Truth für Status und Rollen:** `getStatusStyles` bekommt `iconClass` und wird in List, Header und History genutzt (D15), `StatusBadge` (T13), Status-Labels übersetzen, `lifecycleTone` (D14), `STAFF_ROLES` plus `wizardRoute()` im Router (D28), Pfade → `ROUTE_NAMES` (V17), `useRole` als einzige Rollenstelle (D18, D19). Die Deployment-Regel „Admin vs. Staff“ **vorher mit dem Backend klären.** | `utils/deployment-status-styles.ts`, `DeploymentsListView.vue`, `DeploymentDetailHeader.vue`, `DeploymentTaskHistory.vue`, `DeploymentTaskDetail.vue`, `useVmPresentation.ts`, `InfrastructureVm{Card,Drawer}.vue`, `router/index.ts`, `useRole.ts`, `auth.store.ts`, `AppsView.vue`, `AppsDetailView.vue` | `deployment-status-styles.test.ts` erweitern; `tests/unit/router/routes.spec.ts` (Tabelle gleich, deshalb Snapshot vorher ergänzen); `DeploymentsListView{,.roles}.spec.ts`; Snapshots der `DeploymentDetailView.characterization.spec.ts` (bewusst aktualisieren, Diff nur Label und Farbe) |
| **6** | **UI-Bausteine** (präsentational, Props rein, Events raus): `ConfirmModal` (T5, V15), `ReasonModal` (T6), `ToggleSwitch` (T7), `TabBar` (T9), `ImageDropZone` + `useImageUpload` (T8, D23), `CopyButton` (T19), `PageHeader` mit `back`-Prop (T12), `EntityListState` mit `isError` (T11), `BaseButton` mit `size` und bereinigten Varianten (V18) | `components/ui/*`; Nutzung in den genannten Views und Deployment-Modals | Pro Baustein ein Komponenten-Test (rendert, emittiert). `tests/unit/components/DeploymentModals.spec.ts` bleibt grün (die Emits `close`/`confirm` bleiben gleich). Die View-Specs der Nutzer bleiben grün. |
| **7** | **`NewDeploymentVariableView` zerlegen** (2.1) | View, neue `services/variable-form.service.ts`, `composables/useVariableForm.ts`, `useWizardTeams.ts`, `components/deployment-wizard/*` | **Vorher** `NewDeploymentVariableView.spec.ts` (235 Zeilen) um Charakterisierungsfälle ergänzen: Rehydrierung single und multi image, Scoped-Seed, `handleNext` → exakter `draft.variables`/`userInputVar`-Snapshot, Required-Gating, Team-Rename. Dann umbauen, der Snapshot bleibt identisch. Service-Tests für `hydrate` und `serialize`. |
| **8** | **`NewDeploymentSummaryView` zerlegen** (2.4) und `WizardStepLayout` für alle 4 Schritte (T4, zunächst **ohne** Breiten-Vereinheitlichung) | View, `services/deployment-summary.service.ts`, `deployment-submit-error.service.ts`, Summary-Komponenten, `WizardStepLayout.vue` | Summary-Spec um einen Snapshot der gerenderten Zeilen sowie Fälle für die Submit-Fehler ergänzen (vorher); Service-Tests für `formatSubmitError` (5 reasons) |
| **9** | **`deployment.store.submitDraft` → `buildDeploymentPayload`** (Store-Teil von 2.x) | `deployment.store.ts`, `services/deployment-draft.service.ts` | **Vorher** `deployment.store.test.ts` um Payload-Snapshots erweitern: single image, multi image, scoped, leere Werte, Dateien, Team-Fallback. Danach dieselben Snapshots gegen die reine Funktion. |
| **10** | **Team-Assignment und Config zerlegen** (2.5, 2.6): `useStudentDirectory` (D11), `useUserSearch` (D12, auch in `CourseDetailView`), `useCourseStudents`, `team-assignment.service.ts` | 2 Wizard-Views, `CourseDetailView.vue`, neue Composables und Komponenten | Die bestehenden Specs (378 + 359 Zeilen) decken Auswahl, Suche und Drag ab. Ergänzen: Shuffle-Verteilung und Moduswechsel. Service-Tests für `moveStudent`/`shuffleInto` (Zufall über injizierbares `random`). |
| **11** | **App-Views über Store/Composable** (V12): `app.store` nutzt die vorhandenen Aktionen, `useAppDetail`, `useAppApprovals`; `AppsView`, `AddAppsView`, `LtiDeepLinkView` umstellen; D20–D22 | `app.store.ts`, `app.api.ts` (ID-Normalisierung), `AppsView.vue`, `AddAppsView.vue`, `AppsDetailView.vue`, `AdminAppsView.vue`, `LtiDeepLinkView.vue` | `app.store.test.ts` erweitern; `AppsView.spec.ts`, `AddAppsView.spec.ts`, `AppsDetailView.spec.ts`, `LtiDeepLinkView.spec.ts` grün. Die Mocks verschieben sich von `appApi` auf den Store bzw. bleiben auf `appApi` (die Specs mocken die API-Ebene, deshalb stabil). |
| **12** | **`AppsDetailView` und `AdminAppsView` zerlegen** (2.2, 2.7) | Views plus `components/app/*` | Vorher `AppsDetailView.spec.ts` um Fälle ergänzen: Store-Tab, Submit 409/422, Edit-Payload nur mit geänderten Feldern. AdminApps bekommt eine **neue** Spec (heute keine): approve, reject, revoke und Filter. |
| **13** | **`OpenStackResourcePicker` zerlegen** (2.3): `listByType` (D13), `adaptResource`, `useResourceSelection`, `useFloatingDropdown`; totes Emit weg | Picker, `api/openstack-resources.api.ts`, `useOpenStackResourceCache.ts`, neue Composables und Services | **Heute ohne eigene Spec → zuerst** eine Charakterisierungs-Spec: Single/Multi-Auswahl, CSV-Normalisierung beim Mount, Freitext, 412/502-Zustände, Refresh-Warnung. Service-Tests für `adaptResource` pro Typ. |
| **14** | **Deployment-Detail entschlacken** (V13, V14): Drawer-Fetch nach `useDeploymentResources`, `DetailSection`, Stream-Zustand als ein Objekt bzw. per `provide`, `teams`-Prop weg | `DeploymentDetailView.vue`, `DeploymentActiveTaskCard.vue`, `DeploymentTeamsCard.vue`, `InfrastructureVmDrawer.vue`, `useDeploymentResources.ts` | `DeploymentDetailView.characterization.spec.ts` (1 282 Zeilen, 4 Snapshots) muss **ohne Snapshot-Änderung** grün bleiben; `useDeploymentResources.test.ts` bekommt einen Fall für den Detail-Fetch |
| **15** | **LTI-Views und i18n** (V6, V19, V20, T14): `StatusScreen`, `lti.*`-Schlüssel (falls gewünscht), hartkodierte Texte übrige Views, gemeinsame Schlüssel statt fremder View-Namespaces | `Lti*View.vue`, `CallbackView.vue`, Komponenten aus V19, `i18n/locales/*` | LTI-Specs prüfen heute teils deutsche Texte → auf `data-testid` oder i18n-Schlüssel umstellen (vorher). Optional ein Test auf Schlüssel-Parität `de`/`en`. |
| **16** | **Rest und Aufräumen:** `SettingsOpenStackView` (Form-Service, `FormField`, `ConfirmModal` statt `confirm()`), Router-`ready`-Promise statt `setTimeout` (V16), localStorage-Konstanten (D30), `MAX_IMAGE_BYTES` verschieben (V31), Test-Ablageort (V30), AGENTS.md um die Zielregel `View → (Store \| Composable) → api` präzisieren, Coverage-Schwelle anheben | `SettingsOpenStackView.vue`, `router/index.ts`, `auth.store.ts`, `i18n/index.ts`, `AppLayout.vue`, `AGENTS.md`, `vitest.config.ts` | `SettingsOpenStackView.spec.ts` (505 Zeilen) grün; Router-Guard-Test für „Navigation wartet auf Auth“ (vorher); die Coverage-Schwelle auf knapp unter den Ist-Wert |

**Offene Entscheidungen** (vor den jeweiligen Schritten klären, sie blockieren das Review nicht):
1. **Schritt 5:** Darf bei Deployments „Admin oder Owner“ bedienen oder „Staff oder Owner“ (D18)? Maßgeblich ist das Backend.
2. **Schritt 8:** Sollen die Wizard-Schritte eine einheitliche Breite und einen einheitlichen Kopf
   bekommen? Das ist eine UX-Änderung und gehört nicht in das Refactoring.
3. **Schritt 15:** Sind die LTI-Views bewusst nur deutsch?
4. **Fachlich:** Ist die `DeploymentGroupsCard` neben der `DeploymentTeamsCard` redundant?
5. **Schritt 16:** Sollen Tests künftig unter `tests/unit/` oder neben dem Code liegen?

## 5. Umsetzungsstand

Stand 28.09.2026, Branch `refactor/second_review`. Nach jedem Commit waren `vitest --run`, `eslint .` und `vue-tsc -b` grün; zuletzt 939 Tests, Coverage 91 / 86 / 73 / 91 %.

| Schritt | Status | Commits |
|---|---|---|
| 0 Baseline grün | erledigt | `955100b` (Auswahl über `userId`), `04f5a66` (Drop-Zonen-Fix), `44a2675` (Lint) |
| 1 Sichtbare Fehler | erledigt | `c1d6ae2` (LTI-Tokens), `3b53a43` (Stream-Auth über `api/axios`), `8b186a2` (Reject-Dialog), `acdecee` (Dashboard-Ladefehler) |
| 2 Toter Code | erledigt | `77fdcb4` |
| 3 Reine Helfer | erledigt | `561b8d6` (D3, D4), `8cc62c0` (D10), `55e14bc` (Charakterisierungstests `submitDraft`), `a43fc76` (D1, D7, D8), `13db0ae` (D2), `2fe8cf1` (D5, D33), `eec4dca` (D16, D17), `c694e40` (D24), `c401b18` (D31 teilweise, D32 teilweise) |
| 4 Einheitliche Fehlerbehandlung | erledigt | `fc9fd16` (V9), `2a3f738` (V7), `1c1150a` (D26, V8), `2dbcde8` (D25), `05f6dac` (D27) |
| 5 Single Source of Truth Status/Rollen | erledigt | `3451e95` (Lifecycle-Buttons nur für Owner/Admin), `34d6247` (D15, T13), `8d11e85` (D14), `9a40bf8` (Charakterisierung Router), `64c7478` (D28, V17), `4d91fc9` (D18 App-Teil, D19, D20), `ee19486` (D22) |
| 6 UI-Bausteine | erledigt | `60db13c` (V18 `BaseButton`), `817e3d6` (T5, V15 `ConfirmModal`), `7198eb3` (Charakterisierung Begründungs-Dialoge), `a2b7257` (T6 `ReasonModal`), `7b9bb7d` (Charakterisierung Schalter), `7695cdf` (T7 `ToggleSwitch`), `ffcc2ed` (T9 `TabBar`), `dbee14d` (Charakterisierung Bild-Upload), `c05fab9` (T8, D23 `ImageDropZone` + `useImageUpload`), `6bde16f` (T19 `CopyButton`), `a9f4308` (T12 `BackLink`), `37d2648` (T12 `PageHeader` mit Icon), `fb7462d` (T11 `Spinner` + `EntityListState` mit Fehlerzustand) |
| 7 `NewDeploymentVariableView` zerlegen | erledigt | `9b38a5b` (Charakterisierung), `5c5783a` (Logik → `services/variable-form.service`, `useVariableForm`, `useWizardTeams`), `15e3b56` (T1, T2 `VariableFieldCard`) |
| 8 `NewDeploymentSummaryView` + `WizardStepLayout` | erledigt bis auf `WizardStepLayout` (wartet auf UX-Entscheidung) | `1974c36` (Charakterisierung), `1db8c9c` (Services `deployment-summary`, `deployment-submit-error`), `b22131f` (T3 `SummaryVariableCard`, V19 Datei-Karte), `5c7d659` (leerer Wert als „-“) |
| 9 `submitDraft` → `buildDeploymentPayload` | erledigt | `55e14bc` (Charakterisierung), `6cd3114` (reine Funktion in `services/deployment-draft.service.ts`) |
| 10 Team-Assignment + Config | erledigt | `ddfde0d` (Charakterisierung), `4ca75c8` (`team-assignment.service`, `useTeamAssignment`, `useStudentDirectory`, Karten), `27d3181` (`useUserSearch`, `useCourseStudents`, auch `CourseDetailView`), `fe0dea9` (Config-Komponenten) |
| 11 App-Views über Composables | erledigt | `32ffc83` (`useAppCatalog`, `useNewApp`, `useAppDetail`, `useAppApprovals`; ungenutzte `appStore`-Aktionen entfernt; D21), `3fea790` (`useCourseMemberCounts`) |
| 12 `AppsDetailView` + `AdminAppsView` zerlegen | erledigt | `d03c012` (Charakterisierung), `dd832f8` (Versions-Service + 6 Komponenten in `components/app/`), `11ea62a` (`ApprovalAccordionItem`, T16) |
| 13 `OpenStackResourcePicker` zerlegen | erledigt | `041487a` (neue Charakterisierungs-Spec), `2c3cc3f` (`listOsResources` D13, Service, `useOsResourceList`, `useFloatingDropdown`), `9572205` (Panel-/Auswahl-Komponenten) |
| 14 Deployment-Detail entschlacken | erledigt bis auf `DetailSection` (T17, UX) | `607e14f` (Drawer-Fetch nach `useDeploymentResources`, V13), `1405dd6` (`live`-Objekt statt neun Stream-Props, `teams`-Prop weg, V14) |
| 15 LTI-Views und i18n | teilweise: Datenfluss und V19 außerhalb LTI erledigt; LTI-Texte/`StatusScreen` warten auf offene Frage 3 | `96aacd5` (Profilmenü, Live-Karte, `UserView`-Fallbacks übersetzt), `4e1ec6c` (`useLtiCourseMapping`, `useLtiDeepLink`) |
| 16 Rest und Aufräumen | erledigt bis auf den Test-Ablageort (offene Frage 5) | `a93250c` (D30 Storage-Keys, V31), `585ac80` (V16 `whenSettled` statt `setTimeout`), `2efb8fa` (Credential-Form-Service, `ConfirmModal`), `dbb44d3` (Coverage-Ratsche 89/84/71/89), `9203aaf` (V17), `19dcccd` (AGENTS.md-Regel) |

**Nachträge zum Befund:**
- **Merge-Verluste.** Die Regressionen aus Abschnitt 0 waren kein Einzelfall. Der Merge `69acb32` hat in drei Dateien den Template-Teil bereits gemergter Fixes auf den alten Stand zurückgesetzt:
  - `d14d17c` (`userId` im Wizard)
  - `6aefaa6` (Drop-Zonen)
  - `1a0acf2` (GitHub-App-Hinweis; die Create-Seite zeigte dadurch den rohen i18n-Schlüssel `AppsCreateView.info.inviteText`)

  Eine Suche über alle Commits seit dem 10.09., deren hinzugefügte Zeilen im aktuellen Stand fehlen, hat keine weiteren Verluste ergeben. Die übrigen Treffer sind spätere, gewollte Umbauten.
- **D8** ist nur teilweise zusammengeführt. Store und Variablen-Schritt teilen jetzt `fallbackTeamName` (`Team-n`); der Name ist dort ein Slot-Schlüssel. Die i18n-Vorgabe `Team #n` im Team-Schritt (vom Nutzer editierbar) und `Gruppe n` in `deployment-input.service` (Anzeige alter Deployments) bleiben bewusst getrennt.
- **D24:** Der Keycloak-Callback (`CallbackView`) hat das `returnUrl` bisher ungeprüft an den Router übergeben; jetzt gilt dort derselbe Filter wie an den anderen beiden Stellen.
- **D31 offen:** `utils/format.ts` formatiert weiter fest mit `de-DE`, auch wenn die App auf Englisch steht. Das zu ändern ist eine sichtbare Verhaltensänderung und mehrere Tests prüfen deutsche Datumsformate — eigene Entscheidung.
- **D32 offen:** Die RAM-Umrechnungen (`InfrastructureVmCard`, `useQuotas`, `formatRam` im Picker) runden weiterhin unterschiedlich.
- **Schritt 4, Verhaltensänderungen (gewollt):** Toasts und Fehlertexte zeigen keine Maschinencodes (`deployment_busy`) und keine rohen axios-Texte („Request failed with status code 500“) mehr, sondern die Meldung des Backends oder den übersetzten Text der jeweiligen Stelle. Der Schlüssel `redeployBusy` heißt jetzt `lifecycleBusy`, weil er auch für Löschen/Pausieren gilt.
- **V10 offen:** Die englischen Ersatztexte in `runRequest`-Aufrufen (`'Failed to …'`) stehen weiter im Store-Feld `error`, das außer in `CoursesView` (nur als Boolean) niemand anzeigt. Der Credentials-Store speichert jetzt nur noch die Backend-Meldung; für die übrigen Stores ist das mit Schritt 11 zu entscheiden, wenn die App-Views über den Store laufen.
- **D18 geklärt (Schritt 5):** Das Backend kennt zwei Regeln — *einsehen* (`can_view_deployment_owner`: Admin, Owner, Lehrkraft des Kurses) und *bedienen* (`can_operate_deployment`: nur Admin oder Owner). Das Frontend hatte beides unter „Staff oder Owner“ zusammengelegt; eine Lehrkraft sah bei fremden Deployments Löschen/Pausieren/Redeploy und bekam 403. `useDeploymentOwnerView` liefert jetzt zusätzlich `canOperate`.
- **Schritt 5, sichtbar:** Deployment-Liste, Task-Historie und Task-Detail zeigen den Status übersetzt statt als Rohwert (`success` → „erfolgreich“); die Status-Badge der Liste hat jetzt die kompakte Größe der Historie. Die Vorschau auf der Create-Seite zeigt dasselbe Icon wie der Katalog.
- **Schritt 6, `BaseButton` (V18):** Varianten heißen `primary | secondary | danger | ghost` (vorher `yellow`/`green`/`red`), neuer Prop `size` (`sm` = `px-4 py-2`, `md` = Standard). Die rohen `px-4 py-2`-Buttons in den drei LTI-Views und in `SettingsOpenStackView` laufen jetzt über `BaseButton size="sm"`; ihre Schrift ist dadurch `text-sm`. Aufrufer, die `BaseButton` per `class="px-4 py-2"` verkleinern wollten (`DeploymentDetailHeader`, `AppsDetailView`), sind unverändert — ob die Klasse dort überhaupt greift, hängt an der Tailwind-Reihenfolge und ist ungeprüft; bei Gelegenheit auf `size="sm"` umstellen und im Browser vergleichen.
- **Schritt 6, `ConfirmModal` (T5, V15):** Alle sechs Ja/Nein-Dialoge laufen über `components/ui/ConfirmModal.vue`; während `busy` lässt sich der Dialog nicht schließen. Die drei `Deployment*Modal.vue` bleiben als dünne Hüllen (ihre Spec prüft sie direkt). **Fehlerbehebung:** Deployment löschen hatte keinen Busy-Schutz, ein Doppelklick schickte zwei DELETEs → `deleteBusy` in `useDeploymentLifecycle`. **Sichtbar:** Die Kurs-Dialoge (Kurs löschen, Mitglied entfernen) haben keinen roten, größeren Titel mehr. Neuer i18n-Schlüssel `action.cancel`; die verwaisten `CoursesView.deleteModal.cancel`, `CourseDetailView.removeModal.cancel`, `DeploymentDetailView.cancelButton` sind entfernt.
- **Schritt 6, `ReasonModal` (T6):** Reject/Revoke (`AdminAppsView`) und Einreichen (`AppsDetailView`) laufen über `components/ui/ReasonModal.vue` (= `ConfirmModal` + Textarea; `ConfirmModal` hat dafür `confirmDisabled`). **Sichtbar:** Der Reject-Titel ist nicht mehr rot; während der Anfrage steht auf dem Button das normale Label statt `...`. Verwaiste Schlüssel `AdminAppsView.rejectModal.cancel` / `revokeModal.cancel` entfernt.
- **Schritt 6, `ToggleSwitch` (T7):** Sichtbarkeit (`AppsDetailView`), „Alle Versionen einreichen“ (`AddAppsView`), Admin-Filter (`AdminAppsView`, `size="sm"`) und die Bool-Eingabe (`VariableInput`) laufen über `components/ui/ToggleSwitch.vue`, jetzt mit `role="switch"`/`aria-checked`/`aria-label`. **Sichtbar:** Die Bool-Eingabe im Variablen-Schritt hat jetzt die Standardgröße (größerer Knopf).
- **Schritt 6, `TabBar` (T9):** Tabs in `AppsDetailView`, `NewDeploymentConfigView` und `SettingsOpenStackView` laufen über `components/ui/TabBar.vue` (generisch über den Schlüsseltyp; Typ `Tab` in `components/ui/tab.ts`). **Sichtbar:** Im Wizard-Schritt 1 ist der aktive Tab jetzt erkennbar; alle drei Leisten haben dieselbe Größe. `MarkdownEditor` behält bewusst seine eigene, kompakte Leiste (teilt sie mit der Formatierungs-Toolbar) — Rule of Three erfüllt ohne ihn.
- **Schritt 6, `ImageDropZone` + `useImageUpload` (T8, D23):** Logo auf der Create-Seite und Bild im Bearbeiten-Dialog laufen über `composables/useImageUpload.ts` (Zustand, Validierung, Freigabe nur selbst erzeugter Object-URLs) und `components/ui/ImageDropZone.vue`. Die Fehlertexte heißen jetzt `image.onlyImages` / `image.tooLarge` (vorher doppelt unter `AppsCreateView.messages.*` und `AppsDetailView.toasts.*`). **Sichtbar:** Das Logo-Feld der Create-Seite zeigt jetzt wie der Dialog ein Vorschaubild mit Entfernen-Button. `FileDropZone` (Deployment-Dateien) bleibt getrennt.
- **Schritt 6, `CopyButton` (T19):** Die zwei beschrifteten Kopier-Buttons in `DeploymentTaskDetail` und die drei Icon-Buttons in `DeploymentMemberAccess` laufen über `components/ui/CopyButton.vue` (holt sich den geteilten Zustand selbst per `injectCopyToClipboard`). Snapshots ändern sich nur um `type="button"`.
- **Schritt 6, Seitenkopf (T12):** Statt `PageHeader` um einen `back`-Prop zu erweitern (die Köpfe von App-, Kurs- und Deployment-Detail passen mit Bild, Aktionen und Zähler nicht in `PageHeader`), gibt es `components/ui/BackLink.vue` für die drei Zurück-Links; der `<button>` im `RouterLink` des Deployment-Headers ist damit weg. `PageHeader` hat ein optionales `icon` und wird jetzt auch von `HelpView`, `SettingsOpenStackView` und `AddAppsView` genutzt. **Sichtbar:** Deployment-Detail hat „Zurück zur Liste“ als Text-Link über dem Titel statt des runden Icon-Buttons; die Überschriften von Hilfe, OpenStack-Einstellungen und App-Anlegen haben jetzt die einheitliche Größe. `UserLayout` behält seinen eigenen Topbar-Zurück-Link.
- **Schritt 6, Lade-/Fehlerzustände (T11):** `components/ui/Spinner.vue` ist der eine Spinner (lucide `Loader2`); die fünf CSS-Ring-Spinner sind ersetzt. `EntityListState` hat jetzt `isError`/`errorMessage` + Slot `error-action`; `DeploymentDetailView` zeigt Laden und Ladefehler darüber. **Sichtbar:** Die fünf Spinner sind jetzt das Icon statt des Rings; der Lade-/Fehlerbereich der Deployment-Seite hat den Abstand der Listen. Nicht angefasst: der Spinner im „Deploy“-Button der Summary (Button-Zustand) und die reinen Text-Ladezustände (`CourseDetailView`, `UserView`, `SettingsOpenStackView`, `InfrastructureVmDrawer`) — die fallen mit den Zerlegungen in Schritt 10/12/14/16 an.
- **Schritt 7:** `NewDeploymentVariableView` von 1 101 auf ~165 Zeilen; Logik in `services/variable-form.service.ts` (reine Funktionen mit Tests), `composables/useVariableForm.ts`, `composables/useWizardTeams.ts`; die Karte je Variable in `components/deployment-wizard/VariableFieldCard.vue`. **Sichtbar:** Der Hinweis „keine Teams konfiguriert“ erscheint bei Datei-Variablen jetzt über statt unter der (leeren) Liste. Nebenbei: Der Vergleich eines Listenwerts mit dem Default sortiert das Array der Eingabe nicht mehr in place. Offen und bewusst nicht angefasst: `formatSlotLabel` baut die Slot-Beschriftung „Team „x“ → y“ weiter auf Deutsch ohne i18n (V19) und `Image:` im Kopf der Template-Gruppe.
- **Schritt 8:** `NewDeploymentSummaryView` von 737 auf ~430 Zeilen; Zeilen-Aufbereitung in `services/deployment-summary.service.ts`, Fehlertexte beim Absenden in `services/deployment-submit-error.service.ts` (beide mit Tests), `components/deployment-wizard/SummaryVariableCard.vue` für die zwei gleichen Spalten. **Sichtbar:** Die Datei-Karte ist übersetzt; ein leerer Variablenwert erscheint als „-“ statt als leere Zelle (Fehlerbehebung, `5c7d659`). **Offen:** `WizardStepLayout` (T4) — die vier Schritte haben drei Kopf-Designs, vier Breiten und vier verschiedene Fußleisten (Fortschritt, Pflichtfeld-Warnung, Deploy-Spinner). Eine Vereinheitlichung ändert die Optik und ist offene Frage 2 aus Abschnitt 4; nicht ohne Entscheidung umsetzen.
- **Schritt 9:** `deployment.store.ts` von 327 auf 148 Zeilen; `submitDraft` prüft nur noch App/Name und sendet `buildDeploymentPayload(draft)`. Die Meldung „App und Name sind Pflichtfelder“ bleibt vorerst hartkodiert (V19): Der Router-Guard verhindert den Fall, sie ist nur ein Programmierfehler-Schutz; beim i18n-Schritt 15 mit erledigen.
- **Schritt 10:** `NewDeploymentGroupsAssignmentView` 612 → ~270, `NewDeploymentConfigView` 533 → ~270 Zeilen. D11 erledigt: Es gibt nur noch `deploymentStore.studentCache` (die Pinia-Map ist schon reaktiv), Zugriff über `useStudentDirectory`. D12 erledigt: `useUserSearch` für Config und `CourseDetailView`. Beide Wizard-Views und `CourseDetailView` rufen `userApi`/`courseApi` nicht mehr direkt (V12 dort erledigt). **Kleine Verhaltensänderungen (nur Fehler-/Randpfade, im Commit `27d3181` beschrieben):** Eine fehlgeschlagene Suche im Config-Schritt leert die Trefferliste und ersetzt ihren alten Fehler-Toast; auf der Kursseite zeigt eine geleerte Suche die schon geladene Startliste, statt sie neu zu holen. Die Drag-Handler bleiben bewusst in der View (UI-Zustand, `relatedTarget`-Schutz).
- **Schritt 11:** Keine View ruft mehr `appApi` direkt. **Abweichung vom Plan:** Die ungenutzten `appStore`-Aktionen (`fetchAppById`, `createApp`, `updateApp`, `deleteApp`, `currentApp`) sind **gelöscht statt verdrahtet** — die App-Seiten halten seitenlokalen Zustand, den nichts anderes liest, und ihre Specs mocken auf API-Ebene ohne Pinia. Die Composables werfen, die Views entscheiden über den Toast. D21: Die ID-Fallbacks `app.id`/`app._id` sind weg; drei Test-Fixtures nutzten noch `id` und sind auf `appId` umgestellt. Direkte API-Importe gibt es danach nur noch in `LtiCourseMapView` (`courseApi.list`, gehört zu Schritt 15), `InfrastructureVmDrawer` (Schritt 14) und `OpenStackResourcePicker` (Schritt 13); `ltiApi` in den LTI-Views ebenfalls Schritt 15.
- **Schritt 12:** `AppsDetailView` 746 → ~320, `AdminAppsView` 400 → ~240 Zeilen. Versionsregeln (`appBannerStatus`, `versionOptions`, `findVersion`, `versionInfo`) als reine Funktionen in `app-presentation.service.ts`. `AppEditModal` hält das Formular selbst und emittiert nur geänderte Felder. Eine geteilte `VersionApprovalTable` gibt es **nicht**: Die Tabelle im Store-Tab (Owner: einreichen/zurückziehen) und die im Admin-Akkordeon (freigeben/ablehnen/widerrufen) haben andere Spalten und Aktionen; eine gemeinsame Komponente hätte nur Slots durchgereicht.
- **Schritt 13:** Picker 849 → ~330 Zeilen. D13 erledigt: `api/openstack-resource-list.ts` ist die einzige Typ→Endpunkt-Weiche (als eigene Datei, damit Specs, die `openstackResourcesApi` mocken, die Weiche mittesten). Totes Emit `credentials-missing` entfernt. **Fehlerbehebung nebenbei:** Scrollte der Trigger aus dem Bild, blieben vier Listener am `window`/`document` hängen (altes `isOpen = false` ohne `close()`); `useFloatingDropdown` schließt jetzt immer über `close()`.
- **Schritt 14:** Der VM-Drawer ist rein präsentational; eine verspätete Antwort für eine nicht mehr offene VM wird jetzt verworfen (vorher konnte sie die neuere überschreiben). `DeploymentActiveTaskCard` bekommt `live: LiveTaskView` (reaktiv, aus `useDeploymentLiveStream`); der 0-basierte Index heißt durchgehend `activeStepIndex`. Ein Snapshot wurde aktualisiert — **nur** drei HTML-Kommentare (im Dev-Modus gerendert) nennen die neuen Feldnamen, das Markup ist gleich. **Bewusst nicht gemacht:** `DetailSection` (T17) — die fünf Abschnittsköpfe unterscheiden sich (Inline-Icon im `h2` vs. Icon-Kachel, `mb-3/4/5`, Zähler, Aktion); eine Vereinheitlichung ändert die Optik und gehört zur UX-Frage 2. Die 7 Props der `DeploymentInfrastructureSection` und die 3 durchgereichten Props `TaskHistory → TaskDetail` bleiben: reine Daten aus je einem Composable, ein Bündeln brächte kaum etwas.
- **Test-Falle:** `beforeEach(() => mock.mockReset())` gibt den Mock zurück, und Vitest ruft eine zurückgegebene Funktion als Cleanup auf. Ist der Mock auf `mockRejectedValue` gestellt, schlägt der Test mit dem Fehlerobjekt fehl. Immer mit Block-Body schreiben: `beforeEach(() => { mock.mockReset() })`.
- **Schritt 15:** Seit `4e1ec6c` importiert keine View und keine Komponente mehr ein API-Modul (außer Typen) — V12 ist vollständig erledigt. Sichtbare Änderung in `96aacd5`: Die Live-Karte zeigt auf Deutsch „läuft seit“, „Wartet“ (statt `idle`) und „Warte auf die erste Logzeile …“; der Snapshot ändert sich genau in diesen drei Texten. **Offen:** die deutschen Texte der fünf LTI-Views und `CallbackView` (V6), `StatusScreen` (T14), fremde i18n-Namespaces (V20), `formatSlotLabel`/„Image:“, „App und Name sind Pflichtfelder“ (nur Programmierfehler-Schutz).
- **Schritt 16:** Der Router wartet über `authStore.whenSettled()` auf laufende Anmeldungen (vorher 100 ms geraten; bei langsamem Token-Check landete ein Angemeldeter auf dem Login). `handleCallback` wickelt jetzt `finishCallback` ein. Löschen der OpenStack-Credentials fragt per `ConfirmModal` statt `confirm()`, neuer Schlüssel `SettingsOpenStackView.confirmDeleteTitle`. Die Coverage-Schwelle steht knapp unter dem Ist-Wert und darf nur steigen.
- **D31 erledigt** (`2861c09`): Datumsangaben folgen der gewählten Sprache (de-DE bzw. en-GB); die Sprache wird aus `localStorage` gelesen, nicht aus der i18n-Instanz, weil ein Import von `@/i18n` in `utils/format` alle Specs bricht, die `vue-i18n` mocken.
- **Prüf-Falle:** Nicht nur die Zeile `Tests … passed` ansehen, sondern auch `Test Files` — eine Spec, die schon beim Laden scheitert, taucht in der Testzahl einfach nicht auf (so fielen 113 Tests unbemerkt weg). Befehl: `npx vitest --run 2>&1 | grep -E "×|Test Files|Tests |FAIL"`.
- **Hook-Fehlalarm:** Der PreToolUse-Hook blockiert Shell-Befehle, in denen ein Punkt direkt vor `key` steht (etwa ein Property-Zugriff im Testcode), weil er darin eine Geheimnisdatei vermutet. Solche Inhalte mit dem Write-Werkzeug schreiben bzw. Skripte als Datei ablegen und dann ausführen.
- **Container-Hinweis:** Das `node_modules`-Volume von `frontend-dev` kann älter sein als `package-lock.json` (ESLint fehlte am 28.09. komplett). Dann `docker exec frontend-dev sh -lc 'cd /app && npm ci'` — betrifft nur das Volume, nicht Host oder Lockfile.

## 6. Übergabe — hier weitermachen

**Stand (29.09.):** Der Plan ist bis auf vier Punkte umgesetzt, die jeweils auf eine Entscheidung warten: `WizardStepLayout` (Schritt 8) und `DetailSection` (Schritt 14) → offene Frage 2 (UX); LTI-Texte, `StatusScreen` → offene Frage 3; Test-Ablageort → offene Frage 5. Außerdem offen aus dem Bericht: D32 (Rundung RAM/Bytes), V10 (englische Ersatztexte in den Stores), Frage 4 (`DeploymentGroupsCard` redundant?). Branch `refactor/second_review`; die Commits ab `7198eb3` sind **lokal und noch nicht gepusht** (Push nur nach Rückfrage).

**Hier weitermachen:** zuerst die offenen Fragen klären lassen, dann den jeweiligen Rest umsetzen. Ohne Entscheidung machbar sind noch D32 (eine Rundungsregel für RAM/Bytes) und V10 (englische `Failed to …`-Ersatztexte in den Stores durch i18n ersetzen oder streichen).

Regeln für jede KI oder Person, die hier weiterarbeitet:

1. Vor Beginn diesen Abschnitt und Abschnitt 5 lesen, dann mit dem hier genannten nächsten Schritt weitermachen.
2. Pro Schritt wie in Abschnitt 4 beschrieben: erst Charakterisierungstests (eigener Commit), dann Umbau; nach jedem Commit `vitest --run`, `eslint .` und `vue-tsc -b` im Container `frontend-dev` grün.
3. **Nach jedem abgeschlossenen Schritt — und bevor die Arbeit unterbrochen wird — diesen Abschnitt aktualisieren:** Was ist erledigt, wo genau wurde aufgehört (Schritt, Teilpunkt, ggf. halb fertige Dateien) und womit geht es als Nächstes weiter. Die Tabelle in Abschnitt 5 um die neuen Commits ergänzen. Commit-Hashes aus `git log` übernehmen, nie aus dem Gedächtnis.
4. Offene Entscheidungen (Ende von Abschnitt 4 und Nachträge in Abschnitt 5) nicht selbst treffen, sondern nachfragen.
