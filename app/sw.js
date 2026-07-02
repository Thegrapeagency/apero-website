/* APÉRO Magazine app — offline cache */
var VERSIE='apero-app-v3';
var SHELL=[
  './','index.html','app.css','app.js','content.js','manifest.webmanifest',
  '../icon.svg',
  '../assets/landen/italie.jpg','../assets/landen/frankrijk.jpg','../assets/landen/spanje.jpg',
  '../assets/landen/anijsgordel.jpg','../assets/landen/portugal.jpg','../assets/landen/marokko.jpg'
];
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(VERSIE).then(function(c){return c.addAll(SHELL)}).then(function(){return self.skipWaiting()}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k!==VERSIE}).map(function(k){return caches.delete(k)}));
  }).then(function(){return self.clients.claim()}));
});
self.addEventListener('fetch',function(e){
  if(e.request.method!=='GET')return;
  e.respondWith(
    caches.match(e.request).then(function(hit){
      if(hit)return hit;
      return fetch(e.request).then(function(res){
        var kopie=res.clone();
        if(res.ok&&(e.request.url.indexOf('fonts.g')>-1||e.request.url.indexOf('/assets/')>-1)){
          caches.open(VERSIE).then(function(c){c.put(e.request,kopie)});
        }
        return res;
      }).catch(function(){return caches.match('./')});
    })
  );
});
