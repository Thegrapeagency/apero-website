/* ============================================================
   APÉRO Culture — optionele 1-klik-opslag (Vercel serverless)
   ------------------------------------------------------------
   STATUS: voorbereid maar UIT. Het dashboard werkt volledig zonder
   deze laag (export content.json -> committen = canonieke opslag).
   Zet hem aan zodra er een GitHub-repo + token bestaat:

   1. Repo aan GitHub hangen (Vercel git-integratie of los).
   2. In Vercel project-settings deze env-vars zetten:
        GITHUB_TOKEN   (fine-grained PAT met 'contents: write' op de repo)
        GITHUB_REPO    (bv. "thegrapeagency/apero-website")
        GITHUB_BRANCH  (bv. "main")
        CONTENT_PATH   (bv. "data/content.json")
        SAVE_SECRET    (gedeeld geheim; het dashboard stuurt dit mee)
   3. In dashboard/index.html: SAVE_API_ENABLED = true.

   Het commit content.json rechtstreeks via de GitHub Contents API,
   zodat "Opslaan naar repo" één klik wordt. Tot die tijd 503.
   ============================================================ */
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH = 'main', CONTENT_PATH = 'dashboard/data/content.json', SAVE_SECRET } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    res.status(503).json({ error: 'Opslag-API niet geconfigureerd. Gebruik "Exporteer content.json" en commit handmatig.' });
    return;
  }

  // gedeeld geheim controleren (voorkomt dat willekeurige bezoekers committen)
  if (SAVE_SECRET && req.headers['x-apero-secret'] !== SAVE_SECRET) {
    res.status(401).json({ error: 'Niet geautoriseerd' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { res.status(400).json({ error: 'Ongeldige JSON' }); return; } }
  const content = JSON.stringify(body, null, 2) + '\n';
  const b64 = Buffer.from(content, 'utf8').toString('base64');
  const api = `https://api.github.com/repos/${GITHUB_REPO}/contents/${CONTENT_PATH}`;
  const gh = (extra = {}) => fetch(api + (extra.qs || ''), {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'apero-dashboard' },
    ...extra.init
  });

  try {
    // huidige sha ophalen (nodig om te updaten)
    let sha;
    const cur = await gh({ qs: `?ref=${GITHUB_BRANCH}` });
    if (cur.ok) { const j = await cur.json(); sha = j.sha; }

    const put = await gh({ init: {
      method: 'PUT',
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'apero-dashboard', 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'content: update via dashboard', content: b64, branch: GITHUB_BRANCH, sha })
    }});
    if (!put.ok) { const t = await put.text(); res.status(502).json({ error: 'GitHub weigerde de commit', detail: t }); return; }
    const out = await put.json();
    res.status(200).json({ ok: true, commit: out.commit && out.commit.sha });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
