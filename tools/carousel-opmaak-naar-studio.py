"""Zet opmaak per slide, sjabloon wisselen, bewaarde carousels, vier extra sjablonen en twee extra
kleuren in de carousel-generator. Slaat over wat er al in zit.
Gebruik: python3 patch_carousel.py <pad naar generator.html>
Werkt op zowel tools/apero-carousel-generator.html (site-repo) als public/tools/carousel/index.html (Studio)."""
import sys

pad = sys.argv[1]
s = open(pad, encoding="utf8").read()
DEEL1 = "OPMAAK PER SLIDE" not in s      # opmaak per slide, sjabloon wisselen, bewaren
DEEL2 = "EXTRA SJABLONEN" not in s       # vier extra sjablonen en twee extra kleuren
if not (DEEL1 or DEEL2):
    sys.exit("Deze generator heeft de wijziging al.")
actief = DEEL1


def vervang(oud, nieuw, aantal=1):
    global s
    if not actief:
        return
    if s.count(oud) != aantal:
        sys.exit("Anker niet gevonden (%d keer): %s" % (s.count(oud), oud[:70]))
    s = s.replace(oud, nieuw)


# 1 · CSS voor de bewaarlijst
vervang("  .ai-hint.err{color:var(--mattone);font-weight:600}\n",
        "  .ai-hint.err{color:var(--mattone);font-weight:600}\n"
        "  .bewaard{display:flex;flex-direction:column;gap:6px;margin-top:12px}\n"
        "  .bewaard .rij{display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:8px;padding:7px 10px;background:#fff;font-size:13px}\n"
        "  .bewaard .rij b{flex:1;font-weight:600;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n"
        "  .bewaard .rij small{color:var(--ink-50);white-space:nowrap}\n"
        "  .pil{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;border-radius:100px;padding:3px 8px;background:var(--panna-2);color:var(--ink-70)}\n"
        "  .pil.def{background:var(--salvia);color:var(--panna)}\n"
        "  .opmaak{border-top:1px solid var(--line);margin-top:16px;padding-top:6px}\n")

# 2 · paneel: bewaarde carousels, direct onder de carousel-instellingen
vervang('    <fieldset id="aiWrap">\n',
        '    <fieldset id="bewaarWrap">\n'
        '      <legend>Bewaren</legend>\n'
        '      <div class="row" style="align-items:end">\n'
        '        <div>\n'
        '          <label>Status</label>\n'
        '          <select id="bewaarStatus"><option value="concept">Concept</option><option value="definitief">Definitief</option></select>\n'
        '        </div>\n'
        '        <div style="flex:2"><button class="btnui full" id="bewaarKnop" style="margin-top:0">Bewaar carousel</button></div>\n'
        '      </div>\n'
        '      <div class="hint">Bewaart onder de set-naam, in deze browser. Dezelfde naam overschrijft de vorige versie.</div>\n'
        '      <div class="bewaard" id="bewaardLijst"></div>\n'
        '      <div class="row" style="margin-top:8px">\n'
        '        <button class="btnui ghost" id="bewaarExport" style="font-size:11px;padding:9px 10px">Download als bestand</button>\n'
        '        <button class="btnui ghost" id="bewaarImport" style="font-size:11px;padding:9px 10px">Open bestand</button>\n'
        '      </div>\n'
        '      <input type="file" id="bewaarBestand" accept="application/json,.json" hidden>\n'
        '    </fieldset>\n\n'
        '    <fieldset id="aiWrap">\n')

