/* APÉRO Culture · één script voor de hele site.
   Geen afhankelijkheden. Alles faalt stil: zonder JS blijft de site leesbaar. */
(function () {
  'use strict';
  var d = document, w = window, root = d.documentElement;
  root.classList.remove('geen-js');

  var LS = {
    get: function (k, f) { try { var v = JSON.parse(localStorage.getItem('apero_' + k)); return v == null ? f : v; } catch (e) { return f; } },
    set: function (k, v) { try { localStorage.setItem('apero_' + k, JSON.stringify(v)); } catch (e) {} }
  };
  w.APERO_LS = LS;

  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }
  function toast(t) {
    var el = $('.toast'); if (!el) { el = d.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); d.body.appendChild(el); }
    el.textContent = t; el.classList.add('toon'); clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove('toon'); }, 2400);
  }

  /* ---------- testomgeving: alleen op *.vercel.app ---------- */
  if (/\.vercel\.app$/.test(location.hostname)) {
    var m = d.createElement('meta'); m.name = 'robots'; m.content = 'noindex,nofollow'; d.head.appendChild(m);
    if (!$('.proef')) {
      var p = d.createElement('div'); p.className = 'proef';
      p.innerHTML = 'Nieuwe versie van APÉRO · testomgeving. De huidige site blijft gewoon op <a href="https://www.apero-culture.nl">apero-culture.nl</a>.';
      d.body.insertBefore(p, d.body.firstChild);
    }
  }

  /* ---------- menu ---------- */
  var menu = $('#menu'), mk = $('.menuknop');
  function zetMenu(open) {
    if (!menu) return;
    menu.classList.toggle('open', open); menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (mk) mk.setAttribute('aria-expanded', open ? 'true' : 'false');
    d.body.style.overflow = open ? 'hidden' : '';
    if (open) { var f = $('nav a', menu); if (f) f.focus(); } else if (mk) mk.focus();
  }
  if (mk) mk.addEventListener('click', function () { zetMenu(true); });
  $$('[data-sluit-menu]').forEach(function (b) { b.addEventListener('click', function () { zetMenu(false); }); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu && menu.classList.contains('open')) zetMenu(false); });

  /* ---------- klok: waar is het nu tijd ---------- */
  function uurIn(tz) {
    try {
      var s = new Intl.DateTimeFormat('nl-NL', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
      var p = s.split(':'); return { t: s, h: +p[0], m: +p[1] };
    } catch (e) { return null; }
  }
  function stand(h, m) {
    var x = h + m / 60;
    if (x >= 17.5 && x < 20.5) return 'aan tafel';
    if (x >= 20.5 && x < 23.5) return 'het eten';
    if (x >= 16 && x < 17.5) return 'bijna';
    if (x >= 12 && x < 16) return 'de middag';
    if (x >= 6 && x < 12) return 'de ochtend';
    return 'de nacht';
  }
  function tikKlok() {
    $$('[data-tz]').forEach(function (el) {
      var u = uurIn(el.getAttribute('data-tz')); if (!u) return;
      var t = $('.t', el), st = $('.st', el);
      if (t) t.textContent = u.t;
      var s = stand(u.h, u.m);
      if (st) st.textContent = s;
      el.classList.toggle('nu', s === 'aan tafel');
    });
    var k = $('#klok');
    if (k) {
      var u = uurIn('Europe/Amsterdam'), a = uurIn('Europe/Athens');
      if (u && a) {
        var zin = 'Het is ' + u.t + ' in Utrecht. ';
        var su = stand(u.h, u.m), sa = stand(a.h, a.m), x = u.h + u.m / 60;
        if (su === 'aan tafel') zin += 'Het uur is begonnen.';
        else if (sa === 'aan tafel') zin += 'In Athene is het ' + a.t + ': daar zit men al.';
        else if (su === 'bijna') zin += 'Nog even.';
        else if (x >= 6 && x < 16) { var n = Math.round(17.5 - x); zin += 'Nog ' + (n <= 1 ? 'een uur' : n + ' uur') + ', dan begint het.'; }
        else zin += 'Het uur is voorbij. Morgen weer, rond zes.';
        k.lastChild.textContent = zin;
      }
    }
  }
  tikKlok(); setInterval(tikKlok, 30000);

  /* ---------- rustige reveal ---------- */
  var rv = $$('.rv');
  if ('IntersectionObserver' in w && rv.length) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    rv.forEach(function (el) { io.observe(el); });
  } else rv.forEach(function (el) { el.classList.add('in'); });

  /* ---------- nieuwsbrief ---------- */
  $$('form.aanmeld').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var inp = $('input[type=email]', f), st = $('.status', f), knop = $('button', f);
      var mail = (inp.value || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) { st.textContent = 'Dat lijkt nog geen mailadres.'; inp.focus(); return; }
      knop.disabled = true; st.textContent = 'Even inschenken…';
      fetch('/api/aanmelden', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: mail, bron: f.getAttribute('data-bron') || location.pathname, website: ($('input[name=website]', f) || {}).value || '' }) })
        .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); })
        .then(function (j) {
          if (j && j.ok) {
            LS.set('ingeschreven', true);
            st.textContent = j.testmodus
              ? 'Dank je. Let op: dit is de testomgeving, je adres is niet opgeslagen.'
              : 'Dank je. Kijk in je mail: we vragen je één keer te bevestigen.';
            inp.value = '';
          } else { st.textContent = (j && j.fout) || 'Dat ging niet goed. Probeer het zo nog eens.'; }
        })
        .catch(function () { st.textContent = 'Geen verbinding. Probeer het zo nog eens.'; })
        .then(function () { knop.disabled = false; });
    });
  });

  /* ---------- verhalen-index: tijd, filters, hervatten ---------- */
  var idx = $('#verhalen-lijst');
  if (idx) {
    var kaarten = $$('.kaart[data-slug]', idx);
    var pref = LS.get('tier', 'm');
    function zetTijd(t) {
      pref = t; LS.set('tier', t);
      $$('[data-tijd]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-tijd') === t ? 'true' : 'false'); });
      kaarten.forEach(function (k) {
        var mins = JSON.parse(k.getAttribute('data-min') || '{}');
        var v = mins[t] ? t : (mins.m ? 'm' : 'k');
        var el = $('.min', k); if (el) el.textContent = (v === 'k' ? 'kort' : v === 'm' ? 'middel' : 'lang') + ' · ' + mins[v] + ' min';
        var a = $('a', k) || k; if (a.href) a.href = a.href.split('?')[0] + '?v=' + v;
      });
    }
    $$('[data-tijd]').forEach(function (b) { b.addEventListener('click', function () { zetTijd(b.getAttribute('data-tijd')); }); });
    zetTijd(pref);

    var sel = { reeks: '', plek: '', tijd: '' };
    function filter() {
      var n = 0;
      kaarten.forEach(function (k) {
        var ok = (!sel.reeks || k.getAttribute('data-reeks') === sel.reeks)
          && (!sel.plek || ('|' + k.getAttribute('data-plekken') + '|').indexOf('|' + sel.plek + '|') > -1)
          && (!sel.tijd || ('|' + k.getAttribute('data-periode') + '|').indexOf('|' + sel.tijd + '|') > -1);
        k.hidden = !ok; if (ok) n++;
      });
      var l = $('#leeg'); if (l) l.hidden = n > 0;
      var q = []; Object.keys(sel).forEach(function (k) { if (sel[k]) q.push(k + '=' + encodeURIComponent(sel[k])); });
      try { history.replaceState(null, '', location.pathname + (q.length ? '?' + q.join('&') : '')); } catch (e) {}
    }
    $$('select[data-filter]').forEach(function (s) {
      s.addEventListener('change', function () { sel[s.getAttribute('data-filter')] = s.value; filter(); });
    });
    var qp = new URLSearchParams(location.search);
    Object.keys(sel).forEach(function (k) { if (qp.get(k)) { sel[k] = qp.get(k); var s = $('select[data-filter="' + k + '"]'); if (s) s.value = sel[k]; } });
    filter();
    var wis = $('#wis'); if (wis) wis.addEventListener('click', function () { sel = { reeks: '', plek: '', tijd: '' }; $$('select[data-filter]').forEach(function (s) { s.value = ''; }); filter(); });
  }
  var hv = $('#hervat'), laatst = LS.get('laatst', null);
  if (hv && laatst && laatst.slug && !laatst.klaar) {
    hv.classList.add('toon'); $('b', hv).textContent = laatst.titel;
    $('a', hv).href = '/verhalen/' + laatst.slug + '.html?v=' + (laatst.v || 'm') + '#verder';
  }
  var bw = $('#bewaard'), bm = LS.get('bewaard', {});
  if (bw && Object.keys(bm).length) {
    bw.hidden = false;
    $('ul', bw).innerHTML = Object.keys(bm).map(function (s) { return '<li><a href="/verhalen/' + s + '.html">' + bm[s] + '</a></li>'; }).join('');
  }

  /* ---------- artikel ---------- */
  var art = $('article[data-slug]');
  if (art) {
    var slug = art.getAttribute('data-slug'), titel = art.getAttribute('data-titel');
    var mins = JSON.parse(art.getAttribute('data-min') || '{}');
    var langType = art.getAttribute('data-lang'); // 'vervolg' | 'volledig' | ''
    var knoppen = $$('.vk button'), uitleg = $('.vuitleg');
    var namen = { k: 'Kort', m: 'Middel', l: 'Lang' };
    var uitlegTekst = {
      k: 'De kern, in een paar minuten. Je kunt daarna altijd verder.',
      m: 'Het hele verhaal, zonder omwegen.',
      l: langType === 'vervolg' ? 'Het hele verhaal, plus wat er verder nog te vertellen is.' : 'De volledige versie, met alle hoofdstukken.'
    };
    function beschikbaar(v) { return v === 'l' ? !!mins.l : !!mins[v]; }
    function toon(v, scroll) {
      if (!beschikbaar(v)) v = 'm';
      $$('.versie', art).forEach(function (el) { el.classList.remove('aan'); });
      var doel = v;
      if (v === 'l' && langType === 'vervolg') { doel = 'm'; var vv = $('.vervolg', art); if (vv) vv.classList.add('open'); }
      else { var vv2 = $('.vervolg', art); if (vv2) vv2.classList.remove('open'); }
      var el = $('.versie[data-v="' + doel + '"]', art); if (el) el.classList.add('aan');
      $$('.brug-l', art).forEach(function (b) { b.hidden = (v === 'l'); });
      knoppen.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === v ? 'true' : 'false'); });
      if (uitleg) uitleg.textContent = uitlegTekst[v];
      art.setAttribute('data-actief', v);
      LS.set('tier', v);
      try { history.replaceState(null, '', location.pathname + '?v=' + v + location.hash); } catch (e) {}
      if (scroll) { var t = $('#tekst'); if (t) w.scrollTo({ top: t.getBoundingClientRect().top + w.scrollY - 80, behavior: 'smooth' }); }
      bewaarLaatst(false);
    }
    knoppen.forEach(function (b) { b.addEventListener('click', function () { toon(b.getAttribute('data-v'), true); }); });
    $$('[data-naar]', art).forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        var v = b.getAttribute('data-naar');
        if (v === 'l' && langType === 'vervolg') {
          var vv = $('.vervolg', art); vv.classList.add('open'); b.closest('.brug').hidden = true;
          knoppen.forEach(function (k) { k.setAttribute('aria-pressed', k.getAttribute('data-v') === 'l' ? 'true' : 'false'); });
          if (uitleg) uitleg.textContent = uitlegTekst.l; art.setAttribute('data-actief', 'l'); LS.set('tier', 'l');
          try { history.replaceState(null, '', location.pathname + '?v=l'); } catch (e2) {}
          var kop = $('.vervolg-kop', vv); if (kop) kop.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else toon(v, true);
      });
    });
    var qv = new URLSearchParams(location.search).get('v');
    toon(qv && /^[kml]$/.test(qv) ? qv : LS.get('tier', 'm'), false);

    // voortgang + hervatten
    var bar = $('.voortgang'), tekst = $('#tekst');
    function bewaarLaatst(klaar) { LS.set('laatst', { slug: slug, titel: titel, v: art.getAttribute('data-actief'), klaar: klaar, y: Math.round(w.scrollY) }); }
    var klaarGemeld = false, tik = 0;
    w.addEventListener('scroll', function () {
      if (!tekst) return;
      var r = tekst.getBoundingClientRect(), h = r.height - w.innerHeight * .6;
      var p = Math.max(0, Math.min(1, -r.top / (h > 0 ? h : 1)));
      if (bar) bar.style.width = (p * 100) + '%';
      if (p > .97 && !klaarGemeld) { klaarGemeld = true; bewaarLaatst(true); }
      clearTimeout(tik); tik = setTimeout(function () { if (!klaarGemeld) bewaarLaatst(false); }, 600);
    }, { passive: true });
    if (location.hash === '#verder' && laatst && laatst.slug === slug && laatst.y) setTimeout(function () { w.scrollTo(0, laatst.y); }, 60);

    // bewaren
    var bb = $('[data-bewaar]');
    function bmZet() { var b = LS.get('bewaard', {}); if (bb) { bb.setAttribute('aria-pressed', b[slug] ? 'true' : 'false'); bb.textContent = b[slug] ? 'Bewaard' : 'Bewaar voor later'; } }
    if (bb) bb.addEventListener('click', function () { var b = LS.get('bewaard', {}); if (b[slug]) delete b[slug]; else b[slug] = titel; LS.set('bewaard', b); bmZet(); toast(b[slug] ? 'Bewaard. Je vindt het terug bij Verhalen.' : 'Niet meer bewaard.'); });
    bmZet();
    // delen
    var db = $('[data-deel]');
    if (db) db.addEventListener('click', function () {
      var url = location.origin + location.pathname;
      if (navigator.share) navigator.share({ title: titel, url: url }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast('Link gekopieerd.'); });
      else prompt('Kopieer de link', url);
    });
    // leesinstellingen
    var li = $('.lees-inst'), lk = $('[data-lees]');
    var fs = LS.get('fs', 18.5);
    function zetFs(v) { fs = Math.max(16, Math.min(24, v)); root.style.setProperty('--lees', fs + 'px'); LS.set('fs', fs); }
    zetFs(fs);
    if (LS.get('nacht', false)) d.body.classList.add('nacht');
    if (lk) lk.addEventListener('click', function () { li.classList.toggle('open'); lk.setAttribute('aria-expanded', li.classList.contains('open')); });
    $$('[data-fs]').forEach(function (b) { b.addEventListener('click', function () { zetFs(fs + (+b.getAttribute('data-fs'))); }); });
    var nb = $('[data-nacht]'); if (nb) nb.addEventListener('click', function () { d.body.classList.toggle('nacht'); LS.set('nacht', d.body.classList.contains('nacht')); });
  }
})();
