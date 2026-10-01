# Bron van content/contentbank.json. Bewerken mag hier of later gewoon in Studio.
# Velden: titel | reeks | invalshoek | waarom | bronnen | plekken/mensen | beeld | k/m/l | social | prio | seizoen | festival | periode | research | maand
import json
R=[]
def t(titel,reeks,invalshoek,waarom,bronnen,plek,beeld,kml,social,prio,seizoen,festival,periode,research,maand):
    if isinstance(kml,str): kml=json.loads(kml)
    R.append(dict(titel=titel,reeks=reeks,invalshoek=invalshoek,waarom=waarom,bronnen=bronnen,plekken=plek,beeld=beeld,
                  versies=dict(zip('kml',kml)),social=social,prioriteit=prio,seizoen=seizoen,festival=festival,periode=periode,research=research,maand=maand))

# ---------- OM ZES UUR IN… ----------
t("Utrecht, 17:30","om-zes-uur","Hoe ziet het uur eruit in de festivalstad, nu al? Echte reportage: drie plekken, drie tijden, gesprekken met kroegbazen en vaste gasten. Geen samengestelde scène: dit kunnen we zelf zien.",
  "Maakt de brug naar juni 2027 zonder het festival te noemen. Lokaal publiek, lokale pers, en het eerste verhaal dat we volledig zelf waarnemen.",
  "Eigen waarneming; gesprekken met horeca (KHN Utrecht); gemeente Utrecht terrassenbeleid","Utrecht · kroegbazen aan de Oudegracht, Lombok, Twijnstraat","Eigen fotografie in de fresco-behandeling (wash + boog), geen stockbeeld",
  ["Drie plekken in één alinea","De reportage","Plus: een kaartje van de route en wat er om 17:30, 18:30, 19:30 gebeurt"],
  ["Carrousel: drie tafels, drie tijden","Reel: 30 sec. van één tafel om 17:30 (met toestemming)","Story-poll: waar begint jouw uur in Utrecht?"],1,"voorjaar","Hoog: introduceert de stad, zonder festival-woorden","nu","midden","2027-03")
t("Milaan, 18:30","om-zes-uur","Het aperitivo met buffet: één drankje, een bord dat je zelf vult. Wie gaat waarheen, wat kost het, wanneer werd het een maaltijd (apericena)?",
  "Meest gezochte aperitivo-stad; laat zien hoe een ritueel verandert als er geld mee gemoeid is.","Camparino in Galleria; Milanese pers over apericena; Accademia della Crusca over het woord 'apericena'","Milaan · Navigli, Porta Venezia, Galleria",
  "Fresco italie-alt; later eigen beeld","[\"Het bord dat je zelf vult\",\"Het buffet, de prijs, de studenten\",\"Plus: de ruzie over het woord apericena\"]",["Carrousel: wat je krijgt voor één drankje (2006 vs nu)","Quote-kaart uit het verhaal"],1,"lente/zomer","Middel: het bord als onderdeel van het glas","nu","midden","2027-01")
t("Marseille, 18:00","om-zes-uur","Pastis op het terras aan de Vieux-Port: 'un jaune', en de varianten met siroop (mauresque, perroquet, tomate). Wie bestelt wat, en waarom?",
  "Kleurrijk, concreet, zomers. De siroopvarianten zijn bij ons onbekend en direct deelbaar.","Ricard-geschiedenis; Marseillaise pers; Wikipedia Pastis (varianten)","Marseille · Vieux-Port, Le Panier",
  "Fresco frankrijk; illustratie van de vier kleuren pastis","[\"Vier kleuren pastis\",\"Het terras, de klok, de jeu de boules\",\"Plus: waarom pastis in 1932 kon ontstaan\"]",["Carrousel: 'Een geel, een papegaai, een tomaat' (de vier pastis)","Poll: zou jij een pastis met muntsiroop bestellen?"],1,"zomer","Middel: kleurrijk serveerbaar","nu","laag","2027-06")
t("Istanbul, 19:00","om-zes-uur","De meyhane en de çilingir sofrası: de 'slotenmakerstafel', een klein tafeltje voor rakı en meze thuis. Waarom heet het zo?",
  "Een woord dat niemand kent en iedereen wil kennen. Breidt de anijsgordel uit naar Turkije, met de nodige zorg.","Turkse culinaire literatuur (o.a. Artun Ünsal); meyhane-geschiedenis; Wikipedia Meyhane","Istanbul · Beyoğlu, Kumkapı",
  "Fresco anijsgordel; illustratie van een klein tafeltje","[\"Het tafeltje van de slotenmaker\",\"De meyhane, de rakı, de fasıl-muziek\",\"Plus: wie mocht er in de meyhane komen (klasse, religie)\"]",["Carrousel: 'De tafel die zo heet omdat…' (curiosity, met antwoord)","Reel: rakı wordt wit"],2,"najaar","Laag","19e eeuw, nu","hoog","2027-02")
