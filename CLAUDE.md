# apero-culture.com

De website, het magazine en de magazine-app van APÉRO Culture: een onderzoek naar de Europese aperitiefcultuur, bekroond met een festival (juni 2027, Noordsepark, Utrecht). Statische HTML, CSS en JavaScript zonder build-stap, gehost op Vercel. Elke merge naar `main` gaat direct live.

- Merkbasis: `apero-tokens.css` (kleuren panna, burro, terracotta, mattone, salvia, espresso; Bodoni Moda voor koppen, Hanken Grotesk voor tekst; de bloei-O). Algemene stijl in `styles.css`, gedeeld script in `site.js`.
- Veel pagina's worden gegenereerd door `node tools/bouw.mjs` uit `content/` en `tools/sjablonen/` (verhalen, voorpagina, festival, Over, De Inschenker). Pas bij die pagina's de bron aan en draai daarna het bouwscript; anders gaat je wijziging bij de volgende bouw verloren.
- De magazine-app staat in `app/` (PWA: `index.html`, `app.js`, `app.css`, `content.js`, `sw.js`). Verhoog bij een wijziging de cacheversie in `sw.js`.
- Let op: de globale regels in `styles.css` voor `section`, `footer` en `header` werken op elke pagina door.

## Als je als bouwbot werkt (GitHub Action)

Je krijgt een bouwverzoek uit APÉRO Studio. Het label `site` of `app` zegt waar het over gaat. De aanvrager is geen programmeur. Werk zo:

1. Lees het verzoek en zoek de bestanden op die erbij horen.
2. Maak de wijziging zo klein en netjes mogelijk, in dezelfde stijl als de code eromheen, met de bestaande tokens en klassen.
3. Draai `node tools/bouw.mjs` als je iets in `content/` of `tools/sjablonen/` hebt aangepast. Controleer gewijzigde JavaScript met `node --check`.
4. Commit op je eigen branch. Open een pull request naar `main` met een titel die begint met het issuenummer en een korte uitleg in gewone taal: wat er veranderd is en hoe je het test.

### Harde regels (het harnas)

- Raak deze bestanden nooit aan: `api/`, `.github/`, `supabase/`, `middleware.js`, `vercel.json`, `.vercelignore`, `CLAUDE.md`, `js/shop.js`, `js/ticketbeheer.js`, `ticketbeheer.html`, `scanner.html`, `tickets.html`, `bedankt.html`, `voorwaarden.html`, `tools/sjablonen/kassa.mjs`, `dashboard/`, `studio/`, `partner/`, `.env*`. Een wijziging daarin wordt automatisch tegengehouden.
- Geen nieuwe externe scripts of diensten, geen sleutels in de code.
- Heeft een wens een serverfunctie nodig (bijvoorbeeld AI in de app)? Bouw de voorkant zo dat die netjes werkt zolang de functie er nog niet is, en beschrijf in de pull request welke functie Milan moet toevoegen.
- Verwijder nooit inhoud die niet in het verzoek genoemd wordt.

### Schrijfstijl

Nederlands, je-vorm, nooit "u". Geen gedachtestreepjes of liggende streepjes (— of –) in zinnen. Schrijf het merk als APÉRO, met accent. Nooit het woord "proeverij". Geen reclameclichés, geen retorische vragen, geen zelfbedachte slogans. Concreet boven abstract.
