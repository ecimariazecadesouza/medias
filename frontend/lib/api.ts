import type {
    Protagonist, Turma, Docente, Disciplina, Area, Subformacao, Formacao,
    Lancamento, Conselho, Configuracao, ApiResponse, SheetName
} from './types';

const BASE_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;

function validateUrl() {
    if (!BASE_URL || BASE_URL.includes('SEU_ID')) {
        throw new Error('Configuração necessária: Informe a URL do Google Apps Script (NEXT_PUBLIC_APPS_SCRIPT_URL) no painel do Vercel.');
    }
}

async function apsFetch<T>(action: string, payload?: Record<string, unknown>): Promise<T> {
    validateUrl();
    const url = new URL(BASE_URL!);
    url.searchParams.set('action', action);
    if (payload) {
        url.searchParams.set('payload', JSON.stringify(payload));
    }

    const res = await fetch(url.toString());

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: ApiResponse<T> = await res.json();
    if (!json.success) throw new Error(json.error || 'Erro desconhecido');
    return json.data as T;
}

async function apsPost<T>(action: string, payload: Record<string, unknown>): Promise<T> {
    validateUrl();
    const res = await fetch(BASE_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, ...payload }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: ApiResponse<T> = await res.json();
    if (!json.success) throw new Error(json.error || 'Erro desconhecido');
    return json.data as T;
}

// ─── Protagonistas ─────────────────────────────────────────────────────────
export const api = {
    protagonistas: {
        getAll: () => apsFetch<Protagonist[]>('getAll', { sheet: 'protagonistas' }),
        save: (p: Protagonist) => apsPost<Protagonist>('saveRow', { sheet: 'protagonistas', row: p }),
        delete: (id: string) => apsPost<void>('deleteRow', { sheet: 'protagonistas', id }),
        importBatch: (rows: Omit<Protagonist, 'id'>[]) =>
            apsPost<void>('importBatch', { sheet: 'protagonistas', rows }),
    },

    turmas: {
        getAll: () => apsFetch<Turma[]>('getAll', { sheet: 'turmas' }),
        save: (t: Turma) => apsPost<Turma>('saveRow', { sheet: 'turmas', row: t }),
        delete: (id: string) => apsPost<void>('deleteRow', { sheet: 'turmas', id }),
    },

    docentes: {
        getAll: () => apsFetch<Docente[]>('getAll', { sheet: 'docentes' }),
        save: (d: Docente) => apsPost<Docente>('saveRow', { sheet: 'docentes', row: d }),
        delete: (id: string) => apsPost<void>('deleteRow', { sheet: 'docentes', id }),
    },

    disciplinas: {
        getAll: () => apsFetch<Disciplina[]>('getAll', { sheet: 'disciplinas' }),
        save: (d: Disciplina) => apsPost<Disciplina>('saveRow', { sheet: 'disciplinas', row: d }),
        delete: (id: string) => apsPost<void>('deleteRow', { sheet: 'disciplinas', id }),
    },

    areas: {
        getAll: () => apsFetch<Area[]>('getAll', { sheet: 'areas' }),
        save: (a: Area) => apsPost<Area>('saveRow', { sheet: 'areas', row: a }),
        delete: (id: string) => apsPost<void>('deleteRow', { sheet: 'areas', id }),
    },

    subformacoes: {
        getAll: () => apsFetch<Subformacao[]>('getAll', { sheet: 'subformacoes' }),
        save: (s: Subformacao) => apsPost<Subformacao>('saveRow', { sheet: 'subformacoes', row: s }),
        delete: (id: string) => apsPost<void>('deleteRow', { sheet: 'subformacoes', id }),
    },

    formacoes: {
        getAll: () => apsFetch<Formacao[]>('getAll', { sheet: 'formacoes' }),
        save: (f: Formacao) => apsPost<Formacao>('saveRow', { sheet: 'formacoes', row: f }),
        delete: (id: string) => apsPost<void>('deleteRow', { sheet: 'formacoes', id }),
    },

    lancamentos: {
        getAll: () => apsFetch<Lancamento[]>('getAll', { sheet: 'lancamentos' }),
        getByTurma: (turmaId: string) =>
            apsFetch<Lancamento[]>('getByFilter', { sheet: 'lancamentos', field: 'turmaId', value: turmaId }),
        save: (l: Lancamento) => apsPost<Lancamento>('saveRow', { sheet: 'lancamentos', row: l }),
        saveBatch: (rows: Lancamento[]) =>
            apsPost<void>('saveBatch', { sheet: 'lancamentos', rows }),
        delete: (id: string) => apsPost<void>('deleteRow', { sheet: 'lancamentos', id }),
    },

    configuracoes: {
        get: () => apsFetch<Configuracao>('getConfig', {}),
        save: (c: Partial<Configuracao>) => apsPost<void>('saveConfig', { config: c }),
    },
    conselho: {
        getAll: () => apsFetch<Conselho[]>('getAll', { sheet: 'conselho' }),
        save: (c: Conselho) => apsPost<Conselho>('saveRow', { sheet: 'conselho', row: c }),
        saveBatch: (rows: Conselho[]) =>
            apsPost<void>('saveBatch', { sheet: 'conselho', rows }),
    },
};

// ─── uuid helper (no external library) ─────────────────────────────────────
export function newId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
