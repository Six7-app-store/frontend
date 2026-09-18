# Frontend

[![Coverage](https://img.shields.io/endpoint?url=https://six7-click-n-deploy.github.io/frontend/badge.json)](https://six7-click-n-deploy.github.io/frontend/)

Vue 3 SPA für den App Store. Studierende und Dozierende verwalten hier Apps, deployen sie auf OpenStack und sehen ihre Deployments.

## Setup

Dieses Repository wird nicht eigenständig gestartet. Der gesamte Stack — inklusive Frontend — wird über das deployment-Repository hochgefahren. Vollständige Anleitung: [deployment/README.md](https://github.com/six7-click-n-deploy/deployment#readme).

Voraussetzung für alle folgenden Befehle: `make dev-up` aus dem `deployment/`-Verzeichnis wurde ausgeführt und der Stack läuft.

## Entwicklung

Alle `make`-Befehle werden aus dem `deployment/`-Verzeichnis des [deployment-Repos](https://github.com/six7-click-n-deploy/deployment) ausgeführt — dort liegt das Makefile.

```bash
# in app-store/deployment
make dev-restart-frontend   # Frontend-Container neu starten
make dev-logs-frontend      # Frontend-Logs verfolgen
make shell-frontend         # interaktive Shell im Container
```

Lint, Type-Check, Tests und Build werden im Frontend-Container ausgeführt — `make shell-frontend` öffnet eine Shell, in der `npm run lint` (ESLint, Flat Config in `eslint.config.js`), `npx vue-tsc -b --noEmit` (Type-Check, wie in der CI), `npm test` (Unit-Tests mit Vitest), `npm run test:coverage` und `npm run build` zur Verfügung stehen. ESLint prüft echte Fehler (ungenutzter Code, kaputte Template-Syntax, falsche Vue-Nutzung), aber keine Formatierung — Prettier ist bewusst nicht eingebunden. In der CI läuft ESLint derzeit nicht.

## Technologie-Stack

- **Vue 3** mit Composition API und TypeScript
- **Pinia** für globalen State
- **Vue Router** mit Auth-Guards
- **Axios** mit Keycloak-Bearer-Interceptor
- **Tailwind CSS** für Styling
- **vue-i18n** für Mehrsprachigkeit (DE/EN)
- **oidc-client-ts** für Keycloak-Login

## Code-Struktur

Der Code liegt in `src/`. Der typische Datenfluss von der Oberfläche bis zum Backend: eine **View** (eine Seite der App) liest ihre Daten aus einem **Store** — einem zentralen Datenspeicher, den sich mehrere Seiten teilen (umgesetzt mit der Bibliothek Pinia). Der Store holt bzw. schickt diese Daten über den **API-Layer** (`api/`) zum Backend. Dabei ergänzt `api/axios.ts` bei jedem Aufruf automatisch den Login-Token, sodass sich die einzelnen Aufrufe nicht selbst darum kümmern müssen.

```
src/
├── main.ts        # Startpunkt der App (registriert Store, Router, Übersetzungen)
├── views/         # Seiten der App (Ziele der Navigation), z.B. Deployment-Wizard, App-Katalog
├── layouts/       # Seitenrahmen (App/Auth/User), je nach Route gewählt
├── components/    # Bausteine; ui/ = generische Elemente (Button, Dialog, ...), deployment/ = Teile der Deployment-Detailseite
├── stores/        # Gemeinsamer Datenspeicher mehrerer Seiten + zugehörige Aktionen (*.store.ts)
├── api/           # Aufrufe ans Backend, ein File pro Ressource (*.api.ts) + axios.ts
├── composables/   # Logik mit Zustand (use*), z.B. Login, Live-Updates, Bereiche der Deployment-Detailseite
├── services/      # Fachlogik ohne Oberfläche und ohne Zustand (*.service.ts), z.B. Deployment-Lifecycle, Zugangsdaten-Zuordnung
├── router/        # Routentabelle (Adressen, Namen, Layout, Rollen, Titel) + Zugriffsschutz; route-names.ts
├── types/         # TypeScript-Typdefinitionen (OpenStack-Credentials, Quota, ...)
├── utils/         # Kleine Helfer (clouds-yaml-Parsing, Formatierung, Fehler auslesen, Dateien, JSON-Anzeige)
└── i18n/          # Mehrsprachigkeit: Setup + Übersetzungstexte (DE/EN)
```

> Die `.d.ts`-Dateien neben den `.ts` werden beim Build automatisch erzeugt (sie beschreiben nur die Typen) — kein handgeschriebener Code.

**Zentrale Mechanismen:**

| Datei | Zweck |
|---|---|
| `api/axios.ts` | Zentrale Stelle für alle Backend-Aufrufe: hängt vor dem Absenden automatisch den Login-Token an (`Authorization: Bearer <token>`) und fängt abgelaufene Logins (Fehler 401) ab |
| `stores/auth.store.ts` | Merkt sich, wer eingeloggt ist, und dessen Rolle (student/teacher/admin) |
| `composables/useKeycloak.ts` | Login und Logout gegen Keycloak (via Bibliothek `oidc-client-ts`) |
| `composables/useDeploymentStream.ts` | Empfängt den Live-Fortschritt eines Deployments in Echtzeit vom Backend (Server-Sent Events) |
| `router/index.ts` | Einzige Stelle für Seiten-Adressen, Routennamen, Layout, benötigte Rollen und Header-Titel; schützt Seiten vor nicht eingeloggten bzw. nicht berechtigten Nutzern |
| `router/route-names.ts` | Namen aller Routen (`ROUTE_NAMES`) — Navigation passiert über diese Namen statt über hartcodierte Pfade |
| `composables/useRouteAccess.ts` | Prüft anhand der Routentabelle, ob die aktuelle Rolle eine Seite öffnen darf (z.B. um Menüpunkte auszublenden) |
| `utils/http-error.ts` | Einzige Stelle, an der fehlgeschlagene Backend-Aufrufe ausgelesen werden (siehe [Fehlerbehandlung](#fehlerbehandlung)) |

**views/** — Kern ist der mehrstufige Deployment-Wizard (`NewDeploymentConfigView` → `…GroupsAssignmentView` → `…VariableView` → `…SummaryView`), dazu App-Katalog (`AppsView`/`AppsDetailView`), Deployments (`DeploymentsView`/`DeploymentDetailView`), Kurse, Dashboard und Settings.

**Deployment-Detailseite** — `DeploymentDetailView` setzt die Seite nur noch zusammen: Die Bereiche sind Komponenten in `components/deployment/` (Header, Karten, Live-Task, Teams, Infrastruktur, Task-Historie, Dialoge), der Zustand liegt in `composables/useDeployment*` (Tasks, Live-Stream, Zugangsdaten, Ressourcen, Lifecycle) und die reine Fachlogik in `services/deployment-*.service.ts`. Das Verhalten der Seite ist durch `tests/unit/views/DeploymentDetailView.characterization.spec.ts` (inkl. DOM-Snapshots) abgesichert.

**api/ ↔ stores/** — spiegeln sich paarweise: zu jeder Ressource gibt es ein `*.api.ts` (macht nur die reinen Aufrufe ans Backend) und meist einen `*.store.ts` (hält die Daten im Speicher und bietet Aktionen darauf an, die wiederum die Aufrufe nutzen). Beispiele: `deployment`, `app`, `course`, `credentials` (für `user`, `task` u.a. gibt es nur den API-Teil).

## Fehlerbehandlung

Damit fehlgeschlagene Backend-Aufrufe überall gleich behandelt werden, gilt im Frontend eine feste Konvention:

1. **API-Layer (`api/`) fängt keine Fehler ab.** Einzige Ausnahme ist `api/axios.ts`: Dort werden global abgelaufene Logins (401) und fehlende Rechte (403) behandelt.
2. **Fehler werden nur über `utils/http-error.ts` ausgelesen**, nie direkt über `err.response`: `getErrorStatus`, `getErrorStatusText`, `hasErrorResponse`, `getErrorDetail`, `getErrorReason` sowie `extractErrorMessage` für einen lesbaren Text.
3. **Stores** setzen Lade- und Fehlerzustand über `runRequest` aus `stores/_request.ts`, wo das Muster passt (Lade-Flag an, Fehler leeren, Fallback-Text, optional weiterwerfen). Abweichungen (z.B. 404 = „gelöscht“ in `deployment.store`) sind ausgeschrieben und kommentiert.
4. **Views, Komponenten und Composables sind die Stelle, an der Nutzer:innen etwas sehen.** Jeder `catch` macht genau eines davon:
   - **Rückmeldung geben**: Toast über `useToast()` oder eine Fehlermeldung direkt im Formular/Bereich,
   - **weiterwerfen**, damit der Aufrufer entscheidet,
   - **bewusst still bleiben**: dann mit `console.error`/`console.warn` und einem Kommentar, *warum* keine Rückmeldung nötig ist.

   Leere `catch {}` oder `.catch(() => null)` ohne Kommentar gibt es nicht; Toasts werden nicht direkt über den Toast-Store erzeugt.
5. **Status- oder Reason-Codes → Text** (z.B. 412 „Credentials fehlen“, `smtp_disabled`) werden dort übersetzt, wo die zugehörige Logik liegt (Service bzw. Composable), nicht verstreut in Templates.

## Mehr

- Architektur und projektübergreifende Doku: [.github-Repo](https://github.com/six7-click-n-deploy/.github)
- API-Docs (Backend Swagger): http://localhost:8000/docs (nach `make dev-up`)
