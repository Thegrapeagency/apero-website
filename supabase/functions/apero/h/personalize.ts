// /functions/v1/apero/personalize  (publiek; eigen tokens)
// GET  ?ticket=<uuid>&tkt=<32hex>  -> één ticket voor de vriend-view + invulvelden
// POST {action:'forward', order, token, ticket_id, friend_email}
//        koper (order_token) stuurt een ticket naar een vriend en mailt de link
// POST {action:'personalize', ticket_id, ticket_token, holder_name, holder_email, fields}
//        vriend (ticket_token) vult naam/e-mail/geboortedatum/woonplaats in
import { config, corsHeaders, json, safeEqual, sb, mailLayout, sendMail } from '../shared.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TKT_RE = /^[0-9a-f]{32}$/i
const ORDER_TOKEN_RE = /^[0-9a-f]{48}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default async function handler(req: Request): Promise<Response>  {
  const cfg = await config()
  const cors = corsHeaders(req, cfg)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const id = url.searchParams.get('ticket') ?? ''
    const tkt = url.searchParams.get('tkt') ?? ''
    if (!UUID_RE.test(id) || !TKT_RE.test(tkt)) return json(404, { error: 'not_found' }, cors)
    const { data: tk } = await sb.from('apero_tickets')
      .select('id, ticket_token, code, status, valid_days, holder_name, holder_email, personalized, custom_data, ticket_type_id, ticket_types:apero_ticket_types(name_nl,name_en), orders:apero_orders(buyer_name, status)')
      .eq('id', id).maybeSingle()
    const ord = tk?.orders as { buyer_name?: string; status?: string } | null
    if (!tk || !safeEqual(tk.ticket_token, tkt)) return json(404, { error: 'not_found' }, cors)
    if (ord?.status !== 'paid' && ord?.status !== 'refunded') return json(404, { error: 'not_found' }, cors)
    const tt = tk.ticket_types as { name_nl?: string; name_en?: string } | null
    const { data: fields } = await sb.from('apero_form_fields')
      .select('key,label_nl,label_en,type,options,required,sort')
      .eq('active', true).eq('scope', 'order').order('sort')
    return json(200, {
      ticket: {
        code: tk.status === 'void' ? null : tk.code,
        status: tk.status,
        valid_days: tk.valid_days,
        holder_name: tk.holder_name,
        holder_email: tk.holder_email,
        personalized: tk.personalized,
        custom_data: tk.custom_data ?? {},
        name_nl: tt?.name_nl ?? tk.ticket_type_id,
        name_en: tt?.name_en ?? tk.ticket_type_id,
        from_name: ord?.buyer_name ?? '',
      },
      fields: fields ?? [],
      event: {
        name: cfg.EVENT_NAME ?? 'APÉRO Festival',
        edition: cfg.EVENT_EDITION ?? '',
      },
      ticket_design: {
        accent: cfg.TICKET_ACCENT ?? '#9b3737',
        ink: cfg.TICKET_INK ?? '#010341',
        bg: cfg.TICKET_BG ?? '#ffffff',
        note_nl: cfg.TICKET_NOTE_NL ?? '',
        note_en: cfg.TICKET_NOTE_EN ?? '',
      },
    }, cors)
  }

  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, cors)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json(400, { error: 'bad_json' }, cors) }
  const ip = (req.headers.get('x-forwarded-for') ?? '0.0.0.0').split(',')[0].trim()

  // --- Koper stuurt een ticket naar een vriend ---
  if (body.action === 'forward') {
    const orderId = String(body.order ?? '')
    const token = String(body.token ?? '')
    const ticketId = String(body.ticket_id ?? '')
    const email = String(body.friend_email ?? '').trim().toLowerCase()
    if (!UUID_RE.test(orderId) || !ORDER_TOKEN_RE.test(token) || !UUID_RE.test(ticketId)) return json(404, { error: 'not_found' }, cors)
    if (!EMAIL_RE.test(email) || email.length > 254) return json(400, { error: 'bad_email' }, cors)
    const { data: okRate } = await sb.rpc('apero_rate_check', { p_bucket: 'forward', p_ip: ip, p_limit: 30, p_window: '10 minutes' })
    if (!okRate) return json(429, { error: 'rate_limited' }, cors)
    const { data: order } = await sb.from('apero_orders').select('id, order_token, locale, buyer_name').eq('id', orderId).maybeSingle()
    if (!order || !safeEqual(order.order_token, token)) return json(404, { error: 'not_found' }, cors)
    const { data: tk } = await sb.from('apero_tickets').select('id, ticket_token, status').eq('id', ticketId).eq('order_id', orderId).maybeSingle()
    if (!tk) return json(404, { error: 'not_found' }, cors)
    if (tk.status === 'void') return json(409, { error: 'void' }, cors)
    await sb.from('apero_tickets').update({ holder_email: email }).eq('id', ticketId)
    await sendForwardEmail(email, order.buyer_name ?? '', ticketId, tk.ticket_token, order.locale ?? 'nl', cfg)
    return json(200, { ok: true }, cors)
  }

  // --- Vriend personaliseert het ticket ---
  if (body.action === 'personalize') {
    const ticketId = String(body.ticket_id ?? '')
    const tkt = String(body.ticket_token ?? '')
    if (!UUID_RE.test(ticketId) || !TKT_RE.test(tkt)) return json(404, { error: 'not_found' }, cors)
    const { data: okRate } = await sb.rpc('apero_rate_check', { p_bucket: 'personalize', p_ip: ip, p_limit: 30, p_window: '10 minutes' })
    if (!okRate) return json(429, { error: 'rate_limited' }, cors)
    const { data: tk } = await sb.from('apero_tickets').select('id, ticket_token, status, custom_data').eq('id', ticketId).maybeSingle()
    if (!tk || !safeEqual(tk.ticket_token, tkt)) return json(404, { error: 'not_found' }, cors)
    if (tk.status === 'void') return json(409, { error: 'void' }, cors)
    const name = String(body.holder_name ?? '').trim()
    const email = String(body.holder_email ?? '').trim().toLowerCase()
    if (name.length < 2 || name.length > 100) return json(400, { error: 'bad_name' }, cors)
    if (!EMAIL_RE.test(email) || email.length > 254) return json(400, { error: 'bad_email' }, cors)
    const { data: fields } = await sb.from('apero_form_fields').select('key,required').eq('active', true).eq('scope', 'order')
    const inFields = (body.fields ?? {}) as Record<string, unknown>
    const clean: Record<string, unknown> = {}
    for (const f of fields ?? []) {
      const v = String(inFields[f.key] ?? '').trim()
      if (f.required && v === '') return json(400, { error: 'missing_field', field: f.key }, cors)
      if (v !== '') clean[f.key] = v
    }
    const merged = { ...(tk.custom_data as Record<string, unknown> ?? {}), ...clean }
    await sb.from('apero_tickets').update({ holder_name: name, holder_email: email, custom_data: merged, personalized: true }).eq('id', ticketId)
    return json(200, { ok: true }, cors)
  }

  return json(400, { error: 'bad_action' }, cors)
}

