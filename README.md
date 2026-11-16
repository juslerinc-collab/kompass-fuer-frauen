# Kompass (Prototyp)

Diskrete Informationsseite für Frauen in der Schweiz, die in kontrollierenden Beziehungen leben. Erklärt Rechte, zeigt Hilfsstellen im Kanton Zürich und belegt jede Aussage mit einer offiziellen Quelle. Begriffe: [CONTEXT.md](CONTEXT.md). Schnittstellen: [docs/schnittstellen.md](docs/schnittstellen.md).

**Prototyp. Inhalte nicht von Fachpersonen geprüft. Keine Rechtsberatung.**

## Aufbau

- `site/` – statische Seite, ohne Build, ohne Cookies, ohne externe Schriften oder Tracker. Läuft auf GitHub Pages.
- `worker/` – optionaler Chat-Worker auf Cloudflare (gratis Workers AI), antwortet nur aus der Wissensbasis.
- `scripts/translate.mjs` – übersetzt alle Texte einmalig mit Google Translate.

## Lokal ansehen

```
cd site && python3 -m http.server 8000
```
Dann http://localhost:8000 öffnen.

## Veröffentlichen (GitHub Pages)

1. Repo auf GitHub, Branch `main`.
2. Settings → Pages → Source: **GitHub Actions**.
3. Push auf `main` – der Workflow `.github/workflows/pages.yml` veröffentlicht den Ordner `site/`.

Die Seite ist für Suchmaschinen gesperrt (`noindex`, `robots.txt`). Der Link wird von Fachpersonen weitergegeben.

## Übersetzen

```
GOOGLE_TRANSLATE_KEY=... node scripts/translate.mjs ar ti tr uk
```
Ergänzt nur fehlende Übersetzungen. Der Schlüssel wird nur lokal verwendet und landet nie auf der Seite.

## Chat einschalten

Worker deployen (siehe `worker/`), dann die Adresse in `site/config.js` bei `chatUrl` eintragen. Ohne Adresse zeigt „Frage stellen“ passende Themen aus der Offline-Suche.

## Sicherheit für Nutzerinnen

- Schnell-weg-Knopf und Esc-Taste ersetzen die Seite durch MeteoSchweiz (ohne Zurück-Eintrag).
- Kein localStorage, keine Cookies; Selbst-Check und Chat leben nur im Arbeitsspeicher.
- Keine Schriften oder Skripte von Dritten, `no-referrer` bei allen Links.
