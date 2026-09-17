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

Lint, Type-Check und Tests werden im Frontend-Container ausgeführt — `make shell-frontend` öffnet eine Shell, in der die üblichen `npm run lint`, `npm run type-check`, `npm run test:unit` und `npm run build` zur Verfügung stehen.

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
├── components/    # Wiederverwendbare Bausteine; ui/ = generische Elemente (Button, Dialog, ...)
├── stores/        # Gemeinsamer Datenspeicher mehrerer Seiten + zugehörige Aktionen (*.store.ts)
├── api/           # Aufrufe ans Backend, ein File pro Ressource (*.api.ts) + axios.ts
├── composables/   # Wiederverwendbare Logik (use*), z.B. Login, Live-Updates
├── services/      # Logik ohne Oberfläche (aktuell: auth.service fürs Keycloak-Login)
├── router/        # Definition der Seiten-Adressen + Zugriffsschutz (Login nötig ja/nein)
├── types/         # TypeScript-Typdefinitionen (OpenStack-Credentials, Quota, ...)
├── utils/         # Kleine Helfer (clouds-yaml-Parsing, Formatierung, Fehler-Aufbereitung)
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
| `router/index.ts` | Legt die Seiten-Adressen fest und schützt geschützte Seiten vor nicht eingeloggten Nutzern |

**views/** — Kern ist der mehrstufige Deployment-Wizard (`NewDeploymentConfigView` → `…VariableView` → `…GroupsAssignmentView` → `…SummaryView`), dazu App-Katalog (`AppsView`/`AppsDetailView`), Deployments (`DeploymentsView`/`DeploymentDetailView`), Kurse, Dashboard und Settings.

**api/ ↔ stores/** — spiegeln sich paarweise: zu jeder Ressource gibt es ein `*.api.ts` (macht nur die reinen Aufrufe ans Backend) und meist einen `*.store.ts` (hält die Daten im Speicher und bietet Aktionen darauf an, die wiederum die Aufrufe nutzen). Beispiele: `deployment`, `app`, `course`, `team`, `user`, `credentials`.

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
