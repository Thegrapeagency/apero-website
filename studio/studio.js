/* APÉRO Studio 2.0
   Vier plekken: Vandaag, Verhalen, Kalender, Bibliotheek.
   Leest data/*.json (gegenereerd door tools/bouw.mjs), bewaart wijzigingen in deze browser,
   en kan alles exporteren als JSON om te committen. Geen dependencies. */
(function () {
  'use strict';
  var d = document, w = window;
  var OPSLAG = 'apero_studio2_v1';
  // Waar staat de publieke site? Lokaal: één map omhoog. Los gedeployed: de nieuwe site.
  var SITE = /^(localhost|127\.)/.test(location.hostname) ? '..' : 'https://apero-nieuw.vercel.app';
  var STATUS = ['idee', 'research', 'schrijven', 'redactie', 'klaar', 'gepubliceerd'];
  var STATUSNAAM = { idee: 'Idee', research: 'Research', schrijven: 'Schrijven', redactie: 'Redactie', klaar: 'Klaar', gepubliceerd: 'Gepubliceerd' };
  var TYPES = { verhaal: 'Verhaal', social: 'Social', nieuwsbrief: 'Nieuwsbrief', festival: 'Festival', taak: 'Taak' };
  var FASEN = [
    ['2026-10', 'Oktober', 'Wereld bouwen'], ['2026-11', 'November', 'Publiek verzamelen'], ['2026-12', 'December', 'Ritme en herkenning'],
    ['2027-01', 'Januari', 'Datum en plek'], ['2027-02', 'Februari', 'Community'], ['2027-03', 'Maart', 'Voorverkoop'],
    ['2027-04', 'April', 'Onthullingen'], ['2027-05', 'Mei', 'Momentum'], ['2027-06', 'Juni', 'Festival']
  ];
  var MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  var DAGEN = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];

  var S = { items: [], planning: [], reeksen: [], docs: [], beelden: [], plekken: [], ui: { tab: 'vandaag', view: 'bord', q: '', reeks: '', prio: '', fest: false, maand: null, types: { verhaal: 1, social: 1, nieuwsbrief: 1, festival: 1, taak: 1 }, bib: 'documenten', doc: 0, bq: '' } };

  /* ---------- hulpjes ---------- */
  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function vandaag() { var q = new URLSearchParams(location.search).get('datum'); return q || new Date().toISOString().slice(0, 10); }
  function dagen(a, b) { return Math.round((new Date(b) - new Date(a)) / 864e5); }
  function plus(iso, n) { var x = new Date(iso + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); }
  function kortDatum(iso) { if (!iso) return ''; var x = new Date(iso + 'T12:00:00'); return x.getDate() + ' ' + MAANDEN[x.getMonth()].slice(0, 3); }
  function langeDatum(iso) { var x = new Date(iso + 'T12:00:00'); return DAGEN[x.getDay()] + ' ' + x.getDate() + ' ' + MAANDEN[x.getMonth()]; }
  function uid(p) { return p + '-' + Math.random().toString(36).slice(2, 8); }
  function toast(t) { var el = $('#toast'); el.textContent = t; el.classList.add('toon'); clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove('toon'); }, 2200); }
  function reeksNaam(id) { var r = S.reeksen.find(function (x) { return x.id === id; }); return r ? r.naam : (id || '—'); }
  function lijst(x) { return Array.isArray(x) ? x : String(x || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean); }
  function bewaar() { try { localStorage.setItem(OPSLAG, JSON.stringify({ items: S.items, planning: S.planning, t: Date.now() })); } catch (e) { toast('Opslaan in de browser lukte niet.'); } }
  function sleutel(it) { return it.slug || it.id; }
  function ketenVan(it) { var k = sleutel(it); return S.planning.filter(function (p) { return p.verhaal && (p.verhaal === k || p.verhaal === it.id); }).sort(function (a, b) { return a.datum.localeCompare(b.datum); }); }
  function prio(n) { n = +n || 0; return '<span class="prio" title="Prioriteit ' + (n || '–') + '">' + [1, 2, 3].map(function (i) { return '<i class="' + (n && i <= 4 - n ? 'aan' : '') + '"></i>'; }).join('') + '</span>'; }
  function sterkFest(i) { return !!i.festival && !/^(laag|middel)/i.test(i.festival); }
  function klaar(p) { return ['gedaan', 'live', 'gepubliceerd'].indexOf(p.status) > -1; }

  /* ---------- laden ---------- */
  function haal(u) { return fetch(u, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }
  Promise.all([haal('data/verhalen.json'), haal('data/contentbank.json'), haal('data/planning.json'), haal('data/documenten.json').catch(function () { return []; }), haal('data/beelden.json').catch(function () { return []; }), haal('data/plekken.json').catch(function () { return []; })])
    .then(function (r) {
      var site = r[0], bank = r[1], plan = r[2];
      S.reeksen = site.reeksen; S.docs = r[3]; S.beelden = r[4]; S.plekken = r[5];
      var bewaard = null; try { bewaard = JSON.parse(localStorage.getItem(OPSLAG)); } catch (e) {}
      if (bewaard && bewaard.items) { S.items = bewaard.items; S.planning = bewaard.planning || []; }
      else { S.items = zaai(site.verhalen, bank); S.planning = plan; }
      S.ui.maand = vandaag().slice(0, 7);
      route();
    })
    .catch(function (e) { $('#paneel').innerHTML = '<p class="leeg">De data kon niet geladen worden (' + esc(e.message) + '). Draai eerst <code>node tools/bouw.mjs</code>.</p>'; });

  // de beginstand: verhalen van de site + de contentbank. Een paar ideeën staan als voorbeeld al verder.
  function zaai(verhalen, bank) {
    var uit = verhalen.map(function (v) {
      return { id: v.id, slug: v.slug, titel: v.titel, reeks: v.reeks, status: v.status, prioriteit: 1, datum: v.datum, plekken: v.plekken, tijd: (v.tijd || []).join(', '),
        invalshoek: v.intro, waarom: '', bronnen: v.bronnen, beeld: v.beeld, versies: { k: v.versies.k ? 'geschreven · ' + v.minuten.k + ' min' : '', m: v.versies.m ? 'geschreven · ' + v.minuten.m + ' min' : '', l: v.versies.l ? 'geschreven · ' + v.minuten.l + ' min' : '' },
        social: [], festival: v.festival, research: 'klaar', seizoen: '', schrijver: 'Redactie', notities: '', url: v.url, bestand: v.bestand };
    });
    var voorbeeld = { 'Utrecht, 17:30': 'research', 'Waar mocht een vrouw alleen zitten?': 'research', 'Proosten': 'schrijven', 'Kopstoot, Schiedam': 'schrijven', 'Waarom er bitterballen bij de borrel horen': 'redactie' };
    bank.forEach(function (b) {
      uit.push({ id: b.id, titel: b.titel, reeks: b.reeks, status: voorbeeld[b.titel] || 'idee', prioriteit: b.prioriteit, datum: '', maand: b.maand, plekken: lijst(b.plekken), tijd: b.periode,
        invalshoek: b.invalshoek, waarom: b.waarom, bronnen: b.bronnen, beeld: b.beeld, versies: b.versies, social: b.social, festival: b.festival, research: b.research, seizoen: b.seizoen, schrijver: voorbeeld[b.titel] ? 'Redactie (voorbeeld)' : '', notities: '' });
    });
    return uit;
  }

  /* ---------- routering ---------- */
  function route() {
    var t = (location.hash || '#vandaag').slice(1).split('/')[0];
    if (!/^(vandaag|verhalen|kalender|bibliotheek)$/.test(t)) t = 'vandaag';
    S.ui.tab = t;
    $$('.tabs a').forEach(function (a) { a.setAttribute('aria-current', a.getAttribute('data-tab') === t ? 'page' : 'false'); });
    ({ vandaag: tekenVandaag, verhalen: tekenVerhalen, kalender: tekenKalender, bibliotheek: tekenBibliotheek })[t]();
    d.title = ({ vandaag: 'Vandaag', verhalen: 'Verhalen', kalender: 'Kalender', bibliotheek: 'Bibliotheek' })[t] + ' · APÉRO Studio';
  }
  w.addEventListener('hashchange', route);

  /* ============ VANDAAG ============ */
  function tekenVandaag() {
    var nu = vandaag(), week = plus(nu, 7);
    var dezeWeek = S.planning.filter(function (p) { return p.datum >= nu && p.datum <= week; }).sort(function (a, b) { return a.datum.localeCompare(b.datum); });
    var achter = S.planning.filter(function (p) { return p.datum < nu && !klaar(p) && p.status !== 'voorstel'; });
    var itemsAchter = S.items.filter(function (i) { return i.datum && i.datum >= nu && dagen(nu, i.datum) <= 14 && STATUS.indexOf(i.status) < 4; });
    var inMaak = S.items.filter(function (i) { return ['research', 'schrijven', 'redactie'].indexOf(i.status) > -1; });
    var volgende = S.planning.filter(function (p) { return p.type === 'verhaal' && p.datum >= nu; }).sort(function (a, b) { return a.datum.localeCompare(b.datum); })[0];
    var fest = S.planning.filter(function (p) { return p.type === 'festival' && p.datum >= nu && !klaar(p); }).sort(function (a, b) { return a.datum.localeCompare(b.datum); }).slice(0, 3);
    var weken = Math.round(dagen(nu, '2027-06-01') / 7);
    var tel = function (t) { return dezeWeek.filter(function (p) { return p.type === t; }).length; };
    var zin = [];
    if (tel('verhaal')) zin.push(tel('verhaal') + (tel('verhaal') === 1 ? ' publicatie' : ' publicaties'));
    if (tel('social')) zin.push(tel('social') + ' social');
    if (tel('nieuwsbrief')) zin.push(tel('nieuwsbrief') + ' nieuwsbrief');
    if (tel('taak')) zin.push(tel('taak') + (tel('taak') === 1 ? ' taak' : ' taken'));
    var samen = zin.length ? 'De komende zeven dagen: ' + zin.join(', ') + '.' : 'De komende zeven dagen staat er niets gepland.';
    samen += (achter.length + itemsAchter.length) ? ' ' + (achter.length + itemsAchter.length) + ' ding' + ((achter.length + itemsAchter.length) === 1 ? '' : 'en') + ' vraagt eerst aandacht.' : ' Er loopt niets achter.';

    var h = '<h1 class="dag">' + langeDatum(nu).replace(/^./, function (c) { return c.toUpperCase(); }) + '</h1><p class="samenvatting">' + samen + '</p><div class="vgrid"><div>';
    if (achter.length || itemsAchter.length) {
      h += '<section class="kaartje achter"><h2 class="kop">Loopt achter</h2><ul class="lijst">' +
        achter.map(planRij).join('') +
        itemsAchter.map(function (i) { return '<li><span class="dt">' + kortDatum(i.datum) + '</span><div class="wat"><button class="link" data-open="' + i.id + '">' + esc(i.titel) + '</button><span>Staat op ' + STATUSNAAM[i.status].toLowerCase() + ', verschijnt over ' + dagen(nu, i.datum) + ' dagen</span></div><span></span></li>'; }).join('') + '</ul></section>';
    }
    h += '<section class="kaartje"><h2 class="kop">De komende zeven dagen <small><a href="#kalender">kalender</a></small></h2>' +
      (dezeWeek.length ? '<ul class="lijst">' + dezeWeek.map(planRij).join('') + '</ul>' : '<p class="leeg">Niets gepland. Tijd om iets uit de contentbank te kiezen.</p>') + '</section>';
    h += '<section class="kaartje"><h2 class="kop">Nu in de maak <small><a href="#verhalen">alle verhalen</a></small></h2>' +
      (inMaak.length ? '<ul class="lijst">' + inMaak.map(function (i) { return '<li><span class="dt"><span class="statuspil" data-s="' + i.status + '">' + STATUSNAAM[i.status] + '</span></span><div class="wat"><button class="link" data-open="' + i.id + '">' + esc(i.titel) + '</button><span>' + esc(reeksNaam(i.reeks)) + (i.schrijver ? ' · ' + esc(i.schrijver) : '') + (i.maand ? ' · beoogd ' + esc(i.maand) : '') + '</span></div><span></span></li>'; }).join('') + '</ul>' : '<p class="leeg">Er wordt nu niets geschreven.</p>') + '</section>';
    h += '</div><div>';
    if (volgende) {
      var it = S.items.find(function (i) { return sleutel(i) === volgende.verhaal; });
      var keten = it ? ketenVan(it) : [volgende];
      h += '<section class="kaartje"><span class="lbl">Volgende publicatie · ' + kortDatum(volgende.datum) + '</span><h2 class="kop" style="margin-top:6px">' + esc(volgende.titel) + '</h2>' +
        '<div class="keten">' + keten.map(function (p) { return '<div class="stap"><span class="stip" data-t="' + p.type + '"></span><div><b>' + esc(TYPES[p.type]) + (p.format ? ' · ' + esc(p.format) : '') + '</b><span>' + kortDatum(p.datum) + ' · ' + esc(p.titel) + '</span></div></div>'; }).join('') +
        (it && it.festival ? '<div class="stap"><span class="stip" data-t="festival"></span><div><b>Festival</b><span>' + esc(it.festival) + '</span></div></div>' : '') + '</div>' +
        (it ? '<div class="knoppen"><button class="knop licht" data-open="' + it.id + '">Open het verhaal</button></div>' : '') + '</section>';
    }
    h += '<section class="kaartje"><span class="lbl">Richting juni 2027</span><div class="aftel"><b>' + weken + '</b><span>weken tot juni</span></div><ul class="lijst">' +
      fest.map(planRij).join('') + '</ul></section>';
    h += '<section class="kaartje"><h2 class="kop">Contentbank <small>' + S.items.filter(function (i) { return i.status === 'idee'; }).length + ' ideeën</small></h2><p class="uitleg">Hoogste prioriteit die nog geen datum heeft:</p><ul class="lijst">' +
      S.items.filter(function (i) { return i.status === 'idee' && +i.prioriteit === 1; }).sort(function (a, b) { return (a.maand || '').localeCompare(b.maand || ''); }).slice(0, 5).map(function (i) { return '<li><span class="dt">' + esc(i.maand || '') + '</span><div class="wat"><button class="link" data-open="' + i.id + '">' + esc(i.titel) + '</button><span>' + esc(reeksNaam(i.reeks)) + '</span></div><span>' + prio(i.prioriteit) + '</span></li>'; }).join('') + '</ul></section>';
    h += '</div></div>';
    $('#paneel').innerHTML = h;
  }
  function planRij(p) {
    var gekoppeld = p.verhaal ? S.items.find(function (i) { return sleutel(i) === p.verhaal; }) : null;
    var afvinkbaar = ['taak', 'social', 'nieuwsbrief'].indexOf(p.type) > -1;
    return '<li class="' + (klaar(p) ? 'gedaan' : '') + '"><span class="dt">' + kortDatum(p.datum) + '<br><span class="type" data-t="' + p.type + '"><i></i>' + TYPES[p.type] + '</span></span>' +
      '<div class="wat"><button class="link" data-plan="' + p.id + '">' + esc(p.titel) + '</button><span>' + [p.format, gekoppeld && p.type !== 'verhaal' ? 'bij: ' + gekoppeld.titel : '', p.status === 'voorstel' ? 'voorstel' : ''].filter(Boolean).map(esc).join(' · ') + '</span></div>' +
      (afvinkbaar ? '<input class="vink" type="checkbox" aria-label="Gedaan" data-vink="' + p.id + '"' + (klaar(p) ? ' checked' : '') + '>' : '<span></span>') + '</li>';
  }

  /* ============ VERHALEN ============ */
  function gefilterd() {
    var q = S.ui.q.toLowerCase();
    return S.items.filter(function (i) {
      if (S.ui.reeks && i.reeks !== S.ui.reeks) return false;
      if (S.ui.prio && String(i.prioriteit) !== S.ui.prio) return false;
      if (S.ui.fest && !sterkFest(i)) return false;
      if (q && (i.titel + ' ' + lijst(i.plekken).join(' ') + ' ' + (i.invalshoek || '') + ' ' + (i.tijd || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  function tekenVerhalen() {
    var h = '<div class="werkbalk">' +
      '<input type="search" id="zoek" placeholder="Zoek op titel, stad, periode…" value="' + esc(S.ui.q) + '" aria-label="Zoeken">' +
      '<select id="freeks" aria-label="Reeks"><option value="">Alle reeksen</option>' + S.reeksen.map(function (r) { return '<option value="' + r.id + '"' + (S.ui.reeks === r.id ? ' selected' : '') + '>' + esc(r.naam) + '</option>'; }).join('') + '</select>' +
      '<select id="fprio" aria-label="Prioriteit"><option value="">Elke prioriteit</option><option value="1"' + (S.ui.prio === '1' ? ' selected' : '') + '>Prioriteit 1</option><option value="2"' + (S.ui.prio === '2' ? ' selected' : '') + '>Prioriteit 2</option><option value="3"' + (S.ui.prio === '3' ? ' selected' : '') + '>Prioriteit 3</option></select>' +
      '<label class="check"><input type="checkbox" id="ffest"' + (S.ui.fest ? ' checked' : '') + '> Festivalrelevant</label>' +
      '<span class="schakel"><button type="button" data-view="bord" aria-pressed="' + (S.ui.view === 'bord') + '">Bord</button><button type="button" data-view="lijst" aria-pressed="' + (S.ui.view === 'lijst') + '">Lijst</button></span></div>';
    var items = gefilterd();
    if (S.ui.view === 'bord') {
      h += '<div class="bord">' + STATUS.map(function (s) {
        var k = items.filter(function (i) { return i.status === s; }).sort(function (a, b) { return (b.nieuw || 0) - (a.nieuw || 0) || (a.prioriteit || 9) - (b.prioriteit || 9) || (a.datum || a.maand || 'z').localeCompare(b.datum || b.maand || 'z'); });
        var max = (s === 'idee' ? 8 : s === 'gepubliceerd' ? 5 : 99), alles = S.ui.open && S.ui.open[s];
        var zicht = alles ? k : k.slice(0, max);
        return '<section class="kolom" data-status="' + s + '"><h3>' + STATUSNAAM[s] + '<span>' + k.length + '</span></h3>' + zicht.map(itemKaart).join('') +
          (k.length > max ? '<button type="button" class="meerknop" data-kolom="' + s + '">' + (alles ? 'Toon minder' : 'Toon alle ' + k.length) + '</button>' : '') + '</section>';
      }).join('') + '</div><p class="uitleg">Sleep een kaart naar een andere kolom, of open hem en kies een status. De kolom Idee is de contentbank.</p>';
    } else {
      h += '<div class="tabel-wrap"><table class="tabel"><thead><tr><th>Titel</th><th>Reeks</th><th>Status</th><th>Prio</th><th>Wanneer</th><th>Plek</th><th>Research</th></tr></thead><tbody>' +
        items.sort(function (a, b) { return STATUS.indexOf(b.status) - STATUS.indexOf(a.status) || (a.prioriteit || 9) - (b.prioriteit || 9); }).map(function (i) {
          return '<tr><td class="titel" data-open="' + i.id + '">' + esc(i.titel) + '</td><td>' + esc(reeksNaam(i.reeks)) + '</td><td><span class="statuspil" data-s="' + i.status + '">' + STATUSNAAM[i.status] + '</span></td><td>' + prio(i.prioriteit) + '</td><td>' + esc(i.datum ? kortDatum(i.datum) : (i.maand || '')) + '</td><td>' + esc(lijst(i.plekken).slice(0, 2).join(', ')) + '</td><td>' + esc(i.research || '') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    $('#paneel').innerHTML = h;
    $('#zoek').addEventListener('input', function (e) { S.ui.q = e.target.value; var pos = e.target.selectionStart; tekenVerhalen(); var z = $('#zoek'); z.focus(); z.setSelectionRange(pos, pos); });
    $('#freeks').addEventListener('change', function (e) { S.ui.reeks = e.target.value; tekenVerhalen(); });
    $('#fprio').addEventListener('change', function (e) { S.ui.prio = e.target.value; tekenVerhalen(); });
    $('#ffest').addEventListener('change', function (e) { S.ui.fest = e.target.checked; tekenVerhalen(); });
    $$('[data-view]').forEach(function (b) { b.addEventListener('click', function () { S.ui.view = b.getAttribute('data-view'); tekenVerhalen(); }); });
    $$('[data-kolom]').forEach(function (b) { b.addEventListener('click', function () { S.ui.open = S.ui.open || {}; var k = b.getAttribute('data-kolom'); S.ui.open[k] = !S.ui.open[k]; tekenVerhalen(); }); });
    // slepen
    $$('.item[draggable]').forEach(function (el) { el.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/plain', el.getAttribute('data-open')); }); });
    $$('.kolom').forEach(function (k) {
      k.addEventListener('dragover', function (e) { e.preventDefault(); k.classList.add('over'); });
      k.addEventListener('dragleave', function () { k.classList.remove('over'); });
      k.addEventListener('drop', function (e) { e.preventDefault(); k.classList.remove('over'); var id = e.dataTransfer.getData('text/plain'); var it = S.items.find(function (i) { return i.id === id; }); if (it) { it.status = k.getAttribute('data-status'); bewaar(); tekenVerhalen(); toast('“' + it.titel + '” staat nu op ' + STATUSNAAM[it.status].toLowerCase() + '.'); } });
    });
  }
  function itemKaart(i) {
    var k = ketenVan(i);
    return '<button type="button" class="item" draggable="true" data-open="' + i.id + '"><span class="t">' + esc(i.titel) + '</span><span class="m">' + prio(i.prioriteit) + '<span>' + esc(reeksNaam(i.reeks)) + '</span>' +
      (i.datum ? '<span>' + kortDatum(i.datum) + '</span>' : i.maand ? '<span>' + esc(i.maand) + '</span>' : '') +
      (k.length ? '<span>' + k.length + '× gepland</span>' : '') + (sterkFest(i) ? '<span class="fest">festival</span>' : '') + '</span></button>';
  }

  /* ============ KALENDER ============ */
  function tekenKalender() {
    var m = S.ui.maand, nu = vandaag();
    var y = +m.slice(0, 4), mm = +m.slice(5, 7) - 1;
    var start = new Date(y, mm, 1), eind = new Date(y, mm + 1, 0);
    var inMaand = S.planning.filter(function (p) { return p.datum.slice(0, 7) === m && S.ui.types[p.type]; }).sort(function (a, b) { return a.datum.localeCompare(b.datum) || a.type.localeCompare(b.type); });
    var h = '<div class="fasen" aria-label="Fasen richting juni 2027">' + FASEN.map(function (f) { return '<button type="button" class="fase' + (f[0] === nu.slice(0, 7) ? ' nu' : '') + '" data-maand="' + f[0] + '" style="border:0;text-align:left;cursor:pointer"><b>' + f[1] + '</b>' + f[2] + '</button>'; }).join('') + '</div>';
    h += '<div class="maandnav"><button type="button" data-stap="-1" aria-label="Vorige maand">‹</button><h2>' + MAANDEN[mm].replace(/^./, function (c) { return c.toUpperCase(); }) + ' ' + y + '</h2><button type="button" data-stap="1" aria-label="Volgende maand">›</button><button type="button" data-stap="0" style="padding:0 14px">Vandaag</button>' +
      '<div class="typefilter">' + Object.keys(TYPES).map(function (t) { return '<button type="button" data-type="' + t + '" aria-pressed="' + (!!S.ui.types[t]) + '"><span class="type" data-t="' + t + '"><i></i></span>' + TYPES[t] + '</button>'; }).join('') + '</div></div>';
    h += '<div class="knoppen" style="margin-top:-4px"><button class="knop licht" type="button" data-actie="plan-nieuw">+ Plan iets</button></div>';
    // per week
    var dag = new Date(start); var wk = [];
    while (dag <= eind) {
      var ma = new Date(dag); ma.setDate(ma.getDate() - ((ma.getDay() + 6) % 7));
      var zo = new Date(ma); zo.setDate(zo.getDate() + 6);
      var key = ma.toISOString().slice(0, 10);
      if (!wk.find(function (x) { return x.key === key; })) wk.push({ key: key, ma: ma, zo: zo });
      dag.setDate(dag.getDate() + 1);
    }
    h += wk.map(function (x) {
      var van = x.ma.toISOString().slice(0, 10), tot = x.zo.toISOString().slice(0, 10);
      var ev = inMaand.filter(function (p) { return p.datum >= van && p.datum <= tot; });
      var deze = nu >= van && nu <= tot;
      var perDag = {}; ev.forEach(function (p) { (perDag[p.datum] = perDag[p.datum] || []).push(p); });
      return '<section class="week' + (deze ? ' deze' : '') + '"><h3>Week van ' + x.ma.getDate() + ' ' + MAANDEN[x.ma.getMonth()] + (deze ? ' · deze week' : '') + '</h3>' +
        (ev.length ? Object.keys(perDag).sort().map(function (dd) {
          var dt = new Date(dd + 'T12:00:00');
          return '<div class="dagrij' + (dd === nu ? ' vandaag' : '') + '"><div class="dd"><b>' + dt.getDate() + '</b>' + DAGEN[dt.getDay()].slice(0, 2) + '</div><div>' + perDag[dd].map(function (p) {
            var g = p.verhaal ? S.items.find(function (i) { return sleutel(i) === p.verhaal; }) : null;
            return '<button type="button" class="gebeurtenis' + (p.status === 'voorstel' ? ' voorstel' : '') + (klaar(p) ? ' gedaan' : '') + '" data-t="' + p.type + '" data-plan="' + p.id + '"><div><div class="gt">' + esc(p.titel) + '</div><div class="gm">' + [TYPES[p.type], p.format, p.kanaal && p.kanaal !== 'site' && p.kanaal !== 'festival' ? p.kanaal : '', g && p.type !== 'verhaal' ? 'bij: ' + g.titel : '', p.status === 'voorstel' ? 'voorstel' : ''].filter(Boolean).map(esc).join(' · ') + '</div></div></button>';
          }).join('') + '</div></div>';
        }).join('') : '<p class="leeg">Niets gepland.</p>') + '</section>';
    }).join('');
    $('#paneel').innerHTML = h;
    $$('[data-stap]').forEach(function (b) { b.addEventListener('click', function () { var s = +b.getAttribute('data-stap'); if (!s) S.ui.maand = nu.slice(0, 7); else { var t = new Date(y, mm + s, 1); S.ui.maand = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0'); } tekenKalender(); }); });
    $$('[data-maand]').forEach(function (b) { b.addEventListener('click', function () { S.ui.maand = b.getAttribute('data-maand'); tekenKalender(); }); });
    $$('[data-type]').forEach(function (b) { b.addEventListener('click', function () { var t = b.getAttribute('data-type'); S.ui.types[t] = S.ui.types[t] ? 0 : 1; tekenKalender(); }); });
  }

  /* ============ BIBLIOTHEEK ============ */
  function tekenBibliotheek() {
    var t = S.ui.bib;
    var h = '<div class="subtabs">' + [['documenten', 'Documenten'], ['bronnen', 'Bronnen'], ['plekken', 'Plekken'], ['beelden', 'Beelden']].map(function (x) { return '<button type="button" data-bib="' + x[0] + '" aria-pressed="' + (t === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
    if (t === 'documenten') {
      if (!S.docs.length) h += '<p class="leeg">Nog geen documenten.</p>';
      else h += '<div class="docs"><ul class="doclijst">' + S.docs.map(function (x, i) { return '<li><button type="button" data-doc="' + i + '" aria-current="' + (i === S.ui.doc) + '">' + esc(x.titel.replace(/^\d+\s*·\s*/, '')) + '</button></li>'; }).join('') + '</ul><article class="doc">' + mdNaarHtml(S.docs[S.ui.doc].tekst) + '</article></div>';
    } else if (t === 'bronnen') {
      var alle = [];
      S.items.forEach(function (i) {
        if (Array.isArray(i.bronnen)) i.bronnen.forEach(function (b) { alle.push({ soort: b.soort, tekst: b.tekst, bij: i }); });
        else if (i.bronnen) alle.push({ soort: 'Te onderzoeken', tekst: i.bronnen, bij: i });
      });
      var q = S.ui.bq.toLowerCase();
      var gef = alle.filter(function (b) { return !q || (b.tekst + ' ' + b.bij.titel + ' ' + b.soort).toLowerCase().indexOf(q) > -1; });
      h += '<div class="werkbalk"><input type="search" id="bzoek" placeholder="Zoek in ' + alle.length + ' bronnen: Volos, Drankwet, overlevering…" value="' + esc(S.ui.bq) + '"></div>' +
        gef.slice(0, 300).map(function (b) { return '<div class="bronitem"><b>' + esc(b.soort || 'Bron') + '</b>' + linkify(b.tekst) + '<span class="bv">bij <button class="link" style="all:unset;cursor:pointer;text-decoration:underline" data-open="' + b.bij.id + '">' + esc(b.bij.titel) + '</button> · ' + STATUSNAAM[b.bij.status] + '</span></div>'; }).join('');
    } else if (t === 'plekken') {
      h += '<div class="tabel-wrap"><table class="tabel"><thead><tr><th>Plek</th><th>Land</th><th>Verhalen en ideeën</th></tr></thead><tbody>' + S.plekken.map(function (p) {
        var namen = [p.naam].concat(p.alias || []);
        var hier = S.items.filter(function (i) { return lijst(i.plekken).some(function (x) { return namen.some(function (n) { return x.indexOf(n) > -1; }); }); });
        return '<tr><td class="titel">' + esc(p.naam) + '</td><td>' + esc(p.land) + '</td><td>' + (hier.length ? hier.map(function (i) { return '<button type="button" style="all:unset;cursor:pointer;display:block" data-open="' + i.id + '"><span class="statuspil" data-s="' + i.status + '">' + STATUSNAAM[i.status] + '</span> ' + esc(i.titel) + '</button>'; }).join('') : '<span class="stil">nog niets</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    } else {
      h += '<p class="uitleg">De fresco\'s zijn de huisstijl. Leg bij elk nieuw beeld de herkomst en licentie vast in het verhaal (veld Beeld).</p><div class="beelden">' + S.beelden.map(function (b) { return '<figure><img src="' + SITE + '/' + b.pad + '" alt="" loading="lazy"><figcaption>' + esc(b.pad.split('/').pop()) + (b.gebruikt.length ? '<br>bij: ' + esc(b.gebruikt.join(', ')) : '<br><i>nog niet gebruikt</i>') + '</figcaption></figure>'; }).join('') + '</div>';
    }
    $('#paneel').innerHTML = h;
    $$('[data-bib]').forEach(function (b) { b.addEventListener('click', function () { S.ui.bib = b.getAttribute('data-bib'); tekenBibliotheek(); }); });
    $$('[data-doc]').forEach(function (b) { b.addEventListener('click', function () { S.ui.doc = +b.getAttribute('data-doc'); tekenBibliotheek(); w.scrollTo(0, 0); }); });
    var bz = $('#bzoek'); if (bz) bz.addEventListener('input', function (e) { S.ui.bq = e.target.value; var p = e.target.selectionStart; tekenBibliotheek(); var z = $('#bzoek'); z.focus(); z.setSelectionRange(p, p); });
  }
  function linkify(s) { return esc(s).replace(/\(?(https?:\/\/[^\s)]+)\)?/g, function (m, u) { return ' <a href="' + u + '" target="_blank" rel="noopener">' + u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] + '</a>'; }); }
  function mdNaarHtml(src) {
    var inl = function (s) { return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|\W)\*([^*]+)\*/g, '$1<em>$2</em>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>'); };
    var r = src.replace(/\r/g, '').split('\n'), out = [], i = 0;
    while (i < r.length) {
      var l = r[i];
      if (!l.trim()) { i++; continue; }
      var hm = l.match(/^(#{1,4}) (.*)$/); if (hm) { var n = Math.min(hm[1].length, 3); out.push('<h' + n + '>' + inl(hm[2]) + '</h' + n + '>'); i++; continue; }
      if (/^---+$/.test(l.trim())) { out.push('<hr>'); i++; continue; }
      if (l.trim().charAt(0) === '|') { var rows = []; while (i < r.length && r[i].trim().charAt(0) === '|') rows.push(r[i++]); rows = rows.filter(function (x) { return !/^\|\s*:?-{2,}/.test(x.trim()); }); out.push('<table>' + rows.map(function (x, k) { var c = x.trim().replace(/^\||\|$/g, '').split('|'); return '<tr>' + c.map(function (y) { return k ? '<td>' + inl(y.trim()) + '</td>' : '<th>' + inl(y.trim()) + '</th>'; }).join('') + '</tr>'; }).join('') + '</table>'); continue; }
      if (/^\s*[-*] /.test(l)) { var li = []; while (i < r.length && /^\s*[-*] /.test(r[i])) li.push(r[i++].replace(/^\s*[-*] /, '')); out.push('<ul>' + li.map(function (x) { return '<li>' + inl(x) + '</li>'; }).join('') + '</ul>'); continue; }
      if (/^\d+\. /.test(l)) { var ol = []; while (i < r.length && /^\d+\. /.test(r[i])) ol.push(r[i++].replace(/^\d+\. /, '')); out.push('<ol>' + ol.map(function (x) { return '<li>' + inl(x) + '</li>'; }).join('') + '</ol>'); continue; }
      if (/^> ?/.test(l)) { var bq = []; while (i < r.length && /^> ?/.test(r[i])) bq.push(r[i++].replace(/^> ?/, '')); out.push('<blockquote>' + inl(bq.join(' ')) + '</blockquote>'); continue; }
      var p = []; while (i < r.length && r[i].trim() && !/^(#{1,4} |\||\s*[-*] |\d+\. |> ?|---+$)/.test(r[i])) p.push(r[i++]); out.push('<p>' + inl(p.join(' ')) + '</p>');
    }
    return out.join('');
  }

  /* ============ LADE: verhaal ============ */
  function openLade(titel, html) { $('#lade-titel').textContent = titel; $('#lade-body').innerHTML = html; $('#lade').classList.add('open'); $('#lade').setAttribute('aria-hidden', 'false'); $('.scrim').classList.add('open'); setTimeout(function () { var f = $('#lade .sluit'); if (f) f.focus(); }, 50); }
  function sluitLade() { $('#lade').classList.remove('open'); $('#lade').setAttribute('aria-hidden', 'true'); $('.scrim').classList.remove('open'); }
  function veld(naam, label, waarde, soort, opties) {
    var v = waarde == null ? '' : waarde;
    if (soort === 'select') return '<label class="veld"><span>' + label + '</span><select name="' + naam + '">' + opties.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
    if (soort === 'area') return '<label class="veld"><span>' + label + '</span><textarea name="' + naam + '">' + esc(v) + '</textarea></label>';
    return '<label class="veld"><span>' + label + '</span><input name="' + naam + '" type="' + (soort || 'text') + '" value="' + esc(v) + '"></label>';
  }
  function openItem(id) {
    var it = S.items.find(function (i) { return i.id === id; }); if (!it) return;
    var keten = ketenVan(it);
    var bronTekst = Array.isArray(it.bronnen) ? it.bronnen.map(function (b) { return (b.soort ? b.soort + ': ' : '') + b.tekst; }).join('\n') : (it.bronnen || '');
    var h = '<form id="itemform">' +
      veld('titel', 'Werktitel', it.titel) +
      '<div class="rij2">' + veld('status', 'Status', it.status, 'select', STATUS.map(function (s) { return [s, STATUSNAAM[s]]; })) + veld('reeks', 'Reeks', it.reeks, 'select', S.reeksen.map(function (r) { return [r.id, r.naam]; })) + '</div>' +
      '<div class="rij3">' + veld('datum', 'Publicatiedatum', it.datum, 'date') + veld('prioriteit', 'Prioriteit', it.prioriteit, 'select', [[1, '1 · eerst'], [2, '2'], [3, '3 · later']]) + veld('schrijver', 'Wie', it.schrijver) + '</div>' +
      veld('invalshoek', 'Invalshoek', it.invalshoek, 'area') +
      '<div class="knoppen">' + (it.url ? '<a class="knop licht" target="_blank" rel="noopener" href="' + SITE + it.url + '">Bekijk op de site</a>' : '') + '<button type="button" class="knop" data-actie="social-nieuw" data-item="' + it.id + '">+ Social</button><button type="button" class="knop licht" data-actie="nb-nieuw" data-item="' + it.id + '">+ In De Inschenker</button></div>' +
      '<h3 style="font-family:var(--disp);margin:16px 0 4px">De keten</h3>' +
      (keten.length ? '<div class="keten">' + keten.map(function (p) { return '<div class="stap"><span class="stip" data-t="' + p.type + '"></span><div><b><button type="button" style="all:unset;cursor:pointer" data-plan="' + p.id + '">' + esc(TYPES[p.type]) + (p.format ? ' · ' + esc(p.format) : '') + '</button></b><span>' + kortDatum(p.datum) + ' · ' + esc(p.titel) + (klaar(p) ? ' · gedaan' : '') + '</span></div></div>'; }).join('') + '</div>' : '<p class="uitleg">Nog niets gepland rond dit verhaal. Voeg een social-afgeleide of een nieuwsbriefvermelding toe.</p>') +
      (it.social && it.social.length ? '<p class="uitleg" style="margin-top:8px"><b>Ideeën voor social:</b> ' + it.social.map(esc).join(' · ') + '</p>' : '') +
      '<details class="meer"' + (it.status === 'idee' ? ' open' : '') + '><summary>Research en details</summary>' +
      veld('waarom', 'Waarom interessant', it.waarom, 'area') +
      veld('bronnen', 'Bronnen', bronTekst, 'area') +
      '<div class="rij2">' + veld('plekken', 'Plekken en mensen', lijst(it.plekken).join(', ')) + veld('tijd', 'Periode', it.tijd) + '</div>' +
      '<div class="rij3">' + veld('research', 'Research nodig', it.research, 'select', [['laag', 'laag'], ['midden', 'midden'], ['hoog', 'hoog'], ['klaar', 'klaar']]) + veld('maand', 'Beoogde maand', it.maand, 'month') + veld('seizoen', 'Seizoen', it.seizoen) + '</div>' +
      veld('beeld', 'Beeld (en herkomst)', it.beeld) +
      '<div class="rij3">' + veld('vk', 'Kort', (it.versies || {}).k) + veld('vm', 'Middel', (it.versies || {}).m) + veld('vl', 'Lang', (it.versies || {}).l) + '</div>' +
      veld('festival', 'Festivalkoppeling', it.festival, 'area') +
      veld('notities', 'Notities', it.notities, 'area') +
      '</details>' +
      '<div class="knoppen"><button class="knop" type="submit">Bewaar</button><button class="knop rood" type="button" data-actie="item-weg" data-item="' + it.id + '">Verwijder</button></div>' +
      (it.bestand ? '<p class="uitleg">Dit verhaal staat op de site. De tekst zelf bewerk je in <code>' + esc(it.bestand) + '</code>; daarna <code>node tools/bouw.mjs</code>. Studio houdt de planning bij.</p>' : '') +
      '</form>';
    openLade(it.titel, h);
    $('#itemform').addEventListener('submit', function (e) {
      e.preventDefault(); var f = new FormData(e.target);
      ['titel', 'status', 'reeks', 'datum', 'schrijver', 'invalshoek', 'waarom', 'tijd', 'research', 'maand', 'seizoen', 'beeld', 'festival', 'notities'].forEach(function (k) { if (f.has(k)) it[k] = f.get(k); });
      it.prioriteit = +f.get('prioriteit');
      it.plekken = lijst(f.get('plekken'));
      if (!Array.isArray(it.bronnen)) it.bronnen = f.get('bronnen');
      it.versies = { k: f.get('vk'), m: f.get('vm'), l: f.get('vl') };
      // verhaal met datum: zorg dat het in de kalender staat
      if (it.datum) {
        var p = S.planning.find(function (x) { return x.type === 'verhaal' && x.verhaal === sleutel(it); });
        if (p) { p.datum = it.datum; p.titel = it.titel; } else S.planning.push({ id: uid('p'), datum: it.datum, type: 'verhaal', titel: it.titel, verhaal: sleutel(it), kanaal: 'site', status: 'gepland' });
      }
      bewaar(); sluitLade(); route(); toast('Bewaard.');
    });
  }

  /* ============ LADE: planningsitem ============ */
  function openPlan(id, nieuw) {
    var p = nieuw || S.planning.find(function (x) { return x.id === id; }); if (!p) return;
    var verhaalOpties = [['', '— geen —']].concat(S.items.filter(function (i) { return i.status !== 'idee' || i.id === p.verhaal; }).map(function (i) { return [sleutel(i), i.titel]; }));
    var h = '<form id="planform">' + veld('titel', 'Wat', p.titel) +
      '<div class="rij2">' + veld('type', 'Soort', p.type, 'select', Object.keys(TYPES).map(function (t) { return [t, TYPES[t]]; })) + veld('datum', 'Datum', p.datum, 'date') + '</div>' +
      '<div class="rij2">' + veld('status', 'Status', p.status, 'select', [['voorstel', 'Voorstel'], ['gepland', 'Gepland'], ['open', 'Open'], ['gedaan', 'Gedaan'], ['live', 'Live']]) + veld('format', 'Format', p.format, 'select', [['', '—'], ['carrousel', 'Carrousel'], ['reel', 'Reel'], ['post', 'Post'], ['story-poll', 'Story-poll'], ['story-quiz', 'Story-quiz'], ['story-vraag', 'Story-vraag'], ['interview', 'Interview'], ['pers', 'Pers'], ['editie', 'Editie']]) + '</div>' +
      veld('verhaal', 'Hoort bij verhaal', p.verhaal || '', 'select', verhaalOpties) +
      veld('notitie', 'Notitie', p.notitie, 'area') +
      '<div class="knoppen"><button class="knop" type="submit">Bewaar</button>' + (nieuw ? '' : '<button class="knop rood" type="button" data-actie="plan-weg" data-plan-id="' + p.id + '">Verwijder</button>') + '</div></form>';
    openLade(nieuw ? 'Plan iets' : p.titel, h);
    $('#planform').addEventListener('submit', function (e) {
      e.preventDefault(); var f = new FormData(e.target);
      ['titel', 'type', 'datum', 'status', 'format', 'verhaal', 'notitie'].forEach(function (k) { p[k] = f.get(k); });
      if (!p.datum) { toast('Kies een datum.'); return; }
      if (nieuw) S.planning.push(p);
      bewaar(); sluitLade(); route(); toast('Bewaard.');
    });
  }

  /* ============ acties ============ */
  d.addEventListener('click', function (e) {
    var o = e.target.closest('[data-open]'); if (o) { e.preventDefault(); openItem(o.getAttribute('data-open')); return; }
    var pl = e.target.closest('[data-plan]'); if (pl) { e.preventDefault(); openPlan(pl.getAttribute('data-plan')); return; }
    var a = e.target.closest('[data-actie]'); if (!a) return;
    var act = a.getAttribute('data-actie');
    if (act === 'sluit') sluitLade();
    if (act === 'nieuw-idee') {
      openLade('Nieuw idee', '<form id="ideeform">' + veld('titel', 'Werktitel', '') + veld('reeks', 'Reeks', 'om-zes-uur', 'select', S.reeksen.map(function (r) { return [r.id, r.naam]; })) + veld('invalshoek', 'In één of twee zinnen: wat is de invalshoek?', '', 'area') + '<div class="knoppen"><button class="knop" type="submit">Zet in de contentbank</button></div><p class="uitleg">Meer hoeft niet. De rest vul je in als het idee verder komt.</p></form>');
      $('#ideeform').addEventListener('submit', function (ev) { ev.preventDefault(); var f = new FormData(ev.target); if (!f.get('titel').trim()) { toast('Geef het een werktitel.'); return; } S.items.unshift({ id: uid('cb'), nieuw: Date.now(), titel: f.get('titel').trim(), reeks: f.get('reeks'), status: 'idee', prioriteit: 2, invalshoek: f.get('invalshoek'), plekken: [], versies: {}, social: [] }); bewaar(); sluitLade(); S.ui.q = ''; S.ui.reeks = ''; S.ui.prio = ''; S.ui.fest = false; S.ui.view = 'bord'; if (location.hash !== '#verhalen') location.hash = '#verhalen'; else route(); toast('In de contentbank gezet.'); });
      setTimeout(function () { $('#ideeform input').focus(); }, 60);
    }
    if (act === 'social-nieuw' || act === 'nb-nieuw') {
      var it = S.items.find(function (i) { return i.id === a.getAttribute('data-item'); });
      var basis = it.datum && it.datum >= vandaag() ? it.datum : vandaag();
      var volgendeDo = basis; while (new Date(volgendeDo + 'T12:00:00').getDay() !== 4) volgendeDo = plus(volgendeDo, 1);
      openPlan(null, act === 'social-nieuw'
        ? { id: uid('p'), type: 'social', titel: it.titel, datum: plus(basis, 1), status: 'gepland', format: 'carrousel', kanaal: 'instagram', verhaal: sleutel(it), notitie: '' }
        : { id: uid('p'), type: 'nieuwsbrief', titel: 'De Inschenker · ' + it.titel, datum: volgendeDo, status: 'gepland', format: 'editie', kanaal: 'mail', verhaal: sleutel(it), notitie: '' });
    }
    if (act === 'plan-nieuw') openPlan(null, { id: uid('p'), type: 'taak', titel: '', datum: vandaag(), status: 'open', verhaal: '' });
    if (act === 'plan-weg') { if (confirm('Dit planningsitem verwijderen?')) { S.planning = S.planning.filter(function (x) { return x.id !== a.getAttribute('data-plan-id'); }); bewaar(); sluitLade(); route(); } }
    if (act === 'item-weg') { if (confirm('Dit verhaal of idee uit Studio verwijderen? (Een verhaal op de site blijft staan.)')) { S.items = S.items.filter(function (x) { return x.id !== a.getAttribute('data-item'); }); bewaar(); sluitLade(); route(); } }
    if (act === 'gegevens') {
      openLade('Gegevens & export', '<p>Studio bewaart je wijzigingen in deze browser. Wil je ze delen of vastleggen, exporteer dan en zet het bestand in de repo (<code>content/</code>), of stuur het naar de redactie.</p>' +
        '<div class="knoppen"><button class="knop" data-actie="export">Exporteer als JSON</button><label class="knop licht" style="cursor:pointer">Importeer JSON<input type="file" accept="application/json" id="importbestand" hidden></label></div>' +
        '<p class="uitleg">De contentbank, de planning en alle verhalen komen oorspronkelijk uit <code>content/contentbank.json</code>, <code>content/planning.json</code> en <code>content/verhalen/*.md</code>.</p><hr style="border:0;border-top:1px solid var(--line);margin:18px 0">' +
        '<p><b>Terug naar de voorbeeldplanning</b></p><p class="uitleg">Wist alles wat je in deze browser veranderde en laadt de voorbeelddata opnieuw.</p><button class="knop rood" data-actie="reset">Opnieuw beginnen</button>');
      $('#importbestand').addEventListener('change', function (ev) { var fl = ev.target.files[0]; if (!fl) return; var rd = new FileReader(); rd.onload = function () { try { var j = JSON.parse(rd.result); if (!j.items) throw 0; S.items = j.items; S.planning = j.planning || []; bewaar(); sluitLade(); route(); toast('Geïmporteerd.'); } catch (x) { toast('Dit is geen Studio-export.'); } }; rd.readAsText(fl); });
    }
    if (act === 'export') { var b = new Blob([JSON.stringify({ items: S.items, planning: S.planning, geexporteerd: new Date().toISOString() }, null, 1)], { type: 'application/json' }); var u = URL.createObjectURL(b); var l = d.createElement('a'); l.href = u; l.download = 'apero-studio-' + vandaag() + '.json'; l.click(); setTimeout(function () { URL.revokeObjectURL(u); }, 500); }
    if (act === 'reset') { if (confirm('Alles in deze browser wissen en opnieuw beginnen met de voorbeeldplanning?')) { localStorage.removeItem(OPSLAG); location.reload(); } }
  });
  d.addEventListener('change', function (e) {
    var v = e.target.closest('[data-vink]'); if (!v) return;
    var p = S.planning.find(function (x) { return x.id === v.getAttribute('data-vink'); }); if (!p) return;
    p.status = v.checked ? 'gedaan' : (p.type === 'taak' ? 'open' : 'gepland'); bewaar(); route();
  });
  d.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') sluitLade();
    if (e.key === 'n' && !/INPUT|TEXTAREA|SELECT/.test(d.activeElement.tagName) && !$('#lade').classList.contains('open')) { e.preventDefault(); $('[data-actie="nieuw-idee"]').click(); }
  });
})();
