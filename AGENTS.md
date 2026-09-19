# Frontend — Click-n-Deploy App Store

Vue 3 + TypeScript + Pinia + Vite. Läuft nur als Service im Stack aus
`deployment/docker-compose.dev.yml`.

## Befehle

Alles im Container — die `node_modules` am Host sind unvollständig, ein
`npm test` dort scheitert mit `vitest ... nicht gefunden`.

- Tests: `docker exec frontend-dev sh -lc 'cd /app && npx vitest --run'`
- Coverage: `docker exec frontend-dev sh -lc 'cd /app && npx vitest --run --coverage'`
- Typecheck: `docker exec frontend-dev sh -lc 'cd /app && npx vue-tsc -b'`
- Logs: `docker logs -f frontend-dev`

**Nach neuen Dateien oder Routen: `docker restart frontend-dev`.** Der
Bind-Mount liefert keine inotify-Events, Vite sieht neue Dateien sonst nicht.
Symptom: eine neue Route landet im falschen Layout, und
`curl http://localhost:5173/src/router/index.ts` zeigt den alten Stand.

## Konventionen

- Datenfluss ist `View → Store → api/*.ts → Backend`. Views rufen nie
  direkt die API auf.
- Zu jeder Ressource gehört ein `*.api.ts` (nur die Aufrufe) und meist ein
  `*.store.ts` (Daten + Aktionen). Das Paar nicht auseinanderziehen.
- Den Auth-Token nie selbst an einen Aufruf hängen — das macht
  `api/axios.ts` zentral, und es entscheidet dort auch, ob der
  Keycloak-Token oder das LTI-Session-Token gilt.
- `POST /lti/link` ist die eine Ausnahme: der Aufruf muss über einen
  direkten Login laufen, nie über eine LTI-Session.
- Eine LTI-Session lässt sich nicht erneuern. Bei 401 nicht zum
  Keycloak-Login schicken, sondern nach `/lti/expired` — sonst landet die
  Person außerhalb ihres Moodle-Kontexts.

## Der localhost-Sonderfall

Ein Moodle-Launch erreicht das Frontend unter `host.docker.internal:5173`,
ein direkter Keycloak-Login funktioniert aber **nur** unter
`localhost:5173`: PKCE braucht `crypto.subtle`, und das gibt der Browser
über http nur im secure context her, als der nur `localhost` zählt.
Deshalb zeigt `LTI_LINK_REDIRECT_URL` bewusst auf `localhost`. Unter HTTPS
in Produktion fällt die Unterscheidung weg.

## Definition of Done

- `vue-tsc -b` und `vitest --run` grün
- Coverage nicht unter die Schwelle in `vitest.config.ts` gefallen
- Neue Route? Gegen `router/index.ts` geprüft, ob sie hinter
  `requiresAuth` gehört — die drei `/lti/*`-Routen gehören bewusst nicht dahin

## Nicht anfassen

- `.env`, `*.pem`, `node_modules/`
- `*.d.ts` neben `*.ts` — die erzeugt der Build
- Kein Prod-Deploy, kein `git push --force`
- `.claude/` — erzeugt aus `deployment/harness/`. Was hier geändert wird, ist
  beim nächsten `make harness-sync` weg. Änderungen gehören in die Quelle.

Geheimnisse, Produktions-Deploys, `terraform apply` und Pushes auf `main` sind
zusätzlich als deny-Regel in `.claude/settings.json` gesperrt. So ein Kommando
scheitert ohne Nachfrage — das ist Absicht und kein Werkzeugfehler.
