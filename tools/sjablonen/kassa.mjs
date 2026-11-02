/* Pagina's rond de kaartverkoop: je tickets, na de betaling, voorwaarden.
   /js/shop.js vult [data-page-tickets] en [data-page-bedankt]. */
const SCRIPTS = '<script src="/js/qrcode.min.js" defer></script>\n<script src="/js/shop.js" defer></script>\n';
const HEAD = '<link rel="stylesheet" href="/css/kassa.css">';

export function tickets({ html }) {
  const body = `<div class="w"><div class="page-narrow kassa-pagina" data-page-tickets>
<div class="pay-state"><div class="spinner"></div><p>Even je tickets ophalen…</p></div>
</div></div>`;
  return html({ titel: 'Je tickets · APÉRO Festival', omschrijving: 'Je tickets voor APÉRO Festival 2027, of je tickets terugvinden.', pad: '/tickets.html', actief: '/festival.html', body, robots: 'noindex,nofollow', extraHead: HEAD + '<meta name="referrer" content="no-referrer">', scripts: SCRIPTS });
}

export function bedankt({ html }) {
  const body = `<div class="w"><div class="page-narrow kassa-pagina" data-page-bedankt>
<div class="pay-state"><div class="spinner"></div><p>We kijken of je betaling binnen is…</p></div>
</div></div>`;
  return html({ titel: 'Bedankt · APÉRO Festival', omschrijving: 'Je bestelling voor APÉRO Festival 2027.', pad: '/bedankt.html', actief: '/festival.html', body, robots: 'noindex,nofollow', extraHead: HEAD + '<meta name="referrer" content="no-referrer">', scripts: SCRIPTS });
}