t("Porto, 18:00","om-zes-uur","Aan de rivier: witte port met tonic, een 'fino' (tapbier), tremoços. Waarom drinken Porto's inwoners hun beroemdste drank bijna nooit?",
  "Een paradox die klopt en die mensen willen delen. Zomerse seizoenswaarde.","Instituto dos Vinhos do Douro e Porto; Portugese pers","Porto · Ribeira, Gaia, Foz","Fresco portugal-alt (sardines)",
  ["De drank die de stad niet drinkt","De rivier, de fino, de tremoços","Plus: 1756 en de grenspalen van Pombal"],["Carrousel: wat Porto zelf drinkt","Kaart: de Douro in 3 stippen"],2,"zomer","Middel: portonic als serve","nu, 1756","midden","2027-05")
t("Sevilla, 13:30","om-zes-uur","In Zuid-Spanje valt 'het uur' midden op de dag: el aperitivo vóór de late lunch. Een andere klok, dezelfde behoefte.",
  "Doorbreekt het idee dat het uur altijd 18:00 is. Goed voor de tijdkaart op de site.","Spaanse maaltijdtijden (INE-tijdsbestedingsonderzoek); Sevillaanse tapasliteratuur","Sevilla · Triana, Alfalfa","Fresco spanje",
  ["Het uur om half twee","Tapeo, de toog, de siësta-mythe","Plus: waarom Spanje in de verkeerde tijdzone leeft (1940)"],["Kaart: hoe laat is 'het uur' per land","Carrousel: Spanje leeft sinds 1940 in de tijdzone van Berlijn"],1,"lente","Laag","1940, nu","midden","2027-04")
t("Lyon, 18:30","om-zes-uur","De bouchon en de 'pot lyonnais', een fles van 46 cl met een dikke bodem. Waarom 46?",
  "Specifiek, grappig, waar; Lyon is gastronomisch zwaargewicht maar weinig bekend als aperostad.","Lyonese pers; Wikipedia Pot lyonnais","Lyon · Vieux Lyon, Croix-Rousse","Illustratie van de pot",
  ["De fles van 46 centiliter","De bouchon, de canuts, het ritme van de zijdewerkers","Plus: de 'mâchon', het ontbijt van de arbeiders"],["Carrousel: 'Waarom 46 cl?'","Quote-kaart"],3,"najaar","Laag","19e eeuw, nu","midden","2027-10")
t("Beiroet, 19:00","om-zes-uur","Arak en mezze in Mar Mikhael en Gemmayzeh, na alles wat de stad meemaakte. Wie zit er nog, en waarom blijven ze zitten?",
  "Menselijk en actueel, maar gevoelig. Alleen maken met een Libanese schrijver of gesprekspartner.","Libanese schrijvers/journalisten; Massaya; eigen interviews","Beiroet · Mar Mikhael, Gemmayzeh","Eigen beeld via partner; geen stock",
  ["De tafel die blijft staan","Arak, mezze, de stad","Plus: de karakeh in de bergen"],["Interview-carrousel met één citaat per slide"],3,"najaar","Laag","nu","hoog","2027-09")

# ---------- TOEN / NU ----------
t("Parijs: de zinc, 1960 en nu","toen-nu","De toog van het Parijse café, waar 's ochtends een 'petit blanc' werd gedronken door mensen op weg naar werk. Frankrijk telde ooit enkele honderdduizenden cafés; nu een fractie daarvan.",
  "Sterke cijfers (verifiëren!), herkenbare beelden, en een verhaal over verdwijnen dat niet nostalgisch hoeft te zijn.","INSEE; France Boissons/UMIH-cijfers over aantallen cafés; Balzac ('le comptoir d'un café est le parlement du peuple')","Parijs · een café-tabac in het 11e",
  "Archieffoto's (rechten!) of fresco frankrijk-alt","[\"De toog verdween\",\"Wie er stond, wat het kostte, wat er gezegd werd\",\"Plus: het café als parlement van het volk (Balzac)\"]",["Toen/nu-carrousel met twee cijfers","Poll: heb jij een stamcafé?"],1,"winter","Middel","1960, nu","midden","2027-01")
t("Het bruine café, 1975 en nu","toen-nu","Amsterdam, Utrecht: het bruine café voor en na het rookverbod (2008), de sluitingen, de nieuwe eigenaren. Wie komt er nu?",
  "Nederlands, dichtbij, en de natuurlijke opvolger van het jeneververhaal. Sterke herkenning bij lezers.","KHN-cijfers; Stadsarchieven; interviews met vaste gasten en eigenaren","Amsterdam, Utrecht · stamgasten, eigenaren","Eigen fotografie","[\"Wat verdween en wat bleef\",\"1975 en nu, tafel voor tafel\",\"Plus: de stamtafel als instituut\"]",["Toen/nu-carrousel","Reel: de stamtafel om 17:00"],1,"winter","Hoog: Utrecht-lokaal","1975, 2008, nu","midden","2026-12")
