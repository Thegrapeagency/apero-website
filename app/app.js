/* APÉRO Magazine app */
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
function leesmin(a){return Math.max(1,Math.round(woorden(a.html)/200))}
function edMin(e){return e.arts.reduce(function(s,a){return s+leesmin(a)},0)}
function fixImg(u){return u&&u.indexOf('assets/')===0?'../'+u:u}
function key(e,a){return e+'-'+a}
function tril(ms){try{if(navigator.vibrate)navigator.vibrate(ms||10)}catch(e){}}

var prog=LS.get('prog')||{};           // {"ed-art": 0..1}
function fractie(e,a){return prog[key(e,a)]||0}
function gelezen(e,a){return fractie(e,a)>=.92}
function edPct(e){var E=DATA.edities[e],s=0;E.arts.forEach(function(_,i){s+=fractie(e,i)});return Math.round(s/E.arts.length*100)}

var ed=0,art=0;

/* ---------- nacht ---------- */
function zetNacht(aan){
  document.body.classList.toggle('night',!!aan);
  LS.set('night',!!aan);
  $('themecolor').setAttribute('content',aan?'#231B13':'#F4EAD6');
  $('tgNight').classList.toggle('aan',!!aan);
  $('tgNight').setAttribute('aria-checked',!!aan);
}
$('btnNight').onclick=function(){zetNacht(!document.body.classList.contains('night'));tril()};
$('tgNight').onclick=function(){zetNacht(!document.body.classList.contains('night'))};

/* ---------- schermen & tabs ---------- */
var tabScr={kiosk:$('kiosk'),bladwijzers:$('bladwijzers'),meer:$('meer')};
var curTab='kiosk';
function toonTab(t){
  curTab=t;
  Object.keys(tabScr).forEach(function(k){
    tabScr[k].classList.toggle('on',k===t);
    tabScr[k].classList.toggle('uit',k!==t);
    tabScr[k].classList.remove('right','left');
  });
  document.querySelectorAll('.tab').forEach(function(b){b.classList.toggle('on',b.dataset.tab===t)});
  if(t==='bladwijzers')renderBM();
  if(t==='meer')renderStats();
}
document.querySelectorAll('.tab').forEach(function(b){
  b.onclick=function(){tril();toonTab(b.dataset.tab)};
});

