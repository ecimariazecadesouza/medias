'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { api, newId } from '@/lib/api';
import type {
    Protagonist, Turma, Docente, Disciplina, Area, Subformacao, Formacao,
    Lancamento, Conselho, Configuracao
} from '@/lib/types';

interface GradesContextValue {
    // Data
    protagonistas: Protagonist[];
    turmas: Turma[];
    docentes: Docente[];
    disciplinas: Disciplina[];
    areas: Area[];
    subformacoes: Subformacao[];
    formacoes: Formacao[];
    lancamentos: Lancamento[];
    conselhos: Conselho[];
    configuracao: Configuracao;

    // State
    loading: boolean;
    error: string | null;

    // Refreshers
    refreshProtagonistas: () => Promise<void>;
    refreshTurmas: () => Promise<void>;
    refreshDocentes: () => Promise<void>;
    refreshDisciplinas: () => Promise<void>;
    refreshAreas: () => Promise<void>;
    refreshSubformacoes: () => Promise<void>;
    refreshFormacoes: () => Promise<void>;
    refreshLancamentos: () => Promise<void>;
    refreshConselho: () => Promise<void>;
    refreshConfig: () => Promise<void>;
    refreshAll: () => Promise<void>;

    // Setters (optimistic updates)
    setProtagonistas: React.Dispatch<React.SetStateAction<Protagonist[]>>;
    setTurmas: React.Dispatch<React.SetStateAction<Turma[]>>;
    setDocentes: React.Dispatch<React.SetStateAction<Docente[]>>;
    setDisciplinas: React.Dispatch<React.SetStateAction<Disciplina[]>>;
    setAreas: React.Dispatch<React.SetStateAction<Area[]>>;
    setSubformacoes: React.Dispatch<React.SetStateAction<Subformacao[]>>;
    setFormacoes: React.Dispatch<React.SetStateAction<Formacao[]>>;
    setLancamentos: React.Dispatch<React.SetStateAction<Lancamento[]>>;
    setConselhos: React.Dispatch<React.SetStateAction<Conselho[]>>;
    setConfiguracao: React.Dispatch<React.SetStateAction<Configuracao>>;

    // Helpers
    getMG: (protagonistaId: string, disciplinaId: string) => number | null;
    getMF: (protagonistaId: string, disciplinaId: string) => number | null;
    getSituacao: (protagonistaId: string, disciplinaId: string) => 'Aprovado' | 'Aprovar' | 'Reprovado' | 'Recuperação' | 'Retido' | 'Pendente' | 'Inapto' | 'Cursando' | 'Em curso';
}

const defaultConfig: Configuracao = {
    nomeEscola: 'Escola',
    anoLetivo: new Date().getFullYear().toString(),
    mediaMinima: 6.0,
    bimestres: [
        { numero: 1, nome: '1º Bimestre', dataInicio: '', dataFim: '', fechado: false },
        { numero: 2, nome: '2º Bimestre', dataInicio: '', dataFim: '', fechado: false },
        { numero: 3, nome: '3º Bimestre', dataInicio: '', dataFim: '', fechado: false },
        { numero: 4, nome: '4º Bimestre', dataInicio: '', dataFim: '', fechado: false },
    ],
};

const GradesContext = createContext<GradesContextValue | null>(null);

