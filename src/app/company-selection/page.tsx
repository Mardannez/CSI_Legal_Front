import type { Metadata } from 'next';
import { Suspense } from 'react';
import CompanySelectionInteractive from './components/CompanySelectionInteractive';

export const metadata: Metadata = {
  title: 'Selección de Proyecto - CSISL Legal Compliance',
  description: 'Seleccione el proyecto de cumplimiento para gestionar requisitos regulatorios, monitorear el progreso y supervisar el estado de cumplimiento legal.',
};

export default function ProjectSelectionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <CompanySelectionInteractive />
    </Suspense>
  );
}