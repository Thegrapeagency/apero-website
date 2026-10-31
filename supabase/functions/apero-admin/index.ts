// /functions/v1/apero-admin/<actie>  (x-admin-key)
// Lezen:  stats | orders?q=&status=&channel= | order?id= | guestlist?day= | paymentlog | export.csv
// Beheer: settings (GET/POST) | types (GET/POST) | fields (GET/POST/DELETE) | discounts (GET/POST/DELETE)
// Acties: resend | comp | refund
import { config, corsHeaders, json, logPayment, safeEqual, sb, sendReminderEmail, trySendTicketEmail } from './shared.ts'

// Welke app_config-keys de admin mag bewerken (geheimen blijven buiten bereik)
const EDITABLE = new Set([
  'SERVICE_FEE_CENTS', 'SERVICE_FEE_MODE', 'TRANSACTION_FEE_CENTS', 'EVENT_NAME', 'EVENT_EDITION', 'EVENT_LOCATION', 'EVENT_DATES_NL', 'EVENT_DATES_EN',
  'TICKET_NOTE_NL', 'TICKET_NOTE_EN', 'TICKET_ACCENT', 'TICKET_INK', 'TICKET_BG',
  'SHOP_OPEN', 'FESTIVAL_DATES', 'REPLY_TO',
])

Deno.serve(async (req: Request) => {
  const cfg = await config()
  const cors = corsHeaders(req, cfg)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

  // Twee gelijkwaardige sleutels (Milan + Frank), apart intrekbaar/roteerbaar
  const key = req.headers.get('x-admin-key') ?? ''
  const validKeys = [cfg.ADMIN_KEY, cfg.ADMIN_KEY_FRANK].filter(Boolean) as string[]
  if (!validKeys.some((k) => safeEqual(k, key))) return json(401, { error: 'unauthorized' }, cors)

  const url = new URL(req.url)
  const action = url.pathname.split('/').filter(Boolean).pop() ?? ''
  const M = req.method

  try {
    if (M === 'GET' && action === 'stats') return json(200, await stats(), cors)
    if (M === 'GET' && action === 'presale') return json(200, await presale(), cors)
    if (M === 'GET' && action === 'audience') return json(200, await audience(), cors)
    if (M === 'GET' && action === 'orders') return json(200, await searchOrders(url.searchParams), cors)
    if (M === 'GET' && action === 'order') return json(200, await orderDetail(url.searchParams.get('id') ?? ''), cors)
    if (M === 'GET' && action === 'guestlist') return json(200, await guestlist(url.searchParams.get('day') ?? ''), cors)
    if (M === 'GET' && action === 'paymentlog') return json(200, await paymentLog(url.searchParams.get('order') ?? ''), cors)
    if (M === 'GET' && action === 'settings') return json(200, await getSettings(), cors)
    if (M === 'GET' && action === 'types') return json(200, await getTypes(), cors)
    if (M === 'GET' && action === 'fields') return json(200, { fields: (await sb.from('apero_form_fields').select('*').order('sort')).data }, cors)
    if (M === 'GET' && action === 'discounts') return json(200, { discounts: (await sb.from('apero_discount_codes').select('*').order('id', { ascending: false })).data }, cors)
    if (M === 'GET' && action === 'export.csv') {
      return new Response(await exportCsv(), {
        status: 200,
        headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="apero-orders.csv"', ...cors },
      })
    }
    if (M === 'GET' && action === 'guests.csv') {
      const day = url.searchParams.get('day') ?? ''
      const type = url.searchParams.get('type') ?? ''
      const { csv, filename } = await guestsCsv(day, type)
      return new Response(csv, {
        status: 200,
        headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"`, ...cors },
      })
    }

    if (M === 'POST' && action === 'settings') return json(200, await saveSettings(await req.json()), cors)
    if (M === 'POST' && action === 'types') return json(200, await saveType(await req.json()), cors)
    if (M === 'POST' && action === 'fields') return json(200, await saveField(await req.json()), cors)
    if (M === 'DELETE' && action === 'fields') { await sb.from('apero_form_fields').delete().eq('id', url.searchParams.get('id')); return json(200, { ok: true }, cors) }
    if (M === 'POST' && action === 'discounts') return json(200, await saveDiscount(await req.json()), cors)
    if (M === 'POST' && action === 'discounts-bulk') return json(200, await bulkDiscounts(await req.json()), cors)
    if (M === 'DELETE' && action === 'discounts') { await sb.from('apero_discount_codes').delete().eq('id', url.searchParams.get('id')); return json(200, { ok: true }, cors) }

    if (M === 'GET' && action === 'abandoned') return json(200, { list: (await sb.rpc('apero_admin_abandoned')).data ?? [] }, cors)
    if (M === 'POST' && action === 'remind') return json(200, await sendReminders(await req.json(), cfg), cors)

    if (M === 'POST' && action === 'resend') {
      const { order_id } = await req.json()
      const { data: order } = await sb.from('apero_orders').select('*').eq('id', order_id).single()
      if (!order || order.status !== 'paid') return json(400, { error: 'order_not_paid' }, cors)
      await trySendTicketEmail(order, cfg)
      const { data: after } = await sb.from('apero_orders').select('email_status').eq('id', order_id).single()
      return json(200, { ok: true, email_status: after?.email_status }, cors)
    }
    if (M === 'POST' && action === 'comp') return json(200, await createComp(await req.json(), cfg), cors)
    if (M === 'POST' && action === 'bulk-comp') return json(200, await bulkComp(await req.json(), cfg), cors)
    if (M === 'POST' && action === 'refund') return json(200, await doRefund(await req.json(), cfg), cors)
    if (M === 'POST' && action === 'import-attendance') return json(200, await importAttendance(await req.json()), cors)
    if (M === 'GET' && action === 'backup.json') {
      return new Response(JSON.stringify(await fullBackup(), null, 0), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="apero-backup.json"', ...cors },
      })
    }
    return json(404, { error: 'unknown_action', action }, cors)
  } catch (e) {
    console.error('admin action failed', action, e)
    return json(500, { error: 'internal', detail: String(e) }, cors)
  }
})

