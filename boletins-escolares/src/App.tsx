import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ReportPreview } from './components/ReportPreview';
import { Protagonist } from './lib/types';
import { FileText, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import { Login } from './components/Login';

function App() {
  const { user, loading: authLoading } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<Protagonist | null>(null);

  if (authLoading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>Carregando...</div>;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app-container">
      <Sidebar
        onSelectStudent={setSelectedStudent}
        selectedStudentId={selectedStudent?.id}
      />

      <main className="main-content">
        <AnimatePresence mode="wait">
          {selectedStudent ? (
            <motion.div
              key={selectedStudent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ReportPreview student={selectedStudent} />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="empty-state"
              style={{
                margin: 'auto',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
                color: 'var(--text-muted)'
              }}
            >
              <div style={{
                width: '80px',
                height: '80px',
                background: 'var(--indigo-50)',
                borderRadius: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                marginBottom: '1rem'
              }}>
                <FileText size={40} />
              </div>
              <h2 style={{ color: 'var(--slate-800)', fontWeight: 700 }}>Gerador de Boletins Profissional</h2>
              <p style={{ maxWidth: '400px' }}>
                Selecione um aluno na barra lateral para visualizar as notas, calcular médias e gerar o documento oficial em PDF.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', fontSize: '0.875rem' }}>
                <span>Use a busca ou navegue pela lista</span>
                <ChevronRight size={16} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
