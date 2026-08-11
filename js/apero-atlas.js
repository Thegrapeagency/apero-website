(function () {
  var worlds = {
    italy: {
      name: "Italië, het podium",
      short: "Het podium",
      line: "Het aperitivo is geen pauze van het leven, het is het optreden.",
      art: "assets/fresco/fresco-01.jpg",
      serve: "Aankomen mag gezien worden: iets zouts, een zichtbare eerste ronde, iedereen net wat rechterop",
      snack: "Olijven, chips, kleine happen die rondgaan terwijl de bar opwarmt",
      scene: "Milaan als podium: de tafel is half decor, half ontmoeting",
      gesture: "Iemand bestelt voor de groep, iemand maakt ruimte, iemand begint het verhaal",
      why: "Je kiest voor aankomst, kleur en sociaal theater. Bij jou opent het moment niet alleen de eetlust, maar ook de rol die iedereen aan tafel even mag spelen.",
      reading: ["Davide Campari in de winkelpassage", "Waarom bitter het nieuwe zoet is", "Nederland pakt terug"]
    },
    france: {
      name: "Frankrijk, de pauze",
      short: "De pauze",
      line: "In Frankrijk staat het aperitief gewoon op de klok.",
      art: "assets/fresco/fresco-04.jpg",
      serve: "Een rustig begin: water op tafel, amandelen, brood, niemand hoeft iets te bewijzen",
      snack: "Amandelen, radijs, saucisson, brood, dingen die de pauze dragen",
      scene: "Frankrijk als grens: de dag stopt omdat de tafel dat zegt",
      gesture: "Er wordt gewacht tot iedereen zit. Pas dan begint het uur.",
      why: "Je zoekt geen spektakel maar een sociale grens. De pauze is bij jou heilig: even niemand die trekt, even samen afspreken dat de dag klaar is.",
      reading: ["Nantes, 2010: negenduizend mensen", "Het louche-effect", "L'heure de l'apéro"]
    },
    spain: {
      name: "Spanje, de revival",
      short: "De revival",
      line: "Het oude zondagse ritueel werd weer een tafel waar iedereen aanschuift.",
      art: "assets/fresco/fresco-06.jpg",
      serve: "Een bar vol kleine borden, sifón, prikkers en mensen die blijven hangen",
      snack: "Chips, ansjovis, gildas, iets op een prikkertje",
      scene: "Spanje als zondag: marmer, rumoer, drie generaties door elkaar",
      gesture: "Er wordt gedeeld zonder overleg. De schaal beweegt sneller dan het gesprek.",
      why: "Je houdt van rituelen die sociaal geheugen hebben. Niet chic, wel levend: snack op tafel, stemmen door elkaar, niemand met haast.",
      reading: ["Fer el vermut", "De zondag als apero-machine", "De revival van bitter"]
    },
    anise: {
      name: "De anijsgordel",
      short: "De vertraging",
      line: "Hier begint het ritueel pas als water, tijd en tafel meedoen.",
      art: "assets/fresco/fresco-10.jpg",
      serve: "Water erbij, kleine borden erbij, en eerst samen kijken wat er gebeurt",
      snack: "Komkommer, feta, brood, kruiden, kleine borden",
      scene: "De anijsgordel als gedeeld wachten: de tafel vertraagt omdat iedereen meekijkt",
      gesture: "Verdunnen is geen bijzaak. Het is het gezamenlijke startschot.",
      why: "Jij vertrouwt op vertraging. Het mooie zit niet in hard binnenkomen, maar in samen zien hoe iets verandert zodra je water toevoegt.",
      reading: ["Het louche-effect", "De melk van leeuwen", "Waarom verdunnen een ritueel is"]
    },
    portugal: {
      name: "Portugal, de verrassing",
      short: "De verrassing",
      line: "Portugal exporteerde zijn beste verhaal en hield zijn beste geheim.",
      art: "assets/fresco/fresco-12.jpg",
      serve: "Iets lichts en koels, met genoeg verhaal om iemand naast je nieuwsgierig te maken",
      snack: "Sardines, chips, amandelen, citroen",
      scene: "Portugal als lichte verrassing: havenlucht, zon op steen, een gesprek dat niet zwaar hoeft",
      gesture: "Iemand zegt: wacht, dit moet je proberen. Daarna begint het verhaal.",
      why: "Je houdt van een wending. Niet zwaar, niet voorspelbaar, wel met geschiedenis onder de oppervlakte en genoeg lucht om de tafel open te houden.",
      reading: ["De Douro en zijn grenspalen", "Portonico als geheim", "De apero van de haven"]
    },
    morocco: {
      name: "Marokko, de schenkende hand",
      short: "De schenkende hand",
      line: "Het aperitief is hier de schenkende hand.",
      art: "assets/fresco/fresco-16.jpg",
      serve: "Atay, van hoogte geschonken, munt, aandacht en tijd voor de gast",
      snack: "Dadels, amandelen, citrus, kruidige hapjes",
      scene: "Marokko als gastvrijheid: een binnenplaats waar schenken betekent dat je welkom bent",
      gesture: "De gast krijgt eerst. De hoogte van de schenking is bijna een begroeting.",
      why: "Jouw apero draait om aandacht en ontvangst. De hand die schenkt, de plek die wordt gemaakt en het tempo van de gast zijn belangrijker dan de inhoud van de ronde.",
      reading: ["Drie glazen: leven, liefde, dood", "Atay en de kunst van ontvangen", "De schenkende hand"]
    }
  };

  var axes = ["bitter", "fresh", "spice", "social", "slow", "host"];
  var axisLabels = {
    bitter: "Bitter",
    fresh: "Fris",
    spice: "Kruid",
    social: "Sociaal",
    slow: "Traag",
    host: "Gastvrij"
  };

  var chapters = [
    "Het moment", "Gezelschap", "Smaak", "Ritueel", "De tafel", "Scène", "Tempo", "Verhaal"
  ];

  function s(world, axis) {
    var out = { worlds: {}, axes: {} };
    Object.keys(world || {}).forEach(function (key) { out.worlds[key] = world[key]; });
    Object.keys(axis || {}).forEach(function (key) { out.axes[key] = axis[key]; });
    return out;
  }

  var questions = [
    q("Het moment", "Wanneer voelt de dag klaar genoeg om iets te openen?", "Kies wat het dichtst bij je gewone leven ligt.", [
      a("Zodra mijn jas uit is", "Eerst landen, dan pas praten.", s({ france: 3, anise: 1 }, { slow: 2 })),
      a("Als de eerste persoon aanschuift", "Het moment begint sociaal.", s({ italy: 2, morocco: 2 }, { social: 2, host: 1 })),
      a("Als er iets op tafel staat", "Een schaal of bord maakt het echt.", s({ spain: 3, morocco: 1 }, { social: 2 })),
      a("Als het licht zachter wordt", "Ik reageer op sfeer en timing.", s({ portugal: 3, france: 1 }, { fresh: 1, slow: 1 }))
    ]),
    q("Het moment", "Wat hoop je dat het eerste kwartier doet?", "Geen goede of slechte antwoorden. Alleen een richting.", [
      a("Mijn hoofd stiller maken", "Even minder prikkels.", s({ france: 2, anise: 2 }, { slow: 3 })),
      a("De groep aanzetten", "Er mag energie in.", s({ italy: 3, spain: 2 }, { social: 3 })),
      a("Mijn eetlust wakker maken", "Iets kleins, iets hartigs.", s({ spain: 2, italy: 2 }, { bitter: 1, social: 1 })),
      a("De tafel zachter maken", "Iedereen moet makkelijk kunnen landen.", s({ morocco: 3, portugal: 1 }, { host: 2, slow: 1 }))
    ]),
    q("Het moment", "Hoe lang mag zo'n begin duren?", "Denk aan een gewone avond, niet aan vakantie.", [
      a("Kort en goed", "Twintig minuten kan genoeg zijn.", s({ italy: 2, portugal: 2 }, { fresh: 1 })),
      a("Ongeveer een uur", "Lang genoeg om echt te schakelen.", s({ france: 3, spain: 1 }, { slow: 2 })),
      a("Tot het vanzelf verschuift", "Ik wil niet steeds op de klok letten.", s({ anise: 2, morocco: 2 }, { slow: 2, host: 1 })),
      a("Zolang de tafel leeft", "De groep bepaalt het einde.", s({ spain: 3, italy: 1 }, { social: 3 }))
    ]),
    q("Gezelschap", "Met wie werkt dit moment het best?", "Kies de tafel die je het snelst voor je ziet.", [
      a("Met één iemand", "Een gesprek dat nergens heen hoeft.", s({ france: 2, portugal: 2 }, { slow: 1 })),
      a("Met drie of vier mensen", "Genoeg stemmen, nog wel overzicht.", s({ anise: 2, morocco: 2 }, { social: 1, host: 1 })),
      a("Met een groep die binnenloopt", "Niet iedereen hoeft tegelijk te komen.", s({ italy: 3, spain: 2 }, { social: 3 })),
      a("Met vaste mensen", "Herhaling maakt het juist goed.", s({ spain: 3, morocco: 2 }, { social: 2 }))
    ]),
    q("Gezelschap", "Wat vind je fijn aan een tafel?", "De sociale vorm is minstens zo belangrijk als smaak.", [
      a("Dat gesprek makkelijk begint", "Iets kleins helpt.", s({ italy: 2, portugal: 1 }, { social: 2 })),
      a("Dat niemand hoeft te presteren", "Rust is ook gastvrij.", s({ france: 3, morocco: 1 }, { slow: 2, host: 1 })),
      a("Dat er gedeeld wordt", "Schaal, bord, hand, doorgeven.", s({ spain: 3, morocco: 2 }, { social: 2, host: 1 })),
      a("Dat iedereen even kijkt", "Een klein ritueel trekt de aandacht.", s({ anise: 3, italy: 1 }, { slow: 1, social: 1 }))
    ]),
    q("Gezelschap", "Waar zit je het liefst?", "Niet te letterlijk: kies de houding.", [
      a("Aan de bar", "Dichtbij, beweeglijk, een beetje kijken.", s({ italy: 2, spain: 2 }, { social: 2 })),
      a("Aan een kleine tafel", "Iedereen hoort elkaar.", s({ france: 2, portugal: 2 }, { slow: 1 })),
      a("Aan een lange tafel", "Delen gaat vanzelf.", s({ spain: 2, morocco: 3 }, { social: 2, host: 2 })),
      a("Laag en rustig", "Niemand hoeft snel weg.", s({ anise: 3, morocco: 1 }, { slow: 3 }))
    ]),
    q("Gezelschap", "Wat stoort je het snelst?", "Ook afkeer zegt iets nuttigs.", [
      a("Te veel uitleg", "Laat het gewoon gebeuren.", s({ spain: 2, italy: 1 }, { social: 1 })),
      a("Te veel haast", "Dan wordt het geen moment.", s({ france: 2, anise: 2 }, { slow: 3 })),
      a("Te veel moeilijkdoenerij", "Het mag gewoon lekker en helder blijven.", s({ portugal: 2, spain: 1 }, { fresh: 1 })),
      a("Te weinig aandacht", "Ontvangen worden telt.", s({ morocco: 3 }, { host: 3 }))
    ]),
    q("Smaak", "Welke globale smaak kies je het vaakst?", "Gewoon wat je lekker vindt, zonder culturele bijsluiter.", [
      a("Fris en zuur", "Citroen, appel, tonic, verjus.", s({ portugal: 3, france: 1 }, { fresh: 3 })),
      a("Hartig en zout", "Olijf, chips, ansjovis, kaas.", s({ spain: 3, italy: 1 }, { social: 1 })),
      a("Kruidig en groen", "Munt, salie, venkel, thee.", s({ morocco: 2, anise: 2 }, { spice: 3, host: 1 })),
      a("Bitter en droog", "Meer rand dan zoet.", s({ italy: 3, france: 1 }, { bitter: 3 }))
    ]),
    q("Smaak", "Wat mag er in de eerste hap zitten?", "Dit maakt de smaak menselijker.", [
      a("Zout", "Iets dat meteen trek maakt.", s({ spain: 2, italy: 2 }, { social: 1 })),
      a("Zuur", "Iets dat de mond wakker zet.", s({ portugal: 3, france: 1 }, { fresh: 2 })),
      a("Kruid", "Iets dat blijft hangen.", s({ morocco: 2, anise: 2 }, { spice: 2 })),
      a("Vet of rond", "Iets zachts naast alle prikkels.", s({ france: 2, spain: 1 }, { slow: 1 }))
    ]),
    q("Smaak", "Hoe sta je tegenover bitter?", "Bitter hoeft niet dominant te zijn.", [
      a("Graag aanwezig", "Ik hou van een droge rand.", s({ italy: 3 }, { bitter: 3 })),
      a("Alleen als er zoet of citrus naast zit", "Balans is belangrijk.", s({ spain: 2, portugal: 1 }, { bitter: 1, fresh: 1 })),
      a("Subtiel en droog", "Niet te luid.", s({ france: 2, anise: 1 }, { bitter: 1, slow: 1 })),
      a("Meestal liever niet", "Geef mij groen, zuur of zacht.", s({ morocco: 2, portugal: 2 }, { spice: 1, fresh: 1 }))
    ]),
    q("Smaak", "Welke frisheid klinkt het best?", "Fris kan veel kanten op.", [
      a("Citrus", "Helder, direct, zon op tafel.", s({ portugal: 3, italy: 1 }, { fresh: 3 })),
      a("Bruis", "Licht en beweeglijk.", s({ portugal: 2, spain: 2 }, { fresh: 2, social: 1 })),
      a("Munt", "Groen en gastvrij.", s({ morocco: 3 }, { spice: 1, host: 2 })),
      a("Water", "Simpel, rustig, verdunnend.", s({ france: 2, anise: 3 }, { slow: 2 }))
    ]),
    q("Smaak", "Wat vind je van anijs?", "Een specifieke smaak, dus een eerlijk antwoord helpt.", [
      a("Lekker als het helder aanwezig is", "Ik hou van dat herkenbare spoor.", s({ anise: 4 }, { spice: 2 })),
      a("Goed als het zacht blijft", "Een randje is genoeg.", s({ france: 2, portugal: 1 }, { spice: 1 })),
      a("Ik kies eerder munt of kruiden", "Groen boven anijs.", s({ morocco: 3 }, { spice: 2, host: 1 })),
      a("Niet mijn smaak", "Dan liever bitter, zout of fris.", s({ italy: 2, spain: 1, portugal: 1 }, { bitter: 1, fresh: 1 }))
    ]),
    q("Smaak", "Welke zoetheid werkt voor jou?", "Zoet hoeft niet kinderachtig te zijn.", [
      a("Bijna niet", "Droog houdt me wakker.", s({ france: 2, anise: 1 }, { bitter: 1, slow: 1 })),
      a("Als tegenwicht", "Zoet naast bitter of zuur.", s({ italy: 2, spain: 2 }, { bitter: 1 })),
      a("Fruitig en licht", "Druif, sinaasappel, steenfruit.", s({ portugal: 3 }, { fresh: 2 })),
      a("Warm en kruidig", "Dadels, thee, specerij.", s({ morocco: 3 }, { spice: 2, host: 1 }))
    ]),
    q("Ritueel", "Welke handeling vind je prettig om naar te kijken?", "Niet omdat het chic is, maar omdat het iets start.", [
      a("IJs in een glas", "Koud, helder, klaar.", s({ italy: 2, portugal: 2 }, { fresh: 1, bitter: 1 })),
      a("Water dat wordt toegevoegd", "Het moment verandert zichtbaar.", s({ anise: 4, france: 1 }, { slow: 3 })),
      a("Iets dat wordt doorgegeven", "De tafel begint te bewegen.", s({ spain: 3, morocco: 1 }, { social: 3 })),
      a("Schenken voor een gast", "Ontvangst is het gebaar.", s({ morocco: 4 }, { host: 3 }))
    ]),
    q("Ritueel", "Wat hoort er op tafel?", "Kies op gevoel.", [
      a("Olijven of chips", "Klein, zout, makkelijk.", s({ italy: 2, spain: 1 }, { social: 1 })),
      a("Brood en amandelen", "Rustig, droog, doorgeefbaar.", s({ france: 2, morocco: 1 }, { slow: 1, host: 1 })),
      a("Vis, prikker, zuur", "Iets met lef.", s({ spain: 2, portugal: 2 }, { fresh: 1, social: 1 })),
      a("Dadels, citrus, kruiden", "Warm, groen, gul.", s({ morocco: 3 }, { spice: 1, host: 2 }))
    ]),
    q("Ritueel", "Welke tafelvorm past bij je?", "Het meubel bepaalt het gedrag.", [
      a("Bar of hoge tafel", "Je blijft een beetje in beweging.", s({ italy: 2, spain: 2 }, { social: 2 })),
      a("Klein tafeltje buiten", "Kijken, praten, rustig blijven.", s({ france: 2, portugal: 2 }, { fresh: 1, slow: 1 })),
      a("Lange tafel", "Er mag worden gedeeld.", s({ spain: 2, morocco: 2 }, { social: 2, host: 1 })),
      a("Lage tafel of binnenplaats", "Ontvangst boven tempo.", s({ morocco: 3, anise: 1 }, { host: 2, slow: 1 }))
    ]),
    q("Ritueel", "Wat mag nooit ontbreken?", "Dit is de kern van jouw opening.", [
      a("Iets kouds", "Temperatuur maakt het moment.", s({ portugal: 3, italy: 1 }, { fresh: 2 })),
      a("Iets gedeelds", "Een schaal, bord of handeling.", s({ spain: 3, morocco: 1 }, { social: 2 })),
      a("Iets traags", "Een pauze die je kunt voelen.", s({ france: 2, anise: 2 }, { slow: 2 })),
      a("Iets gastvrijs", "Iemand zorgt dat je plek hebt.", s({ morocco: 3 }, { host: 3 }))
    ]),
    q("De tafel", "Welke groepsenergie past?", "Kies wat prettig voelt, niet wat cultureel slim klinkt.", [
      a("Een beetje kijken en gezien worden", "Aankomst is onderdeel van het spel.", s({ italy: 3 }, { social: 2 })),
      a("Eerst rustig worden", "De dag wordt samen dichtgedaan.", s({ france: 3 }, { slow: 2 })),
      a("Door elkaar praten en delen", "De tafel hoeft niet netjes.", s({ spain: 3 }, { social: 3 })),
      a("Eerst de gast ruimte geven", "Ontvangen komt voor tempo.", s({ morocco: 3 }, { host: 3 }))
    ]),
    q("De tafel", "Wie zet meestal de toon?", "Niet letterlijk, maar welk type herken je?", [
      a("De besteller", "Iemand maakt de eerste keuze.", s({ italy: 2, portugal: 1 }, { bitter: 1, social: 1 })),
      a("De rustige bewaker", "Iemand houdt het tempo laag.", s({ france: 3, anise: 1 }, { slow: 2 })),
      a("De deler", "Iemand schuift het bord door.", s({ spain: 3 }, { social: 2 })),
      a("De ontvanger", "Iemand let op wie nog niets heeft.", s({ morocco: 3 }, { host: 3 }))
    ]),
    q("De tafel", "Hoe open voelt de ideale tafel?", "Het gaat om sfeer, niet om etiquette.", [
      a("Heel makkelijk", "Geen druk, geen uitleg.", s({ morocco: 2, france: 1 }, { host: 3 })),
      a("Makkelijk, maar met smaak", "Laagdrempelig hoeft niet vlak te zijn.", s({ portugal: 2, spain: 1 }, { fresh: 1, social: 1 })),
      a("Maakt niet uit, als het goed is", "Ik wil vooral karakter.", s({ italy: 2, anise: 1 }, { bitter: 1, spice: 1 })),
      a("Hangt af van de groep", "De tafel bepaalt de regels.", s({ spain: 2, france: 1 }, { social: 1, slow: 1 }))
    ]),
    q("De tafel", "Wat doet de eerste minuut?", "Kies het effect, niet het land.", [
      a("Wakker maken", "Er mag meteen energie zijn.", s({ italy: 3 }, { bitter: 2, social: 1 })),
      a("Ontspannen", "Schouders omlaag.", s({ france: 2, morocco: 1 }, { slow: 2 })),
      a("Nieuwsgierig maken", "Iets kleins dat vragen oproept.", s({ portugal: 3, anise: 1 }, { fresh: 1, spice: 1 })),
      a("Verbinden", "Iedereen komt in hetzelfde moment.", s({ spain: 2, morocco: 2 }, { social: 2, host: 1 }))
    ]),
    q("Scène", "Welke plek zie je het snelst?", "Geen reisadvies. Een sfeerbeeld.", [
      a("Een bar met warm licht", "Binnenkomen is onderdeel van het moment.", s({ italy: 3, spain: 1 }, { social: 1 })),
      a("Een plein of terras", "De dag mag langzaam zakken.", s({ france: 3, portugal: 1 }, { slow: 1, fresh: 1 })),
      a("Een drukke zondagstafel", "Rumoer hoort erbij.", s({ spain: 4 }, { social: 2 })),
      a("Een binnenplaats in de schaduw", "Rust, munt, aandacht.", s({ morocco: 4 }, { host: 2, spice: 1 }))
    ]),
    q("Scène", "Welk geluid past?", "Geluid is vaak eerlijker dan smaak.", [
      a("Glazen, stoelen, binnenkomst", "Er gebeurt iets.", s({ italy: 3 }, { social: 1 })),
      a("Zacht praten buiten", "De pauze mag hoorbaar zijn.", s({ france: 2, portugal: 1 }, { slow: 1 })),
      a("Veel stemmen tegelijk", "Gezellig zonder regie.", s({ spain: 3, morocco: 1 }, { social: 3 })),
      a("Water, schenken, stilte ertussen", "Kleine handelingen krijgen ruimte.", s({ anise: 3, morocco: 2 }, { slow: 2, host: 1 }))
    ]),
    q("Scène", "Welke kleur smaakt het meest naar jouw avond?", "Een simpele omweg naar voorkeur.", [
      a("Rood-oranje", "Warm, bitter, zichtbaar.", s({ italy: 2, spain: 1 }, { bitter: 1 })),
      a("Geel-wit", "Licht, zuur, koel.", s({ portugal: 3, france: 1 }, { fresh: 2 })),
      a("Groen", "Munt, kruiden, schaduw.", s({ morocco: 3, portugal: 1 }, { spice: 1, host: 1 })),
      a("Wit-troebel", "Langzaam, vreemd, aandachtig.", s({ anise: 4 }, { slow: 2 }))
    ]),
    q("Scène", "Welke Nederlandse vertaling zou werken?", "APÉRO komt uiteindelijk naar Utrecht.", [
      a("Een betere barstart", "Meer ritueel, minder haast.", s({ italy: 2, france: 1 }, { bitter: 1 })),
      a("Een lange borreltafel", "Delen zonder stijfheid.", s({ spain: 2, morocco: 1 }, { social: 2 })),
      a("Een rustige apero aan het water", "Licht, lucht, gesprek.", s({ portugal: 2, france: 2 }, { fresh: 1, slow: 1 })),
      a("Een tafel waar niemand buiten valt", "Gastvrijheid als basis.", s({ morocco: 3 }, { host: 3 }))
    ]),
    q("Tempo", "Wat is je ideale snelheid?", "Snelheid is smaak in vermomming.", [
      a("Direct", "Eerst energie, dan nuance.", s({ italy: 3 }, { bitter: 1, social: 1 })),
      a("Rustig", "Eerst zitten, dan pas kiezen.", s({ france: 3 }, { slow: 2 })),
      a("Golvend", "Eerst delen, dan praten, dan nog iets.", s({ spain: 3 }, { social: 2 })),
      a("Traag en aandachtig", "De handeling mag tijd kosten.", s({ anise: 2, morocco: 2 }, { slow: 2, host: 1 }))
    ]),
    q("Tempo", "Wat doe je met stilte?", "Niet iedereen wil hetzelfde soort stilte.", [
      a("Doorbreken", "Er mag tempo in.", s({ italy: 2, spain: 2 }, { social: 2 })),
      a("Even laten", "Dan komt het gesprek vanzelf.", s({ france: 2, anise: 2 }, { slow: 2 })),
      a("Vullen met een gebaar", "Schenken of doorgeven zegt genoeg.", s({ morocco: 3, spain: 1 }, { host: 2, social: 1 })),
      a("Naar buiten kijken", "De omgeving mag meedoen.", s({ portugal: 2, france: 1 }, { fresh: 1 }))
    ]),
    q("Tempo", "Hoeveel verhaal wil je erbij?", "De Atlas is ook een magazine-machine.", [
      a("Eén goed feit", "Iets om door te vertellen.", s({ italy: 2, portugal: 1 }, { bitter: 1 })),
      a("Een korte anekdote", "Genoeg context, niet te veel college.", s({ france: 2, spain: 1 }, { slow: 1 })),
      a("De hele route", "Land, tafel, ritueel, geschiedenis.", s({ anise: 2, morocco: 2 }, { slow: 2 })),
      a("Eerst de tafel, dan het verhaal", "Niet alles hoeft meteen uitgelegd.", s({ spain: 2, portugal: 2 }, { social: 1 }))
    ]),
    q("Tempo", "Wanneer is het genoeg?", "Een goed begin heeft ook een uitgang.", [
      a("Na één sterke opening", "Kort en scherp.", s({ italy: 3 }, { bitter: 2 })),
      a("Na twee lichte rondes", "Ik wil helder blijven.", s({ portugal: 2, spain: 2 }, { fresh: 2 })),
      a("Als het eten komt", "Het begin heeft zijn werk gedaan.", s({ france: 2, spain: 1 }, { slow: 1 })),
      a("Als iedereen geland is", "De gastvrijheid heeft gewerkt.", s({ morocco: 3, anise: 1 }, { host: 2, slow: 1 }))
    ]),
    q("Verhaal", "Welk soort verhaal trekt je?", "Niet de uitkomst raden. Gewoon kiezen wat je zou lezen.", [
      a("Een geboorteplek en een jaartal", "Cultuur met een adres.", s({ italy: 4 }, { bitter: 1 })),
      a("Een massa mensen op een plein", "Een pauze wordt sociaal fenomeen.", s({ france: 4 }, { social: 1 })),
      a("Een oud ritueel dat terugkomt", "Revival zonder schaamte.", s({ spain: 4 }, { social: 1 })),
      a("Een handeling die iedereen laat kijken", "Natuurkunde als tafelritueel.", s({ anise: 4 }, { slow: 1, social: 1 }))
    ]),
    q("Verhaal", "Welke festivaltafel kies je?", "Stel je Utrecht even voor.", [
      a("Bitter en barlicht", "Een tafel die meteen begint.", s({ italy: 3 }, { bitter: 2, social: 1 })),
      a("Pauze en plein", "Langzaam winnen telt ook.", s({ france: 3, anise: 1 }, { slow: 2 })),
      a("Snacks en rumoer", "Veel kleine happen, veel stemmen.", s({ spain: 3 }, { social: 2 })),
      a("Thee en ontvangst", "De gastvrijheid is het programma.", s({ morocco: 3 }, { host: 3, spice: 1 }))
    ]),
    q("Verhaal", "Wat geeft APÉRO je uiteindelijk?", "Laatste vraag. Kies de belofte.", [
      a("Een stijl om binnen te komen", "Je mag gezien worden.", s({ italy: 3 }, { social: 1 })),
      a("Een grens tegen de dag", "Even is even.", s({ france: 3 }, { slow: 2 })),
      a("Een tafel die vanzelf doorgaat", "Mensen eerst.", s({ spain: 2, morocco: 2 }, { social: 2 })),
      a("Een ritueel dat iedereen meeneemt", "Aandacht boven inhoud.", s({ morocco: 3, anise: 1 }, { host: 3 }))
    ])
  ];

  var state = {
    index: 0,
    answers: [],
    worldScores: {},
    axisScores: {}
  };
  var storageKey = "apero-atlas-progress-v1";

  var screens = {
    intro: document.querySelector('[data-screen="intro"]'),
    quiz: document.querySelector('[data-screen="quiz"]'),
    result: document.querySelector('[data-screen="result"]')
  };

  var els = {
    current: document.querySelector('[data-current]'),
    total: document.querySelector('[data-total]'),
    currentInline: document.querySelector('[data-current-inline]'),
    totalInline: document.querySelector('[data-total-inline]'),
    progress: document.querySelector('[data-progress-bar]'),
    chapter: document.querySelector('[data-chapter-label]'),
    kicker: document.querySelector('[data-question-kicker]'),
    title: document.querySelector('[data-question-title]'),
    note: document.querySelector('[data-question-note]'),
    answers: document.querySelector('[data-answers]'),
    next: document.querySelector('[data-next]'),
    prev: document.querySelector('[data-prev]'),
    panel: document.querySelector('[data-question-panel]'),
    art: document.querySelector('[data-question-art]'),
    scorePills: document.querySelector('[data-score-pills]'),
    toast: document.querySelector('[data-toast]')
  };

  function q(chapter, title, note, answers) {
    return { chapter: chapter, title: title, note: note, answers: answers };
  }

  function a(label, text, score) {
    return { label: label, text: text, score: score };
  }

  function showScreen(name) {
    Object.keys(screens).forEach(function (key) {
      screens[key].hidden = key !== name;
    });
    window.scrollTo({ top: 0, behavior: prefersMotion() ? "smooth" : "auto" });
  }

  function prefersMotion() {
    return window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
  }

  function start() {
    state.index = 0;
    state.answers = [];
    clearSavedProgress();
    renderQuestion();
    showScreen("quiz");
  }

  function renderQuestion() {
    var item = questions[state.index];
    var selected = state.answers[state.index];
    var current = state.index + 1;
    var progress = ((state.index) / questions.length) * 100;
    var artKey = Object.keys(worlds)[state.index % Object.keys(worlds).length];

    els.panel.classList.add("is-changing");
    setTimeout(function () {
      els.current.textContent = current;
      els.total.textContent = questions.length;
      els.currentInline.textContent = current;
      els.totalInline.textContent = questions.length;
      els.progress.style.width = progress + "%";
      els.chapter.textContent = item.chapter;
      els.kicker.textContent = item.chapter;
      els.title.textContent = item.title;
      els.note.textContent = item.note;
      els.art.style.backgroundImage = "url(" + worlds[artKey].art + ")";
      els.answers.innerHTML = "";

      item.answers.forEach(function (answer, idx) {
        var button = document.createElement("button");
        button.className = "answer" + (selected === idx ? " is-selected" : "");
        button.type = "button";
        button.innerHTML = "<b>" + answer.label + "</b><span>" + answer.text + "</span>";
        button.addEventListener("click", function () {
          state.answers[state.index] = idx;
          saveProgress();
          renderAnswersOnly();
          calculateScores();
          renderLiveScores();
        });
        els.answers.appendChild(button);
      });

      els.prev.disabled = state.index === 0;
      els.next.textContent = state.index === questions.length - 1 ? "Toon mijn profiel" : "Volgende";
      els.next.disabled = selected === undefined;
      calculateScores();
      renderLiveScores();
      els.panel.classList.remove("is-changing");
    }, 120);
  }

  function renderAnswersOnly() {
    Array.prototype.forEach.call(els.answers.children, function (button, idx) {
      button.classList.toggle("is-selected", state.answers[state.index] === idx);
    });
    els.next.disabled = state.answers[state.index] === undefined;
  }

  function calculateScores() {
    state.worldScores = {};
    state.axisScores = {};
    Object.keys(worlds).forEach(function (key) { state.worldScores[key] = 0; });
    axes.forEach(function (key) { state.axisScores[key] = 0; });
    state.answers.forEach(function (answerIndex, questionIndex) {
      if (answerIndex === undefined) return;
      var score = questions[questionIndex].answers[answerIndex].score;
      Object.keys(score.worlds).forEach(function (key) {
        state.worldScores[key] += score.worlds[key];
      });
      Object.keys(score.axes).forEach(function (key) {
        state.axisScores[key] += score.axes[key];
      });
    });
  }

  function rankedWorlds() {
    return Object.keys(state.worldScores).sort(function (a, b) {
      return state.worldScores[b] - state.worldScores[a];
    });
  }

  function renderLiveScores() {
    var maxAxis = Math.max(1, Math.max.apply(null, axes.map(function (key) { return state.axisScores[key]; })));
    axes.forEach(function (key) {
      var node = document.querySelector('[data-axis="' + key + '"]');
      if (node) {
        node.style.height = (18 + (state.axisScores[key] / maxAxis) * 34) + "%";
        node.style.opacity = state.axisScores[key] ? ".82" : ".22";
      }
    });

    els.scorePills.innerHTML = "";
    rankedWorlds().slice(0, 3).forEach(function (key) {
      var pill = document.createElement("span");
      pill.textContent = worlds[key].short + " " + state.worldScores[key];
      els.scorePills.appendChild(pill);
    });
  }

  function next() {
    if (state.answers[state.index] === undefined) return;
    if (state.index === questions.length - 1) {
      finish();
      return;
    }
    state.index += 1;
    saveProgress();
    renderQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function prev() {
    if (state.index === 0) return;
    state.index -= 1;
    renderQuestion();
  }

  function finish() {
    calculateScores();
    els.progress.style.width = "100%";
    renderResult();
    showScreen("result");
    clearSavedProgress();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function demoResult() {
    state.answers = questions.map(function (_, idx) { return idx % 4; });
    calculateScores();
    renderResult();
    showScreen("result");
  }

  function renderResult() {
    var ranked = rankedWorlds();
    var primaryKey = ranked[0];
    var secondaryKey = ranked[1];
    var primary = worlds[primaryKey];
    var secondary = worlds[secondaryKey];
    var axisMax = Math.max(1, Math.max.apply(null, axes.map(function (key) { return state.axisScores[key]; })));

    setText("[data-result-title]", primary.name);
    setText("[data-result-summary]", primary.line + " Je score wijst naar een apero dat niet alleen smaakt, maar gedrag maakt.");
    setText("[data-result-kicker]", "Hoofdprofiel");
    setText("[data-result-name]", primary.short);
    setText("[data-result-line]", primary.line);
    setText("[data-result-why]", primary.why);
    setText("[data-secondary-title]", secondary.name);
    setText("[data-secondary-copy]", "Je tweede richting is " + secondary.short.toLowerCase() + ". Die geeft je profiel een zijdeur: " + secondary.line.toLowerCase());
    document.querySelector("[data-result-art]").style.backgroundImage = "url(" + primary.art + ")";

    var bars = document.querySelector("[data-bars]");
    bars.innerHTML = "";
    axes.forEach(function (key) {
      var value = state.axisScores[key];
      var row = document.createElement("div");
      row.className = "bar";
      row.innerHTML = "<span>" + axisLabels[key] + "</span><div class=\"bar-track\"><i style=\"width:" + Math.round((value / axisMax) * 100) + "%\"></i></div><span>" + value + "</span>";
      bars.appendChild(row);
    });

    var serve = document.querySelector("[data-serve-list]");
    serve.innerHTML = [
      ["Tafel", primary.serve],
      ["Snack", primary.snack],
      ["Scène", primary.scene],
      ["Gebaar", primary.gesture]
    ].map(function (item) {
      return "<dt>" + item[0] + "</dt><dd>" + item[1] + "</dd>";
    }).join("");

    var route = document.querySelector("[data-reading-route]");
    route.innerHTML = primary.reading.map(function (item) {
      return "<li>" + item + "</li>";
    }).join("");
  }

  function setText(selector, value) {
    var el = document.querySelector(selector);
    if (el) el.textContent = value;
  }

  function reset() {
    state.index = 0;
    state.answers = [];
    calculateScores();
    clearSavedProgress();
    renderQuestion();
    showScreen("intro");
  }

  function saveProgress() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ index: state.index, answers: state.answers }));
    } catch (err) {}
  }

  function restoreProgress() {
    try {
      var saved = JSON.parse(localStorage.getItem(storageKey));
      if (!saved || !Array.isArray(saved.answers) || typeof saved.index !== "number") return;
      state.index = Math.max(0, Math.min(saved.index, questions.length - 1));
      state.answers = saved.answers.slice(0, questions.length);
    } catch (err) {}
  }

  function clearSavedProgress() {
    try { localStorage.removeItem(storageKey); } catch (err) {}
  }

  function copyResult() {
    var ranked = rankedWorlds();
    var primary = worlds[ranked[0]];
    var text = "Mijn APÉRO Atlas-profiel: " + primary.name + ". " + primary.line + " Moment: " + primary.serve + ".";
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function () {
        toast("Profiel gekopieerd");
      }, function () {
        toast(text);
      });
    } else {
      toast(text);
    }
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () {
      els.toast.classList.remove("show");
    }, 2400);
  }

  document.querySelector("[data-start]").addEventListener("click", start);
  document.querySelector("[data-jump-result]").addEventListener("click", demoResult);
  els.next.addEventListener("click", next);
  els.prev.addEventListener("click", prev);
  document.querySelectorAll("[data-reset]").forEach(function (button) {
    button.addEventListener("click", reset);
  });
  document.querySelector("[data-copy-result]").addEventListener("click", copyResult);

  restoreProgress();
  calculateScores();
  renderLiveScores();
})();
