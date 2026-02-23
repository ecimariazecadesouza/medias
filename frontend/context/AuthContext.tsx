'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, AuthUser } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextValue {
    user: AuthUser | null;
    session: Session | null;
    loading: boolean;
    signIn: (e: string, p: string) => Promise<void>;
    signOut: () => Promise<void>;
    updateProfile: (nome: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const fetchProfile = async (userId: string, email: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (!error && data) {
            setUser({
                id: userId,
                email: email,
                role: data.role,
                nome: data.nome
            });
        }
    };

    useEffect(() => {
        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                fetchProfile(session.user.id, session.user.email!);
            }
            setLoading(false);
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user) {
                fetchProfile(session.user.id, session.user.email!);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/');
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        router.push('/login');
    };

    const updateProfile = async (nome: string) => {
        if (!user) return;
        const { error } = await supabase
            .from('profiles')
            .update({ nome })
            .eq('id', user.id);

        if (error) throw error;
        setUser(prev => prev ? { ...prev, nome } : null);
    };

    // Route Protection
    useEffect(() => {
        if (!loading) {
            if (!session && pathname !== '/login') {
                router.push('/login');
            } else if (session && pathname === '/login') {
                router.push('/');
            }
        }
    }, [session, loading, pathname, router]);

    return (
        <AuthContext.Provider value={{ user, session, loading, signIn, signOut, updateProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
