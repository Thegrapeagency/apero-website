/* Festivalpagina: het festival, de zes bars, de kassa en de praktische vragen.
   De kassa zelf (#ticketshop) wordt gevuld door /js/shop.js met de tickettypes
   uit het dashboard; prijzen in deze tekst moeten daarmee kloppen.
   Werk deze pagina per fase bij (zie docs/nieuw/08-marketing-en-uitrol.md). */
export function pagina({ html, esc, inschenkerBlok, OP_SLUG }) {
  const bars = [
    ['I', 'Het podium', 'Italië', 'Negroni en spritz met Select. Het aperitivo als theater, waar je naartoe gaat om gezien te worden.', 'italie', '/werelden/italie.html'],
    ['II', 'De pauze', 'Frankrijk', 'Pastis, één deel op vijf delen water. Je kijkt hoe het glas troebel wordt en de dag ophoudt.', 'frankrijk', '/werelden/frankrijk.html'],
    ['III', 'De revival', 'Spanje', 'Vermut uit het vat, met een sifón op tafel. De drank van opa, nu weer van iedereen.', 'spanje', '/werelden/spanje.html'],
    ['IV', 'De vertraging', 'De anijsgordel', 'Ouzo, rakı en arak. Er gaat water bij, het wordt melkwit, en dan wacht je.', 'anijsgordel', '/werelden/anijsgordel.html'],
    ['V', 'De verrassing', 'Portugal', 'Witte port met tonic, ijskoud, met munt. Wat ze in Porto lang voor zichzelf hielden.', 'portugal', '/werelden/portugal.html'],
    ['VI', 'De schenkende hand', 'Marokko', 'Atay, muntthee van dertig centimeter hoog ingeschonken. Helemaal zonder alcohol.', 'marokko', '/werelden/marokko.html']
  ];
  const sporen = [
    ['athene-1814', 'Een bord dat niemand besteld heeft.'],
    ['spanje-1974-en-nu', 'Een pot met geld op de toog, waaruit de hele middag betaald wordt.'],
    ['jenever-en-het-loon', 'De eerste slok, voorovergebogen, zonder handen.']
  ].filter(([s]) => OP_SLUG[s]);
  const vragen = [
    ['Wanneer is het precies?', 'In juni 2027, van donderdag tot en met zondag. Het wordt het tweede of het derde weekend van juni; de precieze data maken we deze winter bekend. Je ticket blijft gewoon geldig voor de dag die je kiest.'],
    ['Waar is het?', 'In het Noordsepark in Utrecht. Waar je precies naar binnen gaat en hoe je er het best komt, lees je hier zodra het terrein vastligt.'],
    ['Wat kost een ticket?', 'Een early bird kost € 9,50, voor elke dag hetzelfde. Daar komt € 0,95 servicekosten per ticket bij, en € 0,33 per bestelling voor de betaling. Wat er in het glas en op het bord komt, reken je ter plekke af.'],
    ['Kan ik later van dag wisselen?', 'Ja. Op je ticketpagina kun je zelf een andere dag kiezen, zolang die dag niet vol is en je ticket nog niet gescand is. Dat kost niets.'],
    ['Kan ik mijn ticket doorgeven?', 'Ja. Op je ticketpagina stuur je een ticket door naar iemand anders, die het dan op eigen naam zet. Geld terug kan niet, behalve als het festival niet doorgaat. Zo staat het ook in de <a href="/voorwaarden.html">voorwaarden</a>.'],
    ['Ik drink geen alcohol. Is dit iets voor mij?', 'Ja. De bar van Marokko is helemaal alcoholvrij, en bij elke andere wereld hoort een alcoholvrije serve die er niet voor onderdoet. Alcohol schenken we alleen aan mensen van 18 jaar en ouder.'],
    ['Moet ik veel van drank weten?', 'Nee. Alles wordt uitgelegd en niets wordt verondersteld. Wie wil, leest zich vooraf in via de verhalen; wie dat niet doet, hoort het aan de bar.'],
    ['Ik ben mijn tickets kwijt.', 'Op <a href="/tickets.html">je tickets terugvinden</a> vul je het mailadres in waarmee je bestelde. Dan sturen we ze opnieuw.']
  ];
  const ld = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Festival', name: 'APÉRO Festival 2027',
    description: 'Vier dagen aperitiefcultuur in het Noordsepark in Utrecht: zes werelden, zes bars, en iets te eten naast elk glas.',
    startDate: '2027-06', eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'Place', name: 'Noordsepark', address: { '@type': 'PostalAddress', addressLocality: 'Utrecht', addressCountry: 'NL' } },
    offers: { '@type': 'Offer', name: 'Early bird', price: '9.50', priceCurrency: 'EUR', availability: 'https://schema.org/InStock', url: 'https://www.apero-culture.com/festival.html#tickets' },
    organizer: { '@type': 'Organization', name: 'APÉRO Culture', url: 'https://www.apero-culture.com' }
  })}</script>`;

  const body = `<header class="fkop">
