/* ============================================================
   APÉRO Culture — content.json generator (in apero-website repo)
   Draai met:  node dashboard/_generate-content.js
   ------------------------------------------------------------
   Bouwt dashboard/data/content.json uit DRIE bronnen:
   1) ECHTE live content (status 'live'): parse ../blog/*.html en
      ../werelden/*.html op deze repo (= live op www.apero-culture.com).
   2) BACKLOG (status 'klaar'): de geschreven Maghreb-stukken die nog
      niet live staan (longread, recept, twee thee-blogs) + verdieping.
   3) PLANNING (gepland/concept/idee): de maandmotor per wereld
      (publicatie-pijplijn), juli–dec 2026.
   Roundtrip-veilig: het dashboard schrijft naar dezelfde structuur.
   ============================================================ */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const NOW = new Date().toISOString();
const uuid = () => crypto.randomUUID();
const SITE = 'https://www.apero-culture.com';

function mkItem(o){
  const slug = o.slug || null;
  return {
    id: o.id || uuid(),
    type: o.type, thema: o.thema, titel: o.titel,
    ondertitel: o.ondertitel || '', samenvatting: o.samenvatting || '',
    body: o.body || '', status: o.status || 'idee',
    publishDate: o.publishDate || null, kanalen: o.kanalen || [],
    assets: o.assets || [], carouselRef: o.carouselRef || null,
    bron: o.bron || '', slug: slug,
    liveUrl: slug ? (SITE + '/' + slug.replace(/^\//,'')) : null,
    createdAt: NOW, updatedAt: NOW
  };
}

/* ---- mini HTML-helpers (tolerant, geen DOM-lib) ---- */
function pick(re, html){ const m = re.exec(html); return m ? m[1].trim() : ''; }
function stripTags(s){
  return s.replace(/<script[\s\S]*?<\/script>/gi,'')
          .replace(/<style[\s\S]*?<\/style>/gi,'')
          .replace(/<\/(p|h1|h2|h3|li|blockquote|div)>/gi,'\n')
          .replace(/<[^>]+>/g,'')
          .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
          .replace(/&#39;|&rsquo;|&lsquo;/g,"'").replace(/&quot;|&ldquo;|&rdquo;/g,'"')
          .replace(/&nbsp;/g,' ')
          .replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
}
function bodyOf(html){
  const a = /<article[^>]*>([\s\S]*?)<\/article>/i.exec(html);
  const m = /<main[^>]*>([\s\S]*?)<\/main>/i.exec(html);
  const chunk = (a && a[1]) || (m && m[1]) || html;
  const txt = stripTags(chunk);
  return txt.length > 2400 ? txt.slice(0,2400).replace(/\s+\S*$/,'') + '…' : txt;
}
function titleOf(html){ return pick(/<title>([^<]*)<\/title>/i, html).replace(/\s*·\s*AP[ÉE]RO.*$/i,'').trim(); }
function descOf(html){ return pick(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i, html); }
function kickerOf(html){ return pick(/class=["'][^"']*kicker[^"']*["'][^>]*>([^<]*)</i, html); }

const items = [];

/* ============================================================
   1) LIVE — echte blogs
   ============================================================ */
const BLOG_THEMA = {
  'bitter':'algemeen',
  'geboren-uit-verbod':'algemeen',
  'generatie-minder-drinken':'algemeen',
  'louche-effect':'anijsgordel',
  'nederland-borrel':'nederland'
};
fs.readdirSync(path.join(ROOT,'blog')).filter(f=>/\.html$/.test(f) && f!=='index.html').forEach(function(f){
  const html = fs.readFileSync(path.join(ROOT,'blog',f),'utf8');
  const slug = 'blog/'+f; const name = f.replace(/\.html$/,'');
  items.push(mkItem({
    type:'blog', thema:BLOG_THEMA[name]||'algemeen', status:'live',
    titel:titleOf(html)||name, samenvatting:descOf(html), body:bodyOf(html),
    slug:slug, bron:'live op de site ('+slug+')', publishDate:null,
    kanalen:['site'], assets:[{kind:'kicker',label:kickerOf(html)}]
  }));
});

/* ============================================================
   1b) LIVE — werelden (landenpagina's)
   ============================================================ */
const WERELD_THEMA = {anijsgordel:'anijsgordel',frankrijk:'frankrijk',italie:'italie',marokko:'maghreb',portugal:'portugal',spanje:'spanje'};
fs.readdirSync(path.join(ROOT,'werelden')).filter(f=>/\.html$/.test(f) && f!=='index.html').forEach(function(f){
  const html = fs.readFileSync(path.join(ROOT,'werelden',f),'utf8');
  const slug = 'werelden/'+f; const name = f.replace(/\.html$/,'');
  items.push(mkItem({
    type:'landingsfeit', thema:WERELD_THEMA[name]||'algemeen', status:'live',
    titel:titleOf(html)||name, samenvatting:descOf(html), body:bodyOf(html),
    slug:slug, bron:'live op de site ('+slug+')', publishDate:null, kanalen:['site']
  }));
});

/* ============================================================
   2) BACKLOG — geschreven, nog niet live (status 'klaar')
   (Maghreb-maand; marokko landenpagina staat al live, dus niet hier)
   ============================================================ */
const bronMd = 'merkstrategie/marokko-content-verdeling.md';
items.push(mkItem({
  type:'longread', thema:'maghreb', status:'klaar', publishDate:'2026-12-10',
  kanalen:['site'], slug:'werelden/marokko-longread.html', bron:bronMd,
  titel:'De schenkende hand', ondertitel:'Marokko, een wijnland dat thee schenkt',
  samenvatting:'Het volledige verhaal: van Romeinse wijn bij Volubilis tot de muntthee van dertig centimeter hoog, en de bewuste keuze voor een ritueel zonder alcohol.',
  body:["Begin bij een misverstand, want dat is waar dit verhaal het interessantst wordt. Vraag een willekeurige bezoeker naar drinken in Marokko en je krijgt twee zekerheden terug: het is muntthee, en er is geen alcohol. De eerste klopt half. De tweede klopt niet.",
"Marokko maakt al wijn sinds de oudheid. Onder de Romeinen werd Volubilis een serieus wijncentrum. Toen de islam kwam remde dat de wijnbouw, maar het doofde hem niet. En toen de Fransen kwamen bouwden ze er een industrie op die nog draait: Les Celliers de Meknès maakt zo'n 85 procent van de Marokkaanse wijn.",
"Dus nee, Marokko is geen droog land. En juist dat maakt zijn belangrijkste sociale ritueel zo veelzeggend. Want dat ritueel is, tegen die hele achtergrond in, alcoholvrij.",
"De gastheer schenkt van dertig centimeter hoog, om de thee te luchten, te koelen en die schuimkraag te zetten, de rghwa. En dan de drie glazen: zacht als het leven, sterk als de liefde, bitter als de dood.",
"Want dat is wat hier werkelijk wordt geschonken. Niet de thee. De tijd, de aandacht, de boodschap dat jij er even mag zijn. Een wijnland dat zijn warmste moment niet aan de fles ophing maar aan de hand die inschenkt."].join('\n\n')
}));
items.push(mkItem({
  type:'blog', thema:'maghreb', status:'klaar', publishDate:'2026-12-17',
  kanalen:['site'], slug:'blog/marokko-thee-geschiedenis.html', bron:bronMd,
  titel:'De thee die per ongeluk in Marokko belandde',
  samenvatting:'Hoe groene thee in de 19e eeuw via een oorlog en een diplomatiek cadeau het nationale ritueel van Marokko werd.',
  body:"Er is een hardnekkig misverstand over Marokko en muntthee: dat het er altijd was. Dat is niet zo. De echte doorbraak was een logistiek ongeluk: tijdens de Krimoorlog zaten Britse handelaren met bergen onverkochte gunpowder-thee en stuurden de lading naar Noord-Afrika. Marokko maakte het zijne met munt en suiker. Een drank die binnenkwam door een oorlog en een misverstand, en die nu het eerste is wat een Marokkaan je aanbiedt."
}));
items.push(mkItem({
  type:'blog', thema:'maghreb', status:'klaar', publishDate:'2026-12-24',
  kanalen:['site'], slug:'blog/marokko-atay-nu.html', bron:bronMd,
  titel:'Het glas dat won toen de wereld minder ging drinken',
  samenvatting:'Terwijl de halve wereld zoekt naar een volwassen alcoholvrij ritueel, had Marokko het al eeuwen klaarstaan.',
  body:"Er klopt iemand op de deur, en binnen een minuut staat de berrad op het vuur. Atay is geen drankje, het is een vorm: de gastheer schenkt, iedereen schuift aan, de tijd rekt op. Precies dat, het ritueel boven de inhoud, is wat de no-low beweging nu probeert na te bouwen. Een goed aperitief zit niet in het glas. Het zit in de hand die schenkt."
}));
items.push(mkItem({
  type:'recept', thema:'maghreb', status:'klaar', publishDate:'2026-12-24',
  kanalen:['instagram','site'], slug:'recepten/atay-bnana.html', bron:bronMd,
  titel:"Recept: atay b'nana + briouats",
  samenvatting:'De signature serve van de Maghreb-maand, met het klassieke hapje dat bij het welkomstmoment hoort.',
  body:"De serve: spoel gunpowder groene thee kort, doe verse kruizemunt en suiker erbij in de berrad, laat trekken op laag vuur en schenk van dertig centimeter hoog voor de schuimkraag. Het hapje: briouats, krokante gevulde driehoekjes, die naast het glas verschijnen als er bezoek is."
}));
items.push(mkItem({
  type:'verdieping', thema:'maghreb', status:'klaar', publishDate:null,
  kanalen:['site'], slug:'verdieping/thee-als-product.html',
  bron:'publicatie-pijplijn.md + onderzoek-marokko.md',
  titel:'Thee als product: gunpowder, de Chinese handel, de suikereconomie',
  samenvatting:'Het verhaal van het blad zelf: gunpowder, de Chinese handel, de Krimoorlog-dump en de suikereconomie. Puur productverhaal, dus bewust van de hoofdlijn af.',
  body:'Een los verdiepingsstuk buiten de hoofdtijdlijn. Het gaat over het product (het theeblad, de handel, de suiker), niet over het welkomstmoment, en kaapt daarom de maand-wereld niet. Nog te schrijven vanuit het onderzoek.'
}));

/* ============================================================
   3) PLANNING — de maandmotor (juli–dec 2026)
   ============================================================ */
const WEEKDAY = {1:'03',2:'10',3:'17',4:'24'};
const date = (mm,wk) => '2026-'+mm+'-'+WEEKDAY[wk];
const CH = {site:['site'],iglinkedin:['instagram','linkedin'],ig:['instagram'],mail:['mail'],podcast:['spotify','youtube'],reel:['instagram','youtube'],igsite:['instagram','site']};
function maandmotor(mm, thema, wereld, status){
  const T=(type,wk,titel,kan)=>items.push(mkItem({type,thema,titel,status,publishDate:date(mm,wk),kanalen:kan,bron:'maandmotor (publicatie-pijplijn.md)'}));
  T('landingsfeit',1, wereld+': landenpagina-feiten verversen', CH.site);
  T('social-carrousel',1, 'Opening: '+wereld, CH.iglinkedin);
  T('nieuwsbrief',1, 'De Inschenker: '+wereld, CH.mail);
  T('longread',2, 'Longread: '+wereld, CH.site);
  T('podcast',2, 'De Importeur Vertelt: '+wereld, CH.podcast);
  T('reel',2, 'Sfeerloop: '+wereld, CH.reel);
  T('blog',3, 'Blog: het verleden van het moment ('+wereld+')', CH.site);
  T('social-carrousel',3, 'Wist je dat: '+wereld, CH.ig);
  T('blog',4, 'Blog: het heden van het moment ('+wereld+')', CH.site);
  T('recept',4, 'Recept: signature serve + hapje ('+wereld+')', CH.igsite);
  T('social-carrousel',4, 'Quote-carrousel: '+wereld, CH.ig);
}
maandmotor('07','italie','Italië, het podium','gepland');
maandmotor('08','nederland','Nederland pakt terug','gepland');
maandmotor('09','spanje','Spanje, de revival','concept');
maandmotor('10','frankrijk','Frankrijk + de anijsgordel','concept');
maandmotor('11','portugal','Portugal, de verrassing','idee');
maandmotor('12','maghreb','De Maghreb, de schenkende hand','concept');

/* ---- schrijven ---- */
const out = {
  meta:{
    merk:'APÉRO Culture',
    beschrijving:'Redactionele single source of truth. Het dashboard leest dit bij laden en exporteert ernaar terug (commit = canoniek). Live-items zijn geparset uit de echte blog/werelden-paginas.',
    versie:1, gegenereerd:NOW, site:SITE,
    themas:['italie','frankrijk','spanje','anijsgordel','portugal','maghreb','nederland','algemeen'],
    types:['longread','blog','landingsfeit','social-carrousel','reel','recept','nieuwsbrief','podcast','verdieping'],
    statuses:['idee','concept','klaar','gepland','live'],
    kanalen:['site','instagram','linkedin','mail','spotify','youtube']
  },
  items
};
const outDir = path.join(__dirname,'data');
if(!fs.existsSync(outDir)) fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'content.json'), JSON.stringify(out,null,2)+'\n','utf8');
const c={}; items.forEach(i=>c[i.status]=(c[i.status]||0)+1);
console.log('content.json:', items.length, 'items', JSON.stringify(c));
