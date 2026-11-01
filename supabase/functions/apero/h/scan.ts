// Scan-app met eigen gebruikers per persoon (scanner_users).
//
// App (headers x-scan-login + x-scan-pin):
//   POST ?action=login            -> profiel + dag van vandaag + testmodus
//   POST ?action=scan  { code }   -> uitslag via RPC scan_ticket_v2
// Beheer (x-admin-key, ADMIN_KEY / _FRANK / _NIENKE):
//   GET  ?action=users            -> gebruikers + testdag + tellers
//   POST ?action=create  { name, login, categories, days }      -> { pin } (eenmalig)
//   POST ?action=update  { id, name?, categories?, days?, active? }
//   POST ?action=reset_pin { id } -> { pin }
//   POST ?action=delete  { id }
//   POST ?action=test_day { day: 'thu'|'fri'|'sat'|'sun'|'' }
//   POST ?action=clear_test       -> testscans wissen
//
// Testmodus: buiten de echte festivaldagen scant de app op SCAN_TEST_DAY. Die
// scans tellen in scan_test_admits en raken tickets.admitted_days NIET, dus
// echte tickets van bezoekers blijven onaangeroerd.
import { config, corsHeaders, json, resetConfigCache, safeEqual, sb, sha256hexFull } from '../shared.ts'