// Echte terugbetaling: betaalde web-orders → geld terug via Mollie, dan tickets
// ongeldig + voorraad vrij. Comp/partner (geen betaling) → alleen ongeldig maken.
async function doRefund(body: { order_id?: string }, cfg: Record<string, string>) {
  const orderId = String(body.order_id ?? '')
  const { data: order, error } = await sb.from('apero_orders').select('*').eq('id', orderId).single()
  if (error || !order) return { ok: false, error: 'not_found' }
  if (order.status !== 'paid') return { ok: false, error: 'not_paid' }

  // Echte order met Mollie-betaling: geld terugstorten
  if (order.channel === 'web' && order.mollie_payment_id && order.total_cents > 0) {
    try {
      const res = await fetch(
        `https://api.mollie.com/v2/payments/${encodeURIComponent(order.mollie_payment_id)}/refunds`,
        {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + cfg.MOLLIE_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: { currency: order.currency ?? 'EUR', value: (order.total_cents / 100).toFixed(2) },
            description: 'Terugbetaling ' + order.short_ref,
            metadata: { order_id: orderId },
          }),
        },
      )
      const refund = await res.json()
      if (!res.ok) {
        const detail = refund?.detail ?? `mollie ${res.status}`
        await logPayment(orderId, order.mollie_payment_id, 'refund_failed', 'manual', detail)
        return { ok: false, error: 'mollie_refund_failed', detail }
      }
      await logPayment(orderId, order.mollie_payment_id, 'refunded', 'manual',
        `refund ${refund.id ?? ''} (${(order.total_cents / 100).toFixed(2)})`)
    } catch (e) {
      console.error('mollie refund failed', e)
      return { ok: false, error: 'mollie_refund_failed', detail: String(e) }
    }
  } else {
    await logPayment(orderId, null, 'refunded', 'manual', 'gratis order ongeldig gemaakt')
  }

  // Tickets ongeldig + voorraad vrij (idempotent in de RPC)
  const { data, error: rErr } = await sb.rpc('apero_mark_order_refunded', { p_order_id: orderId })
  if (rErr) throw rErr
  return { ok: true, refunded: data === true, money_back: order.channel === 'web' && order.total_cents > 0 }
}

