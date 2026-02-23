import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { Turma, Protagonist, Disciplina, Lancamento, AcademicStats, Configuracao } from '../lib/types';
import { useAuth } from './AuthContext';

interface SchoolContextType {
    classes: Turma[];
    students: Protagonist[];
    subjects: Disciplina[];
    grades: Lancamento[];
    configuracao: Configuracao | null;
    loading: boolean;
    calculateStats: (studentId: string, subjectId: string) => AcademicStats;
    refreshData: () => Promise<void>;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export const SchoolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [classes, setClasses] = useState<Turma[]>([]);
    const [students, setStudents] = useState<Protagonist[]>([]);
    const [subjects, setSubjects] = useState<Disciplina[]>([]);
    const [grades, setGrades] = useState<Lancamento[]>([]);
    const [configuracao, setConfiguracao] = useState<Configuracao | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [clData, stData, sbData, grData, cfgData] = await Promise.all([
                api.turmas.getAll(),
                api.protagonistas.getAll(),
                api.disciplinas.getAll(),
                api.lancamentos.getAll(),
                api.configuracoes.get()
            ]);

            setClasses(clData || []);
            setStudents(stData || []);
            setSubjects(sbData || []);
            setGrades(grData || []);
            setConfiguracao(cfgData || null);
        } catch (error) {
            console.error('Error fetching data from Google Sheets:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            refreshData();
        } else {
            // Limpar dados ao sair
            setClasses([]);
            setStudents([]);
            setSubjects([]);
            setGrades([]);
            setConfiguracao(null);
        }
    }, [user, refreshData]);

    const calculateStats = (studentId: string, subjectId: string): AcademicStats => {
        const sGrades = grades.filter(g => g.protagonistaId === studentId && g.disciplinaId === subjectId);

        const getVal = (term: number) => sGrades.find(g => g.bimestre === term)?.media ?? null;

        const b1 = getVal(1);
        const b2 = getVal(2);
        const b3 = getVal(3);
        const b4 = getVal(4);
        const rf = getVal(5);

        const filledBimestres = [b1, b2, b3, b4].filter(v => v !== null) as number[];
        const pts = [b1, b2, b3, b4].reduce((acc: number, v) => acc + (v || 0), 0);

        const mg = filledBimestres.length > 0 ? pts / 4 : 0;
        const mgRounded = Math.floor(mg * 10) / 10;

        let mf = mgRounded;
        if (mgRounded < (configuracao?.mediaMinima || 6.0) && rf !== null) {
            mf = Math.floor(((mgRounded * 6) + (rf * 4))) / 10;
        }

        let situacao: AcademicStats['situacao'] = 'Em Curso';
        if (pts < 10 && filledBimestres.length === 4) {
            situacao = 'Inapto';
        } else if (filledBimestres.length === 4) {
            if (mgRounded >= (configuracao?.mediaMinima || 6.0)) {
                situacao = 'Aprovado';
            } else if (rf === null) {
                situacao = 'Recuperação';
            } else {
                situacao = mf >= 5.0 ? 'Aprovado' : 'Reprovado';
            }
        }

        let desempenho: AcademicStats['desempenho'] = 'Insuficiente';
        if (mf >= 8) desempenho = 'Ótimo';
        else if (mf >= 6) desempenho = 'Bom';
        else if (mf >= 5) desempenho = 'Regular';

        return { mg: mgRounded, rf, mf, situacao, desempenho };
    };

    return (
        <SchoolContext.Provider value={{
            classes, students, subjects, grades, configuracao, loading,
            calculateStats, refreshData
        }}>
            {children}
        </SchoolContext.Provider>
    );
};

export const useSchool = () => {
    const context = useContext(SchoolContext);
    if (context === undefined) {
        throw new Error('useSchool must be used within a SchoolProvider');
    }
    return context;
};
