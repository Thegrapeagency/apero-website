/* APÉRO ticketshop (kopie van de NvdW-shop v2) — cart op index#ticketshop, polling op bedankt, render op tickets.
   Alles dynamisch uit /shop-config: tickettypes, koopvelden, servicefee, kortingen,
   evenement-info en ticketontwerp. Prijzen hier zijn display; de server herrekent alles. */
(function () {
  "use strict";

  var API = "https://snfojphxsbzfewwfbfka.supabase.co/functions/v1/apero";
  var SHOP_LIVE = true;
  var STORAGE = window.localStorage;
  if (/[?&]shop=1/.test(location.search)) { try { STORAGE.setItem("apero-shop-preview", "1"); } catch (e) {} }
  var ENABLED = SHOP_LIVE || (function () { try { return STORAGE.getItem("apero-shop-preview") === "1"; } catch (e) { return false; } })();

  var CFG = null; // shop-config payload

  function lang() { return document.documentElement.getAttribute("lang") === "en" ? "en" : "nl"; }
  function t(nl, en) { return lang() === "en" ? en : nl; }
  function euroPlain(cents) { return Math.floor(cents / 100) + "," + ("0" + (cents % 100)).slice(-2); }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // De precieze data in juni 2027 staan nog niet vast: dagen zonder datum.
  var DAY_LABEL = {
    thu: { nl: "donderdag", en: "Thursday" },
    fri: { nl: "vrijdag", en: "Friday" },
    sat: { nl: "zaterdag", en: "Saturday" },
    sun: { nl: "zondag", en: "Sunday" }
  };
  function dayLabel(d) { return DAY_LABEL[d] ? DAY_LABEL[d][lang()] : d; }
  var DAY_FULL = {
    thu: { nl: "Donderdag", en: "Thursday" },
    fri: { nl: "Vrijdag", en: "Friday" },
    sat: { nl: "Zaterdag", en: "Saturday" },
    sun: { nl: "Zondag", en: "Sunday" }
  };
  var DAY_DATE = {
    thu: { nl: "juni", en: "June" },
    fri: { nl: "juni", en: "June" },
    sat: { nl: "juni", en: "June" },
    sun: { nl: "juni", en: "June" }
  };
  function fmtDate(iso) {
    var d = new Date(iso); if (isNaN(d)) return "";
    var m = lang() === "en"
      ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      : ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
    return d.getDate() + " " + m[d.getMonth()];
  }

  function loadConfig() {
    return fetch(API + "/shop-config").then(function (r) { return r.json(); }).then(function (c) { CFG = c; return c; });
  }

  /* ============== CART (index.html) ============== */
  var shopRoot = document.getElementById("ticketshop");
  if (shopRoot && shopRoot.hasAttribute("data-shop") && ENABLED) {
    shopRoot.innerHTML = "<div class='shop'><div class='spinner'></div></div>";
    loadConfig().then(function () { initShop(shopRoot); }).catch(function () {
      shopRoot.innerHTML = "<p class='embed-empty'>" + esc(t("De ticketverkoop laadt niet. Probeer het later opnieuw.", "The ticket shop failed to load. Please try again later.")) + "</p>";
    });
  }

  function initShop(root) {
    var cart = {};                 // type_id -> qty
    var soldout = {};              // day -> true (uit config + live 409)
    // state: '' | 'checking' | 'ok' | 'invalid' | 'not_applicable' | 'bad'
    // cents komt van de server (/quote), zodat de samenvatting hetzelfde bedrag
    // toont als wat create-order straks afrekent.
    // Een actiepagina kan een code meegeven in de URL. De server blijft bij
    // afrekenen de enige bron van waarheid over de werkelijke korting.
    var prefilledDiscount = (new URLSearchParams(location.search).get("kortingscode") || "").trim().slice(0, 40);
    var discount = { code: prefilledDiscount, state: "", cents: 0 };
    var discountSeq = 0;       // volgnummer: alleen het laatste antwoord telt
    var discountTimer = null;  // hertelling na een mandjewijziging, samengevoegd
    var laatsteCartSig = "";   // mandje waarop de korting is berekend
    var soldoutTypes = {};
    var typeState = {};   // type_id -> 'available' | 'sold_out' | 'coming_soon'
    var selDay = "thu";        // dag-eerst: gekozen dag filtert wat zichtbaar is (mandje blijft per type)
    var checkoutInView = false;
    var cartbar = null;        // sticky afrekenbalk (op body, ontsnapt aan transform-ancestors)
    var comingFrom = {};  // type_id -> startdatum (ISO) bij 'later beschikbaar'
    Object.keys(CFG.sold_out || {}).forEach(function (d) { if (CFG.sold_out[d]) soldout[d] = true; });
    (CFG.types || []).forEach(function (ty) {
      typeState[ty.id] = ty.state || "available";
      if (ty.available_from) comingFrom[ty.id] = ty.available_from;
    });
    (CFG.sold_out_types || []).forEach(function (id) { soldoutTypes[id] = true; typeState[id] = "sold_out"; });
    // Add-ons (proeverijen/restaurant) delen dezelfde mandje-machinerie als tickets
    (CFG.extras || []).forEach(function (ex) { typeState[ex.id] = ex.state || "available"; });
    function avail(id) { return typeState[id] || "available"; }
    function isExtra(id) { return (CFG.extras || []).some(function (ex) { return ex.id === id; }); }

    // tickettypes groeperen per familie; losse types (geen family) als eigen groep
    var groups = [];
    var byFamily = {};
    CFG.types.slice().sort(function (a, b) { return a.sort_order - b.sort_order; }).forEach(function (ty) {
      var fam = ty.family || ("solo_" + ty.id);
      if (!byFamily[fam]) { byFamily[fam] = { key: fam, members: [], single: !ty.family }; groups.push(byFamily[fam]); }
      byFamily[fam].members.push(ty);
    });
    groups.forEach(function (g) {
      if (!g.single) g.members.sort(function (a, b) { return a.sort_order - b.sort_order; });
    });

    injectShopStyles();
    root.innerHTML = "";
    root.appendChild(build());
    render();
    new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

    // Afrekenbalk verbergen zodra de checkout zelf in beeld is (scroll-gebaseerd,
    // IntersectionObserver blijkt niet betrouwbaar bij verborgen/achtergrond-tabs)
    var cbTick = false;
    window.addEventListener("scroll", function () {
      if (cbTick) return;
      cbTick = true;
      setTimeout(function () { cbTick = false; updateCartbar(); }, 120);
    }, { passive: true });

    // Meta ViewContent: eenmalig wanneer de kassa in beeld komt
    if (typeof window.aperoTrack === "function" && "IntersectionObserver" in window) {
      var vcSent = false;
      var vcObs = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting && !vcSent) {
            vcSent = true;
            window.aperoTrack("ViewContent", { content_type: "product", content_name: "Ticketshop", content_category: "tickets" });
            vcObs.disconnect();
          }
        }
      }, { threshold: 0.1 });
      vcObs.observe(root);
    }

    function injectShopStyles() {
      if (document.getElementById("apero-shop-styles")) return;
      var css =
        "#ticketshop .shop-title{font-family:'Bodoni Moda',Georgia,serif;font-size:clamp(22px,5vw,30px);color:#231B13;margin:0 0 18px}" +
        "#ticketshop .shop-rows{display:grid;grid-template-columns:1fr;gap:14px}" +
        "@media (min-width:700px){#ticketshop .shop-rows{grid-template-columns:1fr 1fr;align-items:start}}" +
        "#ticketshop .day-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0 0 16px}" +
        "#ticketshop .day-tab{position:relative;background:#f7edd6;border:1.5px solid rgba(35,27,19,.16);border-radius:14px;padding:13px 6px 11px;cursor:pointer;text-align:center;font-family:inherit;transition:border-color .12s,box-shadow .12s,background .12s}" +
        "#ticketshop .day-tab:hover{border-color:rgba(35,27,19,.4)}" +
        "#ticketshop .day-tab .dt-day{display:block;font-family:'Bodoni Moda',Georgia,serif;font-weight:600;font-size:clamp(15px,4.2vw,19px);color:#231B13;line-height:1.15}" +
        "#ticketshop .day-tab .dt-date{display:block;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(35,27,19,.55);margin-top:3px}" +
        "#ticketshop .day-tab.is-sel{background:#C45F38;border-color:#C45F38;box-shadow:0 6px 16px rgba(196,95,56,.3)}" +
        "#ticketshop .day-tab.is-sel .dt-day{color:#F4EAD6}" +
        "#ticketshop .day-tab.is-sel .dt-date{color:#EEB24A}" +
        "#ticketshop .dt-count{position:absolute;top:-8px;right:-8px;background:#EEB24A;color:#231B13;font-size:12px;font-weight:700;min-width:22px;height:22px;border-radius:999px;display:none;align-items:center;justify-content:center;padding:0 6px;box-shadow:0 1px 4px rgba(35,27,19,.3)}" +
        "#ticketshop .dt-count.is-on{display:inline-flex}" +
        ".apero-cartbar{position:fixed;left:50%;bottom:16px;z-index:70;transform:translate(-50%,90px);display:flex;align-items:center;gap:14px;background:#C45F38;color:#F4EAD6;border-radius:999px;padding:9px 9px 9px 20px;box-shadow:0 12px 30px rgba(196,95,56,.38);opacity:0;pointer-events:none;transition:transform .25s ease,opacity .25s ease;max-width:calc(100vw - 24px);white-space:nowrap}" +
        ".apero-cartbar.is-on{opacity:1;pointer-events:auto;transform:translate(-50%,0)}" +
        ".apero-cartbar .cb-info{font-size:14.5px;font-weight:600}" +
        ".apero-cartbar .cb-btn{background:#EEB24A;color:#231B13;border:0;border-radius:999px;padding:11px 20px;font-size:14.5px;font-weight:700;cursor:pointer;font-family:inherit}" +
        "[data-theme='dark'] .apero-cartbar{border:1px solid rgba(244,234,214,.22)}" +
        "[data-theme='dark'] #ticketshop .day-tab{background:#060845;border-color:rgba(244,234,214,.18)}" +
        "[data-theme='dark'] #ticketshop .day-tab .dt-day{color:#F4EAD6}" +
        "[data-theme='dark'] #ticketshop .day-tab .dt-date{color:rgba(244,234,214,.55)}" +
        "[data-theme='dark'] #ticketshop .day-tab.is-sel{background:#F4EAD6;border-color:#F4EAD6}" +
        "[data-theme='dark'] #ticketshop .day-tab.is-sel .dt-day{color:#231B13}" +
        "[data-theme='dark'] #ticketshop .day-tab.is-sel .dt-date{color:#C45F38}" +
        "#ticketshop .shop-row{background:#f6e9cb;border:1px solid rgba(35,27,19,.12);border-radius:18px;padding:18px;box-shadow:0 6px 18px -14px rgba(35,27,19,.25)}" +
        "#ticketshop .shop-row.is-hot{border-color:rgba(196,95,56,.4)}" +
        "#ticketshop .shop-row.is-deal{border-color:rgba(254,183,42,.8);box-shadow:0 2px 14px rgba(254,183,42,.16)}" +
        "#ticketshop .shop-row-badge{display:inline-block;background:linear-gradient(100deg,#EEB24A,#F3C97A);color:#231B13;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;padding:4px 11px;margin-bottom:10px}" +
        "#ticketshop .shop-day-price s{color:rgba(35,27,19,.4);font-weight:500;margin-left:6px}" +
        "#ticketshop .shop-row.is-collapsed .shop-days{display:none}" +
        "#ticketshop .shop-row.is-disabled{opacity:.62}" +
        "#ticketshop .shop-row-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px}" +
        "#ticketshop .shop-row-name{font-family:'Bodoni Moda',Georgia,serif;font-weight:600;font-size:18px;color:#231B13;line-height:1.2}" +
        "#ticketshop .shop-row-price{font-weight:700;font-size:16px;color:#C45F38;white-space:nowrap}" +
        "#ticketshop .shop-row-desc{margin:6px 0 0;font-size:13.5px;line-height:1.5;color:rgba(35,27,19,.62)}" +
        "#ticketshop .shop-row-desc:empty{display:none}" +
        "#ticketshop .shop-row-status{display:inline-block;margin-top:10px;font-size:12.5px;font-weight:600;color:#C45F38;background:rgba(196,95,56,.08);border-radius:7px;padding:4px 10px}" +
        "#ticketshop .shop-days{display:flex;flex-direction:column;margin-top:14px}" +
        "#ticketshop .shop-day{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-top:1px solid rgba(35,27,19,.1)}" +
        "#ticketshop .wl-slot{flex:0 0 100%}" +
        "#ticketshop .shop-day:first-child{border-top:0;padding-top:2px}" +
        "#ticketshop .shop-day.is-disabled{opacity:.55}" +
        "#ticketshop .shop-day-info{min-width:0;flex:1 1 auto}" +
        "#ticketshop .shop-day-label{font-weight:600;font-size:15px;color:#231B13;white-space:nowrap}" +
        "#ticketshop .shop-day-price{font-size:13.5px;color:#C45F38;font-weight:600;margin-top:2px}" +
        "#ticketshop .shop-day-price.is-soon,#ticketshop .shop-day-price.is-out{color:rgba(35,27,19,.5);font-weight:500}" +
        "#ticketshop .stepper{display:flex;align-items:center;gap:10px;flex:0 0 auto}" +
        "#ticketshop .shop-row>.stepper{margin-top:14px;justify-content:flex-end}" +
        "#ticketshop .step-btn{width:42px;height:42px;min-width:42px;border-radius:50%;border:1.5px solid #C45F38;background:transparent;color:#C45F38;font-size:22px;line-height:1;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;-webkit-tap-highlight-color:transparent;transition:background .12s,color .12s,transform .05s}" +
        "#ticketshop .step-btn:hover{background:#C45F38;color:#F4EAD6}" +
        "#ticketshop .step-btn:active{transform:scale(.92)}" +
        "#ticketshop .step-plus{background:#C45F38;color:#F4EAD6;border-color:#C45F38}" +
        "#ticketshop .step-plus:hover{filter:brightness(1.1)}" +
        "#ticketshop .step-count{min-width:26px;text-align:center;font-size:17px;font-weight:700;color:#231B13;font-variant-numeric:tabular-nums}" +
        "#ticketshop .shop-summary{margin-top:22px;background:#EBDCBE;border:1px solid rgba(35,27,19,.08);border-radius:16px;padding:16px 20px}" +
        "#ticketshop .shop-empty{color:rgba(35,27,19,.55);font-size:14px}" +
        "#ticketshop .sum-line{display:flex;justify-content:space-between;gap:12px;padding:7px 0;font-size:14.5px;color:#231B13}" +
        "#ticketshop .sum-line.sum-disc{color:#1e7a3c}" +
        "#ticketshop .sum-line.sum-fee{color:rgba(35,27,19,.5);font-size:13px}" +
        "#ticketshop .sum-total{border-top:2px solid rgba(35,27,19,.15);margin-top:6px;padding-top:12px;font-family:'Bodoni Moda',Georgia,serif;font-weight:700;font-size:19px}" +
        "#ticketshop .sum-vat{font-size:12px;color:rgba(35,27,19,.5);margin:8px 0 0}" +
        "#ticketshop .sum-warn{font-size:13px;line-height:1.45;color:#231B13;margin:12px 0 0;padding:10px 12px;border-left:3px solid #C45F38;background:rgba(196,95,56,.09)}" +
        "#ticketshop .shop-form{display:flex;flex-direction:column;gap:12px;margin-top:20px}" +
        "#ticketshop .shop-form input,#ticketshop .shop-fields input,#ticketshop .shop-fields select{width:100%;padding:13px 15px;border:1px solid rgba(35,27,19,.2);border-radius:10px;font-size:16px;font-family:inherit;color:#231B13;background:#fffaf0}" +
        "#ticketshop input:focus,#ticketshop select:focus{outline:none;border-color:#C45F38;box-shadow:0 0 0 3px rgba(196,95,56,.12)}" +
        "#ticketshop .disc-wrap{display:flex;gap:8px}#ticketshop .disc-wrap input{flex:1}" +
        "#ticketshop .btn-ghost{background:transparent;border:1px solid rgba(35,27,19,.25);color:#231B13;border-radius:10px;padding:0 16px;font-weight:600;cursor:pointer;white-space:nowrap}" +
        "#ticketshop .disc-msg{margin:0;font-size:13px}#ticketshop .disc-msg.ok{color:#1e7a3c}#ticketshop .disc-msg.bad{color:#b3372e}#ticketshop .disc-msg:empty{display:none}" +
        "#ticketshop .shop-terms{display:flex;align-items:flex-start;gap:10px;font-size:14px;color:#231B13;line-height:1.45;cursor:pointer}" +
        "#ticketshop .shop-terms input{width:20px;height:20px;margin-top:1px;accent-color:#C45F38;flex:0 0 auto}" +
        "#ticketshop .btn-buy{background:#C45F38;color:#F4EAD6;border:0;border-radius:12px;padding:16px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit;transition:filter .12s,transform .05s}" +
        "#ticketshop .btn-buy:hover{filter:brightness(1.1)}#ticketshop .btn-buy:active{transform:translateY(1px)}" +
        "#ticketshop .hp{display:none!important}" +
        "#ticketshop .shop-error{color:#b3372e;font-size:14px;font-weight:500}#ticketshop .shop-error:empty{display:none}" +
        "#ticketshop .shop-fields{display:flex;flex-direction:column;gap:14px;margin-top:20px}" +
        "#ticketshop .field-group{display:flex;flex-direction:column;gap:10px}" +
        "#ticketshop .field-group h4{font-family:'Bodoni Moda',Georgia,serif;font-size:15px;color:#231B13;margin:0 0 2px}" +
        "#ticketshop .field-row{display:flex;flex-direction:column;gap:5px;font-size:13px;color:rgba(35,27,19,.7)}#ticketshop .field-row span{font-weight:500}" +
        "#ticketshop .field-check{display:flex;align-items:center;gap:9px;font-size:14px;color:#231B13}#ticketshop .field-check input{width:20px;height:20px;accent-color:#C45F38}" +
        "#ticketshop .ticket-fieldset{border:1px solid rgba(35,27,19,.1);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:8px}" +
        "#ticketshop .ticket-fieldset .tf-label{font-weight:600;font-size:13px;color:#C45F38}" +
        "#ticketshop .shop-extras{margin-top:20px;background:#EBDCBE;border:1px solid rgba(196,95,56,.28);border-radius:18px;padding:16px 18px}" +
        "#ticketshop .sx-eyebrow{font-family:'Bodoni Moda',Georgia,serif;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#C45F38}" +
        "#ticketshop .sx-sub{font-size:13px;color:rgba(35,27,19,.6);margin:2px 0 12px}" +
        "#ticketshop .sx-group{margin-top:16px}" +
        "#ticketshop .sx-group:first-of-type{margin-top:10px}" +
        "#ticketshop .sx-group{border:1px solid rgba(35,27,19,.16);border-radius:12px;padding:0 14px;margin-top:10px;background:rgba(244,234,214,.35)}" +
        "#ticketshop .sx-group[open]{padding-bottom:14px}" +
        "#ticketshop .sx-sum{display:flex;align-items:center;gap:10px;cursor:pointer;list-style:none;padding:14px 0}" +
        "#ticketshop .sx-sum::-webkit-details-marker{display:none}" +
        "#ticketshop .sx-sum::after{content:'';margin-left:auto;width:8px;height:8px;border-right:2px solid #C45F38;border-bottom:2px solid #C45F38;transform:rotate(45deg);transition:transform .2s}" +
        "#ticketshop .sx-group[open] .sx-sum::after{transform:rotate(-135deg)}" +
        "#ticketshop .sx-count{background:#C45F38;color:#F4EAD6;font-size:11px;font-weight:700;border-radius:999px;min-width:20px;padding:2px 7px;text-align:center}#ticketshop .sx-count:empty{display:none}" +
        "#ticketshop .sx-group-title{font-family:'Bodoni Moda',Georgia,serif;font-weight:600;font-size:16px;color:#231B13;margin:0}" +
        "#ticketshop .sx-list{display:flex;flex-direction:column;gap:10px}" +
        "@media (min-width:700px){#ticketshop .sx-list{display:grid;grid-template-columns:1fr 1fr;align-items:start}}" +
        "#ticketshop .sx-pill{display:inline-block;background:#C45F38;color:#F4EAD6;font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;border-radius:6px;padding:3px 8px;margin:0 0 5px 0;vertical-align:middle}#ticketshop .sx-meta .sx-pill{display:table}" +
        "#ticketshop .sx-desc{font-size:12.5px;color:rgba(35,27,19,.6);margin-top:4px;line-height:1.45}#ticketshop .sx-desc:empty{display:none}" +
        "#ticketshop .sx-card{display:flex;justify-content:space-between;align-items:center;gap:12px;background:#F4EAD6;border:1px solid rgba(35,27,19,.16);border-radius:12px;padding:13px 14px}" +
        "#ticketshop .sx-card .step-btn{border-color:#C45F38;background:transparent;color:#C45F38}" +
        "#ticketshop .sx-card .step-btn:hover{background:#C45F38;color:#F4EAD6}" +
        "#ticketshop .sx-card .step-plus{background:#C45F38;color:#F4EAD6;border-color:#C45F38}" +
        "#ticketshop .sx-card .step-count{color:#231B13}" +
        "#ticketshop .sx-card.is-disabled{opacity:.6}" +
        "#ticketshop .sx-info{min-width:0;flex:1 1 auto}" +
        "#ticketshop .sx-name{font-family:'Bodoni Moda',Georgia,serif;font-size:15.5px;color:#231B13;line-height:1.25}" +
        "#ticketshop .sx-meta{font-size:12.5px;color:rgba(35,27,19,.55);margin-top:2px}#ticketshop .sx-meta:empty{display:none}" +
        "#ticketshop .sx-price{font-size:14px;font-weight:700;color:#C45F38;margin-top:5px}#ticketshop .sx-price.is-out{color:rgba(35,27,19,.5);font-weight:600}" +
        "@media(min-width:560px){#ticketshop .shop-row{padding:22px 24px}#ticketshop .step-btn{width:40px;height:40px;min-width:40px}}";
      // Dark mode: het widget-CSS hierboven gaat uit van een lichte, crème achtergrond
      // (navy tekst, witte kaarten). Op [data-theme="dark"] is de pagina-achtergrond
      // zelf navy, dus tekst die direct op de pagina staat (geen witte kaart eromheen)
      // moet omklappen naar crème/terracotta, anders is hij onleesbaar (navy-op-navy).
      css +=
        "[data-theme='dark'] #ticketshop .shop-title{color:#F4EAD6}" +
        "[data-theme='dark'] #ticketshop .shop-row{background:#060845;border-color:rgba(244,234,214,.14)}" +
        "[data-theme='dark'] #ticketshop .shop-row.is-hot{border-color:rgba(172,89,90,.55);box-shadow:0 2px 12px rgba(172,89,90,.12)}" +
        "[data-theme='dark'] #ticketshop .shop-row-name{color:#F4EAD6}" +
        "[data-theme='dark'] #ticketshop .shop-row-price{color:#ac595a}" +
        "[data-theme='dark'] #ticketshop .shop-row-desc{color:rgba(244,234,214,.65)}" +
        "[data-theme='dark'] #ticketshop .shop-row-status{color:#ac595a;background:rgba(172,89,90,.16)}" +
        "[data-theme='dark'] #ticketshop .shop-day{border-top-color:rgba(244,234,214,.12)}" +
        "[data-theme='dark'] #ticketshop .shop-day-label{color:#F4EAD6}" +
        "[data-theme='dark'] #ticketshop .shop-day-price{color:#ac595a}" +
        "[data-theme='dark'] #ticketshop .shop-day-price.is-soon,[data-theme='dark'] #ticketshop .shop-day-price.is-out{color:rgba(244,234,214,.55)}" +
        "[data-theme='dark'] #ticketshop .step-count{color:#F4EAD6}" +
        "[data-theme='dark'] #ticketshop .shop-empty{color:rgba(244,234,214,.6)}" +
        "[data-theme='dark'] #ticketshop .sum-line{color:#F4EAD6}" +
        "[data-theme='dark'] #ticketshop .sum-line.sum-fee{color:rgba(244,234,214,.55)}" +
        "[data-theme='dark'] #ticketshop .sum-total{border-top-color:rgba(244,234,214,.2)}" +
        "[data-theme='dark'] #ticketshop .sum-vat{color:rgba(244,234,214,.55)}" +
        "[data-theme='dark'] #ticketshop .sum-warn{color:#F4EAD6;border-left-color:#EEB24A;background:rgba(254,183,42,.12)}" +
        "[data-theme='dark'] #ticketshop .shop-terms{color:#F4EAD6}" +
        "[data-theme='dark'] #ticketshop .btn-ghost{background:#060845;border-color:rgba(244,234,214,.25);color:#F4EAD6}" +
        "[data-theme='dark'] #ticketshop .disc-msg.ok{color:#4fae72}[data-theme='dark'] #ticketshop .disc-msg.bad{color:#e08a82}" +
        "[data-theme='dark'] #ticketshop .shop-error{color:#e08a82}" +
        "[data-theme='dark'] #ticketshop .field-group h4{color:#F4EAD6}" +
        "[data-theme='dark'] #ticketshop .field-row{color:rgba(244,234,214,.75)}" +
        "[data-theme='dark'] #ticketshop .field-check{color:#F4EAD6}" +
        "[data-theme='dark'] #ticketshop .ticket-fieldset{border-color:rgba(244,234,214,.18)}" +
        "[data-theme='dark'] #ticketshop .ticket-fieldset .tf-label{color:#ac595a}" +
        "[data-theme='dark'] #ticketshop .shop-extras{background:#0b0d4a;border-color:rgba(172,89,90,.42)}" +
        "[data-theme='dark'] #ticketshop .sx-eyebrow{color:#d98b8b}" +
        "[data-theme='dark'] #ticketshop .sx-sub{color:rgba(244,234,214,.6)}" +
        "[data-theme='dark'] #ticketshop .sx-group-title{color:#F4EAD6}" +
        "[data-theme='dark'] #ticketshop .sx-group{border-color:rgba(244,234,214,.14);background:transparent}" +
        "[data-theme='dark'] #ticketshop .sx-sum::after{border-color:#EEB24A}" +
        "[data-theme='dark'] #ticketshop .sx-count{background:#EEB24A;color:#231B13}" +
        "[data-theme='dark'] #ticketshop .sx-pill{background:#EEB24A;color:#231B13}" +
        "[data-theme='dark'] #ticketshop .sx-desc{color:rgba(244,234,214,.6)}" +
        "[data-theme='dark'] #ticketshop .shop-day-price s{color:rgba(244,234,214,.45)}" +
        "[data-theme='dark'] #ticketshop .shop-summary{background:#0b0d4a;border-color:rgba(244,234,214,.14)}" +
        "[data-theme='dark'] #ticketshop .sx-card .step-btn{border-color:rgba(244,234,214,.55);background:transparent;color:#F4EAD6}" +
        "[data-theme='dark'] #ticketshop .sx-card .step-btn:hover{background:#F4EAD6;color:#231B13}" +
        "[data-theme='dark'] #ticketshop .sx-card .step-plus{background:#EEB24A;color:#231B13;border-color:#EEB24A}" +
        "[data-theme='dark'] #ticketshop .sx-card .step-count{color:#F4EAD6}" +
        "[data-theme='dark'] #ticketshop .shop-form input,[data-theme='dark'] #ticketshop .shop-fields input,[data-theme='dark'] #ticketshop .shop-fields select{background:#0b0d4a;color:#F4EAD6;border-color:rgba(244,234,214,.3)}" +
        "[data-theme='dark'] #ticketshop .sx-card{background:#060845;border-color:rgba(244,234,214,.14)}" +
        "[data-theme='dark'] #ticketshop .sx-name{color:#F4EAD6}" +
        "[data-theme='dark'] #ticketshop .sx-meta{color:rgba(244,234,214,.55)}" +
        "[data-theme='dark'] #ticketshop .sx-price{color:#ac595a}" +
        "[data-theme='dark'] #ticketshop .sx-price.is-out{color:rgba(244,234,214,.5)}";
      var st = document.createElement("style");
      st.id = "apero-shop-styles";
      st.textContent = css;
      document.head.appendChild(st);
    }

    function build() {
      var wrap = el("div", "shop");
      wrap.appendChild(el("h3", "shop-title", ""));
      wrap.appendChild(buildDayTabs());                 // dag-eerst: kies eerst je dag
      var rows = el("div", "shop-rows");
      groups.forEach(function (g) { rows.appendChild(buildRow(g)); });
      wrap.appendChild(rows);
      wrap.appendChild(buildExtras());                  // add-ons: 'maak je avond compleet'
      wrap.appendChild(el("div", "shop-fields", ""));   // koopvelden (order + ticket scope)
      wrap.appendChild(el("div", "shop-summary", ""));
      wrap.appendChild(buildForm());
      wrap.appendChild(el("div", "shop-error", ""));
      // Sticky afrekenbalk: op body i.p.v. in de sectie (reveal-transforms zouden
      // position:fixed anders breken); toont mandje + springt naar de checkout.
      cartbar = el("div", "apero-cartbar");
      var cbInfo = el("span", "cb-info", "");
      var cbBtn = el("button", "cb-btn", "");
      cbBtn.type = "button";
      cbBtn.addEventListener("click", function () {
        var tgt = root.querySelector(".shop-fields");
        if (tgt) tgt.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      cartbar.appendChild(cbInfo); cartbar.appendChild(cbBtn);
      document.body.appendChild(cartbar);
      return wrap;
    }

    function buildDayTabs() {
      var tabs = el("div", "day-tabs");
      ["thu", "fri", "sat", "sun"].forEach(function (d) {
        var b = el("button", "day-tab");
        b.type = "button";
        b.setAttribute("data-day", d);
        b.appendChild(el("span", "dt-day", ""));
        b.appendChild(el("span", "dt-date", ""));
        b.appendChild(el("span", "dt-count", ""));
        b.addEventListener("click", function () { selDay = d; render(); });
        tabs.appendChild(b);
      });
      return tabs;
    }

    // aantal gekozen tickets voor een dag (voor het bolletje op de dagtab)
    function dayCartCount(d) {
      var n = 0;
      Object.keys(cart).forEach(function (id) {
        var ty = typeById(id);
        if (!ty) return;
        if (isExtra(id)) { if (ty.dag === d) n += cart[id]; return; }
        if (ty.valid_days && ty.valid_days.length === 1 && ty.valid_days[0] === d) n += cart[id] * (ty.admits_count || 1);
      });
      return n;
    }

    // einddatum vroegboekvoordeel = startdatum van de gewone dagtickets
    function earlyBadgeText() {
      var until = null;
      for (var i = 0; i < CFG.types.length; i++) {
        var ty = CFG.types[i];
        if (ty.family === "day" && ty.available_from) { until = ty.available_from; break; }
      }
      return until ? t("Vroegboekvoordeel · tot ", "Early bird price · until ") + fmtDate(until)
                   : t("Vroegboekvoordeel", "Early bird price");
    }

    function buildRow(g) {
      var any = g.members[0];
      var hot = (any.family === "party5");
      var isEarly = (any.family === "early");
      var row = el("div", "shop-row" + (hot ? " is-hot" : "") + (isEarly ? " is-deal" : ""));
      row.setAttribute("data-group", g.key);
      if (isEarly) row.appendChild(el("div", "shop-row-badge", ""));
      var head = el("div", "shop-row-head");
      head.appendChild(el("div", "shop-row-name", ""));
      if (g.single) head.appendChild(el("div", "shop-row-price", ""));
      row.appendChild(head);
      row.appendChild(el("p", "shop-row-desc", ""));
      if (g.single) {
        row.appendChild(el("div", "shop-row-status", "")); // 'later beschikbaar'
        row.appendChild(buildStepper(g.members[0].id));
        row.appendChild(buildWaitlist(g.members[0].id));
      } else {
        // Eén regel per dag, elk los te kopen (geen dag-keuze die het aantal verplaatst)
        var days = el("div", "shop-days");
        g.members.forEach(function (m) {
          var line = el("div", "shop-day");
          line.setAttribute("data-type", m.id);
          var info = el("div", "shop-day-info");
          info.appendChild(el("div", "shop-day-label", ""));
          info.appendChild(el("div", "shop-day-price", ""));
          line.appendChild(info);
          line.appendChild(buildStepper(m.id));
          line.appendChild(buildWaitlist(m.id));
          days.appendChild(line);
        });
        row.appendChild(days);
      }
      return row;
    }

    function buildStepper(id) {
      var step = el("div", "stepper");
      var minus = el("button", "step-btn step-minus", "−"); minus.type = "button"; minus.setAttribute("aria-label", "min");
      var count = el("span", "step-count", "0");
      var plus = el("button", "step-btn step-plus", "+"); plus.type = "button"; plus.setAttribute("aria-label", "plus");
      minus.addEventListener("click", function () { bump(id, -1); });
      plus.addEventListener("click", function () { bump(id, +1); });
      step.appendChild(minus); step.appendChild(count); step.appendChild(plus);
      return step;
    }

    function hhmm(iso) {
      var d = new Date(iso); if (isNaN(d)) return "";
      try {
        return new Intl.DateTimeFormat(lang() === "en" ? "en-GB" : "nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" }).format(d);
      } catch (e) { return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
    }

    // 'Maak je avond compleet': add-ons (proeverijen/restaurant) onder de tickets.
    // Zelfde steppers en mandje als de gewone tickets; verborgen als er niks is.
    function buildExtras() {
      var box = el("div", "shop-extras");
      box.style.display = "none";
      var ex = CFG.extras || [];
      if (!ex.length) return box;
      box.innerHTML = "<div class='sx-eyebrow'></div><div class='sx-sub'></div>";
      // Gegroepeerd per soort (eigen kopje), zodat restaurant en proeverijen
      // niet door elkaar staan: eerst proeverijen, dan restaurant, dan de rest.
      var soorten = ["restaurant", "proeverij", "workshop"];
      ex.forEach(function (x) {
        var s = x.soort || "proeverij";
        if (soorten.indexOf(s) === -1) soorten.push(s);
      });
      soorten.forEach(function (soort) {
        var items = ex.filter(function (x) { return (x.soort || "proeverij") === soort; });
        if (!items.length) return;
        var group = el("details", "sx-group");
        group.setAttribute("data-soort", soort);
        var sum = el("summary", "sx-sum");
        sum.appendChild(el("span", "sx-group-title", ""));
        sum.appendChild(el("span", "sx-count", ""));
        group.appendChild(sum);
        var list = el("div", "sx-list");
        items.forEach(function (x) {
          var card = el("div", "sx-card");
          card.setAttribute("data-extra", x.id);
          var info = el("div", "sx-info");
          info.appendChild(el("div", "sx-name", ""));
          info.appendChild(el("div", "sx-meta", ""));
          info.appendChild(el("div", "sx-desc", ""));
          info.appendChild(el("div", "sx-price", ""));
          card.appendChild(info);
          card.appendChild(buildStepper(x.id));
          list.appendChild(card);
        });
        group.appendChild(list);
        box.appendChild(group);
      });
      return box;
    }

    // true als de titel na het weglaten van het soort-woord, de dag en de tijd
    // niets eigens overhoudt (dan is hij pure herhaling van kop + label)
    function zegtNietsNieuws(naam, x) {
      if (!naam) return true;
      var rest = naam.toLowerCase();
      var soort = (x.soort || "").toLowerCase();
      [soort, "restaurant", "diner", "dinner", "proeverij", "tasting"].forEach(function (w) {
        if (w) rest = rest.split(w).join(" ");
      });
      ["vrijdag", "zaterdag", "zondag", "friday", "saturday", "sunday"].forEach(function (d) {
        rest = rest.split(d).join(" ");
      });
      rest = rest.replace(/\d{1,2}[:.]\d{2}/g, " ").replace(/[^a-z0-9]+/g, "");
      return rest === "";
    }

    function updateExtras(r) {
      var box = r.querySelector(".shop-extras");
      if (!box) return;
      var ex = CFG.extras || [];
      if (!ex.length) { box.style.display = "none"; return; }
      box.querySelector(".sx-eyebrow").textContent = t("Maak je avond compleet", "Complete your night");
      var dagNaam = DAY_FULL[selDay] ? DAY_FULL[selDay][lang()] : "";
      box.querySelector(".sx-sub").textContent = t(
        "Boek er meteen een diner, proeverij of workshop bij op " + dagNaam.toLowerCase() + ". Beperkt aantal plekken. Je hebt altijd ook een toegangsticket voor het festival nodig.",
        "Add a dinner, tasting or workshop for " + dagNaam + " right away. Limited spots. You always need a festival entry ticket as well.");
      var visible = 0;
      ex.forEach(function (x) {
        var card = box.querySelector('.sx-card[data-extra="' + x.id + '"]');
        if (!card) return;
        var st = avail(x.id);
        // niet meer koopbaar? haal 'm uit het mandje zodat totaal en knop kloppen
        if (st !== "available" && cart[x.id]) delete cart[x.id];
        // dag-eerst: alleen extras van de gekozen dag (zonder dag = altijd tonen)
        if (st === "coming_soon" || (x.dag && x.dag !== selDay)) { card.style.display = "none"; return; }
        card.style.display = "";
        visible++;
        var naam = x[lang() === "en" ? "name_en" : "name_nl"] || x.name_nl || "";
        var naamEl = card.querySelector(".sx-name");
        naamEl.textContent = naam;
        // Titel verbergen als die alleen het groepskopje + dag/tijd herhaalt;
        // die staan al boven de groep en in het dag/tijd-label ("Restaurant
        // vrijdag 18:00" onder kopje Restaurant met label vr 6 nov · 18:00).
        naamEl.style.display = zegtNietsNieuws(naam, x) ? "none" : "";
        var metaEl = card.querySelector(".sx-meta");
        metaEl.innerHTML = "";
        var pillTxt = [];
        if (x.dag) pillTxt.push(dayLabel(x.dag));
        if (x.start_tijd) pillTxt.push(hhmm(x.start_tijd));
        if (pillTxt.length) metaEl.appendChild(el("span", "sx-pill", esc(pillTxt.join(" · "))));
        if (x.locatie) metaEl.appendChild(document.createTextNode(x.locatie));
        var descEl = card.querySelector(".sx-desc");
        if (descEl) descEl.textContent = x.beschrijving_kort || "";
        var priceEl = card.querySelector(".sx-price");
        priceEl.className = "sx-price";
        if (st === "sold_out") { priceEl.textContent = t("Vol", "Full"); priceEl.classList.add("is-out"); }
        else { priceEl.textContent = "€ " + euroPlain(x.price_cents); }
        card.classList.toggle("is-disabled", st !== "available");
        var stepper = card.querySelector(".stepper");
        if (stepper) stepper.style.display = (st !== "available") ? "none" : "";
        card.querySelector(".step-count").textContent = String(cart[x.id] || 0);
      });
      // Groepskopjes (taalgevoelig) + lege groepen verbergen
      var groupsEls = box.querySelectorAll(".sx-group");
      Array.prototype.forEach.call(groupsEls, function (g) {
        var soort = g.getAttribute("data-soort");
        var titleEl = g.querySelector(".sx-group-title");
        if (titleEl) {
          titleEl.textContent = soort === "restaurant" ? t("Restaurant", "Restaurant")
            : soort === "proeverij" ? t("Proeverijen", "Tastings")
            : soort === "workshop" ? t("Workshops", "Workshops")
            : soort.charAt(0).toUpperCase() + soort.slice(1);
        }
        var anyVisible = false, inCart = 0;
        Array.prototype.forEach.call(g.querySelectorAll(".sx-card"), function (c) {
          if (c.style.display !== "none") anyVisible = true;
          inCart += cart[c.getAttribute("data-extra")] || 0;
        });
        var cntEl = g.querySelector(".sx-count");
        if (cntEl) cntEl.textContent = inCart ? String(inCart) : "";
        if (inCart && !g.hasAttribute("data-seen")) { g.open = true; g.setAttribute("data-seen", "1"); }
        g.style.display = anyVisible ? "" : "none";
      });
      box.style.display = visible ? "" : "none";
    }

    // Wachtlijst-aanmelding, verschijnt alleen bij een uitverkocht type
    function buildWaitlist(typeId) {
      var wrap = el("div", "wl-slot");
      wrap.setAttribute("data-wl", typeId);
      wrap.style.cssText = "display:none;margin-top:10px;";
      var trigger = el("button", "wl-trigger", t("Zet me op de wachtlijst", "Add me to the waitlist"));
      trigger.type = "button";
      trigger.style.cssText = "background:none;border:1px solid rgba(196,95,56,.4);color:#C45F38;border-radius:9px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;";
      var box = el("div", "wl-form");
      box.style.cssText = "display:none;margin-top:10px;padding:14px;border:1px solid rgba(35,27,19,.15);border-radius:11px;background:#F4EAD6;";
      box.innerHTML =
        "<p style='margin:0 0 10px;font-size:13px;color:rgba(35,27,19,.7);line-height:1.5;'>" +
          esc(t("Uitverkocht, maar laat je gegevens achter. Komt er plek vrij, dan mailen we jou als eerste.", "Sold out, but leave your details. If a spot opens up, we email you first.")) + "</p>" +
        "<div style='display:flex;flex-direction:column;gap:8px;'>" +
          "<input class='wl-name' type='text' placeholder='" + esc(t("Je naam", "Your name")) + "' style='padding:10px 12px;border:1px solid #d9d2c0;border-radius:9px;font-size:14px;font-family:inherit;' />" +
          "<input class='wl-email' type='email' placeholder='" + esc(t("E-mailadres", "Email address")) + "' style='padding:10px 12px;border:1px solid #d9d2c0;border-radius:9px;font-size:14px;font-family:inherit;' />" +
          "<label style='font-size:13px;color:rgba(35,27,19,.7);'>" + esc(t("Hoeveel plekken wil je?", "How many spots?")) + " <input class='wl-qty' type='number' min='1' max='50' value='2' style='width:72px;padding:8px 10px;border:1px solid #d9d2c0;border-radius:9px;font-size:14px;font-family:inherit;margin-left:6px;' /></label>" +
          "<button type='button' class='wl-submit' style='background:#C45F38;color:#F4EAD6;border:0;border-radius:9px;padding:11px 18px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;'>" + esc(t("Zet me op de wachtlijst", "Add me")) + "</button>" +
          "<div class='wl-msg' style='font-size:13px;'></div>" +
        "</div>";
      trigger.addEventListener("click", function () { box.style.display = "block"; trigger.style.display = "none"; });
      box.querySelector(".wl-submit").addEventListener("click", function () {
        var name = box.querySelector(".wl-name").value.trim();
        var email = box.querySelector(".wl-email").value.trim();
        var qty = parseInt(box.querySelector(".wl-qty").value, 10) || 1;
        var msg = box.querySelector(".wl-msg");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { msg.style.color = "#b3372e"; msg.textContent = t("Vul een geldig e-mailadres in.", "Enter a valid email."); return; }
        var sub = box.querySelector(".wl-submit"); sub.disabled = true; sub.textContent = t("Een moment…", "One moment…");
        fetch(API + "/waitlist/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type_id: typeId, email: email, name: name, qty: qty, locale: lang() }) })
          .then(function (r) { return r.json(); }).then(function (d) {
            if (d && d.ok) { box.innerHTML = "<p style='margin:0;font-size:14px;color:#1e7a3c;font-weight:600;'>" + esc(t("Top, je staat op de lijst. We mailen je zodra er plek vrijkomt.", "Done, you're on the list. We'll email you when a spot opens.")) + "</p>"; }
            else { sub.disabled = false; sub.textContent = t("Zet me op de wachtlijst", "Add me"); msg.style.color = "#b3372e"; msg.textContent = t("Er ging iets mis, probeer het zo nog eens.", "Something went wrong, try again."); }
          }).catch(function () { sub.disabled = false; sub.textContent = t("Zet me op de wachtlijst", "Add me"); msg.style.color = "#b3372e"; msg.textContent = t("Geen verbinding, probeer het zo nog eens.", "No connection, try again."); });
      });
      wrap.appendChild(trigger); wrap.appendChild(box);
      return wrap;
    }

    function bump(id, delta) {
      if (delta > 0 && avail(id) !== "available") return;
      var ty = typeById(id);
      var max = ty.max_per_order || 10;
      var prev = cart[id] || 0;
      var next = prev + delta;
      if (next < 0) next = 0;
      if (next > max) next = max;
      if (next === 0) delete cart[id]; else cart[id] = next;
      // Meta AddToCart: alleen als het mandje echt toeneemt
      if (next > prev && typeof window.aperoTrack === "function") {
        window.aperoTrack("AddToCart", {
          value: ty.price_cents / 100, currency: "EUR",
          content_type: "product", contents: [{ id: ty.id, quantity: next - prev }]
        });
      }
      render();
    }

    function typeById(id) {
      for (var i = 0; i < CFG.types.length; i++) if (CFG.types[i].id === id) return CFG.types[i];
      var ex = CFG.extras || [];
      for (var j = 0; j < ex.length; j++) if (ex[j].id === id) return ex[j];
      return null;
    }

    function totals() {
      var sum = 0, n = 0, adm = 0;
      Object.keys(cart).forEach(function (id) {
        var ty = typeById(id);
        sum += cart[id] * ty.price_cents;
        n += cart[id];
        adm += cart[id] * ty.admits_count;
      });
      var disc = (discount.state === "ok") ? discount.cents : 0;
      var feeBase = CFG.service_fee_cents || 0;
      var fee = n > 0 ? (CFG.service_fee_mode === "ticket" ? feeBase * adm : feeBase) : 0;
      var txfee = n > 0 ? (CFG.transaction_fee_cents || 0) : 0;
      return { items: sum, count: n, admissions: adm, discount: disc, fee: fee, txfee: txfee, total: Math.max(0, sum - disc) + fee + txfee };
    }

    // koopvelden die van toepassing zijn gezien de cart
    function applicableFields(scope) {
      return (CFG.fields || []).filter(function (f) {
        if (f.scope !== scope) return false;
        if (scope === "ticket" && f.applies_to && f.applies_to.length) {
          return Object.keys(cart).some(function (id) { return f.applies_to.indexOf(id) > -1; });
        }
        return true;
      });
    }
    // dagen waarvoor een restaurantticket in het mandje zit zonder toegangsticket dat die dag geldt
    function restaurantDagenZonderToegang() {
      var ids = Object.keys(cart);
      var gedekt = {};
      ids.forEach(function (id) {
        if (isExtra(id)) return;
        var ty = typeById(id);
        (ty && ty.valid_days || []).forEach(function (d) { gedekt[d] = true; });
      });
      var tekort = {};
      ids.forEach(function (id) {
        var ex = (CFG.extras || []).filter(function (e) { return e.id === id; })[0];
        if (!ex || ex.soort !== "restaurant") return;
        if (!gedekt[ex.dag]) tekort[ex.dag] = true;
      });
      return ["thu", "fri", "sat", "sun"].filter(function (d) { return tekort[d]; });
    }

    // lijst van (type_id, seq) toegangen die personalisatie nodig hebben
    function admissionSlots() {
      var slots = [];
      Object.keys(cart).forEach(function (id) {
        if (isExtra(id)) return; // add-ons vragen geen personalisatie per persoon
        var ty = typeById(id);
        var per = ty.admits_count;
        for (var q = 0; q < cart[id]; q++) {
          for (var a = 0; a < per; a++) {
            slots.push({ type_id: id, seq: slots.filter(function (s) { return s.type_id === id; }).length + 1, ty: ty });
          }
        }
      });
      return slots;
    }

    function render() {
      var r = root.querySelector(".shop");
      if (!r) return;
      // Elke mandjewijziging (ook types die er automatisch uit vallen bij
      // uitverkocht) vraagt om een nieuwe kortingsberekening.
      var sig = cartSig();
      if (sig !== laatsteCartSig) {
        laatsteCartSig = sig;
        hertelKorting();
      }
      r.querySelector(".shop-title").textContent = t("Bestel je tickets", "Order your tickets");
      var tabsEl = r.querySelector(".day-tabs");
      if (tabsEl) {
        Array.prototype.forEach.call(tabsEl.querySelectorAll(".day-tab"), function (b) {
          var d = b.getAttribute("data-day");
          b.querySelector(".dt-day").textContent = DAY_FULL[d][lang()];
          b.querySelector(".dt-date").textContent = DAY_DATE[d][lang()];
          b.classList.toggle("is-sel", d === selDay);
          var n = dayCartCount(d);
          var c = b.querySelector(".dt-count");
          c.textContent = String(n);
          c.classList.toggle("is-on", n > 0);
        });
      }
      groups.forEach(function (g) {
        var row = r.querySelector('[data-group="' + g.key + '"]');
        var head = g.members[0];
        row.querySelector(".shop-row-name").textContent = head[lang() === "en" ? "name_en" : "name_nl"].replace(/ (vrijdag|zaterdag|zondag|Friday|Saturday|Sunday).*$/, "");
        var desc = head[lang() === "en" ? "description_en" : "description_nl"];
        row.querySelector(".shop-row-desc").textContent = desc || "";
        var badge = row.querySelector(".shop-row-badge");
        if (badge) badge.textContent = earlyBadgeText();
        if (g.single) updateLine(row, head);
        else g.members.forEach(function (m) {
          var line = row.querySelector('.shop-day[data-type="' + m.id + '"]');
          updateDay(line, m);
          // dag-eerst: alleen de regel van de gekozen dag tonen
          if (line) line.style.display = (m.valid_days && m.valid_days[0] === selDay) ? "" : "none";
        });
      });
      updateExtras(r);
      renderFields(r);
      renderSummary(r);
      updateCartbar();
    }

    function updateCartbar() {
      if (!cartbar) return;
      var tt = totals();
      var frm = root.querySelector(".shop-form");
      checkoutInView = false;
      if (frm) {
        var rc = frm.getBoundingClientRect();
        checkoutInView = rc.top < window.innerHeight - 60 && rc.bottom > 0;
      }
      if (tt.count > 0) {
        cartbar.querySelector(".cb-info").textContent =
          tt.admissions + " " + (tt.admissions === 1 ? t("ticket", "ticket") : t("tickets", "tickets")) + " · € " + euroPlain(tt.total);
        cartbar.querySelector(".cb-btn").textContent = t("Afrekenen", "Checkout");
      }
      cartbar.classList.toggle("is-on", tt.count > 0 && !checkoutInView);
    }

    // losse dagregel binnen een familie (early/day/party5)
    function updateDay(line, m) {
      if (!line) return;
      var d = m.valid_days[0];
      var st = avail(m.id);
      var blocked = soldout[d] || st === "sold_out";
      line.querySelector(".shop-day-label").textContent = dayLabel(d);
      var priceEl = line.querySelector(".shop-day-price");
      priceEl.className = "shop-day-price";
      if (blocked) {
        priceEl.textContent = t("Uitverkocht", "Sold out"); priceEl.classList.add("is-out");
      } else if (st === "coming_soon") {
        var from = comingFrom[m.id] ? t("vanaf ", "from ") + fmtDate(comingFrom[m.id]) : t("later beschikbaar", "available later");
        priceEl.textContent = "€ " + euroPlain(m.price_cents) + " · " + from; priceEl.classList.add("is-soon");
      } else {
        priceEl.textContent = "€ " + euroPlain(m.price_cents) + (m.admits_count > 1 ? " · " + m.admits_count + " " + t("tickets", "tickets") : "");
        // vroegboek: normale dagprijs doorgestreept ernaast (prijsanker)
        if (m.family === "early") {
          for (var fi = 0; fi < CFG.types.length; fi++) {
            var fty = CFG.types[fi];
            if (fty.family === "day" && fty.valid_days && fty.valid_days[0] === d && fty.price_cents > m.price_cents) {
              var strike = document.createElement("s");
              strike.textContent = "€ " + euroPlain(fty.price_cents);
              priceEl.appendChild(document.createTextNode(" "));
              priceEl.appendChild(strike);
              break;
            }
          }
        }
      }
      var notBuyable = blocked || st !== "available";
      line.classList.toggle("is-disabled", notBuyable && st !== "sold_out");
      var stepper = line.querySelector(".stepper");
      if (stepper) stepper.style.display = notBuyable ? "none" : "";
      var wl = line.querySelector(".wl-slot");
      if (wl) wl.style.display = (st === "sold_out") ? "" : "none";
      line.querySelector(".step-count").textContent = String(cart[m.id] || 0);
    }

    // losse-type-regel (passe-partout)
    function updateLine(row, m) {
      var st = avail(m.id);
      var priceEl = row.querySelector(".shop-row-price");
      priceEl.textContent = (st === "sold_out")
        ? t("Uitverkocht", "Sold out")
        : "€ " + euroPlain(m.price_cents) + (m.admits_count > 1 ? " · " + m.admits_count + " " + t("tickets", "tickets") : "");
      var statusEl = row.querySelector(".shop-row-status");
      if (st === "coming_soon") {
        var from = comingFrom[m.id] ? " " + t("vanaf ", "from ") + fmtDate(comingFrom[m.id]) : "";
        statusEl.textContent = t("Later beschikbaar", "Available later") + from;
        statusEl.style.display = "";
      } else { statusEl.textContent = ""; statusEl.style.display = "none"; }
      var notBuyable = st !== "available";
      row.classList.toggle("is-disabled", notBuyable && st !== "sold_out");
      var stepper = row.querySelector(".stepper");
      if (stepper) stepper.style.display = notBuyable ? "none" : "";
      var wl = row.querySelector(".wl-slot");
      if (wl) wl.style.display = (st === "sold_out") ? "" : "none";
      row.querySelector(".step-count").textContent = String(cart[m.id] || 0);
    }

    function renderFields(r) {
      var box = r.querySelector(".shop-fields");
      var tt = totals();
      if (tt.count === 0) { box.innerHTML = ""; box.removeAttribute("data-sig"); return; }
      var html = "";
      var orderFields = applicableFields("order");
      if (orderFields.length) {
        html += "<div class='field-group'><h4>" + esc(t("Jouw gegevens", "Your details")) + "</h4>";
        orderFields.forEach(function (f) { html += fieldHtml(f, "order", null); });
        html += "</div>";
      }
      var ticketFields = applicableFields("ticket");
      if (ticketFields.length) {
        var slots = admissionSlots();
        var perTicket = "";
        slots.forEach(function (s, i) {
          var relevant = ticketFields.filter(function (f) { return !f.applies_to || !f.applies_to.length || f.applies_to.indexOf(s.type_id) > -1; });
          if (!relevant.length) return;
          var nm = s.ty[lang() === "en" ? "name_en" : "name_nl"];
          perTicket += "<div class='ticket-fieldset'><span class='tf-label'>" + esc(t("Ticket", "Ticket")) + " " + (i + 1) + " · " + esc(nm) + "</span>";
          relevant.forEach(function (f) { perTicket += fieldHtml(f, "ticket", s.type_id + "#" + s.seq); });
          perTicket += "</div>";
        });
        if (perTicket) {
          html += "<div class='field-group'><h4>" + esc(t("Per ticket", "Per ticket")) + "</h4>" + perTicket + "</div>";
        }
        // Add-ons (restaurant, proeverijen) krijgen geen slot per persoon, maar de
        // vragen erbij moeten wél gesteld worden: bv. allergieën bij een diner.
        // Eén antwoord voor de hele reservering, net als op /restaurant, en bij het
        // afrekenen gekopieerd naar elk couvert zodat er één gastenlijst blijft.
        var extraFields = "";
        Object.keys(cart).forEach(function (id) {
          if (!isExtra(id)) return;
          var relevant = ticketFields.filter(function (f) { return !f.applies_to || !f.applies_to.length || f.applies_to.indexOf(id) > -1; });
          if (!relevant.length) return;
          var ty = typeById(id);
          var nm = ty[lang() === "en" ? "name_en" : "name_nl"];
          var aantal = cart[id];
          var sub = aantal > 1 ? " · " + aantal + " " + t("personen", "people") : "";
          extraFields += "<div class='ticket-fieldset'><span class='tf-label'>" + esc(nm) + esc(sub) + "</span>";
          relevant.forEach(function (f) { extraFields += fieldHtml(f, "ticket", id + "#all"); });
          extraFields += "</div>";
        });
        if (extraFields) {
          html += "<div class='field-group'><h4>" + esc(t("Bij je reservering", "With your booking")) + "</h4>" + extraFields + "</div>";
        }
      }
      // alleen opnieuw tekenen als de structuur wijzigt (anders verlies je focus/typen)
      if (box.getAttribute("data-sig") !== sig()) {
        box.innerHTML = html;
        box.setAttribute("data-sig", sig());
      }
      function sig() {
        return JSON.stringify(Object.keys(cart).sort().map(function (k) { return k + ":" + cart[k]; })) + lang();
      }
    }

    function fieldHtml(f, scope, slotKey) {
      var id = "f_" + scope + "_" + (slotKey ? slotKey.replace(/[#]/g, "_") + "_" : "") + f.key;
      var label = f[lang() === "en" ? "label_en" : "label_nl"] + (f.required ? " *" : "");
      var attr = "data-fkey='" + esc(f.key) + "' data-fscope='" + scope + "'" + (slotKey ? " data-fslot='" + esc(slotKey) + "'" : "");
      var inner;
      if (f.type === "select") {
        inner = "<select id='" + id + "' " + attr + "><option value=''></option>" +
          (f.options || []).map(function (o) { return "<option value='" + esc(o) + "'>" + esc(o) + "</option>"; }).join("") + "</select>";
      } else if (f.type === "checkbox") {
        return "<label class='field-check'><input type='checkbox' id='" + id + "' " + attr + " /> <span>" + esc(label) + "</span></label>";
      } else if (f.type === "date") {
        var maxDate = new Date().toISOString().slice(0, 10); // geen datum in de toekomst
        inner = "<input type='date' id='" + id + "' " + attr + " max='" + maxDate + "' />";
      } else {
        var ty = f.type === "number" ? "number" : "text";
        inner = "<input type='" + ty + "' id='" + id + "' " + attr + " maxlength='120' />";
      }
      return "<label class='field-row'><span>" + esc(label) + "</span>" + inner + "</label>";
    }

    function collectFields() {
      var orderFields = {};
      var answers = {}; // slotKey -> {key:val}
      root.querySelectorAll("[data-fkey]").forEach(function (input) {
        var key = input.getAttribute("data-fkey");
        var val = input.type === "checkbox" ? (input.checked ? "ja" : "") : input.value.trim();
        if (input.getAttribute("data-fscope") === "order") {
          orderFields[key] = val;
        } else {
          var slot = input.getAttribute("data-fslot");
          if (!answers[slot]) answers[slot] = {};
          answers[slot][key] = val;
        }
      });
      var ticket_answers = [];
      Object.keys(answers).forEach(function (slot) {
        var parts = slot.split("#");
        var typeId = parts[0];
        if (parts[1] === "all") {
          // Gedeeld antwoord bij een add-on: naar elk couvert van die reservering,
          // zodat de gastenlijst per persoon compleet is (zelfde vorm als /restaurant).
          var ty = typeById(typeId);
          var n = (cart[typeId] || 0) * ((ty && ty.admits_count) || 1);
          for (var seq = 1; seq <= n; seq++) {
            ticket_answers.push({ type_id: typeId, seq: seq, fields: answers[slot] });
          }
          return;
        }
        ticket_answers.push({ type_id: typeId, seq: parseInt(parts[1], 10), fields: answers[slot] });
      });
      return { order_fields: orderFields, ticket_answers: ticket_answers };
    }

    function renderSummary(r) {
      var tt = totals();
      var sum = r.querySelector(".shop-summary");
      if (tt.count === 0) {
        // cart leeg: ook formulier, afrekenknop en oude foutmelding weg (Frank's bug)
        sum.innerHTML = "<p class='shop-empty'>" + esc(t("Kies hierboven je tickets.", "Pick your tickets above.")) + "</p>";
        r.querySelector(".shop-form").style.display = "none";
        showError("");
        return;
      }
      var lines = Object.keys(cart).map(function (id) {
        var ty = typeById(id);
        var label = ty[lang() === "en" ? "name_en" : "name_nl"];
        return "<div class='sum-line'><span>" + cart[id] + " × " + esc(label) + "</span><span>€ " + euroPlain(cart[id] * ty.price_cents) + "</span></div>";
      }).join("");
      if (tt.discount > 0) lines += "<div class='sum-line sum-disc'><span>" + esc(t("Korting", "Discount")) + " (" + esc(discount.code) + ")</span><span>− € " + euroPlain(tt.discount) + "</span></div>";
      // Service- en transactiekosten samengevoegd tot één discrete, grijze regel
      var extra = tt.fee + tt.txfee;
      if (extra > 0) {
        lines += "<div class='sum-line sum-fee'><span>" + esc(t("Servicekosten", "Service fee")) + "</span><span>€ " + euroPlain(extra) + "</span></div>";
      }
      lines += "<div class='sum-line sum-total'><span>" + esc(t("Totaal", "Total")) + "</span><span>€ " + euroPlain(tt.total) + "</span></div>";
      lines += "<p class='sum-vat'>" + esc(t("Incl. btw.", "Incl. VAT.")) + "</p>";
      var zonderToegang = restaurantDagenZonderToegang();
      if (zonderToegang.length) {
        var dagTekst = zonderToegang.map(function (d) { return DAY_FULL[d] ? DAY_FULL[d][lang()].toLowerCase() : d; }).join(t(" en ", " and "));
        var meer = zonderToegang.length > 1;
        lines += "<p class='sum-warn'>" + esc(t(
          "Let op: er zit nog geen toegangsticket voor " + dagTekst + " in je mandje. Het restaurantticket geldt alleen voor het diner. Heb je al een toegangsticket voor " + (meer ? "die dagen" : "die dag") + ", dan hoef je niets te doen.",
          "Please note: there is no admission ticket for " + dagTekst + " in your basket yet. The restaurant ticket only covers the dinner. If you already have an admission ticket for " + (meer ? "those days" : "that day") + ", you are all set.")) + "</p>";
      }
      sum.innerHTML = lines;
      var form = r.querySelector(".shop-form");
      form.style.display = "";
      form.querySelector('[data-f="name"]').placeholder = t("Naam", "Name");
      form.querySelector('[data-f="email"]').placeholder = t("E-mailadres", "Email address");
      form.querySelector('[data-f="email2"]').placeholder = t("Herhaal e-mailadres", "Repeat email address");
      form.querySelector('[data-f="discount"]').placeholder = t("Kortingscode (optioneel)", "Discount code (optional)");
      form.querySelector(".disc-apply").textContent = t("Toepassen", "Apply");
      form.querySelector(".shop-terms span").innerHTML = t("Ik ga akkoord met de <a href='/voorwaarden.html' target='_blank' rel='noopener'>voorwaarden</a>.", "I agree to the <a href='/voorwaarden.html' target='_blank' rel='noopener'>terms</a>.");
      form.querySelector(".btn-buy").textContent = t("Afrekenen", "Checkout") + " · € " + euroPlain(tt.total);
      var dmsg = form.querySelector(".disc-msg");
      var dstate = discount.state;
      dmsg.textContent =
        dstate === "ok" ? t("Korting toegepast.", "Discount applied.")
        : dstate === "not_applicable" ? t("Deze code geldt niet voor de tickets in je mandje.", "This code does not apply to the tickets in your basket.")
        : dstate === "invalid" || dstate === "bad" ? t("Code ongeldig of verlopen.", "Code invalid or expired.")
        : dstate === "checking" ? t("Even controleren…", "Checking…")
        : "";
      dmsg.className = "disc-msg " + (
        dstate === "ok" ? "ok"
        : dstate === "invalid" || dstate === "bad" || dstate === "not_applicable" ? "bad"
        : "");
    }

    function buildForm() {
      var form = el("form", "shop-form");
      form.setAttribute("novalidate", "");
      form.style.display = "none";
      form.innerHTML =
        '<input type="text" data-f="name" autocomplete="name" maxlength="100" />' +
        '<input type="email" data-f="email" autocomplete="email" maxlength="254" />' +
        '<input type="email" data-f="email2" autocomplete="off" maxlength="254" />' +
        '<div class="disc-wrap"><input type="text" data-f="discount" autocomplete="off" maxlength="40" />' +
        '<button type="button" class="btn btn-ghost disc-apply"></button></div>' +
        '<p class="disc-msg"></p>' +
        '<input type="text" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true" />' +
        '<label class="shop-terms"><input type="checkbox" data-f="terms" /> <span></span></label>' +
        '<button type="submit" class="btn btn-buy"></button>';
      if (discount.code) form.querySelector('[data-f="discount"]').value = discount.code;
      form.querySelector(".disc-apply").addEventListener("click", function () { applyDiscount(form); });
      form.addEventListener("submit", function (e) { e.preventDefault(); submit(form); });
      return form;
    }

    function applyDiscount(form) {
      var code = form.querySelector('[data-f="discount"]').value.trim();
      if (!code) { discount = { code: "", state: "", cents: 0 }; render(); return; }
      discount = { code: code, state: "checking", cents: 0 };
      render();
      checkDiscount();
    }

    // Laat de server de korting narekenen. Dezelfde som als create-order, maar
    // zonder order en zonder de code te verzilveren, zodat de koper het bedrag
    // ziet vóór hij afrekent.
    function checkDiscount() {
      if (!discount.code) return;
      var items = Object.keys(cart).map(function (id) { return { type_id: id, qty: cart[id] }; });
      if (!items.length) { discount.state = "not_applicable"; discount.cents = 0; render(); return; }
      var seq = ++discountSeq;
      fetch(API + "/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items, discount_code: discount.code }),
      }).then(function (r) {
        return r.json().then(function (d) { return { status: r.status, data: d }; });
      }).then(function (rr) {
        if (seq !== discountSeq) return;           // ingehaald door een nieuwere check
        if (rr.status !== 200 || !rr.data.discount) {
          // Onbereikbaar of geweigerd: geen bedrag beloven, wel de code bewaren.
          // create-order beslist alsnog bij het afrekenen.
          discount.state = "checking";
          discount.cents = 0;
          render();
          return;
        }
        discount.state = rr.data.discount.state;
        discount.cents = rr.data.discount_cents || 0;
        render();
      }).catch(function () {
        if (seq !== discountSeq) return;
        discount.state = "checking";
        discount.cents = 0;
        render();
      });
    }

    function cartSig() {
      return Object.keys(cart).sort().map(function (k) { return k + ":" + cart[k]; }).join(",");
    }

    // Na elke mandjewijziging opnieuw laten narekenen: een code die op vrijdag
    // geldt, moet z'n korting verliezen zodra vrijdag uit het mandje gaat.
    function hertelKorting() {
      if (!discount.code) return;
      if (discountTimer) clearTimeout(discountTimer);
      discountTimer = setTimeout(checkDiscount, 250);
    }

    function showError(msg, highlightTerms) {
      var box = root.querySelector(".shop-error");
      box.textContent = msg || "";
      // expliciet 'block': lege string viel terug op de stylesheet (display:none),
      // waardoor meldingen nooit zichtbaar waren
      box.style.display = msg ? "block" : "none";
      var terms = root.querySelector(".shop-terms");
      if (terms) {
        terms.style.outline = highlightTerms ? "2px solid #C45F38" : "";
        terms.style.outlineOffset = highlightTerms ? "4px" : "";
        terms.style.borderRadius = highlightTerms ? "6px" : "";
      }
      if (msg) box.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function submit(form) {
      showError("");
      var name = form.querySelector('[data-f="name"]').value.trim();
      var email = form.querySelector('[data-f="email"]').value.trim();
      var email2 = form.querySelector('[data-f="email2"]').value.trim();
      var terms = form.querySelector('[data-f="terms"]').checked;
      var tt = totals();
      if (tt.count === 0) return;
      if (name.length < 2) return showError(t("Vul je naam in.", "Enter your name."));
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return showError(t("Dat e-mailadres klopt niet helemaal.", "That email address does not look right."));
      if (email.toLowerCase() !== email2.toLowerCase()) return showError(t("De e-mailadressen komen niet overeen.", "The email addresses do not match."));
      // verplichte koopvelden
      var fields = collectFields();
      var miss = firstMissing(fields);
      if (miss) return showError(t("Vul dit veld in: ", "Please fill in: ") + miss);
      if (!terms) return showError(t("Vink de voorwaarden aan om af te rekenen.", "Tick the terms box to check out."), true);

      var btn = form.querySelector(".btn-buy");
      btn.disabled = true;
      btn.textContent = t("Een moment…", "One moment…");
      var items = Object.keys(cart).map(function (id) { return { type_id: id, qty: cart[id] }; });

      // Herkomst voor attributie: vastgelegd door marketing.js op elke pagina.
      // De _fbp-cookie (alleen aanwezig na toestemming) verbetert de match van
      // het server-side Purchase-event; zonder toestemming gaat hij niet mee.
      var attribution = null;
      try {
        attribution = JSON.parse(STORAGE.getItem("apero-attrib") || "null");
        var fbp = (document.cookie.match(/(?:^|;\s*)_fbp=([^;]+)/) || [])[1];
        if (attribution && fbp) attribution.fbp = fbp;
      } catch (e) {}

      fetch(API + "/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items,
          buyer: { email: email, name: name },
          locale: lang(),
          website: form.querySelector(".hp").value,
          order_fields: fields.order_fields,
          ticket_answers: fields.ticket_answers,
          // Wél meesturen als de controle niet rond kwam (anders kost een
          // haperende verbinding de koper z'n korting); niet meesturen als we
          // wéten dat hij niet geldt, want claim_discount verbruikt 'm dan.
          discount_code: (discount.state === "ok" || discount.state === "checking") ? discount.code : "",
          attribution: attribution
        })
      }).then(function (res) {
        return res.json().then(function (data) { return { status: res.status, data: data }; });
      }).then(function (rr) {
        if (rr.status === 200 && rr.data.checkout_url) {
          try { STORAGE.setItem("apero-order", JSON.stringify({ order_id: rr.data.order_id, token: rr.data.token })); } catch (e) {}
          if (typeof window.aperoTrack === "function") {
            window.aperoTrack("InitiateCheckout", {
              value: tt.total / 100, currency: "EUR", num_items: tt.count,
              content_type: "product",
              contents: items.map(function (it) { return { id: it.type_id, quantity: it.qty }; })
            });
          }
          location.href = rr.data.checkout_url;
          return;
        }
        btn.disabled = false;
        if (rr.status === 409 && rr.data.error === "sold_out_type") {
          if (rr.data.type_id) { soldoutTypes[rr.data.type_id] = true; delete cart[rr.data.type_id]; }
          render();
          showError(t("Helaas, dit ticket is net uitverkocht.", "Sorry, this ticket just sold out."));
        } else if (rr.status === 409 && rr.data.error === "sold_out") {
          if (rr.data.day) soldout[rr.data.day] = true;
          render();
          showError(t("Helaas, die dag is net uitverkocht. Kies een andere dag.", "Sorry, that day just sold out. Pick another day."));
        } else if (rr.status === 409 && rr.data.error === "not_available") {
          if (rr.data.type_id) { typeState[rr.data.type_id] = "sold_out"; delete cart[rr.data.type_id]; }
          render();
          showError(t("Dit ticket is op dit moment niet beschikbaar.", "This ticket is not available right now."));
        } else if (rr.status === 409 && rr.data.error === "bad_discount") {
          discount.state = "bad";
          render();
          showError(t("De kortingscode is ongeldig of verlopen.", "The discount code is invalid or expired."));
        } else if (rr.status === 400 && (rr.data.error === "missing_field" || rr.data.error === "missing_ticket_field")) {
          render();
          showError(t("Niet alle verplichte velden zijn ingevuld.", "Not all required fields are filled in."));
        } else if (rr.status === 429) {
          showError(t("Even rustig aan. Probeer het over een paar minuten opnieuw.", "Easy does it. Try again in a few minutes."));
        } else {
          render();
          showError(t("Afrekenen lukte even niet. Probeer het opnieuw.", "Checkout failed for a moment. Please try again."));
        }
      }).catch(function () {
        btn.disabled = false;
        render();
        showError(t("Geen verbinding. Controleer je internet en probeer opnieuw.", "No connection. Check your internet and try again."));
      });
    }

    function firstMissing(fields) {
      var orderF = applicableFields("order");
      for (var i = 0; i < orderF.length; i++) {
        if (orderF[i].required && !String(fields.order_fields[orderF[i].key] || "").trim()) return orderF[i][lang() === "en" ? "label_en" : "label_nl"];
      }
      var ticketF = applicableFields("ticket");
      var ansMap = {};
      fields.ticket_answers.forEach(function (a) { ansMap[a.type_id + "#" + a.seq] = a.fields; });
      var slots = admissionSlots();
      for (var s = 0; s < slots.length; s++) {
        for (var j = 0; j < ticketF.length; j++) {
          var f = ticketF[j];
          if (f.applies_to && f.applies_to.length && f.applies_to.indexOf(slots[s].type_id) < 0) continue;
          if (f.required) {
            var a = ansMap[slots[s].type_id + "#" + slots[s].seq] || {};
            if (!String(a[f.key] || "").trim()) return f[lang() === "en" ? "label_en" : "label_nl"];
          }
        }
      }
      // add-ons: het gedeelde antwoord staat op seq 1 na het uitvouwen
      var ontbreekt = null;
      Object.keys(cart).forEach(function (id) {
        if (ontbreekt || !isExtra(id)) return;
        ticketF.forEach(function (f) {
          if (ontbreekt || !f.required) return;
          if (f.applies_to && f.applies_to.length && f.applies_to.indexOf(id) < 0) return;
          var a = ansMap[id + "#1"] || {};
          if (!String(a[f.key] || "").trim()) ontbreekt = f[lang() === "en" ? "label_en" : "label_nl"];
        });
      });
      if (ontbreekt) return ontbreekt;
      return null;
    }
  }

  /* ============== BEDANKT / TICKETS (shared helpers) ============== */
  function orderRef() {
    var q = new URLSearchParams(location.search);
    var order = q.get("order"), token = q.get("token");
    if (order && token) return { order: order, token: token, fromUrl: true };
    try { var s = JSON.parse(STORAGE.getItem("apero-order") || "null"); if (s && s.order_id) return { order: s.order_id, token: s.token, fromUrl: false }; } catch (e) {}
    return null;
  }
  function fetchStatus(ref) {
    return fetch(API + "/order-status?order=" + encodeURIComponent(ref.order) + "&token=" + encodeURIComponent(ref.token))
      .then(function (res) {
        if (!res.ok) { var e = new Error("status " + res.status); e.code = res.status; throw e; }
        return res.json();
      });
  }

  var bedanktRoot = document.querySelector("[data-page-bedankt]");
  if (bedanktRoot) { loadConfig().catch(function(){}).then(function () { initBedankt(bedanktRoot); }); }

  function initBedankt(root) {
    var ref = orderRef();
    if (!ref) { root.innerHTML = "<h1>" + esc(t("Hier is niets te zien", "Nothing to see here")) + "</h1><p>" + esc(t("We konden geen bestelling vinden. Check de link in je mail.", "We could not find an order. Check the link in your email.")) + "</p>"; return; }
    var delay = 2500, elapsed = 0, maxWait = 180000, netFails = 0;
    root.innerHTML = "<div class='pay-state'><div class='spinner'></div><h1>" + esc(t("Betaling checken…", "Checking your payment…")) + "</h1></div>";
    poll();
    function poll() {
      fetchStatus(ref).then(function (data) {
        netFails = 0;
        if (data.status === "paid") return renderPaid(data);
        if (data.status === "pending") {
          if (elapsed >= maxWait) return renderSlow();
          setTimeout(poll, delay); elapsed += delay; if (delay < 10000) delay += 1500; return;
        }
        renderFailed(data);
      }).catch(function (err) {
        // Echte 404 = order bestaat niet (foute/oude link). Netwerk-/blokkadefout = blijf proberen.
        if (err && err.code === 404) return renderNotFound();
        netFails++;
        if (netFails <= 5) { setTimeout(poll, 3000); return; }
        renderConnError();
      });
    }
    function renderNotFound() {
      // Geen order in de URL maar wel een oude opgeslagen bestelling die niet meer bestaat:
      // die opschonen en een nuttige weg tonen i.p.v. een doodlopende "link klopt niet".
      if (ref && ref.fromUrl === false) {
        try { STORAGE.removeItem("apero-order"); } catch (e) {}
        root.innerHTML = "<div class='pay-state'><h1>" + esc(t("Geen actieve bestelling", "No active order")) + "</h1><p>" +
          esc(t("We konden geen lopende bestelling vinden. Heb je net betaald? Open dan de link uit je bevestigingsmail. Anders kun je hieronder tickets kopen of je tickets terugvinden.",
                "We couldn't find an active order. Just paid? Open the link from your confirmation email. Otherwise you can buy tickets or recover your tickets below.")) + "</p>" +
          "<p><a class='btn' href='./index.html#tickets'>" + esc(t("Naar de tickets", "Go to tickets")) + "</a> " +
          "<a class='btn btn-ghost' href='./tickets.html'>" + esc(t("Tickets kwijt?", "Lost your tickets?")) + "</a></p></div>";
        return;
      }
      root.innerHTML = "<div class='pay-state'><h1>" + esc(t("Niet gevonden", "Not found")) + "</h1><p>" + esc(t("Deze link klopt niet of is verlopen. Mail ons gerust: hallo@apero-culture.nl", "This link is wrong or expired. Feel free to email us: hallo@apero-culture.nl")) + "</p></div>";
    }
    function renderConnError() {
      root.innerHTML = "<div class='pay-state'><h1>" + esc(t("Even geen verbinding", "Connection problem")) + "</h1><p>" +
        esc(t("We konden de betaalstatus niet ophalen. Dit ligt meestal aan een adblocker of trage verbinding, niet aan je betaling. Je betaling is veilig. Probeer het opnieuw, of open deze pagina in een andere browser.",
              "We couldn't load your payment status. This is usually an ad blocker or slow connection, not your payment. Your payment is safe. Try again, or open this page in another browser.")) + "</p>" +
        "<p><button class='btn' type='button' data-retry>" + esc(t("Opnieuw proberen", "Try again")) + "</button></p></div>";
      var b = root.querySelector("[data-retry]");
      if (b) b.addEventListener("click", function () { netFails = 0; root.innerHTML = "<div class='pay-state'><div class='spinner'></div><h1>" + esc(t("Betaling checken…", "Checking your payment…")) + "</h1></div>"; poll(); });
    }
    function renderPaid(data) {
      var link = "./tickets.html?order=" + encodeURIComponent(ref.order) + "&token=" + encodeURIComponent(ref.token);
      var r = data.restaurant;
      var head = r ? t("Aanschuiven maar. Je tafel staat klaar.", "Take a seat. Your table is ready.") : t("Je bent erbij.", "You're in.");
      var body = r
        ? esc(t("Je tafel bij het restaurant staat vast, voor " + r.personen + (r.personen === 1 ? " persoon" : " personen") + ". Alle gegevens staan hieronder en in je mailbox.",
                "Your table at the restaurant is confirmed, for " + r.personen + (r.personen === 1 ? " guest" : " guests") + ". All details are below and in your inbox."))
        : esc(t("Je betaling is binnen, je tickets staan hieronder en in je mailbox.", "Payment received. Your tickets are below and in your inbox."));
      var cta = r ? t("Bekijk je reservering", "View your reservation") : t("Open je tickets", "Open your tickets");
      root.innerHTML = "<div class='pay-state is-paid'><h1>" + esc(head) + "</h1><p>" + body + "</p>" +
        "<p class='pay-ref'>" + esc(t("Bestelreferentie", "Order reference")) + ": <b>" + esc(data.short_ref) + "</b></p>" +
        "<p><a class='btn' href='" + link + "'>" + esc(cta) + "</a></p>" +
        "<p style='margin-top:14px'><a href='/festival.html' style='text-decoration:underline'>" + esc(t("Terug naar het festival", "Back to the festival")) + "</a></p></div><div class='tix-grid'></div>";
      renderTickets(root.querySelector(".tix-grid"), data);
      try { STORAGE.removeItem("apero-order"); } catch (e) {}
      // Meta Purchase — één keer per order; eventID = order_id voor CAPI-dedup
      try {
        var fkey = "apero-purchase-fired:" + ref.order;
        if (typeof window.aperoTrack === "function" && !STORAGE.getItem(fkey)) {
          window.aperoTrack("Purchase", {
            value: (data.total_cents || 0) / 100, currency: "EUR",
            num_items: (data.items || []).reduce(function (s, it) { return s + (it.qty || 0); }, 0),
            content_type: "product",
            contents: (data.items || []).map(function (it) { return { id: it.type_id, quantity: it.qty }; })
          }, { eventID: ref.order });
          STORAGE.setItem(fkey, "1");
        }
      } catch (e) {}
    }
    function renderSlow() {
      root.innerHTML = "<div class='pay-state'><h1>" + esc(t("Duurt het wat langer?", "Taking a bit longer?")) + "</h1><p>" + esc(t("Zodra je betaling binnen is, komen je tickets per mail. Deze pagina kun je later opnieuw openen via dezelfde link.", "As soon as your payment lands, your tickets arrive by email. You can reopen this page later via the same link.")) + "</p></div>";
    }
    function renderFailed(data) {
      var retry = data && data.checkout_url
        ? "<p><a class='btn' href='" + esc(data.checkout_url) + "'>" + esc(t("Betaling hervatten", "Resume payment")) + "</a></p>"
        : "<p><a class='btn' href='./index.html#ticketshop'>" + esc(t("Probeer opnieuw", "Try again")) + "</a></p>";
      root.innerHTML = "<div class='pay-state'><h1>" + esc(t("De betaling is niet gelukt", "The payment did not go through")) + "</h1><p>" + esc(t("Er is niets afgeschreven. Je kunt het gewoon opnieuw proberen.", "Nothing was charged. You can simply try again.")) + "</p>" + retry + "</div>";
    }
  }

  var ticketsRoot = document.querySelector("[data-page-tickets]");
  if (ticketsRoot) {
    loadConfig().catch(function(){}).then(function () {
      if (friendRef()) initFriendTicket(ticketsRoot);
      else initTickets(ticketsRoot);
    });
  }

  function friendRef() {
    var q = new URLSearchParams(location.search);
    var id = q.get("ticket"), tkt = q.get("tkt");
    return (id && tkt) ? { ticket: id, tkt: tkt } : null;
  }

  function initTickets(root) {
    var ref = orderRef();
    if (!ref) { renderRecovery(root); return; }
    var ticketTries = 0;
    (function load() {
    fetchStatus(ref).then(function (data) {
      if (data.status !== "paid" && data.status !== "refunded") {
        var pendingHead = data.restaurant ? t("Nog geen reservering", "No reservation yet") : t("Nog geen tickets", "No tickets yet");
        root.innerHTML = "<h1>" + esc(pendingHead) + "</h1><p>" + esc(t("Deze bestelling is nog niet betaald.", "This order has not been paid yet.")) + "</p>"; return;
      }
      var r = data.restaurant;
      var note = r
        ? t("Meld je rond de starttijd bij het restaurant. Toon deze pagina of je mail als je daarnaar wordt gevraagd, verder hoef je niets te doen.",
            "Please arrive around the start time and check in at the restaurant. Show this page or your email if asked, no further action needed.")
        : (CFG && CFG.ticket_design ? CFG.ticket_design[lang() === "en" ? "note_en" : "note_nl"] : "");
      var heading = r ? t("Je reservering", "Your reservation") : t("Je tickets", "Your tickets");
      var printLabel = r ? t("Print je reservering", "Print your reservation") : t("Print je tickets", "Print your tickets");
      root.innerHTML = "<div class='tix-head'><h1>" + esc(heading) + "</h1>" +
        "<p>" + esc(data.buyer_name) + " · " + esc(data.short_ref) + "</p>" +
        "<button type='button' class='btn btn-ghost tix-print'>" + esc(printLabel) + "</button></div>" +
        "<div class='tix-grid'></div>" + (note ? "<p class='tix-note'>" + esc(note) + "</p>" : "");
      renderTickets(root.querySelector(".tix-grid"), data);
      root.querySelector(".tix-print").addEventListener("click", function () { window.print(); });
    }).catch(function (err) {
      if (err && err.code === 404) {
        root.innerHTML = "<h1>" + esc(t("Niet gevonden", "Not found")) + "</h1><p>" + esc(t("Deze link klopt niet. Mail ons gerust: hallo@apero-culture.nl", "This link is not right. Feel free to email us: hallo@apero-culture.nl")) + "</p>";
        return;
      }
      ticketTries++;
      if (ticketTries <= 4) { setTimeout(load, 2500); return; }
      root.innerHTML = "<h1>" + esc(t("Even geen verbinding", "Connection problem")) + "</h1><p>" + esc(t("We konden je tickets niet ophalen. Dit ligt meestal aan een adblocker of trage verbinding, niet aan je tickets. Probeer het opnieuw of open deze link in een andere browser.", "We couldn't load your tickets. This is usually an ad blocker or slow connection, not your tickets. Try again or open this link in another browser.")) + "</p><p><button class='btn' type='button' data-retry>" + esc(t("Opnieuw proberen", "Try again")) + "</button></p>";
      var rb = root.querySelector("[data-retry]"); if (rb) rb.addEventListener("click", function () { ticketTries = 0; load(); });
    });
    })();
  }

  /* Zelfbediening "tickets kwijt": stuurt alleen naar het geregistreerde adres,
     respons is altijd neutraal (geen adressen-aftasten mogelijk) */
  function renderRecovery(root) {
    root.innerHTML =
      "<div class='pay-state'><h1>" + esc(t("Tickets kwijt?", "Lost your tickets?")) + "</h1>" +
      "<p>" + esc(t("Vul het e-mailadres in waarmee je bestelde. We sturen je tickets dan opnieuw naar dat adres.", "Enter the email address you ordered with. We will resend your tickets to that address.")) + "</p>" +
      "<form class='shop-form recovery-form' novalidate style='max-width:420px;'>" +
      "<input type='email' data-f='remail' maxlength='254' autocomplete='email' placeholder='" + esc(t("E-mailadres", "Email address")) + "' />" +
      "<input type='text' class='hp' tabindex='-1' autocomplete='off' aria-hidden='true' />" +
      "<button type='submit' class='btn btn-buy'>" + esc(t("Stuur mijn tickets opnieuw", "Resend my tickets")) + "</button>" +
      "<p class='disc-msg' aria-live='polite'></p>" +
      "</form></div>";
    var form = root.querySelector(".recovery-form");
    var msg = form.querySelector(".disc-msg");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = form.querySelector("[data-f='remail']").value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        msg.className = "disc-msg bad";
        msg.textContent = t("Dat e-mailadres klopt niet helemaal.", "That email address does not look right.");
        return;
      }
      var btn = form.querySelector(".btn-buy");
      btn.disabled = true;
      fetch(API + "/resend-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, website: form.querySelector(".hp").value })
      }).then(function (res) {
        if (res.status === 429) {
          btn.disabled = false;
          msg.className = "disc-msg bad";
          msg.textContent = t("Even rustig aan. Probeer het over een paar minuten opnieuw.", "Easy does it. Try again in a few minutes.");
          return;
        }
        msg.className = "disc-msg ok";
        msg.textContent = t("Als er bestellingen op dit adres staan, ontvang je binnen enkele minuten een mail. Check ook je spamfolder.", "If there are orders on this address, an email is on its way. Also check your spam folder.");
      }).catch(function () {
        btn.disabled = false;
        msg.className = "disc-msg bad";
        msg.textContent = t("Geen verbinding. Probeer het opnieuw.", "No connection. Please try again.");
      });
    });
  }

  /* ============== VRIEND-VIEW: één doorgestuurd ticket personaliseren ============== */
  function initFriendTicket(root) {
    injectFwdStyles();
    var ref = friendRef();
    root.innerHTML = "<div class='pay-state'><div class='spinner'></div></div>";
    fetch(API + "/personalize?ticket=" + encodeURIComponent(ref.ticket) + "&tkt=" + encodeURIComponent(ref.tkt))
      .then(function (res) { if (!res.ok) throw new Error("nf"); return res.json(); })
      .then(function (resp) { renderFriend(root, resp, ref); })
      .catch(function () {
        root.innerHTML = "<h1>" + esc(t("Niet gevonden", "Not found")) + "</h1><p>" + esc(t("Deze link klopt niet of is verlopen. Vraag de afzender om 'm opnieuw te sturen.", "This link is wrong or expired. Ask the sender to resend it.")) + "</p>";
      });
  }

  function renderFriend(root, resp, ref, editing) {
    var tk = resp.ticket || {};
    var fields = resp.fields || [];
    var showForm = editing || !tk.personalized;
    var head = "<div class='tix-head'><h1>" + esc(t("Jouw ticket", "Your ticket")) + "</h1>" +
      "<p>" + esc(tk.from_name ? t("Gestuurd door ", "Sent by ") + tk.from_name : t("APÉRO Festival", "APÉRO Festival")) + "</p></div>";
    if (!showForm) {
      // toon het ticket + mogelijkheid tot aanpassen
      root.innerHTML = head + "<div class='tix-grid'></div>" +
        "<p style='text-align:center;margin-top:14px;'><button type='button' class='btn btn-ghost fr-edit'>" + esc(t("Gegevens aanpassen", "Edit details")) + "</button></p>";
      renderTickets(root.querySelector(".tix-grid"), { tickets: [tk], buyer_name: tk.holder_name || "", short_ref: "" }, { allowForward: false });
      root.querySelector(".fr-edit").addEventListener("click", function () { renderFriend(root, resp, ref, true); });
      return;
    }
    var cd = tk.custom_data || {};
    var fhtml = fields.map(function (f) { return friendField(f, cd[f.key]); }).join("");
    root.innerHTML = head +
      "<form class='shop-form fr-form' novalidate>" +
      "<p class='fr-intro'>" + esc(t("Vul je gegevens in zodat we weten wie er komt. Daarna staat je QR-code klaar.", "Fill in your details so we know who's coming. Your QR code is ready right after.")) + "</p>" +
      "<label class='field-row'><span>" + esc(t("Naam", "Name")) + " *</span><input type='text' data-fr='name' maxlength='100' value='" + esc(tk.holder_name || "") + "' /></label>" +
      "<label class='field-row'><span>" + esc(t("E-mailadres", "Email address")) + " *</span><input type='email' data-fr='email' maxlength='254' value='" + esc(tk.holder_email || "") + "' /></label>" +
      fhtml +
      "<button type='submit' class='btn btn-buy'>" + esc(t("Bevestig en toon mijn ticket", "Confirm and show my ticket")) + "</button>" +
      "<p class='disc-msg' aria-live='polite'></p></form>";
    var form = root.querySelector(".fr-form");
    form.addEventListener("submit", function (e) { e.preventDefault(); submitFriend(form, root, resp, ref); });
  }

  function friendField(f, value) {
    var label = (lang() === "en" ? f.label_en : f.label_nl) || f.label_nl || f.key;
    label += (f.required ? " *" : "");
    var attr = "data-frf='" + esc(f.key) + "'";
    var inner;
    if (f.type === "select") {
      inner = "<select " + attr + "><option value=''></option>" + (f.options || []).map(function (o) { return "<option value='" + esc(o) + "'" + (String(value) === String(o) ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("") + "</select>";
    } else if (f.type === "checkbox") {
      return "<label class='field-check'><input type='checkbox' " + attr + (value ? " checked" : "") + " /> <span>" + esc(label) + "</span></label>";
    } else if (f.type === "date") {
      var maxDate = new Date().toISOString().slice(0, 10);
      inner = "<input type='date' " + attr + " max='" + maxDate + "' value='" + esc(value || "") + "' />";
    } else {
      inner = "<input type='" + (f.type === "number" ? "number" : "text") + "' " + attr + " maxlength='120' value='" + esc(value || "") + "' />";
    }
    return "<label class='field-row'><span>" + esc(label) + "</span>" + inner + "</label>";
  }

  function submitFriend(form, root, resp, ref) {
    var msg = form.querySelector(".disc-msg");
    var name = form.querySelector("[data-fr='name']").value.trim();
    var email = form.querySelector("[data-fr='email']").value.trim();
    if (name.length < 2) { msg.className = "disc-msg bad"; msg.textContent = t("Vul je naam in.", "Enter your name."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { msg.className = "disc-msg bad"; msg.textContent = t("Dat e-mailadres klopt niet helemaal.", "That email address does not look right."); return; }
    var fields = {};
    var miss = null;
    (resp.fields || []).forEach(function (f) {
      var inp = form.querySelector("[data-frf='" + f.key + "']");
      if (!inp) return;
      var v = inp.type === "checkbox" ? (inp.checked ? "ja" : "") : inp.value.trim();
      fields[f.key] = v;
      if (f.required && !v && !miss) miss = (lang() === "en" ? f.label_en : f.label_nl) || f.key;
    });
    if (miss) { msg.className = "disc-msg bad"; msg.textContent = t("Vul dit veld in: ", "Please fill in: ") + miss; return; }
    var btn = form.querySelector(".btn-buy");
    btn.disabled = true; btn.textContent = t("Bezig…", "Working…");
    fetch(API + "/personalize", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "personalize", ticket_id: ref.ticket, ticket_token: ref.tkt, holder_name: name, holder_email: email, fields: fields })
    }).then(function (res) { return res.json().then(function (d) { return { status: res.status, data: d }; }); })
      .then(function (r) {
        if (r.status === 200 && r.data.ok) { initFriendTicket(root); return; }
        btn.disabled = false; btn.textContent = t("Bevestig en toon mijn ticket", "Confirm and show my ticket");
        msg.className = "disc-msg bad";
        msg.textContent = r.status === 429 ? t("Even rustig aan. Probeer het zo opnieuw.", "Easy does it. Try again shortly.")
          : t("Opslaan lukte niet. Probeer het opnieuw.", "Saving failed. Please try again.");
      }).catch(function () {
        btn.disabled = false; btn.textContent = t("Bevestig en toon mijn ticket", "Confirm and show my ticket");
        msg.className = "disc-msg bad"; msg.textContent = t("Geen verbinding. Probeer het opnieuw.", "No connection. Please try again.");
      });
  }

  function injectFwdStyles() {
    if (document.getElementById("apero-fwd-styles")) return;
    var css =
      "[data-page-tickets] .fr-form,[data-page-tickets] .recovery-form{display:flex;flex-direction:column;gap:12px;max-width:460px;margin:0 auto}" +
      "[data-page-tickets] .fr-intro{font-size:14px;color:rgba(35,27,19,.65);line-height:1.5;margin:0}" +
      "[data-page-tickets] .fr-form input,[data-page-tickets] .fr-form select{width:100%;padding:13px 15px;border:1px solid rgba(35,27,19,.2);border-radius:10px;font-size:16px;font-family:inherit;color:#231B13;background:#fff}" +
      "[data-page-tickets] .fr-form .field-row{display:flex;flex-direction:column;gap:5px;font-size:13px;color:rgba(35,27,19,.7)}" +
      "[data-page-tickets] .fr-form .field-check{flex-direction:row;align-items:center;gap:9px}" +
      "[data-page-tickets] .fr-form input:focus,[data-page-tickets] .fr-form select:focus{outline:none;border-color:#C45F38;box-shadow:0 0 0 3px rgba(196,95,56,.12)}" +
      ".tix-forward{margin-top:12px;border-top:1px dashed rgba(35,27,19,.18);padding-top:12px}" +
      ".tix-forward .tix-fwd-label{display:block;font-size:12.5px;font-weight:600;color:#C45F38;margin-bottom:7px}" +
      ".tix-forward .tix-fwd-row{display:flex;gap:8px;flex-wrap:wrap}" +
      ".tix-forward input{flex:1 1 160px;padding:10px 12px;border:1px solid rgba(35,27,19,.2);border-radius:9px;font-size:15px;font-family:inherit;color:#231B13;background:#fff}" +
      ".tix-forward button{background:#C45F38;color:#F4EAD6;border:0;border-radius:9px;padding:10px 16px;font-weight:600;font-size:14px;cursor:pointer;font-family:inherit}" +
      ".tix-forward .tix-fwd-msg{margin:7px 0 0;font-size:12.5px}.tix-forward .tix-fwd-msg.ok{color:#1e7a3c}.tix-forward .tix-fwd-msg.bad{color:#b3372e}" +
      ".tix-forward .tix-fwd-sent{font-size:12.5px;color:rgba(35,27,19,.6);margin-bottom:7px}";
    // Dark mode: idem als de shop, tekst die direct op de (navy) pagina-achtergrond
    // staat moet omklappen naar crème/terracotta.
    css +=
      "[data-theme='dark'] .fr-intro{color:rgba(244,234,214,.7)}" +
      "[data-theme='dark'] .fr-form .field-row{color:rgba(244,234,214,.75)}" +
      "[data-theme='dark'] .tix-forward{border-top-color:rgba(244,234,214,.2)}" +
      "[data-theme='dark'] .tix-forward .tix-fwd-label{color:#ac595a}" +
      "[data-theme='dark'] .tix-forward .tix-fwd-msg.ok{color:#4fae72}[data-theme='dark'] .tix-forward .tix-fwd-msg.bad{color:#e08a82}" +
      "[data-theme='dark'] .tix-forward .tix-fwd-sent{color:rgba(244,234,214,.65)}";
    var st = document.createElement("style"); st.id = "apero-fwd-styles"; st.textContent = css;
    document.head.appendChild(st);
  }

  // Ticketontwerp per categorie: toegang blijft de standaardhuisstijl (geen
  // wijziging voor het gros van de bestaande tickets); proeverij/restaurant/crew
  // krijgen een eigen accentkleur + badge zodat je in één oogopslag ziet wat
  // voor ticket het is.
  var BUCKET_META = {
    proeverij: { accent: "#EEB24A", nl: "Proeverij", en: "Tasting" },
    restaurant: { accent: "#8C9A6A", nl: "Restaurant", en: "Restaurant" },
    crew: { accent: "#546e7a", nl: "Crew", en: "Crew" }
  };

  function renderTickets(grid, data, opts) {
    if (!grid || !data.tickets) return;
    var allowForward = !opts || opts.allowForward !== false;
    injectFwdStyles();
    var d = (CFG && CFG.ticket_design) || {};
    // Standaard premium huisstijl, ticket_design mag elk veld overschrijven.
    var accent = d.accent || "#C45F38";   // terracotta
    var ink = d.ink || "#231B13";         // espresso
    var bg = d.bg || "#F4EAD6";           // panna
    var gold = "#EEB24A";                 // burro
    var ev = (CFG && CFG.event) || {};
    var eventName = ev.name || "APÉRO Festival";
    var edition = (ev.location ? ev.location + " · " : "") + (ev.dates_nl || "juni 2027");
    var tickets = data.tickets || [];
    var total = tickets.length;
    var buyer = data.buyer_name || "";
    var ref = data.short_ref || "";

    tickets.forEach(function (tk, i) {
      tk = tk || {};
      var voided = tk.status === "void";
      var card = el("div", "tix-card" + (voided ? " is-void" : ""));
      // Overschrijfbare basis via CSS-variabelen op de kaart zelf.
      card.style.setProperty("--tix-accent", accent);
      card.style.setProperty("--tix-ink", ink);
      card.style.setProperty("--tix-bg", bg);
      card.style.setProperty("--tix-gold", gold);
      var catMeta = BUCKET_META[tk.bucket];
      if (catMeta) card.style.setProperty("--tix-accent", catMeta.accent);

      var validDays = Array.isArray(tk.valid_days) ? tk.valid_days : [];
      var dayChips = validDays.map(function (x) {
        return "<span class='tix-day'>" + esc(dayLabel(x)) + "</span>";
      }).join("");
      // Zonder dagen is een toegangsticket voor alle dagen geldig. Een los
      // extra (zoals de proeverij bij Bottles & Booze) heeft de datum in de naam.
      if (!dayChips && (!tk.bucket || tk.bucket === "toegang")) dayChips = "<span class='tix-day'>" + esc(t("Alle dagen", "All days")) + "</span>";

      var typeName = (lang() === "en" ? tk.name_en : tk.name_nl) || tk.name_nl || tk.name_en || "";
      var code = tk.code || "";
      var holder = tk.holder_name || "";

      var nameBlock = holder
        ? "<div class='tix-name'>" + esc(holder) + "</div>"
        : (buyer ? "<div class='tix-name tix-name--buyer'>" + esc(buyer) + "</div>" : "");

      card.innerHTML =
        "<div class='tix-main'>" +
          "<div class='tix-brand'>" +
            "<span class='tix-logo flower' aria-hidden='true'></span>" +
            "<div class='tix-brand-text'>" +
              "<span class='tix-wordmark'>" + esc(eventName) + "</span>" +
              "<span class='tix-edition'>" + esc(edition) + "</span>" +
            "</div>" +
            "<span class='tix-count'>" + (i + 1) + " / " + total + "</span>" +
          "</div>" +
          "<div class='tix-body'>" +
            (dayChips ? "<div class='tix-daywrap'>" +
              "<span class='tix-daylabel'>" + esc(t("Geldig op", "Valid on")) + "</span>" +
              "<div class='tix-days'>" + dayChips + "</div>" +
            "</div>" : "") +
            (catMeta ? "<div class='tix-badge' style='display:inline-block;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:" + catMeta.accent + ";border:1px solid " + catMeta.accent + ";border-radius:20px;padding:3px 10px;margin-bottom:6px;'>" + esc(t(catMeta.nl, catMeta.en)) + "</div>" : "") +
            (typeName ? "<div class='tix-type'>" + esc(typeName) + "</div>" : "") +
            nameBlock +
          "</div>" +
        "</div>" +
        "<div class='tix-stub'>" +
          "<div class='tix-qr'></div>" +
          "<div class='tix-code'>" + esc(formatCode(code)) + "</div>" +
          (ref ? "<div class='tix-ref'>" + esc(t("Ticketnr.", "Ticket no.")) + " " + esc(ref) + "</div>" : "") +
        "</div>" +
        (voided ? "<div class='tix-void'>" + esc(t("Ongeldig", "Void")) + "</div>" : "");

      // Zelfservice dagwissel (alleen geldige, niet-gescande dagtickets met alternatieven)
      var swapTo = Array.isArray(tk.swap_to) ? tk.swap_to : [];
      if (!voided && swapTo.length && code) {
        var act = el("div", "tix-actions");
        act.innerHTML = "<span class='tix-swaplabel'>" + esc(t("Wissel van dag", "Switch day")) + "</span>" +
          "<div class='tix-swapbtns'>" + swapTo.map(function (dd) {
            return "<button type='button' class='tix-swapbtn' data-day='" + esc(dd) + "' data-code='" + esc(code) + "'>" + esc(dayLabel(dd)) + "</button>";
          }).join("") + "</div><p class='tix-swapmsg' aria-live='polite'></p>";
        card.appendChild(act);
        act.querySelectorAll(".tix-swapbtn").forEach(function (b) {
          b.addEventListener("click", function () { doSwap(b, act); });
        });
      }

      // Dit ticket naar een vriend sturen (alleen koper-view, meerdere tickets)
      if (allowForward && !voided && tk.id && total > 1) {
        var oref = orderRef();
        if (oref) {
          var fwd = el("div", "tix-forward");
          var sent = tk.holder_email
            ? "<div class='tix-fwd-sent'>" + esc(t("Gestuurd naar ", "Sent to ") + tk.holder_email + (tk.personalized ? " · " + t("ingevuld", "completed") : " · " + t("wacht op invullen", "awaiting details"))) + "</div>"
            : "";
          fwd.innerHTML = "<span class='tix-fwd-label'>" + esc(t("Dit ticket naar een vriend sturen", "Send this ticket to a friend")) + "</span>" + sent +
            "<div class='tix-fwd-row'><input type='email' class='tix-fwd-email' placeholder='" + esc(t("E-mail van je vriend", "Friend's email")) + "' maxlength='254' />" +
            "<button type='button' class='tix-fwd-btn'>" + esc(t("Versturen", "Send")) + "</button></div><p class='tix-fwd-msg' aria-live='polite'></p>";
          card.appendChild(fwd);
          fwd.querySelector(".tix-fwd-btn").addEventListener("click", function () { doForward(fwd, tk.id); });
        }
      }

      grid.appendChild(card);
      drawQr(card.querySelector(".tix-qr"), "APERO1." + code);
    });
  }

  function doForward(box, ticketId) {
    var ref = orderRef(); if (!ref) return;
    var email = box.querySelector(".tix-fwd-email").value.trim();
    var msg = box.querySelector(".tix-fwd-msg");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { msg.className = "tix-fwd-msg bad"; msg.textContent = t("Dat e-mailadres klopt niet helemaal.", "That email address does not look right."); return; }
    var btn = box.querySelector(".tix-fwd-btn"); btn.disabled = true;
    msg.className = "tix-fwd-msg"; msg.textContent = t("Versturen…", "Sending…");
    fetch(API + "/personalize", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "forward", order: ref.order, token: ref.token, ticket_id: ticketId, friend_email: email })
    }).then(function (res) { return res.json().then(function (d) { return { status: res.status, data: d }; }); })
      .then(function (r) {
        if (r.status === 200 && r.data.ok) {
          msg.className = "tix-fwd-msg ok";
          msg.textContent = t("Verstuurd. Je vriend krijgt een mail om het ticket op naam te zetten.", "Sent. Your friend gets an email to put the ticket in their name.");
          box.querySelector(".tix-fwd-email").value = ""; btn.disabled = false; return;
        }
        btn.disabled = false; msg.className = "tix-fwd-msg bad";
        msg.textContent = r.status === 429 ? t("Even rustig aan. Probeer het zo opnieuw.", "Easy does it. Try again shortly.")
          : t("Versturen lukte niet. Probeer het opnieuw.", "Sending failed. Please try again.");
      }).catch(function () {
        btn.disabled = false; msg.className = "tix-fwd-msg bad"; msg.textContent = t("Geen verbinding. Probeer het opnieuw.", "No connection. Please try again.");
      });
  }

  function doSwap(btn, box) {
    var ref = orderRef();
    if (!ref) return;
    var day = btn.getAttribute("data-day");
    var code = btn.getAttribute("data-code");
    var msg = box.querySelector(".tix-swapmsg");
    if (!window.confirm(t("Je ticket omwisselen naar ", "Switch your ticket to ") + dayLabel(day) + "?")) return;
    box.querySelectorAll(".tix-swapbtn").forEach(function (b) { b.disabled = true; });
    msg.className = "tix-swapmsg";
    msg.textContent = t("Bezig…", "Working…");
    fetch(API + "/swap-ticket", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: ref.order, token: ref.token, code: code, target_day: day })
    }).then(function (res) {
      return res.json().then(function (data) { return { status: res.status, data: data }; });
    }).then(function (r) {
      if (r.status === 200 && r.data.ok) {
        msg.className = "tix-swapmsg ok";
        msg.textContent = t("Gewisseld. Je ticket wordt bijgewerkt…", "Switched. Updating your ticket…");
        var rt = document.querySelector("[data-page-tickets]");
        setTimeout(function () { if (rt) initTickets(rt); }, 700);
        return;
      }
      box.querySelectorAll(".tix-swapbtn").forEach(function (b) { b.disabled = false; });
      msg.className = "tix-swapmsg bad";
      if (r.data.error === "sold_out") msg.textContent = t("Die dag is helaas uitverkocht.", "That day is sold out.");
      else if (r.data.error === "already_scanned") msg.textContent = t("Dit ticket is al gescand en kan niet meer wisselen.", "This ticket was already scanned and cannot be switched.");
      else if (r.data.error === "rate_limited") msg.textContent = t("Even rustig aan, probeer het zo opnieuw.", "Easy does it, try again shortly.");
      else msg.textContent = t("Wisselen lukte niet. Probeer het later opnieuw.", "Switching failed. Please try again later.");
    }).catch(function () {
      box.querySelectorAll(".tix-swapbtn").forEach(function (b) { b.disabled = false; });
      msg.className = "tix-swapmsg bad";
      msg.textContent = t("Geen verbinding. Probeer het opnieuw.", "No connection. Please try again.");
    });
  }
  function formatCode(code) { code = String(code || ""); return (code.match(/.{1,5}/g) || [code]).join("-"); }
  function drawQr(node, payload) {
    if (typeof qrcode !== "function") { node.textContent = payload; return; }
    var qr = qrcode(0, "M"); qr.addData(payload); qr.make();
    node.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  }
})();
