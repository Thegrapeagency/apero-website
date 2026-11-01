// Gedeelde helpers voor alle APÉRO edge functions (apero-*).
// Kopie van de NvdW-ticketing, met eigen tabellen (apero_*) in hetzelfde
// Supabase-project. Config komt uit apero_app_config. Alleen de Mollie- en
// Resend-sleutel komen uit de omgeving (die deelt APÉRO voorlopig met NvdW);
// beheer- en scannersleutels zijn bewust NIET uit de omgeving te overschrijven,
// anders zou een NvdW-sleutel ook APÉRO openen.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

export const sb = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
)

const ENV_KEYS = ['MOLLIE_API_KEY', 'RESEND_API_KEY']
let cfgCache: { value: Record<string, string>; at: number } | null = null

export async function config(): Promise<Record<string, string>> {
  if (cfgCache && Date.now() - cfgCache.at < 15_000) return cfgCache.value
  const { data, error } = await sb.from('apero_app_config').select('key,value')
  if (error) throw new Error('config load failed: ' + error.message)
  const cfg: Record<string, string> = {}
  for (const row of data ?? []) cfg[row.key] = row.value
  for (const k of ENV_KEYS) {
    // een eigen APÉRO-sleutel in de tabel gaat voor; anders die uit de omgeving
    if (cfg[k]) continue
    const v = Deno.env.get(k)
    if (v) cfg[k] = v
  }
  cfgCache = { value: cfg, at: Date.now() }
  return cfg
}

export function resetConfigCache() {
  cfgCache = null
}

export function corsHeaders(req: Request, cfg: Record<string, string>): Record<string, string> {
  const origin = req.headers.get('origin')
  const allowed = (cfg.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  if (!origin || !allowed.includes(origin)) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'content-type, x-scanner-key, x-admin-key, x-scan-login, x-scan-pin',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Vary': 'Origin',
  }
}

export function json(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  })
}

export function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a)
  const eb = new TextEncoder().encode(b)
  if (ea.length !== eb.length) return false
  let diff = 0
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i]
  return diff === 0
}

export function eurosFromCents(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
}

export async function sha256hexFull(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function functionsUrl(name: string): string {
  return `${Deno.env.get('SUPABASE_URL')}/functions/v1/${name}`
}

// Logt elke Mollie-statusovergang in apero_payment_events (betaallog in het dashboard)
export async function logPayment(
  orderId: string | null,
  paymentId: string | null,
  status: string,
  source: 'created' | 'webhook' | 'sweeper' | 'manual',
  note?: string,
): Promise<void> {
  try {
    await sb.from('apero_payment_events').insert({
      order_id: orderId, mollie_payment_id: paymentId, mollie_status: status, source, note: note ?? null,
    })
  } catch (e) {
    console.error('logPayment failed', e)
  }
}

// ===== Mollie =====
// MOLLIE_STUB=1 (apero_app_config) simuleert Mollie; STUB_OUTCOME bepaalt
// wat een stub-payment "is" bij ophalen (default paid). Nooit in productie.

export async function mollieCreatePayment(body: Record<string, unknown>, cfg: Record<string, string>) {
  if (cfg.MOLLIE_STUB === '1') {
    const id = 'tr_stub_' + crypto.randomUUID().replaceAll('-', '').slice(0, 10)
    return { id, status: 'open', _links: { checkout: { href: String(body.redirectUrl) + '&stub=1' } } }
  }
  const res = await fetch('https://api.mollie.com/v2/payments', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + cfg.MOLLIE_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`mollie create failed ${res.status}: ${await res.text()}`)
  return await res.json()
}

export async function mollieGetPayment(id: string, cfg: Record<string, string>) {
  if (cfg.MOLLIE_STUB === '1' && id.startsWith('tr_stub_')) {
    const { data } = await sb.from('apero_orders').select('id').eq('mollie_payment_id', id).maybeSingle()
    return { id, status: cfg.STUB_OUTCOME ?? 'paid', metadata: { order_id: data?.id ?? null } }
  }
  const res = await fetch('https://api.mollie.com/v2/payments/' + encodeURIComponent(id), {
    headers: { Authorization: 'Bearer ' + cfg.MOLLIE_API_KEY },
  })
  if (!res.ok) {
    const err = new Error(`mollie get failed ${res.status}`) as Error & { status: number }
    err.status = res.status
    throw err
  }
  return await res.json()
}

// ===== Mail (Resend) =====

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

export async function sendMail(
  cfg: Record<string, string>,
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  if (!cfg.RESEND_API_KEY) return false
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + cfg.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: cfg.EMAIL_FROM ?? 'APÉRO Festival <tickets@send.nachtvandewijn.nl>',
      to: [to],
      reply_to: cfg.REPLY_TO ?? 'hallo@apero-culture.nl',
      subject,
      html,
    }),
  })
  if (!res.ok) {
    console.error('resend failed', res.status, await res.text())
    return false
  }
  return true
}

