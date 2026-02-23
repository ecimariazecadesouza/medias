import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validação rigorosa para evitar que o build da Vercel quebre se as variáveis estiverem vazias ou malformadas
const isPlaceholder = (s: string) => !s || s.includes('SEU_PROJETO') || s.includes('SUA_CHAVE') || s.includes('placeholder');
const isUrlValid = rawUrl.startsWith('http') && !isPlaceholder(rawUrl);

const supabaseUrl = isUrlValid ? rawUrl : 'https://invalid-configuration-missing.supabase.co';
const supabaseAnonKey = !isPlaceholder(rawKey) ? rawKey : 'invalid-key';

if (typeof window !== 'undefined' && (isPlaceholder(rawUrl) || isPlaceholder(rawKey))) {
    console.warn('⚠️ Supabase não configurado! Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.local ou no painel da Vercel.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'Administrador' | 'Docente' | 'Gestor' | 'CP' | 'CA' | 'Secretaria' | 'CAF';

export interface AuthUser {
    id: string;
    email: string;
    role: UserRole;
    nome?: string;
}

export async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

export async function signIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
    return supabase.auth.signOut();
}