# 3 · buildNode: achtergrond en opmaak per slide
vervang('''    else if((d.type==="cover" && d.achtergrond!=="fresco")){ bg = SCHEME_BG[state.scheme]; }
    else { bg = "var(--panna)"; }
''', '''    else if((d.type==="cover" && d.achtergrond!=="fresco")){ bg = SCHEME_BG[state.scheme]; }
    else { bg = "var(--panna)"; }
    /* OPMAAK PER SLIDE: d.bg (kleur of fresco), d.uitlijn, d.positie, d.grootte, d.patroon.
       Ontbreekt een veld, dan blijft het sjabloon zoals het was. */
    var eigenBg = d.type!=="citaat" ? d.bg : null;
    if(eigenBg==="fresco" && d.type==="cover" && d.achtergrond==="fresco") eigenBg = null;   // beeld staat al in de boog
    if(eigenBg && SCHEME_BG[eigenBg]){ bg = SCHEME_BG[eigenBg]; }
    var eigenDonker = !!(eigenBg && SCHEME_ON_DARK[eigenBg]);
''')
vervang('''    node.innerHTML = RENDER[d.type](d,idx,total);
''', '''    node.innerHTML = RENDER[d.type](d,idx,total);
    opmaak(node,d,eigenBg,eigenDonker);
''')
vervang('''  /* ------------------------------------------------------------
     AUTO-FIT''', '''  var GROOTTE = {klein:.84, groot:1.16};
  function opmaak(node,d,eigenBg,donker){
    if(eigenBg){
      node.querySelectorAll(".veil").forEach(function(el){ el.remove(); });   // de crème sluier hoort bij crème
      if(eigenBg==="fresco"){
        node.insertAdjacentHTML("afterbegin",'<div class="fresco" style="background-image:url(\\''+esc(d.beeldUrl||DEFAULT_IMG)+'\\')"></div><div class="wash strong"></div>');
        node.querySelectorAll(".petals").forEach(function(el){ el.remove(); });
      }
    }
    if(donker){
      // tekst naar crème, accenten naar burro; binnen een cartouche of boog blijft alles zoals het is
      node.querySelectorAll("[style]").forEach(function(el){
        if(el.closest(".cartouche,.arch")) return;
        var st = el.getAttribute("style")||"";
        if(/color:var\\(--(espresso|ink-70)\\)/.test(st)) el.style.color = "var(--panna)";
        else if(/color:var\\(--ink-50\\)/.test(st)) el.style.color = "rgba(244,234,214,.7)";
        else if(/color:var\\(--mattone\\)/.test(st)) el.style.color = "var(--burro)";
        if(/solid var\\(--line\\)/.test(st)) el.style.borderBottomColor = "rgba(244,234,214,.28)";
      });
      node.querySelectorAll(".eyebrow").forEach(function(el){ if(!el.closest(".cartouche,.arch")) el.style.color = "var(--burro)"; });
      node.querySelectorAll(".lockup").forEach(function(el){ el.style.color = "var(--panna)"; });
      node.querySelectorAll(".lockup .flower").forEach(function(el){ el.classList.add("cream"); el.style.setProperty("--hole", SCHEME_BG[eigenBg]); });
    }
    if(d.patroon==="uit"){ node.querySelectorAll(".petals").forEach(function(el){ el.remove(); }); }
    var box = node.querySelector("[data-fitbox]");
    if(box){
      if(d.uitlijn==="midden"){ box.style.alignItems="center"; box.style.textAlign="center"; }
      if(d.uitlijn==="links"){ box.style.alignItems="flex-start"; box.style.textAlign="left"; }
      if(d.positie){ box.style.justifyContent = {boven:"flex-start",midden:"center",onder:"flex-end"}[d.positie]; }
      var k = GROOTTE[d.grootte];
      if(k){ box.querySelectorAll("[style*='font-size']").forEach(function(el){
        var px = parseFloat(el.style.fontSize); if(px) el.style.fontSize = Math.round(px*k)+"px";
      }); }
    }
  }

  /* Sjabloon wisselen: de tekst van de slide gaat mee naar het nieuwe sjabloon. */
  function wisselSjabloon(d,type){
    // wat het vorige sjabloon niet kon tonen, onthouden we (_kort/_lang) zodat heen en terug niets kost
    var kort = {cover:d.titel, verhaal:d.kop, beeld:d.onderschrift, lijst:d.kop, slot:d.payoff}[d.type] || d._kort || "";
    var lang = {verhaal:d.body, citaat:d.quote, lijst:(d.items||[]).join("\\n")}[d.type] || d._lang || "";
    var n = blank(type);
    if(kort) n._kort = kort;
    if(lang) n._lang = lang;
    if(type==="cover"){ if(kort||lang) n.titel = kort||lang; if(d.kicker) n.kicker = d.kicker; }
    if(type==="verhaal"){ if(kort||lang){ n.kop = kort; n.body = lang.replace(/\\n/g," "); } }
    if(type==="citaat"){ if(lang||kort) n.quote = lang||kort; }
    if(type==="beeld"){ n.onderschrift = kort; }
    if(type==="lijst"){
      if(kort) n.kop = kort;
      var regels = lang.indexOf("\\n")>-1 ? lang.split("\\n") : lang.split(/(?<=[.!?])\\s+/);
      regels = regels.map(function(x){ return x.trim(); }).filter(Boolean);
      if(regels.length) n.items = regels.slice(0,5);
    }
    if(type==="slot"){ if(kort||lang) n.payoff = kort||lang; if(d.handle) n.handle = d.handle; }
    ["beeldUrl","bg","uitlijn","positie","grootte","patroon"].forEach(function(k){ if(d[k]) n[k] = d[k]; });
    return n;
  }

  /* ------------------------------------------------------------
     AUTO-FIT''')

