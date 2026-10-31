// POST /functions/v1/apero-create-order
// Valideert cart + koopvelden + kortingscode, reserveert voorraad atomair,
// maakt een Mollie-payment. Prijzen worden ALTIJD server-side herrekend.
import { config, corsHeaders, eurosFromCents, json, logPayment, mollieCreatePayment, sb } from './shared.ts'

type CartItem = { type_id: string; qty: number }
type TicketAnswer = { type_id: string; seq: number; fields: Record<string, unknown> }

Deno.serve(async (req: Request) => {
  const cfg = await config()
  const cors = corsHeaders(req, cfg)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, cors)

  let body: {
    items?: CartItem[]
    buyer?: { email?: string; name?: string }
    locale?: string
    website?: string
    order_fields?: Record<string, unknown>
    ticket_answers?: TicketAnswer[]
    discount_code?: string
    attribution?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'bad_json' }, cors)
  }

  // Herkomst (UTM's, verwijzer, fbp/fbclid) van de klant: alleen bekende
  // sleutels, alles afgekapt, zodat er nooit vrije data in de kolom belandt.
  function schoonTouch(t: unknown): Record<string, string> | null {
    if (!t || typeof t !== 'object') return null
    const bron = t as Record<string, unknown>
    const uit: Record<string, string> = {}
    for (const k of ['source', 'medium', 'campaign', 'fbclid', 'referrer', 'landing', 'ts']) {
      const v = bron[k]
      if (typeof v === 'string' && v.trim() !== '') uit[k] = v.slice(0, 255)
    }
    return Object.keys(uit).length ? uit : null
  }
  let attribution: Record<string, unknown> = {}
  if (body.attribution && typeof body.attribution === 'object') {
    const a = body.attribution as Record<string, unknown>
    const first = schoonTouch(a.first)
    const last = schoonTouch(a.last)
    const fbp = typeof a.fbp === 'string' && /^fb\.1\./.test(a.fbp) ? a.fbp.slice(0, 100) : null
    attribution = {
      ...(first ? { first } : {}),
      ...(last ? { last } : {}),
      ...(fbp ? { fbp } : {}),
    }
  }

  // Honeypot: bots die het verborgen veld invullen krijgen een nep-succes
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return json(200, {
      order_id: crypto.randomUUID(),
      token: crypto.randomUUID().replaceAll('-', ''),
      checkout_url: (cfg.SITE_BASE_URL ?? '') + '/bedankt.html',
    }, cors)
  }

  const items = Array.isArray(body.items) ? body.items : []
  const email = String(body.buyer?.email ?? '').trim().toLowerCase()
  const name = String(body.buyer?.name ?? '').trim()
  const locale = body.locale === 'en' ? 'en' : 'nl'

  if (items.length === 0 || items.length > 10) return json(400, { error: 'bad_items' }, cors)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return json(400, { error: 'bad_email' }, cors)
  if (name.length < 2 || name.length > 100) return json(400, { error: 'bad_name' }, cors)
  for (const it of items) {
    if (typeof it.type_id !== 'string' || !Number.isInteger(it.qty) || it.qty < 1) {
      return json(400, { error: 'bad_items' }, cors)
    }
  }

  const ip = (req.headers.get('x-forwarded-for') ?? '0.0.0.0').split(',')[0].trim()
  // 15/10min per IP: ruim genoeg voor gedeelde IP's (festival-wifi, kantoor) maar bot-werend
  const { data: rateOk, error: rateErr } = await sb.rpc('apero_rate_check', {
    p_bucket: 'create_order', p_ip: ip, p_limit: 15, p_window: '10 minutes',
  })
  if (rateErr) {
    console.error('rate_check failed', rateErr)
    return json(500, { error: 'internal' }, cors)
  }
  if (!rateOk) return json(429, { error: 'rate_limited' }, cors)

  const { count: pendingCount } = await sb.from('apero_orders')
    .select('id', { count: 'exact', head: true })
    .eq('buyer_email', email).eq('status', 'pending')
  if ((pendingCount ?? 0) >= 5) return json(429, { error: 'rate_limited' }, cors)

  const ids = [...new Set(items.map((i) => i.type_id))]
  if (ids.length !== items.length) return json(400, { error: 'bad_items' }, cors)
  const { data: types, error: typesErr } = await sb.from('apero_ticket_types')
    .select('id, price_cents, vat_rate, max_per_order, admits_count, per_type_cap, per_type_sold, sale_state, sale_starts_at, sale_ends_at, category')
    .in('id', ids).eq('active', true)
  if (typesErr) return json(500, { error: 'internal' }, cors)
  const typeById = new Map((types ?? []).map((t) => [t.id, t]))

  // Server bepaalt of een type nú koopbaar is (status + verkoopperiode)
  const nowMs = Date.now()
  const isBuyable = (t: Record<string, unknown>): boolean => {
    if (t.per_type_cap != null && (t.per_type_sold as number) >= (t.per_type_cap as number)) return false
    if (t.sale_state === 'sold_out' || t.sale_state === 'coming_soon') return false
    if (t.sale_starts_at && nowMs < new Date(t.sale_starts_at as string).getTime()) return false
    if (t.sale_ends_at && nowMs >= new Date(t.sale_ends_at as string).getTime()) return false
    return true
  }

  let itemsTotal = 0
  let admissions = 0
  for (const it of items) {
    const t = typeById.get(it.type_id)
    if (!t) return json(400, { error: 'unknown_type', type_id: it.type_id }, cors)
    if (!isBuyable(t)) return json(409, { error: 'not_available', type_id: it.type_id }, cors)
    if (it.qty > t.max_per_order) return json(400, { error: 'qty_too_high', type_id: it.type_id, max: t.max_per_order }, cors)
    itemsTotal += it.qty * t.price_cents
    admissions += it.qty * t.admits_count
  }
  if (admissions > 60) return json(400, { error: 'too_many_admissions', max: 60 }, cors)

  // Verplichte koopvelden valideren
  const { data: fields } = await sb.from('apero_form_fields').select('*').eq('active', true)
  const orderFields = (body.order_fields ?? {}) as Record<string, unknown>
  const ticketAnswers = Array.isArray(body.ticket_answers) ? body.ticket_answers : []
  const ticketAnswerMap = new Map(ticketAnswers.map((a) => [`${a.type_id}#${a.seq}`, a.fields ?? {}]))
  for (const f of fields ?? []) {
    if (!f.required) continue
    if (f.scope === 'order') {
      const v = orderFields[f.key]
      if (v == null || String(v).trim() === '') return json(400, { error: 'missing_field', field: f.key }, cors)
    } else {
      for (const it of items) {
        if (f.applies_to && f.applies_to.length && !f.applies_to.includes(it.type_id)) continue
        const t = typeById.get(it.type_id)!
        for (let seq = 1; seq <= it.qty * t.admits_count; seq++) {
          const ans = ticketAnswerMap.get(`${it.type_id}#${seq}`) as Record<string, unknown> | undefined
          const v = ans?.[f.key]
          if (v == null || String(v).trim() === '') return json(400, { error: 'missing_ticket_field', field: f.key, type_id: it.type_id }, cors)
        }
      }
    }
  }

  // Kortingscode (race-vrij geclaimd). Korting telt over de goedkoopste tickets,
  // begrensd door max_tickets (een bundel zoals Party for 5 telt als 1 ticket).
  let discountId: number | null = null
  let discountCents = 0
  const code = String(body.discount_code ?? '').trim()
  if (code) {
    const { data: claim } = await sb.rpc('apero_claim_discount', { p_code: code })
    if (!claim) return json(409, { error: 'bad_discount' }, cors)
    discountId = claim.id
    const applies = claim.applies_to as string[] | null
    const scope = claim.ticket_scope === 'access' ? 'access' : 'all'
    let units: number[] = []
    for (const it of items) {
      if (applies && applies.length && !applies.includes(it.type_id)) continue
      const t = typeById.get(it.type_id)!
      // 'access'-codes gelden alleen voor toegangstickets, niet voor proeverijen e.d.
      if (scope === 'access' && t.category !== 'access') continue
      for (let q = 0; q < it.qty; q++) units.push(t.price_cents)
    }
    units.sort((a, b) => a - b)
    if (claim.max_tickets != null) units = units.slice(0, claim.max_tickets)
    const base = units.reduce((s, v) => s + v, 0)
    discountCents = claim.kind === 'percent'
      ? Math.round(base * claim.value / 100)
      : Math.min(base, claim.value)
    // Een geldige code die niets oplevert (verkeerde dag, verkeerde categorie)
    // is hierboven wél geclaimd. Zonder teruggave raakt hij verbruikt zonder
    // dat iemand korting kreeg — bij max_uses=1 is hij dan definitief op.
    if (discountCents === 0) {
      await sb.rpc('apero_release_discount', { p_id: claim.id })
      discountId = null
    }
  }

  // Servicekosten: per bestelling of per ticket (toegangsbewijs), instelbaar in het dashboard
  // Types in FEE_FREE_TYPES (app_config, kommagescheiden) gaan zonder kosten weg,
  // zoals de proeverij bij Bottles & Booze die precies €10 moet kosten.
  const feeFree = new Set((cfg.FEE_FREE_TYPES ?? '').split(',').map((s) => s.trim()).filter(Boolean))
  const zonderKosten = items.every((it) => feeFree.has(it.type_id))
  const feeBase = parseInt(cfg.SERVICE_FEE_CENTS ?? '0', 10) || 0
  const serviceFee = zonderKosten ? 0 : (cfg.SERVICE_FEE_MODE === 'ticket') ? feeBase * admissions : feeBase
  // Vaste transactiebijdrage per bestelling (methode-onafhankelijk), geen surcharge
  const transactionFee = zonderKosten ? 0 : parseInt(cfg.TRANSACTION_FEE_CENTS ?? '0', 10) || 0
  const total = Math.max(0, itemsTotal - discountCents) + serviceFee + transactionFee

  const { data: order, error: orderErr } = await sb.from('apero_orders').insert({
    buyer_email: email,
    buyer_name: name,
    locale,
    total_cents: total,
    service_fee_cents: serviceFee,
    transaction_fee_cents: transactionFee,
    discount_code_id: discountId,
    discount_cents: discountCents,
    custom_data: { order: orderFields, tickets: ticketAnswers },
    attribution,
    client_ip: ip,
  }).select('id, short_ref, order_token').single()
  if (orderErr || !order) {
    if (discountId) await sb.rpc('apero_release_discount', { p_id: discountId })
    console.error('order insert failed', orderErr)
    return json(500, { error: 'internal' }, cors)
  }

  const { error: itemsErr } = await sb.from('apero_order_items').insert(items.map((it) => {
    const t = typeById.get(it.type_id)!
    return {
      order_id: order.id,
      ticket_type_id: it.type_id,
      quantity: it.qty,
      unit_price_cents: t.price_cents,
      vat_rate: t.vat_rate,
    }
  }))
  if (itemsErr) {
    console.error('items insert failed', itemsErr)
    await sb.from('apero_orders').update({ status: 'canceled' }).eq('id', order.id).eq('status', 'pending')
    if (discountId) await sb.rpc('apero_release_discount', { p_id: discountId })
    return json(500, { error: 'internal' }, cors)
  }

  const { error: reserveErr } = await sb.rpc('apero_reserve_order_stock', { p_order_id: order.id })
  if (reserveErr) {
    await sb.from('apero_orders').update({ status: 'canceled' }).eq('id', order.id).eq('status', 'pending')
    if (discountId) await sb.rpc('apero_release_discount', { p_id: discountId })
    const mType = /SOLD_OUT_TYPE:(\w+)/.exec(reserveErr.message ?? '')
    if (mType) {
      return json(409, { error: 'sold_out_type', type_id: mType[1] }, cors)
    }
    const m = /SOLD_OUT:(\w+)/.exec(reserveErr.message ?? '')
    if (m) {
      const { data: inv } = await sb.from('apero_inventory').select('day, capacity, sold')
      const remaining = Object.fromEntries((inv ?? []).map((r) => [r.day, r.capacity - r.sold]))
      return json(409, { error: 'sold_out', day: m[1], remaining }, cors)
    }
    console.error('reserve failed', reserveErr)
    return json(500, { error: 'internal' }, cors)
  }

  try {
    const payment = await mollieCreatePayment({
      amount: { currency: 'EUR', value: eurosFromCents(total) },
      description: 'APÉRO Festival ' + order.short_ref,
      redirectUrl: `${cfg.SITE_BASE_URL}/bedankt.html?order=${order.id}&token=${order.order_token}`,
      webhookUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/apero-mollie-webhook`,
      metadata: { order_id: order.id },
      locale: locale === 'en' ? 'en_US' : 'nl_NL',
      method: ['ideal', 'creditcard', 'applepay', 'bancontact'],
    }, cfg)
    const checkoutUrl = payment._links?.checkout?.href ?? null
    await sb.from('apero_orders').update({ mollie_payment_id: payment.id, checkout_url: checkoutUrl }).eq('id', order.id)
    await logPayment(order.id, payment.id, payment.status ?? 'open', 'created')
    return json(200, { order_id: order.id, token: order.order_token, checkout_url: checkoutUrl }, cors)
  } catch (e) {
    console.error('mollie create failed', e)
    await sb.rpc('apero_release_order', { p_order_id: order.id, p_status: 'canceled' })
    return json(502, { error: 'payment_provider' }, cors)
  }
})
