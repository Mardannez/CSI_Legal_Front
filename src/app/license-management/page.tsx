import LicenseManagementInteractive from './components/LicenseManagementInteractive';
import { Suspense } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mantenimiento de Licencias por Empresas - CSI-Legal',
  description: 'Mantenimiento de Licencias por Empresas - CSI-Legal para usuario administrador Global',
};

export default function LicenseManagementPage() {
  return   (
      <Suspense
        fallback={
          <div className="min-h-screen bg-background">
            <div className="h-screen flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
          </div>
        }
      >
        <LicenseManagementInteractive />;
      </Suspense>
    );
  }
 