<div class="petals" aria-hidden="true"></div>
<div class="w"><div class="fkop-in">
<div class="fkop-tekst">
<span class="lbl">APÉRO Festival · Noordsepark, Utrecht</span>
<h1 class="kop-xl">Het uur,<br><em>vier dagen lang.</em></h1>
<p class="stand">Donderdag tot en met zondag, in juni 2027. Zes werelden uit het magazine worden zes bars, en bij elk glas staat iets te eten.</p>
<p class="acties"><a class="knop knop-tickets" href="#tickets">Early bird · €&nbsp;9,50</a><a class="knop licht" href="#bars">De zes bars</a></p>
</div>
<div class="fkop-beeld rv"><div class="boog"><img src="/assets/fresco/fresco-04.jpg" alt="" loading="eager" decoding="async"><div class="wash"></div></div></div>
</div>
<dl class="feiten">
<div><dt>Wanneer</dt><dd>Juni 2027, do t/m zo</dd><dd class="klein">De data volgen deze winter</dd></div>
<div><dt>Waar</dt><dd>Noordsepark, Utrecht</dd><dd class="klein">Het precieze terrein volgt</dd></div>
<div><dt>Tickets</dt><dd>Early bird €&nbsp;9,50</dd><dd class="klein">Voor elke dag dezelfde prijs</dd></div>
</dl>
</div></header>

<section class="blok"><div class="w"><div class="twee">
<div class="rv"><span class="lbl">Wat het is</span><h2 class="kop-l" style="margin:10px 0 18px">Het magazine, maar dan met stoelen</h2>
<div class="proza">
<p>Ergens tussen vijf en zeven gebeurt in Europa ongeveer hetzelfde. Iemand schenkt iets in, er komt iets te eten bij, en er schuift iemand aan die niet was uitgenodigd. Daar schrijven we al maanden over, van een stoeptafel in Athene tot een Spaanse bar in 1974.</p>
<p>In juni zetten we die tafels neer. Niet als beurs met standjes en muntjes, maar als een terrein waar je rondloopt zoals je door een stad loopt: hier een vermut van het vat, daar thee van hoog, en overal een plek om te blijven zitten.</p>
<p>Het begint vroeg, rond het uur waar APÉRO over gaat. En het duurt zo lang als het gesprek.</p>
</div></div>
<div class="rv"><ul class="lijst-weten">
<li><span><b>Eten naast elk glas.</b> Olijven, iets zouts, een bord om te delen. Nooit op de droge hamer.</span></li>
<li><span><b>Alcoholvrij hoort erbij.</b> Een hele bar zonder alcohol, en bij elke andere wereld een serve die er niet voor onderdoet.</span></li>
<li><span><b>Masterclasses en gesprekken.</b> Per wereld, met de mensen die het maken, schenken en importeren.</span></li>
<li><span><b>Lezen mag, hoeft niet.</b> Wie de verhalen kent, herkent ze. Wie ze niet kent, hoort ze aan de bar.</span></li>
</ul></div>
</div></div></section>

<section class="blok" id="bars"><div class="w">
<div class="bkop"><div><span class="lbl">Het terrein</span><h2 class="kop-l">Zes werelden, zes bars</h2></div><a class="tekstlink" href="/verhalen/?reeks=werelden">Lees de zes werelden</a></div>
<p class="lede" style="margin:-8px 0 30px">Elke wereld uit het magazine krijgt een eigen bar, met een eigen ritueel en een eigen glas. Welke makers erachter staan, maken we bekend met het programma.</p>
<div class="bars">${bars.map(([n, naam, land, tekst, img, url]) => `<a class="bar rv" href="${url}">
<div class="boog"><img src="/assets/landen/${img}.jpg" alt="" loading="lazy" decoding="async"><div class="wash"></div></div>
<span class="bar-n">Bar ${n} · ${esc(naam)}</span><h3 class="kop-m">${esc(land)}</h3><p>${esc(tekst)}</p><span class="tekstlink">Lees ${esc(land === 'De anijsgordel' ? 'de anijsgordel' : land)}</span></a>`).join('')}</div>
</div></section>

