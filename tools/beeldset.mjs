/* Beeldset voor de voorpagina met het Gemini-beeldmodel, met bestaande fresco's als stijlvoorbeeld.
   Gebruik:  GEMINI_API_KEY=… node tools/beeldset.mjs [onderwerp …] [--ronde=N]
   Schrijft twee varianten per onderwerp naar beeldtest/ (niet in git); de gekozen beelden gaan
   daarna als JPEG naar assets/beeld/ (home-*.jpg, tijd-*.jpg). */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!KEY) { console.error('Zet GEMINI_API_KEY in de omgeving.'); process.exit(1); }
const API = 'https://generativelanguage.googleapis.com/v1beta';
const UIT = 'beeldtest';
const VARIANTEN = 2;
mkdirSync(UIT, { recursive: true });

const STIJL = 'Painted as a faded classical fresco on plaster, warm palette of ochre, terracotta, cream and sage, visible brushwork and slight wear, no text, no lettering.';
const ONDERWERPEN = {
  'home-toen': ['3:4', 'Romans reclining at a low table before a banquet, a cup of mulsum (wine with honey), eggs, olives and shellfish on terracotta plates, warm late afternoon light, Pompeian wall painting.'],
  'home-nu': ['3:4', 'A contemporary European café terrace at golden hour, a mixed group of friends in modern clothes around a small marble table, a spritz, a glass of ouzo clouding with water, an alcohol-free bitter with tonic, small plates of olives and bread, bicycles and parasols.'],
  'tijd-mulsum': ['1:1', 'Roman hands holding a ceramic cup of honeyed wine, honeycomb and olives on a bronze dish.'],
  'tijd-vermout': ['1:1', 'An 18th-century Turin apothecary shop, glass jars of herbs and wormwood, a man mixing fortified wine, an amber glass on the counter.'],
  'tijd-jenever': ['1:1', 'An old Amsterdam tasting room (proeflokaal), dark wooden bar, a tulip-shaped glass filled to the very brim with jenever, a man in 19th-century clothes leaning over the bar to sip from the glass without lifting it, candlelight.'],
  'tijd-negroni': ['1:1', 'A Florentine bar in 1919, an elegant count at the counter, a short glass of deep red Negroni with an orange slice.'],
  'tijd-vermut': ['1:1', 'A Spanish bar in 1974, vermouth from the tap in small glasses, dominoes on a marble counter, men at the bar, a television above the bottles.'],
  'tijd-jij': ['1:1', 'A single glass on a small café table on a sunny terrace, an empty chair pulled out as an invitation, a contemporary city in the background.']
};
const REFS = ['assets/motion/fresco-proost-poster.jpg', 'assets/fresco/fresco-10.jpg', 'assets/fresco/fresco-02.jpg'];

const args = process.argv.slice(2);
const ronde = Number((args.find((a) => a.startsWith('--ronde=')) || '--ronde=1').split('=')[1]);
const gekozen = args.filter((a) => !a.startsWith('--'));
const lijst = Object.entries(ONDERWERPEN).filter(([naam]) => !gekozen.length || gekozen.includes(naam));

async function post(pad, body) {
  const r = await fetch(`${API}/${pad}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(`${r.status} ${JSON.stringify(j.error || j).slice(0, 300)}`);
  return j;
}

async function model() {
  if (process.env.GEMINI_BEELD_MODEL) return process.env.GEMINI_BEELD_MODEL;
  const r = await fetch(`${API}/models?pageSize=200`, { headers: { 'x-goog-api-key': KEY } });
  const namen = ((await r.json()).models || []).map((m) => m.name.replace('models/', ''));
  const kies = (re) => namen.filter((n) => re.test(n)).sort().pop();
  return kies(/^gemini-[\d.]+-(flash|pro)-image(-preview)?$/) || kies(/image/);
}

const m = await model();
console.log('Model:', m, '— ronde', ronde);
const refs = REFS.map((f) => ({ inline_data: { mime_type: 'image/jpeg', data: readFileSync(f).toString('base64') } }));

async function variant(naam, ar, tekst, nr) {
  const parts = [...refs, { text: `Use the attached images only as a style reference (palette, fresco texture, brushwork), not for content. Create a new image, aspect ratio ${ar}: ${tekst} ${STIJL}` }];
  for (let poging = 1; poging <= 3; poging++) {
    try {
      const j = await post(`models/${m}:generateContent`, { contents: [{ parts }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: ar } } });
      const beeld = (j.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData || p.inline_data);
      if (!beeld) throw new Error('geen beeld in antwoord');
      writeFileSync(`${UIT}/${naam}-r${ronde}-${nr}.png`, Buffer.from((beeld.inlineData || beeld.inline_data).data, 'base64'));
      return console.log('ok', naam, nr);
    } catch (e) { console.log('fout', naam, nr, `(poging ${poging})`, e.message); }
  }
}

await Promise.all(lijst.flatMap(([naam, [ar, tekst]]) => Array.from({ length: VARIANTEN }, (_, i) => variant(naam, ar, tekst, i + 1))));