async function stats() {
  const { data: inv } = await sb.from('apero_inventory').select('*').order('day')
  const { data: perType } = await sb.rpc('apero_admin_sales_per_type')
  const { data: perCategorie } = await sb.rpc('apero_admin_sales_per_categorie')
  const { data: perCategoriePerDag } = await sb.rpc('apero_admin_sales_per_categorie_per_dag')
  const { data: rev } = await sb.rpc('apero_admin_revenue')
  const { data: timeseries } = await sb.rpc('apero_admin_timeseries')
  const { data: demographics } = await sb.rpc('apero_admin_demographics')
  const { data: recent } = await sb.from('apero_orders')
    .select('id, short_ref, status, buyer_email, buyer_name, total_cents, channel, email_status, created_at')
    .order('created_at', { ascending: false }).limit(20)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Amsterdam' })
  const { count: scansToday } = await sb.from('apero_scans')
    .select('id', { count: 'exact', head: true })
    .gte('scanned_at', today + 'T00:00:00+01:00').eq('result', 'admitted')
  // Totaal verkochte tickets = aantal geldige ticketrijen op betaalde/comp orders
  // (party for 5 = 5 ticketrijen, dus dit telt daadwerkelijke toegangen)
  const { count: ticketsTotal } = await sb.from('apero_tickets')
    .select('id', { count: 'exact', head: true }).eq('status', 'valid')
  return { inventory: inv, per_type: perType, per_categorie: perCategorie, per_categorie_per_dag: perCategoriePerDag, revenue: rev, timeseries, demographics, recent, scans_today: scansToday ?? 0, tickets_total: ticketsTotal ?? 0 }
}

// Publieksmix en voorverkoop-historie bestaan bij een eerste editie nog niet.
// De endpoints blijven bestaan zodat het dashboard niet breekt.
async function audience() {
  return { now: null, history: [] }
}

async function presale() {
  return { weeks: [], editions: [], live: [], current_week: 0, label_2026: 'APÉRO 2027' }
}

async function searchOrders(params: URLSearchParams) {
  const q = params.get('q') ?? ''
  let query = sb.from('apero_orders')
    .select('id, short_ref, status, buyer_email, buyer_name, total_cents, discount_cents, mollie_payment_id, channel, email_status, created_at, discount_codes:apero_discount_codes!apero_orders_discount_code_id_fkey(code), order_items:apero_order_items(quantity, ticket_type_id, ticket_types:apero_ticket_types(admits_count, name_nl, category))')
    .order('created_at', { ascending: false }).limit(100)
  if (params.get('status')) query = query.eq('status', params.get('status'))
  if (params.get('channel')) query = query.eq('channel', params.get('channel'))
  if (q) query = query.or(`short_ref.ilike.%${q.replaceAll('%', '')}%,buyer_email.ilike.%${q.replaceAll('%', '')}%,buyer_name.ilike.%${q.replaceAll('%', '')}%`)
  const { data, error } = await query
  if (error) throw error
  const prior: Record<string, number> = {}
  // tickets_count = som van toegangen (quantity * admits_count) per bestelling
  // items = compacte regels (naam + aantal + soort) zodat admin/kassa direct tonen
  // wat er gekocht is, zonder de order te hoeven openen
  const orders = (data ?? []).map((o: Record<string, any>) => {
    const tickets_count = (o.order_items ?? []).reduce(
      (s: number, it: any) => s + (it.quantity ?? 0) * (it.ticket_types?.admits_count ?? 1), 0)
    const items = (o.order_items ?? []).map((it: any) => ({
      name: it.ticket_types?.name_nl ?? it.ticket_type_id ?? '',
      qty: it.quantity ?? 0,
      category: it.ticket_types?.category ?? 'access',
    }))
    const { order_items: _drop, discount_codes: _discountCodes, ...rest } = o
    return {
      ...rest,
      discount_code: o.discount_codes?.code ?? null,
      tickets_count,
      items,
      prior_editions: prior[(o.buyer_email ?? '').toLowerCase()] ?? 0,
    }
  })
  return { orders }
}

