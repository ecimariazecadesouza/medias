// ─── Core Domain Types ───────────────────────────────────────────────────────

export type Status = 'Cursando' | 'Evasão' | 'Transferência' | 'Outro';
export type Turno = 'Manhã' | 'Tarde' | 'Noite' | 'Integral';
export type Situacao = 'Aprovado' | 'Reprovado' | 'Cursando';
export type Perfil = 'Administrador' | 'Docente' | 'Gestor' | 'CAF';

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
  disciplinaIds?: string[];
}

export interface Protagonist {
  id: string;
  nome: string;
  matricula: string;
  turmaId: string;
  turmaNome?: string;
  status: Status;
}

export interface DocenteVinculo {
  disciplinaId: string;
  turmaIds: string[];
}

export interface Docente {
  id: string;
  nome: string;
  email: string;
  disciplinaIds: string[]; // Flattened for backward compatibility
  turmaIds: string[];      // Flattened for backward compatibility
  vinculos?: DocenteVinculo[];
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

// ─── Computed / UI Types ──────────────────────────────────────────────────────

export interface MediaDisciplina {
  disciplinaId: string;
  disciplinaNome: string;
  b1: number | null;
  b2: number | null;
  b3: number | null;
  b4: number | null;
  mediaAnual: number | null;
  situacao: Situacao;
}

export interface BoletimProtagonista {
  protagonista: Protagonist;
  turma: Turma;
  disciplinas: MediaDisciplina[];
  mediaGeral: number | null;
  situacaoGeral: Situacao | 'Recuperação' | 'Retido' | 'Pendente' | 'Inapto';
}

export interface Conselho {
  id: string;
  protagonistaId: string;
  ano: string;
  resultadoManual: 'Aprovado' | 'Reprovado' | 'Pendente';
  deliberado: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const TABELA_PRECISA: Record<string, string> = {
  "10.0": "8.8", "10.1": "8.8", "10.2": "8.7", "10.3": "8.7", "10.4": "8.7", "10.5": "8.6", "10.6": "8.6", "10.7": "8.5", "10.8": "8.5", "10.9": "8.5",
  "11.0": "8.4", "11.1": "8.3", "11.2": "8.3", "11.3": "8.3", "11.4": "8.2", "11.5": "8.2", "11.6": "8.1", "11.7": "8.1", "11.8": "8.1", "11.9": "8.0",
  "12.0": "8.0", "12.1": "8.0", "12.2": "7.9", "12.3": "7.9", "12.4": "7.8", "12.5": "7.8", "12.6": "7.8", "12.7": "7.7", "12.8": "7.7", "12.9": "7.6",
  "13.0": "7.6", "13.1": "7.6", "13.2": "7.5", "13.3": "7.5", "13.4": "7.4", "13.5": "7.4", "13.6": "7.4", "13.7": "7.3", "13.8": "7.3", "13.9": "7.3",
  "14.0": "7.3", "14.1": "7.2", "14.2": "7.2", "14.3": "7.1", "14.4": "7.1", "14.5": "7.1", "14.6": "7.0", "14.7": "7.0", "14.8": "7.0", "14.9": "6.9",
  "15.0": "6.9", "15.1": "6.9", "15.2": "6.8", "15.3": "6.8", "15.4": "6.7", "15.5": "6.7", "15.6": "6.7", "15.7": "6.6", "15.8": "6.6", "15.9": "6.5",
  "16.0": "6.5", "16.1": "6.5", "16.2": "6.4", "16.3": "6.4", "16.4": "6.3", "16.5": "6.3", "16.6": "6.3", "16.7": "6.2", "16.8": "6.2", "16.9": "6.1",
  "17.0": "6.1", "17.1": "6.1", "17.2": "6.0", "17.3": "6.0", "17.4": "5.9", "17.5": "5.9", "17.6": "5.9", "17.7": "5.8", "17.8": "5.8", "17.9": "5.8",
  "18.0": "5.8", "18.1": "5.7", "18.2": "5.7", "18.3": "5.6", "18.4": "5.6", "18.5": "5.6", "18.6": "5.5", "18.7": "5.5", "18.8": "5.4", "18.9": "5.4",
  "19.0": "5.4", "19.1": "5.4", "19.2": "5.3", "19.3": "5.3", "19.4": "5.2", "19.5": "5.2", "19.6": "5.2", "19.7": "5.1", "19.8": "5.1", "19.9": "5.0",
  "20.0": "5.0", "20.1": "5.0", "20.2": "4.9", "20.3": "4.9", "20.4": "4.8", "20.5": "4.8", "20.6": "4.8", "20.7": "4.7", "20.8": "4.7", "20.9": "4.7",
  "21.0": "4.6", "21.1": "4.6", "21.2": "4.5", "21.3": "4.5", "21.4": "4.5", "21.5": "4.4", "21.6": "4.4", "21.7": "4.3", "21.8": "4.3", "21.9": "4.3",
  "22.0": "4.3", "22.1": "4.2", "22.2": "4.2", "22.3": "4.1", "22.4": "4.1", "22.5": "4.1", "22.6": "4.0", "22.7": "4.0", "22.8": "3.9", "22.9": "3.9",
  "23.0": "3.9", "23.1": "3.8", "23.2": "3.8", "23.3": "3.8", "23.4": "3.7", "23.5": "3.7", "23.6": "3.6", "23.7": "3.6", "23.8": "3.6", "23.9": "3.5"
};

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
  | 'configuracoes'
  | 'conselho';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
