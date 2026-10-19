# 00 · APÉRO, nieuwe versie: overzicht

*Waar alles staat, en hoe je het gebruikt.*

## De twee omgevingen

| | Adres | Wat | Toegang |
|---|---|---|---|
| **Huidige site** | apero-culture.nl / .com | Ongewijzigd, blijft live | Publiek |
| **APÉRO, nieuwe versie** | https://apero-nieuw.vercel.app | De volledige nieuwe site | Publiek, maar `noindex` en met een testomgevingsstrook |
| **APÉRO Studio 2.0** | https://apero-studio-thegrapeagencys-projects.vercel.app | De redactietafel | Alleen met een Vercel-login van het team |

Beide nieuwe omgevingen zijn aparte Vercel-projecten (`apero-nieuw`, `apero-studio`) en deployen vanaf branch `claude/loving-bell-sdc4eu`. Het productieproject `apero-website` is niet gewijzigd. Livegang = de branch mergen naar `main`, en alleen na jullie akkoord.

## De eindproducten

| | Wat | Waar |
|---|---|---|
| A | Nieuwe APÉRO-website | apero-nieuw.vercel.app · code in de repo |
| B | APÉRO Studio 2.0 | apero-studio (Vercel) · `studio/` |
| C | Editorial research | `02-editorial-research.md` |
| D | Editorial playbook | `04-editorial-playbook.md` |
| E | Contentbank (53 onderwerpen) | `05-contentbank.md` + Studio → Verhalen → Idee |
| F | Eerste serie verhalen | Athene, 18:14 · Spanje, 1974. En nu. · Wie betaalt? · Het loon werd in de kroeg betaald · Een schaduw, graag |
| G | Social timeline | `07-social-timeline.md` + Studio → Kalender |
| H | Marketing- en uitrolplan | `08-marketing-en-uitrol.md` (met "wat doen we volgende week") |
| I | Psychologie achter APÉRO | `06-psychologie-achter-apero.md` |
| J | Research summary | `03-research-samenvatting.md` |
| K | Change log | `09-changelog.md` |
| L | Volgende kansen | `10-volgende-kansen.md` |
| · | Analyse van de oude site | `01-analyse-bestaande-site.md` |

## Een verhaal toevoegen of aanpassen

1. Schrijf het verhaal in `content/verhalen/<slug>.md` (kopieer een bestaand bestand als voorbeeld). Bovenaan staan titel, reeks, plekken, dranken, beeld en datum; daaronder de blokken `::: kort`, `::: middel`, `::: lang` en `::: bronnen`.
2. Een samengestelde scène zet je tussen `[[scene` en `]]`.
3. Draai `node tools/bouw.mjs`. Dat maakt de verhaalpagina, werkt de index, de voorpagina, de stedenpagina en de Studio-data bij.
4. Commit en push. Vercel deployt vanzelf.

Status `klaar` of `gepubliceerd` = zichtbaar op de site. Status `idee`, `research`, `schrijven` of `redactie` = niet zichtbaar.

## Studio in één minuut

- **Vandaag**: wat de komende zeven dagen gebeurt, wat achterloopt, wat in de maak is, de volgende publicatie met zijn keten, en hoe ver juni 2027 nog is.
- **Verhalen**: van idee tot gepubliceerd. De kolom Idee is de contentbank. Klik een kaart open voor alle details en de keten (+ Social, + In De Inschenker).
- **Kalender**: verhalen, social, nieuwsbrief, festival en taken in één tijdlijn, met de fasen tot juni bovenaan.
- **Bibliotheek**: deze documenten, alle bronnen (doorzoekbaar), plekken en beelden.
- **+ Idee** (of de toets `n`): alleen een titel is genoeg.
- Wijzigingen worden in je browser bewaard. **Gegevens & export** bovenaan om te delen of vast te leggen.