async function importAttendance(_body: unknown) {
  return { ok: false, error: 'niet beschikbaar voor APÉRO' }
}

async function orderDetail(id: string) {
  const { data: order, error } = await sb.from('apero_orders')
    .select('*, discount_codes:apero_discount_codes!apero_orders_discount_code_id_fkey(code), order_items:apero_order_items(quantity, unit_price_cents, vat_rate, ticket_type_id)')
    .eq('id', id).single()
  if (error) throw error
  const { data: tickets } = await sb.from('apero_tickets')
    .select('id, code, status, valid_days, admitted_days, ticket_type_id, holder_name, custom_data')
    .eq('order_id', id).order('created_at')
  const { data: events } = await sb.from('apero_payment_events')
    .select('occurred_at, mollie_status, source, note').eq('order_id', id).order('occurred_at')
  return { order: { ...order, discount_code: order.discount_codes?.code ?? null }, tickets, events }
}

async function guestlist(day: string) {
  let q = sb.from('apero_tickets')
    .select('code, holder_name, status, valid_days, ticket_type_id, custom_data, orders:apero_orders!inner(short_ref, buyer_name, buyer_email, status)')
    .eq('orders.status', 'paid').order('holder_name')
  if (['thu', 'fri', 'sat', 'sun'].includes(day)) q = q.contains('valid_days', [day])
  const { data, error } = await q
  if (error) throw error
  return { guests: data }
}

async function paymentLog(orderId: string) {
  let q = sb.from('apero_payment_events')
    .select('occurred_at, order_id, mollie_payment_id, mollie_status, source, note, orders:apero_orders(short_ref, buyer_email)')
    .order('occurred_at', { ascending: false }).limit(200)
  if (orderId) q = q.eq('order_id', orderId)
  const { data, error } = await q
  if (error) throw error
  return { events: data }
}

async function getSettings() {
  const { data } = await sb.from('apero_app_config').select('key, value').in('key', [...EDITABLE])
  const out: Record<string, string> = {}
  for (const r of data ?? []) out[r.key] = r.value
  return { settings: out }
}

async function saveSettings(body: Record<string, string>) {
  const rows = Object.entries(body).filter(([k]) => EDITABLE.has(k)).map(([key, value]) => ({ key, value: String(value) }))
  if (rows.length) {
    const { error } = await sb.from('apero_app_config').upsert(rows)
    if (error) throw error
  }
  return { ok: true, saved: rows.length }
}

async function getTypes() {
  const { data } = await sb.from('apero_ticket_types').select('*').order('sort_order')
  const { data: inv } = await sb.from('apero_inventory').select('*').order('day')
  return { types: data, inventory: inv }
}

async function saveType(body: Record<string, unknown>) {
  // capaciteit zit op inventory (per dag), niet op het type
  if (body.inventory) {
    for (const row of body.inventory as Array<{ day: string; capacity: number }>) {
      await sb.from('apero_inventory').update({ capacity: row.capacity }).eq('day', row.day)
    }
  }
  if (body.type) {
    const t = body.type as Record<string, unknown>
    const allowed = [
      'name_nl', 'name_en', 'description_nl', 'description_en', 'price_cents', 'vat_rate', 'active',
      'sort_order', 'max_per_order', 'admits_count', 'valid_days', 'stock_days', 'family', 'per_type_cap',
      'sale_state', 'sale_starts_at', 'sale_ends_at', 'category', 'public',
    ]
    const patch: Record<string, unknown> = {}
    for (const k of allowed) if (k in t) patch[k] = t[k]
    const id = String(t.id ?? '').toLowerCase()
    if (!/^[a-z0-9_]{2,40}$/.test(id)) throw new Error('bad type id')
    const { data: existing } = await sb.from('apero_ticket_types').select('id').eq('id', id).maybeSingle()
    if (existing) {
      const { error } = await sb.from('apero_ticket_types').update(patch).eq('id', id)
      if (error) throw error
    } else {
      // Nieuw type: telt standaard NIET mee in de dagcapaciteit (eigen capaciteit via per_type_cap),
      // zodat proeverij- en restauranttickets naast een entreeticket gekocht kunnen worden
      const row: Record<string, unknown> = {
        id, name_nl: '', name_en: '', valid_days: ['thu'], stock_days: [], admits_count: 1, ...patch,
      }
      if (!row.name_en) row.name_en = row.name_nl
      const { error } = await sb.from('apero_ticket_types').insert(row)
      if (error) throw error
    }
    return { ok: true, id }
  }
  return { ok: true }
}

