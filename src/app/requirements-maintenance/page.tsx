import { Suspense } from 'react';
import RequirementsMaintenanceInteractive from './components/RequirementsMaintenanceInteractive';

export const metadata = {
  title: 'Mantenimiento de Requisitos | CSISL',
  description: 'Gestión de requisitos específicos por país',
};

export default function RequirementsMaintenancePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
      <RequirementsMaintenanceInteractive />
    </Suspense>
  );
}