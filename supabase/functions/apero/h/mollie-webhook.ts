// POST /functions/v1/apero/mollie-webhook
// Mollie stuurt alleen een payment-id; de body wordt nooit vertrouwd.
// De payment wordt bij Mollie zelf opgehaald en is de enige bron van waarheid.
// Idempotentie zit volledig in de conditionele statustransities van de RPC's.
import { config, json, logPayment, mollieGetPayment, sb, trySendTicketEmail } from '../shared.ts'

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Server-side Purchase naar de Meta Conversions API. event_id = order_id,
// exact wat de pixel op de bedanktpagina ook stuurt: Meta ontdubbelt zelf.
// Zonder META_CAPI_TOKEN in app_config gebeurt er niets (nette degradatie);
// fouten hier mogen de webhook nooit laten falen.
type OrderVoorCapi = {
  id: string
  buyer_email: string
  total_cents: number
  client_ip: string | null
  attribution?: { fbp?: string; last?: { fbclid?: string; ts?: string } } | null
}
async function stuurMetaPurchase(order: OrderVoorCapi, cfg: Record<string, string>): Promise<void> {
  try {
    const token = cfg.META_CAPI_TOKEN
    const pixelId = cfg.META_PIXEL_ID
    if (!token || !pixelId) return
    const userData: Record<string, unknown> = {
      em: [await sha256(order.buyer_email.trim().toLowerCase())],
    }
    if (order.client_ip) userData.client_ip_address = order.client_ip
    const attrib = order.attribution ?? {}
    if (attrib.fbp) userData.fbp = attrib.fbp
    if (attrib.last?.fbclid) {
      const klikTs = attrib.last.ts ? Date.parse(attrib.last.ts) : Date.now()
      userData.fbc = `fb.1.${Number.isFinite(klikTs) ? klikTs : Date.now()}.${attrib.last.fbclid}`
    }
    const res = await fetch(`https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [{
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_id: order.id,
          action_source: 'website',
          event_source_url: (cfg.SITE_BASE_URL ?? 'https://www.apero-culture.com') + '/bedankt.html',
          user_data: userData,
          custom_data: { currency: 'EUR', value: order.total_cents / 100 },
        }],
      }),
    })
    if (!res.ok) console.error('meta capi failed', res.status, await res.text())
  } catch (e) {
    console.error('meta capi error', e)
  }
}

export default async function handler(req: Request): Promise<Response>  {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })
  const cfg = await config()

  let paymentId = ''
  const ct = req.headers.get('content-type') ?? ''
  try {
    if (ct.includes('json')) {
      const b = await req.json()
      paymentId = String(b.id ?? '')
    } else {
      const text = await req.text()
      paymentId = new URLSearchParams(text).get('id') ?? ''
    }
  } catch {
    return json(200, { ok: true })
  }
  if (!paymentId) return json(200, { ok: true })

  let payment: { status: string; metadata?: { order_id?: string | null } }
  try {
    payment = await mollieGetPayment(paymentId, cfg)
  } catch (e) {
    const status = (e as { status?: number }).status
    if (status === 404) return json(200, { ok: true })
    console.error('mollie fetch failed for', paymentId, e)
    return json(500, { error: 'retry' })
  }

  let { data: order } = await sb.from('apero_orders').select('*').eq('mollie_payment_id', paymentId).maybeSingle()
  if (!order && payment.metadata?.order_id) {
    const fallback = await sb.from('apero_orders').select('*').eq('id', payment.metadata.order_id).maybeSingle()
    order = fallback.data
  }
  if (!order) {
    console.warn('webhook for unknown payment', paymentId)
    return json(200, { ok: true })
  }

  await logPayment(order.id, paymentId, payment.status, 'webhook')

  if (payment.status === 'paid') {
    const { data, error } = await sb.rpc('apero_confirm_order_paid', { p_order_id: order.id })
    if (error) {
      if ((error.message ?? '').includes('SOLD_OUT')) {
        // Betaald maar capaciteit inmiddels weg (extreem zeldzaam): luid loggen, handmatige refund via admin
        console.error('PAID_BUT_FULL: order', order.id, 'payment', paymentId)
        return json(200, { ok: true, alert: 'paid_but_full' })
      }
      console.error('confirm_order_paid failed', order.id, error)
      return json(500, { error: 'retry' })
    }
    if (data?.newly_paid) {
      await trySendTicketEmail(order, cfg)
      await stuurMetaPurchase(order, cfg)
    }
  } else if (['expired', 'canceled', 'failed'].includes(payment.status)) {
    const { error } = await sb.rpc('apero_release_order', { p_order_id: order.id, p_status: payment.status })
    if (error) {
      console.error('release_order failed', order.id, error)
      return json(500, { error: 'retry' })
    }
  }
  // open/pending/authorized: niets doen
  return json(200, { ok: true })
}