async function saveField(body: Record<string, unknown>) {
  const allowed = ['id', 'key', 'scope', 'label_nl', 'label_en', 'type', 'options', 'required', 'active', 'sort', 'applies_to']
  const patch: Record<string, unknown> = {}
  for (const k of allowed) if (k in body) patch[k] = body[k]
  if (patch.id) {
    const { error } = await sb.from('apero_form_fields').update(patch).eq('id', patch.id)
    if (error) throw error
    return { ok: true, id: patch.id }
  }
  delete patch.id
  const { data, error } = await sb.from('apero_form_fields').insert(patch).select('id').single()
  if (error) throw error
  return { ok: true, id: data.id }
}

// Bulk: genereert unieke codes (prefix + 6 tekens, zonder verwarrende 0/O/1/I/L)
async function bulkDiscounts(body: Record<string, unknown>) {
  const count = Number(body.count ?? 0)
  if (!Number.isInteger(count) || count < 1 || count > 500) throw new Error('aantal moet 1 t/m 500 zijn')
  const kind = body.kind === 'fixed_cents' ? 'fixed_cents' : 'percent'
  const value = Number(body.value) || 0
  if (value <= 0 || (kind === 'percent' && value > 100)) throw new Error('ongeldige kortingswaarde')
  const prefix = (String(body.prefix ?? 'APERO').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)) || 'APERO'
  const alphabet = '23456789ABCDEFGHJKMNPQRSTVWXYZ'
  const seen = new Set<string>()
  const rows: Record<string, unknown>[] = []
  while (rows.length < count) {
    const bytes = crypto.getRandomValues(new Uint8Array(6))
    let suf = ''
    for (const b of bytes) suf += alphabet[b % alphabet.length]
    const codeStr = prefix + '-' + suf
    if (seen.has(codeStr)) continue
    seen.add(codeStr)
    rows.push({
      code: codeStr,
      kind,
      value,
      max_uses: body.max_uses == null || body.max_uses === '' ? 1 : Number(body.max_uses),
      max_tickets: body.max_tickets == null || body.max_tickets === '' ? null : Number(body.max_tickets),
      applies_to: Array.isArray(body.applies_to) && body.applies_to.length ? body.applies_to : null,
      ticket_scope: body.ticket_scope === 'access' ? 'access' : 'all',
      valid_from: body.valid_from || null,
      valid_until: body.valid_until || null,
      active: true,
    })
  }
  const { data, error } = await sb.from('apero_discount_codes').insert(rows).select('code')
  if (error) throw error
  return { ok: true, created: (data ?? []).length, codes: (data ?? []).map((r) => r.code) }
}

async function saveDiscount(body: Record<string, unknown>) {
  const allowed = ['id', 'code', 'kind', 'value', 'applies_to', 'max_uses', 'max_tickets', 'valid_from', 'valid_until', 'active', 'ticket_scope']
  const patch: Record<string, unknown> = {}
  for (const k of allowed) if (k in body) patch[k] = body[k]
  if (patch.id) {
    const { error } = await sb.from('apero_discount_codes').update(patch).eq('id', patch.id)
    if (error) throw error
    return { ok: true, id: patch.id }
  }
  delete patch.id
  const { data, error } = await sb.from('apero_discount_codes').insert(patch).select('id').single()
  if (error) throw error
  return { ok: true, id: data.id }
}

