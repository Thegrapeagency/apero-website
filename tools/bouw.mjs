#!/usr/bin/env node
/* ============================================================
   APÉRO · bouwscript
   node tools/bouw.mjs

   Leest  content/verhalen/*.md, content/reeksen.json, content/plekken.json
   Schrijft verhalen/<slug>.html, verhalen/index.html, index.html,
            steden.html, festival.html, verhaal.html (Over), inschenker.html,
            lezen.html (doorverwijzing), studio/data/verhalen.json
   En zet dezelfde navigatie + voet op de oudere pagina's
   (werelden, lexicon, atlas, faq, partners, podcast, magazine),
   zonder hun inhoud aan te raken.

   Geen dependencies. Draait op Node 18+.
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pagina as festivalPagina } from './sjablonen/festival.mjs';
import { pagina as overPagina } from './sjablonen/over.mjs';
import { pagina as inschenkerPagina } from './sjablonen/inschenker.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (...a) => path.join(ROOT, ...a);
const SITE = 'https://www.apero-culture.nl';
const lees = (f) => fs.readFileSync(P(f), 'utf8');
const schrijf = (f, s) => { fs.mkdirSync(path.dirname(P(f)), { recursive: true }); fs.writeFileSync(P(f), s); };

/* ---------------- helpers ---------------- */
export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const lijst = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
const woorden = (html) => html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
const minuten = (html) => Math.max(1, Math.round(woorden(html) / 220));
const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const VANDAAG = new Date().toISOString().slice(0, 10);
const datumNL = (iso) => { const [y, m, dd] = String(iso).split('-').map(Number); return y ? `${dd} ${MAANDEN[m - 1]} ${y}` : ''; };
const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ---------------- mini-markdown ---------------- */
function inline(s) {
  return s
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => `<a href="${u}"${/^https?:/.test(u) ? ' rel="noopener"' : ''}>${t}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>');
}
function md(src) {
  const out = [];
  const regels = src.replace(/\r/g, '').split('\n');
  let i = 0;
  const blok = () => { const b = []; while (i < regels.length && regels[i].trim() !== '') b.push(regels[i++]); return b; };
  while (i < regels.length) {
    const r = regels[i];
    if (r.trim() === '') { i++; continue; }
    if (r.startsWith('[[scene')) {
      i++; const bin = [];
      while (i < regels.length && regels[i].trim() !== ']]') bin.push(regels[i++]);
      i++;
      out.push(`<aside class="scene"><a class="sl" href="/verhaal.html#werkwijze" title="Hoe we scènes maken">Samengestelde scène</a>${md(bin.join('\n'))}</aside>`);
      continue;
    }
    if (r.trim().startsWith('<')) { out.push(blok().join('\n')); continue; }
    if (/^#{2,3} /.test(r)) { const n = r.startsWith('###') ? 3 : 2; out.push(`<h${n}>${inline(r.replace(/^#+ /, ''))}</h${n}>`); i++; continue; }
    if (r.startsWith('> ')) { out.push(`<blockquote><p>${inline(blok().map((x) => x.replace(/^> ?/, '')).join(' '))}</p></blockquote>`); continue; }
    if (/^- /.test(r)) { out.push('<ul>' + blok().map((x) => `<li>${inline(x.replace(/^- /, ''))}</li>`).join('') + '</ul>'); continue; }
    out.push(`<p>${inline(blok().join(' '))}</p>`);
  }
  return out.join('\n');
}
function leesVerhaal(bestand) {
  const src = fs.readFileSync(bestand, 'utf8');
  const m = src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('Geen frontmatter in ' + bestand);
  const fm = {};
  m[1].split('\n').forEach((r) => { const k = r.indexOf(':'); if (k > 0) fm[r.slice(0, k).trim()] = r.slice(k + 1).trim(); });
  const delen = {};
  m[2].split(/^::: (\w+)\s*$/m).forEach((d, j, arr) => { if (j % 2 === 1) delen[d] = (arr[j + 1] || '').trim(); });
  const bronnen = (delen.bronnen || '').split('\n').filter((x) => x.startsWith('- ')).map((x) => {
    const mm = x.match(/^- \*\*([^*]+)\*\* · (.*)$/);
    return mm ? { soort: mm[1], tekst: mm[2] } : { soort: '', tekst: x.slice(2) };
  });
  return {
    ...fm,
    plekken: lijst(fm.plekken), dranken: lijst(fm.dranken), themas: lijst(fm.themas), tijd: lijst(fm.tijd), verder: lijst(fm.verder),
    kort: md(delen.kort || ''), middel: md(delen.middel || ''), lang: delen.lang ? md(delen.lang) : '',
    langType: delen.lang ? (fm.lang === 'volledig' ? 'volledig' : 'vervolg') : '',
    bronnen, ruwBronnen: delen.bronnen || ''
  };
}
function periodes(tijd) {
  const uit = new Set();
  tijd.forEach((t) => {
    const s = t.toLowerCase();
    if (s === 'nu') uit.add('nu');
    if (/oudheid|overlevering/.test(s)) uit.add('voor-1800');
    if (/1[4-7]e eeuw|14e/.test(s)) uit.add('voor-1800');
    if (/19e eeuw/.test(s)) uit.add('1800-1950');
    const y = s.match(/\b(1\d{3}|20\d{2})\b/);
    if (y) { const n = +y[1]; if (n < 1800) uit.add('voor-1800'); else if (n < 1950) uit.add('1800-1950'); else if (n < 2000) uit.add('1950-2000'); else uit.add('nu'); }
  });
  return [...uit];
}
const PERIODE_NAAM = { 'voor-1800': 'Vóór 1800', '1800-1950': '1800–1950', '1950-2000': '1950–2000', nu: 'Nu' };

/* ---------------- data laden ---------------- */
const REEKSEN = JSON.parse(lees('content/reeksen.json'));
const REEKS = Object.fromEntries(REEKSEN.map((r) => [r.id, r]));
const PLEKKEN = JSON.parse(lees('content/plekken.json'));
function plekVan(naam) { return PLEKKEN.find((p) => p.naam === naam || (p.alias || []).includes(naam)); }

const VERHALEN = fs.readdirSync(P('content/verhalen')).filter((f) => f.endsWith('.md')).map((f) => leesVerhaal(P('content/verhalen', f)))
  .map((v) => {
    const mins = { k: minuten(v.kort), m: minuten(v.middel) };
    if (v.langType === 'vervolg') mins.l = mins.m + minuten(v.lang);
    else if (v.langType === 'volledig') mins.l = minuten(v.lang);
    return { ...v, mins, periodes: periodes(v.tijd), url: `/verhalen/${v.slug}.html` };
  })
  .sort((a, b) => (b.datum || '').localeCompare(a.datum || '') || a.titel.localeCompare(b.titel));
const OP_SLUG = Object.fromEntries(VERHALEN.map((v) => [v.slug, v]));
const PUBLIEK = VERHALEN.filter((v) => ['klaar', 'gepubliceerd'].includes(v.status));

/* ---------------- gedeelde stukken ---------------- */
const NAV = [
  ['Verhalen', '/verhalen/', 'Alles wat er te lezen is'],
  ['Steden', '/steden.html', 'Waar het uur zich afspeelt'],
  ['Lexicon', '/lexicon.html', 'De woorden van de tafel'],
  ['Festival', '/festival.html', 'Utrecht, juni 2027'],
  ['Over', '/verhaal.html', 'Wat APÉRO is']
];
export function kop(actief) {
  const links = NAV.map(([n, u]) => `<a href="${u}"${actief === u ? ' aria-current="page"' : ''}>${n}</a>`).join('');
  return `<!--nav--><a class="sr" href="#inhoud">Naar de inhoud</a>
<header class="kop"><div class="in">
<a class="merk" href="/" aria-label="APÉRO Culture, naar de voorpagina">APÉR<span class="flower" aria-hidden="true"></span><span class="cul">CULTURE</span></a>
<nav class="hoofdnav" aria-label="Hoofdmenu">${links}<a class="knop klein" href="/inschenker.html">De Inschenker</a></nav>
<button class="menuknop" type="button" aria-expanded="false" aria-controls="menu"><i aria-hidden="true"></i>Menu</button>
</div></header>
<div class="menu" id="menu" aria-hidden="true" role="dialog" aria-label="Menu">
<div class="mtop"><a class="merk" href="/">APÉR<span class="flower" aria-hidden="true"></span></a><button class="menuknop" type="button" data-sluit-menu>Sluit</button></div>
<nav aria-label="Menu">${NAV.map(([n, u, s]) => `<a href="${u}">${n}<small>${s}</small></a>`).join('')}</nav>
<div class="mvoet"><a class="knop" href="/inschenker.html">Ontvang De Inschenker</a><a class="tekstlink" href="https://www.instagram.com/apero.festival">Instagram</a></div>
<div class="petals" aria-hidden="true"></div>
</div><!--/nav-->`;
}
export function voet() {
  return `<!--voet--><footer class="voet"><div class="petals" aria-hidden="true"></div><div class="w"><div class="in">
<div><a class="merk" href="/">APÉR<span class="flower" aria-hidden="true"></span></a><p>Een magazine over het uur tussen werk en diner. Van <em>aperire</em>, openen. In juni 2027 aan tafel in Utrecht.</p></div>
<div><h4>Lezen</h4><a href="/verhalen/">Verhalen</a><a href="/steden.html">Steden</a><a href="/verhalen/?reeks=werelden">De zes werelden</a><a href="/lexicon.html">Lexicon</a></div>
<div><h4>APÉRO</h4><a href="/verhaal.html">Over</a><a href="/festival.html">Festival 2027</a><a href="/app.html">De Aperokiezer</a><a href="/partners.html">Partners</a><a href="/faq.html">Vragen</a></div>
<div><h4>Blijf in de buurt</h4><a href="/inschenker.html">De Inschenker</a><a href="https://www.instagram.com/apero.festival">Instagram</a><a href="mailto:hallo@apero-culture.nl">hallo@apero-culture.nl</a></div>
</div><div class="noot">APÉRO Culture · Utrecht · een initiatief van The Grape Agency</div></div></footer><!--/voet-->`;
}
export function aanmeldForm(bron, licht) {
  return `<form class="aanmeld${licht ? ' licht' : ''}" data-bron="${bron}" novalidate>
<label class="sr" for="mail-${bron}">Je mailadres</label>
<div class="rij"><input id="mail-${bron}" type="email" name="email" autocomplete="email" inputmode="email" placeholder="jouw@mailadres.nl" required><button class="knop" type="submit">Schenk maar in</button></div>
<input type="text" name="website" tabindex="-1" autocomplete="off" class="sr" aria-hidden="true">
<p class="status" role="status" aria-live="polite"></p>
<p class="klein">Eens in de twee weken, op donderdag. Afmelden kan in elke mail. We delen je adres met niemand.</p>
</form>`;
}
export function inschenkerBlok(bron) {
  return `<section class="inschenker" aria-labelledby="ins-${bron}"><div class="petals" aria-hidden="true"></div><div class="w"><div class="in">
<div><span class="lbl">De Inschenker · de nieuwsbrief</span><h2 class="kop-l" id="ins-${bron}">Eén verhaal, net voordat het uur begint.</h2>
<p>Eens in de twee weken op donderdagmiddag. Het nieuwste verhaal, één ding om zelf te proberen, en wat we onderweg tegenkwamen. Wie meeleest, hoort ook als eerste wat er in juni 2027 op tafel komt.</p></div>
${aanmeldForm(bron)}
</div></div></section>`;
}
export function html({ titel, omschrijving, pad, beeld, actief, body, type = 'website', extraHead = '', ld = '' }) {
  const canon = SITE + pad;
  const og = beeld && !beeld.startsWith('petals') ? SITE + '/' + beeld.replace(/^\//, '') : SITE + '/assets/fresco/fresco-04.jpg';
  return `<!DOCTYPE html>
<html lang="nl" class="geen-js">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titel)}</title>
<meta name="description" content="${esc(omschrijving)}">
<link rel="canonical" href="${canon}">
<meta name="theme-color" content="#F4EAD6">
<meta property="og:type" content="${type}"><meta property="og:site_name" content="APÉRO Culture">
<meta property="og:title" content="${esc(titel)}"><meta property="og:description" content="${esc(omschrijving)}">
<meta property="og:url" content="${canon}"><meta property="og:image" content="${og}"><meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="/apero-tokens.css"><link rel="stylesheet" href="/css/apero.css">
<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" href="/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
${extraHead}${ld}
</head>
<body class="apero-body">
${kop(actief)}
<main id="inhoud">
${body}
</main>
${voet()}
<script src="/js/apero.js" defer></script>
<script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
`;
}
function petalKleur(v) {
  const kleuren = [['--terracotta', '--burro'], ['--salvia', '--terracotta'], ['--burro', '--mattone'], ['--mattone', '--burro']];
  const k = kleuren[v.slug.length % kleuren.length];
  return `--a:var(${k[0]});--b:var(${k[1]});--c:44px`;
}
function beeldHTML(v, klasse = 'boog', laden = 'lazy') {
  if (!v.beeld || v.beeld === 'petals') {
    return `<div class="${klasse}"><div class="petals" style="${petalKleur(v)}"></div><div class="grain"></div></div>`;
  }
  return `<div class="${klasse}"><img src="/${v.beeld}" alt="" loading="${laden}" decoding="async"><div class="wash"></div></div>`;
}
function kaart(v, opties = {}) {
  const r = REEKS[v.serie];
  const beeld = (!v.beeld || v.beeld === 'petals')
    ? `<div class="beeld"><div class="petals" style="${petalKleur(v)}"></div><div class="grain"></div><div class="cartouche"><span class="ct-k">${esc(r ? r.naam : '')}</span><div class="ct-t">${esc(v.titel)}</div></div></div>`
    : `<div class="beeld"><img src="/${v.beeld}" alt="" loading="lazy" decoding="async"></div>`;
  return `<a class="kaart rv" href="${v.url}?v=m" data-slug="${v.slug}" data-reeks="${v.serie}" data-plekken="${esc(v.plekken.map((p) => (plekVan(p) || { naam: p }).naam).join('|'))}" data-dranken="${esc(v.dranken.join('|'))}" data-periode="${v.periodes.join('|')}" data-min='${JSON.stringify(v.mins)}'>
${opties.label ? `<span class="lbl">${esc(opties.label)}</span>` : ''}${beeld}
<div class="kt"><span class="lbl stil">${esc(r ? r.naam : '')}${v.plekken[0] ? ' · ' + esc(v.plekken[0]) : ''}</span>
<h3 class="kop-m">${esc(v.titel)}</h3>
<p>${esc(v.intro)}</p>
<span class="meta"><span class="min">middel · ${v.mins.m} min</span></span></div>
</a>`;
}

/* ---------------- het spoor: wat lees je hierna ---------------- */
function spoor(v) {
  const kand = [];
  const voeg = (x) => { if (x && x.slug !== v.slug && !kand.find((k) => k.v.slug === x.slug) && ['klaar', 'gepubliceerd'].includes(x.status)) kand.push({ v: x }); };
  v.verder.forEach((s) => voeg(OP_SLUG[s]));
  PUBLIEK.map((x) => ({ x, s: (x.serie === v.serie ? 2 : 0) + x.plekken.filter((p) => v.plekken.includes(p)).length * 2 + x.dranken.filter((p) => v.dranken.includes(p)).length }))
    .sort((a, b) => b.s - a.s).forEach(({ x }) => voeg(x));
  return kand.slice(0, 3).map(({ v: x }) => {
    const plek = x.plekken.find((p) => v.plekken.includes(p));
    const drank = x.dranken.find((p) => v.dranken.includes(p));
    let label;
    if (plek) label = `Ook in ${plek}`;
    else if (drank) label = `Ook over ${drank}`;
    else if (x.serie === v.serie) label = `Meer ${REEKS[x.serie].naam}`;
    else if (x.periodes.some((p) => !v.periodes.includes(p))) label = `Een andere tijd: ${x.tijd[0] || ''}`;
    else label = REEKS[x.serie] ? REEKS[x.serie].naam : 'Hierna';
    return kaart(x, { label });
  }).join('\n');
}

/* ---------------- artikelpagina ---------------- */
function artikel(v) {
  const r = REEKS[v.serie];
  const heeftL = !!v.lang;
  const vb = (x) => `<button type="button" data-v="${x}" aria-pressed="false"${x === 'l' && !heeftL ? ' disabled' : ''}><b>${{ k: 'Kort', m: 'Middel', l: 'Lang' }[x]}</b><span>${x === 'l' && !heeftL ? 'nog niet' : v.mins[x] + ' min'}</span></button>`;
  const brugK = `<div class="brug"><span class="lbl">Dat was de korte versie</span><p>De middellange versie vertelt het hele verhaal, met de tafel, de mensen en de details die hier ontbreken. Ongeveer ${v.mins.m} minuten.</p><a class="knop klein" href="?v=m" data-naar="m">Lees het hele verhaal</a></div>`;
  const brugL = heeftL
    ? (v.langType === 'vervolg'
      ? `<div class="brug brug-l"><span class="lbl">Er is nog meer</span><p>De lange versie gaat hier verder, zonder dat je opnieuw hoeft te beginnen. Nog ongeveer ${v.mins.l - v.mins.m} minuten.</p><a class="knop klein" href="?v=l" data-naar="l">Lees verder</a></div>`
      : `<div class="brug brug-l"><span class="lbl">Er is een lange versie</span><p>Met alle hoofdstukken, ongeveer ${v.mins.l} minuten. Die begint weer bovenaan.</p><a class="knop klein" href="?v=l" data-naar="l">Naar de lange versie</a></div>`)
    : '';
  const vervolg = v.langType === 'vervolg' ? `<div class="vervolg" id="vervolg"><div class="vervolg-kop">Vanaf hier: de lange versie</div>${v.lang}</div>` : '';
  const lVersie = v.langType === 'volledig' ? `<div class="versie" data-v="l">${v.lang}</div>` : '';
  const bronnenHTML = v.bronnen.length ? `<details class="weten"><summary>Hoe we dit weten <span>${v.bronnen.length} bronnen en noten <span class="pijl" aria-hidden="true">▾</span></span></summary>
<ul>${v.bronnen.map((b) => `<li>${b.soort ? `<b>${esc(b.soort)}</b>` : ''}${inline(b.tekst)}</li>`).join('')}</ul>
<p class="uitleg">We maken onderscheid tussen feiten (met bron), overlevering, observaties en interpretatie. Een <em>samengestelde scène</em> is gebaseerd op deze bronnen, maar beschrijft niet één echte avond. <a href="/verhaal.html#werkwijze">Zo werken we.</a></p></details>` : '';
  const plekLinks = v.plekken.map((p) => { const pl = plekVan(p); return pl ? `<a href="/steden.html#stad-${slugify(pl.naam)}">${esc(p)}</a>` : esc(p); }).join(', ');
  const body = `<div class="voortgang" aria-hidden="true"></div>
<article data-slug="${v.slug}" data-titel="${esc(v.titel)}" data-min='${JSON.stringify(v.mins)}' data-lang="${v.langType}">
<header class="akop"><div class="w-lees">
<div class="kruimel"><a href="/verhalen/">Verhalen</a> / <a href="/verhalen/?reeks=${v.serie}">${esc(r ? r.naam : '')}</a></div>
<span class="lbl">${esc(v.kicker || (r && r.naam) || '')}</span>
<h1>${esc(v.titel)}</h1>
${v.ondertitel ? `<p class="stand">${esc(v.ondertitel)}</p>` : ''}
<div class="ameta meta">${v.datum && v.datum <= VANDAAG ? `<span>${datumNL(v.datum)}</span>` : ''}${plekLinks ? `<span>${plekLinks}</span>` : ''}</div>
<div class="versies" role="group" aria-label="Kies hoeveel tijd je hebt">
<span class="vl">Hoeveel tijd heb je?</span>
<div class="vk">${vb('k')}${vb('m')}${vb('l')}</div>
<p class="vuitleg" aria-live="polite"></p>
</div>
</div></header>
<figure class="abeeld w-lees">${beeldHTML(v, 'boog', 'eager')}${v.bijschrift ? `<figcaption>${esc(v.bijschrift)}</figcaption>` : ''}</figure>
<div class="w-lees">
<div class="lees-inst" aria-label="Leesinstellingen"><button type="button" data-fs="-1" aria-label="Kleinere letter">A−</button><button type="button" data-fs="1" aria-label="Grotere letter">A+</button><button type="button" data-nacht aria-label="Nachtstand">☾</button></div>
<div class="tekst" id="tekst">
<div class="versie" data-v="k">${v.kort}${brugK}</div>
<div class="versie" data-v="m">${v.middel}${brugL}${vervolg}</div>
${lVersie}
</div>
<div class="aacties"><button type="button" data-bewaar aria-pressed="false">Bewaar voor later</button><button type="button" data-deel>Deel dit verhaal</button><button type="button" data-lees aria-expanded="false">Aa · lezen</button></div>
${bronnenHTML}
</div>
</article>
<section class="hierna" aria-labelledby="hierna-kop"><div class="w">
<div class="bkop"><div><span class="lbl">Blijf nog even zitten</span><h2 class="kop-l" id="hierna-kop">Hierna</h2></div><a class="tekstlink" href="/verhalen/">Alle verhalen</a></div>
<div class="raster r3">${spoor(v)}</div>
</div></section>
${inschenkerBlok('artikel-' + v.slug)}`;
  const ld = `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: v.titel, description: v.intro, datePublished: v.datum, inLanguage: 'nl', publisher: { '@type': 'Organization', name: 'APÉRO Culture' }, image: v.beeld && v.beeld !== 'petals' ? SITE + '/' + v.beeld : undefined })}</script>`;
  return html({ titel: `${v.titel} · APÉRO Culture`, omschrijving: v.intro, pad: v.url, beeld: v.beeld, actief: '/verhalen/', body, type: 'article', ld });
}

/* ---------------- verhalen-index ---------------- */
function verhalenIndex() {
  const opties = (arr) => arr.map(([w, n]) => `<option value="${esc(w)}">${esc(n)}</option>`).join('');
  const reeksOpt = REEKSEN.filter((r) => PUBLIEK.some((v) => v.serie === r.id)).map((r) => [r.id, r.naam]);
  const plekOpt = PLEKKEN.filter((p) => PUBLIEK.some((v) => v.plekken.some((x) => (plekVan(x) || {}).naam === p.naam))).map((p) => [p.naam, p.naam]);
  const perOpt = ['voor-1800', '1800-1950', '1950-2000', 'nu'].filter((p) => PUBLIEK.some((v) => v.periodes.includes(p))).map((p) => [p, PERIODE_NAAM[p]]);
  const body = `<header class="pkop"><div class="w">
<span class="lbl">APÉRO Culture</span>
<h1 class="kop-xl">Verhalen</h1>
<p class="lede">Over het glas, het bord en iedereen die aanschuift. ${PUBLIEK.length} verhalen, van Athene om kwart over zes tot een Nederlandse kroeg in 1881. Zeg hoeveel tijd je hebt, en elk verhaal past zich aan.</p>
<div class="tijdkeuze" role="group" aria-label="Hoeveel tijd heb je"><span class="tk-l">Hoeveel tijd heb je?</span>
<a href="#" data-tijd="k" role="button" aria-pressed="false" onclick="return false"><b>Kort</b><span>een paar minuten</span></a>
<a href="#" data-tijd="m" role="button" aria-pressed="false" onclick="return false"><b>Middel</b><span>het hele verhaal</span></a>
<a href="#" data-tijd="l" role="button" aria-pressed="false" onclick="return false"><b>Lang</b><span>alles wat er is</span></a></div>
<div class="hervat" id="hervat"><div><span class="lbl stil">Je was hier gebleven</span><br><b></b></div><a class="knop klein" href="#">Lees verder</a></div>
</div></header>
<div class="filters"><div class="w"><div class="in">
<label class="sr" for="f-reeks">Reeks</label><select id="f-reeks" data-filter="reeks"><option value="">Alle reeksen</option>${opties(reeksOpt)}</select>
<label class="sr" for="f-plek">Plek</label><select id="f-plek" data-filter="plek"><option value="">Alle plekken</option>${opties(plekOpt)}</select>
<label class="sr" for="f-tijd">Tijd</label><select id="f-tijd" data-filter="tijd"><option value="">Alle tijden</option>${opties(perOpt)}</select>
<span class="sep" aria-hidden="true"></span><button type="button" id="wis">Wis</button>
</div></div></div>
<section class="blok"><div class="w">
<div class="raster r3" id="verhalen-lijst">${PUBLIEK.map((v) => kaart(v)).join('\n')}</div>
<p class="leeg" id="leeg" hidden>Hier staat nog niets. <button type="button" class="tekstlink" onclick="document.getElementById('wis').click()">Wis de filters</button></p>
<div id="bewaard" hidden style="margin-top:48px"><span class="lbl">Bewaard voor later</span><ul class="vragen" style="margin-top:8px"></ul></div>
</div></section>
${inschenkerBlok('verhalen')}`;
  return html({ titel: 'Verhalen · APÉRO Culture', omschrijving: 'Verhalen over het uur tussen werk en diner: steden, dranken, gebruiken en de mensen aan tafel. Kies kort, middel of lang.', pad: '/verhalen/', actief: '/verhalen/', body });
}

/* ---------------- voorpagina ---------------- */
function voorpagina() {
  const hoofd = OP_SLUG['athene-1814'];
  const nieuw = ['spanje-1974-en-nu', 'wie-betaalt', 'ombra'].map((s) => OP_SLUG[s]).filter(Boolean);
  const tweede = OP_SLUG['jenever-en-het-loon'];
  const steden = ['Porto', 'Madrid', 'Utrecht', 'Milaan', 'Athene', 'Beiroet'].map((n) => PLEKKEN.find((p) => p.naam === n));
  const telReeks = (id) => PUBLIEK.filter((v) => v.serie === id).length;
  const vragen = [
    ['Waarom wordt ouzo wit als je er water bij doet?', 'louche-effect'],
    ['Wie betaalt er aan een Griekse tafel?', 'wie-betaalt'],
    ['Waarom bestel je in Venetië een schaduw?', 'ombra'],
    ['Waarom kreeg een arbeider zijn loon in de kroeg?', 'jenever-en-het-loon'],
    ['Waarom drinken we iets bitters vóór het eten?', 'waarom-bitter']
  ].filter(([, s]) => OP_SLUG[s]);
  const dranken = [['ouzo', 'athene-1814'], ['vermut', 'spanje-1974-en-nu'], ['jenever', 'jenever-en-het-loon'], ['ombra', 'ombra'], ['atay', 'opening-zonder-alcohol'], ['Negroni', 'de-graaf-en-de-soda'], ['pastis', 'dranken-uit-een-verbod']];
  const body = `<section class="opening"><div class="w"><div class="grid">
<div>
<p class="klok" id="klok"><span class="punt" aria-hidden="true"></span><span>Het uur tussen werk en diner.</span></p>
<p class="wat">APÉRO is een magazine over het uur tussen werk en diner, van Porto tot Beiroet. In juni 2027 staat het op tafel in Utrecht. <a href="/verhaal.html">Over APÉRO</a></p>
<span class="lbl">${esc(hoofd.kicker)}</span>
<h1 class="kop-xl">${esc(hoofd.titel)}</h1>
<p class="stand">${esc(hoofd.ondertitel)}</p>
<div class="tijdkeuze" role="group" aria-label="Lees dit verhaal"><span class="tk-l">Hoeveel tijd heb je?</span>
<a href="${hoofd.url}?v=k"><b>Kort</b><span>${hoofd.mins.k} min</span></a>
<a href="${hoofd.url}?v=m"><b>Middel</b><span>${hoofd.mins.m} min</span></a>
<a href="${hoofd.url}?v=l"><b>Lang</b><span>${hoofd.mins.l} min</span></a></div>
</div>
<a href="${hoofd.url}?v=m" aria-label="Lees ${esc(hoofd.titel)}">${beeldHTML(hoofd, 'boog', 'eager')}</a>
</div></div></section>
<nav class="band" aria-label="Hoe laat het nu is"><div class="w"><div class="in">
${steden.map((p) => `<a href="/steden.html#stad-${slugify(p.naam)}" data-tz="${p.tz}"><b>${p.naam}</b><span class="t">--:--</span><span class="st"></span></a>`).join('')}
</div></div></nav>

<section class="blok"><div class="w">
<div class="bkop"><div><span class="lbl">Nieuw aan tafel</span><h2 class="kop-l">Andere tafels, andere regels</h2></div><a class="tekstlink" href="/verhalen/">Alle ${PUBLIEK.length} verhalen</a></div>
<div class="raster r3">${nieuw.map((v) => kaart(v)).join('')}</div>
</div></section>

<section class="blok"><div class="w">
<div class="bkop"><div><span class="lbl">Waar wil je beginnen?</span><h2 class="kop-l">Kies een deur</h2></div></div>
<div class="deuren">
<div class="deur rv"><h3>Een vraag</h3><p>Voor wie iets wil weten.</p><ul class="vragen">${vragen.map(([q, s]) => `<li><a href="${OP_SLUG[s].url}?v=k">${esc(q)}</a></li>`).join('')}</ul></div>
<div class="deur rv"><h3>Een stad</h3><p>Voor wie ergens heen wil.</p><div class="chips">${['Athene', 'Venetië', 'Madrid', 'Bilbao', 'Amsterdam', 'Marrakech', 'Milaan', 'Volos'].map((n) => `<a class="chip-l" href="/steden.html#stad-${slugify(n)}">${n}</a>`).join('')}</div></div>
<div class="deur rv"><h3>Een glas</h3><p>Voor wie weet wat hij drinkt, of juist niet.</p><div class="chips">${dranken.filter(([, s]) => OP_SLUG[s]).map(([n, s]) => `<a class="chip-l" href="${OP_SLUG[s].url}">${n}</a>`).join('')}</div></div>
<div class="deur rv"><h3>Een tijd</h3><p>Voor wie wil zien wat er veranderde.</p><div class="chips">${[['voor-1800', 'Vóór 1800'], ['1800-1950', 'De 19e eeuw'], ['1950-2000', '1974'], ['nu', 'Nu']].map(([p, n]) => `<a class="chip-l" href="/verhalen/?tijd=${p}">${n}</a>`).join('')}</div></div>
</div>
</div></section>

<section class="fragment"><div class="w-lees">
<blockquote>Om tien voor tien vraagt iemand of ze nog gaan eten. Niemand antwoordt meteen.</blockquote>
<p class="bron">Uit <a href="${hoofd.url}?v=k">${esc(hoofd.titel)}</a></p>
</div></section>

<section class="blok"><div class="w">
${kaart(tweede).replace('class="kaart rv"', 'class="kaart groot rv"').replace('<h3 class="kop-m">', '<h3 class="kop-l">')}
</div></section>

<section class="blok"><div class="w">
<div class="bkop"><div><span class="lbl">De zes werelden</span><h2 class="kop-l">Waar het begon</h2></div><a class="tekstlink" href="/verhalen/?reeks=werelden">De lange verhalen</a></div>
<div class="werelden">${WERELDEN.map(([u, img, n, zin]) => `<a class="wereld rv" href="${u}"><div class="boog"><img src="/${img}" alt="" loading="lazy" decoding="async"><div class="wash"></div></div><h3 class="kop-m">${n}</h3><p>${zin}</p></a>`).join('')}</div>
</div></section>

<section class="blok"><div class="w">
<div class="bkop"><div><span class="lbl">De reeksen</span><h2 class="kop-l">Terugkerende tafels</h2></div></div>
<div class="reeksen">${REEKSEN.filter((r) => telReeks(r.id)).map((r, i) => `<a class="reeks" href="/verhalen/?reeks=${r.id}"><span class="n">${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][i]}</span><div><h3>${esc(r.naam)}</h3><p>${esc(r.kort)}</p></div><span class="tel">${telReeks(r.id)}</span></a>`).join('')}</div>
</div></section>

${inschenkerBlok('voorpagina')}

<section class="blok"><div class="w"><div class="spoor">
<div class="datum rv">Juni<br><em>2027</em></div>
<div class="rv"><span class="lbl">Utrecht</span><h2 class="kop-l" style="margin:10px 0 14px">Wat je hier leest, komt dan op tafel.</h2>
<p class="lede">Een paar dagen lang wordt het uur tussen werk en diner een plek waar je naartoe kunt. Met de dranken, de borden en de gebruiken uit deze verhalen. Meer zeggen we nog niet.</p>
<p style="margin-top:22px"><a class="tekstlink" href="/festival.html">Wat we al wel weten</a></p></div>
</div></div></section>`;
  const ld = `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'APÉRO Culture', url: SITE, inLanguage: 'nl', description: 'Een magazine over het uur tussen werk en diner.' })}</script>`;
  return html({ titel: 'APÉRO Culture · het uur tussen werk en diner', omschrijving: 'Een magazine over het uur tussen werk en diner: Athene om kwart over zes, een Spaanse bar in 1974, wie er betaalt. In juni 2027 aan tafel in Utrecht.', pad: '/', beeld: hoofd.beeld, actief: '/', body, ld });
}

const WERELDEN = [
  ['/werelden/italie.html', 'assets/landen/italie.jpg', 'Italië', 'Het aperitivo als podium: je gaat erheen om gezien te worden.'],
  ['/werelden/frankrijk.html', 'assets/landen/frankrijk.jpg', 'Frankrijk', 'Het apéritif staat op de klok, en de pastis wordt troebel.'],
  ['/werelden/spanje.html', 'assets/landen/spanje.jpg', 'Spanje', 'De vermut van opa, terug van weggeweest.'],
  ['/werelden/anijsgordel.html', 'assets/landen/anijsgordel.jpg', 'De anijsgordel', 'Ouzo, rakı en arak. Er gaat water bij, en dan wacht je.'],
  ['/werelden/portugal.html', 'assets/landen/portugal.jpg', 'Portugal', 'Witte port met tonic, en een land dat zijn beste glas thuis hield.'],
  ['/werelden/marokko.html', 'assets/landen/marokko.jpg', 'Marokko', 'Zonder alcohol. De thee valt van dertig centimeter hoog.']
];

/* ---------------- steden ---------------- */
function steden() {
  const perStad = PLEKKEN.map((p) => ({ p, v: PUBLIEK.filter((v) => v.plekken.some((x) => (plekVan(x) || {}).naam === p.naam)) })).filter((x) => x.v.length);
  // projectie: eenvoudig equirectangulair op een vlak van 1000 x 560
  const lon0 = -16, lon1 = 42, lat0 = 29.5, lat1 = 54.5;
  // labelplaatsing per stad: [kant, verticale verschuiving]
  const LABEL = { Porto: ['r', 0], Marrakech: ['r', 0], Santander: ['l', -4], Madrid: ['l', 4], Bilbao: ['r', -20], Barcelona: ['r', 6], Marseille: ['l', 4], Amsterdam: ['r', -8], Utrecht: ['r', 14], Turijn: ['l', 0], Milaan: ['l', -14], 'Venetië': ['r', -6], Florence: ['r', 8], Rome: ['r', 6], Thessaloniki: ['r', -4], Volos: ['l', 2], Athene: ['l', 8], Lesbos: ['r', 4], Beiroet: ['l', 0] };
  const X = (lon) => ((lon - lon0) / (lon1 - lon0)) * 1000;
  const Y = (lat) => ((lat1 - lat) / (lat1 - lat0)) * 560;
  const punten = perStad.map(({ p, v }) => {
    const x = X(p.lon), y = Y(p.lat), r = 5 + Math.min(v.length, 6) * 1.6;
    const [kant, dy] = LABEL[p.naam] || ['r', 0]; const links = kant === 'l';
    return `<a href="#stad-${slugify(p.naam)}" aria-label="${p.naam}, ${v.length} ${v.length === 1 ? 'verhaal' : 'verhalen'}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="var(--terracotta)" fill-opacity=".85"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * .36).toFixed(1)}" fill="var(--panna)"/><text x="${(x + (links ? -r - 6 : r + 6)).toFixed(1)}" y="${(y + 5 + dy).toFixed(1)}" text-anchor="${links ? 'end' : 'start'}" font-family="Bodoni Moda, serif" font-weight="700" font-size="19" fill="var(--espresso)">${p.naam}</text></a>`;
  }).join('');
  const lengtes = [-5, 0, 5, 10, 15, 20, 25, 30, 35].map((l) => `<line x1="${X(l)}" y1="0" x2="${X(l)}" y2="560" stroke="var(--line)" stroke-dasharray="2 6"/>`).join('');
  const svg = `<svg viewBox="0 0 1000 560" role="img" aria-labelledby="kaart-titel kaart-uitleg"><title id="kaart-titel">Steden in APÉRO</title><desc id="kaart-uitleg">Elke stip is een stad waar een verhaal speelt. Hoe groter de stip, hoe meer verhalen.</desc>${lengtes}${punten}
<text x="16" y="546" font-family="Hanken Grotesk, sans-serif" font-size="13" fill="var(--ink-50)">West · het uur begint later</text><text x="984" y="546" text-anchor="end" font-family="Hanken Grotesk, sans-serif" font-size="13" fill="var(--ink-50)">Oost · daar zit men al</text></svg>`;
  const body = `<header class="pkop"><div class="w">
<span class="lbl">Steden</span><h1 class="kop-xl">Waar het uur zich afspeelt</h1>
<p class="lede">Het zes-uurmoment trekt elke avond van oost naar west over de kaart. In Beiroet zit men al als Porto nog aan het werk is. Kies een stad.</p>
</div></header>
<section class="blok" style="padding-top:20px"><div class="w">
<div class="kaartvlak">${svg}</div>
<div class="stad-lijst">${perStad.map(({ p, v }) => `<div class="stad" id="stad-${slugify(p.naam)}"><h3>${p.naam}<small>${p.land} · <span data-tz="${p.tz}"><span class="t"></span></span></small></h3><ul>${v.map((x) => `<li><a href="${x.url}?v=m">${esc(x.titel)}</a></li>`).join('')}</ul></div>`).join('')}</div>
</div></section>
${inschenkerBlok('steden')}`;
  return html({ titel: 'Steden · APÉRO Culture', omschrijving: 'Van Porto tot Beiroet: de steden waar de verhalen van APÉRO spelen.', pad: '/steden.html', actief: '/steden.html', body });
}

/* ---------------- lezen.html: oude adressen blijven werken ---------------- */
function lezenDoorverwijzing() {
  const kaart = [['achttien-uur-overal', 'italie-het-podium', 'waarom-bitter', 'mulsum', 'klein-woordenboek'], ['anijsgordel-lesbos-bekavallei', 'louche-effect', 'de-graaf-en-de-soda', 'wat-er-op-tafel-staat', 'opening-zonder-alcohol'], ['generatie-die-minder-drinkt', 'nederland-borrel', 'dranken-uit-een-verbod']];
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Verhalen · APÉRO Culture</title><meta name="robots" content="noindex"><link rel="canonical" href="${SITE}/verhalen/">
<script>(function(){var k=${JSON.stringify(kaart)};var p=new URLSearchParams(location.search);var e=parseInt(p.get('ed'),10),a=parseInt(p.get('art')||'0',10);var t=p.get('t');var s=(k[e]||[])[a];location.replace(s?'/verhalen/'+s+'.html'+(t?'?v='+t:''):'/verhalen/');})();</script>
</head><body><p><a href="/verhalen/">Naar de verhalen</a></p></body></html>
`;
}

/* ---------------- oudere pagina's: zelfde navigatie en voet ---------------- */
function vervangChrome(bestand, actief) {
  let s = lees(bestand);
  const heeftMarkers = s.includes('<!--nav-->');
  if (heeftMarkers) s = s.replace(/<!--nav-->[\s\S]*?<!--\/nav-->/, kop(actief));
  else s = s.replace(/<nav class="top">[\s\S]*?<\/nav>/, kop(actief));
  if (s.includes('<!--voet-->')) s = s.replace(/<!--voet-->[\s\S]*?<!--\/voet-->/, voet());
  else s = s.replace(/<footer[\s\S]*?<\/footer>/, voet());
  if (!s.includes('/css/apero.css')) s = s.replace('</head>', '<link rel="stylesheet" href="/apero-tokens.css"><link rel="stylesheet" href="/css/apero.css"><link rel="stylesheet" href="/css/oud.css"></head>');
  if (!s.includes('/js/apero.js')) s = s.replace('</body>', '<script src="/js/apero.js" defer></script></body>');
  // relatieve links in oudere pagina's naar de oude reader wijzen nu naar de verhalen
  s = s.replace(/href="(\.\.\/)?lezen\.html"/g, 'href="/verhalen/"');
  fs.writeFileSync(P(bestand), s);
}

/* ---------------- studio-data ---------------- */
function studioData() {
  const uit = VERHALEN.map((v) => ({
    id: 'v-' + v.slug, slug: v.slug, titel: v.titel, reeks: v.serie, status: v.status === 'gepubliceerd' ? 'gepubliceerd' : v.status === 'klaar' ? 'klaar' : v.status,
    datum: v.datum || '', plekken: v.plekken, dranken: v.dranken, tijd: v.tijd, themas: v.themas, intro: v.intro,
    versies: { k: !!v.kort, m: !!v.middel, l: !!v.lang }, minuten: v.mins, beeld: v.beeld || '',
    bronnen: v.bronnen.map((b) => ({ soort: b.soort, tekst: b.tekst.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)') })),
    festival: v.festival || '', verder: v.verder, url: v.url, bestand: `content/verhalen/${v.slug}.md`
  }));
  schrijf('studio/data/verhalen.json', JSON.stringify({ gegenereerd: new Date().toISOString(), reeksen: REEKSEN, verhalen: uit }, null, 1));
  // de strategiedocumenten meenemen naar de Bibliotheek
  const docs = fs.existsSync(P('docs/nieuw')) ? fs.readdirSync(P('docs/nieuw')).filter((f) => f.endsWith('.md')).sort() : [];
  const bundel = docs.map((f) => { const t = lees('docs/nieuw/' + f); return { bestand: f, titel: (t.match(/^# (.*)$/m) || [, f])[1], tekst: t }; });
  schrijf('studio/data/documenten.json', JSON.stringify(bundel));
  // contentbank, planning, plekken en beelden
  ['contentbank', 'planning', 'plekken'].forEach((n) => { if (fs.existsSync(P(`content/${n}.json`))) fs.copyFileSync(P(`content/${n}.json`), P(`studio/data/${n}.json`)); });
  const beelden = ['assets/landen', 'assets/fresco', 'assets/motion'].flatMap((d) => fs.readdirSync(P(d)).filter((f) => /\.(jpg|png)$/.test(f)).map((f) => `${d}/${f}`));
  const gebruik = (b) => VERHALEN.filter((v) => v.beeld === b).map((v) => v.titel);
  schrijf('studio/data/beelden.json', JSON.stringify(beelden.map((b) => ({ pad: b, gebruikt: gebruik(b) }))));
}

/* ---------------- bouwen ---------------- */
VERHALEN.forEach((v) => schrijf(`verhalen/${v.slug}.html`, artikel(v)));
schrijf('verhalen/index.html', verhalenIndex());
schrijf('index.html', voorpagina());
schrijf('steden.html', steden());
const ctx = { html, kop, voet, esc, aanmeldForm, inschenkerBlok, OP_SLUG, PUBLIEK, REEKSEN };
schrijf('festival.html', festivalPagina(ctx));
schrijf('verhaal.html', overPagina(ctx));
schrijf('inschenker.html', inschenkerPagina(ctx));
schrijf('lezen.html', lezenDoorverwijzing());
[['werelden/italie.html', '/verhalen/'], ['werelden/frankrijk.html', '/verhalen/'], ['werelden/spanje.html', '/verhalen/'], ['werelden/anijsgordel.html', '/verhalen/'], ['werelden/portugal.html', '/verhalen/'], ['werelden/marokko.html', '/verhalen/'], ['werelden/marokko-longread.html', '/verhalen/'],
  ['lexicon.html', '/lexicon.html'], ['faq.html', ''], ['partners.html', ''], ['podcast.html', ''], ['magazine/index.html', '/verhalen/'], ['magazine/editie-1.html', '/verhalen/'], ['magazine/editie-2.html', '/verhalen/']]
  .forEach(([b, a]) => { if (fs.existsSync(P(b))) vervangChrome(b, a); });
studioData();
console.log(`Gebouwd: ${VERHALEN.length} verhalen (${PUBLIEK.length} publiek), index, voorpagina, steden, festival, over, inschenker, studio-data.`);
