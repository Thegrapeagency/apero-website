// POST /functions/v1/apero/backup  (x-internal-key, dagelijks via pg_cron)
// Onafhankelijke off-platform backup: mailt een CSV met alle tickets naar het
// backup-adres via Resend. Belandt buiten Supabase (in de mailbox), zodat de
// verkoopdata behouden blijft zelfs als het hele project verloren zou gaan.
import { config, json, safeEqual, sb } from '../shared.ts'

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[";\n]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s
}

export default async function handler(req: Request): Promise<Response>  {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })
  const cfg = await config()
  const key = req.headers.get('x-internal-key') ?? ''
  if (!cfg.INTERNAL_KEY || !safeEqual(key, cfg.INTERNAL_KEY)) return json(401, { error: 'unauthorized' })

  // Alle tickets met hun order- en typegegevens (de kern: wie heeft wat, geldig?)
  const { data: tickets, error } = await sb.from('apero_tickets')
    .select('code, status, valid_days, admitted_days, holder_name, ticket_type_id, created_at, orders:apero_orders(short_ref, status, channel, buyer_name, buyer_email, total_cents, paid_at)')
    .order('created_at', { ascending: true })
  if (error) {
    console.error('backup query failed', error)
    return json(500, { error: 'internal' })
  }

  const header = 'ticketcode;status;geldige_dagen;gescand_op_dagen;naam_op_ticket;tickettype;order_ref;order_status;kanaal;koper_naam;koper_email;order_totaal_eur;betaald_op;aangemaakt'
  const lines = [header]
  for (const t of (tickets ?? []) as Array<Record<string, unknown>>) {
    const o = (t.orders ?? {}) as Record<string, unknown>
    lines.push([
      t.code, t.status, (t.valid_days as string[] ?? []).join('|'), (t.admitted_days as string[] ?? []).join('|'),
      t.holder_name, t.ticket_type_id, o.short_ref, o.status, o.channel, o.buyer_name, o.buyer_email,
      o.total_cents != null ? (Number(o.total_cents) / 100).toFixed(2) : '', o.paid_at, t.created_at,
    ].map(csvCell).join(';'))
  }
  const csv = lines.join('\n')
  const today = new Date().toISOString().slice(0, 10)
  const to = cfg.BACKUP_EMAIL || 'hallo@apero-culture.nl'

  if (!cfg.RESEND_API_KEY) {
    return json(200, { ok: true, mailed: false, reason: 'no_resend_key', tickets: (tickets ?? []).length })
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + cfg.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: cfg.EMAIL_FROM ?? 'APÉRO Festival <tickets@send.nachtvandewijn.nl>',
        to: [to],
        subject: `APÉRO ticketbackup ${today} (${(tickets ?? []).length} tickets)`,
        text: `Automatische dagelijkse backup van de ticketverkoop.\n${(tickets ?? []).length} tickets in de bijlage.\nBewaar deze mail; het is een onafhankelijke kopie buiten het ticketsysteem.`,
        attachments: [{ filename: `apero-tickets-${today}.csv`, content: btoa(unescape(encodeURIComponent(csv))) }],
      }),
    })
    if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`)
    return json(200, { ok: true, mailed: true, to, tickets: (tickets ?? []).length })
  } catch (e) {
    console.error('backup mail failed', e)
    return json(500, { error: 'mail_failed', detail: String(e) })
  }
}
