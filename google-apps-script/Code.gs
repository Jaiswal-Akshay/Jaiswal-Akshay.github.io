const HEADERS = [
  'Request ID', 'Token', 'Status', 'Name', 'Email', 'Requested date', 'Requested time',
  'Reason', 'Created at', 'Proposed date', 'Proposed time', 'Calendar event ID', 'Meet link'
];

function getConfig_(key, fallback) {
  return PropertiesService.getScriptProperties().getProperty(key) || fallback;
}

function getTimeZone_() {
  return getConfig_('TIMEZONE', Session.getScriptTimeZone() || 'America/Los_Angeles');
}

function getWebAppUrl_() {
  return getConfig_('WEB_APP_URL', ScriptApp.getService().getUrl());
}

function getSheet_() {
  const spreadsheetId = getConfig_('SHEET_ID', '');
  const spreadsheet = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Set SHEET_ID in Script Properties.');
  let sheet = spreadsheet.getSheetByName('Booking Requests');
  if (!sheet) sheet = spreadsheet.insertSheet('Booking Requests');
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  return sheet;
}

function doPost(e) {
  const p = e.parameter || {};
  if (p.action === 'change-submit') return submitChange_(p);
  if (!p.name || !p.email || !p.date || !p.time) return text_('Missing required booking fields.');

  const sheet = getSheet_();
  const requestId = Utilities.getUuid();
  const token = Utilities.getUuid().replace(/-/g, '');
  sheet.appendRow([
    requestId, token, 'PENDING', p.name, p.email, p.date, p.time,
    p.message || '', new Date(), '', '', '', ''
  ]);

  const actions = actionUrls_(token);
  const ownerEmail = getConfig_('OWNER_EMAIL', '');
  if (!ownerEmail) throw new Error('Set OWNER_EMAIL in Script Properties.');
  MailApp.sendEmail({
    to: ownerEmail,
    subject: 'New meeting request from ' + p.name,
    htmlBody: ownerRequestEmail_(p, actions)
  });
  return text_('Request submitted.');
}

function doGet(e) {
  const p = e.parameter || {};
  if (p.action === 'accept') return accept_(p.token);
  if (p.action === 'deny') return deny_(p.token);
  if (p.action === 'change') return changeForm_(p.token);
  if (p.action === 'change-submit') return submitChange_(p);
  if (p.action === 'confirm-change') return confirmChange_(p.token);
  if (p.action === 'decline-change') return declineChange_(p.token);
  return text_('Booking service is running.');
}

function actionUrls_(token) {
  const base = getWebAppUrl_();
  return {
    accept: base + '?action=accept&token=' + encodeURIComponent(token),
    deny: base + '?action=deny&token=' + encodeURIComponent(token),
    change: base + '?action=change&token=' + encodeURIComponent(token)
  };
}

function findRequest_(token) {
  if (!token) throw new Error('Missing request token.');
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i += 1) {
    if (String(values[i][1]) === String(token)) return { sheet: sheet, row: i + 1, values: values[i] };
  }
  throw new Error('This booking request could not be found.');
}

function accept_(token, useProposed) {
  try {
    const request = findRequest_(token);
    const row = request.values;
    if (row[2] === 'ACCEPTED') return text_('This request has already been accepted.');
    const date = useProposed && row[9] ? row[9] : row[5];
    const time = useProposed && row[10] ? row[10] : row[6];
    const calendarId = getConfig_('CALENDAR_ID', 'primary');
    const start = new Date(date + 'T' + time + ':00');
    const end = new Date(start.getTime() + 20 * 60 * 1000);
    const event = Calendar.Events.insert({
      summary: 'Conversation with Akshay Jaiswal',
      description: row[7] || 'Meeting requested through Akshay Jaiswal\'s portfolio.',
      start: { dateTime: start.toISOString(), timeZone: getTimeZone_() },
      end: { dateTime: end.toISOString(), timeZone: getTimeZone_() },
      attendees: [{ email: row[4], displayName: row[3] }],
      conferenceData: { createRequest: { requestId: Utilities.getUuid(), conferenceSolutionKey: { type: 'hangoutsMeet' } } }
    }, calendarId, { conferenceDataVersion: 1, sendUpdates: 'all' });
    const meetLink = getMeetLink_(event);
    request.sheet.getRange(request.row, 3, 1, 11).setValues([[
      'ACCEPTED', row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10], event.id, meetLink
    ]]);
    MailApp.sendEmail({ to: row[4], subject: 'Meeting confirmed with Akshay Jaiswal', htmlBody: confirmationEmail_(row, date, time, meetLink) });
    return page_('Meeting accepted', 'The calendar invitation and Google Meet link have been sent to ' + escape_(row[4]) + '.');
  } catch (error) {
    return page_('Could not accept request', escape_(error.message));
  }
}

function deny_(token) {
  return updateStatus_(token, 'DENIED', 'Request declined', 'I declined the requested meeting time.');
}

function updateStatus_(token, status, title, message) {
  try {
    const request = findRequest_(token);
    const row = request.values;
    request.sheet.getRange(request.row, 3).setValue(status);
    MailApp.sendEmail({ to: row[4], subject: title + ' — Akshay Jaiswal', htmlBody: simpleEmail_(row[3], message) });
    return page_(title, 'An email has been sent to ' + escape_(row[4]) + '.');
  } catch (error) {
    return page_('Action failed', escape_(error.message));
  }
}

