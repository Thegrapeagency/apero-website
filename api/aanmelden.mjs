/* ============================================================
   POST /api/aanmelden  ·  aanmelding voor De Inschenker
   ------------------------------------------------------------
   Er is (nog) geen nieuwsbriefdienst gekoppeld. Kies er één en zet
   de bijbehorende variabelen in Vercel. Zonder variabelen draait het
   formulier in testmodus: het antwoordt eerlijk dat er niets is opgeslagen.

   Brevo (aanbevolen, EU, dubbele opt-in):
     BREVO_API_KEY, BREVO_LIST_ID, BREVO_DOI_TEMPLATE_ID, BREVO_REDIRECT_URL
   Of een eigen webhook (Make, Zapier, Mailchimp-relay…):
     AANMELD_WEBHOOK   (ontvangt JSON {email, bron, tijd})
   ============================================================ */
const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, fout: 'Alleen POST.' }); }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  const email = String(body.email || '').trim().toLowerCase().slice(0, 254);
  const bron = String(body.bron || '').slice(0, 120);
  if (body.website) return res.status(200).json({ ok: true }); // honeypot: bots krijgen een vriendelijk ja
  if (!MAIL.test(email)) return res.status(400).json({ ok: false, fout: 'Dat lijkt nog geen mailadres.' });

  const { BREVO_API_KEY, BREVO_LIST_ID, BREVO_DOI_TEMPLATE_ID, BREVO_REDIRECT_URL, AANMELD_WEBHOOK } = process.env;
  try {
    if (BREVO_API_KEY && BREVO_LIST_ID && BREVO_DOI_TEMPLATE_ID) {
      const r = await fetch('https://api.brevo.com/v3/contacts/doubleOptinConfirmation', {
        method: 'POST',
        headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ email, includeListIds: [Number(BREVO_LIST_ID)], templateId: Number(BREVO_DOI_TEMPLATE_ID), redirectionUrl: BREVO_REDIRECT_URL || 'https://www.apero-culture.nl/inschenker.html?bevestigd=1', attributes: { BRON: bron } })
      });
      if (!r.ok && r.status !== 204) throw new Error('brevo ' + r.status);
      return res.status(200).json({ ok: true });
    }
    if (AANMELD_WEBHOOK) {
      const r = await fetch(AANMELD_WEBHOOK, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, bron, tijd: new Date().toISOString() }) });
      if (!r.ok) throw new Error('webhook ' + r.status);
      return res.status(200).json({ ok: true });
    }
    return res.status(200).json({ ok: true, testmodus: true });
  } catch (e) {
    console.error('aanmelden mislukt', e.message);
    return res.status(502).json({ ok: false, fout: 'Het inschrijven lukte even niet. Probeer het later nog eens, of mail hallo@apero-culture.nl.' });
  }
}
