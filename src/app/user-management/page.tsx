import type { Metadata } from 'next';
import { Suspense } from 'react';
import UsersMaintenanceInteractive from './components/UsersMaintenanceInteractive';

export const metadata: Metadata = {
  title: 'Mantenimiento de Usuarios - CSI Legal',
  description:
    'Gestión de usuarios, empresas asignadas, roles globales y roles por empresa.',
};

export default function UserManagementPage() {
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
      <UsersMaintenanceInteractive />
    </Suspense>
  );
}