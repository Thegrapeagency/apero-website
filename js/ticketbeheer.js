/* NvdW kassa-/CMS-admin. Alle data via de admin edge function met x-admin-key. Vanilla JS, IIFE. */
(function () {
  "use strict";

  var API = "https://snfojphxsbzfewwfbfka.supabase.co/functions/v1/apero/admin";
  // Losse functie, zelfde x-admin-key. Staat apart omdat de admin-functie te
  // groot is om veilig te herdeployen zonder de Supabase CLI.
  var API_TICKET_FIELDS = "https://snfojphxsbzfewwfbfka.supabase.co/functions/v1/apero/ticket-fields";
  var API_TICKET_VOID = "https://snfojphxsbzfewwfbfka.supabase.co/functions/v1/apero/ticket-void";
  var API_TICKET_REFUND = "https://snfojphxsbzfewwfbfka.supabase.co/functions/v1/apero/ticket-refund";
  var API_INVOICE = "https://snfojphxsbzfewwfbfka.supabase.co/functions/v1/invoice";
  var key = localStorage.getItem("apero-admin") || "";

  var DAYS = { thu: "Donderdag", fri: "Vrijdag", sat: "Zaterdag", sun: "Zondag" };
  var DAYS_SHORT = { thu: "DO", fri: "VR", sat: "ZA", sun: "ZO" };

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function euro(c) {
    c = Math.round(Number(c) || 0);
    var neg = c < 0; c = Math.abs(c);
    return (neg ? "- " : "") + "€ " + Math.floor(c / 100).toLocaleString("nl-NL") + "," + ("0" + (c % 100)).slice(-2);
  }
  /* "19,50" of "19.50" of "1950 cent"? Wij verwachten euro-invoer -> cent int. */
  function euroToCents(str) {
    if (str == null) return 0;
    str = String(str).trim().replace(/[€\s]/g, "").replace(",", ".");
    if (str === "") return 0;
    var n = parseFloat(str);
    if (isNaN(n)) return 0;
    return Math.round(n * 100);
  }
  function centsToEuroInput(c) {
    c = Math.round(Number(c) || 0);
    return (c / 100).toFixed(2).replace(".", ",");
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function attr(s) { return esc(s); }
  /* Datum/tijd altijd in Nederlandse tijd (Europe/Amsterdam), niet in UTC. */
  function fmtDateTime(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return esc(String(iso).slice(0, 16).replace("T", " "));
    try {
      return esc(d.toLocaleString("nl-NL", {
        timeZone: "Europe/Amsterdam",
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      }));
    } catch (e) {
      return esc(String(iso).slice(0, 16).replace("T", " "));
    }
  }
  function fmtDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return esc(String(iso).slice(0, 10));
    try {
      return esc(d.toLocaleDateString("nl-NL", {
        timeZone: "Europe/Amsterdam",
        day: "2-digit", month: "2-digit", year: "numeric"
      }));
    } catch (e) {
      return esc(String(iso).slice(0, 10));
    }
  }
  function dt(s) { return fmtDateTime(s); }
  function dshort(s) { return fmtDate(s); }
  function statusClass(s) { return "st st-" + String(s || "none").toLowerCase().replace(/[^a-z0-9_]/g, ""); }
  function days(arr) {
    if (!arr || !arr.length) return "–";
    return arr.map(function (d) { return DAYS_SHORT[d] || esc(d); }).join(" · ");
  }
  function emptyRow(cols, txt) {
    return "<tr><td colspan='" + cols + "' class='muted' style='padding:14px 9px;'>" + esc(txt || "Geen resultaten.") + "</td></tr>";
  }
  /* slug voor ids/keys: lowercase, a-z0-9_, accenten weg */
  function slugify(s) {
    s = String(s == null ? "" : s).toLowerCase();
    try { s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) { /* oudere browser, dan zonder accent-strip */ }
    return s.replace(/[^a-z0-9]+/g, "_").replace(/_{2,}/g, "_").replace(/^_+|_+$/g, "");
  }

  function toast(msg, kind) {
    var box = $("toast");
    var el = document.createElement("div");
    el.className = "t" + (kind ? " " + kind : "");
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function () { el.style.opacity = "0"; el.style.transition = "opacity .4s"; }, 3200);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 3700);
  }

  /* ---------- API call ---------- */
  function call(path, opts, cb) {
    opts = opts || {};
    opts.headers = Object.assign({ "x-admin-key": key }, opts.headers || {});
    fetch(path.indexOf("http") === 0 ? path : API + path, opts).then(function (res) {
      if (res.status === 401) {
        localStorage.removeItem("apero-admin");
        location.reload();
        return;
      }
      if (path.indexOf("export") > -1 || path.indexOf("backup") > -1 || path.indexOf("guests.csv") > -1) {
        return res.blob().then(function (b) { cb(res.ok, b); });
      }
      return res.json().then(function (d) { cb(res.ok, d); }).catch(function () { cb(false, null); });
    }).catch(function () { cb(false, null); });
  }
  function get(path, cb) { call(path, {}, cb); }
  function post(path, body, cb) {
    call(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, cb);
  }
  function del(path, cb) { call(path, { method: "DELETE" }, cb); }

  /* ---------- login ---------- */
  $("loginbtn").addEventListener("click", doLogin);
  $("key").addEventListener("keydown", function (e) { if (e.key === "Enter") doLogin(); });
  function doLogin() {
    var v = $("key").value.trim();
    if (!v) return;
    key = v;
    // probeer een call; bij 401 reset call() de boel zelf
    get("/stats", function (ok, d) {
      if (ok && d) {
        localStorage.setItem("apero-admin", key);
        boot();
      } else {
        $("login-err").style.display = "block";
        key = "";
      }
    });
  }
  $("logoutbtn").addEventListener("click", function () {
    localStorage.removeItem("apero-admin");
    location.reload();
  });

  if (key) boot();

  var refreshTimer = null;
  function boot() {
    $("login").style.display = "none";
    $("app").style.display = "block";
    setupNav();
    loadTypes();   // tickettype-namen vooraf laden voor leesbare orderdetails
    loadOverview();
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(function () {
      if (currentSec === "overview") loadOverview();
    }, 60000);
  }

  /* ---------- navigation ---------- */
  var currentSec = "overview";
  var loaders = {
    overview: loadOverview,
    orders: loadOrders,
    paylog: loadPaylog,
    guests: loadGuests,
    types: loadTypes,
    fields: loadFields,
    discounts: loadDiscounts,
    reminders: loadReminders,
    waitlist: loadWaitlist,
    nieuwsbrief: loadNieuwsbrief,
    scanners: loadScanners,
    settings: loadSettings
  };
  var loadedOnce = {};
  function setupNav() {
    qsa("#nav a").forEach(function (a) {
      a.addEventListener("click", function () { showSec(a.getAttribute("data-sec")); });
    });
  }
  function showSec(sec) {
    currentSec = sec;
    qsa("#nav a").forEach(function (a) { a.classList.toggle("active", a.getAttribute("data-sec") === sec); });
    qsa(".section").forEach(function (s) { s.classList.toggle("active", s.getAttribute("data-sec") === sec); });
    if (!loadedOnce[sec] || sec === "overview") {
      loadedOnce[sec] = true;
      if (loaders[sec]) loaders[sec]();
    }
    window.scrollTo(0, 0);
  }

  /* ============================================================
     1. OVERVIEW
  ============================================================ */
  $("ov-refresh").addEventListener("click", loadOverview);
  if ($("ps-tab-rev")) $("ps-tab-rev").addEventListener("click", function () { setPresaleMetric("rev"); });
  if ($("ps-tab-tix")) $("ps-tab-tix").addEventListener("click", function () { setPresaleMetric("tix"); });
  if ($("ps-tab-visitors")) $("ps-tab-visitors").addEventListener("click", function () { setPresaleMetric("visitors"); });
  function loadOverview() {
    get("/stats", function (ok, d) {
      if (!ok || !d) { toast("Statistieken laden mislukt.", "err"); return; }
      var rev = d.revenue || {};
      $("k-rev").textContent = euro(rev.paid_total_cents || 0);
      if ($("k-tickets")) $("k-tickets").textContent = String(d.tickets_total || 0);
      $("k-orders").textContent = String(rev.orders_paid || 0);
      $("k-fees").textContent = euro(rev.service_fees_cents || 0);
      $("k-scans").textContent = String(d.scans_today || 0);
      $("k-refund").textContent = euro(rev.refunded_total_cents || 0);
      $("ov-time").textContent = "Laatst: " + new Date().toLocaleTimeString("nl-NL");

      renderChart(d.timeseries || []);
      // voorverkoop-historie en publieksmix zijn er pas vanaf een tweede editie
      renderDays(d);
      renderDemographics(d.demographics || {});
      renderCategorieen(d.per_categorie || [], d.per_categorie_per_dag || []);

      // per type
      var tt = document.querySelector("#t-type tbody");
      tt.innerHTML = (d.per_type || []).map(function (r) {
        return "<tr><td>" + esc(r.name_nl) + "</td><td class='num'>" + euro(r.price_cents) +
          "</td><td class='num'>" + (r.orders_sold || 0) + "</td><td class='num'>" + (r.admissions_sold || 0) + "</td></tr>";
      }).join("") || emptyRow(4, "Nog geen verkoop.");

      // vat split
      var vt = document.querySelector("#t-vat tbody");
      vt.innerHTML = ((rev.vat_split) || []).map(function (r) {
        return "<tr><td>" + esc(r.rate) + "%</td><td class='num'>" + euro(r.gross_cents) + "</td><td class='num'>" + euro(r.vat_cents) + "</td></tr>";
      }).join("") || emptyRow(3, "Geen btw-data.");

      // recent
      var rec = document.querySelector("#t-recent tbody");
      rec.innerHTML = (d.recent || []).map(function (o) { return orderRow(o, false); }).join("") || emptyRow(8, "Nog geen bestellingen.");
      bindOpenButtons(rec);
    });
  }

  /* Bezoekersdata: taartdiagram per koopvraag (woonplaats, leeftijdsgroepen, ...) */
  var PAL = ["#C45F38", "#EEB24A", "#231B13", "#ac595a", "#1e7a3c", "#33357e", "#a87708", "#8c8c8c"];
  // logische volgorde voor leeftijdsbuckets (geboortedatum-veld toont nu leeftijd)
  var AGE_ORDER = ["jonger dan 18", "18 t/m 24", "25 t/m 34", "35 t/m 44", "45 t/m 54", "55 t/m 64", "65 plus"];
  function isAgeKey(k, dd) {
    if (k === "geboortedatum" || k === "leeftijd") return true;
    return String((dd && dd.label) || "").toLowerCase().indexOf("leeftijd") > -1;
  }
  function renderDemographics(demo) {
    var host = $("ov-demo");
    if (!host) return;
    var keys = Object.keys(demo).filter(function (k) { return demo[k] && (demo[k].total || 0) > 0; });
    if (!keys.length) {
      host.innerHTML = "<div class='muted'>Nog geen gegevens. Zet onder Vragen bijvoorbeeld Woonplaats of Leeftijd aan; antwoorden van kopers verschijnen hier vanzelf als grafiek.</div>";
      return;
    }
    host.innerHTML = keys.map(function (k) {
      var dd = demo[k];
      var vals = (dd.values || []).slice();
      var top;
      if (isAgeKey(k, dd)) {
        // leeftijdsbuckets in logische leeftijdsvolgorde tonen (niet op aantal)
        top = vals.slice().sort(function (a, b) {
          var ai = AGE_ORDER.indexOf(String(a.value).toLowerCase());
          var bi = AGE_ORDER.indexOf(String(b.value).toLowerCase());
          if (ai === -1) ai = AGE_ORDER.length;
          if (bi === -1) bi = AGE_ORDER.length;
          return ai - bi;
        });
      } else {
        // top 7 + rest samenvoegen tot 'overig'
        top = vals.slice(0, 7);
        var restN = vals.slice(7).reduce(function (s, v) { return s + (v.count || 0); }, 0);
        if (restN > 0) top.push({ value: "overig", count: restN });
      }
      var total = dd.total || top.reduce(function (s, v) { return s + v.count; }, 0);
      var C = 2 * Math.PI * 42, off = 0, segs = "";
      top.forEach(function (v, i) {
        var len = (v.count / total) * C;
        segs += "<circle r='42' cx='60' cy='60' fill='none' stroke='" + PAL[i % PAL.length] + "' stroke-width='22' " +
          "stroke-dasharray='" + len.toFixed(2) + " " + (C - len).toFixed(2) + "' stroke-dashoffset='" + (-off).toFixed(2) + "' transform='rotate(-90 60 60)'></circle>";
        off += len;
      });
      var legend = top.map(function (v, i) {
        var p = Math.round((v.count / total) * 100);
        var label = String(v.value || "").replace(/^./, function (c) { return c.toUpperCase(); });
        return "<div class='legrow'><span class='dot' style='background:" + PAL[i % PAL.length] + "'></span>" +
          "<span class='leglbl'>" + esc(label) + "</span><span class='legnum'>" + v.count + " · " + p + "%</span></div>";
      }).join("");
      return "<div class='demobox'><div class='demotitle'>" + esc(dd.label || k) + "</div>" +
        "<div class='demoflex'><svg viewBox='0 0 120 120' width='128' height='128' role='img'>" + segs +
        "<text x='60' y='65' text-anchor='middle' font-size='19' font-family='Fraunces,Georgia,serif' font-weight='600' fill='#231B13'>" + total + "</text></svg>" +
        "<div class='legend'>" + legend + "</div></div></div>";
    }).join("");
  }

  /* Tickets uitgesplitst naar toegang/proeverij/restaurant/crew, plus het
     verloop per dag binnen deze editie ("historisch" = deze voorverkoopperiode;
     eerdere edities zijn niet per categorie bijgehouden, alleen in totaal). */
  var CAT_LABEL = { toegang: "Toegang", extra: "Extra", crew: "Crew", overig: "Overig" };
  var CAT_ORDER = ["toegang", "extra", "crew", "overig"];
  function renderCategorieen(perCat, perCatPerDag) {
    var host = $("ov-categorieen");
    if (host) {
      var byBucket = {};
      perCat.forEach(function (r) { byBucket[r.bucket] = r; });
      var tegels = CAT_ORDER.map(function (b) {
        var r = byBucket[b];
        if (!r || (r.tickets === 0 && b !== "toegang")) return "";
        return "<div class='kpi' style='flex:1;min-width:140px;'><b>" + (r.tickets || 0) + "</b>" +
          "<span>" + CAT_LABEL[b] + "</span>" +
          "<div class='hint' style='margin:6px 0 0;'>" + euro(r.omzet_cents || 0) + " · " + (r.orders || 0) + " bestellingen</div></div>";
      }).join("");
      host.innerHTML = "<div style='display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;'>" + tegels + "</div>";
    }

    var tbl = $("t-categorie-dag");
    if (!tbl) return;
    var tb = tbl.getElementsByTagName("tbody")[0];
    var byDag = {};
    perCatPerDag.forEach(function (r) {
      if (!byDag[r.dag]) byDag[r.dag] = {};
      byDag[r.dag][r.bucket] = r;
    });
    var dagen = Object.keys(byDag).sort();
    if (!dagen.length) { tb.innerHTML = emptyRow(CAT_ORDER.length + 1, "Nog geen verkoop."); return; }
    tb.innerHTML = dagen.map(function (dag) {
      var rij = byDag[dag];
      var cellen = CAT_ORDER.map(function (b) {
        var r = rij[b];
        return "<td class='num'>" + (r ? r.tickets + " · " + euro(r.omzet_cents) : "-") + "</td>";
      }).join("");
      return "<tr><td>" + new Date(dag).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }) + "</td>" + cellen + "</tr>";
    }).join("");
  }

  /* Per dag: personen (entree) + proeverijen/restaurant/activiteiten van die dag */
  function renderDays(d) {
    var host = $("ov-days");
    if (!host) return;
    var inv = {};
    (d.inventory || []).forEach(function (r) { inv[r.day] = r; });
    var types = d.per_type || [];
    host.innerHTML = ["thu", "fri", "sat", "sun"].map(function (day) {
      var i = inv[day] || { sold: 0, capacity: 0 };
      // entree-types die op deze dag meetellen en al verkocht zijn
      var entree = types.filter(function (t) {
        return (t.stock_days || []).indexOf(day) > -1 && (t.admissions_sold || 0) > 0;
      });
      // activiteiten: geldig op deze dag, tellen niet mee in dagentree
      var act = types.filter(function (t) {
        return (t.valid_days || []).indexOf(day) > -1 && (t.stock_days || []).length === 0 && t.active !== false;
      });
      var rows = "";
      if (entree.length) {
        rows += "<tr class='subhead'><td colspan='2'>Entree</td></tr>" + entree.map(function (t) {
          return "<tr><td>" + esc(t.name_nl) + "</td><td class='num'>" + (t.admissions_sold || 0) + "</td></tr>";
        }).join("");
      }
      if (act.length) {
        rows += "<tr class='subhead'><td colspan='2'>Extra's en crew</td></tr>" + act.map(function (t) {
          var cap = t.per_type_cap != null ? " <span class='muted'>/ " + t.per_type_cap + "</span>" : "";
          return "<tr><td>" + esc(t.name_nl) + "</td><td class='num'>" + (t.admissions_sold || 0) + cap + "</td></tr>";
        }).join("");
      }
      if (!rows) rows = "<tr><td class='muted'>Nog geen verkoop of activiteiten.</td></tr>";
      var cap = i.capacity || 0, sold = i.sold || 0;
      var pct = cap > 0 ? Math.min(100, Math.round((sold / cap) * 100)) : 0;
      var barCls = pct >= 100 ? "full" : (pct >= 80 ? "warn" : "");
      return "<div class='daycol'>" +
        "<div class='dayname'>" + esc(DAYS[day] || day) + "</div>" +
        "<div class='persons'>" + sold + "<small>bezoekers van " + cap + "</small></div>" +
        "<div class='track' style='margin-top:9px;'><div class='" + barCls + "' style='width:" + pct + "%'></div></div>" +
        "<div class='muted' style='margin-top:5px;'>" + pct + "% gevuld · " + (cap - sold) + " vrij</div>" +
        "<table><tbody>" + rows + "</tbody></table></div>";
    }).join("") + renderLosseDagen(types);
  }
  // Activiteiten zonder festivaldag (bijv. de Teliani-proeverij bij Bottles & Booze
  // op donderdag): geen vr/za/zo en geen dagentree, dus een eigen kolom
  function renderLosseDagen(types) {
    var los = types.filter(function (t) {
      return !(t.valid_days || []).length && !(t.stock_days || []).length && t.active !== false;
    });
    if (!los.length) return "";
    var verkocht = los.reduce(function (s, t) { return s + (t.admissions_sold || 0); }, 0);
    var rows = "<tr class='subhead'><td colspan='2'>Extra's en crew</td></tr>" + los.map(function (t) {
      var cap = t.per_type_cap != null ? " <span class='muted'>/ " + t.per_type_cap + "</span>" : "";
      return "<tr><td>" + esc(t.name_nl) + "</td><td class='num'>" + (t.admissions_sold || 0) + cap + "</td></tr>";
    }).join("");
    return "<div class='daycol'>" +
      "<div class='dayname'>Buiten de festivaldagen</div>" +
      "<div class='persons'>" + verkocht + "<small>tickets</small></div>" +
      "<div class='muted' style='margin-top:5px;'>Telt niet mee in de bezoekers per dag</div>" +
      "<table><tbody>" + rows + "</tbody></table></div>";
  }

  function renderChart(series) {
    var host = $("chart");
    if (!series || !series.length) { host.innerHTML = "<div class='muted'>Nog geen verkoopdata.</div>"; return; }
    var MND = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
    var DAGNM = ["zo", "ma", "di", "wo", "do", "vr", "za"];
    function fmtDag(d) { var p = String(d || "").split("-"); return p.length === 3 ? (parseInt(p[2], 10) + " " + (MND[parseInt(p[1], 10) - 1] || "")) : (d || ""); }
    function fmtDagVol(d) { var p = String(d || "").split("-"); if (p.length !== 3) return d || ""; var dt = new Date(d + "T00:00:00Z"); return DAGNM[dt.getUTCDay()] + " " + parseInt(p[2], 10) + " " + (MND[parseInt(p[1], 10) - 1] || ""); }
    function eShort(c) { var e = Math.round((c || 0) / 100); return e >= 1000 ? "€" + (e / 1000).toFixed(1).replace(".0", "") + "k" : "€" + e; }
    function niceMax(v) { if (!v || v <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log(v) / Math.LN10)); var nn = v / p; var m = nn <= 1 ? 1 : nn <= 2 ? 2 : nn <= 2.5 ? 2.5 : nn <= 5 ? 5 : 10; return m * p; }

    // Ontbrekende dagen aanvullen met 0, zodat de tijd-as doorloopt (incl. nul-verkoopdagen)
    var byDay = {}; series.forEach(function (s) { byDay[s.day] = s; });
    var days = series.map(function (s) { return s.day; }).filter(Boolean).sort();
    var today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" });
    var endDay = (days.length && days[days.length - 1] > today) ? days[days.length - 1] : today;
    var full = [];
    if (days.length) {
      var cur = new Date(days[0] + "T00:00:00Z"), end = new Date(endDay + "T00:00:00Z"), guard = 0;
      while (cur <= end && guard < 500) {
        var key = cur.toISOString().slice(0, 10);
        full.push(byDay[key] || { day: key, revenue_cents: 0, tickets: 0, orders: 0 });
        cur.setUTCDate(cur.getUTCDate() + 1); guard++;
      }
    } else { full = series.slice(); }

    var n = full.length, steps = 4;
    var padL = 46, padR = 44, padT = 22, padB = 28;
    var W = 760, H = 220, base = H - padB, topY = padT, plotH = base - topY, plotW = W - padL - padR;
    var x = function (i) { return n <= 1 ? padL + plotW / 2 : padL + plotW * (i / (n - 1)); };
    var axRev = niceMax(Math.max.apply(null, full.map(function (s) { return s.revenue_cents || 0; }).concat([1])));
    var axTix = niceMax(Math.max.apply(null, full.map(function (s) { return s.tickets || 0; }).concat([1])));
    var revY = function (c) { return base - (Math.max(0, c) / axRev) * plotH; };
    var tixY = function (v) { return base - (Math.max(0, v) / axTix) * plotH; };

    var svg = "<svg viewBox='0 0 " + W + " " + H + "' width='100%' style='max-width:100%; display:block; font-family:Inter,sans-serif; touch-action:none;' xmlns='http://www.w3.org/2000/svg'>";
    svg += "<defs><linearGradient id='aperoArea' x1='0' y1='0' x2='0' y2='1'>" +
      "<stop offset='0' stop-color='#EEB24A' stop-opacity='0.32'/>" +
      "<stop offset='1' stop-color='#EEB24A' stop-opacity='0.02'/></linearGradient></defs>";

    // rasterlijnen + assen (links euro, rechts tickets)
    for (var k = 0; k <= steps; k++) {
      var gy = base - (k / steps) * plotH;
      svg += "<line x1='" + padL + "' y1='" + gy.toFixed(1) + "' x2='" + (W - padR) + "' y2='" + gy.toFixed(1) + "' stroke='rgba(35,27,19," + (k === 0 ? ".16" : ".06") + ")'" + (k === 0 ? "" : " stroke-dasharray='2 5'") + "/>";
      svg += "<text x='" + (padL - 8) + "' y='" + (gy + 3).toFixed(1) + "' text-anchor='end' font-size='9.5' fill='rgba(35,27,19,.5)'>" + eShort(axRev * k / steps) + "</text>";
      svg += "<text x='" + (W - padR + 8) + "' y='" + (gy + 3).toFixed(1) + "' text-anchor='start' font-size='9.5' fill='rgba(196,95,56,.6)'>" + Math.round(axTix * k / steps) + "</text>";
    }
    svg += "<text x='" + padL + "' y='11' font-size='9' fill='rgba(35,27,19,.45)'>euro</text>";
    svg += "<text x='" + (W - padR) + "' y='11' text-anchor='end' font-size='9' fill='rgba(196,95,56,.55)'>tickets</text>";

    var revLine = full.map(function (s, i) { return x(i).toFixed(1) + "," + revY(s.revenue_cents || 0).toFixed(1); }).join(" ");
    var tixLine = full.map(function (s, i) { return x(i).toFixed(1) + "," + tixY(s.tickets || 0).toFixed(1); }).join(" ");
    if (n > 1) {
      // omzet: zacht gevuld vlak + gouden lijn
      svg += "<polygon points='" + padL + "," + base + " " + revLine + " " + (W - padR) + "," + base + "' fill='url(#aperoArea)'/>";
      svg += "<polyline points='" + revLine + "' fill='none' stroke='#e0a12a' stroke-width='2.2' stroke-linejoin='round' stroke-linecap='round'/>";
      // tickets: bordeaux lijn
      svg += "<polyline points='" + tixLine + "' fill='none' stroke='#C45F38' stroke-width='2' stroke-linejoin='round' stroke-linecap='round'/>";
    }
    // eindpunt-markers met huidige waarde
    var last = full[n - 1];
    svg += "<circle cx='" + x(n - 1).toFixed(1) + "' cy='" + revY(last.revenue_cents || 0).toFixed(1) + "' r='3.6' fill='#e0a12a' stroke='#fffdf9' stroke-width='1.5'/>";
    svg += "<circle cx='" + x(n - 1).toFixed(1) + "' cy='" + tixY(last.tickets || 0).toFixed(1) + "' r='3.6' fill='#C45F38' stroke='#fffdf9' stroke-width='1.5'/>";

    // hover-hulplijn + gemarkeerde punten (verborgen tot muis erover beweegt, bijgewerkt via JS)
    svg += "<g class='hv-guide' style='display:none; pointer-events:none;'>" +
      "<line class='hv-line' x1='0' y1='" + topY + "' x2='0' y2='" + base + "' stroke='rgba(35,27,19,.28)' stroke-width='1' stroke-dasharray='3 3'/>" +
      "<circle class='hv-dot-rev' r='5' fill='#e0a12a' stroke='#fffdf9' stroke-width='2'/>" +
      "<circle class='hv-dot-tix' r='5' fill='#C45F38' stroke='#fffdf9' stroke-width='2'/>" +
      "</g>";
    // brede onzichtbare vlakken als hit-target voor muis/touch (geen native title meer, eigen tooltip)
    svg += "<rect class='hv-hit' x='" + padL + "' y='0' width='" + plotW + "' height='" + H + "' fill='transparent' style='cursor:crosshair;'/>";

    // x-as: maximaal 6 gelijk verdeelde datumlabels
    var ticks = Math.min(n, 6);
    for (var t = 0; t < ticks; t++) {
      var idx = ticks <= 1 ? 0 : Math.round((n - 1) * t / (ticks - 1));
      svg += "<text x='" + x(idx).toFixed(1) + "' y='" + (H - 8) + "' text-anchor='middle' font-size='9.5' fill='rgba(35,27,19,.55)'>" + esc(fmtDag(full[idx].day)) + "</text>";
    }
    svg += "</svg>";

    var legend = "<div style='display:flex; gap:18px; font-size:12.5px; color:var(--ink-soft); margin:2px 0 6px;'>" +
      "<span><span style='display:inline-block; width:14px; height:3px; background:#e0a12a; border-radius:2px; vertical-align:3px; margin-right:6px;'></span>Omzet per dag (€, links)</span>" +
      "<span><span style='display:inline-block; width:14px; height:3px; background:#C45F38; border-radius:2px; vertical-align:3px; margin-right:6px;'></span>Tickets per dag (rechts)</span></div>";

    var tooltip = "<div class='hv-tip' style='position:absolute; display:none; pointer-events:none; z-index:5; background:var(--navy); color:#F4EAD6; border-radius:10px; padding:9px 12px; font-size:12px; line-height:1.55; box-shadow:0 8px 22px rgba(35,27,19,.28); white-space:nowrap; transform:translate(-50%,-100%);'></div>";
    var wrap = "<div class='chart-wrap' style='position:relative;'>" + svg + tooltip + "</div>";

    // tabel: alleen dagen met activiteit (nieuwste boven), nul-dagen zitten in de grafiek
    var active = series.filter(function (s) { return (s.revenue_cents || 0) > 0 || (s.orders || s.orders_count || 0) > 0 || (s.tickets || 0) > 0; });
    var maxRev = Math.max.apply(null, active.map(function (s) { return s.revenue_cents || 0; }).concat([1]));
    var rows = active.slice().reverse().map(function (s) {
      var orders = (s.orders != null ? s.orders : (s.orders_count != null ? s.orders_count : 0));
      var rev = s.revenue_cents || 0;
      var pct = maxRev > 0 ? Math.max(2, Math.round((rev / maxRev) * 100)) : 0;
      var bar = "<div style='margin-top:5px; height:6px; background:#ece7da; border-radius:999px; overflow:hidden;'>" +
        "<div style='height:100%; width:" + pct + "%; background:linear-gradient(90deg,#ffd673,#e0a12a); border-radius:999px;'></div></div>";
      return "<tr><td>" + esc(fmtDag(s.day)) + "</td><td class='num'>" + orders + "</td><td class='num'>" + (s.tickets || 0) +
        "</td><td class='num' style='min-width:140px;'>" + euro(rev) + bar + "</td></tr>";
    }).join("");
    var table = "<div class='tablewrap' style='margin-top:16px;'><table style='font-variant-numeric:tabular-nums;'>" +
      "<thead><tr><th>Datum</th><th class='num'>Bestellingen</th><th class='num'>Tickets</th><th class='num'>Omzet</th></tr></thead>" +
      "<tbody>" + (rows || "<tr><td colspan='4' class='muted'>Nog geen verkoop.</td></tr>") + "</tbody></table></div>";
    host.innerHTML = legend + wrap + table;

    // --- interactieve hover: exacte cijfers per dag, eigen tooltip i.p.v. trage native title ---
    var svgEl = host.querySelector(".chart-wrap svg");
    var hitRect = svgEl.querySelector(".hv-hit");
    var guide = svgEl.querySelector(".hv-guide");
    var guideLine = svgEl.querySelector(".hv-line");
    var dotRev = svgEl.querySelector(".hv-dot-rev");
    var dotTix = svgEl.querySelector(".hv-dot-tix");
    var tip = host.querySelector(".hv-tip");
    var wrapEl = host.querySelector(".chart-wrap");

    function dayLabel(s) {
      var isToday = s.day === today;
      var head = "<div style='font-weight:700; font-family:Fraunces,Georgia,serif; font-size:13px; color:#fff; margin-bottom:4px;'>" +
        esc(fmtDagVol(s.day)) + (isToday ? " <span style='color:var(--gold); font-weight:600; font-size:10.5px;'>· vandaag</span>" : "") + "</div>";
      var orders = (s.orders != null ? s.orders : (s.orders_count != null ? s.orders_count : 0));
      var body = "<div style='display:flex; gap:14px;'>" +
        "<div><span style='color:var(--gold); font-weight:700;'>" + esc(euro(s.revenue_cents || 0)) + "</span><br/><span style='opacity:.7; font-size:10.5px;'>omzet</span></div>" +
        "<div><span style='font-weight:700;'>" + (s.tickets || 0) + "</span><br/><span style='opacity:.7; font-size:10.5px;'>tickets</span></div>" +
        "<div><span style='font-weight:700;'>" + orders + "</span><br/><span style='opacity:.7; font-size:10.5px;'>bestellingen</span></div>" +
        "</div>";
      return head + body;
    }

    function showAt(idx) {
      idx = Math.max(0, Math.min(n - 1, idx));
      var s = full[idx];
      var px = x(idx), pyRev = revY(s.revenue_cents || 0), pyTix = tixY(s.tickets || 0);
      guide.style.display = "block";
      guideLine.setAttribute("x1", px); guideLine.setAttribute("x2", px);
      dotRev.setAttribute("cx", px); dotRev.setAttribute("cy", pyRev);
      dotTix.setAttribute("cx", px); dotTix.setAttribute("cy", pyTix);
      tip.innerHTML = dayLabel(s);
      tip.style.display = "block";
      // positioneer tooltip in pixel-ruimte van de wrapper (svg schaalt via viewBox, dus % van breedte/hoogte)
      var leftPct = (px / W) * 100;
      var topPct = (Math.min(pyRev, pyTix) / H) * 100;
      tip.style.left = leftPct + "%";
      tip.style.top = "max(0px, calc(" + topPct + "% - 10px))";
    }
    function hide() {
      guide.style.display = "none";
      tip.style.display = "none";
    }
    function idxFromEvent(e) {
      var rect = svgEl.getBoundingClientRect();
      var clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
      var relX = (clientX - rect.left) / rect.width; // 0..1 over de volledige svg-breedte
      var svgX = relX * W;
      var norm = (svgX - padL) / plotW;
      return Math.round(norm * (n - 1));
    }
    hitRect.addEventListener("pointermove", function (e) { showAt(idxFromEvent(e)); });
    hitRect.addEventListener("pointerdown", function (e) { showAt(idxFromEvent(e)); });
    hitRect.addEventListener("pointerleave", hide);
    wrapEl.addEventListener("pointerleave", hide);
  }

  /* ---------- Voorverkoop op schema (cumulatief voor het festival) ---------- */
  var presaleData = null;
  var presaleMetric = "rev"; // omzet | ticketrecords | toegangsgasten
  var PRESALE_METRICS = {
    rev: { label: "Omzet", axis: "euro" },
    tix: { label: "Tickets", axis: "tickets" },
    visitors: { label: "Bezoekers", axis: "bezoekers" }
  };
  setPresaleMetric(presaleMetric); // zet default actief in de toggle

  function eurosFmt(v) { return "EUR " + (Number(v) || 0).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function eurosShort(v) { var e = Math.round(Number(v) || 0); return e >= 1000 ? "EUR " + (e / 1000).toFixed(1).replace(".0", "") + "k" : "EUR " + e; }
  function tixFmt(v) { return (Math.round(Number(v) || 0)).toLocaleString("nl-NL") + " tickets"; }
  function visitorsFmt(v) { return (Math.round(Number(v) || 0)).toLocaleString("nl-NL") + " bezoekers"; }
  function tixOf(p) { return p ? (Number(p.tix) || 0) : 0; }
  function revOf(p) { return p ? (Number(p.rev) || 0) : 0; }
  function visitorsOf(p) { return p ? (Number(p.visitors) || 0) : 0; }
  function metricOf(p, metric) { return metric === "rev" ? revOf(p) : metric === "visitors" ? visitorsOf(p) : tixOf(p); }
  function metricFmt(v, metric) { return metric === "rev" ? eurosFmt(v) : metric === "visitors" ? visitorsFmt(v) : tixFmt(v); }
  function metricShort(v, metric) { return metric === "rev" ? eurosShort(v) : Math.round(Number(v) || 0).toLocaleString("nl-NL"); }

  /* ---------- Nieuw vs. terugkerend publiek ---------- */
  function loadAudience() {
    var host = $("ov-audience");
    if (!host) return;
    get("/audience?_=" + Date.now(), function (ok, d) {
      if (!ok || !d || !d.now) { host.innerHTML = "<div class='muted'>Nog geen publieksdata beschikbaar.</div>"; return; }
      renderAudience(d.now, d.history || []);
    });
  }

  function renderAudience(n, hist) {
    var host = $("ov-audience");
    var nieuw = Number(n.kopers_nieuw) || 0;
    var terug = Number(n.kopers_terug) || 0;
    var tot = nieuw + terug;
    if (!tot) { host.innerHTML = "<div class='muted'>Nog geen betaalde bestellingen.</div>"; return; }
    var pctNieuw = Math.round((nieuw / tot) * 100);
    var pctTerug = 100 - pctNieuw;

    // donut: twee segmenten (nieuw = bordeaux, terugkerend = goud)
    var C = 2 * Math.PI * 42;
    var lenNieuw = (nieuw / tot) * C;
    var donut = "<svg viewBox='0 0 120 120' width='120' height='120' role='img' aria-label='Verhouding nieuw en terugkerend'>" +
      "<circle r='42' cx='60' cy='60' fill='none' stroke='#EEB24A' stroke-width='22'></circle>" +
      "<circle r='42' cx='60' cy='60' fill='none' stroke='#C45F38' stroke-width='22' " +
      "stroke-dasharray='" + lenNieuw.toFixed(2) + " " + (C - lenNieuw).toFixed(2) + "' transform='rotate(-90 60 60)'></circle>" +
      "<text x='60' y='57' text-anchor='middle' font-size='20' font-family='Fraunces,Georgia,serif' font-weight='600' fill='#231B13'>" + tot + "</text>" +
      "<text x='60' y='72' text-anchor='middle' font-size='9' fill='rgba(35,27,19,.55)'>kopers</text></svg>";

    // KPI-blokken
    var kpi = "<div style='display:flex; gap:12px; flex-wrap:wrap;'>" +
      "<div style='flex:1 1 150px; background:rgba(196,95,56,.06); border:1px solid rgba(196,95,56,.18); border-radius:12px; padding:14px 16px;'>" +
        "<div style='font-family:Fraunces,Georgia,serif; font-size:28px; font-weight:600; color:var(--bordeaux); line-height:1; font-variant-numeric:tabular-nums;'>" + nieuw + "</div>" +
        "<div style='font-size:11.5px; color:var(--ink-muted); text-transform:uppercase; letter-spacing:.05em; font-weight:600; margin-top:4px;'>nieuwe bezoekers · " + pctNieuw + "%</div>" +
        "<div class='muted' style='margin-top:4px; font-size:12px;'>" + (Number(n.tickets_nieuw) || 0) + " tickets</div></div>" +
      "<div style='flex:1 1 150px; background:rgba(254,183,42,.10); border:1px solid rgba(254,183,42,.35); border-radius:12px; padding:14px 16px;'>" +
        "<div style='font-family:Fraunces,Georgia,serif; font-size:28px; font-weight:600; color:#a87708; line-height:1; font-variant-numeric:tabular-nums;'>" + terug + "</div>" +
        "<div style='font-size:11.5px; color:var(--ink-muted); text-transform:uppercase; letter-spacing:.05em; font-weight:600; margin-top:4px;'>kwamen eerder · " + pctTerug + "%</div>" +
        "<div class='muted' style='margin-top:4px; font-size:12px;'>" + (Number(n.tickets_terug) || 0) + " tickets</div></div>" +
      "</div>";

    // loyaliteit: hoe vaak waren de terugkerende kopers er eerder bij
    var L = n.loyaliteit || {};
    var l1 = Number(L.x1) || 0, l2 = Number(L.x2) || 0, l3 = Number(L.x3plus) || 0;
    var lmax = Math.max(1, l1, l2, l3);
    function lrow(lbl, v, col) {
      var pct = Math.round((v / lmax) * 100);
      return "<div style='display:flex; align-items:center; gap:10px; padding:3px 0; font-size:12.5px;'>" +
        "<span style='flex:0 0 92px; color:var(--ink-soft);'>" + esc(lbl) + "</span>" +
        "<span style='flex:1; height:8px; background:#ece7da; border-radius:999px; overflow:hidden;'>" +
        "<span style='display:block; height:100%; width:" + pct + "%; background:" + col + "; border-radius:999px;'></span></span>" +
        "<b style='flex:0 0 30px; text-align:right; font-variant-numeric:tabular-nums;'>" + v + "</b></div>";
    }
    var loy = "<div style='margin-top:16px;'>" +
      "<div style='font-size:12px; color:var(--ink-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600; margin-bottom:7px;'>Van de terugkerende gasten</div>" +
      lrow("1 editie", l1, "#c98b8b") + lrow("2 edities", l2, "#b05c5c") + lrow("3 of meer", l3, "#C45F38") + "</div>";

    // historische benchmark
    var rows = (hist || []).slice().reverse().map(function (h) {
      var k = Number(h.kopers) || 0, t = Number(h.terug) || 0;
      var p = k ? Math.round((t / k) * 100) : 0;
      return "<tr><td>NvdW " + esc(String(h.year)) + "</td>" +
        "<td class='num'>" + k.toLocaleString("nl-NL") + "</td>" +
        "<td class='num'>" + (Number(h.nieuw) || 0).toLocaleString("nl-NL") + "</td>" +
        "<td class='num'>" + t.toLocaleString("nl-NL") + "</td>" +
        "<td class='num'>" + p + "%</td></tr>";
    }).join("");
    var histTbl = rows ? "<div style='margin-top:18px;'>" +
      "<div style='font-size:12px; color:var(--ink-muted); text-transform:uppercase; letter-spacing:.06em; font-weight:600; margin-bottom:7px;'>Eindstand eerdere edities</div>" +
      "<div class='tablewrap'><table style='font-size:13px;'><thead><tr><th>Editie</th><th class='num'>Kopers</th><th class='num'>Nieuw</th><th class='num'>Kwam eerder</th><th class='num'>% terug</th></tr></thead>" +
      "<tbody><tr style='background:rgba(196,95,56,.07);'><td style='font-weight:700; color:var(--bordeaux);'>APÉRO 2027 (nu)</td>" +
      "<td class='num'><b>" + tot + "</b></td><td class='num'>" + nieuw + "</td><td class='num'>" + terug + "</td><td class='num'><b>" + pctTerug + "%</b></td></tr>" +
      rows + "</tbody></table></div></div>" : "";

    var nogNiet = Number(n.oud_nog_niet_gekocht) || 0;
    var voet = nogNiet ? "<div class='muted' style='margin-top:12px; line-height:1.5;'>" +
      nogNiet.toLocaleString("nl-NL") + " eerdere bezoekers hebben dit jaar nog niet gekocht. Dat is je warmste doelgroep voor een mailing.</div>" : "";

    host.innerHTML = "<div style='display:flex; gap:22px; align-items:flex-start; flex-wrap:wrap;'>" +
      "<div style='flex:0 0 120px;'>" + donut + "</div>" +
      "<div style='flex:1 1 260px; min-width:240px;'>" + kpi + loy + "</div></div>" + histTbl + voet;
  }

  function loadPresale() {
    get("/presale?_=" + Date.now(), function (ok, d) {
      if (!ok || !d || typeof d !== "object") { renderPresale(null); return; }
      presaleData = d;
      renderPresale(d);
    });
  }

  function setPresaleMetric(m) {
    presaleMetric = PRESALE_METRICS[m] ? m : "rev";
    var on = "gold sm", off = "ghost sm";
    [["ps-tab-rev", "rev"], ["ps-tab-tix", "tix"], ["ps-tab-visitors", "visitors"]].forEach(function (item) {
      var button = $(item[0]);
      if (button) button.className = presaleMetric === item[1] ? on : off;
    });
    if (presaleData) renderPresale(presaleData);
  }

  // vind het punt in een edition-reeks voor een bepaalde week-voor-festival
  function pointAtWeek(points, w) {
    if (!points || !points.length) return null;
    for (var i = 0; i < points.length; i++) {
      if (points[i] && Number(points[i].w) === Number(w)) return points[i];
    }
    return null;
  }
  // compacte cel met beide waarden (tickets + euro); 0 => "nog niet gestart"
  function snapCell(p, opts) {
    opts = opts || {};
    if (!p || (tixOf(p) === 0 && revOf(p) === 0)) {
      return "<span class='muted' style='font-style:italic;'>" + (opts.dash ? "&mdash;" : "nog niet gestart") + "</span>";
    }
    return "<span style='font-weight:600; color:var(--navy); font-variant-numeric:tabular-nums;'>" +
      tixOf(p).toLocaleString("nl-NL") + " tickets</span>" +
      "<span class='muted' style='display:block; font-variant-numeric:tabular-nums;'>" + eurosFmt(revOf(p)) + "</span>";
  }

  // Eindstand-uitsplitsing: betaalde toegang / gratis toegang / losse producten
  function splitLine(sp) {
    if (!sp) return "";
    function n(v) { return Number(v || 0).toLocaleString("nl-NL"); }
    return "<span class='muted' style='display:block; font-size:11px; margin-top:3px; line-height:1.4;'>" +
      n(sp.betaald) + " betaald &middot; " + n(sp.gratis) + " gratis &middot; " + n(sp.producten) + " prod.</span>";
  }

  function renderPresaleSnapshot(d) {
    var snapHost = $("presale-snapshot");
    if (!snapHost) return;
    if (!d || !d.editions || !d.editions.length || !d.weeks || !d.weeks.length) {
      snapHost.innerHTML = "<div class='muted'>Nog geen voorverkoopdata beschikbaar.</div>";
      return;
    }
    var metric = presaleMetric;
    var cw = (d.current_week != null) ? Number(d.current_week) : 0;
    var daysToGo = Math.max(0, Math.ceil((Date.UTC(2027, 5, 10) - Date.now()) / 86400000));
    var live = (d.live || []).filter(function (p) { return p && typeof p.w !== "undefined"; });
    var lastLive = live.length ? live[live.length - 1] : null;
    var nowValue = metricOf(lastLive, metric);
    var editions = (d.editions || []).filter(function (e) { return e && e.points && e.points.length; });
    var lastYear = editions.slice().sort(function (a, b) { return Number(b.year) - Number(a.year); })[0] || null;
    var lastYearNow = lastYear ? pointAtWeek(lastYear.points, cw) : null;
    var lastYearValue = metricOf(lastYearNow, metric);
    var lastYearLabel = lastYear ? (lastYear.label || ("NvdW " + lastYear.year)) : "vorig jaar";
    var delta = nowValue - lastYearValue;
    var pct = lastYearValue > 0 ? Math.round((delta / lastYearValue) * 100) : null;
    function valueCell(p, dash) {
      var value = metricOf(p, metric);
      if (!p || value === 0) return "<span class='muted' style='font-style:italic;'>" + (dash ? "&mdash;" : "nog niet gestart") + "</span>";
      return "<span style='font-weight:600; color:var(--navy); font-variant-numeric:tabular-nums;'>" + esc(metricFmt(value, metric)) + "</span>";
    }
    function deltaCell() {
      if (pct === null) return "<span class='muted'>&mdash;</span>";
      var up = delta >= 0;
      return "<span style='font-weight:700; color:" + (up ? "var(--green)" : "var(--bordeaux)") + "; font-variant-numeric:tabular-nums;'>" +
        (up ? "+" : "−") + esc(metricShort(Math.abs(delta), metric)) + " <small style='font-size:11px;'>(" + (up ? "+" : "−") + Math.abs(pct) + "%)</small></span>";
    }
    var head = daysToGo === 0 ? "Op dit moment: het is festivaldag" : "Op dit moment: nog " + Math.floor(Math.abs(cw) / 7) + " weken (" + daysToGo + " dagen) tot het festival";
    var html = "<div style='font-family:Fraunces,Georgia,serif; font-size:18px; color:var(--navy); font-weight:600; margin-bottom:12px;'>" + esc(head) + "</div>";
    html += "<div style='display:flex; align-items:baseline; gap:12px; flex-wrap:wrap; background:rgba(196,95,56,.06); border:1px solid rgba(196,95,56,.18); border-radius:12px; padding:14px 18px; margin-bottom:16px;'>" +
      "<div style='font-family:Fraunces,Georgia,serif; font-size:30px; font-weight:600; color:var(--bordeaux); font-variant-numeric:tabular-nums; line-height:1;'>" + esc(metricFmt(nowValue, metric)) + "</div>" +
      "<div style='font-size:12px; color:var(--ink-soft);'>Editie 7 nu</div>" +
      "<div style='width:100%; font-size:13px; color:" + (delta >= 0 ? "var(--green)" : "var(--bordeaux)") + "; font-weight:700;'>" +
      (pct === null ? "Nog geen vergelijkingspunt met " + esc(lastYearLabel) : (delta >= 0 ? "+" : "−") + esc(metricShort(Math.abs(delta), metric)) + " · " + (delta >= 0 ? "+" : "−") + Math.abs(pct) + "% t.o.v. " + esc(lastYearLabel)) + "</div></div>";
    var rows = "<tr style='background:rgba(196,95,56,.07);'><td style='font-weight:700; color:var(--bordeaux);'>" + esc(d.label_2026 || "APÉRO 2027 (nu)") + "</td><td>" + valueCell(lastLive) + "</td><td><span class='muted'>&mdash; <span style='font-style:italic;'>nog onbekend</span></span></td><td>" + deltaCell() + "</td></tr>";
    editions.slice().reverse().forEach(function (e) {
      var atNow = pointAtWeek(e.points, cw), endP = e.points[e.points.length - 1];
      rows += "<tr><td style='font-weight:600; color:var(--navy);'>" + esc(e.label || ("NvdW " + (e.year || ""))) + "</td><td>" + valueCell(atNow) + "</td><td>" + valueCell(endP, true) + "</td><td><span class='muted'>&mdash;</span></td></tr>";
    });
    html += "<div class='tablewrap'><table style='font-size:13px;'><thead><tr><th>Editie</th><th>Nu (" + esc(String(Math.abs(cw))) + " dagen voor festival)</th><th>Eindstand</th><th>Verschil met " + esc(lastYearLabel) + "</th></tr></thead><tbody>" + rows + "</tbody></table></div>";
    html += "<div class='muted' style='margin-top:8px; line-height:1.5;'>" +
      (metric === "rev" ? "Omzet is na korting, exclusief service- en transactiekosten." : metric === "tix" ? "Tickets telt alle geldige ticketrecords mee, dus ook extra's, restaurant en workshops." : "Bezoekers telt alleen geldige toegangstickets. De historische tussencurve is op basis van de toegangsmix uit de Paylogic-einddata; de historische eindstand is exact.") +
      "</div>";
    snapHost.innerHTML = html;
  }

  function renderPresale(d) {
    renderPresaleSnapshot(d);

    var host = $("presale-chart");
    var legHost = $("presale-legend");
    if (!host) return;
    if (legHost) legHost.innerHTML = "";
    if (!d || !d.editions || !d.editions.length || !d.weeks || !d.weeks.length) {
      host.innerHTML = "<div class='muted'>Nog geen voorverkoopdata beschikbaar.</div>";
      return;
    }

    var isRev = presaleMetric === "rev";
    var valOf = function (p) { return metricOf(p, presaleMetric); };
    var weeks = d.weeks.slice();
    var wMin = Math.min.apply(null, weeks), wMax = Math.max.apply(null, weeks);
    if (!(wMax > wMin)) { wMax = wMin + 1; }

    var editions = (d.editions || []).filter(function (e) { return e && e.points && e.points.length; });
    var live = (d.live || []).filter(function (p) { return p && typeof p.w !== "undefined"; });

    // maximum over alle historische edities + live
    var maxVal = 1;
    editions.forEach(function (e) {
      e.points.forEach(function (p) { var v = valOf(p); if (v > maxVal) maxVal = v; });
    });
    live.forEach(function (p) { var v = valOf(p); if (v > maxVal) maxVal = v; });

    function niceMax(v) {
      if (!v || v <= 0) return 1;
      var p = Math.pow(10, Math.floor(Math.log(v) / Math.LN10));
      var nn = v / p, m = nn <= 1 ? 1 : nn <= 2 ? 2 : nn <= 2.5 ? 2.5 : nn <= 5 ? 5 : 10;
      return m * p;
    }
    var axMax = niceMax(maxVal);

    var steps = 4;
    var padL = 48, padR = 14, padT = 14, padB = 24;
    var W = 560, H = 200;
    var base = H - padB, topY = padT, plotH = base - topY, plotW = W - padL - padR;

    var xOf = function (w) { return padL + ((w - wMin) / (wMax - wMin)) * plotW; };
    var yOf = function (v) { return base - (Math.max(0, v) / axMax) * plotH; };
    var fmtAx = isRev ? eurosShort : function (v) { return String(Math.round(v)); };

    var svg = "<svg viewBox='0 0 " + W + " " + H + "' width='100%' style='max-width:" + W + "px; min-width:300px; max-height:200px; font-family:Inter,sans-serif;' xmlns='http://www.w3.org/2000/svg'>";

    // gridlijnen + y-aslabels
    for (var k = 0; k <= steps; k++) {
      var gy = base - (k / steps) * plotH;
      svg += "<line x1='" + padL + "' y1='" + gy.toFixed(1) + "' x2='" + (W - padR) + "' y2='" + gy.toFixed(1) +
        "' stroke='rgba(35,27,19," + (k === 0 ? ".22" : ".08") + ")'" + (k === 0 ? "" : " stroke-dasharray='3 4'") + "/>";
      svg += "<text x='" + (padL - 6) + "' y='" + (gy + 3).toFixed(1) + "' text-anchor='end' font-size='8.5' fill='rgba(35,27,19,.5)'>" +
        esc(fmtAx(axMax * k / steps)) + "</text>";
    }
    // y-as titel
    svg += "<text x='" + padL + "' y='10' font-size='8.5' fill='rgba(35,27,19,.45)'>" + (PRESALE_METRICS[presaleMetric].axis) + "</text>";

    // x-as: data staat op DAGBASIS (-168..0); labels tonen we in weken voor leesbaarheid
    var xticks = [-168, -126, -84, -42, 0];
    xticks.forEach(function (dd) {
      if (dd < wMin || dd > wMax) return;
      var x = xOf(dd);
      svg += "<line x1='" + x.toFixed(1) + "' y1='" + base + "' x2='" + x.toFixed(1) + "' y2='" + (base + 3) + "' stroke='rgba(35,27,19,.25)'/>";
      svg += "<text x='" + x.toFixed(1) + "' y='" + (H - 8) + "' text-anchor='middle' font-size='9' fill='rgba(35,27,19,.6)'>" + (dd / 7) + " wk</text>";
    });
    svg += "<text x='" + (W - padR) + "' y='" + (H - 8) + "' text-anchor='end' font-size='8' fill='rgba(196,95,56,.6)'>0 = festival</text>";

    // verticale markering op huidige week ("nu")
    if (d.current_week != null) {
      var cwv = Number(d.current_week);
      if (cwv >= wMin && cwv <= wMax) {
        var nx = xOf(cwv);
        svg += "<line x1='" + nx.toFixed(1) + "' y1='" + topY + "' x2='" + nx.toFixed(1) + "' y2='" + base +
          "' stroke='rgba(196,95,56,.45)' stroke-width='1' stroke-dasharray='2 3'/>";
        svg += "<text x='" + nx.toFixed(1) + "' y='" + (topY - 2) + "' text-anchor='middle' font-size='8.5' font-weight='700' fill='#C45F38'>nu</text>";
      }
    }

    // helper: bouw points-string voor een reeks
    function lineFor(points) {
      return points.map(function (p) {
        return xOf(Number(p.w)).toFixed(1) + "," + yOf(valOf(p)).toFixed(1);
      }).join(" ");
    }

    // historische edities: oudste licht grijs -> nieuwste donkerder; 2025 wat prominenter
    var nEd = editions.length;
    var histColors = [];
    editions.forEach(function (e, i) {
      // van licht (i=0) naar donker (i=nEd-1)
      var t = nEd > 1 ? i / (nEd - 1) : 1;
      var g = Math.round(178 - t * 110); // 178 -> 68
      histColors.push("rgb(" + g + "," + g + "," + (g + 6) + ")");
    });

    editions.forEach(function (e, i) {
      if (!e.points || e.points.length < 2) return;
      var isLatest = (i === nEd - 1);
      var col = histColors[i];
      var sw = isLatest ? 1.6 : 1;
      svg += "<polyline points='" + lineFor(e.points) + "' fill='none' stroke='" + col +
        "' stroke-width='" + sw + "' stroke-linejoin='round' stroke-linecap='round' opacity='" + (isLatest ? 0.95 : 0.7) + "'/>";
    });

    // editie 2026 (live): dikke bordeaux lijn t/m current_week
    if (live.length) {
      if (live.length > 1) {
        svg += "<polyline points='" + lineFor(live) + "' fill='none' stroke='#C45F38' stroke-width='2.4' stroke-linejoin='round' stroke-linecap='round'/>";
      }
      var last = live[live.length - 1];
      var lx = xOf(Number(last.w)), ly = yOf(valOf(last));
      svg += "<circle cx='" + lx.toFixed(1) + "' cy='" + ly.toFixed(1) + "' r='3.6' fill='#C45F38' stroke='#fff' stroke-width='1.4'/>";
      var lblTxt = isRev ? eurosShort(valOf(last)) : (Math.round(valOf(last)).toLocaleString("nl-NL"));
      var anchor = (lx > W - 80) ? "end" : "start";
      var lxt = (anchor === "end") ? (lx - 7) : (lx + 7);
      svg += "<text x='" + lxt.toFixed(1) + "' y='" + (ly - 7).toFixed(1) + "' text-anchor='" + anchor +
        "' font-size='10' font-weight='700' fill='#C45F38'>" + esc(lblTxt) + "</text>";
    }

    svg += "</svg>";
    host.innerHTML = svg;

    // legenda
    if (legHost) {
      var rows = "";
      editions.forEach(function (e, i) {
        var endP = e.points[e.points.length - 1];
        var ev = valOf(endP);
        var valStr = metricFmt(ev, presaleMetric);
        rows += "<div class='legrow' style='display:flex; align-items:center; gap:8px; padding:2px 0;'>" +
          "<span class='dot' style='display:inline-block; width:11px; height:11px; border-radius:50%; background:" + histColors[i] + ";'></span>" +
          "<span class='leglbl' style='flex:1;'>" + esc(e.label || ("NvdW " + (e.year || ""))) + "</span>" +
          "<span class='legnum' style='font-variant-numeric:tabular-nums; color:var(--ink-soft);'>" + esc(valStr) + "</span></div>";
      });
      if (live.length) {
        var lastL = live[live.length - 1];
        var lv = valOf(lastL);
        var lvStr = metricFmt(lv, presaleMetric);
        var cw = (d.current_week != null) ? d.current_week : lastL.w;
        rows += "<div class='legrow' style='display:flex; align-items:center; gap:8px; padding:4px 0 2px; border-top:1px solid #ece7da; margin-top:4px;'>" +
          "<span class='dot' style='display:inline-block; width:13px; height:13px; border-radius:50%; background:#C45F38;'></span>" +
          "<span class='leglbl' style='flex:1; font-weight:600; color:var(--ink);'>" + esc(d.label_2026 || "APÉRO 2027 (nu)") + "</span>" +
          "<span class='legnum' style='font-variant-numeric:tabular-nums; font-weight:600;'>" + esc(lvStr) + " <span class='muted' style='font-weight:400;'>(" + esc(String(Math.abs(Number(cw)))) + " dagen voor het festival)</span></span></div>";
      }
      legHost.innerHTML = "<div style='margin-top:12px; font-size:12.5px;'>" + rows + "</div>";
    }
  }

  /* shared order row + open handler */
  function orderRow(o, withEmailCol) {
    var disc = (typeof o.discount_cents === "number") ? "<td class='num'>" + (o.discount_cents ? euro(o.discount_cents) : "–") + "</td>" : "";
    return "<tr><td>" + dshort(o.created_at) + "</td><td>" + esc(o.short_ref) + "</td><td>" + esc(o.buyer_name) + itemsLine(o) +
      (withEmailCol ? "</td><td>" + esc(o.buyer_email) : "") +
      "</td><td class='num'>" + euro(o.total_cents) + "</td>" + disc +
      "<td class='" + statusClass(o.status) + "'>" + esc(o.status) + "</td>" +
      "<td class='" + statusClass(o.email_status) + "'>" + esc(o.email_status || "–") + "</td>" +
      "<td><button class='ghost sm openorder' data-id='" + attr(o.id) + "'>open</button></td></tr>";
  }
  function bindOpenButtons(root) {
    qsa(".openorder", root).forEach(function (b) {
      b.addEventListener("click", function () { showSec("orders"); openOrder(b.getAttribute("data-id")); });
    });
  }

  /* ============================================================
     2. ORDERS
  ============================================================ */
  $("searchbtn").addEventListener("click", loadOrders);
  $("q").addEventListener("keydown", function (e) { if (e.key === "Enter") loadOrders(); });
  $("f-status").addEventListener("change", loadOrders);
  $("f-channel").addEventListener("change", loadOrders);
  $("exportbtn").addEventListener("click", function () {
    get("/export.csv", function (ok, blob) {
      if (!ok || !blob) { toast("Export mislukt.", "err"); return; }
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "apero-orders.csv";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
  });

  function loadOrders() {
    var q = $("q").value.trim();
    var st = $("f-status").value;
    var ch = $("f-channel").value;
    var p = "/orders?q=" + encodeURIComponent(q) + "&status=" + encodeURIComponent(st) + "&channel=" + encodeURIComponent(ch);
    get(p, function (ok, d) {
      var tb = document.querySelector("#t-orders tbody");
      if (!ok || !d) { tb.innerHTML = emptyRow(12, "Laden mislukt."); return; }
      tb.innerHTML = (d.orders || []).map(function (o) { return orderRowFull(o); }).join("") || emptyRow(12, "Geen bestellingen gevonden.");
      qsa(".openorder", tb).forEach(function (b) {
        b.addEventListener("click", function () { openOrder(b.getAttribute("data-id")); });
      });
    });
  }
  // Compacte productregels bij een bestelling: "2× Early bird vrijdag · 1× Diner vr 18:00"
  function itemsLine(o) {
    var its = o.items || [];
    if (!its.length) return "";
    var txt = its.map(function (i) {
      return "<span class='oi" + (i.category === "extra" ? " is-extra" : "") + "'>" +
        (i.qty || 0) + "× " + esc(i.name) + "</span>";
    }).join("");
    return "<div class='oitems'>" + txt + "</div>";
  }

  function orderRowFull(o) {
    var mollie = o.mollie_payment_id
      ? " <a href='https://my.mollie.com/dashboard/payments/" + encodeURIComponent(o.mollie_payment_id) + "' target='_blank' rel='noopener'><button class='ghost sm' type='button'>Mollie</button></a>"
      : "";
    return "<tr><td>" + dshort(o.created_at) + "</td><td>" + esc(o.short_ref) + "</td><td>" + esc(o.buyer_name) + itemsLine(o) +
      "</td><td>" + esc(o.buyer_email) + "</td><td class='num'>" + (o.tickets_count != null ? o.tickets_count : "–") +
      "</td><td class='num' title='Aantal eerdere edities dat deze gast kwam (2019 t/m 2025)'>" + (o.prior_editions ? o.prior_editions + "×" : "–") +
      "</td><td class='num'>" + euro(o.total_cents) +
      "</td><td>" + (o.discount_code ? "<span class='chip discount-code'>" + esc(o.discount_code) + "</span>" : "–") +
      "</td><td class='num'>" + (o.discount_cents ? euro(o.discount_cents) : "–") +
      "</td><td class='" + statusClass(o.status) + "'>" + esc(o.status) + "</td>" +
      "<td class='" + statusClass(o.email_status) + "'>" + esc(o.email_status || "–") + "</td>" +
      "<td><button class='ghost sm openorder' data-id='" + attr(o.id) + "'>Details</button>" + mollie + "</td></tr>";
  }

  function openOrder(id) {
    ensureFields(function () { openOrderNu(id); });
  }
  function openOrderNu(id) {
    get("/order?id=" + encodeURIComponent(id), function (ok, d) {
      var box = $("ord-detail");
      if (!ok || !d || !d.order) { toast("Order laden mislukt.", "err"); return; }
      var o = d.order;
      var link = "./tickets.html?order=" + encodeURIComponent(o.id) + "&token=" + encodeURIComponent(o.order_token || "");
      var mollieLink = o.mollie_payment_id
        ? "<a href='https://my.mollie.com/dashboard/payments/" + encodeURIComponent(o.mollie_payment_id) + "' target='_blank' rel='noopener'><button class='ghost sm' type='button'>Open in Mollie</button></a>"
        : "";
      var discountLabel = o.discount_cents ? " &middot; korting " + euro(o.discount_cents) : "";
      if (o.discount_code) discountLabel += " <span class='chip discount-code'>" + esc(o.discount_code) + "</span>";

      var itemsRows = (o.order_items || []).map(function (i) {
        return "<tr><td>" + esc(typeName(i.ticket_type_id)) + "</td><td class='num'>" + (i.quantity || 0) +
          "</td><td class='num'>" + euro(i.unit_price_cents) + "</td><td class='num'>" + esc(i.vat_rate) + "%</td></tr>";
      }).join("") || emptyRow(4, "Geen regels.");

      var orderCustom = renderBuyerInfo(o.custom_data);

      var tixRows = (d.tickets || []).map(function (t) {
        var tc = renderCustom(t.custom_data, true);
        // bewerkbaar zodra er ticketvragen voor dit type bestaan, bijvoorbeeld
        // een allergie die de gast pas later per mail doorgeeft
        var knop = ticketVragenVoor(t.ticket_type_id).length
          ? " <button class='ghost sm tf-edit' type='button' data-tid='" + esc(t.id) + "'>bewerk</button>"
          : "";
        // los ticket ongeldig maken zonder terugbetaling (alleen bij een betaalde order)
        var voidKnop = (o.status === "paid" && t.status === "valid")
          ? " <button class='ghost sm tv-one' type='button' data-tid='" + esc(t.id) + "' data-code='" + esc(t.code) + "'>ongeldig</button>"
          : "";
        // los ticket terugbetalen via Mollie (alleen bij een echte betaling)
        if (o.status === "paid" && t.status === "valid" && o.channel === "web" && o.mollie_payment_id && o.total_cents > 0) {
          voidKnop += " <button class='ghost sm tr-one' type='button' data-tid='" + esc(t.id) + "' data-code='" + esc(t.code) + "'>terugbetalen</button>";
        }
        return "<tr><td>" + esc(t.code) + "</td><td>" + esc(typeName(t.ticket_type_id)) + "</td><td>" + esc(t.holder_name || "–") +
          "</td><td class='" + statusClass(t.status) + "'>" + esc(t.status) + voidKnop +
          "</td><td>" + days(t.valid_days) + "</td><td>" + days(t.admitted_days) + "</td>" +
          "<td class='tf-cel' data-tid='" + esc(t.id) + "'>" + tc + knop + "</td></tr>";
      }).join("") || emptyRow(7, "Geen tickets.");

      var events = (d.events || []).map(function (e) {
        return "<li><time>" + dt(e.occurred_at) + "</time><span class='" + statusClass(e.mollie_status) + "'>" +
          esc(e.mollie_status || "?") + "</span><span class='chip'>" + esc(e.source || "") + "</span>" +
          (e.note ? "<span class='muted'>" + esc(e.note) + "</span>" : "") + "</li>";
      }).join("") || "<li class='muted'>Geen betaalgebeurtenissen.</li>";

      // administratiekosten = servicekosten + transactiebijdrage; die houden wij bij "excl. kosten"
      var kosten = (o.service_fee_cents || 0) + (o.transaction_fee_cents || 0);
      var heeftKosten = o.channel === "web" && o.total_cents > 0 && kosten > 0 && o.total_cents - kosten > 0;
      var geldig = (d.tickets || []).filter(function (t) { return t.status === "valid"; }).length;
      // al deels per ticket terugbetaald: dan alleen nog per ticket verder
      var deelTerug = o.status === "paid" && (o.refunded_cents || 0) > 0;
      box.style.display = "block";
      box.innerHTML =
        "<div class='row' style='justify-content:space-between; align-items:flex-start;'>" +
          "<div><h3 style='margin-bottom:6px;'>" + esc(o.short_ref) + "</h3>" +
            "<div>" + esc(o.buyer_name) + " &middot; " + esc(o.buyer_email) + "</div>" +
            "<div style='margin-top:4px;'><span class='" + statusClass(o.status) + "'>" + esc(o.status) +
            "</span> &middot; " + euro(o.total_cents) + discountLabel +
            " &middot; <span class='chip'>" + esc(o.channel) + "</span> &middot; mail <span class='" + statusClass(o.email_status) + "'>" + esc(o.email_status || "–") + "</span></div>" +
            "<div class='muted' style='margin-top:4px;'>" + dt(o.created_at) + "</div>" +
            (deelTerug ? "<div style='margin-top:4px; color:var(--bordeaux);'>Al terugbetaald: " + euro(o.refunded_cents) + " van " + euro(o.total_cents) + ". Verder terugbetalen gaat per ticket.</div>" : "") +
            orderCustom +
          "</div>" +
          "<div class='row'>" +
            "<a href='" + link + "' target='_blank' rel='noopener'><button class='ghost sm' type='button'>Ticketpagina</button></a>" +
            mollieLink +
            "<button class='sm' type='button' id='d-resend'>Mail opnieuw</button>" +
            ""+
            (deelTerug ? "" : "<button class='danger sm' type='button' id='d-refund'>" + (heeftKosten ? "Terugbetalen incl. kosten" : "Terugbetalen") + "</button>") +
            (heeftKosten && !deelTerug ? "<button class='danger sm' type='button' id='d-refund-excl'>Terugbetalen excl. kosten (" + euro(o.total_cents - kosten) + ")</button>" : "") +
            (o.status === "paid" && geldig > 0 ? "<button class='danger sm' type='button' id='d-void'>Ongeldig maken zonder terugbetaling</button>" : "") +
            "<button class='ghost sm' type='button' id='d-close'>Sluiten</button>" +
          "</div>" +
        "</div>" +
        "<div class='sp'></div>" +
        "<div id='d-invoice-box' style='display:none;'></div>" +
        "<div class='hint' style='margin-top:8px; color:var(--bordeaux);'>Orderregels</div>" +
        "<div class='tablewrap'><table><thead><tr><th>Type</th><th class='num'>Aantal</th><th class='num'>Prijs p/s</th><th class='num'>BTW</th></tr></thead><tbody>" + itemsRows + "</tbody></table></div>" +
        "<div class='hint' style='margin-top:14px; color:var(--bordeaux);'>Tickets</div>" +
        "<div class='tablewrap'><table><thead><tr><th>Code</th><th>Type</th><th>Naam op ticket</th><th>Status</th><th>Geldig</th><th>Gescand</th><th>Extra</th></tr></thead><tbody>" + tixRows + "</tbody></table></div>" +
        "<div id='d-tr-box' class='card' style='display:none; margin-top:10px; border:1px solid var(--bordeaux);'></div>" +
        "<div class='hint' style='margin-top:14px; color:var(--bordeaux);'>Betaal-tijdlijn</div>" +
        "<ul class='tl'>" + events + "</ul>";

      $("d-close").addEventListener("click", function () { box.style.display = "none"; });
      Array.prototype.forEach.call(box.querySelectorAll(".tf-edit"), function (b) {
        b.addEventListener("click", function () { bewerkTicketVragen(b.getAttribute("data-tid"), d, o.id); });
      });
      $("d-resend").addEventListener("click", function () {
        post("/resend", { order_id: o.id }, function (ok2, r) {
          if (ok2 && r && r.ok !== false) toast("Mail opnieuw verstuurd. Status: " + (r.email_status || "ok"), "ok");
          else toast("Mail opnieuw versturen mislukt.", "err");
          if (ok2) openOrder(o.id);
        });
      });
      function terugbetalen(zonderKosten) {
        var web = o.channel === "web" && o.total_cents > 0;
        var bedrag = zonderKosten ? o.total_cents - kosten : o.total_cents;
        var vraag = !web
          ? "Order " + o.short_ref + " annuleren?\n\nDit is een gratis order (geen betaling). Alle tickets worden ongeldig gemaakt. Doorgaan?"
          : zonderKosten
            ? "Order " + o.short_ref + " terugbetalen ZONDER administratiekosten?\n\nDit stort " + euro(bedrag) + " automatisch terug via Mollie. De servicekosten en transactiebijdrage (" + euro(kosten) + ") houden wij. Daarna worden alle tickets ongeldig. Doorgaan?"
            : "Order " + o.short_ref + " terugbetalen MET administratiekosten?\n\nDit stort het volledige bedrag van " + euro(bedrag) + " automatisch terug via Mollie naar de koper en maakt daarna alle tickets ongeldig. Doorgaan?";
        if (!confirm(vraag)) return;
        Array.prototype.forEach.call(box.querySelectorAll("#d-refund, #d-refund-excl"), function (b) { b.disabled = true; });
        post("/refund", { order_id: o.id, keep_fees: !!zonderKosten }, function (ok2, r) {
          if (ok2 && r && r.ok && r.money_back) toast("Terugbetaald via Mollie (" + euro(r.refunded_cents) + ") en tickets ongeldig.", "ok");
          else if (ok2 && r && r.ok) toast("Order ongeldig gemaakt.", "ok");
          else if (r && r.error === "mollie_refund_failed") toast("Mollie weigerde de terugbetaling: " + (r.detail || "onbekend") + ". Tickets blijven geldig.", "err");
          else if (r && r.error === "not_paid") toast("Alleen betaalde orders kunnen terugbetaald worden.", "err");
          else if (r && r.error === "nothing_to_refund") toast("Na aftrek van de administratiekosten blijft er niets over om terug te betalen.", "err");
          else toast("Terugbetaling niet gelukt.", "err");
          openOrder(o.id);
          loadOverview();
        });
      }
      if ($("d-refund")) $("d-refund").addEventListener("click", function () { terugbetalen(false); });
      if ($("d-refund-excl")) $("d-refund-excl").addEventListener("click", function () { terugbetalen(true); });
      if ($("d-invoice")) $("d-invoice").addEventListener("click", function () { openInvoicePanel(o, box); });
      // Ongeldig maken zonder terugbetaling: order blijft betaald, plekken komen vrij
      function ongeldig(ticketIds, vraag) {
        if (!confirm(vraag)) return;
        var body = { order_id: o.id };
        if (ticketIds) body.ticket_ids = ticketIds;
        post(API_TICKET_VOID, body, function (ok2, r) {
          if (ok2 && r && r.ok) toast(r.voided + " ticket" + (r.voided === 1 ? "" : "s") + " ongeldig gemaakt, plekken zijn weer vrij.", "ok");
          else if (r && r.error === "not_paid") toast("Alleen tickets van een betaalde order kunnen ongeldig gemaakt worden.", "err");
          else toast("Ongeldig maken niet gelukt.", "err");
          openOrder(o.id);
          loadOverview();
        });
      }
      if ($("d-void")) $("d-void").addEventListener("click", function () {
        ongeldig(null, "Alle " + geldig + " geldige tickets van " + o.short_ref + " ongeldig maken?\n\nEr wordt NIETS terugbetaald. De tickets werken daarna niet meer bij de ingang en de plekken komen weer vrij in de verkoop. Doorgaan?");
      });
      // Terugbetalen per ticket: eerst het voorstel ophalen, dan kiezen met of zonder kosten
      function terugPerTicket(tid, code) {
        var tr = $("d-tr-box");
        tr.style.display = "block";
        tr.innerHTML = "<div class='muted'>Bedrag berekenen...</div>";
        post(API_TICKET_REFUND, { order_id: o.id, ticket_ids: [tid], dry_run: true }, function (ok2, q) {
          if (!ok2 || !q || !q.ok) {
            tr.innerHTML = "<div style='color:var(--bordeaux);'>Kan dit ticket niet terugbetalen" + (q && q.error ? " (" + esc(q.error) + ")" : "") + ".</div>";
            return;
          }
          var excl = q.suggested_cents, incl = q.suggested_incl_cents;
          var naarEuro = function (c) { return (c / 100).toFixed(2).replace(".", ","); };
          tr.innerHTML =
            "<h3 style='margin-bottom:6px;'>Ticket " + esc(code) + " terugbetalen</h3>" +
            "<div class='hint'>Gaat via Mollie terug naar de koper. Daarna is het ticket ongeldig en komt de plek vrij. Nog terug te betalen op deze bestelling: " + euro(q.remaining_cents) + ".</div>" +
            "<label style='display:flex; gap:8px; align-items:center; margin-top:8px; font-weight:500;'><input type='radio' name='tr-k' value='excl' checked style='width:auto;' /> Zonder kosten: " + euro(excl) + "</label>" +
            "<label style='display:flex; gap:8px; align-items:center; margin-top:4px; font-weight:500;'><input type='radio' name='tr-k' value='incl' style='width:auto;' /> Met kosten: " + euro(incl) + " <span class='muted'>(incl. " + euro(incl - excl) + " servicekosten en transactiebijdrage)</span></label>" +
            "<div class='row' style='margin-top:10px; align-items:flex-end;'>" +
              "<div style='width:140px;'><label>Bedrag (€)</label><input type='text' inputmode='decimal' id='tr-bedrag' value='" + naarEuro(excl) + "' /></div>" +
              "<button class='danger sm' type='button' id='tr-go'>Terugbetalen</button>" +
              "<button class='ghost sm' type='button' id='tr-cancel'>Annuleren</button>" +
            "</div>";
          var metKosten = false;
          Array.prototype.forEach.call(tr.querySelectorAll("input[name='tr-k']"), function (r) {
            r.addEventListener("change", function () {
              metKosten = r.value === "incl" && r.checked;
              $("tr-bedrag").value = naarEuro(metKosten ? incl : excl);
            });
          });
          $("tr-cancel").addEventListener("click", function () { tr.style.display = "none"; });
          $("tr-go").addEventListener("click", function () {
            var ruw = String($("tr-bedrag").value).trim();
            // "8,98" en "1.234,50" (NL) maar ook "8.98" goed lezen
            if (ruw.indexOf(",") > -1) ruw = ruw.replace(/\./g, "").replace(",", ".");
            var cents = Math.round(parseFloat(ruw) * 100);
            if (!cents || cents < 1) { toast("Vul een geldig bedrag in.", "err"); return; }
            if (cents > q.remaining_cents) { toast("Meer dan er nog terug kan (" + euro(q.remaining_cents) + ").", "err"); return; }
            if (!confirm("Ticket " + code + " terugbetalen?\n\nDit stort " + euro(cents) + " automatisch terug via Mollie en maakt het ticket ongeldig. Doorgaan?")) return;
            $("tr-go").disabled = true;
            post(API_TICKET_REFUND, { order_id: o.id, ticket_ids: [tid], amount_cents: cents, with_fees: metKosten }, function (ok3, r) {
              if (ok3 && r && r.ok) toast("Terugbetaald via Mollie (" + euro(r.refunded_cents) + "), ticket ongeldig.", "ok");
              else if (r && r.error === "mollie_refund_failed") toast("Mollie weigerde de terugbetaling: " + (r.detail || "onbekend") + ". Ticket blijft geldig.", "err");
              else if (r && r.error === "te_hoog") toast("Meer dan er nog terug kan.", "err");
              else if (r && r.error === "db_na_refund") toast("Geld is terug, maar het ticket kon niet bijgewerkt worden. Maak het handmatig ongeldig.", "err");
              else toast("Terugbetalen niet gelukt.", "err");
              openOrder(o.id);
              loadOverview();
            });
          });
        });
      }
      Array.prototype.forEach.call(box.querySelectorAll(".tr-one"), function (b) {
        b.addEventListener("click", function () { terugPerTicket(b.getAttribute("data-tid"), b.getAttribute("data-code")); });
      });
      Array.prototype.forEach.call(box.querySelectorAll(".tv-one"), function (b) {
        b.addEventListener("click", function () {
          ongeldig([b.getAttribute("data-tid")], "Ticket " + b.getAttribute("data-code") + " ongeldig maken?\n\nEr wordt NIETS terugbetaald. Het ticket werkt daarna niet meer bij de ingang en de plek komt weer vrij in de verkoop. Doorgaan?");
        });
      });

      box.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* ---------- Factuur per order (losse edge function "invoice") ---------- */
  function invoiceFetch(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ "x-admin-key": key }, opts.headers || {});
    return fetch(API_INVOICE + path, opts).then(function (res) {
      if (res.status === 401) { localStorage.removeItem("apero-admin"); location.reload(); throw new Error("unauth"); }
      return res;
    });
  }
  var INVOICE_ERR = {
    naam_ontbreekt: "Vul een naam of bedrijfsnaam in.",
    adres_ontbreekt: "Vul een adres in.",
    postcode_plaats_ontbreekt: "Vul postcode en plaats in.",
    bedrijfsgegevens_ontbreken: "KvK- of btw-nummer van NvdW BV ontbreekt nog. Laat die eerst instellen.",
    not_invoiceable: "Alleen betaalde orders met een bedrag kunnen een factuur krijgen."
  };
  // Venster eerst synchroon openen (anders blokkeert de browser de pop-up), daarna vullen
  function showInvoiceHtml(win, resPromise) {
    resPromise.then(function (res) {
      if (!res.ok) {
        return res.json().then(function (d) { return Promise.reject(d && d.error); }, function () { return Promise.reject("fout"); });
      }
      return res.text();
    }).then(function (htmlText) {
      win.location.href = URL.createObjectURL(new Blob([htmlText], { type: "text/html" }));
    }).catch(function (err) {
      try { win.close(); } catch (e) { /* venster al dicht */ }
      toast(INVOICE_ERR[err] || "Factuur ophalen mislukt.", "err");
    });
  }
  function openInvoicePanel(o, box) {
    var host = box.querySelector("#d-invoice-box");
    if (!host) return;
    if (host.style.display === "block") { host.style.display = "none"; return; }
    var det = o.invoice_details || {};
    var pick = function (k, dflt) { return det[k] != null && det[k] !== "" ? det[k] : (dflt || ""); };
    host.style.display = "block";
    host.innerHTML =
      "<div class='card' style='margin-top:10px;'><h3>Factuur" + (o.invoice_number ? " " + esc(o.invoice_number) : "") + "</h3>" +
      "<div class='hint' id='inv-warn'></div>" +
      "<div class='grid'>" +
        fldGen("inv-name", "Naam of bedrijf", pick("name", o.buyer_name)) +
        fldGen("inv-att", "T.a.v. (optioneel)", pick("attention")) +
        fldGen("inv-addr", "Adres", pick("address1")) +
        fldGen("inv-zip", "Postcode en plaats", pick("zipCity")) +
        fldGen("inv-country", "Land", pick("country", "Nederland")) +
        fldGen("inv-vat", "Btw-nummer klant (optioneel)", pick("vat")) +
      "</div>" +
      "<div class='row' style='margin-top:6px;'>" +
        "<button class='ghost sm' type='button' id='inv-preview'>Voorbeeld</button>" +
        "<button class='sm' type='button' id='inv-make'>" + (o.invoice_number ? "Gegevens bijwerken" : "Factuur maken") + "</button>" +
        (o.invoice_number ? "<button class='ghost sm' type='button' id='inv-view'>Factuur bekijken</button>" : "") +
      "</div>" +
      "<div class='muted' style='margin-top:8px;'>Het factuurnummer wordt eenmalig toegekend en blijft daarna hetzelfde. Afdrukken of opslaan als pdf doe je vanuit de factuurpagina.</div></div>";

    var val = function (cls) { var el = host.querySelector("." + cls); return el ? el.value.trim() : ""; };
    var details = function () {
      return { name: val("inv-name"), attention: val("inv-att"), address1: val("inv-addr"), zipCity: val("inv-zip"), country: val("inv-country"), vat: val("inv-vat") };
    };
    // Ontbrekende bedrijfsgegevens van NvdW BV meteen melden
    invoiceFetch("?order_id=" + encodeURIComponent(o.id)).then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.seller_missing && d.seller_missing.length) {
        $("inv-warn").style.color = "var(--bordeaux)";
        $("inv-warn").textContent = "Let op: het KvK-nummer en/of btw-nummer van NvdW BV staan nog niet in het systeem. Je kunt een voorbeeld bekijken, maar nog geen factuur maken.";
      }
    }).catch(function () { /* waarschuwing is optioneel */ });

    host.querySelector("#inv-preview").addEventListener("click", function () {
      var win = window.open("", "_blank");
      if (!win) { toast("Pop-up geblokkeerd. Sta pop-ups toe voor deze pagina.", "err"); return; }
      showInvoiceHtml(win, invoiceFetch("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_id: o.id, details: details(), preview: true }) }));
    });
    var viewBtn = host.querySelector("#inv-view");
    if (viewBtn) viewBtn.addEventListener("click", function () {
      var win = window.open("", "_blank");
      if (!win) { toast("Pop-up geblokkeerd. Sta pop-ups toe voor deze pagina.", "err"); return; }
      showInvoiceHtml(win, invoiceFetch("?order_id=" + encodeURIComponent(o.id) + "&format=html"));
    });
    host.querySelector("#inv-make").addEventListener("click", function () {
      var win = window.open("", "_blank");
      if (!win) { toast("Pop-up geblokkeerd. Sta pop-ups toe voor deze pagina.", "err"); return; }
      var btn = host.querySelector("#inv-make"); btn.disabled = true;
      invoiceFetch("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_id: o.id, details: details() }) })
        .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, d: d }; }); })
        .then(function (r) {
          if (!r.ok || !r.d || !r.d.ok) { throw (r.d && r.d.error) || "fout"; }
          toast("Factuur " + r.d.invoice_number + " aangemaakt.", "ok");
          showInvoiceHtml(win, invoiceFetch("?order_id=" + encodeURIComponent(o.id) + "&format=html"));
          openOrder(o.id);
        })
        .catch(function (err) {
          btn.disabled = false;
          try { win.close(); } catch (e) { /* venster al dicht */ }
          toast(INVOICE_ERR[err] || "Factuur maken niet gelukt.", "err");
        });
    });
  }

  var BUYER_LABELS = { geboortedatum: "Geboortedatum", woonplaats: "Woonplaats", leeftijd: "Leeftijd", naam: "Naam", email: "E-mail" };
  function prettyKey(k) { k = String(k).replace(/_/g, " "); return k.charAt(0).toUpperCase() + k.slice(1); }
  function fmtDateNL(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s)); return m ? m[3] + "-" + m[2] + "-" + m[1] : String(s); }
  function ageFrom(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s)); if (!m) return null;
    var b = new Date(+m[1], +m[2] - 1, +m[3]); if (isNaN(b)) return null;
    var n = new Date(), a = n.getFullYear() - b.getFullYear(), mo = n.getMonth() - b.getMonth();
    if (mo < 0 || (mo === 0 && n.getDate() < b.getDate())) a--;
    return (a >= 0 && a < 120) ? a : null;
  }
  function typeName(id) {
    var t = (allTypes || []).filter(function (x) { return x.id === id; })[0];
    return t ? (t.name_nl || id) : id;
  }

  // Nette weergave van de gegevens van de koper (custom_data.order)
  function renderBuyerInfo(custom) {
    var src = custom && custom.order ? custom.order : (custom && typeof custom === "object" && !custom.tickets ? custom : null);
    if (!src || typeof src !== "object") return "";
    var rows = [];
    Object.keys(src).forEach(function (k) {
      var v = src[k];
      if (v == null || typeof v === "object" || String(v).trim() === "") return;
      var label = BUYER_LABELS[k] || prettyKey(k);
      var display = String(v);
      if (k === "geboortedatum") { var a = ageFrom(v); display = fmtDateNL(v) + (a != null ? " · " + a + " jaar" : ""); }
      rows.push("<div style='display:flex;gap:12px;padding:3px 0;'><span style='min-width:120px;color:var(--ink-muted);font-size:12.5px;'>" + esc(label) + "</span><span style='font-weight:500;'>" + esc(display) + "</span></div>");
    });
    if (!rows.length) return "";
    return "<div style='margin-top:12px;padding:12px 14px;background:#faf8f2;border:1px solid var(--line);border-radius:9px;'>" + rows.join("") + "</div>";
  }

  // Per-ticket antwoorden (compact, geen ruwe JSON)
  // Welke ticketvragen gelden voor dit tickettype? Zelfde definities als de
  // kassa gebruikt, zodat een handmatige aanvulling in dezelfde kolom van de
  // gastenlijst landt en er geen tweede lijst ontstaat.
  function ticketVragenVoor(typeId) {
    return (allFields || []).filter(function (f) {
      if (!f.active || f.scope !== "ticket") return false;
      if (f.applies_to && f.applies_to.length) return f.applies_to.indexOf(typeId) > -1;
      return true;
    });
  }
  function ensureFields(cb) {
    if (allFields.length) { cb(); return; }
    get("/fields", function (ok, d) { if (ok && d) allFields = d.fields || []; cb(); });
  }

  // Invulveldjes bij een ticket: bijvoorbeeld een allergie die iemand pas na het
  // boeken doorgeeft. Slaat op in dezelfde opslag als de kassa gebruikt, dus de
  // gastenlijst en de keukenlijst blijven één en dezelfde lijst.
  function bewerkTicketVragen(tid, d, orderId) {
    var ticket = (d.tickets || []).filter(function (x) { return x.id === tid; })[0];
    if (!ticket) return;
    var cel = document.querySelector(".tf-cel[data-tid='" + tid + "']");
    if (!cel || cel.getAttribute("data-bewerkt") === "1") return;
    cel.setAttribute("data-bewerkt", "1");
    var vragen = ticketVragenVoor(ticket.ticket_type_id);
    var huidig = ticket.custom_data || {};
    var html = "<div class='tf-form' style='display:grid; gap:6px; min-width:220px;'>";
    vragen.forEach(function (f) {
      html += "<label style='display:block;'><span class='hint' style='display:block; margin:0 0 2px;'>" +
        esc(f.label_nl || f.key) + "</span>" +
        "<input type='text' class='tf-in' data-key='" + esc(f.key) + "' maxlength='500' value='" +
        esc(String(huidig[f.key] == null ? "" : huidig[f.key])) + "' style='width:100%;' /></label>";
    });
    html += "<div class='row' style='gap:6px;'>" +
      "<button class='sm tf-save' type='button'>Opslaan</button>" +
      "<button class='ghost sm tf-cancel' type='button'>Annuleren</button>" +
      "</div></div>";
    cel.innerHTML = html;
    cel.querySelector(".tf-cancel").addEventListener("click", function () { openOrder(orderId); });
    cel.querySelector(".tf-save").addEventListener("click", function () {
      var velden = {};
      Array.prototype.forEach.call(cel.querySelectorAll(".tf-in"), function (i) {
        velden[i.getAttribute("data-key")] = i.value.trim();
      });
      var knop = cel.querySelector(".tf-save");
      knop.disabled = true; knop.textContent = "Bezig…";
      post(API_TICKET_FIELDS, { ticket_id: tid, fields: velden }, function (ok, r) {
        if (ok && r && r.ok) { toast("Opgeslagen bij ticket " + (ticket.code || ""), "ok"); openOrder(orderId); }
        else { toast("Opslaan mislukt.", "err"); knop.disabled = false; knop.textContent = "Opslaan"; }
      });
    });
  }

  function renderCustom(data, inline) {
    if (!data || typeof data !== "object") return inline ? "–" : "";
    var keys = Object.keys(data).filter(function (k) { var v = data[k]; return v != null && typeof v !== "object" && String(v).trim() !== ""; });
    if (!keys.length) return inline ? "–" : "";
    var parts = keys.map(function (k) {
      var v = data[k];
      if (k === "geboortedatum") { var a = ageFrom(v); v = fmtDateNL(v) + (a != null ? " (" + a + "j)" : ""); }
      return "<span class='chip'>" + esc(BUYER_LABELS[k] || prettyKey(k)) + ": " + esc(v) + "</span>";
    });
    if (inline) return parts.join(" ");
    return "<div style='margin-top:6px;'>" + parts.join(" ") + "</div>";
  }

  /* comp tickets — type-dropdown gevuld vanuit /types */
  $("compbtn").addEventListener("click", function () {
    var body = {
      type_id: $("c-type").value,
      qty: parseInt($("c-qty").value, 10) || 1,
      email: $("c-email").value.trim() || undefined,
      name: $("c-name").value.trim() || undefined
    };
    if (!body.type_id) { toast("Kies een type.", "err"); return; }
    if ($("c-sendmail") && $("c-sendmail").checked && !body.email) { toast("Vul een e-mailadres in om de tickets te mailen.", "err"); return; }
    post("/comp", body, function (ok, r) {
      var el = $("c-result");
      if (ok && r && r.ok) {
        var lnk = (r.ticket_link || "").replace(/^https?:\/\/(www\.)?apero-culture\.(com|nl)\/tickets(\.html)?/, "/tickets.html");
        el.innerHTML = "Aangemaakt: <b>" + esc(r.short_ref) + "</b>" + (lnk ? " &middot; <a href='" + attr(lnk) + "' target='_blank' rel='noopener'>open tickets</a>" : "");
        toast("Comp-tickets aangemaakt: " + r.short_ref, "ok");
        loadOverview();
        if (body.email && $("c-sendmail") && $("c-sendmail").checked) {
          post("/resend", { order_id: r.order_id }, function (ok2, m) {
            if (ok2 && m && m.ok !== false) {
              el.innerHTML += " &middot; ticketmail verstuurd naar " + esc(body.email);
              toast("Ticketmail verstuurd naar " + body.email, "ok");
            } else {
              el.innerHTML += " &middot; <span style='color:var(--bordeaux);'>ticketmail mislukt, probeer Mail opnieuw bij de order</span>";
              toast("Tickets staan klaar, maar de mail is niet verstuurd.", "err");
            }
          });
        }
      } else {
        el.textContent = "Mislukt (uitverkocht of ongeldige invoer).";
        toast("Comp-tickets mislukt.", "err");
      }
    });
  });
  // vul comp-dropdown wanneer orders sectie voor het eerst opent
  function fillCompTypes(types) {
    var sel = $("c-type");
    if (!sel || !types || sel.dataset.filled) return;
    sel.innerHTML = types.map(function (t) {
      return "<option value='" + attr(t.id) + "'>" + esc(t.name_nl) + " (" + esc(t.id) + ")</option>";
    }).join("");
    sel.dataset.filled = "1";
  }
  // vul ook de bulk-crew dropdown vanuit dezelfde types
  function fillBulkTypes(types) {
    var sel = $("bc-type");
    if (!sel || !types || sel.dataset.filled) return;
    sel.innerHTML = types.map(function (t) {
      return "<option value='" + attr(t.id) + "'>" + esc(t.name_nl) + " (" + esc(t.id) + ")</option>";
    }).join("");
    sel.dataset.filled = "1";
  }
  function loadOrdersInit() {
    loadOrders();
    if (!$("c-type").dataset.filled || !$("bc-type").dataset.filled) {
      get("/types", function (ok, d) {
        if (ok && d) { fillCompTypes(d.types || []); fillBulkTypes(d.types || []); }
      });
    }
  }
  loaders.orders = loadOrdersInit;

  /* ---------- bulk crewtickets ---------- */
  // ticketlink kort en relatief maken, net als bij comp
  function shortTicketLink(link) {
    return String(link || "").replace(/^https?:\/\/(www\.)?apero-culture\.(com|nl)\/tickets(\.html)?/, "/tickets.html");
  }
  // parse textarea "naam, email" per regel -> [{name, email}]
  function parseBulkPeople(raw) {
    var lines = String(raw || "").split("\n");
    var people = [];
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    lines.forEach(function (line) {
      line = line.trim();
      if (!line) return;
      var parts = line.split(/[,;]/);
      var name = (parts[0] || "").trim();
      var email = parts.length > 1 ? (parts.slice(1).join(",").trim()) : "";
      var person = {};
      if (name) person.name = name;
      if (email && emailRe.test(email)) person.email = email;
      // alleen toevoegen als er minstens een naam of een geldige email is
      if (person.name || person.email) people.push(person);
    });
    return people;
  }
  var bulkMode = "list";
  var lastBulkRows = []; // {name, email, link} voor kopieer/csv
  function setBulkMode(mode) {
    bulkMode = mode === "count" ? "count" : "list";
    qsa(".bc-tab", $("bc-modes")).forEach(function (b) {
      var on = b.getAttribute("data-mode") === bulkMode;
      b.className = (on ? "" : "ghost ") + "sm bc-tab";
    });
    var listEl = $("bc-list-pane"), countEl = $("bc-count-pane");
    if (listEl) listEl.style.display = bulkMode === "list" ? "block" : "none";
    if (countEl) countEl.style.display = bulkMode === "count" ? "block" : "none";
  }
  qsa(".bc-tab", $("bc-modes")).forEach(function (b) {
    b.addEventListener("click", function () { setBulkMode(b.getAttribute("data-mode")); });
  });
  setBulkMode("list");

  function refreshBulkParsed() {
    var n = parseBulkPeople($("bc-people").value).length;
    $("bc-parsed").textContent = n + " regel" + (n === 1 ? "" : "s") + " herkend.";
  }
  $("bc-people").addEventListener("input", refreshBulkParsed);

  function renderBulkResult(mode, r) {
    var box = $("bc-result");
    var sum = $("bc-summary");
    var wrap = $("bc-list-wrap");
    var tb = document.querySelector("#bc-table tbody");
    lastBulkRows = [];
    box.style.display = "block";
    if (mode === "list") {
      var results = r.results || [];
      var created = r.created != null ? r.created : results.filter(function (x) { return x && x.ok; }).length;
      var total = r.total != null ? r.total : results.length;
      sum.textContent = created + " van " + total + " aangemaakt.";
      wrap.style.display = results.length ? "block" : "none";
      tb.innerHTML = results.map(function (x) {
        x = x || {};
        var link = shortTicketLink(x.ticket_link);
        if (x.ok && link) lastBulkRows.push({ name: x.name || "", email: x.email || "", link: link });
        var statusCell = x.ok
          ? "<span class='st st-comp'>ok</span>"
          : "<span class='st st-failed'>fout" + (x.error ? " (" + esc(x.error) + ")" : "") + "</span>";
        var linkCell = (x.ok && link)
          ? "<a href='" + attr(link) + "' target='_blank' rel='noopener'>" + esc(x.short_ref || "open ticket") + "</a>"
          : "<span class='muted'>–</span>";
        return "<tr><td>" + esc(x.name || "–") + "</td><td>" + statusCell + "</td><td>" + linkCell + "</td></tr>";
      }).join("") || emptyRow(3, "Geen resultaten.");
    } else {
      var clink = shortTicketLink(r.ticket_link);
      sum.innerHTML = (r.created != null ? r.created : "?") + " crewtickets aangemaakt in lot <b>" + esc(r.short_ref || "") + "</b>" +
        (clink ? " &middot; <a href='" + attr(clink) + "' target='_blank' rel='noopener'>open tickets</a>" : "");
      wrap.style.display = "none";
      tb.innerHTML = "";
      if (clink) lastBulkRows.push({ name: "", email: "", link: clink });
    }
  }

  $("bc-create").addEventListener("click", function () {
    var typeId = $("bc-type").value;
    if (!typeId) { toast("Kies een tickettype.", "err"); return; }
    var btn = $("bc-create");
    var body;
    if (bulkMode === "list") {
      var people = parseBulkPeople($("bc-people").value);
      if (!people.length) { toast("Plak minstens een regel met een naam of email.", "err"); return; }
      body = { type_id: typeId, people: people, send_email: $("bc-sendmail").checked };
    } else {
      var count = parseInt($("bc-count").value, 10);
      if (!count || count < 1 || count > 500) { toast("Aantal moet tussen 1 en 500 liggen.", "err"); return; }
      body = { type_id: typeId, count: count };
    }
    var orig = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Bezig...";
    post("/bulk-comp", body, function (ok, r) {
      btn.disabled = false;
      btn.textContent = orig;
      if (ok && r && r.ok) {
        var mode = r.mode || bulkMode;
        renderBulkResult(mode, r);
        var madeN = r.created != null ? r.created : 0;
        toast(madeN + " crewticket" + (madeN === 1 ? "" : "s") + " aangemaakt.", "ok");
        loadOverview();
      } else {
        var msg = r && (r.detail || r.error || r.message) ? String(r.detail || r.error || r.message) : "";
        toast("Crewtickets aanmaken mislukt." + (msg ? " " + msg : ""), "err");
      }
    });
  });

  $("bc-copy").addEventListener("click", function () {
    var links = lastBulkRows.map(function (x) { return x.link; }).filter(function (s) { return s; });
    if (!links.length) { toast("Geen ticketlinks om te kopieren.", "err"); return; }
    var text = links.join("\n");
    function fallbackCopy() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      try { document.execCommand("copy"); toast("Ticketlinks gekopieerd.", "ok"); }
      catch (e) { toast("Kopieren mislukt.", "err"); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("Ticketlinks gekopieerd.", "ok"); }, fallbackCopy);
    } else {
      fallbackCopy();
    }
  });

  function csvCell(s) {
    s = String(s == null ? "" : s);
    if (/[",\n;]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  $("bc-csv").addEventListener("click", function () {
    if (!lastBulkRows.length) { toast("Geen data om te downloaden.", "err"); return; }
    var rows = ["naam,email,ticketlink"].concat(lastBulkRows.map(function (x) {
      return csvCell(x.name) + "," + csvCell(x.email) + "," + csvCell(x.link);
    }));
    var blob = new Blob([rows.join("\n") + "\n"], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "apero-crewtickets.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });

  /* ============================================================
     3. PAYMENT LOG
  ============================================================ */
  $("pl-refresh").addEventListener("click", loadPaylog);
  function loadPaylog() {
    get("/paymentlog", function (ok, d) {
      var tb = document.querySelector("#t-paylog tbody");
      if (!ok || !d) { tb.innerHTML = emptyRow(6, "Laden mislukt."); return; }
      tb.innerHTML = (d.events || []).map(function (e) {
        var ord = e.orders || {};
        return "<tr><td>" + dt(e.occurred_at) + "</td><td>" + esc(ord.short_ref || "–") +
          "</td><td>" + esc(ord.buyer_email || "–") +
          "</td><td class='" + statusClass(e.mollie_status) + "'>" + esc(e.mollie_status || "–") +
          "</td><td><span class='chip'>" + esc(e.source || "") + "</span></td>" +
          "<td class='muted'>" + esc(e.note || "") + "</td></tr>";
      }).join("") || emptyRow(6, "Geen betaalgebeurtenissen.");
    });
  }

  /* ============================================================
     4. GUEST LIST
  ============================================================ */
  $("g-refresh").addEventListener("click", loadGuests);
  $("g-day").addEventListener("change", loadGuests);
  // tickettype-keuze voor de export vullen vanuit /types
  function fillGuestExportTypes(types) {
    var sel = $("gx-type");
    if (!sel || !types || sel.dataset.filled) return;
    sel.innerHTML = "<option value=''>Alle types</option>" + types.map(function (t) {
      return "<option value='" + attr(t.id) + "'>" + esc(t.name_nl || t.id) + "</option>";
    }).join("");
    sel.dataset.filled = "1";
  }
  var DAY_FILE = { thu: "donderdag", fri: "vrijdag", sat: "zaterdag", sun: "zondag" };
  if ($("gx-export")) $("gx-export").addEventListener("click", function () {
    var day = $("gx-day") ? $("gx-day").value : "";
    var type = $("gx-type") ? $("gx-type").value : "";
    var btn = $("gx-export");
    var orig = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Bezig...";
    var p = "/guests.csv?day=" + encodeURIComponent(day) + "&type=" + encodeURIComponent(type);
    get(p, function (ok, blob) {
      btn.disabled = false;
      btn.textContent = orig;
      if (!ok || !blob) { toast("Export van gasten mislukt.", "err"); return; }
      var parts = ["apero-gasten"];
      if (day && DAY_FILE[day]) parts.push(DAY_FILE[day]);
      if (type) parts.push(slugify(type) || "type");
      var name = parts.join("-") + ".csv";
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      toast("Gastenlijst gedownload.", "ok");
    });
  });
  if ($("rx-export")) $("rx-export").addEventListener("click", function () {
    var btn = $("rx-export");
    var orig = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Bezig...";
    get("https://snfojphxsbzfewwfbfka.supabase.co/functions/v1/restaurant-export", function (ok, blob) {
      btn.disabled = false;
      btn.textContent = orig;
      if (!ok || !blob) { toast("Export van restaurant mislukt.", "err"); return; }
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "apero-restaurant-plaatsing.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      toast("Restaurantlijst gedownload.", "ok");
    });
  });
  function loadGuests() {
    // zorg dat de export-dropdown gevuld is met tickettypes
    if ($("gx-type") && !$("gx-type").dataset.filled) {
      if (allTypes && allTypes.length) fillGuestExportTypes(allTypes);
      else get("/types", function (ok, d) { if (ok && d) fillGuestExportTypes(d.types || []); });
    }
    var day = $("g-day").value;
    get("/guestlist" + (day ? "?day=" + encodeURIComponent(day) : ""), function (ok, d) {
      var tb = document.querySelector("#t-guests tbody");
      if (!ok || !d) { tb.innerHTML = emptyRow(5, "Laden mislukt."); return; }
      var g = d.guests || [];
      $("g-count").textContent = g.length + " gast" + (g.length === 1 ? "" : "en");
      tb.innerHTML = g.map(function (x) {
        var ord = x.orders || {};
        var name = x.holder_name || ord.buyer_name || "–";
        return "<tr><td>" + esc(name) + "</td><td>" + esc(x.ticket_type_id) +
          "</td><td>" + days(x.valid_days) + "</td><td class='" + statusClass(x.status) + "'>" + esc(x.status) +
          "</td><td>" + esc(ord.short_ref || "–") + "</td></tr>";
      }).join("") || emptyRow(5, "Geen gasten.");
    });
  }

  /* ============================================================
     5. TICKET TYPES
  ============================================================ */
  $("ty-refresh").addEventListener("click", loadTypes);
  var capInventory = [];
  var allTypes = [];
  var allFields = [];
  function loadTypes() {
    get("/types", function (ok, d) {
      if (!ok || !d) { $("types-list").innerHTML = "<div class='card muted'>Laden mislukt.</div>"; return; }
      allTypes = d.types || [];
      fillCompTypes(allTypes);
      fillBulkTypes(allTypes);
      renderTypeForms(allTypes);
      capInventory = d.inventory || [];
      renderCapList(capInventory);
    });
  }
  function renderTypeForms(types) {
    $("types-list").innerHTML = types.map(function (t) {
      var id = esc(t.id);
      var dayChips = (t.valid_days || []).length
        ? t.valid_days.map(function (d) { return "<span class='chip'>" + esc(DAYS_SHORT[d] || d) + "</span>"; }).join("")
        : "<span class='chip'>geen dagen</span>";
      return "<div class='card' data-typecard='" + attr(t.id) + "'>" +
        "<div class='row' style='justify-content:space-between;'><h3 style='margin:0;'>" + esc(t.name_nl || t.id) + " <span class='muted'>(" + id + ")</span></h3>" +
        "<label style='display:flex; gap:6px; align-items:center; margin:0;'><input type='checkbox' class='ty-active' " + (t.active ? "checked" : "") + " /> Actief</label></div>" +
        "<div style='margin-top:6px;'>" + dayChips + "</div>" +
        "<div class='sp'></div>" +
        "<div class='grid'>" +
          fldText("ty-name_nl", "Naam NL", t.name_nl) +
          fldText("ty-name_en", "Naam EN", t.name_en) +
          fldText("ty-price", "Prijs (euro)", centsToEuroInput(t.price_cents)) +
          fldText("ty-vat_rate", "BTW %", t.vat_rate) +
          fldText("ty-max_per_order", "Max per bestelling", t.max_per_order) +
          fldText("ty-sort_order", "Sorteervolgorde", t.sort_order) +
          "<div class='field'><label>Capaciteit (leeg = onbeperkt)</label><input type='number' min='0' class='ty-cap' value='" + attr(t.per_type_cap == null ? "" : t.per_type_cap) + "' />" +
            "<div class='muted' style='margin-top:4px;'>verkocht: " + (t.per_type_sold || 0) + "</div></div>" +
        "</div>" +
        "<div class='field'><label>Omschrijving NL</label><textarea class='ty-description_nl'>" + esc(t.description_nl) + "</textarea></div>" +
        "<div class='field'><label>Omschrijving EN</label><textarea class='ty-description_en'>" + esc(t.description_en) + "</textarea></div>" +
        "<div class='grid'>" +
          "<div class='field'><label>Beschikbaarheid</label><select class='ty-sale_state'>" +
            saleStateOpt("available", t.sale_state, "Beschikbaar") +
            saleStateOpt("sold_out", t.sale_state, "Uitverkocht") +
            saleStateOpt("coming_soon", t.sale_state, "Later beschikbaar") +
          "</select></div>" +
          "<div class='field'><label>Verkoop vanaf (leeg = direct)</label><input type='date' class='ty-sale_starts' value='" + attr(isoToDateInput(t.sale_starts_at)) + "' /></div>" +
          "<div class='field'><label>Verkoop tot (leeg = geen einde)</label><input type='date' class='ty-sale_ends' value='" + attr(isoToDateInput(t.sale_ends_at)) + "' /></div>" +
          "<div class='field'><label>Categorie</label><select class='ty-category'>" +
            "<option value='access'" + ((t.category || 'access') === 'access' ? " selected" : "") + ">Toegangsticket</option>" +
            "<option value='extra'" + (t.category === 'extra' ? " selected" : "") + ">Extra (masterclass e.d.)</option>" +
            "<option value='crew'" + (t.category === 'crew' ? " selected" : "") + ">Crew</option>" +
          "</select></div>" +
          "<div class='field'><label>Zichtbaar in shop</label><label style='display:flex; gap:7px; align-items:center; font-weight:400;'><input type='checkbox' class='ty-public' " + (t.public !== false ? "checked" : "") + " /> Tonen in publieke kassa</label></div>" +
        "</div>" +
        "<div class='muted' style='margin-bottom:8px;'>Aan/uit (Actief) = helemaal tonen of verbergen. Status + verkoopperiode bepalen of het koopbaar is. Categorie bepaalt waarvoor 'alleen toegang'-kortingscodes gelden. &middot; Toelaten: " + (t.admits_count || 1) + " &middot; familie: " + esc(t.family || "–") + "</div>" +
        "<button class='ty-save'>Opslaan</button>" +
      "</div>";
    }).join("");
    qsa("[data-typecard]").forEach(function (card) {
      card.querySelector(".ty-save").addEventListener("click", function () { saveType(card); });
    });
  }
  function fldText(cls, label, val) {
    return "<div class='field'><label>" + esc(label) + "</label><input type='text' class='" + cls + "' value='" + attr(val == null ? "" : val) + "' /></div>";
  }
  function saleStateOpt(value, current, label) {
    return "<option value='" + value + "'" + ((current || "available") === value ? " selected" : "") + ">" + label + "</option>";
  }
  function isoToDateInput(iso) {
    if (!iso) return "";
    var d = new Date(iso); if (isNaN(d)) return "";
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  function dateInputToIso(v) {
    v = (v || "").trim(); if (!v) return null;
    var d = new Date(v + "T00:00"); // lokale (Amsterdamse) middernacht
    return isNaN(d) ? null : d.toISOString();
  }
  function val(card, cls) { var el = card.querySelector("." + cls); return el ? el.value.trim() : ""; }
  function saveType(card) {
    var id = card.getAttribute("data-typecard");
    var capRaw = val(card, "ty-cap");
    var t = {
      id: id,
      name_nl: val(card, "ty-name_nl"),
      name_en: val(card, "ty-name_en"),
      description_nl: card.querySelector(".ty-description_nl").value,
      description_en: card.querySelector(".ty-description_en").value,
      price_cents: euroToCents(val(card, "ty-price")),
      vat_rate: parseFloat(val(card, "ty-vat_rate").replace(",", ".")) || 0,
      max_per_order: parseInt(val(card, "ty-max_per_order"), 10) || 0,
      sort_order: parseInt(val(card, "ty-sort_order"), 10) || 0,
      per_type_cap: capRaw === "" ? null : (parseInt(capRaw, 10) || 0),
      active: card.querySelector(".ty-active").checked,
      sale_state: (card.querySelector(".ty-sale_state") || {}).value || "available",
      sale_starts_at: dateInputToIso(val(card, "ty-sale_starts")),
      sale_ends_at: dateInputToIso(val(card, "ty-sale_ends")),
      category: (card.querySelector(".ty-category") || {}).value || "access",
      public: card.querySelector(".ty-public") ? card.querySelector(".ty-public").checked : true
    };
    post("/types", { type: t }, function (ok, r) {
      if (ok && r && r.ok) toast("Type opgeslagen: " + (t.name_nl || id), "ok");
      else toast("Opslaan type mislukt.", "err");
    });
  }
  function renderCapList(inv) {
    $("cap-list").innerHTML = "<div class='grid'>" + inv.map(function (r) {
      return "<div class='card' data-capday='" + attr(r.day) + "' style='margin:0;'>" +
        "<div style='font-weight:600; margin-bottom:8px;'>" + esc(DAYS[r.day] || r.day) + "</div>" +
        "<div class='field'><label>Capaciteit</label><input type='number' class='cap-cap' value='" + attr(r.capacity) + "' /></div>" +
        "<div class='muted'>Verkocht: " + (r.sold || 0) + "</div>" +
      "</div>";
    }).join("") + "</div>";
  }
  $("cap-save").addEventListener("click", function () {
    var inv = qsa("[data-capday]").map(function (c) {
      return { day: c.getAttribute("data-capday"), capacity: parseInt(c.querySelector(".cap-cap").value, 10) || 0 };
    });
    if (!inv.length) { toast("Geen capaciteitsdata.", "err"); return; }
    post("/types", { inventory: inv }, function (ok, r) {
      if (ok && r && r.ok) toast("Capaciteit opgeslagen.", "ok");
      else toast("Capaciteit opslaan mislukt.", "err");
    });
  });

  /* nieuw tickettype aanmaken */
  function buildTypeId(cat, name, day) {
    var catS = slugify(cat), nameS = slugify(name);
    if (nameS === catS) nameS = "";
    if (nameS.indexOf(catS + "_") === 0) nameS = nameS.slice(catS.length + 1);
    var prefix = catS + (nameS ? "_" + nameS : "");
    var maxPrefix = 40 - (day.length + 1);
    if (prefix.length > maxPrefix) prefix = prefix.slice(0, maxPrefix).replace(/_+$/, "");
    return prefix + "_" + day;
  }
  function updateCatHint() {
    $("tn-cat-hint").textContent = $("tn-cat").value === "entree"
      ? "Entree telt mee in de capaciteit per dag (dagentree)."
      : "Telt niet mee in de capaciteit per dag.";
  }
  $("tn-cat").addEventListener("change", updateCatHint);
  updateCatHint();
  $("ty-new").addEventListener("click", function () {
    var c = $("ty-new-card");
    c.style.display = c.style.display === "none" ? "block" : "none";
    if (c.style.display === "block") {
      c.scrollIntoView({ behavior: "smooth", block: "start" });
      $("tn-name").focus();
    }
  });
  $("tn-cancel").addEventListener("click", function () { $("ty-new-card").style.display = "none"; });
  function resetNewTypeForm() {
    $("tn-name").value = "";
    $("tn-price").value = "";
    $("tn-cap").value = "";
    $("tn-desc").value = "";
    $("tn-vat").value = "9";
    $("tn-max").value = "10";
    $("tn-cat").value = "proeverij";
    $("tn-day").value = "thu";
    updateCatHint();
  }
  $("tn-create").addEventListener("click", function () {
    var name = $("tn-name").value.trim();
    if (!name) { toast("Vul een naam in.", "err"); return; }
    if (!slugify(name)) { toast("De naam moet letters of cijfers bevatten.", "err"); return; }
    var cat = $("tn-cat").value;
    var day = $("tn-day").value;
    var validDays = day === "all" ? ["thu", "fri", "sat", "sun"] : [day];
    var capRaw = $("tn-cap").value.trim();
    var desc = $("tn-desc").value;
    var t = {
      id: buildTypeId(cat, name, day),
      name_nl: name,
      name_en: name,
      description_nl: desc,
      description_en: desc,
      price_cents: euroToCents($("tn-price").value),
      vat_rate: parseFloat($("tn-vat").value.replace(",", ".")) || 0,
      max_per_order: parseInt($("tn-max").value, 10) || 10,
      valid_days: validDays,
      stock_days: cat === "entree" ? validDays : [],
      family: cat,
      per_type_cap: capRaw === "" ? null : (parseInt(capRaw, 10) || 0),
      active: true,
      sort_order: 50,
      admits_count: 1
    };
    var exists = allTypes.some(function (x) { return x.id === t.id; });
    if (exists) { toast("Er bestaat al een type met deze naam en dag, pas de naam aan.", "err"); return; }
    post("/types", { type: t }, function (ok, r) {
      if (ok && r && r.ok) {
        toast("Tickettype aangemaakt: " + name, "ok");
        $("ty-new-card").style.display = "none";
        resetNewTypeForm();
        loadTypes();
      } else {
        var msg = r && (r.error || r.message) ? String(r.error || r.message) : "";
        if (/exist|duplicate|unique|conflict|23505/i.test(msg)) {
          toast("Er bestaat al een type met deze naam en dag, pas de naam aan.", "err");
        } else {
          toast("Tickettype aanmaken mislukt." + (msg ? " " + msg : ""), "err");
        }
      }
    });
  });

  /* ============================================================
     6. VRAGEN (purchase fields)
  ============================================================ */
  $("fl-refresh").addEventListener("click", loadFields);
  $("fl-new").addEventListener("click", function () { openNewField({}); });
  qsa(".fl-preset").forEach(function (b) {
    b.addEventListener("click", function () {
      openNewField({
        label_nl: b.getAttribute("data-label"),
        label_en: b.getAttribute("data-label"),
        scope: b.getAttribute("data-scope"),
        type: b.getAttribute("data-type"),
        required: false
      });
    });
  });
  function ensureTypes(cb) {
    if (allTypes.length) { cb(); return; }
    get("/types", function (ok, d) {
      if (ok && d) { allTypes = d.types || []; fillCompTypes(allTypes); }
      cb();
    });
  }
  function openNewField(preset) {
    ensureTypes(function () {
      var empty = $("fields-list").querySelector("[data-empty]");
      if (empty) empty.parentNode.removeChild(empty);
      var card = renderFieldForm(preset, true);
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      var inp = card.querySelector(".fl-label_nl");
      if (inp) inp.focus();
    });
  }
  // leesbare omschrijving van het soort antwoord
  var FL_TYPE_LABEL = { text: "tekst", number: "getal", date: "datum", select: "meerkeuze", checkbox: "aankruisvakje" };
  // bv "Geboortedatum: datum, verplicht, gevraagd per bestelling"
  function fieldSummary(f) {
    var parts = [];
    parts.push(FL_TYPE_LABEL[f.type] || (f.type || "tekst"));
    parts.push(f.required ? "verplicht" : "optioneel");
    parts.push(f.scope === "ticket" ? "gevraagd per ticket" : "gevraagd per bestelling");
    if (f.active === false) parts.push("nu uitgezet");
    return (f.label_nl || f.key || "Vraag") + ": " + parts.join(", ");
  }
  function loadFields() {
    ensureTypes(function () {
      get("/fields", function (ok, d) {
        if (!ok || !d) { $("fields-list").innerHTML = "<div class='card muted'>Laden mislukt.</div>"; return; }
        $("fields-list").innerHTML = "";
        var fields = d.fields || [];
        // korte uitleg in gewone taal bovenaan
        var info = document.createElement("div");
        info.className = "card";
        info.innerHTML = "<h3>Hoe werken vragen?</h3>" +
          "<div class='hint' style='margin-bottom:0;'>" +
          "<b>Per bestelling</b> = de koper beantwoordt de vraag 1 keer voor de hele order (bijvoorbeeld woonplaats of leeftijd). " +
          "<b>Per ticket</b> = de vraag wordt voor elke bezoeker apart gesteld (bijvoorbeeld naam op ticket of allergieën). " +
          "Verplichte vragen moeten ingevuld worden voordat de koper kan afrekenen." +
          "</div>";
        $("fields-list").appendChild(info);
        fields.forEach(function (f) { renderFieldForm(f, false); });
        if (!fields.length) {
          var empty = document.createElement("div");
          empty.className = "card muted";
          empty.setAttribute("data-empty", "1");
          empty.textContent = "Nog geen vragen. Gebruik Snel toevoegen of + Nieuwe vraag.";
          $("fields-list").appendChild(empty);
        }
      });
    });
  }
  function renderFieldForm(f, isNew) {
    f = f || {};
    var wrap = document.createElement("div");
    wrap.className = "card";
    var fScope = f.scope === "ticket" ? "ticket" : "order";
    var fType = f.type || "text";
    var typeSel = [["text", "Tekst"], ["number", "Getal"], ["date", "Datum"], ["select", "Meerkeuze"], ["checkbox", "Aankruisvakje"]].map(function (o) {
      return "<option value='" + o[0] + "'" + (fType === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
    }).join("");
    var scopeSel = [["order", "De koper, één keer per bestelling"], ["ticket", "Per ticket apart"]].map(function (o) {
      return "<option value='" + o[0] + "'" + (fScope === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
    }).join("");
    var opts = Array.isArray(f.options) ? f.options.join(", ") : "";
    var applies = Array.isArray(f.applies_to) ? f.applies_to : [];
    var allChecked = applies.length === 0;
    var typeChecks = allTypes.length ? allTypes.map(function (t) {
      var on = applies.indexOf(t.id) > -1;
      return "<label style='display:flex; gap:7px; align-items:center; margin:0 0 5px; font-size:13px; font-weight:400; color:var(--ink);'>" +
        "<input type='checkbox' class='fl-apply' value='" + attr(t.id) + "'" + (on ? " checked" : "") + (allChecked ? " disabled" : "") + " /> " +
        esc(t.name_nl || t.id) + "</label>";
    }).join("") : "<div class='muted'>Geen tickettypes gevonden. Ververs de pagina of maak eerst een tickettype aan.</div>";
    var enOpen = !!(f.label_en && f.label_nl && f.label_en !== f.label_nl);
    var summary = isNew ? "" : "<div class='muted' style='margin-top:2px;'>" + esc(fieldSummary(f)) + "</div>";
    wrap.innerHTML =
      "<div class='row' style='justify-content:space-between;'>" +
        "<div><h3 style='margin:0;'>" + (isNew ? "Nieuwe vraag" : esc(f.label_nl || f.key)) + "</h3>" + summary + "</div>" +
        "<div class='row'>" +
          "<label style='display:flex; gap:6px; align-items:center; margin:0;'><input type='checkbox' class='fl-required' " + (f.required ? "checked" : "") + " /> Verplicht</label>" +
          "<label style='display:flex; gap:6px; align-items:center; margin:0;'><input type='checkbox' class='fl-active' " + (f.active !== false ? "checked" : "") + " /> Actief</label>" +
        "</div>" +
      "</div><div class='sp'></div>" +
      "<div class='grid'>" +
        "<div class='field'><label>Vraag (wat zien kopers?)</label><input type='text' class='fl-label_nl' value='" + attr(f.label_nl) + "' placeholder='bv Allergieën of dieetwensen' /></div>" +
        "<div class='field'><label>Wie beantwoordt dit?</label><select class='fl-scope'>" + scopeSel + "</select>" +
          "<div class='muted' style='margin-top:4px;'>Per bestelling = 1x per order. Per ticket = voor elke bezoeker apart.</div></div>" +
        "<div class='field'><label>Soort antwoord</label><select class='fl-type'>" + typeSel + "</select></div>" +
      "</div>" +
      "<div class='field fl-options-wrap' style='display:none;'><label>Keuze-opties (komma-gescheiden)</label><input type='text' class='fl-options' value='" + attr(opts) + "' placeholder='rood, wit, rosé' />" +
        "<div class='muted' style='margin-top:4px;'>Elke optie wordt een keuze in het uitklapmenu. Scheid ze met een komma.</div></div>" +
      "<details" + (enOpen ? " open" : "") + " style='margin-bottom:12px;'><summary style='cursor:pointer; font-size:12.5px; color:var(--ink-muted);'>Engelse vertaling (optioneel)</summary>" +
        "<div class='field' style='margin-top:8px;'><label>Vraag in het Engels</label><input type='text' class='fl-label_en' value='" + attr(f.label_en) + "' placeholder='Leeg = zelfde als de vraag' /></div></details>" +
      "<div class='fl-applies-wrap' style='display:none; margin-bottom:12px;'>" +
        "<label>Geldt voor</label>" +
        "<label style='display:flex; gap:7px; align-items:center; margin:0 0 7px; font-size:13px; font-weight:600; color:var(--ink);'><input type='checkbox' class='fl-apply-all'" + (allChecked ? " checked" : "") + " /> Alle tickets</label>" +
        "<div class='fl-apply-list'>" + typeChecks + "</div>" +
      "</div>" +
      "<div class='fl-order-hint muted' style='display:none; margin-bottom:12px;'>Geldt voor de hele bestelling.</div>" +
      "<div class='row'><button class='fl-save'>" + (isNew ? "Vraag toevoegen" : "Opslaan") + "</button>" +
      (isNew ? "" : "<button class='danger fl-del'>Verwijderen</button>") + "</div>";
    var first = $("fields-list").firstChild;
    if (isNew && first) $("fields-list").insertBefore(wrap, first); else $("fields-list").appendChild(wrap);

    function gv(cls) { var el = wrap.querySelector("." + cls); return el ? el.value.trim() : ""; }
    var scopeEl = wrap.querySelector(".fl-scope");
    var typeEl = wrap.querySelector(".fl-type");
    var allEl = wrap.querySelector(".fl-apply-all");
    function syncScope() {
      var isTicket = scopeEl.value === "ticket";
      wrap.querySelector(".fl-applies-wrap").style.display = isTicket ? "block" : "none";
      wrap.querySelector(".fl-order-hint").style.display = isTicket ? "none" : "block";
    }
    function syncType() {
      wrap.querySelector(".fl-options-wrap").style.display = typeEl.value === "select" ? "block" : "none";
    }
    function syncAll() {
      qsa(".fl-apply", wrap).forEach(function (c) { c.disabled = allEl.checked; });
    }
    scopeEl.addEventListener("change", syncScope);
    typeEl.addEventListener("change", syncType);
    allEl.addEventListener("change", syncAll);
    syncScope(); syncType(); syncAll();

    wrap.querySelector(".fl-save").addEventListener("click", function () {
      var labelNl = gv("fl-label_nl");
      if (!labelNl) { toast("Vul de vraag in.", "err"); return; }
      var keyv = isNew ? slugify(labelNl).slice(0, 40).replace(/_+$/, "") : (f.key || "");
      if (!/^[a-z0-9_]{2,40}$/.test(keyv)) { toast("De vraag moet minimaal 2 letters of cijfers bevatten.", "err"); return; }
      var scope = scopeEl.value;
      var typev = typeEl.value;
      var applies_to = [];
      if (scope === "ticket" && !allEl.checked) {
        applies_to = qsa(".fl-apply", wrap).filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
        if (!applies_to.length) { toast("Vink minstens één tickettype aan of kies Alle tickets.", "err"); return; }
      }
      var body = {
        key: keyv,
        label_nl: labelNl,
        label_en: gv("fl-label_en") || labelNl,
        scope: scope,
        type: typev,
        required: wrap.querySelector(".fl-required").checked,
        active: wrap.querySelector(".fl-active").checked,
        sort: parseInt(f.sort, 10) || 0,
        options: typev === "select" ? splitList(gv("fl-options")) : [],
        applies_to: applies_to
      };
      if (!isNew && f.id) body.id = f.id;
      post("/fields", body, function (ok, r) {
        if (ok && r && r.ok) { toast("Vraag opgeslagen.", "ok"); loadFields(); }
        else toast("Vraag opslaan mislukt.", "err");
      });
    });
    var delBtn = wrap.querySelector(".fl-del");
    if (delBtn) delBtn.addEventListener("click", function () {
      if (!confirm("Vraag '" + (f.label_nl || f.key) + "' verwijderen?")) return;
      del("/fields?id=" + encodeURIComponent(f.id), function (ok, r) {
        if (ok && r && r.ok) { toast("Vraag verwijderd.", "ok"); loadFields(); }
        else toast("Verwijderen mislukt.", "err");
      });
    });
    return wrap;
  }
  function fldGen(cls, label, v) {
    return "<div class='field'><label>" + esc(label) + "</label><input type='text' class='" + cls + "' value='" + attr(v == null ? "" : v) + "' /></div>";
  }
  function splitList(s) {
    if (!s) return [];
    return s.split(",").map(function (x) { return x.trim(); }).filter(function (x) { return x !== ""; });
  }

  /* ============================================================
     7. DISCOUNTS
  ============================================================ */
  $("dc-refresh").addEventListener("click", loadDiscounts);
  $("dc-new").addEventListener("click", function () { renderDiscountForm({}, true); });
  var discCache = [];

  function loadDiscounts() {
    get("/discounts", function (ok, d) {
      if (!ok || !d) { $("discounts-list").innerHTML = "<div class='card muted'>Laden mislukt.</div>"; return; }
      discCache = d.discounts || [];
      renderDiscountTable();
    });
  }

  // Korting leesbaar: "10%" of "€ 5,00"
  function discValueTxt(x) {
    return x.kind === "fixed_cents" ? euro(x.value) : ((x.value == null ? 0 : x.value) + "%");
  }
  // Hoe vaak nog te gebruiken; leeg max_uses = onbeperkt
  function discUsesTxt(x) {
    if (x.max_uses == null) return "<span class='pill' title='Deze code kan onbeperkt gebruikt worden'>onbeperkt</span>";
    var left = Math.max(0, x.max_uses - (x.used_count || 0));
    return "<b>" + left + "</b><span class='muted'> van " + x.max_uses + "</span>";
  }
  // Status: inactief / nog niet geldig / verlopen / op / actief
  function discStatus(x) {
    var now = new Date();
    var used = x.used_count || 0;
    if (x.active === false) return { label: "Inactief", cls: "st st-canceled" };
    if (x.valid_from && new Date(x.valid_from) > now) return { label: "Nog niet geldig", cls: "st st-pending" };
    if (x.valid_until && new Date(x.valid_until + "T23:59:59") < now) return { label: "Verlopen", cls: "st st-expired" };
    if (x.max_uses != null && used >= x.max_uses) return { label: "Op", cls: "st st-expired" };
    return { label: "Actief", cls: "st st-paid" };
  }

  function renderDiscountTable() {
    var host = $("discounts-list");
    if (!discCache.length) {
      host.innerHTML = "<div class='card muted'>Nog geen codes. Klik op + Nieuwe code.</div>";
      return;
    }
    var totUsed = discCache.reduce(function (s, x) { return s + (x.used_count || 0); }, 0);
    var rows = discCache.map(function (x) {
      var st = discStatus(x);
      var used = x.used_count || 0;
      var scope = x.ticket_scope === "access" ? "alleen toegangstickets" : "";
      var applies = (Array.isArray(x.applies_to) && x.applies_to.length) ? x.applies_to.join(", ") : "";
      var sub = [scope, applies].filter(Boolean).join(" · ");
      return "<tr>" +
        "<td><b>" + esc(x.code) + "</b>" + (sub ? "<div class='muted' style='font-size:11.5px;'>" + esc(sub) + "</div>" : "") + "</td>" +
        "<td class='num'>" + esc(discValueTxt(x)) + "</td>" +
        "<td class='num'>" + (used ? "<b>" + used + "×</b>" : "<span class='muted'>0×</span>") + "</td>" +
        "<td class='num'>" + discUsesTxt(x) + "</td>" +
        "<td>" + (x.valid_until ? dshort(x.valid_until) : "<span class='muted'>–</span>") + "</td>" +
        "<td><span class='" + st.cls + "'>" + esc(st.label) + "</span></td>" +
        "<td class='num'><button class='ghost sm dc-edit' data-id='" + attr(x.id) + "'>bewerk</button></td>" +
        "</tr>";
    }).join("");
    host.innerHTML = "<div class='card'>" +
      "<h3>Alle codes (" + discCache.length + ") · " + totUsed + " keer verzilverd</h3>" +
      "<div class='tablewrap'><table>" +
      "<thead><tr><th>Code</th><th class='num'>Korting</th><th class='num'>Verzilverd</th><th class='num'>Nog te gebruiken</th><th>Geldig t/m</th><th>Status</th><th></th></tr></thead>" +
      "<tbody>" + rows + "</tbody></table></div></div>";
    qsa(".dc-edit", host).forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-id");
        var x = discCache.filter(function (c) { return String(c.id) === String(id); })[0];
        if (x) renderDiscountForm(x, false);
      });
    });
  }
  function renderDiscountForm(x, isNew) {
    x = x || {};
    var kind = x.kind || "percent";
    var wrap = document.createElement("div");
    wrap.className = "card";
    var kindSel = "<option value='percent'" + (kind === "percent" ? " selected" : "") + ">Percentage (%)</option>" +
      "<option value='fixed_cents'" + (kind === "fixed_cents" ? " selected" : "") + ">Vast bedrag (euro)</option>";
    // waarde: bij percent toon getal, bij fixed_cents toon euro
    var valueDisplay = kind === "fixed_cents" ? centsToEuroInput(x.value) : (x.value == null ? "" : x.value);
    var applies = Array.isArray(x.applies_to) ? x.applies_to.join(", ") : "";
    wrap.innerHTML =
      "<div class='row' style='justify-content:space-between;'>" +
        "<h3 style='margin:0;'>" + (isNew ? "Nieuwe code" : esc(x.code)) + (isNew ? "" : " <span class='muted' style='font-weight:400;'>" + (x.used_count || 0) + " keer gebruikt van " + (x.max_uses == null ? "onbeperkt" : x.max_uses) + (x.max_tickets != null ? " · max " + x.max_tickets + " tickets" : "") + "</span>") + "</h3>" +
        "<label style='display:flex; gap:6px; align-items:center; margin:0;'><input type='checkbox' class='dc-active' " + (x.active !== false ? "checked" : "") + " /> Actief</label>" +
      "</div><div class='sp'></div>" +
      "<div class='grid'>" +
        fldGen("dc-code", "Code", x.code) +
        "<div class='field'><label>Soort korting</label><select class='dc-kind'>" + kindSel + "</select></div>" +
        "<div class='field'><label class='dc-vlabel'>" + (kind === "fixed_cents" ? "Bedrag (euro)" : "Percentage") + "</label><input type='text' class='dc-value' value='" + attr(valueDisplay) + "' /></div>" +
        fldGen("dc-max", "Max gebruik (leeg = onbeperkt)", x.max_uses) +
        "<div class='field'><label>Max aantal tickets (leeg = onbeperkt)</label><input type='number' min='1' class='dc-maxtix' value='" + attr(x.max_tickets == null ? "" : x.max_tickets) + "' />" +
          "<div class='muted' style='margin-top:4px;'>Op hoeveel tickets de korting maximaal telt (goedkoopste eerst). Een bundel zoals Party for 5 telt als 1.</div></div>" +
        "<div class='field'><label>Geldig van (optioneel)</label><input type='date' class='dc-from' value='" + attr((x.valid_from || "").slice(0, 10)) + "' /></div>" +
        "<div class='field'><label>Geldig tot (optioneel)</label><input type='date' class='dc-until' value='" + attr((x.valid_until || "").slice(0, 10)) + "' /></div>" +
      "</div>" +
      "<div class='field'><label>Geldt voor</label><select class='dc-scope'>" +
        "<option value='all'" + ((x.ticket_scope || 'all') === 'all' ? " selected" : "") + ">Alles (ook extra's)</option>" +
        "<option value='access'" + (x.ticket_scope === 'access' ? " selected" : "") + ">Alleen toegangstickets</option>" +
      "</select></div>" +
      "<div class='field'><label>Toepassen op type-ids (komma-gescheiden, leeg = alle)</label><input type='text' class='dc-applies' value='" + attr(applies) + "' /></div>" +
      "<div class='row'><button class='dc-save'>Opslaan</button>" +
      (isNew ? "" : "<button class='danger dc-del'>Verwijderen</button>") +
      "<button class='ghost dc-close'>Sluiten</button></div>";
    // Eén bewerkpaneel boven de tabel; de lijst zelf blijft een compacte tabel
    var editor = $("dc-editor");
    editor.innerHTML = "";
    editor.appendChild(wrap);
    wrap.scrollIntoView({ behavior: "smooth", block: "nearest" });
    wrap.querySelector(".dc-close").addEventListener("click", function () { editor.innerHTML = ""; });

    var kindEl = wrap.querySelector(".dc-kind");
    var vLabel = wrap.querySelector(".dc-vlabel");
    kindEl.addEventListener("change", function () {
      vLabel.textContent = kindEl.value === "fixed_cents" ? "Bedrag (euro)" : "Percentage";
    });
    function gv(cls) { var el = wrap.querySelector("." + cls); return el ? el.value.trim() : ""; }
    wrap.querySelector(".dc-save").addEventListener("click", function () {
      var code = gv("dc-code");
      if (!code) { toast("Code is verplicht.", "err"); return; }
      var k = kindEl.value;
      var rawV = gv("dc-value");
      var value = k === "fixed_cents" ? euroToCents(rawV) : (parseFloat(rawV.replace(",", ".")) || 0);
      var body = {
        code: code,
        kind: k,
        value: value,
        max_uses: gv("dc-max") === "" ? null : (parseInt(gv("dc-max"), 10) || 0),
        max_tickets: gv("dc-maxtix") === "" ? null : (parseInt(gv("dc-maxtix"), 10) || 0),
        valid_from: gv("dc-from") || null,
        valid_until: gv("dc-until") || null,
        active: wrap.querySelector(".dc-active").checked,
        ticket_scope: (wrap.querySelector(".dc-scope") || {}).value || "all",
        applies_to: splitList(gv("dc-applies"))
      };
      if (!isNew && x.id) body.id = x.id;
      post("/discounts", body, function (ok, r) {
        if (ok && r && r.ok) { toast("Code opgeslagen.", "ok"); editor.innerHTML = ""; loadDiscounts(); }
        else toast("Code opslaan mislukt.", "err");
      });
    });
    var delBtn = wrap.querySelector(".dc-del");
    if (delBtn) delBtn.addEventListener("click", function () {
      if (!confirm("Code '" + x.code + "' verwijderen?")) return;
      del("/discounts?id=" + encodeURIComponent(x.id), function (ok, r) {
        if (ok && r && r.ok) { toast("Code verwijderd.", "ok"); editor.innerHTML = ""; loadDiscounts(); }
        else toast("Verwijderen mislukt.", "err");
      });
    });
  }

  /* ---------- bulk aanmaken (pers/partnercodes) ---------- */
  $("dcb-kind").addEventListener("change", function () {
    $("dcb-vlabel").textContent = $("dcb-kind").value === "fixed_cents" ? "Bedrag (euro)" : "Percentage";
  });
  $("dcb-generate").addEventListener("click", function () {
    var count = parseInt($("dcb-count").value, 10);
    if (!count || count < 1 || count > 500) { toast("Aantal codes moet tussen 1 en 500 liggen.", "err"); return; }
    var prefix = $("dcb-prefix").value.trim();
    if (!prefix) { toast("Prefix is verplicht.", "err"); return; }
    var k = $("dcb-kind").value;
    var rawV = $("dcb-value").value.trim();
    var value = k === "fixed_cents" ? euroToCents(rawV) : (parseFloat(rawV.replace(",", ".")) || 0);
    if (!value) { toast("Vul een waarde in.", "err"); return; }
    var body = {
      count: count,
      prefix: prefix,
      kind: k,
      value: value,
      max_uses: $("dcb-maxuses").value.trim() === "" ? null : (parseInt($("dcb-maxuses").value, 10) || 0),
      max_tickets: $("dcb-maxtickets").value.trim() === "" ? null : (parseInt($("dcb-maxtickets").value, 10) || 0),
      applies_to: splitList($("dcb-applies").value.trim()),
      ticket_scope: ($("dcb-scope") && $("dcb-scope").value) || "all",
      valid_until: $("dcb-until").value || null
    };
    post("/discounts-bulk", body, function (ok, r) {
      if (ok && r && r.ok) {
        var codes = r.codes || [];
        var n = r.created != null ? r.created : codes.length;
        toast(n + " codes aangemaakt", "ok");
        $("dcb-codes").value = codes.join("\n");
        $("dcb-result").style.display = "";
        loadDiscounts();
      } else {
        var msg = r && (r.detail || r.error || r.message) ? String(r.detail || r.error || r.message) : "";
        toast("Bulk aanmaken mislukt." + (msg ? " " + msg : ""), "err");
      }
    });
  });
  $("dcb-copy").addEventListener("click", function () {
    var ta = $("dcb-codes");
    if (!ta.value) { toast("Geen codes om te kopiëren.", "err"); return; }
    function fallbackCopy() {
      ta.focus();
      ta.select();
      try {
        document.execCommand("copy");
        toast("Codes gekopieerd.", "ok");
      } catch (e) {
        toast("Kopiëren mislukt, selecteer de codes handmatig.", "err");
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ta.value).then(
        function () { toast("Codes gekopieerd.", "ok"); },
        fallbackCopy
      );
    } else {
      fallbackCopy();
    }
  });
  $("dcb-csv").addEventListener("click", function () {
    var lines = $("dcb-codes").value.split("\n").filter(function (s) { return s.trim() !== ""; });
    if (!lines.length) { toast("Geen codes om te downloaden.", "err"); return; }
    var csv = "code\n" + lines.join("\n") + "\n";
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "kortingscodes.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });

  /* ============================================================
     8. SETTINGS
  ============================================================ */
  $("se-refresh").addEventListener("click", loadSettings);
  function loadSettings() {
    get("/settings", function (ok, d) {
      if (!ok || !d || !d.settings) { toast("Instellingen laden mislukt.", "err"); return; }
      var s = d.settings;
      $("se-fee").value = centsToEuroInput(s.SERVICE_FEE_CENTS || 0);
      $("se-fee-mode").value = s.SERVICE_FEE_MODE === "ticket" ? "ticket" : "order";
      $("se-txfee").value = centsToEuroInput(s.TRANSACTION_FEE_CENTS || 0);
      $("se-name").value = s.EVENT_NAME || "";
      $("se-edition").value = s.EVENT_EDITION || "";
      $("se-location").value = s.EVENT_LOCATION || "";
      $("se-dates-nl").value = s.EVENT_DATES_NL || "";
      $("se-dates-en").value = s.EVENT_DATES_EN || "";
      $("se-accent").value = normColor(s.TICKET_ACCENT, "#EEB24A");
      $("se-ink").value = normColor(s.TICKET_INK, "#231B13");
      $("se-bg").value = normColor(s.TICKET_BG, "#F4EAD6");
      $("se-note-nl").value = s.TICKET_NOTE_NL || "";
      $("se-note-en").value = s.TICKET_NOTE_EN || "";
      updatePreview();
    });
  }
  function normColor(v, fallback) {
    if (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v.trim())) return v.trim();
    return fallback;
  }
  function updatePreview() {
    var accent = $("se-accent").value, ink = $("se-ink").value, bg = $("se-bg").value;
    var prev = $("tk-prev");
    prev.style.background = bg;
    prev.style.color = ink;
    prev.style.borderColor = accent;
    $("tp-event").textContent = $("se-name").value || "APÉRO Festival";
    $("tp-day").style.background = accent;
    $("tp-day").style.color = bg;
    var qr = $("tp-qr");
    qr.style.background = ink;
    qr.style.color = bg;
    var note = $("se-note-nl").value;
    $("tp-note").textContent = note;
    $("tp-note").style.display = note ? "block" : "none";
  }
  ["se-accent", "se-ink", "se-bg", "se-name", "se-note-nl"].forEach(function (id) {
    $(id).addEventListener("input", updatePreview);
  });

  $("se-save-fee").addEventListener("click", function () {
    post("/settings", {
      SERVICE_FEE_CENTS: String(euroToCents($("se-fee").value)),
      SERVICE_FEE_MODE: $("se-fee-mode").value === "ticket" ? "ticket" : "order",
      TRANSACTION_FEE_CENTS: String(euroToCents($("se-txfee").value))
    }, function (ok, r) {
      if (ok && r && r.ok) toast("Servicekosten opgeslagen.", "ok"); else toast("Opslaan mislukt.", "err");
    });
  });
  $("se-save-event").addEventListener("click", function () {
    post("/settings", {
      EVENT_NAME: $("se-name").value,
      EVENT_EDITION: $("se-edition").value,
      EVENT_LOCATION: $("se-location").value,
      EVENT_DATES_NL: $("se-dates-nl").value,
      EVENT_DATES_EN: $("se-dates-en").value
    }, function (ok, r) {
      if (ok && r && r.ok) toast("Evenement-info opgeslagen.", "ok"); else toast("Opslaan mislukt.", "err");
    });
  });
  $("se-save-ticket").addEventListener("click", function () {
    post("/settings", {
      TICKET_ACCENT: $("se-accent").value,
      TICKET_INK: $("se-ink").value,
      TICKET_BG: $("se-bg").value,
      TICKET_NOTE_NL: $("se-note-nl").value,
      TICKET_NOTE_EN: $("se-note-en").value
    }, function (ok, r) {
      if (ok && r && r.ok) toast("Ticketontwerp opgeslagen.", "ok"); else toast("Opslaan mislukt.", "err");
    });
  });

  /* ---------- backup download (JSON) ---------- */
  $("se-backup").addEventListener("click", function () {
    var btn = $("se-backup");
    var orig = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Bezig...";
    // call() levert een blob terug omdat het pad 'backup' bevat
    get("/backup.json", function (ok, blob) {
      btn.disabled = false;
      btn.textContent = orig;
      if (!ok || !blob) { toast("Backup mislukt.", "err"); return; }
      var stamp = new Date().toISOString().slice(0, 10);
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "apero-backup-" + stamp + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      toast("Backup gedownload.", "ok");
    });
  });

  /* ---------- Herinneringen (niet-afgerekende bestellingen) ---------- */
  $("rm-refresh").addEventListener("click", loadReminders);
  var RM_DEF = {
    nl: {
      sub: "Je tickets voor APÉRO liggen nog klaar",
      head: "Je stoel staat er nog.",
      body: "Je was bijna klaar met je tickets voor APÉRO Festival, maar de betaling werd niet afgerond. Dat kan gebeuren. Als je nog mee wilt, kun je hieronder opnieuw beginnen.",
      hi: "Ha", cta: "Rond je bestelling af", foot: "De naam wordt per ontvanger ingevuld · onderaan komt automatisch een afmeldlink."
    },
    en: {
      sub: "Your APÉRO tickets are still waiting",
      head: "Your seat is still there.",
      body: "You were almost done with your tickets for APÉRO Festival, but the payment did not go through. That happens. If you still want to come, you can start again below.",
      hi: "Hi", cta: "Finish your order", foot: "The name is filled in per recipient · an unsubscribe link is added automatically."
    }
  };
  var RM_PHOTOS = ["photo-01.jpg", "photo-02.jpg", "photo-03.jpg", "photo-04.jpg", "photo-05.jpg", "photo-06.jpg", "photo-07.jpg", "photo-08.jpg"];
  var rmPhoto = "photo-01.jpg";
  function renderPhotos() {
    var host = $("rm-photos"); if (!host) return;
    host.innerHTML = RM_PHOTOS.map(function (p) {
      var on = p === rmPhoto;
      return "<button type='button' class='rm-photo' data-p='" + p + "' style='padding:0; width:78px; height:54px; border-radius:9px; overflow:hidden; cursor:pointer; background:none; border:" + (on ? "3px solid var(--bordeaux)" : "1px solid var(--line)") + "; box-shadow:" + (on ? "0 0 0 2px rgba(196,95,56,.15)" : "none") + ";'>" +
        "<img src='./assets/photos/" + p + "' alt='' style='width:100%; height:100%; object-fit:cover; display:block;' /></button>";
    }).join("");
    qsa(".rm-photo", host).forEach(function (b) {
      b.addEventListener("click", function () { rmPhoto = b.getAttribute("data-p"); renderPhotos(); rmPreview(); });
    });
  }
  function rmPreview() {
    var lang = ($("rm-lang") && $("rm-lang").value === "en") ? "en" : "nl";
    var D = RM_DEF[lang];
    var sub = ($("rm-subject").value || "").trim() || D.sub;
    var head = ($("rm-headline").value || "").trim() || D.head;
    var body = ($("rm-body").value || "").trim() || D.body;
    $("rm-preview").innerHTML =
      "<div style='font-size:12px; color:var(--ink-muted); margin-bottom:8px;'>" + (lang === "en" ? "Subject" : "Onderwerp") + ": <b style='color:var(--ink);'>" + esc(sub) + "</b></div>" +
      "<div style='max-width:440px; border-radius:14px; overflow:hidden; border:1px solid var(--line);'>" +
        "<img src='./assets/photos/" + rmPhoto + "' style='width:100%; height:120px; object-fit:cover; display:block;' alt='' />" +
        "<div style='background:#231B13; color:#F4EAD6; padding:22px;'>" +
          "<div style='font-size:10px; letter-spacing:2px; text-transform:uppercase; color:#EEB24A;'>APÉRO Festival</div>" +
          "<div style='font-family:Fraunces,serif; font-size:20px; margin:6px 0 12px;'>" + esc(head) + " &#127863;</div>" +
          "<div style='font-size:13.5px; line-height:1.5; opacity:.95;'>" + D.hi + " [naam],</div>" +
          "<div style='font-size:13.5px; line-height:1.5; margin:8px 0 16px; opacity:.95;'>" + esc(body) + "</div>" +
          "<span style='display:inline-block; background:#C45F38; color:#F4EAD6; padding:10px 20px; border-radius:9px; font-size:13.5px;'>" + D.cta + "</span>" +
        "</div>" +
      "</div>" +
      "<div style='font-size:11px; color:var(--ink-muted); margin-top:8px;'>" + D.foot + "</div>";
  }
  ["rm-subject", "rm-headline", "rm-body"].forEach(function (id) {
    var el = $(id); if (el) el.addEventListener("input", rmPreview);
  });
  if ($("rm-lang")) $("rm-lang").addEventListener("change", rmPreview);
  renderPhotos();
  var rmList = [];
  function loadReminders() {
    rmPreview();
    $("reminders-list").innerHTML = "<div class='card muted'>Laden…</div>";
    get("/abandoned", function (ok, d) {
      if (!ok || !d) { $("reminders-list").innerHTML = "<div class='card muted'>Laden mislukt.</div>"; return; }
      rmList = d.list || [];
      $("rm-all").checked = false;
      if (!rmList.length) { $("reminders-list").innerHTML = "<div class='card muted'>Iedereen die begon heeft betaald. Niets te herinneren. 🎉</div>"; return; }
      $("reminders-list").innerHTML = rmList.map(function (o) {
        var sent = o.reminder_sent_at ? " <span class='pill' style='color:var(--green); border-color:rgba(30,122,60,.3);'>herinnerd " + dshort(o.reminder_sent_at) + (o.reminder_count > 1 ? " · " + o.reminder_count + "×" : "") + "</span>" : "";
        return "<div class='card' style='margin-bottom:10px;'><label style='display:flex; gap:12px; align-items:flex-start; margin:0; font-weight:400;'>" +
          "<input type='checkbox' class='rm-pick' value='" + attr(o.order_id) + "' style='width:auto; margin-top:3px;' />" +
          "<span style='flex:1; min-width:0;'><span style='font-weight:600; color:var(--navy);'>" + esc(o.buyer_name || "Onbekend") + "</span>" + sent +
          "<br><span class='muted'>" + esc(o.buyer_email) + " &middot; " + euro(o.total_cents) + " &middot; " + dshort(o.created_at) + "</span></span>" +
          "</label></div>";
      }).join("");
    });
  }
  $("rm-all").addEventListener("change", function () {
    var on = $("rm-all").checked;
    qsa(".rm-pick").forEach(function (c) { c.checked = on; });
  });
  $("rm-send").addEventListener("click", function () {
    var ids = qsa(".rm-pick").filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
    if (!ids.length) { toast("Selecteer eerst minstens één persoon.", "err"); return; }
    if (!confirm("Herinneringsmail sturen naar " + ids.length + " " + (ids.length === 1 ? "persoon" : "personen") + "?")) return;
    var btn = $("rm-send"); btn.disabled = true; btn.textContent = "Versturen…";
    post("/remind", { order_ids: ids, lang: ($("rm-lang") && $("rm-lang").value) || "auto", photo: rmPhoto, subject: $("rm-subject").value, headline: $("rm-headline").value, body: $("rm-body").value }, function (ok, r) {
      btn.disabled = false; btn.textContent = "Verstuur naar geselecteerden";
      if (ok && r && r.ok) { toast(r.sent + " van " + r.total + " verstuurd.", "ok"); loadReminders(); }
      else toast("Versturen mislukt.", "err");
    });
  });

  /* ---------- Wachtlijst (vraagmeter per proeverij/tickettype) ---------- */
  var WLAPI = "https://snfojphxsbzfewwfbfka.supabase.co/functions/v1/apero/waitlist";
  function wlFetch(path, opts, cb) {
    opts = opts || {};
    opts.headers = Object.assign({ "x-admin-key": key }, opts.headers || {});
    fetch(WLAPI + path, opts).then(function (res) {
      if (res.status === 401) { localStorage.removeItem("apero-admin"); location.reload(); return; }
      return res.json().then(function (d) { cb(res.ok, d); }).catch(function () { cb(false, null); });
    }).catch(function () { cb(false, null); });
  }
  var wlSummary = [];
  function wlName(id) { for (var i = 0; i < wlSummary.length; i++) if (wlSummary[i].ticket_type_id === id) return wlSummary[i].name_nl; return id; }
  if ($("wl-refresh")) $("wl-refresh").addEventListener("click", loadWaitlist);
  function loadWaitlist() {
    $("wl-summary").innerHTML = "<div class='card muted'>Laden…</div>";
    wlFetch("/admin", {}, function (ok, d) {
      if (!ok || !d) { $("wl-summary").innerHTML = "<div class='card muted'>Laden mislukt.</div>"; return; }
      wlSummary = d.summary || [];
      if (!wlSummary.length) {
        $("wl-summary").innerHTML = "<div class='card muted'>Nog niemand op een wachtlijst. Zodra een tickettype uitverkocht is, kunnen mensen zich in de shop aanmelden en zie je hier per proeverij hoeveel vraag er is.</div>";
        $("wl-notify").style.display = "none";
        return;
      }
      $("wl-summary").innerHTML = "<div class='card'><div class='tablewrap'><table><thead><tr>" +
        "<th>Tickettype</th><th class='num'>Mensen</th><th class='num'>Plekken gevraagd</th><th class='num'>Nog te mailen</th><th class='num'>Gemaild</th><th>Laatste aanmelding</th>" +
        "</tr></thead><tbody>" +
        wlSummary.map(function (s) {
          var hot = s.seats >= 10;
          return "<tr><td><b style='color:var(--navy);'>" + esc(s.name_nl) + "</b>" +
            (s.sale_state === "sold_out" ? " <span class='pill' style='color:var(--red); border-color:rgba(179,55,46,.3);'>uitverkocht</span>" : "") + "</td>" +
            "<td class='num'>" + s.people + "</td>" +
            "<td class='num'" + (hot ? " style='color:var(--bordeaux); font-weight:700;'" : "") + ">" + s.seats + "</td>" +
            "<td class='num'>" + s.waiting + "</td><td class='num'>" + s.notified + "</td>" +
            "<td>" + dshort(s.last_signup) + "</td></tr>";
        }).join("") +
        "</tbody></table></div><p class='muted' style='margin-top:10px;'>Veel plekken gevraagd bij een uitverkocht type? Dan loont het om capaciteit bij te zetten. De wachtlijst is meteen je eerste groep kopers.</p></div>";
      // selectievak voor mailen vullen
      var sel = $("wl-type");
      sel.innerHTML = wlSummary.map(function (s) {
        return "<option value='" + attr(s.ticket_type_id) + "'>" + esc(s.name_nl) + " (" + s.waiting + " te mailen)</option>";
      }).join("");
      $("wl-notify").style.display = "";
    });
  }
  if ($("wl-send")) $("wl-send").addEventListener("click", function () {
    var typeId = $("wl-type").value;
    if (!typeId) { toast("Kies eerst een tickettype.", "err"); return; }
    var only = $("wl-onlywaiting").checked;
    var sumRow = null; for (var i = 0; i < wlSummary.length; i++) if (wlSummary[i].ticket_type_id === typeId) sumRow = wlSummary[i];
    var n = sumRow ? (only ? sumRow.waiting : sumRow.people) : 0;
    if (!n) { toast("Niemand om te mailen voor deze keuze.", "err"); return; }
    if (!confirm("Wachtlijstmail sturen naar " + n + " " + (n === 1 ? "persoon" : "personen") + " voor \"" + wlName(typeId) + "\"?")) return;
    var btn = $("wl-send"); btn.disabled = true; btn.textContent = "Versturen…";
    wlFetch("/notify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type_id: typeId, only_waiting: only, lang: ($("wl-lang") && $("wl-lang").value) || "auto",
        subject: $("wl-subject").value, headline: $("wl-headline").value, body: $("wl-body").value
      })
    }, function (ok, r) {
      btn.disabled = false; btn.textContent = "Mail de wachtlijst";
      if (ok && r && r.ok) { toast(r.sent + " van " + r.total + " gemaild.", "ok"); loadWaitlist(); }
      else toast("Versturen mislukt.", "err");
    });
  });


/* ============================================================
   SCANNERS: losse sleutel per deur/toestel voor /scan
   Losse functie i.p.v. een route in de admin-edge-function, zelfde reden als
   ticket-fields/waitlist: de admin-functie is te groot om veilig te
   herdeployen zonder de Supabase CLI. De sleutel zelf komt maar EENMALIG
   terug (bij aanmaken); daarna is alleen de hash bekend, ook aan de server.
============================================================ */
  var SKAPI = "https://snfojphxsbzfewwfbfka.supabase.co/functions/v1/scanner-keys";
  // APÉRO kent alleen persoonlijke scanlogins; de oude NvdW-toestelsleutels bestaan hier niet.
  function skFetch(path, opts, cb) { cb(true, { keys: [] }); return;
    opts = opts || {};
    opts.headers = Object.assign({ "x-admin-key": key }, opts.headers || {});
    fetch(SKAPI + path, opts).then(function (res) {
      if (res.status === 401) { localStorage.removeItem("apero-admin"); location.reload(); return; }
      return res.json().then(function (d) { cb(res.ok, d); }).catch(function () { cb(false, null); });
    }).catch(function () { cb(false, null); });
  }
  function loadScanners() {
    loadScanUsers();
    $("sk-list").innerHTML = "<div class='card muted'>Laden…</div>";
    skFetch("", {}, function (ok, d) {
      if (!ok || !d) { $("sk-list").innerHTML = "<div class='card muted'>Laden mislukt.</div>"; return; }
      var rows = d.keys || [];
      if (!rows.length) {
        $("sk-list").innerHTML = "<div class='card muted'>Nog geen losse scanner-sleutels aangemaakt. Het toestel aan de deur werkt intussen gewoon door met de oude gedeelde sleutel.</div>";
        return;
      }
      $("sk-list").innerHTML = "<div class='card'><div class='tablewrap'><table><thead><tr>" +
        "<th>Naam</th><th>Aangemaakt</th><th>Laatst gebruikt</th><th>Status</th><th></th>" +
        "</tr></thead><tbody>" +
        rows.map(function (r) {
          var actief = !r.revoked_at;
          return "<tr><td><b style='color:var(--navy);'>" + esc(r.label) + "</b></td>" +
            "<td>" + dt(r.created_at) + "</td>" +
            "<td>" + (r.last_used_at ? dt(r.last_used_at) : "<span class='muted'>nog niet gebruikt</span>") + "</td>" +
            "<td><span class='pill' style='" + (actief ? "color:var(--green); border-color:rgba(30,122,60,.3);" : "color:var(--ink-muted);") + "'>" + (actief ? "actief" : "ingetrokken") + "</span></td>" +
            "<td>" + (actief ? "<button class='ghost sm sk-revoke' data-id='" + attr(r.id) + "' data-label='" + attr(r.label) + "'>Intrekken</button>" : "") + "</td></tr>";
        }).join("") +
        "</tbody></table></div></div>";
      qsa(".sk-revoke", $("sk-list")).forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (!confirm("Sleutel \"" + btn.getAttribute("data-label") + "\" intrekken? Het toestel dat 'm gebruikt kan dan niet meer scannen.")) return;
          skFetch("?action=revoke", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: btn.getAttribute("data-id") })
          }, function (ok2) {
            if (ok2) { toast("Sleutel ingetrokken.", "ok"); loadScanners(); }
            else toast("Intrekken mislukt.", "err");
          });
        });
      });
    });
  }
  if ($("sk-refresh")) $("sk-refresh").addEventListener("click", loadScanners);
  if ($("sk-create")) $("sk-create").addEventListener("click", function () {
    var label = ($("sk-label").value || "").trim();
    if (!label) { toast("Geef het toestel eerst een naam.", "err"); return; }
    var btn = $("sk-create"); btn.disabled = true; btn.textContent = "Aanmaken…";
    skFetch("?action=create", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label })
    }, function (ok, r) {
      btn.disabled = false; btn.textContent = "Sleutel aanmaken";
      if (ok && r && r.key) {
        $("sk-label").value = "";
        $("sk-newkey-value").textContent = r.key;
        $("sk-newkey").style.display = "";
        toast("Sleutel aangemaakt voor \"" + label + "\".", "ok");
        loadScanners();
      } else {
        toast("Aanmaken mislukt.", "err");
      }
    });
  });
  /* ---------- Scanpersonen: eigen login per persoon voor /scanner ---------- */
  var SUAPI = "https://snfojphxsbzfewwfbfka.supabase.co/functions/v1/apero/scan";
  var SU_CATS = [["entree", "Entree"], ["tafel", "Tafels"], ["workshop", "Masterclasses"]];
  var SU_DAYS = [["thu", "Donderdag"], ["fri", "Vrijdag"], ["sat", "Zaterdag"], ["sun", "Zondag"]];
  function suFetch(action, body, cb) {
    var opts = { headers: { "x-admin-key": key } };
    if (body) { opts.method = "POST"; opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
    fetch(SUAPI + "?action=" + action, opts).then(function (res) {
      if (res.status === 401) { localStorage.removeItem("apero-admin"); location.reload(); return; }
      return res.json().then(function (d) { cb(res.ok, d); }).catch(function () { cb(false, null); });
    }).catch(function () { cb(false, null); });
  }
  function suChecks(list, selected, name) {
    return list.map(function (o) {
      return "<label><input type='checkbox' data-k='" + name + "' value='" + o[0] + "'" + (selected.indexOf(o[0]) >= 0 ? " checked" : "") + " /> " + o[1] + "</label>";
    }).join("");
  }
  function suPicked(root, name) {
    return qsa("input[data-k='" + name + "']:checked", root).map(function (i) { return i.value; });
  }
  function suShowPin(name, login, pin) {
    var txt = "Hoi " + name + ", zo log je in op de scan-app van APÉRO Festival:\n" +
      "Open: https://www.apero-culture.com/scanner.html\nLoginnaam: " + login + "\nPincode: " + pin;
    $("su-newpin-txt").innerHTML = esc(txt).replace(/\n/g, "<br>");
    $("su-newpin").setAttribute("data-txt", txt);
    $("su-newpin").style.display = "";
    $("su-newpin").scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function suLabels(list, vals) {
    return list.filter(function (o) { return vals.indexOf(o[0]) >= 0; }).map(function (o) { return o[1]; }).join(", ");
  }
  if ($("su-cats-new")) {
    $("su-cats-new").innerHTML = suChecks(SU_CATS, ["entree"], "cat");
    $("su-days-new").innerHTML = suChecks(SU_DAYS, ["thu", "fri", "sat", "sun"], "day");
  }
  function loadScanUsers() {
    if (!$("su-list")) return;
    $("su-list").innerHTML = "<div class='card muted'>Laden…</div>";
    suFetch("users", null, function (ok, d) {
      if (!ok || !d) { $("su-list").innerHTML = "<div class='card muted'>Laden mislukt.</div>"; return; }
      $("su-testday").value = d.test_day || "";
      $("su-modus").textContent = !d.test
        ? "Het is nu een festivaldag: alle scans zijn echt en strepen tickets af."
        : (d.test_day
          ? "Testmodus staat aan: de app doet alsof het " + ({ thu: "donderdag", fri: "vrijdag", sat: "zaterdag", sun: "zondag" })[d.test_day] + " is. Testscans raken de echte tickets van bezoekers niet, op 6, 7 en 8 november gaat alles vanzelf echt."
          : "Testmodus staat uit: buiten de festivaldagen kan er niet gescand worden. Kies een dag om te testen.");
      var rows = d.users || [];
      if (!rows.length) { $("su-list").innerHTML = "<div class='card muted'>Nog niemand aangemaakt.</div>"; return; }
      $("su-list").innerHTML = "<div class='card'><div class='tablewrap'><table><thead><tr>" +
        "<th>Naam</th><th>Mag scannen</th><th>Dagen</th><th>Scans</th><th>Laatst actief</th><th>Status</th><th></th>" +
        "</tr></thead><tbody>" +
        rows.map(function (u) {
          var status = !u.active ? "<span class='pill' style='color:var(--ink-muted);'>uit</span>"
            : (u.locked ? "<span class='pill' style='color:var(--red,#a3271f);'>geblokkeerd</span>"
              : "<span class='pill' style='color:var(--green); border-color:rgba(30,122,60,.3);'>aan</span>");
          return "<tr data-id='" + attr(u.id) + "'><td><b style='color:var(--navy);'>" + esc(u.name) + "</b><div class='muted'>login: " + esc(u.login) + "</div></td>" +
            "<td><div class='su-checks'>" + suChecks(SU_CATS, u.categories, "cat") + "</div></td>" +
            "<td><div class='su-checks'>" + suChecks(SU_DAYS, u.days, "day") + "</div></td>" +
            "<td>" + u.scans.ok + " goed<div class='muted'>" + u.scans.bad + " afgewezen</div></td>" +
            "<td>" + (u.last_used_at ? dt(u.last_used_at) : "<span class='muted'>nog niet</span>") + "</td>" +
            "<td>" + status + "</td>" +
            "<td style='white-space:nowrap;'><button class='ghost sm su-toggle'>" + (u.active ? "Uitzetten" : "Aanzetten") + "</button> " +
            "<button class='ghost sm su-pin'>Nieuwe pincode</button> <button class='ghost sm su-del'>Verwijderen</button></td></tr>";
        }).join("") + "</tbody></table></div><div class='muted' style='margin-top:6px;'>Vinkjes aanpassen wordt direct opgeslagen.</div></div>";

      qsa("tr[data-id]", $("su-list")).forEach(function (tr) {
        var id = tr.getAttribute("data-id");
        var u = rows.filter(function (r) { return r.id === id; })[0];
        qsa("input[type=checkbox]", tr).forEach(function (cb) {
          cb.addEventListener("change", function () {
            var cats = suPicked(tr, "cat"), days = suPicked(tr, "day");
            if (!cats.length || !days.length) { cb.checked = true; toast("Minstens één soort en één dag aanvinken.", "err"); return; }
            suFetch("update", { id: id, categories: cats, days: days }, function (ok2) {
              toast(ok2 ? "Opgeslagen." : "Opslaan mislukt.", ok2 ? "ok" : "err");
            });
          });
        });
        tr.querySelector(".su-toggle").addEventListener("click", function () {
          suFetch("update", { id: id, active: !u.active }, function (ok2) {
            if (ok2) { toast(u.active ? u.name + " staat uit." : u.name + " staat aan.", "ok"); loadScanUsers(); } else toast("Mislukt.", "err");
          });
        });
        tr.querySelector(".su-pin").addEventListener("click", function () {
          if (!confirm("Nieuwe pincode maken voor " + u.name + "? De oude werkt dan niet meer.")) return;
          suFetch("reset_pin", { id: id }, function (ok2, r) {
            if (ok2 && r && r.pin) { suShowPin(u.name, u.login, r.pin); loadScanUsers(); } else toast("Mislukt.", "err");
          });
        });
        tr.querySelector(".su-del").addEventListener("click", function () {
          if (!confirm(u.name + " verwijderen?")) return;
          suFetch("delete", { id: id }, function (ok2) { if (ok2) { toast("Verwijderd.", "ok"); loadScanUsers(); } else toast("Mislukt.", "err"); });
        });
      });
    });
  }
  if ($("su-create")) $("su-create").addEventListener("click", function () {
    var name = ($("su-name").value || "").trim();
    var cats = suPicked($("su-cats-new"), "cat"), days = suPicked($("su-days-new"), "day");
    if (!name) { toast("Vul een naam in.", "err"); return; }
    if (!cats.length || !days.length) { toast("Kies minstens één soort en één dag.", "err"); return; }
    var btn = $("su-create"); btn.disabled = true;
    suFetch("create", { name: name, login: ($("su-login").value || "").trim(), categories: cats, days: days }, function (ok, r) {
      btn.disabled = false;
      if (ok && r && r.pin) {
        $("su-name").value = ""; $("su-login").value = "";
        suShowPin(r.name, r.login, r.pin);
        loadScanUsers();
      } else toast(r && r.error === "login_bestaat" ? "Die loginnaam bestaat al, kies een andere." : "Aanmaken mislukt.", "err");
    });
  });
  if ($("su-copy")) $("su-copy").addEventListener("click", function () {
    var v = $("su-newpin").getAttribute("data-txt") || "";
    if (navigator.clipboard) navigator.clipboard.writeText(v).then(function () { toast("Gekopieerd.", "ok"); });
  });
  if ($("su-testday")) $("su-testday").addEventListener("change", function () {
    suFetch("test_day", { day: $("su-testday").value }, function (ok) {
      toast(ok ? "Testmodus bijgewerkt." : "Mislukt.", ok ? "ok" : "err"); loadScanUsers();
    });
  });
  if ($("su-cleartest")) $("su-cleartest").addEventListener("click", function () {
    if (!confirm("Alle testscans wissen? Echte scans blijven staan.")) return;
    suFetch("clear_test", {}, function (ok) { toast(ok ? "Testscans gewist." : "Mislukt.", ok ? "ok" : "err"); loadScanUsers(); });
  });

  if ($("sk-copy")) $("sk-copy").addEventListener("click", function () {
    var v = $("sk-newkey-value") ? $("sk-newkey-value").textContent : "";
    if (!v) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(v).then(function () { toast("Gekopieerd.", "ok"); }).catch(function () {});
    }
  });


/* ============================================================
   NIEUWSBRIEF: wat is er verstuurd en hoe is het gelezen
============================================================ */
  var NBAPI = "https://snfojphxsbzfewwfbfka.supabase.co/functions/v1/newsletter";
  function nbFetch(path, opts, cb) {
    opts = opts || {};
    opts.headers = Object.assign({ "x-admin-key": key }, opts.headers || {});
    fetch(NBAPI + path, opts).then(function (res) {
      if (res.status === 401) { localStorage.removeItem("apero-admin"); location.reload(); return; }
      return res.json().then(function (d) { cb(res.ok, d); }).catch(function () { cb(false, null); });
    }).catch(function () { cb(false, null); });
  }
  function pct(deel, totaal) {
    if (!totaal) return "–";
    return Math.round((deel / totaal) * 1000) / 10 + "%";
  }
  function nbBalk(deel, totaal, kleur) {
    var p = totaal ? Math.min(100, Math.round((deel / totaal) * 100)) : 0;
    return "<div style='height:6px;background:var(--line2);border-radius:99px;overflow:hidden;margin-top:5px;'>" +
      "<div style='height:100%;width:" + p + "%;background:" + kleur + ";border-radius:99px;'></div></div>";
  }

  function loadNieuwsbrief() {
    var host = $("nb-list");
    if (!host) return;
    loadAfmeldingen();
    host.innerHTML = "<div class='hint'>Laden…</div>";
    nbFetch("/broadcasts", {}, function (ok, d) {
      if (!ok || !d) { host.innerHTML = "<div class='hint'>Laden mislukt. Staat je beheersleutel nog goed?</div>"; return; }
      var lijst = (d.broadcasts || []).filter(function (b) { return b.status === "sent"; });
      if (!lijst.length) {
        $("nb-kpis").innerHTML = "";
        host.innerHTML = "<div class='hint'>Er is nog niets verstuurd.</div>";
        return;
      }
      // KPI's over de meest recente mailing
      var l = lijst[0];
      var afgeleverd = Number(l.delivered || 0), publiek = Number(l.audience_size || 0);
      var basis = afgeleverd || publiek;
      $("nb-kpis").innerHTML =
        "<div class='kpi'><b>" + (publiek || "–") + "</b><span>verstuurd, laatste mailing</span></div>" +
        "<div class='kpi'><b>" + pct(l.opened, basis) + "</b><span>geopend</span></div>" +
        "<div class='kpi'><b class='gold'>" + pct(l.clicked, basis) + "</b><span>doorgeklikt</span></div>" +
        "<div class='kpi'><b>" + (Number(l.unsubscribed || 0)) + "</b><span>afmeldingen</span></div>" +
        "<div class='kpi'><b>" + (Number(l.orders_klik || 0)) + "</b><span>aankopen via de mail</span></div>" +
        "<div class='kpi'><b class='gold'>" + euro(Number(l.omzet_klik_cents || 0)) + "</b><span>netto omzet via de mail</span></div>";

      host.innerHTML = "<div class='tablewrap'><table><thead><tr>" +
        "<th>Onderwerp</th><th>Verstuurd op</th><th class='num'>Bereik</th>" +
        "<th class='num'>Afgeleverd</th><th class='num'>Geopend</th><th class='num'>Geklikt</th>" +
        "<th class='num'>Bounces</th><th class='num'>Afgemeld</th>" +
        "<th class='num'>Aankopen</th><th class='num'>Netto omzet</th><th></th></tr></thead><tbody>" +
        lijst.map(function (b) {
          var afg = Number(b.delivered || 0), pub = Number(b.audience_size || 0);
          var bas = afg || pub;
          return "<tr>" +
            "<td><b>" + esc(b.subject || "(zonder onderwerp)") + "</b>" +
              (b.preheader ? "<div class='oitems'><span class='oi'>" + esc(b.preheader) + "</span></div>" : "") + "</td>" +
            "<td>" + (b.sent_at ? dshort(b.sent_at) : "–") + "</td>" +
            "<td class='num'>" + (pub || "–") + "</td>" +
            "<td class='num'>" + (afg || "–") + "</td>" +
            "<td class='num'>" + pct(b.opened, bas) + nbBalk(b.opened, bas, "var(--navy)") +
              "<div class='sub' style='font-size:11px;'>" + Number(b.opened || 0) + "</div></td>" +
            "<td class='num'>" + pct(b.clicked, bas) + nbBalk(b.clicked, bas, "var(--bordeaux)") +
              "<div class='sub' style='font-size:11px;'>" + Number(b.clicked || 0) + "</div></td>" +
            "<td class='num'>" + (Number(b.bounced || 0) || "–") + "</td>" +
            "<td class='num'>" + (Number(b.unsubscribed || 0) || "–") + "</td>" +
            "<td class='num'>" + (Number(b.orders_klik || 0) || "–") +
              (Number(b.orders_venster || 0) > Number(b.orders_klik || 0)
                ? "<div class='sub' style='font-size:11px;'>" + Number(b.orders_venster || 0) + " in venster</div>" : "") + "</td>" +
            "<td class='num'>" + (Number(b.omzet_klik_cents || 0) ? euro(Number(b.omzet_klik_cents)) : "–") +
              (Number(b.omzet_venster_cents || 0) > Number(b.omzet_klik_cents || 0)
                ? "<div class='sub' style='font-size:11px;'>" + euro(Number(b.omzet_venster_cents)) + " in venster</div>" : "") + "</td>" +
            "<td><a class='ghost sm' style='display:inline-block;padding:7px 12px;border-radius:9px;border:1px solid #d9d2c0;text-decoration:none;color:var(--ink);' target='_blank' rel='noopener' href='" +
              attr(NBAPI + "/view?b=" + b.id) + "'>lezen</a></td>" +
          "</tr>";
        }).join("") + "</tbody></table></div>";

      // waarschuwing als tracking nog uitstaat
      var geenOpens = lijst.every(function (b) { return !Number(b.opened || 0); });
      if (geenOpens) {
        host.innerHTML += "<div class='hint' style='margin-top:12px;color:var(--amber);'>" +
          "Er zijn nog geen opens of kliks geregistreerd. Waarschijnlijk staat open en kliktracking bij Resend nog uit; " +
          "vanaf de eerstvolgende mailing wordt het dan wel gemeten.</div>";
      }
    });
  }

  /* ---- afmeldingen: wie schreef zich uit, en na welke mailing ---- */
  function loadAfmeldingen() {
    var host = $("nb-unsubs");
    if (!host) return;
    host.innerHTML = "<div class='hint'>Laden…</div>";
    nbFetch("/unsubscribes?limit=500", {}, function (ok, d) {
      if (!ok || !d) { host.innerHTML = "<div class='hint'>Laden mislukt.</div>"; return; }
      var lijst = d.afmeldingen || [];
      if (!lijst.length) { host.innerHTML = "<div class='hint'>Nog niemand afgemeld.</div>"; return; }
      var recent = lijst.filter(function (r) {
        return r.unsubscribed_at && (Date.now() - Date.parse(r.unsubscribed_at)) < 7 * 864e5;
      }).length;
      host.innerHTML =
        "<div class='hint' style='margin-bottom:10px;'><b>" + lijst.length + "</b> afmeldingen in beeld" +
          (recent ? ", waarvan <b>" + recent + "</b> in de afgelopen zeven dagen" : "") + ".</div>" +
        "<div class='tablewrap'><table><thead><tr>" +
        "<th>E-mailadres</th><th>Naam</th><th>Afgemeld op</th><th>Na welke mailing</th><th>Bron</th>" +
        "</tr></thead><tbody>" +
        lijst.map(function (r) {
          var vers = r.unsubscribed_at && (Date.now() - Date.parse(r.unsubscribed_at)) < 7 * 864e5;
          return "<tr" + (vers ? " style='background:rgba(196,95,56,.05);'" : "") + ">" +
            "<td>" + esc(r.email) + "</td>" +
            "<td>" + esc(r.first_name || "–") + "</td>" +
            "<td>" + (r.unsubscribed_at ? dshort(r.unsubscribed_at) : "–") + "</td>" +
            "<td>" + esc(r.na_mailing || "–") + "</td>" +
            "<td>" + esc(r.source || "–") + "</td></tr>";
        }).join("") + "</tbody></table></div>";
    });
  }
  if ($("nb-unsub-csv")) $("nb-unsub-csv").addEventListener("click", function () {
    nbFetchBlob("/unsubscribes?limit=5000&format=csv", function (ok, blob) {
      if (!ok || !blob) { toast("Download mislukt.", "err"); return; }
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "afmeldingen.csv";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
  });
  function nbFetchBlob(path, cb) {
    fetch(NBAPI + path, { headers: { "x-admin-key": key } })
      .then(function (r) { if (!r.ok) { cb(false, null); return; } return r.blob().then(function (b) { cb(true, b); }); })
      .catch(function () { cb(false, null); });
  }

  if ($("nb-refresh")) $("nb-refresh").addEventListener("click", function () { loadNieuwsbrief(); loadAfmeldingen(); });

})();
