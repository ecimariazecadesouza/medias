import React, { useState, useMemo } from 'react';
import { useGrades } from '@/context/GradesContext';
import { api, newId } from '@/lib/api';
import type { Turma, Turno, Protagonist } from '@/lib/types';
import { Building2, Plus, Pencil, Trash2, X, Users, CheckCircle, ChevronDown, ChevronRight, Copy, AlertCircle, TrendingUp, TrendingDown, Clock } from 'lucide-react';

const TURNOS: Turno[] = ['Manhã', 'Tarde', 'Noite', 'Integral'];
const empty = (): Omit<Turma, 'id'> => ({
    nome: '',
    anoLetivo: new Date().getFullYear().toString(),
    turno: 'Manhã',
    disciplinaIds: []
});

export default function TurmasModule({ readOnly = false }: { readOnly?: boolean }) {
    const { turmas, setTurmas, protagonistas, disciplinas, configuracao, getSituacao } = useGrades();
    const safeTurmas = (Array.isArray(turmas) ? turmas : []).filter(Boolean);
    const safeProtagonistas = (Array.isArray(protagonistas) ? protagonistas : []).filter(Boolean);
    const safeDisciplinas = (Array.isArray(disciplinas) ? disciplinas : []).filter(Boolean);

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Turma | null>(null);
    const [form, setForm] = useState(empty());
    const [saving, setSaving] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [toast, setToast] = useState('');

    const anoLetivo = (configuracao?.anoLetivo) || new Date().getFullYear().toString();

    const showMsg = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const openNew = () => { setEditing(null); setForm({ ...empty(), anoLetivo }); setShowModal(true); };
    const openEdit = (t: Turma) => { setEditing(t); setForm({ nome: t.nome, anoLetivo: t.anoLetivo, turno: t.turno, disciplinaIds: t.disciplinaIds || [] }); setShowModal(true); };
    const handleCopy = (t: Turma) => {
        setEditing(null);
        setForm({
            nome: `${t.nome} (Cópia)`,
            anoLetivo: t.anoLetivo,
            turno: t.turno,
            disciplinaIds: [...(t.disciplinaIds || [])]
        });
        setShowModal(true);
    };

    const closeModal = () => { setShowModal(false); setEditing(null); };

    const handleSave = async () => {
        if (!form.nome.trim()) { showMsg('Nome da turma é obrigatório'); return; }
        setSaving(true);
        try {
            const t: Turma = { id: editing?.id ?? newId(), ...form };
            await api.turmas.save(t);
            setTurmas(prev => editing ? prev.map(x => x.id === t.id ? t : x) : [t, ...prev]);
            showMsg(editing ? 'Turma atualizada!' : 'Turma criada!');
            closeModal();
        } catch { showMsg('Erro ao salvar.'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (t: Turma) => {
        const count = safeProtagonistas.filter(p => p?.turmaId === t.id).length;
        if (!confirm(`Excluir turma "${t.nome}"?${count > 0 ? `\n${count} protagonista(s) ficarão sem turma.` : ''}`)) return;
        try {
            await api.turmas.delete(t.id);
            setTurmas(prev => prev.filter(x => x.id !== t.id));
            showMsg('Turma removida.');
        } catch { showMsg('Erro ao excluir.'); }
    };

    const turnoColor: Record<Turno, string> = {
        'Manhã': 'badge-blue', 'Tarde': 'badge-amber', 'Noite': 'badge-gray', 'Integral': 'badge-green'
    };

    const years = [...new Set(safeTurmas.map(t => t?.anoLetivo))].filter(Boolean).sort((a, b) => (b || '').localeCompare(a || ''));

    // Stats calculations
    const stats = useMemo(() => ({
        totalTurmas: safeTurmas.length,
        totalProtagonistas: safeProtagonistas.length,
        cursando: safeProtagonistas.filter(p => p?.status === 'Cursando').length,
        evasao: safeProtagonistas.filter(p => p?.status === 'Evasão').length,
        transferencia: safeProtagonistas.filter(p => p?.status === 'Transferência').length,
        outro: safeProtagonistas.filter(p => p?.status === 'Outro').length,
    }), [safeTurmas, safeProtagonistas]);

    const getTurmaQuantitativos = (tId: string, discIds: string[]) => {
        const turmaProts = safeProtagonistas.filter(p => p?.turmaId === tId);

        const counts = {
            Cursando: turmaProts.filter(p => p.status === 'Cursando').length,
            Evasão: turmaProts.filter(p => p.status === 'Evasão').length,
            Transferência: turmaProts.filter(p => p.status === 'Transferência').length,
            Outro: turmaProts.filter(p => p.status === 'Outro').length,

            Aprovados: 0,
            Reprovados: 0,
            Pendentes: 0
        };

        turmaProts.forEach(p => {
            if (p.status !== 'Cursando') return;

            let sits = discIds.map(dId => getSituacao(p.id, dId));

            // Se não houver disciplinas, não podemos calcular a situação acadêmica de forma justa
            if (sits.length === 0) {
                counts.Pendentes++;
                return;
            }

            const reprovado = sits.some(s => ['Reprovado', 'Retido', 'Inapto'].includes(s));
            const pendente = sits.some(s => ['Pendente', 'Recuperação', 'Em curso', 'Cursando'].includes(s));

            if (reprovado) {
                counts.Reprovados++;
            } else if (pendente) {
                counts.Pendentes++;
            } else {
                counts.Aprovados++;
            }
        });

        return counts;
    };

    return (
        <>
            {toast && (
                <div className="toast-container">
                    <div className="toast success">{toast}</div>
                </div>
            )}

            <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div className="stat-card blue">
                    <span className="stat-card-label">TOTAL DE TURMAS</span>
                    <span className="stat-card-value">{stats.totalTurmas}</span>
                    <Building2 size={32} className="stat-card-icon" />
                </div>
                <div className="stat-card green">
                    <span className="stat-card-label">PROTAGONISTAS</span>
                    <span className="stat-card-value">{stats.totalProtagonistas}</span>
                    <Users size={32} className="stat-card-icon" />
                </div>
                <div className="stat-card" style={{ background: 'hsl(var(--success)/0.05)', borderColor: 'hsl(var(--success)/0.2)' }}>
                    <span className="stat-card-label" style={{ color: 'hsl(var(--success))' }}>CURSANDO</span>
                    <span className="stat-card-value" style={{ color: 'hsl(var(--success))' }}>{stats.cursando}</span>
                    <TrendingUp size={32} className="stat-card-icon" style={{ color: 'hsl(var(--success))' }} />
                </div>
                <div className="stat-card" style={{ background: 'hsl(var(--danger)/0.05)', borderColor: 'hsl(var(--danger)/0.2)' }}>
                    <span className="stat-card-label" style={{ color: 'hsl(var(--danger))' }}>EVASÃO</span>
                    <span className="stat-card-value" style={{ color: 'hsl(var(--danger))' }}>{stats.evasao}</span>
                    <TrendingDown size={32} className="stat-card-icon" style={{ color: 'hsl(var(--danger))' }} />
                </div>
                <div className="stat-card" style={{ background: 'hsl(var(--warning)/0.05)', borderColor: 'hsl(var(--warning)/0.2)' }}>
                    <span className="stat-card-label" style={{ color: 'hsl(var(--warning))' }}>TRANSFERÊNCIA</span>
                    <span className="stat-card-value" style={{ color: 'hsl(var(--warning))' }}>{stats.transferencia}</span>
                    <AlertCircle size={32} className="stat-card-icon" style={{ color: 'hsl(var(--warning))' }} />
                </div>
                <div className="stat-card gray">
                    <span className="stat-card-label">OUTRO</span>
                    <span className="stat-card-value">{stats.outro}</span>
                    <Clock size={32} className="stat-card-icon" />
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <div>
                        <div className="card-title">Turmas Cadastradas</div>
                        <div className="card-subtitle">{turmas.length} turmas</div>
                    </div>
                    {!readOnly && (
                        <button className="btn btn-primary btn-sm" onClick={openNew}>
                            <Plus size={16} /> Nova Turma
                        </button>
                    )}
                </div>

                {turmas.length === 0 ? (
                    <div className="empty-state">
                        <Building2 size={48} className="empty-state-icon" />
                        <h3>Nenhuma turma cadastrada</h3>
                        <p>Crie as turmas para começar a vincular protagonistas.</p>
                        {!readOnly && <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Nova Turma</button>}
                    </div>
                ) : (
                    <div className="table-container">
                        {years.map(year => {
                            const yearTurmas = turmas
                                .filter(t => t.anoLetivo === year)
                                .sort((a, b) => a.nome.localeCompare(b.nome));
                            return (
                                <div key={year}>
                                    <div style={{
                                        padding: '0.75rem 1.5rem', background: 'hsl(var(--surface-raised))',
                                        borderBottom: '1px solid hsl(var(--border-light))',
                                        fontSize: '0.8rem', fontWeight: 700, color: 'hsl(var(--muted-foreground))',
                                        textTransform: 'uppercase', letterSpacing: '0.05em'
                                    }}>
                                        Ano Letivo {year} · {yearTurmas.length} turma{yearTurmas.length !== 1 ? 's' : ''}
                                    </div>
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Turma</th>
                                                <th>Turno</th>
                                                <th>Atendimento</th>
                                                <th style={{ textAlign: 'right' }}>{readOnly ? '' : 'Ações'}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {yearTurmas.map(t => {
                                                const turmaProts = safeProtagonistas.filter(p => p?.turmaId === t?.id);
                                                const isExpanded = expandedId === t?.id;
                                                const q = getTurmaQuantitativos(t?.id, t?.disciplinaIds || []);

                                                return (
                                                    <React.Fragment key={t.id}>
                                                        <tr className={isExpanded ? 'active' : ''}>
                                                            <td>
                                                                <button
                                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', color: 'hsl(var(--foreground))' }}
                                                                    onClick={() => setExpandedId(isExpanded ? null : t.id)}
                                                                >
                                                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                                    {t.nome}
                                                                </button>
                                                            </td>
                                                            <td><span className={`badge ${turnoColor[t.turno]}`}>{t.turno}</span></td>
                                                            <td>
                                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                                    <span className="badge badge-blue">
                                                                        <Users size={12} /> {turmaProts.length}
                                                                    </span>
                                                                    <span className="badge badge-green" title="Cursando">
                                                                        {q.Cursando}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td style={{ textAlign: 'right' }}>
                                                                {!readOnly && (
                                                                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                                                                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleCopy(t)} title="Copiar Turma (sem alunos)"><Copy size={15} /></button>
                                                                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(t)} title="Editar"><Pencil size={15} /></button>
                                                                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(t)} title="Excluir" style={{ color: 'hsl(var(--danger))' }}><Trash2 size={15} /></button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                        {isExpanded && (
                                                            <tr key={`${t.id}-details`}>
                                                                <td colSpan={4} style={{ padding: '0', background: 'hsl(var(--surface-raised)/0.5)' }}>
                                                                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                                                        {/* Quantitative Grids */}
                                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                                                            {/* Status Section */}
                                                                            <div style={{ background: 'white', borderRadius: '12px', padding: '1.25rem', border: '1px solid hsl(var(--border))', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                                                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
                                                                                    STATUS DOS PROTAGONISTAS
                                                                                </div>
                                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'hsl(var(--surface-raised))', borderRadius: '8px' }}>
                                                                                        <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>CURSANDO</span>
                                                                                        <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{q['Cursando']}</span>
                                                                                    </div>
                                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'hsl(var(--surface-raised))', borderRadius: '8px' }}>
                                                                                        <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>TRANSFERÊNCIA</span>
                                                                                        <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{q['Transferência']}</span>
                                                                                    </div>
                                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'hsl(var(--surface-raised))', borderRadius: '8px' }}>
                                                                                        <span className="badge badge-red" style={{ fontSize: '0.65rem' }}>EVASÃO</span>
                                                                                        <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{q['Evasão']}</span>
                                                                                    </div>
                                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'hsl(var(--surface-raised))', borderRadius: '8px' }}>
                                                                                        <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>OUTRO</span>
                                                                                        <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{q['Outro']}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {/* Academic Section */}
                                                                            <div style={{ background: 'white', borderRadius: '12px', padding: '1.25rem', border: '1px solid hsl(var(--border))', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                                                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'hsl(var(--primary))', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
                                                                                    SITUAÇÃO ACADÊMICA
                                                                                </div>
                                                                                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '60px' }}>
                                                                                    <div style={{ textAlign: 'center' }}>
                                                                                        <div style={{ color: 'hsl(var(--success))', fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>{q.Aprovados}</div>
                                                                                        <div style={{ fontSize: '0.65rem', color: 'hsl(var(--muted-foreground))', marginTop: '4px' }}>Aprovados</div>
                                                                                    </div>
                                                                                    <div style={{ width: '1px', height: '30px', background: 'hsl(var(--border))' }} />
                                                                                    <div style={{ textAlign: 'center' }}>
                                                                                        <div style={{ color: 'hsl(var(--danger))', fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>{q.Reprovados}</div>
                                                                                        <div style={{ fontSize: '0.65rem', color: 'hsl(var(--muted-foreground))', marginTop: '4px' }}>Reprovados</div>
                                                                                    </div>
                                                                                    <div style={{ width: '1px', height: '30px', background: 'hsl(var(--border))' }} />
                                                                                    <div style={{ textAlign: 'center' }}>
                                                                                        <div style={{ color: 'hsl(var(--warning))', fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>{q.Pendentes}</div>
                                                                                        <div style={{ fontSize: '0.65rem', color: 'hsl(var(--muted-foreground))', marginTop: '4px' }}>Pendentes</div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Students List */}
                                                                        {turmaProts.length > 0 && (
                                                                            <div>
                                                                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }}>LISTAGEM DE ALUNOS ({turmaProts.length})</div>
                                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                                                    {turmaProts.map(p => (
                                                                                        <span key={p.id} className="badge badge-gray" style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem' }}>
                                                                                            <CheckCircle size={10} /> {p.nome}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">{editing ? 'Editar Turma' : 'Nova Turma'}</span>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={closeModal}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid" style={{ gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="label">Nome da Turma *</label>
                                    <input className="input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: 1º Ano A" />
                                </div>
                                <div className="form-group">
                                    <label className="label">Ano Letivo</label>
                                    <input className="input" type="number" value={form.anoLetivo} onChange={e => setForm(f => ({ ...f, anoLetivo: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="label">Turno</label>
                                    <select className="select" value={form.turno} onChange={e => setForm(f => ({ ...f, turno: e.target.value as Turno }))}>
                                        {TURNOS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="label">Disciplinas da Turma</label>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                                        gap: '0.5rem',
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        padding: '0.75rem',
                                        background: 'hsl(var(--surface-raised))',
                                        borderRadius: 'var(--radius)',
                                        border: '1px solid hsl(var(--border))'
                                    }}>
                                        {[...safeDisciplinas].sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '')).map(d => (
                                            <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={form.disciplinaIds?.includes(d.id)}
                                                    onChange={e => {
                                                        const ids = form.disciplinaIds || [];
                                                        setForm(f => ({
                                                            ...f,
                                                            disciplinaIds: e.target.checked
                                                                ? [...ids, d.id]
                                                                : ids.filter(id => id !== d.id)
                                                        }));
                                                    }}
                                                />
                                                {d.nome}
                                            </label>
                                        ))}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.4rem' }}>
                                        {form.disciplinaIds?.length || 0} disciplinas selecionadas
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar Turma'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
