# 09 · Change log

*Wat is veranderd, waarom, wat bewust behouden is, en wat getest en weer verwijderd of teruggedraaid is. Sinds 19 oktober 2026 staat deze versie live op www.apero-culture.com; de oude site staat als archief op `apero-archief.vercel.app` (alleen met Vercel-login).*

---

## Bewust behouden

| Wat | Waarom |
|---|---|
| Logo, bloei-O, kleuren, Bodoni Moda + Hanken Grotesk | Dit is de identiteit; `apero-tokens.css` is ongewijzigd en wordt overal gebruikt |
| Fresco's, petal-patroon, boogkaders, cartouche, crème-wash | Zelfde bouwstenen, nu consequenter ingezet |
| Kort / middel / lang | Behouden en versterkt (zie hieronder) |
| Onthouden van leeskeuze, bladwijzers, lettergrootte, nachtstand | Overgenomen uit de oude reader |
| De zes werelden-longreads (`werelden/*.html`) | Inhoud ongewijzigd, alleen nieuwe navigatie en een herschreven intro |
| De dertien bestaande artikelen | Omgezet naar losse pagina's; tekst grotendeels intact |
| Lexicon, Aperokiezer, Atlas, FAQ, Partners, Pitch, Podcastplan, PWA-app | Blijven bestaan; nieuwe navigatie waar het een gewone pagina is |
| Oude Studio (`dashboard/`), partnerportaal, API's, carrouselgenerator | Ongewijzigd. Studio 2.0 staat ernaast in `studio/` |
| De tijdlijn "Van mulsum naar Utrecht" | Verhuisd naar de Over-pagina, licht herschreven |

## Veranderd: de publieke site

| Wat | Waarom |
|---|---|
| **Elk verhaal een eigen adres** (`/verhalen/<slug>.html`) | Delen, nieuwsbrief-links, zoekmachines. De oude reader had geen URL's per artikel |
| **Oude links blijven werken** (`lezen.html?ed=1&art=2` → juiste verhaal) | Niets breekt voor wie een oude link heeft |
| **Kort/middel/lang op de artikelpagina**, met uitleg per keuze en bruggen tussen de versies | Autonomie op het moment van lezen, niet alleen vooraf |
| **Middel loopt door in lang** zonder opnieuw te beginnen | De drempel om verder te lezen verdwijnt; progressive disclosure |
| **Tijdkeuze al op de voorpagina** bij het hoofdverhaal | De keuze meteen bij de voordeur |
| **Voorpagina als magazine**: hoofdverhaal, "Nieuw aan tafel", vier deuren (vraag/stad/glas/tijd), fragment, zes werelden, reeksen, nieuwsbrief, festivalhint | Van brochure naar plek om te lezen |
| **Klok en klokband** ("Het is 20:37 in Utrecht. In Athene…") | Maakt het concept (het uur trekt over de kaart) voelbaar; linkt naar steden |
| **Steden-pagina** met kaart | Navigeren via plekken; "verdwalen op een goede manier" |
| **Reeksen** (Om zes uur in…, Toen/nu, Wie zat waar, De ongeschreven regels, Eén glas één stad, Waarom we dit drinken, Op tafel, De zes werelden, Essay) | Terugkerende formats maken schrijven makkelijker en terugkomen logischer |
| **"Hierna" met reden** ("Ook in Athene", "Een andere tijd: 1881") | Aanbevelingen die zeggen waarom |
| **Bronnen alleen intern** (in `content/verhalen/*.md` en Studio), niet op de site | Besluit na de eerste review: bronvermelding op de site is niet nodig. Ook de oude "Bronnen (selectie)"-blokken van de wereldpagina's zijn weg; die lijsten staan in `content/wereldbronnen.md` |
| **Samengestelde scènes** gelabeld in de tekst | Beeldend schrijven zonder feiten te verzinnen |
| **Mobiele navigatie** (menu) | De oude site had onder 860px géén navigatie |
| **Echte nieuwsbriefaanmelding** (`api/aanmelden.mjs`, De Inschenker) | Was een `mailto:`-link. Werkt in testmodus tot er een dienst is gekoppeld, en zegt dat eerlijk |
| **Festivalpagina vertelt minder**: wat we weten, wat nog niet, wanneer je wat hoort | Progressive disclosure; ruimte voor herkenning later. De zes bars staan nog in de partnerpitch |
| **Over-pagina** met werkwijze | Uitleg van de labels, van kort/middel/lang en correcties |
| **Beeld klopt bij het verhaal** | Anijsgordel toonde Portugal; twee stukken deelden één Spaanse tuin |
| **Copy-pas op de AI-tics** in de wereldintro's en de oude artikelen | Zie playbook, "voor en na" |
| **Festival-plugs uit de essays** ("Op APERO laten we…") | Reclame in een verhaal kost vertrouwen |
| **Testomgevingsstrook + noindex** alleen op `*.vercel.app` | Geen verwarring met de echte site, geen dubbele content in Google, geen effect op productie |
| **`.vercelignore`** voor `docs/`, `tools/`, `content/` | Strategie en brondata zijn niet publiek |
| **`/studio` achter de redactie-login** in `middleware.js` | Zelfde bescherming als het oude dashboard |

## Nieuw: inhoud

- Vijf nieuwe verhalen, alle met bronnen: *Athene, 18:14* · *Spanje, 1974. En nu.* · *Wie betaalt?* · *Het loon werd in de kroeg betaald* · *Een schaduw, graag*.
- Een contentbank van 53 onderwerpen met invalshoek, bronnen, formats en prioriteit.
- Een voorgestelde planning tot juni 2027 (43 items) in Studio.
- Documenten 01–10 in `docs/nieuw/`.