// Handmatige herinneringsmails naar niet-afgerekende bestellingen.
async function sendReminders(body: Record<string, unknown>, cfg: Record<string, string>) {
  const ids = Array.isArray(body.order_ids) ? (body.order_ids as string[]).slice(0, 200) : []
  if (!ids.length) return { ok: false, error: 'no_orders' }
  const opts = {
    subject: typeof body.subject === 'string' ? body.subject : '',
    headline: typeof body.headline === 'string' ? body.headline : '',
    body: typeof body.body === 'string' ? body.body : '',
    photo: typeof body.photo === 'string' ? body.photo : '',
  }
  // Taal: 'nl'/'en' forceert die taal voor de hele batch; anders per gast (order.locale)
  const forceLang = body.lang === 'nl' ? 'nl' : body.lang === 'en' ? 'en' : ''
  const results: Array<{ id: string; ok: boolean }> = []
  for (const id of ids) {
    const { data: order } = await sb.from('apero_orders')
      .select('id, buyer_email, buyer_name, locale, status, channel, reminder_count')
      .eq('id', id).maybeSingle()
    if (!order || order.channel !== 'web' || !['pending', 'expired'].includes(order.status) || !order.buyer_email) {
      results.push({ id, ok: false }); continue
    }
    const { data: opt } = await sb.from('apero_email_optout').select('email').eq('email', order.buyer_email).maybeSingle()
    if (opt) { results.push({ id, ok: false }); continue }
    const ok = await sendReminderEmail(forceLang ? { ...order, locale: forceLang } : order, cfg, opts)
    if (ok) {
      await sb.from('apero_orders').update({
        reminder_sent_at: new Date().toISOString(),
        reminder_count: (order.reminder_count ?? 0) + 1,
      }).eq('id', id)
    }
    results.push({ id, ok })
  }
  return { ok: true, sent: results.filter((r) => r.ok).length, total: ids.length, results }
}

async function createComp(
  body: { type_id?: string; qty?: number; email?: string; name?: string },
  cfg: Record<string, string>,
) {
  const qty = Number(body.qty ?? 1)
  if (!body.type_id || !Number.isInteger(qty) || qty < 1 || qty > 50) throw new Error('bad comp input')
  const { data: type } = await sb.from('apero_ticket_types').select('id, vat_rate').eq('id', body.type_id).single()
  if (!type) throw new Error('unknown type')
  const { data: order, error } = await sb.from('apero_orders').insert({
    buyer_email: body.email ?? 'comp@apero-culture.nl',
    buyer_name: body.name ?? 'Comp',
    total_cents: 0,
    channel: 'comp',
  }).select('id, short_ref, order_token').single()
  if (error || !order) throw error ?? new Error('insert failed')
  const { error: itemErr } = await sb.from('apero_order_items').insert({
    order_id: order.id, ticket_type_id: type.id, quantity: qty, unit_price_cents: 0, vat_rate: type.vat_rate,
  })
  if (itemErr) throw itemErr
  const { error: resErr } = await sb.rpc('apero_reserve_order_stock', { p_order_id: order.id })
  if (resErr) {
    await sb.from('apero_orders').update({ status: 'canceled' }).eq('id', order.id)
    throw resErr
  }
  const { error: confErr } = await sb.rpc('apero_confirm_order_paid', { p_order_id: order.id })
  if (confErr) throw confErr
  return {
    ok: true,
    order_id: order.id,
    short_ref: order.short_ref,
    ticket_link: `${cfg.SITE_BASE_URL}/tickets?order=${order.id}&token=${order.order_token}`,
  }
}

