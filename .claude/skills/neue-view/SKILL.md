---
name: neue-view
description: Muster für eine neue Seite im Frontend — View, Store, API-Datei, Route, und der Container-Neustart, ohne den Vite die Datei nicht sieht.
---

# Neue View

Eine Seite ist bei uns ein Tripel plus ein Routeneintrag. Der Datenfluss ist
immer `View → Store → api/*.ts → Backend`. Eine View ruft nie direkt die API
auf.

## Die vier Stellen

| Stelle | Datei | Inhalt |
|---|---|---|
| 1. API | `src/api/<ressource>.api.ts` | nur die Aufrufe, keine Zustandshaltung |
| 2. Store | `src/stores/<ressource>.store.ts` | Daten im Speicher + Aktionen darauf |
| 3. View | `src/views/<Name>View.vue` | Darstellung, liest aus dem Store |
| 4. Route | `src/router/index.ts` | Pfad, Name, Layout, Zugriffsschutz |

Für Typen: `src/types/`. Für Logik ohne Oberfläche, die mehrere Views brauchen:
`src/composables/use*.ts`.

## Dann den Container neu starten

```bash
docker restart frontend-dev
```

**Ohne das sieht Vite die neue Datei nicht.** Der Bind-Mount liefert keine
inotify-Events. Das Symptom ist tückisch, weil es nicht nach einem
Dateiproblem aussieht: die neue Route landet im falschen Layout, oder sie
existiert scheinbar gar nicht.

Gegenprobe, ob Vite den aktuellen Stand ausliefert:

```bash
curl http://localhost:5173/src/router/index.ts
```

Zeigt das den alten Inhalt, ist es der fehlende Neustart und nicht dein Code.

## Route eintragen

```ts
{
  path: "/beispiel",
  name: "beispiel",
  component: () => import('@/views/BeispielView.vue'),
  meta: { layout: "app" },
},
```

Layouts: `app` für die eingeloggte Anwendung, `auth` für Seiten ohne Sitzung.

**Zugriffsschutz.** Der Guard in `router/index.ts` schickt nicht angemeldete
Personen zum Login. Drei Routen sind bewusst ausgenommen — `/lti/callback`,
`/lti/link`, `/lti/expired`. Sie schließen ihre eigene Anmeldung ab bzw. werden
gerade dann aufgerufen, wenn keine Sitzung mehr da ist. Wenn du eine Route
baust, die in dieser Lage erreichbar sein muss, gehört sie in dieselbe Ausnahme.

## Auth nicht selbst anfassen

Den Token hängt `src/api/axios.ts` zentral an. Dort wird auch entschieden, ob
das Keycloak-Token oder das LTI-Session-Token gilt. **Nie selbst einen
`Authorization`-Header setzen.**

Zwei Sonderfälle, die dort schon behandelt sind:

- `POST /lti/link` läuft immer über einen direkten Login, nie über eine
  LTI-Sitzung — die Sitzung leitet sich aus genau dem Anspruch ab, der geprüft
  werden soll.
- Bei 401 auf einer LTI-Sitzung geht es nach `/lti/expired`, nicht zum
  Keycloak-Login. Eine LTI-Sitzung lässt sich nicht erneuern; der Weg zurück
  ist ein neuer Launch in Moodle.

## Test

Tests liegen unter `tests/unit/views/` (bestehende) oder neben der Datei in
`__tests__/`. Beides läuft.

```bash
docker exec frontend-dev sh -lc 'cd /app && npx vitest --run'
```

Am Host schlägt `npm test` fehl — die `node_modules` dort sind unvollständig.

## Fertig, wenn

- `docker exec frontend-dev sh -lc 'cd /app && npx vue-tsc -b'` grün
- `vitest --run` grün
- Coverage nicht unter die Schwelle in `vitest.config.ts` gefallen
- Bei sichtbaren Änderungen: einmal im Browser angesehen
