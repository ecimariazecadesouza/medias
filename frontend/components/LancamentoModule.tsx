'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useGrades } from '@/context/GradesContext';
import { api, newId } from '@/lib/api';
import { Lancamento, TABELA_PRECISA } from '@/lib/types';
import { Save, Lock, CheckCircle, ClipboardList } from 'lucide-react';
import { UserRole } from '@/lib/supabase';

export default function LancamentoModule({ readOnly = false, role, userEmail }: { readOnly?: boolean; role?: UserRole; userEmail?: string }) {
    const {
        turmas: allTurmas, disciplinas: allDisciplinas, protagonistas, lancamentos, setLancamentos,
        configuracao, docentes, getMG, getMF, getSituacao
    } = useGrades();
    const safeTurmas = (Array.isArray(allTurmas) ? allTurmas : []).filter(Boolean);
    const safeDisciplinas = (Array.isArray(allDisciplinas) ? allDisciplinas : []).filter(Boolean);
    const safeDocentes = (Array.isArray(docentes) ? docentes : []).filter(Boolean);
    const rawProts = protagonistas || [];
    const safeProtagonistas = (Array.isArray(rawProts) ? rawProts : []).filter(Boolean);
    const safeLancamentos = (Array.isArray(lancamentos) ? lancamentos : []).filter(Boolean);

    // Filtros para Docente
    const isDocente = role === 'Docente';
    const docenteProfile = isDocente ? safeDocentes.find(d => String(d?.email || '').toLowerCase() === String(userEmail || '').toLowerCase()) : null;

    // Se for docente, filtra apenas suas turmas e disciplinas
    const turmas = isDocente && docenteProfile
        ? safeTurmas.filter(t => (docenteProfile?.turmaIds || []).includes(t?.id))
        : safeTurmas;

    const [selTurma, setSelTurma] = useState('');
    const [selDisciplina, setSelDisciplina] = useState('');
    const [selSituacao, setSelSituacao] = useState<'Cursando' | 'Transferido' | 'Desistente' | 'Trancado' | 'Formado'>('Cursando');
    const [selBimestre, setSelBimestre] = useState<1 | 2 | 3 | 4 | 5>(1);

    const selTurmaObj = safeTurmas.find(t => t?.id === selTurma);
    const classDisciplinaIds = selTurmaObj?.disciplinaIds || [];

    const disciplinas = useMemo(() => {
        let list = allDisciplinas;
        // Se a turma tiver disciplinas vinculadas, filtra por elas
        if (classDisciplinaIds.length > 0) {
            list = list.filter(d => classDisciplinaIds.includes(d?.id));
        }

        // Se for docente, filtra apenas suas disciplinas vinculadas a ESTA turma selecionada
        if (isDocente && docenteProfile) {
            if (docenteProfile.vinculos && docenteProfile.vinculos.length > 0) {
                // Filtra disciplinas que o docente leciona nesta turma específica
                list = list.filter(d =>
                    docenteProfile.vinculos?.some(v => v.disciplinaId === d.id && v.turmaIds.includes(selTurma))
                );
            } else {
                // Fallback para docentes sem vinculos estruturados
                list = list.filter(d => (docenteProfile.disciplinaIds || []).includes(d.id));
            }
        }

        return list;
    }, [safeDisciplinas, classDisciplinaIds, isDocente, docenteProfile, selTurma]);

    const [toast, setToast] = useState('');
    const [grades, setGrades] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [importModal, setImportModal] = useState(false);
    const [importText, setImportText] = useState('');

    const showMsg = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    // BUG FIX: Stabilize turmaProts to prevent loadGrades effect from running on every keystroke
    const turmaProts = useMemo(() => {
        const rawP = protagonistas || [];
        const safeProts = (Array.isArray(rawP) ? rawP : []).filter(Boolean);
        return safeProts
            .filter(p => p?.turmaId === selTurma && p?.status === selSituacao)
            .sort((a, b) => (a?.nome || '').localeCompare(b?.nome || ''));
    }, [protagonistas, selTurma, selSituacao]);

    const currentDisciplina = safeDisciplinas.find(d => d?.id === selDisciplina);
    const periodicidade = currentDisciplina?.periodicidade || 'Anual';
    const isBimestreAllowed = periodicidade === 'Anual'
        ? true
        : periodicidade === '1° Semestre'
            ? [1, 2].includes(selBimestre)
            : [3, 4].includes(selBimestre);

    const bimestreConfig = configuracao?.bimestres?.find(b => b.numero === selBimestre);
    const isLocked = bimestreConfig?.fechado ?? false;

    // RF only allowed if MG < 6
    const isRF = selBimestre === 5;

    // Redireciona para o primeiro bimestre válido se a disciplina mudar
    useEffect(() => {
        if (selDisciplina) {
            if (periodicidade === '1° Semestre' && (selBimestre === 3 || selBimestre === 4)) {
                setSelBimestre(1);
            } else if (periodicidade === '2° Semestre' && (selBimestre === 1 || selBimestre === 2)) {
                setSelBimestre(3);
            }
        }
    }, [selDisciplina, periodicidade, selBimestre]);

    const loadGrades = useCallback(() => {
        if (!selTurma || !selDisciplina) return;
        const map: Record<string, string> = {};
        turmaProts.forEach(p => {
            [1, 2, 3, 4, 5].forEach(b => {
                const l = safeLancamentos.find(l =>
                    l?.protagonistaId === p?.id &&
                    l?.disciplinaId === selDisciplina &&
                    l?.turmaId === selTurma &&
                    l?.bimestre === b
                );
                const key = `${p.id}-${b}`;
                map[key] = l?.media !== null && l?.media !== undefined ? String(l.media).replace('.', ',') : '';
            });
        });
        setGrades(map);
        setSaved(false);
        setIsDirty(false);
    }, [selTurma, selDisciplina, turmaProts, lancamentos]);

    useEffect(() => { loadGrades(); }, [loadGrades]);

    const handleGradeChange = (protagonistaId: string, b: 1 | 2 | 3 | 4 | 5, value: string) => {
        const normalized = value.replace(',', '.');
        if (normalized !== '' && !/^\d*[.]?\d*$/.test(normalized)) return;
        if (normalized !== '' && normalized !== '.') {
            const num = parseFloat(normalized);
            if (num > 10) return;
        }

        const key = `${protagonistaId}-${b}`;
        setGrades(g => ({ ...g, [key]: value }));
        setIsDirty(true);
        setSaved(false);
    };

    const handleBatchImport = () => {
        const rows = importText.split('\n').filter(r => r.trim());
        const newGrades = { ...grades };
        let count = 0;
        rows.forEach(row => {
            const cols = row.split('\t');
            if (cols.length < 2) return;
            const name = String(cols[0] || '').trim().toLowerCase();
            const prot = turmaProts.find(p => String(p?.nome || '').toLowerCase() === name);
            if (prot) {
                // Suporta colando Nome [TAB] B1 [TAB] B2 [TAB] B3 [TAB] B4 [TAB] RF
                for (let i = 1; i <= 5; i++) {
                    const val = cols[i]?.trim();
                    if (val !== undefined && val !== '') {
                        newGrades[`${prot?.id}-${i}`] = val;
                        count++;
                    }
                }
            }
        });
        setGrades(newGrades);
        setIsDirty(true);
        setImportModal(false);
        setImportText('');
        showMsg(`${count} notas importadas com sucesso!`);
    };

    const handleSave = async () => {
        if (!selTurma || !selDisciplina) return;
        setSaving(true);
        try {
            const rowsToSave: Lancamento[] = [];
            turmaProts.forEach(p => {
                [1, 2, 3, 4, 5].forEach(b => {
                    const key = `${p.id}-${b}`;
                    const val = grades[key];
                    if (val === undefined) return; // Se o campo não foi tocado, não mexemos (ou salvamos se o doc já existia?)

                    const existing = lancamentos.find(l => l.protagonistaId === p.id && l.disciplinaId === selDisciplina && l.bimestre === b);
                    const mediaVal = val.replace(',', '.');

                    rowsToSave.push({
                        id: existing?.id ?? newId(),
                        protagonistaId: p.id,
                        protagonistaNome: p.nome,
                        disciplinaId: selDisciplina,
                        disciplinaNome: allDisciplinas.find(d => d.id === selDisciplina)?.nome,
                        turmaId: selTurma,
                        turmaNome: turmas.find(t => t.id === selTurma)?.nome,
                        bimestre: b as any,
                        media: mediaVal !== '' ? Number(mediaVal) : null,
                        dataLancamento: new Date().toISOString()
                    });
                });
            });

            if (rowsToSave.length > 0) {
                await api.lancamentos.saveBatch(rowsToSave);
                setLancamentos(prev => {
                    const updated = [...prev];
                    rowsToSave.forEach(r => {
                        const idx = updated.findIndex(x => x.id === r.id);
                        if (idx >= 0) updated[idx] = r; else updated.push(r);
                    });
                    return updated;
                });
            }
            setSaved(true);
            setIsDirty(false);
            showMsg('Todas as notas foram salvas!');
        } catch { showMsg('Erro ao salvar notas.'); }
        finally { setSaving(false); }
    };

    const mediaMinima = configuracao?.mediaMinima ?? 5.0;
    const canEdit = selSituacao === 'Cursando' && !readOnly;

    const getGradeClass = (val: string) => {
        if (!val) return '';
        const n = Number(val.replace(',', '.'));
        if (isNaN(n)) return '';
        if (n >= 8) return 'otimo';
        if (n >= 6) return 'bom';
        if (n >= 5) return 'regular';
        return 'insuficiente';
    };

    const getLocalRowStats = (pId: string) => {
        const getGrade = (b: number) => {
            const v = grades[`${pId}-${b}`];
            return (v && v !== '') ? Number(v.replace(',', '.')) : null;
        };

        const g1 = getGrade(1);
        const g2 = getGrade(2);
        const g3 = getGrade(3);
        const g4 = getGrade(4);
        const rf = getGrade(5);

        const filled = [g1, g2, g3, g4].filter(x => x !== null) as number[];
        const pts = [g1, g2, g3, g4].reduce((acc: number, v) => acc + (v || 0), 0);

        // MG institucional: soma / 4, arredondado para 1 casa decimal
        const mgRaw = pts / 4;
        const mg = filled.length > 0 ? Math.floor(mgRaw * 10) / 10 : null;

        // Tabela Precisa
        let precisa = '----';
        if (filled.length === 4) {
            if (pts < 10) precisa = 'Inapto';
            else if (pts >= 24) precisa = '----';
            else {
                const key = pts.toFixed(1);
                precisa = (TABELA_PRECISA as any)[key] || '----';
            }
        }

        // MF: (MG * 6 + RF * 4) / 10
        let mf: number | null = null;
        if (mg !== null) {
            if (mg >= 6.0) mf = mg;
            else if (rf !== null) {
                mf = Math.floor(((mg * 6) + (rf * 4))) / 10;
            }
        }

        // Situação
        let sit = 'EM CURSO';
        if (filled.length === 4) {
            if (pts < 10) sit = 'INAPTO';
            else if (mg !== null && mg >= 6.0) sit = 'APROVADO';
            else if (rf === null) sit = 'RECUPERAÇÃO';
            else if (mf !== null) sit = mf >= 5.0 ? 'APROVADO' : 'RETIDO';
        }

        return { pts, mg, precisa, rf, mf, sit };
    };

    const countAprovados = turmaProts.filter(p => {
        const { sit } = getLocalRowStats(p.id);
        return sit === 'APROVADO';
    }).length;

    const countReprovados = turmaProts.filter(p => {
        const { sit } = getLocalRowStats(p.id);
        return sit === 'RETIDO' || sit === 'INAPTO';
    }).length;

    const countPendentes = turmaProts.filter(p => {
        const { sit } = getLocalRowStats(p.id);
        return sit === 'EM CURSO' || sit === 'RECUPERAÇÃO';
    }).length;

    return (
        <>
            {toast && <div className="toast-container"><div className={`toast ${toast.includes('Erro') ? 'error' : 'success'}`}>{toast}</div></div>}

            {/* Selectors */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                    <div className="card-title">Selecionar Turma / Disciplina / Bimestre</div>
                </div>
                <div className="card-body">
                    <div className="form-grid form-grid-3" style={{ gap: '1rem' }}>
                        <div className="form-group">
                            <label className="label">Turma</label>
                            <select className="select" value={selTurma} onChange={e => setSelTurma(e.target.value)}>
                                <option value="">Selecione a turma...</option>
                                {[...turmas].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).map(t => <option key={t.id} value={t.id}>{t.nome} ({t.anoLetivo})</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="label">Disciplina</label>
                            <select className="select" value={selDisciplina} onChange={e => setSelDisciplina(e.target.value)}>
                                <option value="">Selecione a disciplina...</option>
                                {[...disciplinas].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="label">Situação</label>
                            <select className="select" value={selSituacao} onChange={e => setSelSituacao(e.target.value as any)}>
                                <option value="Cursando">Cursando</option>
                                <option value="Transferido">Transferido</option>
                                <option value="Desistente">Desistente</option>
                                <option value="Trancado">Trancado</option>
                                <option value="Formado">Formado</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {selTurma && selDisciplina ? (
                <>
                    {/* Stats */}
                    {turmaProts.length > 0 && (
                        <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
                            <div className="stat-card blue">
                                <span className="stat-card-label">Total</span>
                                <span className="stat-card-value">{turmaProts.length}</span>
                            </div>
                            <div className="stat-card green">
                                <span className="stat-card-label">Aprovados</span>
                                <span className="stat-card-value">{countAprovados}</span>
                            </div>
                            <div className="stat-card red">
                                <span className="stat-card-label">Reprovados</span>
                                <span className="stat-card-value">{countReprovados}</span>
                            </div>
                            <div className="stat-card amber">
                                <span className="stat-card-label">Pendentes</span>
                                <span className="stat-card-value">{countPendentes}</span>
                            </div>
                        </div>
                    )}

                    <div className="card">
                        <div className="card-header">
                            <div>
                                <div className="card-title">
                                    Master Grid Institucional
                                    {isLocked && <span className="badge badge-red" style={{ marginLeft: '0.5rem' }}><Lock size={11} /> Fechado</span>}
                                </div>
                                <div className="card-subtitle">
                                    Média mínima: <strong>{mediaMinima.toFixed(1)}</strong>
                                    {saved && <span style={{ marginLeft: '1rem', color: 'hsl(var(--accent))', fontWeight: 600 }}><CheckCircle size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Salvo</span>}
                                    {isDirty && <span style={{ marginLeft: '1rem', color: 'hsl(var(--warning))', fontWeight: 600 }}>⚠️ Alterações não salvas</span>}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button className="btn btn-ghost no-print" onClick={() => window.print()} disabled={!selTurma || !selDisciplina}>
                                    <ClipboardList size={16} /> Imprimir Relatório
                                </button>
                                <button className="btn btn-ghost no-print" onClick={() => setImportModal(true)} disabled={isLocked || !canEdit}>
                                    <ClipboardList size={16} /> Importar Lote
                                </button>
                                <button className="btn btn-primary no-print" onClick={handleSave} disabled={saving || !canEdit}>
                                    {saving ? 'Salvando...' : <><Save size={16} /> Salvar Médias</>}
                                </button>
                            </div>
                        </div>

                        {turmaProts.length === 0 ? (
                            <div className="empty-state">
                                <ClipboardList size={48} className="empty-state-icon" />
                                <h3>Nenhum protagonista na turma</h3>
                                <p>Adicione protagonistas à turma no módulo Protagonistas.</p>
                            </div>
                        ) : (
                            <div className="table-container master-grid-scroll">
                                <table className="table master-table">
                                    <thead>
                                        <tr>
                                            <th className="sticky-col">PROTAGONISTA</th>
                                            <th className="text-center">1º BIM</th>
                                            <th className="text-center">2º BIM</th>
                                            <th className="text-center">3º BIM</th>
                                            <th className="text-center">4º BIM</th>
                                            <th className="text-center highlight-col">PTS</th>
                                            <th className="text-center highlight-col">MG</th>
                                            <th className="text-center warning-col">PRECISA</th>
                                            <th className="text-center rf-col">RF</th>
                                            <th className="text-center mf-col">MF</th>
                                            <th className="text-center">SITUAÇÃO</th>
                                            <th className="text-center">DESEMPENHO</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {turmaProts.map((p) => {
                                            const stats = getLocalRowStats(p.id);
                                            const { pts, mg, precisa, mf, sit } = stats;

                                            return (
                                                <tr key={p.id}>
                                                    <td className="sticky-col student-info">
                                                        <div className="student-name">{p.nome}</div>
                                                        <div className="student-ra">RA: {p.matricula}</div>
                                                    </td>
                                                    {[1, 2, 3, 4].map(b => (
                                                        <td key={b} className="text-center">
                                                            <input
                                                                type="text"
                                                                inputMode="decimal"
                                                                className={`master-input ${getGradeClass(grades[`${p.id}-${b}`] || '')}`}
                                                                value={grades[`${p.id}-${b}`] || ''}
                                                                onChange={e => handleGradeChange(p.id, b as any, e.target.value)}
                                                                onFocus={e => e.target.select()}
                                                                placeholder="-"
                                                                disabled={!canEdit}
                                                            />
                                                        </td>
                                                    ))}
                                                    <td className="text-center bold-text">{pts.toFixed(1)}</td>
                                                    <td className="text-center bold-text">{mg !== null ? mg.toFixed(1) : '0.0'}</td>
                                                    <td className="text-center warning-text">{precisa}</td>
                                                    <td className="text-center rf-cell">
                                                        <input
                                                            type="text"
                                                            inputMode="decimal"
                                                            className={`master-input rf ${getGradeClass(grades[`${p.id}-5`] || '')}`}
                                                            value={grades[`${p.id}-5`] || ''}
                                                            onChange={e => handleGradeChange(p.id, 5, e.target.value)}
                                                            onFocus={e => e.target.select()}
                                                            placeholder="-"
                                                            disabled={sit === 'INAPTO' || !canEdit}
                                                        />
                                                    </td>
                                                    <td className="text-center mf-cell bold-text">{mf !== null ? mf.toFixed(1) : '–'}</td>
                                                    <td className="text-center">
                                                        <span className={`badge-master badge-${String(sit || '').toLowerCase().replace(' ', '-')}`}>
                                                            {sit}
                                                        </span>
                                                    </td>
                                                    <td className="text-center">
                                                        <span className={`desempenho-text color-${getGradeClass(String(mf || pts / 4 || ''))}`}>
                                                            {(mf || pts / 4 || 0) >= 8 ? 'ÓTIMO' : (mf || pts / 4 || 0) >= 6 ? 'BOM' : (mf || pts / 4 || 0) >= 5 ? 'REGULAR' : 'INSUFICIENTE'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="empty-state card" style={{ padding: '4rem' }}>
                    <ClipboardList size={56} className="empty-state-icon" />
                    <h3>Selecione turma e disciplina</h3>
                    <p>Escolha uma turma e disciplina acima para lançar as médias do bimestre.</p>
                </div>
            )}
            {/* Import Modal */}
            {importModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <div className="modal-title">Importar Notas em Lote</div>
                            <button className="btn-close" onClick={() => setImportModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p className="help-text" style={{ marginBottom: '1rem' }}>
                                Cole os dados da sua planilha no formato: <strong>Nome [TAB] Nota</strong>.
                                O sistema buscará o aluno pelo nome exato.
                            </p>
                            <textarea
                                className="input"
                                style={{ minHeight: '300px', fontFamily: 'monospace', fontSize: '13px' }}
                                placeholder="João das Neves	7,5&#10;Maria Silva	9,0"
                                value={importText}
                                onChange={e => setImportText(e.target.value)}
                            />
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setImportModal(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleBatchImport}>Confirmar Importação</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
