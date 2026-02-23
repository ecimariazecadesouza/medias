'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { School, LogIn, Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await signIn(email, password);
        } catch (err: any) {
            console.error('Login error:', err);
            if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
                setError('Erro de conexão: Verifique se as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY foram configuradas corretamente no painel da Vercel.');
            } else {
                setError(err.message === 'Invalid login credentials'
                    ? 'E-mail ou senha incorretos.'
                    : 'Erro ao entrar. Verifique suas credenciais.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-bg">
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
                <div className="blob blob-3"></div>
            </div>

            <div className="login-card-container">
                <div className="login-card">
                    <div className="login-header">
                        <div className="login-logo">
                            <School size={32} color="white" />
                        </div>
                        <h1>Gestão de Médias</h1>
                        <p>Acesse o sistema escolar</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        {error && (
                            <div className="login-error">
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="login-group">
                            <label>E-mail institucional</label>
                            <div className="login-input-wrapper">
                                <Mail size={18} className="input-icon" />
                                <input
                                    type="email"
                                    placeholder="exemplo@escola.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="login-group">
                            <label>Senha</label>
                            <div className="login-input-wrapper">
                                <Lock size={18} className="input-icon" />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="login-submit"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="spinner-sm"></div>
                            ) : (
                                <>
                                    <span>CONECTAR</span>
                                    <LogIn size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="login-footer">
                        <p>© {new Date().getFullYear()} — Sistema de Gestão de Médias</p>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .login-page {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #f8fafc;
                    position: relative;
                    overflow: hidden;
                    font-family: 'Inter', sans-serif;
                }

                .login-bg {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 0;
                }

                .blob {
                    position: absolute;
                    width: 500px;
                    height: 500px;
                    background: linear-gradient(135deg, #5850ec 0%, #312e81 100%);
                    filter: blur(80px);
                    border-radius: 50%;
                    opacity: 0.15;
                    animation: float 20s infinite alternate;
                }

                .blob-1 { top: -100px; left: -100px; }
                .blob-2 { bottom: -150px; right: -100px; animation-delay: -5s; }
                .blob-3 { top: 30%; left: 60%; width: 300px; height: 300px; opacity: 0.1; }

                @keyframes float {
                    0% { transform: translate(0, 0) rotate(0deg); }
                    100% { transform: translate(50px, 50px) rotate(30deg); }
                }

                .login-card-container {
                    position: relative;
                    z-index: 10;
                    width: 100%;
                    max-width: 440px;
                    padding: 2rem;
                }

                .login-card {
                    background: rgba(255, 255, 255, 0.85);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    border-radius: 2rem;
                    padding: 3rem 2.5rem;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
                }

                .login-header {
                    text-align: center;
                    margin-bottom: 2.5rem;
                }

                .login-logo {
                    width: 64px;
                    height: 64px;
                    background: #5850ec;
                    border-radius: 1.25rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.5rem;
                    box-shadow: 0 10px 15px -3px rgba(88, 80, 236, 0.5);
                }

                .login-header h1 {
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: #1a1c1e;
                    margin-bottom: 0.5rem;
                    letter-spacing: -0.025em;
                }

                .login-header p {
                    font-size: 0.9rem;
                    color: #64748b;
                    font-weight: 500;
                }

                .login-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .login-error {
                    background: #fef2f2;
                    border: 1px solid #fee2e2;
                    color: #b91c1c;
                    padding: 0.875rem;
                    border-radius: 0.75rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    font-size: 0.85rem;
                    font-weight: 600;
                }

                .login-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .login-group label {
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    color: #64748b;
                    letter-spacing: 0.05em;
                }

                .login-input-wrapper {
                    position: relative;
                }

                .input-icon {
                    position: absolute;
                    left: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #94a3b8;
                }

                .login-form input {
                    width: 100%;
                    padding: 0.875rem 1rem 0.875rem 3rem;
                    border-radius: 1rem;
                    border: 1px solid #e2e8f0;
                    background: white;
                    color: #1e293b;
                    font-size: 0.95rem;
                    font-weight: 500;
                    transition: all 0.2s;
                }

                .login-form input:focus {
                    outline: none;
                    border-color: #5850ec;
                    box-shadow: 0 0 0 4px rgba(88, 80, 236, 0.1);
                }

                .login-submit {
                    margin-top: 1rem;
                    background: #5850ec;
                    color: white;
                    border: none;
                    border-radius: 1rem;
                    padding: 1rem;
                    font-weight: 700;
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 6px -1px rgba(88, 80, 236, 0.2);
                }

                .login-submit:hover {
                    background: #4f46e5;
                    transform: translateY(-2px);
                    box-shadow: 0 10px 15px -3px rgba(88, 80, 236, 0.3);
                }

                .login-submit:active { transform: translateY(0); }
                .login-submit:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

                .login-footer {
                    margin-top: 2.5rem;
                    text-align: center;
                }

                .login-footer p {
                    font-size: 0.75rem;
                    color: #94a3b8;
                    font-weight: 500;
                }

                .spinner-sm {
                    width: 20px;
                    height: 20px;
                    border: 3px solid rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    border-top-color: white;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
