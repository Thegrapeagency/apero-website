/* Festivalpagina. Bewust weinig: wat we weten, wat we nog niet zeggen, en wanneer je wat hoort.
   Werk deze pagina per fase bij (zie docs/nieuw/08-marketing-en-uitrol.md). */
export function pagina({ html, esc, aanmeldForm, OP_SLUG }) {
  const sporen = [
    ['athene-1814', 'Een bord dat niemand besteld heeft.'],
    ['spanje-1974-en-nu', 'Een pot met geld op de toog, waaruit de hele middag betaald wordt.'],
    ['jenever-en-het-loon', 'De eerste slok, voorovergebogen, zonder handen.']
  ].filter(([s]) => OP_SLUG[s]);
  const body = `<header class="pkop"><div class="w"><div class="spoor">
<div><span class="lbl">Festival · Utrecht</span><h1 class="kop-xl" style="margin-top:10px">Juni<br><em style="font-style:italic;font-weight:500;color:var(--terracotta)">2027</em></h1></div>
<div><p class="stand" style="max-width:32ch">Een paar dagen lang wordt het uur tussen werk en diner een plek waar je naartoe kunt.</p>
<p class="lede" style="margin-top:16px">Alles wat we in de verhalen opschrijven, is ook een voorbereiding. In juni 2027 staat het op tafel in Utrecht. Veel meer vertellen we nu nog niet, en dat is expres.</p></div>
</div></div></header>

<section class="blok"><div class="w"><div class="twee">
<div class="rv"><span class="lbl">Wat we al weten</span><h2 class="kop-l" style="margin:10px 0 20px">Vast staat</h2>
<ul class="lijst-weten">
<li><span>Het is in <b>Utrecht</b>, in <b>juni 2027</b>.</span></li>
<li><span>Het begint vroeg, rond het uur waar APÉRO over gaat, en het is gemaakt om te blijven zitten.</span></li>
<li><span>Er staat altijd iets te eten naast het glas. Nooit op de droge hamer.</span></li>
<li><span>Alcoholvrij is geen aparte kaart achterin. Het hoort er gewoon bij.</span></li>
<li><span>Wat je in de verhalen leest, kom je er tegen. Soms letterlijk.</span></li>
</ul></div>
<div class="rv"><span class="lbl stil">Wat we nog niet zeggen</span><h2 class="kop-l" style="margin:10px 0 20px">Nog even niet</h2>
<ul class="lijst-weten nog">
<li><span>De precieze data.</span></li>
<li><span>De plek in de stad.</span></li>
<li><span>Wie er schenkt, en wie er kookt.</span></li>
<li><span>Wat er op tafel komt. Een paar dingen staan al in de verhalen. Welke, dat merk je vanzelf.</span></li>
</ul></div>
</div></div></section>

<section class="blok"><div class="w">
<div class="bkop"><div><span class="lbl">Uit de verhalen</span><h2 class="kop-l">Drie dingen die we niet meer vergeten</h2></div></div>
<div class="raster r3">${sporen.map(([s, zin]) => `<a class="kaart rv" href="${OP_SLUG[s].url}?v=k"><p class="stand" style="color:var(--espresso);font-size:24px">“${esc(zin)}”</p><span class="lbl stil">${esc(OP_SLUG[s].titel)}</span></a>`).join('')}</div>
</div></section>

<section class="blok"><div class="w"><div class="twee">
<div class="rv"><span class="lbl">Wanneer je wat hoort</span><h2 class="kop-l" style="margin:10px 0 20px">In deze volgorde</h2>
<ol class="tijdlijn">
<li><span class="y">Nu</span><h3>De verhalen</h3><p>Elke twee weken een nieuw verhaal, en De Inschenker in je mail.</p></li>
<li><span class="y">Deze winter</span><h3>De data en de plek</h3><p>Lezers van De Inschenker horen het een week eerder dan de rest.</p></li>
<li><span class="y">Voorjaar 2027</span><h3>De voorverkoop</h3><p>Eerst voor wie meeleest. Zonder aftelklok, zonder kunstmatige haast.</p></li>
<li><span class="y">Daarna</span><h3>Wie er schenkt</h3><p>De makers, de bars, de keukens. Een voor een, met hun verhaal erbij.</p></li>
<li><span class="y">Juni 2027</span><h3>Aan tafel</h3><p>In Utrecht.</p></li>
</ol></div>
<div class="rv" style="align-self:start"><div class="voorbeeld"><span class="lbl">Als eerste weten</span><p class="onderwerp">Schrijf je in voor De Inschenker</p><p>Je krijgt de verhalen, en alles over juni 2027 een week voordat het ergens anders staat. Meer is het niet.</p>${aanmeldForm('festival', true)}</div>
<p style="margin-top:22px;font-size:15px;color:var(--ink-70)">Ben je een merk, maker of importeur en wil je aanschuiven? <a class="tekstlink" href="/partners.html">Partners</a></p></div>
</div></div></section>`;
  return html({ titel: 'Festival · juni 2027 · APÉRO Culture', omschrijving: 'In juni 2027 wordt het uur tussen werk en diner een plek in Utrecht. Wat we al weten, en wat nog niet.', pad: '/festival.html', actief: '/festival.html', body, beeld: 'assets/fresco/fresco-04.jpg' });
}
