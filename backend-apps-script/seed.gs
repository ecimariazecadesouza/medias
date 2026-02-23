/**
 * seed.gs
 * ───────
 * Função de inicialização e dados de exemplo (opcional).
 */

function runSeed() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheets();
  
  // Exemplo: Criar algumas disciplinas básicas se estiver vazio
  const discSheet = getSheet('disciplinas');
  if (discSheet.getLastRow() === 1) {
    const initialDiscs = [
      { id: 'disc-pt', nome: 'Língua Portuguesa', areaNome: 'Linguagens' },
      { id: 'disc-mat', nome: 'Matemática', areaNome: 'Exatas' },
      { id: 'disc-bio', nome: 'Biologia', areaNome: 'Ciências da Natureza' }
    ];
    importBatch('disciplinas', initialDiscs);
  }
  
  return "Seed finalizado com sucesso.";
}

/**
 * Migração: Adiciona a coluna 'disciplinaIds' à aba turmas se ela não existir.
 * Execute esta função UMA VEZ no Editor do Apps Script.
 */
function migrateAddDisciplinaIdsToTurmas() {
  const sheet = getSheet('turmas');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  if (headers.includes('disciplinaIds')) {
    return 'Coluna disciplinaIds já existe. Nada a fazer.';
  }
  
  // Adiciona o header na próxima coluna disponível
  const nextCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, nextCol).setValue('disciplinaIds')
    .setFontWeight('bold')
    .setBackground('#3D52A0')
    .setFontColor('#ffffff');
  
  // Preenche as linhas existentes com array vazio "[]"
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, nextCol, lastRow - 1, 1).setValue('[]');
  }
  
  return `Coluna disciplinaIds adicionada na posição ${nextCol}. Linhas preenchidas: ${lastRow - 1}`;
}

/**
 * Migração: Corrige o cabeçalho vazio da coluna 'periodicidade' na aba disciplinas.
 * Procura a primeira coluna com header vazio que tenha dados (ex: "Anual") e escreve o header correto.
 * Execute esta função UMA VEZ no Editor do Apps Script.
 */
function migrateFixDisciplinasHeader() {
  const sheet = getSheet('disciplinas');
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  // Verifica se periodicidade já existe
  if (headers.includes('periodicidade')) {
    return 'Header periodicidade já existe. Nada a fazer.';
  }

  // Procura coluna com header vazio
  const emptyHeaderIdx = headers.findIndex(h => h === '' || h === null || h === undefined);
  if (emptyHeaderIdx === -1) {
    return 'Nenhuma coluna com header vazio encontrada. Verifique a planilha manualmente.';
  }

  const colIndex = emptyHeaderIdx + 1; // 1-indexed
  sheet.getRange(1, colIndex)
    .setValue('periodicidade')
    .setFontWeight('bold')
    .setBackground('#3D52A0')
    .setFontColor('#ffffff');

  return `Header 'periodicidade' escrito na coluna ${colIndex} (${String.fromCharCode(64 + colIndex)}).`;
}

/**
 * Migração: Mescla docentes duplicados por e-mail e inicializa a coluna 'vinculos'.
 * Caso o docente tenha registros duplicados, unifica os disciplinaIds e turmaIds.
 * Execute esta função UMA VEZ no Editor do Apps Script ou via botão na UI (opcional).
 */
function migrateDocentesVinculos() {
  const sheet = getSheet('docentes');
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  // 1. Garantir que a coluna 'vinculos' existe
  let vinculosCol = headers.indexOf('vinculos') + 1;
  if (vinculosCol === 0) {
    vinculosCol = lastCol + 1;
    sheet.getRange(1, vinculosCol).setValue('vinculos')
      .setFontWeight('bold')
      .setBackground('#3D52A0')
      .setFontColor('#ffffff');
  }

  const allDocentes = GetAll('docentes');
  if (allDocentes.length === 0) return "Nenhum docente para migrar.";

  // Agrupar por email (ou id se email vazio)
  const map = new Map();
  
  allDocentes.forEach(d => {
    const key = (d.email || d.id).toLowerCase().trim();
    if (!map.has(key)) {
      map.set(key, {
        id: d.id,
        nome: d.nome,
        email: d.email,
        disciplinaIds: safeParseArray(d.disciplinaIds),
        turmaIds: safeParseArray(d.turmaIds),
        vinculos: safeParseArray(d.vinculos)
      });
    } else {
      const existing = map.get(key);
      // Mesclar IDs únicos
      existing.disciplinaIds = [...new Set([...existing.disciplinaIds, ...safeParseArray(d.disciplinaIds)])];
      existing.turmaIds = [...new Set([...existing.turmaIds, ...safeParseArray(d.turmaIds)])];
      // Nota: Vinculos novos são mesclados só se o existing estiver vazio
      const dVinculos = safeParseArray(d.vinculos);
      if (existing.vinculos.length === 0 && dVinculos.length > 0) {
        existing.vinculos = dVinculos;
      }
    }
  });

  // 2. Limpar a planilha e re-importar (Cuidado: Backup manual recomendado)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
    // Limpar também a coluna nova se for maior que lastCol inicial
    if (vinculosCol > lastCol) {
      sheet.getRange(2, vinculosCol, lastRow - 1, 1).clearContent();
    }
  }

  // 3. Preparar vinculos para quem não tem
  const finalDocentes = Array.from(map.values()).map(d => {
    // Se não tem vínculos, cria um vínculo básico para cada disciplina com todas as turmas (conservador)
    if (d.vinculos.length === 0 && d.disciplinaIds.length > 0) {
      d.vinculos = d.disciplinaIds.map(discId => ({
        disciplinaId: discId,
        turmaIds: d.turmaIds
      }));
    }
    return d;
  });

  importBatch('docentes', finalDocentes);
  return `Migração concluída. ${allDocentes.length} registros originais mesclados em ${finalDocentes.length} docentes únicos.`;
}

function safeParseArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const p = JSON.parse(val);
    return Array.isArray(p) ? p : [];
  } catch (e) {
    // Se for string com vírgula (formato CSV antigo talvez?)
    if (typeof val === 'string' && val.includes(',')) return val.split(',').map(s => s.trim());
    return [];
  }
}