// De echte festivaldagen staan in apero_app_config.FESTIVAL_DATES als
// {"2027-06-10":"thu",...}; zolang die leeg is draait de scanner in testmodus.
function festivalDays(cfg: Record<string, string>): Record<string, string> {
  try {
    const v = JSON.parse(cfg.FESTIVAL_DATES || '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}
const DAYS = ['thu', 'fri', 'sat', 'sun']
const CATEGORIES = ['entree', 'tafel', 'workshop']
const MAX_FAILS = 10

function today(cfg: Record<string, string>): { day: string | null; test: boolean } {
  const d = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Amsterdam' })
  const fd = festivalDays(cfg)
  if (DAYS.includes(fd[d])) return { day: fd[d], test: false }
  if (DAYS.includes(cfg.SCAN_TEST_DAY ?? '')) return { day: cfg.SCAN_TEST_DAY, test: true }
  return { day: null, test: true }
}

function normLogin(s: unknown): string {
  return String(s ?? '').trim().toLowerCase().replace(/\s+/g, '')
}

function randomPin(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000
  return String(n).padStart(6, '0')
}

const pinHash = (login: string, pin: string) => sha256hexFull('apero-scan:' + login + ':' + pin)

function cleanList(v: unknown, allowed: string[]): string[] | null {
  if (!Array.isArray(v)) return null
  const out = [...new Set(v.map(String).filter((x) => allowed.includes(x)))]
  return out
}

type ScanUser = { id: string; name: string; login: string; categories: string[]; days: string[]; active: boolean }

async function authUser(req: Request): Promise<{ user?: ScanUser; error?: string }> {
  const login = normLogin(req.headers.get('x-scan-login'))
  const pin = String(req.headers.get('x-scan-pin') ?? '').trim()
  if (!login || !/^\d{6}$/.test(pin)) return { error: 'login_onjuist' }
  const { data: u } = await sb.from('apero_scanner_users').select('*').eq('login', login).maybeSingle()
  if (!u) return { error: 'login_onjuist' }
  if (u.failed_attempts >= MAX_FAILS) return { error: 'geblokkeerd' }
  if (!safeEqual(await pinHash(login, pin), u.pin_hash)) {
    await sb.from('apero_scanner_users').update({ failed_attempts: u.failed_attempts + 1 }).eq('id', u.id)
    return { error: 'login_onjuist' }
  }
  if (!u.active) return { error: 'uitgezet' }
  await sb.from('apero_scanner_users').update({ failed_attempts: 0, last_used_at: new Date().toISOString() }).eq('id', u.id)
  return { user: u as ScanUser }
}

export default async function handler(req: Request): Promise<Response>  {
  const cfg = await config()
  const cors = corsHeaders(req, cfg)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  const action = new URL(req.url).searchParams.get('action') ?? ''
  let body: Record<string, unknown> = {}
  if (req.method === 'POST') {
    try {
      body = await req.json()
    } catch {
      body = {}
    }
  }

  // ===== App =====
  if (action === 'login' || action === 'scan') {
    const { user, error } = await authUser(req)
    if (!user) return json(error === 'login_onjuist' ? 401 : 403, { error }, cors)
    const t = today(cfg)
    const dayAllowed = !!t.day && user.days.includes(t.day)

    if (action === 'login') {
      return json(200, {
        name: user.name, categories: user.categories, days: user.days,
        day: t.day, test: t.test, day_allowed: dayAllowed,
      }, cors)
    }

    if (!t.day) return json(200, { result: 'no_day', test: t.test }, cors)
    if (!dayAllowed) return json(200, { result: 'scanner_day', day: t.day, days: user.days, test: t.test }, cors)

    let code = String(body.code ?? '').trim().toUpperCase()
    if (code.startsWith('APERO1.')) code = code.slice(7)
    code = code.replaceAll('-', '')
    if (!/^[0-9A-Z]{4,40}$/.test(code)) {
      return json(200, { result: 'invalid_code', day: t.day, test: t.test }, cors)
    }
    const { data, error: rpcErr } = await sb.rpc('apero_scan_ticket_v2', {
      p_code: code, p_day: t.day, p_user: user.id, p_categories: user.categories,
      p_device: user.name.slice(0, 60), p_test: t.test,
    })
    if (rpcErr) {
      console.error('scan_ticket_v2 failed', rpcErr)
      return json(500, { error: 'internal' }, cors)
    }
    return json(200, { ...data, day: t.day, test: t.test }, cors)
  }

  // ===== Beheer =====
  const key = req.headers.get('x-admin-key') ?? ''
  const validKeys = [cfg.ADMIN_KEY, cfg.ADMIN_KEY_FRANK, cfg.ADMIN_KEY_NIENKE].filter(Boolean) as string[]
  if (!validKeys.some((k) => safeEqual(k, key))) return json(401, { error: 'unauthorized' }, cors)

  if (req.method === 'GET' && action === 'users') {
    const { data: users } = await sb.from('apero_scanner_users')
      .select('id,name,login,categories,days,active,created_at,last_used_at,failed_attempts')
      .order('created_at')
    const t = today(cfg)
    const { data: counts } = await sb.from('apero_scans')
      .select('scanner_user_id,result,test')
      .not('scanner_user_id', 'is', null)
    const per: Record<string, { ok: number; bad: number }> = {}
    for (const s of counts ?? []) {
      if (s.test !== t.test) continue
      const p = per[s.scanner_user_id] ??= { ok: 0, bad: 0 }
      if (s.result === 'admitted') p.ok++
      else p.bad++
    }
    return json(200, {
      users: (users ?? []).map((u) => ({ ...u, locked: u.failed_attempts >= MAX_FAILS, scans: per[u.id] ?? { ok: 0, bad: 0 } })),
      test_day: cfg.SCAN_TEST_DAY ?? '', day: t.day, test: t.test,
    }, cors)
  }

  if (req.method !== 'POST') return json(404, { error: 'not_found' }, cors)

  if (action === 'create') {
    const name = String(body.name ?? '').trim().slice(0, 60)
    const login = normLogin(body.login || name).slice(0, 30)
    const categories = cleanList(body.categories, CATEGORIES)
    const days = cleanList(body.days, DAYS)
    if (!name || !login) return json(400, { error: 'naam_ontbreekt' }, cors)
    if (!categories?.length) return json(400, { error: 'kies_soort' }, cors)
    if (!days?.length) return json(400, { error: 'kies_dag' }, cors)
    const pin = randomPin()
    const { data, error } = await sb.from('apero_scanner_users')
      .insert({ name, login, categories, days, pin_hash: await pinHash(login, pin) })
      .select('id,name,login').single()
    if (error) {
      if (error.code === '23505') return json(409, { error: 'login_bestaat' }, cors)
      console.error('scanner_users create', error)
      return json(500, { error: 'internal' }, cors)
    }
    return json(200, { ...data, pin }, cors)
  }

  const id = String(body.id ?? '')

  if (action === 'update') {
    const patch: Record<string, unknown> = {}
    if (body.name !== undefined) patch.name = String(body.name).trim().slice(0, 60)
    if (body.categories !== undefined) {
      const c = cleanList(body.categories, CATEGORIES)
      if (!c?.length) return json(400, { error: 'kies_soort' }, cors)
      patch.categories = c
    }
    if (body.days !== undefined) {
      const d = cleanList(body.days, DAYS)
      if (!d?.length) return json(400, { error: 'kies_dag' }, cors)
      patch.days = d
    }
    if (body.active !== undefined) patch.active = body.active === true
    const { error } = await sb.from('apero_scanner_users').update(patch).eq('id', id)
    if (error) return json(500, { error: 'internal' }, cors)
    return json(200, { ok: true }, cors)
  }

  if (action === 'reset_pin') {
    const { data: u } = await sb.from('apero_scanner_users').select('login').eq('id', id).maybeSingle()
    if (!u) return json(404, { error: 'not_found' }, cors)
    const pin = randomPin()
    await sb.from('apero_scanner_users').update({ pin_hash: await pinHash(u.login, pin), failed_attempts: 0 }).eq('id', id)
    return json(200, { pin }, cors)
  }

  if (action === 'delete') {
    await sb.from('apero_scanner_users').delete().eq('id', id)
    return json(200, { ok: true }, cors)
  }

  if (action === 'test_day') {
    const day = String(body.day ?? '')
    if (day && !DAYS.includes(day)) return json(400, { error: 'bad_day' }, cors)
    await sb.from('apero_app_config').upsert({ key: 'SCAN_TEST_DAY', value: day })
    resetConfigCache()
    return json(200, { ok: true }, cors)
  }

  if (action === 'clear_test') {
    await sb.from('apero_scan_test_admits').delete().not('ticket_id', 'is', null)
    await sb.from('apero_scans').delete().eq('test', true)
    return json(200, { ok: true }, cors)
  }

  return json(404, { error: 'not_found' }, cors)
}