# 4 · editor: sjabloonkeuze bovenaan, achtergrond en opmaak onderaan
vervang('''    switch(d.type){
      case "cover":
        h += fld("Kicker''', '''    function kies(label,key,opties){
      return '<div><label>'+label+'</label><select data-k="'+key+'" data-opmaak="1">'+opties.map(function(o){
        return '<option value="'+o[0]+'"'+((d[key]||"")===o[0]?" selected":"")+'>'+o[1]+'</option>'; }).join("")+'</select></div>';
    }
    h += '<label>Sjabloon</label><select data-sjabloon="1">'
      + [["cover","Cover · de haak"],["verhaal","Verhaal · tekst"],["citaat","Citaat · cartouche"],["beeld","Beeld · fresco"],["lijst","Lijst · line-up"],["slot","Slot · CTA"]]
        .map(function(o){ return '<option value="'+o[0]+'"'+(d.type===o[0]?" selected":"")+'>'+o[1]+'</option>'; }).join("")
      + '</select><div class="hint">Wissel van sjabloon en houd je tekst.</div>';
    switch(d.type){
      case "cover":
        h += fld("Kicker''')
vervang('''    editor.innerHTML = h;
    bindEditor();''', '''    h += '<div class="opmaak">';
    if(d.type!=="citaat"){
      h += kies("Achtergrond van deze slide","bg",[["","Standaard"],["creme","Crème"],["terracotta","Terracotta"],["salvia","Salie"],["espresso","Espresso"],["fresco","Fresco, beeldvullend"]]);
      if(d.bg==="fresco" && !(d.type==="cover" && d.achtergrond==="fresco") && d.type!=="beeld"){ h += '<label>Fresco</label>'+imgSelect("beeldUrl",d.beeldUrl); }
    }
    if(d.type!=="beeld"){
      h += '<div class="row">'+kies("Uitlijnen","uitlijn",[["","Standaard"],["links","Links"],["midden","Midden"]])
        + kies("Plek van de tekst","positie",[["","Standaard"],["boven","Boven"],["midden","Midden"],["onder","Onder"]])+'</div>';
      h += '<div class="row">'+kies("Tekstgrootte","grootte",[["","Normaal"],["klein","Kleiner"],["groot","Groter"]])
        + kies("Bloempatroon","patroon",[["","Aan"],["uit","Uit"]])+'</div>';
    }
    h += '</div>';
    editor.innerHTML = h;
    var sj = editor.querySelector("[data-sjabloon]");
    sj.addEventListener("change",function(){ state.slides[state.active] = wisselSjabloon(state.slides[state.active], sj.value); renderAll(); });
    bindEditor();''')
