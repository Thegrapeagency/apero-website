#!/usr/bin/env node
/**
 * Genereert app/content.js uit de canonieke sitepagina's.
 * Bron blijft de site zelf: lezen.html (magazine), werelden/*.html (longreads),
 * lexicon.html (termen), tools/aperokiezer-kort.js (compacte Aperokiezer-quiz;
 * de sitepagina app.html is sinds aug 2026 de uitgebreide 32-vragen kieser).
 * Draaien na elke contentwijziging:  node tools/build-app-content.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const lees = (p) => readFileSync(join(ROOT, p), 'utf8');

/* ---------- magazine: DATA uit lezen.html ---------- */
const lezen = lees('lezen.html');
const magMatch = lezen.match(/const DATA = (\{[\s\S]*?\});\n/);
if (!magMatch) throw new Error('DATA niet gevonden in lezen.html');
const edities = JSON.parse(magMatch[1]).edities;

/* ---------- werelden: longreads ---------- */
const WERELD_BESTANDEN = ['italie', 'frankrijk', 'spanje', 'anijsgordel', 'portugal', 'marokko'];
const werelden = WERELD_BESTANDEN.map((slug) => {
  const html = lees(`werelden/${slug}.html`);
  const kicker = (html.match(/<div class="kicker">([\s\S]*?)<\/div>/) || [])[1] || '';
  const delen = kicker.split('&middot;').map((s) => s.trim());
  const h1 = (html.match(/<h1>([\s\S]*?)<\/h1>/) || [])[1] || '';
  const standfirst = (html.match(/<p class="standfirst">([\s\S]*?)<\/p>/) || [])[1] || '';
  const foto = html.match(/<div class="artfoto">[\s\S]*?<img src="\.\.\/([^"]+)"[^>]*>[\s\S]*?<span class="cap">([\s\S]*?)<\/span>/);
  let prose = (html.match(/<article class="prose"><div class="narrow">([\s\S]*?)<\/div><\/article>/) || [])[1] || '';
  if (!prose) throw new Error(`prose niet gevonden in werelden/${slug}.html`);
  // bronnen en next-link eruit; die horen bij de sitepagina
  prose = prose.split(/<h3>Bronnen/)[0];
  prose = prose.replace(/<div class="next-link">[\s\S]*?<\/div>/g, '');
  // paden appvriendelijk maken (app leeft op /app/)
  prose = prose.replace(/(src|href)="\.\.\//g, '$1="../');
  const naam = delen[1] || slug;
  return {
    slug,
    nummer: delen[0] || '',            // "Wereld I"
    naam,                              // "Italië, het podium"
    statement: h1.trim(),              // de statement-kop
    standfirst: standfirst.trim(),
    hero: foto ? { u: foto[1], c: foto[2].trim() } : null,
    html: prose.trim(),
  };
});

/* ---------- lexicon ---------- */
const lex = lees('lexicon.html');
const groepen = [];
const groepRe = /<section class="lexgroup" id="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g;
let g;
while ((g = groepRe.exec(lex))) {
  const [, id, inhoud] = g;
  const num = (inhoud.match(/class="num">([^<]*)</) || [])[1] || '';
  const titel = (inhoud.match(/<h2>([\s\S]*?)<\/h2>/) || [])[1] || '';
  const intro = (inhoud.match(/class="gintro"[^>]*>([\s\S]*?)<\/(?:p|div)>/) || [])[1] || '';
  const entries = [];
  const entRe = /<article class="entry" data-term="([^"]+)">([\s\S]*?)<\/article>/g;
  let e;
  while ((e = entRe.exec(inhoud))) {
    const [, zoek, binnen] = e;
    entries.push({
      zoek,
      term: (binnen.match(/<h3 class="term">([\s\S]*?)<\/h3>/) || [])[1] || '',
      origin: (binnen.match(/<span class="origin">([\s\S]*?)<\/span>/) || [])[1] || '',
      body: binnen.replace(/<div>[\s\S]*?<\/div>/, '').trim(),
    });
  }
  groepen.push({ id, num: num.trim(), titel: titel.trim(), intro: intro.trim(), entries });
}
if (!groepen.length) throw new Error('geen lexgroepen gevonden in lexicon.html');

/* ---------- quiz: Aperokiezer uit app.html ---------- */
const kiezer = lees('tools/aperokiezer-kort.js');
const wSrc = (kiezer.match(/const W = (\{[\s\S]*?\});\nconst Q/) || [])[1];
const qSrc = (kiezer.match(/const Q = (\[[\s\S]*?\]);\nlet scores/) || [])[1];
if (!wSrc || !qSrc) throw new Error('quizdata niet gevonden in tools/aperokiezer-kort.js');
const W = new Function(`return ${wSrc}`)();
const Q = new Function(`return ${qSrc}`)();
const quiz = {
  vragen: Q,
  werelden: Object.fromEntries(Object.entries(W).map(([k, v]) => [k, { n: v.n, d: v.d, wereld: WERELD_BESTANDEN.indexOf(k) }])),
};

/* ---------- schrijven ---------- */
const uit = `// GEGENEREERD BESTAND, niet met de hand bewerken.
// Bron: lezen.html + werelden/*.html + lexicon.html + tools/aperokiezer-kort.js
// Opnieuw genereren: node tools/build-app-content.mjs
const DATA = ${JSON.stringify({ edities })};
const WERELDEN = ${JSON.stringify(werelden)};
const LEXICON = ${JSON.stringify({ groepen })};
const QUIZ = ${JSON.stringify(quiz)};
`;
writeFileSync(join(ROOT, 'app/content.js'), uit);
console.log(
  `content.js geschreven: ${edities.length} edities (${edities.reduce((s, e) => s + e.arts.length, 0)} artikelen), ` +
  `${werelden.length} werelden, ${groepen.reduce((s, x) => s + x.entries.length, 0)} lexicontermen, ${quiz.vragen.length} quizvragen`
);
