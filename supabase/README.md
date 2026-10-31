# APÉRO · kaartverkoop (Supabase)

Kopie van de NvdW-ticketing, in hetzelfde Supabase-project (`snfojphxsbzfewwfbfka`)
maar volledig gescheiden: alle tabellen en functies hebben een `apero_`-prefix.

- `functions/apero/` is één edge function met routes: `/apero/shop-config`,
  `/apero/create-order`, `/apero/mollie-webhook`, `/apero/admin/<actie>`, `/apero/scan`,
  `/apero/viltje`, enzovoort (zie `index.ts`). Elke route staat in `h/`.
- Uitrollen: bundel met esbuild en deploy als function `apero` (verify_jwt uit):
  `npx esbuild functions/apero/index.ts --bundle --format=esm --platform=neutral --minify '--external:npm:*' --outfile=/tmp/apero.js`
- Config staat in `apero_app_config` (beheersleutels, servicekosten, data, locatie).
- Testmodus: zet `MOLLIE_STUB=1` in `apero_app_config`. Nu uit: echte betalingen.
