import { Suspense } from 'react';
import CountryManagementInteractive from './components/CountryManagementInteractive';

export const metadata = {
  title: 'Gestión de Países | CSISL',
  description: 'Administración de países y configuración regional',
};

export default function CountryManagementPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
      <CountryManagementInteractive />
    </Suspense>
  );
}