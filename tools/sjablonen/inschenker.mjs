/* De Inschenker: de nieuwsbrief. Geen pop-up, geen aftelklok: een pagina die laat zien wat je krijgt. */
export function pagina({ html, aanmeldForm, OP_SLUG }) {
  const a = OP_SLUG['athene-1814'];
  const body = `<header class="pkop"><div class="w"><div class="twee" style="align-items:end">
<div><span class="lbl">De nieuwsbrief</span><h1 class="kop-xl">De Inschenker</h1>
<p class="stand" style="max-width:34ch;margin-top:14px">Eens in de twee weken, op donderdag, net voordat het uur begint.</p></div>
<div>${aanmeldForm('inschenker-pagina', true)}</div>
</div></div></header>

<section class="blok"><div class="w"><div class="twee">
<div class="proza rv"><h2 style="margin-top:0">Wat je krijgt</h2>
<p><b>Eén verhaal.</b> Het nieuwste, met een regel over waarom we het wilden schrijven.</p>
<p><b>Eén ding om te proberen.</b> Een gebruik, een glas, een bord. Iets wat je die avond zelf kunt doen.</p>
<p><b>Wat we onderweg vonden.</b> Een bron, een foto, een zin die niet in het verhaal paste.</p>
<p><b>En juni 2027.</b> Alles over het festival hoor je hier een week eerder dan ergens anders. Zo is het afgesproken, en zo houden we het.</p>
<p style="color:var(--ink-50);font-size:15px">Geen reclame van derden. Afmelden kan onderaan elke mail, met één klik. We delen je adres met niemand.</p></div>
<div class="rv"><div class="voorbeeld">
<span class="lbl">Zo ziet een editie eruit</span>
<p class="onderwerp">Onderwerp: Een bord dat niemand besteld heeft</p>
<p>Goedemiddag,</p>
<p>In Athene heeft om zes uur niemand honger. De lunch was om drie, het eten komt na tienen. Wat er tussendoor op tafel komt, heet soms een <em>kerasma</em>: een traktatie die je niet bestelt en niet meteen terugdoet. We schreven erover in <a href="${a ? a.url : '/verhalen/'}">Athene, 18:14</a>. Kort: 2 minuten. Lang: een kwartier.</p>
<p><b>Om te proberen.</b> Zet vanavond iets op tafel voordat iemand erom vraagt. Een schaaltje olijven is genoeg. Kijk wat er gebeurt.</p>
<p><b>Onderweg gevonden.</b> In het Grieks heet drinken zonder te eten <em>xerosfyri</em>: op de droge hamer.</p>
<p style="margin:0">Tot over twee weken.<br>De redactie</p>
</div></div>
</div></div></section>`;
  return html({ titel: 'De Inschenker · de nieuwsbrief van APÉRO Culture', omschrijving: 'Eens in de twee weken op donderdag: één verhaal, één ding om te proberen, en alles over juni 2027 een week eerder.', pad: '/inschenker.html', actief: '/inschenker.html', body });
}