/* ---------- kiosk ---------- */
var KLEUR=[['--terracotta','--burro'],['--salvia','--terracotta'],['--burro','--mattone']];
function coverPetals(e,c){
  var kl=DATA.edities[e].kleur||KLEUR[e%KLEUR.length];
  return '--c:'+(c||'56px')+';--a:var('+kl[0]+');--b:var('+kl[1]+')';
}
function renderKiosk(){
  var c=$('carousel');c.innerHTML='';
  DATA.edities.forEach(function(E,i){
    var art0=E.arts.map(function(a){return a.t}).slice(0,3).join(' · ');
    var cov=el('div','kcover');
    cov.innerHTML='<div class="petals" style="'+coverPetals(i)+'"></div><div class="grain"></div>'+
      '<div class="cwm">AP&Eacute;R<span class="flower"></span></div>'+
      '<div class="ring" style="--p:'+edPct(i)+'"></div>'+
      '<div class="cv"><div class="ed">'+E.sub+'</div><h3>'+E.titel+'</h3><p>'+art0+'</p>'+
      '<div class="cvm"><span>'+E.arts.length+' artikelen</span><span>'+edMin(E)+' min</span>'+
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
  if(l&&l.t&&!gelezen(l.ed,l.art)){
    r.classList.add('show');
    $('resumeT').textContent=l.t;
    $('resumeS').textContent=DATA.edities[l.ed].titel+' · nog '+Math.max(1,Math.round(leesmin(DATA.edities[l.ed].arts[l.art])*(1-fractie(l.ed,l.art))))+' min';
    r.onclick=function(){openEditie(l.ed,true);openReader(l.ed,l.art)};
  } else r.classList.remove('show');
}

/* ---------- editie ---------- */
function openEditie(e,stil){
  ed=e;var E=DATA.edities[e];
  $('eheroPetals').setAttribute('style',coverPetals(e,'15vmin'));
  $('eSub').textContent=E.sub;
  $('eTitel').textContent=E.titel;
  $('eMeta').innerHTML='<span>'+E.arts.length+' artikelen</span><span>'+edMin(E)+' min lezen</span>'+(edPct(e)>0?'<span>'+edPct(e)+'% gelezen</span>':'');
  var t=$('toclist');t.innerHTML='';
  E.arts.forEach(function(a,i){
    var it=el('div','tocitem');
    it.innerHTML='<div class="tnum">'+(i+1)+'</div><div class="tmin"><div class="ttag">'+a.tag+'</div>'+
      '<div class="tt">'+a.t+'</div><div class="tsub"><span>'+leesmin(a)+' min</span>'+
      (gelezen(e,i)?'<span style="color:var(--terracotta)">gelezen</span>':(fractie(e,i)>0?'<span>'+Math.round(fractie(e,i)*100)+'%</span>':''))+'</div></div>'+
      '<div class="ring'+(gelezen(e,i)?' klaar':'')+'" style="--p:'+Math.round(fractie(e,i)*100)+'"></div>';
    it.onclick=function(){openReader(e,i)};
    t.appendChild(it);
    setTimeout(function(){it.classList.add('in')},stil?0:60+i*70);
  });
  var verder=E.arts.findIndex(function(_,i){return !gelezen(e,i)});
  $('btnStart').textContent=edPct(e)>0&&edPct(e)<92?'Lees verder':'Begin te lezen';
  $('btnStart').onclick=function(){openReader(e,verder<0?0:verder)};
  $('editie').classList.remove('right','uit');$('editie').classList.add('on');
  $('kiosk').classList.add('left');
  $('tabbar').classList.add('weg');
  if(!stil)try{history.pushState({s:'editie'},'')}catch(x){}
}
function sluitEditie(){
  $('editie').classList.add('right');$('editie').classList.remove('on');
  tabScr[curTab].classList.remove('left','uit');tabScr[curTab].classList.add('on');
  $('tabbar').classList.remove('weg');
  renderKiosk();renderResume();
}
$('btnBackKiosk').onclick=function(){tril();terug()};

/* ---------- reader ---------- */
var slides={prev:$('sPrev'),cur:$('sCur'),next:$('sNext')};
var track=$('rtrack');
function buur(e,a,d){
  var E=DATA.edities[e];
  if(d<0){if(a>0)return[e,a-1];if(e>0)return[e-1,DATA.edities[e-1].arts.length-1];return null}
  if(a<E.arts.length-1)return[e,a+1];
  if(e<DATA.edities.length-1)return[e+1,0];
  return null;
}
function slideHTML(e,a){
  var A=DATA.edities[e].arts[a];
  var img=A.img?'<div class="foto"><img src="'+fixImg(A.img.u)+'" alt="'+A.img.c+'" loading="lazy"><span class="cap">'+A.img.c+'</span></div>':'';
  return '<div class="rtag">'+A.tag+'</div><h1>'+A.t+'</h1><div class="rlt">'+leesmin(A)+' min · '+DATA.edities[e].titel+'</div>'+img+'<div class="kap">'+A.html+'</div>'+endcardHTML(e,a);
}
function endcardHTML(e,a){
  var n=buur(e,a,1);
  var h='<div class="endcard"><div class="fl-divider"><span></span><i class="flower sm"></i><span></span></div>';
  h+='<div class="egedaan">'+(n?'Dat was “'+DATA.edities[e].arts[a].t+'”':'Dat was de laatste editie, voorlopig')+'</div>';
  if(n){
    var N=DATA.edities[n[0]].arts[n[1]];
    h+='<button class="nextcard" data-ed="'+n[0]+'" data-art="'+n[1]+'"><span class="klabel">'+
      (n[0]===e?'Volgende artikel':'Volgende editie: '+DATA.edities[n[0]].titel)+'</span>'+
      '<div class="nt">'+N.t+'</div><div class="ns">'+N.tag+' · '+leesmin(N)+' min</div></button>';
  } else {
    h+='<button class="nextcard" data-kiosk="1"><span class="klabel">Kiosk</span><div class="nt">Terug naar de kiosk</div><div class="ns">Nieuwe edities verschijnen per seizoen</div></button>';
  }
  return h+'</div>';
}
function vulSlide(sl,pos){
  var p=buur(ed,art,pos)|| (pos===0?[ed,art]:null);
  if(pos===0)p=[ed,art];
  var prose=sl.querySelector('.rprose');
  if(!p){prose.innerHTML='';return}
  prose.innerHTML=slideHTML(p[0],p[1]);
  sl.querySelector('.rscroll').scrollTop=0;
  prose.querySelectorAll('.nextcard').forEach(function(b){
    b.onclick=function(){
      tril();
      if(b.dataset.kiosk){sluitReader();sluitEditie();return}
      ga(1);
    };
  });
}
function renderReader(){
  var E=DATA.edities[ed],A=E.arts[art];
  $('rtitel').textContent=E.titel;
  $('rmeta').textContent=A.tag+' · '+(art+1)+' / '+E.arts.length;
  vulSlide(slides.prev,-1);vulSlide(slides.cur,0);vulSlide(slides.next,1);
  track.classList.remove('anim');track.style.transform='translateX(-33.3333%)';
  var dots=$('rdots');dots.innerHTML='';
  E.arts.forEach(function(_,i){dots.appendChild(el('i',i===art?'on':''))});
  var bms=LS.get('bm')||{};
  $('btnBM').classList.toggle('aan',!!bms[key(ed,art)]);
  $('reader').classList.remove('zen');
  // herstel leespositie
  var sc=slides.cur.querySelector('.rscroll');
  requestAnimationFrame(function(){
    var f=fractie(ed,art);
    if(f>0&&f<.92)sc.scrollTop=f*(sc.scrollHeight-sc.clientHeight);
    updateBar();
  });
  sc.querySelectorAll('img').forEach(function(im){im.addEventListener('load',updateBar,{once:true})});
  setTimeout(updateBar,400);
  kijkNaar(slides.cur);
  LS.set('last',{ed:ed,art:art,t:A.t});
}
var io=null;
function kijkNaar(sl){
  if(io)io.disconnect();
  io=new IntersectionObserver(function(es){
    es.forEach(function(x){if(x.isIntersecting)x.target.classList.add('zichtbaar')});
  },{root:sl.querySelector('.rscroll'),threshold:.25});
  sl.querySelectorAll('blockquote, .foto').forEach(function(n){io.observe(n)});
}
function updateBar(){
  var sc=slides.cur.querySelector('.rscroll');
  var max=sc.scrollHeight-sc.clientHeight;
  if(max<=2){$('rbar').style.width='0%';return}
  var f=Math.min(1,sc.scrollTop/max);
  $('rbar').style.width=(f*100)+'%';
  var A=DATA.edities[ed].arts[art];
  var rest=Math.max(0,Math.round(leesmin(A)*(1-f)));
  $('rMinuten').textContent=rest<=0?'uitgelezen':'nog '+rest+' min';
  var oud=prog[key(ed,art)]||0;
  if(f>oud){prog[key(ed,art)]=f;LS.set('prog',prog)}
}
var lastY=0;
function scrollGedrag(e){
  var sc=e.target,y=sc.scrollTop;
  if(y>lastY+14&&y>120)$('reader').classList.add('zen');
  else if(y<lastY-14||y<60)$('reader').classList.remove('zen');
  lastY=y;
  requestAnimationFrame(updateBar);
}
Object.keys(slides).forEach(function(k){
  slides[k].querySelector('.rscroll').addEventListener('scroll',function(ev){
    if(k==='cur')scrollGedrag(ev);
  },{passive:true});
});

function openReader(e,a){
  ed=e;art=a;lastY=0;
  renderReader();
  $('reader').classList.remove('right');$('reader').classList.add('on');
  $('tabbar').classList.add('weg');
  try{history.pushState({s:'reader'},'')}catch(x){}
}
function sluitReader(){
  $('reader').classList.add('right');$('reader').classList.remove('on');
  if($('editie').classList.contains('on')){openEditie(ed,true)}
  else{$('tabbar').classList.remove('weg');renderKiosk();renderResume()}
}
$('btnCloseReader').onclick=function(){tril();terug()};

function ga(d){
  var n=buur(ed,art,d);
  if(!n)return;
  track.classList.add('anim');
  track.style.transform='translateX('+(d>0?-66.6666:0)+'%)';
  setTimeout(function(){
    ed=n[0];art=n[1];lastY=0;
    renderReader();
  },390);
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
    var rem=(dx<0&&!buur(ed,art,1))||(dx>0&&!buur(ed,art,-1))?.35:1;
    track.style.transform='translateX(calc(-33.3333% + '+(dx*rem)+'px))';
  },{passive:false});
  track.addEventListener('touchend',function(){
    if(as!=='h')return;
    var vlug=Math.abs(dx)/(Date.now()-t0+1)>.45;
    var w=window.innerWidth;
    if((Math.abs(dx)>w*.28||vlug)&&Math.abs(dx)>40){
      var d=dx<0?1:-1;
      if(buur(ed,art,d)){ga(d);return}
    }
    track.classList.add('anim');
    track.style.transform='translateX(-33.3333%)';
  },{passive:true});
})();

