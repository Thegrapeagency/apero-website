/* APÉRO Tijdreis — kaart → duik → zakhorloge.
   Data komt uit tijdreis-data.js (TIJDREIS). */
(function(){
  'use strict';
  var kaart = document.getElementById('tr-kaart');
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
    wijzer.style.transform = 'rotate('+rotatie+'deg)';
    uurwerk.style.transform = 'rotate('+(rotatie*0.25)+'deg)';
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

  /* ---------- ticks op de wijzerplaat ---------- */
  (function(){
    var g = document.getElementById('tr-ticks'), NS = 'http://www.w3.org/2000/svg';
    for(var i=0;i<60;i++){
      var groot = i%5===0, l = document.createElementNS(NS,'line'), a = i*6*Math.PI/180;
      var r1 = groot?116:124, r2 = 132;
      l.setAttribute('x1', 170 + r1*Math.sin(a)); l.setAttribute('y1', 220 - r1*Math.cos(a));
      l.setAttribute('x2', 170 + r2*Math.sin(a)); l.setAttribute('y2', 220 - r2*Math.cos(a));
      l.setAttribute('stroke', groot?'var(--espresso)':'rgba(35,27,19,.35)');
      l.setAttribute('stroke-width', groot?3:1.5);
      g.appendChild(l);
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
