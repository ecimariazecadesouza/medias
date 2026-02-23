'use client';

import { useState } from 'react';
import { useGrades } from '@/context/GradesContext';
import { api, newId } from '@/lib/api';
import type { Formacao, Subformacao, Area, Disciplina, Periodicidade } from '@/lib/types';
import { BookOpen, Plus, Pencil, Trash2, X, ChevronDown, ChevronRight, Layers } from 'lucide-react';

export default function GradeCurricularModule({ readOnly = false }: { readOnly?: boolean }) {
    const {
        formacoes, setFormacoes,
        subformacoes, setSubformacoes,
        areas, setAreas,
        disciplinas, setDisciplinas
    } = useGrades();
    // ... rest of logic
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    type ModalState = { type: 'formacao' | 'subformacao' | 'area' | 'disciplina'; parentId?: string; editing?: any };
    const [modal, setModal] = useState<ModalState | null>(null);
    const [formName, setFormName] = useState('');
    const [periodicity, setPeriodicity] = useState<Periodicidade>('Anual');
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');

    const showMsg = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
    const toggle = (id: string) => setExpanded(e => ({ ...e, [id]: !e[id] }));

    const openModal = (type: ModalState['type'], parentId?: string, editing?: any) => {
        setFormName(editing?.nome ?? '');
        setPeriodicity(editing?.periodicidade ?? 'Anual');
        setModal({ type, parentId, editing });
    };
    const closeModal = () => { setModal(null); setFormName(''); setPeriodicity('Anual'); };

    const handleSave = async () => {
        if (!formName.trim()) { showMsg('Nome é obrigatório'); return; }
        if (!modal) return;
        setSaving(true);
        try {
            if (modal.type === 'formacao') {
                const f: Formacao = { id: modal.editing?.id ?? newId(), nome: formName, subformacoes: modal.editing?.subformacoes ?? [] };
                await api.formacoes.save(f);
                setFormacoes(prev => modal.editing ? prev.map(x => x.id === f.id ? f : x) : [f, ...prev]);
            } else if (modal.type === 'subformacao') {
                const sub: Subformacao = { id: modal.editing?.id ?? newId(), nome: formName, formacaoId: modal.parentId!, areas: modal.editing?.areas ?? [] };
                await api.subformacoes.save(sub);
                setSubformacoes(prev => modal.editing ? prev.map(x => x.id === sub.id ? sub : x) : [sub, ...prev]);
            } else if (modal.type === 'area') {
                const a: Area = { id: modal.editing?.id ?? newId(), nome: formName, subformacaoId: modal.parentId! };
                await api.areas.save(a);
                setAreas(prev => modal.editing ? prev.map(x => x.id === a.id ? a : x) : [a, ...prev]);
            } else if (modal.type === 'disciplina') {
                const d: Disciplina = {
                    id: modal.editing?.id ?? newId(),
                    nome: formName,
                    areaId: modal.parentId!,
                    areaNome: areas.find(a => a.id === modal.parentId)?.nome,
                    periodicidade: periodicity
                };
                await api.disciplinas.save(d);
                setDisciplinas(prev => modal.editing ? prev.map(x => x.id === d.id ? d : x) : [d, ...prev]);
            }
            showMsg('Salvo com sucesso!');
            closeModal();
        } catch { showMsg('Erro ao salvar.'); }
        finally { setSaving(false); }
    };

    const handleDeleteDisciplina = async (id: string, nome: string) => {
        if (!confirm(`Excluir disciplina "${nome}"?`)) return;
        try {
            await api.disciplinas.delete(id);
            setDisciplinas(prev => prev.filter(d => d.id !== id));
            showMsg('Disciplina removida.');
        } catch { showMsg('Erro ao excluir.'); }
    };

    const handleDeleteArea = async (id: string, nome: string) => {
        if (!confirm(`Excluir área "${nome}"?`)) return;
        try {
            await api.areas.delete(id);
            setAreas(prev => prev.filter(a => a.id !== id));
            showMsg('Área removida.');
        } catch { showMsg('Erro ao excluir.'); }
    };

    const handleDeleteSubformacao = async (id: string, nome: string) => {
        if (!confirm(`Excluir subformação "${nome}"?`)) return;
        try {
            await api.subformacoes.delete(id);
            setSubformacoes(prev => prev.filter(s => s.id !== id));
            showMsg('Subformação removida.');
        } catch { showMsg('Erro ao excluir.'); }
    };

    const totalDisciplinas = disciplinas.length;
    const totalAreas = areas.length;

    const modalLabels: Record<string, string> = {
        formacao: 'Formação', subformacao: 'Subformação', area: 'Área', disciplina: 'Disciplina'
    };

    return (
        <>
            {toast && <div className="toast-container"><div className="toast success">{toast}</div></div>}

            <div className="stat-grid">
                <div className="stat-card blue">
                    <span className="stat-card-label">Formações</span>
                    <span className="stat-card-value">{formacoes.length}</span>
                    <Layers size={48} className="stat-card-icon" />
                </div>
                <div className="stat-card green">
                    <span className="stat-card-label">Áreas</span>
                    <span className="stat-card-value">{totalAreas}</span>
                </div>
                <div className="stat-card amber">
                    <span className="stat-card-label">Disciplinas</span>
                    <span className="stat-card-value">{totalDisciplinas}</span>
                    <BookOpen size={48} className="stat-card-icon" />
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <div>
                        <div className="card-title">Grade Curricular</div>
                        <div className="card-subtitle">Hierarquia: Formação → Subformação → Área → Disciplina</div>
                    </div>
                    {!readOnly && (
                        <button className="btn btn-primary btn-sm" onClick={() => openModal('formacao')}>
                            <Plus size={16} /> Nova Formação
                        </button>
                    )}
                </div>

                <div style={{ padding: '1.5rem' }}>
                    {formacoes.length === 0 ? (
                        <div className="empty-state">
                            <BookOpen size={48} className="empty-state-icon" />
                            <h3>Grade curricular vazia</h3>
                            <p>Comece criando uma Formação (ex: Ensino Médio, EJA, Técnico).</p>
                            {!readOnly && (
                                <button className="btn btn-primary" onClick={() => openModal('formacao')}>
                                    <Plus size={16} /> Nova Formação
                                </button>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {formacoes.map(f => (
                                <div key={f.id} style={{ border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                                    {/* Formação */}
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        padding: '0.875rem 1.25rem',
                                        background: 'hsl(var(--primary)/0.06)',
                                        cursor: 'pointer',
                                        userSelect: 'none'
                                    }} onClick={() => toggle(f.id)}>
                                        {expanded[f.id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                        <span style={{ fontWeight: 700, flex: 1 }}>🏫 {f.nome}</span>
                                        {!readOnly && (
                                            <div style={{ display: 'flex', gap: '0.25rem' }} onClick={e => e.stopPropagation()}>
                                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openModal('subformacao', f.id)}>
                                                    <Plus size={14} />
                                                </button>
                                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openModal('formacao', undefined, f)}>
                                                    <Pencil size={14} />
                                                </button>
                                                <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'hsl(var(--danger))' }}
                                                    onClick={async () => {
                                                        if (!confirm(`Excluir formação "${f.nome}"?`)) return;
                                                        try { await api.formacoes.delete(f.id); setFormacoes(prev => prev.filter(x => x.id !== f.id)); showMsg('Removido.'); }
                                                        catch { showMsg('Erro ao excluir.'); }
                                                    }}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {expanded[f.id] && (
                                        <div style={{ padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {subformacoes.filter(s => s.formacaoId === f.id).length === 0 && (
                                                <p style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', paddingLeft: '1rem' }}>
                                                    Nenhuma subformação. {!readOnly && <button className="btn btn-ghost btn-sm" onClick={() => openModal('subformacao', f.id)} style={{ padding: '0 0.25rem' }}>Adicionar</button>}
                                                </p>
                                            )}
                                            {subformacoes.filter(s => s.formacaoId === f.id).map(sub => {
                                                const subAreas = areas.filter(a => a.subformacaoId === sub.id);
                                                return (
                                                    <div key={sub.id} className="tree-node">
                                                        {/* Subformação */}
                                                        <div className="tree-node-header" onClick={() => toggle(sub.id)}>
                                                            {expanded[sub.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                            <span style={{ flex: 1 }}>📚 {sub.nome}</span>
                                                            {!readOnly && (
                                                                <div style={{ display: 'flex', gap: '0.25rem' }} onClick={e => e.stopPropagation()}>
                                                                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openModal('area', sub.id)}><Plus size={13} /></button>
                                                                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openModal('subformacao', f.id, sub)}><Pencil size={13} /></button>
                                                                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'hsl(var(--danger))' }} onClick={() => handleDeleteSubformacao(sub.id, sub.nome)}><Trash2 size={13} /></button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {expanded[sub.id] && (
                                                            <div style={{ paddingLeft: '1rem' }}>
                                                                {subAreas.length === 0 && (
                                                                    <p style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', padding: '0.25rem 0' }}>
                                                                        Nenhuma área. {!readOnly && <button className="btn btn-ghost btn-sm" onClick={() => openModal('area', sub.id)} style={{ padding: '0 0.25rem' }}>Adicionar</button>}
                                                                    </p>
                                                                )}
                                                                {subAreas.map(a => {
                                                                    const areaDisciplinas = disciplinas.filter(d => d.areaId === a.id);
                                                                    return (
                                                                        <div key={a.id} className="tree-node">
                                                                            {/* Área */}
                                                                            <div className="tree-node-header" onClick={() => toggle(a.id)}>
                                                                                {expanded[a.id] ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                                                                <span style={{ flex: 1 }}>📂 {a.nome}</span>
                                                                                <span className="badge badge-gray" style={{ fontSize: '0.68rem' }}>{areaDisciplinas.length} disc.</span>
                                                                                {!readOnly && (
                                                                                    <div style={{ display: 'flex', gap: '0.25rem' }} onClick={e => e.stopPropagation()}>
                                                                                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openModal('disciplina', a.id)}><Plus size={12} /></button>
                                                                                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openModal('area', sub.id, a)}><Pencil size={12} /></button>
                                                                                        <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'hsl(var(--danger))' }} onClick={() => handleDeleteArea(a.id, a.nome)}><Trash2 size={12} /></button>
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            {expanded[a.id] && (
                                                                                <div style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '0.5rem' }}>
                                                                                    {areaDisciplinas.length === 0 && (
                                                                                        <p style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
                                                                                            Nenhuma disciplina.
                                                                                        </p>
                                                                                    )}
                                                                                    {areaDisciplinas.map(d => (
                                                                                        <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.5rem', borderRadius: '0.375rem' }}>
                                                                                            <BookOpen size={13} style={{ color: 'hsl(var(--primary))' }} />
                                                                                            <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500 }}>{d.nome}</span>
                                                                                            {!readOnly && (
                                                                                                <>
                                                                                                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openModal('disciplina', a.id, d)}><Pencil size={12} /></button>
                                                                                                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'hsl(var(--danger))' }} onClick={() => handleDeleteDisciplina(d.id, d.nome)}><Trash2 size={12} /></button>
                                                                                                </>
                                                                                            )}
                                                                                        </div>
                                                                                    ))}
                                                                                    {!readOnly && (
                                                                                        <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', fontSize: '0.78rem' }} onClick={() => openModal('disciplina', a.id)}>
                                                                                            <Plus size={12} /> Adicionar disciplina
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {modal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">{modal.editing ? 'Editar' : 'Nova'} {modalLabels[modal.type]}</span>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={closeModal}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="label">Nome *</label>
                                <input
                                    className="input"
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                                    placeholder={`Nome da ${modalLabels[modal.type].toLowerCase()}`}
                                    autoFocus
                                />
                            </div>
                            {modal.type === 'disciplina' && (
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label className="label">Periodicidade</label>
                                    <select
                                        className="select"
                                        value={periodicity}
                                        onChange={e => setPeriodicity(e.target.value as Periodicidade)}
                                    >
                                        <option value="Anual">Anual (Bimestres 1 a 4)</option>
                                        <option value="1° Semestre">1° Semestre (Bimestres 1 e 2)</option>
                                        <option value="2° Semestre">2° Semestre (Bimestres 3 e 4)</option>
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
