/* APÉRO app: kiosk, werelden, lexicon, quiz, reader */
(function(){
'use strict';

/* ---------- helpers ---------- */
var LS={
  get:function(k){try{return JSON.parse(localStorage.getItem('apero_'+k))}catch(e){return null}},
  set:function(k,v){try{localStorage.setItem('apero_'+k,JSON.stringify(v))}catch(e){}}
};
function $(id){return document.getElementById(id)}
function el(tag,cls,html){var n=document.createElement(tag);if(cls)n.className=cls;if(html!=null)n.innerHTML=html;return n}
function woorden(html){return String(html).replace(/<[^>]*>/g,' ').split(/\s+/).filter(Boolean).length}
function fixImg(u){return u&&u.indexOf('assets/')===0?'../'+u:u}
function tril(ms){try{if(navigator.vibrate)navigator.vibrate(ms||10)}catch(e){}}
function romein(i){return ['I','II','III','IV','V','VI','VII','VIII'][i]||''}

/* ---------- leeslijsten: magazine + werelden ---------- */
function magItems(){
  var uit=[];
  DATA.edities.forEach(function(E,e){E.arts.forEach(function(A,a){
    uit.push({soort:'mag',key:e+'-'+a,kop:E.titel,sub:E.sub,tag:A.tag,t:A.t,html:A.html,img:A.img,ed:e,art:a,groep:'e'+e});
  })});
  return uit;
}
function wereldItems(){
  return WERELDEN.map(function(w,i){
    return {soort:'wereld',key:'w-'+w.slug,kop:'De zes werelden',tag:w.nummer,t:w.naam,
      statement:w.statement,standfirst:w.standfirst,hero:w.hero,html:w.html,wi:i,groep:'w'};
  });
}
var LIJSTEN={mag:magItems(),wereld:wereldItems()};
function leesmin(it){return Math.max(1,Math.round(woorden((it.statement||'')+(it.standfirst||'')+it.html)/200))}
function vindPos(lijst,key){var i=LIJSTEN[lijst].findIndex(function(x){return x.key===key});return i<0?0:i}

var prog=LS.get('prog')||{};
function fractie(key){return prog[key]||0}
function gelezen(key){return fractie(key)>=.92}
function edPct(e){var arts=LIJSTEN.mag.filter(function(x){return x.ed===e}),s=0;
  arts.forEach(function(x){s+=fractie(x.key)});return Math.round(s/arts.length*100)}

var rl='mag',rpos=0;
function huidig(){return LIJSTEN[rl][rpos]}

/* ---------- nacht ---------- */
function zetNacht(aan){
  document.body.classList.toggle('night',!!aan);
  LS.set('night',!!aan);
  $('themecolor').setAttribute('content',aan?'#231B13':'#F4EAD6');
  $('tgNight').classList.toggle('aan',!!aan);
  $('tgNight').setAttribute('aria-checked',!!aan);
}
function wisselNacht(){zetNacht(!document.body.classList.contains('night'));tril()}
$('btnNight').onclick=wisselNacht;
document.querySelectorAll('.wnight').forEach(function(b){b.onclick=wisselNacht});
$('tgNight').onclick=function(){zetNacht(!document.body.classList.contains('night'))};

/* ---------- schermen & tabs ---------- */
var tabScr={kiosk:$('kiosk'),werelden:$('werelden'),lexicon:$('lexicon'),bewaard:$('bewaard'),meer:$('meer')};
var curTab='kiosk';
function toonTab(t){
  curTab=t;
  Object.keys(tabScr).forEach(function(k){
    tabScr[k].classList.toggle('on',k===t);
    tabScr[k].classList.toggle('uit',k!==t);
    tabScr[k].classList.remove('right','left');
  });
  document.querySelectorAll('.tab').forEach(function(b){b.classList.toggle('on',b.dataset.tab===t)});
  if(t==='kiosk'){renderKiosk();renderResume()}
  if(t==='werelden')renderWerelden();
  if(t==='bewaard')renderBM();
  if(t==='meer')renderStats();
}
document.querySelectorAll('.tab').forEach(function(b){
  b.onclick=function(){tril();toonTab(b.dataset.tab)};
});

/* ---------- kiosk ---------- */
var KLEUR=[['--terracotta','--burro'],['--salvia','--terracotta'],['--burro','--mattone']];
function coverPetals(e,c){
  var kl=(DATA.edities[e]&&DATA.edities[e].kleur)||KLEUR[e%KLEUR.length];
  return '--c:'+(c||'56px')+';--a:var('+kl[0]+');--b:var('+kl[1]+')';
}
function renderKiosk(){
  var c=$('carousel');c.innerHTML='';
  DATA.edities.forEach(function(E,i){
    var min=LIJSTEN.mag.filter(function(x){return x.ed===i}).reduce(function(s,x){return s+leesmin(x)},0);
    var art0=E.arts.map(function(a){return a.t}).slice(0,3).join(' · ');
    var cov=el('div','kcover');
    cov.innerHTML='<div class="petals" style="'+coverPetals(i)+'"></div><div class="grain"></div>'+
      '<div class="cwm">AP&Eacute;R<span class="flower"></span></div>'+
      '<div class="ring" style="--p:'+edPct(i)+'"></div>'+
      '<div class="cv"><div class="ed">'+E.sub+'</div><h3>'+E.titel+'</h3><p>'+art0+'</p>'+
      '<div class="cvm"><span>'+E.arts.length+' artikelen</span><span>'+min+' min</span>'+
      (edPct(i)>0?'<span style="color:var(--terracotta)">'+edPct(i)+'%</span>':'')+'</div></div>';
    if(edPct(i)>=92)cov.querySelector('.ring').classList.add('klaar');
    cov.onclick=function(){openEditie(i)};
    c.appendChild(cov);
  });
  var d=$('cdots');d.innerHTML='';
  DATA.edities.forEach(function(_,i){d.appendChild(el('i',i===0?'on':''))});
  markMid();
}
function markMid(){
  var c=$('carousel'),covers=c.querySelectorAll('.kcover'),mid=c.scrollLeft+c.clientWidth/2,best=0,bd=1e9;
  covers.forEach(function(cv,i){
    var m=cv.offsetLeft+cv.offsetWidth/2,d=Math.abs(m-mid);
    if(d<bd){bd=d;best=i}
  });
  covers.forEach(function(cv,i){cv.classList.toggle('mid',i===best)});
  $('cdots').querySelectorAll('i').forEach(function(x,i){x.classList.toggle('on',i===best)});
}
$('carousel').addEventListener('scroll',function(){requestAnimationFrame(markMid)},{passive:true});

function renderResume(){
  var l=LS.get('last'),r=$('resume');
  if(l&&l.key&&LIJSTEN[l.lijst]&&!gelezen(l.key)){
    var pos=vindPos(l.lijst,l.key),it=LIJSTEN[l.lijst][pos];
    if(it.key!==l.key){r.classList.remove('show');return}
    r.classList.add('show');
    $('resumeT').textContent=it.t;
    $('resumeS').textContent=it.kop+' · nog '+Math.max(1,Math.round(leesmin(it)*(1-fractie(it.key))))+' min';
    r.onclick=function(){openReader(l.lijst,pos)};
  } else r.classList.remove('show');
}

/* ---------- editie: inhoudsopgave ---------- */
var edNu=0;
function openEditie(e,stil){
  edNu=e;var E=DATA.edities[e];
  var arts=LIJSTEN.mag.filter(function(x){return x.ed===e});
  $('eheroPetals').setAttribute('style',coverPetals(e,'15vmin'));
  $('eSub').textContent=E.sub;
  $('eTitel').textContent=E.titel;
  var min=arts.reduce(function(s,x){return s+leesmin(x)},0);
  $('eMeta').innerHTML='<span>'+E.arts.length+' artikelen</span><span>'+min+' min lezen</span>'+(edPct(e)>0?'<span>'+edPct(e)+'% gelezen</span>':'');
  var t=$('toclist');t.innerHTML='';
  arts.forEach(function(it,i){
    var itEl=el('div','tocitem');
    itEl.innerHTML='<div class="tnum">'+(i+1)+'</div><div class="tmin"><div class="ttag">'+it.tag+'</div>'+
      '<div class="tt">'+it.t+'</div><div class="tsub"><span>'+leesmin(it)+' min</span>'+
      (gelezen(it.key)?'<span style="color:var(--terracotta)">gelezen</span>':(fractie(it.key)>0?'<span>'+Math.round(fractie(it.key)*100)+'%</span>':''))+'</div></div>'+
      '<div class="ring'+(gelezen(it.key)?' klaar':'')+'" style="--p:'+Math.round(fractie(it.key)*100)+'"></div>';
    itEl.onclick=function(){openReader('mag',vindPos('mag',it.key))};
    t.appendChild(itEl);
    setTimeout(function(){itEl.classList.add('in')},stil?0:60+i*70);
  });
  var verder=arts.find(function(x){return !gelezen(x.key)})||arts[0];
  $('btnStart').textContent=edPct(e)>0&&edPct(e)<92?'Lees verder':'Begin te lezen';
  $('btnStart').onclick=function(){openReader('mag',vindPos('mag',verder.key))};
  $('editie').classList.remove('right','uit');$('editie').classList.add('on');
  tabScr[curTab].classList.add('left');
  $('tabbar').classList.add('weg');
  if(!stil)try{history.pushState({s:'editie'},'')}catch(x){}
}
function sluitEditie(){
  $('editie').classList.add('right');$('editie').classList.remove('on');
  tabScr[curTab].classList.remove('left','uit');tabScr[curTab].classList.add('on');
  $('tabbar').classList.remove('weg');
  toonTab(curTab);
}
$('btnBackKiosk').onclick=function(){tril();terug()};

/* ---------- werelden ---------- */
function renderWerelden(){
  var mijn=LS.get('mijnwereld');
  var qc=$('quizcard');
  if(mijn&&QUIZ.werelden[mijn.key]){
    var w=QUIZ.werelden[mijn.key];
    qc.innerHTML='<div class="petals" style="--c:44px;--a:var(--salvia);--b:var(--burro)"></div><div class="grain"></div>'+
      '<div class="qcv"><div class="klabel">Jouw wereld</div><div class="qct">'+w.n+'</div>'+
      '<p>'+w.d+'</p><button class="qcbtn klein" id="qcOpnieuw">Doe de Aperokiezer opnieuw</button></div>';
    qc.querySelector('#qcOpnieuw').onclick=function(ev){ev.stopPropagation();openQuiz(true)};
    qc.onclick=function(){openReader('wereld',w.wereld)};
  } else {
    qc.innerHTML='<div class="petals" style="--c:44px;--a:var(--terracotta);--b:var(--burro)"></div><div class="grain"></div>'+
      '<div class="qcv"><div class="klabel">De Aperokiezer</div><div class="qct">Welke wereld ben jij?</div>'+
      '<p>Vijf vragen, zes werelden. Ontdek waar jouw avond opengaat.</p>'+
      '<span class="qcbtn">Doe de test &rarr;</span></div>';
    qc.onclick=function(){openQuiz()};
  }
  var c=$('wlijst');c.innerHTML='';
  LIJSTEN.wereld.forEach(function(it,i){
    var w=WERELDEN[i];
    var mijnDit=mijn&&QUIZ.werelden[mijn.key]&&QUIZ.werelden[mijn.key].wereld===i;
    var card=el('div','wcard');
    card.innerHTML='<img src="'+fixImg(w.hero.u)+'" alt="'+w.naam+'" loading="lazy"><div class="wgrad"></div>'+
      (mijnDit?'<span class="wbadge">Jouw wereld</span>':'')+
      '<div class="wcv"><div class="klabel light">'+w.nummer+'</div><h3>'+w.naam+'</h3>'+
      '<div class="wsub"><span>'+leesmin(it)+' min</span>'+
      (gelezen(it.key)?'<span>&#10003; gelezen</span>':(fractie(it.key)>0?'<span>'+Math.round(fractie(it.key)*100)+'%</span>':''))+'</div></div>';
    card.onclick=function(){openReader('wereld',i)};
    c.appendChild(card);
    setTimeout(function(){card.classList.add('in')},70+i*80);
  });
}

/* ---------- lexicon ---------- */
function renderLexicon(filter){
  var c=$('lexlijst');c.innerHTML='';
  var f=(filter||'').toLowerCase().trim();
  LEXICON.groepen.forEach(function(g){
    var hits=g.entries.filter(function(e){
      if(!f)return true;
      return (e.term+' '+e.zoek+' '+e.origin+' '+e.body).toLowerCase().indexOf(f)>-1;
    });
    if(!hits.length)return;
    var sec=el('div','lexgroep');
    sec.innerHTML='<div class="lexkop"><span class="lnum">'+g.num+'</span><h2>'+g.titel+'</h2></div>'+
      (f?'':'<p class="lintro">'+g.intro+'</p>');
    hits.forEach(function(e){
      var ent=el('button','lexentry');
      ent.innerHTML='<div class="lrow"><span class="lterm">'+e.term+'</span><span class="lorigin">'+e.origin+'</span><span class="lpijl">+</span></div>'+
        '<div class="lbody"><div class="lbin">'+e.body+'</div></div>';
      ent.onclick=function(){
        var open=ent.classList.contains('open');
        c.querySelectorAll('.lexentry.open').forEach(function(x){x.classList.remove('open');x.querySelector('.lbody').style.maxHeight='0px'});
        if(!open){
          ent.classList.add('open');
          var b=ent.querySelector('.lbody');
          b.style.maxHeight=b.querySelector('.lbin').offsetHeight+24+'px';
          tril(6);
        }
      };
      sec.appendChild(ent);
    });
    c.appendChild(sec);
  });
  if(!c.children.length)c.innerHTML='<div class="bmleeg"><span class="flower"></span><h3>Niets gevonden</h3><p>Geen term die daarop lijkt. Het lexicon groeit met elke editie mee.</p></div>';
}
$('lexZoek').addEventListener('input',function(){renderLexicon(this.value)});

/* ---------- quiz: de Aperokiezer ---------- */
var qStep=0,qScores={};
function openQuiz(reset){
  if(reset)LS.set('mijnwereld',null);
  qStep=0;qScores={};
  $('quiz').classList.remove('right');$('quiz').classList.add('on');
  $('tabbar').classList.add('weg');
  renderQuiz();
  try{history.pushState({s:'quiz'},'')}catch(x){}
}
function sluitQuiz(){
  $('quiz').classList.add('right');$('quiz').classList.remove('on');
  $('tabbar').classList.remove('weg');
  if(curTab==='werelden')renderWerelden();
}
$('btnQuizTerug').onclick=function(){tril();terug()};
function renderQuiz(){
  var b=$('quizbody');
  if(qStep<QUIZ.vragen.length){
    var q=QUIZ.vragen[qStep];
    var blaadjes=QUIZ.vragen.map(function(_,i){return '<i class="flower sm'+(i<=qStep?' aan':'')+'"></i>'}).join('');
    b.innerHTML='<div class="qprog">'+blaadjes+'</div>'+
      '<div class="klabel" style="padding:0 22px">Vraag '+(qStep+1)+' van '+QUIZ.vragen.length+'</div>'+
      '<h2 class="qvraag">'+q.q+'</h2><div class="qopts"></div>';
    var opts=b.querySelector('.qopts');
    q.a.forEach(function(paar,i){
      var o=el('button','qopt',paar[0]);
      o.onclick=function(){
        tril(8);
        qScores[paar[1]]=(qScores[paar[1]]||0)+1;
        qStep++;
        o.classList.add('gekozen');
        setTimeout(renderQuiz,240);
      };
      opts.appendChild(o);
      setTimeout(function(){o.classList.add('in')},40+i*55);
    });
  } else {
    var best=Object.entries(qScores).sort(function(a,x){return x[1]-a[1]})[0][0];
    var w=QUIZ.werelden[best],wd=WERELDEN[w.wereld];
    LS.set('mijnwereld',{key:best,wereld:w.wereld});
    b.innerHTML='<div class="qresult">'+
      '<div class="qrfoto"><img src="'+fixImg(wd.hero.u)+'" alt="'+w.n+'"><div class="wgrad"></div>'+
      '<div class="wcv"><div class="klabel light">Jouw wereld</div><h3>'+w.n+'</h3></div></div>'+
      '<p class="qrd">'+w.d+'</p>'+
      '<button class="bigbtn" id="qrLees">Lees jouw longread</button>'+
      '<button class="qopnieuw" id="qrOpnieuw">Opnieuw doen</button></div>';
    $('qrLees').onclick=function(){sluitQuiz();openReader('wereld',w.wereld)};
    $('qrOpnieuw').onclick=function(){qStep=0;qScores={};renderQuiz()};
    tril(20);
  }
}
$('mQuiz').onclick=function(){openQuiz()};

/* ---------- reader ---------- */
var slides={prev:$('sPrev'),cur:$('sCur'),next:$('sNext')};
var track=$('rtrack');
function slideHTML(it,pos){
  var kern;
  if(it.soort==='wereld'){
    kern='<div class="whero"><img src="'+fixImg(it.hero.u)+'" alt="'+it.t+'"><div class="wgrad"></div>'+
      '<div class="whead"><div class="klabel light">'+it.tag+'</div><h1>'+it.t+'</h1></div></div>'+
      '<div class="rprose wprose"><div class="wstatement">'+it.statement+'</div>'+
      '<div class="rlt">'+leesmin(it)+' min · longread</div>'+
      '<p class="kap wstandf">'+it.standfirst+'</p>'+it.html+endcardHTML(pos)+'</div>';
  } else {
    var img=it.img?'<div class="foto"><img src="'+fixImg(it.img.u)+'" alt="'+it.img.c+'" loading="lazy"><span class="cap">'+it.img.c+'</span></div>':'';
    kern='<div class="rprose"><div class="rtag">'+it.tag+'</div><h1>'+it.t+'</h1>'+
      '<div class="rlt">'+leesmin(it)+' min · '+it.kop+'</div>'+img+'<div class="kap">'+it.html+'</div>'+endcardHTML(pos)+'</div>';
  }
  return kern;
}
function endcardHTML(pos){
  var lijst=LIJSTEN[rl],it=lijst[pos],n=lijst[pos+1];
  var h='<div class="endcard"><div class="fl-divider"><span></span><i class="flower sm"></i><span></span></div>';
  h+='<div class="egedaan">'+(n?'Dat was "'+it.t+'"':(rl==='wereld'?'Dat waren de zes werelden':'Dat was de laatste editie, voorlopig'))+'</div>';
  if(n){
    var lab=rl==='wereld'?'Volgende wereld':(n.ed!==it.ed?'Volgende editie: '+n.kop:'Volgende artikel');
    h+='<button class="nextcard" data-pos="'+(pos+1)+'"><span class="klabel">'+lab+'</span>'+
      '<div class="nt">'+n.t+'</div><div class="ns">'+n.tag+' · '+leesmin(n)+' min</div></button>';
  } else {
    h+='<button class="nextcard" data-terug="1"><span class="klabel">'+(rl==='wereld'?'De werelden':'Kiosk')+'</span>'+
      '<div class="nt">'+(rl==='wereld'?'Terug naar het overzicht':'Terug naar de kiosk')+'</div>'+
      '<div class="ns">'+(rl==='wereld'?'Zes werelden, zes avonden':'Nieuwe edities verschijnen per seizoen')+'</div></button>';
  }
  return h+'</div>';
}
function vulSlide(sl,offset){
  var pos=rpos+offset,lijst=LIJSTEN[rl];
  var wrap=sl.querySelector('.rwrap');
  sl.classList.remove('wmode');
  if(pos<0||pos>=lijst.length){wrap.innerHTML='';return}
  var it=lijst[pos];
  if(it.soort==='wereld')sl.classList.add('wmode');
  wrap.innerHTML=slideHTML(it,pos);
  sl.querySelector('.rscroll').scrollTop=0;
  wrap.querySelectorAll('.nextcard').forEach(function(b){
    b.onclick=function(){
      tril();
      if(b.dataset.terug){sluitReader();if(rl==='wereld'){toonTab('werelden')}else{sluitEditie()}return}
      ga(1);
    };
  });
  // links naar werelden-pagina's binnen de app houden
  wrap.querySelectorAll('a[href*="werelden/"]').forEach(function(a){
    a.addEventListener('click',function(ev){
      var m=a.getAttribute('href').match(/werelden\/([a-z-]+)\.html/);
      var i=m?WERELDEN.findIndex(function(w){return w.slug===m[1]}):-1;
      if(i>-1){ev.preventDefault();rl='wereld';rpos=i;renderReader();try{history.pushState({s:'reader'},'')}catch(x){}}
    });
  });
}
function renderReader(){
  var it=huidig(),lijst=LIJSTEN[rl];
  var groep=lijst.filter(function(x){return x.groep===it.groep});
  var gi=groep.indexOf(it);
  $('rtitel').textContent=it.kop;
  $('rmeta').textContent=it.tag+' · '+(gi+1)+' / '+groep.length;
  vulSlide(slides.prev,-1);vulSlide(slides.cur,0);vulSlide(slides.next,1);
  track.classList.remove('anim');track.style.transform='translateX(-33.3333%)';
  var dots=$('rdots');dots.innerHTML='';
  groep.forEach(function(x,i){dots.appendChild(el('i',i===gi?'on':''))});
  var bms=LS.get('bm')||{};
  $('btnBM').classList.toggle('aan',!!bms[it.key]);
  $('reader').classList.remove('zen');
  var sc=slides.cur.querySelector('.rscroll');
  setTimeout(function(){
    var f=fractie(it.key);
    if(f>0&&f<.92)sc.scrollTop=f*(sc.scrollHeight-sc.clientHeight);
    updateBar();
  },0);
  sc.querySelectorAll('img').forEach(function(im){im.addEventListener('load',updateBar,{once:true})});
  setTimeout(updateBar,400);
  kijkNaar(slides.cur);
  LS.set('last',{lijst:rl,key:it.key,t:it.t});
}
var io=null;
function kijkNaar(sl){
  if(io)io.disconnect();
  io=new IntersectionObserver(function(es){
    es.forEach(function(x){if(x.isIntersecting)x.target.classList.add('zichtbaar')});
  },{root:sl.querySelector('.rscroll'),threshold:.2});
  sl.querySelectorAll('blockquote, .foto, .pull').forEach(function(n){io.observe(n)});
  onthul();
}
/* failsafe naast de observer: onthul wat in beeld is */
function onthul(){
  var h=window.innerHeight;
  slides.cur.querySelectorAll('blockquote:not(.zichtbaar), .foto:not(.zichtbaar), .pull:not(.zichtbaar)').forEach(function(n){
    var r=n.getBoundingClientRect();
    if(r.top<h*.92&&r.bottom>0)n.classList.add('zichtbaar');
  });
}
function updateBar(){
  var sc=slides.cur.querySelector('.rscroll');
  var max=sc.scrollHeight-sc.clientHeight;
  if(max<=2){$('rbar').style.width='0%';return}
  var f=Math.min(1,sc.scrollTop/max);
  $('rbar').style.width=(f*100)+'%';
  var it=huidig();
  var rest=Math.max(0,Math.round(leesmin(it)*(1-f)));
  $('rMinuten').textContent=rest<=0?'uitgelezen':'nog '+rest+' min';
  var oud=prog[it.key]||0;
  if(f>oud){prog[it.key]=f;LS.set('prog',prog)}
}
var lastY=0;
function scrollGedrag(e){
  var sc=e.target,y=sc.scrollTop;
  if(y>lastY+14&&y>120)$('reader').classList.add('zen');
  else if(y<lastY-14||y<60)$('reader').classList.remove('zen');
  lastY=y;
  var hero=slides.cur.querySelector('.whero img');
  if(hero&&y<window.innerHeight)hero.style.transform='translateY('+(y*.38)+'px) scale(1.05)';
  updateBar();
  onthul();
}
Object.keys(slides).forEach(function(k){
  slides[k].querySelector('.rscroll').addEventListener('scroll',function(ev){
    if(k==='cur')scrollGedrag(ev);
  },{passive:true});
});

function openReader(lijst,pos){
  rl=lijst;rpos=Math.max(0,Math.min(LIJSTEN[lijst].length-1,pos));lastY=0;
  renderReader();
  $('reader').classList.remove('right');$('reader').classList.add('on');
  $('tabbar').classList.add('weg');
  try{history.pushState({s:'reader'},'')}catch(x){}
}
function sluitReader(){
  $('reader').classList.add('right');$('reader').classList.remove('on');
  if($('editie').classList.contains('on')&&rl==='mag'){openEditie(edNu,true)}
  else{$('editie').classList.add('right');$('editie').classList.remove('on');$('tabbar').classList.remove('weg');toonTab(curTab)}
}
$('btnCloseReader').onclick=function(){tril();terug()};

function ga(d){
  var pos=rpos+d;
  if(pos<0||pos>=LIJSTEN[rl].length)return;
  track.classList.add('anim');
  track.style.transform='translateX('+(d>0?-66.6666:0)+'%)';
  setTimeout(function(){rpos=pos;lastY=0;renderReader()},390);
}

/* swipe met vinger-volgen */
(function(){
  var x0=0,y0=0,t0=0,as=null,dx=0;
  track.addEventListener('touchstart',function(e){
    x0=e.touches[0].clientX;y0=e.touches[0].clientY;t0=Date.now();as=null;dx=0;
    track.classList.remove('anim');
  },{passive:true});
  track.addEventListener('touchmove',function(e){
    var mx=e.touches[0].clientX-x0,my=e.touches[0].clientY-y0;
    if(as===null){
      if(Math.abs(mx)<9&&Math.abs(my)<9)return;
      as=Math.abs(mx)>Math.abs(my)*1.2?'h':'v';
    }
    if(as!=='h')return;
    e.preventDefault();
    dx=mx;
    var rem=(dx<0&&rpos>=LIJSTEN[rl].length-1)||(dx>0&&rpos<=0)?.35:1;
    track.style.transform='translateX(calc(-33.3333% + '+(dx*rem)+'px))';
  },{passive:false});
  track.addEventListener('touchend',function(){
    if(as!=='h')return;
    var vlug=Math.abs(dx)/(Date.now()-t0+1)>.45;
    var w=window.innerWidth;
    if((Math.abs(dx)>w*.28||vlug)&&Math.abs(dx)>40){
      var d=dx<0?1:-1,pos=rpos+d;
      if(pos>=0&&pos<LIJSTEN[rl].length){ga(d);return}
    }
    track.classList.add('anim');
    track.style.transform='translateX(-33.3333%)';
  },{passive:true});
})();

/* bladwijzer + burst */
$('btnBM').onclick=function(){
  var b=LS.get('bm')||{},it=huidig();
  if(b[it.key])delete b[it.key];
  else{
    b[it.key]={key:it.key,lijst:rl,t:it.t,sub:it.kop,ed:it.ed};
    var r=this.getBoundingClientRect(),bu=$('burst');
    bu.style.left=(r.left+r.width/2)+'px';bu.style.top=(r.top+r.height/2)+'px';
    bu.innerHTML='';
    for(var i=0;i<10;i++){
      var p=el('b');var hoek=i/10*Math.PI*2,af=34+Math.random()*26;
      p.style.setProperty('--bx',Math.cos(hoek)*af+'px');
      p.style.setProperty('--by',Math.sin(hoek)*af+'px');
      bu.appendChild(p);
    }
    bu.classList.remove('gaan');void bu.offsetWidth;bu.classList.add('gaan');
    tril(18);
  }
  LS.set('bm',b);
  this.classList.toggle('aan',!!b[it.key]);
};

/* weergave-sheet */
var fs=LS.get('fs')||18,lhs=['1.65','1.85','2.05'],lhNaam=['compact','ruim','open'],lh=LS.get('lh');
if(lh==null)lh=1;
function zetType(){
  fs=Math.max(15,Math.min(24,fs));lh=Math.max(0,Math.min(2,lh));
  document.documentElement.style.setProperty('--rfs',fs+'px');
  document.documentElement.style.setProperty('--rlh',lhs[lh]);
  $('fsVal').textContent=fs;$('lhVal').textContent=lhNaam[lh];
  LS.set('fs',fs);LS.set('lh',lh);
}
$('fsMin').onclick=function(){fs--;zetType()};
$('fsPlus').onclick=function(){fs++;zetType()};
$('lhMin').onclick=function(){lh--;zetType()};
$('lhPlus').onclick=function(){lh++;zetType()};
function sheet(aan){$('sheet').classList.toggle('on',aan);$('scrim').classList.toggle('on',aan)}
$('btnAa').onclick=function(){sheet(true)};
$('scrim').onclick=function(){sheet(false)};

/* ---------- bewaard ---------- */
function renderBM(){
  var b=LS.get('bm')||{},ks=Object.keys(b),c=$('bmlist');
  if(!ks.length){
    c.innerHTML='<div class="bmleeg"><span class="flower"></span><h3>Nog niets bewaard</h3><p>Tik tijdens het lezen op de bloem en het artikel wacht hier op je.</p></div>';
    return;
  }
  c.innerHTML='';
  ks.forEach(function(k){
    var x=b[k];
    var lijst=x.lijst||'mag';
    var it=el('button','bmitem');
    var band;
    if(lijst==='wereld'){
      var wi=LIJSTEN.wereld[vindPos('wereld',k)];
      band='<div class="bband"><img src="'+fixImg(WERELDEN[wi.wi].hero.u)+'" alt=""></div>';
    } else {
      band='<div class="bband"><div class="petals" style="'+coverPetals(x.ed||parseInt(k)||0,'12px')+'"></div></div>';
    }
    it.innerHTML=band+
      '<div class="bmin"><div class="bt">'+x.t+'</div><div class="bs">'+(x.sub||x.e||'')+' · '+Math.round(fractie(k)*100)+'% gelezen</div></div>'+
      '<span class="bx" data-k="'+k+'">&times;</span>';
    it.onclick=function(ev){
      if(ev.target.classList.contains('bx')){
        var bb=LS.get('bm')||{};delete bb[ev.target.dataset.k];LS.set('bm',bb);renderBM();return;
      }
      openReader(lijst,vindPos(lijst,k));
    };
    c.appendChild(it);
  });
}

/* ---------- meer / stats ---------- */
function renderStats(){
  var tot=0,kl=0,min=0;
  ['mag','wereld'].forEach(function(l){LIJSTEN[l].forEach(function(it){
    tot++;if(gelezen(it.key))kl++;min+=Math.round(leesmin(it)*fractie(it.key));
  })});
  $('statcard').innerHTML='<div class="st"><div class="sn">'+kl+'</div><div class="sl">gelezen</div></div>'+
    '<div class="st"><div class="sn">'+(tot-kl)+'</div><div class="sl">te gaan</div></div>'+
    '<div class="st"><div class="sn">'+min+'</div><div class="sl">min gelezen</div></div>';
}

/* ---------- terug / history ---------- */
function terug(){
  if($('reader').classList.contains('on')){sluitReader();return}
  if($('quiz').classList.contains('on')){sluitQuiz();return}
  if($('editie').classList.contains('on')){sluitEditie();return}
}
window.addEventListener('popstate',function(){terug()});
document.addEventListener('keydown',function(e){
  if(!$('reader').classList.contains('on'))return;
  if(e.key==='ArrowRight')ga(1);
  if(e.key==='ArrowLeft')ga(-1);
  if(e.key==='Escape')terug();
});

/* ---------- install ---------- */
var defPrompt=null;
window.addEventListener('beforeinstallprompt',function(e){
  e.preventDefault();defPrompt=e;$('btnInstall').hidden=false;
});
$('btnInstall').onclick=function(){if(defPrompt){defPrompt.prompt();defPrompt=null;$('btnInstall').hidden=true}};
(function(){
  var ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  var standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  if(ios&&!standalone)$('iosHint').hidden=false;
})();

/* ---------- migratie v1 -> v2 ---------- */
(function(){
  var b=LS.get('bm');
  if(b){var anders=false;
    Object.keys(b).forEach(function(k){
      if(b[k]&&b[k].e&&!b[k].sub){b[k]={key:k,lijst:'mag',t:b[k].t,sub:b[k].e,ed:b[k].ed};anders=true}
    });
    if(anders)LS.set('bm',b);
  }
  var l=LS.get('last');
  if(l&&l.t&&!l.key&&typeof l.ed==='number'){LS.set('last',{lijst:'mag',key:l.ed+'-'+l.art,t:l.t})}
})();

/* ---------- start ---------- */
if(LS.get('night'))zetNacht(true);
zetType();
renderKiosk();
renderResume();
renderLexicon('');
renderWerelden();
window.addEventListener('resize',markMid);

var p=new URLSearchParams(location.search);
if(p.has('ed')){
  var pe=Math.min(DATA.edities.length-1,parseInt(p.get('ed'))||0);
  var pa=Math.min(DATA.edities[pe].arts.length-1,parseInt(p.get('art'))||0);
  openEditie(pe,true);openReader('mag',vindPos('mag',pe+'-'+pa));
} else if(p.has('wereld')){
  var wi=WERELDEN.findIndex(function(w){return w.slug===p.get('wereld')});
  toonTab('werelden');if(wi>-1)openReader('wereld',wi);
} else if(p.has('quiz')){
  toonTab('werelden');openQuiz();
}

setTimeout(function(){$('splash').classList.add('weg')},1600);

if('serviceWorker' in navigator&&location.protocol==='https:'){
  navigator.serviceWorker.register('sw.js').catch(function(){});
}
})();
