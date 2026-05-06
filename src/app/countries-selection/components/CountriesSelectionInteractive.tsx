'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import SearchBar from './SearchBar';
import CountriesGrid from './CountriesGrid';
import BreadcrumbNavigation from '@/components/common/BreadcrumbNavigation';
import UserContextMenu from '@/components/common/UserContextMenu';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';

interface Country {
  id: string;
  name: string;
  flagUrl: string;
  description: string;
  companyCount: number;
}

interface ApiPais {
  id: number;
  Pais: string;
  Bandera: string | null;
  DescripcionActividades: string | null;
  CompanyCount: number;
}

export default function CountriesSelectionInteractive() {
  const router = useRouter();

  // ==========================================================
  // 1) Tomamos la sesión global desde AuthContext
  //    Aquí viene el usuario real logueado, sus roles, empresas
  //    y el método centralizado de logout.
  // ==========================================================
  const {
    session,
    logout,
    loading: authLoading,
  } = useAuth();

  // ==========================================================
  // 2) Estados propios de la pantalla
  // ==========================================================
  const [isHydrated, setIsHydrated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ==========================================================
  // 3) Hidratar componente cliente
  //    Lo usamos para evitar diferencias entre SSR/CSR.
  // ==========================================================
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // ==========================================================
  // 4) Guard de sesión
  //    Ya no revisamos token manualmente en localStorage.
  //    Esperamos a que AuthContext termine de restaurar sesión.
  // ==========================================================
  useEffect(() => {
    if (!isHydrated || authLoading) return;

    if (!session) {
      router.replace('/login');
      return;
    }

    setAuthChecked(true);
  }, [isHydrated, authLoading, session, router]);

  // ==========================================================
  // 5) Construimos el usuario visual para UserContextMenu
  //    Ya no usamos mockUser.
  //    Mostramos:
  //    - nombre completo
  //    - correo o usuario
  //    - rol principal visible
  // ==========================================================
const currentUser = useMemo(() => {
  const firstEmpresaRole = session?.empresas?.[0]?.roles?.join(', ') || 'Usuario';

  return {
    name: session?.user.nombreCompleto || session?.user.usuario || 'Usuario',
    email: session?.user.correo || session?.user.usuario || '',
    role: session?.isGlobalAdmin ? 'SUPER_ADMIN' : firstEmpresaRole,
    avatar: '',
    isGlobalAdmin: !!session?.isGlobalAdmin, // <-- NUEVO
  };
}, [session]);

  // ==========================================================
  // 6) Cargar países desde la API
  //    Importante:
  //    - el backend ya filtra países según el usuario
  //    - admin verá todos
  //    - usuario empresa vería solo sus países
  //    En la práctica, el lector normalmente no llega aquí porque
  //    su landingPage lo manda directo al dashboard.
  // ==========================================================
  useEffect(() => {
    if (!isHydrated || !authChecked) return;

    const controller = new AbortController();

    const load = async () => {
      setIsLoadingCountries(true);
      setLoadError(null);

      try {
        const res = await apiFetch('/api/paises', {
          method: 'GET',
          signal: controller.signal,
        });

        const json = await res.json().catch(() => ({} as any));

        if (!res.ok) {
          throw new Error(json?.message || 'No se pudieron cargar los países');
        }

        const paises: ApiPais[] = Array.isArray(json?.Paises) ? json.Paises : [];

        const mapped: Country[] = paises.map((p) => ({
          id: String(p.id),
          name: p.Pais,
          flagUrl: p.Bandera ?? '',
          description: p.DescripcionActividades ?? '',
          companyCount: p.CompanyCount ?? 0,
        }));

        setCountries(mapped);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setLoadError(err?.message || 'Error cargando países');
          setCountries([]);
        }
      } finally {
        setIsLoadingCountries(false);
      }
    };

    load();

    return () => controller.abort();
  }, [isHydrated, authChecked]);

  // ==========================================================
  // 7) Filtro por búsqueda
  //    Esto ya trabaja sobre los países reales que devolvió la API.
  // ==========================================================
  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return countries;

    return countries.filter((c) => c.name.toLowerCase().includes(q));
  }, [countries, searchQuery]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // ==========================================================
  // 8) Al seleccionar país, vamos a la pantalla de empresas
  //    Mantenemos tu navegación actual.
  // ==========================================================
  const handleCountrySelect = (countryId: string) => {
    router.push(`/company-selection?country=${countryId}`);
  };

  // ==========================================================
  // 9) Logout centralizado
  //    Ya no limpiamos localStorage aquí.
  //    Todo lo hace AuthContext.
  // ==========================================================
  const handleLogout = () => {
    logout();
  };

  // ==========================================================
  // 10) Loading inicial
  //     Esperamos:
  //     - hidratación
  //     - sesión restaurada
  //     - carga de países
  // ==========================================================
  if (!isHydrated || authLoading || !authChecked || isLoadingCountries) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="bg-card border-b border-border sticky top-0 z-40 shadow-elevation-1">
          <div className="container mx-auto px-4 lg:px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <AppImage
                  src="/assets/images/CSI-LOGO-05-1771034129124.png"
                  alt="CSISL Logo"
                  width={120}
                  height={40}
                  className="object-contain"
                />
              </div>

              <UserContextMenu user={currentUser} onLogout={handleLogout} />
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-64 mb-8" />
            <div className="h-12 bg-muted rounded w-full max-w-md mb-8" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="bg-card border border-border rounded-lg overflow-hidden"
                >
                  <div className="h-40 bg-muted" />
                  <div className="p-6 space-y-3">
                    <div className="h-6 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40 shadow-elevation-1">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <AppImage
                src="/assets/images/CSI-LOGO-05-1771034129124.png"
                alt="CSISL Logo"
                width={120}
                height={40}
                className="object-contain"
              />
            </div>

            <UserContextMenu user={currentUser} onLogout={handleLogout} />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNavigation />

        <div className="mb-8">
          <h2 className="text-3xl font-semibold text-foreground mb-2">
            Seleccionar País
          </h2>
          <p className="text-muted-foreground">
            Elija el país para acceder a los marcos de cumplimiento regulatorio disponibles
          </p>
        </div>

        {loadError && (
          <div className="mb-6 bg-error/10 border border-error rounded-md p-4 flex items-start gap-3">
            <Icon
              name="ExclamationTriangleIcon"
              size={20}
              className="text-error flex-shrink-0 mt-0.5"
            />
            <div>
              <p className="text-sm text-error font-caption">{loadError}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Verifica que <b>CSI_Legal_Api</b> esté encendida y que CORS permita tu web.
              </p>
            </div>
          </div>
        )}

        <div className="mb-8">
          <SearchBar onSearch={handleSearch} placeholder="Buscar país..." />
        </div>

        <CountriesGrid
          countries={filteredCountries}
          onCountrySelect={handleCountrySelect}
        />
      </main>

      <footer className="mt-auto bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground font-caption">
              &copy; {new Date().getFullYear()} CSISL Legal Compliance. Todos los derechos reservados.
            </p>

            <div className="flex items-center gap-6">
              <a
                href="#"
                className="text-sm text-muted-foreground hover:text-primary transition-smooth font-caption"
              >
                Política de Privacidad
              </a>
              <a
                href="#"
                className="text-sm text-muted-foreground hover:text-primary transition-smooth font-caption"
              >
                Términos de Uso
              </a>
              <a
                href="#"
                className="text-sm text-muted-foreground hover:text-primary transition-smooth font-caption"
              >
                Soporte
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}