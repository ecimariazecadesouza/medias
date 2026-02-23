import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, GraduationCap, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message || 'Erro ao realizar login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <motion.div
                className="login-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="login-header">
                    <div className="login-logo">
                        <GraduationCap size={48} />
                    </div>
                    <h1>SEI Boletins</h1>
                    <p>Acesse o sistema de gestão escolar</p>
                </div>

                <form onSubmit={handleLogin} className="login-form">
                    {error && (
                        <div className="login-error">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="form-group">
                        <label>E-mail</label>
                        <input
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Senha</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? (
                            <><Loader2 className="animate-spin" size={20} /> Entrando...</>
                        ) : (
                            <><LogIn size={20} /> Acessar Sistema</>
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <p>© 2024 Meus Registros de Aula • SEI</p>
                </div>
            </motion.div>

            <style>{`
                .login-page {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                    padding: 1.5rem;
                }
                .login-card {
                    background: white;
                    padding: 2.5rem;
                    border-radius: 1.5rem;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
                    width: 100%;
                    max-width: 420px;
                }
                .login-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }
                .login-logo {
                    display: inline-flex;
                    padding: 1rem;
                    background: var(--indigo-50);
                    color: var(--primary);
                    border-radius: 1.25rem;
                    margin-bottom: 1rem;
                }
                .login-header h1 {
                    font-size: 1.75rem;
                    font-weight: 800;
                    color: var(--slate-900);
                    margin-bottom: 0.5rem;
                }
                .login-header p {
                    color: var(--text-muted);
                }
                .login-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }
                .login-error {
                    background: #fef2f2;
                    color: #991b1b;
                    padding: 0.75rem;
                    border-radius: 0.5rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.875rem;
                    border: 1px solid #fee2e2;
                }
                .login-form .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .login-form label {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--slate-700);
                }
                .login-form input {
                    padding: 0.75rem 1rem;
                    border: 1px solid var(--slate-200);
                    border-radius: 0.75rem;
                    font-size: 1rem;
                    transition: all 0.2s;
                }
                .login-form input:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px var(--indigo-100);
                }
                .login-button {
                    background: var(--primary);
                    color: white;
                    padding: 0.75rem;
                    border-radius: 0.75rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                    margin-top: 0.5rem;
                }
                .login-button:hover:not(:disabled) {
                    background: var(--primary-hover);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
                }
                .login-button:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }
                .login-footer {
                    margin-top: 2rem;
                    text-align: center;
                    font-size: 0.75rem;
                    color: var(--text-muted);
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};