// Bulk uitgifte: lijst van {name,email} (1 ticket per persoon, eigen mail) of een
// aantal zonder namen (1 order met N tickets). Voor crew, artiesten, gasten.
async function bulkComp(
  body: { type_id?: string; people?: Array<{ name?: string; email?: string }>; count?: number; email?: string; send_email?: boolean },
  cfg: Record<string, string>,
) {
  if (!body.type_id) throw new Error('no_type')
  const { data: type } = await sb.from('apero_ticket_types').select('id, vat_rate').eq('id', body.type_id).single()
  if (!type) throw new Error('unknown_type')

  const people = Array.isArray(body.people) ? body.people.filter((p) => p && (p.email || p.name)) : []
  const sendEmail = body.send_email === true

  // Modus A: lijst met personen → per persoon een eigen comp-order + ticket
  if (people.length) {
    if (people.length > 500) throw new Error('te veel (max 500)')
    const results: Array<{ name: string; email: string; ok: boolean; short_ref?: string; ticket_link?: string; error?: string }> = []
    for (const p of people) {
      const name = String(p.name ?? '').trim() || 'Gast'
      const email = String(p.email ?? '').trim().toLowerCase()
      try {
        const r = await createComp({ type_id: type.id, qty: 1, name, email: email || undefined }, cfg)
        if (sendEmail && email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
          const { data: ord } = await sb.from('apero_orders').select('*').eq('id', r.order_id).single()
          if (ord) await trySendTicketEmail(ord, cfg)
        }
        results.push({ name, email, ok: true, short_ref: r.short_ref, ticket_link: r.ticket_link })
      } catch (e) {
        results.push({ name, email, ok: false, error: String(e).includes('SOLD_OUT') ? 'uitverkocht' : 'mislukt' })
      }
    }
    return { ok: true, mode: 'list', created: results.filter((r) => r.ok).length, total: people.length, results }
  }

  // Modus B: alleen een aantal → één order met N tickets (bv crewlot zonder namen)
  const count = Number(body.count ?? 0)
  if (!Number.isInteger(count) || count < 1 || count > 500) throw new Error('bad_count')
  const r = await createComp({ type_id: type.id, qty: count, name: 'Crew', email: body.email || undefined }, cfg)
  return { ok: true, mode: 'count', created: count, short_ref: r.short_ref, ticket_link: r.ticket_link }
}

// Volledige momentopname van alle verkoopdata (voor download/herstel)
async function fullBackup() {
  const grab = async (table: string, cols = '*') => (await sb.from(table).select(cols)).data ?? []
  const [orders, order_items, tickets, scans, payment_events, ticket_types, discount_codes, form_fields, inventory] =
    await Promise.all([
      grab('orders'), grab('order_items'), grab('tickets'), grab('scans'), grab('payment_events'),
      grab('ticket_types'), grab('discount_codes'), grab('form_fields'), grab('inventory'),
    ])
  return {
    exported_at: new Date().toISOString(),
    counts: { orders: orders.length, tickets: tickets.length, scans: scans.length },
    orders, order_items, tickets, scans, payment_events, ticket_types, discount_codes, form_fields, inventory,
  }
}

// Gastenexport per groep: filter op dag (thu/fri/sat/sun) en/of tickettype.
// Bijv. alle gasten zaterdag, of alle "Proeverij Italië"-gasten zondag.
const DAY_LABEL: Record<string, string> = { thu: 'donderdag', fri: 'vrijdag', sat: 'zaterdag', sun: 'zondag' }
function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[";\n]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s
}
function ageFromBirthdate(val: string | null | undefined): string {
  if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return ''
  const b = new Date(val + 'T00:00:00Z'), ref = new Date('2027-06-10T00:00:00Z')
  let age = ref.getUTCFullYear() - b.getUTCFullYear()
  const m = ref.getUTCMonth() - b.getUTCMonth()
  if (m < 0 || (m === 0 && ref.getUTCDate() < b.getUTCDate())) age--
  return age >= 0 && age < 130 ? String(age) : ''
}

