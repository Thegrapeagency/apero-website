// APÉRO motion layer
(function(){
  var nav=document.querySelector('nav');
  var onScroll=function(){if(window.scrollY>40){nav.classList.add('scrolled')}else{nav.classList.remove('scrolled')}};
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();
  var sel='.section-head,.card,.cover,.pull,.stats,.stat,.tl-item,.prose h2,.prose blockquote,.toc,.opens div,.reading,.manifest';
  var els=document.querySelectorAll(sel);
  els.forEach(function(el,i){el.classList.add('reveal');});
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(e){if(e.isIntersecting){
        var d=(Array.prototype.indexOf.call(e.target.parentNode.children,e.target)%6)*70;
        setTimeout(function(){e.target.classList.add('in')},d);
        io.unobserve(e.target);}});
    },{threshold:.12,rootMargin:'0px 0px -40px 0px'});
    els.forEach(function(el){io.observe(el)});
  } else { els.forEach(function(el){el.classList.add('in')}); }
  // subtle hero parallax
  var pet=document.querySelector('.hero .petals');
  if(pet && matchMedia('(prefers-reduced-motion: no-preference)').matches){
    window.addEventListener('scroll',function(){
      var y=window.scrollY; if(y<900){pet.style.transform='translateY('+(y*.18)+'px)';}
    },{passive:true});
  }
})();
// bloom4 in-view trigger
(function(){
  var b=document.querySelectorAll('.bloom4');
  if(!b.length)return;
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){setTimeout(function(){e.target.classList.add('in')},250);io.unobserve(e.target);}})},{threshold:.4});
    b.forEach(function(el){io.observe(el)});
  } else { b.forEach(function(el){el.classList.add('in')}); }
})();