<section class="blok kassa" id="tickets"><div class="w">
<div class="kassa-in">
<div class="kassa-tekst">
<span class="lbl">Tickets</span><h2 class="kop-l" style="margin:10px 0 16px">Early bird, €&nbsp;9,50</h2>
<p class="lede">Kies je dag. De early bird kost voor elke dag hetzelfde, en is er zolang de voorraad strekt.</p>
<ul class="kassa-noten">
<li>De precieze data volgen deze winter. Je ticket blijft geldig voor de dag die je kiest.</li>
<li>Kun je die dag toch niet? Dan wissel je zelf van dag op je ticketpagina.</li>
<li>Per ticket rekenen we € 0,95 servicekosten, per bestelling € 0,33 voor de betaling.</li>
<li>Je betaalt met iDEAL, creditcard, Apple Pay of Bancontact. Je tickets komen meteen in je mail.</li>
</ul>
<p class="klein-link">Al besteld? <a href="/tickets.html">Vind je tickets terug</a></p>
</div>
<div id="ticketshop" class="kassa-shop" data-shop><noscript><p>Zet JavaScript aan om tickets te kopen.</p></noscript></div>
</div>
</div></section>

<section class="blok"><div class="w"><div class="twee">
<div class="rv"><span class="lbl">Wat er nog komt</span><h2 class="kop-l" style="margin:10px 0 20px">In deze volgorde</h2>
<ol class="tijdlijn">
<li><span class="y">Nu</span><h3>De early bird</h3><p>€ 9,50 voor elke dag, zolang de voorraad strekt.</p></li>
<li><span class="y">Deze winter</span><h3>De data en het terrein</h3><p>Welk weekend het wordt, en waar je in het Noordsepark naar binnen gaat. Wie De Inschenker leest, hoort het een week eerder.</p></li>
<li><span class="y">Voorjaar 2027</span><h3>Het programma</h3><p>Wie er schenkt, wie er kookt, welke masterclasses er zijn. Stap voor stap, zodra het vaststaat.</p></li>
<li><span class="y">Juni 2027</span><h3>Aan tafel</h3><p>In het Noordsepark.</p></li>
</ol></div>
<div class="rv"><span class="lbl">Goed om te weten</span><h2 class="kop-l" style="margin:10px 0 20px">Vragen</h2>
<div class="vraaglijst">${vragen.map(([v, a]) => `<details class="weten"><summary>${esc(v)}<span class="pijl" aria-hidden="true">+</span></summary><p class="antwoord">${a}</p></details>`).join('')}</div>
<p style="margin-top:22px;font-size:15px;color:var(--ink-70)">Staat je vraag er niet bij? Mail <a class="tekstlink" style="text-transform:none;letter-spacing:0" href="mailto:hallo@apero-culture.nl">hallo@apero-culture.nl</a>. Ben je een merk, maker of importeur? <a class="tekstlink" href="/partners.html">Partners</a></p></div>
</div></div></section>

${sporen.length ? `<section class="blok"><div class="w">
<div class="bkop"><div><span class="lbl">Alvast aan tafel</span><h2 class="kop-l">Lees je in voor juni</h2></div><a class="tekstlink" href="/verhalen/">Alle verhalen</a></div>
<div class="raster r3">${sporen.map(([s, regel]) => { const v = OP_SLUG[s]; return `<a class="kaart rv" href="${v.url}?v=m"><div class="beeld"><img src="/${v.beeld && v.beeld !== 'petals' ? v.beeld : 'assets/fresco/fresco-12.jpg'}" alt="" loading="lazy" decoding="async"></div><div class="kt"><span class="lbl stil">${esc(v.kicker || '')}</span><h3 class="kop-m">${esc(v.titel)}</h3><p>${esc(regel)}</p></div></a>`; }).join('')}</div>
</div></section>` : ''}

${inschenkerBlok('festival')}`;
  return html({
    titel: 'APÉRO Festival · juni 2027 · Noordsepark, Utrecht',
    omschrijving: 'Vier dagen aperitiefcultuur in het Noordsepark in Utrecht, juni 2027. Zes werelden, zes bars, en iets te eten naast elk glas. Early bird tickets € 9,50.',
    pad: '/festival.html', actief: '/festival.html', body, beeld: 'assets/fresco/fresco-04.jpg', ld,
    extraHead: '<link rel="stylesheet" href="/css/kassa.css">',
    scripts: '<script src="/js/qrcode.min.js" defer></script>\n<script src="/js/shop.js" defer></script>\n'
  });
}
