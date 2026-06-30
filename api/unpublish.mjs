/* ============================================================
   APÉRO Culture — Depubliceren vanaf het dashboard (Vercel function)
   ------------------------------------------------------------
   Eén klik "Depubliceer": verwijdert de live artikelpagina van de
   site en zet de status van het item terug naar 'klaar', in één
   atomaire commit (pagina weg + content.json bijgewerkt). Vercel
   deployt automatisch, de pagina is daarna offline.

   Zelfde beveiliging + env-vars als /api/publish (basic-auth +
   GITHUB_TOKEN). Zonder token: 503 met uitleg.
   ============================================================ */

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const {
    GITHUB_TOKEN,
    GITHUB_REPO = 'Thegrapeagency/apero-website',
    GITHUB_BRANCH = 'main',
    CONTENT_PATH = 'dashboard/data/content.json'
  } = process.env;

  if (!GITHUB_TOKEN) { res.status(503).json({ error: 'Depubliceren is nog niet geconfigureerd: zet GITHUB_TOKEN in Vercel.' }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { res.status(400).json({ error: 'Ongeldige JSON' }); return; } }
  const content = body && body.content;
  const itemId = body && body.itemId;
  if (!content || !Array.isArray(content.items) || !itemId) { res.status(400).json({ error: 'content + itemId vereist' }); return; }

  const item = content.items.find(function (i) { return i.id === itemId; });
  if (!item) { res.status(400).json({ error: 'Item niet gevonden' }); return; }

  const slugPath = item.slug ? item.slug.replace(/^\//, '') : null;
  item.status = 'klaar';
  item.updatedAt = new Date().toISOString();

  const contentJson = JSON.stringify(content, null, 2) + '\n';

  try {
    const sha = await commitChanges(GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH, {
      puts: [{ path: CONTENT_PATH, content: contentJson }],
      deletes: slugPath ? [slugPath] : []
    }, 'depubliceer: ' + item.titel);
    res.status(200).json({ ok: true, status: 'klaar', removed: slugPath, commit: sha });
  } catch (e) {
    res.status(502).json({ error: 'GitHub-commit faalde', detail: String(e && e.message || e) });
  }
}

/* één atomaire commit met toevoegingen (puts) en verwijderingen (deletes) */
async function commitChanges(token, repo, branch, changes, message) {
  const api = 'https://api.github.com/repos/' + repo;
  const h = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'User-Agent': 'apero-publish', 'Content-Type': 'application/json' };
  const j = async function (r) { if (!r.ok) throw new Error(r.status + ' ' + (await r.text())); return r.json(); };

  const ref = await j(await fetch(api + '/git/ref/heads/' + branch, { headers: h }));
  const baseSha = ref.object.sha;
  const baseCommit = await j(await fetch(api + '/git/commits/' + baseSha, { headers: h }));
  const baseTree = baseCommit.tree.sha;

  const tree = [];
  for (const f of (changes.puts || [])) {
    const blob = await j(await fetch(api + '/git/blobs', { method: 'POST', headers: h, body: JSON.stringify({ content: f.content, encoding: 'utf-8' }) }));
    tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  for (const path of (changes.deletes || [])) {
    // alleen verwijderen als het bestand bestaat (anders weigert GitHub de tree)
    const exists = await fetch(api + '/contents/' + path + '?ref=' + branch, { headers: h });
    if (exists.ok) tree.push({ path: path, mode: '100644', type: 'blob', sha: null });
  }
  if (!tree.length) throw new Error('niets te committen');

  const newTree = await j(await fetch(api + '/git/trees', { method: 'POST', headers: h, body: JSON.stringify({ base_tree: baseTree, tree: tree }) }));
  const commit = await j(await fetch(api + '/git/commits', { method: 'POST', headers: h, body: JSON.stringify({ message: message, tree: newTree.sha, parents: [baseSha] }) }));
  await j(await fetch(api + '/git/refs/heads/' + branch, { method: 'PATCH', headers: h, body: JSON.stringify({ sha: commit.sha }) }));
  return commit.sha;
}
