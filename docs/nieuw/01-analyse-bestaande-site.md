# 01 · Analyse van de bestaande APÉRO-site

*Geschreven vóór er iets veranderd werd. Basis: de volledige repo (branch `main` = productie), lokaal gerenderd op desktop (1366px) en mobiel (390px). De live-URL was vanuit de werkomgeving niet bereikbaar (egress-blokkade), de code wel.*

---

## Wat APÉRO nu zegt dat het is

> "Een onderzoek naar de Europese aperitiefcultuur." Bekroond met een festival in Utrecht, MMXXVII.

Het fundament is sterk en eigen:

- **Het woord.** *aperire*, openen. De O in het logo gaat open en bloeit. Dat idee (openen: de eetlust, het gesprek, de avond) draagt alles en is nergens anders zo geclaimd.
- **Het uur.** Niet de drank, maar het moment tussen werk en diner. Dat is het echte onderwerp, en het maakt APÉRO groter dan een drankplatform: iedere cultuur heeft zo'n uur, ook zonder alcohol (atay).
- **De tafel.** Glas, bord, gebaar, wie er aanschuift. In de latere commits al verbreed naar eten en lichaam.
- **De huisstijl.** Crème (panna), terracotta, boter (burro), salie, espresso. Bodoni Moda + Hanken Grotesk. De bloei-O, het petal-patroon, de boog-frames en de geschilderde fresco's met crème-wash, de cartouche. Consistent, warm, herkenbaar. Dit blijft.
- **Kort / middel / lang.** De lezer kiest vooraf hoeveel tijd hij heeft. Onthoudt de keuze, heeft bladwijzers, nachtmodus, lettergrootte. Dit is het slimste stuk product op de site.

## Antwoorden op de vragen uit de opdracht (zoals de site ze nu beantwoordt)

| Vraag | Huidig antwoord | Oordeel |
|---|---|---|
| Wat is APÉRO? | Een onderzoek + festival | Helder, maar klinkt als een project, niet als een plek om te lezen |
| Waarom bestaat het? | "Omdat wij dit moment vergeten zijn" (NL heeft de borrel, niet de apero) | Goed, persoonlijk, maar verstopt op `verhaal.html` |
| Wat is aperitivo culture? | Het uur tussen werk en diner, zes landen | Goed, maar vastgezet in zes *landen* |
| Welke wereld? | Zes werelden = zes landen = zes bars | Te snel ingevuld: het magazine en het festival zijn dezelfde lijst |
| Waarom terugkomen? | Drie edities, "groeiende blog" | Er is geen ritme en geen nieuwsbrief |
| Waarom delen? | Artikelen hebben geen eigen URL | Delen is technisch bijna onmogelijk |
| Rol van steden | Genoemd als decor (Milaan, Marseille…) | Geen navigatie via plekken |
| Rol van mensen | Vooral historische figuren (Campari, Negroni, Ricard) | Nauwelijks levende mensen, geen gewone mensen |
| Rol van geschiedenis | Sterk (tijdlijnen per wereld) | Vooral merk- en productgeschiedenis, weinig sociale geschiedenis |
| Sociale klasse, gender | Vrijwel afwezig | Grootste inhoudelijke kans |
| Magazine × festival | Magazine = uitleg van de zes festivalbars | Het magazine voelt als voorprogramma van het festival |

## Wat werkt (en blijft)

1. **De merkidentiteit** in zijn geheel.
2. **Kort/middel/lang** en de reader-functies (onthouden, bladwijzers, voortgang).
3. **De zes werelden-longreads** (`werelden/*.html`): serieus werk met tijdlijnen en bronnen.
4. **Het lexicon.** Goed naslagwerk, feitelijk van toon.
5. **Een paar echt goede zinnen.** "Zoet smaakt naar limonade. Bitter smaakt naar een besluit." "Het louche-effect is een klok zonder wijzers." "In Barcelona is het stil. De vermut is daar een zondagskind, en het is dinsdag."
6. **Alcoholvrij als volwaardige wereld** (Marokko). Inhoudelijk en commercieel slim.

## Wat niet werkt

