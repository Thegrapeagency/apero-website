/* ============================================================
   APÉRO Culture — Publiceren vanaf het dashboard (Vercel function)
   ------------------------------------------------------------
   Eén klik "Publiceer" in het dashboard:
   1. rendert het content-item tot een on-brand artikelpagina
      (zelfde opbouw als de bestaande site: nav, article-hero,
      prose/narrow, footer, styles.css, site.js);
   2. commit de pagina + de bijgewerkte content.json in één commit
      via de GitHub Git Data API (atomair);
   3. Vercel deployt automatisch -> de pagina staat live.

   Beveiliging: deze route zit achter de basic-auth uit middleware.js
   (matcher '/api/:path*'), dus alleen de ingelogde redactie kan
   publiceren. Het token blijft server-side.

   Benodigde env-vars (Vercel → Settings → Environment Variables):
     GITHUB_TOKEN   fine-grained PAT met 'Contents: read and write' op de repo
     GITHUB_REPO    standaard "Thegrapeagency/apero-website"
     GITHUB_BRANCH  standaard "main"
     CONTENT_PATH   standaard "dashboard/data/content.json"
   Zonder GITHUB_TOKEN antwoordt de route met 503 + uitleg.
   ============================================================ */

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const {
    GITHUB_TOKEN,
    GITHUB_REPO = 'Thegrapeagency/apero-website',
    GITHUB_BRANCH = 'main',
    CONTENT_PATH = 'dashboard/data/content.json'
  } = process.env;

  if (!GITHUB_TOKEN) {
    res.status(503).json({ error: 'Publiceren is nog niet geconfigureerd: zet GITHUB_TOKEN in Vercel. Tot dan: gebruik "Exporteer content.json" en commit handmatig.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { res.status(400).json({ error: 'Ongeldige JSON' }); return; } }
  const content = body && body.content;
  const itemId = body && body.itemId;
  if (!content || !Array.isArray(content.items) || !itemId) { res.status(400).json({ error: 'content + itemId vereist' }); return; }

  const item = content.items.find(function (i) { return i.id === itemId; });
  if (!item) { res.status(400).json({ error: 'Item niet gevonden' }); return; }

  // status + slug + live-url server-side autoritair zetten
  const today = new Date().toISOString().slice(0, 10);
  if (!item.slug) item.slug = deriveSlug(item);
  const slugPath = item.slug.replace(/^\//, '');
  item.status = 'live';
  if (!item.publishDate) item.publishDate = today;
  item.liveUrl = 'https://www.apero-culture.com/' + slugPath;
  item.updatedAt = new Date().toISOString();

  const pageHtml = renderArticle(item);
  const contentJson = JSON.stringify(content, null, 2) + '\n';

  try {
    const sha = await commitFiles(GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH, [
      { path: slugPath, content: pageHtml },
      { path: CONTENT_PATH, content: contentJson }
    ], 'publiceer: ' + item.titel);
    res.status(200).json({ ok: true, slug: item.slug, liveUrl: item.liveUrl, publishDate: item.publishDate, commit: sha });
  } catch (e) {
    res.status(502).json({ error: 'GitHub-commit faalde', detail: String(e && e.message || e) });
  }
}

/* ---- één atomaire commit met meerdere bestanden (Git Data API) ---- */
async function commitFiles(token, repo, branch, files, message) {
  const api = 'https://api.github.com/repos/' + repo;
  const h = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'User-Agent': 'apero-publish', 'Content-Type': 'application/json' };
  const j = async function (r) { if (!r.ok) throw new Error(r.status + ' ' + (await r.text())); return r.json(); };

  const ref = await j(await fetch(api + '/git/ref/heads/' + branch, { headers: h }));
  const baseSha = ref.object.sha;
  const baseCommit = await j(await fetch(api + '/git/commits/' + baseSha, { headers: h }));
  const baseTree = baseCommit.tree.sha;

  const tree = [];
  for (const f of files) {
    const blob = await j(await fetch(api + '/git/blobs', { method: 'POST', headers: h, body: JSON.stringify({ content: f.content, encoding: 'utf-8' }) }));
    tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const newTree = await j(await fetch(api + '/git/trees', { method: 'POST', headers: h, body: JSON.stringify({ base_tree: baseTree, tree: tree }) }));
  const commit = await j(await fetch(api + '/git/commits', { method: 'POST', headers: h, body: JSON.stringify({ message: message, tree: newTree.sha, parents: [baseSha] }) }));
  await j(await fetch(api + '/git/refs/heads/' + branch, { method: 'PATCH', headers: h, body: JSON.stringify({ sha: commit.sha }) }));
  return commit.sha;
}

/* ---- slug afleiden als er nog geen is ---- */
function deriveSlug(item) {
  const dir = item.type === 'recept' ? 'recepten'
    : (item.type === 'longread' || item.type === 'landingsfeit') ? 'werelden'
    : item.type === 'verdieping' ? 'verdieping'
    : 'blog';
  return dir + '/' + slugify(item.titel) + '.html';
}
function slugify(s) {
  return String(s || 'artikel').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['"]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'artikel';
}

/* ---- mini-markdown -> HTML ---- */
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function inlineMd(s) {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2">$1</a>');
}
function mdToHtml(md) {
  const lines = String(md || '').split('\n');
  let html = '', inList = false;
  for (const ln of lines) {
    if (/^\s*[-*]\s+/.test(ln)) { if (!inList) { html += '<ul>'; inList = true; } html += '<li>' + inlineMd(ln.replace(/^\s*[-*]\s+/, '')) + '</li>'; continue; }
    if (inList) { html += '</ul>'; inList = false; }
    if (/^#{1,3}\s+/.test(ln)) { const lvl = ln.match(/^#+/)[0].length; html += '<h' + lvl + '>' + inlineMd(ln.replace(/^#+\s+/, '')) + '</h' + lvl + '>'; }
    else if (ln.trim() === '') { /* lege regel */ }
    else { html += '<p>' + inlineMd(ln) + '</p>'; }
  }
  if (inList) html += '</ul>';
  return html;
}

/* ---- thema -> accent-token + sectie-info uit de slug ---- */
const THEMA_ACCENT = {
  italie: '--terracotta', nederland: '--espresso', spanje: '--burro', frankrijk: '--mattone',
  anijsgordel: '--salvia', portugal: '--mattone', maghreb: '--burro', algemeen: '--terracotta'
};
const TYPE_KICKER = {
  longread: 'Longread', blog: 'Blog', landingsfeit: 'Landenpagina', recept: 'Recept',
  verdieping: 'Verdieping', 'social-carrousel': 'Carrousel', reel: 'Reel', nieuwsbrief: 'Nieuwsbrief', podcast: 'Podcast'
};
function sectionOf(slugPath) {
  const dir = (slugPath.split('/')[0] || '').toLowerCase();
  if (dir === 'blog') return { naam: 'Blog', crumb: 'index.html', back: 'index.html', backLabel: 'Alle blogs' };
  if (dir === 'werelden') return { naam: 'De werelden', crumb: '../index.html#werelden', back: '../index.html#werelden', backLabel: 'De zes werelden' };
  if (dir === 'recepten') return { naam: 'Recepten', crumb: '../index.html', back: '../index.html', backLabel: 'Terug naar APÉRO' };
  return { naam: 'Artikel', crumb: '../index.html', back: '../index.html', backLabel: 'Terug naar APÉRO' };
}

/* ---- het artikel-template (mirror van de bestaande site) ---- */
export function renderArticle(item) {
  const slugPath = item.slug.replace(/^\//, '');
  const sec = sectionOf(slugPath);
  const accent = THEMA_ACCENT[item.thema] || '--terracotta';
  const kicker = TYPE_KICKER[item.type] || 'Artikel';
  const sub = item.ondertitel ? '<p class="article-sub" style="font-family:var(--disp);font-style:italic;font-size:clamp(20px,3vw,30px);color:var(--mattone);margin:10px 0 0">' + esc(item.ondertitel) + '</p>' : '';
  const desc = esc(item.samenvatting || item.titel);
  const bodyHtml = mdToHtml(item.body);
  const bron = item.bron ? '<p class="bron" style="font-family:var(--body);font-size:13px;color:var(--ink-50);margin-top:18px">Bron: ' + esc(item.bron) + '</p>' : '';

  return '<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">'
    + '<title>' + esc(item.titel) + ' &middot; APÉRO ' + sec.naam + '</title><meta name="description" content="' + desc + '">'
    + '<link rel="manifest" href="../manifest.json"><meta name="theme-color" content="#F4EAD6">'
    + '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    + '<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet">'
    + '<link rel="stylesheet" href="../styles.css"><style>:root{--accent:var(' + accent + ')}</style></head><body>'
    + '<nav class="top"><div class="in"><a class="lk" href="../index.html">AP&Eacute;R<span class="flower"></span><span class="cul">CULTURE</span></a>'
    + '<div class="links"><a href="../verhaal.html">Het verhaal</a><a href="../index.html#werelden">De werelden</a><a href="../lezen.html">Magazine</a><a href="../blog/index.html">Blog</a><a href="../lexicon.html">Lexicon</a><a href="../festival.html">Festival</a></div></div></nav>'
    + '<header class="article-hero"><div class="petals" style="--c:22vmin;--a:var(' + accent + ');--b:var(--burro)"></div><div class="grain"></div><div class="veil"></div>'
    + '<div class="wrap inner"><div class="crumbs"><a href="../index.html">AP&Eacute;RO</a> / <a href="' + sec.crumb + '">' + sec.naam + '</a></div>'
    + '<div class="kicker">' + esc(kicker) + '</div><h1>' + esc(item.titel) + '</h1>' + sub + '</div></header>'
    + '<article class="prose"><div class="narrow">' + bodyHtml + '<hr />' + bron
    + '<div class="next-link"><a href="' + sec.back + '">&larr; ' + esc(sec.backLabel) + '</a></div></div></article>'
    + '<footer><div class="petals" style="position:absolute;inset:0;--c:120px;opacity:.4"></div><div class="veil"></div><div class="grain"></div><div class="wrap"><div class="fcols">'
    + '<div style="max-width:280px"><div class="fbrand">AP&Eacute;R<span class="flower"></span></div><p style="font-family:var(--body);font-size:14px;color:var(--ink-70);margin-top:10px">Een onderzoek naar de aperocultuur. aperire, openen. Open de avond.</p></div>'
    + '<div><h4>Ontdek</h4><a href="../verhaal.html">Het verhaal</a><a href="../index.html#werelden">De zes werelden</a><a href="../lezen.html">Magazine-app</a><a href="../blog/index.html">Blog</a><a href="../lexicon.html">Lexicon</a></div>'
    + '<div><h4>Festival</h4><a href="../festival.html">Het festival</a><a href="../app.html">De Aperokiezer</a><a href="../partners.html">Partners</a><a href="../faq.html">Veelgestelde vragen</a></div>'
    + '<div><h4>Contact</h4><a href="mailto:hallo@apero-culture.nl">hallo@apero-culture.nl</a><a href="../partners.html">Word partner</a></div></div>'
    + '<div class="fnote">AP&Eacute;RO Culture &middot; een onderzoek naar de aperocultuur &middot; Utrecht &middot; MMXXVII &middot; een initiatief van The Grape Agency</div></div></footer>'
    + '<script src="../site.js"></script></body></html>';
}
