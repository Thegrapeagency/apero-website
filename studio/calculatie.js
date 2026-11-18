/* APÉRO Studio · Calculatie
   Werkt als een spreadsheet: in elke cel typ je een bedrag of een formule (=bezoekers*0,25).
   Alles rekent direct door naar het overzicht. Bewaart in deze browser, exporteert als JSON of CSV.
   Geen dependencies. De rekenkern (Calc) is los te testen met node. */
(function (root) {
  'use strict';

  /* ================= rekenkern ================= */
  var Calc = {};

  // "1.250,50" -> 1250.5 · "21%" -> 0.21 · "" -> 0 · onzin -> NaN
  Calc.getal = function (s) {
    s = String(s == null ? '' : s).replace(/[€\s]/g, '');
    if (!s) return 0;
    var pct = /%$/.test(s); if (pct) s = s.slice(0, -1);
    if (s.indexOf(',') > -1) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    if (!/^-?\d*\.?\d+$/.test(s)) return NaN;
    var n = parseFloat(s);
    return pct ? n / 100 : n;
  };

  // Formules: + - * / ( ) %, getallen met komma of punt, en namen van uitgangspunten.
  function Onbekend(naam) { this.naam = naam; }
  Calc.formule = function (tekst, vars) {
    var t = [], m, re = /\s*(?:(\d+(?:[.,]\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|([-+*/()%]))/y, i = 0;
    re.lastIndex = 0;
    while (re.lastIndex < tekst.length) {
      if (/^\s*$/.test(tekst.slice(re.lastIndex))) break;
      m = re.exec(tekst);
      if (!m) throw new Error('Dit begrijp ik niet: ' + tekst.slice(re.lastIndex || 0).trim().slice(0, 12));
      t.push(m[1] != null ? { g: parseFloat(m[1].replace(',', '.')) } : m[2] != null ? { n: m[2].toLowerCase() } : { o: m[3] });
    }
    function kijk(o) { return t[i] && t[i].o === o; }
    function som() { var v = term(); while (kijk('+') || kijk('-')) { var o = t[i++].o, r = term(); v = o === '+' ? v + r : v - r; } return v; }
    function term() { var v = factor(); while (kijk('*') || kijk('/')) { var o = t[i++].o, r = factor(); v = o === '*' ? v * r : (r === 0 ? 0 : v / r); } return v; }
    function factor() {
      var v, x = t[i++];
      if (!x) throw new Error('De formule is niet af');
      if (x.o === '-') v = -factor();
      else if (x.o === '+') v = factor();
      else if (x.o === '(') { v = som(); if (!kijk(')')) throw new Error('Er mist een haakje'); i++; }
      else if (x.g != null) v = x.g;
      else if (x.n != null) { if (!(x.n in vars)) throw new Onbekend(x.n); v = vars[x.n]; }
      else throw new Error('Onverwacht teken: ' + x.o);
      while (kijk('%')) { i++; v = v / 100; }
      return v;
    }
    var uit = som();
    if (i < t.length) throw new Error('Onverwacht: ' + (t[i].o || t[i].n || t[i].g));
    return uit;
  };

  // Eén cel: getal of formule. Geeft { v, fout }.
  Calc.cel = function (raw, vars) {
    raw = String(raw == null ? '' : raw).trim();
    if (!raw) return { v: 0, leeg: true };
    if (raw.charAt(0) !== '=') { var n = Calc.getal(raw); return isNaN(n) ? { v: 0, fout: 'Geen getal' } : { v: n }; }
    try { var v = Calc.formule(raw.slice(1), vars); return isFinite(v) ? { v: v } : { v: 0, fout: 'Geen uitkomst' }; }
    catch (e) { return { v: 0, fout: e instanceof Onbekend ? 'Onbekende naam: ' + e.naam : e.message, onbekend: e instanceof Onbekend ? e.naam : null }; }
  };

  // Rekent een hele calculatie door. schaal vermenigvuldigt het aantal bezoekers (voor het break-evenpunt).
  Calc.reken = function (s, schaal) {
    var vars = {}, cel = {}, r = { cel: cel, vars: vars };
    // 1. uitgangspunten: mogen naar elkaar verwijzen, in elke volgorde
    var open = s.uitgangspunten.slice(), ronde = 0;
    while (open.length && ronde++ < 50) {
      open = open.filter(function (u) {
        var c = Calc.cel(u.waarde, vars);
        if (c.onbekend && s.uitgangspunten.some(function (x) { return x.sleutel === c.onbekend && x !== u; }) && ronde < 50) return true;
        if (u.sleutel === 'bezoekers' && schaal != null) c.v *= schaal;
        cel[u.id] = c; if (u.sleutel) vars[u.sleutel] = c.v;
        return false;
      });
    }
    open.forEach(function (u) { cel[u.id] = { v: 0, fout: 'Verwijst naar zichzelf' }; if (u.sleutel) vars[u.sleutel] = 0; });
    // 2. inkomsten: bedrag incl. btw -> ex btw
    r.inkomsten = { begroot: 0, werkelijk: 0, prognose: 0, groepen: {} };
    s.inkomsten.forEach(function (x) {
      var b = Calc.cel(x.begroot, vars), btw = Calc.cel(x.btw, vars), wk = Calc.cel(x.werkelijk, vars);
      var ex = b.v / (1 + btw.v / 100);
      cel[x.id] = { begroot: b, btw: btw, ex: ex, werkelijk: wk, prognose: wk.leeg ? ex : wk.v };
      var g = r.inkomsten.groepen[x.groep] || (r.inkomsten.groepen[x.groep] = { begroot: 0, werkelijk: 0, prognose: 0 });
      g.begroot += ex; g.werkelijk += wk.v; g.prognose += cel[x.id].prognose;
      r.inkomsten.begroot += ex; r.inkomsten.werkelijk += wk.v; r.inkomsten.prognose += cel[x.id].prognose;
    });
    vars.inkomsten = r.inkomsten.begroot;
    // 3. kosten: eerst alles wat niet van het kostentotaal afhangt, dan de rest (onvoorzien)
    r.kosten = { begroot: 0, offerte: 0, werkelijk: 0, prognose: 0, cats: {}, leeg: 0 };
    var later = [];
    function post(x) {
      var b = Calc.cel(x.begroot, vars), of = Calc.cel(x.offerte, vars), wk = Calc.cel(x.werkelijk, vars);
      var p = !wk.leeg ? wk.v : !of.leeg ? of.v : b.v;
      cel[x.id] = { begroot: b, offerte: of, werkelijk: wk, prognose: p };
      var c = r.kosten.cats[x.cat] || (r.kosten.cats[x.cat] = { begroot: 0, offerte: 0, werkelijk: 0, prognose: 0, leeg: 0, n: 0 });
      c.begroot += b.v; c.offerte += of.v; c.werkelijk += wk.v; c.prognose += p; c.n++;
      r.kosten.begroot += b.v; r.kosten.offerte += of.v; r.kosten.werkelijk += wk.v; r.kosten.prognose += p;
      if (b.leeg && of.leeg && wk.leeg) { c.leeg++; r.kosten.leeg++; }
    }
    s.kosten.forEach(function (x) { if (/\bkosten\b/i.test(String(x.begroot).charAt(0) === '=' ? x.begroot : '')) later.push(x); else post(x); });
    vars.kosten = r.kosten.begroot;
    later.forEach(post);
    r.resultaat = r.inkomsten.begroot - r.kosten.begroot;
    r.prognose = r.inkomsten.prognose - r.kosten.prognose;
    r.bezoekers = vars.bezoekers || 0;
    return r;
  };

  // Bij hoeveel bezoekers is het resultaat nul? null als het niet te halen is.
  Calc.breakEven = function (s) {
    var basis = Calc.reken(s);
    if (!basis.bezoekers) return null;
    var f = function (x) { return Calc.reken(s, x).resultaat; };
    if (f(0) >= 0) return 0;
    var hoog = 1; while (f(hoog) < 0 && hoog < 64) hoog *= 2;
    if (f(hoog) < 0) return null;
    var laag = 0;
    for (var i = 0; i < 40; i++) { var mid = (laag + hoog) / 2; if (f(mid) < 0) laag = mid; else hoog = mid; }
    return Math.ceil(basis.bezoekers * hoog - 1e-6);
  };

  root.APERO_CALC = Calc;
  if (typeof module !== 'undefined' && module.exports) module.exports = Calc;
  if (typeof document === 'undefined') return;

  /* ================= scherm ================= */
  var d = document, OPSLAG = 'apero_calculatie_v1';
  var B = { actief: 0, lijst: [] };   // alle scenario's
  var S = null, R = null;             // het actieve scenario en zijn uitkomst
  var dicht = {};

  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function uid(p) { return p + Math.random().toString(36).slice(2, 8); }
  function toast(t) { var el = $('#toast'); el.textContent = t; el.classList.add('toon'); clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove('toon'); }, 2400); }
  var nf0 = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 }), nf2 = new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function euro(n) { return '€ ' + nf0.format(Math.round(n)); }
  function bedrag(n) { return Math.abs(n - Math.round(n)) < 0.005 ? nf0.format(Math.round(n)) : nf2.format(n); }
  function toonGetal(n, raw) {
    if (/%\s*$/.test(raw) && raw.charAt(0) !== '=') return String(raw).trim();
    if (Math.abs(n) < 1 && n !== 0) return new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 3 }).format(n);
    return bedrag(n);
  }

  function bewaar() { try { localStorage.setItem(OPSLAG, JSON.stringify(B)); } catch (e) { toast('Opslaan in de browser lukte niet.'); } }
  function laad() {
    try { var x = JSON.parse(localStorage.getItem(OPSLAG)); if (x && x.lijst && x.lijst.length) B = x; } catch (e) {}
    if (!B.lijst.length) B = { actief: 0, lijst: [root.APERO_CALC_BEGIN()] };
    if (!B.lijst[B.actief]) B.actief = 0;
    S = B.lijst[B.actief];
  }

  /* ---- cellen ---- */
  // pad = lijst.id.veld. Een cel toont de uitkomst; met de cursor erin zie je wat je getypt hebt.
  function vind(pad) { var p = pad.split('.'); return { rij: S[p[0]].find(function (x) { return x.id === p[1]; }), veld: p[2], lijst: p[0] }; }
  function uitkomst(pad) {
    var p = pad.split('.'), c = R.cel[p[1]];
    if (!c) return null;
    return p[0] === 'uitgangspunten' ? c : c[p[2]];
  }
  function celHtml(pad, raw, kol, extra) {
    return '<input class="cel ' + (extra || '') + '" inputmode="decimal" autocomplete="off" spellcheck="false" data-pad="' + pad + '" data-kol="' + kol + '" value="' + esc(raw) + '" aria-label="' + kol + '">';
  }
  function tekstHtml(pad, raw, kol, ph) {
    return '<input class="tekst" autocomplete="off" data-pad="' + pad + '" data-kol="' + kol + '" value="' + esc(raw) + '" placeholder="' + esc(ph || '') + '" aria-label="' + kol + '">';
  }
  function verfCellen() {
    $$('input.cel').forEach(function (el) {
      var pad = el.getAttribute('data-pad'), v = vind(pad); if (!v.rij) return;
      var raw = String(v.rij[v.veld] == null ? '' : v.rij[v.veld]), c = uitkomst(pad);
      el.classList.toggle('formule', raw.trim().charAt(0) === '=');
      el.classList.toggle('fout', !!(c && c.fout));
      el.title = c && c.fout ? c.fout : (raw.trim().charAt(0) === '=' ? raw : '');
      if (d.activeElement === el) return;
      el.value = !raw.trim() ? '' : c && c.fout ? raw : toonGetal(c ? c.v : 0, raw);
    });
    $$('[data-uit]').forEach(function (el) { el.textContent = uit(el.getAttribute('data-uit')); });
    $$('[data-kleur]').forEach(function (el) { var n = getal(el.getAttribute('data-kleur')); var k = el.getAttribute('data-kleur').slice(0, 2) === 'kv'; el.classList.toggle(k ? 'mee' : 'min', n < 0); el.classList.toggle(k ? 'duur' : 'plus', n > 0); });
  }
  // berekende velden: "k.<id>.verschil", "i.<id>.ex", "cat.<naam>.begroot", "tot.resultaat" ...
  function getal(sleutel) {
    var p = sleutel.split('|'), c;
    if (p[0] === 'i') { c = R.cel[p[1]]; return c ? c.ex : 0; }
    if (p[0] === 'kv') { c = R.cel[p[1]]; return c && !c.werkelijk.leeg ? c.werkelijk.v - c.begroot.v : NaN; }
    if (p[0] === 'cat') return (R.kosten.cats[p[1]] || {})[p[2]] || 0;
    if (p[0] === 'groep') return (R.inkomsten.groepen[p[1]] || {})[p[2]] || 0;
    if (p[0] === 'kosten') return R.kosten[p[1]];
    if (p[0] === 'inkomsten') return R.inkomsten[p[1]];
    if (p[0] === 'resultaat') return R.resultaat;
    if (p[0] === 'prognose') return R.prognose;
    return 0;
  }
  function uit(sleutel) {
    var p = sleutel.split('|'), n;
    if (p[0] === 'kv') { n = getal(sleutel); return isNaN(n) ? '' : (n > 0 ? '+' : '') + bedrag(n); }
    if (p[0] === 'catleeg') { n = (R.kosten.cats[p[1]] || {}).leeg || 0; return n ? n + ' zonder bedrag' : ''; }
    if (p[0] === 'marge') return R.inkomsten.begroot ? Math.round(R.resultaat / R.inkomsten.begroot * 100) + '%' : '';
    if (p[0] === 'perbezoeker') return R.bezoekers ? '€ ' + nf2.format(R.kosten.begroot / R.bezoekers) : '';
    if (p[0] === 'bezoekers') return nf0.format(Math.round(R.bezoekers));
    if (p[0] === 'breakeven') {
      var be = Calc.breakEven(S);
      if (be == null) return R.bezoekers ? 'Niet te halen' : 'Vul bezoekers in';
      return nf0.format(be) + (R.bezoekers ? ' (' + Math.round(be / R.bezoekers * 100) + '%)' : '');
    }
    if (p[0] === 'leeg') return R.kosten.leeg ? R.kosten.leeg + ' van de ' + S.kosten.length + ' kostenposten hebben nog geen bedrag.' : 'Elke kostenpost heeft een bedrag.';
    n = getal(sleutel);
    return p[0] === 'i' ? bedrag(n) : euro(n);
  }

  /* ---- opbouw ---- */
  function groepeer(lijst, sleutel) { var uit = [], idx = {}; lijst.forEach(function (x) { var k = x[sleutel] || ''; if (!(k in idx)) { idx[k] = uit.length; uit.push([k, []]); } uit[idx[k]][1].push(x); }); return uit; }
  function teken() {
    R = Calc.reken(S);
    var h = '';
    h += '<div class="kopregel"><div><input class="titel" data-meta="naam" value="' + esc(S.naam) + '" aria-label="Naam van de calculatie">' +
      '<p class="uitleg">Typ in elke cel een bedrag of een formule, zoals <code>=4*350</code> of <code>=bezoekers*0,25</code>. Alles is zonder btw, behalve waar het erbij staat.</p></div>' +
      '<div class="scenario"><label>Scenario <select data-actie="kies">' + B.lijst.map(function (x, i) { return '<option value="' + i + '"' + (i === B.actief ? ' selected' : '') + '>' + esc(x.scenario || 'Scenario ' + (i + 1)) + '</option>'; }).join('') + '</select></label>' +
      '<button class="knop licht" data-actie="kopie">Kopie maken</button><button class="knop licht" data-actie="hernoem">Hernoemen</button>' + (B.lijst.length > 1 ? '<button class="knop licht" data-actie="weg">Verwijderen</button>' : '') + '</div></div>';

    // overzicht
    h += '<section class="overzicht"><div class="tegels">' +
      tegel('Inkomsten', 'inkomsten|begroot') + tegel('Kosten', 'kosten|begroot') +
      '<div class="tegel groot"><span class="lbl">Resultaat</span><b data-uit="resultaat" data-kleur="resultaat"></b><small>marge <span data-uit="marge"></span></small></div>' +
      '<div class="tegel"><span class="lbl">Break-even</span><b data-uit="breakeven"></b><small>bezoekers, van de <span data-uit="bezoekers"></span></small></div>' +
      '<div class="tegel"><span class="lbl">Kosten per bezoeker</span><b data-uit="perbezoeker"></b><small>prognose resultaat <span data-uit="prognose" data-kleur="prognose"></span></small></div>' +
      '</div><p class="stand" data-uit="leeg"></p>' +
      '<div class="tabelrol"><table class="totaal"><thead><tr><th>Totaaloverzicht</th><th>Begroot</th><th>Offerte</th><th>Werkelijk</th><th>Prognose</th></tr></thead><tbody>' +
      groepeer(S.kosten, 'cat').map(function (g) { return '<tr><td><a href="#cat-' + esc(slug(g[0])) + '">' + esc(g[0]) + '</a></td>' + ['begroot', 'offerte', 'werkelijk', 'prognose'].map(function (k) { return '<td class="g" data-uit="cat|' + esc(g[0]) + '|' + k + '"></td>'; }).join('') + '</tr>'; }).join('') +
      '<tr class="som"><td>Totaal kosten</td>' + ['begroot', 'offerte', 'werkelijk', 'prognose'].map(function (k) { return '<td class="g" data-uit="kosten|' + k + '"></td>'; }).join('') + '</tr>' +
      groepeer(S.inkomsten, 'groep').map(function (g) { return '<tr><td><a href="#inkomsten">' + esc(g[0]) + '</a></td><td class="g" data-uit="groep|' + esc(g[0]) + '|begroot"></td><td></td><td class="g" data-uit="groep|' + esc(g[0]) + '|werkelijk"></td><td class="g" data-uit="groep|' + esc(g[0]) + '|prognose"></td></tr>'; }).join('') +
      '<tr class="som"><td>Totaal inkomsten</td><td class="g" data-uit="inkomsten|begroot"></td><td></td><td class="g" data-uit="inkomsten|werkelijk"></td><td class="g" data-uit="inkomsten|prognose"></td></tr>' +
      '<tr class="som eind"><td>Resultaat</td><td class="g" data-uit="resultaat" data-kleur="resultaat"></td><td></td><td></td><td class="g" data-uit="prognose" data-kleur="prognose"></td></tr>' +
      '</tbody></table></div><p class="uitleg">Prognose is per post het beste cijfer dat je hebt: werkelijk als dat er is, anders de offerte, anders begroot.</p></section>';

    // uitgangspunten
    h += blok('uitgangspunten', 'Uitgangspunten', 'De getallen waar de rest mee rekent. De naam in de tweede kolom gebruik je in formules.',
      '<table><thead><tr><th>Omschrijving</th><th>Naam</th><th class="g">Waarde</th><th>Toelichting</th><th></th></tr></thead><tbody>' +
      S.uitgangspunten.map(function (u) {
        return '<tr><td>' + tekstHtml('uitgangspunten.' + u.id + '.naam', u.naam, 'Omschrijving') + '</td><td>' + tekstHtml('uitgangspunten.' + u.id + '.sleutel', u.sleutel, 'Naam', 'naam') + '</td><td>' + celHtml('uitgangspunten.' + u.id + '.waarde', u.waarde, 'Waarde') + '</td><td>' + tekstHtml('uitgangspunten.' + u.id + '.notitie', u.notitie, 'Toelichting') + '</td>' + wegKnop('uitgangspunten', u.id) + '</tr>';
      }).join('') + '</tbody></table>', '<button class="knop licht" data-nieuw="uitgangspunten">+ Uitgangspunt</button>');

    // inkomsten
    h += blok('inkomsten', 'Inkomsten', 'Vul het bedrag inclusief btw in. De kolom ernaast rekent het terug naar zonder btw.',
      '<table><thead><tr><th>Post</th><th class="g">Begroot incl. btw</th><th class="g">Btw %</th><th class="g">Zonder btw</th><th class="g">Werkelijk</th><th>Notitie</th><th></th></tr></thead>' +
      groepeer(S.inkomsten, 'groep').map(function (g) {
        return '<tbody><tr class="sub"><th colspan="3">' + esc(g[0]) + '</th><th class="g" data-uit="groep|' + esc(g[0]) + '|begroot"></th><th class="g" data-uit="groep|' + esc(g[0]) + '|werkelijk"></th><th colspan="2"><button class="mini" data-nieuw="inkomsten" data-groep="' + esc(g[0]) + '">+ post</button></th></tr>' +
          g[1].map(function (x) {
            var p = 'inkomsten.' + x.id + '.';
            return '<tr><td>' + tekstHtml(p + 'naam', x.naam, 'Post') + '</td><td>' + celHtml(p + 'begroot', x.begroot, 'Begroot') + '</td><td>' + celHtml(p + 'btw', x.btw, 'Btw', 'smal') + '</td><td class="g" data-uit="i|' + x.id + '"></td><td>' + celHtml(p + 'werkelijk', x.werkelijk, 'Werkelijk') + '</td><td>' + tekstHtml(p + 'notitie', x.notitie, 'Notitie') + '</td>' + wegKnop('inkomsten', x.id) + '</tr>';
          }).join('') + '</tbody>';
      }).join('') + '<tfoot><tr class="som"><td colspan="3">Totaal inkomsten</td><td class="g" data-uit="inkomsten|begroot"></td><td class="g" data-uit="inkomsten|werkelijk"></td><td colspan="2"></td></tr></tfoot></table>',
      '<button class="knop licht" data-actie="nieuwe-groep">+ Groep</button>');

    // kosten
    h += '<h2 class="deel">Kosten</h2>';
    groepeer(S.kosten, 'cat').forEach(function (g) {
      var cat = g[0];
      h += blok('cat-' + slug(cat), cat, '',
        '<table><thead><tr><th>Post</th><th class="g">Begroot</th><th class="g">Offerte</th><th class="g">Werkelijk</th><th class="g">Verschil</th><th>Leverancier of notitie</th><th></th></tr></thead>' +
        groepeer(g[1], 'sub').map(function (s2) {
          return '<tbody>' + (s2[0] ? '<tr class="sub"><th colspan="7">' + esc(s2[0]) + '</th></tr>' : '') +
            s2[1].map(function (x) {
              var p = 'kosten.' + x.id + '.';
              return '<tr><td>' + tekstHtml(p + 'naam', x.naam, 'Post', 'Nieuwe post') + '</td><td>' + celHtml(p + 'begroot', x.begroot, 'Begroot') + '</td><td>' + celHtml(p + 'offerte', x.offerte, 'Offerte') + '</td><td>' + celHtml(p + 'werkelijk', x.werkelijk, 'Werkelijk') + '</td><td class="g" data-uit="kv|' + x.id + '" data-kleur="kv|' + x.id + '"></td><td>' + tekstHtml(p + 'notitie', x.notitie, 'Notitie') + '</td>' + wegKnop('kosten', x.id) + '</tr>';
            }).join('') + '</tbody>';
        }).join('') + '<tfoot><tr class="som"><td>Totaal ' + esc(cat.toLowerCase()) + '</td>' + ['begroot', 'offerte', 'werkelijk'].map(function (k) { return '<td class="g" data-uit="cat|' + esc(cat) + '|' + k + '"></td>'; }).join('') + '<td colspan="3"></td></tr></tfoot></table>',
        '<button class="knop licht" data-nieuw="kosten" data-cat="' + esc(cat) + '">+ Post</button>',
        '<span class="g" data-uit="cat|' + esc(cat) + '|begroot"></span><small data-uit="catleeg|' + esc(cat) + '"></small>');
    });
    h += '<p><button class="knop licht" data-actie="nieuwe-cat">+ Categorie</button></p>';

    $('#paneel').innerHTML = h;
    verfCellen();
  }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-'); }
  function tegel(l, k) { return '<div class="tegel"><span class="lbl">' + l + '</span><b data-uit="' + k + '"></b><small>begroot, zonder btw</small></div>'; }
  function wegKnop(lijst, id) { return '<td class="weg"><button data-weg="' + lijst + '.' + id + '" aria-label="Regel verwijderen" title="Regel verwijderen">×</button></td>'; }
  function blok(id, titel, uitleg, tabel, knoppen, rechts) {
    return '<details class="blok" id="' + esc(id) + '"' + (dicht[id] ? '' : ' open') + '><summary><h2>' + esc(titel) + '</h2><span class="rechts">' + (rechts || '') + '</span></summary>' +
      (uitleg ? '<p class="uitleg">' + uitleg + '</p>' : '') + '<div class="tabelrol">' + tabel + '</div><div class="knoppen">' + (knoppen || '') + '</div></details>';
  }

  /* ---- gebeurtenissen ---- */
  function herreken() { R = Calc.reken(S); verfCellen(); bewaar(); }
  d.addEventListener('focusin', function (e) {
    var el = e.target; if (!el.matches || !el.matches('input.cel')) return;
    var v = vind(el.getAttribute('data-pad')); if (v.rij) { el.value = v.rij[v.veld] == null ? '' : v.rij[v.veld]; el.select(); }
  });
  d.addEventListener('focusout', function (e) { if (e.target.matches && e.target.matches('input.cel')) verfCellen(); });
  d.addEventListener('input', function (e) {
    var el = e.target;
    if (el.getAttribute('data-meta')) { S[el.getAttribute('data-meta')] = el.value; bewaar(); return; }
    var pad = el.getAttribute('data-pad'); if (!pad) return;
    var v = vind(pad); if (!v.rij) return;
    v.rij[v.veld] = v.veld === 'sleutel' ? el.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') : el.value;
    herreken();
  });
  d.addEventListener('keydown', function (e) {
    var el = e.target; if (e.key !== 'Enter' || !el.getAttribute || !el.getAttribute('data-pad')) return;
    e.preventDefault();
    var alle = $$('input[data-kol="' + el.getAttribute('data-kol') + '"]', el.closest('table')), i = alle.indexOf(el), nxt = alle[i + (e.shiftKey ? -1 : 1)];
    if (nxt) nxt.focus(); else el.blur();
  });
  d.addEventListener('toggle', function (e) { if (e.target.classList && e.target.classList.contains('blok')) dicht[e.target.id] = !e.target.open; }, true);
  d.addEventListener('change', function (e) {
    if (e.target.getAttribute('data-actie') === 'kies') { B.actief = +e.target.value; S = B.lijst[B.actief]; bewaar(); teken(); }
    if (e.target.id === 'importbestand' && e.target.files[0]) {
      var fr = new FileReader();
      fr.onload = function () {
        try { var x = JSON.parse(fr.result); if (!x.lijst || !x.lijst[0].kosten) throw 0; B = x; if (!B.lijst[B.actief]) B.actief = 0; S = B.lijst[B.actief]; bewaar(); teken(); toast('Calculatie ingelezen.'); }
        catch (err) { toast('Dit bestand is geen export van de calculatie.'); }
        e.target.value = '';
      };
      fr.readAsText(e.target.files[0]);
    }
  });
  d.addEventListener('click', function (e) {
    var t = e.target.closest('[data-weg],[data-nieuw],[data-actie]'); if (!t) return;
    var a;
    if ((a = t.getAttribute('data-weg'))) {
      var p = a.split('.'), rij = S[p[0]].find(function (x) { return x.id === p[1]; });
      var gevuld = rij && ['begroot', 'offerte', 'werkelijk', 'waarde'].some(function (k) { return String(rij[k] || '').trim(); });
      if (gevuld && !confirm('"' + (rij.naam || 'Deze regel') + '" verwijderen?')) return;
      S[p[0]] = S[p[0]].filter(function (x) { return x.id !== p[1]; }); bewaar(); teken(); return;
    }
    if ((a = t.getAttribute('data-nieuw'))) {
      var nieuw;
      if (a === 'uitgangspunten') S.uitgangspunten.push(nieuw = { id: uid('u'), sleutel: '', naam: '', waarde: '', notitie: '' });
      if (a === 'inkomsten') { nieuw = { id: uid('i'), groep: t.getAttribute('data-groep'), naam: '', begroot: '', btw: '21', werkelijk: '', notitie: '' }; voegNa(S.inkomsten, nieuw, 'groep'); }
      if (a === 'kosten') { var cat = t.getAttribute('data-cat'), laatste = S.kosten.filter(function (x) { return x.cat === cat; }).pop(); nieuw = { id: uid('k'), cat: cat, sub: laatste ? laatste.sub : '', naam: '', begroot: '', offerte: '', werkelijk: '', notitie: '' }; voegNa(S.kosten, nieuw, 'cat'); }
      bewaar(); teken();
      var el = $('input[data-pad="' + a + '.' + nieuw.id + '.naam"]'); if (el) el.focus();
      return;
    }
    a = t.getAttribute('data-actie');
    if (a === 'nieuwe-cat' || a === 'nieuwe-groep') {
      var naam = prompt(a === 'nieuwe-cat' ? 'Naam van de categorie' : 'Naam van de groep'); if (!naam) return;
      if (a === 'nieuwe-cat') S.kosten.push({ id: uid('k'), cat: naam, sub: '', naam: '', begroot: '', offerte: '', werkelijk: '', notitie: '' });
      else S.inkomsten.push({ id: uid('i'), groep: naam, naam: '', begroot: '', btw: '21', werkelijk: '', notitie: '' });
      bewaar(); teken();
    }
    if (a === 'kopie') { var n = prompt('Naam van het nieuwe scenario', 'Slecht weer'); if (!n) return; var k = JSON.parse(JSON.stringify(S)); k.scenario = n; B.lijst.push(k); B.actief = B.lijst.length - 1; S = k; bewaar(); teken(); toast('Je werkt nu in "' + n + '".'); }
    if (a === 'hernoem') { var h2 = prompt('Naam van dit scenario', S.scenario); if (h2) { S.scenario = h2; bewaar(); teken(); } }
    if (a === 'weg') { if (!confirm('Scenario "' + S.scenario + '" verwijderen? Dit kan niet ongedaan worden.')) return; B.lijst.splice(B.actief, 1); B.actief = 0; S = B.lijst[0]; bewaar(); teken(); }
    if (a === 'export') download('apero-calculatie.json', JSON.stringify(B, null, 1), 'application/json');
    if (a === 'csv') download('apero-calculatie-' + slug(S.scenario) + '.csv', '﻿' + csv(), 'text/csv');
    if (a === 'import') $('#importbestand').click();
    if (a === 'print') window.print();
    if (a === 'leeg') { if (!confirm('Dit scenario terugzetten naar de lege beginstand? Alles wat je hier invulde verdwijnt.')) return; var b = root.APERO_CALC_BEGIN(); b.scenario = S.scenario; B.lijst[B.actief] = S = b; bewaar(); teken(); }
  });
  function voegNa(lijst, nieuw, sleutel) { var i = -1; lijst.forEach(function (x, j) { if (x[sleutel] === nieuw[sleutel]) i = j; }); lijst.splice(i + 1, 0, nieuw); }
  function download(naam, inhoud, type) { var a = d.createElement('a'); a.href = URL.createObjectURL(new Blob([inhoud], { type: type })); a.download = naam; d.body.appendChild(a); a.click(); a.remove(); }
  function csv() {
    var n = function (x) { return String(Math.round(x * 100) / 100).replace('.', ','); }, q = function (s) { return '"' + String(s || '').replace(/"/g, '""') + '"'; };
    var r = [['Soort', 'Categorie', 'Kopje', 'Post', 'Begroot', 'Offerte', 'Werkelijk', 'Notitie'].join(';')];
    S.uitgangspunten.forEach(function (u) { r.push(['Uitgangspunt', '', q(u.sleutel), q(u.naam), n(R.cel[u.id].v), '', '', q(u.notitie)].join(';')); });
    S.inkomsten.forEach(function (x) { var c = R.cel[x.id]; r.push(['Inkomsten', q(x.groep), '', q(x.naam), n(c.ex), '', c.werkelijk.leeg ? '' : n(c.werkelijk.v), q(x.notitie)].join(';')); });
    S.kosten.forEach(function (x) { var c = R.cel[x.id]; r.push(['Kosten', q(x.cat), q(x.sub), q(x.naam), n(c.begroot.v), c.offerte.leeg ? '' : n(c.offerte.v), c.werkelijk.leeg ? '' : n(c.werkelijk.v), q(x.notitie)].join(';')); });
    r.push(['Totaal', '', '', 'Resultaat', n(R.resultaat), '', '', ''].join(';'));
    return r.join('\r\n');
  }

  laad(); teken();
})(typeof window !== 'undefined' ? window : globalThis);
