/* APÉRO Tijdreis — kaart → wereldpagina (tijdreis + weetjes op het fresco).
   Data uit tijdreis-data.js (TIJDREIS), geometrie uit tijdreis-kaart.js (KAARTPADEN). */
(function(){
  'use strict';
  var kaart = document.getElementById('tr-kaart');
  var dive = document.getElementById('tr-dive');
  var scroller = document.getElementById('tr-scroll');
  var sluitKnop = document.getElementById('tr-sluit');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SVGNS = 'http://www.w3.org/2000/svg';
  var actueel = null;

  /* ---------- de kaart: echte geografie ---------- */
  var KAART_OPMAAK = {
    frankrijk:  { label:[326,170,34], romein:[326,198,20], marker:[330,110], licht:false },
    spanje:     { label:[168,442,36], romein:[168,470,20], marker:[186,393], licht:true },
    portugal:   { label:[76,442,20],  romein:[76,504,13],  marker:[58,444],  licht:true, rot:-90 },
    italie:     { label:[524,254,26], romein:[524,280,17], marker:[571,346], licht:false },
    anijsgordel:{ label:[818,610,24], romein:[818,636,15], marker:[839,468], licht:false },
    marokko:    { label:[128,652,28], romein:[128,678,16], marker:[136,548], licht:true }
  };
  var KAART_VULLING = {
    spanje:'var(--terracotta)', italie:'var(--burro)', frankrijk:'var(--salvia)',
    portugal:'var(--mattone)', marokko:'var(--espresso)', anijsgordel:'url(#anijspatroon)'
  };

  function el(naam, attrs, parent){
    var n = document.createElementNS(SVGNS, naam);
    for(var k in attrs) n.setAttribute(k, attrs[k]);
    if(parent) parent.appendChild(n);
    return n;
  }

  (function bouwKaart(){
    if(typeof KAARTPADEN === 'undefined') return;
    var ctx = document.getElementById('tr-context');
    var schaduwen = document.getElementById('tr-schaduwen');
    var zones = document.getElementById('tr-zones');
    el('path', { d: KAARTPADEN.context }, ctx);
    Object.keys(KAART_OPMAAK).forEach(function(key){
      var d = KAARTPADEN.werelden[key]; if(!d) return;
      var o = KAART_OPMAAK[key], w = TIJDREIS[key];
      el('path', { d: d, transform: 'translate(0,5)' }, schaduwen);
      var g = el('g', { 'class':'tr-zone', 'data-wereld':key, tabindex:'0', role:'button',
        'aria-label': w.naam + ', ' + w.sub.toLowerCase() }, zones);
      el('path', { 'class':'tr-land', d: d, fill: KAART_VULLING[key] }, g);
      el('path', { d: d, fill:'none', stroke:'transparent', 'stroke-width':14, 'pointer-events':'stroke' }, g);
      var lucht = o.licht ? ' licht' : '';
      var lab = el('text', { 'class':'tr-label'+lucht, x:o.label[0], y:o.label[1],
        'font-size':o.label[2], 'text-anchor':'middle' }, g);
      if(o.rot) lab.setAttribute('transform', 'rotate('+o.rot+' '+o.label[0]+' '+o.label[1]+')');
      lab.textContent = w.naam;
      var rom = el('text', { 'class':'tr-romein'+lucht, x:o.romein[0], y:o.romein[1],
        'font-size':o.romein[2], 'text-anchor':'middle' }, g);
      rom.textContent = w.romein;
      var bloem = el('g', { 'class':'tr-bloem', transform:'translate('+o.marker[0]+','+o.marker[1]+') scale(.85)' }, g);
      el('use', { href: o.licht ? '#bloemsym-panna' : '#bloemsym' }, bloem);
    });
  })();

  /* ---------- de tijdreis: toestand ---------- */
  var idx = 0, rotatie = 0, GRAAD_PER_STAP = 60;
  var wijzer = document.getElementById('tr-wijzer');
  var uurwerk = document.getElementById('tr-uurwerk');
  var horloge = document.getElementById('tr-horloge');
  var hint = document.getElementById('tr-horloge-hint');
  var hintWeg = false;

  function tekenWijzer(){
    wijzer.setAttribute('transform', 'rotate('+rotatie+' 170 250)');
    uurwerk.setAttribute('transform', 'rotate('+(rotatie*0.25)+' 170 250)');
  }

  function toonStap(nieuw, direct){
    var w = TIJDREIS[actueel]; if(!w || !w.tijdlijn.length) return;
    nieuw = Math.max(0, Math.min(w.tijdlijn.length-1, nieuw));
    var item = w.tijdlijn[nieuw];
    var flits = document.getElementById('tr-flits');
    var vul = function(){
      document.getElementById('tr-jaar').firstChild.textContent = item.jaar;
      document.getElementById('tr-teller').textContent = (nieuw+1)+' van '+w.tijdlijn.length;
      document.getElementById('tr-tekst').textContent = item.tekst;
      flits.classList.add('zichtbaar');
    };
    document.querySelectorAll('.tr-dot').forEach(function(d,i){ d.classList.toggle('actief', i===nieuw); });
    horloge.setAttribute('aria-valuenow', String(nieuw));
    horloge.setAttribute('aria-valuetext', item.jaar+': '+item.tekst);
    if(direct || reduced){ vul(); return; }
    flits.classList.remove('zichtbaar');
    setTimeout(vul, 170);
  }

  function draai(deltaGraden){
    var w = TIJDREIS[actueel]; if(!w) return;
    var max = (w.tijdlijn.length-1)*GRAAD_PER_STAP;
    rotatie = Math.max(0, Math.min(max, rotatie + deltaGraden));
    tekenWijzer();
    var nieuw = Math.round(rotatie/GRAAD_PER_STAP);
    if(nieuw !== idx){ idx = nieuw; toonStap(idx); }
    if(!hintWeg && rotatie > 20){ hintWeg = true; hint.classList.add('weg'); }
  }

  function stap(richting){
    var w = TIJDREIS[actueel]; if(!w) return;
    var doel = Math.max(0, Math.min(w.tijdlijn.length-1, idx + richting));
    rotatie = doel*GRAAD_PER_STAP; tekenWijzer();
    if(doel !== idx){ idx = doel; toonStap(idx); }
    if(!hintWeg){ hintWeg = true; hint.classList.add('weg'); }
  }

  /* slepen: hoek t.o.v. het hart van het horloge */
  var sleep = null;
  function hoekVan(e){
    var r = horloge.getBoundingClientRect();
    var cx = r.left + r.width/2, cy = r.top + r.height*0.58;
    return Math.atan2(e.clientY - cy, e.clientX - cx) * 180/Math.PI;
  }
  horloge.addEventListener('pointerdown', function(e){
    sleep = hoekVan(e); horloge.setPointerCapture(e.pointerId); e.preventDefault();
  });
  horloge.addEventListener('pointermove', function(e){
    if(sleep === null) return;
    var nu = hoekVan(e), d = nu - sleep;
    if(d > 180) d -= 360; if(d < -180) d += 360;
    sleep = nu; draai(d*1.4);
  });
  ['pointerup','pointercancel'].forEach(function(ev){
    horloge.addEventListener(ev, function(){
      sleep = null;
      rotatie = Math.round(rotatie/GRAAD_PER_STAP)*GRAAD_PER_STAP;
      tekenWijzer();
    });
  });
  var wielTimer = null;
  horloge.addEventListener('wheel', function(e){
    e.preventDefault(); draai(e.deltaY*0.25);
    clearTimeout(wielTimer);
    wielTimer = setTimeout(function(){
      rotatie = Math.round(rotatie/GRAAD_PER_STAP)*GRAAD_PER_STAP; tekenWijzer();
    }, 220);
  }, {passive:false});
  horloge.addEventListener('keydown', function(e){
    if(e.key==='ArrowRight'||e.key==='ArrowUp'){ e.preventDefault(); stap(1); }
    if(e.key==='ArrowLeft'||e.key==='ArrowDown'){ e.preventDefault(); stap(-1); }
  });

  /* ---------- wijzerplaat: minutenrand + romeinse cijfers ---------- */
  (function(){
    var g = document.getElementById('tr-ticks');
    for(var i=0;i<60;i++){
      var groot = i%5===0, a = i*6*Math.PI/180;
      var r1 = groot?125:129, r2 = 135;
      el('line', {
        x1: 170 + r1*Math.sin(a), y1: 250 - r1*Math.cos(a),
        x2: 170 + r2*Math.sin(a), y2: 250 - r2*Math.cos(a),
        stroke: groot?'var(--espresso)':'rgba(35,27,19,.3)',
        'stroke-width': groot?2.6:1.2
      }, g);
    }
    var cijfers = document.getElementById('tr-cijfers');
    var ROMEINS = ['XII','I','II','III','IIII','V','VI','VII','VIII','IX','X','XI'];
    for(var j=0;j<12;j++){
      var hoek = j*30*Math.PI/180, r = 106;
      var t = el('text', {
        x: (170 + r*Math.sin(hoek)).toFixed(1),
        y: (250 - r*Math.cos(hoek) + 7.5).toFixed(1),
        'text-anchor':'middle', 'font-size': j===0?22:19,
        'class': j===0?'twaalf':''
      }, cijfers);
      t.textContent = ROMEINS[j];
    }
  })();

  /* ---------- de wereldpagina openen en sluiten ---------- */
  function openWereld(key){
    var w = TIJDREIS[key]; if(!w) return;
    actueel = key;
    dive.setAttribute('aria-label', w.naam);
    document.getElementById('tr-dive-foto').style.backgroundImage = 'url("'+w.foto+'")';
    document.getElementById('tr-dive-kicker').textContent = 'Wereld '+w.romein+' · '+w.sub;
    document.getElementById('tr-dive-titel').textContent = w.naam;
    /* weetjes */
    var houder = document.getElementById('tr-weetjes');
    houder.innerHTML = '';
    (w.weetjes.length ? w.weetjes : ['Het onderzoek naar deze wereld loopt nog.']).forEach(function(tekst){
      var k = document.createElement('div'); k.className = 'tr-weetje';
      k.innerHTML = '<span class="flower"></span><p></p>';
      k.querySelector('p').textContent = tekst;
      houder.appendChild(k);
    });
    /* tijdreis terug naar het begin */
    idx = 0; rotatie = 0; tekenWijzer();
    var spoor = document.getElementById('tr-spoor'); spoor.innerHTML = '';
    w.tijdlijn.forEach(function(_,i){
      var d = document.createElement('span'); d.className = 'tr-dot'+(i===0?' actief':'');
      spoor.appendChild(d);
    });
    horloge.setAttribute('aria-valuemax', String(Math.max(0, w.tijdlijn.length-1)));
    hintWeg = false; hint.classList.remove('weg');
    toonStap(0, true);
    dive.classList.add('open'); sluitKnop.hidden = false;
    document.body.style.overflow = 'hidden';
    scroller.scrollTop = 0;
    onthulWeetjes();
  }

  function onthulWeetjes(){
    var kaartjes = dive.querySelectorAll('.tr-weetje');
    if(reduced || !('IntersectionObserver' in window)){
      kaartjes.forEach(function(k){ k.classList.add('zichtbaar'); }); return;
    }
    var zien = new IntersectionObserver(function(entries){
      entries.forEach(function(e,i){
        if(e.isIntersecting){ e.target.classList.add('zichtbaar'); zien.unobserve(e.target); }
      });
    }, { root: scroller, threshold: .15 });
    kaartjes.forEach(function(k){ zien.observe(k); });
    /* failsafe: na 2s alles tonen als de observer niets deed */
    setTimeout(function(){ kaartjes.forEach(function(k){ k.classList.add('zichtbaar'); }); }, 2500);
  }

  function sluit(){
    dive.classList.remove('open'); sluitKnop.hidden = true;
    document.body.style.overflow = '';
    actueel = null;
  }
  sluitKnop.addEventListener('click', sluit);
  document.getElementById('tr-terug').addEventListener('click', sluit);
  document.addEventListener('keydown', function(e){ if(e.key==='Escape' && actueel) sluit(); });
  document.getElementById('tr-afdaal').addEventListener('click', function(){
    var doel = dive.querySelector('.tr-inner');
    scroller.scrollTo({ top: doel.offsetTop - 40, behavior: reduced ? 'auto' : 'smooth' });
  });

  kaart.querySelectorAll('.tr-zone').forEach(function(zone){
    zone.addEventListener('click', function(){ openWereld(zone.dataset.wereld); });
    zone.addEventListener('keydown', function(e){
      if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openWereld(zone.dataset.wereld); }
    });
  });

  /* deep link: tijdreis.html?wereld=spanje */
  var vraag = new URLSearchParams(location.search).get('wereld');
  if(vraag && TIJDREIS[vraag]) openWereld(vraag);
})();
