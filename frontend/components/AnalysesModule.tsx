'use client';

import { useMemo, useState } from 'react';
import { useGrades } from '@/context/GradesContext';
import { BarChart3, TrendingUp, Users, CheckCircle, XCircle, Award } from 'lucide-react';

function SimpleBar({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ flex: 1, height: '10px', background: 'hsl(var(--border))', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '99px', transition: 'width 0.5s ease' }} />
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, minWidth: '36px', textAlign: 'right' }}>{value.toFixed(1)}</span>
        </div>
    );
}

export default function AnalysesModule() {
    const { turmas, disciplinas, protagonistas, lancamentos, configuracao, areas, subformacoes, formacoes } = useGrades();
    const [filterTurma, setFilterTurma] = useState('');
    const [filterFormacao, setFilterFormacao] = useState('');
    const [filterSubformacao, setFilterSubformacao] = useState('');
    const [filterArea, setFilterArea] = useState('');
    const [filterDisciplina, setFilterDisciplina] = useState('');
    const [filterBimestre, setFilterBimestre] = useState<string>('');

    const safeLancamentos = (Array.isArray(lancamentos) ? lancamentos : []).filter(Boolean);
    const safeDisciplinas = (Array.isArray(disciplinas) ? disciplinas : []).filter(Boolean);
    const safeTurmas = (Array.isArray(turmas) ? turmas : []).filter(Boolean);
    const safeAreas = (Array.isArray(areas) ? areas : []).filter(Boolean);
    const safeSubformacoes = (Array.isArray(subformacoes) ? subformacoes : []).filter(Boolean);
    const safeFormacoes = (Array.isArray(formacoes) ? formacoes : []).filter(Boolean);
    const mediaMinima = configuracao?.mediaMinima || 6.0;

    // Mapping hierarchy for easier filtering
    const hierarchyMap = useMemo(() => {
        const map: Record<string, { areaId: string; subId: string; formId: string }> = {};
        safeDisciplinas.forEach(d => {
            const area = safeAreas.find((a: any) => a.id === d.areaId);
            const sub = safeSubformacoes.find((s: any) => s.id === area?.subformacaoId);
            map[d.id] = {
                areaId: d.areaId,
                subId: area?.subformacaoId || '',
                formId: sub?.formacaoId || ''
            };
        });
        return map;
    }, [safeDisciplinas, safeAreas, safeSubformacoes]);

    const filteredLans = useMemo(() => safeLancamentos.filter(l => {
        if (!l) return false;
        if (filterTurma && l.turmaId !== filterTurma) return false;

        const h = hierarchyMap[l.disciplinaId];
        if (filterFormacao && h?.formId !== filterFormacao) return false;
        if (filterSubformacao && h?.subId !== filterSubformacao) return false;
        if (filterArea && h?.areaId !== filterArea) return false;
        if (filterDisciplina && l.disciplinaId !== filterDisciplina) return false;

        if (filterBimestre && String(l.bimestre) !== filterBimestre) return false;
        return l.media !== null;
    }), [safeLancamentos, filterTurma, filterFormacao, filterSubformacao, filterArea, filterDisciplina, filterBimestre, hierarchyMap]);

    const totalLancamentos = filteredLans.length;
    const aprovados = filteredLans.filter(l => (l.media ?? 0) >= mediaMinima).length;
    const reprovados = filteredLans.filter(l => (l.media ?? 0) < mediaMinima).length;
    const pctAprovacao = totalLancamentos > 0 ? ((aprovados / totalLancamentos) * 100).toFixed(1) : '0.0';
    const mediaGeral = totalLancamentos > 0
        ? (filteredLans.reduce((s, l) => s + Number(l.media ?? 0), 0) / totalLancamentos).toFixed(1)
        : '—';

    // Media por disciplina
    const mediasByDisciplina = useMemo(() => {
        const map: Record<string, { sum: number; count: number; nome: string }> = {};
        filteredLans.forEach(l => {
            if (!map[l.disciplinaId]) {
                map[l.disciplinaId] = { sum: 0, count: 0, nome: l?.disciplinaNome || safeDisciplinas.find(d => d?.id === l?.disciplinaId)?.nome || l?.disciplinaId };
            }
            map[l.disciplinaId].sum += Number(l.media ?? 0);
            map[l.disciplinaId].count++;
        });
        return Object.entries(map)
            .map(([id, { sum, count, nome }]) => ({ id, nome, media: sum / count }))
            .sort((a, b) => b.media - a.media);
    }, [filteredLans, disciplinas]);

    // Médias por bimestre (para Evolução)
    const mediasByBimestre = useMemo(() => {
        return ([1, 2, 3, 4] as const).map(b => {
            const lans = filteredLans.filter(l => l.bimestre === b);
            return {
                bimestre: b,
                media: lans.length > 0 ? lans.reduce((s, l) => s + Number(l.media ?? 0), 0) / lans.length : null,
                count: lans.length
            };
        });
    }, [filteredLans]);

    // Media por Área
    const mediasByArea = useMemo(() => {
        const map: Record<string, { sum: number; count: number; nome: string }> = {};
        filteredLans.forEach(l => {
            const h = hierarchyMap[l.disciplinaId];
            if (h?.areaId) {
                if (!map[h.areaId]) {
                    const area = safeAreas.find(a => a.id === h.areaId);
                    map[h.areaId] = { sum: 0, count: 0, nome: area?.nome || h.areaId };
                }
                map[h.areaId].sum += Number(l.media ?? 0);
                map[h.areaId].count++;
            }
        });
        return Object.entries(map)
            .map(([id, { sum, count, nome }]) => ({ id, nome, media: sum / count }))
            .sort((a, b) => b.media - a.media);
    }, [filteredLans, safeAreas, hierarchyMap]);

    // Media por turma
    const mediasByTurma = useMemo(() => {
        const map: Record<string, { sum: number; count: number; nome: string }> = {};
        filteredLans.forEach(l => {
            if (!map[l.turmaId]) {
                map[l.turmaId] = { sum: 0, count: 0, nome: l?.turmaNome || safeTurmas.find(t => t?.id === l?.turmaId)?.nome || l?.turmaId };
            }
            map[l.turmaId].sum += Number(l.media ?? 0);
            map[l.turmaId].count++;
        });
        return Object.entries(map).map(([id, { sum, count, nome }]) => ({ id, nome, media: sum / count })).sort((a, b) => b.media - a.media);
    }, [filteredLans, turmas]);

    const maxMedia = Math.max(...mediasByDisciplina.map(d => d.media), ...mediasByArea.map(a => a.media), 10);

    return (
        <>
            {/* Filters */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="filters-bar" style={{ border: 'none' }}>
                    <select className="select" style={{ width: 'auto' }} value={filterTurma} onChange={e => setFilterTurma(e.target.value)}>
                        <option value="">Todas as turmas</option>
                        {safeTurmas.map(t => <option key={t?.id} value={t?.id}>{t?.nome}</option>)}
                    </select>

                    <select className="select" style={{ width: 'auto' }} value={filterFormacao} onChange={e => { setFilterFormacao(e.target.value); setFilterSubformacao(''); setFilterArea(''); setFilterDisciplina(''); }}>
                        <option value="">Todas as formações</option>
                        {safeFormacoes.map((f: any) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                    </select>

                    <select className="select" style={{ width: 'auto' }} value={filterSubformacao} onChange={e => { setFilterSubformacao(e.target.value); setFilterArea(''); setFilterDisciplina(''); }}>
                        <option value="">Todas as subformações</option>
                        {safeSubformacoes
                            .filter((s: any) => !filterFormacao || s.formacaoId === filterFormacao)
                            .map((s: any) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                    </select>

                    <select className="select" style={{ width: 'auto' }} value={filterArea} onChange={e => { setFilterArea(e.target.value); setFilterDisciplina(''); }}>
                        <option value="">Todas as áreas</option>
                        {safeAreas
                            .filter((a: any) => !filterSubformacao || a.subformacaoId === filterSubformacao)
                            .map((a: any) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                    </select>

                    <select className="select" style={{ width: 'auto' }} value={filterDisciplina} onChange={e => setFilterDisciplina(e.target.value)}>
                        <option value="">Todas as disciplinas</option>
                        {safeDisciplinas
                            .filter(d => !filterArea || d.areaId === filterArea)
                            .map(d => <option key={d?.id} value={d?.id}>{d?.nome}</option>)}
                    </select>

                    <select className="select" style={{ width: 'auto' }} value={filterBimestre} onChange={e => setFilterBimestre(e.target.value)}>
                        <option value="">Todos os bimestres</option>
                        {[1, 2, 3, 4].map(b => <option key={b} value={b}>{b}º Bimestre</option>)}
                    </select>
                </div>
            </div>

            {/* KPI stats */}
            <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card blue">
                    <span className="stat-card-label">Média Geral</span>
                    <span className="stat-card-value">{mediaGeral}</span>
                    <TrendingUp size={48} className="stat-card-icon" />
                </div>
                <div className="stat-card green">
                    <span className="stat-card-label">Aprovações</span>
                    <span className="stat-card-value">{aprovados}</span>
                    <CheckCircle size={48} className="stat-card-icon" />
                </div>
                <div className="stat-card red">
                    <span className="stat-card-label">Reprovações</span>
                    <span className="stat-card-value">{reprovados}</span>
                    <XCircle size={48} className="stat-card-icon" />
                </div>
                <div className="stat-card amber">
                    <span className="stat-card-label">Taxa de Aprovação</span>
                    <span className="stat-card-value">{pctAprovacao}%</span>
                    <Award size={48} className="stat-card-icon" />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Aprovação/Reprovação donut */}
                <div className="card">
                    <div className="card-header"><div className="card-title">Aprovação vs Reprovação</div></div>
                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                        {totalLancamentos === 0 ? (
                            <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>Nenhum dado disponível.</p>
                        ) : (
                            <>
                                <svg viewBox="0 0 120 120" width={180} height={180}>
                                    {(() => {
                                        const r = 48, cx = 60, cy = 60;
                                        const circ = 2 * Math.PI * r;
                                        const aprovPct = aprovados / totalLancamentos;
                                        const aprovDash = circ * aprovPct;
                                        const reprovDash = circ * (1 - aprovPct);
                                        const rotAprov = -90;
                                        const rotReprov = rotAprov + (aprovPct * 360);
                                        return (
                                            <>
                                                <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={16} />
                                                {aprovados > 0 && (
                                                    <circle cx={cx} cy={cy} r={r} fill="none"
                                                        stroke="hsl(var(--accent))" strokeWidth={16}
                                                        strokeDasharray={`${aprovDash} ${circ - aprovDash}`}
                                                        strokeDashoffset={circ * 0.25}
                                                        strokeLinecap="round"
                                                    />
                                                )}
                                                {reprovados > 0 && aprovados > 0 && (
                                                    <circle cx={cx} cy={cy} r={r} fill="none"
                                                        stroke="hsl(var(--danger))" strokeWidth={16}
                                                        strokeDasharray={`${reprovDash} ${circ - reprovDash}`}
                                                        strokeDashoffset={circ * 0.25 - aprovDash}
                                                        strokeLinecap="round"
                                                    />
                                                )}
                                                {reprovados > 0 && aprovados === 0 && (
                                                    <circle cx={cx} cy={cy} r={r} fill="none"
                                                        stroke="hsl(var(--danger))" strokeWidth={16}
                                                        strokeDasharray={`${circ} 0`}
                                                        strokeDashoffset={circ * 0.25}
                                                    />
                                                )}
                                                <text x={cx} y={cy - 6} textAnchor="middle" fontSize="20" fontWeight="800" fill="hsl(var(--foreground))">{pctAprovacao}%</text>
                                                <text x={cx} y={cy + 14} textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">aprovação</text>
                                            </>
                                        );
                                    })()}
                                </svg>
                                <div style={{ display: 'flex', gap: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'hsl(var(--accent))' }} />
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Aprovados: {aprovados}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'hsl(var(--danger))' }} />
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Reprovados: {reprovados}</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Evolução das Médias */}
                <div className="card">
                    <div className="card-header"><div className="card-title">Evolução das Médias</div></div>
                    <div className="card-body">
                        <div style={{ height: '180px', position: 'relative', marginTop: '1rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: '2rem' }}>
                            {/* Grid lines */}
                            {[0, 2.5, 5, 7.5, 10].map(y => (
                                <div key={y} style={{ position: 'absolute', width: '100%', height: '1px', background: 'hsl(var(--border)/0.5)', bottom: `${(y / 10) * 100}%` }}>
                                    <span style={{ position: 'absolute', left: '-1.5rem', top: '-0.5rem', fontSize: '0.65rem', color: 'hsl(var(--muted-foreground))' }}>{y}</span>
                                </div>
                            ))}

                            {/* Line / Dots */}
                            {mediasByBimestre.map((m, i) => {
                                const next = mediasByBimestre[i + 1];
                                const hasValue = m.media !== null;
                                return (
                                    <div key={m.bimestre} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', height: '100%' }}>
                                        {hasValue && (
                                            <>
                                                <div style={{
                                                    position: 'absolute', bottom: `${(m.media! / 10) * 100}%`, width: '10px', height: '10px',
                                                    borderRadius: '50%', background: m.media! >= mediaMinima ? 'hsl(var(--accent))' : 'hsl(var(--danger))',
                                                    border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', zIndex: 2
                                                }} />
                                                {next && next.media !== null && (
                                                    <div style={{
                                                        position: 'absolute', bottom: `${(m.media! / 10) * 100}%`, left: '50%', width: '100%',
                                                        height: '2px', background: 'hsl(var(--accent)/0.3)',
                                                        transform: `rotate(${Math.atan2(((next.media! - m.media!) / 10) * 180, 80) * (180 / Math.PI)}deg)`,
                                                        transformOrigin: 'left center', zIndex: 1
                                                    }} />
                                                )}
                                                <div style={{ position: 'absolute', bottom: `${(m.media! / 10) * 100 + 5}%`, fontSize: '0.75rem', fontWeight: 700 }}>{m.media!.toFixed(1)}</div>
                                            </>
                                        )}
                                        <div style={{ position: 'absolute', bottom: '-1.5rem', fontSize: '0.8rem', fontWeight: 600 }}>{m.bimestre}º Bim</div>
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ marginTop: '2rem', padding: '0.625rem', background: 'hsl(var(--surface-raised))', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
                            Média mínima: <strong style={{ color: 'hsl(var(--foreground))' }}>{mediaMinima.toFixed(1)}</strong>
                        </div>
                    </div>
                </div>
            </div>

            {/* Médias por Área */}
            {mediasByArea.length > 0 && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-header">
                        <div className="card-title">Desempenho por Área de Conhecimento</div>
                        <div className="card-subtitle">{mediasByArea.length} áreas analisadas</div>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            {mediasByArea.map(a => (
                                <div key={a.id} style={{ background: 'hsl(var(--surface-raised)/0.3)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid hsl(var(--border))' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                                        <span>{a.nome}</span>
                                        <span style={{ color: a.media >= mediaMinima ? 'hsl(var(--accent))' : 'hsl(var(--danger))' }}>
                                            {a.media.toFixed(1)}
                                        </span>
                                    </div>
                                    <SimpleBar value={a.media} max={10} color={a.media >= mediaMinima ? 'hsl(var(--accent))' : 'hsl(var(--danger))'} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Médias por disciplina */}
            {mediasByDisciplina.length > 0 && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-header">
                        <div className="card-title">Desempenho por Disciplina</div>
                        <div className="card-subtitle">{mediasByDisciplina.length} disciplinas com lançamentos</div>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                            {mediasByDisciplina.map(d => (
                                <div key={d.id}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                                        <span>{d.nome}</span>
                                        <span className={`badge ${d.media >= mediaMinima ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.75rem' }}>
                                            {d.media.toFixed(1)}
                                        </span>
                                    </div>
                                    <SimpleBar value={d.media} max={maxMedia} color={d.media >= mediaMinima ? 'hsl(var(--accent))' : 'hsl(var(--danger))'} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Comparativo por turma */}
            {mediasByTurma.length > 1 && (
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Comparativo por Turma</div>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                            {mediasByTurma.map((t, i) => (
                                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: `hsl(${231 + i * 30} 48% 48%)`, flexShrink: 0 }} />
                                    <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600 }}>{t.nome}</span>
                                    <div style={{ flex: 2 }}>
                                        <SimpleBar value={t.media} max={10} color={`hsl(${231 + i * 30} 48% 48%)`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {totalLancamentos === 0 && (
                <div className="empty-state card" style={{ padding: '4rem' }}>
                    <BarChart3 size={56} className="empty-state-icon" />
                    <h3>Sem dados para análise</h3>
                    <p>Lance médias no módulo "Lançamento de Médias" para ver as análises aqui.</p>
                </div>
            )}
        </>
    );
}
