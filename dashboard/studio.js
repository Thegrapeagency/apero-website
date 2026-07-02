/* APÉRO Studio — alle modules, één plek */
(function(){
'use strict';

/* ============ helpers ============ */
function $(id){return document.getElementById(id)}
function el(tag,cls,html){var n=document.createElement(tag);if(cls)n.className=cls;if(html!=null)n.innerHTML=html;return n}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
var LS={
  get:function(k,f){try{var v=JSON.parse(localStorage.getItem('studio_'+k));return v==null?f:v}catch(e){return f}},
  set:function(k,v){try{localStorage.setItem('studio_'+k,JSON.stringify(v))}catch(e){}},
  del:function(k){try{localStorage.removeItem('studio_'+k)}catch(e){}}
};
function toast(t){var x=$('toast');x.textContent=t;x.classList.add('on');clearTimeout(x._t);x._t=setTimeout(function(){x.classList.remove('on')},2600)}
function kopieer(t,melding){navigator.clipboard.writeText(t).then(function(){toast(melding||'Gekopieerd')}).catch(function(){toast('Kopiëren lukte niet')})}
function download(naam,data){var b=new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)+'\n'],{type:'application/json'});
  var a=el('a');a.href=URL.createObjectURL(b);a.download=naam;a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},2000)}
function datumNL(d){if(!d)return '';var x=new Date(d);if(isNaN(x))return d;
  return x.toLocaleDateString('nl-NL',{weekday:'short',day:'numeric',month:'short'})}
function vandaag(){return new Date().toISOString().slice(0,10)}
function uid(){return 'p'+Math.random().toString(36).slice(2,9)}
function wachtwoord(n){var t='abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';var u='';
  var r=new Uint32Array(n||20);crypto.getRandomValues(r);for(var i=0;i<r.length;i++)u+=t[r[i]%t.length];return u}

/* ============ data ============ */
var CONTENT=null, PARTNERS=null, PROBES={};
var WERELD_NAMEN={italie:'Italië',frankrijk:'Frankrijk',spanje:'Spanje',anijsgordel:'Anijsgordel',portugal:'Portugal',marokko:'Marokko',overig:'Overig'};
var ASSETS=[
  {pad:'../icon.svg',naam:'icon.svg (logo, vector)',groep:'logo'},
  {pad:'../assets/social/instagram-profiel-bloem-op-terracotta.png',naam:'profiel · panna op terracotta',groep:'logo'},
  {pad:'../assets/social/instagram-profiel-bloem-op-panna.png',naam:'profiel · terracotta op panna',groep:'logo'},
  {pad:'../assets/social/instagram-bloem-terracotta-op-burro.png',naam:'profiel · terracotta op burro',groep:'logo'},
  {pad:'../assets/social/instagram-bloem-espresso-op-panna.png',naam:'profiel · espresso op panna',groep:'logo'},
  {pad:'../assets/social/instagram-bloem-panna-op-salvia.png',naam:'profiel · panna op salvia',groep:'logo'},
  {pad:'../assets/social/instagram-bloem-burro-op-espresso.png',naam:'profiel · burro op espresso',groep:'logo'},
  {pad:'../assets/social/instagram-bloem-tweekleur-op-panna.png',naam:'profiel · tweekleur',groep:'logo'},
  {pad:'../assets/social/instagram-patroon-badge.png',naam:'profiel · patroon-badge',groep:'logo'},
  {pad:'../assets/landen/italie.jpg',naam:'Italië',groep:'landen'},{pad:'../assets/landen/italie-alt.jpg',naam:'Italië alt',groep:'landen'},
  {pad:'../assets/landen/frankrijk.jpg',naam:'Frankrijk',groep:'landen'},{pad:'../assets/landen/frankrijk-alt.jpg',naam:'Frankrijk alt',groep:'landen'},
  {pad:'../assets/landen/spanje.jpg',naam:'Spanje',groep:'landen'},{pad:'../assets/landen/spanje-alt.jpg',naam:'Spanje alt',groep:'landen'},
  {pad:'../assets/landen/anijsgordel.jpg',naam:'Anijsgordel',groep:'landen'},{pad:'../assets/landen/anijsgordel-alt.jpg',naam:'Anijsgordel alt',groep:'landen'},
  {pad:'../assets/landen/portugal.jpg',naam:'Portugal',groep:'landen'},{pad:'../assets/landen/portugal-alt.jpg',naam:'Portugal alt',groep:'landen'},
  {pad:'../assets/landen/marokko.jpg',naam:'Marokko',groep:'landen'},{pad:'../assets/landen/marokko-alt.jpg',naam:'Marokko alt',groep:'landen'},
  {pad:'../assets/fresco/fresco-01.jpg',naam:'fresco 01',groep:'fresco'},{pad:'../assets/fresco/fresco-02.jpg',naam:'fresco 02',groep:'fresco'},
  {pad:'../assets/fresco/fresco-04.jpg',naam:'fresco 04',groep:'fresco'},{pad:'../assets/fresco/fresco-06.jpg',naam:'fresco 06',groep:'fresco'},
  {pad:'../assets/fresco/fresco-10.jpg',naam:'fresco 10',groep:'fresco'},{pad:'../assets/fresco/fresco-12.jpg',naam:'fresco 12',groep:'fresco'},
  {pad:'../assets/fresco/fresco-16.jpg',naam:'fresco 16',groep:'fresco'},{pad:'../assets/fresco/fresco-23.jpg',naam:'fresco 23',groep:'fresco'},
  {pad:'../assets/motion/hero-poster.jpg',naam:'hero poster',groep:'motion'},{pad:'../assets/motion/lexicon-poster.jpg',naam:'lexicon poster',groep:'motion'}
];
var HASHTAGS={
  merk:'#apero #aperoculture #aperitief #utrecht #opendeavond',
  italie:'#aperitivo #negroni #spritz #italie #campari',
  frankrijk:'#apero #pastis #marseille #frankrijk #petanque',
  spanje:'#vermut #lahoradelvermut #barcelona #madrid #bodega',
  anijsgordel:'#ouzo #arak #raki #meze #anijsgordel',
  portugal:'#portonico #porto #vinhoverde #portugal',
  marokko:'#atay #muntthee #marokko #zonderalcohol #theetijd'
};

async function laadContent(){
  if(CONTENT)return CONTENT;
  try{var r=await fetch('data/content.json');CONTENT=await r.json()}catch(e){CONTENT={meta:{},items:[]}}
  return CONTENT;
}
async function laadPartners(){
  if(PARTNERS)return PARTNERS;
  var lokaal=LS.get('partners',null);
  if(lokaal){PARTNERS=lokaal;PARTNERS._lokaal=true;return PARTNERS}
  try{var r=await fetch('data/partners.json');PARTNERS=await r.json()}catch(e){PARTNERS={meta:{statussen:['lead','in gesprek','voorstel','akkoord','live'],werelden:Object.keys(WERELD_NAMEN)},partners:[],wereldSlots:[]}}
  return PARTNERS;
}
function bewaarPartners(){PARTNERS._lokaal=true;LS.set('partners',PARTNERS);tellers()}

async function probe(naam,fn){
  if(naam in PROBES)return PROBES[naam];
  try{PROBES[naam]=await fn()}catch(e){PROBES[naam]=null}
  return PROBES[naam];
}
function probeSave(){return probe('save',async function(){var r=await fetch('../api/save-content');if(!r.ok&&r.status!==503)return null;var j=await r.json().catch(function(){return null});return j?!!j.actief:null})}
function probeIG(){return probe('ig',async function(){var r=await fetch('../api/instagram-publish');var j=await r.json().catch(function(){return null});return j?!!j.actief:null})}
function probePartnerAPI(){return probe('papi',async function(){var r=await fetch('../api/partner-data');if(!r.ok)return null;var j=await r.json();return j.rol==='redactie'})}
function probeAnalytics(){return probe('ana',async function(){var r=await fetch('/_vercel/insights/script.js',{method:'HEAD'});return r.ok})}

/* ============ raamwerk ============ */
var paneel=$('paneel'),tkop=$('tkop');
var MODULES={};
function registreer(id,titel,render){MODULES[id]={id:id,titel:titel,render:render}}
function ga(id){
  if(!MODULES[id])id='overzicht';
  location.hash=id;
}
function render(){
  var id=(location.hash||'#overzicht').slice(1);
  var m=MODULES[id]||MODULES.overzicht;
  document.querySelectorAll('.zlink').forEach(function(b){b.classList.toggle('on',b.dataset.m===m.id)});
  tkop.textContent=m.titel;
  paneel.className='paneel';
  paneel.innerHTML='';
  $('zijbalk').classList.remove('open');
  m.render(paneel);
  paneel.scrollTop=0;
}
window.addEventListener('hashchange',render);
document.querySelectorAll('.zlink').forEach(function(b){b.onclick=function(){ga(b.dataset.m)}});
$('menuknop').onclick=function(){$('zijbalk').classList.toggle('open')};

async function tellers(){
  var c=await laadContent(),p=await laadPartners();
  $('telPub').textContent=c.items.length||'';
  $('telIG').textContent=(LS.get('ig',[]).filter(function(x){return x.status!=='gepost'}).length)||'';
  $('telPartners').textContent=(p.partners||[]).filter(function(x){return x.slug!=='voorbeeldpartner'}).length||'';
}

