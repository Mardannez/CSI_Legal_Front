import type { Metadata } from 'next';
import { Suspense } from 'react';
import CompanyDashboardInteractive from './components/CompanyDashboardInteractive';

export const metadata: Metadata = {
  title: 'Panel de Proyecto - CSISL Legal Compliance',
  description: 'Panel de control para gestión de cumplimiento legal con visualización de KPIs, estado de requisitos y seguimiento de obligaciones normativas por proyecto.',
};

export default function CompanyDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    }>
      <CompanyDashboardInteractive />
    </Suspense>
  );
}