import React, { useState } from 'react';
import { useSchool } from '../context/SchoolContext';
import { Search, GraduationCap, Users, LogOut } from 'lucide-react';
import { Protagonist, Turma } from '../lib/types';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
    onSelectStudent: (student: Protagonist) => void;
    selectedStudentId?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ onSelectStudent, selectedStudentId }) => {
    const { students, classes, loading } = useSchool();
    const { user, signOut } = useAuth();
    const [search, setSearch] = useState('');

    const filteredStudents = students.filter((s: Protagonist) =>
        (s.nome || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.matricula || '').includes(search)
    );

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <div className="logo-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <GraduationCap size={32} />
                        <span className="logo-text">SEI Boletins</span>
                    </div>
                    <button
                        onClick={() => signOut()}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem' }}
                        title="Sair"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--indigo-50)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '32px', height: '32px', background: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                        {user?.email?.substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-900)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>Docente</p>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user?.email}</p>
                    </div>
                </div>
                <div style={{ position: 'relative', marginTop: '1.5rem' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        className="search-input"
                        placeholder="Buscar aluno ou RA..."
                        style={{ paddingLeft: '38px' }}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="student-list">
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Carrregando...</div>
                ) : filteredStudents.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum aluno encontrado.</div>
                ) : filteredStudents.map((student: Protagonist) => {
                    const className = classes.find((c: Turma) => c.id === student.turmaId)?.nome || 'Sem turma';
                    return (
                        <div
                            key={student.id}
                            className={`student-card ${selectedStudentId === student.id ? 'active' : ''}`}
                            onClick={() => onSelectStudent(student)}
                        >
                            <span className="student-name">{student.nome}</span>
                            <div className="student-info">
                                <Users size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                {className} • RA: {student.matricula}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
