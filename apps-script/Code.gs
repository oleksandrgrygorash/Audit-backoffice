// ← Встав сюди ID Google-таблиці (частина URL між /d/ і /edit).
//    Якщо скрипт прив'язаний до таблиці (створений через Extensions → Apps Script),
//    можна лишити порожнім — тоді береться активна таблиця.
var SHEET_ID = '';

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Responses') || ss.insertSheet('Responses');
    var data = JSON.parse(e.postData.contents);

    // Header — створюється один раз із першого payload (порядок answers = порядок сервісів)
    if (sheet.getLastRow() === 0) {
      var header = ['timestamp', 'submission_id', 'role', 'unit', 'team', 'comment'];
      data.answers.forEach(function (a) {
        header.push(a.name + ' · користь');
        header.push(a.name + ' · складність');
        header.push(a.name + ' · коментар');
      });
      header.push('Власні процеси');
      sheet.appendRow(header);
    }

    var row = [data.ts, data.submission_id, data.role, data.unit, data.team, data.comment || ''];
    data.answers.forEach(function (a) {
      if (a.na) { row.push('—'); row.push('—'); }
      else { row.push(a.value); row.push(a.burden); }
      row.push(a.comment || '');
    });
    var custom = (data.custom || []).map(function (c) {
      return c.name + ': користь ' + c.value + ', складність ' + c.burden + (c.comment ? ' — ' + c.comment : '');
    }).join(' | ');
    row.push(custom);

    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// Швидка ручна перевірка з редактора Apps Script (Run → testDoPost)
function testDoPost() {
  var payload = {
    submission_id: 'TEST-0001',
    ts: '2026-06-29T12:00:00.000Z',
    role: 'Manager', unit: 'Soportio', team: 'QA',
    comment: 'тестова відповідь',
    answers: [
      { id: 'hire', name: 'Найм людини', owner: 'Talent Acquisition', value: 3, burden: 4, comment: 'ок' },
      { id: 'device', name: 'Техніка', owner: 'Operations', na: true, comment: '' }
    ],
    custom: [
      { name: 'Свій процес', value: 2, burden: 4, comment: 'тестовий' }
    ]
  };
  doPost({ postData: { contents: JSON.stringify(payload) } });
}
