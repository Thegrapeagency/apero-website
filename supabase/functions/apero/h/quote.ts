// POST /functions/v1/apero/quote
// Rekent een mandje door zonder iets vast te leggen: geen order, geen voorraad,
// geen verzilvering van de kortingscode. Puur zodat de kassa hetzelfde bedrag
// kan tonen als wat create-order straks berekent.
//
// De kortingsregels hieronder zijn een bewuste spiegel van create-order
// (zoek daar op 'Kortingscode'). Wijzigt daar iets, wijzig het hier mee:
// tests/korting.test.mjs rekent beide varianten op dezelfde gevallen na.
import { config, corsHeaders, json, sb } from '../shared.ts'

type CartItem = { type_id: string; qty: number }

export default async function handler(req: Request): Promise<Response>  {
  const cfg = await config()
  const cors = corsHeaders(req, cfg)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, cors)

  let body: { items?: CartItem[]; discount_code?: string }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'bad_json' }, cors)
  }

  const items = Array.isArray(body.items) ? body.items : []
  const code = String(body.discount_code ?? '').trim()
  if (items.length === 0 || items.length > 10) return json(400, { error: 'bad_items' }, cors)
  for (const it of items) {
    if (typeof it.type_id !== 'string' || !Number.isInteger(it.qty) || it.qty < 1) {
      return json(400, { error: 'bad_items' }, cors)
    }
  }

  // Alleen tellen als er een code wordt geprobeerd: zonder code is dit een
  // gewone prijsopgave, mét code is het een poging die je kunt herhalen om
  // codes te raden. 30/10min per IP laat normaal winkelen ongemoeid.
  if (code) {
    const ip = (req.headers.get('x-forwarded-for') ?? '0.0.0.0').split(',')[0].trim()
    const { data: rateOk, error: rateErr } = await sb.rpc('apero_rate_check', {
      p_bucket: 'quote_discount', p_ip: ip, p_limit: 30, p_window: '10 minutes',
    })
    if (rateErr) {
      console.error('rate_check failed', rateErr)
      return json(500, { error: 'internal' }, cors)
    }
    if (!rateOk) return json(429, { error: 'rate_limited' }, cors)
  }

  const ids = [...new Set(items.map((i) => i.type_id))]
  if (ids.length !== items.length) return json(400, { error: 'bad_items' }, cors)
  const { data: types, error: typesErr } = await sb.from('apero_ticket_types')
    .select('id, price_cents, admits_count, category')
    .in('id', ids).eq('active', true)
  if (typesErr) return json(500, { error: 'internal' }, cors)
  const typeById = new Map((types ?? []).map((t) => [t.id, t]))

  let itemsTotal = 0
  let admissions = 0
  for (const it of items) {
    const t = typeById.get(it.type_id)
    if (!t) return json(400, { error: 'unknown_type', type_id: it.type_id }, cors)
    itemsTotal += it.qty * t.price_cents
    admissions += it.qty * t.admits_count
  }

  // Kortingscode: alleen uitlezen (peek_discount hoogt used_count NIET op).
  // Korting telt over de goedkoopste tickets, begrensd door max_tickets.
  let discountCents = 0
  let state: 'none' | 'ok' | 'invalid' | 'not_applicable' = 'none'
  if (code) {
    const { data: peek, error: peekErr } = await sb.rpc('apero_peek_discount', { p_code: code })
    if (peekErr) {
      console.error('peek_discount failed', peekErr)
      return json(500, { error: 'internal' }, cors)
    }
    if (!peek) {
      state = 'invalid'
    } else {
      const applies = peek.applies_to as string[] | null
      const scope = peek.ticket_scope === 'access' ? 'access' : 'all'
      let units: number[] = []
      for (const it of items) {
        if (applies && applies.length && !applies.includes(it.type_id)) continue
        const t = typeById.get(it.type_id)!
        if (scope === 'access' && t.category !== 'access') continue
        for (let q = 0; q < it.qty; q++) units.push(t.price_cents)
      }
      units.sort((a, b) => a - b)
      if (peek.max_tickets != null) units = units.slice(0, peek.max_tickets)
      const base = units.reduce((s, v) => s + v, 0)
      discountCents = peek.kind === 'percent'
        ? Math.round(base * peek.value / 100)
        : Math.min(base, peek.value)
      // Code bestaat en is geldig, maar raakt niets in dit mandje: dat is een
      // ander verhaal voor de koper dan een ongeldige code.
      state = discountCents > 0 ? 'ok' : 'not_applicable'
    }
  }

  const feeBase = parseInt(cfg.SERVICE_FEE_CENTS ?? '0', 10) || 0
  const serviceFee = (cfg.SERVICE_FEE_MODE === 'ticket') ? feeBase * admissions : feeBase
  const transactionFee = parseInt(cfg.TRANSACTION_FEE_CENTS ?? '0', 10) || 0
  const total = Math.max(0, itemsTotal - discountCents) + serviceFee + transactionFee

  return json(200, {
    items_cents: itemsTotal,
    discount_cents: discountCents,
    service_fee_cents: serviceFee,
    transaction_fee_cents: transactionFee,
    total_cents: total,
    discount: { state, code: state === 'ok' || state === 'not_applicable' ? code : '' },
  }, cors)
}
