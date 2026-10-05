/**
 * Volgende Halte — aanmeldingen naar deze Google Sheet
 * ----------------------------------------------------
 * 1. Open de sheet "volgende halte aanmeldingen".
 * 2. Menu Extensies → Apps Script. Verwijder wat er staat en plak dit hele script.
 * 3. Klik op Opslaan (diskette-icoon).
 * 4. Klik rechtsboven op Implementeren → Nieuwe implementatie.
 *    - Type (tandwiel): Web-app
 *    - Uitvoeren als: Ik
 *    - Wie heeft toegang: Iedereen
 *    Klik Implementeren en geef toestemming (Geavanceerd → Ga naar … → Toestaan).
 * 5. Kopieer de URL van de web-app (eindigt op /exec) en stuur die door.
 */

var KOLOMMEN = ['Tijdstip', 'Reist mee', 'Voornaam', 'Achternaam', 'Bedrijf', 'E-mail',
                'Dieetwensen', 'Opmerking', 'Kaartnummer', 'Bron'];

function doPost(e) {
  var p = (e && e.parameter) || {};
  if (p._gotcha) return antwoord({ ok: true }); // spam-bot

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var blad = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (blad.getLastRow() === 0) {
      blad.appendRow(KOLOMMEN);
      blad.getRange(1, 1, 1, KOLOMMEN.length).setFontWeight('bold');
      blad.setFrozenRows(1);
    }
    blad.appendRow([
      new Date(),
      p.reist_mee === 'nee' ? 'Nee, afgemeld' : 'Ja',
      schoon(p.voornaam), schoon(p.achternaam), schoon(p.bedrijf), schoon(p.email),
      schoon(p.dieetwensen), schoon(p.opmerking), schoon(p.kaartnummer), schoon(p.bron)
    ]);
  } finally {
    lock.releaseLock();
  }
  return antwoord({ ok: true });
}

// Even testen of de web-app werkt: open de /exec-URL in je browser.
function doGet() {
  return antwoord({ ok: true, bericht: 'De stempelautomaat is aangesloten.' });
}

// Voorkomt dat tekst als formule wordt uitgevoerd (bv. "=HYPERLINK(...)").
function schoon(v) {
  v = String(v || '').slice(0, 1000);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function antwoord(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
