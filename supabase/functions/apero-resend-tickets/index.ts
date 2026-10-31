// POST /functions/v1/apero-resend-tickets  (publiek)
// Zelfbediening "tickets kwijt": stuurt tickets opnieuw, ALLEEN naar het
// geregistreerde adres. Respons is altijd neutraal zodat je niet kunt aftasten
// welke adressen klant zijn. Per adres max 1 herstuur per uur; IP-rate-limit
// en honeypot zoals de checkout.
import { config, corsHeaders, json, sb, trySendTicketEmail } from './shared.ts'

Deno.serve(async (req: Request) => {
  const cfg = await config()
  const cors = corsHeaders(req, cfg)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, cors)

  let body: { email?: string; website?: string }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'bad_json' }, cors)
  }

  // Honeypot: bots krijgen hetzelfde neutrale antwoord
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return json(200, { ok: true }, cors)
  }

  const email = String(body.email ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
    return json(400, { error: 'bad_email' }, cors)
  }

  const ip = (req.headers.get('x-forwarded-for') ?? '0.0.0.0').split(',')[0].trim()
  const { data: ipOk, error: rateErr } = await sb.rpc('apero_rate_check', {
    p_bucket: 'resend_tickets', p_ip: ip, p_limit: 5, p_window: '10 minutes',
  })
  if (rateErr) {
    console.error('rate_check failed', rateErr)
    return json(500, { error: 'internal' }, cors)
  }
  if (!ipOk) return json(429, { error: 'rate_limited' }, cors)

  // Cooldown per adres: insert+count semantiek van rate_check geeft max 1 mail per uur.
  // Bij overschrijding sturen we niets maar blijft de respons neutraal.
  const { data: emailOk } = await sb.rpc('apero_rate_check', {
    p_bucket: 'resend_email:' + email, p_ip: ip, p_limit: 1, p_window: '1 hour',
  })

  if (emailOk) {
    const { data: orders } = await sb.from('apero_orders')
      .select('*')
      .eq('buyer_email', email)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(3)
    for (const order of orders ?? []) {
      await trySendTicketEmail(order, cfg)
    }
  }

  // Altijd hetzelfde antwoord: bestaat het adres niet, dan merkt de aanvrager dat niet
  return json(200, { ok: true }, cors)
})
