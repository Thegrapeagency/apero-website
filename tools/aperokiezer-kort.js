const W = {
 italie:{n:'Italië, het podium',d:'Jij drinkt om erbij te zijn. Jouw glas: een Negroni of een Spritz met Select, met olijven die je niet besteld hebt.',u:'werelden/italie.html',m:[0,1],mt:'Italië, het podium (Editie 1)'},
 frankrijk:{n:'Frankrijk, de pauze',d:'Jij wil dat de tijd ophoudt. Jouw glas: een pastis, één deel drank, vijf delen water, nul haast.',u:'werelden/frankrijk.html',m:[0,0],mt:'Achttien uur, overal (Editie 1)'},
 spanje:{n:'Spanje, de revival',d:'Jij gelooft in zondag. Jouw glas: vermut uit het vat, sinaasappel, olijf, en een sifón waar je zelf de baas over bent.',u:'werelden/spanje.html',m:[0,4],mt:'Het kleine woordenboek (Editie 1)'},
 anijsgordel:{n:'De anijsgordel',d:'Jij blijft het langst aan tafel. Jouw glas: ouzo of arak, melkwit geslagen, met een tafel vol mezze.',u:'werelden/anijsgordel.html',m:[1,0],mt:'De anijsgordel (Editie 2)'},
 portugal:{n:'Portugal, de verrassing',d:'Jij houdt van ontdekkingen zonder drukte. Jouw glas: een portonico, ijskoud, met munt, op een granieten stoepje.',u:'werelden/portugal.html',m:[1,3],mt:'Wat er op tafel staat (Editie 2)'},
 marokko:{n:'Marokko, de schenkende hand',d:'Jij weet dat het om de aandacht gaat. Jouw glas: atay, geschonken van dertig centimeter hoog, drie keer.',u:'werelden/marokko.html',m:[1,4],mt:'De opening zonder alcohol (Editie 2)'}};
const Q = [
 {q:'De middag loopt af. Waar zit je het liefst?',a:[
  ['Aan een marmeren bar, goed gekleed','italie'],['Op een terras waar niemand op de klok kijkt','frankrijk'],
  ['Met familie aan een tafeltje op zondag','spanje'],['Aan een tafel die steeds voller raakt met schaaltjes','anijsgordel'],
  ['Op een stoepje aan het water','portugal'],['Binnen, waar iemand voor je inschenkt','marokko']]},
 {q:'Wat zegt jouw glas over je?',a:[
  ['Bitter. Ik hou van een drank met een rem','italie'],['Anijs en water. Haast en ik verdragen elkaar niet','frankrijk'],
  ['Iets van het vat, niks uit een fles met een verhaaltje','spanje'],['Het verandert van kleur als ik er aandacht aan geef','anijsgordel'],
  ['Licht. Ik wil er meer dan één kunnen nemen','portugal'],['Geen alcohol nodig. Wel een ceremonie','marokko']]},
 {q:'Het beste deel van de apero is…',a:[
  ['Gezien worden terwijl je tijd hebt','italie'],['Dat de agenda ophoudt te bestaan','frankrijk'],
  ['Dat het elke week terugkomt, zelfde plek, zelfde mensen','spanje'],['Dat het naadloos overgaat in het diner','anijsgordel'],
  ['Iets ontdekken wat iedereen over het hoofd zag','portugal'],['De schenkende hand','marokko']]},
 {q:'Wat staat er naast je glas?',a:[
  ['Olijven die ik niet besteld heb','italie'],['Een zak chips en een saucisson, meer hoeft niet','frankrijk'],
  ['Een blikje ansjovis dat opengaat als een startschot','spanje'],['Schaaltjes. Heel veel schaaltjes','anijsgordel'],
  ['Een paar lupinebonen, de zee doet de rest','portugal'],['Amandelen, dadels en iets zoets','marokko']]},
 {q:'Je neemt één ritueel mee naar huis. Welk?',a:[
  ['De bar als podium: even iedereen zien en gezien worden','italie'],['De heilige pauze: niemand mag nog ergens heen','frankrijk'],
  ['De vaste zondag met de hele familie','spanje'],['Water bij de drank, tijd bij het gesprek','anijsgordel'],
  ['Het geheime drankje dat alleen wij kennen','portugal'],['Drie glazen: zacht, sterk, bitter','marokko']]}];
let scores={}, step=0;
// Bron: de compacte Aperokiezer (5 vragen) die t/m juli 2026 op app.html stond.
// De sitepagina app.html is nu de uitgebreide 32-vragen kieser (js/apero-atlas.js);
// de PWA gebruikt deze korte versie via tools/build-app-content.mjs.
