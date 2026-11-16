# Kompass-Chat (Cloudflare Worker)

Kleiner Server zwischen Seite und KI. Er versteckt den Zugang zur KI, antwortet **nur aus der Wissensbasis** (`site/data/knowledge.json`, `site/data/help.json`) und gibt zu jeder Aussage die Quelle zurück.

## So funktioniert eine Antwort

1. **Suchen**: passende Wissenseinträge finden, per Stichwort (`site/js/retrieve.js`) und per Bedeutung (mehrsprachiges Embedding `@cf/baai/bge-m3`, damit auch Fragen auf Arabisch oder Tigrinya deutsche Einträge finden).
2. **Füttern**: nur diese Einträge plus passende Hilfsstellen kommen mit nummerierten Quellen in den Prompt. Regel: keine Fakten aus dem eigenen Gedächtnis, jede Aussage mit `[n]`.
3. **Prüfen**: Zitate, die auf keine echte Quelle zeigen, werden entfernt, die übrigen neu nummeriert. Nur zitierte Quellen gehen zurück.
4. **Notfall**: Wörter wie „umbringen“, „Messer“, „schlägt mich“ (DE, EN, AR, TR, UK, TI) setzen `emergency: true` und stellen 117/144/142 vor die Antwort. Bei Suizid-Hinweisen zusätzlich 143. Das ist fest programmiert und hängt nicht von der KI ab.

Schnittstelle: siehe `../docs/schnittstellen.md` (POST `/chat`).

## Datenschutz

- Modell läuft auf **Cloudflare Workers AI**. Cloudflare nutzt Eingaben laut eigenen Bedingungen nicht zum Training.
- `observability` und Logs sind aus, der Code loggt nichts, Fehlermeldungen enthalten keine Frage.
- Kein Cookie, kein Speicher. Das Rate-Limit (10 Fragen/Minute) zählt nur im Arbeitsspeicher.
- CORS: Browser dürfen den Chat nur von der Seite in `ALLOWED_ORIGINS` (und localhost) aus nutzen.

## Kosten

Gratis-Plan reicht: Workers AI gibt 10'000 „Neurons“ pro Tag gratis. Eine Frage mit Llama 3.3 70B braucht grob 100 bis 150, also rund 70 Fragen pro Tag. Billiger und trotzdem gut mehrsprachig: `MODEL = "@cf/google/gemma-3-12b-it"` in `wrangler.toml`.

## Befehle

```bash
npm install
npm test                      # Tests mit Fake-KI, kein Konto nötig
npx wrangler login            # einmalig, öffnet den Browser
npx wrangler deploy           # online stellen, gibt https://kompass-chat.<name>.workers.dev aus
node scripts/ask.js https://kompass-chat.<name>.workers.dev "Darf er mein Geld nehmen?" de
```

Danach in `site/config.js` `chatUrl` auf die Worker-Adresse setzen und in `wrangler.toml` `ALLOWED_ORIGINS` auf die GitHub-Pages-Adresse (z.B. `https://name.github.io`), dann nochmal `npx wrangler deploy`.