/* ============ modaal ============ */
function modaal(titel,vulFn){
  $('mtitel').textContent=titel;
  var b=$('mbody');b.innerHTML='';
  vulFn(b);
  $('modaal').classList.add('on');$('mscrim').classList.add('on');
}
function sluitModaal(){$('modaal').classList.remove('on');$('mscrim').classList.remove('on')}
$('msluit').onclick=sluitModaal;$('mscrim').onclick=sluitModaal;

/* ============ mediabieb component ============ */
function mediaGrid(container,opties){
  opties=opties||{};
  var groepen=['alles','logo','landen','fresco','motion'];
  var actief='alles';
  var kop=el('div','knoprij');
  groepen.forEach(function(g){
    var k=el('button','chip'+(g===actief?' terra':''),g);
    k.onclick=function(){actief=g;teken();kop.querySelectorAll('.chip').forEach(function(x){x.classList.toggle('terra',x.textContent===g)})};
    kop.appendChild(k);
  });
  var grid=el('div','medias');grid.style.marginTop='12px';
  function teken(){
    grid.innerHTML='';
    ASSETS.filter(function(a){return actief==='alles'||a.groep===actief}).forEach(function(a){
      var m=el('div','media'+(opties.gekozen===a.pad?' gekozen':''));
      m.innerHTML=(a.pad.endsWith('.svg')?'<img src="'+a.pad+'" style="object-fit:contain;padding:14px">':'<img src="'+a.pad+'" loading="lazy">')+'<span class="mnaam">'+esc(a.naam)+'</span>';
      m.onclick=function(){
        if(opties.onKies){opties.gekozen=a.pad;opties.onKies(a);grid.querySelectorAll('.media').forEach(function(x){x.classList.remove('gekozen')});m.classList.add('gekozen')}
        else kopieer(location.origin+a.pad.replace('..',''),'URL gekopieerd: '+a.naam);
      };
      grid.appendChild(m);
    });
  }
  teken();
  container.appendChild(kop);container.appendChild(grid);
}

/* ============ voice-lint ============ */
function lint(tekst){
  var uit=[];
  if(/[—–]/.test(tekst))uit.push('Gedachtestreepje (— of –) gevonden: vervang door komma of dubbele punt.');
  if(/proeverij/i.test(tekst))uit.push('"Proeverij" vermijden we: het is een onderzoek, geen proeverij.');
  if(/(^|[\s,.!?])[Uu]w?([\s,.!?]|$)/.test(tekst))uit.push('U-vorm gevonden: APÉRO zegt je en jij.');
  var caps=tekst.match(/\b[A-ZÀ-Ü]{4,}\b/g);
  if(caps&&caps.some(function(w){return ['APERO','MMXXVII','APÉRO'].indexOf(w)<0}))uit.push('Woord in HOOFDLETTERS: liever niet schreeuwen.');
  ['genieten','uniek','beleving'].forEach(function(w){if(new RegExp('\\b'+w,'i').test(tekst))uit.push('"'+w+'" is clichéwacht: kan het concreter?')});
  if(/APERO(?!K)/.test(tekst)&&!/APÉRO/.test(tekst))uit.push('Schrijf APÉRO met accent (behalve in hashtags).');
  return uit;
}

/* ============================================================
   MODULE: OVERZICHT
   ============================================================ */
registreer('overzicht','Overzicht',async function(p){
  var c=await laadContent(),pa=await laadPartners();
  var per={};c.items.forEach(function(i){per[i.status]=(per[i.status]||0)+1});
  var partnersActief=(pa.partners||[]).filter(function(x){return ['akkoord','live'].indexOf(x.status)>-1}).length;
  var fest=LS.get('festdatum','2027-06-21');
  var dagen=Math.max(0,Math.ceil((new Date(fest)-new Date())/86400000));
  var db=LS.get('draaiboek',{});var dbTot=0,dbAf=0;
  DRAAIBOEK.forEach(function(f,fi){f.items.forEach(function(it,ii){dbTot++;if(db[fi+'.'+ii])dbAf++})});

  p.appendChild(el('div','mkop','<span class="klabel">'+new Date().toLocaleDateString('nl-NL',{weekday:'long',day:'numeric',month:'long'})+'</span><h2>Goedemorgen. De tafel is gedekt.</h2><p>Alles van AP&Eacute;RO op één plek: redactie, Instagram, partners, tickets en het festival. Gebruik <b>&#8984;K</b> om overal direct heen te springen.</p>'));

  var g=el('div','grid k4');
  g.appendChild(el('div','kaart','<span class="cijfer">'+(per.live||0)+'</span><div class="cijfsub">publicaties live</div>'));
  g.appendChild(el('div','kaart','<span class="cijfer">'+((per.gepland||0)+(per.klaar||0))+'</span><div class="cijfsub">gepland &amp; klaar</div>'));
  g.appendChild(el('div','kaart','<span class="cijfer">'+partnersActief+'</span><div class="cijfsub">partners akkoord</div>'));
  g.appendChild(el('div','kaart','<span class="cijfer">'+dagen+'</span><div class="cijfsub">dagen tot festival (richtdatum)</div>'));
  p.appendChild(g);

  var g2=el('div','grid k2');g2.style.marginTop='16px';

  // deze week
  var week=el('div','kaart');
  week.innerHTML='<span class="klabel kl">Deze week</span><h3>Op de kalender</h3>';
  var nu=Date.now(),items=c.items.filter(function(i){
    if(!i.datum)return false;var t=new Date(i.datum).getTime();
    return t>nu-86400000&&t<nu+7*86400000;
  }).sort(function(a,b){return a.datum<b.datum?-1:1}).slice(0,7);
  if(items.length){
    var tb=el('table','tabel');
    items.forEach(function(i){tb.appendChild(el('tr','','<td style="white-space:nowrap;color:var(--ink-50)">'+datumNL(i.datum)+'</td><td><b>'+esc(i.titel)+'</b><br><span style="color:var(--ink-50);font-size:11px">'+esc(i.type||'')+' · '+esc(i.thema||'')+'</span></td><td><span class="chip">'+esc(i.status||'')+'</span></td>'))});
    week.appendChild(tb);
  } else week.appendChild(el('div','leeg','<h4>Niets gepland deze week</h4><p>Plan items in de publicatiekalender, dan verschijnen ze hier.</p>'));
  var wk=el('div','knoprij');wk.appendChild(knop('Open publicaties','geest klein',function(){ga('publicaties')}));week.appendChild(wk);
  g2.appendChild(week);

  // systeemstatus
  var sys=el('div','kaart');
  sys.innerHTML='<span class="klabel kl">Systeem</span><h3>Status van de koppelingen</h3><div id="sysLijst" style="display:flex;flex-direction:column;gap:9px;margin-top:8px"></div><p style="margin-top:12px;font-size:11.5px;color:var(--ink-50)">Lokaal (zonder Vercel) tonen API-checks "onbekend"; live kloppen ze.</p>';
  g2.appendChild(sys);
  p.appendChild(g2);

  var g3=el('div','grid k2');g3.style.marginTop='16px';
  var acties=el('div','kaart zacht');
  acties.innerHTML='<span class="klabel kl">Snel</span><h3>Acties</h3>';
  var ak=el('div','knoprij');
  ak.appendChild(knop('Nieuwe Instagram-post','',function(){ga('instagram');setTimeout(function(){window._nieuweIG&&window._nieuweIG()},150)}));
  ak.appendChild(knop('Open de generator','geest',function(){ga('generator')}));
  ak.appendChild(knop('Nieuwe partner','geest',function(){ga('partners');setTimeout(function(){window._nieuwePartner&&window._nieuwePartner()},150)}));
  acties.appendChild(ak);
  g3.appendChild(acties);

  var fk=el('div','kaart');
  fk.innerHTML='<span class="klabel kl">Festival · MMXXVII</span><h3>Draaiboek</h3><p>'+dbAf+' van '+dbTot+' punten afgevinkt.</p><div class="balk" style="margin-top:10px"><i style="width:'+(dbTot?Math.round(dbAf/dbTot*100):0)+'%"></i></div>';
  var fkk=el('div','knoprij');fkk.appendChild(knop('Open draaiboek','geest klein',function(){ga('festival')}));fk.appendChild(fkk);
  g3.appendChild(fk);
  p.appendChild(g3);

  // probes async invullen
  var lijst=$('sysLijst');
  function rij(naam,st,detail){
    var cls=st===true?'ok':(st===false?'uit':'');
    var label=st===true?'actief':(st===false?'nog niet aan':'onbekend');
    lijst.appendChild(el('div','status '+cls,'<i></i><b style="min-width:150px">'+naam+'</b><span>'+label+(detail?' · '+detail:'')+'</span>'));
  }
  rij('Dashboard-login',true,'je bent ingelogd');
  probeSave().then(function(v){rij('1-klik-opslag (GitHub)',v,v===false?'zet GITHUB_TOKEN in Vercel':'')});
  probeIG().then(function(v){rij('Instagram-koppeling',v,v===false?'zie Instagram-module':'')});
  probePartnerAPI().then(function(v){rij('Partnerportaal-API',v)});
  probeAnalytics().then(function(v){rij('Web analytics',v,v===false?'aanzetten in Vercel → Analytics':'')});
});