t("Athene: van kafeneio naar frappé","toen-nu","In 1957 ontstond op een beurs in Thessaloniki per ongeluk de frappé. Hoe verving een geschudde koffie de dorpskafeneio als ontmoetingsplek?",
  "Een ongeluk met een datum; goed verhaal, deelbaar, laat zien dat rituelen ook nieuw kunnen zijn.","Nestlé Hellas-geschiedenis; Wikipedia Frappé coffee; Griekse pers","Thessaloniki, Athene","Illustratie van het schudbekertje",
  ["Een ongeluk uit 1957","Het kafeneio, de frappé, de uren op het terras","Plus: freddo espresso en de nieuwe generatie"],["Carrousel: 'Deze koffie bestaat door een ongeluk'","Poll: frappé of freddo?"],2,"zomer","Laag","1957, nu","laag","2027-07")
t("Marseille, 1951: de pastis mag weer","toen-nu","Vichy verbood anijsdranken in 1940; na de oorlog kwam de pastis terug. Wat betekende dat voor de terrassen van Marseille?",
  "Politiek en drank in één verhaal. Past bij 'Dranken uit een verbod' en verdiept het.","Franse wetgeving 1940–1951 (Légifrance); Ricard-archief; historici van de Franse drankpolitiek","Marseille","Fresco frankrijk","[\"Het verbod en de terugkeer\",\"Vichy, de anijs, het terras\",\"Plus: waarom 45%\"]",["Carrousel: tijdlijn 1915–1951"],2,"zomer","Laag","1940, 1951","hoog","2027-06")
t("Het Nederlandse terras, 1960 en nu","toen-nu","Wanneer werd buiten zitten normaal in Nederland? Vergunningen, weer, de spritz, en de coronazomer van 2020 die terrassen uitbreidde.",
  "Seizoensopener voor het voorjaar; herkenning; de brug naar 'Nederland pakt het uur terug'.","Gemeentelijke terrasregels; KHN; krantenarchief Delpher","Utrecht, Amsterdam","Eigen fotografie + Delpher-krantenknipsels","[\"Buiten zitten, sinds wanneer?\",\"Het terras als nieuwe tafel\",\"Plus: de coronazomer\"]",["Delpher-knipsel als carrousel","Poll: eerste terrasdag al gehad?"],1,"voorjaar","Hoog: het festival is buiten","1960, 2020, nu","midden","2027-03")
t("De apericena, 2000 en nu","toen-nu","Studenten in Milaan rekten het aperitivo-buffet op tot avondeten. Grootmoeders vonden het niets. Wat bleef er over na twintig jaar?",
  "Generaties, geld en eten. Leuk contrast met de 'generatie die minder drinkt'.","Italiaanse pers; Accademia della Crusca over het woord","Milaan","Fresco italie-alt","[\"Eén drankje, onbeperkt bord\",\"Hoe een woord ontstond\",\"Plus: waarom Italianen er ruzie over maken\"]",["Carrousel: het woord apericena in 5 slides"],3,"lente","Laag","2000, nu","laag","2027-05")

# ---------- WIE ZAT WAAR ----------
t("Waar mocht een vrouw alleen zitten?","wie-zat-waar","Vier landen, vier momenten: wanneer werd het normaal dat een vrouw alleen een café of bar binnenliep? Griekse kafeneio, Spaanse bar, Nederlandse kroeg, Italiaanse bar.",
  "Het sterkste onderwerp in de hele bank: sociaal, onderzocht, en een vraag die veel lezers zichzelf nooit stelden.","Jane Cowan (1991); Spaanse sociale geschiedenis (licencia marital 1975); Nederlandse vrouwengeschiedenis (Atria); Italiaanse genderstudies","Athene, Madrid, Amsterdam, Milaan","Illustraties; archiefbeeld met rechten","[\"Vier deuren, vier jaartallen\",\"Het hele verhaal\",\"Plus: getuigenissen van vrouwen die het meemaakten\"]",["Carrousel: vier jaartallen","Interviewserie: 'Mijn moeder ging nooit alleen'"],1,"voorjaar (8 maart)","Middel: wie zit er op het festival aan tafel","20e eeuw","hoog","2027-03")
t("Het café als parlement van het volk","wie-zat-waar","Balzac noemde de toog van een café het parlement van het volk. Wat werd er besproken, door wie, en waarom keek de politie mee?",
  "Politiek en tafel. Onderscheidend ten opzichte van lifestylemedia.","Balzac; W. Scott Haine, 'The World of the Paris Café' (1996)","Parijs, 19e eeuw","Archiefprenten (publiek domein)","[\"De toog als parlement\",\"Arbeiders, politie, kranten\",\"Plus: de cafés van de Commune\"]",["Quote-kaart Balzac","Carrousel: wat de politie noteerde"],2,"winter","Laag","19e eeuw","hoog","2027-02")
