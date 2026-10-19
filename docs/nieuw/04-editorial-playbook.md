# 04 · Editorial playbook

*Voor iedereen die voor APÉRO schrijft, redigeert of iets op Instagram zet. Kort genoeg om te onthouden, lang genoeg om bij te twijfelen.*

---

## Waar APÉRO over gaat

Over het uur tussen werk en diner, overal. Niet over drank. De drank is de ingang: via het glas komen we aan tafel, en aan tafel zien we hoe mensen leven. Wie er zit. Wie niet. Wie betaalt. Hoe laat. Hoe lang. Wat er veranderde.

**De vraag achter elk verhaal:** wat gebeurt er rond die tafel, en wat zegt dat over de mensen eromheen?

## Tone of voice

APÉRO klinkt als een nieuwsgierig mens die goed heeft opgelet. Iemand die aan tafel een verhaal vertelt en merkt wanneer het genoeg is.

**Wel**
- Concreet. Een tijdstip, een getal, een naam, een geluid.
- Droog, soms. ("Het enige wat overal fout is, is de rekenmachine op je telefoon.")
- Wisselende zinslengte. Korte zinnen mogen. Lange ook, als ze iets dragen.
- Een observatie laten staan zonder hem uit te leggen.
- Een einde dat openblijft.
- Nederlands. Buitenlandse woorden cursief, één keer uitgelegd.

**Niet**
- "Niet X, maar Y" als reflex. Eén keer per stuk is genoeg, nul is vaak beter.
- Drie bijvoeglijke naamwoorden op een rij ("langzaam, lokaal, analoog").
- De les nog eens herhalen in de slotzin ("De vraag is niet wat je drinkt, maar wat je opent.").
- Ontdek-taal ("Stap binnen in de wereld van…", "Ontdek de magie van…").
- Reclame midden in een verhaal ("Op APÉRO laten we je dit live zien!").
- Superlatieven zonder bewijs ("de mooiste", "het beste").
- Em-dashes (—). Gebruik een dubbele punt, komma of een nieuwe zin.

### Voor en na (echte zinnen van de oude site)

| Voor | Na | Waarom |
|---|---|---|
| "Stap binnen in de wereld waar het bittere geen bijwerking is, maar het punt." | "Bitter is hier geen bijwerking." | Geen ontdek-taal, geen tegenstelling-reflex |
| "Geen proeverij, een wereldreis." | "Een paar dagen lang wordt het uur tussen werk en diner een plek waar je naartoe kunt." | Zeg wat het is, niet wat het niet is |
| "Wie op APERO zijn eerste slok Campari neemt en zijn gezicht voelt samentrekken: dat is geen afkeer." | "Wie voor het eerst Campari drinkt en zijn gezicht voelt samentrekken, hoeft zich geen zorgen te maken. Het tweede slokje smaakt al anders." | Geen festivalplug, eindigt op een ervaring |
| "De vraag is niet: wat drink je? De vraag is: wat open je?" | *(geschrapt)* | De lezer had het al begrepen |

### De AI-toets (vóór elke publicatie)
Lees het stuk hardop en vraag:
1. Staat er een zin in die in elk willekeurig lifestyleblad had kunnen staan? Schrappen of concreet maken.
2. Hoe vaak staat er "niet… maar"? Meer dan één keer: herschrijven.
3. Eindigt elke alinea op een conclusie? Laat er een paar gewoon ophouden.
4. Zijn alle zinnen ongeveer even lang? Breek er een paar.
5. Zou een vriend aan tafel dit zo vertellen?

## Storytelling: laat de lezer erbij zitten

Een goed APÉRO-verhaal begint vaak op een tijdstip en een plek, met wat je ziet voordat je weet wat het betekent.

**De zeven vragen van de tafel** (niet allemaal beantwoorden, wel allemaal stellen):
1. Hoe laat is het, en welke dag?
2. Wie zit er, en wie mist?
3. Wat staat er op tafel, en wie heeft het besteld?
4. Wat hoor je, wat ruik je?
5. Wie komt er binnen, en wat gebeurt er dan?
6. Wie betaalt?
7. Wat gebeurt er daarna?

**Structuur van een middellang verhaal (richtlijn, geen mal):**
1. Een scène of een feit dat verrast (de lezer zit meteen ergens).
2. Het eerste "waarom" (waarom zit hier niemand met honger?).
3. Twee of drie tussenkopjes die elk één ding laten zien.
4. Een verschuiving: een andere tijd, een andere plek, een andere groep mensen.
5. Een einde dat terugkeert naar de tafel, zonder moraal.

## Samengestelde scènes: de belangrijkste regel

We verzinnen geen gebeurtenissen en presenteren ze niet als feit. Maar een verhaal mag de lezer aan een tafel zetten die er zo *had kunnen* zijn.

- Een **samengestelde scène** is gebaseerd op bronnen (hoe laat men eet, wat er op tafel staat, wat de etiquette is) en beschrijft geen specifieke avond.
- Hij staat in de tekst in een eigen blok met het label **Samengestelde scène**, en onder het stuk wordt uitgelegd waarop hij gebaseerd is.
- Er komen **geen echte, herkenbare personen** in voor. Geen citaten die niemand gezegd heeft.
- Is iets echt waargenomen (een reportage), dan staat er gewoon wat we zagen, met datum en plek. Dan is het geen samengestelde scène.

In de markdown ziet dat zo uit:
```
[[scene
Het is 18:14 op een dinsdag in oktober…
]]
```

## Bronnen en factchecking

De bronnen staan **niet op de site** (besluit redactie, oktober 2026), maar wel intern: in het blok `::: bronnen` van elk verhaal en in Studio (Bibliotheek → Bronnen). Elke bewering krijgt daar een label. Wat de lezer wél ziet: overlevering wordt in de tekst zelf zo genoemd ("het verhaal gaat…"), en samengestelde scènes hebben hun label.