function knop(tekst,cls,fn){var k=el('button','knop '+(cls||''),tekst);k.onclick=fn;return k}

/* ============================================================
   MODULE: PUBLICATIES & GENERATOR (ingebed)
   ============================================================ */
registreer('publicaties','Publicaties',function(p){
  p.className='paneel vol';
  p.innerHTML='<iframe src="publicaties.html" title="Publicaties"></iframe>';
});
registreer('generator','Carrousel-generator',function(p){
  p.className='paneel vol';
  p.innerHTML='<iframe src="../tools/apero-carousel-generator.html" title="Generator"></iframe>';
});

/* ============================================================
   MODULE: INSTAGRAM
   ============================================================ */
registreer('instagram','Instagram',async function(p){
  var ig=await probeIG();
  p.appendChild(el('div','mkop','<span class="klabel">Sociale media</span><h2>Instagram</h2><p>Plan je posts, schrijf captions met de merkbewaker, kies beeld uit de bibliotheek en publiceer. Zonder API-koppeling werkt de kopieer-en-plak-flow; met koppeling post je rechtstreeks.</p>'));

  var kop=el('div','knoprij');
  kop.appendChild(knop('+ Nieuwe post','terra',function(){bewerkIG(null)}));
  kop.appendChild(knop('Exporteer planning','geest',function(){download('apero-instagram-planning.json',LS.get('ig',[]))}));
  var st=el('span','status '+(ig===true?'ok':(ig===false?'uit':'')));
  st.innerHTML='<i></i>'+(ig===true?'API-koppeling actief':(ig===false?'Nog geen API-koppeling (handmatige flow actief)':'Koppelingstatus onbekend (lokaal)'));
  st.style.marginLeft='auto';kop.appendChild(st);
  p.appendChild(kop);

  var lijstEl=el('div');lijstEl.style.marginTop='18px';p.appendChild(lijstEl);
  tekenIGLijst(lijstEl);

  var koppel=el('div','kaart zacht');koppel.style.marginTop='20px';
  koppel.innerHTML='<span class="klabel kl">Koppeling</span><h3>Rechtstreeks posten via de Instagram API</h3>'+
    '<p>De achterkant staat klaar (api/instagram-publish). Wat er nog moet gebeuren, één keer:</p>'+
    '<ol style="font-size:13px;color:var(--ink-70);line-height:1.8;margin:10px 0 0 18px">'+
    '<li>Zet @apero.festival om naar een <b>Professioneel account</b> (Instagram-instellingen).</li>'+
    '<li>Koppel het aan een Facebook-pagina in <b>Meta Business Suite</b>.</li>'+
    '<li>Maak op developers.facebook.com een app met <b>instagram_content_publish</b>.</li>'+
    '<li>Genereer een long-lived token en zet in Vercel: <code>META_IG_TOKEN</code> en <code>META_IG_USER_ID</code>.</li></ol>'+
    '<p style="margin-top:10px">Daarna verschijnt bij elke post een "Publiceer nu"-knop. Tot die tijd: caption kopiëren, beeld downloaden, plakken in de app. Werkt net zo goed.</p>';
  p.appendChild(koppel);

  var bieb=el('div','kaart');bieb.style.marginTop='16px';
  bieb.innerHTML='<span class="klabel kl">Mediabibliotheek</span><h3>Beeld voor posts</h3><p>Klik om de publieke URL te kopiëren (nodig voor de API, handig voor alles).</p>';
  mediaGrid(bieb);
  p.appendChild(bieb);

  window._nieuweIG=function(){bewerkIG(null)};
});

function tekenIGLijst(container){
  var q=LS.get('ig',[]).sort(function(a,b){return (a.datum||'9')<(b.datum||'9')?-1:1});
  container.innerHTML='';
  if(!q.length){container.appendChild(el('div','leeg','<span class="flower"></span><h4>Nog geen posts gepland</h4><p>Maak je eerste post: kies beeld, schrijf de caption met de merkbewaker, en plan hem in.</p>'));return}
  q.forEach(function(post){
    var k=el('div','igpost');
    var chip=post.status==='gepost'?'salvia':(post.status==='klaar'?'burro':'');
    k.innerHTML='<div class="igr">'+(post.beeld?'<img class="igbeeld" src="'+esc(post.beeld)+'">':'<div class="igbeeld"></div>')+
      '<div class="igtekst"><div class="igcap">'+esc(post.caption||'(nog geen caption)')+'</div>'+
      '<div class="igmeta"><span class="chip '+chip+'">'+esc(post.status)+'</span><span>'+(post.datum?datumNL(post.datum):'geen datum')+'</span><span>'+(post.caption||'').length+' tekens</span></div></div></div>';
    var rij=el('div','knoprij');
    rij.appendChild(knop('Bewerk','geest klein',function(){bewerkIG(post.id)}));
    rij.appendChild(knop('Kopieer caption','geest klein',function(){kopieer((post.caption||'')+(post.hashtags?'\n\n'+post.hashtags:''),'Caption gekopieerd, plak hem in Instagram')}));
    if(post.status!=='gepost')rij.appendChild(knop('Markeer gepost','geest klein',function(){post.status='gepost';LS.set('ig',q);tekenIGLijst(container);tellers()}));
    rij.appendChild(knop('Verwijder','geest klein',function(){if(!confirm('Post verwijderen?'))return;LS.set('ig',q.filter(function(x){return x.id!==post.id}));tekenIGLijst(container);tellers()}));
    k.appendChild(rij);
    container.appendChild(k);
  });
}

function bewerkIG(id){
  var q=LS.get('ig',[]);
  var post=q.find(function(x){return x.id===id})||{id:uid(),datum:vandaag(),caption:'',hashtags:HASHTAGS.merk,beeld:'',status:'concept'};
  modaal(id?'Post bewerken':'Nieuwe Instagram-post',function(b){
    b.innerHTML='<div class="veld"><label>Datum</label><input type="date" id="igDatum" value="'+esc(post.datum)+'"></div>'+
      '<div class="veld"><label>Caption</label><textarea id="igCap" rows="7" placeholder="Schrijf zoals APÉRO praat: warm, concreet, je-vorm.">'+esc(post.caption)+'</textarea>'+
      '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--ink-50);margin-top:5px"><span id="igTel"></span><span id="igEerste"></span></div>'+
      '<div class="lint" id="igLint"></div></div>'+
      '<div class="veld"><label>Hashtags (set)</label><select id="igSet">'+Object.keys(HASHTAGS).map(function(k){return '<option value="'+k+'">'+k+'</option>'}).join('')+'</select></div>'+
      '<div class="veld"><label>Hashtags</label><input id="igTags" value="'+esc(post.hashtags||'')+'"></div>'+
      '<div class="veld"><label>Status</label><select id="igStatus"><option'+(post.status==='concept'?' selected':'')+'>concept</option><option'+(post.status==='klaar'?' selected':'')+'>klaar</option><option'+(post.status==='gepost'?' selected':'')+'>gepost</option></select></div>'+
      '<div class="veld"><label>Beeld</label><div id="igBieb"></div></div>'+
      '<div class="knoprij" id="igActies"></div>';
    var cap=$('igCap');
    function tel(){
      var t=cap.value;$('igTel').textContent=t.length+' / 2200 tekens';
      $('igEerste').textContent='zichtbaar vóór "meer": '+Math.min(t.length,125)+'/125';
      var l=$('igLint');l.innerHTML='';
      var meldingen=lint(t);
      if(!t){l.innerHTML=''}
      else if(!meldingen.length)l.appendChild(el('div','melding ok','&#10003; Caption klinkt als APÉRO'));
      else meldingen.forEach(function(m){l.appendChild(el('div','melding','&#9888; '+m))});
    }
    cap.addEventListener('input',tel);tel();
    $('igSet').value=Object.keys(HASHTAGS).find(function(k){return HASHTAGS[k]===post.hashtags})||'merk';
    $('igSet').onchange=function(){$('igTags').value=HASHTAGS[this.value]};
    mediaGrid($('igBieb'),{gekozen:post.beeld,onKies:function(a){post.beeld=a.pad}});
    var acties=$('igActies');
    acties.appendChild(knop('Bewaar','terra',async function(){
      post.datum=$('igDatum').value;post.caption=cap.value;post.hashtags=$('igTags').value;post.status=$('igStatus').value;
      if(!q.find(function(x){return x.id===post.id}))q.push(post);
      LS.set('ig',q);sluitModaal();toast('Post bewaard');tellers();
      var lijst=document.querySelector('.igpost');render();
    }));
    var igOk=PROBES.ig===true;
    var pub=knop(igOk?'Publiceer nu via API':'Publiceer nu (koppeling nog uit)','geest',async function(){
      if(!post.beeld){toast('Kies eerst een beeld');return}
      var r=await fetch('../api/instagram-publish',{method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({imageUrl:location.origin+post.beeld.replace('..',''),caption:cap.value+'\n\n'+$('igTags').value})});
      var j=await r.json().catch(function(){return{}});
      if(j.ok){post.status='gepost';LS.set('ig',q);toast('Gepost op Instagram!');sluitModaal();render()}
      else toast(j.error||'Publiceren mislukte');
    });
    if(!igOk)pub.setAttribute('disabled','');
    acties.appendChild(pub);
  });
}