t("De sociëteit en de kroeg","wie-zat-waar","Twee Nederlandse drinkplekken op honderd meter afstand: de herensociëteit met leestafel en de kroeg met jenever. Wie kwam waar, en waarom nooit in de ander?",
  "Vervolg op het jeneververhaal. Klasse zichtbaar gemaakt in één straat.","Archieven van sociëteiten (bv. De Witte, Den Haag, 1802); Brugmans; stadsarchieven","Den Haag, Utrecht","Archiefbeeld","[\"Honderd meter\",\"Twee drinkplekken, twee standen\",\"Plus: de ballotage\"]",["Carrousel: ballotage uitgelegd"],2,"najaar","Laag","19e eeuw","hoog","2027-10")
t("De havenkroeg","wie-zat-waar","Rotterdam, Marseille, Genua: kroegen bij de haven waar sjouwers, zeelieden en handelaren door elkaar zaten. Wie betaalde met welk geld?",
  "Internationaal en rauw; laat de handel achter de drank zien.","Havenarchieven; Rotterdamse stadsgeschiedenis; Marseillaise historici","Rotterdam, Marseille, Genua","Archief","[\"Drie havens\",\"Het hele verhaal\",\"Plus: het drinkgeld en de ploegbaas\"]",["Kaart: drie havens"],3,"najaar","Laag","19e–20e eeuw","hoog","2027-11")
t("De Spritz en de Oostenrijkers","wie-zat-waar","Veneto onder Habsburgs bestuur: soldaten en ambtenaren die de wijn te sterk vonden en er water bij deden. Wie dronk de spritz vóór hij oranje werd?",
  "Rekent af met de marketinggeschiedenis; laat zien wie er in 1850 aan de toog stond.","Italiaanse historici; Wikipedia Spritz (bronnen nalopen); Aperol-archief voor de latere fase","Venetië, Padua, Triëst","Fresco","[\"Het water van de bezetter\",\"Van spuitwater naar oranje\",\"Plus: de spritz-oorlog tussen Aperol, Select en Campari\"]",["Carrousel: 4 kleuren spritz, 4 steden"],2,"zomer","Middel","1800–1866, nu","midden","2027-06")

# ---------- ONGESCHREVEN REGELS ----------
t("Staan of zitten","ongeschreven","In Italië kost hetzelfde glas aan de toog de helft van aan een tafeltje. Waarom, en wat zegt dat over wie er staat?",
  "Praktisch, verrassend, voor iedereen die naar Italië gaat. Hoge zoekwaarde zonder contentfarm te zijn.","Italiaanse consumentenorganisaties; Michelin Guide-artikel over koffieregels; gemeentelijke prijsregels","Italië","Illustratie toog vs tafel","[\"Dezelfde koffie, twee prijzen\",\"Het hele verhaal\",\"Plus: de bar als democratische plek\"]",["Carrousel: 'Waarom je in Italië moet blijven staan'","Poll: staan of zitten?"],1,"lente (reisseizoen)","Laag","nu","laag","2027-04")
t("Proosten","ongeschreven","Yamas, salud, santé, proost. Kijk je elkaar aan? Tik je met water? Een vergelijking van de regels rond het proosten, met duidelijk onderscheid tussen gewoonte en bijgeloof.",
  "Iedereen proost; niemand weet de regels van een ander. Perfect voor social en gesprek aan tafel.","Etiquette-literatuur; taalkundige bronnen per land; label 'bijgeloof' waar het bijgeloof is","Athene, Madrid, Parijs, Rome, Utrecht","Illustratie: zes glazen","[\"Zes landen, één gebaar\",\"Het hele verhaal\",\"Plus: waarom we eigenlijk tikken\"]",["Reel: 'Proost' in zes talen","Carrousel: de regels per land"],1,"december (feestdagen)","Middel","nu","laag","2026-12")
t("Hoe laat is het uur?","ongeschreven","Een datavergelijking: wanneer begint het uur tussen werk en diner in twaalf steden, en wanneer eten ze? Met één grote grafiek.",
  "Visueel, deelbaar, en het fundament onder de klok op de voorpagina.","Nationale tijdsbestedingsonderzoeken (Eurostat HETUS); INE; CBS","Europa","Grafiek in huisstijl","[\"Eén grafiek\",\"De grafiek, uitgelegd\",\"Plus: waarom Nederland zo vroeg eet\"]",["De grafiek als post","Carrousel per stad"],1,"winter","Middel: het festivaluur","nu","midden","2027-01")
