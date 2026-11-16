# Schnittstellen (Seite ↔ Wissensbasis ↔ Chat-Worker)

Gilt für alle Threads, die an Kompass arbeiten. Glossar: `../CONTEXT.md`.

## Ordner

```
kompass/
  site/                 statische Seite (GitHub Pages), kein Build nötig
    index.html, styles.css, config.js
    js/app.js           Oberfläche
    js/retrieve.js      Stichwortsuche, auch vom Worker importierbar (ES-Modul, keine Abhängigkeiten)
    data/knowledge.json Wissensbasis (Format unten)
    data/help.json      Hilfsstellen + Notfallnummern
    data/selfcheck.json Fragen des Selbst-Checks
    data/ui.json        Oberflächentexte pro Sprache
  worker/               Chat-Worker (Cloudflare) – eigener Thread
  scripts/              Übersetzungs-Skript usw.
```

## Wissensbasis: `site/data/knowledge.json`

```json
{
  "sources": {
    "<quellen-id>": { "title": "BIF – Migrationsrecht", "url": "https://…" }
  },
  "entries": [
    {
      "id": "aufenthalt",                      // stabil, wird in URLs (#/thema/aufenthalt) und im Selbst-Check benutzt
      "group": "erkennen" | "rechte",
      "tags": ["bewilligung", "permit", …],    // Suchwörter, klein geschrieben, mehrsprachig erlaubt
      "title":   { "de": "…", "en": "…" },
      "summary": { "de": "…", "en": "…" },     // ein Satz
      "body": [
        { "text": { "de": "…", "en": "…" }, "src": ["bif-mig"] }   // jeder Absatz nennt mind. eine Quelle
      ]
    }
  ]
}
```

Regeln:
- Jeder Absatz hat `src` mit mindestens einer Quellen-ID aus `sources`.
- Texte in einfacher Sprache, Du-Form, Schweizer Schreibweise (ss statt ß).
- Sprachen als Schlüssel (`de`, `en`, `ar`, `ti`, `tr`, `uk`). Fehlt eine Sprache, zeigt die Seite Deutsch.
- `de` ist das Original; andere Sprachen werden daraus übersetzt.
- Hilfsstellen in `help.json` verweisen über `tags` auf Eintrags-IDs.

## Chat-Schnittstelle (abgestimmt mit dem Worker-Thread)

Die Seite liest die Basis-Adresse aus `site/config.js` (`chatUrl`, ohne `/chat`). Leer = nur Offline-Suche.

**Anfrage**

```
POST {chatUrl}/chat
Content-Type: application/json

{
  "question": "Darf er mein Geld wegnehmen?",      // max. 600 Zeichen
  "lang": "de",                                     // de | en | ar | ti | tr | uk
  "history": [ { "role": "user" | "assistant", "content": "…" } ]   // optional, max. 6
}
```

**Antwort 200**

```json
{
  "answer": "Nein. Wenn jemand dir deinen Lohn wegnimmt, ist das ökonomische Gewalt [1]. …",
  "sources": [ { "title": "BIF – Formen häuslicher Gewalt", "url": "https://…" } ],
  "entries": ["geld"],
  "emergency": false
}
```

- `answer`: Klartext, Absätze mit Leerzeile getrennt. Zitate als `[n]`, `n` = Position in `sources` (ab 1).
- `sources`: nur Quellen, die in der Antwort zitiert sind.
- `entries`: IDs der benutzten Wissenseinträge; die Seite zeigt sie als „Mehr dazu“-Karten.
- `emergency`: `true` → die Seite zeigt die rote Notfallbox (142, 117, 144) über der Antwort.
- Fehler: 4xx/5xx mit `{ "error": "<code>" }`. Die Seite zeigt dann automatisch passende Einträge aus der Offline-Suche.

Erwartungen an den Worker:
- Antwortet nur aus der Wissensbasis, in der Sprache `lang`, sonst ehrlich „weiss ich nicht, ruf 142 an“.
- Bei Hinweisen auf akute Gefahr `emergency: true`.
- Kein Cookie, kein Logging. CORS nur für die Pages-Adresse (konfigurierbar) plus localhost.