// Eén mailjas in de APÉRO-huisstijl: crème, espresso, terracotta.
export function mailLayout(opts: {
  kicker: string
  title: string
  paragraphs: string[]
  cta?: { href: string; label: string }
  note?: string
  foot?: string
}): string {
  const p = opts.paragraphs.map((t) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#231B13;">${t}</p>`).join('')
  const cta = opts.cta
    ? `<p style="margin:26px 0 6px;"><a href="${opts.cta.href}" style="display:inline-block;background:#231B13;color:#F4EAD6;text-decoration:none;padding:15px 30px;border-radius:100px;font-family:Helvetica,Arial,sans-serif;font-size:13px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;">${opts.cta.label}</a></p>`
    : ''
  const note = opts.note
    ? `<p style="margin:22px 0 0;padding-top:18px;border-top:1px solid #E2D3B6;font-size:14px;line-height:1.6;color:#5c5047;">${opts.note}</p>`
    : ''
  return `<!doctype html><html><body style="margin:0;padding:0;background:#EBDCBE;font-family:Georgia,'Times New Roman',serif;color:#231B13;">
  <div style="max-width:560px;margin:0 auto;padding:30px 18px;">
    <div style="background:#F4EAD6;border-radius:22px;overflow:hidden;">
      <div style="background:#C45F38;padding:22px 30px;">
        <span style="font-family:Georgia,serif;font-weight:bold;font-size:26px;letter-spacing:1px;color:#F4EAD6;">AP&Eacute;RO</span>
        <span style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:4px;color:#F4EAD6;margin-left:8px;">FESTIVAL</span>
      </div>
      <div style="padding:30px 30px 32px;">
        <p style="margin:0 0 8px;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#C45F38;">${opts.kicker}</p>
        <h1 style="margin:0 0 20px;font-size:28px;line-height:1.15;color:#231B13;">${opts.title}</h1>
        ${p}${cta}${note}
      </div>
    </div>
    <p style="margin:16px 10px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#7a6a5c;">${opts.foot ?? ''}</p>
  </div>
</body></html>`
}

type OrderRow = {
  id: string
  short_ref: string
  buyer_email: string
  buyer_name: string
  locale: string
  order_token: string
  channel?: string
  email_status?: string
}

// Link-first: de ticketpagina is het echte ticket, de mail is comfort.
// Zonder RESEND_API_KEY wordt netjes 'skipped' gezet.
export async function trySendTicketEmail(order: OrderRow, cfg: Record<string, string>): Promise<void> {
  let status = 'failed'
  try {
    if (!cfg.RESEND_API_KEY) {
      status = 'skipped'
      return
    }
    const link = `${cfg.SITE_BASE_URL}/tickets.html?order=${order.id}&token=${order.order_token}`
    const nl = order.locale !== 'en'
    const viltje = order.channel === 'viltje'
    const datum = nl ? (cfg.EVENT_DATES_NL ?? 'juni 2027') : (cfg.EVENT_DATES_EN ?? 'June 2027')
    const plek = cfg.EVENT_LOCATION ?? 'Noorderpark, Utrecht'
    const subject = nl
      ? `Je tickets voor APÉRO Festival (${order.short_ref})`
      : `Your tickets for APÉRO Festival (${order.short_ref})`
    const hello = nl ? `Ha ${escapeHtml(order.buyer_name)},` : `Hi ${escapeHtml(order.buyer_name)},`
    const intro = viltje
      ? (nl
        ? `Je raadde het woord op de viltjes van Nacht van de Wijn, en dit is je ticket. APÉRO Festival is in ${escapeHtml(datum)} in het ${escapeHtml(plek)}.`
        : `You found the word on the coasters at Nacht van de Wijn, and this is your ticket. APÉRO Festival takes place in ${escapeHtml(datum)} at ${escapeHtml(plek)}.`)
      : (nl
        ? `Je tickets voor het eerste APÉRO Festival zijn binnen. We zien je in ${escapeHtml(datum)} in het ${escapeHtml(plek)}.`
        : `Your tickets for the first APÉRO Festival are confirmed. See you in ${escapeHtml(datum)} at ${escapeHtml(plek)}.`)
    const verder = nl
      ? 'De precieze data en het programma sturen we je zodra ze vaststaan. Je ticket blijft gewoon geldig voor de dag die je koos. Die dag kun je tot het festival zelf nog omzetten op je ticketpagina.'
      : 'We will send you the exact dates and the programme as soon as they are confirmed. Your ticket stays valid for the day you picked, and you can still switch days on your ticket page.'
    const html = mailLayout({
      kicker: nl ? 'Je bent erbij' : "You're in",
      title: nl ? 'Je tickets zijn binnen.' : 'Your tickets are in.',
      paragraphs: [hello, intro, verder],
      cta: { href: link, label: nl ? 'Bekijk je tickets' : 'View your tickets' },
      note: nl
        ? 'Laat de QR-code bij de ingang scannen, vanaf je scherm of geprint. Bewaar deze mail, de link hierboven is je ticket.'
        : 'Show the QR code at the entrance, on your screen or printed. Keep this email, the link above is your ticket.',
      foot: `${nl ? 'Bestelreferentie' : 'Order reference'}: ${order.short_ref} &middot; <a href="mailto:${cfg.REPLY_TO ?? 'hallo@apero-culture.nl'}" style="color:#C45F38;">${cfg.REPLY_TO ?? 'hallo@apero-culture.nl'}</a>`,
    })
    status = (await sendMail(cfg, order.buyer_email, subject, html)) ? 'sent' : 'failed'
  } catch (e) {
    console.error('ticket email failed for order', order.id, e)
    status = 'failed'
  } finally {
    await sb.from('apero_orders').update({
      email_status: status,
      email_sent_at: status === 'sent' ? new Date().toISOString() : null,
    }).eq('id', order.id)
  }
}

export async function unsubToken(email: string, cfg: Record<string, string>): Promise<string> {
  const secret = cfg.HMAC_SECRET || 'apero-fallback'
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(email.trim().toLowerCase()))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 24)
}

