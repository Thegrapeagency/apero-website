# APÉRO Culture — Content-dashboard

Het redactionele brein: hier zie je wat er wanneer gepubliceerd moet worden, voeg je content toe en plan je alles. Aparte app van de carousel-generator, maar ze delen `apero-tokens.css` en `data/content.json`.

## Waar staat de data

- **Canoniek: `/data/content.json`** (single source of truth). Het dashboard leest dit bij laden en exporteert ernaar terug. De geëxporteerde `content.json` commit je in de repo, dat is de echte opslag.
- **Werkstatus: `localStorage['apero_content_v1']`** zodat niets verloren gaat tussen sessies. Knop **Reset** wist de werkstatus en herlaadt uit `content.json`.
- **Roundtrip-veilig:** lezen -> bewerken -> *Exporteer content.json* -> committen -> opnieuw laden geeft exact dezelfde data (geverifieerd byte-identiek).
- **Optionele 1-klik-opslag:** `api/save-content.mjs` (Vercel function) commit `content.json` via de GitHub API.

## Publiceren (echte pagina's live zetten)

De knop **Publiceer nu** in een item roept `api/publish.mjs` aan. Die:
1. rendert het item tot een on-brand artikelpagina (zelfde opbouw als de rest van de site: nav, `article-hero`, `prose/narrow`, footer, `styles.css`);
2. commit de pagina (op de slug van het item) + de bijgewerkte `content.json` in één commit via de GitHub Git Data API;
3. Vercel deployt automatisch, de pagina staat binnen ~10s live op `apero-culture.com/<slug>`.

**Eenmalige setup** (Vercel → Project `apero-website` → Settings → Environment Variables):

| Env-var | Waarde |
|---|---|
| `GITHUB_TOKEN` | Fine-grained PAT met **Contents: read and write** op `Thegrapeagency/apero-website` |
| `GITHUB_REPO` | `Thegrapeagency/apero-website` (default, optioneel) |
| `GITHUB_BRANCH` | `main` (default, optioneel) |
| `CONTENT_PATH` | `dashboard/data/content.json` (default, optioneel) |

Zolang `GITHUB_TOKEN` niet gezet is, geeft Publiceren een nette melding en gebeurt er niets. De route zit achter dezelfde basic-auth als het dashboard, dus alleen de redactie kan publiceren; het token blijft server-side.

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
