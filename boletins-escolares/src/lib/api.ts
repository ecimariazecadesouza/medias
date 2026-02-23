import type {
    Protagonist, Turma, Docente, Disciplina, Area, Subformacao, Formacao,
    Lancamento, Configuracao, ApiResponse
} from './types';

const BASE_URL = import.meta.env.VITE_API_URL;

function validateUrl() {
    if (!BASE_URL) {
        console.warn('Configuração necessária: Informe a URL do Google Apps Script (VITE_API_URL) no arquivo .env.local');
    }
}

async function apsFetch<T>(action: string, payload?: Record<string, unknown>): Promise<T> {
    validateUrl();
    if (!BASE_URL) return [] as any;

    const url = new URL(BASE_URL);
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
    if (!BASE_URL) throw new Error('API URL missing');

    const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, ...payload }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: ApiResponse<T> = await res.json();
    if (!json.success) throw new Error(json.error || 'Erro desconhecido');
    return json.data as T;
}

export const api = {
    protagonistas: {
        getAll: () => apsFetch<Protagonist[]>('getAll', { sheet: 'protagonistas' }),
    },
    turmas: {
        getAll: () => apsFetch<Turma[]>('getAll', { sheet: 'turmas' }),
    },
    docentes: {
        getAll: () => apsFetch<Docente[]>('getAll', { sheet: 'docentes' }),
    },
    disciplinas: {
        getAll: () => apsFetch<Disciplina[]>('getAll', { sheet: 'disciplinas' }),
    },
    areas: {
        getAll: () => apsFetch<Area[]>('getAll', { sheet: 'areas' }),
    },
    subformacoes: {
        getAll: () => apsFetch<Subformacao[]>('getAll', { sheet: 'subformacoes' }),
    },
    formacoes: {
        getAll: () => apsFetch<Formacao[]>('getAll', { sheet: 'formacoes' }),
    },
    lancamentos: {
        getAll: () => apsFetch<Lancamento[]>('getAll', { sheet: 'lancamentos' }),
        saveBatch: (rows: Lancamento[]) =>
            apsPost<void>('saveBatch', { sheet: 'lancamentos', rows }),
    },
    configuracoes: {
        get: () => apsFetch<Configuracao>('getConfig', {}),
    },
};

export function newId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
