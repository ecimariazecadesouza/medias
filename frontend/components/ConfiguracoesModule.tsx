'use client';

import { useState } from 'react';
import { useGrades } from '@/context/GradesContext';
import { api } from '@/lib/api';
import type { Configuracao, BimestreConfig } from '@/lib/types';
import { Settings, Save, Lock, Unlock, Upload, School } from 'lucide-react';

export default function ConfiguracoesModule({ readOnly = false }: { readOnly?: boolean }) {
    const { configuracao, setConfiguracao } = useGrades();
    // ... rest of logic
    const [form, setForm] = useState<Configuracao>({ ...configuracao, bimestres: [...configuracao.bimestres] });
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');

    const showMsg = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const updateBimestre = (idx: number, field: keyof BimestreConfig, value: string | boolean) => {
        setForm(f => {
            const bimestres = [...f.bimestres];
            bimestres[idx] = { ...bimestres[idx], [field]: value };
            return { ...f, bimestres };
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.configuracoes.save(form);
            setConfiguracao(form);
            showMsg('Configurações salvas com sucesso!');
        } catch (err: any) {
            console.error(err);
            showMsg(`Erro ao salvar: ${err.message || 'Falha na conexão'}. Tentando salvar localmente...`);
            // save locally even if API fails
            setConfiguracao(form);
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Avisar se for muito grande
        if (file.size > 50000) {
            alert(`Atenção: Esta imagem é um pouco grande (${(file.size / 1024).toFixed(0)}KB). Para melhor desempenho e evitar erros ao salvar, recomendo salvá-la como um arquivo local na pasta 'public/logo.png' e usar apenas o caminho '/logo.png' aqui.`);
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            setForm(f => ({ ...f, logoUrl: ev.target?.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const handleLogoUrlChange = (val: string) => {
        let finalVal = val.trim();
        // Regex super robusto para capturar ID do Drive em diversos formatos
        const driveIdMatch = finalVal.match(/[\/\?&]id=([^\/\?&]+)/) || finalVal.match(/\/d\/([^\/\?&]+)/);

        if (driveIdMatch && driveIdMatch[1] && finalVal.includes('drive.google.com')) {
            finalVal = `https://lh3.googleusercontent.com/d/${driveIdMatch[1]}`;
        } else if (finalVal.length > 25 && /^[-\w]+$/.test(finalVal) && !finalVal.includes('/')) {
            // Se o usuário colar apenas o ID
            finalVal = `https://lh3.googleusercontent.com/d/${finalVal}`;
        }
        setForm(f => ({ ...f, logoUrl: finalVal }));
    };

    return (
        <>
            {toast && <div className="toast-container"><div className="toast success">{toast}</div></div>}

            {/* School Identity */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <School size={20} /> Identidade da Escola
                    </div>
                </div>
                <div className="card-body">
                    <div className="form-grid form-grid-2" style={{ gap: '1.25rem', maxWidth: '640px' }}>
                        <div className="form-group">
                            <label className="label">Nome da Escola</label>
                            <input className="input" value={form.nomeEscola} onChange={e => setForm(f => ({ ...f, nomeEscola: e.target.value }))} placeholder="Ex: EEEP Escola Estadual" disabled={readOnly} />
                        </div>
                        <div className="form-group">
                            <label className="label">Ano Letivo</label>
                            <input className="input" type="number" value={form.anoLetivo} onChange={e => setForm(f => ({ ...f, anoLetivo: e.target.value }))} disabled={readOnly} />
                        </div>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="label">Logotipo da Escola</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    {form.logoUrl && (
                                        <img src={form.logoUrl} alt="Logo" style={{ height: 60, width: 60, borderRadius: '0.5rem', border: '1px solid hsl(var(--border))', objectFit: 'contain', background: '#f9f9f9', padding: '4px' }} />
                                    )}
                                    {!readOnly && (
                                        <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                                            <Upload size={16} /> Carregar Imagem
                                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                                        </label>
                                    )}
                                    {form.logoUrl && !readOnly && (
                                        <button className="btn btn-ghost btn-sm" onClick={() => setForm(f => ({ ...f, logoUrl: undefined }))} style={{ color: 'hsl(var(--danger))' }}>
                                            Remover
                                        </button>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="label" style={{ fontSize: '0.75rem', opacity: 0.8 }}>Link ou Código Base64 da Logo</label>
                                    <textarea
                                        className="input"
                                        value={form.logoUrl || ''}
                                        onChange={e => handleLogoUrlChange(e.target.value)}
                                        placeholder="Cole aqui o link da imagem (Drive, Imgur, etc) ou o código base64..."
                                        style={{ fontFamily: 'monospace', fontSize: '0.75rem', minHeight: '80px', resize: 'vertical' }}
                                        disabled={readOnly}
                                    />
                                    {form.logoUrl && form.logoUrl.length > 40000 && (
                                        <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'hsl(var(--danger)/0.05)', borderRadius: '0.5rem', border: '1px solid hsl(var(--danger)/0.1)', color: 'hsl(var(--danger))', fontSize: '0.7rem' }}>
                                            <strong>Aviso de Tamanho:</strong> O código desta imagem está muito grande. O Google Sheets pode recusar o salvamento.
                                            <button
                                                className="btn btn-ghost btn-xs"
                                                onClick={() => setForm(f => ({ ...f, logoUrl: '/logo.png' }))}
                                                style={{ textDecoration: 'underline', padding: '0 4px', height: 'auto' }}
                                            >
                                                Mudar para caminho local (/logo.png)
                                            </button>
                                        </div>
                                    )}
                                    <p style={{ fontSize: '0.65rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.4rem', lineHeight: '1.4' }}>
                                        <strong>Dica:</strong> Para evitar erros, sugerimos usar um <strong>link externo</strong> ou o caminho local <code>/logo.png</code> (após mover o arquivo para a pasta <code>public</code>).
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grade settings */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Settings size={20} /> Parâmetros de Avaliação
                    </div>
                </div>
                <div className="card-body">
                    <div className="form-group" style={{ maxWidth: '280px' }}>
                        <label className="label">Média Mínima para Aprovação</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <input
                                className="input"
                                type="number" min={0} max={10} step={0.1}
                                value={form.mediaMinima}
                                onChange={e => setForm(f => ({ ...f, mediaMinima: Number(e.target.value) }))}
                                style={{ maxWidth: '100px', textAlign: 'center', fontWeight: 800, fontSize: '1.2rem' }}
                                disabled={readOnly}
                            />
                            <span style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                                Padrão nacional: <strong>6,0</strong>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bimestres */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                    <div className="card-title">Configuração dos Bimestres</div>
                    <div className="card-subtitle">Defina as datas e o status de cada bimestre</div>
                </div>
                <div className="card-body">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {form.bimestres.map((b, i) => (
                            <div key={b.numero} style={{
                                display: 'grid', gridTemplateColumns: '140px 1fr 1fr auto auto',
                                gap: '1rem', alignItems: 'center',
                                padding: '1rem', borderRadius: 'var(--radius-sm)',
                                background: b.fechado ? 'hsl(var(--danger)/0.04)' : 'hsl(var(--surface-raised))',
                                border: `1px solid ${b.fechado ? 'hsl(var(--danger)/0.15)' : 'hsl(var(--border))'}`,
                            }}>
                                <div style={{ fontWeight: 700 }}>
                                    {b.nome}
                                    {b.fechado && <span className="badge badge-red" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>Fechado</span>}
                                </div>
                                <div className="form-group">
                                    <label className="label" style={{ fontSize: '0.7rem' }}>Início</label>
                                    <input type="date" className="input" value={b.dataInicio} onChange={e => updateBimestre(i, 'dataInicio', e.target.value)} disabled={readOnly} />
                                </div>
                                <div className="form-group">
                                    <label className="label" style={{ fontSize: '0.7rem' }}>Fim</label>
                                    <input type="date" className="input" value={b.dataFim} onChange={e => updateBimestre(i, 'dataFim', e.target.value)} disabled={readOnly} />
                                </div>
                                {!readOnly && (
                                    <button
                                        className={`btn ${b.fechado ? 'btn-danger' : 'btn-secondary'} btn-sm`}
                                        onClick={() => updateBimestre(i, 'fechado', !b.fechado)}
                                        title={b.fechado ? 'Reabrir bimestre' : 'Fechar bimestre'}
                                    >
                                        {b.fechado ? <><Unlock size={14} /> Reabrir</> : <><Lock size={14} /> Fechar</>}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* API config info */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                    <div className="card-title">Integração com Google Sheets</div>
                </div>
                <div className="card-body">
                    <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                        <Settings size={18} />
                        <div>
                            <strong>Configure as variáveis de ambiente</strong><br />
                            Edite o arquivo <code>.env.local</code> na raiz do projeto frontend com as credenciais do Supabase e a URL do Google Apps Script.
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                        {[
                            'NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co',
                            'NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...',
                            'NEXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/ID/exec',
                        ].map(line => (
                            <div key={line} style={{ padding: '0.5rem 0.875rem', background: 'hsl(var(--foreground))', color: 'hsl(142 71% 70%)', borderRadius: '0.375rem' }}>
                                {line}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Save button */}
            {!readOnly && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '2rem' }}>
                    <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
                        {saving ? 'Salvando...' : <><Save size={18} /> Salvar Configurações</>}
                    </button>
                </div>
            )}
        </>
    );
}
