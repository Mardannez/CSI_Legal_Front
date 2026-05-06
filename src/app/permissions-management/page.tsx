import type { Metadata } from 'next';
import { Suspense } from 'react';
import PermissionsMaintenanceInteractive from './components/PermissionsMaintenanceInteractive';

export const metadata: Metadata = {
  title: 'Mantenimiento de Permisos - CSI Legal',
  description: 'Gestión del catálogo de permisos del sistema.',
};

export default function PermissionsManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <div className="h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        </div>
      }
    >
      <PermissionsMaintenanceInteractive />
    </Suspense>
  );
}