vervang('''        else { d[k] = inp.value; }
''', '''        else if(inp.hasAttribute("data-opmaak")){ if(inp.value) d[k] = inp.value; else delete d[k]; }
        else { d[k] = inp.value; }
        if(k==="bg"){ renderEditor(); }
''')
# het citaat mag ook op crème
vervang("['terracotta','salvia','espresso','fresco'].map", "['creme','terracotta','salvia','espresso','fresco'].map")

# 5 · bewaren en terughalen
vervang('''  function renderAll(){ renderList(); renderEditor(); renderStage(); }
''', '''  function renderAll(){ renderList(); renderEditor(); renderStage(); }

  /* ============================================================
     BEWAREN: concepten en definitieve carousels in deze browser,
     en als bestand om te delen of veilig te stellen.
     ============================================================ */
  var BEWAAR_SLEUTEL = "apero_carousels_v1";
  function bewaarde(){ try{ return JSON.parse(localStorage.getItem(BEWAAR_SLEUTEL)||"[]"); }catch(e){ return []; } }
  function schrijfBewaarde(l){ try{ localStorage.setItem(BEWAAR_SLEUTEL, JSON.stringify(l)); return true; }catch(e){ toast("Bewaren lukte niet: de opslag van deze browser is vol of geblokkeerd."); return false; } }
  function momentopname(status){
    return { naam:(state.setName||"naamloos").trim()||"naamloos", status:status, ts:Date.now(), format:state.format, scheme:state.scheme, pageInd:state.pageInd, markEl:state.markEl, slides:JSON.parse(JSON.stringify(state.slides)) };
  }
  function laadCarousel(c){
    state.setName=c.naam; state.format=c.format||"4:5"; state.scheme=c.scheme||"creme";
    state.pageInd=c.pageInd!==false; state.markEl=c.markEl!==false;
    state.slides=JSON.parse(JSON.stringify(c.slides)); state.active=0;
    document.getElementById("setName").value=state.setName; document.getElementById("format").value=state.format;
    document.getElementById("scheme").value=state.scheme; document.getElementById("pageInd").checked=state.pageInd;
    document.getElementById("markEl").checked=state.markEl; document.getElementById("bewaarStatus").value=c.status==="definitief"?"definitief":"concept";
    renderAll();
  }
  function tekenBewaarde(){
    var el=document.getElementById("bewaardLijst"), l=bewaarde().sort(function(a,b){ return b.ts-a.ts; });
    el.innerHTML = l.length ? "" : '<div class="hint">Nog niets bewaard.</div>';
    l.forEach(function(c){
      var rij=document.createElement("div"); rij.className="rij";
      var dt=new Date(c.ts);
      rij.innerHTML='<span class="pil'+(c.status==="definitief"?" def":"")+'">'+(c.status==="definitief"?"Definitief":"Concept")+'</span><b title="Openen">'+esc(c.naam)+'</b><small>'+c.slides.length+' slides · '+dt.getDate()+'-'+(dt.getMonth()+1)+'</small>';
      rij.querySelector("b").onclick=function(){ laadCarousel(c); toast("“"+c.naam+"” geopend"); };
      var weg=document.createElement("button"); weg.className="iconbtn"; weg.textContent="✕"; weg.title="Verwijderen";
      weg.onclick=function(){ if(!confirm("“"+c.naam+"” verwijderen uit de bewaarde carousels?")) return; schrijfBewaarde(bewaarde().filter(function(x){ return x.naam!==c.naam; })); tekenBewaarde(); };
      rij.appendChild(weg); el.appendChild(rij);
    });
  }
  function bindBewaren(){
    document.getElementById("bewaarKnop").addEventListener("click",function(){
      var c=momentopname(document.getElementById("bewaarStatus").value);
      var l=bewaarde(), bestaand=l.filter(function(x){ return x.naam===c.naam; })[0];
      if(bestaand && bestaand.status==="definitief" && !confirm("“"+c.naam+"” staat als definitief bewaard. Overschrijven?")) return;
      if(schrijfBewaarde(l.filter(function(x){ return x.naam!==c.naam; }).concat([c]))){ tekenBewaarde(); toast("Bewaard als "+c.status+": "+c.naam); }
    });
    document.getElementById("bewaarExport").addEventListener("click",function(){
      var c=momentopname(document.getElementById("bewaarStatus").value);
      var a=document.createElement("a"); a.download="apero-carousel-"+c.naam+".json";
      a.href=URL.createObjectURL(new Blob([JSON.stringify(c,null,1)],{type:"application/json"})); a.click();
    });
    var best=document.getElementById("bewaarBestand");
    document.getElementById("bewaarImport").addEventListener("click",function(){ best.click(); });
    best.addEventListener("change",function(){
      if(!best.files[0]) return;
      var fr=new FileReader();
      fr.onload=function(){
        try{ var c=JSON.parse(fr.result); if(!c||!Array.isArray(c.slides)||!c.slides.length||!c.slides.every(function(x){ return x&&RENDER[x.type]; })) throw 0; c.naam=c.naam||"naamloos"; laadCarousel(c); toast("Bestand geopend"); }
        catch(e){ toast("Dit bestand is geen bewaarde carousel."); }
        best.value="";
      };
      fr.readAsText(best.files[0]);
    });
    tekenBewaarde();
  }
''')
vervang('''  bindCarousel();
''', '''  bindCarousel();
  bindBewaren();
''')


