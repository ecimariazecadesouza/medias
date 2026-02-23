-- GESTÃO DE MÉDIAS — Supabase SQL Schema
-- ================================================
-- Este script cria a estrutura de tabelas, relacionamentos e RLS (Row Level Security).
-- Cole este código no SQL Editor do seu projeto Supabase.

-- 1. EXTENSÕES
create extension if not exists "uuid-ossp";

-- 2. TABELA DE PERFIS (Usuários do Sistema)
-- Remove restrições antigas se existirem (evita o erro profiles_role_check)
-- Executado fora do bloco DO para garantir que não seja ignorado por erros no ENUM
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('Administrador', 'Docente', 'Gestor', 'CP', 'CA', 'Secretaria');
EXCEPTION
    WHEN duplicate_object THEN 
        -- Garante que novos valores sejam adicionados se o tipo já existir
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'user_role'::regtype AND enumlabel = 'Gestor') THEN
            ALTER TYPE user_role ADD VALUE 'Gestor';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'user_role'::regtype AND enumlabel = 'CP') THEN
            ALTER TYPE user_role ADD VALUE 'CP';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'user_role'::regtype AND enumlabel = 'CA') THEN
            ALTER TYPE user_role ADD VALUE 'CA';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'user_role'::regtype AND enumlabel = 'Secretaria') THEN
            ALTER TYPE user_role ADD VALUE 'Secretaria';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'user_role'::regtype AND enumlabel = 'CAF') THEN
            ALTER TYPE user_role ADD VALUE 'CAF';
        END IF;
END $$;

create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  nome text not null,
  email text not null,
  role user_role not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. GRADE CURRICULAR
