// GET /functions/v1/apero/shop-config  (publiek)
// Levert alles wat de shop nodig heeft: tickettypes, koopvelden, servicefee,
// evenement-info en ticketontwerp. Eén bron van waarheid voor de frontend.
import { config, corsHeaders, json, sb } from '../shared.ts'

export default async function handler(req: Request): Promise<Response>  {
  const cfg = await config()
  const cors = corsHeaders(req, cfg)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  // Uptime-checks (UptimeRobot e.d.) pingen standaard met HEAD: antwoord 200 zodat de monitor groen is
  if (req.method === 'HEAD') return new Response(null, { status: 200, headers: cors })
  if (req.method !== 'GET') return json(405, { error: 'method_not_allowed' }, cors)

  const { data: rawTypes } = await sb.from('apero_ticket_types')
    .select('id, name_nl, name_en, description_nl, description_en, price_cents, vat_rate, max_per_order, admits_count, valid_days, family, sort_order, active, per_type_cap, per_type_sold, sale_state, sale_starts_at, sale_ends_at')
    .eq('active', true).eq('public', true).order('sort_order')

  const now = Date.now()
  // Effectieve staat per type: available | sold_out | coming_soon | expired
  function effState(t: Record<string, unknown>): string {
    if (t.per_type_cap != null && (t.per_type_sold as number) >= (t.per_type_cap as number)) return 'sold_out'
    if (t.sale_state === 'sold_out') return 'sold_out'
    if (t.sale_state === 'coming_soon') return 'coming_soon'
    if (t.sale_starts_at && now < new Date(t.sale_starts_at as string).getTime()) return 'coming_soon'
    if (t.sale_ends_at && now >= new Date(t.sale_ends_at as string).getTime()) return 'expired'
    return 'available'
  }
  // Verlopen types (voorbij hun verkoopperiode) tonen we niet meer
  const types = (rawTypes ?? [])
    .map((t) => ({ ...t, _state: effState(t) }))
    .filter((t) => t._state !== 'expired')

  const soldOutTypes = types.filter((t) => t._state === 'sold_out').map((t) => t.id)

  // Add-ons (workshops, tafels) komen later; de shop kent het veld al.
  const extras: Record<string, unknown>[] = []

  const { data: fields } = await sb.from('apero_form_fields')
    .select('key, scope, label_nl, label_en, type, options, required, sort, applies_to')
    .eq('active', true).order('sort')

  const { data: inv } = await sb.from('apero_inventory').select('day, capacity, sold')
  const soldOut: Record<string, boolean> = {}
  for (const r of inv ?? []) soldOut[r.day] = r.sold >= r.capacity

  return json(200, {
    service_fee_cents: parseInt(cfg.SERVICE_FEE_CENTS ?? '0', 10) || 0,
    service_fee_mode: cfg.SERVICE_FEE_MODE === 'ticket' ? 'ticket' : 'order',
    transaction_fee_cents: parseInt(cfg.TRANSACTION_FEE_CENTS ?? '0', 10) || 0,
    types: types.map((t) => ({
      ...t,
      per_type_sold: undefined,
      sale_state: undefined, sale_starts_at: undefined, sale_ends_at: undefined, _state: undefined,
      state: t._state, // available | sold_out | coming_soon
      // alleen tonen wanneer 'later beschikbaar' door een startdatum
      available_from: (t._state === 'coming_soon' && t.sale_starts_at) ? t.sale_starts_at : undefined,
    })),
    fields: fields ?? [],
    sold_out: soldOut,
    sold_out_types: soldOutTypes,
    extras,
    event: {
      name: cfg.EVENT_NAME ?? 'APÉRO Festival',
      edition: cfg.EVENT_EDITION ?? '',
      location: cfg.EVENT_LOCATION ?? '',
      dates_nl: cfg.EVENT_DATES_NL ?? '',
      dates_en: cfg.EVENT_DATES_EN ?? '',
      shop_open: cfg.SHOP_OPEN !== '0',
    },
    ticket_design: {
      accent: cfg.TICKET_ACCENT ?? '#C45F38',
      ink: cfg.TICKET_INK ?? '#231B13',
      bg: cfg.TICKET_BG ?? '#F4EAD6',
      note_nl: cfg.TICKET_NOTE_NL ?? '',
      note_en: cfg.TICKET_NOTE_EN ?? '',
    },
  }, cors)
}
