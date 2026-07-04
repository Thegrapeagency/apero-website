/* ============================================================
   APÉRO — partnerdata voor het portaal (/partner)
   ------------------------------------------------------------
   De Edge-middleware laat hier alleen geldige logins door
   (redactie of partner). Deze functie kijkt WIE er ingelogd is
   via de meegezonden Authorization-header en geeft alleen de
   data van die partner terug. De redactie krijgt alles.
   ============================================================ */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const data = require('../dashboard/data/partners.json');

function parseBasic(header) {
  if (!header || !header.startsWith('Basic ')) return null;
  let decoded = '';
  try { decoded = Buffer.from(header.slice(6), 'base64').toString('utf8'); } catch (e) { return null; }
  const i = decoded.indexOf(':');
  if (i < 0) return null;
  return { user: decoded.slice(0, i), pass: decoded.slice(i + 1) };
}

export default function handler(req, res) {
  const cred = parseBasic(req.headers.authorization || '');
  if (!cred) { res.status(401).json({ error: 'Niet ingelogd' }); return; }

  const isRedactie = cred.user === process.env.DASH_USER && cred.pass === process.env.DASH_PASS;
  if (isRedactie) { res.status(200).json({ rol: 'redactie', ...data }); return; }

  // partner: alleen het eigen record (middleware heeft het wachtwoord al gecontroleerd)
  const partner = (data.partners || []).find((p) => p.slug === cred.user);
  if (!partner) { res.status(404).json({ error: 'Partner niet gevonden. Vraag de redactie je login na te kijken.' }); return; }
  const alleSlots = [].concat(data.wereldSlots || [], data.bierSlots || [], data.foodSlots || []);
  const slot = alleSlots.find((s) => s.partner === partner.slug) || null;
  res.status(200).json({ rol: 'partner', partner, slot });
}
