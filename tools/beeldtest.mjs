/* Proef: beelden voor de voorpagina met Google (Imagen en Gemini-beeld), om te vergelijken met Midjourney.
   Gebruik:  GEMINI_API_KEY=… node tools/beeldtest.mjs
   Schrijft naar beeldtest/ (niet in git, niet gepubliceerd). Twee varianten per onderwerp:
   - imagen: alleen tekst
   - gemini: tekst + bestaande fresco's als stijlvoorbeeld (zoals --sref in Midjourney) */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!KEY) { console.error('Zet GEMINI_API_KEY in de omgeving.'); process.exit(1); }
const API = 'https://generativelanguage.googleapis.com/v1beta';
const UIT = 'beeldtest';
mkdirSync(UIT, { recursive: true });

const STIJL = 'Painted as a faded classical fresco on plaster, warm palette of ochre, terracotta, cream and sage, visible brushwork and slight wear, no text, no lettering.';
const ONDERWERPEN = {
  nu: ['3:4', 'A contemporary European café terrace at golden hour, a mixed group of friends in modern clothes around a small marble table, a spritz, a glass of ouzo clouding with water, an alcohol-free bitter with tonic, small plates of olives and bread, bicycles and parasols.'],
  toen: ['3:4', 'Romans reclining at a low table before a banquet, a cup of mulsum (wine with honey), eggs, olives and shellfish on terracotta plates, warm late afternoon light, Pompeian wall painting.'],
  jenever: ['1:1', 'An old Amsterdam tasting room (proeflokaal), dark wooden bar, a tulip-shaped glass filled to the very brim with jenever, a man in 19th-century clothes leaning over the bar to sip from the glass without lifting it, candlelight.']
};
const REFS = ['assets/motion/fresco-proost-poster.jpg', 'assets/fresco/fresco-10.jpg'];

async function post(pad, body) {
  const r = await fetch(`${API}/${pad}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(`${r.status} ${JSON.stringify(j.error || j).slice(0, 300)}`);
  return j;
}

async function modellen() {
  const r = await fetch(`${API}/models?pageSize=200`, { headers: { 'x-goog-api-key': KEY } });
  const namen = ((await r.json()).models || []).map((m) => m.name.replace('models/', ''));
  const kies = (re) => namen.filter((n) => re.test(n)).sort().pop();
  return {
    imagen: process.env.IMAGEN_MODEL || kies(/^imagen-[\d.]+-(ultra-)?generate-\d+$/) || kies(/^imagen/),
    gemini: process.env.GEMINI_BEELD_MODEL || kies(/^gemini-[\d.]+-(flash|pro)-image(-preview)?$/) || kies(/image/)
  };
}

const m = await modellen();
console.log('Modellen:', m);
for (const [naam, [ar, tekst]] of Object.entries(ONDERWERPEN)) {
  if (m.imagen) {
    try {
      const j = await post(`models/${m.imagen}:predict`, { instances: [{ prompt: `${tekst} ${STIJL}` }], parameters: { sampleCount: 2, aspectRatio: ar } });
      (j.predictions || []).forEach((p, i) => writeFileSync(`${UIT}/${naam}-imagen-${i + 1}.png`, Buffer.from(p.bytesBase64Encoded, 'base64')));
      console.log('ok', naam, 'imagen', (j.predictions || []).length);
    } catch (e) { console.log('fout', naam, 'imagen', e.message); }
  }
  if (m.gemini) {
    try {
      const parts = [
        ...REFS.map((f) => ({ inline_data: { mime_type: 'image/jpeg', data: readFileSync(f).toString('base64') } })),
        { text: `Use the attached images only as a style reference (palette, fresco texture, brushwork), not for content. Create a new image, aspect ratio ${ar}: ${tekst} ${STIJL}` }
      ];
      const j = await post(`models/${m.gemini}:generateContent`, { contents: [{ parts }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: ar } } });
      const beelden = (j.candidates?.[0]?.content?.parts || []).filter((p) => p.inlineData || p.inline_data);
      beelden.forEach((p, i) => writeFileSync(`${UIT}/${naam}-gemini-${i + 1}.png`, Buffer.from((p.inlineData || p.inline_data).data, 'base64')));
      console.log('ok', naam, 'gemini', beelden.length);
    } catch (e) { console.log('fout', naam, 'gemini', e.message); }
  }
}