t("Waarom Nederlanders om zes uur eten","ongeschreven","Wij eten vroeg, Spanjaarden laat. Wat verklaart dat? Werktijden, protestantisme, fabrieken, de zon? Uitzoeken wat klopt en wat mythe is.",
  "De vraag die elke Nederlander in Spanje stelt. Sterke zoekvraag, en precies het terrein van APÉRO.","CBS tijdsbesteding; historici van het Nederlandse eetpatroon (bv. Jozien Jobse-van Putten, 'Eenvoudig maar voedzaam', 1995)","Nederland, Spanje","Grafiek","[\"Het korte antwoord\",\"Het hele verhaal\",\"Plus: waarom het uur daardoor bij ons verdween\"]",["Poll: hoe laat eet jij?","Carrousel: 3 mythes, 1 verklaring"],1,"najaar","Hoog: waarom het festival vroeg begint","19e eeuw, nu","hoog","2027-02")
t("Het ijs komt als laatste","ongeschreven","Water, dan ijs, of andersom? Van arak tot pastis tot vermut: de volgorde van schenken, en de natuurkunde erachter.",
  "Kort, praktisch, met een 'waarom'. Goed voor video.","Scheikunde van anijsolie (louche); drankliteratuur","Anijsgordel, Frankrijk, Spanje","Video: macro van een glas","[\"De volgorde\",\"De volgorde en de natuurkunde\",\"\"]",["Reel: de volgorde in 15 seconden"],2,"zomer","Middel: live aan de bar","nu","laag","2027-07")
t("Fooi aan de toog","ongeschreven","Laat je wisselgeld liggen? Rond je af? Een vergelijking van fooigewoonten aan de bar in zes landen.",
  "Praktisch en licht; zomerse reisvraag.","Nationale horecaorganisaties; reisliteratuur; eigen vragen aan barpersoneel","Europa","Illustratie","[\"Zes landen\",\"Het hele verhaal\",\"\"]",["Carrousel: fooi per land"],3,"zomer","Laag","nu","laag","2027-08")
t("Wie schenkt?","ongeschreven","In Marokko schenkt de gastheer, in Griekenland de oudste, in Nederland wie opstaat. Over de hand die inschenkt.",
  "Vervolg op 'Wie betaalt?'. Sluit aan bij de naam van de nieuwsbrief.","Etnografische literatuur; eigen gesprekken","Marrakech, Athene, Utrecht","Illustratie: de schenkende hand","[\"De hand die schenkt\",\"Het hele verhaal\",\"\"]",["Reel: vijf manieren van schenken"],2,"najaar","Hoog: het festival schenkt","nu","midden","2027-09")

# ---------- EEN GLAS, EEN STAD ----------
t("Kir, Dijon","een-glas","Een burgemeester en kanunnik, Félix Kir, die na de oorlog aligoté met crème de cassis schonk. Waarom werd dit glas een stadssymbool?",
  "Een echte persoon, een echte stad, een glas dat iedereen kent maar niemand kan plaatsen.","Wikipedia Félix Kir; stad Dijon; Franse pers","Dijon · Félix Kir","Archieffoto Kir (rechten nagaan)","[\"De kanunnik en de cassis\",\"Het hele verhaal\",\"\"]",["Carrousel: 'Deze drank is een burgemeester'"],1,"winter","Middel","1945, nu","laag","2027-01")
t("Frappé, Thessaloniki","een-glas","1957: een vertegenwoordiger op een beurs, geen heet water, een schudbeker. (Toen/nu-variant staat ook in de bank; kies één.)",
  "Klein, grappig, waar.","Wikipedia Frappé coffee; Nestlé Hellas","Thessaloniki","Illustratie","[\"Het ongeluk\",\"Het glas en de stad\",\"\"]",["Reel: schudden"],3,"zomer","Laag","1957","laag","2027-07")
t("Kopstoot, Schiedam","een-glas","Een glas jenever en een biertje ernaast. Schiedam, de stad met de hoogste molens ter wereld, en de branderijen die de lucht zwart maakten.",
  "Nederlands, dichtbij festival, visueel sterk (molens), en de brug van jenever naar nu.","Nationaal Jenevermuseum Schiedam; stadsarchief Schiedam","Schiedam · het Jenevermuseum","Eigen fotografie molens","[\"Twee glazen\",\"De stad die naar mout rook\",\"Plus: 'Zwart Nazareth'\"]",["Reel: de molens","Carrousel: kopstoot uitgelegd"],1,"winter","Hoog: Nederlandse bar","19e eeuw, nu","midden","2026-12")
t("Txakoli, Getaria","een-glas","Een Baskische witte wijn die van hoog wordt ingeschonken, zodat hij even bruist. Wie schenkt, hoe hoog, en waarom?",
  "Het gebaar van hoog schenken verbindt Baskenland met Marokko (atay). Visueel sterk.","DO Getariako Txakolina; Baskische bronnen","Getaria, Bilbao","Video: de straal","[\"Van hoog\",\"Het glas en de kust\",\"\"]",["Reel: de straal in slow motion"],2,"zomer","Hoog: het gebaar van hoog schenken","nu","laag","2027-06")
