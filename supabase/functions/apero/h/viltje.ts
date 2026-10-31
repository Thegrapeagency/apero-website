// POST /functions/v1/apero/viltje  (publiek)
// Het viltjesspel van Nacht van de Wijn. Wie het woord raadt, krijgt een
// gratis ticket voor een dag naar keuze. Het woord staat alleen hier.
//   { action: 'check', woord }                       -> { ok }
//   { action: 'claim', woord, naam, email, dag }     -> { ok, link } | { error }
import { config, corsHeaders, json, sb, trySendTicketEmail } from '../shared.ts'

const WOORD = 'TAFEL'
const MAX = 200
const DAGEN = ['thu', 'fri', 'sat', 'sun']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default async function handler(req: Request): Promise<Response> {
  const cfg = await config()
  const cors = corsHeaders(req, cfg)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method === 'GET') {
    const { count } = await sb.from('apero_orders').select('id', { count: 'exact', head: true })
      .eq('channel', 'viltje').eq('status', 'paid')
    return json(200, { over: Math.max(0, MAX - (count ?? 0)), max: MAX }, cors)
  }
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, cors)

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { return json(400, { error: 'bad_json' }, cors) }
  if (typeof body.website === 'string' && body.website.trim()) return json(200, { ok: true }, cors)

  const ip = (req.headers.get('x-forwarded-for') ?? '0.0.0.0').split(',')[0].trim()
  const { data: rateOk } = await sb.rpc('apero_rate_check', { p_bucket: 'viltje', p_ip: ip, p_limit: 30, p_window: '10 minutes' })
  if (rateOk === false) return json(429, { error: 'rate_limited' }, cors)

  const goed = String(body.woord ?? '').trim().toUpperCase() === WOORD
  if (body.action === 'check') return json(200, { ok: goed }, cors)
  if (!goed) return json(400, { error: 'woord' }, cors)

  const naam = String(body.naam ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const dag = String(body.dag ?? '')
  if (naam.length < 2 || naam.length > 100) return json(400, { error: 'naam' }, cors)
  if (!EMAIL_RE.test(email) || email.length > 254) return json(400, { error: 'email' }, cors)
  if (!DAGEN.includes(dag)) return json(400, { error: 'dag' }, cors)

  const { data: al } = await sb.from('apero_orders').select('id').eq('channel', 'viltje')
    .eq('buyer_email', email).in('status', ['paid', 'pending']).limit(1)
  if (al && al.length) return json(409, { error: 'al' }, cors)
  const { count } = await sb.from('apero_orders').select('id', { count: 'exact', head: true })
    .eq('channel', 'viltje').eq('status', 'paid')
  if ((count ?? 0) >= MAX) return json(409, { error: 'vol' }, cors)

  const typeId = 'viltje_' + dag
  const { data: order, error } = await sb.from('apero_orders').insert({
    buyer_email: email, buyer_name: naam, total_cents: 0, channel: 'viltje', client_ip: ip,
  }).select('*').single()
  if (error || !order) return json(500, { error: 'internal' }, cors)
  const { error: itemErr } = await sb.from('apero_order_items').insert({
    order_id: order.id, ticket_type_id: typeId, quantity: 1, unit_price_cents: 0, vat_rate: 9,
  })
  if (itemErr) {
    await sb.from('apero_orders').update({ status: 'canceled' }).eq('id', order.id)
    return json(500, { error: 'internal' }, cors)
  }
  const { error: resErr } = await sb.rpc('apero_reserve_order_stock', { p_order_id: order.id })
  if (resErr) {
    await sb.from('apero_orders').update({ status: 'canceled' }).eq('id', order.id)
    return json(409, { error: 'dag_vol' }, cors)
  }
  const { error: confErr } = await sb.rpc('apero_confirm_order_paid', { p_order_id: order.id })
  if (confErr) return json(500, { error: 'internal' }, cors)
  await trySendTicketEmail(order, cfg)
  return json(200, {
    ok: true,
    link: `${cfg.SITE_BASE_URL}/tickets.html?order=${order.id}&token=${order.order_token}`,
  }, cors)
}
