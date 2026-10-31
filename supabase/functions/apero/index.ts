// APÉRO Festival · één edge function voor de hele kaartverkoop.
// /functions/v1/apero/<route>[/<actie>]
// Elke route is een kopie van de gelijknamige NvdW-function, met eigen
// apero_*-tabellen. verify_jwt staat uit: elke route regelt zijn eigen
// toegang (publiek, order-token, scannerlogin of x-admin-key).
import admin from './h/admin.ts'
import backup from './h/backup.ts'
import cleanupExpired from './h/cleanup-expired.ts'
import createOrder from './h/create-order.ts'
import mollieWebhook from './h/mollie-webhook.ts'
import orderStatus from './h/order-status.ts'
import personalize from './h/personalize.ts'
import quote from './h/quote.ts'
import resendTickets from './h/resend-tickets.ts'
import scan from './h/scan.ts'
import shopConfig from './h/shop-config.ts'
import swapTicket from './h/swap-ticket.ts'
import ticketFields from './h/ticket-fields.ts'
import ticketRefund from './h/ticket-refund.ts'
import ticketVoid from './h/ticket-void.ts'
import unsubscribe from './h/unsubscribe.ts'
import viltje from './h/viltje.ts'
import waitlist from './h/waitlist.ts'

const ROUTES: Record<string, (req: Request) => Promise<Response>> = {
  'admin': admin,
  'backup': backup,
  'cleanup-expired': cleanupExpired,
  'create-order': createOrder,
  'mollie-webhook': mollieWebhook,
  'order-status': orderStatus,
  'personalize': personalize,
  'quote': quote,
  'resend-tickets': resendTickets,
  'scan': scan,
  'shop-config': shopConfig,
  'swap-ticket': swapTicket,
  'ticket-fields': ticketFields,
  'ticket-refund': ticketRefund,
  'ticket-void': ticketVoid,
  'unsubscribe': unsubscribe,
  'viltje': viltje,
  'waitlist': waitlist,
}

Deno.serve((req: Request) => {
  const parts = new URL(req.url).pathname.split('/').filter(Boolean)
  const i = parts.indexOf('apero')
  const route = i >= 0 ? parts[i + 1] ?? '' : ''
  const h = ROUTES[route]
  if (!h) {
    return new Response(JSON.stringify({ error: 'unknown_route', route }), {
      status: 404, headers: { 'Content-Type': 'application/json' },
    })
  }
  return h(req)
})
