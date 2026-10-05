/* ============================================================
   Volgende Halte — aanmelding doorzetten naar de Google Sheet
   ------------------------------------------------------------
   De pagina post hierheen; deze functie stuurt het door naar de
   Google Apps Script web-app van de sheet "volgende halte
   aanmeldingen" (zie aanmeldingen-naar-sheet.gs) en meldt pas
   "gelukt" als het script bevestigt dat de rij is opgeslagen.

   Vercel → Project volgende-halte → Settings → Environment Variables:
     APPS_SCRIPT_URL   de /exec-URL van de web-app
   Zolang die ontbreekt antwoordt deze functie 503 en ziet de gast
   dat aanmelden nog niet actief is.
   ============================================================ */
const VELDEN = ['reist_mee', 'voornaam', 'achternaam', 'bedrijf', 'email', 'dieetwensen', 'opmerking', 'kaartnummer', 'bron', '_gotcha'];

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const url = process.env.APPS_SCRIPT_URL;
  if (!url) { res.status(503).json({ error: 'Aanmelden is nog niet geactiveerd' }); return; }

  let body = req.body || {};
  if (typeof body === 'string') body = Object.fromEntries(new URLSearchParams(body));

  if (body._gotcha) { res.status(200).json({ ok: true }); return; } // spam-bot
  if (!body.voornaam || !body.achternaam || !body.bedrijf || !/^\S+@\S+\.\S+$/.test(body.email || '')) {
    res.status(400).json({ error: 'Niet alle verplichte velden zijn ingevuld' });
    return;
  }

  const uit = new URLSearchParams();
  for (const k of VELDEN) uit.set(k, String(body[k] || '').slice(0, 1000));

  try {
    const r = await fetch(url, { method: 'POST', body: uit, redirect: 'follow' });
    const tekst = await r.text();
    let json = null;
    try { json = JSON.parse(tekst); } catch (e) {}
    if (!r.ok || !json || !json.ok) throw new Error('Script antwoordde ' + r.status);
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Aanmelding niet opgeslagen:', e.message);
    res.status(502).json({ error: 'Opslaan mislukt' });
  }
}