t("Picon bière, Lille","een-glas","Een bitter uit Algerije (1837, Gaétan Picon) die in Noord-Frankrijk in het bier belandde. Koloniale geschiedenis in een pils.",
  "Onverwacht, kritisch, dichtbij (Noord-Frankrijk). Laat zien hoe een glas geschiedenis draagt.","Wikipedia Amer Picon; historici Franse koloniale handel","Lille, Straatsburg, Algerije","Fresco","[\"Een bitter in je bier\",\"Van Algerije naar Lille\",\"\"]",["Carrousel: de reis van één fles"],2,"najaar","Laag","1837, nu","midden","2027-10")
t("Bicerin, Turijn","een-glas","Koffie, chocolade en room in lagen, sinds 1763 geschonken in Caffè Al Bicerin tegenover de Consolata. Het winterglas van de stad.",
  "Winterseizoen zonder alcohol; mooie plek; laat zien dat het uur ook warm kan zijn.","Caffè Al Bicerin; Turijnse stadsgeschiedenis","Turijn · Caffè Al Bicerin","Fresco / eigen beeld","[\"Drie lagen\",\"Het glas en de kerk\",\"\"]",["Carrousel: drie lagen"],2,"winter","Middel: alcoholvrij","1763, nu","laag","2026-12")
t("Portonic, Porto","een-glas","Witte port, tonic, ijs, munt. Hoe de wijn van export een zomerdrankje voor thuis werd.",
  "Zomer, makkelijk na te maken, sluit aan bij de Portugal-wereld.","IVDP; Porto-huizen (bronnen kritisch lezen)","Porto","Fresco portugal","[\"Het glas\",\"Het glas en de rivier\",\"\"]",["Reel: zelf maken","Carrousel: 3 ingrediënten"],2,"zomer","Middel: serve","nu","laag","2027-07")
t("Americano, Milaan","een-glas","Milano-Torino plus soda: waarom heet een Italiaans drankje 'Amerikaans'?",
  "Een vraag die iedereen stelt; leidt naar de Negroni (bestaand verhaal).","Camparino; Italiaanse drankgeschiedenis; bronnen kritisch (veel mythes)","Milaan","Fresco italie","[\"De naam\",\"Het hele verhaal\",\"\"]",["Carrousel: 'Waarom Americano?'"],3,"lente","Laag","19e–20e eeuw","midden","2027-04")

# ---------- WAAROM WE DIT DRINKEN ----------
t("Waarom Campari rood is","waarom","Tot 2006 kwam de rode kleur van Campari uit karmijn, gemaakt van schildluizen. Wat zegt een kleur over een drank?",
  "Een feit dat mensen doorvertellen. Goed onderbouwbaar.","Campari Group (verklaring 2006); voedingsmiddelenregistratie E120","Milaan","Macrofoto rood","[\"De luis in de fles\",\"Kleur, merk en herkenning\",\"\"]",["Carrousel: 'Tot 2006 zat hier een insect in'"],1,"lente","Laag","2006","laag","2027-02")
t("Waarom tonic bitter is","waarom","Kinine tegen malaria, Britse soldaten in India, gin erbij. Hoe een medicijn een aperitief werd.",
  "Past bij 'Waarom bitter'. Kritisch over koloniale geschiedenis.","Medische geschiedenis van kinine; Wellcome Collection","India, Londen","Fresco","[\"Het medicijn\",\"Van kinine tot tonic\",\"\"]",["Carrousel: tijdlijn kinine"],2,"zomer","Laag","19e eeuw","midden","2027-08")
t("Waarom de spritz oranje werd","waarom","Aperol werd in 1919 in Padua gelanceerd; de oranje spritz is vooral een succes van reclame. Wat was de spritz daarvoor?",
  "Nuanceert een hype; mensen houden van 'het zit anders'.","Aperol/Campari-archief (kritisch); Italiaanse pers; reclamehistorici","Padua, Venetië","Oude reclames (rechten!)","[\"Oranje is jong\",\"Het hele verhaal\",\"\"]",["Carrousel: reclames door de jaren"],2,"zomer","Laag","1919, 1950s, nu","midden","2027-06")
t("Waarom er alsem in vermout zit","waarom","Wermut, alsem, maagklachten, en de mythe van de gekmakende absint.",
  "Wetenschap en mythe; past bij de vermut-revival.","Farmacologische literatuur over thujon; EU-regels voor vermout","Turijn","Illustratie alsem","[\"De plant\",\"Plant, maag en mythe\",\"\"]",["Carrousel: mythe vs feit"],3,"najaar","Laag","1786, nu","midden","2027-09")
