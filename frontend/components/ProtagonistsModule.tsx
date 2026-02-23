'use client';

import { useState, useRef } from 'react';
import { useGrades } from '@/context/GradesContext';
import { api, newId } from '@/lib/api';
import type { Protagonist, Status } from '@/lib/types';
import {
    UserPlus, Search, Upload, Pencil, Trash2,
    CheckCircle, XCircle, AlertCircle, Users, X
} from 'lucide-react';

const STATUS_OPTIONS: Status[] = ['Cursando', 'Evasão', 'Transferência', 'Outro'];

const statusBadge = (s: Status) => {
    const map: Record<Status, string> = {
        'Cursando': 'badge-green',
        'Evasão': 'badge-red',
        'Transferência': 'badge-amber',
        'Outro': 'badge-gray',
    };
    return map[s] || 'badge-gray';
};

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
    return (
        <div className="toast-container" style={{ zIndex: 9999 }}>
            <div className={`toast ${type}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                <span>{msg}</span>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginLeft: 'auto' }}>
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}

const emptyForm = (): Omit<Protagonist, 'id'> => ({
    nome: '', matricula: '', turmaId: '', status: 'Cursando'
});

export default function ProtagonistsModule({ readOnly = false }: { readOnly?: boolean }) {
    const { protagonistas, setProtagonistas, turmas } = useGrades();
    const [search, setSearch] = useState('');
    const [filterTurma, setFilterTurma] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Protagonist | null>(null);
    const [form, setForm] = useState(emptyForm());

    // Novas estados para importação em lote
    const [batchMode, setBatchMode] = useState(false);
    const [batchNames, setBatchNames] = useState('');

    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [page, setPage] = useState(1);
    const PER_PAGE = 20;
    const fileRef = useRef<HTMLInputElement>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const openNew = () => {
        setEditing(null);
        setForm(emptyForm());
        setBatchMode(false);
        setBatchNames('');
        setShowModal(true);
    };

    const openEdit = (p: Protagonist) => {
        setEditing(p);
        setForm({ nome: p.nome, matricula: p.matricula, turmaId: p.turmaId, status: p.status });
        setBatchMode(false);
        setShowModal(true);
    };

    const closeModal = () => { setShowModal(false); setEditing(null); };

    // Gerador de Matrícula (Simulado para o exemplo, idealmente seria via backend)
    const generateMatricula = () => {
        const year = new Date().getFullYear();
        const random = Math.floor(1000 + Math.random() * 9000);
        return `${year}${random}`;
    };

    const handleSave = async () => {
        if (!batchMode && !form.nome.trim()) {
            showToast('O nome é obrigatório', 'error'); return;
        }
        if (batchMode && !batchNames.trim()) {
            showToast('Insira ao menos um nome', 'error'); return;
        }

        setSaving(true);
        try {
            if (batchMode) {
                const names = batchNames.split('\n').map(n => n.trim()).filter(n => n !== '');
                const turma = turmas.find(t => t.id === form.turmaId);
                const newRows: Protagonist[] = names.map(name => ({
                    id: newId(),
                    nome: name,
                    matricula: generateMatricula(),
                    turmaId: form.turmaId,
                    turmaNome: turma?.nome,
                    status: form.status
                }));

                await api.protagonistas.importBatch(newRows);
                setProtagonistas(prev => [...newRows, ...prev]);
                showToast(`${newRows.length} protagonistas cadastrados!`);
            } else {
                const turma = turmas.find(t => t.id === form.turmaId);
                const p: Protagonist = {
                    id: editing?.id ?? newId(),
                    nome: form.nome,
                    matricula: editing ? form.matricula : (form.matricula || generateMatricula()),
                    turmaId: form.turmaId,
                    status: form.status,
                    turmaNome: turma?.nome,
                };
                await api.protagonistas.save(p);
                setProtagonistas(prev =>
                    editing ? prev.map(x => x.id === p.id ? p : x) : [p, ...prev]
                );
                showToast(editing ? 'Protagonista atualizado!' : 'Protagonista cadastrado!');
            }
            closeModal();
        } catch (err) {
            console.error(err);
            showToast('Erro ao salvar no servidor.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (p: Protagonist) => {
        if (!confirm(`Excluir "${p.nome}"?`)) return;
        try {
            await api.protagonistas.delete(p.id);
            setProtagonistas(prev => prev.filter(x => x.id !== p.id));
            showToast('Protagonista removido.');
        } catch {
            showToast('Erro ao excluir.', 'error');
        }
    };

    const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const text = ev.target?.result as string;
            const lines = text.trim().split('\n').slice(1);
            const rows: Protagonist[] = lines.map(line => {
                const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                const turma = turmas.find(t => t.nome.toLowerCase() === (cols[2] || '').toLowerCase());
                return {
                    id: newId(),
                    nome: cols[0] || '',
                    matricula: cols[1] || generateMatricula(),
                    turmaId: turma?.id || cols[2] || '',
                    turmaNome: turma?.nome || cols[2] || '',
                    status: (cols[3] as Status) || 'Cursando',
                };
            }).filter(r => r.nome);
            try {
                await api.protagonistas.importBatch(rows);
                setProtagonistas(prev => [...rows, ...prev]);
                showToast(`${rows.length} protagonistas importados!`);
            } catch {
                showToast('Erro na importação.', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const filtered = protagonistas.filter(p => {
        const q = (search || '').toLowerCase();
        const nome = (p.nome || '').toLowerCase();
        const matricula = (p.matricula || '').toLowerCase();

        const matchSearch = !q || nome.includes(q) || matricula.includes(q);
        const matchTurma = !filterTurma || p.turmaId === filterTurma;
        const matchStatus = !filterStatus || p.status === filterStatus;
        return matchSearch && matchTurma && matchStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const getTurmaName = (id: string) => turmas.find(t => t.id === id)?.nome || '—';

    return (
        <>
            {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

            {/* Stats */}
            <div className="stat-grid">
                <div className="stat-card blue">
                    <span className="stat-card-label">Total</span>
                    <span className="stat-card-value">{protagonistas.length}</span>
                    <Users size={40} className="stat-card-icon" />
                </div>
                <div className="stat-card green">
                    <span className="stat-card-label">Cursando</span>
                    <span className="stat-card-value">{protagonistas.filter(p => (p.status || '') === 'Cursando').length}</span>
                    <CheckCircle size={40} className="stat-card-icon" />
                </div>
                <div className="stat-card amber">
                    <span className="stat-card-label">Transferência</span>
                    <span className="stat-card-value">{protagonistas.filter(p => (p.status || '') === 'Transferência').length}</span>
                    <AlertCircle size={40} className="stat-card-icon" />
                </div>
                <div className="stat-card red">
                    <span className="stat-card-label">Evasão</span>
                    <span className="stat-card-value">{protagonistas.filter(p => (p.status || '') === 'Evasão').length}</span>
                    <XCircle size={40} className="stat-card-icon" />
                </div>
            </div>

            {/* Main Card */}
            <div className="card">
                <div className="card-header">
                    <div>
                        <div className="card-title">Lista de Protagonistas</div>
                        <div className="card-subtitle">{filtered.length} registrados</div>
                    </div>
                    {!readOnly && (
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
                                <Upload size={18} /> Importar CSV
                                <input type="file" ref={fileRef} style={{ display: 'none' }} accept=".csv" onChange={handleCSV} />
                            </button>
                            <button className="btn btn-primary" onClick={openNew}>
                                <UserPlus size={18} /> Novo Protagonista
                            </button>
                        </div>
                    )}
                </div>

                {/* Filters */}
                <div className="filters-bar" style={{ padding: '1rem' }}>
                    <div className="search-bar" style={{ flex: 1, minWidth: '280px' }}>
                        <Search size={16} className="search-bar-icon" />
                        <input
                            className="input"
                            placeholder="Buscar por nome ou matrícula..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <select className="select" style={{ width: '200px' }} value={filterTurma} onChange={e => { setFilterTurma(e.target.value); setPage(1); }}>
                        <option value="">Todas as turmas</option>
                        {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                    <select className="select" style={{ width: '180px' }} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
                        <option value="">Todos os status</option>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                {/* Table */}
                <div className="table-container">
                    {paginated.length === 0 ? (
                        <div className="empty-state">
                            <Users size={48} className="empty-state-icon" />
                            <h3>Nenhum registro</h3>
                            <p>Tente ajustar os filtros ou cadastre novos alunos.</p>
                        </div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th style={{ width: '60px' }}>#</th>
                                    <th>Nome do Aluno</th>
                                    <th>Matrícula (RA)</th>
                                    <th>Turma</th>
                                    <th>Situação</th>
                                    <th style={{ textAlign: 'right' }}>{readOnly ? '' : 'Ações'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((p, i) => (
                                    <tr key={p.id}>
                                        <td style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>
                                            {(page - 1) * PER_PAGE + i + 1}
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{p.nome}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{p.matricula}</td>
                                        <td>
                                            <span className="badge badge-blue">
                                                {p.turmaNome || getTurmaName(p.turmaId)}
                                            </span>
                                        </td>
                                        <td><span className={`badge ${statusBadge(p.status)}`}>{p.status}</span></td>
                                        <td style={{ textAlign: 'right' }}>
                                            {!readOnly && (
                                                <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                                                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(p)}>
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(p)} style={{ color: 'hsl(var(--danger))' }}>
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="pagination">
                        <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
                        <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Página {page} de {totalPages}</span>
                        <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Próxima</button>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', borderRadius: '1.25rem' }}>
                        <div className="modal-header" style={{ padding: '1.5rem', borderBottom: 'none' }}>
                            <div>
                                <h2 className="modal-title" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Cadastro de Protagonista</h2>
                                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--primary))', fontWeight: 600, marginTop: '0.25rem' }}>
                                    Configure o ano e a turma de destino
                                </p>
                            </div>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={closeModal}><X size={20} /></button>
                        </div>

                        <div className="modal-body" style={{ padding: '0 1.5rem 1.5rem' }}>
                            {/* Toggle Modo Lote (Visual da Imagem) */}
                            {!editing && (
                                <div style={{
                                    background: 'hsl(var(--primary-light) / 0.1)',
                                    padding: '1rem',
                                    borderRadius: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '1.5rem',
                                    border: '1px solid hsl(var(--primary-light) / 0.2)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ background: 'white', padding: '0.5rem', borderRadius: '0.75rem', display: 'flex' }}>
                                            <Upload size={20} color="hsl(var(--primary))" />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Modo de Importação em Lote</div>
                                            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>Criação múltipla de alunos</div>
                                        </div>
                                    </div>
                                    <label className="switch">
                                        <input type="checkbox" checked={batchMode} onChange={e => setBatchMode(e.target.checked)} />
                                        <span className="slider round"></span>
                                    </label>
                                </div>
                            )}

                            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                <div className="form-group">
                                    <label className="label" style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>Ano Letivo *</label>
                                    <select className="select">
                                        <option>2026</option>
                                        <option>2025</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="label" style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>Turma de Destino *</label>
                                    <select className="select" value={form.turmaId} onChange={e => setForm(f => ({ ...f, turmaId: e.target.value }))}>
                                        <option value="">Selecione...</option>
                                        {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                                    </select>
                                </div>

                                {batchMode ? (
                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label className="label" style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>Nomes (Um por linha) *</label>
                                        <textarea
                                            className="input"
                                            style={{ height: '140px', resize: 'none', padding: '1rem' }}
                                            placeholder="FULANO DE TAL\nBELTRANO SILVA..."
                                            value={batchNames}
                                            onChange={e => setBatchNames(e.target.value)}
                                        />
                                    </div>
                                ) : (
                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label className="label" style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>Nome do Aluno *</label>
                                        <input
                                            className="input"
                                            placeholder="Digite o nome completo"
                                            value={form.nome}
                                            onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                                        />
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="label" style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>Situação Cadastral</label>
                                    <select className="select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))}>
                                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="label" style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>RA (Identificador)</label>
                                    <input
                                        className="input"
                                        disabled={!editing}
                                        placeholder="Será gerado pelo sistema"
                                        value={editing ? form.matricula : ""}
                                        style={{ background: 'hsl(var(--muted) / 0.5)', cursor: editing ? 'text' : 'not-allowed', fontStyle: 'italic' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer" style={{ padding: '1.5rem', borderTop: 'none', gap: '1rem' }}>
                            <button className="btn btn-secondary" onClick={closeModal} style={{ flex: 1, borderRadius: '0.75rem', padding: '0.875rem' }}>CANCELAR</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1, borderRadius: '0.75rem', padding: '0.875rem', background: '#5850ec', fontWeight: 700 }}>
                                {saving ? 'SALVANDO...' : 'CONFIRMAR REGISTRO'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .switch { position: relative; display: inline-block; width: 50px; height: 26px; }
                .switch input { opacity: 0; width: 0; height: 0; }
                .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; }
                .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 4px; bottom: 4px; background-color: white; transition: .4s; }
                input:checked + .slider { background-color: #5850ec; }
                input:focus + .slider { box-shadow: 0 0 1px #5850ec; }
                input:checked + .slider:before { transform: translateX(24px); }
                .slider.round { border-radius: 34px; }
                .slider.round:before { border-radius: 50%; }
                
                .pagination { display: flex; align-items: center; justify-content: space-between; padding: 1rem; border-top: 1px solid hsl(var(--border-light)); }
            `}</style>
        </>
    );
}