/* bladwijzer + burst */
$('btnBM').onclick=function(){
  var b=LS.get('bm')||{},k=key(ed,art);
  if(b[k])delete b[k];
  else{
    b[k]={ed:ed,art:art,t:DATA.edities[ed].arts[art].t,e:DATA.edities[ed].titel};
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
  this.classList.toggle('aan',!!b[k]);
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

/* ---------- bladwijzers ---------- */
function renderBM(){
  var b=LS.get('bm')||{},ks=Object.keys(b),c=$('bmlist');
  if(!ks.length){
    c.innerHTML='<div class="bmleeg"><span class="flower"></span><h3>Nog geen bladwijzers</h3><p>Tik tijdens het lezen op de bloem en het artikel wacht hier op je.</p></div>';
    return;
  }
  c.innerHTML='';
  ks.forEach(function(k){
    var x=b[k];
    var it=el('button','bmitem');
    it.innerHTML='<div class="bband"><div class="petals" style="'+coverPetals(x.ed,'12px')+'"></div></div>'+
      '<div class="bmin"><div class="bt">'+x.t+'</div><div class="bs">'+x.e+' · '+Math.round(fractie(x.ed,x.art)*100)+'% gelezen</div></div>'+
      '<span class="bx" data-k="'+k+'">&times;</span>';
    it.onclick=function(ev){
      if(ev.target.classList.contains('bx')){
        var bb=LS.get('bm')||{};delete bb[ev.target.dataset.k];LS.set('bm',bb);renderBM();return;
      }
      openEditie(x.ed,true);openReader(x.ed,x.art);
    };
    c.appendChild(it);
  });
}

/* ---------- meer / stats ---------- */
function renderStats(){
  var tot=0,kl=0,min=0;
  DATA.edities.forEach(function(E,e){E.arts.forEach(function(a,i){
    tot++;if(gelezen(e,i))kl++;min+=Math.round(leesmin(a)*fractie(e,i));
  })});
  $('statcard').innerHTML='<div class="st"><div class="sn">'+kl+'</div><div class="sl">gelezen</div></div>'+
    '<div class="st"><div class="sn">'+(tot-kl)+'</div><div class="sl">te gaan</div></div>'+
    '<div class="st"><div class="sn">'+min+'</div><div class="sl">min gelezen</div></div>';
}

/* ---------- terug / history ---------- */
function terug(){
  if($('reader').classList.contains('on')){sluitReader();return}
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

/* ---------- start ---------- */
if(LS.get('night'))zetNacht(true);
zetType();
renderKiosk();
renderResume();
window.addEventListener('resize',markMid);

var p=new URLSearchParams(location.search);
if(p.has('ed')){
  var pe=Math.min(DATA.edities.length-1,parseInt(p.get('ed'))||0);
  var pa=Math.min(DATA.edities[pe].arts.length-1,parseInt(p.get('art'))||0);
  openEditie(pe,true);openReader(pe,pa);
}

setTimeout(function(){$('splash').classList.add('weg')},1600);

if('serviceWorker' in navigator&&location.protocol==='https:'){
  navigator.serviceWorker.register('sw.js').catch(function(){});
}
})();