# ============ DEEL 2 · extra sjablonen en levendiger kleuren ============
actief = DEEL2

vervang('  var SCHEME_BG = {creme:"var(--panna)", terracotta:"var(--terracotta)", salvia:"var(--salvia)", espresso:"var(--espresso)"};\n'
        '  var SCHEME_ON_DARK = {creme:false, terracotta:true, salvia:true, espresso:true};\n',
        '  /* EXTRA SJABLONEN en kleuren: burro en mattone erbij, alles uit de merktokens */\n'
        '  var SCHEME_BG = {creme:"var(--panna)", burro:"var(--burro)", terracotta:"var(--terracotta)", mattone:"var(--mattone)", salvia:"var(--salvia)", espresso:"var(--espresso)"};\n'
        '  var SCHEME_ON_DARK = {creme:false, burro:false, terracotta:true, mattone:true, salvia:true, espresso:true};\n')
vervang('[["","Standaard"],["creme","Crème"],["terracotta","Terracotta"],["salvia","Salie"],["espresso","Espresso"],["fresco","Fresco, beeldvullend"]]',
        '[["","Standaard"],["creme","Crème"],["burro","Burro (geel)"],["terracotta","Terracotta"],["mattone","Mattone (baksteen)"],["salvia","Salie"],["espresso","Espresso"],["fresco","Fresco, beeldvullend"]]')
vervang("['creme','terracotta','salvia','espresso','fresco'].map", "['creme','burro','terracotta','mattone','salvia','espresso','fresco'].map")
# op burro valt terracotta weg: accenten daar naar mattone
vervang("""    if(d.patroon==="uit"){""", """    if(eigenBg==="burro"){
      node.querySelectorAll(".eyebrow").forEach(function(el){ if(!el.closest(".cartouche,.arch")) el.style.color = "var(--mattone)"; });
    }
    if(d.patroon==="uit"){""")

EXTRA = [["cijfer", "Cijfer · groot getal"], ["toennu", "Toen en nu · twee helften"], ["woord", "Woord · uit het lexicon"], ["beeldtekst", "Beeld met tekst"]]
vervang('        <option value="lijst">Lijst · line-up</option>\n',
        '        <option value="lijst">Lijst · line-up</option>\n' + "".join('        <option value="%s">%s</option>\n' % (a, b) for a, b in EXTRA))
vervang('["lijst","Lijst · line-up"],["slot","Slot · CTA"]]',
        '["lijst","Lijst · line-up"],' + "".join('["%s","%s"],' % (a, b) for a, b in EXTRA) + '["slot","Slot · CTA"]]')

