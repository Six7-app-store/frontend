# HANDOVER – App-Detailseite mit Reitern

Stand wird nach jedem Commit überschrieben (kein Tagebuch). Branch: `feat/app-detail-tabs`, von `develop` (enthält Design v2
über PR #17). Nichts gepusht.

## Ziel
Die App-Detailseite für **alle** Apps auf fünf Reiter umbauen: Übersicht, Dokumentation, Konfiguration, Versionen,
Einstellungen. Alles kommt aus den App-Daten, nichts ist für eine App hart codiert. Design, Komponenten und Regeln von v2
bleiben die Basis.
- Vorlage (nur lesen): `app-store/app-detail-vorlage/{light/V3LApp*,dark/V3App*}.dc.html`, je Reiter eine Datei; bei Katrin
  `…\eichberg\app-detail-vorlage`. Verbindlich sind Layout und Stil, nicht die Beispieltexte der Online-IDE.
- Weiter gültig: `app-store/design-vorlage-v2/` und die Regeln unten.
- Plan (freigegeben): `C:\Users\luish\.claude\plans\c-users-luish-onedrive-desktop-uni-app-s-sparkling-lightning.md`.

## Etappen
Auf Wunsch des Nutzers **wenige, große Commits**: a–d in einem Commit, e (Aufräumen) im zweiten.
- [x] a) Reiterleiste und Routing
- [x] b) Übersicht und Dokumentation
- [x] c) Konfiguration und Versionen
- [x] d) Einstellungen mit Rechten und Lösch-Dialog
  → Commit 1 „Split the app detail page into routed tabs“ (`git log -1`)
- [ ] e) Aufräumen → Commit 2

**Nächster konkreter Schritt (e):**
- `src/components/app/AppStoreTab.vue` löschen. Es wird nirgends mehr importiert.
- Unbenutzte i18n-Keys in `de.ts` und `en.ts` löschen. Jeden per `rg` auf den vollen Schlüssel prüfen, dazu auf
  `AppsDetailView.tabs.${…}`, das dynamisch ist. Kandidaten:
  - `tabOverview`, `tabStore`, `moreActions`, `deleteApp`, `descriptionTitle`, `unknownUser`
  - `versionName`, `versionAuthor`, `versionPublishedAt`, `versionPreRelease`, `versionLink`, `versionDescTitle`
  - `noVersionInfo`, `versionTableTitle`, `cancelButton`
- `VersionInfo`: Felder, die nur die alte Übersicht brauchte, prüfen. `versionInfo()` nutzt jetzt nur noch `AppVersionsTab`
  (type, commit). Funktion verschlanken oder lassen, mit Test.
- Ungenutzte Klassen und Tokens prüfen.
- Danach Checks, HANDOVER mit dem Endstand, Commit 2.

## Entscheidungen
- **Datenquellen (Analyse):**
  - Beschreibung: `app.description` (Markdown).
  - Kurzbeschreibung: Es gibt kein eigenes Feld, deshalb der erste Absatz über `descriptionPreview()`, dazu die erste
    Überschrift als h2. Ohne beides gilt der Leerzustand `noDescription`.
  - **Variablen liegen strukturiert vor:** `GET /apps/{id}/variables?version=` (wie im Wizard). Das Backend klont dafür das
    Repo, das dauert Sekunden. Geladen wird deshalb im Hintergrund nach dem App-Load für `versions[0]`, über
    `useAppDetail.loadVariables`, mit `dedupeDefinitions`.
  - **Kennwerte („Auf einen Blick“) gibt es nirgends strukturiert.** Der Kasten wird nicht gebaut, es gibt keinen i18n-Key
    und keine Komponente. Kommt später ein Backend-Feld, wird er nachgerüstet.
  - Markdown-Tabellen werden nie geparst. Die Variablentabelle der Seed-Beschreibungen bleibt in der Dokumentation.
- **Reiter ohne Inhalt fehlen:**
  - Dokumentation ohne Beschreibung, Konfiguration ohne Variablen, Versionen ohne Versionen, Einstellungen ohne Rechte.
  - Regeln in `appDetailTabs()` (`app-presentation.service.ts`).
- **Routing:**
  - `/apps/:id/:tab(docs|config|versions|settings)?`. Die Übersicht hat kein Segment, `/apps/x/unbekannt` bleibt 404.
  - Ein Reiterwechsel ruft `router.replace` auf (`appDetailLocation()`).
  - Ein nicht verfügbarer Reiter in der URL wird per `replace` auf die Übersicht umgeleitet. Nur bei einem Ladefehler der
    Variablen gibt es einen Toast.
  - Ein Direktlink auf `/config` wartet, solange die Variablen laden (Spinner).
- **Rechte:**
  - `canEditApp = isAdmin || isOwner`, wie im Backend `can_edit_app`.
  - Steuert die Einstellungen, die Prüfspalten in Versionen und das Laden der Freigaben.
  - **Geändert:** Einreichen und Zurückziehen sind jetzt auch für Admins da. Bisher galt dafür nur `isOwner`, das Backend
    erlaubt beides aber auch Admins.
- **Kopf:**
  - Ohne Aktionen, Bearbeiten und Löschen liegen jetzt in den Einstellungen.
  - Der Status ist der erste Eintrag der Meta-Zeile, berechnet in `appStatus()`. Ohne Bearbeitungsrecht sieht man nur
    veröffentlichte Apps, deshalb gilt dann „Veröffentlicht“.
