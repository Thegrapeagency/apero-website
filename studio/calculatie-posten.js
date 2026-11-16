/* APÉRO Studio · de beginstand van de calculatie.
   Alle posten staan er, de bedragen zijn leeg: deze repo is openbaar, dus cijfers horen hier niet.
   Wat je invult blijft in je browser en gaat mee in de export.
   Opzet gelijk aan de NvdW-calculatie (zeven kostenbladen, inkomsten, totaaloverzicht),
   aangevuld met wat een buitenterrein van vier dagen extra vraagt. */
(function (w) {
  'use strict';
  // [naam voor formules, omschrijving, waarde of formule, toelichting]
  var UITGANGSPUNTEN = [
    ['dagen', 'Festivaldagen', '4', 'Donderdag tot en met zondag'],
    ['capaciteit_do', 'Capaciteit donderdag', '1500', 'Zoals in de kaartverkoop'],
    ['capaciteit_vr', 'Capaciteit vrijdag', '2500', ''],
    ['capaciteit_za', 'Capaciteit zaterdag', '2500', ''],
    ['capaciteit_zo', 'Capaciteit zondag', '2000', ''],
    ['bezetting', 'Verwachte bezetting', '100%', 'Staat op uitverkocht. Zet terug naar wat je verwacht'],
    ['bezoekers', 'Bezoekers totaal', '=(capaciteit_do+capaciteit_vr+capaciteit_za+capaciteit_zo)*bezetting', 'Rekent zelf, of typ er een getal overheen'],
    ['ticketprijs', 'Gemiddelde ticketprijs incl. btw', '9,50', 'Early bird. Pas aan zodra er duurdere tickets bij komen'],
    ['servicekosten', 'Servicekosten per ticket incl. btw', '0,95', ''],
    ['gratis', 'Aandeel gratis kaarten', '', 'Gasten, partners, pers en crew'],
    ['besteding', 'Besteding per bezoeker incl. btw', '', 'Drank en eten samen'],
    ['aandeel_drank', 'Aandeel drank in de besteding', '', 'De rest is eten'],
    ['aandeel_eigen', 'Aandeel van de drankomzet over eigen bars', '', 'De rest loopt over partnerbars'],
    ['afdracht', 'Afdracht van partnerbars', '', 'Percentage van hun omzet'],
    ['afdracht_eten', 'Afdracht van eetstands', '', 'Percentage van hun omzet'],
    ['btw_drank', 'Gemiddelde btw op drank', '21%', 'Lager naarmate er meer alcoholvrij verkocht wordt (9%)'],
    ['inkoopfactor', 'Inkoopfactor eigen bars', '', 'Omzet ex btw gedeeld door inkoop. Bij NvdW rekenen we met 2,4'],
    ['omzet_drank', 'Drankomzet incl. btw', '=bezoekers*besteding*aandeel_drank', 'Tussenstap'],
    ['omzet_eten', 'Eetomzet incl. btw', '=bezoekers*besteding*(1-aandeel_drank)', 'Tussenstap'],
    ['omzet_eigen_bars', 'Omzet eigen bars ex btw', '=omzet_drank*aandeel_eigen/(1+btw_drank)', 'Tussenstap, basis voor de drankinkoop'],
    ['onvoorzien', 'Onvoorzien', '', 'Percentage over alle andere kosten']
  ];

  // [groep, post, formule incl. btw, btw-percentage]
  var INKOMSTEN = [
    ['Tickets', 'Kaartverkoop', '=bezoekers*(1-gratis)*ticketprijs', 9],
    ['Tickets', 'Servicekosten', '=bezoekers*(1-gratis)*servicekosten', 21],
    ['Tickets', 'Masterclasses', '', 9],
    ['Tickets', 'Zakelijke arrangementen', '', 9],
    ['Horeca', 'Eigen bars', '=omzet_drank*aandeel_eigen', '=btw_drank*100'],
    ['Horeca', 'Afdracht partnerbars', '=omzet_drank*(1-aandeel_eigen)*afdracht', 21],
    ['Horeca', 'Afdracht eetstands', '=omzet_eten*afdracht_eten', 21],
    ['Horeca', 'Restaurant of lange tafel', '', 9],
    ['Partners', 'Stagelden bars (zes werelden)', '', 21],
    ['Partners', 'Stagelden eetstands', '', 21],
    ['Partners', 'Hoofdpartner', '', 21],
    ['Partners', 'Overige partnerbijdragen', '', 21],
    ['Partners', 'Advertenties in het magazine', '', 21],
    ['Overig', 'Garderobe en kluisjes', '', 21],
    ['Overig', 'Statiegeld dat niet wordt opgehaald', '', 21],
    ['Overig', 'Merchandise', '', 21],
    ['Overig', 'Subsidies en fondsen', '', 0]
  ];

  // categorie -> kopje -> posten. Een post is een naam, of [naam, formule].
  var KOSTEN = {
    'Locatie en terrein': {
      'Terrein': ['Terreinhuur Noordsepark', 'Borg', 'Herstel gras en terrein na afloop', 'Hekwerk en doek', 'Rijplaten', 'Tenten en overkappingen', 'Vloeren en podiumdelen', 'Bewegwijzering op het terrein'],
      'Vergunning en verzekering': ['Evenementenvergunning en leges', 'Veiligheidsplan en tekeningen', 'Geluidsmeting', 'Constructieberekeningen', 'Aansprakelijkheidsverzekering', 'Evenementenverzekering (afgelasting, weer)', 'Buma en Sena'],
      'Voorzieningen': ['Stroom (aansluiting of aggregaten)', 'Brandstof', 'Stroomverdeling en bekabeling', 'Water en afvoer', 'Toiletten', 'Toilet voor mindervaliden', 'Pinautomaten en betaalsysteem', 'Internet op het terrein'],
      'Afval': ['Afvalcontainers en afvoer', 'Glascontainer', 'Prullenbakken op het terrein'],
      'Mobiliteit': ['Fietsenstalling', 'Mobiliteitsplan', 'Verkeersborden en afzettingen', 'Parkeren crew en leveranciers'],
      'Inrichting': ['Meubilair', 'Parasols en schaduwdoeken', 'Planten en groen', 'Decor zes bars', 'Sfeerverlichting', 'Glaswerk of hardcups', 'Spoelstraat voor glazen']
    },
    'Techniek': {
      'Geluid en licht': ['Geluid', 'Licht', 'Podium', 'Technici opbouw en show', 'DJ-set en backline', 'Portofoons'],
      'Machines en transport': ['Heftruck', 'Hoogwerker', 'Transport brengen en ophalen', 'Opslag voor en na']
    },
    'Horeca': {
      'Inkoop': [['Inkoop drank eigen bars', '=omzet_eigen_bars/inkoopfactor'], 'Inkoop alcoholvrij', 'Inkoop eten eigen bars', 'Inkoop masterclasses', 'IJs', 'Garnering en kleine inkoop'],
      'Materiaal': ['Barren', 'Koeling en koelwagen', 'Tapinstallaties', 'Spoelmachines', 'Barbenodigdheden', 'Disposables en servetten', 'Transport drank (pallets, pallox)'],
      'Crew': ['Crewcatering', 'Water en koffie voor crew']
    },
    'Overige materialen': {
      '': ['Polsbandjes', 'Crewkleding', 'Kantoor en productiemateriaal', 'EHBO-materiaal', 'Kleine aankopen op de dag']
    },
    'Promotie': {
      'Media': ['Mediabudget Meta en TikTok', 'Buitenreclame (abri, borden)', 'Posters en flyers drukken', 'Verspreiding posters en flyers', 'Influencers en samenwerkingen', 'Pers en pr'],
      'Content': ['Fotograaf', 'Aftermovie en video', 'Organische social content', 'Nieuwsbrief De Inschenker'],
      'Ontwerp en drukwerk': ['Ontwerp', 'Signing op het festival', 'Menukaarten en programmaboekje', 'Magazine (druk en verspreiding)'],
      'Website en kaartverkoop': ['Website en hosting', 'Mailpakket', 'Transactiekosten betalingen', 'Scanners en toegangscontrole']
    },
    'Programma': {
      'Muziek': ['DJ donderdag', 'DJ vrijdag', 'DJ zaterdag', 'DJ zondag', 'Band of ensemble'],
      'Inhoud': ['Sprekers en gespreksleiders', 'Makers en schenkers masterclasses', 'Reis en verblijf gasten'],
      'Randprogramma': ['Petanquebaan', 'Overig randprogramma']
    },
    'Personeel': {
      'Veiligheid': ['Beveiliging', 'Nachtbewaking', 'Verkeersregelaars', 'EHBO'],
      'Productie': ['Productieleiding', 'Runners en opbouwcrew', 'Terreinmanager', 'Hoofd horeca', 'Vrijwilligerscoördinatie'],
      'Bar en bediening': ['Barpersoneel eigen bars', 'Kassa en entree', 'Garderobe', 'Glazenophalers'],
      'Schoonmaak': ['Schoonmaak tijdens het festival', 'Eindschoonmaak terrein', 'Toiletbeheer'],
      'Overig': ['Ontwerper', 'Administratie', 'Reiskosten en representatie']
    },
    'Onvoorzien': {
      '': [['Onvoorzien', '=kosten*onvoorzien']]
    }
  };

  function beginstand() {
    var n = 0, id = function (p) { return p + (++n); };
    var s = { naam: 'APÉRO Festival 2027', scenario: 'Verwacht', uitgangspunten: [], inkomsten: [], kosten: [] };
    UITGANGSPUNTEN.forEach(function (u) { s.uitgangspunten.push({ id: id('u'), sleutel: u[0], naam: u[1], waarde: u[2], notitie: u[3] }); });
    INKOMSTEN.forEach(function (i) { s.inkomsten.push({ id: id('i'), groep: i[0], naam: i[1], begroot: i[2], btw: String(i[3]), werkelijk: '', notitie: '' }); });
    Object.keys(KOSTEN).forEach(function (cat) {
      Object.keys(KOSTEN[cat]).forEach(function (sub) {
        KOSTEN[cat][sub].forEach(function (p) {
          var a = Array.isArray(p) ? p : [p, ''];
          s.kosten.push({ id: id('k'), cat: cat, sub: sub, naam: a[0], begroot: a[1], offerte: '', werkelijk: '', notitie: '' });
        });
      });
    });
    return s;
  }
  w.APERO_CALC_BEGIN = beginstand;
})(window);
