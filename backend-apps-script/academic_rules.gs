/**
 * academic_rules.gs
 * ────────────────
 * Regras de negócio, cálculos pedagógicos e gestão de configurações.
 */

function getConfig() {
  const sheet = getSheet('configuracoes');
  const objs = sheetToObjects(sheet);
  const config = {};
  objs.forEach(row => {
    let val = row.valor;
    if (typeof val === 'string') {
      try { val = JSON.parse(val); } catch {}
    }
    config[row.chave] = val;
  });

  return {
    nomeEscola:  config.nomeEscola  || 'Minha Escola',
    anoLetivo:   config.anoLetivo   || new Date().getFullYear().toString(),
    mediaMinima: config.mediaMinima !== undefined ? Number(config.mediaMinima) : 6.0,
    logoUrl:     config.logoUrl     || '',
    bimestres:   config.bimestres   || [
      { numero: 1, nome: '1º Bimestre', dataInicio: '', dataFim: '', fechado: false },
      { numero: 2, nome: '2º Bimestre', dataInicio: '', dataFim: '', fechado: false },
      { numero: 3, nome: '3º Bimestre', dataInicio: '', dataFim: '', fechado: false },
      { numero: 4, nome: '4º Bimestre', dataInicio: '', dataFim: '', fechado: false },
    ],
  };
}

function saveConfig(config) {
  const sheet = getSheet('configuracoes');
  Object.keys(config).forEach(chave => {
    const val = config[chave];
    const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const chaveCol = headers.indexOf('chave');
    const valorCol = headers.indexOf('valor');
    const rowIdx = data.findIndex((r, i) => i > 0 && String(r[chaveCol]) === chave);
    if (rowIdx > 0) {
      sheet.getRange(rowIdx + 1, valorCol + 1).setValue(valStr);
    } else {
      sheet.appendRow([chave, valStr]);
    }
  });
  return true;
}

/**
 * Exemplo de regra pedagógica processada no servidor:
 * Calcula a situação final baseada na média acumulada.
 */
function calculateFinalSituation(media) {
  const min = getConfig().mediaMinima;
  return media >= min ? 'Aprovado' : 'Reprovado';
}
