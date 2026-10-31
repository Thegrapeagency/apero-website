// POST /functions/v1/apero-ticket-fields   (x-admin-key)
// Vult of wijzigt de antwoorden bij één ticket, bijvoorbeeld een allergie die
// een gast pas na het boeken doorgeeft. Schrijft naar tickets.custom_data: dat
// is precies waar de kassa het antwoord neerzet en waar de gastenlijst het
// uitleest, zodat er tijdens het event één lijst is en geen tweede.
//
// Bewust een losse functie: de admin-functie is te groot om veilig te
// herdeployen zonder de Supabase CLI, en dit hoort bij dezelfde sleutel.
import { config, corsHeaders, json, safeEqual, sb } from './shared.ts'

Deno.serve(async (req: Request) => {
  const cfg = await config()
  const cors = corsHeaders(req, cfg)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, cors)

  // Dezelfde twee sleutels als het dashboard (Milan en Frank)
  const key = req.headers.get('x-admin-key') ?? ''
  const validKeys = [cfg.ADMIN_KEY, cfg.ADMIN_KEY_FRANK].filter(Boolean) as string[]
  if (!validKeys.some((k) => safeEqual(k, key))) return json(401, { error: 'unauthorized' }, cors)

  let body: { ticket_id?: string; fields?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'bad_json' }, cors)
  }

  const id = String(body.ticket_id ?? '').trim()
  if (!id) return json(400, { error: 'ticket_id_ontbreekt' }, cors)

  // Alleen sleutels die als ticketvraag in het dashboard staan. Zo kan er nooit
  // een los veld ontstaan dat de gastenlijst niet kent.
  const { data: defs, error: defErr } = await sb.from('apero_form_fields')
    .select('key').eq('active', true).eq('scope', 'ticket')
  if (defErr) {
    console.error('form_fields lezen mislukt', defErr)
    return json(500, { error: 'internal' }, cors)
  }
  const toegestaan = new Set((defs ?? []).map((f) => f.key as string))

  const { data: ticket, error: tErr } = await sb.from('apero_tickets')
    .select('id, code, custom_data').eq('id', id).maybeSingle()
  if (tErr) {
    console.error('ticket lezen mislukt', tErr)
    return json(500, { error: 'internal' }, cors)
  }
  if (!ticket) return json(404, { error: 'ticket_niet_gevonden' }, cors)

  const nieuw = { ...((ticket.custom_data ?? {}) as Record<string, unknown>) }
  const genegeerd: string[] = []
  for (const [k, v] of Object.entries(body.fields ?? {})) {
    if (!toegestaan.has(k)) { genegeerd.push(k); continue }
    const waarde = String(v ?? '').trim().slice(0, 500)
    if (waarde) nieuw[k] = waarde
    else delete nieuw[k]
  }

  const { error: upErr } = await sb.from('apero_tickets').update({ custom_data: nieuw }).eq('id', id)
  if (upErr) {
    console.error('ticket bijwerken mislukt', upErr)
    return json(500, { error: 'internal' }, cors)
  }
  return json(200, { ok: true, code: ticket.code, custom_data: nieuw, genegeerd }, cors)
})
