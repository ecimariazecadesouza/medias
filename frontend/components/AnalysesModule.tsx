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
    const { turmas, disciplinas, protagonistas, lancamentos, configuracao } = useGrades();
    const [filterTurma, setFilterTurma] = useState('');
    const [filterDisciplina, setFilterDisciplina] = useState('');
    const [filterBimestre, setFilterBimestre] = useState<string>('');

    const mediaMinima = configuracao.mediaMinima;

    const filteredLans = useMemo(() => lancamentos.filter(l => {
        if (filterTurma && l.turmaId !== filterTurma) return false;
        if (filterDisciplina && l.disciplinaId !== filterDisciplina) return false;
        if (filterBimestre && String(l.bimestre) !== filterBimestre) return false;
        return l.media !== null;
    }), [lancamentos, filterTurma, filterDisciplina, filterBimestre]);

    const totalLancamentos = filteredLans.length;
    const aprovados = filteredLans.filter(l => (l.media ?? 0) >= mediaMinima).length;
    const reprovados = filteredLans.filter(l => (l.media ?? 0) < mediaMinima).length;
    const pctAprovacao = totalLancamentos > 0 ? ((aprovados / totalLancamentos) * 100).toFixed(1) : '0.0';
    const mediaGeral = totalLancamentos > 0
        ? (filteredLans.reduce((s, l) => s + (l.media ?? 0), 0) / totalLancamentos).toFixed(2)
        : '—';

    // Media por disciplina
    const mediasByDisciplina = useMemo(() => {
        const map: Record<string, { sum: number; count: number; nome: string }> = {};
        filteredLans.forEach(l => {
            if (!map[l.disciplinaId]) map[l.disciplinaId] = { sum: 0, count: 0, nome: l.disciplinaNome || disciplinas.find(d => d.id === l.disciplinaId)?.nome || l.disciplinaId };
            map[l.disciplinaId].sum += l.media ?? 0;
            map[l.disciplinaId].count++;
        });
        return Object.entries(map)
            .map(([id, { sum, count, nome }]) => ({ id, nome, media: sum / count }))
            .sort((a, b) => b.media - a.media);
    }, [filteredLans, disciplinas]);

    // Médias por bimestre
    const mediasByBimestre = useMemo(() => {
        return ([1, 2, 3, 4] as const).map(b => {
            const lans = filteredLans.filter(l => l.bimestre === b);
            return { bimestre: b, media: lans.length > 0 ? lans.reduce((s, l) => s + (l.media ?? 0), 0) / lans.length : null };
        });
    }, [filteredLans]);

    // Media por turma
    const mediasByTurma = useMemo(() => {
        const map: Record<string, { sum: number; count: number; nome: string }> = {};
        filteredLans.forEach(l => {
            if (!map[l.turmaId]) map[l.turmaId] = { sum: 0, count: 0, nome: l.turmaNome || turmas.find(t => t.id === l.turmaId)?.nome || l.turmaId };
            map[l.turmaId].sum += l.media ?? 0;
            map[l.turmaId].count++;
        });
        return Object.entries(map).map(([id, { sum, count, nome }]) => ({ id, nome, media: sum / count })).sort((a, b) => b.media - a.media);
    }, [filteredLans, turmas]);

    const maxMedia = Math.max(...mediasByDisciplina.map(d => d.media), 10);

    return (
        <>
            {/* Filters */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="filters-bar" style={{ border: 'none' }}>
                    <select className="select" style={{ width: 'auto' }} value={filterTurma} onChange={e => setFilterTurma(e.target.value)}>
                        <option value="">Todas as turmas</option>
                        {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                    <select className="select" style={{ width: 'auto' }} value={filterDisciplina} onChange={e => setFilterDisciplina(e.target.value)}>
                        <option value="">Todas as disciplinas</option>
                        {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
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

                {/* Médias por bimestre */}
                <div className="card">
                    <div className="card-header"><div className="card-title">Médias por Bimestre</div></div>
                    <div className="card-body">
                        {mediasByBimestre.map(({ bimestre, media }) => (
                            <div key={bimestre} style={{ marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                                    <span>{bimestre}º Bimestre</span>
                                    <span style={{ color: media === null ? 'hsl(var(--muted-foreground))' : media >= mediaMinima ? 'hsl(var(--accent))' : 'hsl(var(--danger))' }}>
                                        {media === null ? '—' : media.toFixed(2)}
                                    </span>
                                </div>
                                {media !== null ? (
                                    <div style={{ height: '8px', background: 'hsl(var(--border))', borderRadius: '99px', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${(media / 10) * 100}%`, height: '100%', borderRadius: '99px',
                                            background: media >= mediaMinima ? 'hsl(var(--accent))' : 'hsl(var(--danger))',
                                            transition: 'width 0.5s ease'
                                        }} />
                                    </div>
                                ) : (
                                    <div style={{ height: '8px', background: 'hsl(var(--border))', borderRadius: '99px' }} />
                                )}
                            </div>
                        ))}
                        <div style={{ marginTop: '1rem', padding: '0.625rem', background: 'hsl(var(--surface-raised))', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
                            Média mínima: <strong style={{ color: 'hsl(var(--foreground))' }}>{mediaMinima.toFixed(1)}</strong>
                        </div>
                    </div>
                </div>
            </div>

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
                                            {d.media.toFixed(2)}
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