vervang("""      case "slot":    return {type:"slot", payoff:""", """      case "cijfer":  return {type:"cijfer", kicker:"Nederland, 1881", cijfer:"12.000", label:"tapperijen gingen dicht", toelichting:"In november 1881 gaat de Drankwet in."};
      case "toennu":  return {type:"toennu", kop:"Madrid", toenLabel:"1974", toen:"Franco leeft nog en de televisie staat boven de toog.", nuLabel:"Nu", nu:"De vermut van opa staat weer op de bar."};
      case "woord":   return {type:"woord", kicker:"Uit het lexicon", woord:"louche", herkomst:"Frans: troebel", betekenis:"Het troebel worden van pastis of ouzo zodra er water bij gaat."};
      case "beeldtekst": return {type:"beeldtekst", beeldUrl:DEFAULT_IMG, kop:"Venetië", body:"Aan de toog vraag je om een ombra, een schaduw."};
      case "slot":    return {type:"slot", payoff:""")

vervang("""  var RENDER = {cover:rCover, verhaal:rVerhaal, citaat:rCitaat, beeld:rBeeld, lijst:rLijst, slot:rSlot};""", r"""  /* 7 · CIJFER: één groot getal met wat het betekent */
  function rCijfer(d,idx,total){
    return ''
      + '<div class="petals" style="position:absolute;inset:0;--c:220px;opacity:.16"></div>'
      + '<div class="veil soft"></div>'
      + grain()
      + pageTag(idx,total,false)
      + '<div data-fitbox style="position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;justify-content:center;padding:120px 80px;gap:26px">'
        + (d.kicker?'<div class="eyebrow" style="font-size:24px;letter-spacing:.26em">'+esc(d.kicker)+'</div>':'')
        + '<div style="font-family:var(--disp);font-weight:800;font-size:250px;line-height:.9;letter-spacing:-.02em;color:var(--mattone)">'+esc(d.cijfer)+'</div>'
        + '<div style="font-family:var(--disp);font-weight:700;font-size:68px;line-height:1.02;color:var(--espresso)">'+esc(d.label)+'</div>'
        + (d.toelichting?'<div style="font-family:var(--body);font-weight:400;font-size:34px;line-height:1.5;color:var(--ink-70);max-width:840px;text-wrap:pretty">'+esc(d.toelichting)+'</div>':'')
      + '</div>'
      + markTag(false);
  }

  /* 8 · TOEN EN NU: twee helften onder elkaar, met een dunne lijn ertussen */
  function rToenNu(d,idx,total){
    function helft(label,tekst,lijn){
      return '<div style="padding:44px 0;'+(lijn?'border-bottom:2px solid var(--line);':'')+'">'
        + '<div style="font-family:var(--disp);font-style:italic;font-weight:500;font-size:46px;color:var(--mattone);margin-bottom:14px">'+esc(label)+'</div>'
        + '<div style="font-family:var(--disp);font-weight:700;font-size:60px;line-height:1.08;color:var(--espresso);text-wrap:pretty">'+esc(tekst)+'</div></div>';
    }
    return ''
      + '<div class="petals" style="position:absolute;inset:0;--c:200px;opacity:.16"></div>'
      + '<div class="veil soft"></div>'
      + grain()
      + pageTag(idx,total,false)
      + '<div data-fitbox style="position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;justify-content:center;padding:110px 80px">'
        + (d.kop?'<div class="eyebrow" style="font-size:24px;letter-spacing:.26em">'+esc(d.kop)+'</div>':'')
        + '<div style="width:100%">'+helft(d.toenLabel,d.toen,true)+helft(d.nuLabel,d.nu,false)+'</div>'
      + '</div>'
      + markTag(false);
  }

  /* 9 · WOORD: een term uit het lexicon met herkomst en betekenis */
  function rWoord(d,idx,total){
    return ''
      + '<div class="petals" style="position:absolute;inset:0;--c:220px;opacity:.14"></div>'
      + '<div class="veil soft"></div>'
      + grain()
      + pageTag(idx,total,false)
      + '<div data-fitbox style="position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;justify-content:center;padding:120px 80px;gap:30px">'
        + (d.kicker?'<div class="eyebrow" style="font-size:24px;letter-spacing:.26em">'+esc(d.kicker)+'</div>':'')
        + '<div style="font-family:var(--disp);font-style:italic;font-weight:700;font-size:170px;line-height:.95;letter-spacing:-.01em;color:var(--espresso)">'+esc(d.woord)+'</div>'
        + (d.herkomst?'<div style="font-family:var(--body);font-weight:600;font-size:26px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-50)">'+esc(d.herkomst)+'</div>':'')
        + '<div style="font-family:var(--body);font-weight:400;font-size:42px;line-height:1.45;color:var(--ink-70);max-width:860px;text-wrap:pretty">'+esc(d.betekenis)+'</div>'
      + '</div>'
      + markTag(false);
  }

  /* 10 · BEELD MET TEKST: fresco in de boog, kop en tekst eronder */
  function rBeeldTekst(d,idx,total){
    return ''
      + grain()
      + pageTag(idx,total,false)
      + '<div data-fitbox style="position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;padding:80px 80px 130px;gap:40px">'
        + '<div class="arch" style="height:560px;width:100%;border-radius:50% 50% 10px 10px / 24% 24% 0 0">'
          + '<div class="fresco" style="background-image:url(\''+esc(d.beeldUrl||DEFAULT_IMG)+'\')"></div>'
          + '<div class="wash soft"></div></div>'
        + '<div style="font-family:var(--disp);font-weight:700;font-size:84px;line-height:.98;letter-spacing:-.01em;color:var(--espresso)">'+esc(d.kop)+'</div>'
        + '<div style="font-family:var(--body);font-weight:400;font-size:36px;line-height:1.5;color:var(--ink-70);max-width:840px;text-wrap:pretty">'+esc(d.body)+'</div>'
      + '</div>'
      + markTag(false);
  }

  var RENDER = {cover:rCover, verhaal:rVerhaal, citaat:rCitaat, beeld:rBeeld, lijst:rLijst, slot:rSlot, cijfer:rCijfer, toennu:rToenNu, woord:rWoord, beeldtekst:rBeeldTekst};""")