t("Waarom er bitterballen bij de borrel horen","waarom","Het bittergarnituur: wat je at bij een bittertje, en hoe de bitterbal het Nederlandse hapje werd.",
  "Nederlands, herkenbaar, deelbaar, en de 'meze' van Nederland.","Delpher (krantenadvertenties bittergarnituur); culinaire historici","Nederland","Eigen fotografie","[\"De bal bij het bittertje\",\"Het hele verhaal\",\"\"]",["Poll: mosterd of niet?","Carrousel: bittergarnituur 1920 vs nu"],1,"najaar","Hoog: Nederlandse tafel","20e eeuw, nu","midden","2026-11")

# ---------- OP TAFEL ----------
t("De gilda","op-tafel","Ansjovis, olijf, pepertje op een prikker: in San Sebastián vernoemd naar Rita Hayworth in 'Gilda' (1946), 'groen, zout en een beetje pittig'.",
  "Een hapje met een filmster en een jaartal. Makkelijk thuis te maken.","Casa Vallés, San Sebastián; Baskische culinaire bronnen","San Sebastián · Casa Vallés","Eigen foto; filmposter (rechten)","[\"Het hapje van een filmster\",\"Het hele verhaal\",\"\"]",["Reel: gilda maken in 20 sec","Carrousel: 3 ingrediënten + 1 film"],1,"lente","Hoog: serveerbaar","1946, nu","laag","2027-03")
t("Conservas: vis uit blik","op-tafel","In Portugal en Spanje is vis uit blik geen armoede maar trots, en een jonge generatie ontdekte het opnieuw. Wie maakt het, wie eet het?",
  "Actuele trend (tinned fish), met echte makers en geschiedenis.","Portugese conservenfabrieken (Ramirez 1853); marktdata; eigen interviews","Matosinhos, Lissabon, Galicië","Eigen fotografie blikken","[\"Het blikje\",\"De fabriek, de vissers, de trend\",\"Plus: waarom het blik ooit een noodzaak was\"]",["Carrousel: blikken als kunst","Reel: blik open, brood, olie"],1,"zomer","Hoog: serveerbaar, partners","1853, nu","midden","2027-05")
t("Tramezzino, Turijn","op-tafel","Het korstloze driehoekje zou in 1925 bij Caffè Mulassano zijn uitgevonden, en de naam van D'Annunzio hebben gekregen. Wat klopt ervan?",
  "Mooi verhaal dat om factcheck vraagt: laat zien hoe APÉRO met overlevering omgaat.","Caffè Mulassano; Italiaanse culinaire historici","Turijn · Caffè Mulassano","Fresco","[\"Het driehoekje\",\"Het hele verhaal, met factcheck\",\"\"]",["Carrousel: 'Klopt dit?'"],2,"lente","Laag","1925","midden","2027-04")
t("De olijf","op-tafel","Waarom staat er overal ter wereld een schaaltje olijven bij het glas? Over zout, dorst, handel en gastvrijheid.",
  "Het meest universele hapje; laat verschillen per land zien.","Culinaire literatuur; olijfteeltbronnen","Middellandse Zee","Macrofotografie","[\"Het schaaltje\",\"Het hele verhaal\",\"\"]",["Carrousel: zes olijven, zes landen"],2,"najaar (oogst)","Middel","nu","laag","2027-11")
t("Hoeveel borden is een meze?","op-tafel","Aan een Griekse of Libanese tafel komen de borden in golven. Is er een volgorde, een logica, een eind?",
  "Vervolg op Athene; eten krijgt de hoofdrol.","Libanese en Griekse kookboeken; interviews met koks","Athene, Beiroet, Volos","Bovenaanzicht van een volle tafel","[\"De golven\",\"Het hele verhaal\",\"\"]",["Reel: tafel vol in 10 sec (timelapse)"],2,"zomer","Hoog: het festivalbord","nu","midden","2027-06")
t("Het apéro dînatoire","op-tafel","De Franse avond waarin het aperitief het diner wordt: plankjes, quiches, en geen hoofdgerecht. Sinds wanneer, en waarom?",
  "Thuis na te doen; sluit aan bij hoe Nederlanders nu 'borrelen' als diner.","Franse pers; sociologen van het Franse eten","Frankrijk","Eigen styling","[\"Geen hoofdgerecht\",\"Het hele verhaal\",\"\"]",["Carrousel: een planche opbouwen"],2,"najaar","Middel","nu","laag","2027-11")

# ---------- ESSAY / NU ----------
t("Alcoholvrij aan tafel","essay","Nieuwe cijfers: Nederlandse jongeren drinken steeds vaker niet, alcoholvrij bier groeit hard. Wat betekent dat voor het uur?",
  "Actueel (Dry January), onderbouwd met Trimbos/NJi-data, sluit aan op bestaand essay.","Trimbos factsheet alcoholvrije dranken (2025); NJi; Nederlandse Brouwers (2025)","Nederland","Grafiek","[\"De cijfers\",\"Wat er verandert aan tafel\",\"\"]",["Grafiek-post","Poll: drink jij in januari?"],1,"januari","Hoog: alcoholvrij op het festival","nu","laag","2027-01")
