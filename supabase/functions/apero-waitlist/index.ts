// /functions/v1/apero-waitlist/<actie>
//   POST /join    (publiek)        -> iemand op de wachtlijst van een tickettype zetten
//   GET  /admin   (x-admin-key)    -> vraagmeter per tickettype + recente aanmeldingen
//   POST /notify  (x-admin-key)    -> de wachtlijst van een tickettype mailen (handmatig)
import { config, corsHeaders, json, safeEqual, sb, waitlistHtml } from './shared.ts'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

Deno.serve(async (req: Request) => {
  const cfg = await config()
  const cors = corsHeaders(req, cfg)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

  const url = new URL(req.url)
  const action = url.pathname.split('/').filter(Boolean).pop() ?? ''

  try {
    if (req.method === 'POST' && action === 'join') return await join(req, cors)

    // admin-acties achter de beheerssleutel
    if (action === 'admin' || action === 'notify') {
      const key = req.headers.get('x-admin-key') ?? ''
      const validKeys = [cfg.ADMIN_KEY, cfg.ADMIN_KEY_FRANK].filter(Boolean) as string[]
      if (!validKeys.some((k) => safeEqual(key, k))) return json(401, { error: 'unauthorized' }, cors)
      if (req.method === 'GET' && action === 'admin') return await adminList(cors)
      if (req.method === 'POST' && action === 'notify') return await notify(req, cfg, cors)
    }

    return json(404, { error: 'unknown_action', action }, cors)
  } catch (e) {
    console.error('waitlist failed', action, e)
    return json(500, { error: 'internal' }, cors)
  }
})

async function join(req: Request, cors: Record<string, string>): Promise<Response> {
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const typeId = String(body.type_id ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const name = String(body.name ?? '').trim().slice(0, 120)
  let qty = Math.round(Number(body.qty ?? 1))
  if (!Number.isFinite(qty) || qty < 1) qty = 1
  if (qty > 50) qty = 50
  const locale = body.locale === 'en' ? 'en' : 'nl'

  if (!typeId || !EMAIL_RE.test(email)) return json(400, { error: 'bad_input' }, cors)

  const { data: type } = await sb.from('apero_ticket_types').select('id').eq('id', typeId).maybeSingle()
  if (!type) return json(404, { error: 'unknown_type' }, cors)

  // Zelfde mailadres + type: bijwerken (aantal/naam), geen dubbele rij.
  const { error } = await sb.from('apero_waitlist')
    .upsert({ ticket_type_id: typeId, email, name: name || null, qty, locale, source: 'shop' }, {
      onConflict: 'ticket_type_id, lower(email)' as unknown as string,
    })
  if (error) {
    // Fallback wanneer onConflict-expressie niet pakt: handmatig update-or-insert.
    const { data: existing } = await sb.from('apero_waitlist')
      .select('id').eq('ticket_type_id', typeId).ilike('email', email).maybeSingle()
    if (existing) await sb.from('apero_waitlist').update({ name: name || null, qty, locale }).eq('id', existing.id)
    else await sb.from('apero_waitlist').insert({ ticket_type_id: typeId, email, name: name || null, qty, locale, source: 'shop' })
  }
  return json(200, { ok: true }, cors)
}

async function adminList(cors: Record<string, string>): Promise<Response> {
  const { data: summary } = await sb.rpc('apero_admin_waitlist')
  const { data: entries } = await sb.from('apero_waitlist')
    .select('id, ticket_type_id, email, name, qty, locale, created_at, notified_at, converted_at')
    .order('created_at', { ascending: false }).limit(500)
  return json(200, { summary: summary ?? [], entries: entries ?? [] }, cors)
}

async function notify(req: Request, cfg: Record<string, string>, cors: Record<string, string>): Promise<Response> {
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const typeId = String(body.type_id ?? '').trim()
  if (!typeId) return json(400, { error: 'no_type' }, cors)
  if (!cfg.RESEND_API_KEY) return json(400, { error: 'no_mailer' }, cors)

  const onlyWaiting = body.only_waiting !== false // standaard: alleen wie nog niet gemaild is
  const forceLang = body.lang === 'nl' ? 'nl' : body.lang === 'en' ? 'en' : ''
  const subject = String(body.subject ?? '').trim() || 'Er is plek vrij bij APÉRO Festival'
  const headlineNl = String(body.headline ?? '').trim() || 'Er is een plek vrijgekomen'
  const bodyNl = String(body.body ?? '').trim() ||
    'Je stond op de wachtlijst, en er is plek vrijgekomen. Wie het eerst boekt, heeft hem.'

  let q = sb.from('apero_waitlist').select('id, email, name, locale').eq('ticket_type_id', typeId)
  if (onlyWaiting) q = q.is('notified_at', null)
  const { data: rows } = await q
  const shopUrl = `${cfg.SITE_BASE_URL ?? 'https://www.apero-culture.com'}/tickets.html`

  let sent = 0
  for (const r of rows ?? []) {
    const nl = (forceLang || r.locale) !== 'en'
    const name = (r.name || '').trim() || (nl ? 'daar' : 'there')
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + cfg.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: cfg.EMAIL_FROM ?? 'APÉRO Festival <tickets@send.nachtvandewijn.nl>',
          to: [r.email], reply_to: cfg.REPLY_TO ?? 'hallo@apero-culture.nl',
          subject,
          html: waitlistHtml(name, headlineNl, bodyNl, shopUrl, nl),
        }),
      })
      if (res.ok) {
        await sb.from('apero_waitlist').update({ notified_at: new Date().toISOString() }).eq('id', r.id)
        sent++
      }
    } catch (e) {
      console.error('waitlist notify failed', r.id, e)
    }
  }
  return json(200, { ok: true, sent, total: (rows ?? []).length }, cors)
}
