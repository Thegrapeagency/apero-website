# APÉRO Culture — Content-dashboard

Het redactionele brein: hier zie je wat er wanneer gepubliceerd moet worden, voeg je content toe en plan je alles. Aparte app van de carousel-generator, maar ze delen `apero-tokens.css` en `data/content.json`.

## Waar staat de data

- **Canoniek: `/data/content.json`** (single source of truth). Het dashboard leest dit bij laden en exporteert ernaar terug. De geëxporteerde `content.json` commit je in de repo, dat is de echte opslag.
- **Werkstatus: `localStorage['apero_content_v1']`** zodat niets verloren gaat tussen sessies. Knop **Reset** wist de werkstatus en herlaadt uit `content.json`.
- **Roundtrip-veilig:** lezen -> bewerken -> *Exporteer content.json* -> committen -> opnieuw laden geeft exact dezelfde data (geverifieerd byte-identiek).
- **Optionele 1-klik-opslag:** `api/save-content.js` (Vercel function) commit `content.json` via de GitHub API. Staat UIT (`SAVE_API_ENABLED=false`); aanzetten zodra repo + `GITHUB_TOKEN` bestaan (zie de file).

## De vier views

1. **Tijdlijn** — maand + 4 weken per wereld (de maandmotor). Sleep een kaart naar een andere week/maand om de publicatiedatum te verzetten. Ongeplande items en het verdiepingsspoor staan onderaan.
2. **Werelden** — per thema, met het palet als accent. Items gegroepeerd op type.
3. **Kanban** — idee -> concept -> klaar -> gepland -> live. Sleep tussen kolommen.
4. **Lijst** — zoek + filter op type/wereld/status. Titel inline bewerkbaar, datum + status inline.

## Content toevoegen

- **+ Nieuw item**: plak markdown (eerste `#`-kop of regel = titel, rest = body) óf een JSON-item/array volgens het datamodel. Het dashboard detecteert automatisch welke van de twee.
- **Publiceren**: open een item -> datum kiezen -> *Zet op gepland* of *Publiceer nu*. Geplande items met een datum vandaag of in het verleden worden automatisch **live**.
- **Scan repo**: leest `data/content.json` opnieuw en merget klaargezette content erbij, gededupliceerd op slug/titel.

## Koppeling met de carousel-generator

- **Heen:** bij `social-carrousel`/`reel`-items opent *Maak carrousel* de generator met querystring `?source=dashboard&itemId&titel&tekst&thema`. De generator start voorgevuld.
- **Terug:** de generator schrijft naar `localStorage['apero_carousel_refs'] = { <itemId>: {carouselRef, slides, ts} }`. Het dashboard merget dat bij focus terug in het item (`carouselRef` + asset), zodat je ziet dat de visual klaar is (🎞️). Beide apps draaien op dezelfde origin, dus de localStorage-bus werkt.

## Merkregels (afgedwongen)

Importeert `apero-tokens.css` ongewijzigd. Voice-lint in de editor waarschuwt bij em-dashes, "proeverij", "APERO" zonder accent en reclame-clichés (merkbijbel §8). Themakleuren komen uit het palet, niet willekeurig.