export function GradesProvider({ children }: { children: React.ReactNode }) {
    const [protagonistas, setProtagonistas] = useState<Protagonist[]>([]);
    const [turmas, setTurmas] = useState<Turma[]>([]);
    const [docentes, setDocentes] = useState<Docente[]>([]);
    const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [subformacoes, setSubformacoes] = useState<Subformacao[]>([]);
    const [formacoes, setFormacoes] = useState<Formacao[]>([]);
    const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
    const [conselhos, setConselhos] = useState<Conselho[]>([]);
    const [configuracao, setConfiguracao] = useState<Configuracao>(defaultConfig);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const safe = async <T,>(fn: () => Promise<T>, setter: (v: T) => void, defaultValue: T) => {
        try {
            const val = await fn();
            setter(val ?? defaultValue);
        } catch { /* silently skip on local dev */ }
    };

    const refreshProtagonistas = useCallback(() => safe(api.protagonistas.getAll, setProtagonistas, []), []);
    const refreshTurmas = useCallback(() => safe(api.turmas.getAll, setTurmas, []), []);
    const refreshDocentes = useCallback(() => safe(api.docentes.getAll, setDocentes, []), []);
    const refreshDisciplinas = useCallback(() => safe(api.disciplinas.getAll, setDisciplinas, []), []);
    const refreshAreas = useCallback(() => safe(api.areas.getAll, setAreas, []), []);
    const refreshSubformacoes = useCallback(() => safe(api.subformacoes.getAll, setSubformacoes, []), []);
    const refreshFormacoes = useCallback(() => safe(api.formacoes.getAll, setFormacoes, []), []);
    const refreshLancamentos = useCallback(() => safe(api.lancamentos.getAll, setLancamentos, []), []);
    const refreshConselho = useCallback(() => safe(api.conselho.getAll, setConselhos, []), []);
    const refreshConfig = useCallback(async () => {
        try {
            const cfg = await api.configuracoes.get();
            if (cfg) setConfiguracao(cfg);
        } catch { /* ignore */ }
    }, []);

    const refreshAll = useCallback(async () => {
        setLoading(true);
        await Promise.all([
            refreshProtagonistas(), refreshTurmas(), refreshDocentes(),
            refreshDisciplinas(), refreshAreas(), refreshSubformacoes(), refreshFormacoes(),
            refreshLancamentos(), refreshConselho(), refreshConfig(),
        ]);
        setLoading(false);
    }, [refreshProtagonistas, refreshTurmas, refreshDocentes,
        refreshDisciplinas, refreshAreas, refreshSubformacoes, refreshFormacoes,
        refreshLancamentos, refreshConselho, refreshConfig]);

    useEffect(() => { refreshAll(); }, [refreshAll]);

    const getMG = useCallback(
        (protagonistaId: string, disciplinaId: string): number | null => {
            const safeDisciplinas = (disciplinas || []).filter(Boolean);
            const safeLancamentos = (lancamentos || []).filter(Boolean);

            const disc = safeDisciplinas.find(d => d?.id === disciplinaId);
            if (!disc) return null;

            const relevantBims = [1, 2, 3, 4];
            const lans = safeLancamentos.filter(
                l => l?.protagonistaId === protagonistaId &&
                    l?.disciplinaId === disciplinaId &&
                    relevantBims.includes(l?.bimestre as any) &&
                    l?.media !== null
            );

            if (!lans.length) return null;
            const sum = lans.reduce((acc, l) => acc + (l?.media ?? 0), 0);

            // Regra: Arredondar para uma casa decimal (ex: 5.54 -> 5.5)
            const mg = sum / 4;
            return Math.floor(mg * 10) / 10;
        }, [lancamentos, disciplinas]);

    const getMF = useCallback(
        (protagonistaId: string, disciplinaId: string): number | null => {
            const mg = getMG(protagonistaId, disciplinaId);
            if (mg === null) return null;

            if (mg >= 6.0) return mg;

            const safeLancamentos = lancamentos || [];
            const rf = safeLancamentos.find(l =>
                l?.protagonistaId === protagonistaId &&
                l?.disciplinaId === disciplinaId &&
                l?.bimestre === 5
            )?.media;

            if (rf === null || rf === undefined) return null;

            // Nova regra MF: (MG * 6 + NotaRec * 4) / 10
            const mf = (mg * 6 + rf * 4) / 10;
            return Math.floor(mf * 10) / 10;
        }, [getMG, lancamentos]);

    const getSituacao = useCallback(
        (protagonistaId: string, disciplinaId: string): 'Aprovado' | 'Aprovar' | 'Reprovado' | 'Recuperação' | 'Retido' | 'Pendente' | 'Inapto' | 'Cursando' | 'Em curso' => {
            const safeLancamentos = (lancamentos || []).filter(Boolean);
            const mg = getMG(protagonistaId, disciplinaId);
            const lRegular = safeLancamentos.filter(l =>
                l?.protagonistaId === protagonistaId &&
                l?.disciplinaId === disciplinaId &&
                l?.bimestre !== undefined &&
                l?.bimestre <= 4 &&
                l?.media !== null
            );
            const pontos = lRegular.reduce((acc, l) => acc + (l?.media || 0), 0);

            if (mg === null && lRegular.length === 0) return 'Em curso';
            if (lRegular.length < 4 && mg !== null) return 'Em curso';

            if (lRegular.length === 4) {
                if (pontos < 10) return 'Inapto';
                if (mg !== null && mg >= 6.0) return 'Aprovar';

                const rfNote = safeLancamentos.find(l =>
                    l?.protagonistaId === protagonistaId &&
                    l?.disciplinaId === disciplinaId &&
                    l?.bimestre === 5
                )?.media;
                if (rfNote === null || rfNote === undefined) return 'Recuperação';

                const mf = getMF(protagonistaId, disciplinaId);
                if (mf === null) return 'Recuperação';
                return mf >= 5.0 ? 'Aprovar' : 'Retido';
            }

            return 'Em curso';
        }, [getMG, getMF, lancamentos]);

    return (
        <GradesContext.Provider value={{
            protagonistas, turmas, docentes, disciplinas, areas, subformacoes, formacoes, lancamentos, conselhos, configuracao,
            loading, error,
            refreshProtagonistas, refreshTurmas, refreshDocentes, refreshDisciplinas,
            refreshAreas, refreshSubformacoes, refreshFormacoes, refreshLancamentos, refreshConselho, refreshConfig, refreshAll,
            setProtagonistas, setTurmas, setDocentes, setDisciplinas,
            setAreas, setSubformacoes, setFormacoes, setLancamentos, setConselhos, setConfiguracao,
            getMG, getMF, getSituacao,
        }}>
            {children}
        </GradesContext.Provider>
    );
}

export function useGrades() {
    const ctx = useContext(GradesContext);
    if (!ctx) throw new Error('useGrades must be used inside GradesProvider');
    return ctx;
}
