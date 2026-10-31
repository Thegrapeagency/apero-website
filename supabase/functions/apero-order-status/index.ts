// GET /functions/v1/apero-order-status?order=<uuid>&token=<48 hex>
// Gepolld door de bedankt-pagina; rendert ook de permanente ticketpagina.
// Bearer-model: order-id + token (192 bits) — mismatch geeft altijd 404.
import { config, corsHeaders, json, safeEqual, sb } from './shared.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TOKEN_RE = /^[0-9a-f]{48}$/i

async function restaurantDetail(_items: { quantity: number; ticket_type_id: string }[]) {
  return null
}

// Voor het ticketontwerp: toegang / crew / extra
async function bucketsFor(typeIds: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  if (typeIds.length === 0) return out
  const { data: types } = await sb.from('apero_ticket_types').select('id, category').in('id', typeIds)
  for (const t of types ?? []) out[t.id] = t.category === 'access' ? 'toegang' : t.category === 'crew' ? 'crew' : 'overig'
  return out
}

Deno.serve(async (req: Request) => {
  const cfg = await config()
  const cors = corsHeaders(req, cfg)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'GET') return json(405, { error: 'method_not_allowed' }, cors)

  const url = new URL(req.url)
  const orderId = url.searchParams.get('order') ?? ''
  const token = url.searchParams.get('token') ?? ''
  if (!UUID_RE.test(orderId) || !TOKEN_RE.test(token)) return json(404, { error: 'not_found' }, cors)

  const { data: order, error } = await sb.from('apero_orders')
    .select('*, order_items:apero_order_items(quantity, unit_price_cents, ticket_type_id, ticket_types:apero_ticket_types(name_nl, name_en))')
    .eq('id', orderId).maybeSingle()
  if (error) {
    console.error('order-status query failed', error)
    return json(500, { error: 'internal' }, cors)
  }
  if (!order || !safeEqual(order.order_token, token)) return json(404, { error: 'not_found' }, cors)

  const orderItems = (order.order_items ?? []) as { quantity: number; unit_price_cents: number; ticket_type_id: string; ticket_types: { name_nl: string; name_en: string } | null }[]

  const resp: Record<string, unknown> = {
    status: order.status,
    short_ref: order.short_ref,
    buyer_name: order.buyer_name,
    locale: order.locale,
    total_cents: order.total_cents,
    service_fee_cents: order.service_fee_cents,
    items: orderItems.map((oi) => ({
      type_id: oi.ticket_type_id,
      qty: oi.quantity,
      unit_price_cents: oi.unit_price_cents,
      name_nl: oi.ticket_types?.name_nl ?? oi.ticket_type_id,
      name_en: oi.ticket_types?.name_en ?? oi.ticket_type_id,
    })),
  }

  const restaurant = await restaurantDetail(orderItems.map((oi) => ({ quantity: oi.quantity, ticket_type_id: oi.ticket_type_id })))
  if (restaurant) resp.restaurant = restaurant

  if (order.status === 'paid' || order.status === 'refunded') {
    const { data: tickets } = await sb.from('apero_tickets')
      .select('id, ticket_token, holder_name, holder_email, personalized, code, status, valid_days, admitted_days, ticket_type_id, ticket_types:apero_ticket_types(name_nl, name_en, family, price_cents, admits_count)')
      .eq('order_id', order.id)
      .order('created_at', { ascending: true }).order('code', { ascending: true })

    // Welke dagen kun je naartoe wisselen? Zelfde familie+prijs, enkele dag, niet uitverkocht.
    const { data: allTypes } = await sb.from('apero_ticket_types')
      .select('family, price_cents, admits_count, valid_days, stock_days, active')
    const { data: inv } = await sb.from('apero_inventory').select('day, capacity, sold')
    const free: Record<string, boolean> = {}
    for (const r of inv ?? []) free[r.day] = r.sold < r.capacity
    function targetsFor(family: string | null, price: number, admits: number, srcDay: string): string[] {
      if (!family) return []
      return (allTypes ?? [])
        .filter((tt) =>
          tt.active && tt.family === family && tt.price_cents === price && tt.admits_count === admits &&
          Array.isArray(tt.valid_days) && tt.valid_days.length === 1 &&
          Array.isArray(tt.stock_days) && tt.stock_days.length === 1 &&
          tt.valid_days[0] === tt.stock_days[0] && tt.valid_days[0] !== srcDay && free[tt.valid_days[0]])
        .map((tt) => tt.valid_days[0])
    }

    const buckets = await bucketsFor([...new Set((tickets ?? []).map((t) => t.ticket_type_id))])

    resp.tickets = (tickets ?? []).map((t: {
      id: string
      ticket_token: string
      holder_name: string | null
      holder_email: string | null
      personalized: boolean
      code: string
      status: string
      valid_days: string[]
      admitted_days: string[]
      ticket_type_id: string
      ticket_types: { name_nl: string; name_en: string; family: string | null; price_cents: number; admits_count: number } | null
    }) => {
      const single = (t.valid_days ?? []).length === 1
      const notScanned = !(t.admitted_days && t.admitted_days.length)
      const swap = (t.status === 'valid' && single && notScanned && t.ticket_types)
        ? targetsFor(t.ticket_types.family, t.ticket_types.price_cents, t.ticket_types.admits_count, t.valid_days[0])
        : []
      return {
        id: t.id,
        ticket_token: t.ticket_token,
        holder_name: t.holder_name,
        holder_email: t.holder_email,
        personalized: t.personalized,
        code: t.code,
        status: t.status,
        valid_days: t.valid_days,
        type_id: t.ticket_type_id,
        name_nl: t.ticket_types?.name_nl ?? t.ticket_type_id,
        name_en: t.ticket_types?.name_en ?? t.ticket_type_id,
        bucket: buckets[t.ticket_type_id] ?? 'overig',
        swap_to: swap,
      }
    })
  } else if (order.status === 'pending' && order.checkout_url && new Date(order.expires_at) > new Date()) {
    resp.checkout_url = order.checkout_url
  }

  return json(200, resp, cors)
})