async function guestsCsv(day: string, type: string) {
  const { data: types } = await sb.from('apero_ticket_types').select('id, name_nl')
  const typeName: Record<string, string> = {}
  for (const t of types ?? []) typeName[t.id] = t.name_nl
  const { data: fields } = await sb.from('apero_form_fields').select('key, label_nl, scope, sort').eq('active', true).order('sort')
  const orderFields = (fields ?? []).filter((f) => f.scope === 'order' && f.key !== 'geboortedatum')
  const ticketFields = (fields ?? []).filter((f) => f.scope === 'ticket' && f.key !== 'holder_name')

  let q = sb.from('apero_tickets')
    .select('code, holder_name, valid_days, ticket_type_id, custom_data, orders:apero_orders!inner(short_ref, buyer_name, buyer_email, custom_data, status)')
    .eq('status', 'valid').eq('orders.status', 'paid')
  if (['thu', 'fri', 'sat', 'sun'].includes(day)) q = q.contains('valid_days', [day])
  if (type) q = q.eq('ticket_type_id', type)
  const { data, error } = await q
  if (error) throw error

  const header = ['ticketcode', 'naam', 'email', 'tickettype', 'geldige_dagen', 'woonplaats', 'leeftijd']
    .concat(orderFields.map((f) => f.label_nl)).concat(ticketFields.map((f) => f.label_nl))
  const rows = [header.map(csvCell).join(';')]
  const guests = (data ?? []) as Array<Record<string, any>>
  guests.sort((a, b) => String(a.orders?.buyer_name ?? '').localeCompare(String(b.orders?.buyer_name ?? '')))
  for (const t of guests) {
    const o = t.orders ?? {}
    const od = (o.custom_data?.order ?? {}) as Record<string, string>
    const td = (t.custom_data ?? {}) as Record<string, string>
    const line = [
      t.code,
      t.holder_name || o.buyer_name || '',
      o.buyer_email || '',
      typeName[t.ticket_type_id] || t.ticket_type_id,
      (t.valid_days ?? []).map((d: string) => DAY_LABEL[d] || d).join(' + '),
      od.woonplaats || '',
      ageFromBirthdate(od.geboortedatum),
    ].concat(orderFields.map((f) => od[f.key] ?? '')).concat(ticketFields.map((f) => td[f.key] ?? ''))
    rows.push(line.map(csvCell).join(';'))
  }
  const parts = ['apero-gasten']
  if (day) parts.push(DAY_LABEL[day] || day)
  if (type) parts.push((typeName[type] || type).toLowerCase().replace(/[^a-z0-9]+/g, '-'))
  return { csv: rows.join('\n'), filename: parts.join('-') + '.csv', count: rows.length - 1 }
}

async function exportCsv() {
  const { data, error } = await sb.from('apero_orders')
    .select('short_ref, status, channel, buyer_email, buyer_name, total_cents, service_fee_cents, transaction_fee_cents, discount_cents, mollie_payment_id, paid_at, created_at, discount_codes:apero_discount_codes!apero_orders_discount_code_id_fkey(code), order_items:apero_order_items(ticket_type_id, quantity, unit_price_cents, vat_rate)')
    .order('created_at')
  if (error) throw error
  const rows = ['datum;referentie;status;kanaal;email;naam;tickettype;aantal;stukprijs_eur;btw_pct;regel_eur;kortingscode;korting_eur;servicefee_eur;transactiebijdrage_eur;order_totaal_eur;mollie_id;betaald_op']
  for (const o of data ?? []) {
    for (const it of (o.order_items ?? []) as Array<{ ticket_type_id: string; quantity: number; unit_price_cents: number; vat_rate: number }>) {
      rows.push([
        o.created_at?.slice(0, 10),
        o.short_ref,
        o.status,
        o.channel,
        o.buyer_email,
        (o.buyer_name ?? '').replaceAll(';', ','),
        it.ticket_type_id,
        it.quantity,
        (it.unit_price_cents / 100).toFixed(2).replace('.', ','),
        String(it.vat_rate).replace('.', ','),
        ((it.quantity * it.unit_price_cents) / 100).toFixed(2).replace('.', ','),
        o.discount_codes?.code ?? '',
        (o.discount_cents / 100).toFixed(2).replace('.', ','),
        (o.service_fee_cents / 100).toFixed(2).replace('.', ','),
        ((o.transaction_fee_cents ?? 0) / 100).toFixed(2).replace('.', ','),
        (o.total_cents / 100).toFixed(2).replace('.', ','),
        o.mollie_payment_id ?? '',
        o.paid_at ?? '',
      ].join(';'))
    }
  }
  return rows.join('\n')
}
