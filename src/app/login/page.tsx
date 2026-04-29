import type { Metadata } from 'next';
import LoginForm from './components/LoginForm';
import LoginBackground from './components/LoginBackground';

export const metadata: Metadata = {
  title: 'Iniciar Sesión - CSISL Legal Compliance',
  description: 'Acceda al sistema de gestión de cumplimiento legal empresarial para rastrear y mantener el cumplimiento de requisitos regulatorios en múltiples países.',
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative">
      <LoginBackground />
      
      <div className="w-full max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="hidden lg:block space-y-6">
            <div className="space-y-4">
              <h2 className="text-4xl font-semibold text-foreground leading-tight">
                Sistema de Gestión de Cumplimiento Legal
              </h2>
              <p className="text-lg text-muted-foreground font-caption leading-relaxed">
                Plataforma empresarial para identificar, rastrear y mantener el cumplimiento de requisitos legales en múltiples países y unidades de negocio.
              </p>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-start gap-4 p-4 bg-card rounded-lg border border-border">
                <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-semibold">1</span>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-1">
                    Rastreo Multi-País
                  </h3>
                  <p className="text-sm text-muted-foreground font-caption">
                    Gestione requisitos regulatorios en múltiples jurisdicciones desde una plataforma centralizada.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-card rounded-lg border border-border">
                <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-semibold">2</span>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-1">
                    Gestión de Evidencias
                  </h3>
                  <p className="text-sm text-muted-foreground font-caption">
                    Cargue, organice y acceda a documentación de cumplimiento con control de acceso seguro.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-card rounded-lg border border-border">
                <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-semibold">3</span>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-1">
                    Reportes de Cumplimiento
                  </h3>
                  <p className="text-sm text-muted-foreground font-caption">
                    Genere informes comparativos y visualice KPIs de cumplimiento en tiempo real.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}