vervang("""      case "slot":
        h += fld("Payoff (italic)\"""", r"""      case "cijfer":
        h += fld("Kicker (waar en wanneer)","kicker",'<input data-k="kicker" value="'+esc(d.kicker||"")+'">',42);
        h += fld("Het getal","cijfer",'<input data-k="cijfer" value="'+esc(d.cijfer)+'">',7);
        h += fld("Wat het getal is","label",'<input data-k="label" value="'+esc(d.label)+'">',40);
        h += fld("Toelichting (optioneel)","toelichting",'<textarea data-k="toelichting">'+esc(d.toelichting||"")+'</textarea>',160);
        break;
      case "toennu":
        h += fld("Kicker (de plek)","kop",'<input data-k="kop" value="'+esc(d.kop||"")+'">',34);
        h += '<div class="row"><div>'+fld("Label boven","toenLabel",'<input data-k="toenLabel" value="'+esc(d.toenLabel)+'">')+'</div><div>'+fld("Label onder","nuLabel",'<input data-k="nuLabel" value="'+esc(d.nuLabel)+'">')+'</div></div>';
        h += fld("Toen","toen",'<textarea data-k="toen">'+esc(d.toen)+'</textarea>',80);
        h += fld("Nu","nu",'<textarea data-k="nu">'+esc(d.nu)+'</textarea>',80);
        break;
      case "woord":
        h += fld("Kicker","kicker",'<input data-k="kicker" value="'+esc(d.kicker||"")+'">',34);
        h += fld("Het woord","woord",'<input data-k="woord" value="'+esc(d.woord)+'">',12);
        h += fld("Herkomst (optioneel)","herkomst",'<input data-k="herkomst" value="'+esc(d.herkomst||"")+'">',44);
        h += fld("Betekenis","betekenis",'<textarea data-k="betekenis">'+esc(d.betekenis)+'</textarea>',170);
        break;
      case "beeldtekst":
        h += '<label>Fresco</label>'+imgSelect("beeldUrl",d.beeldUrl);
        h += fld("Kop","kop",'<input data-k="kop" value="'+esc(d.kop)+'">',24);
        h += fld("Tekst","body",'<textarea data-k="body">'+esc(d.body)+'</textarea>',170);
        break;
      case "slot":
        h += fld("Payoff (italic)""" + '"')