## Nieuw: Studio 2.0

- Vier plekken: **Vandaag, Verhalen, Kalender, Bibliotheek**. De oude Studio had er tien.
- De contentbank *is* de kolom Idee. Een nieuw idee kost alleen een titel.
- De keten per verhaal: verhaal → social → nieuwsbrief → festival, zichtbaar en met één klik uit te breiden.
- De Bibliotheek bevat alle bronnen van alle verhalen (doorzoekbaar), de plekken, de beelden met gebruik, en deze documenten.
- Los gedeployed achter Vercel-authenticatie; testdata duidelijk gemarkeerd.

## Getest en weer veranderd of verwijderd

| Wat | Wat er gebeurde |
|---|---|
| **Voorpagina zonder de zes werelden** | In de eerste versie weggelaten om ruimte te maken voor verhalen. Bij de review voelde de pagina kaal en minder APÉRO: de gebogen fresco's zijn de visuele kern. Teruggezet als rij "Waar het begon". |
| **Groot verhaal-blok op de voorpagina** | Tekst belandde in de verkeerde kolom van het raster. Opbouw aangepast. |
| **Petal-patroon achter de stedenkaart** | Te druk; de stippen werden onleesbaar. Verwijderd. |
| **Kaartlabels automatisch links/rechts** | Amsterdam/Utrecht, Milaan/Venetië en Bilbao/Marseille overlapten; Porto, Marrakech en Beiroet vielen buiten beeld. Vervangen door een vaste plaatsing per stad. |
| **Studio: alle 48 ideeën in de kolom Idee** | Een muur waar niemand doorheen leest. Nu de acht belangrijkste, met "Toon alle". |
| **Studio: "festival"-label op elk kaartje** | Betekende daardoor niets meer. Nu alleen bij een sterke koppeling. |
| **Studio: afgeronde mijlpalen bij "Richting juni 2027"** | Leidde af. Alleen nog wat komt. |
| **Datum van nog niet verschenen verhalen tonen** | Een verhaal met "1 december 2026" erboven in september is verwarrend. Toekomstige data worden niet getoond. |
| **"Going Dutch" als eeuwenoude uitdrukking** | Bij de factcheck bleek de uitdrukking van rond 1900. Gecorrigeerd. |
| **"Met je handen op je rug"** (jenever buigen) | Niet in de bronnen: het gaat om drinken zonder handen. Gecorrigeerd. |
| **"Een uur rijden" naar Volos** | Het is ruim driehonderd kilometer. Gecorrigeerd vóór publicatie. |
| **Zeigarnik-effect als ontwerpprincipe** | Overwogen voor "cliffhangers" tussen versies. Na lezing van de meta-analyse (2025) vervangen door hervatten (Ovsiankina). |
| **Klok zonder uitleg** | Op de voorpagina verving de klok de enige zin die zegt wat APÉRO is. Een nieuwe bezoeker zag "Athene, 18:14" zonder te weten waar hij was. De definitie staat nu vast onder de klok. |
| **Klok 's avonds** | Na het uur zei de klok alleen twee tijden. Nu: "Het uur is voorbij. Morgen weer, rond zes." en overdag "Nog vier uur, dan begint het." |
| **Studio: nieuw idee onzichtbaar** | Bij de gebruikerstest bleef een oude zoekterm actief en belandde het nieuwe idee in het ingeklapte deel van de kolom. Nieuwe ideeën staan nu bovenaan, en filters worden gewist. |
| **Programmabeloftes over het festival** | Zinnen als "wat je in de verhalen leest, kom je er tegen" en "met de dranken en borden uit deze verhalen" beloofden een programma dat nog niet bestaat. Verwijderd: het festival wordt alleen aangekondigd. |
| **Inhoud van de oude Verhaal-pagina** | "Eén gebaar, duizend vormen", de drie vragen en zeven tijdlijnmomenten waren bij de overstap weggevallen. Teruggezet op de Over-pagina, opnieuw geschreven in de APÉRO-toon. Ook het lexicon, de Aperokiezer en de Atlas hebben weer een ingang op de voorpagina, en verhalen zijn weer op het beginscherm te zetten. |
| **Voorpagina opende met een verhaal** | Na livegang: een nieuwe bezoeker kreeg nergens te horen wat APÉRO Culture is. Eerst geprobeerd met een vraag als kop ("Wat dronken zij, en wat drink jij?") en collages van fresco's; dat vertelde nog steeds niet wat het is, en een proef met gegenereerde beelden paste niet bij de stijl. Nu een echte landing: groot bewegend fresco, de kop "Het aperitief, van Rome tot jouw terras", één zin die zegt wat het is, en drie blokken (verhalen, door de tijd, juni 2027). De rij eeuwen staat eronder. |
| **Festival op de achtergrond** | Voor de aankondiging op Nacht van de Wijn moet het festival bij binnenkomst meteen duidelijk zijn. Nu: een terracotta festivalbalk boven elke pagina (APÉRO Festival · Juni 2027 · plek), en de voorpagina opent met het festival: "Proef vijf eeuwen aperitief", de datum (juni 2027, precieze data volgen) en de plek, en wat je er doet. De festivalfeiten staan op één plek in `tools/bouw.mjs` (`FEST`). |
| **`.vercelignore` met `studio/`** | Hield ook het losse Studio-project leeg. Vervangen door login-bescherming via middleware. |

## Niet gedaan (bewust)

- Geen rebranding, geen nieuw logo, geen nieuwe kleuren.
- Geen AI-generatie van content in Studio.
- Geen koppeling met een nieuwsbriefdienst zonder account van jullie (zie `api/aanmelden.mjs`).
