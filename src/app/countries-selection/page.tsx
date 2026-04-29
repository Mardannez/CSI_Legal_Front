import type { Metadata } from 'next';
import CountriesSelectionInteractive from './components/CountriesSelectionInteractive';

export const metadata: Metadata = {
  title: 'Selección de País - CSISL Legal Compliance',
  description: 'Seleccione el país para acceder a los marcos de cumplimiento regulatorio y gestionar requisitos legales empresariales en múltiples jurisdicciones.',
};

export default function CountriesSelectionPage() {
  return <CountriesSelectionInteractive />;
}