async function sendForwardEmail(toEmail: string, fromName: string, ticketId: string, ticketToken: string, locale: string, cfg: Record<string, string>) {
  if (!cfg.RESEND_API_KEY) return
  const nl = locale !== 'en'
  const link = `${cfg.SITE_BASE_URL}/tickets.html?ticket=${ticketId}&tkt=${ticketToken}`
  const who = esc(fromName || (nl ? 'Iemand' : 'Someone'))
  const subject = nl
    ? `${fromName || 'Iemand'} stuurde je een ticket voor APÉRO Festival`
    : `${fromName || 'Someone'} sent you a ticket for APÉRO Festival`
  const html = mailLayout({
    kicker: 'APÉRO Festival',
    title: nl ? 'Er staat een ticket voor je klaar.' : 'A ticket is waiting for you.',
    paragraphs: [nl
      ? `${who} heeft een ticket voor je klaargezet. Vul je naam en mailadres in, dan staat de QR-code op jouw naam.`
      : `${who} set aside a ticket for you. Fill in your name and email and the QR code is yours.`],
    cta: { href: link, label: nl ? 'Maak het ticket van jou' : 'Make it yours' },
    foot: `<a href="mailto:${cfg.REPLY_TO ?? 'hallo@apero-culture.nl'}" style="color:#C45F38;">${cfg.REPLY_TO ?? 'hallo@apero-culture.nl'}</a>`,
  })
  try {
    await sendMail(cfg, toEmail, subject, html)
  } catch (e) { console.error('forward email failed', e) }
}

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
