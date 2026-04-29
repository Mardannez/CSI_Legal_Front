import type { Metadata } from 'next';
import { Suspense } from 'react';
import ProjectMaintenanceInteractive from './components/ProjectMaintenanceInteractive';

export const metadata: Metadata = {
  title: 'Mantenimiento de Proyectos - CSISL Legal Compliance',
  description: 'Gestión completa de proyectos por país con operaciones CRUD, filtrado avanzado y seguimiento de requisitos de cumplimiento.',
};

export default function ProjectMaintenancePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    }>
      <ProjectMaintenanceInteractive />
    </Suspense>
  );
}