/* ============================================================
   MODULE: PARTNERS
   ============================================================ */
registreer('partners','Partners',async function(p){
  var d=await laadPartners();
  p.appendChild(el('div','mkop','<span class="klabel">Festival</span><h2>Partners</h2><p>Van eerste gesprek tot bar op het festival. Elke partner kan een eigen login krijgen voor het portaal op <b>/partner/</b>, waar ze hun planning, checklist en materiaal zien.</p>'));

  var kop=el('div','knoprij');
  kop.appendChild(knop('+ Nieuwe partner','terra',function(){bewerkPartner(null)}));
  kop.appendChild(knop('Logins beheren','geest',loginBeheer));
  kop.appendChild(knop('Exporteer partners.json','geest',function(){var kopie=JSON.parse(JSON.stringify(PARTNERS));delete kopie._lokaal;download('partners.json',kopie)}));
  if(d._lokaal)kop.appendChild(knop('Reset naar repo-versie','geest',function(){if(!confirm('Lokale wijzigingen weggooien en opnieuw laden uit de repo?'))return;LS.del('partners');PARTNERS=null;render()}));
  p.appendChild(kop);
  if(d._lokaal)p.appendChild(el('p','','<span class="chip burro">lokale wijzigingen</span> <span style="font-size:12px;color:var(--ink-50)">Bewaard in deze browser. Exporteer partners.json en commit hem (of vraag Claude) om ze definitief te maken.</span>')).style.marginTop='10px';

  var echte=(d.partners||[]).filter(function(x){return x.slug!=='voorbeeldpartner'});
  var lijst=el('div','kaart');lijst.style.marginTop='16px';
  lijst.innerHTML='<span class="klabel kl">Pipeline</span><h3>Alle partners</h3>';
  if(!echte.length){
    lijst.appendChild(el('div','leeg','<span class="flower"></span><h4>Nog geen partners in de pipeline</h4><p>Voeg je eerste partner toe. Vanaf status "akkoord" telt hij mee op het overzicht en kan hij een portaal-login krijgen.</p>'));
  } else {
    var tb=el('table','tabel');
    tb.innerHTML='<tr><th>Partner</th><th>Wereld</th><th>Status</th><th>Checklist</th><th></th></tr>';
    echte.forEach(function(pt){
      var af=pt.deliverables.filter(function(x){return x.af}).length;
      var r=el('tr','','<td><b>'+esc(pt.naam)+'</b><br><span style="font-size:11px;color:var(--ink-50)">'+esc(pt.contact&&pt.contact.mail||'')+'</span></td>'+
        '<td>'+esc(WERELD_NAMEN[pt.wereld]||pt.wereld)+'</td>'+
        '<td><span class="chip '+(pt.status==='live'?'salvia':(pt.status==='akkoord'?'terra':''))+'">'+esc(pt.status)+'</span></td>'+
        '<td style="min-width:120px"><div class="balk"><i style="width:'+Math.round(af/Math.max(1,pt.deliverables.length)*100)+'%"></i></div><span style="font-size:10.5px;color:var(--ink-50)">'+af+'/'+pt.deliverables.length+'</span></td><td></td>');
      var td=r.lastChild;
      td.appendChild(knop('Open','geest klein',function(){bewerkPartner(pt.slug)}));
      tb.appendChild(r);
    });
    lijst.appendChild(tb);
  }
  p.appendChild(lijst);

  var slots=el('div','kaart');slots.style.marginTop='16px';
  slots.innerHTML='<span class="klabel kl">De zes bars</span><h3>Wereldslots</h3>';
  var sg=el('div','grid k3');sg.style.marginTop='10px';
  (d.wereldSlots||[]).forEach(function(s){
    var pt=(d.partners||[]).find(function(x){return x.slug===s.partner});
    sg.appendChild(el('div','kaart zacht','<span class="klabel kl">'+esc(s.bar)+'</span><h3 style="font-size:15px">'+esc(WERELD_NAMEN[s.wereld])+'</h3><p>'+esc(s.serve)+'</p><p style="margin-top:8px">'+(pt?'<span class="chip terra">'+esc(pt.naam)+'</span>':'<span class="chip">slot open</span>')+'</p>'));
  });
  slots.appendChild(sg);
  p.appendChild(slots);

  window._nieuwePartner=function(){bewerkPartner(null)};
});

function bewerkPartner(slug){
  var d=PARTNERS;
  var pt=(d.partners||[]).find(function(x){return x.slug===slug});
  var nieuw=!pt;
  if(!pt)pt={slug:'',naam:'',wereld:'italie',status:'lead',contact:{naam:'',mail:'',telefoon:''},
    deal:{format:'bar binnen een wereld',bijdrage:'',notities:''},
    deliverables:[{t:'Kennismakingsgesprek',af:false},{t:'Voorstel gestuurd',af:false},{t:'Handtekening / akkoord',af:false},{t:'Logo + merkmateriaal ontvangen',af:false},{t:'Productinformatie voor magazine/lexicon',af:false},{t:'Barplan + signature serve afgestemd',af:false},{t:'Vermelding op partnerpagina live',af:false}],
    portaal:{welkom:'Welkom bij APÉRO. Hier volg je alles rond onze samenwerking.',documenten:[]}};
  modaal(nieuw?'Nieuwe partner':pt.naam,function(b){
    b.innerHTML='<div class="veld"><label>Naam</label><input id="pNaam" value="'+esc(pt.naam)+'"></div>'+
      '<div class="grid k2"><div class="veld"><label>Slug (= loginnaam)</label><input id="pSlug" value="'+esc(pt.slug)+'" '+(nieuw?'':'disabled')+' placeholder="bv. barbayanni"></div>'+
      '<div class="veld"><label>Wereld</label><select id="pWereld">'+Object.keys(WERELD_NAMEN).map(function(w){return '<option value="'+w+'"'+(pt.wereld===w?' selected':'')+'>'+WERELD_NAMEN[w]+'</option>'}).join('')+'</select></div></div>'+
      '<div class="grid k2"><div class="veld"><label>Status</label><select id="pStatus">'+(d.meta.statussen||[]).map(function(s){return '<option'+(pt.status===s?' selected':'')+'>'+s+'</option>'}).join('')+'</select></div>'+
      '<div class="veld"><label>Koppel aan wereldslot</label><select id="pSlot"><option value="">niet gekoppeld</option>'+(d.wereldSlots||[]).map(function(s){return '<option value="'+s.wereld+'"'+(s.partner===pt.slug&&pt.slug?' selected':'')+'>'+esc(s.bar)+'</option>'}).join('')+'</select></div></div>'+
      '<div class="grid k2"><div class="veld"><label>Contactpersoon</label><input id="pCNaam" value="'+esc(pt.contact.naam)+'"></div>'+
      '<div class="veld"><label>Mail</label><input id="pCMail" value="'+esc(pt.contact.mail)+'"></div></div>'+
      '<div class="veld"><label>Dealformat</label><input id="pFormat" value="'+esc(pt.deal.format)+'"></div>'+
      '<div class="veld"><label>Notities</label><textarea id="pNotities" rows="3">'+esc(pt.deal.notities)+'</textarea></div>'+
      '<div class="veld"><label>Checklist</label><div id="pChecks"></div><div class="knoprij"><input id="pNieuwCheck" placeholder="Nieuw punt&hellip;" style="flex:1;font-family:var(--body);font-size:13px;border:1px solid var(--line);border-radius:8px;padding:9px 12px;background:var(--panna)"><button class="knop geest klein" id="pVoegCheck">Voeg toe</button></div></div>'+
      '<div class="veld"><label>Welkomsttekst portaal</label><textarea id="pWelkom" rows="2">'+esc(pt.portaal.welkom)+'</textarea></div>'+
      '<div class="knoprij" id="pActies"></div>';
    function tekenChecks(){
      var c=$('pChecks');c.innerHTML='';
      pt.deliverables.forEach(function(it,i){
        var lab=el('label','check'+(it.af?' af':''));
        lab.innerHTML='<input type="checkbox"'+(it.af?' checked':'')+'><span style="flex:1">'+esc(it.t)+'</span><button style="color:var(--ink-30);font-size:15px" title="verwijder">&times;</button>';
        lab.querySelector('input').onchange=function(){it.af=this.checked;lab.classList.toggle('af',it.af)};
        lab.querySelector('button').onclick=function(e){e.preventDefault();pt.deliverables.splice(i,1);tekenChecks()};
        c.appendChild(lab);
      });
    }
    tekenChecks();
    $('pVoegCheck').onclick=function(){var v=$('pNieuwCheck').value.trim();if(!v)return;pt.deliverables.push({t:v,af:false});$('pNieuwCheck').value='';tekenChecks()};
    var acties=$('pActies');
    acties.appendChild(knop('Bewaar','terra',function(){
      pt.naam=$('pNaam').value.trim();
      if(nieuw){pt.slug=($('pSlug').value.trim()||pt.naam).toLowerCase().replace(/[^a-z0-9]+/g,'-')}
      if(!pt.naam||!pt.slug){toast('Naam en slug zijn verplicht');return}
      pt.wereld=$('pWereld').value;pt.status=$('pStatus').value;
      pt.contact.naam=$('pCNaam').value;pt.contact.mail=$('pCMail').value;
      pt.deal.format=$('pFormat').value;pt.deal.notities=$('pNotities').value;
      pt.portaal.welkom=$('pWelkom').value;
      if(nieuw)d.partners.push(pt);
      var slotW=$('pSlot').value;
      (d.wereldSlots||[]).forEach(function(s){if(s.partner===pt.slug)s.partner=null;if(slotW&&s.wereld===slotW)s.partner=pt.slug});
      bewaarPartners();sluitModaal();toast('Partner bewaard (lokaal). Exporteer + commit om definitief te maken.');render();
    }));
    if(!nieuw){
      acties.appendChild(knop('Bekijk portaal','geest',function(){window.open('../partner/?preview='+encodeURIComponent(pt.slug),'_blank')}));
      acties.appendChild(knop('Verwijder','geest',function(){if(!confirm('Partner "'+pt.naam+'" verwijderen?'))return;
        d.partners=d.partners.filter(function(x){return x.slug!==pt.slug});
        (d.wereldSlots||[]).forEach(function(s){if(s.partner===pt.slug)s.partner=null});
        bewaarPartners();sluitModaal();render()}));
    }
  });
}