export function voorwaarden({ html }) {
  const body = `<header class="pkop"><div class="w-lees"><span class="lbl">Goed om te weten</span><h1 class="kop-xl" style="margin-top:10px">Voorwaarden</h1>
<p class="stand" style="margin-top:14px">Kort gezegd: je ticket geeft toegang tot APÉRO Festival op de dag die erop staat. Wat je drinkt en eet, reken je ter plekke af. Geld terug kan niet, doorgeven en van dag wisselen wel. Alcohol schenken we vanaf 18 jaar.</p></div></header>
<section class="blok"><div class="w-lees proza voorwaarden">
<h2>1. Wie wij zijn</h2>
<p>APÉRO Festival is een initiatief van The Grape Agency, het team achter onder meer Meisjes van de Wijn en Nacht van de Wijn. De kaartverkoop loopt via NVDW B.V., ingeschreven bij de Kamer van Koophandel onder nummer 89631935 (hierna: wij). Deze voorwaarden gelden voor het kopen van tickets via deze website en voor je bezoek aan het festival. Door een bestelling te plaatsen of het terrein te betreden ga je ermee akkoord.</p>
<h2>2. Tickets en bestellen</h2>
<p>Je bestelling is rond zodra je betaling gelukt is en je een bevestiging per mail hebt gekregen. Alle prijzen zijn in euro's en inclusief btw. Voordat je betaalt zie je welke servicekosten erbij komen. Je betaalt via Mollie.</p>
<p>Je ticket is geldig voor de dag die erop staat. Je krijgt het met een persoonlijke QR-code per mail, en je vindt het altijd terug via de link in die mail. Deel je QR-code niet online: wie als eerste scant, komt binnen, een kopie daarna niet meer. Een ticket is voor één persoon. We kunnen een ticket ongeldig maken als het vervalst is, vaker verkocht is of op een onrechtmatige manier is verkregen.</p>
<h2>3. Data en plek</h2>
<p>APÉRO Festival is in juni 2027, van donderdag tot en met zondag, in het Noordsepark in Utrecht. De precieze data en het precieze terrein maken we later bekend. Je ticket blijft geldig voor de dag van de week die je kocht. Past die dag je dan niet meer, dan wissel je zelf kosteloos van dag op je ticketpagina, zolang er op de andere dag plek is.</p>
<h2>4. Wat er in je ticket zit</h2>
<p>Je ticket geeft toegang tot het festival. Wat je drinkt en eet is niet inbegrepen, tenzij er bij je bestelling iets anders staat. Masterclasses en andere extra's kunnen aparte tickets zijn.</p>
<h2>5. Geen geld terug, wel doorgeven</h2>
<p>Tickets worden niet terugbetaald. Het wettelijke herroepingsrecht geldt niet voor tickets voor vrijetijdsbesteding op een vaste dag of in een vaste periode, dus je kunt niet binnen 14 dagen kosteloos annuleren. Kun je niet komen? Geef je ticket dan door. Op je ticketpagina stuur je het naar iemand anders, die het op eigen naam zet. Verkoop je een ticket door, vraag er dan niet meer voor dan je er zelf voor betaalde, inclusief servicekosten. Verkoop met winst kan ertoe leiden dat het ticket ongeldig wordt.</p>
<p>Lukt het door echte overmacht niet, bijvoorbeeld bij een ziekenhuisopname, mail dan naar <a href="mailto:hallo@apero-culture.nl">hallo@apero-culture.nl</a>. Daar heb je geen recht op, maar we kijken graag met je mee.</p>
<h2>6. Wijzigen, verplaatsen of afgelasten</h2>
<p>We mogen het programma, de tijden, de bars en de makers wijzigen. Dat hoort bij een festival en we houden het zo klein mogelijk. Het geeft geen recht op geld terug. Bij overmacht, zoals extreem weer, veiligheidsredenen of maatregelen van de overheid, mogen we het festival aanpassen, verplaatsen of afgelasten.</p>
<p>Gaat APÉRO Festival helemaal niet door, dan krijg je het bedrag van je ticket terug. Wordt het verplaatst, dan blijft je ticket geldig voor de nieuwe datum. Kun je dan niet, dan geef je het door of laat je ons binnen de termijn uit ons bericht weten dat je liever je geld terug hebt. Servicekosten betalen we terug voor zover de betaaldienst ze zelf terugbetaalt. Reis- en verblijfskosten vergoeden we niet.</p>
<h2>7. Leeftijd en alcohol</h2>
<p>Alcohol schenken we alleen aan mensen van 18 jaar en ouder. We kunnen om een geldig legitimatiebewijs vragen; zonder schenken we niet. Aan iemand die al te veel gedronken heeft, schenken we geen alcohol meer.</p>
<h2>8. Je bezoek</h2>
<p>Op het terrein gelden huisregels, die we met het programma bekendmaken. We mogen iemand de toegang weigeren of laten verwijderen die de huisregels overtreedt, onder invloed is van drugs of te veel alcohol, of de veiligheid van anderen in gevaar brengt. Er is dan geen recht op geld terug. Tijdens het festival maken we foto's en video's voor onze eigen communicatie. Wil je niet herkenbaar in beeld, zeg het dan tegen de fotograaf. Je bent zelf verantwoordelijk voor je spullen.</p>
<h2>9. Aansprakelijkheid</h2>
<p>Je bezoekt het festival op eigen risico. We zijn alleen aansprakelijk voor schade door opzet of grove schuld van ons, en voor zover de wet dat toestaat tot het bedrag van je ticket. We zijn niet aansprakelijk voor gevolgschade of voor wat anderen doen, zoals andere bezoekers. Niets hierin beperkt de rechten die je volgens de wet altijd houdt.</p>
<h2>10. Klachten en recht</h2>
<p>Ben je ergens niet tevreden over, laat het ons dan weten via <a href="mailto:hallo@apero-culture.nl">hallo@apero-culture.nl</a>, het liefst binnen twee weken na het festival. Op deze voorwaarden is Nederlands recht van toepassing. Geschillen leggen we voor aan de bevoegde rechter in Nederland, tenzij de wet voor consumenten iets anders bepaalt.</p>
<h2>11. Wijzigingen</h2>
<p>We kunnen deze voorwaarden wijzigen. Voor jouw ticket geldt de versie van het moment waarop je bestelde.</p>
<p class="klein" style="color:var(--ink-50);font-size:14px">Laatst bijgewerkt op 31 oktober 2026.</p>
</div></section>`;
  return html({ titel: 'Voorwaarden · APÉRO Festival', omschrijving: 'De voorwaarden voor tickets en je bezoek aan APÉRO Festival 2027.', pad: '/voorwaarden.html', actief: '/festival.html', body });
}
