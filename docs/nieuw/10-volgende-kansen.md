# 10 · Volgende kansen

*Duidelijk gescheiden: wat nu nodig is, en wat later interessant wordt.*

---

## Nu nodig (vóór of vlak na livegang)

1. **Besluit: de nieuwe versie live of niet.** Vergelijk `apero-nieuw.vercel.app` met de huidige site. Livegang = de branch mergen naar `main`. Doe dat pas na een expliciet akkoord.
2. **Nieuwsbriefdienst koppelen.** Voorstel: Brevo (Europees, dubbele opt-in, gratis tot een behoorlijke lijst). Zet `BREVO_API_KEY`, `BREVO_LIST_ID`, `BREVO_DOI_TEMPLATE_ID` in Vercel. Zonder dit bewaart het formulier niets (en zegt het dat ook).
3. **Tweede lezer voor de vijf nieuwe verhalen.** Loop de bronnen na, vooral waar een bron een reisgids is. Het playbook beschrijft hoe.
4. **Beeldrechten vastleggen.** Herkomst en licentie van de fresco's noteren in Studio (Bibliotheek → Beelden).
5. **Analytics aanzetten** (Vercel Web Analytics staat al in de pagina's). Kijk na drie maanden naar: welke reeksen worden uitgelezen, waar haken mensen af, welke kort-versies leiden tot middel.
6. **Instagram-bio en highlights** aanpassen aan "magazine eerst".
7. **Studio-data vastleggen.** Studio bewaart in de browser. Spreek af wie wekelijks exporteert naar `content/`, tot er een gedeelde opslag is (zie hieronder).
8. **Festivaldatum en -plek** vóór 30 november, anders schuift de hele planning.

## Later interessant

### Product
- **Gedeelde opslag voor Studio**, zodat het hele team dezelfde planning ziet zonder export. Opties: een kleine database, of Studio laten committen naar de repo via de bestaande `api/save-content.mjs`-aanpak. Pas doen als twee mensen tegelijk in Studio werken.
- **Publiceren vanuit Studio.** De oude Studio had een publiceerknop via de GitHub API (`api/publish.mjs`). Die kan worden hergebruikt voor `content/verhalen/*.md` + het bouwscript.
- **Zoeken op de site**, zodra er meer dan ± 40 verhalen zijn.
- **Audioversie van de lange verhalen** (voorgelezen), als brug naar de podcast die al gepland stond.
- **Een echte kaart** met kustlijnen (open data, eigen stijl) als de stedenlijst groeit.
- **Lezersbijdragen**: een formulier voor "de tafel bij jou" dat materiaal oplevert voor verhalen (met toestemming en redactie).
- **Printeditie** of een klein boekje bij het festival met de beste verhalen.

### Editorial
- **Reportages ter plekke** (Volos, Utrecht, Bilbao) om samengestelde scènes te vervangen door waargenomen scènes.
- **Gastschrijvers** uit de steden zelf, zoals Vittles dat doet: een Griekse schrijver over Athene, een Libanese over Beiroet.
- **Engelse versie** van de beste verhalen, als het festival internationale bezoekers trekt.
- **Een jaarlijkse "tafel van het jaar"**: een terugkerend moment dat pers oplevert.

### AI, verantwoord
- **Researchhulp in Studio**: bronnen samenvatten, een eerste bronnenlijst voorstellen, of controleren of elke bewering een label heeft. Altijd als suggestie, nooit als tekst die zo online gaat.
- **Varianten voor social** uit een bestaand verhaal (carrouseltekst, alt-teksten), door een redacteur te kiezen en te herschrijven.
- **Niet doen:** verhalen laten genereren, scènes laten verzinnen, of volume maken.

### Festival
- **De bote als betaalsysteem** op het festival (een gedeelde tegoedkaart per groep): een verhaal dat een product wordt.
- **Een bord dat niemand bestelt**: een kerasma-moment per bar.
- **Het uur op tijd**: het programma begint echt om 17:30, met een klok die per bar het uur van die stad toont.
- **Na het festival**: het magazine gaat door. Het festival wordt een jaarlijkse editie, geen eindpunt.