function loginBeheer(){
  var d=PARTNERS;
  var echte=(d.partners||[]).filter(function(x){return x.slug!=='voorbeeldpartner'});
  modaal('Partner-logins',function(b){
    b.innerHTML='<p style="font-size:13.5px;line-height:1.7;color:var(--ink-70)">Partners loggen in op <b>'+location.origin+'/partner/</b> met hun slug als gebruikersnaam. De wachtwoorden staan veilig in Vercel (env-var <code>PARTNER_AUTH</code>), niet in de repo.</p>'+
      '<div class="veld" style="margin-top:14px"><label>Genereer per partner een wachtwoord</label><div id="lgLijst"></div></div>'+
      '<div class="veld"><label>Plak dit in Vercel als PARTNER_AUTH</label><textarea id="lgEnv" rows="3" readonly placeholder="klik eerst op genereren"></textarea></div>'+
      '<div class="knoprij" id="lgActies"></div>'+
      '<p style="font-size:12px;color:var(--ink-50);margin-top:12px">Vercel → project apero-website → Settings → Environment Variables → PARTNER_AUTH → Save → Redeploy. Stuur elke partner daarna zijn eigen login (nooit de hele string).</p>';
    var lijst=$('lgLijst');var ww={};
    if(!echte.length)lijst.innerHTML='<div class="leeg" style="padding:18px"><p>Nog geen partners. Voeg eerst een partner toe.</p></div>';
    echte.forEach(function(pt){
      var r=el('div','','<b style="font-size:13px">'+esc(pt.naam)+'</b> <span style="color:var(--ink-50);font-size:12px">('+esc(pt.slug)+')</span> <code id="ww-'+esc(pt.slug)+'" style="margin-left:8px;font-size:12px"></code>');
      r.style.padding='7px 0';
      lijst.appendChild(r);
    });
    var acties=$('lgActies');
    acties.appendChild(knop('Genereer wachtwoorden','terra',function(){
      echte.forEach(function(pt){ww[pt.slug]=wachtwoord(16);var c=document.getElementById('ww-'+pt.slug);if(c)c.textContent=ww[pt.slug]});
      $('lgEnv').value=echte.map(function(pt){return pt.slug+':'+ww[pt.slug]}).join(';');
    }));
    acties.appendChild(knop('Kopieer env-waarde','geest',function(){if(!$('lgEnv').value){toast('Genereer eerst');return}kopieer($('lgEnv').value,'PARTNER_AUTH gekopieerd')}));
  });
}

/* ============================================================
   MODULE: TICKETSHOP
   ============================================================ */
registreer('tickets','Ticketshop',function(p){
  var t=LS.get('tickets',{types:[
      {naam:'Regulier',prijs:27.5,cap:800,info:'Toegang + welkomstglas'},
      {naam:'Vroege vogel',prijs:22.5,cap:200,info:'Eerste lichting, beperkt'},
      {naam:'Zonder alcohol',prijs:22.5,cap:150,info:'Volwaardig alcoholvrij programma'}
    ],verkoopstart:'',maxPerBestelling:6,draaiboek:{}});
  function bewaar(){LS.set('tickets',t)}

  p.appendChild(el('div','mkop','<span class="klabel">Festival</span><h2>Ticketshop</h2><p>De achterkant van de kaartverkoop. De verkoop is nog niet live; hier staat alles klaar zodat de knop om kan zodra datum en locatie rond zijn. We hergebruiken de bewezen kaartverkoop-stack van Nacht van de Wijn (eigen shop, Mollie, scanner, mails).</p>'));

  var g=el('div','grid k3');
  var cap=t.types.reduce(function(s,x){return s+(+x.cap||0)},0);
  var omzet=t.types.reduce(function(s,x){return s+(+x.cap||0)*(+x.prijs||0)},0);
  g.appendChild(el('div','kaart','<span class="cijfer klein">niet live</span><div class="cijfsub">verkoopstatus</div>'));
  g.appendChild(el('div','kaart','<span class="cijfer klein">'+cap+'</span><div class="cijfsub">capaciteit (alle types)</div>'));
  g.appendChild(el('div','kaart','<span class="cijfer klein">&euro; '+Math.round(omzet).toLocaleString('nl-NL')+'</span><div class="cijfsub">potentieel bij uitverkocht</div>'));
  p.appendChild(g);

  var types=el('div','kaart');types.style.marginTop='16px';
  types.innerHTML='<span class="klabel kl">Instellingen</span><h3>Tickettypes</h3>';
  var tb=el('table','tabel');
  function tekenTypes(){
    tb.innerHTML='<tr><th>Naam</th><th>Prijs &euro;</th><th>Capaciteit</th><th>Omschrijving</th><th></th></tr>';
    t.types.forEach(function(x,i){
      var r=el('tr');
      function inp(v,key,type){var c=el('td');var f=el('input');f.type=type||'text';f.value=v;
        f.style.cssText='width:100%;font-family:var(--body);font-size:13px;border:1px solid transparent;background:transparent;padding:4px;border-radius:6px';
        f.onfocus=function(){f.style.borderColor='var(--line)';f.style.background='var(--panna)'};
        f.onblur=function(){f.style.borderColor='transparent';f.style.background='transparent';x[key]=type==='number'?+f.value:f.value;bewaar();render()};
        c.appendChild(f);return c}
      r.appendChild(inp(x.naam,'naam'));r.appendChild(inp(x.prijs,'prijs','number'));r.appendChild(inp(x.cap,'cap','number'));r.appendChild(inp(x.info,'info'));
      var td=el('td');td.appendChild(knop('&times;','geest klein',function(){t.types.splice(i,1);bewaar();render()}));r.appendChild(td);
      tb.appendChild(r);
    });
  }
  tekenTypes();types.appendChild(tb);
  var tk=el('div','knoprij');
  tk.appendChild(knop('+ Tickettype','geest klein',function(){t.types.push({naam:'Nieuw type',prijs:0,cap:0,info:''});bewaar();render()}));
  tk.appendChild(knop('Exporteer configuratie','geest klein',function(){download('apero-tickets-config.json',t)}));
  types.appendChild(tk);
  p.appendChild(types);

  var g2=el('div','grid k2');g2.style.marginTop='16px';
  var verkoop=el('div','kaart');
  verkoop.innerHTML='<span class="klabel kl">Verkoopinstellingen</span><h3>Regels</h3>'+
    '<div class="veld"><label>Geplande verkoopstart</label><input type="date" id="tkStart" value="'+esc(t.verkoopstart)+'"></div>'+
    '<div class="veld"><label>Max. tickets per bestelling</label><input type="number" id="tkMax" value="'+t.maxPerBestelling+'"></div>';
  g2.appendChild(verkoop);
  setTimeout(function(){
    $('tkStart').onchange=function(){t.verkoopstart=this.value;bewaar()};
    $('tkMax').onchange=function(){t.maxPerBestelling=+this.value;bewaar()};
  },0);

  var orders=el('div','kaart');
  orders.innerHTML='<span class="klabel kl">Bestellingen</span><h3>Orders &amp; omzet</h3>';
  orders.appendChild(el('div','leeg','<span class="flower"></span><h4>Nog geen verkoop</h4><p>Zodra de shop live gaat verschijnen hier bestellingen, dagomzet en scanstatistieken, zoals bij Nacht van de Wijn.</p>'));
  g2.appendChild(orders);
  p.appendChild(g2);

  var db=el('div','kaart');db.style.marginTop='16px';
  db.innerHTML='<span class="klabel kl">Go-live draaiboek</span><h3>Wat er moet gebeuren vóór de verkoop opent</h3>';
  var punten=['Datum en locatie definitief','Mollie-organisatie aanmaken (of NvdW-account uitbreiden)','Shop-frontend bouwen op festival.html (NvdW-stack klonen)','Orderdatabase + e-ticketmail met QR','Scanner-app gereedmaken','Testbestelling + refund-flow testen','Servicekosten en voorwaarden vaststellen','Capaciteiten definitief zetten'];
  var dl=el('div');
  punten.forEach(function(tk2,i){
    var lab=el('label','check'+(t.draaiboek[i]?' af':''));
    lab.innerHTML='<input type="checkbox"'+(t.draaiboek[i]?' checked':'')+'><span>'+tk2+'</span>';
    lab.querySelector('input').onchange=function(){t.draaiboek[i]=this.checked;lab.classList.toggle('af',this.checked);bewaar()};
    dl.appendChild(lab);
  });
  db.appendChild(dl);
  p.appendChild(db);
});