function changeForm_(token) {
  return HtmlService.createHtmlOutput('<!doctype html><html><head><base target="_top"><style>body{font:16px Arial;max-width:520px;margin:40px auto;padding:0 20px;color:#172033}label{display:block;margin:16px 0 6px;font-weight:bold}input,button{width:100%;padding:12px;box-sizing:border-box}button{margin-top:22px;background:#1769e0;color:white;border:0;border-radius:6px;cursor:pointer}</style></head><body><h1>Suggest another time</h1><p>Choose a new time for this request.</p><form method="get" action="' + escapeAttribute_(getWebAppUrl_()) + '"><input type="hidden" name="action" value="change-submit"><input type="hidden" name="token" value="' + escapeAttribute_(token) + '"><label for="date">Date</label><input id="date" name="date" type="date" required><label for="time">Time</label><select id="time" name="time" required>' + timeOptions_() + '</select><button type="submit">Send new time</button></form></body></html>');
}

function timeOptions_() {
  let html = '<option value="" disabled selected>Select a time</option>';
  for (let minutes = 9 * 60; minutes <= 17 * 60; minutes += 30) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const label = (h % 12 || 12) + ':' + String(m).padStart(2, '0') + (h >= 12 ? ' PM' : ' AM');
    html += '<option value="' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + '">' + label + '</option>';
  }
  return html;
}

function submitChange_(p) {
  try {
    if (!p.token || !p.date || !p.time) throw new Error('Date and time are required.');
    const request = findRequest_(p.token);
    const row = request.values;
    request.sheet.getRange(request.row, 3, 1, 9).setValues([['CHANGE_REQUESTED', row[3], row[4], row[5], row[6], row[7], row[8], p.date, p.time]]);
    const base = getWebAppUrl_();
    MailApp.sendEmail({
      to: row[4],
      subject: 'New time suggested for your meeting with Akshay Jaiswal',
      htmlBody: '<p>Hi ' + escape_(row[3]) + ',</p><p>Akshay suggested <strong>' + escape_(p.date) + ' at ' + escape_(p.time) + ' PT</strong>.</p><p><a href="' + base + '?action=confirm-change&token=' + p.token + '">Confirm this time</a> &nbsp; <a href="' + base + '?action=decline-change&token=' + p.token + '">Decline</a></p>'
    });
    return page_('New time sent', 'The proposed time has been emailed to ' + escape_(row[4]) + '.');
  } catch (error) {
    return page_('Could not suggest time', escape_(error.message));
  }
}

function confirmChange_(token) {
  try {
    const request = findRequest_(token);
    if (request.values[2] !== 'CHANGE_REQUESTED') return page_('No pending change', 'This time-change request is no longer active.');
    return accept_(token, true);
  } catch (error) {
    return page_('Could not confirm time', escape_(error.message));
  }
}

function declineChange_(token) {
  return updateStatus_(token, 'PENDING', 'Time change declined', 'The proposed time was declined. You can contact me to discuss another time.');
}

function getMeetLink_(event) {
  const entries = (event.conferenceData && event.conferenceData.entryPoints) || [];
  const video = entries.find(function(entry) { return entry.entryPointType === 'video'; });
  return video ? video.uri : event.hangoutLink || '';
}

function ownerRequestEmail_(p, actions) {
  return '<p>New meeting request from <strong>' + escape_(p.name) + '</strong>.</p><p><strong>Date:</strong> ' + escape_(p.date) + '<br><strong>Time:</strong> ' + escape_(p.time) + ' PT<br><strong>Email:</strong> ' + escape_(p.email) + '</p><p><strong>Reason:</strong> ' + escape_(p.message || 'Not provided') + '</p><p><a href="' + actions.accept + '">Accept</a> &nbsp; <a href="' + actions.change + '">Suggest another time</a> &nbsp; <a href="' + actions.deny + '">Deny</a></p>';
}

function confirmationEmail_(row, date, time, meetLink) {
  return '<p>Hi ' + escape_(row[3]) + ',</p><p>Your conversation with Akshay Jaiswal is confirmed for <strong>' + escape_(date) + ' at ' + escape_(time) + ' PT</strong>.</p><p><a href="' + escape_(meetLink) + '">Join Google Meet</a></p><p>A calendar invitation has also been sent to you.</p>';
}

function simpleEmail_(name, message) {
  return '<p>Hi ' + escape_(name) + ',</p><p>' + escape_(message) + '</p><p>Please reply to this email if you would like to discuss another time.</p>';
}

function page_(title, message) {
  return HtmlService.createHtmlOutput('<!doctype html><html><head><base target="_top"><style>body{font:16px Arial;max-width:620px;margin:80px auto;padding:0 20px;color:#172033}h1{color:#1769e0}</style></head><body><h1>' + escape_(title) + '</h1><p>' + message + '</p></body></html>');
}

function text_(message) {
  return ContentService.createTextOutput(message).setMimeType(ContentService.MimeType.TEXT);
}

function escape_(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function escapeAttribute_(value) {
  return escape_(value);
}
