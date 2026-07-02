/* ============================================================
   APÉRO — Instagram-publicatie (voorbereid, UIT tot koppeling)
   ------------------------------------------------------------
   STATUS: klaar voor gebruik zodra het Instagram-account als
   Business-account aan een Meta-app hangt. Publiceren gaat dan
   via de Instagram Graph API (container aanmaken -> publiceren).

   Aanzetten:
   1. Instagram-account omzetten naar Professioneel (Business).
   2. Koppelen aan een Facebook-pagina + Meta Business Suite.
   3. Meta-app maken (developers.facebook.com) met
      instagram_content_publish permissie.
   4. Long-lived access token genereren en in Vercel zetten:
        META_IG_TOKEN     (long-lived token)
        META_IG_USER_ID   (Instagram Business user-id, cijfers)
   5. In de Studio (Instagram-module) verschijnt de koppeling
      dan automatisch als actief.

   Het Studio-dashboard stuurt: { imageUrl, caption }
   imageUrl moet publiek bereikbaar zijn (bv. een asset-URL op
   www.apero-culture.com). De middleware beschermt dit endpoint:
   alleen de redactie komt hier binnen.
   ============================================================ */
const GRAPH = 'https://graph.facebook.com/v21.0';

export default async function handler(req, res) {
  const { META_IG_TOKEN, META_IG_USER_ID } = process.env;

  if (req.method === 'GET') {
    // statusprobe voor de Studio
    res.status(200).json({ actief: !!(META_IG_TOKEN && META_IG_USER_ID) });
    return;
  }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  if (!META_IG_TOKEN || !META_IG_USER_ID) {
    res.status(503).json({ error: 'Instagram nog niet gekoppeld. Volg de stappen in api/instagram-publish.mjs (Meta-app + token) en zet META_IG_TOKEN en META_IG_USER_ID in Vercel.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const { imageUrl, caption } = body || {};
  if (!imageUrl || !caption) { res.status(400).json({ error: 'imageUrl en caption zijn verplicht' }); return; }

  try {
    // stap 1: media-container aanmaken
    const c = await fetch(`${GRAPH}/${META_IG_USER_ID}/media`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, caption, access_token: META_IG_TOKEN })
    });
    const cj = await c.json();
    if (!cj.id) { res.status(502).json({ error: 'Container mislukt', detail: cj }); return; }

    // stap 2: publiceren
    const p = await fetch(`${GRAPH}/${META_IG_USER_ID}/media_publish`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ creation_id: cj.id, access_token: META_IG_TOKEN })
    });
    const pj = await p.json();
    if (!pj.id) { res.status(502).json({ error: 'Publiceren mislukt', detail: pj }); return; }

    res.status(200).json({ ok: true, postId: pj.id });
  } catch (e) {
    res.status(500).json({ error: 'Instagram API-fout', detail: String(e) });
  }
}