# sjabloon wisselen kent de nieuwe sjablonen
vervang("""{cover:d.titel, verhaal:d.kop, beeld:d.onderschrift, lijst:d.kop, slot:d.payoff}[d.type]""",
        """{cover:d.titel, verhaal:d.kop, beeld:d.onderschrift, lijst:d.kop, slot:d.payoff, cijfer:d.label, toennu:d.kop, woord:d.woord, beeldtekst:d.kop}[d.type]""")
vervang("""{verhaal:d.body, citaat:d.quote, lijst:(d.items||[]).join("\\n")}[d.type]""",
        """{verhaal:d.body, citaat:d.quote, lijst:(d.items||[]).join("\\n"), cijfer:d.toelichting, toennu:[d.toen,d.nu].filter(Boolean).join("\\n"), woord:d.betekenis, beeldtekst:d.body}[d.type]""")
vervang("""    if(type==="slot"){ if(kort||lang) n.payoff = kort||lang; if(d.handle) n.handle = d.handle; }""",
        """    if(type==="slot"){ if(kort||lang) n.payoff = kort||lang; if(d.handle) n.handle = d.handle; }
    if(type==="cijfer" && (kort||lang)){
      var getal = (kort+" "+lang).match(/\\d[\\d.,]*\\d|\\d/);
      n.cijfer = d.cijfer || (getal?getal[0]:""); n.label = kort; n.toelichting = lang.replace(/\\n/g," "); n.kicker = d.kicker||"";
    }
    if(type==="toennu" && (kort||lang)){
      var delen = lang.indexOf("\\n")>-1 ? lang.split("\\n") : lang.split(/(?<=[.!?])\\s+/);
      n.kop = kort; n.toen = delen[0]||""; n.nu = delen.slice(1).join(" ");
    }
    if(type==="woord" && (kort||lang)){ n.woord = kort; n.betekenis = lang.replace(/\\n/g," "); n.herkomst = d.herkomst||""; }
    if(type==="beeldtekst" && (kort||lang)){ n.kop = kort; n.body = lang.replace(/\\n/g," "); }""")
# beeld met tekst heeft zijn beeld al in de boog: geen tweede fresco erachter
vervang("""if(eigenBg==="fresco" && d.type==="cover" && d.achtergrond==="fresco") eigenBg = null;""",
        """if(eigenBg==="fresco" && ((d.type==="cover" && d.achtergrond==="fresco") || d.type==="beeldtekst")) eigenBg = null;""")
vervang("""if(d.bg==="fresco" && !(d.type==="cover" && d.achtergrond==="fresco") && d.type!=="beeld"){""",
        """if(d.bg==="fresco" && !(d.type==="cover" && d.achtergrond==="fresco") && d.type!=="beeld" && d.type!=="beeldtekst"){""")

# wat een sjabloon niet toont (getal, bron, handle, labels) reist slapend mee, zodat terugwisselen niets kost
vervang("""    ["beeldUrl","bg","uitlijn","positie","grootte","patroon"].forEach(function(k){ if(d[k]) n[k] = d[k]; });""",
        """    ["beeldUrl","bg","uitlijn","positie","grootte","patroon","kicker","bron","handle","cijfer","herkomst","toenLabel","nuLabel"].forEach(function(k){ if(d[k]) n[k] = d[k]; });
    Object.keys(d).forEach(function(k){ if(k!=="type" && !(k in n)) n[k] = d[k]; });""")

open(pad, "w", encoding="utf8").write(s)
print("Bijgewerkt:", pad)
