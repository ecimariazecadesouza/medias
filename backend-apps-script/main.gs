/**
 * main.gs
 * ────────
 * Arquivo principal de entrada para o Google Apps Script.
 * Contém os handlers de requisição (doGet/doPost) e o roteamento de ações.
 */

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e, e.postData ? JSON.parse(e.postData.contents) : {});
}

function handleRequest(e, body) {
  try {
    const params = e.parameter || {};
    const action = params.action || body.action;
    const payload = params.payload ? JSON.parse(params.payload) : body;

    // Garante que todas as abas necessárias existem
    ensureSheets();

    let result;
    switch (action) {
      // Operações Genéricas (crud.gs)
      case 'getAll':        result = getAll(payload.sheet); break;
      case 'saveRow':       result = saveRow(payload.sheet, payload.row); break;
      case 'deleteRow':     result = deleteRow(payload.sheet, payload.id); break;
      case 'getByFilter':   result = getByFilter(payload.sheet, payload.field, payload.value); break;
      case 'saveBatch':     result = saveBatch(payload.sheet, payload.rows); break;
      case 'importBatch':         result = importBatch(payload.sheet, payload.rows); break;
      case 'cleanConflictSheets': result = cleanConflictSheets(); break;
    case 'migrateDocentesVinculos': result = migrateDocentesVinculos(); break;
      
      // Operações de Configuração (academic_rules.gs)
      case 'getConfig':     result = getConfig(); break;
      case 'saveConfig':    result = saveConfig(payload.config); break;
      
      // Operações de Inicialização (seed.gs)
      case 'runSeed':       result = runSeed(); break;

      default:
        return jsonResponse({ success: false, error: `Ação desconhecida: ${action}` });
    }

    return jsonResponse({ success: true, data: result });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

/**
 * Retorna resposta formatada em JSON
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