- **TabBar** (wiederverwendbar, keine App-Kopie):
  - Abstand 28px (`gap-7`).
  - Roving tabindex und Pfeiltasten, Pos1 und Ende.
  - Optional `idPrefix` für `id` und `aria-controls`. Die Ids kommen aus `tabId()` und `panelId()` in `ui/tab.ts`.
- **Neue Tokens:**
  - `--lead-max` (640), `max-w-lead`
  - `--toc-w` (220), auch in `HelpView`
  - `--content-max` (860), `max-w-content`, gilt für Konfiguration, Versionen und Einstellungen. Die Vorlage hat bei den
    Versionen 960px, wir nehmen dort einheitlich 860px.
- **Variablenbeschreibungen** ohne `@openstack:`- und `@platform:`-Marker, über `variableDisplayDescription()`.
- „Default vorhanden“ steht nur, wenn `default` gesetzt ist. Laut Backend gilt `required = kein Default`.
- **Leere Felder** werden ausgeblendet:
  - keine „–“ beim Datum
  - kein „Unbekannt“ bei „von“
  - keine Grund-Zeile bei einer Ablehnung ohne Grund
- „Zurückziehen“ ist jetzt ein neutraler kleiner Button (vorher `danger`). Die Bestätigung bleibt.
- **Inhaltsverzeichnis** („Auf dieser Seite“): nur H2. H3 ohne Einrückung wäre im `PageToc` irreführend.

## Prüfung im Browser (Commit 1)
Headless Chrome per `puppeteer-core` im Scratchpad.
- Login über das Keycloak-Formular mit `tobias.admin` (Admin und Besitzer) und `luca.baeck` (Student), Passwort `1234`.
- **Dev hat keinen Git-Token** (Backend-Log „Git access token not configured“). Alle Apps kommen deshalb ohne Versionen und
  ohne Variablen. Für die Prüfung wurden die echten API-Antworten angereichert:
  - Online-IDE: 2 Versionen plus Variablen
  - Web-LaTeX: 2 Versionen, keine Variablen
  - „Windows App“: komplett gefälscht, leere Beschreibung, keine Variablen
- **Geprüft:**
  - Online-IDE: alle fünf Reiter, Light und Dark
  - Web-LaTeX: kein Reiter Konfiguration
  - Windows App: kein Reiter Dokumentation, kein Reiter Konfiguration, `/docs` und `/config` landen auf der Übersicht
  - Klick plus Reload behält den Reiter
  - Student: kein Reiter Einstellungen, `/settings` landet auf der Übersicht, Versionen ohne Prüfspalten
  - Echte Seed-Daten ohne Versionen: Übersicht, Dokumentation und Einstellungen

## Regeln (weiter gültig aus v2)
- Alles im Container. Nie `.env`, `.pem` oder Schlüsseldateien. Kein Push. `.claude/` nicht anfassen.
- Tokens nur in `src/styles/tokens.css`. Keine Hex-Werte und keine Inline-Styles. Klassennamen aus `@layer components` nie per
  Template-String bauen.
- Komponenten-Specs prüfen Zustand (aria, `data-testid`), keine Tailwind-Klassen. Snapshots nur nach Diff-Prüfung
  aktualisieren.
- Anrede in neuen Texten: „Sie“.
- Komponenten-API: siehe `git show develop:HANDOVER.md`, Abschnitt „Entscheidungen“.
- **View-Specs mit reaktiver Mock-Route brauchen `enableAutoUnmount(afterEach)`.** Sonst leiten noch gemountete Ansichten
  aus früheren Tests die Route um.

## Bekannte Probleme / offene Fragen
- Harness: Am Start meldete `sync.py --check` Abweichungen in `backend/` und `worker/`. Auf Wunsch des Nutzers lief
  `python deployment/harness/sync.py`. Die erzeugten Kopien in `backend/`, `worker/` und im Arbeitsordner sind **nicht
  committet**, die Repos liegen auf `ci/auto-trigger-staging-deploy`.
- Dev ohne `GIT_ACCESS_TOKEN`: keine Versionen und keine Variablen. Echte Variablen lassen sich nur mit Token prüfen.

## Checks nach jeder Etappe (nur bei grün committen)
```
python deployment/harness/sync.py --check          # = make harness-check
docker exec frontend-dev sh -lc 'cd /app && npx vue-tsc -b'
docker exec frontend-dev sh -lc 'cd /app && npx vitest --run --coverage'   # Schwellen 89/84/71/89 nicht senken
docker exec frontend-dev sh -lc 'cd /app && npx eslint .'
rg -n '#[0-9a-fA-F]{3,8}\b' src --glob '!src/styles/tokens.css'            # muss leer sein
rg -in 'online-ide|gp1\.small|assignment_files|team_flavor' src            # nur alte Kommentare/Fixtures
```
- Neue Dateien oder eine geänderte Tailwind-Konfiguration: `docker restart frontend-dev`.
- Stack starten: `docker compose -f docker-compose.dev.yml up -d` in `deployment/` (`make dev-up`).
- Commit-Stil: englischer Imperativ mit Co-Authored-By-Trailer. HANDOVER mit jedem Commit aktualisieren.
- Budget nach jedem Commit prüfen. Bei 7 % oder weniger sofort stoppen und übergeben.

## Stand Checks (Commit 1)
- vue-tsc grün, eslint leer, `Harness aktuell.`
- 111 Dateien, 1122 Tests grün
- Coverage siehe Commit-Nachricht