/* ============================================================
   MODULE: STATISTIEKEN
   ============================================================ */
registreer('stats','Statistieken',async function(p){
  var c=await laadContent();
  p.appendChild(el('div','mkop','<span class="klabel">Inzicht</span><h2>Statistieken</h2><p>Wat we nu al echt kunnen meten, en wat er klaarstaat om aan te zetten. Geen fantasiecijfers: elke kaart zegt waar zijn data vandaan komt.</p>'));

  var g=el('div','grid k2');

  // content-analytics (echt)
  var ca=el('div','kaart');
  ca.innerHTML='<span class="klabel kl">Bron: content.json (echt)</span><h3>Redactiestatistiek</h3>';
  var per={},them={};c.items.forEach(function(i){per[i.status]=(per[i.status]||0)+1;them[i.thema||'?']=(them[i.thema||'?']||0)+1});
  var st=el('div');st.style.cssText='display:flex;flex-direction:column;gap:8px;margin-top:8px';
  Object.keys(per).sort(function(a,b){return per[b]-per[a]}).forEach(function(k){
    var pct=Math.round(per[k]/c.items.length*100);
    st.appendChild(el('div','','<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><b>'+esc(k)+'</b><span>'+per[k]+'</span></div><div class="balk"><i style="width:'+pct+'%"></i></div>'));
  });
  ca.appendChild(st);
  g.appendChild(ca);

  var th=el('div','kaart');
  th.innerHTML='<span class="klabel kl">Bron: content.json (echt)</span><h3>Per thema</h3>';
  var tg=el('div');tg.style.cssText='display:flex;flex-direction:column;gap:8px;margin-top:8px';
  var max=Math.max.apply(null,Object.values(them));
  Object.keys(them).sort(function(a,b){return them[b]-them[a]}).forEach(function(k){
    tg.appendChild(el('div','','<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><b>'+esc(k)+'</b><span>'+them[k]+'</span></div><div class="balk"><i style="width:'+Math.round(them[k]/max*100)+'%;background:var(--salvia)"></i></div>'));
  });
  th.appendChild(tg);
  g.appendChild(th);
  p.appendChild(g);

  var g2=el('div','grid k2');g2.style.marginTop='16px';

  // web analytics
  var wa=el('div','kaart');
  wa.innerHTML='<span class="klabel kl">Bezoekers</span><h3>Web analytics</h3><div id="waStatus" style="margin:8px 0 10px"></div>'+
    '<p>De meetscript-tag staat al op elke pagina. Aanzetten kost één klik: Vercel → project <b>apero-website</b> → tab <b>Analytics</b> → Enable. Vanaf dat moment zie je bezoekers, populaire pagina\'s en herkomst, privacyvriendelijk zonder cookies.</p>'+
    '<div class="knoprij"><a class="knop geest klein" href="https://vercel.com" target="_blank">Open Vercel &rarr;</a></div>';
  g2.appendChild(wa);
  probeAnalytics().then(function(v){
    var s=$('waStatus');if(!s)return;
    s.innerHTML='<span class="status '+(v===true?'ok':(v===false?'uit':''))+'"><i></i>'+(v===true?'Analytics actief: cijfers staan in Vercel':(v===false?'Nog niet aangezet':'Status onbekend (lokaal)'))+'</span>';
  });

  // leesdata dit apparaat (echt)
  var ld=el('div','kaart');
  var prog={},bm={};
  try{prog=JSON.parse(localStorage.getItem('apero_prog'))||{}}catch(e){}
  try{bm=JSON.parse(localStorage.getItem('apero_bm'))||{}}catch(e){}
  var keys=Object.keys(prog);
  var gelezen=keys.filter(function(k){return prog[k]>=.92}).length;
  ld.innerHTML='<span class="klabel kl">Bron: dit apparaat (echt)</span><h3>Jouw leesgedrag in de app</h3>'+
    '<p>De app bewaart leesvoortgang lokaal per apparaat. Dit is wat déze browser gelezen heeft, een voorproefje van wat straks geaggregeerd kan.</p>'+
    '<div class="grid k3" style="margin-top:12px">'+
    '<div><span class="cijfer klein">'+gelezen+'</span><div class="cijfsub">uitgelezen</div></div>'+
    '<div><span class="cijfer klein">'+(keys.length-gelezen)+'</span><div class="cijfsub">begonnen</div></div>'+
    '<div><span class="cijfer klein">'+Object.keys(bm).length+'</span><div class="cijfsub">bladwijzers</div></div></div>';
  g2.appendChild(ld);
  p.appendChild(g2);

  var rm=el('div','kaart zacht');rm.style.marginTop='16px';
  rm.innerHTML='<span class="klabel kl">Volgende stap</span><h3>Geaggregeerde lezersstatistiek</h3><p>Wil je wéten welke artikelen het best gelezen worden over alle lezers heen, dan hangen we een klein telpunt (Supabase) achter de app: per artikel geopend/uitgelezen, anoniem, zonder cookies. Bouwen we zodra jij het sein geeft; de app is er al op voorbereid met zijn voortgangsmodel.</p>';
  p.appendChild(rm);
});

/* ============================================================
   MODULE: FESTIVAL / DRAAIBOEK
   ============================================================ */
var DRAAIBOEK=[
  {fase:'Fundament',items:['Datum definitief kiezen','Locatie Noorderpark aanvragen/bevestigen','Vergunningstraject starten bij gemeente Utrecht','Begroting v1 opstellen','Verzekering regelen']},
  {fase:'Partners & bars',items:['Zes wereldslots invullen met partners','Signature serves definitief per bar','Alcoholvrije variant per wereld vastleggen','Partnercontracten getekend','Partnerportaal-logins versturen']},
  {fase:'Programma',items:['Masterclass-line-up per wereld','Talks met makers en importeurs boeken','Podcast live-opname plannen','Wijnbiecht-format uitwerken','Lange tafel: catering en dekking']},
  {fase:'Productie',items:['Barbouw en inrichting per wereld','Techniek: geluid en licht','Bewegwijzering in huisstijl','Glaswerk en logistiek','Crew en vrijwilligers']},
  {fase:'Marketing',items:['Campagnekalender vanaf 6 maanden vooraf','Editie-releases koppelen aan festivalmomenten','Instagram-cadans opvoeren','Persbericht en perslijst','Partnercommunicatie-pakket']},
  {fase:'Kaartverkoop',items:['Ticketshop live (zie Ticketshop-module)','Prijsstrategie en vroege-vogel-moment','Capaciteitsbewaking','Scanplan voor de dag zelf']}
];
registreer('festival','Draaiboek',async function(p){
  var d=await laadPartners();
  var fest=LS.get('festdatum','2027-06-21');
  var db=LS.get('draaiboek',{});
  var dagen=Math.max(0,Math.ceil((new Date(fest)-new Date())/86400000));

  p.appendChild(el('div','mkop','<span class="klabel">Festival · Utrecht · MMXXVII</span><h2>Het draaiboek</h2><p>Van fundament tot festivaldag, in zes fases. Vink af wat gedaan is; alles wordt in deze browser bewaard en telt mee op het overzicht.</p>'));

  var kop=el('div','grid k2');
  var cd=el('div','kaart');
  cd.innerHTML='<span class="klabel kl">Aftellen</span><h3>Richtdatum</h3><span class="cijfer">'+dagen+'</span><div class="cijfsub">dagen te gaan</div>'+
    '<div class="veld" style="margin-top:12px"><label>Pas de richtdatum aan</label><input type="date" id="festDatum" value="'+fest+'"></div>';
  kop.appendChild(cd);
  var tot=0,af=0;DRAAIBOEK.forEach(function(f,fi){f.items.forEach(function(_,ii){tot++;if(db[fi+'.'+ii])af++})});
  kop.appendChild(el('div','kaart','<span class="klabel kl">Voortgang</span><h3>Alles bij elkaar</h3><span class="cijfer">'+Math.round(af/tot*100)+'%</span><div class="cijfsub">'+af+' van '+tot+' punten</div><div class="balk" style="margin-top:12px"><i style="width:'+Math.round(af/tot*100)+'%"></i></div>'));
  p.appendChild(kop);
  setTimeout(function(){$('festDatum').onchange=function(){LS.set('festdatum',this.value);render()}},0);

  var fg=el('div','grid k2');fg.style.marginTop='16px';
  DRAAIBOEK.forEach(function(f,fi){
    var k=el('div','kaart');
    var fAf=f.items.filter(function(_,ii){return db[fi+'.'+ii]}).length;
    k.innerHTML='<span class="klabel kl">Fase '+(fi+1)+'</span><h3>'+f.fase+'</h3><div class="balk" style="margin:8px 0 10px"><i style="width:'+Math.round(fAf/f.items.length*100)+'%"></i></div>';
    f.items.forEach(function(it,ii){
      var key=fi+'.'+ii;
      var lab=el('label','check'+(db[key]?' af':''));
      lab.innerHTML='<input type="checkbox"'+(db[key]?' checked':'')+'><span>'+it+'</span>';
      lab.querySelector('input').onchange=function(){db[key]=this.checked;LS.set('draaiboek',db);lab.classList.toggle('af',this.checked)};
      k.appendChild(lab);
    });
    fg.appendChild(k);
  });
  p.appendChild(fg);

  var bars=el('div','kaart');bars.style.marginTop='16px';
  bars.innerHTML='<span class="klabel kl">De zes bars</span><h3>Slotstatus</h3>';
  var bt=el('table','tabel');bt.innerHTML='<tr><th>Bar</th><th>Serve</th><th>Partner</th></tr>';
  (d.wereldSlots||[]).forEach(function(s){
    var pt=(d.partners||[]).find(function(x){return x.slug===s.partner});
    bt.appendChild(el('tr','','<td><b>'+esc(s.bar)+'</b></td><td>'+esc(s.serve)+'</td><td>'+(pt?'<span class="chip terra">'+esc(pt.naam)+'</span>':'<span class="chip">open</span>')+'</td>'));
  });
  bars.appendChild(bt);
  p.appendChild(bars);
});