| Label | Betekenis | Voorbeeld |
|---|---|---|
| **Feit** | Met een bron die je kunt nalezen | De Drankwet ging in op 1 november 1881 |
| **Overlevering** | Vaak verteld, niet te bewijzen | De wijnverkopers in de schaduw van de campanile |
| **Observatie** | Waargenomen, niet gemeten | Op zondag lopen Griekse lunches vaak door |
| **Interpretatie** | Wat de redactie ervan denkt | "Het doel is overal dat er niet gerekend hoeft te worden" |
| **Scène** | Samengestelde scène, zie hierboven | De tafel in Pangrati |

**Werkwijze**
1. De schrijver houdt tijdens het schrijven een bronnenlijst bij (Studio → verhaal → Bronnen).
2. Bij twijfel: twee onafhankelijke bronnen, of het label *overlevering*.
3. Wikipedia mag als startpunt, liefst met de bron eronder erbij.
4. Merkwebsites en reisgidsen zijn bron voor wat een merk *zegt*, niet voor wat *waar* is.
5. **Tweede lezer**: iemand die het stuk niet schreef, loopt de bronnenlijst na vóór publicatie. Dat is een taak in de kalender.
6. **Correcties** zetten we onder het stuk met datum. Nooit stil aanpassen.

## Kort, middel, lang

| | Kort | Middel | Lang |
|---|---|---|---|
| Lengte | 150–350 woorden · 1–2 min | 700–1.300 woorden · 4–6 min | Middel + 600–1.500 woorden |
| Doel | De kern, en één beeld om te onthouden | Het hele verhaal | Wat er verder nog te vertellen is |
| Vorm | Eigen tekst, geen samenvatting van middel | Staat op zichzelf | Een *vervolg* op middel: de lezer hoeft niet opnieuw te beginnen |
| Scène | Mag één korte | Meestal één of twee | Mag meer |

**Regels**
- **Kort is geschreven, niet ingekort.** Lees kort alsof je het aan tafel vertelt in één minuut.
- **Kort bevat het antwoord.** Is de titel een vraag, dan staat het antwoord in de korte versie.
- **Lang gaat door waar middel stopt.** De site toont dan "Vanaf hier: de lange versie" en de lezer leest gewoon door. (Oudere stukken hebben een volledige lange versie; dat mag, maar voor nieuwe stukken is het vervolg de norm.)
- **Niet elk verhaal hoeft lang.** Liever geen lange versie dan een opgevulde.
- **De bruggen** tussen de versies schrijft de site zelf, maar noem in de korte versie niet wat er in de lange staat.

## Soorten verhalen (de reeksen)

| Reeks | Wat | Vorm |
|---|---|---|
| **Om zes uur in…** | Eén stad op het moment dat de dag omslaat | Scène + uitleg; reportage als het kan |
| **Toen / nu** | Dezelfde plek, vijftig jaar uit elkaar | Twee scènes, dan wat veranderde en bleef |
| **Wie zat waar** | Klasse, gender, werk aan tafel | Sociale geschiedenis met cijfers en getuigen |
| **De ongeschreven regels** | Etiquette, vergelijkend | Vier landen, vier regels, één inzicht |
| **Eén glas, één stad** | Een drankje dat een stad uitlegt | Kort en precies |
| **Waarom we dit drinken** | Geschiedenis, scheikunde, toeval | Vraag in de titel, antwoord in kort |
| **Op tafel** | Het bord naast het glas | Beeld eerst |
| **De zes werelden** | De lange basisverhalen | Longread met tijdlijn |
| **Essay** | De eigen stem | Eén gedachte, uitgewerkt |

## Beeld

- **De fresco's zijn de huisstijl**: geschilderde scènes met een crème-wash, altijd in een boogkader of met een cartouche. Nooit rauw full-bleed.
- **Beeld moet bij het verhaal passen.** Geen fresco van Portugal bij een verhaal over Libanon. Als er geen passend beeld is: het petal-patroon met een cartouche. Dat is geen nood, dat is de stijl.
- **Eigen fotografie** (reportages, portretten) krijgt dezelfde behandeling: crème-wash, boogkader op de site, geen filters.
- **Archiefbeeld** alleen met vastgelegde rechten. Noteer herkomst en licentie in Studio.
- **AI-gegenereerde beelden** worden niet gebruikt om echte plekken, mensen of historische momenten "na te maken". De bestaande fresco's zijn illustraties in een herkenbare stijl, niet documentaire beelden, en worden ook zo gebruikt.

## Wat typisch APÉRO is

- Een tijdstip in de eerste zin.
- Een woord uit een andere taal dat je daarna niet meer vergeet (*kerasma*, *bote*, *ombra*).
- Een regel die niemand opschreef.
- Een cijfer dat een sociale verhouding zichtbaar maakt (45.000 schenkers, 12.000 sluitingen).
- Een Nederlandse spiegel, soms.
- Een eerlijk "dit weten we niet zeker".
- Geen haast.

## Checklist vóór publicatie

- [ ] Kort, middel (en eventueel lang) staan en lezen los
- [ ] Titel, ondertitel en intro kloppen met de inhoud (geen gap die niet gesloten wordt)
- [ ] Bronnen (intern, `::: bronnen`) zijn compleet en gelabeld; tweede lezer heeft gekeken
- [ ] Samengestelde scènes zijn gemarkeerd
- [ ] Beeld past, herkomst genoteerd
- [ ] AI-toets gedaan (hardop gelezen)
- [ ] Plekken, dranken en *verder* ingevuld (voor het spoor op de site)
- [ ] In Studio: social-afgeleiden en nieuwsbrief gepland
