'use client';

import { useState } from 'react';
import { useGrades } from '@/context/GradesContext';
import { api, newId } from '@/lib/api';
import type { Docente } from '@/lib/types';
import { GraduationCap, Plus, Pencil, Trash2, X, BookOpen, Building2 } from 'lucide-react';

const empty = () => ({ nome: '', email: '', vinculos: [] as { disciplinaId: string; turmaIds: string[] }[] });

export default function DocentesModule({ readOnly = false }: { readOnly?: boolean }) {
    const { docentes, setDocentes, disciplinas, turmas } = useGrades();
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Docente | null>(null);
    const [form, setForm] = useState(empty());
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [toast, setToast] = useState('');

    const showMsg = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const openNew = () => { setEditing(null); setForm(empty()); setShowModal(true); };
    const openEdit = (d: Docente) => {
        setEditing(d);
        setForm({
            nome: d.nome,
            email: d.email,
            vinculos: d.vinculos && d.vinculos.length > 0
                ? d.vinculos.map(v => ({ ...v, turmaIds: [...v.turmaIds] }))
                : [] // Se for um docente antigo sem vinculos estruturados
        });
        setShowModal(true);
    };

    const closeModal = () => { setShowModal(false); setEditing(null); };

    const handleSave = async () => {
        if (!form.nome.trim()) { showMsg('Nome é obrigatório'); return; }
        if (!form.email.trim()) { showMsg('E-mail é obrigatório'); return; }

        // Verifica se já existe outro docente com este e-mail (excetuando o que está sendo editado)
        const duplicate = docentes.find(d => String(d?.email || '').toLowerCase() === String(form.email || '').toLowerCase() && d.id !== editing?.id);
        if (duplicate) {
            showMsg('Este e-mail já está cadastrado para outro docente.');
            return;
        }

        setSaving(true);
        try {
            // Unifica os IDs para manter compatibilidade com o sistema que usa arrays simples
            const allDiscIds = [...new Set(form.vinculos.map(v => v.disciplinaId))];
            const allTurmaIds = [...new Set(form.vinculos.flatMap(v => v.turmaIds))];

            const d: Docente = {
                id: editing?.id ?? newId(),
                nome: form.nome,
                email: form.email,
                disciplinaIds: allDiscIds,
                turmaIds: allTurmaIds,
                vinculos: form.vinculos
            };

            await api.docentes.save(d);
            setDocentes(prev => editing ? prev.map(x => x.id === d.id ? d : x) : [d, ...prev]);
            showMsg(editing ? 'Docente atualizado!' : 'Docente cadastrado!');
            closeModal();
        } catch { showMsg('Erro ao salvar.'); }
        finally { setSaving(false); }
    };

    const addVinculo = () => {
        setForm(f => ({
            ...f,
            vinculos: [...f.vinculos, { disciplinaId: '', turmaIds: [] }]
        }));
    };

    const removeVinculo = (idx: number) => {
        setForm(f => ({
            ...f,
            vinculos: f.vinculos.filter((_, i) => i !== idx)
        }));
    };

    const updateVinculo = (idx: number, field: string, value: any) => {
        setForm(f => ({
            ...f,
            vinculos: f.vinculos.map((v, i) => i === idx ? { ...v, [field]: value } : v)
        }));
    };

    const toggleTurma = (vIdx: number, tId: string) => {
        const v = form.vinculos[vIdx];
        const newTurmas = v.turmaIds.includes(tId)
            ? v.turmaIds.filter(id => id !== tId)
            : [...v.turmaIds, tId];
        updateVinculo(vIdx, 'turmaIds', newTurmas);
    };

    const handleDelete = async (d: Docente) => {
        if (!confirm(`Excluir docente "${d.nome}"?`)) return;
        try {
            await api.docentes.delete(d.id);
            setDocentes(prev => prev.filter(x => x.id !== d.id));
            showMsg('Docente removido.');
        } catch { showMsg('Erro ao excluir.'); }
    };

    const safeDocentes = (Array.isArray(docentes) ? docentes : []).filter(Boolean);
    const filtered = safeDocentes.filter(d => {
        const q = String(search || '').toLowerCase();
        return !q || String(d?.nome || '').toLowerCase().includes(q) || String(d?.email || '').toLowerCase().includes(q);
    });

    const getDisciplinaName = (id: string) => disciplinas.find(d => d.id === id)?.nome || id;
    const getTurmaName = (id: string) => turmas.find(t => t.id === id)?.nome || id;

    return (
        <>
            {toast && (
                <div className="toast-container">
                    <div className={`toast ${toast.includes('Erro') ? 'error' : 'success'}`}>{toast}</div>
                </div>
            )}

            <div className="stat-grid">
                <div className="stat-card blue">
                    <span className="stat-card-label">Total de Docentes</span>
                    <span className="stat-card-value">{(Array.isArray(docentes) ? docentes : []).length}</span>
                    <GraduationCap size={48} className="stat-card-icon" />
                </div>
                <div className="stat-card green">
                    <span className="stat-card-label">Vínculos Ativos</span>
                    <span className="stat-card-value">{(Array.isArray(docentes) ? docentes : []).reduce((acc, d) => acc + (d.vinculos?.length || 0), 0)}</span>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <div>
                        <div className="card-title">Docentes Cadastrados</div>
                        <div className="card-subtitle">{filtered.length} docentes exclusivos</div>
                    </div>
                    {!readOnly && <button className="btn btn-primary btn-sm" onClick={openNew}><Plus size={16} /> Novo Docente</button>}
                </div>

                <div className="filters-bar">
                    <div className="search-bar" style={{ flex: 1 }}>
                        <input className="input" placeholder="Buscar por nome ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="empty-state">
                        <GraduationCap size={48} className="empty-state-icon" />
                        <h3>Nenhum docente cadastrado</h3>
                        <p>Gerencie seus professores e vincule-os às disciplinas e turmas de forma organizada.</p>
                        {!readOnly && <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Novo Docente</button>}
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>E-mail</th>
                                    <th>Atribuições (Disciplina & Turmas)</th>
                                    <th style={{ textAlign: 'right' }}>{readOnly ? '' : 'Ações'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(d => (
                                    <tr key={d.id}>
                                        <td style={{ fontWeight: 600 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'hsl(var(--primary)/0.1)', color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                                                    {d.nome.charAt(0).toUpperCase()}
                                                </div>
                                                {d.nome}
                                            </div>
                                        </td>
                                        <td style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem' }}>{d.email}</td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {(!d.vinculos || d.vinculos.length === 0) ? (
                                                    <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem italic' }}>Sem vínculos estruturados</span>
                                                ) : d.vinculos.map((v, i) => (
                                                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                                        <span className="badge badge-blue" style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', height: 'fit-content' }}>
                                                            <BookOpen size={10} /> {getDisciplinaName(v.disciplinaId)}
                                                        </span>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                            {v.turmaIds.map(tId => (
                                                                <span key={tId} className="badge badge-green" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                                                    <Building2 size={8} /> {getTurmaName(tId)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            {!readOnly && (
                                                <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                                                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(d)} title="Editar"><Pencil size={15} /></button>
                                                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(d)} style={{ color: 'hsl(var(--danger))' }} title="Excluir"><Trash2 size={15} /></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', width: '90%', maxWidth: '900px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-header">
                            <span className="modal-title">{editing ? 'Ficha do Docente' : 'Cadastrar Novo Docente'}</span>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={closeModal}><X size={18} /></button>
                        </div>
                        <div className="modal-body" style={{ overflow: 'auto', padding: '2rem' }}>
                            <div className="form-grid" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
                                <div className="form-group">
                                    <label className="label">Nome Completo</label>
                                    <input className="input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Maria Oliveira" />
                                </div>
                                <div className="form-group">
                                    <label className="label">E-mail Institucional (Chave de Acesso)</label>
                                    <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="maria@professor.pb.gov.br" />
                                </div>
                            </div>

                            <div style={{ background: 'hsl(var(--surface-raised)/0.5)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'hsl(var(--primary))', fontWeight: 800 }}>VÍNCULOS DE DISCIPLINAS E TURMAS</h4>
                                    <button className="btn btn-secondary btn-sm" onClick={addVinculo}>
                                        <Plus size={14} /> Adicionar Disciplina
                                    </button>
                                </div>

                                {form.vinculos.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', border: '1px dashed hsl(var(--border))', borderRadius: 'var(--radius-sm)', color: 'hsl(var(--muted-foreground))' }}>
                                        <p style={{ fontSize: '0.85rem' }}>Nenhuma atribuição definida. Clique no botão acima para vincular uma disciplina.</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {form.vinculos.map((v, idx) => (
                                            <div key={idx} style={{ background: 'white', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid hsl(var(--border))', position: 'relative' }}>
                                                <button
                                                    onClick={() => removeVinculo(idx)}
                                                    style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', color: 'hsl(var(--danger))', padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer' }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>

                                                <div className="form-group" style={{ marginBottom: '1rem' }}>
                                                    <label className="label" style={{ fontSize: '0.7rem' }}>Disciplina</label>
                                                    <select
                                                        className="select"
                                                        value={v.disciplinaId}
                                                        onChange={e => updateVinculo(idx, 'disciplinaId', e.target.value)}
                                                        style={{ height: '2.5rem' }}
                                                    >
                                                        <option value="">Selecione a disciplina...</option>
                                                        {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="label" style={{ fontSize: '0.7rem' }}>Turmas vinculadas a esta disciplina</label>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                        {turmas.map(t => {
                                                            const active = v.turmaIds.includes(t.id);
                                                            return (
                                                                <label
                                                                    key={t.id}
                                                                    style={{
                                                                        display: 'flex', alignItems: 'center', gap: '6px', padding: '0.4rem 0.75rem',
                                                                        borderRadius: '6px', border: `1px solid ${active ? 'hsl(var(--accent))' : 'hsl(var(--border))'}`,
                                                                        background: active ? 'hsl(var(--accent)/0.05)' : 'white', cursor: 'pointer', fontSize: '0.8rem'
                                                                    }}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={active}
                                                                        onChange={() => toggleTurma(idx, t.id)}
                                                                        style={{ width: '14px', height: '14px', accentColor: 'hsl(var(--accent))' }}
                                                                    />
                                                                    <span style={{ fontWeight: active ? 700 : 500, color: active ? 'hsl(var(--accent-foreground))' : 'inherit' }}>{t.nome}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer" style={{ padding: '1.5rem 2rem' }}>
                            <button className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
                            {!readOnly && (
                                <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '0 2rem' }}>
                                    {saving ? 'Ocupado...' : editing ? 'Atualizar Ficha' : 'Concluir Cadastro'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