/* ============================================================
   MODULE: MERK & ASSETS
   ============================================================ */
registreer('merk','Merk & assets',function(p){
  p.appendChild(el('div','mkop','<span class="klabel">Identiteit</span><h2>Merk &amp; assets</h2><p>Alles wat je nodig hebt om on-brand te blijven: kleuren, letters, logo\'s, schrijfregels en kant-en-klare teksten. Klik om te kopiëren.</p>'));

  var kleuren=[['Panna','#F4EAD6','achtergrond, rust'],['Panna 2','#EBDCBE','kaarten, zacht'],['Terracotta','#C45F38','accenten, knoppen'],['Mattone','#9E4326','links, donker accent'],['Burro','#EEB24A','warm geel, chips'],['Salvia','#8C9A6A','groen, succes'],['Espresso','#231B13','tekst, nacht']];
  var kk=el('div','kaart');
  kk.innerHTML='<span class="klabel kl">Palet</span><h3>Kleuren</h3>';
  var kg=el('div','grid k4');kg.style.marginTop='10px';
  kleuren.forEach(function(k){
    var c=el('div','kleur','<div class="vlak" style="background:'+k[1]+'"></div><div class="kinfo"><b>'+k[0]+'</b><span>'+k[1]+' · '+k[2]+'</span></div>');
    c.onclick=function(){kopieer(k[1],k[0]+' '+k[1]+' gekopieerd')};
    kg.appendChild(c);
  });
  kk.appendChild(kg);
  p.appendChild(kk);

  var g=el('div','grid k2');g.style.marginTop='16px';
  g.appendChild(el('div','kaart','<span class="klabel kl">Typografie</span><h3>Letters</h3>'+
    '<p style="font-family:var(--disp);font-size:22px;font-weight:800;margin:8px 0 2px">Bodoni Moda</p><p>Koppen en citaten. Italic voor standfirsts en quotes. De O in het wordmark is nooit een letter maar de bloem.</p>'+
    '<p style="font-size:17px;font-weight:600;margin:14px 0 2px">Hanken Grotesk</p><p>Lopende tekst, knoppen, labels. Gewichten 400 tot 700.</p>'));
  var regels=el('div','kaart');
  regels.innerHTML='<span class="klabel kl">Schrijfregels</span><h3>Zo praat AP&Eacute;RO</h3>'+
    '<ul style="font-size:13px;color:var(--ink-70);line-height:1.9;margin:8px 0 0 18px">'+
    '<li>Warm Nederlands, <b>je-vorm</b>, nooit u.</li>'+
    '<li><b>Geen gedachtestreepjes</b> (— of –): komma of dubbele punt.</li>'+
    '<li>Wordmark leest altijd als <b>AP&Eacute;RO</b>, mét accent.</li>'+
    '<li>Onderzoek boven romantiek: concreet, met jaartallen en plaatsen.</li>'+
    '<li>De klassiekers, geen hippe dranken. Geen "proeverij".</li>'+
    '<li>De litanie mag altijd: <i>Open de avond.</i></li></ul>';
  g.appendChild(regels);
  p.appendChild(g);

  var bp=el('div','kaart');bp.style.marginTop='16px';
  bp.innerHTML='<span class="klabel kl">Boilerplates</span><h3>Kant-en-klare teksten</h3>';
  [['Instagram-bio','Een onderzoek naar de aperocultuur van Europa.\nZes werelden, één uur: dat tussen werk en diner.\nFestival in Utrecht, MMXXVII. Open de avond.'],
   ['Korte omschrijving','APÉRO Culture onderzoekt hoe Europa de avond opent: het aperitivo van Milaan, de pastis van Marseille, de vermut van Barcelona, de anijs van de Levant, de port van Porto en de muntthee van Marrakech. In MMXXVII wordt de conclusie een festival in Utrecht.'],
   ['Persregel','APÉRO is een onderzoek naar de aperocultuur van Europa dat in MMXXVII uitmondt in een festival in Utrecht: zes werelden, zes bars, één lange tafel. Een initiatief van The Grape Agency.']].forEach(function(x){
    var r=el('div','kaart zacht');r.style.marginTop='10px';
    r.innerHTML='<span class="klabel kl">'+x[0]+'</span><p style="white-space:pre-line;margin-top:6px">'+esc(x[1])+'</p>';
    var kn=el('div','knoprij');kn.appendChild(knop('Kopieer','geest klein',function(){kopieer(x[1],x[0]+' gekopieerd')}));r.appendChild(kn);
    bp.appendChild(r);
  });
  p.appendChild(bp);

  var lg=el('div','kaart');lg.style.marginTop='16px';
  lg.innerHTML='<span class="klabel kl">Logo &amp; beeld</span><h3>Downloads</h3><p>Klik om de publieke URL te kopiëren; open de URL om te downloaden.</p>';
  mediaGrid(lg);
  p.appendChild(lg);
});

/* ============================================================
   MODULE: SITE & APP
   ============================================================ */
registreer('app','Site & app',async function(p){
  p.appendChild(el('div','mkop','<span class="klabel">Beheer</span><h2>Site &amp; app</h2><p>De status van wat er live staat, en het spoorboekje voor een nieuwe editie.</p>'));

  var g=el('div','grid k3');
  var s1=el('div','kaart','<span class="klabel kl">Magazine-app</span><h3 id="appStat">Laden&hellip;</h3><p id="appSub"></p>');
  var s2=el('div','kaart','<span class="klabel kl">Cache</span><h3 id="swStat">Laden&hellip;</h3><p>Serviceworker-versie. Bump bij elke contentwijziging.</p>');
  var s3=el('div','kaart','<span class="klabel kl">Snel heen</span><h3>Links</h3><div class="knoprij">'+
    '<a class="knop geest klein" href="../index.html" target="_blank">Site</a>'+
    '<a class="knop geest klein" href="../app/" target="_blank">App</a>'+
    '<a class="knop geest klein" href="../lezen.html" target="_blank">Magazine</a>'+
    '<a class="knop geest klein" href="https://github.com/Thegrapeagency/apero-website" target="_blank">GitHub</a></div>');
  g.appendChild(s1);g.appendChild(s2);g.appendChild(s3);
  p.appendChild(g);

  try{
    var src=await (await fetch('../app/content.js')).text();
    var f=new Function(src+';return {DATA:DATA,WERELDEN:WERELDEN,LEXICON:LEXICON,QUIZ:QUIZ}');
    var d=f();
    var arts=d.DATA.edities.reduce(function(s,e){return s+e.arts.length},0);
    $('appStat').textContent=d.DATA.edities.length+' edities · '+arts+' artikelen';
    $('appSub').textContent=d.WERELDEN.length+' werelden, '+d.LEXICON.groepen.reduce(function(s,g2){return s+g2.entries.length},0)+' lexicontermen, '+d.QUIZ.vragen.length+' quizvragen aan boord.';
  }catch(e){$('appStat').textContent='Kon content.js niet lezen'}
  try{
    var sw=await (await fetch('../app/sw.js')).text();
    $('swStat').textContent=(sw.match(/VERSIE='([^']+)'/)||[])[1]||'?';
  }catch(e){$('swStat').textContent='?'}

  var rb=el('div','kaart');rb.style.marginTop='16px';
  rb.innerHTML='<span class="klabel kl">Spoorboekje</span><h3>Nieuwe editie publiceren</h3>'+
    '<ol style="font-size:13.5px;color:var(--ink-70);line-height:2;margin:10px 0 0 18px">'+
    '<li>Schrijf de artikelen (of laat Claude ze klaarzetten) en voeg de editie toe aan de <code>DATA</code> in <b>lezen.html</b>.</li>'+
    '<li>Draai <code>node tools/build-app-content.mjs</code>: de app-content wordt vers gegenereerd.</li>'+
    '<li>Verhoog <code>VERSIE</code> in <b>app/sw.js</b> (bv. v3 &rarr; v4) zodat telefoons de nieuwe content zien.</li>'+
    '<li>Voeg een editie-kaart toe op lezen.html en de homepage.</li>'+
    '<li>Commit, PR, merge: Vercel zet hem live. Of zeg gewoon "publiceer editie X" tegen Claude.</li></ol>';
  p.appendChild(rb);
});

