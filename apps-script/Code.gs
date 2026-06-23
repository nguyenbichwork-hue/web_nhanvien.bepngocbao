/**
 * BNB RMS — Google Apps Script Web App cho "Auto Pricing" (quét giá & ghi Google Sheet).
 * Dán toàn bộ file này vào Apps Script của Google Sheet → Deploy → Web app (Anyone).
 *
 * Mỗi SHEET sản phẩm có cột:
 *   A Mã | B Thương hiệu | C Model | D Tên | E Giá vốn | F Giá hiện tại
 *   | G Số link | H Giá thấp nhất TT | I Giá đề xuất | J Lợi nhuận | K % LN
 *   | L Cảnh báo | M Trạng thái | N Cập nhật | O Link tham khảo
 * (G..O do hệ thống tự ghi; J & K là CÔNG THỨC tự cập nhật khi giá vốn/đề xuất đổi.)
 *
 * Nhiều sheet con đều quét được (chọn ở app). Sheet "LOG" lưu nhật ký giá.
 */

// ⚠️ ĐỔI mật khẩu này rồi điền y hệt vào Vercel env SHEET_SECRET.
var SECRET = 'doi-mat-khau-nay';

var SHEET_LOG = 'LOG';
var HEADERS = [
  'Mã', 'Thương hiệu', 'Model', 'Tên', 'Giá vốn', 'Giá hiện tại',
  'Số link', 'Giá thấp nhất TT', 'Giá đề xuất', 'Lợi nhuận', '% LN',
  'Cảnh báo', 'Trạng thái', 'Cập nhật', 'Link tham khảo',
];
var FIRST_DATA_ROW = 2;

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    if (String(body.secret || '') !== SECRET) return json({ error: 'Sai SHEET_SECRET' });
    switch (body.action) {
      case 'ping': return json({ ok: true, sheet: SpreadsheetApp.getActiveSpreadsheet().getName() });
      case 'setup': return json(setup());
      case 'listSheets': return json({ sheets: listSheets() });
      case 'getProducts': return json({ products: getProducts(body.sheets) });
      case 'writeResults': return json(writeResults(body.items || []));
      case 'appendLog': return json(appendLog(body.rows || []));
      default: return json({ error: 'Action không hợp lệ: ' + body.action });
    }
  } catch (err) {
    return json({ error: String(err) });
  }
}

function doGet() { return json({ ok: true, hint: 'POST {secret, action}. Web app đang chạy.' }); }
function json(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

function isProductSheet(sh) {
  if (sh.getName() === SHEET_LOG) return false;
  if (sh.getLastRow() < 1) return false;
  var h = String(sh.getRange(1, 1).getValue()).trim().toLowerCase();
  return h === 'mã' || h === 'ma'; // cột A tiêu đề "Mã"
}

/** Liệt kê các sheet con là sheet sản phẩm (cho app chọn quét). */
function listSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var out = [];
  var shs = ss.getSheets();
  for (var i = 0; i < shs.length; i++) {
    if (isProductSheet(shs[i])) {
      out.push({ name: shs[i].getName(), rows: Math.max(0, shs[i].getLastRow() - 1) });
    }
  }
  return out;
}

/** Tạo sheet mẫu "SanPham" + "LOG" nếu chưa có sheet sản phẩm nào. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var created = [];
  if (listSheets().length === 0) {
    var sh = ss.getSheetByName('SanPham') || ss.insertSheet('SanPham');
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sh.setFrozenRows(1);
    created.push('SanPham');
  }
  var lg = ss.getSheetByName(SHEET_LOG) || ss.insertSheet(SHEET_LOG);
  if (lg.getLastRow() === 0) {
    lg.getRange(1, 1, 1, 5).setValues([['Thời gian', 'Thương hiệu', 'Model', 'Giá', 'Link']]).setFontWeight('bold');
    lg.setFrozenRows(1);
  }
  return { ok: true, created: created.concat([SHEET_LOG]) };
}

/** Đọc sản phẩm (cột A..F) từ các sheet được chọn (mặc định: tất cả sheet sản phẩm). */
function getProducts(sheetNames) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var names = (sheetNames && sheetNames.length) ? sheetNames : listSheets().map(function (s) { return s.name; });
  var out = [];
  for (var s = 0; s < names.length; s++) {
    var sh = ss.getSheetByName(names[s]);
    if (!sh || !isProductSheet(sh)) continue;
    var last = sh.getLastRow();
    if (last < FIRST_DATA_ROW) continue;
    var vals = sh.getRange(FIRST_DATA_ROW, 1, last - FIRST_DATA_ROW + 1, 6).getValues();
    for (var i = 0; i < vals.length; i++) {
      var r = vals[i];
      var ma = String(r[0] || '').trim();
      var model = String(r[2] || '').trim();
      if (!ma && !model) continue;
      out.push({
        row: FIRST_DATA_ROW + i, sheet: names[s], ma: ma,
        brand: String(r[1] || '').trim(), model: model, ten: String(r[3] || '').trim(),
        giaVon: toNum(r[4]), giaHienTai: toNum(r[5]),
      });
    }
  }
  return out;
}

function toNum(v) {
  if (v === '' || v === null || v === undefined) return null;
  var n = Number(v);
  return isFinite(n) ? n : null;
}

/** Ghi kết quả vào cột G..O theo từng dòng (mỗi item kèm {sheet, row}). */
function writeResults(items) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var now = new Date();
  var written = 0;
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var sh = ss.getSheetByName(it.sheet);
    var row = Number(it.row);
    if (!sh || !row || row < FIRST_DATA_ROW) continue;
    sh.getRange(row, 7).setValue(it.soLink == null ? '' : it.soLink);
    sh.getRange(row, 8).setValue(it.min == null ? '' : it.min);
    sh.getRange(row, 9).setValue(it.deXuat == null ? '' : it.deXuat);
    sh.getRange(row, 10).setFormula('=IF(OR($E' + row + '="",$I' + row + '=""),"",$I' + row + '-$E' + row + ')');
    sh.getRange(row, 11).setFormula('=IF(OR($E' + row + '="",$I' + row + '="",$E' + row + '=0),"",($I' + row + '-$E' + row + ')/$E' + row + ')');
    sh.getRange(row, 11).setNumberFormat('0.0%');
    sh.getRange(row, 12).setValue(it.canhBao || '');
    sh.getRange(row, 13).setValue(it.trangThai || '');
    sh.getRange(row, 14).setValue(now);
    sh.getRange(row, 15).setValue(it.links || '');
    written++;
  }
  return { ok: true, written: written };
}

function appendLog(rows) {
  if (!rows.length) return { ok: true, appended: 0 };
  var lg = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_LOG) ||
    SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_LOG);
  var now = new Date();
  var data = rows.map(function (r) { return [r[0] || now, r[1] || '', r[2] || '', r[3] == null ? '' : r[3], r[4] || '']; });
  lg.getRange(lg.getLastRow() + 1, 1, data.length, 5).setValues(data);
  return { ok: true, appended: data.length };
}
