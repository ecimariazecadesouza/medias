import React from 'react';
import { useSchool } from '../context/SchoolContext';
import { jsPDF } from 'jspdf';
import { FileDown, Printer } from 'lucide-react';
import { Protagonist, Turma, Disciplina } from '../lib/types';

interface ReportPreviewProps {
    student: Protagonist;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({ student }) => {
    const { subjects, classes, calculateStats } = useSchool();
    const studentClass = classes.find((c: Turma) => c.id === student.turmaId);

    const generatePDF = async () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(79, 70, 229); // primary color
        doc.text('BOLETIM ESCOLAR', 105, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // secondary
        doc.text('Sistema Escolar Integrado (SEI)', 105, 28, { align: 'center' });

        // Student Info Box
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 40, 182, 30, 3, 3, 'FD');

        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.setFont('helvetica', 'bold');
        doc.text(`Aluno: ${(student.nome || '').toUpperCase()}`, 20, 50);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`RA: ${student.matricula}`, 20, 60);
        doc.text(`Turma: ${studentClass?.nome || 'N/A'}`, 100, 60);
        doc.text(`Ano Letivo: ${studentClass?.anoLetivo || '2024'}`, 150, 60);

        // Table Header
        let y = 80;
        doc.setFillColor(241, 245, 249);
        doc.rect(14, y, 182, 10, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('DISCIPLINA', 16, y + 6);
        doc.text('B1', 80, y + 6);
        doc.text('B2', 95, y + 6);
        doc.text('B3', 110, y + 6);
        doc.text('B4', 125, y + 6);
        doc.text('MG', 140, y + 6);
        doc.text('RF', 155, y + 6);
        doc.text('MF', 170, y + 6);
        doc.text('SIT', 185, y + 6);

        // Table Rows
        doc.setFont('helvetica', 'normal');
        subjects.forEach((subject: Disciplina) => {
            y += 10;
            if (y > 270) { doc.addPage(); y = 20; }

            const stats = calculateStats(student.id, subject.id);
            doc.text((subject.nome || '').substring(0, 30), 16, y + 6);

            // Values
            doc.text(stats.mg.toFixed(1), 140, y + 6);
            doc.text(stats.rf?.toFixed(1) || '-', 155, y + 6);
            doc.text(stats.mf.toFixed(1), 170, y + 6);
            doc.text(stats.situacao === 'Aprovado' ? 'APR' : stats.situacao === 'Reprovado' ? 'REP' : stats.situacao === 'Em Curso' ? 'CUR' : 'OUT', 185, y + 6);

            doc.setDrawColor(241, 245, 249);
            doc.line(14, y + 10, 196, y + 10);
        });

        doc.save(`Boletim_${(student.nome || 'documento').replace(/\s/g, '_')}.pdf`);
    };

    return (
        <div className="preview-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Visualização do Boletim</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Confira os dados antes de gerar o PDF</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-ghost" style={{ border: '1px solid var(--border)' }} onClick={() => window.print()}>
                        <Printer size={18} /> Imprimir
                    </button>
                    <button className="btn btn-primary" onClick={generatePDF}>
                        <FileDown size={18} /> Download PDF
                    </button>
                </div>
            </div>

            <div className="report-preview">
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <h2 style={{ color: 'var(--primary)', letterSpacing: '0.1em', fontWeight: 800 }}>BOLETIM ESCOLAR</h2>
                    <p style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Institucional • Modelo SEI</p>
                </div>

                <div style={{ background: 'var(--slate-50)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--slate-200)', marginBottom: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Aluno</label>
                            <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{student.nome || '---'}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>RA</label>
                            <p style={{ fontWeight: 700 }}>{student.matricula}</p>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Turma</label>
                            <p>{studentClass?.nome || '---'}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Ano Letivo</label>
                            <p>{studentClass?.anoLetivo || '2024'}</p>
                        </div>
                    </div>
                </div>

                <table className="tech-table">
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left' }}>Disciplina</th>
                            <th>B1</th>
                            <th>B2</th>
                            <th>B3</th>
                            <th>B4</th>
                            <th>MG</th>
                            <th>RF</th>
                            <th>MF</th>
                            <th>Situação</th>
                        </tr>
                    </thead>
                    <tbody>
                        {subjects.map((subject: Disciplina) => {
                            const stats = calculateStats(student.id, subject.id);
                            return (
                                <tr key={subject.id}>
                                    <td style={{ textAlign: 'left', fontWeight: 600 }}>{subject.nome}</td>
                                    <td>-</td>
                                    <td>-</td>
                                    <td>-</td>
                                    <td>-</td>
                                    <td style={{ fontWeight: 700 }}>{stats.mg.toFixed(1)}</td>
                                    <td>{stats.rf?.toFixed(1) || '-'}</td>
                                    <td style={{ fontWeight: 700 }}>{stats.mf.toFixed(1)}</td>
                                    <td>
                                        <span className={`badge badge-${stats.situacao.toLowerCase().replace(' ', '-')}`}>
                                            {stats.situacao}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                <div style={{ marginTop: '5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid var(--slate-300)', paddingTop: '0.5rem' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Assinatura da Coordenação</p>
                    </div>
                    <div style={{ borderTop: '1px solid var(--slate-300)', paddingTop: '0.5rem' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Assinatura do Responsável</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
