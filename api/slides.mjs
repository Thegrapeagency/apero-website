/* ============================================================
   APÉRO Culture — AI-slidegenerator (Vercel function)
   ------------------------------------------------------------
   Neemt een lap tekst en destilleert die met Claude tot een
   on-brand carousel: een array van slides volgens het slide-model
   van de generator (cover / verhaal / citaat / beeld / lijst / slot).

   De API-key blijft server-side. De route zit achter dezelfde
   basic-auth als het dashboard (middleware matcher '/api/:path*'),
   dus alleen de ingelogde redactie kan genereren (kostenbeheersing).

   Env-var (Vercel → Settings → Environment Variables):
     ANTHROPIC_API_KEY   je Anthropic API-key (begint met sk-ant-)
   Zonder key antwoordt de route met 503 + uitleg.
   ============================================================ */

export const config = { maxDuration: 60 };

const MODEL = 'claude-opus-4-8';

const SYSTEM = [
  'Je bent de redactionele slide-maker van APÉRO Culture, een mediamerk over de aperitief-cultuur van Europa.',
  'Je krijgt een lap tekst en destilleert die tot een heldere Instagram-carousel: een reeks slides die samen één verhaal vertellen.',
  '',
  'STEM & HARDE REGELS (streng naleven):',
  '- Schrijf in het Nederlands, "je"-vorm, nooit "u".',
  '- Edgy met een professionele basis: zelfverzekerd, nieuwsgierig, een tikje brutaal, nooit klef.',
  '- GEEN lange streepjes (— of –). Gebruik komma, punt of ronde haken.',
  '- Schrijf het merk als APÉRO (met accent), nooit "APERO".',
  '- Nooit het woord "proeverij". Geen sommelier-jargon. Het glas komt ná het verhaal.',
  '- Geen reclame-clichés: "ontdek", "duik in", "unieke ervaring", "feest voor de zintuigen", "iconisch", "niet voor niets".',
  '- Eén idee per slide. Concreet boven abstract. Begin verhaal-slides vaak met een plaats of jaartal.',
  '',
  'SLIDE-TYPES (gebruik precies deze) en hun velden:',
  '- cover: { kicker (korte eyebrow), titel (de haak, max ~6 woorden), achtergrond ("creme" of "fresco") }',
  '- verhaal: { kop (kort, vaak plaats + jaar), body (één feit/alinea, 1 tot 3 zinnen) }',
  '- citaat: { quote (een oneliner), bron (optioneel), vlak ("terracotta" | "salvia" | "espresso" | "fresco") }',
  '- lijst: { kop, items (3 tot 5 korte regels) }',
  '- beeld: { onderschrift (kort) }',
  '- slot: { payoff (korte italic afsluiter, bv. "Open de avond."), handle (bv. "apero-culture.nl" of "@apero.festival") }',
  '',
  'OPBOUW:',
  '- De EERSTE slide is altijd type "cover" (de haak op basis van de kern van de tekst).',
  '- De LAATSTE slide is altijd type "slot" (payoff + handle).',
  '- De slides ertussen: kies per slide het type dat het beste past bij dat stuk van de tekst (verhaal voor feiten, citaat voor een sterke oneliner uit de tekst, lijst voor opsommingen). Wissel af.',
  '- Houd tekst kort en leesbaar op een 1080-canvas: titels kort, body beknopt.',
  '- Verzin geen feiten die niet in de tekst staan; je herschrijft en verdicht, je fabriceert niet.',
  'Geef exact het gevraagde aantal slides terug.'
].join('\n');

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['slides'],
  properties: {
    slides: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type'],
        properties: {
          type: { type: 'string', enum: ['cover', 'verhaal', 'citaat', 'beeld', 'lijst', 'slot'] },
          kicker: { type: 'string' },
          titel: { type: 'string' },
          kop: { type: 'string' },
          body: { type: 'string' },
          quote: { type: 'string' },
          bron: { type: 'string' },
          items: { type: 'array', items: { type: 'string' } },
          onderschrift: { type: 'string' },
          payoff: { type: 'string' },
          handle: { type: 'string' },
          vlak: { type: 'string', enum: ['terracotta', 'salvia', 'espresso', 'fresco'] },
          achtergrond: { type: 'string', enum: ['creme', 'fresco'] }
        }
      }
    }
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { res.status(503).json({ error: 'AI is nog niet geconfigureerd: zet ANTHROPIC_API_KEY in Vercel.' }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { res.status(400).json({ error: 'Ongeldige JSON' }); return; } }
  let text = (body && body.text || '').toString().trim();
  const count = Math.min(10, Math.max(3, parseInt(body && body.count, 10) || 5));
  const thema = (body && body.thema || '').toString().slice(0, 40);
  if (text.length < 40) { res.status(400).json({ error: 'Te weinig tekst om te destilleren.' }); return; }
  if (text.length > 12000) text = text.slice(0, 12000);

  const userMsg = 'Maak hier een carousel van precies ' + count + ' slides van'
    + (thema ? (' (thema/wereld: ' + thema + ')') : '') + '.\n\nTEKST:\n"""\n' + text + '\n"""';

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM,
        messages: [{ role: 'user', content: userMsg }],
        output_config: { format: { type: 'json_schema', schema: SCHEMA } }
      })
    });
    if (!r.ok) { const t = await r.text(); res.status(502).json({ error: 'Anthropic weigerde het verzoek', detail: t.slice(0, 400) }); return; }
    const data = await r.json();
    if (data.stop_reason === 'refusal') { res.status(422).json({ error: 'De AI weigerde deze tekst.' }); return; }

    const textBlock = (data.content || []).find(function (b) { return b.type === 'text'; });
    if (!textBlock) { res.status(502).json({ error: 'Geen bruikbaar antwoord van de AI.' }); return; }
    let parsed;
    try { parsed = JSON.parse(textBlock.text); } catch (e) { res.status(502).json({ error: 'AI-antwoord was geen geldige JSON.' }); return; }

    const slides = Array.isArray(parsed.slides) ? parsed.slides.slice(0, 10) : [];
    if (!slides.length) { res.status(502).json({ error: 'De AI gaf geen slides terug.' }); return; }
    res.status(200).json({ slides: slides, usage: data.usage || null });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
}
