// POST /functions/v1/apero/cleanup-expired  (x-internal-key)
// Sweeper, elke 10 min via pg_cron + pg_net. Vangnet voor gemiste webhooks:
// hercheckt elke verlopen pending order BIJ MOLLIE voordat er vrijgegeven wordt.
import { config, json, logPayment, mollieGetPayment, safeEqual, sb, trySendTicketEmail } from '../shared.ts'

export default async function handler(req: Request): Promise<Response>  {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })
  const cfg = await config()
  const key = req.headers.get('x-internal-key') ?? ''
  if (!cfg.INTERNAL_KEY || !safeEqual(key, cfg.INTERNAL_KEY)) return json(401, { error: 'unauthorized' })

  const { data: stale, error } = await sb.from('apero_orders')
    .select('*')
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())
    .limit(100)
  if (error) {
    console.error('stale query failed', error)
    return json(500, { error: 'internal' })
  }

  let released = 0, confirmed = 0, skipped = 0
  const dayAgo = Date.now() - 24 * 3600 * 1000

  for (const order of stale ?? []) {
    try {
      if (!order.mollie_payment_id) {
        await sb.rpc('apero_release_order', { p_order_id: order.id, p_status: 'expired' })
        released++
        continue
      }
      const payment = await mollieGetPayment(order.mollie_payment_id, cfg)
      await logPayment(order.id, order.mollie_payment_id, payment.status, 'sweeper')
      if (payment.status === 'paid') {
        const { data, error: cErr } = await sb.rpc('apero_confirm_order_paid', { p_order_id: order.id })
        if (cErr) throw cErr
        confirmed++
        if (data?.newly_paid) await trySendTicketEmail(order, cfg)
      } else if (['expired', 'canceled', 'failed'].includes(payment.status)) {
        await sb.rpc('apero_release_order', { p_order_id: order.id, p_status: payment.status })
        released++
      } else if (new Date(order.expires_at).getTime() < dayAgo) {
        // Payment hangt al > 24u in open/pending: opgeven en vrijgeven
        await sb.rpc('apero_release_order', { p_order_id: order.id, p_status: 'expired' })
        released++
      } else {
        skipped++
      }
    } catch (e) {
      console.error('sweep failed for order', order.id, e)
      skipped++
    }
  }

  await sb.from('apero_rate_events').delete().lt('at', new Date(Date.now() - 3600 * 1000).toISOString())

  return json(200, { checked: (stale ?? []).length, released, confirmed, skipped })
}
