// GET /functions/v1/apero/unsubscribe?e=<email>&t=<hmac>&l=<nl|en>  (publiek, vanuit afmeldlink in mail)
// Verifieert het HMAC-token, zet het adres in email_optout, en toont een nette bevestigingspagina.
import { config, sb, unsubToken } from '../shared.ts'

export default async function handler(req: Request): Promise<Response>  {
  const cfg = await config()
  const url = new URL(req.url)
  const email = (url.searchParams.get('e') || '').trim().toLowerCase()
  const t = url.searchParams.get('t') || ''
  const nl = (url.searchParams.get('l') || 'nl') !== 'en'
  const page = (title: string, msg: string) =>
    new Response(htmlPage(title, msg, nl), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } })

  if (!email || !t) return page(nl ? 'Er ging iets mis' : 'Something went wrong', nl ? 'Deze afmeldlink is onvolledig.' : 'This unsubscribe link is incomplete.')
  const valid = (await unsubToken(email, cfg)) === t
  if (!valid) return page(nl ? 'Link klopt niet' : 'Invalid link', nl ? 'Deze afmeldlink is niet geldig of verlopen.' : 'This unsubscribe link is not valid.')

  await sb.from('apero_email_optout').upsert({ email })
  return page(
    nl ? 'Je bent afgemeld' : "You're unsubscribed",
    nl ? 'Je ontvangt geen herinneringsmails meer van APÉRO Festival. Toch nog tickets? Je bent altijd welkom op de site.'
       : 'You will no longer receive reminder emails from APÉRO Festival. Changed your mind? You are always welcome on the site.',
  )
}

function htmlPage(title: string, msg: string, nl: boolean): string {
  return `<!doctype html><html lang="${nl ? 'nl' : 'en'}"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="robots" content="noindex,nofollow"/><title>${title}</title>
<style>body{margin:0;background:#F4EAD6;color:#231B13;font-family:Georgia,serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}.b{max-width:440px;background:#fff;border-radius:18px;padding:38px 30px;box-shadow:0 14px 40px rgba(35,27,19,.12);text-align:center}h1{font-size:22px;margin:0 0 12px}p{font-size:15px;line-height:1.6;color:rgba(35,27,19,.7);margin:0 0 22px}a{display:inline-block;background:#231B13;color:#F4EAD6;text-decoration:none;padding:12px 26px;border-radius:100px;font-size:15px}</style>
</head><body><div class="b"><h1>${title}</h1><p>${msg}</p><a href="https://www.apero-culture.com">${nl ? 'Naar de site' : 'To the site'}</a></div></body></html>`
}
