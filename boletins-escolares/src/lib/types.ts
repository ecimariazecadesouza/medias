// ─── Core Domain Types ───────────────────────────────────────────────────────

export type Status = 'Cursando' | 'Evasão' | 'Transferência' | 'Outro';
export type Turno = 'Manhã' | 'Tarde' | 'Noite' | 'Integral';
export type Situacao = 'Aprovado' | 'Reprovado' | 'Cursando';
export type Perfil = 'Administrador' | 'Docente';

export interface Formacao {
    id: string;
    nome: string;
    subformacoes: Subformacao[];
}

export interface Subformacao {
    id: string;
    nome: string;
    formacaoId: string;
    areas: Area[];
}

export interface Area {
    id: string;
    nome: string;
    subformacaoId: string;
    disciplinas?: Disciplina[];
}

export type Periodicidade = 'Anual' | '1° Semestre' | '2° Semestre';

export interface Disciplina {
    id: string;
    nome: string;
    areaId: string;
    areaNome?: string;
    periodicidade: Periodicidade;
}

export interface Turma {
    id: string;
    nome: string;
    anoLetivo: string;
    turno: Turno;
    protagonistaIds?: string[];
}

export interface Protagonist {
    id: string;
    nome: string;
    matricula: string;
    turmaId: string;
    turmaNome?: string;
    status: Status;
}

export interface Docente {
    id: string;
    nome: string;
    email: string;
    disciplinaIds: string[];
    turmaIds: string[];
}

export interface Lancamento {
    id: string;
    protagonistaId: string;
    protagonistaNome?: string;
    disciplinaId: string;
    disciplinaNome?: string;
    turmaId: string;
    turmaNome?: string;
    bimestre: 1 | 2 | 3 | 4 | 5; // 5 = Recuperação Final
    media: number | null;
    dataLancamento?: string;
}

export interface BimestreConfig {
    numero: 1 | 2 | 3 | 4 | 5;
    nome: string;
    dataInicio: string;
    dataFim: string;
    fechado: boolean;
}

export interface Configuracao {
    nomeEscola: string;
    anoLetivo: string;
    mediaMinima: number;
    logoUrl?: string;
    bimestres: BimestreConfig[];
}

// ─── Computed / UI Types for Report ──────────────────────────────────────────

export interface AcademicStats {
    mg: number;
    rf: number | null;
    mf: number;
    situacao: 'Aprovado' | 'Reprovado' | 'Recuperação' | 'Em Curso' | 'Inapto';
    desempenho: 'Ótimo' | 'Bom' | 'Regular' | 'Insuficiente';
}

// ─── API Payload Types ────────────────────────────────────────────────────────

export type SheetName =
    | 'protagonistas'
    | 'turmas'
    | 'docentes'
    | 'disciplinas'
    | 'areas'
    | 'subformacoes'
    | 'formacoes'
    | 'lancamentos'
    | 'configuracoes';

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}
