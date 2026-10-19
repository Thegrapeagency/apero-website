# Bron van content/planning.json: de voorgestelde planning richting juni 2027.
# Alles hierin is een VOORSTEL (status 'voorstel' of 'gepland'); pas het aan in Studio.
import json, datetime as dt
P=[]
def add(datum,type_,titel,**kw):
    P.append(dict(id='p-%03d'%(len(P)+1),datum=datum,type=type_,titel=titel,status=kw.pop('status','gepland'),**kw))

# ---- verhalen die klaarstaan (dinsdag = publicatiedag) ----
verhalen=[('2026-10-06','athene-1814','Athene, 18:14'),('2026-10-20','spanje-1974-en-nu','Spanje, 1974. En nu.'),
          ('2026-11-03','wie-betaalt','Wie betaalt?'),('2026-11-17','jenever-en-het-loon','Het loon werd in de kroeg betaald'),
          ('2026-12-01','ombra','Een schaduw, graag')]
for d,s,t in verhalen: add(d,'verhaal',t,verhaal=s,kanaal='site')

# ---- social-afgeleiden per verhaal: concreet, niet generiek ----
S=[
 ('2026-10-07','athene-1814','instagram','carrousel','Het bord dat niemand besteld heeft','6 slides: de tafel om 18:14 · kerasma · xerosfyri · Volos, een bordje per flesje · refené · "lees kort (1 min) of lang (7 min)"'),
 ('2026-10-09','athene-1814','instagram','story-poll','Doe jij meteen iets terug als iemand je trakteert?','Ja, meteen / Nee, later / Ik laat het gebeuren. Resultaat delen in De Inschenker.'),
 ('2026-10-13','athene-1814','instagram','reel','Ouzo wordt wit','15 sec macro van water in ouzo. Tekst: "Nooit op de droge hamer." Geen muziek-trend, wel omgevingsgeluid.'),
 ('2026-10-21','spanje-1974-en-nu','instagram','carrousel','Zondag, kwart over één. 1974 en nu.','Twee scènes naast elkaar, slide voor slide: wie staat er, wat staat er, wat ligt er op de vloer.'),
 ('2026-10-23','spanje-1974-en-nu','instagram','story-quiz','Sinds wanneer mag er in Spaanse bars niet meer gerookt worden?','2006 / 2011 / 2016. Antwoord: 2 januari 2011, terrassen uitgezonderd.'),
 ('2026-10-25','spanje-1974-en-nu','instagram','post','Het is zondag, kwart over één.','Om 13:15 posten, het moment van de scène. Eén beeld, één zin, link in bio.'),
 ('2026-11-04','wie-betaalt','instagram','carrousel','Wie betaalt? Vier landen, vier systemen','Refené · de bote · het rondje · de gastheer. Laatste slide: "En bij jou?"'),
 ('2026-11-05','wie-betaalt','instagram','story-poll','Rondje, pot of ieder voor zich?','Resultaat in de volgende Inschenker.'),
 ('2026-11-18','jenever-en-het-loon','instagram','carrousel','1881 in zes cijfers','5 liter · 9 liter · 45.000 verkopers · 33.000 vergunningen · 12.000 sluitingen · 1 verbod: geen loon in de kroeg'),
 ('2026-11-21','jenever-en-het-loon','instagram','reel','De eerste slok buig je','Opname bij een proeflokaal (toestemming vragen). Geen voice-over, alleen het gebaar.'),
 ('2026-12-02','ombra','instagram','carrousel','Een schaduw, graag','Het verhaal van de toren, met het label "overlevering" op de slide. Transparantie is hier het punt.'),
 ('2026-12-04','ombra','instagram','story-vraag','Heb jij een woord voor een klein glas wijn?','Open vraag; de beste antwoorden in De Inschenker (met toestemming).'),
]
for d,s,k,f,t,n in S: add(d,'social',t,verhaal=s,kanaal=k,format=f,notitie=n)

# ---- De Inschenker: om de week, donderdag ----
edities=[('2026-10-08','#1 · Een bord dat niemand besteld heeft','athene-1814'),('2026-10-22','#2 · Zondag, kwart over één','spanje-1974-en-nu'),
         ('2026-11-05','#3 · Wie betaalt?','wie-betaalt'),('2026-11-19','#4 · Buigen voor je glas','jenever-en-het-loon'),
         ('2026-12-03','#5 · Een schaduw, graag','ombra'),('2026-12-17','#6 · Proosten (en een jaar in zes glazen)',''),
         ('2027-01-14','#8 · Juni 2027: de data en de plek (een week eerder dan de rest)','')]
for d,t,s in edities: add(d,'nieuwsbrief',t,verhaal=s,kanaal='mail')

# ---- festivalmijlpalen ----
F=[('2026-10-06','Festivalpagina: minder vertellen, wel "wat we weten / nog niet"','live','Nieuwe versie van de site'),
   ('2026-11-30','Besluit: data en locatie vast (intern)','voorstel','Voorwaarde voor de onthulling in januari'),
   ('2027-01-14','Onthulling data + plek, eerst in De Inschenker','voorstel','Belofte: een week eerder dan de rest'),
   ('2027-01-21','Onthulling data + plek, publiek','voorstel','Pers + Instagram + site'),
   ('2027-02-15','Eerste partners rond (intern)','voorstel','Zie partners.html en de pitch'),
   ('2027-03-11','Voorverkoop voor lezers van De Inschenker','voorstel','Geen aftelklok, wel een echte, eerlijke eerste kans'),
   ('2027-03-18','Kaartverkoop open','voorstel',''),
   ('2027-04-08','Onthulling 1: wie er schenkt (drie namen, drie verhalen)','voorstel','Elke naam krijgt een eigen verhaal op de site'),
   ('2027-05-06','Onthulling 2: de keukens en het programma','voorstel',''),
   ('2027-05-27','Praktisch: plattegrond, tijden, alcoholvrij','voorstel',''),
   ('2027-06-15','APÉRO Festival, Utrecht (datum volgt)','voorstel','Placeholderdatum'),
   ('2027-06-24','Afterglow: verslag, foto\'s, "wat we leerden"','voorstel','')]
for d,t,st,n in F: add(d,'festival',t,status=st,notitie=n,kanaal='festival')

# ---- taken: wat doen we deze en volgende week ----
T=[('2026-10-01','Kies de nieuwsbriefdienst (voorstel: Brevo) en zet de variabelen in Vercel','open','Zie api/aanmelden.mjs'),
   ('2026-10-02','Athene, 18:14: tweede lezer doet de factcheck op de bronnenlijst','open',''),
   ('2026-10-02','Instagram-bio en highlights aanpassen: magazine eerst, festival als hint','open',''),
   ('2026-10-05','Beeldrechten fresco\'s vastleggen (herkomst, licentie) in de Bibliotheek','open',''),
   ('2026-10-07','Utrecht, 17:30: drie kroegen benaderen voor de reportage','open','Contentbank cb-001'),
   ('2026-10-08','Keuze maken: welke 6 onderwerpen uit de contentbank voor januari–maart','open','Zie prioriteit 1 in de bank'),
   ('2026-10-09','Besluit: nieuwe site live zetten of nog niet (vergelijk met de huidige)','open','Migratie alleen na expliciet akkoord')]
for d,t,st,n in T: add(d,'taak',t,status=st,notitie=n)

P.sort(key=lambda x:x['datum'])
json.dump(P,open('content/planning.json','w'),ensure_ascii=False,indent=1)
print(len(P),'planningsitems')
