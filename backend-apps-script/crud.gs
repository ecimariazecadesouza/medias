/**
 * crud.gs
 * ───────
 * Funções genéricas para manipulação de planilhas e dados (CRUD).
 */

const SHEETS_CONFIG = {
  protagonistas: { cols: ['id', 'nome', 'matricula', 'turmaId', 'turmaNome', 'status'] },
  turmas: { cols: ['id', 'nome', 'anoLetivo', 'turno', 'disciplinaIds'] },
  docentes: { cols: ['id', 'nome', 'email', 'disciplinaIds', 'turmaIds', 'vinculos'] },
  disciplinas: { cols: ['id', 'nome', 'areaId', 'areaNome', 'periodicidade'] },
  areas: { cols: ['id', 'nome', 'subformacaoId'] },
  subformacoes: { cols: ['id', 'nome', 'formacaoId'] },
  formacoes: { cols: ['id', 'nome'] },
  lancamentos: { cols: ['id', 'protagonistaId', 'protagonistaNome', 'disciplinaId', 'disciplinaNome', 'turmaId', 'turmaNome', 'bimestre', 'media', 'dataLancamento'] },
  configuracoes: { cols: ['chave', 'valor'] },
  conselho: { cols: ['id', 'protagonistaId', 'ano', 'resultadoManual', 'deliberado'] },
};

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error(`Aba "${name}" não encontrada`);
  return sheet;
}

function ensureSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS_CONFIG).forEach(name => {
    if (!ss.getSheetByName(name)) {
      const sheet = ss.insertSheet(name);
      const cols = SHEETS_CONFIG[name].cols;
      sheet.getRange(1, 1, 1, cols.length).setValues([cols]);
      sheet.getRange(1, 1, 1, cols.length).setFontWeight('bold').setBackground('#3D52A0').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
  });
}

/**
 * Remove abas com nome contendo "_conflict" (abas duplicadas criadas por conflito de sincronização).
 * Pode ser chamada manualmente via Apps Script ou pelo frontend via action 'cleanConflictSheets'.
 */
function cleanConflictSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const removed = [];
  sheets.forEach(sheet => {
    const name = sheet.getName();
    if (name.includes('_conflict') || name.includes('conflict')) {
      ss.deleteSheet(sheet);
      removed.push(name);
    }
  });
  return removed;
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
        try { val = JSON.parse(val); } catch {}
      }
      if (typeof val === 'string' && val !== '' && !isNaN(Number(val))) {
        val = Number(val);
      }
      obj[h] = val;
    });
    return obj;
  }).filter(obj => obj.id || obj.chave);
}

function objectsToRow(sheetName, obj) {
  const cols = SHEETS_CONFIG[sheetName].cols;
  return cols.map(col => {
    const val = obj[col];
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return val;
  });
}

function getAll(sheetName) {
  const sheet = getSheet(sheetName);
  return sheetToObjects(sheet);
}

function saveRow(sheetName, row) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  const rowData = objectsToRow(sheetName, row);

  const existingIdx = data.findIndex((r, i) => i > 0 && String(r[idCol]) === String(row.id));
  if (existingIdx > 0) {
    sheet.getRange(existingIdx + 1, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  return row;
}

function deleteRow(sheetName, id) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  const rowIdx = data.findIndex((r, i) => i > 0 && String(r[idCol]) === String(id));
  if (rowIdx > 0) {
    sheet.deleteRow(rowIdx + 1);
  }
  return true;
}

function getByFilter(sheetName, field, value) {
  const sheet = getSheet(sheetName);
  const objs = sheetToObjects(sheet);
  return objs.filter(obj => String(obj[field]) === String(value));
}

function saveBatch(sheetName, rows) {
  rows.forEach(row => saveRow(sheetName, row));
  return true;
}

function importBatch(sheetName, rows) {
  const sheet = getSheet(sheetName);
  const cols = SHEETS_CONFIG[sheetName].cols;
  const rowsData = rows.map(row => objectsToRow(sheetName, row));
  if (rowsData.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsData.length, cols.length).setValues(rowsData);
  }
  return true;
}
