// POST /functions/v1/apero-swap-ticket  (publiek, bearer = order-token)
// Koper wisselt zelf één geldig, niet-gescand dagticket om naar een andere dag
// met dezelfde prijs. Auth via order-id + order_token (zelfde model als order-status).
import { config, corsHeaders, json, safeEqual, sb } from './shared.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TOKEN_RE = /^[0-9a-f]{48}$/i
const DAYS = ['thu', 'fri', 'sat', 'sun']

Deno.serve(async (req: Request) => {
  const cfg = await config()
  const cors = corsHeaders(req, cfg)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, cors)

  let body: { order?: string; token?: string; code?: string; target_day?: string }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'bad_json' }, cors)
  }
  const orderId = String(body.order ?? '')
  const token = String(body.token ?? '')
  const code = String(body.code ?? '').trim().toUpperCase()
  const target = String(body.target_day ?? '')
  if (!UUID_RE.test(orderId) || !TOKEN_RE.test(token)) return json(404, { error: 'not_found' }, cors)
  if (!DAYS.includes(target)) return json(400, { error: 'bad_day' }, cors)

  // Auth: order-token moet kloppen
  const { data: order } = await sb.from('apero_orders').select('id, order_token').eq('id', orderId).maybeSingle()
  if (!order || !safeEqual(order.order_token, token)) return json(404, { error: 'not_found' }, cors)

  // Lichte rem tegen geautomatiseerd heen-en-weer wisselen
  const ip = (req.headers.get('x-forwarded-for') ?? '0.0.0.0').split(',')[0].trim()
  const { data: rateOk } = await sb.rpc('apero_rate_check', { p_bucket: 'swap', p_ip: ip, p_limit: 20, p_window: '10 minutes' })
  if (rateOk === false) return json(429, { error: 'rate_limited' }, cors)

  const { data, error } = await sb.rpc('apero_swap_ticket_day', { p_order_id: orderId, p_code: code, p_target: target })
  if (error) {
    const m = error.message ?? ''
    if (m.includes('SOLD_OUT')) return json(409, { error: 'sold_out' }, cors)
    if (m.includes('ALREADY_SCANNED')) return json(409, { error: 'already_scanned' }, cors)
    if (m.includes('NO_TARGET_TYPE')) return json(409, { error: 'not_swappable' }, cors)
    if (m.includes('NOT_SINGLE_DAY')) return json(409, { error: 'not_swappable' }, cors)
    if (m.includes('SAME_DAY')) return json(400, { error: 'same_day' }, cors)
    if (m.includes('TICKET_NOT_FOUND') || m.includes('NOT_VALID')) return json(404, { error: 'not_found' }, cors)
    console.error('swap failed', error)
    return json(500, { error: 'internal' }, cors)
  }
  return json(200, data, cors)
})
