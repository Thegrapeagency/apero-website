/* APÉRO Tijdreis — kaart → duik → zakhorloge.
   Data komt uit tijdreis-data.js (TIJDREIS). */
(function(){
  'use strict';
  var kaart = document.getElementById('tr-kaart');
  var SVGNS = 'http://www.w3.org/2000/svg';

  /* ---------- de kaart: echte geografie uit tijdreis-kaart.js ---------- */
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
      /* onzichtbare brede rand als extra tikdoel voor smalle landen */
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
  var dive = document.getElementById('tr-dive');
  var tijd = document.getElementById('tr-tijd');
  var sluitKnop = document.getElementById('tr-sluit');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var actueel = null;   // key van de open wereld
  var laag = 'kaart';   // kaart | dive | tijd

  /* ---------- de duik ---------- */
  function openDive(key){
    var w = TIJDREIS[key]; if(!w) return;
    actueel = key; laag = 'dive';
    document.getElementById('tr-dive-foto').style.backgroundImage = 'url("'+w.foto+'")';
    document.getElementById('tr-dive-kicker').textContent = 'Wereld '+w.romein+' · '+w.sub;
    document.getElementById('tr-dive-titel').textContent = w.naam;
    document.getElementById('tr-dive-sub').textContent = w.intro;
    var houder = document.getElementById('tr-weetjes');
    houder.innerHTML = '';
    (w.weetjes.length ? w.weetjes : ['Het onderzoek naar deze wereld loopt nog. Kom snel terug.']).forEach(function(tekst){
      var el = document.createElement('div'); el.className = 'tr-weetje';
      el.innerHTML = '<span class="flower"></span><p></p>';
      el.querySelector('p').textContent = tekst;
      houder.appendChild(el);
    });
    document.getElementById('tr-open-tijd').style.display = w.tijdlijn.length ? '' : 'none';
    dive.classList.add('open'); sluitKnop.hidden = false;
    document.body.style.overflow = 'hidden';
    dive.querySelector('.tr-scroll').scrollTop = 0;
    onthulWeetjes();
  }

  function onthulWeetjes(){
    var kaartjes = dive.querySelectorAll('.tr-weetje');
    if(reduced){ kaartjes.forEach(function(k){ k.classList.add('zichtbaar'); }); return; }
    kaartjes.forEach(function(k,i){ setTimeout(function(){ k.classList.add('zichtbaar'); }, 350 + i*130); });
  }

  /* ---------- de tijdreis ---------- */
  var idx = 0, rotatie = 0, GRAAD_PER_STAP = 60;
  var wijzer = document.getElementById('tr-wijzer');
  var uurwerk = document.getElementById('tr-uurwerk');
  var horloge = document.getElementById('tr-horloge');
  var hint = document.getElementById('tr-horloge-hint');
  var hintWeg = false;

  function openTijd(){
    var w = TIJDREIS[actueel]; if(!w || !w.tijdlijn.length) return;
    laag = 'tijd'; idx = 0; rotatie = 0;
    document.getElementById('tr-tijd-naam').textContent = w.naam;
    var spoor = document.getElementById('tr-spoor'); spoor.innerHTML = '';
    w.tijdlijn.forEach(function(_,i){
      var d = document.createElement('span'); d.className = 'tr-dot' + (i===0?' actief':'');
      spoor.appendChild(d);
    });
    horloge.setAttribute('aria-valuemax', String(w.tijdlijn.length-1));
    tijd.classList.add('open');
    toonStap(0, true);
    tekenWijzer();
  }

  function toonStap(nieuw, direct){
    var w = TIJDREIS[actueel]; if(!w) return;
    nieuw = Math.max(0, Math.min(w.tijdlijn.length-1, nieuw));
    var item = w.tijdlijn[nieuw];
    var kaartje = document.getElementById('tr-kaartje');
    var vul = function(){
      document.getElementById('tr-jaar').firstChild.textContent = item.jaar;
      document.getElementById('tr-teller').textContent = (nieuw+1)+' van '+w.tijdlijn.length;
      document.getElementById('tr-tekst').textContent = item.tekst;
      kaartje.classList.add('zichtbaar');
    };
    document.querySelectorAll('.tr-dot').forEach(function(d,i){ d.classList.toggle('actief', i===nieuw); });
    horloge.setAttribute('aria-valuenow', String(nieuw));
    horloge.setAttribute('aria-valuetext', item.jaar+': '+item.tekst);
    if(direct || reduced){ vul(); return; }
    kaartje.classList.remove('zichtbaar');
    setTimeout(vul, 180);
  }

  function tekenWijzer(){
    wijzer.setAttribute('transform', 'rotate('+rotatie+' 170 250)');
    uurwerk.setAttribute('transform', 'rotate('+(rotatie*0.25)+' 170 250)');
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
    var cx = r.left + r.width/2, cy = r.top + r.height*0.6;
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
      /* klik vast op de dichtstbijzijnde stap */
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

  /* ---------- navigatie tussen de lagen ---------- */
  function sluit(){
    if(laag==='tijd'){ tijd.classList.remove('open'); laag='dive'; return; }
    dive.classList.remove('open'); sluitKnop.hidden = true; laag='kaart';
    document.body.style.overflow = '';
  }
  sluitKnop.addEventListener('click', sluit);
  document.addEventListener('keydown', function(e){ if(e.key==='Escape' && laag!=='kaart') sluit(); });
  document.getElementById('tr-open-tijd').addEventListener('click', openTijd);

  kaart.querySelectorAll('.tr-zone').forEach(function(zone){
    zone.addEventListener('click', function(){ openDive(zone.dataset.wereld); });
    zone.addEventListener('keydown', function(e){
      if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openDive(zone.dataset.wereld); }
    });
  });

  /* deep link: tijdreis.html?wereld=spanje */
  var vraag = new URLSearchParams(location.search).get('wereld');
  if(vraag && TIJDREIS[vraag]) openDive(vraag);
})();