// Herinneringsmail voor niet-afgerekende bestellingen (handmatig vanuit het dashboard).
export async function sendReminderEmail(
  order: { id: string; buyer_email: string; buyer_name: string; locale: string },
  cfg: Record<string, string>,
  opts: { subject?: string; headline?: string; body?: string; photo?: string },
): Promise<boolean> {
  const nl = order.locale !== 'en'
  const name = (order.buyer_name || '').trim() || (nl ? 'daar' : 'there')
  const shopUrl = `${cfg.SITE_BASE_URL ?? ''}/tickets.html`
  const subject = (opts.subject || '').trim() ||
    (nl ? 'Je tickets voor APÉRO liggen nog klaar' : 'Your APÉRO tickets are still waiting')
  const headline = (opts.headline || '').trim() ||
    (nl ? 'Je stoel staat er nog.' : 'Your seat is still there.')
  const body = (opts.body || '').trim() || (nl
    ? 'Je was bijna klaar met je tickets voor APÉRO Festival, maar de betaling werd niet afgerond. Dat kan gebeuren. Als je nog mee wilt, kun je hieronder opnieuw beginnen.'
    : 'You were almost done with your tickets for APÉRO Festival, but the payment did not go through. That happens. If you still want to come, you can start again below.')
  const token = await unsubToken(order.buyer_email, cfg)
  const unsubUrl = `${functionsUrl('apero/unsubscribe')}?e=${encodeURIComponent(order.buyer_email)}&t=${token}&l=${nl ? 'nl' : 'en'}`
  try {
    return await sendMail(cfg, order.buyer_email, subject, mailLayout({
      kicker: 'APÉRO Festival',
      title: escapeHtml(headline),
      paragraphs: [`${nl ? 'Ha' : 'Hi'} ${escapeHtml(name)},`, escapeHtml(body)],
      cta: { href: shopUrl, label: nl ? 'Naar de tickets' : 'Go to tickets' },
      foot: `${nl ? 'Toch geen tickets nodig? Dan horen we het graag niet meer.' : 'No tickets needed after all? No problem.'} <a href="${unsubUrl}" style="color:#C45F38;">${nl ? 'Afmelden voor deze mails' : 'Unsubscribe'}</a>`,
    }))
  } catch (e) {
    console.error('reminder email failed', order.id, e)
    return false
  }
}

export function waitlistHtml(name: string, headline: string, body: string, shopUrl: string, nl: boolean): string {
  return mailLayout({
    kicker: nl ? 'De wachtlijst' : 'The waitlist',
    title: escapeHtml(headline),
    paragraphs: [`${nl ? 'Ha' : 'Hi'} ${escapeHtml(name)},`, escapeHtml(body)],
    cta: { href: shopUrl, label: nl ? 'Bekijk en boek' : 'View and book' },
    foot: nl ? 'Je krijgt deze mail omdat je je op de wachtlijst zette.' : 'You receive this because you joined the waitlist.',
  })
}