/* ============================================================
   MODULE: INSTELLINGEN
   ============================================================ */
registreer('instellingen','Instellingen',function(p){
  p.appendChild(el('div','mkop','<span class="klabel">Beheer</span><h2>Instellingen</h2><p>De sleutels van het huis. Alle geheimen staan in Vercel (nooit in de repo); hier zie je wat er aanstaat en beheer je je lokale Studio-data.</p>'));

  var envs=[
    ['DASH_USER / DASH_PASS','Redactie-login voor Studio en API','dash'],
    ['PARTNER_AUTH','Partner-logins (slug:wachtwoord;...)','papi'],
    ['GITHUB_TOKEN + GITHUB_REPO','1-klik-opslag van content.json','save'],
    ['META_IG_TOKEN + META_IG_USER_ID','Rechtstreeks posten op Instagram','ig'],
    ['SAVE_SECRET','Extra slot op de opslag-API','']
  ];
  var ek=el('div','kaart');
  ek.innerHTML='<span class="klabel kl">Vercel env-vars</span><h3>Koppelingen</h3>';
  var tb=el('table','tabel');tb.innerHTML='<tr><th>Variabele</th><th>Doel</th><th>Status</th></tr>';
  envs.forEach(function(e2){
    var r=el('tr','','<td><code style="font-size:12px">'+e2[0]+'</code></td><td>'+e2[1]+'</td><td id="env-'+(e2[2]||'x'+Math.random().toString(36).slice(2,6))+'"><span class="status"><i></i>?</span></td>');
    tb.appendChild(r);
  });
  ek.appendChild(tb);
  ek.appendChild(el('p','','Wijzigen: Vercel &rarr; apero-website &rarr; Settings &rarr; Environment Variables, daarna redeploy.')).style.cssText='font-size:12px;color:var(--ink-50);margin-top:10px';
  p.appendChild(ek);

  function zet(id,v,tekstOk,tekstUit){var c=document.getElementById('env-'+id);if(!c)return;
    c.innerHTML='<span class="status '+(v===true?'ok':(v===false?'uit':''))+'"><i></i>'+(v===true?(tekstOk||'actief'):(v===false?(tekstUit||'uit'):'onbekend (lokaal)'))+'</span>'}
  zet('dash',true,'ingelogd');
  probePartnerAPI().then(function(v){zet('papi',v)});
  probeSave().then(function(v){zet('save',v)});
  probeIG().then(function(v){zet('ig',v)});

  var g=el('div','grid k2');g.style.marginTop='16px';
  var ww=el('div','kaart');
  ww.innerHTML='<span class="klabel kl">Gereedschap</span><h3>Wachtwoordgenerator</h3><p>Voor DASH_PASS-rotatie of nieuwe partnerlogins.</p><div class="veld" style="margin-top:10px"><input id="wwUit" readonly placeholder="klik op genereren"></div>';
  var wk=el('div','knoprij');
  wk.appendChild(knop('Genereer','terra',function(){$('wwUit').value=wachtwoord(20)}));
  wk.appendChild(knop('Kopieer','geest',function(){if($('wwUit').value)kopieer($('wwUit').value,'Wachtwoord gekopieerd')}));
  ww.appendChild(wk);
  g.appendChild(ww);

  var bk=el('div','kaart');
  bk.innerHTML='<span class="klabel kl">Lokale data</span><h3>Back-up van deze Studio</h3><p>Instagram-planning, partnerwijzigingen, draaiboek en ticketconfig leven in deze browser. Maak er af en toe een back-up van.</p>';
  var bkk=el('div','knoprij');
  bkk.appendChild(knop('Exporteer alles','terra',function(){
    var uit={};['ig','partners','tickets','draaiboek','festdatum'].forEach(function(k){var v=LS.get(k,null);if(v!=null)uit[k]=v});
    download('apero-studio-backup-'+vandaag()+'.json',uit);
  }));
  var imp=el('label','knop geest','Importeer back-up<input type="file" accept=".json" style="display:none">');
  imp.querySelector('input').onchange=function(){
    var f=this.files[0];if(!f)return;
    var r=new FileReader();
    r.onload=function(){try{var d=JSON.parse(r.result);Object.keys(d).forEach(function(k){LS.set(k,d[k])});PARTNERS=null;toast('Back-up teruggezet');render()}catch(e){toast('Geen geldige back-up')}};
    r.readAsText(f);
  };
  bkk.appendChild(imp);
  bkk.appendChild(knop('Wis lokale wijzigingen','geest',function(){
    if(!confirm('Alle lokale Studio-data wissen (planning, draaiboek, partnerwijzigingen)? De repo-versies blijven bestaan.'))return;
    ['ig','partners','tickets','draaiboek','festdatum'].forEach(function(k){LS.del(k)});PARTNERS=null;toast('Lokale data gewist');render();
  }));
  bk.appendChild(bkk);
  g.appendChild(bk);
  p.appendChild(g);
});

/* ============ command palette ============ */
var cp=$('cp'),cpScrim=$('cpScrim'),cpInput=$('cpInput'),cpLijst=$('cpLijst'),cpIdx=0,cpItems=[];
async function cpIndex(){
  var items=[];
  Object.keys(MODULES).forEach(function(id){items.push({naam:MODULES[id].titel,sub:'module',icon:'&#10047;',fn:function(){ga(id)}})});
  items.push({naam:'Nieuwe Instagram-post',sub:'actie',icon:'+',fn:function(){ga('instagram');setTimeout(function(){bewerkIG(null)},150)}});
  items.push({naam:'Nieuwe partner',sub:'actie',icon:'+',fn:function(){ga('partners');setTimeout(function(){bewerkPartner(null)},200)}});
  items.push({naam:'Back-up exporteren',sub:'actie',icon:'&#8681;',fn:function(){ga('instellingen')}});
  var pa=await laadPartners();
  (pa.partners||[]).filter(function(x){return x.slug!=='voorbeeldpartner'}).forEach(function(pt){
    items.push({naam:pt.naam,sub:'partner',icon:'&#9733;',fn:function(){ga('partners');setTimeout(function(){bewerkPartner(pt.slug)},200)}});
  });
  ASSETS.forEach(function(a){items.push({naam:a.naam,sub:'asset · kopieer URL',icon:'&#9635;',fn:function(){kopieer(location.origin+a.pad.replace('..',''),'URL gekopieerd')}})});
  var c=await laadContent();
  c.items.slice(0,400).forEach(function(i){items.push({naam:i.titel,sub:'publicatie · '+(i.status||''),icon:'&para;',fn:function(){ga('publicaties')}})});
  return items;
}
function cpToon(open){
  cp.classList.toggle('on',open);cpScrim.classList.toggle('on',open);
  if(open){cpInput.value='';cpInput.focus();cpFilter('')}
}
function cpFilter(q){
  q=q.toLowerCase().trim();
  var hits=cpItems.filter(function(i){return !q||i.naam.toLowerCase().indexOf(q)>-1||i.sub.indexOf(q)>-1}).slice(0,12);
  cpLijst.innerHTML='';cpIdx=0;
  hits.forEach(function(h,i){
    var b=el('button','cpitem'+(i===0?' actief':''),'<span class="ci">'+h.icon+'</span><span>'+esc(h.naam)+'</span><span class="csub">'+esc(h.sub)+'</span>');
    b.onclick=function(){cpToon(false);h.fn()};
    cpLijst.appendChild(b);
  });
  cpLijst._hits=hits;
}
$('cpOpen').onclick=function(){cpToon(true)};
cpScrim.onclick=function(){cpToon(false)};
cpInput.addEventListener('input',function(){cpFilter(this.value)});
document.addEventListener('keydown',function(e){
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();cpToon(!cp.classList.contains('on'))}
  if(!cp.classList.contains('on'))return;
  var hits=cpLijst._hits||[];
  if(e.key==='Escape')cpToon(false);
  if(e.key==='ArrowDown'){e.preventDefault();cpIdx=Math.min(hits.length-1,cpIdx+1)}
  if(e.key==='ArrowUp'){e.preventDefault();cpIdx=Math.max(0,cpIdx-1)}
  if(e.key==='Enter'&&hits[cpIdx]){cpToon(false);hits[cpIdx].fn()}
  cpLijst.querySelectorAll('.cpitem').forEach(function(x,i){x.classList.toggle('actief',i===cpIdx)});
});

/* ============ start ============ */
(async function(){
  cpItems=await cpIndex();
  tellers();
  render();
})();
})();
