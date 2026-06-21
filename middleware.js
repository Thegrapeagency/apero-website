/* ============================================================
   APÉRO Culture — toegangsbescherming (Vercel Edge Middleware)
   ------------------------------------------------------------
   Het redactie-dashboard (/dashboard, incl. /dashboard/data/content.json)
   en de opslag-API (/api) zitten achter HTTP basic-auth. De rest van de
   site (incl. de publieke carousel-generator op /tools) blijft open.

   Inloggegevens komen uit env-vars (NIET hardcoded; deze repo is publiek):
     DASH_USER   (bv. "redactie")
     DASH_PASS   (een sterk wachtwoord)
   Zet ze in Vercel: Project → Settings → Environment Variables.
   Zolang ze niet gezet zijn, is /dashboard volledig dicht (veilige default).
   ============================================================ */
export const config = { matcher: ['/dashboard/:path*', '/api/:path*'] };

export default function middleware(request) {
  const USER = process.env.DASH_USER;
  const PASS = process.env.DASH_PASS;

  // Veilige default: niets geconfigureerd -> niets toegankelijk.
  if (!USER || !PASS) {
    return new Response('Dashboard nog niet geconfigureerd (zet DASH_USER en DASH_PASS in Vercel).', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8' }
    });
  }

  const header = request.headers.get('authorization') || '';
  if (header.startsWith('Basic ')) {
    let decoded = '';
    try { decoded = atob(header.slice(6)); } catch (e) { decoded = ''; }
    const i = decoded.indexOf(':');
    const u = decoded.slice(0, i);
    const p = decoded.slice(i + 1);
    if (u === USER && p === PASS) {
      return; // toegestaan: laat de request door
    }
  }

  return new Response('Toegang voor de APÉRO-redactie. Log in om verder te gaan.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="APERO redactie", charset="UTF-8"',
      'content-type': 'text/plain; charset=utf-8'
    }
  });
}
