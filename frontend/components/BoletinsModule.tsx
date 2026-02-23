'use client';

import { useState, useRef, useMemo } from 'react';
import { useGrades } from '@/context/GradesContext';
import { FileText, Printer, ChevronLeft, Users, FileDown } from 'lucide-react';
import { jsPDF } from 'jspdf';

export default function BoletinsModule() {
    const { turmas, protagonistas, disciplinas, lancamentos, configuracao, getMG, getMF, getSituacao, areas, subformacoes } = useGrades();
    const [selTurma, setSelTurma] = useState('');
    const [selProtagonista, setSelProtagonista] = useState('');
    const [generating, setGenerating] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    const mediaMinima = configuracao?.mediaMinima || 6.0;
    const safeProtagonistas = (Array.isArray(protagonistas) ? protagonistas : []).filter(Boolean);
    const safeTurmas = (Array.isArray(turmas) ? turmas : []).filter(Boolean);
    const safeLancamentos = (Array.isArray(lancamentos) ? lancamentos : []).filter(Boolean);
    const safeDisciplinas = (Array.isArray(disciplinas) ? disciplinas : []).filter(Boolean);

    const turmaProts = safeProtagonistas.filter(p => p?.turmaId === selTurma && p?.status === 'Cursando');
    const protagonist = safeProtagonistas.find(p => p?.id === selProtagonista);
    const turma = safeTurmas.find(t => t?.id === selTurma);

    const turmaDiscs = useMemo(() => {
        if (!turma) return [];
        let list = [];
        if (turma?.disciplinaIds && turma?.disciplinaIds?.length > 0) {
            list = safeDisciplinas.filter(d => (turma?.disciplinaIds || []).includes(d?.id));
        } else {
            // Fallback: disciplinas que já possuem lançamentos para esta turma
            const idsComLancamento = [...new Set(safeLancamentos.filter(l => l?.turmaId === selTurma).map(l => l?.disciplinaId))];
            list = safeDisciplinas.filter(d => idsComLancamento.includes(d?.id));
        }

        // Ordenar por Subformação (nome) e depois por Disciplina (nome)
        return list.sort((a, b) => {
            const areaA = areas.find(ar => ar.id === a.areaId);
            const areaB = areas.find(ar => ar.id === b.areaId);
            const sfA = subformacoes.find(sf => sf.id === areaA?.subformacaoId);
            const sfB = subformacoes.find(sf => sf.id === areaB?.subformacaoId);
            const sfNameA = sfA?.nome || '';
            const sfNameB = sfB?.nome || '';

            if (sfNameA !== sfNameB) {
                return sfNameA.localeCompare(sfNameB);
            }
            return (a.nome || '').localeCompare(b.nome || '');
        });
    }, [turma, selTurma, disciplinas, lancamentos, areas, subformacoes]);

    const getMedia = (protagonistaId: string, disciplinaId: string, bimester: 1 | 2 | 3 | 4 | 5): number | null => {
        const l = lancamentos.find(x =>
            x.protagonistaId === protagonistaId && x.disciplinaId === disciplinaId && x.bimestre === bimester
        );
        return l?.media ?? null;
    };

    const isBimDisabled = (periodicidade: string, bimestre: number) => {
        if (periodicidade === '1° Semestre') return bimestre > 2;
        if (periodicidade === '2° Semestre') return bimestre < 3;
        return false;
    };

    const formatMedia = (m: any, bim?: number) => {
        if (m === null || m === undefined || (m as any) === '') return '—';
        const val = Number(m);
        if (val === 0 && bim && bim >= 1 && bim <= 4) {
            const bimConfig = configuracao?.bimestres?.find(b => b.numero === bim);
            if (!bimConfig?.fechado) return '—';
        }
        if (val === 0 && bim === 5) {
            const bim4Config = configuracao?.bimestres?.find(b => b.numero === 4);
            if (!bim4Config?.fechado) return '—';
        }
        return val.toFixed(1);
    };
    const situacaoColor = (m: any, bim?: number) => {
        if (m === null || m === undefined || (m as any) === '') return '#999';
        const val = Number(m);
        const bimRef = bim === 5 ? 4 : bim;
        if (val === 0 && bimRef) {
            const bimConfig = configuracao?.bimestres?.find(b => b.numero === bimRef);
            if (!bimConfig?.fechado) return '#999';
        }
        return val >= (mediaMinima || 6.0) ? 'hsl(142 71% 35%)' : 'hsl(0 80% 55%)';
    };

    const handlePrint = () => window.print();

    const drawStudentBulletin = (doc: jsPDF, p: any, t: any) => {
        let currentPage = 1;

        const drawHeader = (pageNum: number) => {
            if (configuracao.logoUrl) {
                try { doc.addImage(configuracao.logoUrl, 'PNG', 14, 10, 25, 25); } catch (e) { console.error(e); }
            }
            doc.setTextColor(67, 56, 202); doc.setFontSize(24); doc.setFont('helvetica', 'bold');
            doc.text('Boletim Escolar', 105, 25, { align: 'center' });
            doc.setTextColor(100, 116, 139); doc.setFontSize(10); doc.text('SISTEMA ESCOLAR INTEGRADO - SEI', 105, 32, { align: 'center' });
            doc.setTextColor(67, 56, 202); doc.setFontSize(24); doc.text(String(configuracao.anoLetivo), 180, 25, { align: 'right' });

            if (pageNum > 1) {
                doc.setFontSize(8); doc.setTextColor(150, 150, 150);
                doc.text(`Página ${pageNum}`, 196, 40, { align: 'right' });
                doc.setFont('helvetica', 'bold');
                doc.text(`${(p?.nome || '').toUpperCase()} | Turma: ${t?.nome}`, 14, 40);
            }
        };

        const drawStudentBox = () => {
            doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240);
            doc.roundedRect(14, 45, 182, 30, 3, 3, 'FD');
            doc.setFontSize(9); doc.setTextColor(67, 56, 202); doc.text('Protagonista', 20, 53);
            doc.setTextColor(15, 23, 42); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
            doc.text((p?.nome || '').toUpperCase(), 20, 60);
            doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
            doc.text(`Matrícula: ${p.matricula || '---'} | Turma: ${t.nome}`, 20, 68);
        };

        const drawFooter = () => {
            const date = new Date().toLocaleDateString('pt-BR');
            doc.setFontSize(7); doc.setTextColor(180, 180, 180);
            doc.text(`SEI - DOCUMENTO GERADO EM ${date}`, 14, 285);
        };

        const colX = { disc: 16, b1: 80, b2: 95, b3: 110, b4: 125, mg: 140, mf: 155, des: 172, sit: 188 };
        const drawTableHeader = (yPos: number) => {
            doc.setFillColor(248, 250, 252); doc.rect(14, yPos, 182, 10, 'F');
            doc.setDrawColor(226, 232, 240); doc.line(14, yPos, 196, yPos); doc.line(14, yPos + 10, 196, yPos + 10);
            doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(71, 85, 105);
            doc.text('Disciplina', colX.disc, yPos + 6);
            doc.text('1ºB', colX.b1 + 3, yPos + 6, { align: 'center' });
            doc.text('2ºB', colX.b2 + 3, yPos + 6, { align: 'center' });
            doc.text('3ºB', colX.b3 + 3, yPos + 6, { align: 'center' });
            doc.text('4ºB', colX.b4 + 3, yPos + 6, { align: 'center' });
            doc.text('M.G', colX.mg + 3, yPos + 6, { align: 'center' });
            doc.text('M.F', colX.mf + 3, yPos + 6, { align: 'center' });
            doc.text('Desempenho', colX.des + 5, yPos + 6, { align: 'center' });
            doc.text('Situação', colX.sit + 4, yPos + 6, { align: 'center' });
            return yPos + 10;
        };

        drawHeader(currentPage);
        drawStudentBox();
        drawFooter();
        let y = drawTableHeader(85);

        turmaDiscs.forEach((d) => {
            if (y > 265) {
                doc.addPage(); currentPage++; y = 50;
                drawHeader(currentPage); drawFooter();
                y = drawTableHeader(y);
            }

            const b1 = getMedia(p.id, d.id, 1);
            const b2 = getMedia(p.id, d.id, 2);
            const b3 = getMedia(p.id, d.id, 3);
            const b4 = getMedia(p.id, d.id, 4);
            const mfValue = getMF(p.id, d.id);
            const mgValue = getMG(p.id, d.id);
            const sit = getSituacao(p.id, d.id) || '---';

            const effectiveGrade = mfValue ?? mgValue;
            let des = '---';
            if (effectiveGrade !== null) {
                des = effectiveGrade >= 8 ? 'ÓTIMO' : effectiveGrade >= 6 ? 'BOM' : effectiveGrade >= 5 ? 'REGULAR' : 'INSUFICIENTE';
            }

            doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(15, 23, 42);
            doc.text((d.nome || '').substring(0, 35), colX.disc, y + 5);
            doc.setFontSize(8);
            doc.text(formatMedia(b1, 1), colX.b1 + 3, y + 5, { align: 'center' });
            doc.text(formatMedia(b2, 2), colX.b2 + 3, y + 5, { align: 'center' });
            doc.text(formatMedia(b3, 3), colX.b3 + 3, y + 5, { align: 'center' });
            doc.text(formatMedia(b4, 4), colX.b4 + 3, y + 5, { align: 'center' });
            doc.text(mgValue !== null ? mgValue.toFixed(1) : '—', colX.mg + 3, y + 5, { align: 'center' });
            doc.setFont('helvetica', 'bold'); doc.text(formatMedia(mfValue), colX.mf + 3, y + 5, { align: 'center' });
            doc.setFont('helvetica', 'normal'); doc.setFontSize(6);
            doc.text(des, colX.des + 5, y + 5, { align: 'center' });
            doc.text(String(sit).toUpperCase(), colX.sit + 4, y + 5, { align: 'center' });
            doc.setDrawColor(241, 245, 249); doc.line(14, y + 8, 196, y + 8);
            y += 8;
        });
    };

    const generatePDF = async () => {
        if (!protagonist || !turma) return;
        setGenerating(true);
        try {
            const doc = new jsPDF();
            drawStudentBulletin(doc, protagonist, turma);
            doc.save(`Boletim_${(protagonist?.nome || 'documento').replace(/\s/g, '_')}.pdf`);
        } finally { setGenerating(false); }
    };

    const generateBatchPDF = async () => {
        if (turmaProts.length === 0 || !turma) return;
        setGenerating(true);
        try {
            const doc = new jsPDF();
            turmaProts.forEach((p, idx) => {
                if (idx > 0) doc.addPage();
                drawStudentBulletin(doc, p, turma);
            });
            doc.save(`Boletins_Turma_${turma.nome.replace(/\s/g, '_')}.pdf`);
        } finally { setGenerating(false); }
    };

    const mediasDiscs = protagonist && turmaDiscs.map(d => {
        const ma = getMF(protagonist.id, d.id);
        const sit = getSituacao(protagonist.id, d.id);
        return { disciplina: d, media: ma, situacao: sit };
    });

    const mediaGeral = mediasDiscs && mediasDiscs.filter(x => x.media !== null).length > 0
        ? (mediasDiscs.filter(x => x.media !== null).reduce((s, x) => s + Number(x.media ?? 0), 0) / mediasDiscs.filter(x => x.media !== null).length)
        : null;

    const situacaoGeral = mediaGeral !== null ? (mediaGeral >= 5.0 ? 'Aprovado' : 'Reprovado') : '—';

    return (
        <>
            {/* Selectors */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                    <div className="card-title">Gerar Boletim Profissional</div>
                </div>
                <div className="card-body">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-end' }}>
                        <div className="form-group" style={{ flex: '1', minWidth: '240px', maxWidth: '300px' }}>
                            <label className="label">Turma</label>
                            <select className="select" value={selTurma} onChange={e => { setSelTurma(e.target.value); setSelProtagonista(''); }}>
                                <option value="">Selecione a turma...</option>
                                {safeTurmas.map(t => <option key={t?.id} value={t?.id}>{t?.nome} ({t?.anoLetivo})</option>)}
                            </select>
                        </div>
                        {selTurma && (
                            <div className="form-group" style={{ flex: '1', minWidth: '240px', maxWidth: '300px' }}>
                                <label className="label">Protagonista Individual</label>
                                <select className="select" value={selProtagonista} onChange={e => setSelProtagonista(e.target.value)}>
                                    <option value="">Selecione o protagonista...</option>
                                    {turmaProts.map(p => <option key={p?.id} value={p?.id}>{p?.nome}</option>)}
                                </select>
                            </div>
                        )}
                        {selTurma && (
                            <button
                                className="btn btn-secondary"
                                onClick={generateBatchPDF}
                                disabled={generating || turmaProts.length === 0}
                                style={{ height: '2.75rem', padding: '0 1.5rem', whiteSpace: 'nowrap' }}
                            >
                                <FileDown size={18} /> {generating ? 'Gerando...' : 'Gerar Boletins da Turma (Lote)'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {!selTurma ? (
                <div className="empty-state card" style={{ padding: '4rem' }}>
                    <FileText size={56} className="empty-state-icon" style={{ color: 'var(--primary)', opacity: 0.2 }} />
                    <h3>Selecione uma turma</h3>
                    <p>Escolha a turma e depois o protagonista para gerar o boletim profissional.</p>
                </div>
            ) : (!protagonist || !turma) ? (
                <div className="empty-state card" style={{ padding: '4rem' }}>
                    <div className="spinner" style={{ marginBottom: '1rem' }}></div>
                    <h3>Carregando dados...</h3>
                    <p>Buscando informações do protagonista e da turma.</p>
                </div>
            ) : (
                <>
                    <div className="card no-print" style={{ marginBottom: '1rem', background: 'hsl(var(--primary)/0.05)', borderColor: 'hsl(var(--primary)/0.2)' }}>
                        <div style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setSelProtagonista('')}>
                                <ChevronLeft size={16} /> Voltar
                            </button>
                            <span style={{ flex: 1, fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                                Pré-visualização do boletim de <strong style={{ color: 'hsl(var(--foreground))' }}>{(protagonist?.nome || '').toUpperCase()}</strong>
                            </span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
                                    <Printer size={16} /> Impressão Rápida
                                </button>
                                <button className="btn btn-primary btn-sm" onClick={generatePDF} disabled={generating}>
                                    <FileDown size={16} /> {generating ? 'Ocupado...' : 'Download PDF Premium'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Boletim Preview */}
                    <div ref={printRef} className="card" style={{ maxWidth: '800px', margin: '0 auto', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)' }}>
                        {/* Header Model Style */}
                        <div style={{
                            background: 'white',
                            borderRadius: 'var(--radius) var(--radius) 0 0',
                            padding: '2.5rem 2.5rem 1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid hsl(var(--border-light))'
                        }}>
                            <div style={{ width: '100px' }}>
                                {configuracao.logoUrl ? (
                                    <img src={configuracao.logoUrl} alt="Logo" style={{ maxHeight: 70, objectFit: 'contain' }} />
                                ) : (
                                    <div style={{ width: 60, height: 60, background: 'hsl(var(--primary)/0.1)', borderRadius: '12px' }}></div>
                                )}
                            </div>
                            <div style={{ textAlign: 'center', flex: 1 }}>
                                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#4338ca' }}>Boletim Escolar</h2>
                                <p style={{ color: 'hsl(var(--muted-foreground))', marginTop: '0.25rem', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                                    {configuracao.nomeEscola.toUpperCase()}
                                </p>
                            </div>
                            <div style={{ width: '100px', textAlign: 'right' }}>
                                <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#4338ca' }}>{configuracao.anoLetivo}</span>
                            </div>
                        </div>

                        {/* Student info box Model */}
                        <div style={{ padding: '1.5rem 2.5rem', borderBottom: '1px solid hsl(var(--border-light))' }}>
                            <div style={{
                                background: 'hsl(var(--primary)/0.03)',
                                borderRadius: '1.5rem',
                                padding: '1.5rem 2rem',
                                border: '1px solid hsl(var(--primary)/0.1)'
                            }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4338ca', marginBottom: '0.25rem' }}>Protagonista</div>
                                <div style={{ fontWeight: 800, fontSize: '1.4rem', color: 'hsl(var(--foreground))', marginBottom: '0.5rem' }}>
                                    {protagonist?.nome || '---'}
                                </div>
                                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
                                    <span>Matrícula: <strong>{protagonist?.matricula || '---'}</strong></span>
                                    <span>Turma: <strong>{turma?.nome}</strong></span>
                                </div>
                            </div>
                        </div>

                        {/* Grades table styling */}
                        <div style={{ padding: '1.5rem' }}>
                            <table className="tech-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '1rem 0.75rem', textAlign: 'left', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem' }}>Disciplina</th>
                                        {[1, 2, 3, 4].map(b => (
                                            <th key={b} style={{ padding: '1rem 0.5rem', textAlign: 'center', fontWeight: 800, fontSize: '0.7rem' }}>{b}º Bim</th>
                                        ))}
                                        <th style={{ padding: '1rem 0.5rem', textAlign: 'center', fontWeight: 800, fontSize: '0.7rem' }}>RF</th>
                                        <th style={{ padding: '1rem 0.75rem', textAlign: 'center', fontWeight: 800, fontSize: '0.7rem', background: 'hsl(var(--primary)/0.05)', borderRadius: '0.5rem 0.5rem 0 0' }}>Média Final</th>
                                        <th style={{ padding: '1rem 0.75rem', textAlign: 'center', fontWeight: 800, fontSize: '0.7rem' }}>Desempenho</th>
                                        <th style={{ padding: '1rem 0.75rem', textAlign: 'center', fontWeight: 800, fontSize: '0.7rem' }}>Situação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {turmaDiscs.length === 0 ? (
                                        <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>Nenhuma média lançada para esta turma.</td></tr>
                                    ) : (turmaDiscs || []).map((d, i) => {
                                        const b1 = getMedia(protagonist.id, d.id, 1);
                                        const b2 = getMedia(protagonist.id, d.id, 2);
                                        const b3 = getMedia(protagonist.id, d.id, 3);
                                        const b4 = getMedia(protagonist.id, d.id, 4);
                                        const rf = getMedia(protagonist.id, d.id, 5);
                                        const mg = getMG(protagonist.id, d.id);
                                        const mf = getMF(protagonist.id, d.id);
                                        const sit = getSituacao(protagonist.id, d.id);
                                        const effectiveGrade = mf ?? mg;
                                        const performance = effectiveGrade === null ? '---' : effectiveGrade >= 8 ? 'ÓTIMO' : effectiveGrade >= 6 ? 'BOM' : effectiveGrade >= 5 ? 'REGULAR' : 'INSUFICIENTE';
                                        return (
                                            <tr key={d.id} style={{ background: i % 2 === 0 ? 'white' : 'hsl(var(--surface-raised)/0.5)' }}>
                                                <td style={{ padding: '0.875rem 0.75rem', fontWeight: 700, borderRadius: '0.5rem 0 0 0.5rem' }}>
                                                    {d.nome}
                                                    {d.periodicidade !== 'Anual' && (
                                                        <span style={{ marginLeft: '0.5rem', fontSize: '0.6rem', padding: '0.1rem 0.4rem', border: '1px solid hsl(var(--border))', borderRadius: '4px', textTransform: 'uppercase' }}>{d.periodicidade}</span>
                                                    )}
                                                </td>
                                                {[1, 2, 3, 4].map((b) => {
                                                    const disabled = isBimDisabled(d.periodicidade, b);
                                                    const m = getMedia(protagonist!.id, d.id, b as 1 | 2 | 3 | 4);
                                                    return (
                                                        <td key={b} style={{
                                                            padding: '0.875rem 0.5rem',
                                                            textAlign: 'center',
                                                            fontWeight: 600,
                                                            color: disabled ? 'transparent' : situacaoColor(m, b as any),
                                                            background: disabled ? 'hsl(var(--muted)/0.1)' : 'transparent'
                                                        }}>
                                                            {disabled ? '' : formatMedia(m, b as any)}
                                                        </td>
                                                    );
                                                })}
                                                <td style={{ padding: '0.875rem 0.5rem', textAlign: 'center', fontWeight: 600, color: situacaoColor(rf, 5) }}>
                                                    {formatMedia(rf, 5)}
                                                </td>
                                                <td style={{ padding: '0.875rem 0.75rem', textAlign: 'center', fontWeight: 900, fontSize: '1rem', color: situacaoColor(effectiveGrade), background: 'hsl(var(--primary)/0.03)' }}>
                                                    {formatMedia(mf ?? mg)}
                                                </td>
                                                <td style={{ padding: '0.875rem 0.75rem', textAlign: 'center', fontWeight: 800, fontSize: '0.75rem', color: situacaoColor(effectiveGrade) }}>
                                                    {performance}
                                                </td>
                                                <td style={{ padding: '0.875rem 0.75rem', textAlign: 'center', borderRadius: '0 0.5rem 0.5rem 0' }}>
                                                    <span style={{
                                                        display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '6px',
                                                        fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                                                        background: sit === 'Aprovado' || sit === 'Aprovar' ? 'hsl(142 71% 10%)' :
                                                            sit === 'Retido' || sit === 'Reprovado' || sit === 'Inapto' ? 'hsl(0 84% 10%)' :
                                                                sit === 'Recuperação' || sit === 'Pendente' ? 'hsl(38 92% 10%)' : '#f5f5f5',
                                                        color: sit === 'Aprovado' || sit === 'Aprovar' ? '#22c55e' :
                                                            sit === 'Retido' || sit === 'Reprovado' || sit === 'Inapto' ? '#ef4444' :
                                                                sit === 'Recuperação' || sit === 'Pendente' ? '#f59e0b' : '#999'
                                                    }}>
                                                        {sit || '---'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Summary results or stats */}
                        <div style={{ margin: '0 1.5rem 2rem', padding: '1.25rem', borderRadius: '1rem', background: 'hsl(var(--primary)/0.05)', border: '1px dashed hsl(var(--primary)/0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '2rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' }}>Média Geral</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: situacaoColor(mediaGeral) }}>{mediaGeral?.toFixed(1) || '—'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' }}>Aproveitamento</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'hsl(var(--foreground))' }}>{mediaGeral ? `${Math.round((mediaGeral / 10) * 100)}%` : '—'}</div>
                                </div>
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))', textAlign: 'right', maxWidth: '300px' }}>
                                Este boletim resume o desempenho acadêmico do protagonista conforme os registros do sistema SEI.
                            </div>
                        </div>

                        {/* Footer styling */}
                        <div style={{
                            borderTop: '1px solid hsl(var(--border))',
                            padding: '1.25rem 2rem',
                            display: 'flex', justifyContent: 'space-between',
                            fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))',
                            background: 'white',
                            borderRadius: '0 0 var(--radius) var(--radius)'
                        }}>
                            <div style={{ display: 'flex', gap: '1.5rem' }}>
                                <span><strong>Média mínima:</strong> {mediaMinima.toFixed(1)}</span>
                                <span><strong>Data de emissão:</strong> {new Date().toLocaleDateString('pt-BR')}</span>
                            </div>
                            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>SISTEMA SEI</span>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
