// POST /functions/v1/apero-ticket-refund   (x-admin-key)
// (NIET ticket-refund noemen: die naam is van Entree in hetzelfde project.)
// Terugbetalen per ticket. Eerst gaat het bedrag via Mollie terug (deel-refund
// op de oorspronkelijke betaling), pas daarna worden de tickets ongeldig en
// komen de plekken vrij (RPC refund_tickets). Weigert Mollie, dan blijven de
// tickets gewoon geldig.
//
// Body: { order_id, ticket_ids, with_fees?, amount_cents?, dry_run? }
//   dry_run: alleen het voorstel teruggeven: suggested_cents (ticketprijs min
//   evenredige korting) en suggested_incl_cents (plus evenredig deel van de
//   servicekosten en transactiebijdrage), en wat er nog terug kan.
//   with_fees: kosten mee terugbetalen. amount_cents: afwijkend bedrag.
//
// Bewust een losse functie: de admin-functie is te groot om veilig te
// herdeployen zonder de Supabase CLI, en dit hoort bij dezelfde sleutel.
import { config, corsHeaders, json, safeEqual, sb } from './shared.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function log(orderId: string, paymentId: string | null, status: string, note: string) {
  const { error } = await sb.from('apero_payment_events').insert({
    order_id: orderId, mollie_payment_id: paymentId, mollie_status: status, source: 'manual', note,
  })
  if (error) console.error('log mislukt', error)
}

Deno.serve(async (req: Request) => {
  const cfg = await config()
  const cors = corsHeaders(req, cfg)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, cors)

  // Dezelfde sleutels als het dashboard (Milan, Frank, Nienke)
  const key = req.headers.get('x-admin-key') ?? ''
  const validKeys = [cfg.ADMIN_KEY, cfg.ADMIN_KEY_FRANK, cfg.ADMIN_KEY_NIENKE].filter(Boolean) as string[]
  if (!validKeys.some((k) => safeEqual(k, key))) return json(401, { error: 'unauthorized' }, cors)

  let body: { order_id?: string; ticket_ids?: unknown; amount_cents?: unknown; with_fees?: boolean; dry_run?: boolean }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'bad_json' }, cors)
  }

  const orderId = String(body.order_id ?? '').trim()
  if (!UUID.test(orderId)) return json(400, { error: 'order_id_ontbreekt' }, cors)
  const ids = Array.isArray(body.ticket_ids) ? body.ticket_ids.map((x) => String(x)).filter((x) => UUID.test(x)) : []
  if (!ids.length) return json(400, { error: 'geen_tickets' }, cors)

  const { data: q, error: qErr } = await sb.rpc('apero_ticket_refund_quote', { p_order_id: orderId, p_ticket_ids: ids })
  if (qErr || !q) {
    console.error('quote mislukt', qErr)
    return json(500, { error: 'internal' }, cors)
  }
  if (q.status !== 'paid') return json(200, { ok: false, error: 'not_paid' }, cors)
  if (q.tickets_valid !== ids.length) return json(200, { ok: false, error: 'ticket_niet_geldig' }, cors)
  const betaald = q.channel === 'web' && !!q.mollie_payment_id && q.remaining_cents > 0
  if (!betaald) return json(200, { ok: false, error: 'geen_betaling', ...q }, cors)

  if (body.dry_run) return json(200, { ok: true, dry_run: true, ...q }, cors)

  const voorstel = body.with_fees === true ? q.suggested_incl_cents : q.suggested_cents
  const amount = body.amount_cents == null ? voorstel : Math.round(Number(body.amount_cents))
  if (!Number.isInteger(amount) || amount < 1) return json(200, { ok: false, error: 'bad_amount' }, cors)
  if (amount > q.remaining_cents) return json(200, { ok: false, error: 'te_hoog', remaining_cents: q.remaining_cents }, cors)

  // 1. Geld terug via Mollie
  const euro = (amount / 100).toFixed(2)
  let refundId = ''
  try {
    const res = await fetch(
      `https://api.mollie.com/v2/payments/${encodeURIComponent(q.mollie_payment_id)}/refunds`,
      {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + cfg.MOLLIE_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: { currency: 'EUR', value: euro },
          description: `Terugbetaling ${ids.length} ticket${ids.length === 1 ? '' : 's'}`,
          metadata: { order_id: orderId, ticket_ids: ids },
        }),
      },
    )
    const refund = await res.json()
    if (!res.ok) {
      const detail = refund?.detail ?? `mollie ${res.status}`
      await log(orderId, q.mollie_payment_id, 'refund_failed', `per ticket: ${detail}`)
      return json(200, { ok: false, error: 'mollie_refund_failed', detail }, cors)
    }
    refundId = refund.id ?? ''
  } catch (e) {
    console.error('mollie refund failed', e)
    return json(200, { ok: false, error: 'mollie_refund_failed', detail: String(e) }, cors)
  }

  // 2. Tickets ongeldig, plekken vrij, bedrag bijschrijven
  const { data: r, error: rErr } = await sb.rpc('apero_refund_tickets', { p_order_id: orderId, p_ticket_ids: ids, p_amount_cents: amount })
  if (rErr) {
    // Geld is al terug, alleen de administratie faalde: luid loggen
    console.error('REFUND_DONE_BUT_DB_FAILED', orderId, refundId, rErr)
    await log(orderId, q.mollie_payment_id, 'refunded', `refund ${refundId} (${euro}) per ticket, LET OP tickets niet bijgewerkt`)
    return json(500, { ok: false, error: 'db_na_refund', detail: String(rErr.message) }, cors)
  }
  await log(orderId, q.mollie_payment_id, 'refunded',
    `refund ${refundId} (${euro}) voor ${ids.length} ticket${ids.length === 1 ? '' : 's'}${body.with_fees === true ? ' incl. kosten' : ' excl. kosten'}`)
  return json(200, { ok: true, refunded_cents: amount, ...r }, cors)
})
