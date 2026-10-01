/* Over APÉRO (verhaal.html). Bevat ook de werkwijze (#werkwijze), waar elk artikel naar linkt. */
export function pagina({ html }) {
  const tijdlijn = [
    ['Rome, eerste eeuw', 'Mulsum en de gustatio', 'Vóór het banket komt de gustatio: eieren, olijven, schelpdieren, en een beker mulsum, wijn met honing. Het woord aperitivus is dan al een medische term voor middelen die de eetlust openen.'],
    ['Athos, veertiende eeuw', 'De monniken en de anijs', 'Op de berg Athos brengen monniken hun druivendistillaat op smaak met anijs. De verre voorouder van ouzo, rakı en arak.'],
    ['Amsterdam, rond 1679', 'Het proeflokaal', 'Bij Wynand Fockink gaat de jenever tot de rand in het tulpglas. De eerste slok neem je voorovergebogen.'],
    ['Turijn, 1786', 'De kruidenwinkel', 'Antonio Benedetto Carpano mengt moscatowijn met kruiden en alsem. Vermout krijgt een geboortejaar en een adres.'],
    ['Andalusië, negentiende eeuw', 'Een plak ham op het glas', 'Een barman zou een plak ham op het glas hebben gelegd, tegen de vliegen. Of het zo ging, weet niemand. Wel dat er in Spanje sindsdien zelden een glas alleen komt.'],
    ['Marokko, negentiende eeuw', 'Thee via een omweg', 'Chinese groene thee, aangevoerd door Britse handelaren, wordt van een luxe voor weinigen een drank voor iedereen. Atay wordt een nationaal ritueel, zonder alcohol.'],
    ['Parijs, 1846', 'Het medicijn in de wijn', 'Joseph Dubonnet verstopt kinine, het bittere middel tegen malaria, in zoete wijn. Het medicijn raakte uit de mode. De wijn bleef.'],
    ['Tyrnavos, 1856', 'De eerste ouzo', 'Kort na de Griekse onafhankelijkheid opent de eerste echte ouzostokerij.'],
    ['Milaan, jaren 1860', 'Milano-Torino', 'De bitter van Milaan en de vermout van Turijn in één glas. Met een scheut soda erbij heet hij later Americano.'],
    ['Nederland, 1881', 'De Drankwet', 'Wie jenever schenkt, heeft voortaan een vergunning nodig. Lonen mogen niet meer in de kroeg worden uitbetaald.'],
    ['Reus, eind negentiende eeuw', 'De zondag van de vermut', 'In dit Catalaanse stadje maken tientallen stokerijen vermut. Het uur voor de zondagse lunch krijgt er een vaste afspraak.'],
    ['Florence, 1919', 'De graaf en de gin', 'Graaf Camillo Negroni laat de soda in zijn Americano vervangen door gin, zo gaat het verhaal.'],
    ['Volos, na 1922', 'Een bord bij elk glas', 'Vluchtelingen uit Klein-Azië drinken na het werk tsipouro met wat vis. Bij elk flesje komt een ander bordje.'],
    ['Marseille, 1932', 'Geboren uit een verbod', 'Paul Ricard vult het gat dat het absintverbod van 1915 achterliet.'],
    ['Venetië, jaren zeventig', 'De spritz krijgt zijn vorm', 'Wijn, bubbels en een bitter, naast de cicchetti van de bacari. De oranje versie die de wereld rondging, kwam later.'],
    ['Spanje, 1974', 'De toog', 'Vermut van de tap, dominostenen op marmer, en bijna alleen mannen aan de bar.'],
    ['Milaan, rond 2000', 'Apericena', 'Het aperitivo-buffet wordt zo groot dat studenten er hun avondeten van maken. Grootmoeders zijn er niet blij mee.'],
    ['Madrid en Barcelona, rond 2010', 'De vermut komt terug', 'Een nieuwe generatie haalt de drank van opa terug, en de zondag erbij.'],
    ['Utrecht, juni 2027', 'APÉRO', 'Het uur tussen werk en diner wordt een plek waar je naartoe kunt.']
  ];  const body = `<header class="pkop"><div class="w">
<span class="lbl">Over APÉRO</span><h1 class="kop-xl">Het uur tussen werk en diner</h1>
<p class="stand" style="max-width:40ch">APÉRO komt van het Latijnse <em>aperire</em>: openen. De eetlust, het gesprek, de avond.</p>
</div></header>

<section class="blok"><div class="w-lees proza">
<p>Ergens tussen de middag en de avond is er in bijna elke cultuur een uur dat nergens voor dient. Het werk is klaar, het eten is er nog niet. In Milaan heet dat uur <em>aperitivo</em>, in Marseille <em>l'apéro</em>, in Barcelona is het een werkwoord: <em>fer el vermut</em>. In Marrakech is het thee, van hoog ingeschonken. In Nederland heet het, eerlijk gezegd, vaak de file.</p>
<p>APÉRO gaat over dat uur. Over wat er in het glas zit, en vooral over wat er rond de tafel gebeurt: wie er zit en wie niet, wie er betaalt, wat er op het bord ligt, hoe laat men komt en hoe lang men blijft. En over hoe dat veranderde. Een Spaanse bar in 1974 was een andere plek dan dezelfde bar nu, en het verschil zegt iets over Spanje.</p>
<p>We zijn geen wijnblad en geen reisgids. We schrijven voor mensen die nieuwsgierig zijn naar hoe andere mensen leven, en die dat het liefst aan tafel ontdekken.</p>
<h2>Hetzelfde gebaar, overal anders</h2>
<p>Ergens tussen vijf en zeven gebeurt in Europa ongeveer hetzelfde. Iemand schenkt iets in. Er komt iets te eten bij. En er schuift iemand aan die niet was uitgenodigd.</p>
<p>Hoe dat gaat, verschilt per straat. In Milaan zet de barman olijven neer bij een glas dat nog niet besteld is, en gaat het er vooral om dat je gezien wordt. In Marseille gaat er water bij de pastis en wacht de jeu de boules nog even. In Barcelona doe je de vermut, op zondag, vóór de lunch. Op Lesbos wordt het glas wit. In Porto gaat er tonic bij de witte port, op een stoepje aan de rivier. En in Marrakech komt er geen druppel alcohol aan te pas: de gastheer schenkt thee van hoog, drie keer.</p>
<h2>Wat we steeds willen weten</h2>
<p>Bij elk verhaal komen we bij dezelfde drie vragen uit.</p>
<p><b>Wat staat er op tafel?</b> Niet alleen in het glas. Het bord ernaast zegt vaak meer: twee sardines op Lesbos, een gilda aan de toog in San Sebastián, een bitterbal die eigenlijk gewoon een meze is.</p>
<p><b>Wat doet het met je?</b> Bitter laat je langzamer drinken. Water bij anijs laat je wachten. Een bord dat je niet besteld hebt, laat je blijven zitten. Het uur werkt eerst op je lichaam, en pas daarna betekent het iets.</p>
<p><b>Wie schuift er aan?</b> En wie juist niet. Wie er in 1974 aan een Spaanse bar stond, of wie in 1881 in een Nederlandse kroeg zijn loon kreeg, zegt meer over een land dan wat er in het glas zat.</p>
<h2>Waarom</h2>
<p>Omdat Nederland dat uur een beetje kwijt is. We hebben de borrel, maar de borrel staat in de agenda en heeft een eindtijd. Elders is het het beste deel van de dag, en het duurt zo lang als het gesprek.</p>
<p>En omdat we het in juni 2027 willen laten zien. Dan wordt het uur tussen werk en diner een paar dagen lang een plek in Utrecht. Het magazine is geen voorprogramma van dat festival. Het festival is het magazine, maar dan met stoelen.</p>
</div></section>

<section class="blok" id="werkwijze"><div class="w-lees proza">
<span class="lbl">Zo werken we</span>
<h2 style="margin-top:10px">Wat klopt, en wat een verhaal is</h2>
<p>Verhalen over eten en drinken zitten vol mooie anekdotes die nooit gebeurd zijn. We schrijven alleen op wat we kunnen onderbouwen. Wordt iets al lang verteld maar valt het niet te bewijzen, dan noemen we het in de tekst ook zo: een verhaal, een overlevering.</p>
<p>Soms zetten we je aan een tafel die er zo had kunnen zijn: gebaseerd op wat we uitzochten, maar niet het verslag van één echte avond. Die herken je aan het label <b>Samengestelde scène</b>.</p>
<p>Zie je een fout? Mail <a href="mailto:hallo@apero-culture.nl">hallo@apero-culture.nl</a>. We verbeteren het, en zetten erbij wat er veranderd is.</p>
<h2>Kort, middel, lang</h2>
<p>Bij elk verhaal kies je zelf hoeveel tijd je hebt. De korte versie is de kern. De middellange is het hele verhaal. De lange gaat verder waar de middellange ophoudt, zonder dat je opnieuw hoeft te beginnen. Je keuze wordt onthouden, en je kunt altijd wisselen.</p>
</div></section>

<section class="blok"><div class="w">
<div class="bkop"><div><span class="lbl">Door de tijd</span><h2 class="kop-l">Van mulsum naar Utrecht</h2></div></div>
<p class="lede" style="margin:-6px 0 28px">Hoe verder we terugzochten, hoe minder dit een Europese uitvinding leek. Het is eerder iets wat mensen overal doen als de dag klaar is, en wat in Europa toevallig een naam kreeg. En er staat altijd een bord naast.</p>
<ol class="tijdlijn" style="max-width:720px">${tijdlijn.map(([y, t, p]) => `<li class="rv"><span class="y">${y}</span><h3>${t}</h3><p>${p}</p></li>`).join('')}</ol>
</div></section>

<section class="blok"><div class="w"><div class="twee" style="align-items:center">
<div class="rv"><span class="lbl">Het merk</span><h2 class="kop-l" style="margin:10px 0 16px">De O gaat open</h2>
<p class="lede">In het merkteken gaat de O letterlijk open: vier cirkels bloeien tot een bloem met een open hart. Een zon, een gedeeld bord, het ronde moment waar iedereen omheen gaat zitten.</p>
<p class="lede" style="margin-top:14px">APÉRO is een initiatief van The Grape Agency, het team achter onder meer Meisjes van de Wijn en Nacht van de Wijn.</p></div>
<div class="rv" style="display:flex;justify-content:center"><span class="lockup" style="font-size:clamp(80px,16vw,170px)">APÉR<span class="flower"></span></span></div>
</div></div></section>`;
  return html({ titel: 'Over · APÉRO Culture', omschrijving: 'APÉRO is een magazine over het uur tussen werk en diner, en in juni 2027 een festival in Utrecht. Zo werken we.', pad: '/verhaal.html', actief: '/verhaal.html', body });
}
