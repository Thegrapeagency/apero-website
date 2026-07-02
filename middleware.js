/* ============================================================
   APÉRO Culture — toegangsbescherming (Vercel Edge Middleware)
   ------------------------------------------------------------
   Twee rollen, allebei via HTTP basic-auth, niets hardcoded
   (deze repo is publiek):

   REDACTIE (volledige toegang: /dashboard, /api, /partner)
     DASH_USER   (bv. "redactie")
     DASH_PASS   (een sterk wachtwoord)

   PARTNERS (alleen /partner en /api/partner-data)
     PARTNER_AUTH   lijst "gebruiker:wachtwoord" gescheiden door ;
                    bv. "mirabeau:x7...;barbayanni:q2..."
                    De gebruikersnaam moet gelijk zijn aan de
                    partner-slug in dashboard/data/partners.json.

   Zet ze in Vercel: Project → Settings → Environment Variables.
   Zolang er niets gezet is, blijft alles dicht (veilige default).
   De rest van de site (incl. /tools) blijft publiek.
   ============================================================ */
export const config = { matcher: ['/dashboard/:path*', '/api/:path*', '/partner/:path*'] };

function parseBasic(header) {
  if (!header || !header.startsWith('Basic ')) return null;
  let decoded = '';
  try { decoded = atob(header.slice(6)); } catch (e) { return null; }
  const i = decoded.indexOf(':');
  if (i < 0) return null;
  return { user: decoded.slice(0, i), pass: decoded.slice(i + 1) };
}

function partnerLijst() {
  const raw = process.env.PARTNER_AUTH || '';
  const uit = {};
  raw.split(';').forEach((paar) => {
    const i = paar.indexOf(':');
    if (i > 0) uit[paar.slice(0, i).trim()] = paar.slice(i + 1);
  });
  return uit;
}

export default function middleware(request) {
  const USER = process.env.DASH_USER;
  const PASS = process.env.DASH_PASS;
  const url = new URL(request.url);
  const pad = url.pathname;

  const isPartnerZone = pad.startsWith('/partner') || pad.startsWith('/api/partner-data');

  if (!USER || !PASS) {
    return new Response('Nog niet geconfigureerd (zet DASH_USER en DASH_PASS in Vercel).', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8' }
    });
  }

  const cred = parseBasic(request.headers.get('authorization') || '');
  if (cred) {
    // redactie mag overal
    if (cred.user === USER && cred.pass === PASS) return;
    // partner mag alleen in de partnerzone
    if (isPartnerZone) {
      const partners = partnerLijst();
      if (partners[cred.user] && partners[cred.user] === cred.pass) return;
    }
  }

  const realm = isPartnerZone ? 'APERO partnerportaal' : 'APERO redactie';
  const tekst = isPartnerZone
    ? 'Het partnerportaal van APÉRO. Log in met je partnernaam en wachtwoord.'
    : 'Toegang voor de APÉRO-redactie. Log in om verder te gaan.';
  return new Response(tekst, {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${realm}", charset="UTF-8"`,
      'content-type': 'text/plain; charset=utf-8'
    }
  });
}