create table if not exists formacoes (
  id uuid default uuid_generate_v4() primary key,
  nome text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists subformacoes (
  id uuid default uuid_generate_v4() primary key,
  nome text not null,
  formacao_id uuid references formacoes(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists areas (
  id uuid default uuid_generate_v4() primary key,
  nome text not null,
  subformacao_id uuid references subformacoes(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists disciplinas (
  id uuid default uuid_generate_v4() primary key,
  nome text not null,
  area_id uuid references areas(id) on delete cascade not null,
  periodicidade text not null default 'Anual' check (periodicidade in ('Anual', '1° Semestre', '2° Semestre')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. TURMAS E PROTAGONISTAS
create table if not exists turmas (
  id uuid default uuid_generate_v4() primary key,
  nome text not null,
  ano_letivo text not null,
  turno text not null check (turno in ('Manhã', 'Tarde', 'Noite', 'Integral')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (nome, ano_letivo)
);

create table if not exists protagonistas (
  id uuid default uuid_generate_v4() primary key,
  nome text not null,
  matricula text unique not null,
  turma_id uuid references turmas(id) on delete set null,
  status text not null check (status in ('Cursando', 'Evasão', 'Transferência', 'Outro')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. DOCENTES (Apenas para registro pedagógico, o acesso é via profiles)
create table if not exists docentes (
  id uuid default uuid_generate_v4() primary key,
  nome text not null,
  email text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TABELAS DE VÍNCULO (N:N)
create table if not exists docentes_disciplinas (
  docente_id uuid references docentes(id) on delete cascade,
  disciplina_id uuid references disciplinas(id) on delete cascade,
  primary key (docente_id, disciplina_id)
);

create table if not exists docentes_turmas (
  docente_id uuid references docentes(id) on delete cascade,
  turma_id uuid references turmas(id) on delete cascade,
  primary key (docente_id, turma_id)
);

-- 6. LANÇAMENTOS (MÉDIAS)
create table if not exists lancamentos (
  id uuid default uuid_generate_v4() primary key,
  protagonista_id uuid references protagonistas(id) on delete cascade not null,
  disciplina_id uuid references disciplinas(id) on delete cascade not null,
  turma_id uuid references turmas(id) on delete cascade not null,
  bimestre integer not null check (bimestre between 1 and 4),
  media numeric(4,2) check (media between 0 and 10),
  data_lancamento timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (protagonista_id, disciplina_id, bimestre, turma_id)
);

-- 7. CONFIGURAÇÕES
create table if not exists configuracoes (
  chave text primary key,
  valor jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. ROW LEVEL SECURITY (RLS)
alter table profiles enable row level security;
alter table formacoes enable row level security;
alter table subformacoes enable row level security;
alter table areas enable row level security;
alter table disciplinas enable row level security;
alter table turmas enable row level security;
alter table protagonistas enable row level security;
alter table docentes enable row level security;
alter table docentes_disciplinas enable row level security;
alter table docentes_turmas enable row level security;
alter table lancamentos enable row level security;
alter table configuracoes enable row level security;

-- POLÍTICAS BÁSICAS (Exemplo: todos autenticados podem ler, apenas Admin pode editar)
-- Nota: Você deve ajustar estas políticas conforme sua necessidade específica de acesso.

drop policy if exists "Autenticados podem ver perfis" on profiles;
create policy "Autenticados podem ver perfis" on profiles for select using (auth.role() = 'authenticated');

drop policy if exists "Usuários podem editar próprio perfil" on profiles;
create policy "Usuários podem editar próprio perfil" on profiles for update using (auth.uid() = id);

drop policy if exists "Todos autenticados podem ler dados" on formacoes;
create policy "Todos autenticados podem ler dados" on formacoes for select using (auth.role() = 'authenticated');

drop policy if exists "Todos autenticados podem ler dados sub" on subformacoes;
create policy "Todos autenticados podem ler dados sub" on subformacoes for select using (auth.role() = 'authenticated');

drop policy if exists "Todos autenticados podem ler dados areas" on areas;
create policy "Todos autenticados podem ler dados areas" on areas for select using (auth.role() = 'authenticated');

drop policy if exists "Todos autenticados podem ler dados disc" on disciplinas;
create policy "Todos autenticados podem ler dados disc" on disciplinas for select using (auth.role() = 'authenticated');

drop policy if exists "Todos autenticados podem ler dados turm" on turmas;
create policy "Todos autenticados podem ler dados turm" on turmas for select using (auth.role() = 'authenticated');

drop policy if exists "Todos autenticados podem ler dados prot" on protagonistas;
create policy "Todos autenticados podem ler dados prot" on protagonistas for select using (auth.role() = 'authenticated');

drop policy if exists "Todos autenticados podem ler dados doc" on docentes;
create policy "Todos autenticados podem ler dados doc" on docentes for select using (auth.role() = 'authenticated');

drop policy if exists "Todos autenticados podem ler lancamentos" on lancamentos;
create policy "Todos autenticados podem ler lancamentos" on lancamentos for select using (auth.role() = 'authenticated');

-- 9. TRIGGER PARA CRIAR PERFIL AUTOMATICAMENTE NO SIGNUP
create or replace function public.handle_new_user()
returns trigger 
language plpgsql
security definer 
set search_path = public
as $$
declare
  final_role user_role;
  meta_role text;
  final_nome text;
begin
  -- Extração segura de metadados
  begin
    meta_role := new.raw_user_meta_data->>'role';
    final_nome := new.raw_user_meta_data->>'nome';
  exception when others then
    meta_role := null;
    final_nome := null;
  end;

  -- Mapeamento robusto de roles
  final_role := case
    when meta_role = 'Administrador' then 'Administrador'::user_role
    when meta_role = 'Admin' then 'Administrador'::user_role
    when meta_role = 'Docente' then 'Docente'::user_role
    when meta_role = 'Gestor' then 'Gestor'::user_role
    when meta_role = 'CAF' then 'CAF'::user_role
    when meta_role = 'CP' then 'CP'::user_role
    when meta_role = 'CA' then 'CA'::user_role
    when meta_role = 'Secretaria' then 'Secretaria'::user_role
    else 'Docente'::user_role
  end;

  -- Fallback para nome (usa parte do email se vazio)
  if final_nome is null or final_nome = '' then
    final_nome := split_part(new.email, '@', 1);
  end if;

  -- Inserção com tratamento de conflito (evita erro se já existir)
  insert into public.profiles (id, nome, email, role)
  values (new.id, final_nome, new.email, final_role)
  on conflict (id) do update 
  set nome = excluded.nome, 
      email = excluded.email,
      role = excluded.role;

  return new;
exception when others then
  -- Backup supremo: se tudo falhar, tenta o insert mais básico possível
  -- para não impedir a criação do usuário no Auth
  begin
    insert into public.profiles (id, nome, email, role)
    values (new.id, split_part(new.email, '@', 1), new.email, 'Docente')
    on conflict (id) do nothing;
  exception when others then
    null; -- Silencia erro para permitir criação no auth.users
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
