# HANDOVER – Aero-Design v2

Stand wird nach jedem Commit überschrieben (kein Tagebuch).

## Ziel
Design v2 aus `C:\Users\Katrin\Documents\DHBW\5. Semester\eichberg\design-vorlage-v2\design-vorlage-v2`
(nur lesen) auf alle Seiten und Zustände des Frontends bringen: Light Standard, Dark per Topbar-Schalter,
sauberes Komponenten-Set. Logik, API, Routing, State bleiben. Plan:
`C:\Users\Katrin\.claude\plans\aufgabe-setz-das-wiggly-lobster.md`.

## Erledigt
- Start: `make harness-sync`/`harness-check` grün, Baseline grün (vue-tsc, 85 Dateien / 945 Tests) – Commit: dieser.

## Offen (Reihenfolge)
a Tokens v2 · b Basis-Komponenten · c Layout-Shell · d Login + Dashboard · e Apps + App-Detail + Markdown-Fix ·
f übrige Seiten · g Aufräumen · Abschluss (ADR-Commit im deployment-Repo)

## Nächster Schritt
Etappe a: `src/styles/tokens.css` auf v2-Werte bringen, Typo-/Maß-/Layout-Tokens ergänzen,
`tailwind.config.js` mappt nur, Logos umbenennen (`based-logo-light/-dark.png`, `based-icon.png`),
`tests/unit/design/tokens.spec.ts`.

## Entscheidungen
- Repo hat schon Aero v1 (tokens.css, components.css, useTheme, ThemeToggle, Anti-Flash) → Weiterentwicklung, kein Neubau.
- Tokens nur in `src/styles/tokens.css`; Tailwind 3.4 mappt via CSS-Variablen; kein neuer Styling-Ansatz.
- Theme: `localStorage['theme']` (try/catch), Default Light, Anti-Flash-Skript in `index.html`.
- Anrede bleibt „Sie“ überall (Prompt-Ausnahme „du“ entfällt, bestätigt).
- Profil-Seiten (`/user`, `/user/openstack`) in die App-Shell (Route-Meta `layout: 'app'`), `UserLayout` wird gelöscht.
- ADR am Ende als eigener Commit im `deployment`-Repo, ohne Push.
- Breadcrumb: `services/breadcrumb.service.ts` + `useBreadcrumbs`, keine Router-Änderung.
- Logos im Repo sind byte-identisch zur Vorlage → nur umbenennen.
- Kein Push, kein PR.

## Bekannte Probleme / offene Fragen
- Keine.

## Checks nach jeder Etappe
```
cd deployment && make harness-check
docker exec frontend-dev sh -lc 'cd /app && npx vue-tsc -b'
docker exec frontend-dev sh -lc 'cd /app && npx vitest --run --coverage'
docker exec frontend-dev sh -lc 'cd /app && npx eslint .'
rg -n '#[0-9a-fA-F]{3,8}\b' src --glob '!src/styles/tokens.css'
```
Neue Dateien → `docker restart frontend-dev`. Budget nach jedem Commit prüfen (≤ 7 % ≈ 1,05 Mio. → stoppen).
