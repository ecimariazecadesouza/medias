'use client';

import { useState, useMemo, useEffect } from 'react';
import { useGrades } from '@/context/GradesContext';
import { ShieldCheck, Calculator, Save, Download, FileText, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import { api, newId } from '@/lib/api';
import type { Conselho } from '@/lib/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ConselhoModule() {
    const {
        turmas, disciplinas, protagonistas, lancamentos, conselhos, configuracao,
        areas, subformacoes, formacoes,
        refreshConselho
    } = useGrades();

    const [selTurma, setSelTurma] = useState('');
    const [bimRef, setBimRef] = useState<1 | 2 | 3 | 4>(4);
    const [selFormacao, setSelFormacao] = useState('');
    const [selSubformacao, setSelSubformacao] = useState('');
    const [selArea, setSelArea] = useState('');
    const [selDisciplina, setSelDisciplina] = useState('');
    const [minAprovadas, setMinAprovadas] = useState<string>('');
    const [minReprovadas, setMinReprovadas] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<'Cursando' | 'Todos'>('Cursando');

    // UI states
    const [saving, setSaving] = useState(false);
    const [localConselhos, setLocalConselhos] = useState<Conselho[]>([]);
    const [filterExpanded, setFilterExpanded] = useState(true);
    const [colsCollapsed, setColsCollapsed] = useState(false);

    useEffect(() => {
        setLocalConselhos(conselhos);
    }, [conselhos]);

    const mediaMinima = configuracao.mediaMinima;
    const activeTurma = turmas.find(t => t.id === selTurma);

    // Cascading Filter Logic
    const filteredSubformacoes = useMemo(() =>
        subformacoes.filter(sf => !selFormacao || sf.formacaoId === selFormacao),
        [subformacoes, selFormacao]
    );

    const filteredAreas = useMemo(() =>
        areas.filter(a => !selSubformacao || a.subformacaoId === selSubformacao),
        [areas, selSubformacao]
    );

    const turmaProtsAll = useMemo(() => {
        const safeProtagonistas = protagonistas || [];
        return safeProtagonistas.filter(p => p?.turmaId === selTurma && (statusFilter === 'Todos' || p?.status === 'Cursando'))
            .sort((a, b) => (a?.nome || '').localeCompare(b?.nome || ''));
    }, [selTurma, protagonistas, statusFilter]);

    const turmaDiscs = useMemo(() => {
        if (!selTurma) return [];
        const linkedIds = activeTurma?.disciplinaIds || [];
        const gradedIds = new Set(lancamentos.filter(l => l.turmaId === selTurma).map(l => l.disciplinaId));

        let list = disciplinas.filter(d => linkedIds.includes(d.id) || gradedIds.has(d.id));

        // Apply category filters
        if (selArea) {
            list = list.filter(d => d.areaId === selArea);
        } else if (selSubformacao) {
            const areaIds = areas.filter(a => a.subformacaoId === selSubformacao).map(a => a.id);
            list = list.filter(d => areaIds.includes(d.areaId));
        } else if (selFormacao) {
            const sfIds = subformacoes.filter(sf => sf.formacaoId === selFormacao).map(sf => sf.id);
            const areaIds = areas.filter(a => sfIds.includes(a.subformacaoId)).map(a => a.id);
            list = list.filter(d => areaIds.includes(d.areaId));
        }

        // Apply specific disciplina filter
        if (selDisciplina) {
            list = list.filter(d => d.id === selDisciplina);
        }

        return list.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    }, [selTurma, activeTurma, disciplinas, lancamentos, selArea, selSubformacao, selFormacao, selDisciplina, areas, subformacoes]);

    // All disciplinas for the disciplina dropdown (before selDisciplina filter)
    const turmaDiscsForDropdown = useMemo(() => {
        if (!selTurma) return [];
        const linkedIds = activeTurma?.disciplinaIds || [];
        const gradedIds = new Set(lancamentos.filter(l => l.turmaId === selTurma).map(l => l.disciplinaId));
        return disciplinas
            .filter(d => linkedIds.includes(d.id) || gradedIds.has(d.id))
            .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    }, [selTurma, activeTurma, disciplinas, lancamentos]);

    // Refined Simulation Logic
    const getSimulationData = (pId: string, dId: string) => {
        const safeLancamentos = lancamentos || [];
        const discLans = safeLancamentos.filter(l => l?.protagonistaId === pId && l?.disciplinaId === dId);
        const regularLans = discLans.filter(l => l?.bimestre >= 1 && l?.bimestre <= bimRef);
        const sum = regularLans.reduce((acc, l) => acc + (l?.media || 0), 0);
        const filledCount = regularLans.filter(l => l?.media !== null).length;

        let mf: number | null = null;
        const mg = bimRef > 0 ? (sum / bimRef) : 0;

        if (bimRef < 4) {
            mf = Math.floor(mg * 10) / 10;
        } else {
            const mgFinal = Math.floor((sum / 4) * 10) / 10;
            const rf = discLans.find(l => l.bimestre === 5)?.media ?? null;
            if (mgFinal >= mediaMinima) {
                mf = mgFinal;
            } else if (rf !== null) {
                mf = Math.floor(((mgFinal * 6 + rf * 4) / 10) * 10) / 10;
            } else {
                mf = mgFinal;
            }
        }

        const isPendente = filledCount < bimRef;
        const resStatus = isPendente ? 'pendente' : (mf !== null && mf >= 5.0) ? 'aprovado' : 'retido';
        const color = resStatus === 'aprovado' ? 'hsl(var(--accent))' : resStatus === 'retido' ? 'hsl(var(--danger))' : '#3b82f6';

        return { mf, isPendente, resStatus, color };
    };

    // Filter protagonists by min approved/reproved counts
    const turmaProts = useMemo(() => {
        if (!minAprovadas && !minReprovadas) return turmaProtsAll;
        return turmaProtsAll.filter(p => {
            const sims = turmaDiscs.map(d => getSimulationData(p.id, d.id));
            const approvedCount = sims.filter(s => !s.isPendente && s.mf !== null && s.mf >= 5.0).length;
            const retidoCount = sims.filter(s => !s.isPendente && s.mf !== null && s.mf < 5.0).length;
            const minA = minAprovadas ? parseInt(minAprovadas) : 0;
            const minR = minReprovadas ? parseInt(minReprovadas) : 0;
            return approvedCount >= minA && retidoCount >= minR;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [turmaProtsAll, turmaDiscs, minAprovadas, minReprovadas, lancamentos, bimRef, mediaMinima]);

    const handleDeliberationChange = (pId: string, field: keyof Conselho, value: any) => {
        setLocalConselhos(prev => {
            const existing = prev.find(c => c.protagonistaId === pId && c.ano === configuracao.anoLetivo);
            if (existing) {
                return prev.map(c => (c === existing ? { ...c, [field]: value } : c));
            } else {
                const nw: Conselho = {
                    id: newId(),
                    protagonistaId: pId,
                    ano: configuracao.anoLetivo,
                    resultadoManual: 'Aprovado',
                    deliberado: false,
                    ...({ [field]: value })
                };
                return [...prev, nw];
            }
        });
    };

    const saveDeliberations = async () => {
        setSaving(true);
        try {
            await api.conselho.saveBatch(localConselhos);
            await refreshConselho();
            alert('Deliberações salvas com sucesso!');
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar deliberações.');
        } finally {
            setSaving(false);
        }
    };

    const exportToCSV = () => {
        if (!activeTurma) return;
        const headers = ['Protagonista', ...turmaDiscs.map(d => `${d.nome} (MF)`), 'Res. Sist', 'Final'];
        const rows = turmaProts.map(p => {
            const simDatas = turmaDiscs.map(d => getSimulationData(p.id, d.id));
            const countBelow = simDatas.filter(s => s.mf !== null && s.mf < 5.0).length;
            const hasPendency = simDatas.some(s => s.isPendente);
            const resSist = hasPendency ? 'Pendente' : countBelow === 0 ? 'Aprovado' : 'Retido';
            const conselho = localConselhos.find(c => c.protagonistaId === p.id && c.ano === configuracao.anoLetivo);
            return [
                p.nome,
                ...simDatas.map(s => s.mf?.toFixed(1) || '—'),
                resSist,
                conselho?.deliberado ? conselho.resultadoManual : resSist
            ];
        });
        const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(";")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Conselho_${activeTurma.nome}.csv`);
        link.click();
    };

    const exportToPDF = () => {
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.text(`Conselho de Classe - ${activeTurma?.nome}`, 14, 15);
        autoTable(doc, {
            head: [['Protagonista', ...turmaDiscs.map(d => d.nome.substring(0, 8)), 'Res. Sist', 'Final']],
            body: turmaProts.map(p => {
                const simDatas = turmaDiscs.map(d => getSimulationData(p.id, d.id));
                const countBelow = simDatas.filter(s => s.mf !== null && s.mf < 5.0).length;
                const hasPendency = simDatas.some(s => s.isPendente);
                const resSist = hasPendency ? 'Pendente' : countBelow === 0 ? 'Aprovado' : 'Retido';
                const conselho = localConselhos.find(c => c.protagonistaId === p.id && c.ano === configuracao.anoLetivo);
                return [p.nome, ...simDatas.map(s => s.mf?.toFixed(1) || '—'), resSist, conselho?.deliberado ? conselho.resultadoManual : resSist];
            }),
            startY: 20,
            styles: { fontSize: 7 }
        });
        doc.save(`Conselho_${activeTurma?.nome}.pdf`);
    };

    // Summary stats
    const summaryStats = useMemo(() => {
        if (!selTurma) return null;
        let aprovados = 0, retidos = 0, emCurso = 0;
        turmaProts.forEach(p => {
            const sims = turmaDiscs.map(d => getSimulationData(p.id, d.id));
            const hasPendency = sims.some(s => s.isPendente);
            const countBelow = sims.filter(s => !s.isPendente && s.mf !== null && s.mf < 5.0).length;
            if (hasPendency) emCurso++;
            else if (countBelow === 0) aprovados++;
            else retidos++;
        });
        return { aprovados, retidos, emCurso, total: turmaProts.length };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [turmaProts, turmaDiscs, lancamentos, bimRef, mediaMinima, selTurma]);

    return (
        <div className="space-y-5">
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div style={{
                        background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))',
                        borderRadius: '0.875rem',
                        padding: '0.625rem',
                        display: 'flex',
                        boxShadow: '0 4px 14px hsl(var(--primary)/0.3)'
                    }}>
                        <Calculator size={22} color="white" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                            Conselho de Classe
                        </h1>
                        <p style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.1rem' }}>
                            Análise de rendimento e deliberações de encerramento.
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-secondary btn-sm gap-2" onClick={exportToCSV}
                        style={{ border: '1px solid hsl(var(--border))', fontWeight: 700, fontSize: '0.78rem' }}>
                        <Download size={14} style={{ color: 'hsl(var(--accent))' }} /> Exportar CSV
                    </button>
                    <button className="btn btn-secondary btn-sm gap-2" onClick={exportToPDF}
                        style={{ border: '1px solid hsl(var(--border))', fontWeight: 700, fontSize: '0.78rem' }}>
                        <FileText size={14} /> PDF Nativo
                    </button>
                    <button className="btn btn-primary btn-sm gap-2" onClick={saveDeliberations} disabled={saving}
                        style={{ fontWeight: 700, fontSize: '0.78rem', boxShadow: '0 4px 12px hsl(var(--primary)/0.3)' }}>
                        <Save size={14} /> {saving ? 'SALVANDO...' : 'SALVAR'}
                    </button>
                </div>
            </div>

            {/* ── Config + Filters Row ────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1rem', alignItems: 'start' }}>

                {/* Left Config Card */}
                <div className="card" style={{ borderRadius: '1rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid hsl(var(--border-light))' }}>
                    <div className="card-body" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <label className="label" style={{ fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.06em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.3rem' }}>Ano Letivo</label>
                                <select className="select" style={{ height: '2.375rem', fontSize: '0.875rem', fontWeight: 600 }}>
                                    <option>{configuracao.anoLetivo}</option>
                                </select>
                            </div>
                            <div>
                                <label className="label" style={{ fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.06em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.3rem' }}>
                                    Turma <span style={{ color: 'hsl(var(--danger))' }}>*</span>
                                </label>
                                <select className="select" style={{ height: '2.375rem', fontSize: '0.875rem', fontWeight: 600 }}
                                    value={selTurma} onChange={e => { setSelTurma(e.target.value); setSelArea(''); setSelSubformacao(''); setSelFormacao(''); setSelDisciplina(''); }}>
                                    <option value="">Selecione...</option>
                                    {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="label" style={{ fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.06em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.3rem' }}>Bimestre de Referência</label>
                            <select className="select" style={{ height: '2.375rem', fontSize: '0.875rem', fontWeight: 700, color: 'hsl(var(--primary))', background: 'hsl(var(--primary)/0.06)', borderColor: 'hsl(var(--primary)/0.2)' }}
                                value={bimRef} onChange={e => setBimRef(Number(e.target.value) as any)}>
                                <option value={1}>1º Bimestre (Parcial)</option>
                                <option value={2}>2º Bimestre (Parcial)</option>
                                <option value={3}>3º Bimestre (Parcial)</option>
                                <option value={4}>4º Bimestre (Final)</option>
                            </select>
                            <p style={{ fontSize: '0.6rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.4rem', fontStyle: 'italic', lineHeight: 1.4 }}>
                                Simula o encerramento do ano letivo considerando apenas até o bimestre selecionado.
                            </p>
                        </div>

                        <div>
                            <label className="label" style={{ fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.06em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.3rem' }}>Status Protagonista</label>
                            <div style={{ display: 'flex', background: 'hsl(var(--surface-raised))', borderRadius: '0.75rem', padding: '0.25rem', gap: '0.25rem' }}>
                                {(['Cursando', 'Todos'] as const).map(s => (
                                    <button key={s} onClick={() => setStatusFilter(s)}
                                        style={{
                                            flex: 1, padding: '0.45rem', fontSize: '0.7rem', fontWeight: 800,
                                            borderRadius: '0.5rem', border: 'none', cursor: 'pointer', letterSpacing: '0.04em',
                                            transition: 'all 0.15s',
                                            background: statusFilter === s ? 'white' : 'transparent',
                                            color: statusFilter === s ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                                            boxShadow: statusFilter === s ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                                        }}>
                                        {s.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Advanced Filters Card */}
                <div className="card" style={{ borderRadius: '1rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid hsl(var(--border-light))', overflow: 'hidden' }}>
                    {/* Filter Header */}
                    <div style={{ padding: '1rem 1.25rem', borderBottom: filterExpanded ? '1px solid hsl(var(--border-light))' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '0.5rem', background: 'hsl(var(--primary)/0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Filter size={14} style={{ color: 'hsl(var(--primary))' }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--primary)/0.8)' }}>
                                Filtros Avançados
                            </span>
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={() => setColsCollapsed(!colsCollapsed)}
                            style={{ fontSize: '0.65rem', fontWeight: 700, gap: '0.3rem', height: '1.75rem', padding: '0 0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {colsCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                            {colsCollapsed ? 'Expandir Notas' : 'Recolher Notas'}
                        </button>
                    </div>

                    {filterExpanded && (
                        <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem' }}>
                            {/* Row 1: Formação, Subformação, Área */}
                            <div>
                                <label className="label" style={{ fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.06em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.3rem' }}>Formação</label>
                                <select className="select" style={{ height: '2.375rem', fontSize: '0.84rem' }}
                                    value={selFormacao} onChange={e => { setSelFormacao(e.target.value); setSelSubformacao(''); setSelArea(''); setSelDisciplina(''); }}>
                                    <option value="">Todas as formações</option>
                                    {formacoes.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="label" style={{ fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.06em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.3rem' }}>Subformação</label>
                                <select className="select" style={{ height: '2.375rem', fontSize: '0.84rem' }}
                                    value={selSubformacao} onChange={e => { setSelSubformacao(e.target.value); setSelArea(''); setSelDisciplina(''); }}>
                                    <option value="">Todas as subformações</option>
                                    {filteredSubformacoes.map(sf => <option key={sf.id} value={sf.id}>{sf.nome}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="label" style={{ fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.06em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.3rem' }}>Área</label>
                                <select className="select" style={{ height: '2.375rem', fontSize: '0.84rem' }}
                                    value={selArea} onChange={e => { setSelArea(e.target.value); setSelDisciplina(''); }}>
                                    <option value="">Todas as áreas</option>
                                    {filteredAreas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                                </select>
                            </div>

                            {/* Row 2: Disciplina, Mínimo ≥ 5, Mínimo < 5 */}
                            <div>
                                <label className="label" style={{ fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.06em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.3rem' }}>Disciplina</label>
                                <select className="select" style={{ height: '2.375rem', fontSize: '0.84rem' }}
                                    value={selDisciplina} onChange={e => setSelDisciplina(e.target.value)}>
                                    <option value="">Todas as disciplinas</option>
                                    {turmaDiscsForDropdown.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="label" style={{ fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.06em', color: 'hsl(142 71% 35%)', marginBottom: '0.3rem' }}>
                                    Mínimo Médias ≥ 5
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    className="input"
                                    style={{ height: '2.375rem', fontSize: '0.875rem', fontWeight: 700, borderColor: minAprovadas ? 'hsl(var(--accent))' : undefined }}
                                    placeholder="Qtd..."
                                    value={minAprovadas}
                                    onChange={e => setMinAprovadas(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="label" style={{ fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.06em', color: 'hsl(var(--danger))', marginBottom: '0.3rem' }}>
                                    Mínimo Médias &lt; 5
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    className="input"
                                    style={{ height: '2.375rem', fontSize: '0.875rem', fontWeight: 700, borderColor: minReprovadas ? 'hsl(var(--danger))' : undefined }}
                                    placeholder="Qtd..."
                                    value={minReprovadas}
                                    onChange={e => setMinReprovadas(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Summary Stats (when turma selected) ───────────────────── */}
            {summaryStats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.875rem' }}>
                    {[
                        { label: 'Protagonistas', value: summaryStats.total, color: 'hsl(var(--primary))', bg: 'hsl(var(--primary)/0.08)' },
                        { label: 'Aprovados', value: summaryStats.aprovados, color: 'hsl(var(--accent))', bg: 'hsl(var(--accent)/0.08)' },
                        { label: 'Retidos', value: summaryStats.retidos, color: 'hsl(var(--danger))', bg: 'hsl(var(--danger)/0.08)' },
                        { label: 'Em Curso', value: summaryStats.emCurso, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
                    ].map(stat => (
                        <div key={stat.label} style={{
                            background: 'white', borderRadius: '0.875rem', padding: '1rem 1.25rem',
                            border: '1px solid hsl(var(--border-light))', boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                            display: 'flex', alignItems: 'center', gap: '1rem'
                        }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '0.75rem', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span style={{ fontSize: '1.1rem', fontWeight: 900, color: stat.color }}>{stat.value}</span>
                            </div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.3 }}>{stat.label}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Master Table ───────────────────────────────────────────── */}
            {selTurma ? (
                <div className="card" style={{ borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid hsl(var(--border-light))' }}>
                    {/* Table Header Bar */}
                    <div style={{
                        padding: '0.875rem 1.25rem', borderBottom: '1px solid hsl(var(--border-light))',
                        background: 'hsl(var(--surface-raised))', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--muted-foreground))' }}>
                            Protagonistas Selecionados: <span style={{ color: 'hsl(var(--primary))' }}>{turmaProts.length}</span>
                        </span>
                        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                            {[
                                { color: 'hsl(var(--accent))', label: 'APROVADO' },
                                { color: 'hsl(var(--danger))', label: 'RETIDO' },
                                { color: '#3b82f6', label: 'EM CURSO' },
                            ].map(leg => (
                                <div key={leg.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: leg.color, flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'hsl(var(--muted-foreground))', letterSpacing: '0.04em' }}>{leg.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-x-auto" style={{ overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto', position: 'relative' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '1100px' }}>
                            <thead>
                                <tr style={{ background: 'hsl(var(--surface-raised))' }}>
                                    <th rowSpan={2} style={{
                                        padding: '0.75rem 1.25rem', textAlign: 'left', position: 'sticky', left: 0, top: 0,
                                        background: 'hsl(var(--surface-raised))', zIndex: 40, minWidth: '240px',
                                        fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                                        letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))',
                                        borderBottom: '2px solid hsl(var(--border))',
                                        borderRight: '2px solid hsl(var(--border))',
                                        boxShadow: '2px 2px 6px rgba(0,0,0,0.06)'
                                    }}>
                                        Protagonista
                                    </th>
                                    {!colsCollapsed && turmaDiscs.map(d => (
                                        <th key={d.id} style={{
                                            padding: '0.5rem 0.75rem', textAlign: 'center',
                                            fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase',
                                            color: 'hsl(var(--muted-foreground))', borderLeft: '1px solid hsl(var(--border-light))',
                                            borderBottom: '1px solid hsl(var(--border-light))',
                                            background: 'hsl(var(--surface-raised))', whiteSpace: 'nowrap',
                                            letterSpacing: '0.05em', position: 'sticky', top: 0, zIndex: 30
                                        }}>
                                            {d.nome}
                                        </th>
                                    ))}
                                    {/* MDS ≥5 */}
                                    <th rowSpan={2} style={{
                                        padding: '0.5rem 0.6rem', textAlign: 'center',
                                        fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase',
                                        letterSpacing: '0.04em', borderLeft: '2px solid hsl(var(--border))',
                                        borderBottom: '2px solid hsl(var(--border))',
                                        background: 'hsl(var(--accent)/0.08)', color: 'hsl(142 71% 35%)',
                                        whiteSpace: 'nowrap', width: '52px', position: 'sticky', top: 0, zIndex: 30
                                    }}>
                                        MDS<br />≥ 5
                                    </th>
                                    {/* MDS <5 */}
                                    <th rowSpan={2} style={{
                                        padding: '0.5rem 0.6rem', textAlign: 'center',
                                        fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase',
                                        letterSpacing: '0.04em', borderLeft: '1px solid hsl(var(--border-light))',
                                        borderBottom: '2px solid hsl(var(--border))',
                                        background: 'hsl(var(--danger)/0.06)', color: 'hsl(var(--danger))',
                                        whiteSpace: 'nowrap', width: '52px', position: 'sticky', top: 0, zIndex: 30
                                    }}>
                                        MDS<br />&lt; 5
                                    </th>
                                    {/* Resultado Geral */}
                                    <th rowSpan={2} style={{
                                        padding: '0.5rem 0.75rem', textAlign: 'center',
                                        fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase',
                                        letterSpacing: '0.04em', borderLeft: '1px solid hsl(var(--border-light))',
                                        borderBottom: '2px solid hsl(var(--border))',
                                        background: 'hsl(var(--surface-raised))', color: 'hsl(var(--muted-foreground))',
                                        width: '90px', position: 'sticky', top: 0, zIndex: 30
                                    }}>
                                        Res. Geral
                                    </th>
                                    <th colSpan={2} style={{
                                        padding: '0.5rem 0.75rem', textAlign: 'center',
                                        fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                                        letterSpacing: '0.06em', borderLeft: '2px solid hsl(var(--border))',
                                        borderBottom: '1px solid hsl(var(--border-light))',
                                        background: 'hsl(var(--primary)/0.06)', color: 'hsl(var(--primary))',
                                        position: 'sticky', top: 0, zIndex: 30
                                    }}>
                                        Deliberação
                                    </th>
                                    {/* Retenções/Pendências */}
                                    <th rowSpan={2} style={{
                                        padding: '0.5rem 0.875rem', textAlign: 'left',
                                        fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase',
                                        letterSpacing: '0.04em', borderLeft: '2px solid hsl(var(--border))',
                                        borderBottom: '2px solid hsl(var(--border))',
                                        background: 'hsl(38 92% 50%/0.06)', color: 'hsl(30 80% 35%)',
                                        minWidth: '220px', position: 'sticky', top: 0, zIndex: 30
                                    }}>
                                        Retenções / Pendências
                                    </th>
                                </tr>
                                <tr style={{ background: 'hsl(var(--surface-raised))' }}>
                                    {!colsCollapsed && turmaDiscs.map(d => (
                                        <th key={`${d.id}-sub`} style={{
                                            padding: '0.375rem 0.5rem', borderLeft: '1px solid hsl(var(--border-light))',
                                            borderBottom: '2px solid hsl(var(--border))', textAlign: 'center', background: 'hsl(var(--surface-raised))',
                                            position: 'sticky', top: '30px', zIndex: 30
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', fontSize: '0.55rem', fontWeight: 800, color: 'hsl(var(--muted-foreground)/0.5)', letterSpacing: '0.04em' }}>
                                                <span>MF</span><span>ST</span>
                                            </div>
                                        </th>
                                    ))}
                                    <th style={{
                                        padding: '0.375rem 0.5rem', borderLeft: '2px solid hsl(var(--border))',
                                        borderBottom: '2px solid hsl(var(--border))', textAlign: 'center',
                                        fontSize: '0.55rem', fontWeight: 800, color: 'hsl(var(--muted-foreground))',
                                        textTransform: 'uppercase', letterSpacing: '0.04em', width: '60px',
                                        background: 'hsl(var(--primary)/0.04)', position: 'sticky', top: '30px', zIndex: 30
                                    }}>
                                        Status
                                    </th>
                                    <th style={{
                                        padding: '0.375rem 0.5rem', borderLeft: '1px solid hsl(var(--border-light))',
                                        borderBottom: '2px solid hsl(var(--border))', textAlign: 'center',
                                        fontSize: '0.55rem', fontWeight: 800, color: 'hsl(var(--muted-foreground))',
                                        textTransform: 'uppercase', letterSpacing: '0.04em', width: '120px',
                                        background: 'hsl(var(--primary)/0.04)', position: 'sticky', top: '30px', zIndex: 30
                                    }}>
                                        Res. Final
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {turmaProts.map((p, idx) => {
                                    const conselho = localConselhos.find(c => c.protagonistaId === p.id && c.ano === configuracao.anoLetivo);
                                    const isDeliberado = conselho?.deliberado || false;

                                    // Compute per-student summary
                                    const allSims = turmaDiscs.map(d => ({ disc: d, sim: getSimulationData(p.id, d.id) }));
                                    const mdsAprovadas = allSims.filter(({ sim }) => !sim.isPendente && sim.mf !== null && sim.mf >= 5.0).length;
                                    const mdsReprovadas = allSims.filter(({ sim }) => !sim.isPendente && sim.mf !== null && sim.mf < 5.0).length;
                                    const hasPendency = allSims.some(({ sim }) => sim.isPendente);
                                    const resSist = hasPendency ? 'Pendente' : mdsReprovadas === 0 ? 'Aprovado' : 'Retido';

                                    // Retenções/Pendências list
                                    const retencoes = allSims
                                        .filter(({ sim }) => sim.isPendente || (sim.mf !== null && sim.mf < 5.0))
                                        .map(({ disc, sim }) => ({
                                            nome: disc.nome,
                                            tipo: sim.isPendente ? 'P' : 'R'
                                        }));

                                    return (
                                        <tr key={p.id} style={{
                                            background: idx % 2 === 0 ? 'white' : 'hsl(var(--surface-raised)/0.4)',
                                            borderBottom: '1px solid hsl(var(--border-light))',
                                            transition: 'background 0.1s'
                                        }}>
                                            <td style={{
                                                padding: '0.75rem 1.25rem', position: 'sticky', left: 0,
                                                background: idx % 2 === 0 ? 'white' : 'hsl(220 14% 97%)',
                                                zIndex: 10, borderRight: '2px solid hsl(var(--border))',
                                                boxShadow: '2px 0 6px rgba(0,0,0,0.06)'
                                            }}>
                                                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'hsl(var(--foreground))', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                                                    {p.nome}
                                                </div>
                                                <div style={{ fontSize: '0.62rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))', marginTop: '0.15rem' }}>
                                                    RA: {p.matricula}
                                                </div>
                                            </td>
                                            {!colsCollapsed && turmaDiscs.map(d => {
                                                const sim = getSimulationData(p.id, d.id);
                                                return (
                                                    <td key={`${p.id}-${d.id}`} style={{ padding: '0.5rem', borderLeft: '1px solid hsl(var(--border-light))' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.875rem', height: '2rem' }}>
                                                            <span style={{ fontSize: '0.875rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: 'hsl(var(--foreground))' }}>
                                                                {sim.mf?.toFixed(1) || '—'}
                                                            </span>
                                                            <div style={{
                                                                width: '8px', height: '8px', borderRadius: '50%',
                                                                backgroundColor: sim.color, flexShrink: 0,
                                                                boxShadow: `0 0 0 2px ${sim.color}33`
                                                            }} />
                                                        </div>
                                                    </td>
                                                );
                                            })}

                                            {/* MDS ≥5 */}
                                            <td style={{ padding: '0.5rem', borderLeft: '2px solid hsl(var(--border))', textAlign: 'center', background: 'hsl(var(--accent)/0.04)' }}>
                                                <span style={{ fontSize: '0.95rem', fontWeight: 900, color: 'hsl(142 71% 35%)', fontVariantNumeric: 'tabular-nums' }}>
                                                    {mdsAprovadas}
                                                </span>
                                            </td>
                                            {/* MDS <5 */}
                                            <td style={{ padding: '0.5rem', borderLeft: '1px solid hsl(var(--border-light))', textAlign: 'center', background: 'hsl(var(--danger)/0.03)' }}>
                                                <span style={{ fontSize: '0.95rem', fontWeight: 900, color: mdsReprovadas > 0 ? 'hsl(var(--danger))' : 'hsl(var(--muted-foreground)/0.3)', fontVariantNumeric: 'tabular-nums' }}>
                                                    {mdsReprovadas}
                                                </span>
                                            </td>
                                            {/* Resultado Geral */}
                                            <td style={{ padding: '0.5rem', borderLeft: '1px solid hsl(var(--border-light))', textAlign: 'center' }}>
                                                <span style={{
                                                    display: 'inline-block', padding: '0.2rem 0.6rem',
                                                    borderRadius: '99px', fontSize: '0.62rem', fontWeight: 800,
                                                    letterSpacing: '0.04em', textTransform: 'uppercase',
                                                    background: resSist === 'Aprovado' ? 'hsl(var(--accent)/0.12)' : resSist === 'Retido' ? 'hsl(var(--danger)/0.1)' : 'rgba(59,130,246,0.1)',
                                                    color: resSist === 'Aprovado' ? 'hsl(142 71% 30%)' : resSist === 'Retido' ? 'hsl(var(--danger))' : '#2563eb'
                                                }}>
                                                    {resSist}
                                                </span>
                                            </td>
                                            {/* Deliberação - Status */}
                                            <td style={{ padding: '0.5rem', borderLeft: '2px solid hsl(var(--border))', textAlign: 'center', background: 'hsl(var(--primary)/0.02)' }}>
                                                <button
                                                    onClick={() => handleDeliberationChange(p.id, 'deliberado', !isDeliberado)}
                                                    style={{
                                                        width: '2rem', height: '2rem', borderRadius: '0.625rem',
                                                        border: isDeliberado ? 'none' : '1.5px solid hsl(var(--border))',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        cursor: 'pointer', margin: '0 auto', transition: 'all 0.15s',
                                                        background: isDeliberado ? 'hsl(var(--primary))' : 'white',
                                                        color: isDeliberado ? 'white' : 'hsl(var(--muted-foreground)/0.4)',
                                                        boxShadow: isDeliberado ? '0 2px 8px hsl(var(--primary)/0.3)' : 'none',
                                                        transform: isDeliberado ? 'scale(1.1)' : 'scale(1)'
                                                    }}>
                                                    <ShieldCheck size={14} />
                                                </button>
                                            </td>

                                            <td style={{ padding: '0.5rem', borderLeft: '1px solid hsl(var(--border-light))', background: 'hsl(var(--primary)/0.02)' }}>
                                                {isDeliberado ? (
                                                    <select
                                                        className="select"
                                                        style={{ height: '2rem', fontSize: '0.65rem', fontWeight: 800, borderColor: 'hsl(var(--primary)/0.25)', borderRadius: '0.5rem' }}
                                                        value={conselho?.resultadoManual || 'Aprovado'}
                                                        onChange={e => handleDeliberationChange(p.id, 'resultadoManual', e.target.value)}>
                                                        <option value="Aprovado">APROVADO</option>
                                                        <option value="Reprovado">RETIDO</option>
                                                        <option value="Pendente">PENDENTE</option>
                                                    </select>
                                                ) : (
                                                    <div style={{ height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <span style={{ fontSize: '0.58rem', fontWeight: 800, color: 'hsl(var(--muted-foreground)/0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                                            sistema
                                                        </span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Retenções / Pendências */}
                                            <td style={{ padding: '0.5rem 0.875rem', borderLeft: '2px solid hsl(var(--border))' }}>
                                                {retencoes.length === 0 ? (
                                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'hsl(var(--accent))', letterSpacing: '0.04em' }}>NENHUMA</span>
                                                ) : (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                        {retencoes.map(({ nome, tipo }) => (
                                                            <span key={nome + tipo} style={{
                                                                display: 'inline-block', padding: '0.15rem 0.45rem',
                                                                borderRadius: '0.375rem', fontSize: '0.6rem', fontWeight: 800,
                                                                background: tipo === 'R' ? 'hsl(var(--danger)/0.1)' : 'rgba(59,130,246,0.1)',
                                                                color: tipo === 'R' ? 'hsl(var(--danger))' : '#2563eb',
                                                                letterSpacing: '0.02em', whiteSpace: 'nowrap'
                                                            }}>
                                                                {nome} ({tipo})
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="card" style={{
                    borderRadius: '1rem', padding: '5rem 2rem', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: '1rem',
                    border: '1px solid hsl(var(--border-light))', boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ padding: '1.5rem', background: 'hsl(var(--surface-raised))', borderRadius: '1.5rem' }}>
                        <ShieldCheck size={64} strokeWidth={1} style={{ color: 'hsl(var(--muted-foreground)/0.25)' }} />
                    </div>
                    <p style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.25em', color: 'hsl(var(--muted-foreground)/0.35)' }}>
                        Selecione uma turma para iniciar o conselho
                    </p>
                </div>
            )}
        </div>
    );
}