### Product / UX
1. **Geen mobiele navigatie.** Onder 860px verdwijnen alle navigatielinks; er is geen menu. Op een telefoon kun je vanaf de homepage alleen scrollen.
2. **Verhalen hebben geen eigen adres.** Artikelen openen in een modale reader via `onclick`. Er zijn geen deelbare URL's per verhaal, geen eigen titel/omschrijving voor social previews, geen zoekmachine-indexering van de tekst.
3. **De nieuwsbrief bestaat niet.** "Houd mij op de hoogte" is een `mailto:`-link. Er wordt geen publiek opgebouwd.
4. **Beeld klopt vaak niet.** Het anijsgordel-artikel toont de Portugal-fresco; "Wat er op tafel staat" en "De generatie die minder drinkt" delen de tuin-fresco van Spanje.
5. **De reader op mobiel** heeft een te volle werkbalk (vijf knoppen + titel), en de keuze tussen versies ziet eruit als filters, niet als een uitnodiging.
6. **Van verhaal naar verhaal** kun je alleen vooruit/achteruit binnen een editie. Er is geen "als je dit mooi vond…", geen route via een stad, drankje of tijd.
7. **Versnippering.** Aperokiezer (32 vragen), Atlas, Lexicon, Podcastplan, Partnerpitch, PWA-app, carrouselgenerator: veel losse producten, weinig samenhang. De Aperokiezer verwijst naar leestitels die niet bestaan ("Nantes, 2010: negenduizend mensen").

### Verhaal / inhoud
8. **Het festival verklapt alles.** Zes bars, zes signature serves, hapjes per bar: alles staat er al. Er valt niets meer te ontdekken, en dus ook niets meer te herkennen.
9. **Te veel uitleg, te weinig tafel.** Veel stukken vertellen *wat iets betekent* in plaats van *wat je ziet*. De lezer zit zelden aan tafel.
10. **Inconsistenties.** Pitch spreekt van "5 dagen festival", de festivalpagina van "tot laat". Nergens staat juni 2027.

### Taal: het AI-randje
Terugkerende patronen die de tekst glad en voorspelbaar maken:

- **"Niet X, maar Y"** in bijna elke alinea ("Het is geen happy hour… het is verschijnen." "Geen proeverij, een wereldreis." "Niet omdat vermut hip was, maar omdat het ritueel klopte.")
- **Tricolons** ("langzaam, lokaal, analoog"; "Open de eetlust. Open het gesprek. Open de mond.")
- **Perfecte slotzinnen** die de les nog eens uitleggen ("De vraag is niet: wat drink je? De vraag is: wat open je?")
- **Reclameplugs midden in essays** ("Op APERO laten we het effect live zien…").
- **Ontdek-taal** ("Stap binnen in de wereld waar…", "Kies waar jouw avond opengaat").
- **Gelijke zinslengte**, weinig droogte, weinig twijfel.

## Studio (dashboard): huidige staat

- **Tien modules**: overzicht, publicaties, carrouselgenerator, Instagram, partners, ticketshop, draaiboek, statistieken, merk & assets, site & app, instellingen. Plus command palette.
- **82 items in `content.json`**, waarvan het grootste deel sjabloon-gegenereerd: per wereld dezelfde elf items ("Wist je dat: …", "Opening: …", "Recept: signature serve + hapje (…)"). Dat is precies de contentmachine die de opdracht niet wil.
- Data leeft grotendeels in `localStorage`, deels in de repo.
- Er is geen koppeling tussen een verhaal en zijn research, bronnen, social-afgeleiden of festivalrelevantie.

**Conclusie Studio:** te breed, te veel modules die op zichzelf staan, geen redactioneel hart. Opnieuw bouwen is gerechtvaardigd, mét behoud van de oude Studio (niets verwijderen).

## Hypothese voor de nieuwe versie

1. **Van project naar plek.** APÉRO is geen onderzoeksproject met een blog, maar een magazine over het uur tussen werk en diner. Het onderzoek is de houding, niet het product.
2. **Van zes landen naar een kaart vol tafels.** De zes werelden blijven, als één reeks binnen een groter magazine. Daarnaast: steden, tijden, gebruiken, mensen.
3. **Van uitleggen naar aan tafel zetten.** Nieuwe verhalen beginnen bij een situatie en eindigen bij een observatie, niet bij een les.
4. **Van alles vertellen naar laten ontdekken.** Het festival zegt minder, en laat dingen eerst in verhalen verschijnen.
5. **Van `mailto:` naar een echte lijst.** De nieuwsbrief wordt de ruggengraat richting juni 2027.
6. **Studio van tien modules naar vier plekken**: Vandaag, Verhalen, Kalender, Bibliotheek.
