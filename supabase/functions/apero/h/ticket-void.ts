// POST /functions/v1/apero/ticket-void   (x-admin-key)
// Maakt tickets ongeldig ZONDER terugbetaling, bijvoorbeeld bij een dubbele
// bestelling die al anders verrekend is. De order blijft 'paid' (het geld blijft
// binnen), de tickets worden 'void' en hun plekken komen meteen weer vrij in de
// voorraad, via RPC void_tickets.
//
// Body: { order_id, ticket_ids? }  zonder ticket_ids gaan alle geldige tickets
// van de order eraf.
//
// Bewust een losse functie: de admin-functie is te groot om veilig te
// herdeployen zonder de Supabase CLI, en dit hoort bij dezelfde sleutel.
import { config, corsHeaders, json, safeEqual, sb } from '../shared.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function handler(req: Request): Promise<Response>  {
  const cfg = await config()
  const cors = corsHeaders(req, cfg)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, cors)

  // Dezelfde sleutels als het dashboard (Milan, Frank, Nienke)
  const key = req.headers.get('x-admin-key') ?? ''
  const validKeys = [cfg.ADMIN_KEY, cfg.ADMIN_KEY_FRANK, cfg.ADMIN_KEY_NIENKE].filter(Boolean) as string[]
  if (!validKeys.some((k) => safeEqual(k, key))) return json(401, { error: 'unauthorized' }, cors)

  let body: { order_id?: string; ticket_ids?: unknown }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'bad_json' }, cors)
  }

  const orderId = String(body.order_id ?? '').trim()
  if (!UUID.test(orderId)) return json(400, { error: 'order_id_ontbreekt' }, cors)
  let ids: string[] | null = null
  if (Array.isArray(body.ticket_ids)) {
    ids = body.ticket_ids.map((x) => String(x)).filter((x) => UUID.test(x))
    if (!ids.length) return json(400, { error: 'geen_tickets' }, cors)
  }

  const { data: n, error } = await sb.rpc('apero_void_tickets', { p_order_id: orderId, p_ticket_ids: ids })
  if (error) {
    if (String(error.message).includes('ORDER_NOT_PAID')) return json(200, { ok: false, error: 'not_paid' }, cors)
    console.error('void_tickets mislukt', error)
    return json(500, { error: 'internal' }, cors)
  }

  if ((n ?? 0) > 0) {
    await sb.from('apero_payment_events').insert({
      order_id: orderId, mollie_payment_id: null, mollie_status: 'voided', source: 'manual',
      note: `${n} ticket${n === 1 ? '' : 's'} ongeldig gemaakt zonder terugbetaling`,
    }).then(({ error: e }) => { if (e) console.error('log mislukt', e) })
  }
  return json(200, { ok: true, voided: n ?? 0 }, cors)
}