t("De apéro géant van 2010","essay","Via Facebook kwamen in Nantes duizenden mensen samen voor een gigantische apéro; er viel een dode. Wat gebeurt er als het uur viraal gaat?",
  "Social media en tafelcultuur; kritisch en actueel. Ook een les voor een festival.","Franse pers 2010 (Le Monde, Libération)","Nantes, Frankrijk","Archiefbeeld (rechten)","[\"De avond in Nantes\",\"Het hele verhaal\",\"Plus: wat een festival hiervan leert\"]",["Carrousel: tijdlijn van een virale apéro"],2,"voorjaar","Hoog: hoe groot mag een tafel worden","2010","midden","2027-05")
t("De borrel staat in de agenda","essay","Waarom de Nederlandse borrel om vijf begint en om zeven stopt, en wat er verloren ging toen hij een werkafspraak werd.",
  "De eigen stem van APÉRO; prikkelend maar niet belerend.","CBS werktijden; eigen observatie","Nederland","Illustratie","[\"Vijf tot zeven\",\"Het essay\",\"\"]",["Quote-kaart","Poll: wanneer stopt jouw borrel?"],2,"najaar","Hoog: waarom een festival zonder eindtijd","nu","laag","2027-10")
t("Waarom een festival een tafel is","essay","Waarom maakt een magazine een festival? Een essay dat uitlegt wat er in juni gebeurt, zonder programma.",
  "Het moment waarop magazine en festival samenvallen. Alleen publiceren in de onthullingsfase.","Eigen redactie","Utrecht","Eigen beeld","[\"De tafel\",\"Het essay\",\"\"]",["Carrousel: de vijf regels van APÉRO"],1,"winter","Kern: de onthulling","nu","laag","2027-01")

# ---------- MENSEN ACHTER DE TAFEL (profielen, reeks: wie-zat-waar of om-zes-uur) ----------
t("De barman van de Camparino","wie-zat-waar","Een dag met de mensen achter de toog van de Camparino in Galleria, waar sinds 1915 de soda uit de kraan komt.",
  "Mensen, niet merken. Laat vakmanschap zien.","Eigen interview; Camparino","Milaan · Camparino","Eigen fotografie","[\"Eén dienst\",\"Het portret\",\"\"]",["Interview-carrousel: 5 vragen"],2,"lente","Middel: gastbartender?","nu","hoog","2027-04")
t("Een ouzeri in Volos","om-zes-uur","Een echt portret van één tsipouradiko: de eigenaar, de keuken die beslist, de vaste gasten. Het vervolg op de samengestelde scène in Athene, maar dan waargenomen.",
  "Maakt de samengestelde scène 'echt'; laat zien dat we ook ter plekke gaan.","Eigen reportage; tolk","Volos · één tsipouradiko","Eigen fotografie","[\"Eén keuken\",\"De reportage\",\"Plus: het recept van het derde bordje\"]",["Reel: de borden komen","Carrousel: bordje 1 t/m 6"],1,"najaar","Hoog: gastkeuken?","nu","hoog","2027-09")
t("De Utrechtse kroegbaas","wie-zat-waar","Een profiel van iemand die al decennia een Utrechtse kroeg runt: wie er kwam, wie er nog komt.",
  "Lokaal, menselijk, festivalbrug.","Eigen interview","Utrecht","Eigen fotografie","[\"Veertig jaar\",\"Het portret\",\"\"]",["Interview-reel"],1,"voorjaar","Hoog: lokale partner","1980–nu","midden","2027-02")
t("De importeur","wie-zat-waar","Wie brengt de vermut, de ouzo en de port naar Nederland? Een portret van een importeur, met de kritische vragen erbij.",
  "Brug naar partners zonder advertorial te worden. Transparant over belangen.","Eigen interview; branchecijfers","Nederland","Eigen fotografie","[\"De fles\",\"Het portret\",\"\"]",["Carrousel: de reis van één fles naar Nederland"],2,"najaar","Hoog: partner, maar redactioneel","nu","midden","2027-10")

# nummeren
for i,x in enumerate(R,1):
    x['id']='cb-%03d'%i; x['status']='idee'
    if isinstance(x['versies'].get('k'),str) and x['versies']['k'].startswith('['):
        pass
# enkele versies waren als JSON-string opgegeven: normaliseer
for x in R:
    v=x['versies']
    if isinstance(v.get('k'),str) and v['k'].startswith('["'):
        a=json.loads(v['k']); x['versies']=dict(zip('kml',a))
json.dump(R,open('content/contentbank.json','w'),ensure_ascii=False,indent=1)
print(len(R),'onderwerpen')
